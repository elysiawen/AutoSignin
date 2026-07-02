'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Gamepad2, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [focused, setFocused] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  const inputStyle = (field: string) => ({
    borderColor: focused === field ? 'var(--accent)' : 'var(--border)',
    boxShadow: focused === field ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : 'none',
  });

  const handleSendCode = async () => {
    if (!email) {
      showError('请先输入邮箱');
      return;
    }
    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || '验证码已发送');
        setCountdown(60);
        setStep('reset');
      } else {
        showError(data.error || '发送验证码失败');
      }
    } catch {
      showError('网络错误，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError('密码长度至少为 6 位');
      return;
    }
    if (password !== confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (res.ok) {
        success('密码重置成功');
        setTimeout(() => router.push('/auth/login'), 1500);
      } else {
        showError(data.error || '重置失败');
      }
    } catch {
      showError('网络错误，请稍后重试');
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

      <div className="relative z-10 w-full max-w-[400px] px-6 animate-slide-in-up" style={{ animationDelay: '0.25s' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent mb-4 shadow-lg shadow-accent/20">
            <Gamepad2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">重置密码</h1>
          <p className="text-sm text-text-tertiary mt-1">
            {step === 'email' ? '输入注册邮箱获取验证码' : '输入验证码和新密码'}
          </p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-lg">
          {step === 'email' ? (
            <>
              <div className="space-y-5">
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
                    autoComplete="email"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode}
                  className="w-full py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingCode && <Loader2 className="h-4 w-4 animate-spin" />}
                  {sendingCode ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">邮箱</label>
                <div className="w-full px-4 py-2.5 bg-muted rounded-lg text-sm text-text-secondary">{email}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">验证码</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('code')}
                  placeholder="6位数字验证码"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-quaternary">验证码 5 分钟内有效</p>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendingCode}
                    className="text-xs text-accent hover:text-accent-hover disabled:text-text-quaternary disabled:cursor-not-allowed transition-colors"
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">新密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('password')}
                  placeholder="最少 6 位"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-tertiary mb-2 tracking-wide uppercase">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocused('confirm')}
                  onBlur={() => setFocused(null)}
                  className="w-full px-4 py-2.5 bg-background border rounded-lg text-sm text-text-primary placeholder:text-text-quaternary outline-none transition-all duration-200"
                  style={inputStyle('confirm')}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code || !password || !confirmPassword}
                className="w-full py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? '重置中...' : '重置密码'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setPassword(''); setConfirmPassword(''); }}
                className="w-full py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                更换邮箱
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-text-tertiary mt-6">
          <Link href="/auth/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
            返回登录
          </Link>
        </p>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
      `}</style>
    </main>
  );
}
