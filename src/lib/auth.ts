export type Role = "student" | "teacher" | "support" | "admin";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const TOKEN_KEY = "edulive_token";
const USER_KEY = "edulive_user";

// src/lib/auth.ts - Change localStorage to sessionStorage
export function saveSession(token: string, user: SessionUser) {
  sessionStorage.setItem(TOKEN_KEY, token); // Unique to this tab
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}


export function getSession(): { token: string; user: SessionUser } | null {
  // Fix: Changed from localStorage to sessionStorage
  const token = sessionStorage.getItem(TOKEN_KEY);
  const userRaw = sessionStorage.getItem(USER_KEY);

  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) as SessionUser };
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function getRole(): Role | null {
  return getSession()?.user.role ?? null;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Dev helper: set a mock session so room flows are previewable without a backend. */
export function ensureMockSession(role: Role = "student") {
  if (getSession()) return;
  saveSession("mock-jwt-token", {
    id: crypto.randomUUID(),
    name: role === "teacher" ? "Prof. Anya Sharma" : "Riya Student",
    email: `${role}@edulive.dev`,
    role,
  });
}
