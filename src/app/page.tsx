import Link from 'next/link';
import { Gamepad2, Shield, Clock, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Background blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full blur-[300px] opacity-15 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', left: '-20%', top: '-20%' }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[250px] opacity-10 dark:opacity-8"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', right: '-10%', bottom: '-10%' }}
      />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">AutoSignin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              登录
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              注册
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="animate-slide-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary tracking-tight leading-tight mb-6">
              多平台自动签到
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                一站式管理
              </span>
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              支持米游社、HoYoLAB、库街区、塔吉多、森空岛等平台的自动签到，游戏签到、社区任务、云游戏时长，定时执行，解放双手。
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:scale-[1.02]"
              >
                开始使用
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border text-text-primary rounded-xl font-medium hover:bg-muted transition-all"
              >
                已有账号登录
              </Link>
            </div>
          </div>
        </section>

        {/* Platforms */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: '米游社', desc: '原神 · 崩坏3 · 星穹铁道', color: 'bg-blue-500', icon: '/icons/miyoushe.webp' },
              { name: 'HoYoLAB', desc: '国际服游戏签到', color: 'bg-purple-500', icon: '/icons/hoyolab.png' },
              { name: '库街区', desc: '鸣潮 · 战双帕弥什', color: 'bg-green-500', icon: '/icons/kurobbs.webp' },
              { name: '塔吉多', desc: '社区签到 · 云异环', color: 'bg-cyan-500', icon: '/icons/taygedo.webp' },
              { name: '森空岛', desc: '明日方舟 · 终末地', color: 'bg-orange-500', icon: '/icons/skland.webp', span2: true },
            ].map((p) => (
              <div
                key={p.name}
                className={`bg-card/80 backdrop-blur border border-border rounded-2xl p-5 text-center hover:border-accent/30 hover:shadow-lg transition-all ${p.span2 ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <div className={`w-12 h-12 rounded-xl ${p.color} flex items-center justify-center mx-auto mb-3 overflow-hidden shadow-lg`}>
                  <img src={p.icon} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-semibold text-text-primary mb-1">{p.name}</h3>
                <p className="text-xs text-text-tertiary">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 pb-24">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-12">核心功能</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Gamepad2, title: '游戏签到', desc: '自动签到获取原神、崩坏3、星穹铁道、绝区零、鸣潮等游戏奖励' },
              { icon: CheckCircle2, title: '社区任务', desc: '自动完成签到、看帖、点赞、分享任务，获取米游币/金币' },
              { icon: Clock, title: '定时执行', desc: 'Cron 表达式灵活配置，每天自动执行，无需手动操作' },
              { icon: Shield, title: '安全加密', desc: 'AES-256-GCM 加密存储凭证，密码 bcrypt 哈希，数据安全有保障' },
              { icon: BarChart3, title: '执行日志', desc: '每次签到结果详细记录，成功/失败/奖励一目了然' },
              { icon: Gamepad2, title: '多账号管理', desc: '支持同一平台绑定多个账号，独立配置，互不干扰' },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 hover:border-accent/20 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-tertiary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="bg-gradient-to-r from-accent to-indigo-600 rounded-2xl p-10 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">开始自动签到</h2>
            <p className="text-white/80 mb-6 max-w-md mx-auto">
              注册账号，添加平台凭证，创建签到任务，剩下的交给 AutoSignin。
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-accent rounded-xl font-medium hover:bg-white/90 transition-all"
            >
              免费注册
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-border text-center">
          <p className="text-sm text-text-quaternary">
            AutoSignin · 仅供学习交流使用
          </p>
        </footer>
      </div>
    </main>
  );
}
