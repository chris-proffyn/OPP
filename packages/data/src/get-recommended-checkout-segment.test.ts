/**
 * Unit tests for getRecommendedSegmentForRemaining (target per dart for checkout).
 */

import { getCheckoutCombinationByTotal } from './checkout-combinations';
import { getRecommendedSegmentForRemaining } from './get-recommended-checkout-segment';
import { getPlayerCheckoutVariationByTotal } from './player-checkout-variations';
import { createMockClient } from './test-utils';

jest.mock('./checkout-combinations');
jest.mock('./player-checkout-variations');

const mockGetCheckoutCombinationByTotal = getCheckoutCombinationByTotal as jest.MockedFunction<
  typeof getCheckoutCombinationByTotal
>;
const mockGetPlayerCheckoutVariationByTotal = getPlayerCheckoutVariationByTotal as jest.MockedFunction<
  typeof getPlayerCheckoutVariationByTotal
>;

const client = createMockClient([]);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getRecommendedSegmentForRemaining', () => {
  it('returns null when remaining < 2', async () => {
    const result = await getRecommendedSegmentForRemaining(client, 1, 1);
    expect(result).toBeNull();
    expect(mockGetCheckoutCombinationByTotal).not.toHaveBeenCalled();
    expect(mockGetPlayerCheckoutVariationByTotal).not.toHaveBeenCalled();
  });

  it('returns null when remaining > 170', async () => {
    const result = await getRecommendedSegmentForRemaining(client, 171, 1);
    expect(result).toBeNull();
    expect(mockGetCheckoutCombinationByTotal).not.toHaveBeenCalled();
    expect(mockGetPlayerCheckoutVariationByTotal).not.toHaveBeenCalled();
  });

  it('returns combination dart for position 1 when no variation', async () => {
    mockGetCheckoutCombinationByTotal.mockResolvedValue({
      id: 'cc-121',
      total: 121,
      dart1: 'T17',
      dart2: 'T10',
      dart3: 'D20',
      created_at: '2026-01-01T00:00:00Z',
    });
    mockGetPlayerCheckoutVariationByTotal.mockRejectedValue(new Error('none'));

    const result = await getRecommendedSegmentForRemaining(client, 121, 1);
    expect(result).toBe('T17');
  });

  it('returns combination dart2/dart3 for positions 2 and 3', async () => {
    mockGetCheckoutCombinationByTotal.mockResolvedValue({
      id: 'cc-121',
      total: 121,
      dart1: 'T17',
      dart2: 'T10',
      dart3: 'D20',
      created_at: '2026-01-01T00:00:00Z',
    });
    mockGetPlayerCheckoutVariationByTotal.mockResolvedValue(null);

    expect(await getRecommendedSegmentForRemaining(client, 121, 2)).toBe('T10');
    expect(await getRecommendedSegmentForRemaining(client, 121, 3)).toBe('D20');
  });

  it('prefers player variation over combination', async () => {
    mockGetCheckoutCombinationByTotal.mockResolvedValue({
      id: 'cc-121',
      total: 121,
      dart1: 'T20',
      dart2: 'T7',
      dart3: 'D20',
      created_at: '2026-01-01T00:00:00Z',
    });
    mockGetPlayerCheckoutVariationByTotal.mockResolvedValue({
      id: 'pcv-1',
      player_id: 'p1',
      total: 121,
      dart1: 'T19',
      dart2: 'S12',
      dart3: 'D25',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    const result = await getRecommendedSegmentForRemaining(client, 121, 1);
    expect(result).toBe('T19');
  });

  it('returns null when both combination and variation have no segment for position', async () => {
    mockGetCheckoutCombinationByTotal.mockResolvedValue({
      id: 'cc-50',
      total: 50,
      dart1: null,
      dart2: null,
      dart3: 'D25',
      created_at: '2026-01-01T00:00:00Z',
    });
    mockGetPlayerCheckoutVariationByTotal.mockResolvedValue(null);

    const result = await getRecommendedSegmentForRemaining(client, 50, 1);
    expect(result).toBeNull();
  });

  it('returns null when both combination and variation are null', async () => {
    mockGetCheckoutCombinationByTotal.mockResolvedValue(null);
    mockGetPlayerCheckoutVariationByTotal.mockResolvedValue(null);

    const result = await getRecommendedSegmentForRemaining(client, 99, 1);
    expect(result).toBeNull();
  });
});
