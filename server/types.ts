import type {
  EnemyState,
  InputState,
  MatchSnapshot,
  MatchState,
  PlayerState,
} from '../src/shared/types/index.js';

export type LobbyStatus = 'waiting' | 'countdown' | 'playing';

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
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

export interface ServerMatchState extends MatchState {
  players: PlayerState[];
  enemies: EnemyState[];
}
