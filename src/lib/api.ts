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

// ---------- Phase 3: Individual mic control ----------

export const grantStudentMic = (classroomId: string, studentId: string) =>
  api.post<{ message: string; student_id: string }>(
    `/classrooms/${classroomId}/mic/grant/${studentId}`
  );

export const revokeStudentMic = (classroomId: string, studentId: string) =>
  api.post<{ message: string; student_id: string }>(
    `/classrooms/${classroomId}/mic/revoke/${studentId}`
  );

export interface StudentMicStatus {
  student_id: string;
  name: string;
  email: string;
  mic_granted: boolean;
}

export const getMicStatus = (classroomId: string) =>
  api.get<StudentMicStatus[]>(`/classrooms/${classroomId}/mic/status`);

// ---------- Phase 3: Token refresh ----------

export interface TokenRefreshResponse {
  token: string;
  can_publish: boolean;
  can_publish_audio: boolean;
}

export const refreshToken = (classroomId: string) =>
  api.get<TokenRefreshResponse>(`/classrooms/${classroomId}/token/refresh`);

// ---------- Phase 4: SSE events URL ----------

/**
 * Returns the full URL for the SSE events endpoint for a classroom.
 * Returns null in mock/demo mode (no API_URL configured).
 *
 * The EventSource will connect to:
 *   GET /api/v1/classrooms/{classroomId}/events
 *
 * The backend pushes events:
 *   - event: "mic_granted"  data: {"student_id": "..."}
 *   - event: "mic_revoked"  data: {"student_id": "..."}
 *   - event: "ping"         data: {}  (keepalive every ~25s)
 */
export function getClassroomEventsUrl(classroomId: string): string | null {
  if (!API_URL) return null;
  return `${API_URL}/classrooms/${classroomId}/events`;
}

// ---------- Participants ----------

export interface ParticipantOut {
  id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export const getParticipants = (classroomId: string) =>
  api.get<ParticipantOut[]>(`/classrooms/${classroomId}/participants`);

// ---------- Mock backend (no FastAPI configured) ----------

const mockState = {
  micsOpen: new Map<string, boolean>(),
  micGranted: new Map<string, boolean>(), // classroomId -> granted for current user
};

// Expose mock helpers on window for manual testing in the browser console:
// window.__mockGrantMic("mock-demo123")
// window.__mockRevokeMic("mock-demo123")
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__mockGrantMic = (classroomId: string) => {
    mockState.micGranted.set(classroomId, true);
    mockSseEmit(classroomId, "mic_granted");
  };
  (window as unknown as Record<string, unknown>).__mockRevokeMic = (classroomId: string) => {
    mockState.micGranted.set(classroomId, false);
    mockSseEmit(classroomId, "mic_revoked");
  };
}

// Simple in-memory SSE emitter for mock mode
const mockSseListeners = new Map<string, Set<(event: string) => void>>();

function mockSseEmit(classroomId: string, event: string) {
  const listeners = mockSseListeners.get(classroomId);
  if (listeners) {
    listeners.forEach((fn) => fn(event));
  }
}

async function mockRequest<T>(method: string, path: string, _body?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 300));

  // Join: /classrooms/join/:token
  const joinMatch = path.match(/^\/classrooms\/join\/(.+)$/);
  if (joinMatch && method === "POST") {
    const joinToken = joinMatch[1];
    const classroomId = `mock-${joinToken}`;
    if (joinToken === "ended") {
      throw new ApiError("This class has ended", 400);
    }
    if (joinToken === "scheduled") {
      throw new ApiError("Class has not started yet", 400);
    }
    return {
      token: "",
      room_name: `room-${joinToken}`,
      classroom_id: classroomId,
      classroom_title: "Live Demo: Algebra Foundations",
      can_publish: mockState.micsOpen.get(classroomId) ?? false,
    } as T;
  }

  const micOpen = path.match(/^\/classrooms\/(.+)\/mic\/open$/);
  if (micOpen && method === "POST") {
    mockState.micsOpen.set(micOpen[1], true);
    return { message: "ok" } as T;
  }

  const micClose = path.match(/^\/classrooms\/(.+)\/mic\/close$/);
  if (micClose && method === "POST") {
    mockState.micsOpen.set(micClose[1], false);
    return { message: "ok" } as T;
  }

  const micGrant = path.match(/^\/classrooms\/(.+)\/mic\/grant\/(.+)$/);
  if (micGrant && method === "POST") {
    mockState.micGranted.set(micGrant[1], true);
    mockSseEmit(micGrant[1], "mic_granted");
    return { message: "Mic granted", student_id: micGrant[2] } as T;
  }

  const micRevoke = path.match(/^\/classrooms\/(.+)\/mic\/revoke\/(.+)$/);
  if (micRevoke && method === "POST") {
    mockState.micGranted.set(micRevoke[1], false);
    mockSseEmit(micRevoke[1], "mic_revoked");
    return { message: "Mic revoked", student_id: micRevoke[2] } as T;
  }

  const micStatus = path.match(/^\/classrooms\/(.+)\/mic\/status$/);
  if (micStatus && method === "GET") {
    return [] as unknown as T;
  }

  const tokenRefresh = path.match(/^\/classrooms\/(.+)\/token\/refresh$/);
  if (tokenRefresh && method === "GET") {
    const classroomId = tokenRefresh[1];
    const micGranted = mockState.micGranted.get(classroomId) ?? false;
    const micOpen = mockState.micsOpen.get(classroomId) ?? false;
    const canPublishAudio = micGranted || micOpen;
    return {
      token: "",
      can_publish: canPublishAudio,
      can_publish_audio: canPublishAudio,
    } as T;
  }

  if (path.endsWith("/leave") && method === "POST") return { message: "left" } as T;
  if (path.endsWith("/participants") && method === "GET") return [] as unknown as T;

  return {} as T;
}

/**
 * Mock SSE subscription for demo mode.
 * Returns an unsubscribe function.
 * Usage: useMicPermissionSync will call getClassroomEventsUrl which returns null in mock mode,
 * so this is only used if you want to test SSE manually via window.__mockGrantMic().
 */
export function subscribeMockSse(
  classroomId: string,
  onEvent: (event: string) => void
): () => void {
  if (!mockSseListeners.has(classroomId)) {
    mockSseListeners.set(classroomId, new Set());
  }
  mockSseListeners.get(classroomId)!.add(onEvent);
  return () => {
    mockSseListeners.get(classroomId)?.delete(onEvent);
  };
}