// frontend/lib/user.ts
/**
 * 用户身份工具函数
 * 简单方案：使用 localStorage 存储唯一用户 ID
 * 用于向后兼容（开发模式）当用户未使用 JWT 认证时
 */

const USER_ID_KEY = 'momshell_user_id';

/**
 * 获取或生成用户 ID
 * 首次访问时生成唯一 ID 并存储在 localStorage
 * 注意：这仅用于向后兼容。新代码应使用 AuthContext
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'server_render';
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    // 生成 UUID v4
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * 清除用户 ID（用于登出或重置）
 */
export function clearUserId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }
}

/**
 * 检查是否已有用户 ID（不会创建新的）
 */
export function hasUserId(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return !!localStorage.getItem(USER_ID_KEY);
}
