import type {
  EnemyState,
  InputState,
  MatchResult,
  MatchSnapshot,
  MatchState,
  PlayerState,
} from '../src/shared/types/index.js';

export type LobbyStatus = 'waiting' | 'countdown' | 'playing' | 'finished';
export type LobbyPlayerLocation = 'lobby' | 'playing' | 'results';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  location: LobbyPlayerLocation;
}

export interface LobbyState {
  lobbyCode: string;
  players: LobbyPlayer[];
  status: LobbyStatus;
  maxPlayers: 4;
  match?: ServerMatchState;
}

export interface LobbyCreatePayload {
  playerName: string;
}

export interface LobbyJoinPayload {
  lobbyCode: string;
  playerName: string;
}

export interface LobbyReturnPayload {}

export interface LobbyErrorPayload {
  message: string;
}

export interface MatchCountdownPayload {
  secondsRemaining: number;
}

export interface MatchStartedPayload {
  matchId: string;
  initialState: MatchSnapshot;
}

export type MatchSnapshotPayload = MatchSnapshot;

export interface PlayerInputPayload extends InputState {}

export interface PlayerEliminatedPayload {
  playerId: string;
  rank: number;
}

export interface MatchFinishedPayload {
  result: MatchResult;
}

export interface ServerMatchState extends MatchState {
  players: PlayerState[];
  enemies: EnemyState[];
}
