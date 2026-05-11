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

// ---------- Batch management (Phase 6) ----------

export interface BatchOut {
  id: string;
  teacher_id: string;
  name: string;
  description: string | null;
  batch_code: string;
  created_at: string;
}

export interface BatchDetailOut extends BatchOut {
  student_count: number;
}

export interface ClassroomOut {
  id: string;
  teacher_id: string;
  batch_id: string;
  title: string;
  description: string | null;
  room_name: string;
  join_token: string;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number;
  created_at: string;
}

export interface RecordingOut {
  id: string;
  classroom_id: string;
  egress_id: string;
  s3_key: string | null;
  url: string | null;
  status: "recording" | "completed" | "failed";
  started_at: string;
  ended_at: string | null;
}

export interface ClassroomDetailOut extends ClassroomOut {
  recordings: RecordingOut[];
}

// Batch CRUD
export const getTeacherBatches = () =>
  api.get<BatchDetailOut[]>("/batches");

export const getStudentBatches = () =>
  api.get<BatchOut[]>("/batches/my");

export const createBatch = (name: string, description?: string) =>
  api.post<BatchOut>("/batches", { name, description });

export const getBatch = (batchId: string) =>
  api.get<BatchDetailOut>(`/batches/${batchId}`);

export const joinBatch = (batchCode: string) =>
  api.post<unknown>("/batches/join", { batch_code: batchCode });

// Classroom listing
export const getClassroomsForBatch = (batchId: string) =>
  api.get<ClassroomOut[]>(`/classrooms/batch/${batchId}`);

export const getClassroomDetail = (classroomId: string) =>
  api.get<ClassroomDetailOut>(`/classrooms/${classroomId}/detail`);

// Classroom creation (teacher)
export const createClassroom = (
  title: string,
  batchId: string,
  description?: string,
  scheduledAt?: string,
  durationMinutes?: number,
) =>
  api.post<ClassroomOut>("/classrooms", undefined,)  // query params below
// NOTE: FastAPI classroom create uses query params, not body:
// POST /classrooms?title=...&batch_id=...&description=...&scheduled_at=...&duration_minutes=...
// Use the raw fetch below:

// Raw helper for query-param POST (classroom creation)
export async function createClassroomRaw(params: {
  title: string;
  batch_id: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
}): Promise<ClassroomOut> {
  const token = getToken();
  const qs = new URLSearchParams();
  qs.set("title", params.title);
  qs.set("batch_id", params.batch_id);
  if (params.description) qs.set("description", params.description);
  if (params.scheduled_at) qs.set("scheduled_at", params.scheduled_at);
  if (params.duration_minutes) qs.set("duration_minutes", String(params.duration_minutes));

  const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (!API_URL) throw new Error("No API_URL");

  const res = await fetch(`${API_URL}/classrooms?${qs.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.detail || "Failed to create classroom", res.status);
  return data as ClassroomOut;
}

export const startClass = (classroomId: string) =>
  api.post<ClassroomOut>(`/classrooms/${classroomId}/start`);

export const endClass = (classroomId: string) =>
  api.post<ClassroomOut>(`/classrooms/${classroomId}/end`);

// Recording controls
export const startRecording = (classroomId: string) =>
  api.post<RecordingOut>(`/classrooms/${classroomId}/recording/start`);

export const stopRecording = (classroomId: string) =>
  api.post<RecordingOut>(`/classrooms/${classroomId}/recording/stop`);

export const getRecordings = (classroomId: string) =>
  api.get<RecordingOut[]>(`/classrooms/${classroomId}/recordings`);

export const getRecordingUrl = (recordingId: string) =>
  api.get<{ url: string; expires_in_seconds: number }>(
    `/classrooms/recordings/${recordingId}/url`
  );

// Enrolled students (teacher view)
export const getEnrolledStudents = (batchId: string) =>
  api.get<Array<{ id: string; name: string; email: string; role: string; enrolled_at: string; enrolled_via: string }>>(
    `/batches/${batchId}/students`
  );