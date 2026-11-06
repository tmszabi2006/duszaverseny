import type { RuntimeErrorInfo } from '@minescript/shared';

export interface User {
  id: number;
  username: string;
  createdAt?: string;
}

export interface MapSummary {
  id: number;
  name: string;
  description: string;
  width: number;
  height: number;
  goldCount: number;
  isPublic: boolean;
  owner: string;
  isOwner: boolean;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MapDetail extends MapSummary {
  data: string;
}

export interface Run {
  id: number;
  mapId: number;
  mapName: string;
  programSource: string;
  gold: number;
  steps: number;
  error: RuntimeErrorInfo | null;
  createdAt: string;
}

export interface RunStats {
  totalRuns: number;
  totalGold: number;
  mapsTried: number;
  cleanRuns: number;
  bestGold: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  gold: number;
  steps: number;
  errorCode: string | null;
  createdAt: string;
  isCurrentUser: boolean;
}

export interface RunResponse {
  run: Run;
  result: {
    gold: number;
    initialGold: number;
    steps: number;
    error: RuntimeErrorInfo | null;
  };
}

export interface UserResponse {
  user: User;
}

export interface MapsResponse {
  maps: MapSummary[];
}

export interface MapResponse {
  map: MapDetail;
}

export interface LeaderboardResponse {
  map: MapSummary;
  entries: LeaderboardEntry[];
}

export interface RunsResponse {
  runs: Run[];
  stats: RunStats;
}
