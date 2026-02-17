/**
 * Integration tests for RLS (10.2.1). Run only when a test Supabase is available:
 *
 *   RUN_RLS_INTEGRATION=1 VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run test -- --testPathPattern=integration
 *
 * Requirements: Use a test project or local Supabase with "Confirm email" disabled so signUp
 * allows immediate sign-in. Migrations must be applied (players table + RLS).
 *
 * Covers: two users; A can read/update own row; B cannot read A's row (getPlayerById);
 * admin path (B list all, read A) is manual or requires setting B's role via SQL — see P1_TEST_PLAN.md.
 */

import {
  createPlayer,
  createSupabaseClient,
  getCurrentPlayer,
  getPlayerById,
  updatePlayer,
} from './index';

const env = {
  url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_TEST_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_TEST_ANON_KEY,
};

const shouldRun =
  process.env.RUN_RLS_INTEGRATION === '1' && env.url && env.anonKey;

const describeRLS = shouldRun ? describe : describe.skip;

function uniqueEmail(): string {
  return `rls-test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
}

const PASSWORD = 'test-password-12345';

describeRLS('RLS integration (10.2.1)', () => {
  let clientA: ReturnType<typeof createSupabaseClient>;
  let clientB: ReturnType<typeof createSupabaseClient>;
  let emailA: string;
  let emailB: string;
  let playerAId: string;

  beforeAll(async () => {
    emailA = uniqueEmail();
    emailB = uniqueEmail();
    clientA = createSupabaseClient({ url: env.url!, anonKey: env.anonKey! });
    clientB = createSupabaseClient({ url: env.url!, anonKey: env.anonKey! });

    const { error: errA } = await clientA.auth.signUp({ email: emailA, password: PASSWORD });
    if (errA) throw errA;
    const { error: signInA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: PASSWORD,
    });
    if (signInA) throw signInA;

    const { error: errB } = await clientB.auth.signUp({ email: emailB, password: PASSWORD });
    if (errB) throw errB;
    const { error: signInB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: PASSWORD,
    });
    if (signInB) throw signInB;
  }, 30_000);

  it('user A can create player and read/update own row', async () => {
    const created = await createPlayer(clientA, {
      nickname: 'User A',
      email: emailA,
    });
    expect(created).toBeDefined();
    expect(created.nickname).toBe('User A');
    playerAId = created.id;

    const current = await getCurrentPlayer(clientA);
    expect(current).not.toBeNull();
    expect(current!.id).toBe(playerAId);

    const updated = await updatePlayer(clientA, { nickname: 'User A Updated' });
    expect(updated.nickname).toBe('User A Updated');
  }, 15_000);

  it('user B has no player until onboarding; then sees only own row', async () => {
    const before = await getCurrentPlayer(clientB);
    expect(before).toBeNull();

    await createPlayer(clientB, {
      nickname: 'User B',
      email: emailB,
    });

    const after = await getCurrentPlayer(clientB);
    expect(after).not.toBeNull();
    expect(after!.nickname).toBe('User B');
  }, 15_000);

  it('user B cannot read A\'s row (RLS: getPlayerById returns null)', async () => {
    const result = await getPlayerById(clientB, playerAId);
    expect(result).toBeNull();
  }, 10_000);
});
