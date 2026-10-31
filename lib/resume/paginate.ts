// Splits measured sheet blocks into A4 pages (spec 0007, AC-16 and AC-18). Pure: it
// only decides which page each block sits on, never changes a block.

// Sub pixel rounding from measuring must not push a block that fits onto a new page.
const TOLERANCE = 0.5;

/**
 * Greedy fill: place blocks while they fit. When block `i` does not fit, it starts a
 * new page, taking along the blocks before it marked `keepWithNext` (a heading or an
 * entry header is never left alone at a page bottom), without emptying the previous
 * page. A lone block taller than `pageHeight` gets its own page and overflows.
 * Returns the block indexes on each page.
 */
export function paginate(heights: number[], keepWithNext: boolean[], pageHeight: number): number[][] {
  const pages: number[][] = [[]];
  let used = 0;

  heights.forEach((height, i) => {
    const page = pages[pages.length - 1];
    if (page.length === 0 || used + height <= pageHeight + TOLERANCE) {
      page.push(i);
      used += height;
      return;
    }

    const carried: number[] = [];
    while (page.length > 1 && keepWithNext[page[page.length - 1]]) {
      carried.unshift(page.pop()!);
    }
    const next = [...carried, i];
    pages.push(next);
    used = next.reduce((sum, j) => sum + heights[j], 0);
  });

  return pages;
}
