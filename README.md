# 自动签到平台

一个支持多平台自动签到的 Web 管理平台，支持米游社、HoYoLAB、库街区、塔吉多。

## 功能特性

- 🔐 用户注册/登录系统（JWT + bcrypt）
- 👑 管理员后台（用户管理、全局监控、系统设置）
- 📦 多平台账号管理
- 🎮 游戏签到（原神、崩坏3、星穹铁道、绝区零、鸣潮、战双等）
- 🏠 社区任务（签到、看帖、点赞、分享、获取金币/米游币）
- ☁️ 云游戏签到（云原神、云绝区零、云异环）
- ⏰ 定时任务调度（Cron 表达式）
- 📊 执行日志记录（含详细日志展开）
- 🛡️ 安全防护（频率限制、中间件鉴权、数据加密）
- 🖥️ 现代化响应式 Web 界面（暗色/亮色主题）

## 支持平台

| 平台 | 签到 | 游戏签到 | 社区任务 | 云游戏 |
|------|------|----------|----------|--------|
| 米游社（国服） | ✅ | ✅ | ✅ | ✅ |
| HoYoLAB（国际服） | ✅ | ✅ | - | - |
| 库街区 | ✅ | ✅ | ✅ | - |
| 塔吉多 | ✅ | ✅ | ✅ | ✅ |

## 技术栈

- **前端**: Next.js 16 (App Router) + React 19 + TailwindCSS 4
- **后端**: Next.js API Routes + Middleware
- **数据库**: PostgreSQL + Prisma ORM 7
- **认证**: NextAuth.js v5 (JWT)
- **定时任务**: node-cron
- **加密**: AES-256-GCM（凭证）+ bcrypt（密码）

## 快速开始

### 1. 环境要求

- Node.js 18+
- PostgreSQL 14+

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，并填写配置：

```bash
cp .env.example .env
```

```env
# 数据库连接
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名?schema=public"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="随机生成的密钥"  # openssl rand -base64 32

# 数据加密密钥（32位字符）
ENCRYPTION_KEY="随机生成的密钥"   # openssl rand -hex 16
```

### 4. 初始化数据库

```bash
npx prisma db push    # 推送 schema 到数据库
npx prisma generate   # 生成 Prisma Client
npx prisma db seed    # 创建默认管理员（admin@autosign.com / admin123）
```

### 5. 启动

```bash
npm run dev     # 开发模式
npm run build   # 生产构建
npm start       # 生产启动
```

访问 http://localhost:3000，使用默认管理员账号登录。

> ⚠️ 首次登录后请立即修改密码！

## 项目结构

```
autosign-platform/
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 默认管理员种子
├── src/
│   ├── app/
│   │   ├── admin/              # 管理后台页面
│   │   ├── api/
│   │   │   ├── accounts/       # 账号 CRUD
│   │   │   ├── admin/          # 管理员 API
│   │   │   ├── auth/           # 认证（登录/注册）
│   │   │   ├── scheduler/      # 调度器
│   │   │   ├── tasks/          # 任务 CRUD + 执行
│   │   │   └── user/           # 用户设置
│   │   ├── auth/               # 登录/注册页面
│   │   └── dashboard/          # 用户仪表盘
│   ├── components/             # UI 组件
│   ├── lib/
│   │   ├── auth.ts             # NextAuth 配置
│   │   ├── logger.ts           # 请求级日志收集器
│   │   ├── middleware.ts       # 全局路由鉴权
│   │   ├── prisma.ts           # Prisma 单例
│   │   ├── rate-limit.ts       # 频率限制
│   │   ├── scheduler.ts        # 定时任务调度
│   │   └── utils.ts            # 加密/哈希工具
│   └── services/
│       ├── kuro/               # 库街区签到
│       ├── mihoyo/             # 米哈游签到
│       ├── taygedo/            # 塔吉多签到
│       └── task-executor.ts    # 任务执行器（统一入口）
└── public/icons/               # 平台图标
```

## 使用说明

### 添加账号

在「账号管理」页面添加平台账号：

- **米游社**: 需要 Cookie（必填）+ Stoken（社区任务需要）
- **HoYoLAB**: 需要 Cookie
- **库街区**: 需要 Token（通过 [Kuro_login](https://github.com/mxyooR/Kuro_login) 获取）
- **塔吉多**: 支持两种登录方式：
  - **Token 模式**: 填入 Refresh Token
  - **手机号+密码**: 填入手机号和密码（密码不会存储，仅登录时使用一次）

### 创建任务

在「任务管理」页面为账号创建签到任务，支持设置 Cron 定时表达式。

### 管理后台

管理员可在侧边栏进入「管理后台」：
- 系统概览（用户数、账号数、任务数、今日执行统计）
- 用户管理（编辑角色、重置密码、删除）
- 全局账号/任务管理
- 全局执行日志
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

使用 [Kuro_login](https://github.com/mxyooR/Kuro_login) 获取。

### 塔吉多 Token

使用 [taygedo-auto-attendance](https://github.com/mxyooR/taygedo-auto-attendance) 项目获取 Refresh Token。

## 部署

### Docker 部署

```bash
docker build -t autosign-platform .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e ENCRYPTION_KEY="$(openssl rand -hex 16)" \
  autosign-platform
```

### 手动部署

```bash
npm run build
npm start
```

## 相关项目

- [MihoyoBBSTools](https://github.com/Womsxd/MihoyoBBSTools) - 米游社自动签到
- [mihoyo_login](https://github.com/Womsxd/mihoyo_login) - 米游社 Stoken 获取
- [Kuro-autosignin](https://github.com/mxyooR/Kuro-autosignin) - 库街区自动签到
- [Kuro_login](https://github.com/mxyooR/Kuro_login) - 库街区 Token 获取
- [taygedo-auto-attendance](https://github.com/mxyooR/taygedo-auto-attendance) - 塔吉多自动签到

## 许可证

MIT License
