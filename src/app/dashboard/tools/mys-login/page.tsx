'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Copy, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/Toast';
import GeetestVerify, { type GeetestVerifyRef, type GeetestResult } from '@/components/tools/GeetestVerify';

export default function MysLoginPage() {
  const toast = useToast();
  const gtRef = useRef<GeetestVerifyRef>(null);

  const [step, setStep] = useState<'phone' | 'code' | 'result'>('phone');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('');
  const [result, setResult] = useState<any>(null);

  // 极验验证相关状态
  const [showGeetest, setShowGeetest] = useState(false);
  const [geetestData, setGeetestData] = useState<any>(null);
  const [aigisSession, setAigisSession] = useState('');
  const [pendingAction, setPendingAction] = useState<'captcha' | 'login' | null>(null);

  // 当弹窗显示且数据准备好时，自动触发极验
  useEffect(() => {
    if (showGeetest && geetestData && aigisSession && pendingAction) {
      console.log('准备触发极验, geetestData:', geetestData, 'aigisSession:', aigisSession);
      // 延迟一下确保组件已渲染
      const timer = setTimeout(() => {
        triggerGeetest(geetestData, aigisSession, pendingAction);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showGeetest, geetestData, aigisSession, pendingAction]);

  // 触发极验验证
  const triggerGeetest = async (geetestData: any, session: string, action: 'captcha' | 'login') => {
    if (!gtRef.current) {
      console.error('gtRef.current 不存在');
      toast.error('极验组件未加载，请刷新页面重试');
      setShowGeetest(false);
      setLoading(false);
      return;
    }

    console.log('开始极验验证, geetestData:', geetestData);

    let result: GeetestResult | false = false;

    // 判断是 GT3 还是 GT4
    if (geetestData.use_v4 || !geetestData.challenge) {
      // GT4
      console.log('使用 GT4 验证, captchaId:', geetestData.gt, 'riskType:', geetestData.risk_type);
      result = await gtRef.current.showGt4(geetestData.gt, geetestData.risk_type, session);
    } else {
      // GT3
      console.log('使用 GT3 验证, gt:', geetestData.gt, 'challenge:', geetestData.challenge);
      result = await gtRef.current.show(geetestData.gt, geetestData.challenge);
    }

    console.log('极验验证结果:', result);
    setShowGeetest(false);

    if (result) {
      // 极验验证成功，构造 aigis 并重试
      const aigis = `${session};${btoa(JSON.stringify(result))}`;
      console.log('极验验证成功, aigis:', aigis);

      if (action === 'captcha') {
        await doSendCaptcha(aigis);
      } else {
        await doLogin(aigis);
      }
    } else {
      toast.error('极验验证失败或已取消，请重试');
      setLoading(false);
    }

    // 清理状态
    setGeetestData(null);
    setAigisSession('');
    setPendingAction(null);
  };

  // 发送验证码（内部实现）
  const doSendCaptcha = async (aigis?: string) => {
    try {
      const response = await fetch('/api/tools/mys-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'captcha', phone: mobile, aigis }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.needGeetest) {
          // 需要极验验证
          console.log('需要极验验证:', data.geetest);
          setGeetestData(data.geetest);
          setAigisSession(data.aigisSession);
          setPendingAction('captcha');
          setShowGeetest(true);
          // 不在这里 setLoading(false)，等极验完成后再设置
        } else {
          setActionType(data.actionType);
          setStep('code');
          setLoading(false);
          toast.success('验证码已发送');
        }
      } else {
        setLoading(false);
        toast.error(data.error || '发送验证码失败');
      }
    } catch (e: any) {
      console.error('发送验证码失败:', e);
      setLoading(false);
      toast.error(e.message || '请求失败');
    }
  };

  // 发送验证码（入口）
  const handleSendCaptcha = async () => {
    if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
      toast.error('请输入正确的手机号');
      return;
    }

    setLoading(true);
    await doSendCaptcha();
  };

  // 登录（内部实现）
  const doLogin = async (aigis?: string) => {
    try {
      const response = await fetch('/api/tools/mys-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          phone: mobile,
          code,
          actionType,
          aigis,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.needGeetest) {
          // 登录时也需要极验验证
          console.log('登录需要极验验证:', data.geetest);
          setGeetestData(data.geetest);
          setAigisSession(data.aigisSession);
          setPendingAction('login');
          setShowGeetest(true);
        } else {
          setResult(data);
          setStep('result');
          setLoading(false);
          toast.success('登录成功，Token 已获取');
        }
      } else {
        setLoading(false);
        toast.error(data.error || '登录失败');
      }
    } catch (e) {
      console.error('登录失败:', e);
      setLoading(false);
      toast.error('请求失败');
    }
  };

  // 登录（入口）
  const handleLogin = async () => {
    if (!code) {
      toast.error('请输入验证码');
      return;
    }

    setLoading(true);
    await doLogin();
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 极验验证组件（隐藏，只用于初始化） */}
      <div style={{ display: 'none' }}>
        <GeetestVerify ref={gtRef} />
      </div>

      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/tools"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">米游社手机号登录</h1>
          <p className="text-sm text-text-tertiary">获取米游社 Token，用于自动签到、打卡等功能</p>
        </div>
      </div>

      {/* 说明卡片 */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-sm font-medium text-text-secondary mb-2">功能说明</p>
        <ul className="space-y-1.5 text-xs text-text-tertiary">
          <li>• 通过手机号 + 短信验证码登录米游社</li>
          <li>• 获取的 stoken 具有高权限，可用于米游社打卡</li>
          <li>• 获取的 Token 可用于 TeyvatGuide 等工具</li>
          <li>• 支持极验验证（GT3/GT4）</li>
        </ul>
        <p className="mt-2 text-xs text-destructive">
          注意：请妥善保管 Token，不要泄露给他人
        </p>
      </div>

      {/* 登录表单 */}
      <div className="bg-background border border-border rounded-xl p-6">
        {/* 步骤 1：输入手机号 */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                手机号
              </label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
                placeholder="请输入 11 位手机号"
                disabled={loading}
                maxLength={11}
              />
            </div>
            <button
              onClick={handleSendCaptcha}
              disabled={loading || !mobile}
              className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? '发送中...' : '发送验证码'}
            </button>
            <p className="text-xs text-text-quaternary text-center">
              可能需要完成极验验证，请耐心等待
            </p>
          </div>
        )}

        {/* 步骤 2：输入验证码 */}
        {step === 'code' && (
          <div className="space-y-4">
            <div className="text-sm text-text-secondary">
              验证码已发送到 <span className="font-medium text-text-primary">{mobile}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                验证码
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
                placeholder="请输入 6 位验证码"
                disabled={loading}
                maxLength={6}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
                className="flex-1 py-2.5 bg-muted text-text-secondary rounded-xl font-medium text-sm hover:bg-muted/80 transition-all"
              >
                返回
              </button>
              <button
                onClick={handleLogin}
                disabled={loading || !code}
                className="flex-1 py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </div>
        )}

        {/* 步骤 3：结果展示 */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">登录成功</span>
            </div>

            <div className="space-y-2">
              {[
                { label: '账号 ID', value: result.accountId, desc: '用户唯一标识' },
                { label: '用户 mid', value: result.mid, desc: '米游社用户 ID' },
                { label: 'SToken', value: result.stoken, desc: '高权限 Token，可用于打卡' },
                { label: 'LToken', value: result.ltoken, desc: '用于签到等操作' },
                { label: 'Cookie Token', value: result.cookieToken, desc: '用于查询任务状态' },
                { label: '登录 Ticket', value: result.loginTicket, desc: '会话凭证' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => copyText(item.value, item.label)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-tertiary mb-0.5">{item.label}</p>
                    <p className="text-sm text-text-primary font-mono truncate">{item.value}</p>
                    <p className="text-xs text-text-quaternary mt-0.5">{item.desc}</p>
                  </div>
                  <Copy className="h-4 w-4 text-text-quaternary shrink-0" />
                </button>
              ))}
            </div>

            {/* Cookie 字符串 */}
            <div className="mt-4">
              <p className="text-sm font-medium text-text-secondary mb-2">完整 Cookie 字符串</p>
              <div className="relative">
                <pre className="p-3 bg-muted rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                  {`account_id=${result.accountId};ltuid=${result.accountId};stuid=${result.accountId};mid=${result.mid};stoken=${result.stoken};ltoken=${result.ltoken};cookie_token=${result.cookieToken}`}
                </pre>
                <button
                  onClick={() =>
                    copyText(
                      `account_id=${result.accountId};ltuid=${result.accountId};stuid=${result.accountId};mid=${result.mid};stoken=${result.stoken};ltoken=${result.ltoken};cookie_token=${result.cookieToken}`,
                      'Cookie',
                    )
                  }
                  className="absolute top-2 right-2 p-1.5 bg-background rounded-md text-text-quaternary hover:text-accent transition-colors"
                  title="复制"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 原始数据 */}
            <details className="mt-4">
              <summary className="text-xs text-text-quaternary cursor-pointer hover:text-text-tertiary">
                查看原始数据
              </summary>
              <div className="relative mt-2">
                <pre className="p-3 bg-muted rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <button
                  onClick={() => copyText(JSON.stringify(result, null, 2), '原始数据')}
                  className="absolute top-2 right-2 p-1.5 bg-background rounded-md text-text-quaternary hover:text-accent transition-colors"
                  title="复制"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </details>

            {/* 重新登录 */}
            <button
              onClick={() => {
                setStep('phone');
                setMobile('');
                setCode('');
                setActionType('');
                setResult(null);
              }}
              className="w-full py-2.5 bg-muted text-text-secondary rounded-xl font-medium text-sm hover:bg-muted/80 transition-all"
            >
              重新登录
            </button>
          </div>
        )}
      </div>

      {/* Token 说明 */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-sm font-medium text-text-secondary mb-2">获取的 Token 说明</p>
        <div className="space-y-2 text-xs text-text-tertiary">
          <div className="flex items-start gap-2">
            <span className="font-medium text-accent">SToken</span>
            <span>高权限 Token，可用于米游社打卡、签到等敏感操作</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-accent">LToken</span>
            <span>中权限 Token，用于签到、获取用户信息</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-medium text-accent">Cookie Token</span>
            <span>低权限 Token，用于查询任务列表、状态等</span>
          </div>
        </div>
      </div>
    </div>
  );
}
