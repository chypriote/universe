import { tableTitleZh } from '../data/guide-zh.ts';

const text = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');

/**
 * Remark plugin: gives the guide title (h2 or h3) right above each table a `data-zh` attribute
 * from `tableTitleZh`. CSS draws it as the faint brush 汉字 behind the title, so the
 * heading text, its id and the sidebar stay English.
 */
export default function remarkTableZh() {
  return (tree, file) => {
    if (!/guides\/[^/]+\.md$/.test(file.path ?? '')) return;
    let title = null;
    for (const node of tree.children) {
      if (node.type === 'heading' && node.depth <= 3) title = node;
      if (node.type !== 'table' || !title) continue;
      const zh = tableTitleZh[text(title).trim()];
      if (zh)
        title.data = { ...title.data, hProperties: { ...title.data?.hProperties, 'data-zh': zh } };
    }
  };
}
