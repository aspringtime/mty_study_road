---
title: C 语言编译操作指南
slug: c-build-guide
order: 5
---

# C 语言编译操作指南

本文是一份可直接照着敲的操作指南：从单文件编译到多文件工程构建，再到调试与报错排查。

文中所有命令均在 **Debian / gcc 14.2.0 / make** 环境下实测通过，输出为真实结果。

## 环境准备

### 检查工具链

```bash
gcc --version    # 编译器
make --version   # 构建工具
gdb --version    # 调试器
```

| 工具 | 是否必需 | 说明 |
| --- | --- | --- |
| `gcc` 或 `clang` | 必需 | 二选一即可 |
| `make` | 多文件项目必需 | 单文件可不用 |
| `gdb` | 可选 | 排查段错误时需要 |

> 本文环境未安装 `cmake` 与 `pkg-config`，相关章节已标注为可选，未实测。

### 各平台对应工具

| 平台 | 编译命令 | 备注 |
| --- | --- | --- |
| Linux | `gcc` | 通常随 `build-essential` 安装 |
| macOS | `clang` | Apple 自带，`gcc` 是它的别名 |
| Windows (MSVC) | `cl` | 需在 Developer Command Prompt 中执行 |
| Windows (MinGW) | `gcc` | 与 Linux 用法基本一致 |

## 编译流程：四个阶段

一次 `gcc main.c -o main` 背后依次做了四件事。用 `gcc --help` 里的阶段名可以逐个拆开。

```bash
gcc -E main.c -o main.i    # 预处理：展开 #include、#define
gcc -S main.i -o main.s    # 编译：生成汇编
gcc -c main.s -o main.o    # 汇编：生成目标文件
gcc main.o    -o main      # 链接：合成可执行文件
```

### 各阶段的中间产物

| 阶段 | 输入 | 输出 | 后缀 |
| --- | --- | --- | --- |
| 预处理 | `.c` | 纯 C 文本（无 `#` 指令） | `.i` |
| 编译 | `.i` | 汇编代码 | `.s` |
| 汇编 | `.s` | 目标文件 | `.o` |
| 链接 | `.o` / `.a` / `.so` | 可执行文件 | 无 |

验证一下预处理结果，只剩纯 C 代码：

```bash
gcc -E hello.c | tail -2
    return 0;
}
```

### 链接做了什么

链接器把所有 `.o` 和库文件里的符号拼接起来，解析外部引用。

**这就是「声明」与「定义」的区别所在**：在 `util.h` 里写 `int add(int, int);` 只是声明，
提供函数体的 `util.c` 才是定义。编译 `main.c` 时只需声明，链接时必须能找到定义，
否则报 `undefined reference`。

## 单文件编译

新建 `hello.c`：

```c
#include <stdio.h>

int main(void) {
    printf("hello, %s\n", "world");
    return 0;
}
```

最简命令：

```bash
gcc hello.c -o hello
./hello
```

输出：

```text
hello, world
```

不写 `-o` 时，可执行文件默认叫 `a.out`：

```bash
gcc hello.c
./a.out
```

### 推荐的日常命令

```bash
gcc -std=c11 -Wall -Wextra -O2 -o hello hello.c
```

- `-std=c11` 锁定标准，避免不同机器默认标准不一致
- `-Wall -Wextra` 打开全部常规警告，**建议写代码时一直开着**
- `-O2` 开启优化，调试阶段换成 `-O0`
- 警告不是错误，但每一条都值得看一眼

> `-Wall -Wextra` 编干净的代码，再加 `-pedantic` 通常也能通过；本文实测 `-pedantic` 未对
> `int main(){ return 0; }` 这类写法报警告（旧式 K&R 函数定义才需注意）。

## 常用编译选项

| 选项 | 作用 | 使用建议 |
| --- | --- | --- |
| `-o <name>` | 指定输出文件名 | 始终显式指定 |
| `-Wall -Wextra` | 打开常规警告 | 一直开启 |
| `-Werror` | 把警告当错误 | CI 中开启 |
| `-g` | 保留调试信息 | 调试必加，发布可去 |
| `-O0` `-O2` `-O3` | 优化级别 | 调试 `-O0`，发布 `-O2` |
| `-std=c11` | 指定语言标准 | 显式指定 |
| `-I <dir>` | 追加头文件搜索目录 | 有外部头文件时 |
| `-L <dir> -l <lib>` | 库搜索目录与要链接的库 | 链接第三方库 |
| `-fsyntax-only` | 只做语法检查，不产出文件 | 快速校验 |
| `-fsanitize=address` | 地址消毒器 | 查内存越界 |
| `-MMD -MP` | 生成 `.d` 依赖文件 | 配合 make |

### 只检查语法

不产出任何文件，秒级返回，适合大文件快速验证：

```bash
gcc -fsyntax-only hello.c
```

无输出即表示通过。

## 多文件项目：Makefile

三文件起步的项目，用 `make` 管理依赖最省事。

### 目录结构

```text
proj/
├── include/
│   └── util.h
├── src/
│   ├── main.c
│   └── util.c
└── Makefile
```

`include/util.h`：

```c
#ifndef UTIL_H
#define UTIL_H

int add(int a, int b);

#endif
```

`src/util.c`：

```c
#include "util.h"

int add(int a, int b) {
    return a + b;
}
```

`src/main.c`：

```c
#include <stdio.h>

#include "util.h"

int main(void) {
    printf("%d\n", add(1, 2));
    return 0;
}
```

### Makefile

> **注意**：Makefile 里命令行前面必须是 **Tab**，写成空格会报 `missing separator`。

```makefile
CC := gcc
CFLAGS := -std=c11 -Wall -Wextra -Iinclude
TARGET := demo
SRCS := src/main.c src/util.c
OBJS := $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

%.o: %.c include/util.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET)

.PHONY: all clean
```

四个变量的作用：

| 变量 | 含义 |
| --- | --- |
| `CC` | 编译器，可换成 `clang` |
| `CFLAGS` | 编译选项，会传给编译和链接两步 |
| `SRCS` / `OBJS` | 源文件列表 / 对应的 `.o` 列表 |
| `TARGET` | 最终可执行文件名 |

### 构建与清理

```bash
make          # 只重编改动过的文件
make clean    # 删除 .o 和可执行文件
```

实测输出：

```text
gcc -std=c11 -Wall -Wextra -Iinclude -c src/main.c -o src/main.o
gcc -std=c11 -Wall -Wextra -Iinclude -c src/util.c -o src/util.o
gcc -std=c11 -Wall -Wextra -Iinclude -o demo src/main.o src/util.o
```

再跑一次 `./demo` 输出 `3`。改动任一源文件后重复 `make`，只会重编受影响的文件。

### 让 Makefile 更省事

`-MMD -MP` 让编译器自动生成头文件依赖，新增头文件不用手改 Makefile：

```makefile
CFLAGS := -std=c11 -Wall -Wextra -Iinclude -MMD -MP

-include $(OBJS:.o=.d)
```

## 链接第三方库

假设库安装在 `/opt/mylib`：

```bash
gcc -std=c11 -I/opt/mylib/include -o prog main.c -L/opt/mylib/lib -lmylib
```

- `-I` 告诉编译器去哪找头文件（**编译阶段**用）
- `-L` 告诉链接器去哪找 `.so` / `.a`（**链接阶段**用）

> **顺序陷阱**：`-lmylib` 必须放在源文件**后面**。链接器从左往右扫描，
> 放在前面时它还不知道后面会出现对它的符号引用。

### 可选：CMake

跨平台、体量较大时改用 CMake（本文环境未安装，以下为通用写法）：

```cmake
cmake_minimum_required(VERSION 3.16)
project(demo C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
add_compile_options(-Wall -Wextra)

add_executable(demo src/main.c src/util.c)
target_include_directories(demo PRIVATE include)
```

```bash
cmake -B build
cmake --build build
./build/demo
```

CMake 会自动处理依赖与增量构建，不必手写 Makefile。

## 调试

### 用 gdb 定位段错误

用 `-g -O0` 编译（保留符号、不优化）：

```bash
gcc -g -O0 -o seg seg.c
gdb -batch -ex run -ex bt ./seg
```

实测输出：

```text
Program received signal SIGSEGV, Segmentation fault.
0x000055555555514d in main () at seg.c:2
2	int main(void){ int *p = NULL; printf("%d\n", *p); return 0; }
#0  0x000055555555514d in main () at seg.c:2
```

`bt`（backtrace）打印调用栈，从最内层 `#0` 往外看即可定位出错函数。

交互式调试常用命令：

| 命令 | 作用 |
| --- | --- |
| `break 文件:行号` / `b main.c:5` | 设断点 |
| `run` | 运行 |
| `next` / `n` | 单步跳过函数调用 |
| `step` / `s` | 单步进入函数 |
| `print 变量` / `p x` | 查看变量 |
| `backtrace` / `bt` | 打印调用栈 |
| `continue` / `c` | 继续运行 |

### 用 AddressSanitizer 查内存错误

普通的段错误只告诉你「崩了」，`-fsanitize=address` 会精确指出出错位置：

```bash
gcc -fsanitize=address -g -o hello_asan hello.c
./hello_asan
```

未发现问题时正常输出 `hello, world`。

它能捕获：缓冲区溢出、释放后使用、内存泄漏、非法释放、空指针解引用。
代价是程序变慢 2～3 倍，所以**只在调试时开启**。

## 常见错误速查

以下报错均为实测原文，可直接对照。

### undefined reference

```text
/usr/bin/ld: /tmp/ccqKFkbV.o: in function `main':
undef.c:(.text+0xa): undefined reference to `missing'
collect2: error: ld returned 1 exit status
```

三个最常见原因：

1. **忘了把源文件加进命令**。`gcc main.c -o prog` 不会自动编译 `util.c`，必须写
   `gcc main.c util.c -o prog`
2. **少了库**。用了 `libxxx` 里的函数却没写 `-lxxx`
3. **忘了写 `-lm`**。数学函数 `sqrt`、`pow` 等需要它

### implicit declaration of function

```text
impl.c: In function 'main':
impl.c:1:25: error: implicit declaration of function 'strlen' [-Wimplicit-function-declaration]
    1 | int main(void){ int x = strlen("ab"); return x; }
      |                         ^~~~~~
impl.c:1:1: note: include '<string.h>' or provide a declaration for 'strlen'
```

忘了 `#include`。C99 起隐式声明已是**错误**而非警告。
按提示补上头文件即可，GCC 通常会直接告诉你该包含哪个。

### No such file or directory（头文件）

```text
<command-line>: fatal error: nope.h: No such file or directory
compilation terminated.
```

两种情况：

- 本地头文件写错了路径 → 头文件在子目录时，用 `#include "src/util.h"` 或加 `-I`
- 找不到的是**引号包裹**的头文件 → 检查 `-I` 路径；**尖括号**的头文件找的是系统路径

### unused variable / unused function

```text
warn2.c: In function 'main':
warn2.c:3:9: warning: unused variable 'unused' [-Wunused-variable]
    3 |     int unused = 1;
      |         ^~~~~~
```

这是警告不是错误，程序照常生成。修掉或用 `(void)unused;` 消音。

### 报错信息怎么看

GCC 的报错格式固定为：

```text
文件名:行号:列号: 级别: 信息 [-警告名]
```

- **先看 `error:`**，warnings 可以稍后再清
- **按行号跳转**，错误行通常就在尖括号 `^` 标记的位置
- **从第一个错误开始改**。后面的几十条报错往往只是第一个错误的连带反应

## 一页速查

```bash
# 单文件
gcc hello.c -o hello

# 日常开发（推荐基线）
gcc -std=c11 -Wall -Wextra -g -O0 -o hello hello.c

# 只查语法
gcc -fsyntax-only hello.c

# 多文件
gcc -std=c11 -Wall -Wextra -Iinclude -o demo src/main.c src/util.c

# 查内存错误
gcc -fsanitize=address -g -o demo src/main.c src/util.c

# 段错误定位
gdb -batch -ex run -ex bt ./demo

# 增量构建
make && make clean
```

## 小结

| 场景 | 做法 |
| --- | --- |
| 学习 / 练手 | `gcc -Wall -Wextra hello.c -o hello` |
| 日常开发 | 固定 `-std` + `-Wall -Wextra`，调试加 `-g -O0` |
| 多文件项目 | `make` + `-MMD -MP` 自动依赖 |
| 跨平台大项目 | CMake |
| 排查内存问题 | `-fsanitize=address` |
| 排查崩溃 | `gdb` + `bt` |