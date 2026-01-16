import { useState, useRef, useCallback, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling || refreshing) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      // Apply resistance to make it harder to pull
      const resistance = 0.4;
      setPullDistance(Math.min(diff * resistance, threshold * 1.5));
    }
  }, [pulling, refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }

    setPulling(false);
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex justify-center transition-all duration-200 pointer-events-none z-10',
          showIndicator ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: refreshing ? 8 : pullDistance - 40,
        }}
      >
        <div className="bg-background border rounded-full p-2 shadow-lg">
          <RefreshCw
            className={cn(
              'w-5 h-5 text-primary transition-transform',
              refreshing && 'animate-spin'
            )}
            style={{
              transform: refreshing ? undefined : `rotate(${pullProgress * 360}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: refreshing ? 'translateY(48px)' : `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
