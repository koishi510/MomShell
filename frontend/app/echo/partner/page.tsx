// frontend/app/echo/partner/page.tsx
/**
 * Dad Mode 2.0 - 爸爸模式主页
 *
 * Beach-themed experience with:
 * - Task shells to wash
 * - Wish bottles to catch
 * - Memory shells to create
 * - Light string with revealed memories
 * - 4-tab navigation: 境/圈/愈/记
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { AuthGuard } from '../../../components/AuthGuard';
import {
  BeachArea,
  BottomNavigation,
  TabType,
  TaskShell,
  TaskDetailModal,
  CelebrationAnimation,
  LightString,
  WishBottleIcon,
  WishSeaModal,
  MemoryConchIcon,
  MemoryInjectModal,
  TopBar,
  type TabConfig,
} from '../../../components/echo/partner';
import {
  getEchoStatus,
  getTaskShells,
  startWashingShell,
  confirmShellWashing,
  getWishBottles,
  catchWishBottle,
  createMemoryShell,
  createTask,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getArchive,
} from '../../../lib/api/echo';
import type {
  TaskShell as TaskShellType,
  WishBottle as WishBottleType,
  EchoNotification,
  LightStringPhoto,
  ShellWashResponse,
  ArchiveData,
  StickerStyle,
} from '../../../types/echo';

function PartnerModePage() {
  const router = useRouter();

  // Data states
  const [loading, setLoading] = useState(true);
  const [hasBinding, setHasBinding] = useState(false);
  const [shells, setShells] = useState<TaskShellType[]>([]);
  const [wishes, setWishes] = useState<WishBottleType[]>([]);
  const [notifications, setNotifications] = useState<EchoNotification[]>([]);
  const [lightStringPhotos, setLightStringPhotos] = useState<LightStringPhoto[]>([]);
  const [archiveData, setArchiveData] = useState<ArchiveData | null>(null);
  const [memoryPoolWaiting, setMemoryPoolWaiting] = useState(0);

  // UI states
  const [activeTab, setActiveTab] = useState<TabType>('beach');
  const [selectedShell, setSelectedShell] = useState<TaskShellType | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showWishModal, setShowWishModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    isOpen: boolean;
    stickerUrl: string;
    message: string;
    isEchoFragment: boolean;
  }>({
    isOpen: false,
    stickerUrl: '',
    message: '',
    isEchoFragment: false,
  });

  // Loading states
  const [washing, setWashing] = useState(false);
  const [catching, setCatching] = useState(false);
  const [creatingMemory, setCreatingMemory] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInitialData();

    // Set up polling for notifications
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const loadInitialData = async () => {
    try {
      const statusData = await getEchoStatus();
      setHasBinding(statusData.has_binding);

      if (!statusData.has_binding) {
        setLoading(false);
        return;
      }

      await Promise.all([
        loadShells(),
        loadWishes(),
        loadNotifications(),
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setLoading(false);
    }
  };

  const loadShells = async () => {
    try {
      const data = await getTaskShells();
      setShells(data.shells);
      setMemoryPoolWaiting(data.memory_pool_waiting);
    } catch (error) {
      console.error('Failed to load shells:', error);
    }
  };

  const loadWishes = async () => {
    try {
      const data = await getWishBottles();
      setWishes(data.bottles);
    } catch (error) {
      console.error('Failed to load wishes:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadArchive = async () => {
    try {
      const data = await getArchive();
      setArchiveData(data);
    } catch (error) {
      console.error('Failed to load archive:', error);
    }
  };

  // Task shell handlers
  const handleShellClick = (shell: TaskShellType) => {
    if (shell.status === 'muddy') {
      setSelectedShell(shell);
      setShowTaskModal(true);
    }
  };

  const handleConfirmWash = async () => {
    if (!selectedShell) return;

    setWashing(true);
    try {
      // First start washing
      await startWashingShell(selectedShell.id);

      // Then confirm completion
      const result: ShellWashResponse = await confirmShellWashing(selectedShell.id);

      // Show celebration
      setCelebrationData({
        isOpen: true,
        stickerUrl: result.sticker_url,
        message: result.message,
        isEchoFragment: result.is_echo_fragment,
      });

      // Add to light string
      if (result.light_string_photo) {
        setLightStringPhotos((prev) => [...prev, result.light_string_photo!]);
      }

      // Reload shells
      await loadShells();
    } catch (error) {
      console.error('Failed to confirm washing:', error);
    } finally {
      setWashing(false);
      setShowTaskModal(false);
      setSelectedShell(null);
    }
  };

  // Wish handlers
  const handleCatchWish = async (wishId: string) => {
    setCatching(true);
    try {
      await catchWishBottle(wishId);
      await Promise.all([loadShells(), loadWishes()]);
      setShowWishModal(false);
    } catch (error) {
      console.error('Failed to catch wish:', error);
    } finally {
      setCatching(false);
    }
  };

  // Memory creation handlers
  const handleCreateMemory = async (data: {
    title: string;
    content: string;
    photo_url?: string;
    sticker_style: StickerStyle;
  }) => {
    setCreatingMemory(true);
    try {
      await createMemoryShell(data);
      setShowMemoryModal(false);
      // Show notification that memory is being generated
    } catch (error) {
      console.error('Failed to create memory:', error);
    } finally {
      setCreatingMemory(false);
    }
  };

  // Notification handlers
  const handleMarkRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Calculate unread counts
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;
  const driftingWishes = wishes.filter((w) => w.status === 'drifting').length;

  // Get active shells (not archived)
  const activeShells = shells.filter((s) => s.status !== 'archived');

  // Loading state
  if (loading) {
    return (
      <AuthGuard>
        <BeachArea>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-white text-lg">正在连接守护空间...</div>
          </div>
        </BeachArea>
      </AuthGuard>
    );
  }

  // No binding state
  if (!hasBinding) {
    return (
      <AuthGuard>
        <BeachArea>
          <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="text-6xl mb-6">🔗</div>
            <h2 className="text-2xl font-bold text-white mb-4">尚未绑定伴侣</h2>
            <p className="text-white/70 mb-6 text-center">
              请先在 Guardian 页面完成伴侣绑定
            </p>
            <button
              onClick={() => router.push('/guardian')}
              className="px-6 py-3 rounded-xl font-medium text-white"
              style={{
                backgroundColor: 'rgba(255, 215, 0, 0.8)',
              }}
            >
              前往绑定
            </button>
          </div>
        </BeachArea>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <BeachArea className="pb-20">
        {/* Top Bar */}
        <TopBar
          title={getTabTitle(activeTab)}
          onProfileClick={() => router.push('/profile')}
          unreadCount={unreadNotifications}
        />

        {/* Light String (always visible) */}
        <div className="pt-16 px-4">
          <LightString
            photos={lightStringPhotos}
            maxVisible={5}
          />
        </div>

        {/* Tab Content */}
        <div className="px-4 mt-6">
          {activeTab === 'beach' && (
            <BeachTabContent
              shells={activeShells}
              wishes={wishes}
              memoryPoolWaiting={memoryPoolWaiting}
              onShellClick={handleShellClick}
              onOpenWishModal={() => setShowWishModal(true)}
              onOpenMemoryModal={() => setShowMemoryModal(true)}
            />
          )}

          {activeTab === 'community' && (
            <div className="text-white/60 text-center py-12">
              <div className="text-4xl mb-4">🌊</div>
              <p>爸爸社区</p>
              <p className="text-sm mt-2">与其他爸爸交流经验</p>
            </div>
          )}

          {activeTab === 'heal' && (
            <div className="text-white/60 text-center py-12">
              <div className="text-4xl mb-4">✨</div>
              <p>AI疗愈</p>
              <p className="text-sm mt-2">与AI聊天，缓解压力</p>
            </div>
          )}

          {activeTab === 'archive' && (
            <ArchiveTabContent
              archiveData={archiveData}
              onLoad={loadArchive}
            />
          )}
        </div>

        {/* Floating Action Buttons */}
        {activeTab === 'beach' && (
          <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
            {/* Wish bottle icon */}
            {driftingWishes > 0 && (
              <WishBottleIcon
                onClick={() => setShowWishModal(true)}
                unread={driftingWishes > 0}
              />
            )}
            {/* Memory conch icon */}
            <MemoryConchIcon
              onClick={() => setShowMemoryModal(true)}
            />
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badges={{
            beach: activeShells.filter((s) => s.status === 'muddy').length,
            archive: memoryPoolWaiting,
          }}
        />

        {/* Task Detail Modal */}
        <TaskDetailModal
          shell={selectedShell!}
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedShell(null);
          }}
          onConfirm={handleConfirmWash}
          confirming={washing}
        />

        {/* Wish Sea Modal */}
        <WishSeaModal
          isOpen={showWishModal}
          wishes={wishes}
          onClose={() => setShowWishModal(false)}
          onCatch={handleCatchWish}
          catching={catching}
        />

        {/* Memory Inject Modal */}
        <MemoryInjectModal
          isOpen={showMemoryModal}
          onClose={() => setShowMemoryModal(false)}
          onSubmit={handleCreateMemory}
          submitting={creatingMemory}
        />

        {/* Celebration Animation */}
        <CelebrationAnimation
          isOpen={celebrationData.isOpen}
          stickerUrl={celebrationData.stickerUrl}
          message={celebrationData.message}
          isEchoFragment={celebrationData.isEchoFragment}
          onComplete={() => {
            setCelebrationData({
              isOpen: false,
              stickerUrl: '',
              message: '',
              isEchoFragment: false,
            });
          }}
        />
      </BeachArea>
    </AuthGuard>
  );
}

// Beach Tab Content
function BeachTabContent({
  shells,
  wishes,
  memoryPoolWaiting,
  onShellClick,
  onOpenWishModal,
  onOpenMemoryModal,
}: {
  shells: TaskShellType[];
  wishes: WishBottleType[];
  memoryPoolWaiting: number;
  onShellClick: (shell: TaskShellType) => void;
  onOpenWishModal: () => void;
  onOpenMemoryModal: () => void;
}) {
  const muddyShells = shells.filter((s) => s.status === 'muddy');

  return (
    <div className="space-y-6">
      {/* Memory pool indicator */}
      {memoryPoolWaiting > 0 && (
        <div className="text-center py-4">
          <p className="text-white/60 text-sm">
            她的记忆正在积攒，快去洗贝壳吧 ✨
          </p>
          <p className="text-white/40 text-xs mt-1">
            待解锁记忆 {memoryPoolWaiting} 条
          </p>
        </div>
      )}

      {/* Shells grid */}
      {muddyShells.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏖️</div>
          <p className="text-white/60">沙滩平静，暂时没有泥泞的贝壳</p>
          <button
            onClick={onOpenMemoryModal}
            className="mt-4 px-4 py-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.4)',
            }}
          >
            创建回忆贝壳
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {muddyShells.map((shell) => (
            <div key={shell.id} className="flex justify-center">
              <TaskShell shell={shell} onClick={() => onShellClick(shell)} />
            </div>
          ))}
        </div>
      )}

      {/* Other shells info */}
      {shells.some((s) => s.status !== 'muddy') && (
        <div className="text-center">
          <p className="text-white/40 text-xs">
            已处理: {shells.filter((s) => s.status !== 'muddy').length} 个贝壳
          </p>
        </div>
      )}
    </div>
  );
}

// Archive Tab Content
function ArchiveTabContent({
  archiveData,
  onLoad,
}: {
  archiveData: ArchiveData | null;
  onLoad: () => void;
}) {
  useEffect(() => {
    if (!archiveData) {
      onLoad();
    }
  }, [archiveData, onLoad]);

  if (!archiveData) {
    return (
      <div className="text-center py-12">
        <div className="text-white/60">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Completed shells */}
      <section>
        <h3 className="text-lg font-bold text-white mb-3">已完成的贝壳</h3>
        {archiveData.completed_shells.length === 0 ? (
          <p className="text-white/40 text-sm">还没有完成的贝壳</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {archiveData.completed_shells.map((shell) => (
              <div
                key={shell.id}
                className="aspect-square rounded-xl overflow-hidden"
                style={{
                  backgroundImage: shell.memory_sticker_url
                    ? `url(${shell.memory_sticker_url})`
                    : undefined,
                  backgroundColor: shell.memory_sticker_url
                    ? undefined
                    : 'rgba(255, 255, 255, 0.1)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Echo fragments */}
      {archiveData.echo_fragment_count > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span>✨</span>
            独自守护勋章
          </h3>
          <p className="text-white/60 text-sm">
            当记忆池为空时，你依然默默守护
          </p>
          <div className="mt-2 px-4 py-2 rounded-xl bg-white/5">
            <p className="text-white/80 text-sm">
              已获得 {archiveData.echo_fragment_count} 枚回响碎片
            </p>
          </div>
        </section>
      )}

      {/* Granted wishes */}
      {archiveData.granted_wishes.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-white mb-3">达成的心愿</h3>
          <div className="space-y-2">
            {archiveData.granted_wishes.map((wish) => (
              <div
                key={wish.id}
                className="p-3 rounded-xl bg-white/5 flex items-center gap-2"
              >
                <span className="text-xl">💝</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{wish.content}</p>
                  {wish.mom_reaction && (
                    <span className="text-sm ml-2">{wish.mom_reaction}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getTabTitle(tab: TabType): string {
  const titles: Record<TabType, string> = {
    beach: '爸爸模式',
    community: '爸爸社区',
    heal: 'AI疗愈',
    archive: '珍珠馆',
  };
  return titles[tab];
}

export default function EchoPartnerPage() {
  return (
    <AuthGuard>
      <PartnerModePage />
    </AuthGuard>
  );
}
