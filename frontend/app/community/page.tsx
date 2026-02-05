// frontend/app/community/page.tsx
/**
 * 互助社区页面
 */

'use client';

import CommunityFeed from '../../components/community/CommunityFeed';
import { AuthGuard } from '../../components/AuthGuard';

export default function CommunityPage() {
  return (
    <AuthGuard>
      <CommunityFeed />
    </AuthGuard>
  );
}
