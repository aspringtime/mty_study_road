# docs-lab

技术文档生成器：扫描 `content/` 下的 Markdown，产出 HTML 与目录索引。

## 环境要求

- Node.js >= 20（开发验证于 v22.23.3）

## 快速开始

```bash
npm install       # 安装依赖
npm run docgen    # 生成 HTML 到 dist/
```

## 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run docgen` | 扫描 `content/`，生成 HTML 与 `dist/index.html` |
| `npm run typecheck` | `tsc --noEmit` 类型检查 |
| `npm run lint` | ESLint（含类型感知规则） |
| `npm run build` | 编译到 `build/`（含 `.d.ts` 与 sourcemap） |
| `npm run clean` | 清理 `dist/` 与 `build/` |

## 目录结构

```text
docs_lab/
├── content/              # 源文档（手写）
│   ├── getting-started.md
│   ├── architecture.md
│   └── 使用说明.md
├── src/
│   ├── cli.ts            # 命令行入口
│   ├── index.ts          # 主流程：扫描 → 渲染 → 写盘
│   ├── parse.ts          # Markdown → mdast
│   ├── toc.ts            # mdast → 目录树
│   └── render.ts         # Markdown → HTML
├── dist/                 # docgen 产物（已 gitignore）
├── build/                # tsc 编译产物（已 gitignore）
├── tsconfig.json
├── tsconfig.build.json
└── eslint.config.js
```

> `build/` 与 `dist/` 是两套独立产物：前者是编译出的 JS，后者是生成的 HTML，互不覆盖。

## Front-matter 用法

每篇文档开头可声明元数据，`title` 缺省时取文件名：

```markdown
---
title: 快速开始
slug: getting-started
order: 1
---

# 正文标题
```

| 字段 | 说明 |
| --- | --- |
| `title` | 标题，缺省取文件名 |
| `slug` | HTML 产物名，只允许字母数字与 `._-` |
| `order` | 索引页排序权重，升序；缺省排到末尾 |

源文件名可用中文，产物名用 `slug` 指定英文，避免 URL 里的百分号编码：
`content/使用说明.md` → `dist/usage.html`。

## 约定

- **slug 必须一致**：`src/toc.ts` 的 `slugify` 与 `rehype-slug` 行为对齐（小写、空格转连字符、去标点）。若修改其中一处，另一处也要同步，否则目录锚点会全部失效。
- **索引页锚点跨页**：目录链接会带上所属文档的 HTML 路径（如 `architecture.html#parse`），不能简化成 `#parse`。
- **不进版本库**：`dist/`、`build/`、`node_modules/`、`.env` 均已 gitignore。
- **gitignore 无行尾注释**：`build/` 后面写 `# 注释` 会让整行变成字面模式而失效，注释必须独占一行。

## 贡献流程

1. 修改代码后先跑 `npm run typecheck && npm run lint`
2. 改动文档请放进 `content/` 并重新生成验证
3. 提交前按 `code-commit` 规范：仅暂存需提交的文件、检查通过后用 Conventional Commits 提交