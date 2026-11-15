import { describe, expect, it } from 'vitest';
import { calculatePageSlices } from '../utils/pdfPages';

describe('calculatePageSlices', () => {
  it('keeps a short canvas on one page', () => {
    expect(calculatePageSlices(1000, 1000, 210, 297)).toEqual([
      { sourceY: 0, sourceHeight: 1000 },
    ]);
  });

  it('splits a tall canvas into page-sized source regions', () => {
    const slices = calculatePageSlices(1000, 3000, 210, 297);
    expect(slices).toEqual([
      { sourceY: 0, sourceHeight: 1414 },
      { sourceY: 1414, sourceHeight: 1414 },
      { sourceY: 2828, sourceHeight: 172 },
    ]);
  });

  it('uses a nearby safe break so a table row is not cut', () => {
    expect(calculatePageSlices(1000, 3000, 210, 297, [1300, 2600])).toEqual([
      { sourceY: 0, sourceHeight: 1300 },
      { sourceY: 1300, sourceHeight: 1300 },
      { sourceY: 2600, sourceHeight: 400 },
    ]);
  });
});
