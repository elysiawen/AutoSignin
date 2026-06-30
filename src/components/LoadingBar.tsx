'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export default function LoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Listen for route changes
    startTransition(() => {});
  }, [pathname, searchParams]);

  useEffect(() => {
    if (isPending) {
      setVisible(true);
      setProgress(0);

      // Quick jump to 70%
      const t1 = setTimeout(() => setProgress(70), 100);
      // Slow crawl to 90%
      const t2 = setTimeout(() => setProgress(90), 500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (visible) {
      // Complete and fade out
      setProgress(100);
      const t = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isPending]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
