'use client';

import { Gamepad2, Menu } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-text-secondary hover:bg-muted rounded-lg"
          aria-label="打开菜单"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Gamepad2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-text-primary">AutoSignin</span>
        </div>
      </div>
    </div>
  );
}
