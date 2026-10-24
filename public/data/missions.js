/*
 * SpaceSkribble – Mission Mode data
 * ---------------------------------
 * Outposts, starting values and the decision events.
 * Every text is { en, bn }. Every fact has a NASA/ESA source link.
 *
 * Facts used (checked against the linked pages):
 *  - Mars surface radiation ≈ 0.7 mSv/day, trip to Mars ≈ 1.9 mSv/day, ISS 0.4–1.0 mSv/day (Curiosity RAD)
 *  - Global Mars dust storms ≈ once per 3 Mars years, last weeks to months; dust lowers solar power (NASA)
 *  - ISS recovers 98% of water; a crew member needs about a gallon of water a day (NASA, 2023)
 *  - MOXIE: >100 g of oxygen in 13 runs on Mars, record 10.56 g/hour (NASA)
 *  - Moon: +123 °C sunlit side, −233 °C in permanently shadowed polar craters (ESA)
 *
 * Resources are 0–100: power, food, life (air & water), shield (radiation protection), health (crew).
 * "effects" are added right after the player picks that option. "cost" = supply points needed.
 * "why" is used in the final debrief to explain what that decision did.
 *
 * Works in the browser (window.MISSION_DATA) and in Node (require).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MISSION_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const T = (en, bn) => ({ en, bn });

  const OUTPOSTS = {
    moon: {
      icon: '🌕',
      level: T('Recommended first mission', 'প্রথম মিশনের জন্য ভালো'),
      name: T('Moon outpost', 'চাঁদের আউটপোস্ট'),
      blurb: T(
        'Gravity 1.62 m/s². Two-week nights, no atmosphere to stop radiation and tiny meteorites.',
        'মাধ্যাকর্ষণ ১.৬২ m/s²। দু-সপ্তাহের রাত, বিকিরণ ও ছোট উল্কা আটকানোর বায়ুমণ্ডল নেই।'
      ),
      start: { power: 80, food: 80, life: 80, shield: 60, health: 100 },
      drain: { power: -6, food: -4, life: -4, shield: -4 }, // lost every sol
    },
    mars: {
      icon: '🔴',
      level: T('Harder', 'কঠিন'),
      name: T('Mars outpost', 'মঙ্গলের আউটপোস্ট'),
      blurb: T(
        'Gravity 3.71 m/s². Thin air gives a little shelter, but dust storms and no quick resupply.',
        'মাধ্যাকর্ষণ ৩.৭১ m/s²। পাতলা বায়ুমণ্ডল সামান্য সুরক্ষা দেয়, কিন্তু ধুলিঝড় আছে আর দ্রুত সরবরাহ আসে না।'
      ),
      start: { power: 70, food: 70, life: 70, shield: 60, health: 100 },
      drain: { power: -5, food: -6, life: -5, shield: -3 },
    },
  };

  const SRC = {
    radiation: { title: 'Space.com – Curiosity radiation data', url: 'https://www.space.com/18753-mars-radiation-manned-mission.html' },
    dust: { title: 'NASA – Martian dust storms', url: 'https://www.nasa.gov/content/the-fact-and-fiction-of-martian-dust-storms' },
    water: { title: 'Space.com – ISS 98% water recovery (NASA)', url: 'https://space.com/astronaut-pee-iss-water-recycling-98-percent-milestone' },
    moxie: { title: 'NASA – MOXIE on Mars', url: 'https://science.nasa.gov/blogs/moxie-celebrates-2-years-on-mars-discoveries-and-work-left-to-do' },
    moonTemp: { title: 'ESA – Moon temperature', url: 'https://www.esa.int/ESA_Multimedia/Images/2021/09/Moon_facts_Temperature' },
    moon: { title: 'NASA Science – Moon', url: 'https://science.nasa.gov/moon/' },
    mars: { title: 'NASA Science – Mars', url: 'https://science.nasa.gov/mars/' },
    humans: { title: 'NASA – Humans in Space', url: 'https://www.nasa.gov/humans-in-space/' },
  };

  const EVENTS = [
    {
      id: 'solar_storm',
      outposts: ['moon', 'mars'],
      icon: '☀️',
      title: T('Solar storm warning', 'সৌর ঝড়ের সতর্কতা'),
      text: T(
        'Sensors detect a burst of charged particles from the Sun. Radiation will rise within hours.',
        'সেন্সর সূর্য থেকে আসা চার্জিত কণার ঝাঁক ধরেছে। কয়েক ঘণ্টার মধ্যেই বিকিরণ বাড়বে।'
      ),
      fact: T(
        'NASA’s Curiosity rover measured about 0.7 mSv per day on the Mars surface, but about 1.9 mSv per day during the trip to Mars. The ISS averages 0.4–1.0 mSv per day.',
        'NASA-র Curiosity রোভার মঙ্গলের মাটিতে দিনে প্রায় ০.৭ mSv আর মঙ্গলে যাওয়ার পথে প্রায় ১.৯ mSv বিকিরণ মেপেছে। ISS-এ গড়ে দিনে ০.৪–১.০ mSv।'
      ),
      src: SRC.radiation,
      choices: [
        {
          label: T('Move the crew into the storm shelter', 'ক্রুকে স্টর্ম শেল্টারে নিয়ে যাও'),
          effects: { shield: 8, power: -6, food: -3 },
          why: T('Sheltering used some power but kept the radiation dose low.', 'শেল্টারে থাকতে কিছু বিদ্যুৎ গেছে, কিন্তু বিকিরণের ডোজ কম ছিল।'),
        },
        {
          label: T('Keep working outside, the schedule is tight', 'সময় কম, তাই বাইরে কাজ চালিয়ে যাও'),
          effects: { health: -18, shield: -8, power: 6 },
          why: T('Working through the storm gave the crew a high radiation dose.', 'ঝড়ের মধ্যে কাজ করায় ক্রু বেশি বিকিরণ পেয়েছে।'),
        },
        {
          label: T('Shelter AND add extra shield plates', 'শেল্টারে যাও এবং বাড়তি শিল্ড প্লেট বসাও'),
          cost: 1,
          effects: { shield: 18, power: -8 },
          why: T('Extra plates boosted protection for the rest of the mission.', 'বাড়তি প্লেট পুরো মিশনের জন্য সুরক্ষা বাড়িয়েছে।'),
        },
      ],
    },
    {
      id: 'dust_storm',
      outposts: ['mars'],
      icon: '🌪️',
      title: T('Global dust storm', 'বৈশ্বিক ধুলিঝড়'),
      text: T(
        'Dust blocks the Sun. Your solar panels will make much less power for days.',
        'ধুলো সূর্যের আলো আটকে দিয়েছে। কয়েক দিন সোলার প্যানেল অনেক কম বিদ্যুৎ দেবে।'
      ),
      fact: T(
        'Global dust storms on Mars happen about once every three Mars years and can last weeks to months. In 2007 a global storm forced NASA’s rovers into survival mode.',
        'মঙ্গলে বৈশ্বিক ধুলিঝড় প্রায় তিন মঙ্গল-বছরে একবার হয় আর কয়েক সপ্তাহ থেকে কয়েক মাস চলতে পারে। ২০০৭-এ এমন ঝড়ে NASA-র রোভারগুলো সারভাইভাল মোডে চলে গিয়েছিল।'
      ),
      src: SRC.dust,
      choices: [
        {
          label: T('Switch to low-power mode', 'লো-পাওয়ার মোডে যাও'),
          effects: { power: 8, health: -4 },
          why: T('Low-power mode saved energy, but the crew was cold and uncomfortable.', 'লো-পাওয়ার মোডে শক্তি বাঁচল, কিন্তু ক্রুর অস্বস্তি হলো।'),
        },
        {
          label: T('Run everything at full power', 'সব কিছু পূর্ণ শক্তিতে চালাও'),
          effects: { power: -22, health: 2 },
          why: T('Running at full power during a storm drained the batteries.', 'ঝড়ের মধ্যে পূর্ণ শক্তিতে চালানোয় ব্যাটারি খালি হয়ে গেছে।'),
        },
        {
          label: T('Connect the backup battery pack', 'ব্যাকআপ ব্যাটারি প্যাক জুড়ে দাও'),
          cost: 1,
          effects: { power: 22 },
          why: T('The backup batteries carried the base through the storm.', 'ব্যাকআপ ব্যাটারি ঝড় পার করে দিয়েছে।'),
        },
      ],
    },
    {
      id: 'long_night',
      outposts: ['moon'],
      icon: '🌑',
      title: T('Lunar night begins', 'চাঁদের রাত শুরু'),
      text: T(
        'The Sun has set. A night on the Moon lasts about two Earth weeks, so solar power drops to zero.',
        'সূর্য ডুবে গেছে। চাঁদের রাত প্রায় দুই পৃথিবী-সপ্তাহ লম্বা, তাই সোলার বিদ্যুৎ শূন্য।'
      ),
      fact: T(
        'The sunlit Moon reaches about 123 °C, while permanently shadowed polar craters drop to about −233 °C.',
        'চাঁদের আলোকিত দিক প্রায় ১২৩ °C হয়, আর মেরুর চিরছায়া গর্তে তাপমাত্রা নামে প্রায় −২৩৩ °C।'
      ),
      src: SRC.moonTemp,
      choices: [
        {
          label: T('Use battery reserve, switch off non-essential systems', 'ব্যাটারি রিজার্ভ ব্যবহার করো, অপ্রয়োজনীয় সিস্টেম বন্ধ করো'),
          effects: { power: -6, health: -2 },
          why: T('Cutting non-essential systems stretched the batteries through the night.', 'অপ্রয়োজনীয় সিস্টেম বন্ধ করায় ব্যাটারি রাতভর টিকেছে।'),
        },
        {
          label: T('Heat the whole base at full power', 'পুরো বেস পূর্ণ শক্তিতে গরম রাখো'),
          effects: { power: -20, health: 4 },
          why: T('Heating everything kept the crew comfortable but used a huge amount of power.', 'সব গরম রাখায় ক্রু আরামে ছিল, কিন্তু অনেক বিদ্যুৎ গেছে।'),
        },
        {
          label: T('Move the crew into the insulated core module', 'ক্রুকে ইনসুলেটেড কোর মডিউলে নাও'),
          effects: { power: -3, health: -4, life: -3 },
          why: T('The small core module saved power, but it was crowded and the air got stale.', 'ছোট কোর মডিউলে বিদ্যুৎ বাঁচল, কিন্তু ভিড় আর বাতাস ভারী হলো।'),
        },
      ],
    },
    {
      id: 'panel_dust',
      outposts: ['moon', 'mars'],
      icon: '🔋',
      title: T('Dusty solar panels', 'ধুলোয় ঢাকা সোলার প্যানেল'),
      text: T('Dust is covering the solar panels and your power is dropping.', 'প্যানেলে ধুলো জমে বিদ্যুৎ কমে যাচ্ছে।'),
      fact: T(
        'On Mars, even small dust devils settle dust on solar panels and reduce the sunlight they receive, so less energy is generated.',
        'মঙ্গলে ছোট ধুলোর ঘূর্ণিও প্যানেলে ধুলো ফেলে, ফলে আলো কম পৌঁছায় আর কম বিদ্যুৎ তৈরি হয়।'
      ),
      src: SRC.dust,
      choices: [
        {
          label: T('Send the robot arm to clean the panels', 'রোবট আর্ম দিয়ে প্যানেল পরিষ্কার করো'),
          effects: { power: 14, health: -2 },
          why: T('The robot arm restored power safely.', 'রোবট আর্ম নিরাপদে বিদ্যুৎ ফিরিয়ে এনেছে।'),
        },
        {
          label: T('Ignore it for now', 'আপাতত উপেক্ষা করো'),
          effects: { power: -8 },
          why: T('Dusty panels kept losing power.', 'ধুলোর কারণে প্যানেল বিদ্যুৎ হারাতেই থাকল।'),
        },
        {
          label: T('Crew goes out to clean by hand', 'ক্রু বাইরে গিয়ে হাতে পরিষ্কার করুক'),
          effects: { power: 20, health: -8, shield: -4 },
          why: T('Cleaning by hand restored the most power, but the crew was exposed outside.', 'হাতে পরিষ্কারে সবচেয়ে বেশি বিদ্যুৎ এল, কিন্তু ক্রু বাইরে ঝুঁকিতে ছিল।'),
        },
      ],
    },
    {
      id: 'water_recycler',
      outposts: ['moon', 'mars'],
      icon: '💧',
      title: T('Water recycler warning', 'ওয়াটার রিসাইকলার সতর্কতা'),
      text: T('The water recycler is losing efficiency. Air and water supplies are at risk.', 'ওয়াটার রিসাইকলারের কার্যক্ষমতা কমছে। বাতাস ও পানির সরবরাহ ঝুঁকিতে।'),
      fact: T(
        'On the ISS, NASA now recovers about 98% of water from urine, sweat and breath moisture. Each crew member needs around a gallon of water per day.',
        'ISS-এ NASA এখন প্রস্রাব, ঘাম আর শ্বাসের আর্দ্রতা থেকে প্রায় ৯৮% পানি ফিরিয়ে আনে। প্রতিজন ক্রুর দিনে প্রায় এক গ্যালন পানি লাগে।'
      ),
      src: SRC.water,
      choices: [
        {
          label: T('Repair the recycler now', 'এখনই রিসাইকলার মেরামত করো'),
          effects: { life: 14, power: -6, health: -2 },
          why: T('Repairing the recycler early protected life support.', 'আগেভাগে মেরামত করায় লাইফ সাপোর্ট রক্ষা পেয়েছে।'),
        },
        {
          label: T('Ration water for a few sols', 'কয়েক সোল পানি রেশন করো'),
          effects: { life: 4, health: -10 },
          why: T('Rationing saved some water, but a thirsty crew gets sick.', 'রেশনে কিছু পানি বাঁচল, কিন্তু তৃষ্ণার্ত ক্রুর শরীর খারাপ হয়।'),
        },
        {
          label: T('Ignore the warning', 'সতর্কতা উপেক্ষা করো'),
          effects: { life: -18 },
          why: T('The failing recycler wasted air and water.', 'নষ্ট রিসাইকলার বাতাস ও পানি নষ্ট করেছে।'),
        },
      ],
    },
    {
      id: 'crop_issue',
      outposts: ['moon', 'mars'],
      icon: '🥬',
      title: T('Greenhouse trouble', 'গ্রিনহাউসে সমস্যা'),
      text: T('Your lettuce and potato crops are wilting. Food stock is getting low.', 'লেটুস আর আলুর গাছ নেতিয়ে পড়ছে। খাবারের মজুত কমছে।'),
      fact: T(
        'Astronauts on the ISS have grown and eaten lettuce, a first step towards growing food for longer missions.',
        'ISS-এ নভোচারীরা লেটুস ফলিয়ে খেয়েছেন, যা দীর্ঘ মিশনে খাবার ফলানোর প্রথম ধাপ।'
      ),
      src: SRC.humans,
      choices: [
        {
          label: T('Replant and add grow lights', 'আবার লাগাও আর গ্রো-লাইট বাড়াও'),
          effects: { food: 14, power: -10 },
          why: T('Replanting brought food back, but grow lights cost power.', 'নতুন করে চাষে খাবার ফিরল, কিন্তু গ্রো-লাইটে বিদ্যুৎ গেছে।'),
        },
        {
          label: T('Eat emergency rations', 'জরুরি রেশন খাও'),
          effects: { food: 6, health: -4 },
          why: T('Emergency rations helped but are not very nutritious.', 'জরুরি রেশন কাজ দিয়েছে, তবে পুষ্টি কম।'),
        },
        {
          label: T('Skip it and hope the next harvest works', 'পরের ফসলের আশায় বসে থাকো'),
          effects: { food: -14 },
          why: T('The failed crop was not replaced, so food ran down.', 'নষ্ট ফসলের বদলে কিছু না করায় খাবার কমে গেছে।'),
        },
      ],
    },
    {
      id: 'equipment_fault',
      outposts: ['moon', 'mars'],
      icon: '🔧',
      title: T('Life-support pump failing', 'লাইফ সাপোর্ট পাম্প নষ্ট হচ্ছে'),
      text: T('A pump in the air and water loop is failing.', 'বাতাস ও পানির লুপের একটি পাম্প নষ্ট হচ্ছে।'),
      fact: T(
        'Beyond Earth orbit, crews cannot be resupplied quickly, so life-support systems must recycle resources and carry spare parts.',
        'পৃথিবীর কক্ষপথের বাইরে দ্রুত সরবরাহ পাঠানো যায় না, তাই লাইফ সাপোর্টকে সম্পদ রিসাইকেল করতে হয় আর বাড়তি যন্ত্রাংশ রাখতে হয়।'
      ),
      src: SRC.water,
      choices: [
        {
          label: T('Install the spare part', 'বাড়তি যন্ত্রাংশ লাগাও'),
          cost: 1,
          effects: { life: 12, power: -3 },
          why: T('The spare part fixed the pump properly.', 'বাড়তি যন্ত্রাংশে পাম্প ঠিকভাবে সারল।'),
        },
        {
          label: T('Repair it with what you have', 'যা আছে তা দিয়ে মেরামত করো'),
          effects: { life: 8, health: -6, power: -4 },
          why: T('The patch-up worked for now, but cost crew effort and energy.', 'জোড়াতালিতে আপাতত চলল, কিন্তু ক্রুর শ্রম ও বিদ্যুৎ গেছে।'),
        },
        {
          label: T('Run it until it fails', 'নষ্ট না হওয়া পর্যন্ত চালাও'),
          effects: { life: -16, power: 4 },
          why: T('The failing pump leaked air and water.', 'নষ্ট পাম্প বাতাস ও পানি হারিয়েছে।'),
        },
      ],
    },
    {
      id: 'exercise',
      outposts: ['moon', 'mars'],
      icon: '🏋️',
      title: T('Crew fitness check', 'ক্রুর ফিটনেস পরীক্ষা'),
      text: T('The doctor warns that muscles and bones are weakening in low gravity.', 'ডাক্তার সতর্ক করেছেন, কম মাধ্যাকর্ষণে পেশি ও হাড় দুর্বল হচ্ছে।'),
      fact: {
        moon: T('Gravity is about 1.62 m/s² on the Moon, far less than Earth’s 9.8 m/s², so crews need daily exercise.', 'চাঁদে মাধ্যাকর্ষণ প্রায় ১.৬২ m/s², পৃথিবীর ৯.৮-এর চেয়ে অনেক কম, তাই ক্রুদের প্রতিদিন ব্যায়াম দরকার।'),
        mars: T('Gravity is about 3.71 m/s² on Mars, far less than Earth’s 9.8 m/s², so crews need daily exercise.', 'মঙ্গলে মাধ্যাকর্ষণ প্রায় ৩.৭১ m/s², পৃথিবীর ৯.৮-এর চেয়ে অনেক কম, তাই ক্রুদের প্রতিদিন ব্যায়াম দরকার।'),
      },
      srcBy: { moon: SRC.moon, mars: SRC.mars },
      choices: [
        {
          label: T('Two-hour exercise routine', 'দুই ঘণ্টার ব্যায়াম'),
          effects: { health: 10, power: -3, food: -3 },
          why: T('Daily exercise rebuilt crew health.', 'নিয়মিত ব্যায়ামে ক্রুর স্বাস্থ্য ফিরেছে।'),
        },
        {
          label: T('Short exercise only', 'শুধু অল্প ব্যায়াম'),
          effects: { health: 3 },
          why: T('A short routine helped a little.', 'অল্প ব্যায়ামে সামান্য উপকার হয়েছে।'),
        },
        {
          label: T('Skip it and finish repairs', 'বাদ দিয়ে মেরামত শেষ করো'),
          effects: { health: -10, power: 3 },
          why: T('Skipping exercise weakened the crew.', 'ব্যায়াম বাদ দেওয়ায় ক্রু দুর্বল হয়েছে।'),
        },
      ],
    },
    {
      id: 'micrometeorite',
      outposts: ['moon'],
      icon: '☄️',
      title: T('Micrometeorite hit', 'ক্ষুদ্র উল্কার আঘাত'),
      text: T('Tiny space rocks hit the hull. The Moon has almost no atmosphere to burn them up.', 'ছোট মহাকাশ-পাথর বেসের দেয়ালে লেগেছে। চাঁদে এগুলো পোড়ানোর মতো বায়ুমণ্ডল প্রায় নেই।'),
      fact: T(
        'The Moon has an extremely thin atmosphere, so meteoroids reach the surface without burning up.',
        'চাঁদের বায়ুমণ্ডল অত্যন্ত পাতলা, তাই উল্কাকণা না পুড়েই মাটিতে পৌঁছায়।'
      ),
      src: SRC.moon,
      choices: [
        {
          label: T('Patch the hull from inside', 'ভেতর থেকে দেয়াল প্যাচ করো'),
          effects: { life: -4, power: -3 },
          why: T('An inside patch stopped the leak quickly with little air lost.', 'ভেতর থেকে প্যাচ করায় অল্প বাতাস হারিয়ে লিক থেমেছে।'),
        },
        {
          label: T('Send the crew out to patch it (EVA)', 'ক্রু বাইরে গিয়ে প্যাচ করুক (EVA)'),
          effects: { life: -2, health: -10, shield: -6 },
          why: T('The outside repair was solid but exposed the crew to radiation.', 'বাইরের মেরামত ভালো হলেও ক্রু বিকিরণে ঝুঁকিতে ছিল।'),
        },
        {
          label: T('Ignore the tiny leak', 'ছোট লিক উপেক্ষা করো'),
          effects: { life: -22 },
          why: T('The ignored leak kept losing air.', 'উপেক্ষিত লিক বাতাস হারাতেই থাকল।'),
        },
      ],
    },
    {
      id: 'lunar_dust',
      outposts: ['moon'],
      icon: '🌫️',
      title: T('Sharp moon dust in the airlock', 'এয়ারলকে ধারালো চাঁদের ধুলো'),
      text: T('Fine dust clings to suits and is getting inside the habitat.', 'সূক্ষ্ম ধুলো স্যুটে লেগে বেসের ভেতরে ঢুকছে।'),
      fact: T(
        'Apollo astronauts reported that moon dust stuck to their suits and got into equipment.',
        'অ্যাপোলো নভোচারীরা জানিয়েছিলেন চাঁদের ধুলো স্যুটে লেগে থাকে আর যন্ত্রপাতিতে ঢুকে যায়।'
      ),
      src: SRC.moon,
      choices: [
        {
          label: T('Strict airlock cleaning routine', 'কড়া এয়ারলক পরিষ্কার নিয়ম'),
          effects: { health: 2, power: -4, life: 2 },
          why: T('A strict cleaning routine kept dust out of the air.', 'কড়া পরিষ্কারে ধুলো বাতাসে মেশেনি।'),
        },
        {
          label: T('Quick brush-off only', 'শুধু ঝটপট ঝেড়ে নাও'),
          effects: { health: -6, life: -6 },
          why: T('Leftover dust irritated lungs and clogged filters.', 'বাকি ধুলো ফুসফুসে জ্বালা আর ফিল্টারে জট ফেলেছে।'),
        },
        {
          label: T('Skip cleaning to save time', 'সময় বাঁচাতে পরিষ্কার বাদ দাও'),
          effects: { health: -12, life: -8, power: 2 },
          why: T('Skipping cleaning let dust spread through the base.', 'পরিষ্কার না করায় ধুলো পুরো বেসে ছড়িয়েছে।'),
        },
      ],
    },
    {
      id: 'shield_build',
      outposts: ['moon', 'mars'],
      icon: '🛡️',
      title: T('Build a radiation shield', 'বিকিরণ ঢাল বানাও'),
      text: T('Piling regolith (loose soil) over the habitat can add protection.', 'বেসের ওপর রেগোলিথ (আলগা মাটি) স্তূপ করলে সুরক্ষা বাড়ে।'),
      fact: {
        moon: T('The Moon has almost no atmosphere or magnetic field to block radiation, so crews need to shield their habitat.', 'চাঁদে বিকিরণ আটকানোর মতো বায়ুমণ্ডল বা চৌম্বক ক্ষেত্র প্রায় নেই, তাই বেসকে ঢাল দিয়ে ঢাকতে হয়।'),
        mars: T('Mars has only a thin atmosphere, so a habitat still needs extra shielding for long stays.', 'মঙ্গলের বায়ুমণ্ডল পাতলা, তাই দীর্ঘ থাকার জন্য বেসে বাড়তি ঢাল লাগে।'),
      },
      srcBy: { moon: SRC.moon, mars: SRC.mars },
      choices: [
        {
          label: T('Cover the whole habitat', 'পুরো বেস ঢেকে দাও'),
          effects: { shield: 24, health: -5, power: -8, food: -3 },
          why: T('Covering the whole habitat gave strong, lasting protection at a high work cost.', 'পুরো বেস ঢাকায় টেকসই সুরক্ষা মিলল, তবে শ্রম বেশি লেগেছে।'),
        },
        {
          label: T('Cover only the sleeping quarters', 'শুধু ঘুমানোর জায়গা ঢাকো'),
          effects: { shield: 12, power: -3 },
          why: T('Shielding the sleeping area gave a smart, cheap boost.', 'ঘুমানোর জায়গা ঢেকে কম খরচে ভালো সুরক্ষা মিলেছে।'),
        },
        {
          label: T('Skip it, not urgent', 'জরুরি না, বাদ দাও'),
          effects: { shield: -6 },
          why: T('With no new shielding, radiation protection kept falling.', 'নতুন ঢাল না বানানোয় সুরক্ষা কমতেই থাকল।'),
        },
      ],
    },
    {
      id: 'oxygen_isru',
      outposts: ['mars'],
      icon: '🌬️',
      title: T('Make oxygen from Mars air', 'মঙ্গলের বাতাস থেকে অক্সিজেন বানাও'),
      text: T('Mars air is mostly carbon dioxide. An oxygen unit can split it, but it needs power.', 'মঙ্গলের বাতাস বেশিরভাগ কার্বন ডাই-অক্সাইড। অক্সিজেন ইউনিট তা ভাঙতে পারে, তবে বিদ্যুৎ লাগে।'),
      fact: T(
        'NASA’s MOXIE experiment made oxygen from Mars’s carbon dioxide: over 100 grams in 13 runs, with a record of 10.56 grams per hour.',
        'NASA-র MOXIE পরীক্ষা মঙ্গলের কার্বন ডাই-অক্সাইড থেকে অক্সিজেন বানিয়েছে: ১৩ বারে ১০০ গ্রামের বেশি, সর্বোচ্চ ঘণ্টায় ১০.৫৬ গ্রাম।'
      ),
      src: SRC.moxie,
      choices: [
        {
          label: T('Run the oxygen unit for a full sol', 'পুরো সোল অক্সিজেন ইউনিট চালাও'),
          effects: { life: 16, power: -14 },
          why: T('A full-sol run made lots of oxygen but used a lot of power.', 'পুরো সোল চালিয়ে অনেক অক্সিজেন মিলল, কিন্তু বিদ্যুৎ বেশি গেছে।'),
        },
        {
          label: T('Run it at half power', 'অর্ধেক শক্তিতে চালাও'),
          effects: { life: 8, power: -7 },
          why: T('Half-power running balanced air and energy.', 'অর্ধেক শক্তিতে বাতাস ও বিদ্যুতের ভারসাম্য থাকল।'),
        },
        {
          label: T('Skip it', 'বাদ দাও'),
          effects: { life: -8, power: 4 },
          why: T('Without new oxygen, the air supply shrank.', 'নতুন অক্সিজেন না বানানোয় বাতাসের মজুত কমল।'),
        },
      ],
    },
  ];

  return {
    OUTPOSTS,
    EVENTS,
    SOLS: 8, // length of one mission
    UNLOCK_CORRECT_GUESSES: 5,
    RESOURCES: ['power', 'food', 'life', 'shield', 'health'],
    LABELS: {
      power: { icon: '⚡', en: 'Power', bn: 'বিদ্যুৎ' },
      food: { icon: '🥔', en: 'Food', bn: 'খাদ্য' },
      life: { icon: '💨', en: 'Life support', bn: 'লাইফ সাপোর্ট' },
      shield: { icon: '🛡️', en: 'Radiation shield', bn: 'বিকিরণ সুরক্ষা' },
      health: { icon: '❤️', en: 'Crew health', bn: 'ক্রুর স্বাস্থ্য' },
    },
  };
});
