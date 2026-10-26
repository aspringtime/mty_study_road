---
title: 架构说明
slug: architecture
order: 2
---

# 架构说明

生成流程分为四步，每步一个模块。

## parse

调用 `unified().use(remarkParse).use(remarkGfm)` 得到 mdast 树，
同时剥离 front-matter，把 `title`、`order` 等元数据交给调用方。

## toc

遍历 mdast 的 heading 节点，拍平纯文本后用栈还原成层级结构。

| 模块 | 职责 |
| --- | --- |
| `parse.ts` | Markdown → mdast |
| `toc.ts` | mdast → 目录树 |
| `render.ts` | Markdown → HTML |
| `index.ts` | 扫描目录、编排、写盘 |

### slug 规则必须一致

`toc.ts` 的 `slugify` 与 `rehype-slug` 的行为保持一致：
小写、空格转连字符、去掉标点。两处若不统一，目录锚点会全部失效。

## render

走 `remark → rehype → stringify` 链路，
统一挂载 `rehype-slug` 保证标题自带锚点 id。

## index

扫描 `content/` 下所有 `.md`，逐篇处理后写出 HTML，最后汇总成索引页。

- 跳过 `.` 开头与 `node_modules`
- 按路径排序，保证输出稳定可复现
- 递归子目录，保留原有层级