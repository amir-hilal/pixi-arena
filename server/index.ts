import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import {
  createLobby,
  getLobby,
  getLobbyForSocket,
  isHost,
  joinLobby,
  removePlayer,
  setLobbyStatus,
} from './lobbyManager.js';
import {
  getMatchSnapshot,
  initializeMatch,
  removePlayerFromMatch,
  startMatchLoop,
  stopMatchLoop,
  storePlayerInput,
} from './matchManager.js';
import type {
  LobbyCreatePayload,
  LobbyErrorPayload,
  LobbyJoinPayload,
  LobbyState,
  MatchCountdownPayload,
  MatchSnapshotPayload,
  MatchStartedPayload,
  PlayerEliminatedPayload,
  PlayerInputPayload,
} from './types.js';

const PORT = Number(process.env.PORT ?? 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const COUNTDOWN_SECONDS = 3;

const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
  },
});

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);

  socket.on('lobby:create', (payload: LobbyCreatePayload) => {
    try {
      leaveCurrentLobby(socket, 'switch');
      const lobby = createLobby(socket.id, payload.playerName);
      socket.join(lobby.lobbyCode);
      socket.emit('lobby:state', lobby);
      console.log(`lobby create: ${lobby.lobbyCode} host=${socket.id}`);
    } catch (error) {
      emitLobbyError(socket.id, error);
    }
  });

  socket.on('lobby:join', (payload: LobbyJoinPayload) => {
    try {
      const targetLobby = getLobby(payload.lobbyCode);

      if (targetLobby === null) {
        throw new Error('Lobby not found.');
      }

      const currentLobby = getLobbyForSocket(socket.id);

      if (currentLobby?.lobbyCode === targetLobby.lobbyCode) {
        const lobby = joinLobby(socket.id, payload.lobbyCode, payload.playerName);
        socket.join(lobby.lobbyCode);
        emitLobbyState(lobby);
        console.log(`lobby join: ${lobby.lobbyCode} player=${socket.id}`);
        return;
      }

      if (targetLobby.status !== 'waiting') {
        throw new Error('Lobby is already in progress.');
      }

      if (targetLobby.players.length >= targetLobby.maxPlayers) {
        throw new Error('Lobby is full.');
      }

      if (currentLobby !== null) {
        leaveCurrentLobby(socket, 'switch');
      }

      const lobby = joinLobby(socket.id, payload.lobbyCode, payload.playerName);
      socket.join(lobby.lobbyCode);
      emitLobbyState(lobby);
      console.log(`lobby join: ${lobby.lobbyCode} player=${socket.id}`);
    } catch (error) {
      emitLobbyError(socket.id, error);
    }
  });

  socket.on('lobby:leave', () => {
    leaveCurrentLobby(socket, 'leave');
  });

  socket.on('lobby:startMatch', () => {
    const lobby = getLobbyForSocket(socket.id);

    if (lobby === null) {
      emitLobbyError(socket.id, new Error('Lobby not found.'));
      return;
    }

    if (!isHost(socket.id, lobby)) {
      emitLobbyError(socket.id, new Error('Only the host can start the match.'));
      return;
    }

    if (lobby.status !== 'waiting') {
      emitLobbyError(socket.id, new Error('Match is already in progress.'));
      return;
    }

    console.log(`start match: ${lobby.lobbyCode} host=${socket.id}`);
    startMatchCountdown(lobby);
  });

  socket.on('player:input', (payload: PlayerInputPayload) => {
    const lobby = getLobbyForSocket(socket.id);

    if (lobby === null || lobby.status !== 'playing') {
      return;
    }

    storePlayerInput(lobby.lobbyCode, socket.id, payload);
  });

  socket.on('disconnect', () => {
    leaveCurrentLobby(socket, 'disconnect');
    console.log(`socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`mock Socket.IO server listening on http://localhost:${PORT}`);
  console.log(`CORS origin: ${FRONTEND_ORIGIN}`);
});

function leaveCurrentLobby(
  socket: Socket,
  reason: 'leave' | 'disconnect' | 'switch',
): void {
  const lobby = getLobbyForSocket(socket.id);

  if (lobby === null) {
    return;
  }

  const lobbyCode = lobby.lobbyCode;
  const match = lobby.match;
  const updatedLobby = removePlayer(socket.id);
  socket.leave(lobbyCode);
  removePlayerFromMatch(lobbyCode, socket.id, match);

  console.log(`lobby ${reason}: ${lobbyCode} player=${socket.id}`);

  if (updatedLobby !== null) {
    emitLobbyState(updatedLobby);
  } else {
    stopMatchLoop(lobbyCode);
  }
}

function startMatchCountdown(lobby: LobbyState): void {
  const updatedLobby = setLobbyStatus(lobby.lobbyCode, 'countdown');

  if (updatedLobby === null) {
    return;
  }

  emitLobbyState(updatedLobby);

  let secondsRemaining = COUNTDOWN_SECONDS;
  emitCountdown(updatedLobby.lobbyCode, secondsRemaining);

  const interval = setInterval(() => {
    secondsRemaining -= 1;

    if (secondsRemaining > 0) {
      emitCountdown(updatedLobby.lobbyCode, secondsRemaining);
      return;
    }

    clearInterval(interval);

    const playingLobby = setLobbyStatus(updatedLobby.lobbyCode, 'playing');

    if (playingLobby === null) {
      return;
    }

    const match = initializeMatch(playingLobby);

    emitLobbyState(playingLobby);
    emitMatchStarted(playingLobby.lobbyCode, match.matchId, getMatchSnapshot(match));
    startMatchLoop(
      playingLobby,
      (snapshot) => {
        emitMatchSnapshot(playingLobby.lobbyCode, snapshot);
      },
      (elimination) => {
        emitPlayerEliminated(playingLobby.lobbyCode, elimination);
      },
    );
  }, 1000);
}

function emitLobbyState(lobby: LobbyState): void {
  io.to(lobby.lobbyCode).emit('lobby:state', lobby);
}

function emitLobbyError(socketId: string, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unexpected lobby error.';
  const payload: LobbyErrorPayload = { message };

  io.to(socketId).emit('lobby:error', payload);
}

function emitCountdown(lobbyCode: string, secondsRemaining: number): void {
  const payload: MatchCountdownPayload = { secondsRemaining };

  io.to(lobbyCode).emit('match:countdown', payload);
}

function emitMatchStarted(
  lobbyCode: string,
  matchId: string,
  initialState: MatchSnapshotPayload,
): void {
  const payload: MatchStartedPayload = {
    matchId,
    initialState,
  };

  io.to(lobbyCode).emit('match:started', payload);
}

function emitMatchSnapshot(
  lobbyCode: string,
  snapshot: MatchSnapshotPayload,
): void {
  io.to(lobbyCode).emit('match:snapshot', snapshot);
}

function emitPlayerEliminated(
  lobbyCode: string,
  payload: PlayerEliminatedPayload,
): void {
  io.to(lobbyCode).emit('player:eliminated', payload);
}
