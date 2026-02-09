// frontend/components/shell/GlobalNav.tsx
/**
 * 全局导航组件
 * 在 Shell UI 相关页面显示底部 TabBar
 */

'use client';

import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { useAuth } from '../../contexts/AuthContext';

// 需要显示 TabBar 的路径前缀
const SHELL_ROUTES = [
  '/shell',
  '/community',
  '/chat',
  '/coach',
  '/guardian',
];

// 不显示 TabBar 的路径（登录、注册等）
const EXCLUDED_ROUTES = [
  '/auth',
  '/identity',
  '/shell/mom/memory',
  '/shell/partner/task/',
];

export function GlobalNav() {
  const pathname = usePathname();
  const { user, selectedIdentity, isAuthenticated } = useAuth();

  // 检查是否应该显示 TabBar
  const shouldShowNav = () => {
    // 排除特定路径
    if (EXCLUDED_ROUTES.some(route => pathname.startsWith(route))) {
      return false;
    }
    // 首页不显示
    if (pathname === '/') {
      return false;
    }
    // 在 Shell 相关路由显示
    if (SHELL_ROUTES.some(route => pathname.startsWith(route))) {
      return true;
    }
    return false;
  };

  // 确定用户角色
  const getUserRole = (): 'mom' | 'partner' => {
    if (user?.role === 'partner' || user?.role === 'dad') {
      return 'partner';
    }
    if (selectedIdentity) {
      return selectedIdentity;
    }
    return 'mom';
  };

  // 确定主题
  const getTheme = (): 'day' | 'night' => {
    if (pathname.includes('/partner')) {
      return 'night';
    }
    return getUserRole() === 'partner' ? 'night' : 'day';
  };

  if (!shouldShowNav()) {
    return null;
  }

  return <TabBar theme={getTheme()} userRole={getUserRole()} />;
}
