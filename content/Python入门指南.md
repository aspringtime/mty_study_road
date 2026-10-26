---
title: Python 入门指南
slug: python-guide
order: 4
---

# Python 入门指南

本文依据 [Python 官方教程](https://docs.python.org/3/tutorial/index.html) 整理，覆盖从环境准备到写出可运行程序所需的全部基础概念。当前文档对应 **Python 3.14.8**。

> 官方教程的定位是「给已经会编程的人」，因此本文在保留官方主线的同时补足了编程本身的直觉说明。

## Python 是什么

Python 是一门易学、功能强大的编程语言，具备以下特征：

| 特征 | 说明 |
| --- | --- |
| 易读语法 | 接近自然英语，去掉了分号、大括号等噪音符号 |
| 动态类型 | 无需声明变量类型，运行时决定 |
| 解释执行 | 边写边跑，无需编译，适合快速原型与脚本 |
| 面向对象 | 原生支持类与对象，同时允许多过程式写法 |
| 跨平台 | 解释器与标准库在所有主流平台均有提供 |
| 胶水语言 | 可调用 C/C++ 代码，也常用于自动化与数据处理 |

解释器与标准库可自由获取与分发，第三方模块集中在 [PyPI](https://pypi.org/)。

## 环境准备

### 安装与验证

从 [python.org/downloads](https://www.python.org/downloads/) 下载安装包。验证：

```bash
python3 --version
```

```text
Python 3.14.8
```

> Unix/macOS 上 Python 3 默认不以 `python` 为可执行名，以免与可能存在的 Python 2 冲突；请使用 `python3`。Windows 安装时勾选「Add Python to PATH」。

查看解释器运行细节：

```python
import sys
print(sys.version)
print(sys.executable)
```

### 三种运行方式

| 方式 | 命令 | 用途 |
| --- | --- | --- |
| 交互模式 | `python3` | 快速试算、验证语法 |
| 脚本模式 | `python3 hello.py` | 运行已保存的程序 |
| 模块模式 | `python3 -m http.server` | 以库方式运行模块 |

交互模式的主提示符是 `>>>`，续行提示符是 `...`：

```python
>>> the_world_is_flat = True
>>> if the_world_is_flat:
...     print("Be careful not to fall off!")
...
Be careful not to fall off!
```

`print` 的 `end` 关键字参数可控制结尾字符：

```python
>>> a, b = 0, 1
>>> while a < 1000:
...     print(a, end=',')
...     a, b = b, a+b
...
0,1,1,2,3,5,8,13,21,34,55,89,144,233,377,610,987,
```

### 源码编码

源文件默认按 **UTF-8** 解码，中文可直接写在字符串与注释里。要改用其他编码，需在文件**第一行**声明：

```python
# -*- coding: cp1252 -*-
```

若首行是 UNIX shebang，编码声明放第二行：

```python
#!/usr/bin/env python3
# -*- coding: cp1252 -*-
```

## 第一个程序

### 数字

解释器本身就是计算器。整数是 `int`，带小数的是 `float`：

```python
>>> 2 + 2
4
>>> 50 - 5*6
20
>>> (50 - 5*6) / 4
5.0
>>> 8 / 5   # 除法总是返回浮点数
1.6
```

常用运算符：

```python
>>> 17 / 3    # 真除法，返回 float
5.666666666666667
>>> 17 // 3   # 向下取整除法
5
>>> 17 % 3    # 取余
2
>>> 5 ** 2    # 幂
25
```

`=` 用于给变量赋值，之后交互提示符不再回显结果：

```python
>>> width = 20
>>> height = 5 * 9
>>> width * height
900
```

变量未定义就使用会报错：

```python
>>> n
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name 'n' is not defined
```

> 交互模式下最后一个表达式的结果会赋给 `_`，方便连续计算。该变量应视为只读。

除了 `int` 与 `float`，Python 还内置 `Decimal`、`Fraction` 与复数（虚部后缀 `j`，如 `3+5j`）。

### 字符串

`str` 是文本类型，单引号与双引号等价：

```python
>>> 'spam eggs'
'spam eggs'
>>> "Paris rabbit got your back :)! Yay!"
'Paris rabbit got your back :)! Yay!'
>>> '1975'      # 带引号的数字也是字符串
'1975'
```

引号本身需用 `\` 转义，或换用另一种引号：

```python
>>> 'doesn\'t'
"doesn't"
>>> "doesn't"
"doesn't"
```

`print()` 会解释转义字符并省略外层引号，直接回显则不会：

```python
>>> s = 'First line.\nSecond line.'
>>> s
'First line.\\nSecond line.'
>>> print(s)
First line.
Second line.
```

前缀 `r` 定义原始字符串，反斜杠按原样保留：

```python
>>> print('C:\this\name')     # \t 是制表符，\n 是换行
C:      his
ame
>>> print(r'C:\this\name')    # 前缀 r
C:\this\name
```

三引号可跨多行，行尾字符自动包含，加 `\` 可排除：

```python
print("""\
Usage: thingy [OPTIONS]
     -h                        Display this usage message
     -H hostname               Hostname to connect to
""")
```

字符串可用 `+` 拼接、`*` 重复，相邻字面量会自动连接：

```python
>>> 3 * 'un' + 'ium'
'unununium'
>>> 'Py' 'thon'
'Python'
```

> 自动连接只对**两个字面量**生效，变量和字面量混用仍需 `+`。

#### 索引与切片

字符索引从 0 开始，负数从右往左数：

```python
>>> word = 'Python'
>>> word[0], word[5], word[-1], word[-6]
('P', 'n', 'n', 'P')
```

切片 `word[i:j]` **含头不含尾**：

```python
>>> word[0:2], word[2:5], word[:2], word[4:]
('Py', 'tho', 'Py', 'on')
```

把索引想象成指向字符**之间**的间隙：

```text
 +---+---+---+---+---+---+
 | P | y | t | h | o | n |
 +---+---+---+---+---+---+
 0   1   2   3   4   5   6
-6  -5  -4  -3  -2  -1
```

因为含头不含尾，`s[:i] + s[i:]` 恒等于 `s`。索引越界会报错，切片越界则被优雅处理：

```python
>>> word[42]
IndexError: string index out of range
>>> word[4:42]
'on'
```

`len()` 返回长度：

```python
>>> len('supercalifragilisticexpialidocious')
34
```

> 字符串是**不可变**的，赋值会报 `TypeError`。需要新字符串就重新拼接。

### 列表

列表是最通用的容器，用方括号包裹，元素可混合类型：

```python
>>> squares = [1, 4, 9, 16, 25]
>>> squares[0], squares[-1], squares[-3:]
(1, 25, [9, 16, 25])
>>> squares + [36, 49, 64, 81, 100]
[1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
```

与字符串不同，列表**可变**，可修改、增删：

```python
>>> cubes = [1, 8, 27, 65, 125]   # 65 是笔误
>>> cubes[3] = 64                  # 修正
>>> cubes.append(216)              # 尾部追加
>>> cubes
[1, 8, 27, 64, 125, 216]
```

> 简单赋值**不复制**数据，变量只是引用同一个列表对象：
>
> ```python
> >>> rgb = ["Red", "Green", "Blue"]
> >>> rgba = rgb
> >>> rgba.append("Alph")
> >>> rgb
> ['Red', 'Green', 'Blue', 'Alph']
> ```
>
> 切片 `rgba[:]` 返回**浅拷贝**副本，修改副本不影响原列表。

切片赋值可改变列表长度，也能整体清空：

```python
>>> letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
>>> letters[2:5] = ['C', 'D', 'E']
>>> letters
['a', 'b', 'C', 'D', 'E', 'f', 'g']
>>> letters[2:5] = []
>>> letters
['a', 'b', 'f', 'g']
>>> letters[:] = []
>>> letters
[]
```

列表可嵌套：

```python
>>> x = [['a', 'b', 'c'], [1, 2, 3]]
>>> x[0][1]
'b'
```

## 控制流

### 缩进即代码块

Python 用**缩进**划分语句块，这是与 C/Java 最显著的差异。基本块内每行缩进量必须一致。

```python
if x < 0:
    x = 0
    print('Negative changed to zero')
elif x == 0:
    print('Zero')
else:
    print('More')
```

`elif` 是 `else if` 的缩写，整条 `if…elif…else` 链替代了其他语言的 `switch`。

### for 循环

Python 的 `for` 直接**遍历序列元素**，而非按下标递增：

```python
>>> words = ['cat', 'window', 'defenestrate']
>>> for w in words:
...     print(w, len(w))
...
cat 3
window 6
defenestrate 12
```

> 遍历时修改同一集合容易出错，通常改为遍历副本或构造新集合。

### range()

需要遍历数字序列时用 `range()`。**终点永远不包含在序列内**：

```python
>>> list(range(5))
[0, 1, 2, 3, 4]
>>> list(range(5, 10))
[5, 6, 7, 8, 9]
>>> list(range(0, 10, 3))
[0, 3, 6, 9]
>>> list(range(-10, -100, -30))
[-10, -40, -70]
```

`range()` 返回的对象**不是列表**，迭代时才逐个产出元素，因此省内存。

### break、continue 与 else

`break` 跳出最内层循环，`continue` 进入下一轮：

```python
for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            print(f"{n} equals {x} * {n//x}")
            break
    else:
        # 循环未被 break 打断，即没有找到因子
        print(n, 'is a prime number')
```

> 循环的 `else` 属于**循环**而非 `if`：只有循环正常走完（没有 `break`）才执行。它与 `try` 的 `else` 语义一致——都在「没有异常情况」时运行。

`pass` 什么都不做，常用于占位：

```python
while True:
    pass
```

### match 语句

`match` 类似 `switch`，但支持结构化匹配（3.10+）：

```python
def http_error(status):
    match status:
        case 400:
            return "Bad request"
        case 401 | 403 | 404:
            return "Not allowed"
        case _:
            return "Something's wrong with the internet"
```

对元组等序列还能解构绑定：

```python
match point:
    case (0, 0):
        print("Origin")
    case (x, 0):
        print(f"X={x}")
    case (x, y):
        print(f"X={x}, Y={y}")
    case _:
        raise ValueError("Not a point")
```

## 数据结构

### 列表常用方法

| 方法 | 作用 |
| --- | --- |
| `append(x)` | 尾部追加 |
| `extend(it)` | 追加可迭代对象的全部元素 |
| `insert(i, x)` | 在下标 `i` 的元素前插入 |
| `remove(x)` | 删除**第一个**值等于 `x` 的元素，无则 `ValueError` |
| `pop(i=-1)` | 删除并返回该位置元素，默认最后一个 |
| `clear()` | 清空列表 |
| `index(x)` | 返回首次出现的下标，无则 `ValueError` |
| `count(x)` | 统计出现次数 |
| `sort(*, key=None, reverse=False)` | **原地**排序 |
| `reverse()` | **原地**反转 |
| `copy()` | 返回浅拷贝 |

```python
>>> fruits = ['orange', 'apple', 'pear', 'banana', 'kiwi', 'apple', 'banana']
>>> fruits.count('apple')
2
>>> fruits.index('banana')
3
>>> fruits.index('banana', 4)   # 从下标 4 起继续找
6
>>> fruits.sort()
>>> fruits
['apple', 'apple', 'banana', 'banana', 'kiwi', 'orange', 'pear']
>>> fruits.pop()
'pear'
```

> `insert`、`remove`、`sort` 这类**只做修改**的方法返回 `None`，因此不要写 `x = lst.sort()`。需要排序结果又不动原列表时用 `sorted()`。

并非所有数据都能比较排序，例如 `[None, 'hello', 10]` 无法排序——`int` 与 `str` 不可比较。

### 列表推导式

用方括号内嵌表达式替代显式循环，无副作用地构造新列表：

```python
>>> vec = [-4, -2, 0, 2, 4]
>>> [x*2 for x in vec]          # 全部乘 2
[-8, -4, 0, 4, 8]
>>> [x for x in vec if x >= 0]  # 过滤
[0, 2, 4]
>>> [abs(x) for x in vec]        # 应用函数
[4, 2, 0, 2, 4]
>>> [(x, x**2) for x in range(6)]
[(0, 0), (1, 1), (2, 4), (3, 9), (4, 16), (5, 25)]
```

支持多个 `for` 与 `if`；若表达式是元组，必须加括号：

```python
>>> [(x, y) for x in [1,2,3] for y in [3,1,4] if x != y]
[(1, 3), (1, 4), (2, 3), (2, 1), (2, 4), (3, 1), (3, 4)]
```

展平嵌套列表时，两个 `for` 写在**同一对**方括号内：

```python
>>> vec = [[1,2,3], [4,5,6], [7,8,9]]
>>> [x for row in vec for x in row]
[1, 2, 3, 4, 5, 6, 7, 8, 9]
```

### 循环技巧

遍历字典时用 `.items()`：

```python
users = {'Hans': 'active', 'Éléonore': 'inactive', '景太郎': 'active'}
for user, status in users.copy().items():
    if status == 'inactive':
        del users[user]
```

| 惯用法 | 作用 |
| --- | --- |
| `enumerate(seq)` | 同时拿到下标与元素 |
| `zip(s1, s2)` | 并行遍历多个序列 |
| `reversed(seq)` | 逆序遍历 |
| `sorted(seq)` | 排序后返回新列表 |
| `set(seq)` | 去重并排序 |

```python
>>> for i, w in enumerate(['cat', 'window']):
...     print(i, w)
0 cat
1 window
```

### 元组、集合与字典

| 类型 | 写法 | 特性 |
| --- | --- | --- |
| 元组 `tuple` | `(1, 2)` | 不可变，可作字典键 |
| 集合 `set` | `{1, 2}` | 无序去重，成员查找快 |
| 字典 `dict` | `{'a': 1}` | 键值映射 |

```python
>>> t = (1, 2, 3)
>>> a, b, c = t            # 解包
>>> t[0] = 9
TypeError: 'tuple' object does not support item assignment

>>> s = {1, 2, 3, 2, 1}
>>> s
{1, 2, 3}
>>> 2 in s
True

>>> d = {'name': 'Alice', 'age': 30}
>>> d['name'], d.get('email', 'N/A')
('Alice', 'N/A')
```

集合的集合运算：

```python
a = {1, 2, 3}
b = {2, 3, 4}
a | b   # 并集 {1, 2, 3, 4}
a & b   # 交集 {2, 3}
a - b   # 差集 {1}
a ^ b   # 对称差集 {1, 4}
```

字典常用方法：

| 方法 | 作用 |
| --- | --- |
| `keys()` / `values()` / `items()` | 遍历键、值、键值对 |
| `get(k, default)` | 取值，缺失时返回默认值而非报错 |
| `pop(k)` | 弹出并删除键 |
| `update(other)` | 批量合并 |

## 函数

用 `def` 定义，参数与返回值都不需要类型标注：

```python
def fib(n):
    """返回斐波那契数列的前 n 项"""
    a, b = 0, 1
    result = []
    while len(result) < n:
        result.append(a)
        a, b = b, a + b
    return result
```

参数可以带默认值、`*args` 与 `**kwargs`：

```python
def greet(name, greeting='Hello', *args, **kwargs):
    print(f"{greeting}, {name}")
    if args:
        print('extra args:', args)
    if kwargs:
        print('extra kwargs:', kwargs)

greet('Alice')                       # Hello, Alice
greet('Bob', greeting='Hi')          # Hi, Bob
greet('Carl', 'Hey', 1, 2, lang='zh')  # 额外参数被收集
```

`return` 立即结束函数；无 `return` 时隐式返回 `None`。函数是**一等对象**，可赋值、可传参、可返回：

```python
double = lambda x: x * 2      # 简单场景用 lambda，复杂逻辑仍用 def
ops = {'add': lambda a, b: a + b, 'mul': lambda a, b: a * b}
```

### 作用域

名称查找遵循 **LEGB** 顺序：Local → Enclosing → Global → Built-in。函数内部赋值默认创建局部变量；修改全局变量用 `global` 声明：

```python
count = 0

def add():
    global count
    count += 1     # 不加 global 会报 UnboundLocalError
```

## 输入输出

`input()` 读入的一律是**字符串**，需自行转换：

```python
x = int(input("Please enter an integer: "))
print('You entered', x)
```

`print()` 可接受多个参数，自动以空格分隔，并在末尾换行：

```python
>>> i = 256*256
>>> print('The value of i is', i)
The value of i is 65536
```

### 格式化输出

推荐 **f-string**（格式化字符串字面量），在引号前加 `f`，用 `{}` 内嵌表达式：

```python
>>> year = 2016
>>> event = 'Referendum'
>>> f'Results of the {year} {event}'
'Results of the 2016 Referendum'
```

常用格式说明符：

```python
>>> pi = 3.14159265
>>> f'{pi:.2f}'          # 保留两位小数
'3.14'
>>> f'{42:>8}'            # 右对齐，宽度 8
'      42'
>>> f'{0.4967:.2%}'       # 百分比
'49.67%'
>>> f'{255:#x}'           # 十六进制带 0x 前缀
'0xff'
```

调试时 `str()` 与 `repr()` 能帮看清值——`repr()` 返回可被解释器读取的表示：

```python
>>> s = 'Hello, world.'
>>> str(s)
'Hello, world.'
>>> repr(s)
"'Hello, world.'"
```

## 模块与包

### import

```python
import math                 # 整包导入
print(math.sqrt(16))        # 4.0

from math import pi, sqrt   # 按名导入
print(pi)

import numpy as np          # 起别名
```

模块内的命令参数会进入 `sys.argv`：

```python
import sys
print(sys.argv)             # sys.argv[0] 是脚本名
```

### 主模块保护

只有直接运行脚本时 `__name__` 才等于 `"__main__"`。**导入时不应自动执行**，所以要加这层判断：

```python
def main():
    print("Hello, world!")

if __name__ == "__main__":
    main()
```

### 标准库

无需 `pip install` 即可使用，覆盖面极广：

| 模块 | 用途 |
| --- | --- |
| `os` / `sys` | 操作系统与解释器交互 |
| `pathlib` | 面向对象的路径处理 |
| `datetime` | 日期与时间 |
| `json` | JSON 解析与序列化 |
| `csv` | CSV 文件读写 |
| `collections.deque` | 高效双端队列 |
| `itertools` | 迭代器工具 |
| `re` | 正则表达式 |
| `argparse` | 命令行参数解析 |
| `logging` | 分级日志 |
| `unittest` | 单元测试框架 |

## 错误处理

异常在运行时抛出，用 `try` / `except` 捕获：

```python
try:
    x = int(input_value)
except ValueError:
    print(f"不是合法整数: {input_value!r}")
else:
    print("转换成功", x)      # 无异常时执行
finally:
    print("无论成败都会执行")
```

多个异常类型可合并捕获，或用 `as` 取异常对象：

```python
try:
    f = open('data.txt')
except (IOError, OSError) as e:
    print('无法打开文件:', e)
    raise
```

主动抛出异常用 `raise`：

```python
def divide(a, b):
    if b == 0:
        raise ValueError("除数不能为零")
    return a / b
```

常见内置异常：

| 异常 | 触发场景 |
| --- | --- |
| `SyntaxError` | 语法错误 |
| `IndentationError` | 缩进错误 |
| `NameError` | 名称未定义 |
| `TypeError` | 类型不匹配 |
| `ValueError` | 类型对但值非法 |
| `IndexError` | 序列下标越界 |
| `KeyError` | 字典键不存在 |
| `ZeroDivisionError` | 除零 |

## 类与对象

```python
class Animal:
    def __init__(self, name):
        self.name = name          # 实例属性

    def speak(self):              # 实例方法
        return f"{self.name} makes a sound"

    def describe(self):           # 另一个方法调用 self.speak()
        return f"<{self.speak()}>"

class Dog(Animal):                # 继承
    def speak(self):              # 覆写父类方法
        return f"{self.name} barks"
```

`__init__` 在实例创建时自动调用，`self` 指代当前实例。继承、覆写加上「方法可覆写」的设计，使基于Animal 的扩展无需改动原类。

其他常用内置类：`int`/`float`/`str`/`bool`、`list`/`tuple`/`dict`/`set`，以及 `enumerate()`、`zip()`、`range()` 这些内置类型。

## 虚拟环境

不同项目可能依赖同一个库的不同版本，冲突时需要隔离。用 `venv` 为每个项目建独立环境：

```bash
python3 -m venv tutorial-env
```

激活后 `pip` 与 `python` 都指向环境内版本：

```bash
source tutorial-env/bin/activate       # Unix / macOS
tutorial-env\Scripts\activate          # Windows
```

安装包与查看依赖：

```bash
pip install requests
pip list
pip freeze > requirements.txt
```

> `venv` 不自带包管理器，需配合 pip 使用。`python -m venv --help` 可查看全部选项。

## 常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `NameError` | 名称未定义或拼写错误 | 检查赋值是否执行 |
| `IndentationError` | 缩进不一致 | 统一用 4 空格，勿混用 Tab |
| `TypeError: 'str' object does not support item assignment` | 试图修改字符串 | 字符串不可变，重新拼接 |
| `input()` 拿到的是字符串 | 读入一律为 `str` | 显式 `int()` / `float()` |
| `IndexError` | 下标越界 | 切片越界是安全的，索引不是 |
| 修改列表后原列表也变了 | 赋值是引用而非复制 | 用 `lst[:]` 或 `list.copy()` |
| 循环里改列表导致漏元素 | 边遍历边修改 | 遍历副本或构造新列表 |
| `UnboundLocalError` | 函数内赋值默认是局部变量 | 需要改全局时加 `global` |
| `ModuleNotFoundError` | 包未安装 / 解释器不对 | 激活虚拟环境后 `pip install` |

## 学习路线

按官方教程顺序推进：

1. [An Informal Introduction to Python](https://docs.python.org/3/tutorial/introduction.html) — 数字、字符串、列表
2. [More Control Flow Tools](https://docs.python.org/3/tutorial/controlflow.html) — 条件、循环、函数
3. [Data Structures](https://docs.python.org/3/tutorial/datastructures.html) — 列表、字典、集合、推导式
4. [Input and Output](https://docs.python.org/3/tutorial/inputoutput.html) — 读写与格式化
5. [Errors and Exceptions](https://docs.python.org/3/tutorial/errors.html) — 异常处理
6. [Classes](https://docs.python.org/3/tutorial/classes.html) — 面向对象
7. [Modules](https://docs.python.org/3/tutorial/modules.html) — 导入与包
8. [Brief Tour of the Standard Library](https://docs.python.org/3/tutorial/stdlib.html) — 常用标准库

配套资料：

- [Python 官方教程](https://docs.python.org/3/tutorial/index.html) — 主线教材
- [标准库参考](https://docs.python.org/3/library/index.html) — 查 API
- [语言参考](https://docs.python.org/3/reference/index.html) — 精确语法定义
- [术语表](https://docs.python.org/3/glossary.html) — 查概念定义

## 官方参考

本文全部内容整理自 [Python 3.14.8 官方文档](https://docs.python.org/3/)，示例代码遵循 Zero Clause BSD 许可。
