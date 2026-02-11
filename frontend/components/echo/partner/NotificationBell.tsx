// components/echo/partner/NotificationBell.tsx
/**
 * NotificationBell - Notification bell with red dot indicator
 *
 * Features:
 * - Bell icon
 * - Red dot for unread notifications
 * - Click to show notifications
 * - Animation when new notifications arrive
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { EchoNotification } from '../../../types/echo';

interface NotificationBellProps {
  unreadCount?: number;
  notifications?: EchoNotification[];
  onMarkRead?: (notificationId: string) => Promise<void>;
  onMarkAllRead?: () => Promise<void>;
  className?: string;
}

export function NotificationBell({
  unreadCount = 0,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  className = '',
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <motion.button
        onClick={handleToggle}
        className={`relative p-2 rounded-full hover:bg-white/10 transition-colors ${className}`}
        style={{ color: 'white' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell size={24} />

        {/* Red dot indicator */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: ECHO_COLORS.beach.notificationBadge,
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notification dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed right-4 top-16 z-50 w-80 max-h-[60vh] overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${ECHO_COLORS.beach.sand} 0%, ${ECHO_COLORS.beach.sandWet} 100%)`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-bold text-white">通知</h3>
                {unreadCount > 0 && onMarkAllRead && (
                  <button
                    onClick={async () => {
                      await onMarkAllRead();
                    }}
                    className="text-xs text-white/60 hover:text-white transition-colors"
                  >
                    全部已读
                  </button>
                )}
              </div>

              {/* Notifications list */}
              <div className="overflow-y-auto max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-white/50">
                    暂无通知
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      className={`p-4 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                        !notification.is_read ? 'bg-white/5' : ''
                      }`}
                      onClick={async () => {
                        if (!notification.is_read && onMarkRead) {
                          await onMarkRead(notification.id);
                        }
                      }}
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon based on type */}
                        <div className="text-lg">
                          {getNotificationIcon(notification.notification_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm">
                            {notification.title}
                          </p>
                          <p className="text-white/60 text-xs mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-white/40 text-xs mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>

                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div
                            className="w-2 h-2 rounded-full mt-1"
                            style={{ backgroundColor: ECHO_COLORS.beach.notificationBadge }}
                          />
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    wish_new: '🍾',
    wish_granted: '💝',
    memory_opened: '🐚',
    task_reminder: '🔔',
    community_like: '❤️',
    shell_washed: '✨',
    memory_ready: '🎨',
  };
  return icons[type] || '📬';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  });
}
