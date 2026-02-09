// frontend/components/shell/ShellWrapper.tsx
/**
 * Shell UI 包装组件
 * 为现有页面添加 Shell UI 的底部导航
 */

'use client';

import { usePathname } from 'next/navigation';
import { TabBar } from './TabBar';
import { useAuth } from '../../contexts/AuthContext';

interface ShellWrapperProps {
  children: React.ReactNode;
}

export function ShellWrapper({ children }: ShellWrapperProps) {
  const pathname = usePathname();
  const { user, selectedIdentity } = useAuth();

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

  // 确定主题（基于路径或用户角色）
  const getTheme = (): 'day' | 'night' => {
    if (pathname.includes('/partner')) {
      return 'night';
    }
    return getUserRole() === 'partner' ? 'night' : 'day';
  };

  const userRole = getUserRole();
  const theme = getTheme();

  return (
    <div className="min-h-screen pb-20">
      {children}
      <TabBar theme={theme} userRole={userRole} />
    </div>
  );
}
