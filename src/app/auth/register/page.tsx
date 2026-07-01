'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gamepad2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const inputStyle = (field: string) => ({
    borderColor: focused === field ? 'var(--accent)' : 'var(--border)',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('请填写邮箱和密码');
      return;
    }
    if (password !== confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }
    if (password.length < 6) {
      showError('密码长度不能少于6位');
      return;
    }
    if (!agreed) {
      showError('请阅读并同意用户服务协议');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || email.split('@')[0] }),
      });
      const data = await response.json();
      if (response.ok) {
        success('注册成功，请登录');
        router.push('/auth/login');
      } else {
        showError(data.error || '注册失败');
      }
    } catch {
      showError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background">
      {/* Background blobs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[200px] opacity-20 dark:opacity-15"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)', right: '-10%', top: '-15%', animation: 'float 9s ease-in-out infinite' }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[180px] opacity-15 dark:opacity-10"
        style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', left: '-5%', bottom: '-10%', animation: 'float 11s ease-in-out 3s infinite' }}
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
            创建账号，开始管理您的多平台自动签到任务。
          </p>
          <div className="hidden lg:flex flex-col gap-3">
            {['支持米游社、HoYoLAB、库街区、塔吉多', '游戏签到 + 社区任务 + 云游戏', 'Cron 定时自动执行'].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
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
            <p className="text-text-secondary font-medium">创建账号，开始管理签到任务</p>
          </div>

          <div className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg shadow-black/[0.04] dark:shadow-black/20">
            <div className="mb-7">
              <h2 className="text-xl font-medium text-text-primary mb-1">注册</h2>
              <p className="text-sm text-text-tertiary">创建新账号开始使用</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">
                  邮箱 <span className="text-accent">*</span>
                </label>
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
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">昵称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('name')}
                  placeholder="留空将使用邮箱前缀"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">
                    密码 <span className="text-accent">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                    style={inputStyle('password')}
                    placeholder="至少6位"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">
                    确认密码 <span className="text-accent">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocused('confirmPassword')}
                    onBlur={() => setFocused(null)}
                    className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                    style={inputStyle('confirmPassword')}
                    placeholder="再次输入"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Terms Agreement */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-border rounded transition-all peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center">
                    {agreed && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-text-tertiary leading-relaxed">
                  我已阅读并同意{' '}
                  <Link
                    href="/auth/terms"
                    target="_blank"
                    className="text-accent hover:text-accent-hover transition-colors underline"
                  >
                    《用户服务协议》
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? '注册中...' : '创建账号'}
              </button>
            </form>

            <p className="text-center text-sm text-text-tertiary mt-7">
              已有账号？{' '}
              <Link href="/auth/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
                立即登录
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
