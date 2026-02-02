// frontend/app/guardian/page.tsx
/**
 * 伴侣守护页面
 */

import GuardianDashboard from '../../components/guardian/GuardianDashboard';

export const metadata = {
  title: '伴侣守护 - MomShell',
  description: '让伴侣成为你的贴心守护者',
};

export default function GuardianPage() {
  return <GuardianDashboard />;
}
