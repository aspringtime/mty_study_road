/**
 * slug 一致性测试。
 *
 * 这是整个项目最脆弱的一环：索引页的目录锚点（toc.ts 的 slugify）
 * 与文档页 heading 上的 id（rehype-slug）必须逐字符一致，
 * 否则链接全部点不动——HTML 照样生成，故障静默。
 * 靠人眼比对 heading 很难发现，故固化为可执行断言。
 *
 * 两侧都走各自的生产路径：
 *   - 参照侧用 rehype-slug 真实渲染标题；
 *   - 比对侧用 buildToc 真实构建目录树。
 * 早期版本直接把原始字符串喂给 slugify 作参照，那是**不对称**的：
 * 首尾空白之类 Markdown 解析器早已剥离的输入根本进不了 buildToc，
 * 测出来的差异是测试方法制造的假象，而非实现的缺陷。
 *
 * 运行：npm test
 */
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { parseMarkdown } from '../src/parse.ts';
import { buildToc, slugify } from '../src/toc.ts';

/** 用 rehype-slug 真实渲染一个标题，取出它生成的 id。 */
async function rehypeSlugFor(title: string): Promise<string> {
  const html = String(
    await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeStringify)
      .process(`## ${title}\n`),
  );
  const id = /<h2 id="([^"]*)"/.exec(html)?.[1];
  if (id === undefined) throw new Error(`未能从渲染结果中取出 id：${title}`);
  return id;
}

/** 用 buildToc 真实构建目录树，取出它为该标题生成的锚点。 */
function tocSlugFor(title: string): string {
  const node = buildToc(parseMarkdown(`## ${title}\n`))[0];
  if (node === undefined) throw new Error(`未能从目录树中取出节点：${title}`);
  return node.slug;
}

// 覆盖：纯中文、含标点、含多空格、大小写、已有连字符、纯 ASCII，
// 以及**以标点结尾**的标题——后者正是两套实现最容易分叉的地方。
const CASES = [
  '中文文件名 + 英文产物名',
  '脚本一览',
  'A + B',
  '标题 (带括号)',
  '前后空格  多个',
  '结尾标点：',
  '纯中文标题',
  'Git 提交',
  'X & Y = Z',
  'a--b 已存在',
  '  首尾有空白  ',
  'MixedCase 混合大小写',
  '全角＋半角+ 混排',
  // 回归用例：尾随标点被删后会留下一个尾随空格，进而变成尾随连字符。
  '字符串参数一律用 const char *',
  '函数指针 `int (*)(int)`',
  'a-b-',
];

const failures: string[] = [];

for (const title of CASES) {
  const expected = await rehypeSlugFor(title);
  const actual = tocSlugFor(title);
  if (expected !== actual) {
    failures.push(
      `  ${JSON.stringify(title)}\n    rehype-slug: ${JSON.stringify(expected)}\n    toc 目录:     ${JSON.stringify(actual)}`,
    );
  }
}

/**
 * 固化 slugify 的关键契约，防止将来「顺手加个 trim」再次埋雷。
 * 这些值全部来自 github-slugger v2 的真实行为，不是主观期望。
 */
const CONTRACT: ReadonlyArray<readonly [string, string]> = [
  ['A + B', 'a--b'],       // 标点删除而非替换，故留下两个连字符
  ['前后空格  多个', '前后空格--多个'], // 连续空格不折叠
  ['尾随星号 const char *', '尾随星号-const-char-'], // 去标点在转连字符之前，尾部空格成尾部连字符
  ['纯中文', '纯中文'],
];

for (const [input, expected] of CONTRACT) {
  const actual = slugify(input);
  if (actual !== expected) {
    failures.push(`  [契约] ${JSON.stringify(input)}\n    期望: ${JSON.stringify(expected)}\n    实际: ${JSON.stringify(actual)}`);
  }
}

if (failures.length > 0) {
  console.error(`✗ slug 一致性检查有 ${failures.length} 处失败：\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`✓ 目录锚点与 rehype-slug 在 ${CASES.length} 个标题上完全一致，${CONTRACT.length} 条 slugify 契约符合预期`);
}