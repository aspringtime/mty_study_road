---
title: C 语言 return 全面指南
slug: c-return-guide
order: 10
---

# C 语言 return 全面指南

`return` 是 C 里最短、也最容易被当成「写法细节」的语句。多数人只用它干一件事：把一个值交出去。但它同时是**控制流语句**、**类型转换点**、**接口契约**、**进程退出接口**，还是**最常见的内存泄漏源头**——多出口函数里每一条 `return` 都要重复清理，漏一条就漏一块堆内存。

本文把 `return` 的全部作用拆成八类，逐条给出可运行代码与编译器实测输出：

| 作用 | 一句话 | 章节 |
| --- | --- | --- |
| 传递结果 | 把表达式的值转成返回类型交给调用者 | [返回值语义](#返回值语义) |
| 终止函数 | 结束当前函数体并把控制权交还调用者 | [`return` 做了哪三件事](#return-做了哪三件事) |
| 提前退出 | 卫语句跳过后续逻辑，避免深层嵌套 | [控制流](#控制流) |
| 递归基例 | 递归必须有终止条件 | [控制流](#控制流) |
| 转换类型 | `return` 表达式按赋值规则转换，可能截断 | [类型转换](#类型转换) |
| 报告退出码 | 只有在 `main` 里，`return` 才影响操作系统 | [`main` 里的 `return`](#main-里的-return) |
| 触发清理 | 栈对象自动销毁、堆对象不会 | [资源清理](#资源清理) |
| 表达契约 | `_Noreturn`、`[[nodiscard]]`、`unreachable()` | [标注契约](#标注契约) |

前置知识见 [C 语言入门指南](c-guide.html)（控制流与函数）与 [C 语言指针入门到进阶指南](c-pointer-guide.html)（指针返回值与所有权）；编译选项与诊断工具见 [C 语言编译操作指南](c-build-guide.html)。文中代码在 **Debian / gcc 14.2.0 / `-std=c17`（C23 特性单独标注）** 下实测通过，报错信息为原文摘录。

## `return` 做了哪三件事

一条 `return 表达式;` 在抽象机里依次完成三件事，顺序不可交换：

```text
1. 求值 return 表达式          ← 副作用在这里发生，且只发生一次
2. 把结果转换成函数的返回类型   ← 赋值转换：截断、取模、提升
3. 结束函数体                  ← 自动存储期对象析构（仅栈）
   └─ 控制权交还调用者，由它来读取返回值
```

关键点：**第 3 步先于调用者使用返回值**。所以 `return` 表达式的副作用一定已经完成，你可以放心地把 `printf` 的返回值直接透传出去：

```c
#include <stdio.h>

int log_and_continue(const char *s) {
    return printf("LOG: %s\n", s);   /* 先打印，再把打印的字节数作为返回值 */
}

int main(void) {
    int n = log_and_continue("hello");
    printf("n=%d\n", n);
    return n > 0 ? 0 : 1;
}
```

实测输出：

```text
LOG: hello
n=11
```

`n = 11` 正是 `"LOG: hello\n"` 的字符数——`printf` 先执行完，`return` 才把它交出去。同理，`return (x > y) - (x < y);` 这种「只关心符号」的写法也依赖这个顺序。

> 副作用的**跨语句**顺序是确定的，但**同一语句内各子表达式的求值顺序是未指定的**。因此下面这行拿不到你想要的结果：

```c
int v = 0;
printf("%d %d\n", g(&v, 7), v);   /* 实测两次都输出 "0 0" —— v 在 g 之前被读取 */
```

需要「先改再读」就必须拆成两条语句。

## 两种形式与语法约束

| 形式 | 允许出现在 | 说明 |
| --- | --- | --- |
| `return 表达式;` | 非 `void` 函数 | 表达式的值经转换后成为返回值 |
| `return;` | `void` 函数 | 仅结束函数，不产生返回值 |

四种组合里，**两种合法、两种是约束违反**（编译期就会报错）：

```c
int  ok1(void) { return 1; }      /* 合法 */
void ok2(void) { return; }        /* 合法 */
int  bad1(void) { return; }       /* 错误：非 void 里不能裸 return */
void bad2(void) { return 1; }     /* 错误：void 里不能带表达式 */
```

实测报错：

```text
bad1.c:1:23: error: ‘return’ with no value, in function returning non-void [-Wreturn-mismatch]
bad2.c:1:5: error: ‘return’ with a value, in function returning void [-Wreturn-mismatch]
```

还有两条位置约束：

| 约束 | 反例报错 |
| --- | --- |
| `return` 只能出现在函数体内 | 文件作用域写 `return 0;` → `error: expected identifier or ‘(’ before ‘return’` |
| 非 `void` 函数不能「走到底」 | 缺 `return` → `warning: control reaches end of non-void function [-Wreturn-type]`，运行期是**未定义行为** |

第二个约束的严重性远超「一条警告」。下面这段实测返回一个和函数里任何变量都无关的垃圾值：

```c
#include <stdio.h>

static int poison(void) {
    int junk = 0xdeadbeef;
    switch (junk) { case 1: junk = 1; break; default: break; }
    /* 缺少 return */
}

int main(void) {
    printf("poison() = %d\n", poison());
    return 0;
}
```

实测输出：

```text
poison() = 241090903
```

它既不是 `0` 也不是 `0xdeadbeef`。编译器有权按「这条路径不存在」来做优化，**任何结果都不算 bug，包括某天开了 `-O2` 后值突然变了**。

> **唯一的例外是 `main`**：C99 起 `main` 走到函数末尾等价于 `return 0`，详见 [`main` 里的 `return`](#main-里的-return)。这个豁免**不适用于任何其他函数**。

一个灰色地带：

```c
void f(void) { return (void)0; }   /* gcc 接受，但 -Wpedantic 会警告 */
```

实测：

```text
warning: ISO C forbids ‘return’ with expression, in function returning void [-Wpedantic]
```

这是为兼容「`return` 后面统一带个值」的旧代码留下的口子。新代码里直接写 `return;`。

## 控制流

`return` 是跳转语句：它把程序计数器移到**调用点的下一条语句**。这让它天然适合做提前退出。

### 卫语句：把「不合法」挡在函数最前面

最常见的收益来自**消除嵌套**。下面是同一段逻辑的两种写法：

```c
/* 多层嵌套：读起来要一直往右缩进 */
static int process(Node *n) {
    if (n != NULL) {
        if (n->type == TYPE_FILE) {
            if (validate(n) == 0) {
                return handle(n);
            }
        }
    }
    return -1;
}

/* 卫语句：每种「不满足」立刻返回，剩下的代码不必缩进 */
static int process(Node *n) {
    if (n == NULL)            return -1;
    if (n->type != TYPE_FILE) return -2;
    if (validate(n) != 0)     return -3;
    return handle(n);
}
```

嵌套从三层降到零层，而且每个失败分支都有**独立的错误码**——第二版的三个 `-1/-2/-3` 是第一版根本无法区分的。经验规则：**函数超过三行就考虑先写卫语句**，代码的「主线」会自然浮到最左边。

### 递归基例

递归的 `return` 有两个角色：基例负责**终止**，递归步负责**汇总**。缺了基例就是无限递归，直到爆栈：

```c
#include <stdio.h>

static long fact(unsigned n) {
    if (n <= 1) return 1;          /* 基例：唯一的终止条件 */
    return n * fact(n - 1);         /* 递归步：顺便把结果乘起来 */
}

int main(void) {
    printf("%lu\n", fact(10));     /* 3628800 */
    return 0;
}
```

递归的 `return` 通常可以换成尾递归 + 循环（迭代器），栈从 O(n) 降到 O(1)。但**不要为了「消除尾递归」牺牲可读性**——只有当递归很深时才值得。

### 从循环与 `switch` 里跳出来

`return` 能跳出任意深度的循环，但**通常不该这么用**——它把「处理完这一项」和「函数结束」绑成了一件事，于是后面的元素被静默跳过：

```c
/* 不好：一旦找到问题就结束函数，后面还有几个问题就永远数不到 */
static int bad_count(const char *buf) {
    for (size_t i = 0; buf[i]; i++) {
        if (buf[i] == '!') return 1;          /* 只回答了「有没有」 */
    }
    return 0;
}

/* 好：遍历完整，返回值才承载完整信息 */
static int good_count(const char *buf) {
    int n = 0;
    for (size_t i = 0; buf[i]; i++) {
        if (buf[i] == '!') n++;               /* 继续数 */
    }
    return n;
}
```

实测 `bad_count("a!b!c!")` 得到 `1`，`good_count("a!b!c!")` 得到 `3`——真实问题是 3 个。

**只有当「找到即完成」成立时**（查找、匹配、命中判断），在循环里 `return` 才是对的：

```c
static int *find(const int *a, size_t n, int key) {
    for (size_t i = 0; i < n; i++) {
        if (a[i] == key) return &a[i];        /* 命中就是终点，合法 */
    }
    return NULL;                              /* 没命中，返回失败哨兵 */
}
```

判据一句话：**跳过后面的元素会不会丢掉调用者需要的信息**。会，就把结果累加到变量里、遍历完再 `return`。

在 `switch` 内部要特别小心：`return` **不是** `break`。函数体的 `switch` 里用 `return` 跳出 `switch` 是正确写法，因为这里的 `switch` 恰好是整个函数的 `switch`：

```c
static const char *name(enum color c) {
    switch (c) {
        case RED:   return "red";
        case GREEN: return "green";
        case BLUE:  return "blue";
    }
    return "unknown";   /* 兜底：让所有路径都有返回值 */
}
```

但如果 `switch` 只是函数里的一小段，`return` 会**连带跳出后面本该执行的代码**，这时应该配 `break`：

```c
static void log_event(enum kind k, int code) {
    switch (k) {
        case OPEN:
            track(code);
            return;            /* 正确：后面没有别的逻辑了 */
        case WRITE:
            track(code);
            break;             /* 正确：跳到函数末尾 */
    }
    flush();                    /* 只有 WRITE 会走到这里 */
}
```

判断标准很简单：**`return` 跳过的代码里，有没有本来就该执行的东西**。有就用 `break`，没有就用 `return`（后者能省掉一个多余的 `break`）。

### `return` 与 `goto` 的边界

`return` 可以粗略理解为「跳到调用点之后的 `goto` + 传值」，两者的关键差异在于**是否传值、是否走退出钩子**：

| 场景 | `return` | `goto` |
| --- | --- | --- |
| 传出数值 | 可以 | 不行（要自己用变量间接传） |
| 跳过清理代码 | 会跳过 | 同样会跳过 |
| 触发 `atexit` 处理器（仅 `main`） | 会 | 不会 |

`goto` 唯一的正当用途是**单出口清理**（下一节），因为它能跳到函数末尾的公共清理块，而 `return` 只能重复写清理。

## 类型转换

`return 表达式;` 的表达式会像**赋值给一个返回类型的左值**那样转换。绝大多数转换是「无声无息」的，这才是危险所在。

```c
char  c_ret(void)  { return 300; }        /* 转成 char：取模，44，编译期就会警告 */
int   i_ret(void)  { return 3.99; }       /* 转成 int：向零截断，3，无警告 */
float f_ret(void)  { return 1.0 / 3.0; }  /* double → float：精度损失，无警告 */
```

实测输出：

```text
c=44 i=3 f=0.3 n=-1
```

`return 300` 触发了一条警告：

```text
warning: overflow in conversion from ‘int’ to ‘char’ changes value from ‘300’ to ‘44’ [-Woverflow]
```

三种常见转换各自的规则：

| 转换方向 | 规则 | 危险度 |
| --- | --- | --- |
| 浮点 → 整数 | 向零截断 | 低，符合预期 |
| 浮点 → 整数 | **超出范围是未定义行为** | 高，`return 1e300;` 到 `int` 就是 UB |
| 无符号 → 有符号 | 超出范围是实现定义（gcc 上是取模） | 中，依赖平台 |
| 有符号溢出（如 `INT_MAX + 1`） | **未定义行为** | 高，编译器据此假定不可能发生 |

**范围检查必须在 `return` 之前做**，因为编译器不会替你补：

```c
static int narrow_to_byte(long v) {
    if (v < 0 || v > 255) {          /* 显式夹取，语义清晰 */
        return -1;
    }
    return (unsigned char)v;          /* 显式转型，把意图写进代码 */
}
```

`return (unsigned char)v;` 里的强制转型是**必要的文档**：它告诉读者「这个窄化是我有意为之」。

## 返回值语义

接口设计里，`return` 决定了调用者**怎么用你的函数**。这部分没有语法规则，全是约定，但约定的质量直接决定 API 的可用性。

### 成功与失败：为什么是 0 表示成功

POSIX、C 标准库、几乎所有 C 生态都遵循「**返回 0 表示成功，非 0 表示失败**」：

```c
if (divmod(17, 5, &q, &r) == 0) {
    /* 成功，q=3 r=2 */
}
```

这不是随意的。历史上 Unix 用 0 表示无错误并被固化成标准，新代码如果反着来，会让所有条件判断写反：

```c
if (func() != 0) { ... }   /* 与整个生态一致 */
```

错误码的**粒度**值得单独设计。用多个具名常量比裸数字可读得多：

```c
typedef enum {
    RET_OK        =  0,   /* 必须是 0 */
    RET_NOT_FOUND = -1,
    RET_BAD_INPUT = -2,
    RET_NO_MEM    = -3,
} ret_t;

static ret_t lookup(const char *key);
```

`-1`、`-2` 这些负值有个额外好处：**和「合法的非负结果」天然区分**。如果函数要返回「找到的个数」这种本身就可能为 0 的值，用 `-1` 当错误码就永远不会和真实结果混淆。

### 哨兵值

有些返回类型没有可用的错误空间（`char`、`bool`、小枚举），这时要挑一个**调用者一眼能认出、且业务上不可能出现**的值：

| 返回类型 | 成功 | 失败 |
| --- | --- | --- |
| `int`（索引） | `0..n-1` | `-1` |
| `char`（字符） | 任意字符 | `'\0'`（业务上不可能是空字符） |
| `enum` | 全部合法值 | 新增一个 `XXX_INVALID` 成员 |
| `bool` | `true` | `false` |

实测：

```c
static int find_index(const int *a, size_t n, int key) {
    for (size_t i = 0; i < n; i++) if (a[i] == key) return (int)i;
    return -1;
}

/* 输出：index(8)=1 index(9)=-1 */
```

**指针的「失败哨兵」就是 `NULL`**，这是 C 语库里最统一的一条约定：

```c
int    *find_elem(...);   /* 找不到返回 NULL */
char   *strchr(...);      /* 同上 */
void   *malloc(...);      /* 分配失败返回 NULL */
```

### 什么时候用出参

`return` 一次只能交一个值。出现下面三种需求时，出参比返回更合适：

| 需求 | 做法 |
| --- | --- |
| 需要返回多个值 | 结构体打包，或 1 个返回值 + N 个出参 |
| 「成功/失败」和「结果」是两件事 | 返回值报告成败，出参带回结果 |
| 结果可能很大，不想拷贝 | 出参（`T *out`） |

```c
/* 推荐：成败走返回值，数据走出参 */
static int divmod(int num, int den, int *quot, int *rem) {
    if (den == 0) return -1;       /* 用返回值报告错误 */
    *quot = num / den;
    *rem  = num % den;
    return 0;                       /* 成功 */
}
```

反例是把错误塞进出参：

```c
/* 不好：错误藏在 out 里，调用者极易漏检 */
static void divmod(int num, int den, int *quot, int *rem, int *err);
```

**铁律：返回值的位置永远留给「成功还是失败」，不要用来传数据。** 这条规则一旦破坏，调用者就会在几十个函数里写出几十种不一致的检查方式。

### 返回结构体：一次交多个值

C 里 `return` 一个结构体是完全合法的，而且常常比多个出参干净：

```c
typedef struct { double x, y; } point;
typedef struct { point  center;
                 double radius;     } circle;

static circle circle_make(double cx, double cy, double r) {
    return (circle){ {cx, cy}, r };  /* 一次返回整个结构体 */
}
```

代价取决于 ABI。在 x86-64 System V 上：

| 结构体大小 | 返回方式 | 开销 |
| --- | --- | --- |
| ≤ 16 字节 | 塞进寄存器（`RAX`、`RDX` / `XMM0-1`） | 几乎为零 |
| > 16 字节 | 编译器插入**隐藏指针**（sret），返回的是那个指针 | 一次间接写 |

实测 24 字节的结构体确实走隐藏指针：

```asm
f3:
	movq	%rdi, %rax
```

结论：**小结构体随便返回，大结构体（比如含 1 MB 缓冲区）用出参**。前者寄存器传递，后者每次调用都变成一次内存拷贝。

### `errno`：返回值的补充，不是替代

很多标准库函数采用**双通道**约定：`return` 说「成没成」，`errno` 说「为什么」。

```c
#include <stdlib.h>

int main(void) {
    void *p = malloc(1024);
    if (p == NULL) {
        fprintf(stderr, "分配失败: %s\n", strerror(errno));   /* errno 给出原因 */
        return 1;                                            /* 返回值只说「失败」 */
    }
    /* ... */
    return 0;
}
```

`errno` 本身是一个**整型左值**，可以直接 `return errno;` 把它交出去。要判断它，必须**先清零再调用**，否则读到的是上一次遗留的旧值：

```c
#include <errno.h>
#include <stdlib.h>

static int parse(const char *s, long *out) {
    char *end = NULL;

    errno = 0;                       /* 必须先清零 */
    long n = strtol(s, &end, 10);

    if (end == s)         return -1; /* 根本没转出数字 */
    if (errno == ERANGE)  return -2; /* 溢出 */
    *out = n;
    return 0;
}
```

实测 `parse("42", &v)` 返回 `0`，`parse("abc", &v)` 返回 `-1`，`parse("99999999999999999999", &v)` 返回 `-2`。

注意 **`atoi` 不设 `errno`**（标准只规定了转换失败时「返回某个值」），要区分「转换失败」和「结果就是 0」，只能用 `strtol` 的 `end` 参数。

| 通道 | 回答的问题 | 什么时候用 |
| --- | --- | --- |
| `return` 值 | 成没成？ | **总是**用 |
| `errno` | 为什么失败？ | 只在需要区分失败原因时 |

自己写函数时，**不要重新发明 `errno`**：一个返回值 + 文档里列出的错误码，足够了。

### 返回指针的所有权

返回指针时，「这块内存归谁」必须写进名字或文档，否则调用者无法决定要不要 `free`：

```c
buffer_t *buffer_new(size_t n);        /* 调用者拥有，必须 free */
const char *buffer_name(const buffer_t *b);  /* 借用，禁止 free */
void      buffer_free(buffer_t *b);     /* 释放并把 b 置 NULL */
```

**绝不能返回局部对象的地址**：

```c
static int *bad(void) {
    int x = 42;
    return &x;          /* 栈帧已销毁，返回的是悬垂指针 */
}
```

实测会触发警告：

```text
warning: function returns address of local variable [-Wreturn-local-addr]
```

但这段代码**照样能编过、照样能运行**，在 `-O0` 下甚至能读出正确的 `42`——因为栈内存还没被覆盖。这就是它危险的原因：**它是概率性崩溃，不是必现崩溃**。

三种安全写法：

```c
/* 1. 调用者提供缓冲区（最推荐，零分配） */
static void to_upper(char *out, size_t n, const char *in);

/* 2. 返回静态存储期对象（线程不安全，但无所有权问题） */
static const char *color_name(enum color c) {
    static const char *names[] = { "red", "green", "blue" };
    return names[c];                    /* 不归调用者所有，不要 free */
}

/* 3. 返回堆对象（配 _new 后缀） */
static char *str_dup(const char *s) {
    char *p = malloc(strlen(s) + 1);
    if (p != NULL) strcpy(p, s);
    return p;                           /* 调用者拥有 */
}
```

## `main` 里的 `return`

`return` 在 `main` 里多了一层含义：**它同时是进程退出码**。这也是 `main` 与其他函数最大的不同。

### 隐式 `return 0`

C99 起，`main` 走到函数末尾等价于 `return 0`：

```c
#include <stdio.h>
int main(void) { printf("no return\n"); }    /* 实测退出码 0 */
```

实测：

```text
no return
exit code = 0
```

但这条豁免**只对 `main` 生效**，而且 C89 里并不成立（那时得到的是未定义的垃圾退出码）。所以：

| 函数 | 末尾无 `return` |
| --- | --- |
| `main` | C99+ 等价 `return 0`，合法 |
| 其他函数 | **未定义行为** |

### `return` 从 `main` 等价于 `exit`

这是标准规定的行为链：

```text
main 里的 return expr;
   → 等价于 exit(expr)
   → 注销并逆序执行所有 atexit 处理器
   → 刷新所有打开的流
   → 交还控制权给操作系统，退出码为 expr 的低 8 位
```

实测验证——`return 0` 与 `exit(0)` 的可见行为完全一致：

```text
=== d4 (exit(0)) ===        === d5 (return 0) ===
[body]                     [body]
[atexit]                   [atexit]
```

而 `_Exit` **既不跑 `atexit`，也不刷新 stdout 缓冲**——下面这段里 `[body]` 被彻底吞掉了：

```c
#include <stdio.h>
#include <stdlib.h>
static void bye(void) { printf("[atexit]\n"); }
int main(void) {
    atexit(bye);
    printf("[body]\n");
    _Exit(0);      /* 实测：无任何输出 */
}
```

实测输出为空。因为 `[body]` 还躺在 stdout 的缓冲区里，`_Exit` 不给它刷盘的机会。

四种终止方式的完整对照：

| 方式 | 跑 `atexit` | 刷新缓冲 | 退出码 | 典型用途 |
| --- | --- | --- | --- | --- |
| `main` 里 `return n` | 是 | 是 | `n & 0xFF` | 正常退出 |
| `exit(n)` | 是 | 是 | `n & 0xFF` | 任意深度的正常退出 |
| `_Exit(n)` | **否** | **否** | `n & 0xFF` | 子进程里快速了结 |
| `abort()` | **否** | **否** | `134`（`128 + SIGABRT`） | 不可恢复的错误 |

注意 `abort()` 的 `134` 是**被信号杀死**的结果，而 `return 134` 是主动返回的值——两者在 shell 里数字相同，语义却不同。shell 通常用 `$? >= 128` 粗略判断「是否被信号终止」，这也是**不要用 `return` 返回 128 以上数值**的实际理由。

### 退出码怎么设计

退出码是**命令行接口的返回值**，shell 和 CI 都在读它。三段式是最通用的约定：

```c
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s <n>\n", argv[0]);
        return 2;                                   /* 用法错误 */
    }

    char *end = NULL;
    long n = strtol(argv[1], &end, 10);
    if (*end != '\0' || n < 0) {
        fprintf(stderr, "bad input: %s\n", argv[1]);
        return 1;                                   /* 输入错误 */
    }

    printf("ok %ld\n", n);
    return 0;                                       /* 成功 */
}
```

实测：

```text
./m2        → 无参数 -> 2
./m2 abc    → 非法输入 -> 1
./m2 42     → 正常 -> 0
```

shell 侧只区分「零」和「非零」，细分靠数值：

```bash
./prog abc || echo "失败，退出码 $?"     # 失败，退出码 1
```

三条实用约定：

| 约定 | 理由 |
| --- | --- |
| `0` = 成功，非 0 = 失败 | 与整个 Unix 生态一致 |
| 用 `0/1/2` 区分成功/运行失败/用法错误 | GNU 工具的通行做法，脚本好写分支 |
| 退出码取**低 8 位** | `return 300;` 实测退出码是 `44`（`300 & 0xFF`），别指望传大数 |

配套地，**错误信息要写 `stderr` 而不是 `stdout`**——`stdout` 会被管道消费，`stderr` 不会被：

```c
fprintf(stderr, "...");    /* 正确：错误信息 */
printf("...");             /* 错误：会混进管道的正常输出里 */
```

## 返回类型的边界

C 对「函数能返回什么」有一组明确的限制，违反的在编译期就被拦住：

| 想返回 | 合法写法 | 错误写法 |
| --- | --- | --- |
| 数组 | `int (*f(void))[3]` | `int f(void)[3]` |
| 函数 | `int (*f(void))(int)` | `int f(void)(int)` |
| 数组 typedef | `int (*f(void))[3]` | `typedef int v3[3]; v3 f(void);` |

实测报错：

```text
error: ‘bad’ declared as function returning an array
error: ‘f_fn’ declared as function returning a function
```

原因很简单：C 只有**按值传递**一种传参方式，而数组和函数在这种传法下都会退化（数组 → 指针，函数 → 函数指针），所以**没法按原样交出去**。要表达「返回一个数组」，返回的其实是**指向它的指针**，由调用者自己解引用：

```c
#include <stdio.h>
static int store[3] = {1, 2, 3};

int (*good(void))[3] { return &store; }     /* 返回指向 int[3] 的指针 */

int main(void) {
    printf("(*good())[2] = %d\n", (*good())[2]);   /* 3 */
    return 0;
}
```

返回函数指针则是合法的，常用于「按参数选行为」的注册表：

```c
static int  twice(int x)       { return x * 2; }
static int (*pick(void))(int)  { return twice; }   /* 返回函数指针 */

/* printf("%d\n", pick()(21)); → 42 */
```

唯一允许返回的「特殊」类型是 `void`——它表示「不返回任何值」，这是所有提前退出逻辑的基础。

## 资源清理

`return` 的第三步会**析构栈上所有自动存储期对象**（VLA 的存储也随之释放）。但对堆内存它**一无所知**。这个分工是 C 里绝大多数泄漏的根源：

| 资源 | 谁负责释放 | `return` 会自动做吗 |
| --- | --- | --- |
| 局部变量、`VLA` | 编译器 | **会** |
| `malloc` 的内存 | 你 | **不会** |
| `FILE *` | 你 | **不会**（`fclose`） |
| 锁（`pthread_mutex_lock`） | 你 | **不会**（`unlock`） |

### 多出口的漏清理

函数有 N 条 `return` 路径，就有 N 个地方需要写清理。漏掉一个，编译器**不会警告**：

```c
/* 正确但脆弱：每条 return 前都要释放 */
static int multi(char *dst, const char *a, const char *b) {
    size_t la = strlen(a), lb = strlen(b);
    char *tmp1 = malloc(la + 1);
    if (tmp1 == NULL) return -1;
    memcpy(tmp1, a, la + 1);

    char *tmp2 = malloc(lb + 1);
    if (tmp2 == NULL) { free(tmp1); return -1; }   /* 容易忘了 free(tmp1) */
    memcpy(tmp2, b, lb + 1);

    memcpy(dst, tmp1, la);
    memcpy(dst + la, tmp2, lb);
    dst[la + lb] = '\0';
    free(tmp1);
    free(tmp2);
    return 0;
}
```

这个版本的正确性**依赖人的记忆**。加一条错误分支，泄漏就来了：

```c
    if (lb > 1024) { free(tmp1); free(tmp2); return -2; }   /* 手写易错 */
```

### 单出口：`goto` 清理

把清理集中到函数末尾一处，`return` 只负责设置结果码：

```c
/* 单出口版本：清理只写一次 */
static int single(char *dst, const char *a, const char *b) {
    int   rc   = -1;               /* 默认失败 */
    char *tmp1 = malloc(strlen(a) + 1);
    char *tmp2 = NULL;             /* 关键：所有指针都在跳转前声明并初始化 */

    if (tmp1 == NULL) goto out;
    strcpy(tmp1, a);

    tmp2 = malloc(strlen(b) + 1);
    if (tmp2 == NULL) goto out;    /* 新增的错误分支，清理代码不用改 */
    strcpy(tmp2, b);

    strcat(dst, tmp1);
    strcat(dst, tmp2);
    rc = 0;

out:
    free(tmp1);        /* free(NULL) 安全，部分初始化也能直接 free */
    free(tmp2);
    return rc;         /* 唯一出口 */
}
```

实测两者输出一致：

```text
multi : hello, world
single: hello, world
```

#### 单出口的必备前提：所有资源在第一个 `goto` 之前声明并初始化

这是 `goto` 清理唯一会咬人的地方。跳转**会越过中间的所有语句**，包括初始化语句——所以清理块里用到的每个指针，都必须在第一个 `goto` 之前就已经有确定值：

```c
/* 错误：tmp2 的声明在 goto 之后 */
static int bad(char *dst, const char *a, const char *b) {
    int   rc = -1;
    char *tmp1 = malloc(strlen(a) + 1);
    if (tmp1 == NULL) goto out;     /* 走这条路径时 tmp2 还没被初始化 */

    char *tmp2 = malloc(strlen(b) + 1);   /* 初始化被跳过了 */
    if (tmp2 == NULL) goto out;
    /* ... */
out:
    free(tmp2);        /* free 一个栈上的垃圾指针 —— 随机崩溃 */
    return rc;
}
```

实测 `tmp2` 拿到的是栈残留值，GCC **一声不吭**：

```text
tmp1=0x5be788bf42a0 tmp2=0x5be788bf42c0  (tmp2 未初始化)
```

**规矩：函数开头把所有资源指针声明好并置 `NULL`，之后只做赋值，不做声明。** 有了这条，`goto` 清理才真正比多出口安全。

`goto out` 是本标准里**唯一被广泛推荐的 `goto` 用法**：目标是一个位置固定的标签，语义完全等价于「跳到最后几行」。Linux 内核的 `goto err;` / `goto out;` 清理模式就是它。

两种风格的取舍：

| 风格 | 适合 | 代价 |
| --- | --- | --- |
| 多出口 + 卫语句 | 资源少或无资源、读代码要一眼看清主线 | 清理代码重复，加分支时易漏 |
| 单出口 + `goto` | 资源 ≥ 2、清理步骤 ≥ 3 | 读代码要先看末尾的清理块 |

**经验规则：函数体里出现第二个 `malloc`/`fopen`/`lock`，就改用单出口。**

### `return` 与栈上的 VLA

变长数组（VLA）的存储随作用域结束自动回收，这是 `return` 唯一能「帮你省事」的资源：

```c
static size_t vla_sum(int n) {
    int arr[n];                   /* VLA：栈上，return 时自动回收 */
    for (int i = 0; i < n; i++) arr[i] = i;
    size_t s = 0;
    for (int i = 0; i < n; i++) s += (size_t)arr[i];
    return s;                     /* 无需任何 free */
}
```

实测 `vla_sum(10) = 45`。但这也意味着：**递归里的 VLA 会随递归深度线性吃掉栈**，深递归下 `return` 既不报错也不阻止爆栈。

### `return` 与 `longjmp`

`return` 只回到**直接调用者**。要跳过若干层调用栈，得用 `setjmp` / `longjmp`：

```c
#include <stdio.h>
#include <setjmp.h>
static jmp_buf env;
static int level2(int *c) { *c += 1; longjmp(env, 99); return 0; }
static int level1(int *c) { *c += 10; return level2(c); }   /* 这行 return 被 longjmp 跳过 */

int main(void) {
    int counter = 0;
    if (setjmp(env) == 0) { level1(&counter); printf("不会到这里\n"); }
    else printf("longjmp 回来 counter=%d\n", counter);
    return 0;
}
```

实测输出 `longjmp 回来 counter=11`。与 `return` 相比：

| | `return` | `longjmp` |
| --- | --- | --- |
| 跨越层数 | 1 | 任意 |
| 传值 | 传返回值 | 只传 `int`，且只能 `0/1/2` |
| 被跳过函数的栈帧 | 逐层正常销毁 | 被跳过，**资源不会自动释放** |
| 被 `setjmp` 与 `longjmp` 之间修改的局部变量 | 无此问题 | **值不确定**，须声明 `volatile` |

这就是 `longjmp` 危险的原因：它跳过的那些函数的 `return` 永远不会执行，它们的清理也就永远不会发生。**只在错误处理的最后兜底时用它，正常控制流一律用 `return`。**

## 标注契约

`return` 的语义可以被静态标注，让编译器替你检查两类错误：「这个函数不会返回」和「这个返回值不能丢」。

### `_Noreturn` / `[[noreturn]]`：不返回的函数

```c
#include <stdio.h>
#include <stdlib.h>

[[noreturn]] static void die(const char *msg) {
    fprintf(stderr, "fatal: %s\n", msg);
    exit(1);
}
```

`[[noreturn]]` 是 C23 写法，C11 用 `_Noreturn`，GNU 用 `__attribute__((noreturn))`。三者语义相同。

它对 `return` 的直接价值：**告诉编译器「调用 `die()` 之后的代码不可达」**。这样一来，紧跟其后的 `return` 不会被当成「漏写」，而基于「函数永不返回」的优化（如把后续分支全部消掉）才能正确进行：

```c
static int g(int x) {
    if (x < 0) die();      /* 编译器知道这里不返回 */
    return x;              /* 只有 x >= 0 能走到这里 */
}
```

反过来，如果一个函数被**误标**成 `[[noreturn]]` 但实际会返回，那是未定义行为——编译器有权生成任何代码。

```c
/* 错误示例：明明会返回，却标了 noreturn —— UB */
[[noreturn]] static int bad(int x) { return x; }
```

### `[[nodiscard]]`：返回值不能丢

```c
[[nodiscard]] static int compute(int x) { return x * 2; }

static void consume(void) {
    compute(5);        /* 警告：ignoring return value ... [-Wunused-result] */
}
```

实测：

```text
warning: ignoring return value of ‘compute’, declared with attribute ‘nodiscard’ [-Wunused-result]
```

C23 之前用 GNU 扩展：`__attribute__((warn_unused_result))`，glibc 的 `write`、`close` 就是这么标注的。

**该标注哪些函数**：返回值代表「是否成功」或「分配到的资源」时必须标——`malloc`、`fopen`、`write`、`system` 都属于这类。纯计算函数（如 `strlen`、`sin`）不用标。

### `unreachable()`：告诉编译器「这里到不了」

C23 在 `<stddef.h>` 里正式引入了 `unreachable()` 宏，用来收尾「已经穷举了所有枚举值」的函数：

```c
#include <stddef.h>
#include <stdio.h>
enum color { RED, GREEN, BLUE };

static const char *name(enum color c) {
    switch (c) {
        case RED:   return "red";
        case GREEN: return "green";
        case BLUE:  return "blue";     /* 三个值都处理了 */
    }
    unreachable();      /* 此刻逻辑上不可达；将来新增枚举值时 -Wswitch 会报警 */
}
```

实测 `name(RED)/name(GREEN)/name(BLUE)` 依次输出 `red green blue`；一旦把枚举改成 `RED, GREEN, BLUE, CYAN`，GCC 立刻报出来：

```text
warning: enumeration value ‘CYAN’ not handled in switch [-Wswitch]
```

于是「枚举加了一个值」这件事，不可能再被悄悄漏掉。

它的第二个直接价值是**消除假警告**。同一份逻辑，`-O2` 下的对比：

```c
/* 不用 unreachable() */
int f(int x) { if (x > 0) return 1; }
/* warning: control reaches end of non-void function [-Wreturn-type] */

/* 用了 unreachable()：无任何警告 */
#include <stddef.h>
int f(int x) { if (x > 0) return 1; unreachable(); }
```

C23 之前的等价写法是 `__builtin_unreachable()`（GCC/Clang）或直接写 `abort()`——后者保留了运行时兜底，更安全。

## 危险写法清单

以下写法**都能编过**，但结果不可预测或与意图不符。

| 写法 | 后果 |
| --- | --- |
| 非 `void` 函数末尾缺 `return` | **未定义行为**，返回值是垃圾 |
| `int f(void) { return; }` | 编译错误（约束违反），别指望运行期 |
| `void f(void) { return 1; }` | 编译错误（约束违反） |
| 返回局部变量地址 | 悬垂指针，`-Wreturn-local-addr` 会警告但**不阻止编译** |
| 返回 `static` 局部变量的**指针** | 合法但线程不安全，且多次调用会覆盖 |
| `return` 后的代码 | 不可达；`-O2` 下会被删除 |
| 宏里写裸 `return` | 展开后破坏 `if/else` 结构，见下 |
| `return` 依赖「值一定在范围内」 | 浮点转整数越界是 UB |
| 忽略 `malloc` 返回值就继续用 | 直接用野指针 |
| 多出口函数里漏了 `free` | 内存泄漏，工具能查但工具不是答案 |
| `return` 从 `main` 返回大值 | 超出 `0..255` 会被截断（`300 → 44`） |

### 宏里藏 `return`：一个真实的 bug

宏里的 `return` 看起来无害，实际会破坏调用点的语法结构：

```c
#define CHECK(p) if (!(p)) return -1;      /* 危险：展开后只有一个裸 if */

int f(int a, int b) {
    if (a)
        CHECK(b)
    else
        printf("  -> a == 0 分支本该打印这行\n");
    return 0;
}
```

实测输出：

```text
f(0, 1):
f(0, 0):
f(1, 1):
  -> a == 0 分支本该打印这行
```

**打印语句跑在了 `f(1, 1)` 下**——`else` 被内层的 `if` 抢走了。GCC 一直在警告：

```text
warning: suggest explicit braces to avoid ambiguous ‘else’ [-Wdangling-else]
```

修法是 `do { ... } while (0)`，把整个语句包成一个语法单元。注意**调用处必须补分号**，否则 `do-while` 缺终止符会直接语法错误：

```c
#define CHECK(p) do { if (!(p)) return -1; } while (0)

int f(int a, int b) {
    if (a) CHECK(b);              /* 分号不能省 */
    else printf("  -> a == 0 分支本该打印这行\n");
    return 0;
}
```

实测输出正确了：

```text
f(0, 1):
  -> a == 0 分支本该打印这行
f(0, 0):
  -> a == 0 分支本该打印这行
f(1, 0):
```

更彻底的方案是**让宏不带 `return`**，把退出权交还调用者：

```c
#define IS_VALID(p)  ((p) != NULL)     /* 只做判断，不控制流 */
```

> **规则：任何含 `return`/`break`/`continue` 的宏必须用 `do { ... } while (0)` 包裹，并且调用处必须带分号。**

## 编译器诊断与静态检查

几乎每条 `return` 相关的错误都有对应警告。**这些警告全在 `-Wall -Wextra` 里**，所以：

```bash
gcc -std=c17 -Wall -Wextra -Wpedantic -Wconversion -o prog main.c
```

| 选项 | 抓什么 |
| --- | --- |
| `-Wall` | `control reaches end of non-void function`（缺 `return`） |
| `-Wextra` | `function returns address of local variable`（返回局部地址） |
| `-Wpedantic` | `return (void)0;` 这类非标准写法 |
| `-Wconversion` | `return 300;` 到 `char` 的隐式窄化 |
| `-Werror` | 把上述警告变成错误，CI 里必开 |

实测一段典型的「返回值写错」会被这样报出来：

```text
warning: ‘return’ with a value, in function returning void [-Wreturn-mismatch]
warning: function returns address of local variable [-Wreturn-local-addr]
warning: no return statement in function returning non-void [-Wreturn-type]
```

静态分析工具能查出手工查不出的那部分：

| 工具 | 检查项 |
| --- | --- |
| `cppcheck` | `missingReturn`（缺 `return`）、`memleak`（路径上的泄漏） |
| `clang-tidy` | `bugprone-*`、`modernize-use-nodiscard` |
| `gcc -fanalyzer` | 沿控制流做路径分析，能报出「某条路径上没释放 `tmp1`」 |
| ASan / LeakSanitizer | 运行时报告泄漏栈 |
| `valgrind --leak-check=full` | 报告泄漏与无效访问 |

`gcc -fanalyzer` 正是为「多出口函数漏清理」这种问题设计的，它会在编译期沿每条路径检查资源生命周期。

## 风格约定

| 场景 | 约定 |
| --- | --- |
| 错误返回 | 返回 `0` 表示成功，负数表示失败 |
| 多个错误原因 | 用 `enum` 命名，不用裸数字 |
| 无返回值的函数 | `void` + `return;` |
| 有返回值的函数 | 每条路径都写 `return 值`，绝不混用裸 `return;` |
| 出参 | 返回值留给成败，数据用出参 |
| 空指针检查 | 写成 `if (p == NULL) return -1;`，不要 `if (!p) return;` |
| 裸 `return` 的括号 | 单行不写括号：`if (!p) return;`；多行必须写 `{ }` |
| 宏里的 `return` | `do { ... } while (0)` + 调用处带分号 |
| 清理逻辑多 | 单出口 + `goto out;`，且所有指针在跳转前先置 `NULL` |

关于「单行 `return` 写不写括号」，两派都有支持者：

```c
if (p == NULL) return -1;      /* 简洁，Linux 内核风格 */
if (p == NULL) { return -1; }  /* 统一，便于日后扩展 */
```

选一种并**在整个项目里保持一致**。要注意单行不写括号的代价：这个 `if` 的 body 是一条裸 `if`，一旦将来在它后面加上 `else`，`else` 就会绑定到内层那个 `if` 上——正是前面宏展开那个坑的翻版。括号不占多少篇幅，却能彻底断掉这类歧义。

## 一页速查

```c
/* 两种合法形态 */
int  f(void) { return 1; }        /* 合法：返回值 */
void g(void) { return; }          /* 合法：仅终止 */
int  bad1(void) { return; }       /* 错误：非 void 不能裸 return */
void bad2(void) { return 1; }     /* 错误：void 不能带表达式 */

/* main 特有：隐式 return 0，且 return 等价 exit */
int main(void) { }                /* C99+ 合法：走到末尾即退出码 0 */

/* 卫语句：每种失败一个独立错误码 */
static int checked(const void *p, int n) {
    if (p == NULL)     return -1;
    if (n <= 0)        return -2;
    return 0;
}

/* 单出口清理：新增分支不改清理代码 */
static int g(char **out) {
    int   rc = -1;
    char *tmp = malloc(64);
    if (tmp == NULL) goto done;
    strcpy(tmp, "ok");
    *out = tmp; rc = 0; tmp = NULL;      /* 转移所有权 */
done:
    free(tmp);                    /* free(NULL) 安全 */
    return rc;
}

/* 契约标注（C23 写法；C11 用 _Noreturn，C17 用 __attribute__） */
[[noreturn]] static void die(const char *m);   /* 不返回 */
[[nodiscard]] static int  try_alloc(void);     /* 返回值不能丢 */

/* C23 穷举后收尾，需要 #include <stddef.h> */
unreachable();

/* 绝不能做 */
static int *oops(void) { int x = 1; return &x; }   /* 悬垂指针 */
#define BAD(p) if (!(p)) return -1;                /* 破坏 if/else */
```

## 学习路径

| 阶段 | 练习 | 覆盖知识点 |
| --- | --- | --- |
| 入门 | 一个函数写三个 `return`，观察调用点收到什么 | 基本形态、类型转换 |
| 入门 | 写一个返回 `-1` 表示「未找到」的查找函数 | 哨兵值 |
| 入门 | 用 `argv[1]` 决定退出码，在 shell 里用 `$?` 验证 | `main` 的退出码 |
| 进阶 | 把多出口函数改写成单出口 + `goto`，用 ASan 对比 | 资源清理 |
| 进阶 | 实现 `strdup`，故意漏一条 `free` 让 LeakSanitizer 报出来 | 所有权 |
| 进阶 | 写一个带 `[[nodiscard]]` 的分配函数，并修掉自己的警告 | 契约标注 |
| 深入 | 用 `setjmp`/`longjmp` 实现错误跳回，对比 `return` 的栈行为 | 控制流 |
| 深入 | 用 `gcc -fanalyzer` 找一条自己写的资源泄漏路径 | 静态分析 |
| 深入 | 反汇编一个返回大结构体的函数，找到 sret 隐藏指针 | ABI 与返回值成本 |

### 参考资料

| 资源 | 说明 |
| --- | --- |
| [cppreference C](https://en.cppreference.com/w/c/language/return) | `return` 语句的权威定义，逐条列约束 |
| [C 标准草案 N3096](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf) | §6.8.6.4 是 `return` 的规范原文 |
| [GNU C 手册](https://gcc.gnu.org/onlinedocs/gcc/Function-Attributes.html) | `noreturn`、`warn_unused_result` 等属性 |
| man 手册 | `man 3 malloc`、`man 3 atexit`、`man 7 exit` 最权威 |
| [Beej's Guide to C Programming](https://beej.us/guide/bgc/) | 第 5 章讲函数与返回值，风格轻松 |
| [Modern C](https://gustedt.gitlabpages.inria.fr/modern-c/) | 第 6、9 章讲接口设计与约束 |

> **学习要点**：`return` 只有一句话的篇幅，却横跨四种角色——**终止函数**、**传递结果**、**转换类型**、**报告退出码**。把它们分开看，就不会再问「这个 `return` 到底做了什么」。三条收尾建议：返回值的位置只放「成功还是失败」，所有 `return` 之前先问一句「我该清理的东西清理了吗」，以及**永远让编译器开着 `-Wall -Wextra`**——本文「危险写法清单」里的 11 条，`-Wall -Wextra` 能当场抓住其中 4 条（形态写反、缺 `return`、返回局部地址、隐式窄化），剩下的得靠 `-Wconversion`、`gcc -fanalyzer` 和 ASan 才看得见。

## 一页总结

```c
/* 合法形态 */
T   f(void) { return expr; }    /* 表达式按赋值规则转成 T */
void g(void) { return; }        /* 仅终止 */

/* 控制流 */
if (!p) return -1;              /* 卫语句：把失败挡在前面 */
if (n <= 1) return 1;           /* 递归基例 */

/* 语义 */
return 0;                       /* 成功 */
return -1;                      /* 失败，配 enum 命名更清楚 */
return NULL;                    /* 指针找不到 */
return E_OK;                    /* 需要多个原因时用枚举 */

/* 契约 */
[[noreturn]] void die(void);           /* 不会返回 */
[[nodiscard]] int try_alloc(void);     /* 返回值不能丢 */
unreachable();                          /* C23：穷举后收尾 */

/* 危险 */
int *oops(void) { int x = 1; return &x; }    /* 悬垂指针 */
int h(void) { }                                /* 缺 return，UB */
#define BAD(p) if (!(p)) return -1;             /* 破坏 if/else */
return 300;                                    /* 窄化成 44 */
```

四个判断，涵盖绝大多数场景：

1. **返回值放什么？** 放「成功还是失败」，数据走出参或结构体。
2. **`return` 之前清干净了吗？** 栈上的会自动清，堆上的必须手动。
3. **编译器有警告吗？** `-Wall -Wextra -Wconversion` 全开，一条都不放过。
4. **这个函数会返回吗？** 不会就标 `[[noreturn]]`；返回值不能丢就标 `[[nodiscard]]`。