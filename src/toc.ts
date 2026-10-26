import type { Root as MdastRoot } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

/** 目录树的一个节点，对应文档里的一个标题。 */
export interface TocNode {
  /** 标题层级：1 表示 h1，2 表示 h2，以此类推 */
  depth: number;
  /** 标题纯文本，不含 Markdown 标记 */
  text: string;
  /** 锚点 id，与渲染 HTML 时 rehype-slug 生成的一致 */
  slug: string;
  /** 子标题 */
  children: TocNode[];
}

/** 把节点里的强调、代码、行内链接等标记拍平成纯文本。 */
function toPlainText(node: MdastRoot['children'][number]): string {
  if ('value' in node && typeof node.value === 'string') {
    return node.value;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => toPlainText(child as never)).join('');
  }
  return '';
}

/**
 * 生成与 GitHub 一致的 slug。
 *
 * 必须逐条复刻 github-slugger v2 的 `slug()`：
 *   value.toLowerCase().replace(regex, '').replace(/ /g, '-')
 * 顺序本身就是契约的一部分——去标点在把空格转成连字符**之前**，
 * 因此标题末尾的标点被删后会留下一个尾随空格，再变成尾随连字符。
 * 「const char *」得 const-char-（带尾杠），而不是 const-char。
 *
 * 同理它不做 trim、不折叠连续空白、只替换半角空格，这几点都照抄。
 * 两处规则一旦不一致，目录锚点就会全部失效。
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      // 与 rehype-slug 对齐的两条规则，缺一不可：
      // 1) 标点直接删除，不替换成分隔符；
      // 2) 空格逐个转连字符，连续空格不折叠。
      // 因此「A + B」得 a--b、「前后空格  多个」得 前后空格--多个。
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/ /g, '-')
  );
}

/** 从 mdast 树中抽取标题，构建带层级的目录树。 */
export function buildToc(tree: MdastRoot): TocNode[] {
  const flat: TocNode[] = [];

  visit(tree, 'heading', (node: { depth: number; children: unknown[] }) => {
    const text = node.children.map((child) => toPlainText(child as never)).join('');
    if (text.length > 0) {
      flat.push({ depth: node.depth, text, slug: slugify(text), children: [] });
    }
    return SKIP;
  });

  // 用栈把扁平列表还原成树：遇到更浅的层级就向上回溯父节点。
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const item of flat) {
    while (stack.length > 0 && (stack[stack.length - 1]?.depth ?? 0) >= item.depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent !== undefined) {
      parent.children.push(item);
    } else {
      roots.push(item);
    }
    stack.push(item);
  }

  return roots;
}

/**
 * 把目录树渲染成 Markdown 无序列表，便于嵌回 README。
 *
 * `base` 是链接前缀：在文档自身页面渲染时传空串（锚点指向本页），
 * 在索引页渲染时传该文档的 HTML 路径（锚点必须跨页，否则全是死链）。
 */
export function renderTocMarkdown(nodes: TocNode[], base = '', indentLevel = 0): string {
  return nodes
    .map((node) => {
      const indent = '  '.repeat(indentLevel);
      const line = `${indent}- [${node.text}](${base}#${node.slug})`;
      const children = renderTocMarkdown(node.children, base, indentLevel + 1);
      return children.length > 0 ? `${line}\n${children}` : line;
    })
    .join('\n');
}