/**
 * Unit tests for checkout combinations: listCheckoutCombinations, getCheckoutCombinationByTotal.
 */

import {
  getCheckoutCombinationByTotal,
  listCheckoutCombinations,
} from './checkout-combinations';
import { createMockClient } from './test-utils';

const sampleCombination = {
  id: 'cc-121',
  total: 121,
  dart1: 'T20',
  dart2: 'T7',
  dart3: 'D20',
  created_at: '2026-01-01T00:00:00Z',
};

describe('listCheckoutCombinations', () => {
  it('returns list ordered by total descending', async () => {
    const client = createMockClient([
      { data: [sampleCombination, { ...sampleCombination, id: 'cc-81', total: 81 }], error: null },
    ]);
    const list = await listCheckoutCombinations(client);
    expect(list).toHaveLength(2);
    expect(list[0].total).toBe(121);
    expect(list[1].total).toBe(81);
  });
});

describe('getCheckoutCombinationByTotal', () => {
  it('returns combination when total exists', async () => {
    const client = createMockClient([{ data: sampleCombination, error: null }]);
    const result = await getCheckoutCombinationByTotal(client, 121);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(121);
    expect(result!.dart1).toBe('T20');
    expect(result!.dart2).toBe('T7');
    expect(result!.dart3).toBe('D20');
  });

  it('returns null when no row for total', async () => {
    const client = createMockClient([{ data: null, error: null }]);
    const result = await getCheckoutCombinationByTotal(client, 999);
    expect(result).toBeNull();
  });
});
