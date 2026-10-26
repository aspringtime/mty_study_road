import type { Root as MdastRoot } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

/**
 * 把 Markdown 源文本解析为 mdast 语法树。
 *
 * 统一在这里挂载插件，保证「解析」这一入口只有一处，
 * 避免不同调用方各自建 processor 导致插件集不一致。
 */
export function parseMarkdown(source: string): MdastRoot {
  const processor = unified().use(remarkParse).use(remarkGfm);

  return processor.parse(source);
}

/** 去除 Markdown 中所有 front-matter，交给调用方自行处理元数据。 */
export function stripFrontMatter(source: string): { body: string; attrs: Record<string, string> } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (match?.[1] === undefined) {
    return { body: source, attrs: {} };
  }

  const attrs: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv?.[1] !== undefined && kv[2] !== undefined) {
      attrs[kv[1]] = kv[2].trim();
    }
  }

  return { body: source.slice(match[0].length), attrs };
}