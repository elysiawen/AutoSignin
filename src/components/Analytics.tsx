'use client';

import Script from 'next/script';

const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim();
const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL?.trim() || 'https://cloud.umami.is';
const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();
const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();
const enableInDev = process.env.NEXT_PUBLIC_ANALYTICS_ENABLE_IN_DEV === 'true';

export default function Analytics() {
  // 开发环境默认不启用分析，避免污染数据
  if (process.env.NODE_ENV === 'development' && !enableInDev) {
    return null;
  }

  return (
    <>
      {/* Umami Analytics */}
      {umamiId && (
        <Script
          defer
          src={`${umamiUrl}/script.js`}
          data-website-id={umamiId}
          strategy="afterInteractive"
        />
      )}

      {/* Microsoft Clarity */}
      {clarityId && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}

      {/* Google Analytics */}
      {gaId && (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
