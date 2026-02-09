// frontend/app/chat/layout.tsx
/**
 * 聊天布局 - 添加底部导航空间
 */

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20">
      {children}
    </div>
  );
}
