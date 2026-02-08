'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SliderCaptchaProps {
  onSuccess: (token: string) => void;
  onReset?: () => void;
}

export default function SliderCaptcha({ onSuccess, onReset }: SliderCaptchaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [trail, setTrail] = useState<number[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderWidth = 40;
  const targetPosition = 85; // percentage
  const tolerance = 5; // percentage tolerance

  const generateToken = useCallback(() => {
    // Generate a simple token based on verification data
    const data = {
      t: Date.now(),
      d: Date.now() - startTime,
      l: trail.length,
      p: position,
    };
    return btoa(JSON.stringify(data));
  }, [startTime, trail.length, position]);

  const handleStart = useCallback((clientX: number) => {
    if (isVerified) return;
    setIsDragging(true);
    setStartTime(Date.now());
    setTrail([]);
  }, [isVerified]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging || !containerRef.current || isVerified) return;

    const rect = containerRef.current.getBoundingClientRect();
    const maxMove = rect.width - sliderWidth;
    const newPosition = Math.max(0, Math.min(clientX - rect.left - sliderWidth / 2, maxMove));
    const percentage = (newPosition / maxMove) * 100;

    setPosition(percentage);
    setTrail(prev => [...prev, percentage]);
  }, [isDragging, isVerified]);

  const handleEnd = useCallback(() => {
    if (!isDragging || isVerified) return;
    setIsDragging(false);

    const duration = Date.now() - startTime;

    // Validation checks
    const isPositionCorrect = Math.abs(position - targetPosition) <= tolerance;
    const isDurationReasonable = duration > 200 && duration < 10000;
    const hasTrail = trail.length > 5;

    if (isPositionCorrect && isDurationReasonable && hasTrail) {
      setIsVerified(true);
      onSuccess(generateToken());
    } else {
      // Reset on failure
      setPosition(0);
      setTrail([]);
    }
  }, [isDragging, isVerified, position, startTime, trail.length, generateToken, onSuccess]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
  const handleMouseUp = useCallback(() => handleEnd(), [handleEnd]);

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const handleTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);
  const handleTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const reset = () => {
    setPosition(0);
    setIsVerified(false);
    setTrail([]);
    onReset?.();
  };

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex items-center justify-between">
        <span>请拖动滑块完成验证</span>
        {isVerified && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            重置
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        className={`relative h-10 rounded-lg overflow-hidden select-none ${
          isVerified ? 'bg-green-100' : 'bg-gray-100'
        }`}
      >
        {/* Track fill */}
        <div
          className={`absolute left-0 top-0 h-full transition-colors ${
            isVerified ? 'bg-green-200' : 'bg-pink-100'
          }`}
          style={{ width: `${position}%` }}
        />

        {/* Target indicator */}
        {!isVerified && (
          <div
            className="absolute top-0 h-full w-1 bg-pink-300/50"
            style={{ left: `${targetPosition}%` }}
          />
        )}

        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-sm ${isVerified ? 'text-green-600' : 'text-gray-400'}`}>
            {isVerified ? '验证成功' : '向右拖动滑块'}
          </span>
        </div>

        {/* Slider handle */}
        <div
          className={`absolute top-0 h-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
            isVerified
              ? 'bg-green-500 text-white'
              : isDragging
              ? 'bg-pink-500 text-white'
              : 'bg-white border-2 border-gray-300 text-gray-400 hover:border-pink-400'
          }`}
          style={{
            width: `${sliderWidth}px`,
            left: `calc(${position}% - ${(position / 100) * sliderWidth}px)`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {isVerified ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
