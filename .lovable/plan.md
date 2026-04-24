# Phase 6 — Auth Pages & Dashboard

## New files
1. **`src/pages/LoginPage.tsx`** — centered card, react-hook-form + zod (email, password ≥6). Calls `login()` → `saveSession()` → navigate to `?redirect=` or `/dashboard`. Inline 401 + generic error handling, loading spinner on submit. Link to `/register`. GraduationCap + "EduLive" header.
2. **`src/pages/RegisterPage.tsx`** — same visual shell. Fields: name, email, password (≥8), pill role selector (Student default / Teacher) styled with `bg-primary text-white` vs `bg-secondary text-muted-foreground`. Submit: `registerUser()` → `login()` → `saveSession()` → `/dashboard`. 409 inline error. Helper text under role selector. Link to `/login`.
3. **`src/pages/DashboardPage.tsx`** — top navbar (logo left; name + role badge + Logout right). Centered `max-w-2xl` content with:
   - **Join a Class** card: input accepting URL or token, parses last `/` segment, navigates to `/room/{token}`. Empty validation.
   - **Quick Start a Class** card (teachers only): explanatory muted text + "Logged in as [name] · [role]".
   On mount: `getSession()` → if null redirect `/login`. Logout: `clearSession()` → `/login`.

## Edits
4. **`src/App.tsx`** — register `/login`, `/register`, `/dashboard` routes above the catch-all.
5. **`src/pages/RoomJoinPage.tsx`** — at start of join `useEffect`, add guard: `if (!isMockMode && !getSession()) navigate('/login?redirect=/room/' + joinToken)`.
6. **`src/pages/Index.tsx`** — replace the disabled Login/Register buttons in the header with real `<Link>`s to `/login` and `/register`.

## Constraints honored
- No edits to `lib/api.ts`, `lib/auth.ts`, or any room components.
- Reuses existing shadcn/ui (`Card`, `Button`, `Input`, `Label`, `Badge`) + `react-hook-form` + `zod` (already installed).
- All navigation via `useNavigate` from `react-router-dom`.
- Mock mode preserved: auth guard is skipped when `isMockMode` is true.
- Toast errors via `sonner` for non-inline failures.
