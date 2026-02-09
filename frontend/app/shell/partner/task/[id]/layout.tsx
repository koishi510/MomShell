// frontend/app/shell/partner/task/[id]/layout.tsx
/**
 * Task layout with static params generation
 */

// Required for static export with dynamic routes
export function generateStaticParams() {
  // Generate placeholder IDs for static export
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
    { id: '4' },
    { id: '5' },
    { id: '6' },
    { id: '7' },
    { id: '8' },
    { id: '9' },
    { id: '10' },
  ];
}

export default function TaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
