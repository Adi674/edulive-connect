import { getToken, type Role, type SessionUser } from "./auth";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string | undefined;

export const isMockMode = !API_URL;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (isMockMode) {
    return mockRequest<T>(method, path, body);
  }
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.detail || `Request failed: ${res.status}`, res.status);
  }
  return data as T;
}

export const api = {
  get: <T,>(path: string) => request<T>("GET", path),
  post: <T,>(path: string, body?: unknown) => request<T>("POST", path, body),
  del: <T,>(path: string) => request<T>("DELETE", path),
};

// ---------- Named helpers ----------

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: SessionUser;
}

export const login = (email: string, password: string) =>
  api.post<AuthResponse>("/auth/login", { email, password });

export const register = (name: string, email: string, password: string, role: Role) =>
  api.post<SessionUser>("/auth/register", { name, email, password, role });

export interface JoinResponse {
  token: string;
  room_name: string;
  classroom_id: string;
  classroom_title: string;
  can_publish: boolean;
}

export const joinClassroom = (joinToken: string) =>
  api.post<JoinResponse>(`/classrooms/join/${joinToken}`);

export const leaveClassroom = (classroomId: string) =>
  api.post<{ message: string }>(`/classrooms/${classroomId}/leave`);

export const openMics = (classroomId: string) =>
  api.post<{ message: string }>(`/classrooms/${classroomId}/mic/open`);

export const closeMics = (classroomId: string) =>
  api.post<{ message: string }>(`/classrooms/${classroomId}/mic/close`);

export interface ParticipantOut {
  id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export const getParticipants = (classroomId: string) =>
  api.get<ParticipantOut[]>(`/classrooms/${classroomId}/participants`);

// ---------- Mock backend (Phase 1, no FastAPI configured) ----------

const mockState = {
  micsOpen: new Map<string, boolean>(),
};

async function mockRequest<T>(method: string, path: string, _body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 300));
  // Join: /classrooms/join/:token
  const joinMatch = path.match(/^\/classrooms\/join\/(.+)$/);
  if (joinMatch && method === "POST") {
    const joinToken = joinMatch[1];
    const classroomId = `mock-${joinToken}`;
    // Treat token "ended" / "scheduled" as error states for UI testing.
    if (joinToken === "ended") {
      throw new ApiError("This class has ended", 400);
    }
    if (joinToken === "scheduled") {
      throw new ApiError("Class has not started yet", 400);
    }
    return {
      token: "", // empty -> room will fall back to demo mode
      room_name: `room-${joinToken}`,
      classroom_id: classroomId,
      classroom_title: "Live Demo: Algebra Foundations",
      can_publish: mockState.micsOpen.get(classroomId) ?? false,
    } as T;
  }
  const micOpen = path.match(/^\/classrooms\/(.+)\/mic\/open$/);
  if (micOpen) { mockState.micsOpen.set(micOpen[1], true); return { message: "ok" } as T; }
  const micClose = path.match(/^\/classrooms\/(.+)\/mic\/close$/);
  if (micClose) { mockState.micsOpen.set(micClose[1], false); return { message: "ok" } as T; }
  if (path.endsWith("/leave") && method === "POST") return { message: "left" } as T;
  if (path.endsWith("/participants") && method === "GET") return [] as unknown as T;
  // Default
  return {} as T;
}
