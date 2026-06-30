'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const { error: showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (field: string) => ({
    borderColor: focused === field ? 'var(--accent)' : 'var(--border)',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('请输入邮箱和密码');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        showError('邮箱或密码错误');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      showError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      {/* Background blobs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-20 dark:opacity-15"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', left: '-10%', top: '-15%', animation: 'float 8s ease-in-out infinite' }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-15 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', right: '-5%', bottom: '-10%', animation: 'float 10s ease-in-out 2s infinite' }}
      />

      <div className="relative z-10 w-full max-w-[960px] mx-auto px-6 py-12 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        {/* Left: Branding */}
        <div className="hidden lg:block flex-1 text-center lg:text-left animate-slide-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
              <Gamepad2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">AutoSignin</h1>
              <p className="text-sm text-text-tertiary">自动签到管理平台</p>
            </div>
          </div>
          <p className="text-base text-text-secondary leading-relaxed max-w-sm mx-auto lg:mx-0 mb-8">
            支持米游社、HoYoLAB、库街区、塔吉多等多平台自动签到，一站式管理您的签到任务。
          </p>
          <div className="hidden lg:flex flex-col gap-3">
            {['多平台游戏签到', '社区任务自动化', '定时任务调度'].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                <span className="text-sm text-text-tertiary">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form */}
        <div className="w-full max-w-[400px] animate-slide-in-up" style={{ animationDelay: '0.25s' }}>
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">AutoSignin</h2>
            <p className="text-text-secondary font-medium">欢迎回来，请登录您的账号</p>
          </div>

          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
            <div className="mb-7">
              <h2 className="text-xl font-medium text-text-primary mb-1">登录</h2>
              <p className="text-sm text-text-tertiary">登录您的账号开始使用</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('email')}
                  placeholder="your@email.com"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('password')}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <p className="text-center text-sm text-text-tertiary mt-7">
              还没有账号？{' '}
              <Link href="/auth/register" className="text-accent hover:text-accent-hover transition-colors font-medium">
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </main>
  );
}
