// frontend/app/chat/page.tsx
/**
 * Soul Companion chat page (requires authentication)
 */

'use client';

import { AuthGuard } from '../../components/AuthGuard';
import { CompanionInterface } from '../../components/CompanionInterface';

export default function ChatPage() {
  return (
    <AuthGuard>
      <CompanionInterface />
    </AuthGuard>
  );
}
