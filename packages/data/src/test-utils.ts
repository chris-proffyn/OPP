/**
 * Shared mock Supabase client for P2 data layer tests.
 * Queue-based: each terminal call (maybeSingle, single, or list await) consumes the next response.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

type Response = { data: unknown; error: unknown };

export function createMockClient(responses: Response[]): SupabaseClient {
  const queue = [...responses];
  const next = (): Response => queue.shift() ?? { data: null, error: null };
  const thenable = (): Promise<Response> => Promise.resolve(next());
  const listThenable = () => ({
    then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
      return thenable().then(resolve, reject);
    },
    catch(r: (e: unknown) => void) {
      return thenable().catch(r);
    },
    in: () => thenable(),
  });

  const from = (table?: string) => ({
    select: (cols?: string | string[], opts?: { count?: string; head?: boolean }) => {
      if (cols === '*' || (Array.isArray(cols) && cols.length > 0)) {
        return {
          limit: () => ({ maybeSingle: () => thenable() }),
          lte: () => ({ gte: () => ({ limit: () => ({ maybeSingle: () => thenable() }) }) }),
          eq: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: () => thenable() }),
              maybeSingle: () => thenable(),
            }),
            limit: () => ({ maybeSingle: () => thenable() }),
            maybeSingle: () => thenable(),
            order: () => ({
              then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
                return thenable().then(resolve, reject);
              },
              catch(r: (e: unknown) => void) {
                return thenable().catch(r);
              },
              order: () => thenable(),
            }),
          }),
          order: () => thenable(),
          gte: () => thenable(),
          in: () => ({
            gte: () => thenable(),
            order: () => thenable(),
            then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
              return thenable().then(resolve, reject);
            },
            catch(r: (e: unknown) => void) {
              return thenable().catch(r);
            },
          }),
        };
      }
      if (opts?.count === 'exact' && opts?.head) {
        return { eq: () => thenable() };
      }
      const orderThenable = () => ({
        limit: () => thenable(),
        gte: () => orderThenable(),
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
      });
      const orderChain = () => ({
        eq: () => ({
          limit: () => thenable(),
          then: (resolve: (r: Response) => void, reject?: (e: unknown) => void) => thenable().then(resolve, reject),
          catch: (r: (e: unknown) => void) => thenable().catch(r),
        }),
        limit: () => thenable(),
        order: () => ({
          order: () => ({
            order: () => ({
              then: (resolve: (r: Response) => void, reject?: (e: unknown) => void) => thenable().then(resolve, reject),
              catch: (r: (e: unknown) => void) => thenable().catch(r),
            }),
            then: (resolve: (r: Response) => void, reject?: (e: unknown) => void) => thenable().then(resolve, reject),
            catch: (r: (e: unknown) => void) => thenable().catch(r),
          }),
          then: (resolve: (r: Response) => void, reject?: (e: unknown) => void) => thenable().then(resolve, reject),
          catch: (r: (e: unknown) => void) => thenable().catch(r),
        }),
        then: (resolve: (r: Response) => void, reject?: (e: unknown) => void) => thenable().then(resolve, reject),
        catch: (r: (e: unknown) => void) => thenable().catch(r),
      });
      const notChain = {
        not: () => notChain,
        order: () => orderThenable(),
        gte: () => orderThenable(),
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
      };
      const eqChain = {
        maybeSingle: () => thenable(),
        eq: () => eqChain,
        not: () => notChain,
        order: () => orderChain(),
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
      };
      const inChainNot = {
        not: () => ({
          then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
            return thenable().then(resolve, reject);
          },
          catch(r: (e: unknown) => void) {
            return thenable().catch(r);
          },
        }),
      };
      const inChain = {
        gte: () => ({ order: () => orderThenable() }),
        order: () => thenable(),
        not: () => inChainNot,
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
      };
      const listOrEq = {
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
        in: () => inChain,
        ilike: () => thenable(),
        eq: () => eqChain,
        order: () => orderChain(),
      };
      eqChain.in = () => thenable();
      return listOrEq;
    },
    insert: () => ({
      select: () => ({
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
        single: () => thenable(),
      }),
    }),
    upsert: () => ({
      select: () => ({ single: () => thenable() }),
    }),
    update: () => ({ eq: () => ({ select: () => ({ single: () => thenable() }) }) }),
    delete: () => ({
      eq: () => ({
        eq: () => ({ select: () => thenable() }),
        select: () => thenable(),
        then(resolve: (r: Response) => void, reject?: (e: unknown) => void) {
          return thenable().then(resolve, reject);
        },
        catch(r: (e: unknown) => void) {
          return thenable().catch(r);
        },
      }),
      select: () => thenable(),
    }),
  });

  const auth = {
    getUser: () => Promise.resolve({ data: { user: { id: 'uid-1' } }, error: null }),
  };

  return { from, auth } as unknown as SupabaseClient;
}

export const adminPlayer = {
  id: 'pid-admin',
  user_id: 'uid-1',
  nickname: 'Admin',
  full_name: null as string | null,
  display_name: 'Admin',
  email: 'admin@example.com',
  gender: null,
  age_range: null,
  baseline_rating: null,
  training_rating: null,
  match_rating: null,
  player_rating: null,
  date_joined: '2026-01-01',
  role: 'admin' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const nonAdminPlayer = {
  ...adminPlayer,
  id: 'pid-player',
  role: 'player' as const,
};
