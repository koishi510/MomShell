// components/echo/partner/LightString.tsx
/**
 * LightString - String of lights with hanging photos
 *
 * Features:
 * - Curved light string with bulbs
 * - Photos hanging between bulbs
 * - Gentle swaying animation
 * - Click to view photo detail
 * - Horizontal scroll for many photos
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Maximize2 } from 'lucide-react';
import { ECHO_COLORS } from '../../../lib/design-tokens';
import type { LightStringPhoto as LightStringPhotoType } from '../../../types/echo';

interface LightStringProps {
  photos: LightStringPhotoType[];
  maxVisible?: number;
  onPhotoClick?: (photo: LightStringPhotoType) => void;
  className?: string;
}

export function LightString({
  photos,
  maxVisible = 5,
  onPhotoClick,
  className = '',
}: LightStringProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<LightStringPhotoType | null>(null);

  const visiblePhotos = photos.slice(0, maxVisible);
  const totalBulbs = visiblePhotos.length + 1;

  const handlePhotoClick = (photo: LightStringPhotoType) => {
    setSelectedPhoto(photo);
    onPhotoClick?.(photo);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Light string container */}
        <div
          className="relative overflow-x-auto overflow-y-hidden pb-4"
          style={{
            minHeight: 120,
          }}
        >
          {/* Scrollable content */}
          <div className="flex items-center gap-0 px-4" style={{ minWidth: '100%' }}>
            {/* Render bulbs and photos */}
            {Array.from({ length: totalBulbs }).map((_, index) => (
              <div key={index} className="flex items-center">
                {/* Bulb */}
                <motion.div
                  className="relative flex-shrink-0"
                  animate={{
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                >
                  {/* Glow */}
                  <div
                    className="absolute inset-0 rounded-full blur-md"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: ECHO_COLORS.beach.lightString.bulb,
                      opacity: 0.5,
                    }}
                  />

                  {/* Bulb */}
                  <div
                    className="relative z-10 flex items-center justify-center rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: ECHO_COLORS.beach.lightString.bulb,
                      boxShadow: `0 0 10px ${ECHO_COLORS.beach.lightString.glow}`,
                    }}
                  >
                    <Lightbulb size={14} color="#1A1A1A" />
                  </div>

                  {/* Cord line to next bulb */}
                  {index < totalBulbs - 1 && (
                    <div
                      className="absolute top-1/2 left-full w-16 -translate-y-1/2 origin-left"
                      style={{
                        height: 2,
                        backgroundColor: ECHO_COLORS.beach.lightString.cord,
                        transform: 'rotate(2deg)', // Slight sag
                      }}
                    />
                  )}
                </motion.div>

                {/* Photo (if not last bulb) */}
                {index < visiblePhotos.length && (
                  <motion.div
                    className="mx-2 flex-shrink-0 relative cursor-pointer group"
                    onClick={() => handlePhotoClick(visiblePhotos[index])}
                    whileHover={{ scale: 1.05 }}
                    animate={{
                      rotate: [-2, 2, -2],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.3,
                    }}
                  >
                    {/* Photo card */}
                    <div
                      className="relative rounded-lg overflow-hidden shadow-lg"
                      style={{
                        width: 70,
                        height: 70,
                        backgroundColor: 'white',
                        padding: 4,
                      }}
                    >
                      {/* Photo */}
                      <img
                        src={visiblePhotos[index].url}
                        alt="Memory"
                        className="w-full h-full object-cover rounded"
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 size={20} color="white" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Timestamp */}
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/50">
                        <span className="text-white text-xs">
                          {new Date(visiblePhotos[index].revealedAt).toLocaleDateString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Hanging string */}
                    <div
                      className="absolute -top-8 left-1/2 w-0.5 -translate-x-1/2"
                      style={{
                        height: 32,
                        backgroundColor: ECHO_COLORS.beach.lightString.cord,
                      }}
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Empty state hint */}
          {photos.length === 0 && (
            <div className="text-center py-8">
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: `${ECHO_COLORS.beach.lightString.bulb}80` }}
                >
                  濯洗尘埃，守望她的流光
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Photo detail modal */}
      {selectedPhoto && (
        <PhotoDetailModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
}

interface PhotoDetailModalProps {
  photo: LightStringPhotoType;
  onClose: () => void;
}

function PhotoDetailModal({ photo, onClose }: PhotoDetailModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            backgroundColor: 'white',
            padding: 8,
          }}
        >
          <img
            src={photo.url}
            alt="Memory detail"
            className="w-full rounded-lg"
          />
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <p className="text-white font-medium">守护的星光，已点亮</p>
          <p className="text-white/60 text-sm mt-1">
            守护于 {new Date(photo.revealedAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
          style={{ color: 'white' }}
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}
