/*
 * SpaceSkribble – one Node server for everything:
 *   • website (public/)         • login / register / progress  (routes/auth.js)
 *   • live NASA data proxy      (routes/nasa.js)
 *   • NOVA AI assistant         (routes/nova.js)
 *   • Socket.IO multiplayer     (rules live in public/engine.js)
 */
try { require('dotenv').config({ quiet: true }); } catch {}

const http = require('http');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { Room, makeRoomCode } = require('./public/engine.js');
const { saveLearningProgress } = require('./lib/db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const TICK_MS = 250;
const IS_PROD = process.env.NODE_ENV === 'production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// ── secret for login tokens ──
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  if (IS_PROD) throw new Error('Set JWT_SECRET (32+ random characters) in production.');
  JWT_SECRET = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️  JWT_SECRET not set: using a temporary one (everyone must log in again after a restart).');
}

const app = express();
app.set('trust proxy', 1); // Render / Railway sit behind a proxy
app.use(
  helmet({
    contentSecurityPolicy: false, // pages use inline scripts/styles; enable with nonces later
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN.split(',') }));
app.use(express.json({ limit: '20kb' }));

const { router: authRouter, authenticate } = require('./routes/auth')(JWT_SECRET);
app.use('/', authRouter);
app.use('/api/nasa', require('./routes/nasa')());
app.use('/api/nova', require('./routes/nova')(authenticate));
app.use('/api/mission', require('./routes/mission')(authenticate));
app.get('/api/health', (_req, res) => res.json({ ok: true, nova: !!process.env.ANTHROPIC_API_KEY }));

// Images: Netlify serves /.netlify/images; locally we just redirect to the original file.
app.get('/.netlify/images', (req, res) => {
  const u = String(req.query.url || '/');
  res.redirect(u.startsWith('/') && !u.startsWith('//') ? u : '/');
});

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders(res, file) {
      if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
    },
  })
);
app.use((_req, res) => res.status(404).type('text').send('Not found'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN === '*' ? '*' : CLIENT_ORIGIN.split(',') },
});

// Only logged-in players may connect to the game.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Please log in to play.'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'spaceskribble' });
    if (!Number.isInteger(decoded.userId)) return next(new Error('Invalid login token.'));
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Login expired. Please log in again.'));
  }
});

const rooms = new Map();

function createRoom() {
  let code;
  do {
    code = makeRoomCode();
  } while (rooms.has(code));

  const room = new Room({
    code,
    emit(to, event, payload) {
      if (to === 'all') io.to(code).emit('evt', { event, payload });
      else if (to && to.except) io.to(code).except(to.except).emit('evt', { event, payload });
      else io.to(to).emit('evt', { event, payload });
    },
  });

  // Correct guess → +10 XP in the player's account (runs inside this server, no extra HTTP call).
  room.onCorrectGuess = (player, details) => {
    if (!player?.userId) return;
    try {
      saveLearningProgress(player.userId, `guess:${details.roomCode}:${details.turnIndex}:${player.userId}`, details.category);
    } catch (error) {
      console.error('Learning progress save failed:', error.message);
    }
  };

  rooms.set(code, room);
  return room;
}

io.on('connection', (socket) => {
  let room = null;

  const sendError = (message) => socket.emit('evt', { event: 'error', payload: { message } });

  function enter(target, profile) {
    const result = target.join(socket.id, profile);
    if (result.error) return sendError(result.error);
    const player = target.players.get(socket.id);
    if (player && socket.data.userId) player.userId = socket.data.userId;
    room = target;
    socket.join(target.code);
    socket.emit('evt', { event: 'joined', payload: { code: target.code, you: socket.id } });
    target.broadcastState();
  }

  socket.on('evt', ({ event, payload } = {}) => {
    if (!event) return;
    try {
      switch (event) {
        case 'createRoom':
          enter(createRoom(), payload?.profile || payload || {});
          break;
        case 'joinRoom': {
          const target = rooms.get(String(payload?.code || '').trim().toUpperCase());
          if (!target) return sendError('Room not found.');
          enter(target, payload?.profile || {});
          break;
        }
        case 'leaveRoom':
          if (room) {
            room.leave(socket.id);
            socket.leave(room.code);
            room.broadcastState();
            room = null;
          }
          break;
        default:
          if (!room) return sendError('Join a room first.');
          if (typeof room.handleEvent === 'function') room.handleEvent(socket.id, event, payload);
          else sendError('This game event is not configured: ' + event);
      }
    } catch (error) {
      console.error('Socket event error:', error);
      sendError('Could not process the game action.');
    }
  });

  socket.on('disconnect', () => {
    if (room) {
      room.leave(socket.id);
      room.broadcastState();
      room = null;
    }
  });
});

// Game clock + cleanup of empty rooms
const ticker = setInterval(() => {
  for (const [code, room] of rooms) {
    if (room.players.size === 0) {
      rooms.delete(code);
      continue;
    }
    try {
      room.tick(TICK_MS);
    } catch (error) {
      console.error('Room tick error:', error);
    }
  }
}, TICK_MS);

server.listen(PORT, () => console.log(`SpaceSkribble running: http://localhost:${PORT}`));

function shutdown() {
  clearInterval(ticker);
  io.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
