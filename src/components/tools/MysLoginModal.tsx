'use client';

import { useState, useRef } from 'react';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import GeetestVerify, { type GeetestVerifyRef, type GeetestResult } from './GeetestVerify';

export interface MysLoginData {
  accountId: string;
  mid: string;
  stoken: string;
  ltoken: string;
  cookieToken: string;
  loginTicket: string;
  userInfo: {
    accountName: string;
    email: string;
    mobile: string;
  };
}

interface MysLoginModalProps {
  open: boolean;
  onClose: () => void;
  onFill?: (data: MysLoginData) => void;
}

export default function MysLoginModal({ open, onClose, onFill }: MysLoginModalProps) {
  const toast = useToast();
  const gtRef = useRef<GeetestVerifyRef>(null);

  const [step, setStep] = useState<'phone' | 'code' | 'result'>('phone');
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('');
  const [result, setResult] = useState<MysLoginData | null>(null);

  // 极验验证相关状态
  const [showGeetest, setShowGeetest] = useState(false);
  const [pendingAction, setPendingAction] = useState<'captcha' | 'login' | null>(null);

  // 发送验证码
  const handleSendCaptcha = async (aigis?: string) => {
    if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
      toast.error('请输入正确的手机号');
      return;
    }

    setLoading(true);
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
          setPendingAction('captcha');
          setShowGeetest(true);

          // 等待极验脚本加载后触发验证
          setTimeout(() => {
            triggerGeetest(data.geetest, data.aigisSession, 'captcha');
          }, 500);
        } else {
          setActionType(data.actionType);
          setStep('code');
          toast.success('验证码已发送');
        }
      } else {
        toast.error(data.error || '发送验证码失败');
      }
    } catch {
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  // 触发极验验证
  const triggerGeetest = async (geetestData: any, session: string, action: 'captcha' | 'login') => {
    if (!gtRef.current) {
      toast.error('极验组件未加载，请刷新页面重试');
      return;
    }

    let result: GeetestResult | false = false;

    // 判断是 GT3 还是 GT4
    if (geetestData.challenge) {
      // GT3
      result = await gtRef.current.show(geetestData.gt, geetestData.challenge);
    } else if (geetestData.use_v4) {
      // GT4
      result = await gtRef.current.showGt4(geetestData.gt, geetestData.risk_type, session);
    }

    setShowGeetest(false);
    setPendingAction(null);

    if (result) {
      // 极验验证成功，构造 aigis 并重试
      const aigis = `${session};${btoa(JSON.stringify(result))}`;
      if (action === 'captcha') {
        await handleSendCaptcha(aigis);
      } else {
        await handleLogin(aigis);
      }
    } else {
      toast.error('极验验证失败，请重试');
    }
  };

  // 登录
  const handleLogin = async (aigis?: string) => {
    if (!code) {
      toast.error('请输入验证码');
      return;
    }

    setLoading(true);
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
          setPendingAction('login');
          setShowGeetest(true);

          setTimeout(() => {
            triggerGeetest(data.geetest, data.aigisSession, 'login');
          }, 500);
        } else {
          setResult(data);
          setStep('result');
          toast.success('登录成功，Token 已获取');
        }
      } else {
        toast.error(data.error || '登录失败');
      }
    } catch {
      toast.error('请求失败');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  const handleClose = () => {
    setMobile('');
    setCode('');
    setActionType('');
    setResult(null);
    setStep('phone');
    setShowGeetest(false);
    setPendingAction(null);
    onClose();
  };

  const handleFill = () => {
    if (result && onFill) {
      onFill(result);
      toast.success('已填入');
      handleClose();
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="米游社手机号登录" maxWidth="lg">
      {/* 极验验证弹窗 */}
      {showGeetest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-text-primary mb-4">请完成验证</h3>
            <GeetestVerify ref={gtRef} />
          </div>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* 步骤说明 */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm font-medium text-text-secondary mb-2">操作步骤</p>
          <ol className="space-y-1.5 text-xs text-text-tertiary">
            <li>1. 输入手机号，点击发送验证码</li>
            <li>2. 输入收到的短信验证码</li>
            <li>3. 点击登录获取 Token</li>
          </ol>
          <p className="mt-2 text-xs text-destructive">
            注意：stoken 具有高权限，可用于米游社打卡等敏感操作，请妥善保管
          </p>
        </div>

        {/* 步骤 1：输入手机号 */}
        {step === 'phone' && (
          <div className="space-y-3">
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
              placeholder="请输入手机号"
              disabled={loading}
              maxLength={11}
            />
            <button
              onClick={() => handleSendCaptcha()}
              disabled={loading || !mobile}
              className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? '发送中...' : '发送验证码'}
            </button>
            <p className="text-xs text-text-quaternary text-center">
              可能需要完成极验验证
            </p>
          </div>
        )}

        {/* 步骤 2：输入验证码 */}
        {step === 'code' && (
          <div className="space-y-3">
            <div className="text-sm text-text-secondary">
              验证码已发送到 <span className="font-medium">{mobile}</span>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-accent/20 text-sm text-text-primary placeholder:text-text-quaternary"
              placeholder="请输入验证码"
              disabled={loading}
              maxLength={6}
            />
            <div className="flex gap-2">
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
                onClick={() => handleLogin()}
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">登录成功，点击复制各字段</span>
            </div>
            {[
              { label: 'Token', value: result.stoken },
              { label: '用户 ID', value: result.accountId },
              { label: 'MID', value: result.mid },
              { label: 'LToken', value: result.ltoken },
              { label: 'Cookie Token', value: result.cookieToken },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => copyText(item.value, item.label)}
                className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-tertiary mb-0.5">{item.label}</p>
                  <p className="text-sm text-text-primary font-mono truncate">{item.value}</p>
                </div>
                <Copy className="h-4 w-4 text-text-quaternary shrink-0" />
              </button>
            ))}
            {onFill && (
              <button
                onClick={handleFill}
                className="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent-hover transition-all flex items-center justify-center gap-2"
              >
                一键填入
              </button>
            )}

            {/* 原始数据 */}
            <details className="mt-1">
              <summary className="text-xs text-text-quaternary cursor-pointer hover:text-text-tertiary">
                原始数据
              </summary>
              <div className="relative mt-2">
                <pre className="p-3 bg-background rounded-lg text-xs text-text-secondary overflow-x-auto whitespace-pre-wrap font-mono border border-border">
                  {JSON.stringify(result, null, 2)}
                </pre>
                <button
                  onClick={() => copyText(JSON.stringify(result, null, 2), '原始数据')}
                  className="absolute top-2 right-2 p-1.5 bg-muted rounded-md text-text-quaternary hover:text-accent transition-colors"
                  title="复制"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </details>
          </div>
        )}
      </div>
    </Modal>
  );
}
