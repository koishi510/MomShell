// frontend/app/coach/layout.tsx
/**
 * 康复教练布局 - 添加底部导航空间
 */

export default function CoachLayout({
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
