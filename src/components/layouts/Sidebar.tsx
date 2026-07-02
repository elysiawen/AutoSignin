'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Settings,
  LogOut,
  Gamepad2,
  Menu,
  Info,
  Shield,
  ExternalLink,
  Wrench,
  Bell,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import MobileHeader from './MobileHeader';

const navigation = [
  {
    label: '主菜单',
    items: [
      { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
      { name: '账号管理', href: '/dashboard/accounts', icon: Users },
      { name: '任务管理', href: '/dashboard/tasks', icon: ListTodo },
    ],
  },
  {
    label: '小工具',
    items: [
      { name: '工具箱', href: '/dashboard/tools', icon: Wrench },
      { name: '通知管理', href: '/dashboard/notifications', icon: Bell },
      { name: '设置', href: '/dashboard/settings', icon: Settings },
    ],
  },
  {
    label: '关于',
    items: [
      { name: '关于', href: '/dashboard/about', icon: Info },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { confirm } = useConfirm();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const handleLogout = async () => {
    const confirmed = await confirm('确定要退出登录吗？', {
      title: '退出登录',
      confirmText: '退出',
      confirmColor: 'red',
    });
    if (confirmed) {
      await signOut({ redirect: false });
      toast.success('已退出登录');
      router.push('/auth/login');
    }
  };

  const sidebarContent = useMemo(() => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">AutoSignin</h1>
            <p className="text-xs text-text-tertiary mt-0.5">任务管理平台</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navigation.map((group) => (
          <div key={group.label || group.items[0].name}>
            {group.label && (
              <p className="px-4 mb-2 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-text-secondary hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-sidebar-accent-foreground' : ''}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        {/* Admin entry */}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl text-accent hover:bg-accent/10 transition-all duration-200"
          >
            <Shield className="h-5 w-5" />
            管理后台
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-text-secondary rounded-xl hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </>
  ), [pathname, isAdmin]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 z-40 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${mobileOpen ? 'visible' : 'invisible pointer-events-none'}`}>
        <div
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`fixed inset-y-0 left-0 w-64 bg-sidebar shadow-2xl flex flex-col transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebarContent}
        </aside>
      </div>

      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setMobileOpen(true)} />
    </>
  );
}
