import type { LobbyState } from './types.js';

const MAX_PLAYERS = 4;
const LOBBY_CODE_LENGTH = 4;
const LOBBY_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const lobbies = new Map<string, LobbyState>();
const socketLobbyCodes = new Map<string, string>();

export function createLobby(socketId: string, playerName: string): LobbyState {
  const lobbyCode = generateUniqueLobbyCode();
  const lobby: LobbyState = {
    lobbyCode,
    players: [
      {
        id: socketId,
        name: normalizePlayerName(playerName),
        isHost: true,
        isConnected: true,
      },
    ],
    status: 'waiting',
    maxPlayers: MAX_PLAYERS,
  };

  lobbies.set(lobbyCode, lobby);
  socketLobbyCodes.set(socketId, lobbyCode);

  return lobby;
}

export function joinLobby(
  socketId: string,
  lobbyCode: string,
  playerName: string,
): LobbyState {
  const normalizedLobbyCode = lobbyCode.trim().toUpperCase();
  const lobby = getLobbyOrThrow(normalizedLobbyCode);

  if (lobby.status !== 'waiting') {
    throw new Error('Lobby is already in progress.');
  }

  if (lobby.players.length >= lobby.maxPlayers) {
    throw new Error('Lobby is full.');
  }

  removePlayer(socketId);

  lobby.players.push({
    id: socketId,
    name: normalizePlayerName(playerName),
    isHost: false,
    isConnected: true,
  });
  socketLobbyCodes.set(socketId, lobby.lobbyCode);

  return lobby;
}

export function removePlayer(socketId: string): LobbyState | null {
  const lobbyCode = socketLobbyCodes.get(socketId);

  if (lobbyCode === undefined) {
    return null;
  }

  const lobby = lobbies.get(lobbyCode);
  socketLobbyCodes.delete(socketId);

  if (lobby === undefined) {
    return null;
  }

  const playerIndex = lobby.players.findIndex((player) => player.id === socketId);

  if (playerIndex === -1) {
    return lobby;
  }

  const [removedPlayer] = lobby.players.splice(playerIndex, 1);

  if (removedPlayer.isHost && lobby.players.length > 0) {
    lobby.players[0].isHost = true;
  }

  if (lobby.players.length === 0) {
    lobbies.delete(lobby.lobbyCode);
    return null;
  }

  return lobby;
}

export function getLobbyForSocket(socketId: string): LobbyState | null {
  const lobbyCode = socketLobbyCodes.get(socketId);

  return lobbyCode === undefined ? null : lobbies.get(lobbyCode) ?? null;
}

export function getLobby(lobbyCode: string): LobbyState | null {
  return lobbies.get(lobbyCode.trim().toUpperCase()) ?? null;
}

export function isHost(socketId: string, lobby: LobbyState): boolean {
  return lobby.players.some((player) => player.id === socketId && player.isHost);
}

export function setLobbyStatus(
  lobbyCode: string,
  status: LobbyState['status'],
): LobbyState | null {
  const lobby = getLobby(lobbyCode);

  if (lobby === null) {
    return null;
  }

  lobby.status = status;
  return lobby;
}

function getLobbyOrThrow(lobbyCode: string): LobbyState {
  const lobby = lobbies.get(lobbyCode);

  if (lobby === undefined) {
    throw new Error('Lobby not found.');
  }

  return lobby;
}

function generateUniqueLobbyCode(): string {
  let lobbyCode = generateLobbyCode();

  while (lobbies.has(lobbyCode)) {
    lobbyCode = generateLobbyCode();
  }

  return lobbyCode;
}

function generateLobbyCode(): string {
  let code = '';

  for (let index = 0; index < LOBBY_CODE_LENGTH; index += 1) {
    const charIndex = Math.floor(Math.random() * LOBBY_CODE_CHARS.length);
    code += LOBBY_CODE_CHARS[charIndex];
  }

  return code;
}

function normalizePlayerName(playerName: string): string {
  const trimmedName = playerName.trim();

  return trimmedName.length === 0 ? 'Player' : trimmedName;
}
