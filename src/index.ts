import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { parseMarkdown, stripFrontMatter } from './parse.ts';
import { renderHtml, escapeHtml } from './render.ts';
import { buildToc, renderTocMarkdown, type TocNode } from './toc.ts';

/** 单篇文档的处理结果。 */
interface DocResult {
  /** 相对 content/ 的路径，如 guide/intro.md */
  sourcePath: string;
  /** 输出的 HTML 文件名，如 guide/intro.html */
  htmlPath: string;
  title: string;
  toc: TocNode[];
  /** front-matter 的 order，缺省为 Number.MAX_SAFE_INTEGER */
  order: number;
}

/** front-matter 的 slug 字段形如 `usage`，决定 HTML 产物名，避免 URL 里出现中文编码。 */
const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** 递归收集目录下所有 .md 文件（已跳过 node_modules 与隐藏目录）。 */
async function collectMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdown(full)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }

  return files.sort();
}

/** 文件名首字母大写，作为缺省标题。 */
function titleFromPath(relPath: string): string {
  const base = relPath.split(sep).pop() ?? relPath;
  return base.replace(/\.md$/i, '');
}

/** 处理单篇文档：解析 front-matter、抽目录、渲染 HTML。 */
async function processDoc(absPath: string, contentDir: string): Promise<DocResult> {
  const raw = await readFile(absPath, 'utf8');
  const { body, attrs } = stripFrontMatter(raw);
  const tree = parseMarkdown(body);

  const rel = relative(contentDir, absPath);
  const title = attrs['title'] ?? titleFromPath(rel);

  // 优先用 front-matter 的 slug 指定英文产物名；缺失则沿用源文件名。
  const slug = attrs['slug'];
  const stem = slug !== undefined && SLUG_RE.test(slug) ? slug : rel.replace(/\.md$/i, '');

  // order 缺失时排到末尾，避免 NaN 破坏排序。
  const parsedOrder = Number.parseInt(attrs['order'] ?? '', 10);

  return {
    sourcePath: rel,
    htmlPath: `${stem}.html`,
    title,
    toc: buildToc(tree),
    order: Number.isFinite(parsedOrder) ? parsedOrder : Number.MAX_SAFE_INTEGER,
  };
}

/** 生成索引页，列出全部文档及其目录。 */
function renderIndex(results: DocResult[]): string {
  const items = results
    .map((doc) => {
      // 目录锚点需跨页指向所属文档，否则索引页里全是死链。
      const toc = doc.toc.length > 0 ? `\n${renderTocMarkdown(doc.toc, doc.htmlPath, 1)}\n` : '';
      return `## [${doc.title}](${escapeHtml(doc.htmlPath)})\n\n来源：\`${escapeHtml(doc.sourcePath)}\`${toc}`;
    })
    .join('\n');

  return `# 文档索引\n\n共 ${results.length} 篇文档，由 docs-lab 生成。\n\n${items}\n`;
}

/** 主流程：扫描 content/ → 生成 HTML → 写索引。 */
export async function build(contentDir: string, outDir: string): Promise<number> {
  const files = await collectMarkdown(contentDir);
  if (files.length === 0) {
    console.warn(`警告：${contentDir} 下没有 .md 文件，未产出任何文档。`);
    return 0;
  }

  const results: DocResult[] = [];
  for (const file of files) {
    results.push(await processDoc(file, contentDir));
  }

  // 按 order 升序；order 相同时回退到路径序，保证输出稳定可复现。
  results.sort((a, b) => a.order - b.order || a.sourcePath.localeCompare(b.sourcePath, 'zh-Hans-CN'));

  await mkdir(outDir, { recursive: true });
  for (const doc of results) {
    const raw = await readFile(join(contentDir, doc.sourcePath), 'utf8');
    const { body } = stripFrontMatter(raw);
    const target = join(outDir, doc.htmlPath);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, await renderHtml(body, doc.title), 'utf8');
  }

  const indexHtml = await renderHtml(renderIndex(results), '文档索引');
  await writeFile(join(outDir, 'index.html'), indexHtml, 'utf8');

  console.log(`✓ 已生成 ${results.length} 篇文档 + 1 个索引页 → ${outDir}`);
  return results.length;
}