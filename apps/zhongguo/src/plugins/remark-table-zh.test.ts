import { describe, expect, it } from 'vitest';
import remarkTableZh from './remark-table-zh.mjs';

type Node = {
  type: string;
  depth?: number;
  children?: Node[];
  value?: string;
  data?: { hProperties?: Record<string, string> };
};
const heading = (value: string, depth = 2): Node => ({
  type: 'heading',
  depth,
  children: [{ type: 'text', value }],
});
const table: Node = { type: 'table', children: [] };
const run = (children: Node[], path = 'src/content/guides/getting-around.md') => {
  remarkTableZh()({ type: 'root', children }, { path });
  return children.map((node) => node.data?.hProperties?.['data-zh']);
};

describe('remarkTableZh', () => {
  it('marks the title right above a table with its 汉字', () => {
    expect(run([heading('Embassies'), { type: 'paragraph' }, table])).toEqual([
      '使馆',
      undefined,
      undefined,
    ]);
  });

  it('marks the nearest h3, not its h2', () => {
    expect(run([heading('Metro'), heading('Phrases', 3), table])).toEqual([
      undefined,
      '用语',
      undefined,
    ]);
  });

  it('marks only the title right above the table', () => {
    expect(run([heading('Embassies'), heading('Documents'), table])).toEqual([
      undefined,
      '材料',
      undefined,
    ]);
  });

  it('leaves files that are not guides', () => {
    expect(run([heading('Embassies'), table], 'src/content/other/getting-around.md')).toEqual([
      undefined,
      undefined,
    ]);
  });
});
