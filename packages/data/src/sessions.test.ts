/**
 * Unit tests for session data layer. Mock Supabase client via queue.
 */

import type { Session, SessionRoutine } from './types';
import { DataError } from './errors';
import {
  createSession,
  deleteSession,
  getSessionById,
  listSessions,
  listSessionRoutines,
  setSessionRoutines,
  updateSession,
} from './sessions';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

const sampleSession: Session = {
  id: 'sess-1',
  name: 'Singles 1..10',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleRoutine: SessionRoutine = {
  id: 'sr-1',
  session_id: 'sess-1',
  routine_no: 1,
  routine_id: 'rout-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('listSessions', () => {
  it('returns list when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleSession], error: null },
    ]);
    const list = await listSessions(client);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Singles 1..10');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listSessions(client)).rejects.toThrow(DataError);
    await expect(listSessions(client)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  });
});

describe('getSessionById', () => {
  it('returns session + routines when found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleSession, error: null },
      { data: [sampleRoutine], error: null },
    ]);
    const result = await getSessionById(client, 'sess-1');
    expect(result).not.toBeNull();
    expect(result!.session.name).toBe('Singles 1..10');
    expect(result!.routines).toHaveLength(1);
    expect(result!.routines[0].routine_no).toBe(1);
  });

  it('returns null when session not found', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: null },
    ]);
    const result = await getSessionById(client, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('createSession', () => {
  it('returns created row on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: sampleSession, error: null },
    ]);
    const created = await createSession(client, { name: 'Singles 1..10' });
    expect(created.name).toBe('Singles 1..10');
  });
});

describe('updateSession', () => {
  it('returns updated row on success', async () => {
    const updated = { ...sampleSession, name: 'Updated' };
    const client = createMockClient([
      adminResponse(),
      { data: updated, error: null },
    ]);
    const result = await updateSession(client, 'sess-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});

describe('deleteSession', () => {
  it('succeeds when row exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'sess-1' }], error: null },
    ]);
    await expect(deleteSession(client, 'sess-1')).resolves.toBeUndefined();
  });

  it('throws when session is used in a schedule (FK violation)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: null, error: { code: '23503' } },
    ]);
    await expect(deleteSession(client, 'sess-1')).rejects.toThrow(DataError);
  });

  it('throws NOT_FOUND when no row', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(deleteSession(client, 'nonexistent')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('listSessionRoutines', () => {
  it('returns routines ordered by routine_no', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleRoutine], error: null },
    ]);
    const list = await listSessionRoutines(client, 'sess-1');
    expect(list).toHaveLength(1);
    expect(list[0].routine_id).toBe('rout-1');
  });
});

describe('setSessionRoutines', () => {
  it('replaces routines and returns array', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'rout-1' }], error: null },
      { data: null, error: null },
      { data: [sampleRoutine], error: null },
    ]);
    const result = await setSessionRoutines(client, 'sess-1', [
      { routine_no: 1, routine_id: 'rout-1' },
    ]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws when routine_id not found (VALIDATION)', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    await expect(
      setSessionRoutines(client, 'sess-1', [{ routine_no: 1, routine_id: 'bad-id' }])
    ).rejects.toThrow(DataError);
  });
});
