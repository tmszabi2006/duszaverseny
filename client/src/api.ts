import type {
  LeaderboardResponse,
  MapResponse,
  MapsResponse,
  RunResponse,
  RunsResponse,
  User,
  UserResponse,
} from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details?: { line?: number } & Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatot.');
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = payload as { message?: string; code?: string; details?: Record<string, unknown> } | null;
    throw new ApiError(
      response.status,
      body?.message ?? `A kérés sikertelen (${response.status}).`,
      body?.code,
      body?.details as ApiError['details'],
    );
  }

  return payload as T;
}

export const api = {
  me: () => request<UserResponse>('/api/auth/me'),
  login: (username: string, password: string) =>
    request<UserResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string) =>
    request<UserResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  listMaps: () => request<MapsResponse>('/api/maps'),
  getMap: (id: number) => request<MapResponse>(`/api/maps/${id}`),
  createMap: (input: { name: string; description: string; data: string; isPublic: boolean }) =>
    request<MapResponse>('/api/maps', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateMap: (
    id: number,
    input: { name: string; description: string; data: string; isPublic: boolean },
  ) =>
    request<MapResponse>(`/api/maps/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteMap: (id: number) => request<void>(`/api/maps/${id}`, { method: 'DELETE' }),

  run: (mapId: number, source: string) =>
    request<RunResponse>('/api/runs', {
      method: 'POST',
      body: JSON.stringify({ mapId, source }),
    }),
  myRuns: () => request<RunsResponse>('/api/runs/mine'),
  leaderboard: (mapId: number) =>
    request<LeaderboardResponse>(`/api/maps/${mapId}/leaderboard`),
};

export function userFromResponse(response: UserResponse): User {
  return response.user;
}
