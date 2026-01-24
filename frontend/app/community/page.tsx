// frontend/app/community/page.tsx
/**
 * 互助社区页面
 */

import CommunityFeed from '../../components/community/CommunityFeed';

export const metadata = {
  title: '互助社区 - MomShell',
  description: '产后妈妈互助社区，分享经验，获取专业建议',
};

export default function CommunityPage() {
  return <CommunityFeed />;
}
