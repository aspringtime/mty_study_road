---
title: Git 与 GitHub 入门及开源指南
slug: git-github-guide
order: 11
---

# Git 与 GitHub 入门及开源指南

本文面向**没用过版本控制**的读者，目标是把三件事一次讲清：

1. **Git**：本机上的版本控制工具，负责记录历史、分支和回滚。
2. **GitHub**：托管 Git 仓库的协作平台，负责远程备份、Pull Request、Issue 和自动化。
3. **开源**：把代码公开之后，如何选许可证、如何参与别人的项目、如何维护自己的项目。

读完后你应该能独立完成这些操作：建仓库、提交、开分支、解冲突、推送到 GitHub、发起并走完一个 Pull Request，以及给开源项目提交第一个补丁。

> 命令以 **Git 2.40+**（覆盖 2024–2026 年的主流版本）和 GitHub 当前界面为准。`git switch` / `git restore` 需要 Git ≥ 2.23，`git init -b` 需要 Git ≥ 2.28；更老的版本请把前两条换成 `git checkout`，并手动重命名分支。GitHub 的菜单和套餐会变，涉及界面路径时以官网为准。

## 先建立三个直觉

### 直觉一：Git 存的是快照，不是差异

很多人以为 Git 记录的是「每次改了哪几行」。实际上每次提交保存的是**整个项目在该时刻的完整快照**（未修改的文件用指针复用上一个快照，所以并不占空间）。差异是查看时现算的。

这解释了两件事：

- 切分支、回退版本非常快，因为只是切换指针；
- 提交是**不可变**的。所谓「修改历史」，实际是造出新的提交，再把分支指针挪过去。

### 直觉二：分支只是一个指针

```
A --- B --- C   ← main
              \
               D --- E   ← feature/login
```

`main` 和 `feature/login` 都只是指向某个提交的**可变指针**（默认 40 位哈希的别名）。新建分支就是写一个指针，几乎零成本，所以 Git 鼓励「一个任务一个分支」。

### 直觉三：本地和远程是两份独立仓库

`git commit` 只写本地，`git push` 才上传。没网也能提交、开分支、看历史；只有 `fetch` / `pull` / `push` 需要网络。理解这一点，就不会把「提交了」误当成「同事能看到」。

## Git 是什么

### 版本控制解决的问题

| 没有版本控制 | 有版本控制 |
| --- | --- |
| `论文_最终版_真的最终版_2.docx` | 一条提交历史，随时回到任意时刻 |
| 改坏了只能凭记忆撤 | `git restore` / `git revert` 精确回退 |
| 多人改同一文件靠邮件传 | 分支 + 合并 + 冲突提示 |
| 不知道某行为什么这么写 | `git blame` / `git log` 查到人和原因 |
| 线上出问题无法快速定位 | `git bisect` 二分定位引入问题的提交 |

### 集中式与分布式

| | 集中式（SVN） | 分布式（Git） |
| --- | --- | --- |
| 历史存放 | 只有服务器有完整历史 | 每个克隆都有完整历史 |
| 提交 | 直接写服务器 | 先写本地，再 push |
| 离线工作 | 基本不可用 | 可提交、开分支、查历史 |
| 分支成本 | 目录级操作，合并较重 | 指针，极轻 |
| 权限控制 | 可按目录细粒度 | 以仓库为单位，靠平台规则 |

### Git 与 GitHub 不是一回事

| | Git | GitHub |
| --- | --- | --- |
| 是什么 | 命令行工具 / 协议 | 托管 Git 仓库的网站 |
| 谁维护 | 开源社区（Junio Hamano 等维护者） | 微软旗下 GitHub |
| 能否离线 | 能 | 不能 |
| 替代品 | Mercurial、Fossil | GitLab、Gitee、Codeberg、Bitbucket |
| 核心价值 | 版本控制 | 协作、PR、Issue、CI、社区 |

**Git 是发动机，GitHub 是停车场加服务中心。** 换平台不影响你学 Git；反过来只会点网页、不会命令行，遇到冲突和回退就会卡住。

## 安装与首次配置

### 安装

| 平台 | 推荐方式 | 验证 |
| --- | --- | --- |
| Windows | `winget install --id Git.Git -e`，或到 [git-scm.com](https://git-scm.com/download/win) 下载 | 开始菜单打开 **Git Bash** |
| macOS | `xcode-select --install`（Apple 版）或 `brew install git`（较新） | `git --version` |
| Debian / Ubuntu | `sudo apt update && sudo apt install git` | `git --version` |
| Fedora / RHEL | `sudo dnf install git` | `git --version` |
| Arch | `sudo pacman -S git` | `git --version` |

```bash
git --version
# git version 2.47.3
```

Windows 用户建议直接用 **Git Bash**：它自带 bash、ssh、curl，和本文命令完全一致。在 PowerShell 里也能用 Git，但引号、路径和 `ssh-agent` 的写法有差异，初学容易踩坑。

### 必做配置

Git 把配置分成三层，优先级从低到高：`--system`（整机）→ `--global`（当前用户）→ `--local`（当前仓库，默认）。日常只需要配 global。

```bash
git config --global user.name "Zhang San"
git config --global user.email "zhangsan@example.com"
git config --global init.defaultBranch main
git config --global core.editor "code --wait"     # 用 VS Code；vim 用户可省略
git config --global pull.rebase true              # pull 时用 rebase，避免多余的合并提交
git config --global fetch.prune true              # fetch 时清理已删除的远程分支
git config --global rerere.enabled true           # 记住冲突解法，重复冲突自动套用
git config --global core.quotepath false          # 中文文件名正常显示，不转成 \344\270...
```

`user.name` 和 `user.email` 会写进每个提交，**必须配置**，否则 `git commit` 会报 "Please tell me who you are"。邮箱建议与 GitHub 账号一致，提交才会关联到你的头像和贡献图；不想暴露真实邮箱，可用 GitHub 提供的 `ID+用户名@users.noreply.github.com`。

### 换行符：Windows 用户必看

Windows 用 CRLF，Linux/macOS 用 LF。如果不处理，同一个文件会在不同系统间显示「整个文件都被修改」。

```bash
# Windows
git config --global core.autocrlf true
# macOS / Linux
git config --global core.autocrlf input
```

更可靠的做法是在仓库根目录放 `.gitattributes`，让规则跟着仓库走，而不是依赖每个人的本机配置：

```gitattributes
* text=auto eol=lf
*.bat text eol=crlf
*.cmd text eol=crlf
*.png binary
*.jpg binary
*.pdf binary
```

### 关联 GitHub 身份

GitHub 从 2021 年起**不再接受账号密码**做 Git 操作，只能用 SSH 密钥或 Personal Access Token（PAT）。初学推荐 SSH，一次配置长期有效。

```bash
# 1. 生成密钥（已有 ~/.ssh/id_ed25519 就跳过）
ssh-keygen -t ed25519 -C "zhangsan@example.com"
# 一路回车；密码短语可留空，也可设置以增加安全性

# 2. 启动 ssh-agent 并加入密钥
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. 复制公钥内容
cat ~/.ssh/id_ed25519.pub
```

把输出（以 `ssh-ed25519` 开头）粘贴到 GitHub：**Settings → SSH and GPG keys → New SSH key**。然后验证：

```bash
ssh -T git@github.com
# Hi username! You've successfully authenticated, but GitHub does not provide shell access.
```

看到 `successfully authenticated` 即成功。注意测试的是 `git@github.com`，不是 `github.com`。

如果只能用 HTTPS，需要创建 Personal Access Token（PAT）代替密码：GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens**，只勾选需要的仓库和最小权限，生成后当作密码使用。PAT 有有效期，过期要重新配置。

另外，GitHub 支持并鼓励开启 **双重认证（2FA）**，许多组织和仓库也会强制要求；入口在 Settings → Password and authentication，建议尽早开启。

> 如果公司网络屏蔽 22 端口，可在 `~/.ssh/config` 里改用 443：
>
> ```text
> Host github.com
>   HostName ssh.github.com
>   Port 443
>   User git
> ```

### GitHub CLI（可选，但强烈推荐）

[`gh`](https://cli.github.com/) 把建仓库、开 PR、看 CI 状态都搬到命令行，少切浏览器。

```bash
# 安装：Windows 用 winget install GitHub.cli；macOS 用 brew install gh；Linux 见官网
gh auth login          # 选 GitHub.com → SSH → 登录浏览器
gh auth status
```

### 检查配置

```bash
git config --list --show-origin   # 列出所有配置及来源文件
git config --global --edit        # 直接编辑全局配置
```

## 第一个仓库：从零到第一次提交

### 初始化

```bash
mkdir hello-git
cd hello-git
git init -b main
```

`git init` 会创建隐藏目录 `.git/`，仓库的全部历史、分支、配置都在里面。**删掉 `.git/` 就等于删掉整个历史**（工作文件还在），这是重建仓库的常用手段，也是误操作的高危点。

```bash
echo "# Hello Git" > README.md
git status
```

### 读懂 git status

`git status` 是使用频率最高的命令，它告诉你每个文件处于哪个状态。

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        README.md
```

加 `-s`（short）看紧凑版，两位字符的含义是：

| 输出 | 含义 |
| --- | --- |
| `??` | 未跟踪（新文件，Git 完全不管） |
| `A ` | 已新增并暂存 |
| ` M` | 已修改，**未**暂存 |
| `M ` | 已修改，**已**暂存 |
| `MM` | 暂存后又改了一次 |
| ` D` / `D ` | 已删除，未暂存 / 已暂存 |
| `R ` | 重命名已暂存 |

第一位是**暂存区 vs 上次提交**，第二位是**工作区 vs 暂存区**。记住这个顺序，`MM` 就不会看不懂。

### 三个区域与一次提交

```text
  工作区                暂存区                本地仓库              远程仓库
 (working tree)         (index)               (.git)              (origin)
      │                    │                     │                     │
      │    git add         │    git commit       │     git push        │
      ├───────────────────>├────────────────────>├────────────────────>│
      │                    │                     │                     │
      │<───────────────────┤<────────────────────┤<────────────────────┤
      │  git restore       │  git reset          │   git fetch/pull    │
```

| 区域 | 位置 | 作用 |
| --- | --- | --- |
| 工作区 | 你看到的文件 | 正在编辑的内容 |
| 暂存区 | `.git/index` | 下一次提交的「候选清单」 |
| 本地仓库 | `.git/objects` | 已提交的不可变历史 |
| 远程仓库 | GitHub 等 | 团队共享的备份与协作中心 |

暂存区是 Git 最容易被忽略、也最有用的设计：它让你**只提交这次想提交的部分**，把无关改动留在工作区。`git add -p` 可以按代码块挑选，是写干净提交的利器。

### 暂存与提交

```bash
git add README.md          # 暂存单个文件
git add src/               # 暂存整个目录
git add -A                 # 暂存所有新增、修改、删除
git add -p                 # 交互式按块暂存

git commit -m "docs: add README"
```

一次完整的日常循环就是：

```bash
git status                 # 看改了什么
git diff                   # 看具体改了什么
git add -p                 # 挑选要提交的部分
git commit -m "..."        # 提交
```

### 查看历史

```bash
git log                              # 完整历史
git log --oneline                    # 一行一条
git log --oneline --graph --all      # 分支图，最常用
git log -3                           # 最近 3 条
git log --stat                       # 每条提交改了哪些文件、多少行
git log -p README.md                 # 某文件的逐次改动
git show <commit>                    # 某次提交的完整内容
git show <commit>:README.md          # 某次提交时该文件的内容
```

建议加个别名，省去每次敲一长串：

```bash
git config --global alias.lg "log --oneline --graph --decorate --all"
git lg
```

想查某一行是谁、哪次提交改的：

```bash
git blame README.md
git blame -L 10,20 src/app.ts
git log -S"deprecatedFunction" --oneline   # 搜索引入/删除该字符串的提交
git log --follow -- src/app.ts             # 跟随文件重命名
```

### 比较差异

| 命令 | 比较对象 |
| --- | --- |
| `git diff` | 工作区 vs 暂存区（还没 add 的改动） |
| `git diff --staged` | 暂存区 vs 上次提交（这次会提交什么） |
| `git diff HEAD` | 工作区 vs 上次提交（全部改动） |
| `git diff main...feature` | `feature` 从分叉点以来的改动（看 PR 用这个） |
| `git diff --stat` | 只看文件与行数统计 |
| `git diff <commit1> <commit2> -- path` | 任意两个版本之间某文件的差异 |

`git diff` 默认输出很长，按 `q` 退出；加 `--color-words` 可以按词高亮，适合改文档。

### .gitignore：哪些文件不该进仓库

```gitignore
# 依赖与构建产物
node_modules/
dist/
build/
target/
__pycache__/
*.pyc

# 环境与密钥
.env
.env.*
!.env.example
*.pem
*.key

# 编辑器与系统
.vscode/
.idea/
.DS_Store
Thumbs.db

# 日志与临时文件
*.log
tmp/
```

规则要点：

- 以 `/` 结尾匹配目录；`build/` 匹配任意层级的 build 目录。
- 以 `/` 开头只匹配仓库根目录，如 `/TODO`。
- `!` 表示例外，但**不能把已被父目录排除的文件重新包含**：`node_modules/` 排除后，`!node_modules/foo` 无效。
- `**` 匹配任意层级，如 `**/temp`。
- 只对**未跟踪**文件生效。已经提交过的文件，加了规则也不会自动消失。

把已跟踪文件移出仓库但保留本地文件：

```bash
git rm -r --cached node_modules
git commit -m "chore: stop tracking node_modules"
```

全局忽略（适合编辑器配置、系统文件）：

```bash
git config --global core.excludesfile ~/.gitignore_global
```

GitHub 官方维护了各语言的模板：[github/gitignore](https://github.com/github/gitignore)。不要直接抄一大段用不上的规则，按项目实际需要增删。

### 写好提交信息

提交信息是写给未来的自己和同事看的。最低要求：

```text
docs: add README

说明为什么加、加了什么。正文与标题之间必须空一行。
```

三条硬规则：

1. **标题不超过 50 字符**，说清「做了什么」，不要写 "update"、"fix bug"。
2. **标题与正文之间空一行**，否则很多工具不会把正文当正文。
3. **用祈使句**：`add`、`fix`、`remove`，而不是 `added`、`fixed`。读起来就是「应用这个提交会……」。

更完整的规范（Conventional Commits）见后文「团队协作工作流」。

### 练习：第一次提交

```bash
mkdir practice && cd practice
git init -b main
echo "# 练习" > README.md
git add README.md
git commit -m "docs: add README"
echo "第二行" >> README.md
git diff                      # 看工作区改动
git add README.md
git diff --staged             # 看将要提交的内容
git commit -m "docs: add second line"
git log --oneline --graph
```

## 撤销与回退

这是新手最恐惧、也最容易伤到自己的部分。先记住一个判断顺序：

1. **提交了吗？** 没提交的改动，用 `restore`；提交过的，用 `reset` / `revert`。
2. **推送了吗？** 没推送，可以随便改历史；推送了，优先用 `revert` 而不是 `reset`。
3. **只想撤销一个文件，还是整个提交？** 能精确到文件就不要动整个提交。

### 三种「撤销」的区别

| 目标 | 命令 | 是否改写历史 | 适用场景 |
| --- | --- | --- | --- |
| 丢弃工作区改动 | `git restore <file>` | 否 | 改乱了，想回到上次提交/暂存的样子 |
| 取消暂存 | `git restore --staged <file>` | 否 | add 多了，想重新挑 |
| 撤销本地提交 | `git reset` | 是 | 还没 push，想重做 |
| 撤销已推送提交 | `git revert` | 否（新增反向提交） | 已共享的历史 |
| 找回丢失的提交 | `git reflog` | 否 | reset 错了、分支删错了 |

### 丢弃工作区改动

```bash
git restore README.md              # 恢复到暂存区版本
git restore --source=HEAD~2 app.js # 恢复到两次提交前的版本
git restore .                      # 丢弃当前目录所有未暂存改动（危险）
```

`git restore` 会**永久丢弃**未提交的改动，且不进 reflog，无法找回。执行前先 `git diff` 确认。

### 取消暂存

```bash
git restore --staged README.md     # 新写法
git reset HEAD README.md           # 老写法，等价
```

文件内容不变，只是从「下次提交清单」里拿出来。

### 修改最近一次提交

```bash
git commit --amend                 # 改提交信息
git add forgotten.txt
git commit --amend --no-edit       # 补文件，信息不变
```

`--amend` 会生成**新的提交哈希**。只适用于还没推送的提交；推过之后再 amend，必须强制推送，会影响到已经拉取的人。

### reset 的三种模式

`git reset` 移动当前分支指针，三种模式决定「暂存区」和「工作区」是否跟着回退：

| 模式 | HEAD | 暂存区 | 工作区 | 典型用途 |
| --- | --- | --- | --- | --- |
| `--soft` | 回退 | 不变 | 不变 | 撤销提交，改动仍在暂存区，可重新提交 |
| `--mixed`（默认） | 回退 | 回退 | 不变 | 撤销提交和暂存，改动留在工作区 |
| `--hard` | 回退 | 回退 | 回退 | 彻底丢弃（危险） |

```bash
git reset --soft HEAD~1     # 最近一次提交拆掉，改动回到暂存区
git reset HEAD~1            # 拆掉提交和暂存，改动留在工作区
git reset --hard HEAD~1     # 连工作区改动一起删（提交可用 reflog 找回）
git reset --hard origin/main # 本地完全对齐远程（会丢弃本地提交）
```

> `git reset --hard` 不会删除**未跟踪**文件（新建但没 add 的文件仍在）。要清理它们用 `git clean`，详见下文。

### revert：对已推送的历史做反向提交

```bash
git revert <commit>         # 生成一个「抵消该提交」的新提交
git revert HEAD             # 抵消最近一次
git revert -m 1 <merge>     # 抵消一次合并提交，-m 1 表示保留第一父提交（主线）
```

`revert` 不改历史，只是追加一个反向修改，所以对共享分支是安全的。代价是历史里会同时留下「犯错」和「修正」两条记录，这是团队协作中可接受的成本。

### reflog：最后的安全网

只要提交过，哪怕 reset 掉了、分支删了，提交对象通常还在，`reflog` 记录了 HEAD 的每次移动：

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~1
# 9f8e7d6 HEAD@{1}: commit: feat: add login

git switch -c rescue 9f8e7d6   # 从旧提交拉个新分支救回来
```

reflog 默认保留 90 天（不可达对象 30 天），但不是永久备份。**没有提交过的内容，reflog 也救不了。**

### clean：清理未跟踪文件

```bash
git clean -n          # 预演，列出会被删的文件（先跑这个！）
git clean -f          # 删除未跟踪文件
git clean -fd         # 连未跟踪目录一起删
git clean -fdx        # 连 .gitignore 忽略的文件也删（会删 node_modules、.env）
```

`git clean` 不进回收站，也没有 reflog。养成先 `-n` 的习惯。

### 撤销速查

| 我想…… | 命令 |
| --- | --- |
| 丢弃某个文件的改动 | `git restore <file>` |
| 取消 add | `git restore --staged <file>` |
| 改上一条提交信息 | `git commit --amend` |
| 撤销上一条提交，保留改动 | `git reset --soft HEAD~1` |
| 彻底删掉上一条提交 | `git reset --hard HEAD~1` |
| 撤销已推送的提交 | `git revert <sha>` |
| 找回 reset 掉的内容 | `git reflog` + `git switch -c rescue <sha>` |
| 删掉未跟踪的垃圾文件 | `git clean -nd` → `git clean -fd` |

## 分支与合并

### 分支只是一个指针

```text
A --- B --- C   ← main
              \
               D --- E   ← feature/login
```

`main` 指向 C，`feature/login` 指向 E。在哪个分支上提交，就移动哪个指针。所以：

- 建分支是 O(1)，不需要复制文件；
- 切分支只是改 HEAD 指向并更新工作区；
- 删分支只是删指针，提交对象还在（可用 reflog 找回）。

### 常用操作

```bash
git branch                      # 列出本地分支，* 表示当前
git branch -a                   # 含远程分支
git branch -vv                  # 含跟踪关系与领先/落后数
git switch -c feature/login     # 新建并切换
git switch main                 # 切换
git switch -                    # 回到上一个分支
git branch -m new-name          # 重命名当前分支
git branch -d feature/login     # 删除已合并分支
git branch -D feature/login     # 强制删除未合并分支
```

`git checkout -b` 是旧写法，等价于 `git switch -c`。新版本把「切分支」和「恢复文件」拆成 `switch` 与 `restore`，语义更清楚，建议养成新习惯。

### 合并：fast-forward 与三方合并

假设 `main` 在 C，`feature` 从 C 往后加了 D、E。

**快进（fast-forward）**：`main` 没有新提交，直接把指针移到 E，不产生合并提交。

```text
A --- B --- C --- D --- E   ← main, feature
```

**三方合并（three-way merge）**：`main` 也有了新提交 F，两条线分叉，Git 用 C（共同祖先）、E、F 做三方合并，生成合并提交 M。

```text
A --- B --- C --- F --- M   ← main
              \       /
               D --- E       ← feature
```

```bash
git switch main
git merge feature/login            # 能快进就快进
git merge --no-ff feature/login    # 强制生成合并提交，保留分支痕迹
git merge --ff-only feature/login  # 只允许快进，否则报错
git merge --squash feature/login   # 把分支所有改动压成一个未提交的改动
```

团队习惯不同：有人喜欢 `--no-ff` 以保留「这是一个功能分支」的信息，有人喜欢线性历史。**跟随项目现有风格**，不要在一个仓库里混用。

### 解决冲突

冲突不是错误，是 Git 在说「这两处改动我无法替你决定」。只有同一文件的同一区域被两边修改时才会冲突。

```bash
git merge feature/login
# Auto-merging app.js
# CONFLICT (content): Merge conflict in app.js
# Automatic merge failed; fix conflicts and then commit the result.
```

打开文件，会看到：

```text
<<<<<<< HEAD
const timeout = 3000;
=======
const timeout = 5000;
>>>>>>> feature/login
```

- `<<<<<<< HEAD` 到 `=======`：**当前分支**（你所在的分支，merge 时是 main）的内容。
- `=======` 到 `>>>>>>>`：**被合并分支**（feature）的内容。

处理步骤：

```bash
git status                     # 看哪些文件冲突（both modified）
# 编辑文件，删掉标记，保留正确内容（可能需要两者融合）
git add app.js                 # 标记为已解决
git commit                     # 完成合并（信息已预填）
# 或者
git merge --continue
git merge --abort              # 放弃这次合并，回到合并前
```

辅助命令：

```bash
git diff --name-only --diff-filter=U   # 只列冲突文件
git checkout --ours app.js             # 整份采用当前分支版本（危险，会丢对方改动）
git checkout --theirs app.js           # 整份采用对方版本
git mergetool                          # 打开图形化合并工具
```

> **`--ours` / `--theirs` 在 rebase 时是反的**：rebase 把你放在「上游分支」上重放提交，所以 `--ours` 是上游，`--theirs` 是你的提交。冲突时先看清 `git status` 提示的当前操作，别凭直觉选。

冲突解决完一定要**跑测试**。Git 只能保证文本合并成功，不保证语义正确。

### rebase：把你的提交「搬」到新基底上

```bash
git switch feature/login
git rebase main
```

Git 找到 `feature` 与 `main` 的共同祖先，把 `feature` 上的提交逐个重放（replay）到 `main` 最新提交之后，得到全新的提交（哈希会变）。

```text
before:  A --- B --- C --- F   ← main
                  \
                   D --- E     ← feature

after:   A --- B --- C --- F --- D' --- E'   ← feature
```

冲突处理：

```bash
git add <file>
git rebase --continue
git rebase --skip        # 跳过当前这个提交
git rebase --abort       # 放弃整个 rebase
```

**黄金法则：不要 rebase 已经推送到共享分支的提交。** 因为哈希变了，别人拉取时会得到两条重复历史，或者被迫做复杂的手工修复。只在自己的、还没合并的 PR 分支上 rebase。

交互式 rebase 是整理提交的利器：

```bash
git rebase -i HEAD~3
```

编辑器里会列出最近 3 个提交，每行前的动词：

| 动词 | 作用 |
| --- | --- |
| `pick` | 保留 |
| `reword` | 保留但改提交信息 |
| `edit` | 停下来修改内容 |
| `squash` | 合并到上一个提交，并编辑合并后的信息 |
| `fixup` | 合并到上一个提交，丢弃本条信息 |
| `drop` | 删除该提交 |

把 `pick` 改成 `squash` 就能把一串「wip」「fix typo」压成一条干净的提交。**只对未推送的提交做**。

### merge 还是 rebase

| | merge | rebase |
| --- | --- | --- |
| 历史 | 保留分叉，有合并提交 | 线性，干净 |
| 真实性 | 完整反映何时合并 | 重写提交时间与哈希 |
| 冲突 | 一次解决 | 可能每个提交都要解 |
| 适合 | 合并到共享主分支、多人分支 | 整理自己的 PR 分支、同步上游 |
| 风险 | 历史较乱 | 改写公共历史会害人 |

实用组合：**本地用 rebase 保持整洁，合并进主分支用 merge（或平台 Squash merge）**。团队若规定「线性历史」，就按团队规定来。

### cherry-pick：只摘一个提交

```bash
git cherry-pick <sha>              # 把某个提交应用到当前分支
git cherry-pick <sha1> <sha2>      # 多个
git cherry-pick <sha>..<sha2>      # 区间（不含起点）
git cherry-pick --continue         # 解决冲突后继续
git cherry-pick --abort
```

典型场景：在 `main` 上修了 bug，想把同一个修复也放到 `release/1.0` 分支。注意 cherry-pick 产生的是**新提交**，不是原提交，之后两个分支合并时可能重复应用同一改动。

### stash：临时收起手头改动

```bash
git stash push -m "wip: login form"   # 收起已跟踪文件的改动
git stash -u                         # 连未跟踪文件一起收
git stash list                       # 查看
git stash show -p stash@{0}          # 看内容
git stash pop                        # 恢复并删除记录
git stash apply stash@{0}            # 恢复但保留记录
git stash drop stash@{0}             # 删除记录
git stash clear                      # 清空（危险）
```

stash 是**本机私有**的，不会推送。适合「改到一半要紧急切分支」，不适合长期存储——长期未完成的工作应该放分支或草稿 PR。

### tag：给提交起个版本名

```bash
git tag                                        # 列出
git tag -a v1.0.0 -m "release 1.0.0"           # 附注标签（推荐，含作者、时间、说明）
git tag v1.0.0                                 # 轻量标签（只是个指针）
git show v1.0.0
git push origin v1.0.0                         # 推送单个标签
git push origin --tags                         # 推送所有标签
git tag -d v1.0.0                              # 删本地
git push origin :refs/tags/v1.0.0              # 删远程
```

发布版本用**附注标签**，它会创建一个真正的 tag 对象，能签名、能带发布说明。版本号规则见后文语义化版本。

### 练习：制造并解决一次冲突

```bash
git switch -c conflict-demo
echo "feature 版本" > note.txt
git add note.txt && git commit -m "feat: add note from feature"

git switch main
echo "main 版本" > note.txt
git add note.txt && git commit -m "feat: add note from main"

git merge conflict-demo      # 必然冲突
cat note.txt                 # 观察冲突标记
# 编辑成你想要的内容
git add note.txt
git commit -m "merge: resolve note conflict"
git log --oneline --graph --all
```

## 远程仓库与 GitHub

### 远程是什么

远程（remote）是本地仓库记住的一个 URL 别名，默认叫 `origin`。它本身不神秘，就是配置在 `.git/config` 里的一行：

```ini
[remote "origin"]
    url = git@github.com:username/repo.git
    fetch = +refs/heads/*:refs/remotes/origin/*
```

`git fetch` 把远程分支下载到本地的**远程跟踪分支**（`origin/main`），它和你本地的 `main` 是两个不同的引用。

```bash
git remote -v                  # 查看远程地址
git remote add origin <url>
git remote set-url origin <new-url>
git remote remove origin
git remote show origin         # 查看远程分支与跟踪关系
```

### 克隆

```bash
git clone git@github.com:owner/repo.git          # SSH（推荐，配好密钥后免密）
git clone https://github.com/owner/repo.git      # HTTPS（需要 PAT）
git clone <url> my-folder                        # 指定本地目录名
git clone --depth 1 <url>                        # 浅克隆，只取最近一次提交（CI 常用）
git clone --recurse-submodules <url>             # 连子模块一起
```

| 协议 | 认证 | 优点 | 缺点 |
| --- | --- | --- | --- |
| SSH | 密钥 | 免密、长期有效 | 初次配置稍麻烦，防火墙可能挡 22 端口 |
| HTTPS | PAT / 凭据管理器 | 穿透代理好、即开即用 | token 过期需重配 |

### fetch、pull、push

```bash
git fetch origin               # 只下载，不改工作区（安全）
git fetch --prune              # 同时删掉远程已删除的分支引用
git pull                       # fetch + merge（默认）
git pull --rebase              # fetch + rebase（推荐，历史干净）
git push                       # 推送当前分支
git push -u origin main        # 首次推送并建立跟踪关系
git push origin feature/login  # 推送指定分支
git push origin --delete feature/login  # 删除远程分支
```

`fetch` 之后可以先看再合并，是更安全的习惯：

```bash
git fetch origin
git log --oneline HEAD..origin/main     # 远程比我多哪些提交
git log --oneline origin/main..HEAD     # 我比远程多哪些提交
git diff HEAD origin/main               # 具体差异
git merge origin/main                   # 或 git rebase origin/main
```

### 跟踪分支

```bash
git branch -vv                          # 看每个分支跟踪谁、领先/落后多少
git branch -u origin/main               # 设置当前分支的上游
git push -u origin feature/login        # 推送并设置上游
```

设置上游后，`git push` / `git pull` 可以不带参数。看到 `Your branch is ahead of 'origin/main' by 2 commits`，就是有 2 个提交还没推。

### push 被拒绝怎么办

```text
! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'github.com:owner/repo.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```

原因：远程有你本地没有的提交（别人推了，或者你在网页上改了 README）。**不要直接 `git push -f`**，那会覆盖别人的工作。正确做法：

```bash
git pull --rebase origin main     # 把远程提交接进来，你的提交放到后面
# 解决可能的冲突
git push
```

如果确定远程的那些提交不要了（例如自己刚推错了），才考虑强制推送，并且用安全版本：

```bash
git push --force-with-lease
```

`--force-with-lease` 会检查远程是否仍停留在你上次看到的位置，如果别人在此期间推了新提交就拒绝，比 `--force` 安全得多。即便如此，**永远不要对 main 等共享分支强制推送**，除非你完全清楚影响范围并已通知所有人。

### 练习：推送与同步

```bash
# 在 GitHub 网页新建一个空仓库（不要勾选 README）
git remote add origin git@github.com:<你的用户名>/hello-git.git
git branch -M main
git push -u origin main

# 模拟远程有新提交
# 在网页上编辑 README 并提交
git fetch origin
git log --oneline HEAD..origin/main
git pull --rebase
git push
```

## GitHub 实操

开始前先注册账号并开启 2FA。用户名会进入仓库 URL 和个人主页（`github.com/你的用户名`），建议用稳定的英文 ID，不要用临时想起的玩笑名。

### 创建仓库

网页路径：右上角 **+ → New repository**。几个关键选项：

| 选项 | 建议 |
| --- | --- |
| Repository name | 小写、连字符，如 `my-cli` |
| Description | 一句话说清做什么，会显示在搜索结果里 |
| Public / Private | 开源选 Public；私有仓库免费但协作者需授权 |
| Add a README | 本地已有仓库时**不要勾**，否则会产生无关历史 |
| Add .gitignore | 按语言选，之后可改 |
| Choose a license | 开源项目必选，见后文许可证章节 |

本地已有项目时，最稳的顺序是：先建空仓库，再按 GitHub 页面给出的命令推送。

```bash
git remote add origin git@github.com:username/repo.git
git branch -M main
git push -u origin main
```

### 两种协作模型

**分支模型（同一仓库）**：适合有写权限的团队成员。

```text
owner/repo
  ├── main            ← 受保护，只能通过 PR 合入
  ├── feat/login      ← 你的分支
  └── fix/typo        ← 同事的分支
```

**Fork 模型（复制仓库）**：适合外部贡献者，你没有原仓库写权限。

```text
owner/repo (upstream)          yourname/repo (origin)
  ├── main                       ├── main
  └── ...                        └── fix/typo  ← 你推这里，再向 upstream 发 PR
```

### Star、Watch、Fork、Clone 别搞混

| 动作 | 作用 | 产生副本吗 |
| --- | --- | --- |
| Star | 收藏项目，相当于点赞，会影响推荐 | 否 |
| Watch | 订阅通知（issue、PR、release） | 否 |
| Fork | 在你自己账号下复制一份**服务器端仓库**，用于提 PR | 是（GitHub 上） |
| Clone | 把仓库下载到本地 | 是（本地） |
| Branch | 在同一仓库内开分支 | 否（同一个仓库） |

> 典型误区：以为 fork 之后本地就有代码了。fork 只发生在 GitHub 上，还要 `git clone` 才会到本地。另一个误区是随手 watch 所有动态，结果通知爆炸；只 watch 你真正关心的项目即可。

### Issue、PR、Discussion 各管什么

| 对象 | 用途 | 包含代码改动 |
| --- | --- | --- |
| Issue | 报告 bug、提需求、跟踪任务 | 否 |
| Pull Request | 请求把某个分支的改动合并进目标分支 | 是 |
| Discussion | 开放式问答、公告、经验分享（需在设置中开启） | 否 |
| Projects | 看板、表格、路线图 | 否 |
| Wiki | 项目文档（也可直接用仓库里的 `docs/`） | 否 |

一个 PR 可以用 `Closes #1, #2` 关闭多个 issue，但不要把无关改动塞进同一个 PR。

### Fork 工作流：给别人的项目提 PR

```bash
# 1. 在 GitHub 点 Fork（或用 gh）
gh repo fork owner/repo --clone

# 2. 进入目录，确认/添加上游（gh 通常已自动配置）
cd repo
git remote -v
git remote add upstream git@github.com:owner/repo.git   # 已存在则跳过
git remote -v
# origin    git@github.com:yourname/repo.git
# upstream  git@github.com:owner/repo.git

# 3. 同步主分支
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main

# 4. 开分支干活
git switch -c fix/readme-typo

# 5. 修改、提交、推送
git add README.md
git commit -m "docs: fix typo in install section"
git push -u origin fix/readme-typo

# 6. 发起 PR（网页会提示 Compare & pull request，或用 gh）
gh pr create --repo owner/repo --base main --title "docs: fix typo" --body "修正安装章节的拼写错误。"
```

之后保持分支同步：

```bash
git fetch upstream
git switch fix/readme-typo
git rebase upstream/main        # 或 merge upstream/main，看项目偏好
git push --force-with-lease
```

### Pull Request 全流程

1. **确认范围**：一个 PR 只做一件事。修 bug 就不要顺手格式化整个文件。
2. **自测**：本地跑测试、lint、构建。CI 会再跑一遍，但别把 CI 当第一道测试。
3. **写描述**：说清「改了什么、为什么改、怎么验证、关联哪个 issue」。
4. **自我 review**：在 Files changed 里先看一遍自己的 diff，能发现调试代码、误提交文件。
5. **开 PR**：标题用提交规范，描述填模板；未完成可先开 **Draft** 收集早期反馈。
6. **回应 review**：逐条回复或修改；推送新提交后，评论里说明「已在 abc1234 修复」。
7. **合并**：由维护者操作；合并后删除分支、同步本地。

一个合格的 PR 描述：

```markdown
## 改了什么
修正安装章节中 `npm instal` 的拼写错误。

## 为什么
新用户按文档执行会报错，见 #123。

## 怎么验证
本地执行 `npm install`，命令正常；文档预览渲染正常。

## 备注
仅改动文档，无代码变更。

Closes #123
```

`Closes #123` / `Fixes #123` 会在 PR 合并时自动关闭对应 issue。

### Code Review

评审是协作的核心技能，不是「挑错」。

**作为作者：**

- PR 尽量小。超过 400 行改动，评审质量会明显下降。
- 描述里给上下文，别让评审者去猜。
- 对事不对人地回应；不同意时给出理由或替代方案，而不是只回「已改」。
- 不要强行 resolve 别人的评论；有疑问就问。

**作为评审者：**

- 先看整体设计，再看细节；不要一上来纠结空格。
- 区分「必须改」和「建议」：建议前加 `nit:`（nitpick，吹毛求疵）。
- 给出可执行的建议，例如「这里建议用 `map`，避免 O(n²)」而不是「写得不好」。
- 及时回复。维护者的沉默比拒绝更伤贡献者。

### 合并方式

GitHub 的 PR 提供三种合并按钮，取决于仓库设置：

| 方式 | 结果 | 适合 |
| --- | --- | --- |
| Create a merge commit | 保留所有提交 + 一个合并提交 | 想保留完整开发过程 |
| Squash and merge | 所有改动压成一个提交 | 分支里有很多 wip，主分支要干净 |
| Rebase and merge | 逐个重放，线性无合并提交 | 要求线性历史、提交本身干净 |

Squash 合并后，本地分支和 `main` 的历史就分叉了。**不要再把旧分支继续开发后提 PR**，正确做法是删掉旧分支，从最新 `main` 重新开。

### 合并后清理

```bash
git switch main
git pull
git branch -d fix/readme-typo          # 删本地
git push origin --delete fix/readme-typo  # 删远程（网页合并时通常已删，报不存在可忽略）
git fetch --prune                      # 清理失效的远程跟踪引用
```

> 如果 PR 是用 **Squash** 或 **Rebase** 合并的，Git 会认为原分支「未合并」，`git branch -d` 可能拒绝删除。确认 PR 已合并后，可用 `git branch -D` 强制删除；更好的做法是合并后直接从最新 `main` 重新开分支。

### Issues：把问题说清楚

一个好 issue 包含：**环境、复现步骤、期望行为、实际行为、日志/截图、已尝试的方案**。

```markdown
### 环境
- OS: Ubuntu 24.04
- 版本: v1.2.0

### 复现步骤
1. 执行 `mytool build`
2. 传入包含空格的路径

### 期望
正常构建

### 实际
报错 `ENOENT`，完整日志见下

### 已尝试
- 去掉空格后正常
```

不要只写「不能用，求解决」。维护者没有你的环境，信息不足只能反复询问，问题就沉了。

### GitHub Actions：最小可用 CI

在仓库根目录建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

要点：

- `permissions` 显式声明最小权限。新仓库的 `GITHUB_TOKEN` 默认只读，需要写权限（如自动发版、推 tag）时必须显式声明，别让整个 CI 都拥有写仓库的能力。
- 第三方 action 用 `@v4` 方便，但高安全要求的项目应固定到 commit SHA，防止 tag 被劫持。
- 密钥放 **Settings → Secrets and variables → Actions**，用 `${{ secrets.NAME }}` 引用，**永远不要 echo 到日志**。
- `pull_request_target` 会在有 secrets 的上下文运行，若再 checkout PR 代码，等于把密钥交给外部贡献者，务必慎用。

### Pages 与 Releases

- **GitHub Pages**：静态站点托管。Settings → Pages 选择分支目录（如 `docs/`）或 Actions 部署。适合文档站、个人主页。
- **Releases**：基于 tag 的发布页，可附二进制、源码包和发布说明。

```bash
git tag -a v1.0.0 -m "release 1.0.0"
git push origin v1.0.0
gh release create v1.0.0 --generate-notes
```

### 仓库治理设置

| 设置 | 位置 | 作用 |
| --- | --- | --- |
| Branch protection / Rulesets | Settings → Rules | 禁止直接推 main、要求 PR 与审批、要求 CI 通过 |
| CODEOWNERS | `.github/CODEOWNERS` | 指定目录的默认评审人 |
| Issue / PR 模板 | `.github/ISSUE_TEMPLATE/`、`pull_request_template.md` | 统一信息格式 |
| Dependabot | Settings → Code security | 自动提依赖升级 PR |
| Secret scanning | Settings → Code security | 检测泄露的密钥 |
| Private vulnerability reporting | Settings → Code security | 让安全研究者私下报告漏洞 |

`CODEOWNERS` 示例：

```text
*                    @yourname
/docs/               @docs-team
/src/api/            @backend-team
*.sql                @dba
```

分支保护的最低建议：**main 必须走 PR、至少 1 个审批、CI 必须通过、禁止强制推送、合并后自动删分支**。

### gh 常用命令

```bash
gh auth status
gh repo create my-cli --public --source=. --push
gh repo clone owner/repo
gh repo fork owner/repo --clone
gh pr create --fill                 # 用提交信息填标题和正文
gh pr list
gh pr view 42 --web
gh pr checkout 42                   # 把别人的 PR 拉到本地
gh pr diff 42
gh pr review 42 --approve
gh pr merge 42 --squash --delete-branch
gh issue list --label "good first issue"
gh run list                         # 看 CI 运行
gh run watch                        # 实时跟踪
gh release create v1.0.0 --generate-notes
```

## 团队协作工作流

### GitHub Flow：大多数项目的默认答案

```text
main（始终可发布）
  │
  ├── 开分支 feat/login
  │      ├── commit
  │      ├── push
  │      └── 开 PR → review → CI → 合并
  │
  └── 删除分支，回到 main
```

规则只有几条：

1. `main` 永远可部署，禁止直接提交。
2. 任何改动都从 `main` 开短分支。
3. 尽早开 Draft PR，让讨论发生在写代码期间。
4. 合并前必须通过 CI 和至少一个 review。
5. 合并后立即删除分支，保持分支列表干净。

适合：Web 服务、持续部署、小团队、开源项目。

### Trunk-Based：更极致的短分支

所有人频繁（每天）向 `main` 合入小改动，分支存活不超过一两天，未完成功能用 **feature flag** 隐藏。要求团队有较强的自动化测试与发布能力。Google 等公司采用这种模式。

### Git Flow：重流程项目的选择

长期存在 `main` 与 `develop` 两条主线，配合 `feature/*`、`release/*`、`hotfix/*`。适合有明确版本发布周期、需要同时维护多个版本的软件（如桌面软件、SDK）。对大多数 Web 项目来说过重，不建议新手一上来就用。

### 分支命名

```text
feat/user-login
fix/upload-timeout
docs/install-guide
refactor/config-loader
chore/update-deps
hotfix/1.2.1
```

统一用 `类型/短描述`，小写、连字符。有工单系统时带上编号：`feat/123-user-login`。

### 提交规范：Conventional Commits

```text
<type>(<scope>): <subject>

<body>

<footer>
```

| 类型 | 含义 |
| --- | --- |
| `feat` | 新功能（对应 MINOR 版本） |
| `fix` | 修 bug（对应 PATCH 版本） |
| `docs` | 只改文档 |
| `style` | 格式、空白、分号，不改逻辑 |
| `refactor` | 重构，不改行为 |
| `perf` | 性能优化 |
| `test` | 增改测试 |
| `build` | 构建系统、依赖 |
| `ci` | CI 配置 |
| `chore` | 杂项维护 |
| `revert` | 回滚某次提交 |

破坏性变更在类型后加 `!`，或在 footer 写 `BREAKING CHANGE:`：

```text
feat(api)!: remove legacy /v1/users endpoint

BREAKING CHANGE: 客户端必须迁移到 /v2/users。
旧接口将于 2026-06-01 下线。
```

好处：人能快速扫读，工具能自动生成 CHANGELOG 和版本号（semantic-release、changesets）。

写提交前的自检：

- 这条提交能用一句话说清吗？说不清就拆。
- 是否混入了无关的格式化、调试代码、锁文件？
- 标题是祈使句吗？结尾有句号吗（通常不要）？
- 正文解释了**为什么**，而不只是**做了什么**？

### PR 大小与节奏

| 改动行数 | 评审体验 |
| --- | --- |
| < 100 | 很快，适合日常 |
| 100–400 | 合适，一次能看完 |
| 400–1000 | 偏大，需要拆或提前沟通 |
| > 1000 | 基本没人能认真评审，风险高 |

大功能拆成多个可独立合并的 PR：先加数据结构，再加接口，最后接 UI。每个 PR 都能通过测试、能回滚，比一个巨型 PR 安全得多。

## 开源是什么

### 定义：不只是「代码能看」

按 [OSI 的开源定义](https://opensource.org/osd)，一个许可证要满足这些条件才算开源：

1. **自由再分发**：可以原样或修改后分发，不额外收费。
2. **源代码**：必须提供可读的源代码。
3. **允许衍生作品**：必须允许修改，并以相同许可证分发。
4. **作者源码完整性**：可以要求修改版用不同名称或版本号区分，但不能阻止分发。
5. **不歧视个人或群体**。
6. **不歧视使用领域**（不能禁止商业使用）。
7. **许可证随软件分发**。
8. **许可证不特定于某个产品**。
9. **许可证不限制其他软件**（不能要求捆绑软件也开源）。
10. **技术中立**。

自由软件基金会（FSF）用「四项自由」表述同一件事：**运行、研究、修改、再分发**。OSI 偏商业友好，FSF 偏伦理，但都反对「源码可见但禁止商用」这类限制。

| 类型 | 代码可见 | 可修改 | 可商用 | 可闭源分发 | 例子 |
| --- | --- | --- | --- | --- | --- |
| 开源 | 是 | 是 | 是 | 视许可证 | MIT、Apache-2.0、GPL |
| 源码可见（source-available） | 是 | 也许 | 常有限制 | 否 | BUSL、SSPL、部分「社区版」 |
| 专有 | 否 | 否 | 需授权 | 否 | 商业软件 |
| 免费软件（freeware） | 否 | 否 | 也许 | 否 | 免费下载的闭源工具 |

「源码可见」不等于开源。看到 LICENSE 里写着「仅限非商业使用」「禁止云服务商使用」，它就不是 OSI 认可的开源项目。

### 开源不等于不赚钱

开源的是**许可证**，不是商业模式。常见做法：

| 模式 | 做法 | 例子 |
| --- | --- | --- |
| 托管服务 | 软件免费，卖云托管与运维 | GitLab、Elastic |
| Open Core | 核心开源，企业功能闭源 | 很多基础设施公司 |
| 双许可 | 社区版 GPL，商业版闭源 | MySQL 早期 |
| 支持与咨询 | 卖 SLA、培训、定制 | Red Hat |
| 赞助 | GitHub Sponsors、Open Collective | 个人维护者 |
| 开放标准 + 认证 | 标准免费，认证收费 | 部分协议实现 |

开源项目最常见的死法不是「被白嫖」，而是**维护者耗尽精力**。使用者在提需求前，先想想自己能否贡献文档、复现步骤或赞助。

### 生态里的角色

- **作者 / 维护者（maintainer）**：合并 PR、发版本、处理安全问题。多数是志愿者。
- **贡献者（contributor）**：提交代码、文档、测试、设计、翻译。
- **用户（user）**：提 issue、反馈 bug、写教程。
- **下游（downstream）**：把项目打包进发行版、框架或商业产品。
- **赞助方（sponsor）**：提供资金或基础设施。

一个健康的项目，这几种角色会流动：用户 → 贡献者 → 维护者。

## 许可证：开源项目的法律基础

### 为什么必须有 LICENSE

**没有 LICENSE 的公开仓库，默认是「保留所有权利」。** 别人可以看、可以 fork（GitHub 服务条款允许），但不能合法地复制、修改、分发或在产品里使用。你以为是开源，法律上不是。

许可证解决三件事：**别人能做什么、必须遵守什么、作者不承担什么责任**。所有开源许可证都附带免责声明（AS IS，不提供担保），这是保护作者的，不要删。

### 常见许可证对比

| 许可证 | 类型 | 允许闭源分发 | 主要义务 | 专利授权 |
| --- | --- | --- | --- | --- |
| MIT | 宽松 | 是 | 保留版权与许可声明 | 无明文 |
| BSD-3-Clause | 宽松 | 是 | 保留声明；不得用作者名背书 | 无明文 |
| Apache-2.0 | 宽松 | 是 | 保留声明与 NOTICE；标注修改 | 有 |
| MPL-2.0 | 弱 copyleft（文件级） | 是（可与闭源代码组合） | 修改过的 MPL 文件需继续 MPL | 有 |
| LGPL-3.0 | 弱 copyleft（库级） | 是（动态链接） | 修改库本身需 LGPL；允许重新链接 | 有 |
| GPL-3.0 | 强 copyleft | 否 | 衍生作品整体 GPL，分发时提供源码 | 有 |
| AGPL-3.0 | 强 copyleft + 网络条款 | 否 | 同 GPL；**网络用户有权获取源码** | 有 |
| Unlicense / CC0 | 公有领域 | 是 | 无（CC0 非 OSI 认证，但属自由许可） | 无明文 |

几个容易混淆的点：

- **MIT 简短且宽松**，但要保留版权声明。删掉别人的 LICENSE 再发布是侵权。
- **Apache-2.0 多了专利授权和 NOTICE 要求**，企业法务通常最喜欢；它与 GPL-2.0-only 不兼容，但与 GPL-3.0 兼容。
- **MPL-2.0 是文件级 copyleft**：你改了哪个文件，那个文件要开源；可以和闭源代码放在同一个项目里。
- **LGPL 针对库**：闭源程序可以动态链接 LGPL 库，但用户要能替换库版本；你修改库本身仍要开源。
- **GPL 是整体传染**：分发基于 GPL 代码的衍生作品，整个作品都要按 GPL 提供源码。只在公司内部使用、不分发，则不触发。
- **AGPL 补上了 SaaS 漏洞**：即使用户只是通过网络访问，也有权拿到源码。MongoDB、Elastic 等公司曾用 AGPL 或类似许可证对抗云厂商。
- **GPL-2.0-only 与 GPL-3.0 互不兼容**，混用会有法律风险；`GPL-2.0-or-later` 才能升级到 GPL-3.0。

> 以上是工程视角的常见理解，不构成法律意见。商业使用、许可证兼容性判断、专利诉讼风险，请咨询法务。

### 怎么选

```text
你希望别人怎么用你的代码？
│
├─ 随便用，包括闭源产品
│   ├─ 在意专利保护 ──────────────→ Apache-2.0
│   └─ 越简单越好 ────────────────→ MIT
│
├─ 允许闭源使用，但库的修改要开源
│   └─ 是库/框架 ─────────────────→ LGPL-3.0
│
├─ 衍生作品必须开源
│   ├─ 普通软件 ──────────────────→ GPL-3.0
│   └─ 网络服务也要开源 ──────────→ AGPL-3.0
│
└─ 只要修改过的文件开源，便于和闭源代码共存
    └──────────────────────────────→ MPL-2.0
```

拿不定主意时：

- 想要最大传播、最少摩擦：**MIT**。
- 企业项目、在意专利：**Apache-2.0**。
- 希望改进回流社区、不接受闭源白嫖：**GPL-3.0** 或 **AGPL-3.0**。
- 库/组件，希望被商业软件采用：**MIT** 或 **Apache-2.0**；想强制库的修改回流：**LGPL-3.0**。

### 落地：文件与声明

1. 仓库根目录放 `LICENSE`（或 `LICENSE.md`），内容为许可证全文，**不要只写一句「MIT」**。
2. `README` 底部加一行：`License: MIT`，链接到 `LICENSE`。
3. 包管理器里填 SPDX 标识：

```json
{
  "license": "MIT"
}
```

```toml
# Cargo.toml
license = "MIT OR Apache-2.0"
```

4. 源文件头部可选加 SPDX 短标识，便于扫描工具识别：

```c
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Zhang San
```

5. 第三方代码要保留原许可证，并在 `NOTICE` 或 `THIRD_PARTY_LICENSES` 中列出。**不要把别人的 GPL 代码复制进 MIT 项目。**

### DCO 与 CLA

贡献者提交代码时，项目需要确认「你有权贡献这段代码」。两种机制：

| | DCO（Developer Certificate of Origin） | CLA（Contributor License Agreement） |
| --- | --- | --- |
| 形式 | 提交信息里加 `Signed-off-by` | 签署单独的法律协议 |
| 成本 | 低，`git commit -s` 即可 | 高，需法务审阅，公司贡献还要 CCLA |
| 权利 | 贡献者保留版权 | 可能包含版权转让或专利授权 |
| 使用者 | Linux、Git 等 | Apache、部分企业项目 |

DCO 提交：

```bash
git commit -s -m "docs: fix typo"
# 提交信息末尾自动加：
# Signed-off-by: Zhang San <zhangsan@example.com>
```

名字和邮箱必须与 `git config` 一致。忘了加可以用 `git commit --amend -s` 补，或 `git rebase --signoff <base>` 批量补。

### 商标与专利

许可证只授予**版权和（部分许可证的）专利权**，**不授予商标权**。你可以 fork 代码，但不能继续用原项目的名字和 logo 宣传，否则可能构成混淆。多数项目在 `TRADEMARK.md` 里写明规则。

专利方面：MIT/BSD 没有明文专利授权，Apache-2.0 和 GPL-3.0 有。企业项目通常偏好 Apache-2.0，正是为了这个。

## 参与开源项目

### 先调整预期

- 维护者多数**无偿**且有自己的工作，回复可能慢，也可能拒绝。
- 你的 PR 被要求修改是常态，不是否定你。
- 「帮忙」的前提是不增加对方负担：先搜索、先读文档、先复现。
- 不是所有贡献都要写代码。文档、翻译、测试、复现、设计、答疑同样重要。

### 选一个项目

| 信号 | 健康 | 需谨慎 |
| --- | --- | --- |
| 最近提交 | 几周内 | 一年以上没动 |
| Issue 响应 | 有维护者回复、有标签 | 大量无人处理 |
| PR 合并 | 有外部贡献者被合并 | 只合并自己人 |
| CI | 绿色、有测试 | 没有 CI 或长期红 |
| 文档 | README + CONTRIBUTING 完整 | 只有一句介绍 |
| 许可证 | 明确 | 没有 LICENSE |
| 行为准则 | 有 CODE_OF_CONDUCT | 社区氛围不明 |

找项目的入口：

- GitHub 搜索 `good first issue` + 语言，或 [goodfirstissue.dev](https://goodfirstissue.dev/)
- [up-for-grabs.net](https://up-for-grabs.net/)
- [First Contributions](https://github.com/firstcontributions/first-contributions)：专门练 PR 流程
- 你**日常在用**的库：最有动力，也最容易发现真问题
- Hacktoberfest（每年 10 月）：注意质量，别为凑数提交垃圾 PR

### 读三个文件

1. **README**：项目做什么、怎么装、怎么跑测试。
2. **CONTRIBUTING**：分支命名、提交规范、是否要求 DCO/CLA、PR 流程。
3. **CODE_OF_CONDUCT**：沟通底线。

再看：`docs/`、测试目录、`.github/workflows/`（CI 跑了什么）、最近 20 条提交（风格）、issue 标签（哪些是新手向）。

### 找第一个 issue

优先级从高到低：

1. 文档错别字、失效链接、示例跑不通。
2. 补充测试、复现一个已报告的 bug。
3. 标有 `good first issue` / `help wanted` 的小改动。
4. 你自己使用时遇到的小问题（先搜是否已有人提）。

选定后先留言认领，避免和别人撞车：

```text
Hi! I'd like to work on this if it's still available.
I'm planning to fix X by doing Y. Could you assign it to me?
```

中文：如果项目主要用中文交流，就直接用中文；不确定时用英文，简短清楚即可。

**大改动先讨论。** 想重构核心模块、加一个新依赖、改公共 API，先在 issue 里说明方案，等维护者点头再动手。直接甩一个 2000 行的 PR，大概率会被关闭。

### 一次完整的贡献流程

```bash
# 1. Fork + 克隆（gh 会自动配置 origin）
gh repo fork owner/project --clone
cd project

# 2. 确认 upstream 并同步（gh 通常已自动添加，已存在就别重复 add）
git remote -v
git remote add upstream git@github.com:owner/project.git   # 已存在会报错，可跳过
git fetch upstream
git switch main
git merge --ff-only upstream/main

# 3. 开分支
git switch -c docs/fix-install-typo

# 4. 修改并本地验证
#    按 CONTRIBUTING 的要求跑测试、lint、构建
npm ci
npm test

# 5. 提交（项目要求 DCO 就加 -s）
git add README.md
git commit -s -m "docs: fix npm install typo in quickstart"

# 6. 推送
git push -u origin docs/fix-install-typo

# 7. 开 PR
gh pr create --repo owner/project \
  --base main \
  --head yourname:docs/fix-install-typo \
  --title "docs: fix npm install typo in quickstart" \
  --body "修正快速开始里的 \`npm instal\` 拼写错误。本地已按文档执行验证。Closes #123"
```

PR 发出去后：

- CI 红了先自己看日志，别等维护者指出。
- 评审意见逐条处理。改完推送新提交即可；如果项目要求，再 rebase/squash。
- 不要频繁 force push 打断评审；需要时先说明。
- 合并后删分支，并同步 `main`。

### PR 描述模板

```markdown
## What changed
一句话说明改动。

## Why
关联 issue，说明动机和用户影响。Closes #123。

## How tested
- [ ] 单元测试 `npm test`
- [ ] 手动验证步骤
- [ ] 文档预览

## Screenshots / logs
（UI 改动附前后对比；bug 修复附修复前后日志）

## Notes
已知限制、后续计划、需要维护者决定的问题。
```

### 回应评审

| 场景 | 英文模板 | 中文意思 |
| --- | --- | --- |
| 已修复 | Thanks for the review! I've addressed this in `abc1234`. | 已在 abc1234 修复 |
| 请求澄清 | I'm not sure I follow — could you point me to the expected behavior? | 没太理解，能否说明期望行为？ |
| 解释取舍 | I kept X because Y. Happy to change it if you prefer Z. | 因为 Y 保留了 X；如果你更想要 Z 我可以改 |
| 拆分建议 | Good point. Would you like me to split this into a separate PR? | 要不要拆成独立 PR？ |
| 礼貌催问 | Friendly ping — is there anything else needed from my side? | 友好提醒，还需要我做什么吗？ |
| 关闭 | Closing this in favor of #456, which takes a different approach. | 改为在 #456 处理，关闭本 PR |
| 感谢 | Thanks for the quick review and the detailed feedback! | 感谢快速评审和详细反馈 |

沟通原则：

- **对代码不对人**，不解读语气，不用讽刺。
- 每条评论都给明确回应：改了、不改（附理由）、或提问。
- 不要求维护者「马上 merge」。等 1–2 周是正常的。
- 不要在公共 issue 里 @ 维护者催更，更不要私信。
- 如果项目长期无响应，礼貌留言一次后可以转向 fork 维护或别的项目。

### 非代码贡献

| 类型 | 具体做什么 |
| --- | --- |
| 文档 | 修错别字、补示例、翻译、写迁移指南 |
| 测试 | 补边界用例、提高覆盖率、整理测试数据 |
| 复现 | 按模板补环境信息、最小复现仓库 |
| 分类 | 给 issue 打标签、去重、关停无效 issue（需权限） |
| 设计 | Logo、图标、文档排版、可访问性 |
| 社区 | 答疑、组织线上分享、写教程 |
| 资金 | GitHub Sponsors、Open Collective、基础设施捐赠 |

这些贡献往往比一个仓促的代码 PR 更受欢迎。

### 礼仪与边界

- 提问前先搜 issue、文档、FAQ；不要问「怎么用」这种 README 里有的问题。
- 一个 issue 只谈一件事，不要 hijack 别人的 issue。
- 贴日志用代码块，别贴整屏截图；敏感信息先打码。
- 不催更、不刷屏、不群发求助。
- 接受「不合并」：维护者有权拒绝任何 PR，哪怕它技术上正确。
- 遵守行为准则；被冒犯时可以走举报渠道，而不是对骂。

### AI 辅助的红线

2026 年，多数项目已经遇到过低质量 AI 生成 PR。参与开源时注意：

1. **先看项目政策**。有的项目要求声明 AI 使用，有的直接禁止。
2. **自己读懂每一行**。你提交的代码由你负责，不能以「AI 写的」为借口。
3. **验证来源与许可证**。让模型复述受版权保护的代码，可能引入许可证污染。
4. **别批量刷 PR**。用 AI 扫一遍仓库生成几十个「改进」，是对维护者的骚扰。
5. **PR 描述不要用 AI 味套话**，说清你实际验证了什么。
6. **安全类改动尤其谨慎**，AI 可能引入看似合理实则可利用的代码。

诚实的做法：在 PR 里说明「使用了 AI 辅助生成初稿，已人工验证测试」，比隐瞒更可信。

## 开源自己的项目

### 发布前检查清单

| 文件 / 设置 | 作用 | 建议 |
| --- | --- | --- |
| `README.md` | 项目门面：是什么、怎么装、怎么用 | 必需 |
| `LICENSE` | 法律授权，没有就不是开源 | 必需 |
| `.gitignore` | 排除依赖、产物、密钥 | 必需 |
| `CONTRIBUTING.md` | 开发环境、测试、提交与 PR 规则 | 强烈建议 |
| `CODE_OF_CONDUCT.md` | 社区行为底线 | 公开社区建议 |
| `SECURITY.md` | 漏洞私下报告渠道 | 有用户后必需 |
| `CHANGELOG.md` | 每个版本改了什么 | 建议 |
| `.gitattributes` | 换行符、二进制、语言统计 | 建议 |
| `.github/ISSUE_TEMPLATE/` | 统一 issue 信息 | 建议 |
| `.github/pull_request_template.md` | 统一 PR 信息 | 建议 |
| `.github/workflows/` | CI：测试、lint、构建 | 建议 |
| `CODEOWNERS` | 目录负责人 | 多人项目建议 |
| `GOVERNANCE.md` | 决策机制 | 大型项目 |
| `FUNDING.yml` | 赞助入口 | 可选 |

### README：前 30 秒决定别人是否用

````markdown
# my-cli

一句话说明它解决什么问题。

[![CI](https://github.com/you/my-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/you/my-cli/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 为什么需要它

现有方案的两个痛点，以及本项目的取舍。

## 安装

```bash
npm install -g my-cli
```

## 快速开始

```bash
my-cli build --watch
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `my-cli init` | 初始化配置 |
| `my-cli build` | 构建 |

## 配置

配置文件 `.myclirc` 的字段说明。

## 文档

- [完整文档](https://example.com/docs)
- [常见问题](docs/faq.md)

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。提交前请跑 `npm test`。

## 许可证

[MIT](LICENSE) © 2026 Your Name
````

要点：

- 开头一句话说清「给谁、解决什么」，不要从项目历史讲起。
- 给出**能直接复制运行**的最小示例。
- 截图或 GIF 对工具类项目非常有效，但别放体积巨大的图。
- 徽章别堆十几个，CI、版本、许可证足够。
- 中文项目可以中英双语，但命令和代码注释保持英文更通用。

### CONTRIBUTING：降低参与门槛

至少写清：

1. 本地开发环境（运行时版本、包管理器）。
2. 安装依赖、跑测试、跑 lint 的命令。
3. 分支命名与提交信息规范。
4. 是否要求 DCO（`git commit -s`）或签 CLA。
5. PR 流程：先开 issue 还是直接提 PR、需要几个审批、CI 要求。
6. 代码风格与格式化命令。

````markdown
## 开发

要求 Node.js >= 20。

```bash
npm ci
npm test
npm run lint
```

## 提交

使用 Conventional Commits。提交需签名：`git commit -s`。

## PR

- 先开 issue 讨论较大改动。
- 一个 PR 只做一件事。
- 合并前需通过 CI 和至少一个维护者审批。
````

### 行为准则与安全策略

- `CODE_OF_CONDUCT.md` 可直接采用 [Contributor Covenant 2.1](https://www.contributor-covenant.org/zh-cn/version/2/1/code_of_conduct/) 中文版，并写明举报邮箱。
- `SECURITY.md` 写清：支持哪些版本、如何私下报告、预计多久回复、是否提供致谢。

```markdown
# 安全策略

## 支持版本

| 版本 | 支持 |
| --- | --- |
| 2.x | 是 |
| 1.x | 仅安全修复 |

## 报告漏洞

请发送邮件至 security@example.com，不要公开提 issue。
我们会在 3 个工作日内确认，30 天内给出修复计划。
```

GitHub 仓库开启 **Private vulnerability reporting** 后，研究者可以直接在平台上私下提交。

### 变更日志与语义化版本

版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH`。

| 变更 | 版本位 | 例子 |
| --- | --- | --- |
| 不兼容的 API 改动 | MAJOR | `1.4.2 → 2.0.0` |
| 向后兼容的新功能 | MINOR | `1.4.2 → 1.5.0` |
| 向后兼容的修复 | PATCH | `1.4.2 → 1.4.3` |

`0.y.z` 表示开发初期，API 随时可变；一旦有用户依赖，尽快发 `1.0.0`。预发布用 `1.0.0-rc.1`，构建元数据用 `1.0.0+build.5`。

`CHANGELOG.md` 采用 [Keep a Changelog](https://keepachangelog.com/zh-CN/) 结构：

```markdown
# Changelog

## [Unreleased]

### Added
- 支持 `--watch` 模式

## [1.2.0] - 2026-03-01

### Added
- 新增 `my-cli init` 命令

### Fixed
- 修复 Windows 路径含空格时的崩溃

### Changed
- 默认配置文件名改为 `.myclirc`

[Unreleased]: https://github.com/you/my-cli/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/you/my-cli/compare/v1.1.0...v1.2.0
```

### Issue 与 PR 模板

`.github/ISSUE_TEMPLATE/bug_report.yml`：

```yaml
name: Bug report
description: 报告一个可复现的问题
labels: [bug]
body:
  - type: markdown
    attributes:
      value: 请先搜索是否已有相同 issue。
  - type: input
    id: version
    attributes:
      label: 版本
      placeholder: v1.2.0
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: 复现步骤
      placeholder: |
        1. 执行 ...
        2. 传入 ...
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 期望行为
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: 日志
      render: shell
```

PR 模板见前文「PR 描述模板」，可直接放到 `.github/pull_request_template.md`。

### CI 与自动化

最低配一档：

```yaml
name: CI
on: [push, pull_request]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

再往上加：

| 能力 | 工具 |
| --- | --- |
| 多平台矩阵 | `strategy.matrix`（ubuntu / windows / macos） |
| 多语言版本 | `matrix.node-version` / `python-version` |
| 依赖升级 | Dependabot / Renovate |
| 代码扫描 | CodeQL、ESLint、ruff |
| 覆盖率 | Codecov、Coveralls |
| 自动发版 | changesets、semantic-release、release-please |
| 文档部署 | GitHub Pages |

CI 的意义不只是「跑测试」，更是让陌生贡献者敢改代码：他们能立刻知道有没有破坏东西。

### 发布一个版本

```bash
# 1. 更新版本号与 CHANGELOG
npm version minor          # 会自动改 package.json 并打 tag（也可手动）
# 2. 推送提交与标签
git push && git push --tags
# 3. 建 GitHub Release
gh release create v1.3.0 --generate-notes
```

发布前检查：

- [ ] CI 全绿，主分支可构建
- [ ] CHANGELOG 已更新
- [ ] 版本号符合语义化规则
- [ ] 安装包 / 二进制已在干净环境验证
- [ ] 破坏性变更已写迁移说明
- [ ] 安全公告（如有）已准备

发布 npm 包时优先使用 **Trusted Publishing（OIDC）**，避免长期 token；至少开启 2FA，并用 `npm publish --provenance` 生成来源证明。

### 治理与可持续

- **决策机制**：一个人（BDFL）、核心团队、还是委员会？写进 `GOVERNANCE.md`，避免争议时没有依据。
- **角色**：contributor → reviewer → maintainer，权限逐级授予。
- **路线图**：用 Projects 或 `ROADMAP.md` 公开方向，减少重复提议。
- **说「不」**：不合适的 PR、超出范围的功能、无复现的 issue，都可以礼貌关闭。维护者没有无限义务。
- **防止倦怠**：设定响应预期（如「工作日 3 天内」）、批量处理、招募共同维护者、使用模板减少重复沟通。
- **资金**：GitHub Sponsors、Open Collective、Tidelift；钱不能解决一切，但能买时间。
- **交接**：长期不维护时，明确归档（archive）或寻找新维护者，别让用户以为还在维护。

### 供应链安全

开源维护者是供应链攻击的高价值目标。基础措施：

1. GitHub、npm、PyPI 账号全部开启 **2FA**，使用硬件密钥更佳。
2. 使用**最小权限**的 CI token；`GITHUB_TOKEN` 默认只读，需要写时显式声明。
3. 第三方 action **固定到 commit SHA**，不要用可变的 `@master`。
4. 开启 **secret scanning + push protection**，防止密钥进仓库。
5. 开启 **Dependabot alerts**，及时修已知漏洞。
6. 提交 lockfile，CI 用 `npm ci` / `pip install -r` + hash 校验，避免依赖漂移。
7. 审核新依赖：拼写仿冒（typosquatting）、维护者突然变更、安装脚本执行任意代码。
8. 不运行来自不可信 PR 的代码，尤其不要在带 secrets 的 `pull_request_target` 里 checkout PR 代码。
9. 高危项目考虑签名发布、SBOM、SLSA 级别、OpenSSF Scorecard。
10. 记住：**Git hooks 不是安全边界**，可以被 `--no-verify` 绕过；真正的门禁在 CI 和分支保护。

## 常见坑与排查

### 症状速查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 整个文件显示被修改 | CRLF / LF 不一致 | `.gitattributes` + `git add --renormalize .` |
| 中文文件名变成 `\344\270...` | `core.quotepath` 默认转义 | `git config --global core.quotepath false` |
| push 报 `file is 120 MB` | 超过 GitHub 单文件 100 MiB 限制 | 用 LFS 或从历史中移除 |
| push 报 `non-fast-forward` | 远程有新提交 | `git pull --rebase` 后重推 |
| 提示 `Please tell me who you are` | 没配 `user.name/email` | `git config --global user.email ...` |
| 提示要输入密码 | GitHub 不支持账号密码 | 用 SSH 或 PAT |
| `src refspec main does not match any` | 还没有提交，或分支叫 master | 先 commit，再 `git branch -M main` |
| `refusing to merge unrelated histories` | 两个独立初始化的仓库 | 确认后加 `--allow-unrelated-histories` |
| `detected dubious ownership` | 仓库属主与当前用户不一致 | `git config --global --add safe.directory <path>` |
| `Your branch is ahead by N commits` | 本地有未推送提交 | `git push` |
| 提交时打开 vim 不会退出 | 默认编辑器是 vim | 按 `Esc` 输入 `:wq` 回车；或配置 `core.editor` |
| 合并后旧分支 push 被拒 | Squash 合并导致历史分叉 | 删掉旧分支，从最新 main 重开 |
| 大小写重命名不生效 | 文件系统大小写不敏感 | `git mv --force Old.txt new.txt` |
| `.env` 仍在版本库 | 已被跟踪，`.gitignore` 对已跟踪文件无效 | `git rm --cached .env` 后提交 |
| `stash` 后新文件不见了 | 默认不包含未跟踪文件 | `git stash -u` |
| `git clean` 删掉了重要文件 | 未跟踪文件不进回收站 | 无法恢复；下次先 `git clean -nd` |
| 子模块目录是空的 | 没初始化 | `git submodule update --init --recursive` |
| 浅克隆看不到完整历史 | `--depth` 只取部分提交 | `git fetch --unshallow` |
| CI 里 push 报 403 | `GITHUB_TOKEN` 只读 | 显式 `permissions: contents: write` |
| fork 的 PR 拿不到 secrets | 安全设计，fork PR 不注入密钥 | 改用受控流程，勿滥用 `pull_request_target` |

### 换行符把整个文件都改了

Windows 编辑器可能把 LF 转成 CRLF，Git 就认为每一行都变了。三步修复：

```bash
# 1. 仓库根目录加 .gitattributes
printf '* text=auto eol=lf\n*.bat text eol=crlf\n' > .gitattributes

# 2. 按新规则重新规范化
git add .gitattributes
git add --renormalize .

# 3. 单独提交这次格式统一
git commit -m "chore: normalize line endings"
```

团队成员先拉取这次提交，再继续开发，避免反复冲突。

### 大文件与 Git LFS

GitHub 对单个文件有硬限制：**超过 100 MiB 拒绝推送**，超过 50 MiB 会警告。Git 也不适合存二进制，因为每次修改都会存一份完整副本。

```bash
git lfs install
git lfs track "*.psd"
git lfs track "*.zip"
git add .gitattributes
git add design.psd
git commit -m "assets: add design source"
```

已提交进历史的大文件，需要用 `git lfs migrate` 或 `git filter-repo` 重写历史：

```bash
# 把历史中的 *.psd 转成 LFS（会改写提交，需强推并通知协作者）
git lfs migrate import --include="*.psd" --everything
```

如果文件根本不该进仓库（构建产物、数据集），直接移除更合适：

```bash
git filter-repo --path big-data.zip --invert-paths
```

`git filter-repo` 需要单独安装（`pip install git-filter-repo` 或 `brew install git-filter-repo`），它是官方推荐的替代方案，比 `git filter-branch` 快且不易出错。注意两点：**filter-repo 默认会移除 `origin` 远程**，清理完要重新 `git remote add`；对不是刚克隆的仓库，它可能要求加 `--force`。历史重写后，所有人必须重新克隆或重置本地分支。

### 密钥泄露了怎么办

**第一件事不是删文件，而是立即作废密钥。**

```bash
# 1. 立刻在服务商后台吊销 / 轮换该密钥
# 2. 从当前版本移除
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "chore: remove leaked env file"

# 3. 从历史中彻底删除（会移除 origin 远程）
git filter-repo --path .env --invert-paths

# 4. 重新添加远程，强制推送所有分支与标签
git remote add origin git@github.com:username/repo.git
git push --force --all
git push --force --tags
```

注意：

- `git rm --cached` **只影响后续提交**，历史里仍然能查到。
- 强制推送后，GitHub 的缓存、fork、CI 日志、别人本地的克隆仍可能有副本。敏感度高的密钥要联系 GitHub Support 清理缓存，并假定它已泄露。
- 检查 CI 日志、issue、PR 评论里是否也贴过密钥。
- 预防：开启 secret scanning + push protection，提交前用 `gitleaks` / `trufflehog` 扫描。

### detached HEAD

```text
Note: switching to 'a1b2c3d'.

You are in 'detached HEAD' state.
```

HEAD 没有指向任何分支，而是直接指向某个提交。常见于 `git checkout <sha>`、`git checkout v1.0.0`。此时可以看代码、跑测试，但**新提交不属于任何分支**，切走后容易丢。

```bash
# 如果只是想看看，回到分支即可
git switch main

# 如果已经提交了，先建分支接住
git switch -c rescue-work
```

### Squash 合并后的分支不能再复用

Squash 把多个提交压成一个新提交放到 main，原分支的提交并没有进入 main 的历史。此时：

```text
main:    A --- B --- S        （S 是压缩后的新提交）
feature: A --- B --- D --- E  （原提交）
```

再在 feature 上提交并开 PR，会重复包含 D、E 的改动。正确做法：

```bash
git switch main
git pull
git branch -D feature/old
git switch -c feature/new
```

### 冲突：锁文件不要手工合并

`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`Cargo.lock` 冲突时，手改几乎必错。做法是：

```bash
# 选一边作为基础（通常选目标分支）
git checkout --ours package-lock.json
# 重新生成，让工具算出正确结果
npm install
git add package-lock.json
git commit
```

rebase 时 `ours` / `theirs` 含义相反，先 `git status` 看清当前操作。更稳妥的方式是：选任意一边，删掉锁文件，重新安装生成。

### 找回被删的分支或提交

```bash
git reflog
# 找到目标提交的哈希
git switch -c recovered <sha>
```

如果 reflog 也没有：

```bash
git fsck --full --no-reflogs --unreachable | grep commit
git show <sha>
```

### 仓库太大、status 太慢

```bash
git clone --depth 1 <url>                 # 只要最新快照
git clone --filter=blob:none <url>        # 部分克隆，按需下载文件内容
git status --untracked-files=no           # 忽略未跟踪文件
git config core.fsmonitor true            # 开启文件系统监视（Git 2.37+）
git sparse-checkout set src/ docs/        # 只检出需要的目录
```

`sparse-checkout` 适合超大 monorepo：只把需要的子目录放到工作区，历史仍然完整。

### 子模块与 worktree

子模块（submodule）是「仓库里的另一个仓库」，适合引用第三方代码，但坑较多：

```bash
git clone --recurse-submodules <url>
git submodule update --init --recursive
git submodule update --remote            # 把子模块更新到远程最新
```

如果只是想同时开发两个分支，不需要子模块，用 worktree 更轻：

```bash
git worktree add ../hotfix main
cd ../hotfix
# 这里是 main 的独立工作区，和原目录共享同一个 .git
git worktree list
git worktree remove ../hotfix
```

### 用 bisect 定位「哪个提交引入了 bug」

```bash
git bisect start
git bisect bad                 # 当前版本有问题
git bisect good v1.2.0         # 这个版本正常
# Git 会切到中间提交，测试后标记
git bisect good                # 或 git bisect bad
# 重复 log2(N) 次，Git 指出第一个坏提交
git bisect reset
```

自动化：

```bash
git bisect run npm test
```

## 一页速查

### 配置与初始化

| 命令 | 说明 |
| --- | --- |
| `git config --global user.name/email` | 配置提交身份 |
| `git config --list --show-origin` | 查看所有配置来源 |
| `git init -b main` | 初始化仓库，主分支为 main |
| `git clone <url>` | 克隆远程仓库 |
| `git remote add origin <url>` | 添加远程 |

### 日常提交

| 命令 | 说明 |
| --- | --- |
| `git status -s` | 紧凑状态 |
| `git diff` | 未暂存改动 |
| `git diff --staged` | 已暂存改动 |
| `git add -p` | 交互式暂存 |
| `git commit -m "..."` | 提交 |
| `git commit --amend` | 修改上一次提交 |
| `git log --oneline --graph --all` | 查看分支图 |
| `git show <sha>` | 查看某次提交 |

### 分支与合并命令

| 命令 | 说明 |
| --- | --- |
| `git switch -c <branch>` | 新建并切换 |
| `git switch <branch>` | 切换 |
| `git branch -vv` | 分支与跟踪关系 |
| `git merge <branch>` | 合并 |
| `git rebase <branch>` | 变基 |
| `git rebase -i HEAD~3` | 整理最近 3 个提交 |
| `git cherry-pick <sha>` | 摘取单个提交 |
| `git branch -d <branch>` | 删除已合并分支 |

### 远程协作

| 命令 | 说明 |
| --- | --- |
| `git fetch --prune` | 拉取远程并清理失效分支 |
| `git pull --rebase` | 拉取并变基 |
| `git push -u origin <branch>` | 首次推送并建立跟踪 |
| `git push --force-with-lease` | 更安全的强制推送 |
| `git push origin --delete <branch>` | 删除远程分支 |
| `git remote add upstream <url>` | 添加上游仓库（fork 场景） |
| `git branch -u origin/main` | 设置上游分支 |

### 撤销与恢复

| 命令 | 说明 |
| --- | --- |
| `git restore <file>` | 丢弃工作区改动 |
| `git restore --staged <file>` | 取消暂存 |
| `git reset --soft HEAD~1` | 撤销提交，保留暂存 |
| `git reset --hard HEAD~1` | 彻底撤销提交（危险） |
| `git revert <sha>` | 反向提交，安全撤销已推送 |
| `git reflog` | 查看 HEAD 移动历史 |
| `git clean -nd` → `git clean -fd` | 清理未跟踪文件 |

### stash 与 tag

| 命令 | 说明 |
| --- | --- |
| `git stash -u` | 收起改动（含未跟踪） |
| `git stash pop` | 恢复并删除记录 |
| `git stash list` | 查看 |
| `git tag -a v1.0.0 -m "..."` | 附注标签 |
| `git push origin v1.0.0` | 推送标签 |

### GitHub CLI

| 命令 | 说明 |
| --- | --- |
| `gh auth login` | 登录 |
| `gh repo create --source=. --push` | 从本地创建仓库并推送 |
| `gh repo fork owner/repo --clone` | Fork 并克隆 |
| `gh pr create --fill` | 创建 PR |
| `gh pr checkout <n>` | 检出 PR 到本地 |
| `gh pr merge <n> --squash --delete-branch` | Squash 合并并删分支 |
| `gh run watch` | 跟踪 CI |
| `gh release create <tag> --generate-notes` | 创建 Release |

## 学习路径

### 五天入门

| 天 | 目标 | 练习 |
| --- | --- | --- |
| 第 1 天 | 装好、配好、会提交 | 建本地仓库，完成 5 次提交，用 `log` / `diff` / `show` 查看 |
| 第 2 天 | 理解分支与合并 | 开两个分支改同一文件，制造冲突并解决；再练一次 rebase |
| 第 3 天 | 连上 GitHub | 建远程仓库、推送、开分支、发 PR、合并、删分支 |
| 第 4 天 | 会撤销、会整理 | 练 `restore` / `reset` 三模式 / `revert` / `reflog` 救回提交；用 `rebase -i` 压缩提交 |
| 第 5 天 | 参与一次真实开源 | 给一个项目的文档提 PR，走完 review 到合并 |

### 练习项目

1. **本地全流程**：初始化 → 10 次提交 → 两个分支 → 冲突 → 合并 → `rebase -i` 压缩 → `reflog` 找回删掉的分支。
2. **模拟团队协作**：用两个 GitHub 账号（或一个账号 + fork）走一遍 fork → PR → review → squash merge。
3. **修一次真实文档**：在 [First Contributions](https://github.com/firstcontributions/first-contributions) 或你常用的库上提交拼写修复。
4. **发布一个开源项目**：README + LICENSE + CONTRIBUTING + CI + tag + Release，完整走一遍。
5. **事故演练**：在废弃仓库里提交一个假密钥，用 `filter-repo` 清理历史，体会强制推送的影响。

### 进阶主题

| 主题 | 用途 | 入口 |
| --- | --- | --- |
| `git worktree` | 同时检出多个分支 | `git worktree --help` |
| `git bisect` | 二分定位回归 | `git bisect run <cmd>` |
| `git hooks` | 提交前 lint / 格式化 | `.git/hooks/`、Husky、pre-commit |
| 提交签名 | 证明提交来自你 | GPG 或 SSH 签名 |
| Git LFS | 管理大二进制文件 | `git lfs track` |
| 子模块 / subtree | 引用其他仓库 | `git submodule` |
| `filter-repo` | 重写历史、清理大文件 | `git filter-repo` |
| 部分克隆 / 稀疏检出 | 超大仓库 | `--filter=blob:none`、`sparse-checkout` |
| rerere | 复用冲突解法 | `git config rerere.enabled true` |
| GitHub Actions | 自动化测试与发布 | `.github/workflows/` |

### 学习建议

- **先在本地玩坏**。建一个 `sandbox` 仓库，随便 reset、rebase、删分支，用 `reflog` 救。怕出错是因为不熟，不是 Git 危险。
- **不要背命令**，记住三个区域和「提交是不可变快照」，命令可以查。
- **读 Pro Git 第 2、3 章**，足够覆盖 90% 日常操作；第 6、7 章讲 GitHub 与高级工具。
- **看真实仓库的历史**。找一个你喜欢的开源项目，`git log --oneline --graph` 看别人怎么组织提交和合并。
- **每次提交前问自己**：这条提交能单独回滚吗？信息三个月后还看得懂吗？

## 官方参考

**Git**

- [Pro Git 中文版](https://git-scm.com/book/zh/v2)（免费，最权威）
- [Git 官方文档](https://git-scm.com/docs)
- [Git 参考手册](https://git-scm.com/docs/git)
- [Learn Git Branching](https://learngitbranching.js.org/?locale=zh_CN)（交互式练习分支）
- [Oh Shit, Git!?! 中文](https://ohshitgit.com/zh)（常见事故自救）
- [Dangit, Git!?!](https://dangitgit.com/)（英文版）
- [gitignore 模板](https://github.com/github/gitignore)

**GitHub**

- [GitHub 中文文档](https://docs.github.com/zh)
- [GitHub Actions 文档](https://docs.github.com/zh/actions)
- [GitHub CLI 手册](https://cli.github.com/manual/)
- [GitHub Skills](https://skills.github.com/)（官方交互课程）
- [First Contributions](https://github.com/firstcontributions/first-contributions)（练手 PR）

**开源**

- [Open Source Guides 中文](https://opensource.guide/zh-hans/)（GitHub 官方开源指南）
- [Open Source Definition](https://opensource.org/osd)
- [Choose a License](https://choosealicense.com/)（许可证选择器）
- [SPDX License List](https://spdx.org/licenses/)（许可证标准标识）
- [GNU 许可证问答](https://www.gnu.org/licenses/gpl-faq.zh-cn.html)
- [Contributor Covenant 中文](https://www.contributor-covenant.org/zh-cn/)
- [Semantic Versioning 中文](https://semver.org/lang/zh-CN/)
- [Keep a Changelog 中文](https://keepachangelog.com/zh-CN/)
- [Conventional Commits 中文](https://www.conventionalcommits.org/zh-hans/)
- [Good First Issue](https://goodfirstissue.dev/)
- [Up For Grabs](https://up-for-grabs.net/)
- [OpenSSF](https://openssf.org/)（开源供应链安全）

> 最后提醒：Git 的所有「高级操作」都建立在三个区域和提交图之上。遇到不懂的现象，先画一下当前的分支指针和三个区域，再决定用哪条命令，比背一堆急救命令更可靠。

