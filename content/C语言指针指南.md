---
title: C 语言指针入门到进阶指南
slug: c-pointer-guide
order: 9
---

# C 语言指针入门到进阶指南

指针是 C 里**唯一能表达「数据之间的关系」的语法**。变量装的是值，指针装的是位置；正因为能拿着位置去改别处的东西，才有了链表、动态内存、回调、内存映射这些能力，也才有了 C 的大部分崩溃。

本文按「先会用 → 再用对 → 最后用好」的顺序组织：

| 阶段 | 章节 | 目标 |
| --- | --- | --- |
| 入门 | 符号、定义、初始化、空指针 | 看懂 `*p = 10;` 到底做了什么 |
| 会用 | 数组退化、指针算术、多级指针、`const` | 写出安全的参数传递与遍历 |
| 用对 | 动态内存、所有权、悬垂指针 | 不泄漏、不越界、不 double free |
| 用好 | 函数指针、`restrict`、`volatile`、容器转换 | 支撑链表、回调表、驱动与内核风格代码 |

前置知识见 [C 语言入门指南](C语言入门指南.md)（变量、数组、结构体、内存管理）；编译选项与调试工具见 [C 语言编译操作指南](C语言编译指南.md)。文中代码在 **gcc 13 / `-std=c17` / `-Wall -Wextra`** 下零警告通过。

## 内存模型：先建立正确的心智模型

C 的抽象机里只有三样东西：**对象**（占据一段存储的数据）、**地址**、以及**按字节寻址的存储**。

```text
存储（按字节编号）
0x7ffd1000  ┌────────┐
0x7ffd1001  │        │
0x7ffd1004  ├────────┤  int x = 42;   x 的地址是 0x7ffd1000
0x7ffd1005  │  42    │  占 4 字节
0x7ffd1008  ├────────┤
            │  ...   │
0x7ffd2010  ├────────┤  int *p = &x;  p 的地址是 0x7ffd2010
0x7ffd2014  │0x7ffd..│  p 的内容是 x 的地址
0x7ffd2018  ├────────┤
```

关键点：

| 事实 | 含义 |
| --- | --- |
| 地址是**标量值**，可以加减、比较、存进变量 | 所以指针能算术、能排序 |
| 一个对象的地址在程序运行期间不变 | 指针可以自由传递、长期保存 |
| 对象有**类型**，`sizeof` 决定步长 | 所以 `p + 1` 前进的是 `sizeof(*p)` 字节而不是 1 字节 |
| 类型只影响编译器**怎么解释这段字节** | 同一段内存按 `int` 读和按 `float` 读得到不同结果 |

最后一条是理解内存问题的钥匙：**C 只知道指针指向某种类型的几个字节，不知道这块内存「本来」是什么**。类型检查是编译期的事，运行时没有任何保护。

## 三个符号：`&`、`*` 与声明

指针的全部语法就来自这三个符号，理解它们在**声明位置**和**表达式位置**的区别就够了：

| 符号 | 出现在 | 含义 |
| --- | --- | --- |
| `T *` | 类型后，**声明** | 声明一个「指向 `T` 的指针」 |
| `&x` | 表达式前 | 求 `x` 的地址，得到 `T *` |
| `*p` | 表达式前 | 解引用，把 `T *` 变回 `T` |

```c
int x = 42;

int *p = &x;   /* 声明：p 是 int 指针；&x 取地址 */
int  y = *p;   /* 表达式：*p 取出 42，赋给 y */
*p = 100;      /* 表达式：等价于 x = 100 */
```

`*` 与 `&` 互为逆运算，类型上严格配对：

| 表达式 | 类型 | 运算后类型 |
| --- | --- | --- |
| `&x`（x 是 `int`） | 取地址 | `int *` |
| `*p`（p 是 `int *`） | 解引用 | `int` |
| `&a[0]` | 取地址 | `int *` |
| `a`（a 是 `int[5]`） | 数组转指针 | `int *` |

### `int *p` 还是 `int* p`

两者**完全等价**，都是声明一个 `int` 指针。空白不影响语义，`*` 属于**声明符**（declarator），不是类型名的一部分：

```c
int  *p1;    /* 正确 */
int * p2;    /* 同样正确 */
int*  p3;    /* 同样正确 */
```

但**多变量声明时必须小心**，因为 `*` 只作用于它左边紧邻的那个变量名：

```c
int  *a, b;     /* a 是指针，b 是 int！—— 最常见的误读 */
int  *a, *b;    /* 都要指针 */
int   a, *b;    /* a 是 int，b 是指针 */
```

**实践约定**：一律写 `int *a, *b;`，即星号紧贴变量名、与类型名分开。`int *p` 在视觉上像是一个完整类型，这种「像类型」的写法能防止上面的误读。

### 声明结构：从内向外读

复杂指针声明只有一条规则：**从变量名向外读**。

```c
int          *p;          /* p 是指向 int 的指针 */
int         **pp;         /* pp 是指向「int 指针」的指针 */
int        (*ap)[5];      /* ap 是指向「5 个 int 的数组」的指针 */
int        *fn(int);      /* fn 是函数：接受 int，返回 int 指针 */
int       (*cb)(int, int);/* cb 是函数指针：接受两个 int，返回 int */
int        *arr[5];       /* arr 是数组：5 个 int 指针 */
int      (*matrix)[3];    /* matrix 是指针：指向 3 个 int 的数组 */
```

记住两条捷径：

- `(*x)` 加括号 → `x` 是**指针**
- `*x` 不加括号 → `x` 是**数组**

`arr[5]` 等价于 `*(arr + 5)`，所以「数组」其实是「指针算术的语法糖」，`int *arr[5]` 就是 5 个 `int *`。而 `int (*matrix)[3]` 是指针，指向一整行 3 个 int。

## 定义与初始化

### 一定要初始化

未初始化的指针里是**上一个值留下的垃圾**（多为 0 或某个历史地址），解引用它的后果是随机行为：

```c
#include <stdio.h>

int main(void) {
    int  x = 42;
    int *ok   = &x;     /* 正确：指向有效对象 */
    int *none = NULL;    /* 正确：明确表示「不指向任何东西」 */

    printf("%d %p\n", *ok, (void *)none);
    return 0;
}
```

`%p` 是打印指针的占位符，实参必须转成 `void *`：

```c
printf("p  = %p\n", (void *)p);    /* 正确 */
printf("p  = %p\n", p);            /* 严格来说类型不匹配 */
printf("p  = %p\n", (void *)&x);   /* 直接打印 x 的地址 */
```

### 空指针的三种判空写法

```c
#include <stddef.h>
#include <stdio.h>

int check(int *p) {
    if (p == NULL)  return 0;   /* 推荐，与标准里 NULL 的定义无关 */
    if (!p)         return 0;   /* 可以：指针为 NULL 即为「假」 */
    if (p == 0)     return 0;   /* 语义正确但可读性差 */
    return 1;
}
```

`NULL` 在 C17 里由实现定义（`<stddef.h>` 通常展开为 `((void *)0)`），所以**永远不要对它解引用或做算术**。C23 引入了真正的空指针常量 `nullptr`，用 `-std=c2x` 编译时可用。

### 指针变量本身也是对象

```c
int  x = 42;
int *p = &x;
int **pp = &p;          /* 指向 p 本身 */

printf("%d\n", **pp);   /* 42 */
*pp = &x;               /* 等价于 p = &x */

printf("%zu\n", sizeof p);          /* 指针大小，通常 8 */
printf("%zu\n", sizeof (void *));    /* 所有对象指针一样大 */
```

关键结论：**所有对象指针在同一个平台上位宽相同**（通常 8 字节），这让 `void *` 可以无损转成任意对象指针。

## 指针与数组：退化的本质

### 数组会转换成指向首元素的指针

这是 C 中最高频的「惊喜」，也是数组参数必须带长度的根本原因：

```c
int a[5] = {1, 2, 3, 4, 5};
int *p = a;          /* 合法：a 自动变成 &a[0] */
p[2] = 30;           /* 等价于 *(&a[0] + 2) = a[2] */
```

下面这些写法**语义完全相同**：

```c
a[i]        *(a + i)        *(i + a)        i[a]
```

但 `a` **不是**指针，有几个例外场景它不会退化：

| 场景 | `a` 的类型 | 原因 |
| --- | --- | --- |
| `sizeof a` | `int[5]` | 需要类型大小，不能转成指针 |
| `&a` | `int (*)[5]` | 取的是数组本身的地址 |
| `_Alignof (typeof a)` | `int[5]` | 类型运算 |
| `char s[] = "abc";` 的初始化 | `char[4]` | 字符串字面量专有规则 |

### 函数参数里的数组

数组作为参数时退化成指针，**长度信息彻底丢失**，所以必须额外传一个 `size_t`：

```c
#include <stdio.h>

void print(const int *a, size_t n) {   /* const int * 等价 int const * */
    for (size_t i = 0; i < n; i++) {
        printf("%d ", a[i]);
    }
    putchar('\n');
}
```

**下面这种写法是经典 bug**：

```c
void wrong(int a[]) {
    printf("%zu\n", sizeof a / sizeof a[0]);   /* 恒为 2 或一个随机数 */
}
```

`a` 在 `wrong` 内是 `int *`（8 字节），`a[0]` 是 `int`（4 字节），`8 / 4 = 2`——无论数组多长都是 2。要在函数内拿长度，只有三条路：

```c
void f1(size_t n) { int a[n]; }                        /* 变长数组：长度是编译期已知的量 */
void f2(struct vec v) { size_t n = v.len; /* ... */ }   /* 结构体打包：长度与数据同在 */
void f3(int *a, size_t n) { /* ... */ }                 /* 显式传长度：最通用 */
```

### `&a` 与 `a` 的类型不同

```c
int a[3][4];
a          /* 类型 int (*)[4]，指向第 0 行 */
&a         /* 类型 int (*)[4]，指向整个数组，等价 */
&a[0]      /* 类型 int (*)[4]，指向第 0 行，等价 */
a[0]       /* 类型 int *，指向第 0 行第 0 个元素 */
```

二维数组的参数声明只有两种正确写法：

```c
void row_sum(int (*row)[4], size_t rows);   /* 完整声明 */
void row_sum(int row[][4], size_t rows);    /* 糖，等价 */
```

`int *row` 是**错的**：它丢失了行宽，无法定位第 i 行的起始地址。

### 二维数组的遍历

```c
#include <stdio.h>

int main(void) {
    int a[3][4] = { {1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12} };

    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 4; j++) {
            printf("%3d", a[i][j]);
        }
        putchar('\n');
    }

    /* 一维化：把所有元素看成连续的一维数组 */
    int *flat = &a[0][0];
    for (int i = 0; i < 12; i++) {
        printf("%d ", flat[i]);
    }
    putchar('\n');
    return 0;
}
```

C 标准**保证一维连续**（`a[i][j]` 的地址可由 `&a[0][0] + i * 4 + j` 计算），所以把二维数组强转成 `int *` 遍历是**可移植的**做法；但列数仍需自己写死。

## 指针算术

指针加的是**元素个数**，不是字节：

```c
int a[5] = {10, 20, 30, 40, 50};
int *p = a;

p + 1        /* 前进 sizeof(int) == 4 字节，指向 a[1] */
(int *)((char *)p + 4)   /* 想按字节走就显式转成 char * */
```

| 运算 | 结果 | 合法范围 |
| --- | --- | --- |
| `p + n` / `p - n` | 向前/后移动 n 个元素 | 只能在 `p` 所属数组的 `[首, 尾后]` 内 |
| `p - q` | 相差的元素个数 | 只有 `p`、`q` 指向同一数组时才有定义 |
| `p++` / `p--` | 移动一格 | 同上 |
| `p == q` / `p != q` | 比较是否指向同一位置 | 可与 `NULL` 比较 |
| `p < q` / `p >= q` | 先后顺序 | 只有同一数组内（注意：C 标准严格讲只要求 `<` 等比较**同数组**，与 `NULL` 的顺序比较是未定义行为） |

`p == a + 5` 是**合法的**，它指向数组尾后位置（one-past-the-end），只能用来比较、不能解引用：

```c
int *end = a + 5;
for (int *it = a; it != end; ++it) {   /* 安全的遍历方式 */
    printf("%d ", *it);
}
```

> **未定义行为速记**：跨界算术（`a + 100`）、跨数组比较（`p < q` 时 p、q 来自不同数组）、对 `NULL` 或尾后指针解引用、拿栈上数组的尾后指针去做减法。

`void *` 不能做算术（标准层面），GNU 扩展允许当作 `char *` 处理，但换编译器就可能失效，不要依赖。

## `const` 与指针的四种组合

这是 C 里最容易读错的部分。**关键在于 `const` 限的是它左边最近的类型，而「指针」和「所指对象」是两层**：

```c
const int *p;   /* 1. 指向 const int：能改指向，不能改值 */
int *const p;   /* 2. const 指针：不能改指向，能改值 */
const int *const p;  /* 3. 都不能改 */
int *p;               /* 4. 都能改 */
```

| 声明 | 能否 `*p = 1` | 能否 `p = &x` | 用途 |
| --- | --- | --- | --- |
| `int *p` | 能 | 能 | 几乎不该用在自己的代码里 |
| `const int *p` | 不能 | 能 | **只读参数的首选写法** |
| `int *const p` | 能 | 不能 | 循环游标、固定指向 |
| `const int *const p` | 不能 | 不能 | 命名常量 |

读法：`const int *p` 从右往左读——`p` 是个指针，指向 `const int`。等价写法 `int const *p`（`const` 修饰它左边的类型）。

### `const` 的真正价值：把契约写进类型

```c
#include <stdio.h>
#include <string.h>

/* 只读：函数承诺不会修改内容 */
size_t count_char(const char *s, char c) {
    size_t n = 0;
    for (; *s != '\0'; s++) {
        if (*s == c) n++;
    }
    return n;
}

int main(void) {
    char buf[16];
    snprintf(buf, sizeof buf, "hello");

    /* 传 const char * 给 const char * 参数，合法 */
    printf("%zu\n", count_char(buf, 'l'));

    /* 反例：下面的调用通不过编译，错误在编译期而不是运行时
       char *q = "world";
       count_char(q, 'w');          // 若 count_char 收 char *，本可编译，但语义危险
       *q = 'W';                    // 写入字符串字面量，未定义行为
    */
    return 0;
}
```

把参数写成 `const T *` 相当于一份**可编译的文档**：调用者立刻知道「这个函数不会动我的数据」，而且能让编译器做更多优化（去别名分析）。

另外，`char buf[16]` 可以直接传给 `const char *` 参数——数组会退化成指针，不涉及 `const` 冲突。反过来传 `const char *` 给 `char *` 参数则**编译报错**，这正是我们要的防线。

## 指针作为函数参数

### 输出参数

C 的参数一律**按值传递**，所以「让函数修改调用者的变量」的唯一办法是传地址：

```c
#include <stdio.h>

int divmod(int num, int den, int *quot, int *rem) {
    if (den == 0) return -1;      /* 用返回值报告错误，不额外设 out 参数 */
    *quot = num / den;
    *rem  = num % den;
    return 0;
}

int main(void) {
    int q, r;
    if (divmod(17, 5, &q, &r) == 0) {
        printf("商 %d 余 %d\n", q, r);    /* 商 3 余 2 */
    }
    return 0;
}
```

设计约定：**成功/失败用返回值报告，数据用出参带回**。把错误塞进出参会迫使调用者检查更多东西，也容易漏检。

### 返回指针

```c
#include <stdio.h>
#include <string.h>

/* 返回指向局部数组的指针 —— 悬垂指针！函数返回后内存已失效 */
char *bad_upper(void) {
    char buf[8] = "abc";
    return buf;                    /* 编译器可能不警告，运行时是未定义行为 */
}

/* 正确做法一：调用者提供缓冲区 */
void good_upper(char *out, size_t n, const char *in) {
    if (out == NULL || in == NULL || n == 0) return;
    size_t i = 0;
    for (; in[i] != '\0' && i + 1 < n; i++) {
        out[i] = (in[i] >= 'a' && in[i] <= 'z') ? (char)(in[i] - 32) : in[i];
    }
    out[i] = '\0';
}

int main(void) {
    char dst[8];
    good_upper(dst, sizeof dst, "hello");
    printf("%s\n", dst);           /* HELLO */
    return 0;
}
```

除了局部变量，下面这些返回值同样立刻失效：函数内 `static` 之外的一切栈对象、VLA、指向已 `free` 内存的指针。

### 二级指针：修改指针本身

函数想**改变调用者的指针指向**（比如重新分配内存）时，需要 `T **`：

```c
#include <stdio.h>
#include <stdlib.h>

void reset(int **p) {
    *p = NULL;                     /* 把调用者的指针置空 */
}

void fill(int *a, size_t n, int value) {
    for (size_t i = 0; i < n; i++) a[i] = value;
}

int main(void) {
    int *arr = malloc(4 * sizeof *arr);
    if (arr == NULL) return 1;

    fill(arr, 4, 7);
    printf("%d %d\n", arr[0], arr[3]);   /* 7 7 */

    free(arr);                           /* 先释放：这块是 main 分配的 */
    reset(&arr);                         /* 再置空，挡住后续误用 */
    printf("%p\n", (void *)arr);         /* (nil)，调用者的指针真的变了 */
    return 0;
}
```

> **置空 ≠ 释放。** 若把上面两行调换顺序——先 `reset(&arr)` 再 `free(arr)`——程序不会报错，但**内存已经泄漏**：`free(NULL)` 什么也不做，而原始地址就此丢失。置空只解决「误用」，`free` 才解决「占用」，两者不能互相替代。

注意区分：

| 场景 | 参数类型 | 效果 |
| --- | --- | --- |
| 修改指针指向的数据 | `T *` | 改的是**对象内容** |
| 修改指针自身的指向 | `T **` | 改的是**指针变量** |

### `void *` 泛型接口

C 没有泛型，但 `void *` 能充当「任意对象指针」，配合手写转换就能写出类型安全的容器接口：

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    void  *data;
    size_t count;
    size_t stride;          /* 每个元素的字节数，用于用 char * 做算术 */
} vec;

vec vec_new(size_t stride) {
    vec v = { NULL, 0, stride };
    return v;
}

int vec_push(vec *v, const void *elem) {
    void *tmp = realloc(v->data, (v->count + 1) * v->stride);
    if (tmp == NULL) return -1;
    v->data = tmp;

    char *base = (char *)v->data;                 /* 转成 char * 才能做指针算术 */
    memcpy(base + v->count * v->stride, elem, v->stride);
    v->count++;
    return 0;
}

void *vec_at(const vec *v, size_t i) {
    if (i >= v->count) return NULL;
    return (char *)v->data + i * v->stride;
}

void vec_free(vec *v) {
    free(v->data);
    v->data = NULL;
    v->count = 0;
}
```

这个结构就是**半个 C 版 `std::vector`**：`stride` 让它能装任意类型，代价是每次元素访问要手动转型，且类型安全由调用者保证。

## 字符串与指针

C 没有字符串类型，「字符串」是**以 `\0` 结尾的 `char` 序列**；而 `char *` 是指向这种序列的指针：

```c
char        buf[] = "hello";        /* 可写数组，6 字节（含 \0） */
const char *msg  = "hello";        /* 指向只读的字面量 */
```

| 写法 | 类型 | 可写 | 生命周期 |
| --- | --- | --- | --- |
| `char buf[] = "hi";` | `char[3]` | 可以 | 栈上，随作用域 |
| `char buf[8] = "hi";` | `char[8]` | 可以 | 栈上，多余位置补 `\0` |
| `const char *s = "hi";` | `const char *` | 不可以 | 整个程序运行期 |
| `char *s = "hi";` | `char *` | 写入是**未定义行为** | 整个程序运行期 |
| `char *s = malloc(8); strcpy(s, "hi");` | `char *` | 可以 | 直到 `free` |

字符串字面量存放在只读数据段，**写它可能直接段错误**：

```c
const char *s = "hello";
*s = 'H';          /* 未定义行为 */
```

### 遍历字符串的四种方式

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *s = "hello";

    for (size_t i = 0; s[i] != '\0'; i++)      putchar(s[i]);   /* 下标 */
    putchar('\n');

    for (const char *p = s; *p != '\0'; p++)   putchar(*p);     /* 指针游标 */

    for (const char *p = s; *p; ++p)           putchar(*p);     /* 省略比较 */
    putchar('\n');

    puts(s);                                                     /* 直接输出 */
    return 0;
}
```

后两种写法依赖「非 `\0` 字节的值为真」，是 C 字符串的惯用技巧；一旦指针越界读到 `\0` 之外的垃圾，就可能一直循环下去。

### 字符串参数一律用 `const char *`

```c
#include <string.h>

/* 危险签名：函数内部随时可能改你的数据 */
void unsafe(char *s);

/* 推荐签名：只读，调用者能传字符串字面量 */
void safe(const char *s);
```

`char *` 参数不能接受字符串字面量（`"abc"` 是 `const char[4]`），所以很多 API 不得不用 `char *` 接收字面量，这个接口设计本身就是缺陷。

### 命令行参数

```c
#include <stdio.h>

int main(int argc, char *argv[]) {
    /* argc 含程序名，argv[argc] 是 NULL 哨兵 */
    for (int i = 0; i < argc; i++) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }
    return 0;
}
```

`argv` 的类型是 `char **`——指向「`char *` 数组」的指针，正是多级指针的标准范例。

## 动态内存：堆与所有权

栈上的空间编译器自动回收，堆上的要自己管：

| 对比 | 栈 | 堆 |
| --- | --- | --- |
| 分配 | 进入作用域自动，编译器移动栈指针 | `malloc` / `calloc` / `realloc` |
| 大小 | 有限，且多半编译期确定 | 由运行时决定，可到 GB 级 |
| 开销 | 几乎为零 | 系统调用或从空闲链表摘取 |
| 释放 | 作用域结束自动 | **必须显式 `free`** |
| 典型用途 | 局部变量、参数、小缓冲 | 变长数据、跨函数共享、超大对象 |

### 四个 API 的语义

```c
#include <stdlib.h>

void *malloc(size_t n);                 /* 分配 n 字节，内容未初始化 */
void *calloc(size_t n, size_t size);    /* 分配 n × size 字节，全部置 0 */
void *realloc(void *p, size_t n);       /* 调整大小，可能搬家 */
void  free(void *p);                    /* 释放，free(NULL) 安全 */
```

三条铁律：

```c
/* 1. 检查返回值 */
int *a = malloc(100 * sizeof *a);
if (a == NULL) return 1;

/* 2. 用 sizeof 表达式，避免类型写错 */
b = malloc(n * sizeof *b);       /* 而非 malloc(n * sizeof(int)) */

/* 3. realloc 必须用临时指针：失败时原块仍有效，直接赋值会泄漏 */
int *tmp = realloc(a, 200 * sizeof *a);
if (tmp == NULL) {
    /* a 仍可用，调用者决定放弃还是重试 */
} else {
    a = tmp;
}
```

`calloc` 相比 `malloc` 多一个价值：**它能防住乘法溢出**。`malloc(n * size)` 若 `n * size` 溢出成小值，会拿到一块小内存却按大值使用；`calloc(n, size)` 内部会检测溢出并返回 `NULL`。

### 动态数组的完整实现

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int   *data;
    size_t len;
    size_t cap;
} intvec;

int intvec_push(intvec *v, int value) {
    if (v->len == v->cap) {
        size_t new_cap = v->cap == 0 ? 4 : v->cap * 2;      /* 翻倍扩容 */
        int   *tmp = realloc(v->data, new_cap * sizeof *tmp);
        if (tmp == NULL) return -1;                          /* 保持原状不变 */
        v->data = tmp;
        v->cap  = new_cap;
    }
    v->data[v->len++] = value;
    return 0;
}

void intvec_free(intvec *v) {
    free(v->data);
    v->data = NULL;
    v->len = v->cap = 0;
}

int main(void) {
    intvec v = { NULL, 0, 0 };

    for (int i = 0; i < 10; i++) {
        if (intvec_push(&v, i * i) != 0) {
            perror("realloc");
            intvec_free(&v);
            return 1;
        }
    }
    for (size_t i = 0; i < v.len; i++) printf("%d ", v.data[i]);
    putchar('\n');                    /* 0 1 4 9 ... 81 */

    intvec_free(&v);
    return 0;
}
```

这是「**栈上放结构体，堆上放数据**」的标准做法：结构体（几十字节）按值传递，数组（可能很大）在堆上，两者解耦。

### `calloc` 初始化为什么重要

```c
/* malloc 后不初始化，数组里全是垃圾值 */
int *a = malloc(10 * sizeof *a);
printf("%d\n", a[5]);            /* 随机值 —— 未定义行为 */

int *b = calloc(10, sizeof *b);
printf("%d\n", b[5]);            /* 0，确定的值 */
```

### 四类堆错误

| 错误 | 现象 | 预防 |
| --- | --- | --- |
| 内存泄漏 | 长时间运行后占用持续上涨 | 每处分配配一处释放；工具检测 |
| 悬垂指针 | 读到的数据莫名其妙，或偶发段错误 | `free` 后立刻置 `NULL` |
| 重复释放 | `free(): double free detected`，堆元数据损坏 | 只在拥有所有权的一方释放 |
| 越界访问 | 相邻数据被静默改写 | 显式记录长度；用 ASan |

### 柔性数组：结构体尾巴上挂不定长数据

C99 起结构体最后一个成员可以是**柔性数组**，长度由 `malloc` 决定。这是 C 里表达「变长记录」的标准手法（文件格式、网络协议解析常用）：

```c
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

typedef struct {
    int  id;
    size_t name_len;       /* 必须显式记录长度：柔性数组自身不带长度 */
    char name[];           /* 柔性数组，长度为 0 字节的占位 */
} record;

record *record_new(int id, const char *name) {
    size_t n = strlen(name);
    if (n > SIZE_MAX - sizeof(record)) return NULL;   /* 溢出检查 */

    record *r = malloc(sizeof *r + n + 1);             /* 多分一个字节给 '\0' */
    if (r == NULL) return NULL;

    r->id = id;
    r->name_len = n;
    memcpy(r->name, name, n + 1);
    return r;
}

int main(void) {
    record *r = record_new(7, "alice");
    if (r == NULL) return 1;

    printf("id=%d name=%s len=%zu sizeof=%zu\n",
           r->id, r->name, r->name_len, sizeof(record));
    /* id=7 name=alice len=5 sizeof=16（只算固定部分，不含柔性数组）*/

    free(r);                 /* 一次 free 释放整个结构体和它的柔性数组 */
    return 0;
}
```

要点：`sizeof(record)` **不含**柔性数组，所以 `malloc` 必须显式加上数据长度；`free` 只需一次，因为两者是同一块内存。

## 指针与数据结构

### 单链表的完整实现

链表是理解指针的最佳载体：每个节点必须知道下一个节点在哪，而这只能靠指针表达。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct node {
    int                value;
    struct node       *next;      /* 指向同类型节点，可无限延伸 */
} node;

/* 在表头插入：O(1)，返回新表头 */
node *push_front(node *head, int value) {
    node *n = malloc(sizeof *n);
    if (n == NULL) return head;                 /* 分配失败时保持原表 */
    n->value = value;
    n->next  = head;
    return n;
}

/* 删除首个等于 value 的节点；head 是出参，返回值是新表头 */
node *remove_value(node *head, int value, int *removed) {
    node *cur  = head;
    node *prev = NULL;

    while (cur != NULL && cur->value != value) {
        prev = cur;
        cur  = cur->next;
    }
    if (cur == NULL) return head;               /* 没找到，原样返回 */

    if (prev == NULL) head = cur->next;         /* 删的是头节点 */
    else              prev->next = cur->next;  /* 前驱跨过它 */

    *removed = cur->value;
    free(cur);
    return head;
}

void destroy(node *head) {
    while (head != NULL) {
        node *next = head->next;   /* 先存后继，再释放当前节点 */
        free(head);
        head = next;
    }
}

int main(void) {
    node *list = NULL;
    int   removed = 0;

    for (int i = 1; i <= 4; i++) list = push_front(list, i);   /* 得到 4 3 2 1 */

    for (node *p = list; p != NULL; p = p->next) printf("%d ", p->value);
    putchar('\n');                                       /* 4 3 2 1 */

    list = remove_value(list, 3, &removed);
    printf("removed=%d 剩余:", removed);
    for (node *p = list; p != NULL; p = p->next) printf("%d ", p->value);
    putchar('\n');                                       /* removed=3 剩余:4 2 1 */

    destroy(list);
    return 0;
}
```

三个必须记住的细节：

| 细节 | 原因 |
| --- | --- |
| 头指针要**按值返回**或用 `node **` 出参 | 改变表头就是改变指针变量本身 |
| `free` 前**先取出 `next`** | 释放后就再也读不到它了 |
| 遍历时用 `for (node *p = list; p; p = p->next)` | 把 `p` 限定在循环内，不泄漏到外面 |

### 侵入式容器：`void *` + 偏移量

不同类型的链表结构都一样（一个值 + 一个后继），可以复用同一个遍历/插入逻辑，只要额外记录**节点相对结构体起点的偏移**：

```c
#include <stddef.h>

typedef struct {
    void  *head;
    size_t offset;      /* next 成员相对结构体首地址的字节偏移 */
} ilist;

#define ILIST_INIT(type) { NULL, offsetof(type, next) }

static void *ilist_node(const ilist *l, const void *item) {
    return (char *)item + l->offset;      /* char * 算术定位到 next 字段 */
}

static void ilist_push_front(ilist *l, void *item) {
    void **slot = ilist_node(l, item);    /* void ** 就是 next 字段的地址 */
    *slot = l->head;
    l->head = item;
}

/* 用法 */
typedef struct int_node { int value; struct int_node *next; } int_node;
typedef struct str_node { char name[16]; struct str_node *next; } str_node;

ilist list = ILIST_INIT(int_node);
ilist slist = ILIST_INIT(str_node);
```

这套模式在 Linux 内核里叫 `list_head` / `container_of`，在很多 C 库（GLib、BSD `sys/queue.h`）里都能见到。它用**牺牲一点类型安全**换来代码复用——了解即可，实际业务代码里请老老实实写两遍。

### 双向链表与循环链表

```c
typedef struct dnode {
    int             value;
    struct dnode   *prev, *next;
} dnode;

/* 循环单链表：尾节点的 next 指回头节点 */
typedef struct cnode {
    int            value;
    struct cnode  *next;
} cnode;

void push_back_circular(cnode **head, cnode **tail, int v) {
    cnode *n = malloc(sizeof *n);
    if (n == NULL) return;
    n->value = v;

    if (*head == NULL) {
        *head = *tail = n;
        n->next = n;                 /* 只有一个节点时指向自己 */
    } else {
        n->next = (*tail)->next;
        (*tail)->next = n;
        *tail = n;
    }
}
```

环形结构让「遍历时判断结束」的条件从 `p != NULL` 变成 `p != head`，省掉大量空判断。

## 函数指针

函数在 C 里是**对象**，有地址，因此可以存进变量、传参、放进数组。类型声明遵守「从右往左读」：

```c
int        (*fp)(int, int);       /* fp 是函数指针 */
int         *fn(int);              /* fn 是函数，返回 int 指针 */
```

`typedef` 能把可读性救回来，这也是 C 库的标准做法：

```c
typedef int (*binop)(int, int);    /* 二元运算函数类型 */

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

binop pick(char op) {
    return op == '+' ? add : sub;
}
```

### 用法一：排序回调

```c
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;        /* 数组元素类型由调用者告知，必须转换 */
    int y = *(const int *)b;
    return (x > y) - (x < y);       /* 只关心符号，不看具体值 */
}

static int cmp_int_desc(const void *a, const void *b) {
    return cmp_int(b, a);
}

int main(void) {
    int a[] = { 5, 3, 9, 1, 7 };

    qsort(a, sizeof a / sizeof a[0], sizeof a[0], cmp_int);
    for (size_t i = 0; i < sizeof a / sizeof a[0]; i++) printf("%d ", a[i]);
    putchar('\n');                   /* 1 3 5 7 9 */

    qsort(a, sizeof a / sizeof a[0], sizeof a[0], cmp_int_desc);
    for (size_t i = 0; i < sizeof a / sizeof a[0]; i++) printf("%d ", a[i]);
    putchar('\n');                   /* 9 7 5 3 1 */
    return 0;
}
```

`qsort` 原型：

```c
void qsort(void *base, size_t nmemb, size_t size,
           int (*compar)(const void *, const void *));
```

三个参数分别说明「从哪开始、几个、每个多大」——这正是 **`void *` + `size_t` 组合**表达通用算法的方式。

> 比较函数**只能返回负/零/正**，不要写 `return x - y`：两数接近时相减会溢出，返回值符号随即失真。用 `(x > y) - (x < y)` 永远安全。

### 用法二：命令表 / 状态机

把「名字 → 函数」放进表里，新增功能只需加一行：

```c
#include <stdio.h>
#include <string.h>
#include <ctype.h>

typedef int (*cmd_fn)(const char *);

static int cmd_len(const char *s)  { size_t n = 0; while (s[n]) n++; return (int)n; }
static int cmd_up(const char *s)  { return (int)strlen(s); }
static int cmd_head(const char *s) { return (int)(unsigned char)s[0]; }

static const struct {
    const char *name;
    cmd_fn      run;
} cmds[] = {
    { "len",  cmd_len  },
    { "up",   cmd_up   },
    { "head", cmd_head },
};

static int dispatch(const char *name, const char *arg) {
    for (size_t i = 0; i < sizeof cmds / sizeof cmds[0]; i++) {
        if (strcmp(cmds[i].name, name) == 0) return cmds[i].run(arg);
    }
    return -1;
}

int main(void) {
    printf("%d\n", dispatch("len", "hello"));    /* 5 */
    printf("%d\n", dispatch("head", "hello"));   /* 104 —— 'h' */
    printf("%d\n", dispatch("nope", "hello"));   /* -1 */
    return 0;
}
```

这张表就是**命令模式**的 C 版实现：解释器只认识表结构，不认识具体功能。新增一个命令不改动任何已有代码，这正是「开闭原则」在 C 里的落地方式。

### 用法三：生命周期回调

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct timer timer;

typedef void (*timer_cb)(timer *self, void *user);

struct timer {
    unsigned  ms;
    timer_cb  cb;
    void     *user;      /* 用户上下文，闭包的 C 版本 */
};

static void on_expire(timer *self, void *user) {
    (void)user;
    printf("计时 %u ms 到期\n", self->ms);
}

static void on_repeat(timer *self, void *user) {
    int *count = user;
    (*count)++;
    printf("第 %d 次触发\n", *count);
}

int main(void) {
    int    hits = 0;
    timer  repeat = { 100, on_repeat, &hits };

    for (int i = 0; i < 3; i++) repeat.cb(&repeat, repeat.user);
    printf("共 %d 次\n", hits);                 /* 共 3 次 */

    timer one = { 50, on_expire, NULL };
    one.cb(&one, one.user);
    return 0;
}
```

`cb + user` 两个成员合起来等价于其他语言里的**闭包**：函数指针指行为，`void *user` 指状态。这是在 C 里实现回调、事件循环、观察者模式的通用套路。

### 函数指针与信号的坑

`signal` 的处理函数原型必须是 `void (*)(int)`：

```c
void handler(int sig);        /* 正确签名 */
```

写成 `void handler(int sig, int info)` 在多数平台能编过，但行为未定义——`signal` 只会按 `(void (*)(int))` 调用它，多出来的参数来自未定义的栈内容。

## 进阶主题

### `restrict`：告诉编译器「这些不重叠」

C99 引入 `restrict`，是对**指针参数**的承诺：若对象通过 `p` 修改，不能同时通过其他指针访问。

```c
void copy(char *restrict dst, const char *restrict src, size_t n);
```

有了这个承诺，编译器可以放心做向量化拷贝。违反承诺是未定义行为——例如把同一个数组同时当 `src` 和 `dst` 传给 `memcpy` 风格的重叠拷贝。

`memcpy` 的原型本身就带 `restrict`，这就是为什么**重叠区域必须用 `memmove`**：

```c
#include <string.h>

char buf[16] = "abcdefgh";
memmove(buf + 1, buf, 5);   /* 合法：重叠 */
memcpy(buf + 1, buf, 5);    /* 未定义行为 */
```

### 严格别名与 `memcpy`

编译器默认开启 `-fstrict-aliasing`：若一段内存以一种类型写入、再以不兼容类型读取，是未定义行为，哪怕两个类型尺寸相同。

```c
float f = 1.0f;

uint32_t bits;
memcpy(&bits, &f, sizeof bits);          /* 正确：标准保证的位复制 */
uint32_t *p = (uint32_t *)&f;            /* 危险：违反严格别名 */
```

位运算/网络协议代码经常需要这种转换：**用 `memcpy`，或用联合体（类型双关），不要直接转型。**

### `volatile`：告诉编译器「别优化掉我的读写」

`volatile` 用于两种场景：硬件寄存器、中断与主程序共享的变量。

```c
#include <stdint.h>

/* 硬件寄存器：每次访问都可能影响硬件，绝不能缓存或合并 */
#define UART_DATA ((volatile uint32_t *)0x4000C000)   /* 真实项目里是芯片手册给的地址 */
#define UART_CTRL ((volatile uint32_t *)0x4000C004)

static void uart_send(char c) {
    while (!(*UART_CTRL & 1u)) { }      /* 忙等：每次都真的去读寄存器 */
    *UART_DATA = (uint32_t)(unsigned char)c;
}

/* 中断共享变量：主程序可能在任意时刻被 ISR 修改 */
static volatile int interrupt_pending = 0;

void isr_handler(void) { interrupt_pending = 1; }
```

> 这段是**片段而非可运行程序**：主循环要退出，靠的是 `isr_handler` 在真实硬件中断里把标志置 1；普通用户态程序没有中断源，`while (interrupt_pending == 0)` 会一直转。

`volatile` 与 `const` 可以组合，各管一层：

| 声明 | 含义 |
| --- | --- |
| `volatile int *p;` | 指向的值随时会变（硬件寄存器） |
| `int *volatile p;` | 指针本身不会被优化掉，但指向的普通内存 |

注意 `volatile` **不能**保证原子性，也不提供内存屏障；多线程同步要靠 `<stdatomic.h>`（C11）或平台锁。历史上还用 `sig_atomic_t` 限定信号共享变量。

### 用指针模拟面向对象

C 没有方法，但「数据 + 操作数据的函数」正是指针能表达的结构：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct vec vec;               /* 不完整类型：先只声明指针目标 */

typedef struct {                      /* 私有数据放在不透明结构体里 */
    int   *data;
    size_t len, cap;
} vec_impl;

struct vec {                          /* 公开的「对象」只有函数指针表 */
    vec_impl *impl;
    int  (*push)(vec *self, int value);
    size_t (*size)(const vec *self);
    int  (*at)(const vec *self, size_t i);
    void (*destroy)(vec *self);
};

static int  v_push(vec *self, int value) {
    vec_impl *im = self->impl;
    if (im->len == im->cap) {
        size_t cap = im->cap ? im->cap * 2 : 4;
        int *tmp = realloc(im->data, cap * sizeof *tmp);
        if (tmp == NULL) return -1;
        im->data = tmp;
        im->cap = cap;
    }
    im->data[im->len++] = value;
    return 0;
}

static size_t v_size(const vec *self) { return self->impl->len; }
static int    v_at(const vec *self, size_t i) {
    return i < self->impl->len ? self->impl->data[i] : 0;
}
static void   v_destroy(vec *self) {
    if (self == NULL) return;
    free(self->impl->data);
    free(self->impl);
    self->impl = NULL;
}

/* 方法表：字段类型必须与实现函数的签名逐一匹配 */
static const struct {
    int    (*push)(vec *self, int value);
    size_t (*size)(const vec *self);
    int    (*at)(const vec *self, size_t i);
    void   (*destroy)(vec *self);
} v_table = { v_push, v_size, v_at, v_destroy };

vec *vec_new(void) {
    vec *self = calloc(1, sizeof *self);
    if (self == NULL) return NULL;
    self->impl = calloc(1, sizeof *self->impl);
    if (self->impl == NULL) { free(self); return NULL; }
    self->push    = v_table.push;
    self->size    = v_table.size;
    self->at      = v_table.at;
    self->destroy = v_table.destroy;
    return self;
}

int main(void) {
    vec *v = vec_new();
    if (v == NULL) return 1;

    for (int i = 0; i < 6; i++) v->push(v, i * 10);
    for (size_t i = 0; i < v->size(v); i++) printf("%d ", v->at(v, i));
    putchar('\n');                       /* 0 10 20 30 40 50 */

    v->destroy(v);
    return 0;
}
```

调用语法值得留意：`v->push(v, ...)` 把 `v` 显式作为第一个参数传进去，这就是 C 里模拟的 `self`（其他语言中的 `this`）。

核心手法就一个：**把数据藏进不完整类型，只把行为暴露成函数指针表**。C 库里的 `FILE *`、`regex_t *`、`json_object *` 全是这个模式；Python 的 C 扩展、`sqlite3` 的句柄接口同理。

### 指针与不可变数据

一个只读结构体如果可能被多处以不同速度遍历，共享它的只读指针比反复传副本更划算：

```c
typedef struct config {
    const char *key;
    long        value;
} config;

/* 传 const config *：调用方约定不会修改，且拷贝开销为零 */
int config_apply(const config *cfg, size_t n);
```

注意 `const config *`（表不能改）不等于 `config const *` 之外的 `const config * const`（指针本身也不能换），需要表达「表内容与指针都不变」时用后者。

## 未定义行为清单

以下写法**都能编过**，但结果不可预测——编译器基于「它们不会发生」做优化，因此症状往往是「改了代码，别的 bug 消失了」这类诡异联动。

| 写法 | 为什么危险 |
| --- | --- |
| `int *p = malloc(...); free(p); *p;` | 读已释放内存（use-after-free） |
| `free(p); free(p);` | 双重释放，破坏堆元数据 |
| 返回局部变量的地址 | 栈帧已销毁，悬垂指针 |
| `p = NULL; *p;` | 空指针解引用 |
| `int *p; *p = 1;` | 未初始化指针，地址是垃圾值 |
| `a[n]` 其中 n 越界 | 读写越界，静默破坏相邻对象 |
| `char *s = "abc"; s[0] = 'x';` | 写只读数据段 |
| `p - q` 或 `p < q` 跨不同数组 | 标准未定义 |
| `arr1 = arr2` | 数组不可赋值，编译期会拦 |
| 通过错误类型访问内存 | 违反严格别名规则 |
| 有符号整数溢出 | 未定义，编译器据此假定不可能发生 |
| `memcpy(dst, src, n)` 区域重叠 | 应用 `memmove` |

排查手段（详见 [C 语言编译操作指南](C语言编译指南.md)）：

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic -g -fsanitize=address,undefined \
    -o prog main.c
./prog
```

ASan 会直接报出 `heap-use-after-free`、`heap-buffer-overflow`、`stack-use-after-return` 并打印出错行号与分配栈；`valgrind --leak-check=full` 则专查泄漏。

## 调试技巧

```bash
# 打印指针附近的内容
gdb ./prog
(gdb) p x            # 按十六进制打印变量
(gdb) p &variable    # 打印地址
(gdb) p *pointer@5   # 打印指针指向的 5 个元素
(gdb) set var ptr = 0   # 直接把指针置空，测试空指针分支
```

| 技巧 | 作用 |
| --- | --- |
| `-fsanitize=address` | 越界、UAF、泄漏当场报错并给行号 |
| `-fsanitize=undefined` | 有符号溢出、非法指针运算、类型错配 |
| `-Wpedantic` | 指出非标准扩展（GNU 语法等） |
| `-Wshadow` | 变量遮蔽，函数指针场景下常掩盖 bug |
| `printf("%p\n", (void *)p)` | 确认两个指针是否指向同一处 |
| 打印 `&a` 与 `a` | 区分数组与指向数组的指针 |

内存布局类问题，用地址输出比推理更快：

```c
int  a[3];
int *p = a;
printf("a=%p &a=%p &a[0]=%p p=%p\n", (void *)a, (void *)&a, (void *)&a[0], (void *)p);
/* 前三个相同，sizeof(&a) 是 sizeof(int[3]) */
```

## 最佳实践

### 签名怎么写

| 意图 | 推荐签名 |
| --- | --- |
| 只读数据 | `const T *p` |
| 可改数据 | `T *p` |
| 只改指针指向 | `T *const p` |
| 需要改指针本身 | `T **p` |
| 任意类型数据 | `void *p` + `size_t` 长度/步长 |
| 长度未知 | 返回值告诉调用者，或用出参 |

**默认从 `const T *` 起步**：需要修改时把 `const` 去掉，而不是从 `T *` 往下收窄。签名里的 `const` 是给调用者的承诺，成本为零。

### 所有权约定

C 没有 GC，「谁 `free`」必须写在文档和命名里。常见约定：

```c
/* 后缀 _new 表示调用者拥有；后缀 _borrow 表示借用，不许释放 */
buffer_t *buffer_new(size_t n);
void      buffer_free(buffer_t *b);      /* 释放后把 b 置 NULL */
int       buffer_send(buffer_t *b, ...); /* 借用 */
```

核心规则：**谁分配谁释放，释放后立刻置 `NULL`**，并且在跨越函数边界时说明指针是「拥有」还是「借用」。

### 一条稳妥的指针检查习惯

```c
void process(int *p, size_t n) {
    if (p == NULL || n == 0) return;      /* 入口统一校验 */
    if (n > MAX_N) return;                 /* 越界前置检查 */

    for (size_t i = 0; i < n; i++) {
        int v = p[i];
        if (v < 0) continue;
        /* ... */
    }
}
```

短-circuit 求值让 `p != NULL && *p > 0` 天然安全，但**不要依赖这一点代替入口检查**——一旦漏掉一个分支，后果是解引用空指针。

### 优先值传递，最后才上指针

不是所有东西都该用指针：

| 传法 | 建议 |
| --- | --- |
| 小标量（`int`、`double`） | 直接按值，清楚高效 |
| 只读结构体 | `const T *`，避免整块拷贝 |
| 大结构体且需修改 | `T *` |
| 返回值 | 优先用返回值；出参留给「多个结果」或「可能失败」 |
| 数组 | 一律 `const T *` + `size_t n` |

## 速查表

### 运算符与语义

| 表达式 | 结果 | 备注 |
| --- | --- | --- |
| `&x` | `T *` | 取地址 |
| `*p` | `T` | 解引用 |
| `p + n` | 指针 | 前进 n 个**元素** |
| `p - q` | `ptrdiff_t` | 同数组内才有效 |
| `p == NULL` | `int` | 空指针判断 |
| `sizeof p` | `size_t` | 指针大小，通常 8 |
| `sizeof *p` | `size_t` | 目标类型大小 |
| `(T *)addr` | `T *` | 指针转换，仅改解释方式 |

### 危险写法与替代

| 危险 | 安全 |
| --- | --- |
| `int *p;` | `int *p = NULL;` |
| `char *s = "abc";` | `const char *s = "abc";` 或 `char s[] = "abc";` |
| `strcpy(dst, src)` | `snprintf(dst, size, "%s", src)` |
| `p = realloc(p, n)` | `tmp = realloc(p, n); if (tmp) p = tmp;` |
| `void f(int a[])` 求长度 | `void f(int a[], size_t n)` |
| 返回局部变量地址 | 返回值 / `static` / 堆内存 |
| `(uint32_t *)&float_var` | `memcpy` |
| `qsort` 里 `return a - b;` | `return (a > b) - (a < b);` |

### 编译选项

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic -Wshadow -g \
    -fsanitize=address,undefined -o prog main.c
```

前四个选项在日常开发里常开，后两个（sanitizer）在测试与调试构建里开——它们会拖慢约 2 倍，别放进生产构建。

## 学习路径

| 阶段 | 练习 | 覆盖知识点 |
| --- | --- | --- |
| 入门 | 交换两个变量 | 取地址、解引用 |
| 入门 | 数组最大值 / 最小值索引 | 指针遍历、返回指针 |
| 入门 | 字符串反转、去除首尾空格 | 原地修改、`char *` |
| 进阶 | 单链表增删查（带 `main` 与释放） | `malloc`/`free`、悬垂指针 |
| 进阶 | 动态字符串 `strdup` / `strjoin` / `strsplit` | 长度处理、`realloc` |
| 进阶 | 用 `qsort` + 自定义比较函数排序结构体 | 函数指针、`void *` |
| 进阶 | 命令表驱动的迷你解释器 | 函数指针表、扩展性 |
| 进阶 | 通用动态数组（装 int / struct / 指针） | `stride` 设计、`const` |
| 深入 | 二叉搜索树（递归 + 迭代删除） | 多级指针、节点所有权 |
| 深入 | 对象式接口（不透明类型 + 方法表） | 模拟 OOP |
| 深入 | 读一个真实项目里的链表宏 | `container_of`、`list_head` |
| 深入 | 用 gdb 定位一段 use-after-free | ASan、栈回溯 |

### 参考资料

| 资源 | 说明 |
| --- | --- |
| [cppreference C](https://en.cppreference.com/w/c/language/pointer) | 指针语法的权威定义，逐条列未定义行为 |
| [Beej's Guide to C Programming](https://beej.us/guide/bgc/) | 第 8～11 章讲指针，风格轻松 |
| [Modern C](https://gustedt.gitlabpages.inria.fr/modern-c/) | 第 3、9 章讲指针与现代约束 |
| [C Traps and Pitfalls](https://doc.cs.yale.edu/hjl/c4.pdf) | 薄但极准，数组退化那章必读 |
| [Pointer Tutorials](https://www.learn-c.com/pointers/) | 可交互的逐步练习站点 |
| [Beej's Guide to Networking](https://beej.us/guide/bgnet/) | 需要大量 `struct` + 指针的实战例子 |
| man 手册 | `man 3 qsort`、`man 7 signal` 最权威 |
| Valgrind 手册 | `valgrind --tool=memcheck --leak-check=full` |

> **学习要点**：指针的规则其实很少——类型决定步长、地址标量、生命周期靠人守。把上面三句记住，再把「速查表」里的危险写法逐条避开，绝大多数指针 bug 都能在写出来之前拦下。写指针代码时**始终开着 `-Wall -Wextra`，测试时开 sanitizer**，比事后调试省十倍力气。

## 一页总结

```c
/* 声明：从右往左读；星号贴变量名 */
int  *p, **pp;                  /* 指针的指针 */
int (*fp)(int, int);            /* 函数指针 */
int (*rows)[4];                 /* 指向 4 列数组的指针 */
int *cells[4];                  /* 4 个 int 指针的数组 */

/* 默认只读，参数加 const */
void dump(const T *p, size_t n);

/* 动态内存：检查返回值，释放后置空 */
void *mem = malloc(n * size);
if (mem == NULL) return -1;
free(mem);
mem = NULL;

/* 遍历：从头到尾用指针或下标，别混用 */
for (T *it = base; it != base + n; ++it) { ... }

/* 危险：NULL 解引用、悬垂、越界、跨数组算术、字面量写入 */
```

三条铁律收尾：

1. **类型决定一切**：步长、转换、别名检查都由类型推导，写错类型比写错数值危险得多。
2. **生命周期靠自己守**：没有 GC，`malloc` 与 `free` 必须成对出现在代码里或在文档里。
3. **让编译器帮你拦**：`const`、`-Wall -Wextra`、ASan 的成本几乎为零，能挡掉绝大部分错误。