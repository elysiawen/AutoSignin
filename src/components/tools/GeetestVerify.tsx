'use client';

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState, useId } from 'react';

// 极验相关类型声明
declare global {
  interface Window {
    initGeetest: (params: any, callback: (captchaObj: any) => void) => void;
    initGeetest4: (params: any, callback: (captchaObj: any) => void) => void;
  }
}

export interface GeetestResult {
  geetest_challenge: string;
  geetest_validate: string;
  geetest_seccode: string;
}

export interface GeetestVerifyRef {
  show: (gt: string, challenge: string) => Promise<GeetestResult | false>;
  showGt4: (captchaId: string, riskType: string, sessionId?: string) => Promise<GeetestResult | false>;
}

interface GeetestVerifyProps {
  onSuccess?: (result: GeetestResult) => void;
  onClose?: () => void;
}

const GeetestVerify = forwardRef<GeetestVerifyRef, GeetestVerifyProps>(
  ({ onSuccess, onClose }, ref) => {
    const reactId = useId();
    const containerId = `geetest-${reactId}`;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 加载极验脚本
    useEffect(() => {
      const loadScript = (src: string, id: string): Promise<boolean> => {
        return new Promise((resolve) => {
          if (document.getElementById(id)) {
            resolve(true);
            return;
          }

          const script = document.createElement('script');
          script.id = id;
          script.src = src;
          script.async = true;
          script.onload = () => {
            console.log(`脚本加载成功: ${id}`);
            resolve(true);
          };
          script.onerror = () => {
            console.error(`脚本加载失败: ${id}`);
            resolve(false);
          };
          document.head.appendChild(script);
        });
      };

      const loadScripts = async () => {
        try {
          // 并行加载两个脚本
          const [gt3Loaded, gt4Loaded] = await Promise.all([
            loadScript('https://static.geetest.com/static/js/gt.0.4.9.js', 'gt3-script'),
            loadScript('https://static.geetest.com/v4/gt4.js', 'gt4-script'),
          ]);

          console.log('GT3 loaded:', gt3Loaded, 'GT4 loaded:', gt4Loaded);

          if (!gt3Loaded && !gt4Loaded) {
            setError('极验脚本加载失败，请检查网络');
          }
        } catch (e) {
          console.error('加载脚本异常:', e);
          setError('加载验证组件失败');
        } finally {
          setLoading(false);
        }
      };

      loadScripts();
    }, []);

    // GT3 验证
    const showGt3 = useCallback(
      (gt: string, challenge: string): Promise<GeetestResult | false> => {
        return new Promise((resolve) => {
          if (!window.initGeetest) {
            console.error('GT3 SDK 未加载');
            setError('极验组件未加载，请刷新页面');
            resolve(false);
            return;
          }

          const container = document.getElementById(containerId);
          if (!container) {
            console.error('容器不存在:', containerId);
            resolve(false);
            return;
          }

          console.log('初始化 GT3, gt:', gt, 'challenge:', challenge);

          window.initGeetest(
            {
              gt,
              challenge,
              offline: false,
              new_captcha: true,
              product: 'bind',
              width: '100%',
              https: true,
            },
            (captchaObj: any) => {
              console.log('GT3 captchaObj 创建成功');

              // 清空容器
              container.innerHTML = '';

              // 添加到容器
              captchaObj.appendTo(`#${containerId}`);

              console.log('GT3 已添加到容器');

              captchaObj.onReady(() => {
                console.log('GT3 验证就绪');
                setLoading(false);
              });

              captchaObj.onSuccess(() => {
                const result = captchaObj.getValidate();
                console.log('GT3 验证成功:', result);
                if (result) {
                  onSuccess?.(result);
                  resolve(result);
                } else {
                  resolve(false);
                }
              });

              captchaObj.onClose(() => {
                console.log('GT3 验证关闭');
                onClose?.();
                resolve(false);
              });

              captchaObj.onError((e: any) => {
                console.error('GT3 验证错误:', e);
                setError('验证出错，请重试');
                resolve(false);
              });
            },
          );
        });
      },
      [onSuccess, onClose],
    );

    // GT4 验证
    const showGt4 = useCallback(
      (captchaId: string, riskType: string, sessionId?: string): Promise<GeetestResult | false> => {
        return new Promise((resolve) => {
          if (!window.initGeetest4) {
            console.error('GT4 SDK 未加载');
            setError('极验组件未加载，请刷新页面');
            resolve(false);
            return;
          }

          const container = document.getElementById(containerId);
          if (!container) {
            console.error('容器不存在:', containerId);
            resolve(false);
            return;
          }

          console.log('初始化 GT4, captchaId:', captchaId, 'riskType:', riskType);

          // 先确保容器存在且可见
          const containerEl = document.getElementById(containerId);
          if (containerEl) {
            containerEl.innerHTML = '';
            containerEl.style.display = 'block';
            containerEl.style.width = '300px';
            containerEl.style.height = '300px';
          }

          const params: any = {
            captchaId,
            riskType,
            product: 'bind',
            mode: 'inline',  // 使用 inline 模式
            nextWidth: '300px',
            nextHeight: '300px',
            lang: 'zho',
            https: true,
            protocol: 'https',
          };

          if (sessionId) {
            params.userInfo = JSON.stringify({ session_id: sessionId });
          }

          window.initGeetest4(params, (captchaObj: any) => {
            console.log('GT4 captchaObj 创建成功');

            // 添加到容器
            if (containerEl) {
              captchaObj.appendTo(`#${containerId}`);
              console.log('GT4 已添加到容器');
            }

            captchaObj.onReady(() => {
              console.log('GT4 验证就绪');
              // 检查极验元素
              const gtEl = document.querySelector('.geetest_captcha');
              if (gtEl) {
                console.log('极验元素尺寸:', gtEl.getBoundingClientRect());
                console.log('极验元素样式:', {
                  display: getComputedStyle(gtEl).display,
                  visibility: getComputedStyle(gtEl).visibility,
                  opacity: getComputedStyle(gtEl).opacity,
                  width: getComputedStyle(gtEl).width,
                  height: getComputedStyle(gtEl).height,
                });
              }
              setLoading(false);
            });

            captchaObj.onSuccess(() => {
              const result = captchaObj.getValidate();
              console.log('GT4 验证成功:', result);
              if (result) {
                onSuccess?.(result);
                resolve(result);
              } else {
                resolve(false);
              }
            });

            captchaObj.onClose(() => {
              console.log('GT4 验证关闭');
              onClose?.();
              resolve(false);
            });

            captchaObj.onError((e: any) => {
              console.error('GT4 验证错误:', e);
              setError('验证出错，请重试');
              resolve(false);
            });

            // 显示极验
            captchaObj.showCaptcha();
            console.log('GT4 showCaptcha 已调用');
          });
        });
      },
      [onSuccess, onClose],
    );

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      show: showGt3,
      showGt4,
    }));

    return (
      <div className="geetest-wrapper">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-3"></div>
            <span className="text-sm text-text-secondary">加载验证组件中...</span>
          </div>
        )}
        {error && (
          <div className="text-center py-4">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-accent hover:underline"
            >
              点击刷新页面
            </button>
          </div>
        )}
        <div
          id={containerId}
          className="geetest-container"
          style={{
            minHeight: loading || error ? '0' : '300px',
            width: '100%',
            // 确保极验内容可见
            overflow: 'visible',
            position: 'relative',
          }}
        />
      </div>
    );
  },
);

GeetestVerify.displayName = 'GeetestVerify';

export default GeetestVerify;
