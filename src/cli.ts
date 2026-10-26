// docs-lab 入口：node --experimental-strip-types src/index.ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { build } from './index.ts';

const root = dirname(fileURLToPath(import.meta.url));
const contentDir = join(root, '..', 'content');
const outDir = join(root, '..', 'dist');

try {
  const count = await build(contentDir, outDir);
  process.exitCode = count > 0 ? 0 : 1;
} catch (error) {
  console.error('生成失败：', error);
  process.exitCode = 1;
}