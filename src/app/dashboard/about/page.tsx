import { ExternalLink, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">关于</h1>
        <p className="text-text-tertiary mt-1">自动签到平台相关信息</p>
      </div>

      {/* Version Info */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center">
            <span className="text-3xl">🎮</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">自动签到平台</h2>
            <p className="text-sm text-text-tertiary">AutoSign Platform</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-text-secondary">版本</span>
            <span className="text-sm font-medium text-text-primary">v0.2.0</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-text-secondary">框架</span>
            <span className="text-sm font-medium text-text-primary">Next.js 16</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-text-secondary">数据库</span>
            <span className="text-sm font-medium text-text-primary">PostgreSQL + Prisma</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <span className="text-sm text-text-secondary">认证</span>
            <span className="text-sm font-medium text-text-primary">NextAuth.js</span>
          </div>
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">支持的平台</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center overflow-hidden">
              <img src="/icons/miyoushe.webp" alt="米游社" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">米游社（国服）</p>
              <p className="text-xs text-text-tertiary">原神、崩坏3、星穹铁道、绝区零等 · 社区签到、游戏签到、云游戏</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center overflow-hidden">
              <img src="/icons/hoyolab.png" alt="HoYoLAB" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">HoYoLAB（国际服）</p>
              <p className="text-xs text-text-tertiary">原神、崩坏3、星穹铁道、绝区零等 · 游戏签到</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center overflow-hidden">
              <img src="/icons/kurobbs.webp" alt="库街区" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">库街区</p>
              <p className="text-xs text-text-tertiary">鸣潮、战双帕弥什 · 游戏签到、论坛任务</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-cyan-500 flex items-center justify-center overflow-hidden">
              <img src="/icons/taygedo.webp" alt="塔吉多" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">塔吉多</p>
              <p className="text-xs text-text-tertiary">社区签到、游戏签到、金币任务、云异环时长</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center overflow-hidden">
              <img src="/icons/skland.webp" alt="森空岛" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">森空岛</p>
              <p className="text-xs text-text-tertiary">明日方舟、终末地 · 游戏签到</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">功能特性</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: '🔐', title: '用户系统', desc: '注册登录、权限管理' },
            { icon: '📦', title: '多账号管理', desc: '支持多个平台账号' },
            { icon: '⏰', title: '定时任务', desc: 'Cron 表达式定时执行' },
            { icon: '📊', title: '执行日志', desc: '详细的签到记录' },
            { icon: '🎮', title: '游戏签到', desc: '自动签到获取奖励' },
            { icon: '🏠', title: '社区任务', desc: '签到、看帖、点赞、分享' },
            { icon: '☁️', title: '云游戏', desc: '云原神、云绝区零、云异环' },
            { icon: '🛡️', title: '后台管理', desc: '用户管理、全局监控' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium text-text-primary">{item.title}</p>
                <p className="text-xs text-text-tertiary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">相关链接</h3>
        <div className="space-y-3">
          {[
            { icon: '⭐', name: 'MihoyoBBSTools', desc: '米游社自动签到（上游项目）', url: 'https://github.com/Womsxd/MihoyoBBSTools', commit: 'f062d1f' },
            { icon: '🗺️', name: 'TeyvatGuide', desc: '米游社登录、设备信息（上游项目）', url: 'https://github.com/BTMuli/TeyvatGuide', commit: '8964681' },
            { icon: '🎮', name: 'Kuro-autosignin', desc: '库街区自动签到（上游项目）', url: 'https://github.com/mxyooR/Kuro-autosignin', commit: 'a334796' },
            { icon: '🔑', name: 'Kuro_login', desc: '库街区 Token 获取工具', url: 'https://github.com/mxyooR/Kuro_login', commit: 'b69ef1a' },
            { icon: '🎯', name: 'taygedo-auto-attendance', desc: '塔吉多自动签到（上游项目）', url: 'https://github.com/zzstar101/taygedo-auto-attendance', commit: 'c9b38d4' },
            { icon: '🏝️', name: 'skland-daily-attendance', desc: '森空岛自动签到（上游项目）', url: 'https://github.com/AEtherside/skland-daily-attendance', commit: 'ac37412' },
          ].map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
            >
              <span className="text-lg">{link.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{link.name}</p>
                <p className="text-xs text-text-tertiary">{link.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                {link.commit && (
                  <code className="px-2 py-0.5 text-xs font-mono bg-muted rounded text-text-quaternary">{link.commit}</code>
                )}
                <ExternalLink className="h-4 w-4 text-text-quaternary" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Cron Help */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Cron 表达式说明</h3>
        <div className="bg-muted rounded-xl p-4 font-mono text-sm text-text-secondary">
          <p className="mb-2">格式: 分 时 日 月 周</p>
          <p className="mb-1">* * * * *</p>
          <p className="mb-1">│ │ │ │ │</p>
          <p className="mb-1">│ │ │ │ └── 星期几 (0-7, 0和7都是周日)</p>
          <p className="mb-1">│ │ │ └──── 月份 (1-12)</p>
          <p className="mb-1">│ │ └────── 日 (1-31)</p>
          <p className="mb-1">│ └──────── 小时 (0-23)</p>
          <p>└────────── 分钟 (0-59)</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[
            { label: '每天凌晨 0:05', value: '5 0 * * *' },
            { label: '每天早上 6:00', value: '0 6 * * *' },
            { label: '每天早上 8:00', value: '0 8 * * *' },
            { label: '每小时', value: '0 * * * *' },
          ].map((preset) => (
            <div key={preset.value} className="flex items-center gap-2">
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono">{preset.value}</code>
              <span className="text-sm text-text-tertiary">{preset.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-text-tertiary flex items-center justify-center gap-1">
          Made with <Heart className="h-4 w-4 text-destructive fill-destructive" /> by AutoSign
        </p>
        <p className="text-xs text-text-quaternary mt-1">
          仅供学习交流使用，请勿用于非法用途
        </p>
      </div>
    </div>
  );
}
