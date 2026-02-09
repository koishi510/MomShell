// frontend/app/shell/layout.tsx
/**
 * Shell UI 布局
 * TabBar 由 GlobalNav 组件在根布局中处理
 */

export default function ShellLayout({
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
