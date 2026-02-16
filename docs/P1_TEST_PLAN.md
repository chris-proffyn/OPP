# P1 Foundation — Test plan

Reference: **P1_FOUNDATION_IMPLEMENTATION_TASKS.md** Section 10.

## 10.1 Unit tests (data layer)

Implemented in **`packages/data/src/players.test.ts`**. Run with:

```bash
npm run test
```
(Run from repo root; Jest is configured to run tests under `packages/`.)

| Task | Description | Status |
|------|-------------|--------|
| 10.1.1 | `getCurrentPlayer`: returns row when one exists; returns null when empty | ✅ |
| 10.1.2 | `createPlayer`: returns created row on success; throws CONFLICT on UNIQUE violation | ✅ |
| 10.1.3 | `updatePlayer`: returns updated row; empty payload returns current; no row → NOT_FOUND | ✅ |
| 10.1.4 | `listPlayers`: admin → returns list; non-admin → throws FORBIDDEN | ✅ |
| 10.1.5 | `getPlayerById`: returns row when RLS allows; null when no row (RLS-denied mocked as empty) | ✅ |

---

## 10.2 Integration / RLS

### 10.2.1 When local Supabase or test DB is available

Integration tests live in **`packages/data/src/players.integration.test.ts`**. They are **skipped** unless both of the following are set:

- `RUN_RLS_INTEGRATION=1`
- Supabase URL and anon key: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_TEST_URL` + `SUPABASE_TEST_ANON_KEY`)

**Run:**

```bash
RUN_RLS_INTEGRATION=1 VITE_SUPABASE_URL=<url> VITE_SUPABASE_ANON_KEY=<key> npm run test -- --testPathPattern=integration
```

**Requirements:** Test project or local Supabase with **“Confirm email”** disabled (so `signUp` allows immediate `signInWithPassword`). Migrations must be applied (`players` table + RLS).

**What the tests cover:**

- Create two auth users (A and B), each with a player row.
- User A can read and update only own row (`getCurrentPlayer`, `updatePlayer`).
- User B cannot read A’s row (`getPlayerById(clientB, A_id)` returns `null`).

**Admin path (B list all, read A):** Not automated (would require setting B’s `role = 'admin'` via SQL or service role). Verify manually per 10.2.2, or run SQL to set B as admin then open app as B and check `/admin/players` and “View” on A.

### 10.2.2 RLS verified manually — steps

1. **Two users:** Sign up two accounts (e.g. User A and User B). Complete onboarding for both so each has a `players` row.
2. **Own row only:** As User A, open profile and edit — should see only A’s data. As User B, open profile — should see only B’s data.
3. **No cross-read:** While signed in as User B, try to open a URL that would load User A’s player by ID (e.g. `/admin/players/<A’s player id>`). Without admin, B cannot be admin so use the data layer from browser console only if needed; the app does not expose “view other player” for non-admins. For admin: make User B an admin (SQL: `UPDATE players SET role = 'admin' WHERE ...`). As B, open `/admin/players` — should see list including A. Open A’s “View” — should see A’s read-only profile.
4. **Summary:** User can read/update only own row; admin can list all and read any player. RLS enforces this in the DB; the data layer and UI assume it.

---

## 10.3 Manual testing flows

Execute before release; tick when done.

- [ ] **10.3.1** Sign up → (receive or mock) verification → sign in → redirect to onboarding → complete profile → redirect to home → view profile → edit profile → sign out.
- [ ] **10.3.2** Sign in → forgot password → receive link → set new password → sign in with new password.
- [ ] **10.3.3** As non-admin: open `/admin` → redirect to not authorised or home.
- [ ] **10.3.4** As admin: open `/admin` → see layout → open Players → see list → open one player → see read-only profile.
- [ ] **10.3.5** Unauthenticated: open `/profile` or `/home` → redirect to sign-in.

---

## 10.4 Negative / edge-case tests

Execute manually; tick when done.

- [ ] **10.4.1** Submit onboarding twice (e.g. double-click or second tab): one succeeds, one gets “already have a profile” and redirect.
- [ ] **10.4.2** Profile edit with invalid email format: validation prevents submit or shows error.
- [ ] **10.4.3** Sign in with wrong password: clear error message, no crash.
- [ ] **10.4.4** Expired or invalid session: guard redirects to sign-in, no crash.
