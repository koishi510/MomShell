// frontend/app/community/layout.tsx
/**
 * 社区布局 - 添加底部导航空间
 */

export default function CommunityLayout({
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
