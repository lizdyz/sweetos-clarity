
# Fix: Stop the login bounce

## What's broken
Successful sign-in returns a valid session, but the user lands back on `/login` because:

1. **Race condition** — `navigate({ to: "/" })` fires before Supabase finishes writing the session to localStorage. The `/` route's `beforeLoad` calls `getSession()`, gets `null`, and redirects back to `/login`.
2. **Two sources of truth** — `AuthProvider` tracks session via `onAuthStateChange` (correct, reactive), but route guards independently re-query `getSession()` (racy, async).
3. **Stale preload** — `defaultPreloadStaleTime: 0` forces guard re-execution on every hover/navigation, amplifying the flap.

## The fix (3 small, surgical changes)

### 1. Make auth state the single source of truth via router context
Pass the live `AuthProvider` state into TanStack Router context so `beforeLoad` reads the **already-resolved** session synchronously instead of re-querying Supabase.

- `src/router.tsx` — declare `context: { auth: AuthState }` shape, switch root to `createRootRouteWithContext<{ auth: AuthState }>()`
- `src/routes/__root.tsx` — inject the live auth value into the router via `router.update({ context })` inside `RootComponent`, after `AuthProvider` mounts
- `src/routes/_app.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx` — replace `await supabase.auth.getSession()` in `beforeLoad` with `context.auth.session` (synchronous read)

### 2. Wait for auth to finish loading before guarding
Add a guard in `beforeLoad` that waits for `auth.loading === false` before deciding. This eliminates the race entirely — guards never run while the session is still being hydrated.

### 3. Login form: navigate after the auth state actually flips
Instead of calling `navigate()` immediately after `signInWithPassword()` resolves, listen for `session` to become non-null in `AuthProvider`, then navigate. Use a small `useEffect` in `LoginPage` that watches `auth.session` and triggers `navigate({ to: "/today" })` once it's set. (Skip the `/` hop — go straight to `/today`.)

### 4. Small cleanup
- Remove `defaultPreloadStaleTime: 0` from router config (it's the wrong default for an auth-guarded app and causes guard thrash on hover-preload)
- `/index.tsx` keeps its redirect logic but reads from context, so it resolves instantly

## Why this works
- No more async `getSession()` calls in `beforeLoad` → no race window
- Single source of truth (`AuthProvider`) → no contradictory state between guards
- Login form waits for the actual state transition → no premature navigation
- Removing aggressive preload staleness → guards don't re-run on every mouse hover

## Files touched
- `src/router.tsx` — context type, remove `defaultPreloadStaleTime`
- `src/routes/__root.tsx` — wire auth into router context
- `src/routes/_app.tsx` — read from `context.auth`, wait for `!loading`
- `src/routes/index.tsx` — read from `context.auth`
- `src/routes/login.tsx` — `useEffect` to navigate on session arrival, read from `context.auth` in `beforeLoad`
- `src/lib/auth-context.tsx` — export `AuthState` type for router context typing (already mostly there)

No DB changes. No new dependencies. Pure client-side wiring fix.
