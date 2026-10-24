/*
 * SpaceSkribble – Mission Mode engine
 * -----------------------------------
 * Pure game rules, no HTML. Works in the browser (window.MissionEngine) and in Node (tests).
 *
 *   const m = MissionEngine.create({ outpost: 'moon', supplies: 3 });
 *   MissionEngine.currentEvent(m)          → the decision for this sol
 *   MissionEngine.boost(m, 'power')        → (optional) spend 1 supply point: +15 to one resource, once per sol
 *   MissionEngine.choose(m, 0)             → apply option 0, then the daily drain, then move to the next sol
 *   MissionEngine.debrief(m)               → why the mission worked or failed
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data/missions.js'));
  else root.MissionEngine = factory(root.MISSION_DATA);
})(typeof self !== 'undefined' ? self : this, function (DATA) {
  const { OUTPOSTS, EVENTS, SOLS, RESOURCES } = DATA;
  const BOOST = 15; // one supply point = +15 to one resource
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

  // Pick `n` different events that fit this outpost, in random order.
  function pickEvents(outpost, n, rng) {
    const pool = EVENTS.filter((e) => e.outposts.includes(outpost)).map((e) => e.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n);
  }

  function create({ outpost = 'moon', supplies = 2, rng = Math.random } = {}) {
    if (!OUTPOSTS[outpost]) outpost = 'moon';
    return {
      outpost,
      sol: 1,
      total: SOLS,
      res: { ...OUTPOSTS[outpost].start },
      supplies: Math.max(0, Math.min(8, supplies | 0)),
      startSupplies: Math.max(0, Math.min(8, supplies | 0)),
      boosted: false, // already used a supply boost this sol?
      eventIds: pickEvents(outpost, SOLS, rng),
      log: [],
      over: false,
      result: null, // 'success' | 'partial' | 'fail'
      failReason: null, // { key, sol }
    };
  }

  const eventById = (id) => EVENTS.find((e) => e.id === id);

  function currentEvent(m) {
    return m.over ? null : eventById(m.eventIds[m.sol - 1]);
  }

  function canChoose(m, idx) {
    const ev = currentEvent(m);
    const c = ev && ev.choices[idx];
    return !!c && (c.cost || 0) <= m.supplies;
  }

  // Spend 1 supply point on one resource (once per sol, before choosing).
  function boost(m, key) {
    if (m.over || m.boosted || m.supplies < 1 || !RESOURCES.includes(key) || key === 'health') return false;
    m.supplies -= 1;
    m.boosted = true;
    m.res[key] = clamp(m.res[key] + BOOST);
    m.pendingBoost = key;
    return true;
  }

  // The end-of-sol rules: baseline drain, then crew health reacts to the situation.
  function endOfSol(m) {
    const d = OUTPOSTS[m.outpost].drain;
    const r = m.res;
    for (const k of Object.keys(d)) r[k] = clamp(r[k] + d[k]);

    const notes = [];
    let hp = 0;
    if (r.power === 0) { r.life = clamp(r.life - 10); notes.push('power_out'); } // no power → life support throttles
    if (r.life < 30) { hp -= 12; notes.push('low_life'); }
    if (r.food < 30) { hp -= 8; notes.push('low_food'); }
    if (r.power < 25) { hp -= 6; notes.push('low_power'); }
    if (r.shield < 35) { hp -= 8; notes.push('low_shield'); }
    if (!notes.length && Math.min(r.power, r.food, r.life, r.shield) >= 40) hp += 3; // calm sol: crew recovers
    r.health = clamp(r.health + hp);
    return notes;
  }

  function choose(m, idx) {
    if (m.over) return null;
    const ev = currentEvent(m);
    if (!ev || !canChoose(m, idx)) return null;
    const c = ev.choices[idx];

    const before = { ...m.res };
    m.supplies -= c.cost || 0;
    for (const [k, v] of Object.entries(c.effects)) m.res[k] = clamp(m.res[k] + v);
    const afterChoice = { ...m.res };
    const notes = endOfSol(m);

    const entry = {
      sol: m.sol,
      eventId: ev.id,
      choice: idx,
      boost: m.pendingBoost || null,
      before,
      afterChoice,
      after: { ...m.res },
      notes,
    };
    m.log.push(entry);
    m.pendingBoost = null;

    // Did the crew survive the sol?
    if (m.res.health <= 0) return finish(m, 'fail', 'health');
    if (m.res.life <= 0) return finish(m, 'fail', 'life');

    if (m.sol >= m.total) {
      const r = m.res;
      const good = r.health >= 60 && Math.min(r.power, r.food, r.life, r.shield) >= 30;
      return finish(m, good ? 'success' : 'partial', null);
    }
    m.sol += 1;
    m.boosted = false;
    return entry;
  }

  function finish(m, result, reasonKey) {
    m.over = true;
    m.result = result;
    if (reasonKey) m.failReason = { key: reasonKey, sol: m.sol };
    return m.log[m.log.length - 1];
  }

  function score(m) {
    const r = m.res;
    const base = (r.health * 2 + r.power + r.food + r.life + r.shield) / 6; // 0–100
    const solsBonus = (m.log.length / m.total) * 20;
    const supplyBonus = m.supplies * 2;
    const raw = m.result === 'fail' ? base * 0.4 + solsBonus : base + supplyBonus + (m.result === 'success' ? 10 : 0);
    return Math.max(0, Math.min(200, Math.round(raw)));
  }

  /*
   * Debrief: structured facts that the UI turns into sentences (English or Bangla).
   *  - result, score
   *  - weakest: the resource that ended lowest
   *  - culprit: the sol/decision that hurt the key resource the most
   *  - best: the decision that helped the most
   *  - timeline: one row per sol
   */
  function debrief(m) {
    const key = m.failReason ? m.failReason.key : lowestKey(m.res);
    const focus = key === 'health' ? ['health', 'shield', 'life'] : [key];
    const rows = m.log.map((e) => {
      const ev = eventById(e.eventId);
      const c = ev.choices[e.choice];
      const total = {};
      for (const k of RESOURCES) total[k] = e.after[k] - e.before[k];
      return { sol: e.sol, ev, c, e, total };
    });
    const impact = (row) => focus.reduce((s, k) => s + row.total[k], 0);
    let culprit = null;
    let best = null;
    for (const row of rows) {
      if (!culprit || impact(row) < impact(culprit)) culprit = row;
      if (!best || impact(row) > impact(best)) best = row;
    }
    return {
      result: m.result,
      score: score(m),
      key,
      failSol: m.failReason ? m.failReason.sol : null,
      weakest: lowestKey(m.res),
      culprit: culprit && impact(culprit) < 0 ? culprit : null,
      best: best && impact(best) > 0 ? best : null,
      rows,
      final: { ...m.res },
      supplies: m.supplies,
    };
  }

  function lowestKey(res) {
    return ['power', 'food', 'life', 'shield', 'health'].reduce((a, b) => (res[b] < res[a] ? b : a));
  }

  return { create, currentEvent, currentEventById: eventById, canChoose, boost, choose, debrief, score, BOOST, SOLS };
});
