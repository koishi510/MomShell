// frontend/app/guardian/page.tsx
/**
 * 伴侣守护页面
 */

'use client';

import GuardianDashboard from '../../components/guardian/GuardianDashboard';
import { AuthGuard } from '../../components/AuthGuard';

export default function GuardianPage() {
  return (
    <AuthGuard>
      <GuardianDashboard />
    </AuthGuard>
  );
}
