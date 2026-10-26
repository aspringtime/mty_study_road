---
title: Linux 入门指南
slug: linux-guide
order: 7
---

# Linux 入门指南

本文面向没有 Linux 使用经验的同学，目标是读完后能独立完成**日常命令行操作**：浏览文件、编辑文本、装软件、看进程、查磁盘与网络，并写出简单脚本。

内容依据 [Linux 官方文档](https://docs.kernel.org/)、[Ubuntu 文档](https://documentation.ubuntu.com/)与 GNU Coreutils 手册整理，命令行为以 Debian/Ubuntu 系为主，Fedora/RHEL 系会另外标注。

## Linux 是什么

严格说，**Linux 只是内核**（kernel）：负责进程调度、内存管理、文件系统和设备驱动。用户实际拿到的系统是**发行版**（distribution），即内核 + 工具集 + 软件仓库 + 默认配置。

```text
┌─────────────────────────────────────────┐
│ 发行版：Ubuntu / Debian / Fedora / ...   │  ← 你安装的东西
├─────────────────────────────────────────┤
│ 工具：bash、coreutils、GNU Make、开源软件 │
├─────────────────────────────────────────┤
│ Linux 内核：进程 / 内存 / 文件 / 设备    │  ← 只有这一层是「Linux」
└─────────────────────────────────────────┘
```

### 常见发行版

| 发行版 | 包管理器 | 特点 | 适合场景 |
| --- | --- | --- | --- |
| Ubuntu LTS | `apt` | 社区大、文档多、每两年一个 LTS | 入门首选、服务器 |
| Debian | `apt` | 稳定保守、软件版本偏旧 | 生产服务器、追求稳定 |
| Fedora | `dnf` | 新版本跟进快 | 开发、需要新特性 |
| RHEL / Rocky | `dnf` | 企业认证、订阅制 | 企业内网环境 |
| Arch | `pacman` | 滚动更新、装完自己配 | 想深入折腾的玩家 |

> 发行版分支很多，但**命令本身是通用的**。`ls`、`cd`、`grep` 这些来自 GNU Coreutils，各分支行为一致；差异主要在包管理器、服务管理和默认配置上。

### Windows / macOS 用户先知道这几件事

| 差异 | 说明 |
| --- | --- |
| 一切皆文件 | 没有回收站概念，`rm` 删除即消失 |
| 配置用文本 | 改 `/etc/xxx.conf` 是常规操作，不是危险行为 |
| 大小写敏感 | `README` 与 `readme` 是两个文件 |
| 分隔符是 `/` | 不是 Windows 的 `\` |
| 不用重装解决 | 多数问题重启服务或改配置即可 |

macOS 自带的是 BSD 风格的命令行，`sed`、`grep`、`find` 的选项略有差异，本文以 GNU 版本为准。

## 环境准备

最省事的办法是 **WSL2**（Windows 用户）：在 Microsoft Store 搜 "Ubuntu" 安装，装完打开应用即得一个完整 Linux 环境。

原生 Linux（物理机或虚拟机）直接装发行版镜像即可，装完用发行版自带的用户名登录。

验证环境：

```bash
uname -srm          # 内核名 + 硬件平台 + 内核版本
cat /etc/os-release # 发行版名称与版本
whoami              # 当前用户名
pwd                 # 当前所在目录
```

典型输出：

```text
$ uname -srm
Linux 6.8.0 x86_64
$ . /etc/os-release && echo "$PRETTY_NAME"
Ubuntu 24.04.1 LTS
```

> 想在不改本机的前提下练手，可用 [Docker](https://docs.docker.com/get-started/get-docker/) 或在线的 [Killercoda](https://killercoda.com/)、[Google Cloud Shell](https://shell.cloud.google.com/)。

## 目录结构

Linux 用一棵从 `/` 开始倒挂的树组织所有文件，没有盘符（C:\D:\）。

```text
/                       # 根目录，一切的起点
├── bin                 # 基本命令（现代系统多为 /usr/bin 的软链接）
├── boot                # 启动引导、内核镜像
├── dev                 # 设备文件，sda 是磁盘，null 是黑洞
├── etc                 # 系统级配置（编辑最频繁的目录）
│   ├── passwd          # 用户账号信息
│   ├── hosts           # 主机名到 IP 的静态映射
│   └── ssh/            # SSH 服务配置
├── home                # 普通用户的家目录（可写）
│   └── alice/
├── root                # root 用户的家目录
├── tmp                 # 临时文件，重启清空，不要放重要东西
├── usr                 # 大部分程序与库（二级分区会挂到这里）
├── var                 # 会变化的数据：日志、缓存、数据库
│   ├── log/            # 系统日志
│   └── lib/            # 软件包数据库
└── etc/fstab           # 开机自动挂载各磁盘的配置文件
```

必须记住的四条：

| 规则 | 含义 |
| --- | --- |
| `/` 是根 | 所有绝对路径都从 `/` 开始 |
| `/home/<用户名>` | 个人文件放这，写系统文件会被拦 |
| `/etc` 管配置 | 改行为优先找这里的文本文件 |
| `/var/log` 看日志 | 出问题先来这里翻 |

### 路径写法

| 写法 | 含义 |
| --- | --- |
| `/etc/hosts` | 绝对路径，从根出发 |
| `docs/readme.md` | 相对路径，相对**当前目录** |
| `~/notes.txt` | 家目录，等价 `/home/<用户名>/notes.txt` |
| `.` | 当前目录 |
| `..` | 上一级目录 |
| `-` | 上一次所在目录（`cd -` 来回切换） |

> 绝对路径不依赖当前位置，脚本里应优先使用。

## 终端与 Shell

「终端」是输入输出的窗口，「Shell」是解读你输入的那行文字的程序。绝大多数 Linux 上用的是 **bash**（zsh、fish 也常见）。

### 读懂提示符

```text
alice@ubuntu:~/projects/app$
└──┬──┘ └──┬─┘ └┬┘ └─┘
   │       │    │   └── 提示符结尾符号，# 是 root，$ 是普通用户
   │       │    └────── 当前目录，~ 代表家目录
   │       └─────────── 主机名
   └─────────────────── 用户名
```

### 命令的基本结构

```bash
命令 [选项] [参数]
```

- **命令**：要执行的动作，如 `ls`
- **选项**：开关行为，通常单字母短选项 `-a` 或长选项 `--all`
- **参数**：作用对象，通常是文件名

一条命令的本质是把若干小工具接起来用。`-h` 通常是 `--help` 的别名，但并非所有命令都有：

```bash
man ls        # 手册页，最权威的命令文档
ls --help     # 快速看选项列表
man 5 fstab  # 第 5 节是配置文件格式，第 8 节是系统管理命令
```

按 `q` 退出 `man`。

### 命令历史与补全

| 操作 | 作用 |
| --- | --- |
| `↑` / `↓` | 翻已执行过的命令 |
| `Ctrl + R` | 反向搜索历史，输入关键词回车即可复用 |
| `Tab` | 补全文件名；按两次列出所有候选 |
| `Ctrl + A` / `Ctrl + E` | 跳到行首 / 行尾 |
| `Ctrl + U` / `Ctrl + K` | 删除光标前 / 后的内容 |
| `Ctrl + L` | 清屏（等同 `clear`） |
| `Ctrl + C` | 中断当前前台命令 |
| `Ctrl + D` | 结束输入会话；空行时等同 `exit` |

> `Tab` 补全是提速最有效的习惯。文件名只写前两三个字母加 `Tab`，比手敲全路径快得多。

## 文件与目录操作

### 浏览

| 命令 | 作用 |
| --- | --- |
| `pwd` | 打印当前工作目录 |
| `ls` | 列出目录内容 |
| `ls -l` | 详细信息：权限、属主、大小、时间 |
| `ls -la` | 加上隐藏文件（以 `.` 开头） |
| `ls -lh` | 大小显示成 K/M/G |

`ls -l` 的一行解读：

```text
-rw-r--r--  1 alice alice  4096  Oct  3 10:22 notes.txt
└┬┘└┬┘└┬┘   │     │      │        │
 │  │  │    │     │      │        └──── 修改时间
 │  │  │    │     │      └──────────── 字节数
 │  │  │    │     └─────────────────── 文件名
 │  │  │    └───────────────────────── 文件的属组
 │  │  └────────────────────────────── 属主
 │  └───────────────────────────────── 其他用户的权限
 └──────────────────────────────────── 属主权限
```

第一列开头 `-` 是普通文件，`d` 目录，`l` 符号链接，`c`/`b` 是设备。

### 创建、移动、删除

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `mkdir` | 建目录，`-p` 连父目录一起建 | `mkdir -p src/utils` |
| `touch` | 建空文件 / 更新时间戳 | `touch a.txt` |
| `cp` | 复制，`-r` 递归目录 | `cp -r src src.bak` |
| `mv` | 移动或重命名 | `mv a.txt notes/a.txt` |
| `rm` | 删除，`-r` 递归，`-f` 强制不提示 | `rm -r build` |

```bash
mkdir -p demo/{src,test}   # 花括号展开，一次建多个同级目录
cp a.txt b.txt             # 复制文件
cp -a src/ backup/        # 归档式复制，保留权限和时间戳
mv oldname.txt newname.txt # 重命名
```

> **`rm` 不可撤销**，没有回收站。删之前先 `ls` 确认路径，用 `rm -r` 而非 `rm -rf`。
>
> ```bash
> rm -rf ~/important-data   # 危险：一整串路径不确认也不提示
> ```
>
> 更安全的习惯：先 `rm -r` 看提示，再用 `rm -rf`；或加 `-i` 逐个确认。变量永远不要直接用 `rm -rf $VAR/`，若变量为空会变成 `rm -rf /`。

## 查看文件内容

| 命令 | 用途 |
| --- | --- |
| `cat` | 全部输出，短文件用 |
| `less` | 分页浏览，`j`/`k` 上下，`q` 退出（可搜 `/关键词`） |
| `head` / `tail` | 开头 / 结尾 N 行，`-n 20` 指定行数 |
| `tail -f` | 持续输出新增内容，看日志首选 |
| `wc` | 行、词、字节数：`-l` `-w` `-c` |
| `file` | 判断文件类型（二进制、脚本、编码） |

```bash
less /var/log/syslog         # 翻日志，q 退出
tail -n 100 /var/log/syslog  # 最后 100 行
tail -f /var/log/syslog      # 跟踪，新行自动滚出
wc -l access.log             # 有多少行
head -1 access.log           # 第一行通常是日志头
```

> `cat` 只适合确认「文件在不在、大概多少内容」。文件一屏放不下时 `less` 体验远好于 `cat`，因为它不会把整个文件刷过去。

### 编辑文件

初学用 `nano` 就够，五分钟能上手：

| 操作 | 按键 |
| --- | --- |
| 保存 | `Ctrl + O`（提示文件名，回车确认） |
| 退出 | `Ctrl + X` |
| 查找 | `Ctrl + W` |
| 移动光标 | 方向键 |
| 剪切 / 粘贴行 | `Ctrl + K` / `Ctrl + U` |
| 注释切换 | `Ctrl + 3` |

修改 `/etc` 下的文件前先备份：

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

熟练后可转 `vim`：`i` 进入编辑，`Esc` 回普通模式，`:wq` 保存退出，`:q!` 放弃退出。vi 三件套 `i` / `Esc` / `:wq` 能覆盖日常基本操作。

## 查找

### find

`find 起点 [条件] [动作]`，从给定目录逐层遍历：

| 命令 | 作用 |
| --- | --- |
| `find . -name "*.log"` | 按文件名精确匹配（含子目录） |
| `find . -iname "*.LOG"` | 忽略大小写 |
| `find . -type d` | 只要目录（`-type f` 只要普通文件） |
| `find / -size +100M` | 大于 100MB |
| `find . -mtime -1` | 24 小时内修改过 |
| `find . -name "*.tmp" -delete` | 直接删（`-delete` 放在最后） |

```bash
find . -type f -name "*.conf"          # 列出所有 conf 文件
find . -type f -name "*.conf" -exec grep -l "ServerName" {} \;
find . -type f -mtime +30 -name "*.log" -delete   # 删一个月前的日志
```

> 注意 `-exec` 与 `{}` 之间的分号 `\;` 要转义，否则被 Shell 当作命令分隔符。或改用 `-print0` 配合 `xargs -0`。

### grep

在文本里搜内容：

| 命令 | 作用 |
| --- | --- |
| `grep "error" app.log` | 匹配行 |
| `grep -i "error" app.log` | 忽略大小写 |
| `grep -r "TODO" src/` | 递归搜目录 |
| `grep -rn -w "user" src/` | `-n` 显示行号，`-w` 全词匹配 |
| `grep -v "DEBUG" app.log` | 反向：排除含 DEBUG 的行 |
| `grep -E "err\|warn" app.log` | 正则（`-E` 正则，`-F` 纯文本更快） |

```bash
grep -rn "api_key" .              # 递归全项目搜，注意别提交命中文件
grep -c "404" access.log          # 只输出命中次数
```

### 定位程序

| 命令 | 作用 |
| --- | --- |
| `which git` | 程序在 PATH 里的位置 |
| `type -a python3` | 显示别名 / 内建 / 全部候选，比 which 更全 |
| `whereis nginx` | 二进制和文档位置 |
| `command -v jq` | 判断能否执行，比 which 更通用 |

## 权限与用户

### 三类用户

| 身份 | 说明 |
| --- | --- |
| root | 超级管理员，`uid=0`，可读写一切 |
| 普通用户 | 日常操作使用，uid 通常 ≥ 1000 |
| 服务账号 | `www-data`、`nginx` 等，只服务于特定程序 |

`sudo` 是「以 root 身份执行单条命令」，比长期用 root 登录安全得多。

```bash
sudo apt install git      # 装包需要
sudo -v                   # 刷新 sudo 凭据缓存，免重复输密码
sudo -u www-data id       # 以指定用户身份执行
```

### 权限位

`ls -l` 里的九位 `rwxr-x---` 分三组：**属主 / 属组 / 其他**，每组三位：

| 符号 | 数字 | 权限 |
| --- | --- | --- |
| `r` | 4 | 读：查看内容、列目录 |
| `w` | 2 | 写：修改内容 |
| `x` | 1 | 执行：运行脚本、进入目录 |

`chmod` 两种写法等价：

```bash
chmod u=rw,go=r notes.txt    # 符号式，给属主读写、其他人只读
chmod 644 notes.txt           # 数字式，rw- r-- r--
chmod +x deploy.sh           # 加执行位（只加，不动其他位）
chmod -R u+rwX logs/          # -R 递归，X 只对目录和已可执行文件生效
```

改属主属组用 `chown`：

```bash
sudo chown alice:alice uploads/
sudo chown -R www-data:www-data /srv/app   # 递归改属主和属组
```

其他常用账户操作：

```bash
id                      # 自己的 uid/gid 和所属组
groups                  # 自己属于哪些组
sudo useradd -m bob     # 建用户，-m 建家目录
sudo passwd bob         # 设密码
sudo usermod -aG sudo bob  # 加入 sudo 组（追加，别丢原有的组）
```

> 常见误区：`chmod 777` 能「解决」权限问题，但让任何用户都能改你的文件。除非在一次性容器里，否则应精确设置属主与权限位。

## 重定向与管道

Shell 的重定向把命令的输入输出接到文件，管道把一个命令的输出接到下一个命令的输入——这是 Linux 组合小工具的基础。

### 重定向

| 写法 | 作用 |
| --- | --- |
| `cmd > f.txt` | 输出**覆盖**写入文件 |
| `cmd >> f.txt` | 输出**追加**写入文件 |
| `cmd < in.txt` | 从文件读入，不在终端读 |
| `cmd 2> err.log` | 只重定向错误输出（stderr） |
| `cmd > all.log 2>&1` | 标准输出与错误输出都写入同一文件 |
| `cmd &> all.log` | 同上，bash 简写，非 POSIX |

> `2>&1` 里的 `&1` 表示「指向 fd 1」。顺序很关键：`> all.log 2>&1` 正确（两项都指文件）；`2>&1 > all.log` 则错误输出仍留在终端。

### 管道

```bash
cat access.log | grep " 404 " | wc -l      # 数一数 404 有多少条
ps aux | grep node | grep -v grep        # 找 node 进程（过滤自身）
find . -name "*.log" -exec cat {} + | sort -u | head
```

`|` 左边必须是「输出型」命令。真正需要时才用 `tee` 边存边看：

```bash
make 2>&1 | tee build.log
```

### 逻辑连接

| 写法 | 作用 |
| --- | --- |
| `a && b` | a 成功（退出码 0）才执行 b |
| `a \|\| b` | a 失败才执行 b，常用于兜底默认值 |
| `a ; b` | 不管成败都执行 |
| `a &` | a 丢到后台运行 |

```bash
mkdir -p build && cd build        # 前一步失败就别往下走
PORT=${PORT:-3000}                || 写法：变量为空时用默认值
ping -c1 example.com && echo ok   # 通才打印
```

## 文本处理三件套

| 命令 | 作用 | 示例 |
| --- | --- | --- |
| `sort` | 排序，`-n` 数字序，`-u` 去重 | `sort -nu ids.txt` |
| `uniq` | 去重，**必须紧跟 sort** | `sort names.txt \| uniq -c` |
| `wc` | 计数 | `wc -l` 行、`-c` 字节 |
| `cut` | 按分隔符切列 | `cut -d: -f1 /etc/passwd` |
| `paste` | 按行合并两文件 | `paste a.txt b.txt` |
| `tr` | 字符替换 / 删除 | `tr 'a-z' 'A-Z' < in.txt` |
| `tee` | 一边输出一边写文件 | `cmd \| tee log` |

经典组合：**统计出现次数最多的前 10 项**

```bash
cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -10
```

`uniq` 只压缩**相邻**重复行，所以顺序必须是 `sort → uniq`。

统计列位置的经典写法：

```bash
awk '{print $1}' access.log            # 第一列
awk -F',' '{sum += $2} END {print sum}' data.csv
cut -d, -f2- data.csv | paste -sd+ | bc   # 第二列求和
```

## 软件包管理

| 动作 | Debian / Ubuntu | Fedora / RHEL |
| --- | --- | --- |
| 更新仓库索引 | `sudo apt update` | `dnf check-update` |
| 安装 | `sudo apt install <pkg>` | `sudo dnf install <pkg>` |
| 卸载（保留配置） | `sudo apt remove <pkg>` | `sudo dnf remove <pkg>` |
| 彻底删除 | `sudo apt purge <pkg>` | `dnf remove` 默认即彻底 |
| 升级全部 | `sudo apt upgrade` | `sudo dnf upgrade` |
| 搜索 | `apt search <kw>` | `dnf search <kw>` |
| 查看详情 | `apt show <pkg>` | `dnf info <pkg>` |
| 已装列表 | `apt list --installed` | `dnf list installed` |
| 文件属于哪个包 | `apt-file search /path` | `dnf provides /path` |

实操样例：

```bash
sudo apt update                          # 先更新，否则装到旧版
sudo apt install -y git curl build-essential
apt show git | head -20                  # 装之前先看版本与说明
sudo apt autoremove                     # 清理不再需要的依赖
```

> `apt update` 只刷新索引，真正升级要 `apt upgrade`。系统升级请用发行版官方的升级脚本或 `do-release-upgrade`，别直接 `apt upgrade` 跨大版本。

## 进程管理

| 命令 | 作用 |
| --- | --- |
| `ps aux` | 列出全部进程快照 |
| `top` | 实时监控，按 `q` 退出 |
| `kill <pid>` | 发送信号，默认 `TERM`（15）请求退出 |
| `kill -9 <pid>` | `KILL`（9）强制终止，进程无法清理资源 |
| `pkill -f <关键字>` | 按命令行匹配杀进程 |
| `jobs` | 当前 shell 的后台任务 |
| `bg` / `fg` | 把任务放到后台 / 拉回前台 |

```bash
ps aux | grep nginx            # 查进程
ps aux --sort=-%mem | head -5  # 内存占用最高的 5 个
top                           # 实时；按 1 看每个 CPU，按 M 按内存排
kill 12345
```

`kill -9` 是最后手段，优先用默认的 `TERM` 让程序自己清理。

### 常用信号

| 信号 | 编号 | 作用 |
| --- | --- | --- |
| `SIGHUP` | 1 | 终端断开，程序需重载配置 |
| `SIGINT` | 2 | 中断，等价 `Ctrl + C` |
| `SIGTERM` | 15 | 请求正常退出，默认行为 |
| `SIGKILL` | 9 | 立即杀死，不可捕获 |

### 前后台作业

```bash
python3 app.py &        # 放到后台继续跑
jobs -l                 # 查看任务与 PID
fg %1                   # 任务 1 拉回前台
kill %1                 # 结束该任务
nohup python3 app.py > app.log 2>&1 &   # 关终端也继续跑
```

> Linux 没有 Windows 那样的 Ctrl+Alt+Delete 兜底。**关终端会向进程组发 `SIGHUP`**，跑长任务请用 `nohup` 或 tmux，或交给 systemd 托管。

## 服务管理

systemd 服务的通用操作：

```bash
systemctl status nginx        # 查看状态与最近日志
sudo systemctl start nginx    # 启动
sudo systemctl stop nginx     # 停止
sudo systemctl restart nginx  # 重启
sudo systemctl enable nginx   # 开机自启（创建软链接）
sudo systemctl reload nginx   # 不中断地重载配置
journalctl -u nginx -f       # 跟踪该服务的日志
```

> 修改 `.service` 文件后需要 `sudo systemctl daemon-reload` 让 systemd 重新读取配置。

## 磁盘与文件系统

| 命令 | 作用 |
| --- | --- |
| `df -h` | 各分区使用率（磁盘满了先看这个） |
| `du -sh <dir>` | 某目录占用，`.` 表示当前目录 |
| `lsblk` | 块设备与挂载点 |
| `mount` / `umount` | 挂载 / 卸载文件系统 |
| `findmnt` | 树状展示挂载关系 |
| `fdisk -l` | 分区表信息（需 root） |

```bash
df -h                              # 根分区 90% 就该清理了
du -sh ~/.cache/* 2>/dev/null | sort -h | tail     # 揪出占空间的大户
find / -size +1G -type f 2>/dev/null               # 全盘找大于 1G 的文件
```

清理的常规套路：`sudo apt autoremove` 清依赖，`~/.cache` 与 `~/.npm` 可整体删除（软件会重建），日志用 `journalctl --vacuum-size=200M`。

## 网络

| 命令 | 作用 |
| --- | --- |
| `ip a` | 查看本机网卡与 IP |
| `ip route` | 路由表，看默认网关 |
| `ping` | 测试连通性与延迟 |
| `curl -I <url>` | 看 HTTP 响应头，调试最快 |
| `ss -tulnp` | 监听中的端口及占用进程 |
| `dig <domain>` / `nslookup` | 查 DNS 解析 |
| `scp` / `rsync` | 与远程主机传文件 |

```bash
ip -4 a show                  # 只看 IPv4
ping -c 4 1.1.1.1             # 发 4 个包就停，不死循环
curl -I https://example.com   # 状态码、重定向、缓存头
ss -tulnp | grep :8080        # 谁占着 8080
rsync -avz src/ user@host:/srv/app/   # 增量同步，-n 空跑检查
```

远程登录（需先装并启动 sshd）：

```bash
ssh user@192.168.1.10
ssh -p 2222 user@host
scp report.pdf user@host:/tmp/
```

> 排查「连不上」的顺序：本地 `ping` 通不通 → `ip a` 有没有 IP → `ss` 有没有监听 → `ufw status` 是否放行 → 远程主机防火墙与安全组。

## 系统信息与资源

| 命令 | 作用 |
| --- | --- |
| `uname -a` | 内核版本与架构 |
| `uptime` | 开机时长与平均负载 |
| `free -h` | 内存与 swap 使用量 |
| `lscpu` / `nproc` | CPU 型号与核数 |
| `date` / `uptime -s` | 当前时间 / 上次开机时间 |
| `env` / `printenv PATH` | 环境变量 |
| `alias` | 已定义的命令别名 |

**负载(load average)** 是最近 1 / 5 / 15 分钟的运行队列平均长度，含义是「平均有多少个任务在排队等 CPU」：数值持续大于核数就是过载了。

```bash
uptime
 14:22:31 up 6 days,  3:11,  2 users,  load average: 0.42, 0.31, 0.28
nproc
8
```

## 编写 Shell 脚本

脚本就是一个装着命令的文本文件，在文件首行声明解释器，然后执行。

```bash
#!/bin/bash
# backup.sh —— 打包 /etc 并输出大小
set -euo pipefail                 # 有错就停、变量未定义就停、管道任一段失败都算失败

BACKUP_DIR="/tmp/backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/etc-$TIMESTAMP.tar.gz" /etc
ls -lh "$BACKUP_DIR/etc-$TIMESTAMP.tar.gz"
```

```bash
chmod +x backup.sh
./backup.sh
```

要点：

| 事项 | 说明 |
| --- | --- |
| `set -euo pipefail` | 生产脚本第一行，杜绝错误被吞掉 |
| 变量 | 声明 `NAME=v`，用 `$NAME` / `"${NAME}"`；路径务必加双引号 |
| 条件 | `if [ "$count" -gt 10 ]; then ... fi`，数值比较用 `-gt`，字符串用 `=` |
| 循环 | `for f in *.txt; do ... done`；`while read -r line; do ... done < file` |
| 注释 | `#` 开头 |

```bash
#!/bin/bash
count=$(ls *.txt 2>/dev/null | wc -l)

if [ "$count" -gt 5 ]; then
  echo "找到 $count 个 txt 文件"
else
  echo "文件偏少：$count"
fi

for f in *.txt; do
  echo "压缩 $f"
  gzip "$f"
done
```

> 调试脚手架：`bash -x script.sh` 打印每条实际执行的命令，`bash -n script.sh` 只做语法检查不执行。`shellcheck script.sh` 能查出大部分低级错误。

## 常用组合速查

| 目的 | 命令 |
| --- | --- |
| 谁占着某端口 | `ss -tulnp \| grep :8080` |
| 找出最大的 10 个目录 | `du -h --max-depth=1 ~ \| sort -h \| tail -10` |
| 统计日志里访问最多的 IP | `awk '{print $1}' access.log \| sort \| uniq -c \| sort -rn \| head` |
| 实时跟踪多个日志 | `tail -f /var/log/*.log` |
| 找最近一天改过的文件 | `find . -type f -mtime -1` |
| 批量改名 | `for f in *.jpeg; do mv "$f" "${f%.jpeg}.jpg"; done` |
| 文件同步备份 | `rsync -avzn src/ /backup/src/`（`n` 空跑） |
| 检查服务是否在跑 | `systemctl is-active nginx` |
| 批量统计文件类型 | `find . -type f \| sed 's/.*\.//' \| sort \| uniq -c \| sort -rn` |

## 排查手册

| 现象 | 排查方向 |
| --- | --- |
| `Permission denied` | 确认属主是否自己；目录需要 `x` 才能进入；该用 `sudo` 就用 |
| `command not found` | `which <cmd>` 看是否安装；装了但找不到说明不在 `PATH` 里 |
| `No space left on device` | `df -h` 看哪个分区满；`du -sh` 找大户； inode 用尽则 `df -i` |
| 端口被占用 | `ss -tulnp \| grep :端口`，杀掉对应 PID 或换端口 |
| 命令卡住没反应 | `Ctrl + Z` 挂起，`jobs` 查看，`kill %1`；或查磁盘/IO 瓶颈 |
| 改了配置不生效 | 是否需要重启服务；是否漏了 `daemon-reload`；服务是否压根没起来 |
| 找不到某个命令的文件 | `apt-file search 名字`，需先 `sudo apt install apt-file && sudo apt-file update` |
| 中文乱码 | `locale` 应为 `C.UTF-8` 或 `en_US.UTF-8`；文件本身存成 UTF-8 |
| 时间不对 | 开了 NTP 就有同步：`timedatectl status` |

## 学习路径

1. **动手优先**：所有命令都先在终端敲一遍。命令只能记住七成，剩下的靠 tab 补全和 `--help` 现查。
2. **读 man 手册**：`man 命令` 和 `apropos 关键词`（按功能找命令）是最强的查询手段，比搜索引擎更准。
3. **读系统里的文档**：`/usr/share/doc/软件名/` 下常有官方手册与示例；man 页也是。
4. **官方入门材料**：[Ubuntu 教程](https://documentation.ubuntu.com/server/tutorial/)、[Linux Journey](https://linuxjourney.com/)、[Arch Wiki](https://wiki.archlinux.org/)（全发行版通用，质量极高）。
5. **系统化参考**：[The Linux Command Line](https://linuxcommand.org/tlcl.php)（免费在线）、[man-pages](https://man7.org/linux/man-pages/)、[TLDP 指南](https://tldp.org/)。

> 用 `alias ll='ls -alF'`、`alias ..='cd ..'`、`alias rm='rm -i'` 这类别名，把高频操作固定下来。别把危险命令做成别名绕开确认。