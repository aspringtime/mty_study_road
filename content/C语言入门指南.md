---
title: C 语言入门指南
slug: c-guide
order: 8
---

# C 语言入门指南

本文面向没有编程经验的读者，目标是读完后能独立写出 **100～300 行的 C 程序**：处理数据、读写文件、用动态内存、定义自己的数据结构。

内容依据 ISO/IEC 9899（C 标准）与 [cppreference 的 C 语言参考](https://en.cppreference.com/w/c)整理，代码在 **gcc 13 / `-std=c17` / `-Wall -Wextra`** 下零警告通过。

> 只讲**语言本身**：编译命令、多文件工程、gdb 调试与内存错误定位见 [C 语言编译操作指南](C语言编译指南.md)。

## C 语言是什么

C 是一门**编译型、贴近硬件**的语言。它没有运行时（runtime）、没有垃圾回收，只提供一个能直接操作内存的抽象层。这个定位决定了它的一切优点与痛苦。

| 特点 | 说明 |
| --- | --- |
| 贴近硬件 | 内置 `char` 与指针，可寻址内存单元，可写操作系统与驱动 |
| 编译型 | 先编译成目标文件再链接，运行开销极小 |
| 手动内存管理 | 分配与释放由程序员负责，没有垃圾回收 |
| 标准库精简 | 只提供最基本能力，其余靠第三方库 |
| 可移植 | 同一份源码可编译到从单片机到服务器的各类平台 |
| 抽象层次低 | 编译器不会替你检查越界与生命周期问题 |

### 标准版本

| 版本 | 状态 | 关键特性 |
| --- | --- | --- |
| C89 / C90 | 已废弃 | 最原始版本，无 `//` 注释、变量必须先声明 |
| C99 | 仍在用 | `//` 注释、声明位置放开、`for` 内声明变量、`_Bool` |
| C11 | 主流 | `_Static_assert`、匿名结构体、可选变长数组 |
| C17 / C18 | 事实标准 | 缺陷修订版，编译选项 `-std=c17` |
| C23 | 新 | `bool` / `true` / `false` 成为关键字、`nullptr`、`auto` 类型推断 |

> 新代码建议用 `-std=c17`，它是当前各发行版工具链支持最稳的标准；想体验新特性可试 `-std=c2x`。

## 环境准备

### 检查工具链

```bash
gcc --version
```

```text
gcc (Debian 13.2.0-14) 13.2.0
```

macOS 用 `clang`（它把 `gcc` 也做成了别名），Windows 可用 MinGW 或 MSVC。

### 第一个程序

新建 `hello.c`：

```c
#include <stdio.h>

int main(void) {
    printf("Hello, C!\n");
    return 0;
}
```

编译并运行：

```bash
gcc -std=c17 -Wall -Wextra -o hello hello.c
./hello
```

```text
Hello, C!
```

> 从第一天起就带上 `-Wall -Wextra`。这两个选项能挡掉绝大多数类型与格式串错误，成本几乎为零。详细说明见 [C 语言编译操作指南](C语言编译指南.md#单文件编译)。

### 程序的基本骨架

```c
#include <stdio.h>    /* 引入标准库声明 */

int main(void) {      /* 程序入口，返回 int */
    /* 每条语句以分号结尾 */
    return 0;         /* 返回 0 表示正常退出 */
}
```

| 部分 | 说明 |
| --- | --- |
| `#include` | 把头文件里的**声明**复制进来，让编译器认识 `printf` |
| `int main(void)` | 唯一入口；`(void)` 表示不接收参数 |
| `return 0` | 交回退出码给操作系统，0 为成功 |

## 注释与语句

```c
/* 单行注释：块注释可跨多行 */

/* 块注释
   可以
   跨行 */

int x = 1;   // 行注释，只到行尾结束
```

| 规则 | 说明 |
| --- | --- |
| 分号 | 声明、表达式、函数调用结尾都要有，漏一个就是诡异语法错误 |
| 语句块 | `{ }` 划定作用域，块内声明的变量出了块就没了 |
| 空白 | 空格、换行对编译无影响，但用 `{}` 明确圈定范围是好习惯 |

**建议始终给 `if`、`for`、`while` 的条件加括号。** C 的运算符优先级容易让人踩坑，`if (x & y == 0)` 并不是你以为的意思。

## 变量与数据类型

### 声明

C 是**静态类型**语言：类型在声明时确定，之后不能改变。

```c
int    count   = 10;      // 变量
const  double pi = 3.14159;   // 常量：初始化后不可修改
static int  total;        // 静态存储期，程序启动时分配
extern  int  total;        // 引用别处定义的变量
int    arr[5];            // 数组
int    *ptr = &count;     // 指针
```

| 存储期 | 声明方式 | 生命周期 |
| --- | --- | --- |
| 自动 | 函数内的普通局部变量 | 进入函数时创建，返回时销毁 |
| 静态 | `static` 修饰的局部变量 / 全局变量 | 整个程序运行期间 |
| 外部 | `extern` 声明 | 由别的源文件在编译期确定 |

静态局部变量在函数被调用前就已存在，且只初始化一次：

```c
void counter(void) {
    static int n = 0;   // 只在第一次调用时赋值为 0
    n++;
    printf("%d\n", n);
}
```

### 基本类型

下表是主流 64 位平台（x86-64 Linux、macOS）的典型取值，`sizeof` 以字节为单位：

| 类型 | 字节 | 有符号范围 | 无符号范围 | 说明 |
| --- | --- | --- | --- | --- |
| `_Bool` | 1 | — | 0 或 1 | C99 布尔类型，存整数 |
| `char` | 1 | -128 ~ 127 | 0 ~ 255 | 也是一个字节 |
| `unsigned char` | 1 | — | 0 ~ 255 | 二进制数据用这个 |
| `short` | 2 | -32768 ~ 32767 | 0 ~ 65535 | 很少需要 |
| `int` | 4 | 约 ±21 亿 | 0 ~ 约 42 亿 | 默认整型，够用 |
| `unsigned int` | 4 | — | 0 ~ 约 42 亿 | 计数、位运算首选 |
| `long` | 8 | 约 ±9.2 × 10¹⁸ | 0 ~ 1.8 × 10¹⁹ | 64 位 Linux 上是 8 字节 |
| `long long` | ≥ 8 | 同上 | 同上 | 明确要 64 位时用它 |
| `float` | 4 | 约 7 位有效数字 | 同 | 单精度，误差明显 |
| `double` | 8 | 约 15 ~ 16 位有效数字 | 同 | 默认浮点类型，优先用它 |
| `void` | — | — | — | 无类型，作函数返回值或空参数列表 |

> 字节数**由实现决定**，只保证相对大小关系（`sizeof(int) >= sizeof(short)`）。需要固定宽度时用 `<stdint.h>` 里的 `int8_t`、`uint32_t`、`int64_t`、`size_t`。

查看自己平台上的实际值：

```c
#include <stdio.h>
#include <stddef.h>

int main(void) {
    printf("int=%zu long=%zu ptr=%zu double=%zu\n",
           sizeof(int), sizeof(long), sizeof(void *), sizeof(double));
    return 0;
}
```

```text
int=4 long=8 ptr=8 double=8
```

### 类型转换

C 允许在数值类型之间**隐式转换**，这也是 bug 的常见来源。

```c
int    i = 3.9;        // 隐式：double -> int，结果是 3（截断，不是四舍五入）
double d = 7 / 2;      // 隐式：整数除法得 3，再转 double 仍是 3.0
double e = 7.0 / 2;    // 正确写法：3.5
int    f = (int) 7.9;  // 显式转换，明确意图
```

整数溢出不检查，直接回绕（C 标准规定无符号回绕，有符号溢出是未定义行为）：

```text
unsigned int a = 4294967295u;
a = a + 1;              // 静默变成 0
```

### 常量

| 写法 | 说明 |
| --- | --- |
| `const int MAX = 100;` | 运行期常量，编译器会优化 |
| `#define MAX 100` | 预处理替换，不占内存 |
| `enum { LOW, MID, HIGH };` | 枚举，默认值 0/1/2 |
| `3.14` / `1e-9` / `0x1F` / `0777` | `double` / 科学计数 / 十六进制 / 八进制 |

现代 C 更推荐 `const` 与 `enum`；`#define` 只在需要条件编译或宏替换时使用。

### 输入输出

```c
#include <stdio.h>

int main(void) {
    int    age;
    double height;
    char   name[64];

    printf("请输入姓名、年龄、身高：");
    scanf("%63s %d %lf", name, &age, &height);

    printf("%s 今年 %d 岁，身高 %.2f 米\n", name, age, height);
    return 0;
}
```

`printf` / `scanf` 的占位符必须与实参类型严格对应：

| 占位符 | 对应类型 | 说明 |
| --- | --- | --- |
| `%d` | `int` | 有符号十进制 |
| `%u` | `unsigned int` | 无符号十进制 |
| `%ld` / `%lu` | `long` | 64 位平台上的大数 |
| `%lld` | `long long` | 明确要 64 位时 |
| `%zu` | `size_t` | `sizeof` 的结果用它 |
| `%f` / `%.2f` | `double` | 默认 6 位小数 |
| `%e` | `double` | 科学计数法 |
| `%c` | `char` / `int` | 单个字符 |
| `%s` | `char *` | 以 `\0` 结尾的字符串 |
| `%x` / `%o` | `unsigned int` | 十六进制 / 八进制 |
| `%p` | `void *` | 打印地址 |
| `%%` | — | 输出一个 `%` |

三条必须记住的规则：

1. **`scanf` 里的普通变量要加 `&`**（取地址），数组名除外，因为它本身就是地址。
2. **格式串要写成字面量**。`printf(cmd)` 会被当成格式串，参数个数一旦不匹配就可能被利用注入。
3. **`scanf` 要检查返回值**。它返回成功赋值的个数，返回 1 表示只成功读入了一个，应中止程序继续用未初始化的变量。

## 运算符

| 类别 | 运算符 | 说明 |
| --- | --- | --- |
| 算术 | `+` `-` `*` `/` `%` | `/` 两侧都是整数时取整 |
| 自增自减 | `++` `--` | 前置返回新值，后置返回旧值 |
| 复合赋值 | `+=` `-=` `*=` `/=` `%=` `<<=` `&=` | 等价于先算再赋值 |
| 比较 | `==` `!=` `<` `>` `<=` `>=` | 结果是 `0`（假）或 `1`（真） |
| 逻辑 | `&&` `\|\|` `!` | `&&` `\|\|` 短路求值 |
| 位运算 | `&` `\|` `^` `~` | 与、或、异或、取反 |
| 移位 | `<<` `>>` | 左移等价乘 2，右移视类型除 2 |
| 三目 | `?:` | 条件表达式 |
| 其他 | `sizeof` `&` `*` `.` `->` | 求大小、取地址、解引用、成员访问 |

位运算是 C 的强项，用于掩码与开关：

```c
#include <stdbool.h>

unsigned int flags = 0;

flags |= 1 << 0;    // 置第 0 位
flags |= 1 << 3;    // 置第 3 位
flags &= ~(1 << 0); // 清第 0 位：先按位取反再与
flags &= ~(1 << 3); // 清第 3 位

int low  = flags & 0xFF;        // 取低 8 位
bool is_on = flags & (1 << 3);  // 判断某位是否为 1
```

> 位运算两侧必须是整数类型。对 `double` 用 `&` 或 `<<` 会直接编译报错，这是编译器帮你守住的第一道防线。

**短路求值**让逻辑运算可以兼做「安全取值」：

```c
if (p != NULL && *p > 0) { /* *p 只有在 p 非空时才解引用 */ }
```

## 控制流

### 条件分支

```c
if (score >= 90) {
    grade = 'A';
} else if (score >= 60) {
    grade = 'B';
} else {
    grade = 'F';
}
```

### 多分支

```c
switch (op) {
    case '+': result = a + b; break;   /* 漏掉 break 会继续往下执行 */
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    default:
        fprintf(stderr, "未知运算符\n");
        return 1;
}
```

`switch` 只能作用于**整数或字符类型**，不能用于浮点数，也不适合区间判断——那种情况用 `if` 链。

> `break` 的省略（fallthrough）不是 bug，而是有意为之：多个 `case` 共用一段处理逻辑时故意不写 `break`。读代码时看到连续的 `case` 没有 `break`，通常是有意设计。

### 循环

```c
for (int i = 0; i < 10; i++) {   /* 初始化；条件；更新 */
    printf("%d ", i);
}

int n = 5;
while (n > 0) {                  /* 循环前判断 */
    n--;
}

do {
    scanf("%s", buf);            /* 循环后判断，至少执行一次 */
} while (buf[0] == '\0');
```

| 关键字 | 作用 |
| --- | --- |
| `break` | 跳出当前最内层循环或 `switch` |
| `continue` | 跳过本次剩余部分，进入下一轮 |
| `goto` | 无条件跳转，实践中应避免（跳出嵌套循环时除外） |

`for` 里空置条件可写成无限循环，`while (1)` 语义相同：

```c
for (;;) {
    /* 靠 break 退出 */
}
```

## 函数

```c
#include <stdio.h>

/* 返回较大值；参数与返回值都写清类型 */
int max(int a, int b) {
    return a > b ? a : b;
}

int main(void) {
    printf("%d\n", max(3, 7));   /* 7 */
    return 0;
}
```

### 为什么需要函数原型

在调用前写出声明，编译器才能检查参数数量与类型是否匹配。C99 起**省略声明直接调用是错误**：

```c
int max(int a, int b);   /* 函数原型：告诉编译器签名 */

int main(void) {
    return max(1, 2);
}

int max(int a, int b) { /* 真正定义 */
    return a > b ? a : b;
}
```

> `implicit declaration of function` 意味着编译器在猜函数签名，这是 C 里最容易被忽视也最危险的一类错误：参数传错类型时不会立刻崩，而是在运行时留下诡异行为。**在自己的头文件里给每个函数写原型。**

### 传值 vs 传指针

C 的函数**永远按值传参**。想修改调用者的变量，必须显式传地址：

```c
#include <stdio.h>

void swap(int a, int b) {   /* 只换了副本 */
    int t = a; a = b; b = t;
}

void swap_ptr(int *a, int *b) {   /* 改了原变量 */
    int t = *a; *a = *b; *b = t;
}

int main(void) {
    int x = 1, y = 2;
    swap(x, y);      printf("%d %d\n", x, y);   /* 1 2，值没变 */
    swap_ptr(&x, &y); printf("%d %d\n", x, y);  /* 2 1，成功了 */
    return 0;
}
```

数组是例外：传数组时退化（decay）成指针，所以函数内能看到内容变化。

### 递归

```c
long factorial(int n) {
    if (n <= 1) return 1;          /* 必须有终止条件 */
    return n * factorial(n - 1);
}
```

| 适用 | 不适用 |
| --- | --- |
| 树与图遍历 | 简单循环（递归版更慢，栈开销大） |
| 分治算法（快排、归并） | 深度不可控的问题 |
| 分形与回溯 | 可用迭代写出的场景 |

### 常用库函数

| 头文件 | 函数 | 作用 |
| --- | --- | --- |
| `<stdio.h>` | `printf` `scanf` `fopen` `fgets` `fclose` | 标准输入输出与文件 |
| `<stdlib.h>` | `malloc` `free` `atoi` `strtol` `qsort` `exit` | 内存、转换、排序、退出 |
| `<string.h>` | `strlen` `strcpy` `strcat` `strcmp` `strchr` | 字符串操作 |
| `<math.h>` | `sqrt` `pow` `fabs` `floor` `log` | 数学函数 |
| `<ctype.h>` | `isdigit` `toupper` `isspace` | 字符分类与转换 |
| `<stdbool.h>` | `bool` `true` `false` | 提供标准布尔名 |
| `<assert.h>` | `assert` | 条件断言，调试期用 |
| `<time.h>` | `time` `clock` `strftime` | 时间处理 |

## 数组

```c
int    scores[5] = {90, 85, 92, 78, 95};   /* 部分初始化，其余补 0 */
int    zeros[1000];                         /* 自动初始化为 0 */
int    table[2][3] = { {1, 2, 3}, {4, 5, 6} };

/* 实际长度由编译器算出 */
static const char *names[] = { "alice", "bob", "carol" };
size_t n = sizeof(names) / sizeof(names[0]);   /* 3 */
```

| 操作 | 写法 |
| --- | --- |
| 访问 | `scores[0]` |
| 取长度 | `sizeof(scores) / sizeof(scores[0])` |
| 遍历 | `for (size_t i = 0; i < n; i++) { ... }` |
| 二维 | `table[i][j]`，`sizeof(table)` 是总字节数 |

把长度一并带上，就不必到处写 `sizeof`：

```c
void print(int arr[], size_t len) {
    for (size_t i = 0; i < len; i++) {
        printf("%d ", arr[i]);
    }
}
```

### 越界不会报错

```c
int a[5] = {0};
a[7] = 100;    /* 编译通过，运行时越界，静默破坏别处的内存 */
```

数组不保存长度，`a[7]` 只是「在 `a` 起始地址上偏移 7 个元素处写 4 字节」。编译器无法检查，越界往往表现为**别的数据莫名其妙被改坏**，或者偶发段错误。

> 预防手段：固定尺寸数组用编译期常量声明；动态尺寸一律用 `calloc` / `malloc` 并自行记录长度；开启 `-fsanitize=address`（见 [C 语言编译操作指南](C语言编译指南.md)）让越界当场报错。

### 变长数组

C99 引入，运行时才能确定长度，适合处理来自输入的数据：

```c
void fill(size_t n) {
    int arr[n];            /* n 个 int */
    for (size_t i = 0; i < n; i++) arr[i] = (int)i;
}
```

栈空间有限，n 很大时应改用堆分配。部分实现可禁用该特性，`#if !defined __STDC_NO_VLA__` 可检测。

## 指针

指针是**存储内存地址的变量**。它是 C 的核心概念，也是绝大多数崩溃的来源。

```c
int    x   = 42;
int   *p   = &x;     /* p 保存 x 的地址 */
int    y   = *p;     /* *p 解引用，取出 42 */

*p = 100;            /* 通过指针改 x，x 变成 100 */
```

三个符号别搞混：

| 符号 | 位置 | 含义 |
| --- | --- | --- |
| `*` | 类型后 | 这是一个指针 |
| `*` | 表达式前 | 解引用，取出指向的值 |
| `&` | 表达式前 | 取地址 |

```c
int **pp = &p;      /* 指向指针的指针 */
printf("%d\n", **pp);
```

### 指针的主要用途

| 用途 | 例子 |
| --- | --- |
| 避免拷贝大对象 | 传 `const char *` 而非整个结构体 |
| 修改调用者的数据 | `swap_ptr(&x, &y)` |
| 表达数组与字符串 | 数组名本身就是首元素地址 |
| 动态内存 | `malloc` 返回的就是指针 |
| 链表等数据结构 | 每个节点存下一个节点的地址 |
| 跳过一段数据 | 网络协议里的缓冲区游标 |
| 函数回调 | 函数指针 |

### 空指针与悬垂指针

```c
int *p = NULL;        /* 空指针：不指向任何对象 */

int *bad;             /* 未初始化，内容是垃圾值，解引用会崩 */
int *dangling = &x;   /* x 若已出作用域，dangling 就是悬垂指针 */
```

| 写法 | 后果 |
| --- | --- |
| `*p` 其中 `p == NULL` | 段错误 |
| 解引用未初始化的指针 | 段错误或随机行为 |
| 解引用已 `free` 的指针 | 段错误或堆被破坏 |
| 返回局部变量的地址 | 出了函数就是悬垂指针 |

**初始化指针为 `NULL`**，比让它存垃圾值安全得多。

### 指针算术

指针加的不是字节数，而是**元素个数**，`p + 1` 前进一个 `sizeof(元素)`：

```c
int a[5] = {10, 20, 30, 40, 50};
int *p = a;

p + 1    /* 指向 a[1]，实际地址前进 4 字节 */
```

这也是指针可以参与 `==` 比较、`p < a + 5` 判断的原因：**同一数组内的指针按元素顺序排列**。跨数组比较指针是未定义行为。

## 字符串

C 里没有内置字符串类型，「字符串」就是一串**以 `\0` 结尾**的 `char`。

```c
char  buf[] = "hello";       /* 字符数组，末尾自动补 \0，占 6 字节 */
const char *msg = "hello";   /* 指向字符串字面量，本质不可修改 */
```

```c
printf("%s\n", buf);
printf("%zu\n", strlen(buf));   /* 5，不算结尾的 \0 */
```

字符串字面量放在**只读**存储区，写它会触发未定义行为：

```c
char *s = "hello";
*s = 'H';    /* 危险：写入只读存储区，属未定义行为 */
```

### 常用字符串函数

| 函数 | 作用 | 注意 |
| --- | --- | --- |
| `strlen` | 求长度，不含 `\0` | 不接收 `NULL` |
| `strcpy` | 复制整个字符串 | 目标空间必须够大 |
| `strncpy` | 复制至多 n 字节 | 不保证补 `\0`，需手动处理 |
| `strcat` | 追加字符串 | 目标空间必须够大 |
| `strcmp` | 逐字节比较，返回 0 表示相等 | 只用返回值，别看绝对值 |
| `strncmp` | 比较前 n 字节 | 同上 |
| `strchr` | 查找首处出现的字符 | 返回指针或 `NULL` |
| `strstr` | 查找子串 | 返回指针或 `NULL` |
| `strtok` | 按分隔符切分 | 修改原字符串，不可重入 |
| `sprintf` / `snprintf` | 格式化写入缓冲区 | **用 `snprintf` 并检查返回值** |

所有接收字符串的函数都可能越界写，安全要求如下：

```c
#include <stdio.h>
#include <string.h>

void safe_copy(char *dst, size_t size, const char *src) {
    if (dst == NULL || size == 0) return;      /* 先查参数 */
    snprintf(dst, size, "%s", src);            /* 永不越界 */
    /* dst 若装不下会被截断，因此 dst 应保证以 \0 结尾 */
}
```

> 规则：**永远不用 `strcpy` / `strcat`**，改用 `snprintf`；`strncpy` 后手动补 `\0`。`snprintf` 返回的是「本应写入的字符数」，若返回值 ≥ size，说明发生了截断。

## 结构体与联合体

结构体把不同类型的数据组合成一条记录：

```c
#include <stdio.h>
#include <string.h>

struct point {
    int    x;
    int    y;
    char   label[16];
};

typedef struct point Point;    /* 起别名，省掉 struct 关键字 */

int main(void) {
    struct point a = { .x = 3, .y = 4 };   /* 指定成员初始化（C99）*/
    Point          b = a;                  /* 用 typedef 的类型整体赋值 */

    b.x = 10;
    strcpy(b.label, "origin");             /* 含数组成员的结构体同样能整体赋值 */
    printf("(%d, %d) %s\n", b.x, b.y, b.label);
    return 0;
}
```

| 写法 | 说明 |
| --- | --- |
| `a.x` | 结构体变量访问成员 |
| `p->x` | 结构体指针访问成员，等价于 `(*p).x` |
| `struct point a = {1, 2}` | 按顺序初始化 |
| `struct point a = {.x = 1}` | 指定成员初始化，未写的补 0 |
| `struct point a = {0}` | 全清零 |

结构体可以**整体赋值**，`=` 会逐字节复制全部成员，**即使成员里含数组成员也一样**：

```c
struct point a = {1, 2, "src"};
struct point b = a;    /* 合法：label 数组的内容一并复制 */
```

> 这里容易混淆：**数组不能赋值**（`int d[3]; int e[3]; e = d;` 是错的），但**含数组的结构体可以整体赋值**。真正不能被赋值的是数组类型本身。

### 结构体嵌套与传参

```c
struct segment {
    struct point start;   /* 嵌套结构体 */
    struct point end;
};

struct point midpoint(struct segment s) {
    struct point m;
    m.x = (s.start.x + s.end.x) / 2;
    m.y = (s.start.y + s.end.y) / 2;
    return m;             /* 按值返回一个结构体是允许的 */
}
```

**结构体较大时按指针传递**，避免每次调用都拷贝整个结构体：

```c
struct point midpoint_p(const struct segment *s) {
    struct point m = {
        (s->start.x + s->end.x) / 2,
        (s->start.y + s->end.y) / 2,
        "",                     /* 剩余成员必须显式初始化，否则 -Wextra 会报警告 */
    };
    return m;
}
```

### 位域与枚举

```c
struct flags {                 /* 精确控制位宽，省内存 */
    unsigned int a : 1;
    unsigned int b : 3;
    unsigned int c : 4;
};

enum status {                  /* 自动从 0 递增 */
    ST_OK = 0,
    ST_ERROR = 1,
    ST_BUSY = 2
};
```

## 内存管理

栈上的空间由编译器自动分配与回收，堆上的空间要自己管。

| 对比 | 栈 | 堆 |
| --- | --- | --- |
| 谁管理 | 编译器自动 | 程序员调用 `malloc` / `free` |
| 大小 | 有限，编译期基本确定 | 大得多，由系统按需分配 |
| 开销 | 极小，只移动栈指针 | 相对大 |
| 生命周期 | 到作用域结束 | 直到显式 `free` |
| 典型用途 | 局部变量、函数参数 | 变长数据、跨函数共享 |

```c
#include <stdlib.h>
#include <string.h>

int *make_array(size_t n) {
    int *arr = malloc(n * sizeof *arr);   /* sizeof *arr 而非 sizeof(int) */
    if (arr == NULL) return NULL;          /* 必须检查 */

    for (size_t i = 0; i < n; i++) arr[i] = 0;
    return arr;
}

int main(void) {
    int *nums = make_array(100);
    if (nums == NULL) return 1;

    nums[0] = 42;
    free(nums);
    nums = NULL;      /* 置空，避免误用已释放内存 */
    return 0;
}
```

| 函数 | 作用 | 陷阱 |
| --- | --- | --- |
| `malloc(n)` | 分配 n 字节，**内容未初始化** | 失败返回 `NULL` |
| `calloc(n, s)` | 分配 n×s 字节并**清零** | 失败返回 `NULL` |
| `realloc(p, n)` | 调整已分配块的大小 | **失败时返回 `NULL` 且原块未释放，必须用临时指针** |
| `free(p)` | 释放 | 只能传 `malloc` 系列返回值 |

`realloc` 的经典正确写法：

```c
int *tmp = realloc(arr, new_count * sizeof *arr);
if (tmp == NULL) { /* 分配失败，arr 仍然有效 */ }
arr = tmp;
```

### 四类典型内存错误

| 错误 | 后果 | 预防 |
| --- | --- | --- |
| 内存泄漏 | 分配的内存没 `free`，程序越跑占用越高 | 每处分配配一处释放；用工具检测 |
| 悬垂指针 | 访问已释放或已出作用域的内存 | 释放后立刻置 `NULL` |
| 重复释放 | 对同一指针 `free` 两次，堆状态损坏 | 只在拥有所有权的一方释放 |
| 越界访问 | 读写超出分配范围，破坏相邻数据 | 记录长度；用 `calloc` 后逐项检查 |

> 定位手段：`-fsanitize=address,undefined` 编译后运行，越界与泄漏会直接报出行号；也可用 `valgrind --leak-check=full`。用法见 [C 语言编译操作指南](C语言编译指南.md)。

小技巧：`free(NULL)` 是安全的，所以释放前不必先判断：

```c
free(p);   /* p 为 NULL 时什么都不做 */
p = NULL;
```

## 文件操作

### 打开与关闭

```c
#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    if (f == NULL) {
        perror("data.txt");     /* 打印 errno 对应的原因 */
        return 1;
    }

    /* 读 */

    fclose(f);                   /* 必须关闭，否则缓冲区可能未落盘 */
    return 0;
}
```

| 模式 | 含义 |
| --- | --- |
| `"r"` | 只读，文件不存在则失败 |
| `"w"` | 只写，**文件存在会清空**，不存在则创建 |
| `"a"` | 追加，在文件末尾写入 |
| `"r+"` | 可读写，文件必须存在 |
| `"rb"` / `"wb"` | 加 `b`，Windows 下避免换行转换 |

> `"w"` 是**截断模式**，写错模式会直接清空原文件。不确定用哪个模式时，先用 `fopen(..., "a")` 或读整个文件内容确认。

### 读写

| 函数 | 用途 |
| --- | --- |
| `fprintf` / `fscanf` | 格式化读写 |
| `fgets` / `fputs` | 整行读写字符串 |
| `fgetc` / `fputc` | 单字符读写 |
| `fread` / `fwrite` | 按字节块读写（二进制） |
| `fseek` / `ftell` / `rewind` | 定位 |
| `feof` / `ferror` | 判断结束或出错 |

完整例子：统计文件中各单词出现次数

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#define MAX_WORD 64
#define MAX_KIND 1024

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "用法: %s <文件>\n", argv[0]);
        return 1;
    }

    FILE *f = fopen(argv[1], "r");
    if (f == NULL) {
        perror(argv[1]);
        return 1;
    }

    char   words[MAX_KIND][MAX_WORD] = {0};
    int    count[MAX_KIND]         = {0};
    size_t kinds = 0;
    char   line[256];

    while (fgets(line, sizeof line, f) != NULL) {
        char *tok = strtok(line, " \t\r\n");
        while (tok != NULL) {
            size_t i = 0;
            while (i < kinds && strcmp(words[i], tok) != 0) i++;

            if (i == kinds && kinds < MAX_KIND) {
                snprintf(words[kinds], MAX_WORD, "%s", tok);
                count[kinds] = 0;
                kinds++;
            }
            if (i < MAX_KIND) count[i]++;
            tok = strtok(NULL, " \t\r\n");
        }
    }
    fclose(f);

    for (size_t i = 0; i < kinds; i++) {
        printf("%-20s %d\n", words[i], count[i]);
    }
    return 0;
}
```

编译运行：

```bash
gcc -std=c17 -Wall -Wextra -o wc main.c
```

### 读取用户输入

`scanf("%s", buf)` 在遇到空格就停止，长度也可能超界。读一整行用 `fgets`，并**记得吃掉行尾换行符**：

```c
char buf[128];

printf("输入一行：");
if (fgets(buf, sizeof buf, stdin) == NULL) return 1;

buf[strcspn(buf, "\n")] = '\0';   /* 去掉换行符 */
```

紧接着调 `scanf` 时，若上一步没吃掉换行符，`scanf` 会读到那个换行并失败或读入空串——这是新手最常撞的坑。

## 预处理

预处理在编译器看到源码**之前**执行，做文本替换与条件编译。

| 指令 | 作用 |
| --- | --- |
| `#include` | 引入头文件的声明 |
| `#define` | 定义宏（常量或函数式宏） |
| `#undef` | 取消宏定义 |
| `#ifdef` / `#ifndef` / `#if` | 条件编译 |
| `#else` / `#elif` / `#endif` | 条件分支 |
| `#error` | 条件不满足时让编译失败 |

```c
#define MAX_SIZE 1024
#define SQUARE(x) ((x) * (x))     /* 每个参数加括号：必须 */

#if MAX_SIZE > 512
#define BUFFER_MODE 1
#else
#define BUFFER_MODE 0
#endif
```

宏函数的参数**必须加括号**，否则会因优先级出错：

```c
SQUARE(2 + 3)     /* 正确写法 ((2+3)*(2+3)) = 25 */
#define BAD(x) x * x
BAD(2 + 3)         /* 2 + 3 * 2 + 3 = 11，错误 */
```

### 头文件规范

```c
#ifndef UTIL_H
#define UTIL_H

/* 只放声明，不放函数定义 */

#endif /* UTIL_H */
```

这叫 include guard，防止同一个头文件被重复展开导致重复定义。现代 C 可用 `#pragma once`，但可移植性略差。

> 头文件里**只写声明，不写定义**。头文件会被多个源文件包含，函数定义放进去会导致链接时重复定义。

## 完整示例

把前面几个概念合起来：读入若干数字，统计最小值、最大值、总和与平均值。

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t cap = 8;
    size_t len = 0;
    int   *data = calloc(cap, sizeof *data);
    if (data == NULL) {
        perror("calloc");
        return 1;
    }

    int value;
    int min = 0, max = 0;
    long sum = 0;

    printf("输入若干整数，以非数字结束：\n");
    while (scanf("%d", &value) == 1) {      /* 每次检查返回值 */
        if (len == cap) {
            size_t new_cap = cap * 2;
            int *tmp = realloc(data, new_cap * sizeof *data);
            if (tmp == NULL) break;           /* 保留原数据继续用 */
            data = tmp;
            cap = new_cap;
        }
        data[len++] = value;

        if (len == 1) {
            min = max = value;
        } else {
            if (value < min) min = value;
            if (value > max) max = value;
        }
        sum += value;
    }

    if (len == 0) {
        printf("没有输入任何整数\n");
    } else {
        printf("个数 %zu  最小 %d  最大 %d  总和 %ld  平均 %.2f\n",
               len, min, max, sum, (double)sum / (double)len);
    }

    free(data);
    return 0;
}
```

这个程序包含了：动态扩容、返回值检查、`realloc` 的安全用法、类型转换避免整除、释放内存。

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
| --- | --- | --- |
| 忘记分号 | 报错位置与问题位置对不上 | 逐条检查语句结尾 |
| `if (x = 5)` | 赋值而非比较，真假恒为真 | 用 `if (x == 5)` |
| 字符串未加 `\0` | `printf("%s")` 输出乱码 | 数组长度比字符串多 1，或用 `snprintf` |
| 修改字符串字面量 | 未定义行为，常直接崩 | 用 `char buf[] = "..."` 或 `const char *` |
| 返回局部变量地址 | 悬垂指针，读出随机值 | 返回值，或用 `static` / 堆内存延长寿命 |
| `scanf` 忘记 `&` | 读到垃圾值或崩 | 普通变量加 `&`，数组名不加 |
| `printf` 格式串不匹配 | 栈上乱打印、偶发崩溃 | 固定类型配固定占位符，`size_t` 用 `%zu` |
| 整数溢出 | 结果诡异、无警告 | 用 `int64_t` / `uint32_t`，乘法前检查范围 |
| 浮点数用 `==` 比较 | 本该相等的判断失败 | 用 `fabs(a - b) < 1e-9` 或比较差值 |
| 数组之间直接赋值 | 报 "assignment to expression with array type" | 用 `memcpy` 或逐元素循环 |
| `free` 后继续用 | 堆损坏 | 释放后立刻置 `NULL` |
| 忘记 `fclose` | 数据未落盘、文件句柄耗尽 | 每次 `fopen` 配一次 `fclose` |

### 浮点数不能直接比较

```c
#include <math.h>

double a = 0.1 + 0.2;
printf("%f\n", a);                 /* 0.300000 */

if (a == 0.3) printf("相等\n");     /* 几乎不会成立 */
if (fabs(a - 0.3) < 1e-9) printf("相等\n");   /* 正确 */
```

`0.1 + 0.2` 在二进制里无法精确表示，`%f` 打出 `0.300000`，但它与字面量 `0.3` 的差是 `5.551e-17`。需要精确十进制时改用定点数（放大 100 倍存 `int`）。

## 学习路径

### 练习清单

| 阶段 | 题目 | 涉及知识点 |
| --- | --- | --- |
| 入门 | 猜数字游戏 | 循环、条件、随机数 |
| 入门 | 单位与进制转换 | 算术运算、`scanf` |
| 入门 | 简易计算器 | `switch`、函数拆分 |
| 进阶 | 成绩排序与统计 | 二维数组、`qsort` |
| 进阶 | 字符串反转与回文判断 | 数组、指针运算 |
| 进阶 | 猜数字 + 文件存读档 | 文件操作 |
| 进阶 | 单链表实现增删查 | 指针、`malloc`/`free` |
| 进阶 | 简易命令行计算器（`argc`/`argv`） | 字符串解析、动态内存 |
| 深入 | 简易 TCP 聊天程序 | 套接字、并发 |
| 深入 | JSON 解析器或表达式求值器 | 递归下降、状态机 |

### 参考资料

| 资源 | 说明 |
| --- | --- |
| [cppreference C](https://en.cppreference.com/w/c) | 语法与库函数最准确的在线参考 |
| [Beej's Guide to C Programming](https://beej.us/guide/bgc/) | 篇幅友好的免费 C 教程 |
| [Modern C](https://gustedt.gitlabpages.inria.fr/modern-c/) | Jens Gustedt 免费书，风格现代 |
| [C Traps and Pitfalls](https://doc.cs.yale.edu/hjl/c4.pdf) | 薄但精，中级读者踩坑必读 |
| man 手册 | `man 3 printf`、`man 7 stdio` 最权威 |
| `-Wall -Wextra` 警告 | 逐条修掉所有警告，它们都是真问题 |

> 建议顺序：先把本文和编译指南读完，写完能编译运行的小程序，再读《C Traps and Pitfalls》。**C 的知识点不多，但坑很多**——指针、数组退化、`scanf`、生命周期这四块务必配合编译器警告和 `-fsanitize` 反复练，胜过只读不写。