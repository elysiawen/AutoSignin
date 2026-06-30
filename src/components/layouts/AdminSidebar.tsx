'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useConfirm } from '@/components/ui/Confirm';
import {
  Shield,
  Users,
  ListTodo,
  Settings,
  LogOut,
  Gamepad2,
  Menu,
  FileText,
  Globe,
  Database,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import AdminMobileHeader from './AdminMobileHeader';

const adminNavigation = [
  { name: '概览', href: '/admin', icon: LayoutDashboard },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '全部账号', href: '/admin/accounts', icon: Globe },
  { name: '全部任务', href: '/admin/tasks', icon: ListTodo },
  { name: '执行日志', href: '/admin/logs', icon: FileText },
  { name: '系统设置', href: '/admin/settings', icon: Database },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { confirm } = useConfirm();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const confirmed = await confirm('确定要退出登录吗？', {
      title: '退出登录',
      confirmText: '退出',
      confirmColor: 'red',
    });
    if (confirmed) {
      signOut({ callbackUrl: '/auth/login' });
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebarContent = useMemo(() => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">管理后台</h1>
            <p className="text-xs text-text-tertiary mt-0.5">AutoSignin Admin</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="px-4 mb-2 text-[11px] font-medium text-text-quaternary uppercase tracking-wider">
          管理菜单
        </p>
        {adminNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-text-secondary hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-sidebar-accent-foreground' : ''}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium rounded-xl text-accent hover:bg-accent/10 transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          返回用户面板
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-text-secondary rounded-xl hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          退出登录
        </button>
      </div>
    </>
  ), [pathname]);

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
      <AdminMobileHeader onMenuClick={() => setMobileOpen(true)} />
    </>
  );
}
