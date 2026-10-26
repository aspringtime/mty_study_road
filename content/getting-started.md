---
title: 快速开始
slug: getting-started
order: 1
---

# 快速开始

本目录是 `docs_lab` 的示例内容，用来验证解析、目录与渲染链路是否正常。

## 安装依赖

```bash
npm install
```

## 生成文档

```bash
npm run docgen
```

产物会写到 `dist/`，包含每篇文档的 HTML 与一个索引页。

### 输出结构

```text
dist/
├── index.html
└── getting-started.html
```

> 目录结构属于生成物，已在 `.gitignore` 中排除。

## 下一步

- 了解各模块职责，见 [架构说明](architecture.md)
- 添加自己的文档，放进 `content/` 即可