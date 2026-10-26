import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

/** 生成 HTML 时统一套用的页面骨架。 */
const STYLE = `
  :root { color-scheme: light dark; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.7;
    max-width: 48rem;
    margin: 0 auto;
    padding: 2rem 1.25rem;
  }
  pre { overflow-x: auto; padding: 1rem; border-radius: 6px; background: #f6f8fa; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.75rem; }
  blockquote { margin: 0; padding-left: 1rem; border-left: 4px solid #d0d7de; color: #57606a; }
`.trim();

/** 把 Markdown 渲染成带内嵌样式的独立 HTML 文档。 */
export async function renderHtml(body: string, title: string): Promise<string> {
  // unified 的 process 返回 VFile，需转成字符串才能嵌入模板。
  const file = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeStringify)
      .process(body),
  );

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${STYLE}
</style>
</head>
<body>
${file}
</body>
</html>
`;
}

/** 转义 HTML 文本节点，避免标题里的尖括号破坏文档结构。 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}