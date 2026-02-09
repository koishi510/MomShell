// frontend/components/shell/WishBottle.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { SHELL_COLORS } from '../../lib/design-tokens';

interface Wish {
  id: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'fulfilled';
}

interface WishBottleProps {
  onSend?: (wish: string) => void;
  wishes?: Wish[];
  disabled?: boolean;
  className?: string;
}

const MOCK_WISHES: Wish[] = [
  { id: '1', content: '想喝一杯不用管小孩的咖啡', createdAt: '2026-02-08', status: 'fulfilled' },
  { id: '2', content: '想吃草莓蛋糕', createdAt: '2026-02-07', status: 'accepted' },
  { id: '3', content: '想去看一场电影', createdAt: '2026-02-05', status: 'pending' },
];

export function WishBottle({
  onSend,
  wishes = MOCK_WISHES,
  disabled = false,
  className = '',
}: WishBottleProps) {
  const [mode, setMode] = useState<'closed' | 'menu' | 'create' | 'history'>('closed');
  const [wish, setWish] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!wish.trim() || isSending) return;
    setIsSending(true);
    await onSend?.(wish.trim());
    setTimeout(() => {
      setWish('');
      setMode('closed');
      setIsSending(false);
    }, 1500);
  };

  const getStatusLabel = (status: Wish['status']) => {
    if (status === 'pending') return '漂流中';
    if (status === 'accepted') return 'TA已接住';
    return '已达成';
  };

  return (
    <>
      {/* 按钮 */}
      <motion.button
        className={`relative w-14 h-14 rounded-full flex items-center justify-center ${className}`}
        style={{
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 20px rgba(135,206,235,0.3)',
        }}
        onClick={() => !disabled && setMode('menu')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        disabled={disabled}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(135,206,235,0.4) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="text-2xl relative z-10">🍾</span>
        {wishes.filter(w => w.status === 'fulfilled').length > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs text-white z-20"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {wishes.filter(w => w.status === 'fulfilled').length}
          </motion.span>
        )}
      </motion.button>

      {/* 弹窗 */}
      <AnimatePresence>
        {mode !== 'closed' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pr-12">
            <div className="absolute inset-0 bg-black/40" onClick={() => !isSending && setMode('closed')} />

            {mode === 'menu' && (
              <motion.div
                className="relative bg-white rounded-2xl p-6 w-80 shadow-xl"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="text-center mb-5">
                  <span className="text-4xl">🍾</span>
                  <h3 className="text-lg font-medium mt-2 text-gray-800">心愿漂流瓶</h3>
                </div>

                <button
                  onClick={() => setMode('create')}
                  className="w-full mb-3 p-4 rounded-xl bg-amber-50 flex items-center"
                >
                  <span className="text-2xl mr-3">✏️</span>
                  <span className="text-gray-800">写下新心愿</span>
                </button>

                <button
                  onClick={() => setMode('history')}
                  className="w-full p-4 rounded-xl bg-blue-50 flex items-center"
                >
                  <span className="text-2xl mr-3">📜</span>
                  <span className="text-gray-800">往昔心愿 ({wishes.length})</span>
                </button>

                <button
                  onClick={() => setMode('closed')}
                  className="w-full mt-4 text-sm text-gray-400"
                >
                  关闭
                </button>
              </motion.div>
            )}

            {mode === 'create' && (
              <motion.div
                className="relative bg-white rounded-2xl p-6 w-80 shadow-xl"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <button
                  onClick={() => setMode('menu')}
                  disabled={isSending}
                  className="absolute top-4 left-4 text-sm text-gray-400"
                >
                  ← 返回
                </button>

                <h3 className="text-lg font-medium text-center text-gray-800 mb-4 mt-2">写下心愿</h3>

                <textarea
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder="想要什么？告诉 TA..."
                  disabled={isSending}
                  maxLength={200}
                  className="w-full h-28 p-3 rounded-xl border-2 border-amber-200 text-sm resize-none outline-none"
                />

                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-400">{wish.length}/200</span>
                  <button
                    onClick={handleSend}
                    disabled={!wish.trim() || isSending}
                    className="px-5 py-2 rounded-full bg-amber-400 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {isSending ? '发送中...' : '放入瓶中'}
                  </button>
                </div>
              </motion.div>
            )}

            {mode === 'history' && (
              <motion.div
                className="relative bg-white rounded-2xl p-6 w-80 shadow-xl max-h-96 flex flex-col"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <button
                  onClick={() => setMode('menu')}
                  className="absolute top-4 left-4 text-sm text-gray-400"
                >
                  ← 返回
                </button>

                <h3 className="text-lg font-medium text-center text-gray-800 mb-4 mt-2">往昔心愿</h3>

                <div className="flex-1 overflow-y-auto space-y-3">
                  {wishes.map((w) => (
                    <div key={w.id} className="p-3 rounded-xl bg-amber-50">
                      <p className="text-sm text-gray-800 mb-2">{w.content}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{w.createdAt}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                          {getStatusLabel(w.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setMode('create')}
                  className="w-full mt-4 py-3 rounded-full bg-amber-400 text-white text-sm font-medium"
                >
                  写下新心愿
                </button>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
