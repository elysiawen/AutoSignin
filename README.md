# AutoSignin 自动签到平台

一个支持多平台自动签到的 Web 管理平台，支持米游社、HoYoLAB、库街区、塔吉多、森空岛。

## 功能特性

- 🔐 用户注册/登录系统（NextAuth v5 + JWT + bcrypt）
- 👑 管理员后台（用户管理、全局监控、系统设置、通知渠道管理）
- 📦 多平台账号管理
- 🎮 游戏签到（原神、崩坏3、星穹铁道、绝区零、鸣潮、战双、明日方舟、终末地等）
- 🏠 社区任务（签到、看帖、点赞、分享、获取金币/米游币）
- ☁️ 云游戏签到（云原神、云绝区零）
- ⏰ 定时任务调度（Cron 表达式）
- 📊 执行日志记录（含详细日志展开）
- 🔔 通知推送（Telegram、Discord、QQ OneBot）
- 🛡️ 安全防护（频率限制、中间件鉴权、数据加密）
- 🖥️ 现代化响应式 Web 界面（暗色/亮色主题）

## 支持平台

| 平台 | 游戏签到 | 社区任务 | 云游戏 |
|------|----------|----------|--------|
| 米游社（国服） | ✅ 原神/崩坏3/星穹铁道/绝区零等 | ✅ | ✅ 云原神/云绝区零 |
| HoYoLAB（国际服） | ✅ 原神/崩坏3/星穹铁道/绝区零 | - | - |
| 库街区 | ✅ 鸣潮/战双 | ✅ | - |
| 塔吉多 | ✅ 签到/游戏签到/金币任务 | ✅ | ✅ 云异环时长签到 |
| 森空岛 | ✅ 明日方舟/终末地 | - | - |

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TailwindCSS 4
- **后端**: Next.js API Routes + Middleware
- **数据库**: PostgreSQL + Prisma ORM 7
- **认证**: NextAuth.js v5 (JWT)
- **定时任务**: node-cron
- **加密**: AES-256-GCM（凭证）+ bcrypt（密码）+ mima-kit（森空岛签名）
- **通知**: Telegram Bot / Discord Webhook / QQ OneBot

## 快速开始

### 1. 环境要求

- Node.js 20+
- npm 10+
- PostgreSQL 14+

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

先复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell 也可以使用：

```powershell
Copy-Item .env.example .env
```

至少需要配置以下字段：

```env
# 数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/autosign?schema=public"

# 本地开发地址
NEXTAUTH_URL="http://localhost:3000"

# NextAuth 密钥，建议使用 openssl rand -base64 32 生成
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# 数据加密密钥，建议使用 openssl rand -hex 16 生成
ENCRYPTION_KEY="your-32-char-encryption-key-here"

# 反向代理 / 部署环境建议保留
AUTH_TRUST_HOST=true
```

可选邮件配置：

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="AutoSignin <noreply@example.com>"
```

> 忘记密码和邮箱验证码依赖 SMTP；如果暂时不用这两个功能，可以先不填邮件配置。

### 4. 初始化数据库

首次启动前执行：

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

说明：

- `npx prisma generate`：生成 Prisma Client
- `npx prisma db push`：将当前 schema 同步到数据库
- `npm run db:seed`：创建默认管理员账号 `admin@autosign.com / admin123`

### 5. 启动开发环境

```bash
npm run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000)，使用默认管理员账号登录。

> ⚠️ 首次登录后请立即修改默认管理员密码。

## 项目结构

```
autosign-platform/
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 默认管理员种子
├── src/
│   ├── app/
│   │   ├── admin/              # 管理后台页面
│   │   │   ├── accounts/       # 全局账号管理
│   │   │   ├── logs/           # 执行日志
│   │   │   ├── notifications/  # 通知渠道管理
│   │   │   ├── settings/       # 系统设置
│   │   │   ├── tasks/          # 全局任务管理
│   │   │   └── users/          # 用户管理
│   │   ├── api/
│   │   │   ├── accounts/       # 账号 CRUD
│   │   │   ├── admin/          # 管理员 API
│   │   │   ├── auth/           # 认证（登录/注册）
│   │   │   ├── notifications/  # 通知相关 API
│   │   │   ├── scheduler/      # 调度器
│   │   │   ├── tasks/          # 任务 CRUD + 执行
│   │   │   ├── tools/          # 工具（设备管理等）
│   │   │   └── user/           # 用户设置
│   │   ├── auth/               # 登录/注册页面
│   │   └── dashboard/          # 用户仪表盘
│   │       ├── accounts/       # 账号管理
│   │       ├── notifications/  # 通知绑定
│   │       ├── settings/       # 个人设置
│   │       ├── tasks/          # 任务管理
│   │       └── tools/          # 工具箱
│   ├── components/             # UI 组件
│   │   ├── layouts/            # 侧边栏、头部
│   │   ├── tools/              # 工具弹窗
│   │   └── ui/                 # 通用组件（Modal、Toast、Confirm 等）
│   ├── lib/
│   │   ├── auth.ts             # NextAuth 配置
│   │   ├── icons.ts            # 平台/任务图标映射
│   │   ├── logger.ts           # 请求级日志收集器
│   │   ├── prisma.ts           # Prisma 单例
│   │   ├── rate-limit.ts       # 频率限制
│   │   ├── scheduler.ts        # 定时任务调度
│   │   └── utils.ts            # 加密/哈希工具
│   └── services/
│       ├── kuro/               # 库街区签到
│       ├── mihoyo/             # 米哈游签到
│       ├── notification/       # 通知推送（Telegram/Discord/OneBot）
│       ├── skland/             # 森空岛签到（明日方舟/终末地）
│       ├── taygedo/            # 塔吉多签到
│       └── task-executor.ts    # 任务执行器（统一入口）
└── public/icons/               # 平台图标
```

## 使用说明

### 添加账号

在「账号管理」页面添加平台账号：

- **米游社**: 需要 Cookie（必填）+ Stoken（社区任务需要）
- **HoYoLAB**: 需要 Cookie
- **库街区**: 需要 Token（通过工具箱获取）
- **塔吉多**: 支持 Token 模式或手机号+密码登录
- **森空岛**: 需要鹰角 Token（通过工具箱 QR 扫码获取）

### 创建任务

在「任务管理」页面为账号创建签到任务，支持设置 Cron 定时表达式。

### 通知推送

在管理后台「通知渠道」创建推送渠道（Telegram / Discord / QQ），然后在用户侧「通知管理」绑定渠道并选择接收的事件类型（成功/失败/验证码）。

### 管理后台

管理员可在侧边栏进入「管理后台」：
- 系统概览（用户数、账号数、任务数、今日执行统计）
- 用户管理（编辑角色、重置密码、删除）
- 全局账号/任务管理
- 全局执行日志
- 通知渠道管理（Telegram / Discord / QQ OneBot）
- 系统设置（调度器状态、KV 配置管理）

## 获取凭证

### 米游社 Cookie

1. 浏览器无痕模式打开 https://www.miyoushe.com/ys/ 并登录
2. F12 → Network → 筛选 `getUserGameUnreadCount`
3. 复制请求中的 Cookie

### 米游社 Stoken

使用 [mihoyo_login](https://github.com/Womsxd/mihoyo_login) 获取。

### HoYoLAB Cookie

1. 浏览器无痕模式打开 https://act.hoyolab.com/ 并登录
2. F12 → Console → 输入 `document.cookie`
3. 复制从 `ltoken=` 开始的内容

### 库街区 Token

使用工具箱中的「库街区登录」工具获取。

### 塔吉多 Token

使用 [taygedo-auto-attendance](https://github.com/mxyooR/taygedo-auto-attendance) 项目获取 Refresh Token。

### 森空岛 Token

使用工具箱中的「森空岛登录」工具，扫码登录自动获取。

### 云原神 Token

1. 浏览器无痕模式打开 https://ys.mihoyo.com/cloud/#/ 并登录
2. F12 → Network → 筛选 `wallet/wallet/get`
3. 点击请求，在 Request Headers 中找到 `X-Rpc-Combo_token` 并复制

### 云绝区零 Token

云绝区零无网页版，需通过手机抓包获取：
1. 手机上安装抓包工具（如 Stream、HttpCanary 等）
2. 打开抓包工具开始抓包，然后打开云绝区零 App
3. 在抓包记录中筛选 `wallet/wallet/get`
4. 找到 `X-Rpc-Combo_token` 请求头并复制
5. 将复制的 token 粘贴到平台账号管理的「云绝区零 Token」字段

## 部署

当前仓库未包含现成的 `Dockerfile` 或 `docker-compose.yml`，推荐先使用手动部署。

### 生产部署步骤

1. 安装依赖并配置生产环境变量
2. 执行数据库初始化或 schema 同步
3. 构建应用
4. 启动服务

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```

### 生产环境建议

- 将 `NEXTAUTH_URL` 改为线上访问地址，例如 `https://your-domain.com`
- 重新生成强随机的 `NEXTAUTH_SECRET` 和 `ENCRYPTION_KEY`
- 保持 `AUTH_TRUST_HOST=true`，尤其是在反向代理场景下
- 首次部署完成后，立即修改默认管理员密码

> ⚠️ 每次更新 Prisma 数据模型后，都应在部署前执行一次 `npx prisma db push`。

## 相关项目

- [MihoyoBBSTools](https://github.com/Womsxd/MihoyoBBSTools) - 米游社自动签到
- [mihoyo_login](https://github.com/Womsxd/mihoyo_login) - 米游社 Stoken 获取
- [Kuro-autosignin](https://github.com/mxyooR/Kuro-autosignin) - 库街区自动签到
- [Kuro_login](https://github.com/mxyooR/Kuro_login) - 库街区 Token 获取
- [taygedo-auto-attendance](https://github.com/mxyooR/taygedo-auto-attendance) - 塔吉多自动签到
- [skland-daily-attendance](https://github.com/skillnull/skland-daily-attendance) - 森空岛自动签到参考

## 许可证

MIT License
