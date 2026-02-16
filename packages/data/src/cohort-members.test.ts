/**
 * Unit tests for cohort members data layer.
 */

import { DataError } from './errors';
import {
  addCohortMember,
  getCurrentCohortForPlayer,
  listCohortMembers,
  removeCohortMember,
} from './cohort-members';
import type { Cohort, CohortMember } from './types';
import { adminPlayer, createMockClient, nonAdminPlayer } from './test-utils';

const adminResponse = () => ({ data: adminPlayer, error: null });
const nonAdminResponse = () => ({ data: nonAdminPlayer, error: null });

const sampleCohort: Cohort = {
  id: 'cohort-1',
  name: 'Test Cohort',
  level: 20,
  start_date: '2026-03-01',
  end_date: '2026-04-30',
  schedule_id: 'sched-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleMember: CohortMember & { players: { display_name: string } | null } = {
  id: 'cm-1',
  cohort_id: 'cohort-1',
  player_id: 'pid-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  players: { display_name: 'Alice' },
};

describe('listCohortMembers', () => {
  it('returns members with display_name when admin', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [sampleMember], error: null },
    ]);
    const list = await listCohortMembers(client, 'cohort-1');
    expect(list).toHaveLength(1);
    expect(list[0].player_id).toBe('pid-1');
    expect(list[0].display_name).toBe('Alice');
  });

  it('throws FORBIDDEN when non-admin', async () => {
    const client = createMockClient([nonAdminResponse()]);
    await expect(listCohortMembers(client, 'cohort-1')).rejects.toThrow(DataError);
    await expect(listCohortMembers(client, 'cohort-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('getCurrentCohortForPlayer', () => {
  it('returns cohort when player is in one active cohort', async () => {
    const client = createMockClient([
      { data: [{ cohort_id: 'cohort-1' }], error: null },
      { data: [sampleCohort], error: null },
    ]);
    const result = await getCurrentCohortForPlayer(client, 'pid-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('cohort-1');
  });

  it('returns null when player has no memberships', async () => {
    const client = createMockClient([
      { data: [], error: null },
    ]);
    const result = await getCurrentCohortForPlayer(client, 'pid-1');
    expect(result).toBeNull();
  });
});

describe('addCohortMember', () => {
  it('returns created member on success', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
      { data: sampleMember, error: null },
    ]);
    const created = await addCohortMember(client, 'cohort-1', 'pid-1');
    expect(created.cohort_id).toBe('cohort-1');
    expect(created.player_id).toBe('pid-1');
  });

  it('throws CONFLICT when player already in another active cohort', async () => {
    const otherCohort = { ...sampleCohort, id: 'other-cohort' };
    const client = createMockClient([
      adminResponse(),
      { data: [{ cohort_id: 'other-cohort' }], error: null },
      { data: [otherCohort], error: null },
    ]);
    const promise = addCohortMember(client, 'cohort-1', 'pid-1');
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('already in another active cohort'),
    });
  });
});

describe('removeCohortMember', () => {
  it('succeeds when membership exists', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [{ id: 'cm-1' }], error: null },
    ]);
    await expect(removeCohortMember(client, 'cohort-1', 'pid-1')).resolves.toBeUndefined();
  });

  it('throws NOT_FOUND when no such membership', async () => {
    const client = createMockClient([
      adminResponse(),
      { data: [], error: null },
    ]);
    const promise = removeCohortMember(client, 'cohort-1', 'pid-1');
    await expect(promise).rejects.toThrow(DataError);
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
