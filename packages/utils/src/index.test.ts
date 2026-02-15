import { noop } from './index';

describe('@opp/utils', () => {
  it('noop does nothing', () => {
    expect(noop()).toBeUndefined();
  });
});
