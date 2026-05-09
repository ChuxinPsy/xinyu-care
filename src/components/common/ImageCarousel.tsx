import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadCarouselImages, preloadImage, type CarouselImage } from '@/utils/imageLoader';

interface ImageCarouselProps {
  className?: string;
  autoPlayInterval?: number;
}

export default function ImageCarousel({ 
  className = '', 
  autoPlayInterval = 6000 
}: ImageCarouselProps) {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastClickTime = useRef(0);

  // 初始化加载图片
  useEffect(() => {
    const loadImages = async () => {
      const imageList = loadCarouselImages();
      setImages(imageList);
      
      // 预加载第一张图片
      if (imageList.length > 0) {
        try {
          await preloadImage(imageList[0].src);
          setLoadedImages(new Set([0]));
        } catch (error) {
          console.warn('Failed to preload first image:', error);
        }
      }
    };
    
    loadImages();
  }, []);

  // 预加载图片
  const preloadImageAtIndex = useCallback(async (index: number) => {
    if (images[index] && !loadedImages.has(index)) {
      try {
        await preloadImage(images[index].src);
        setLoadedImages(prev => new Set([...prev, index]));
      } catch (error) {
        console.warn(`Failed to preload image at index ${index}:`, error);
      }
    }
  }, [images, loadedImages]);

  // 预加载当前及相邻图片
  useEffect(() => {
    if (images.length === 0) return;
    
    const indicesToLoad = [
      currentIndex,
      (currentIndex - 1 + images.length) % images.length,
      (currentIndex + 1) % images.length
    ];
    
    indicesToLoad.forEach(preloadImageAtIndex);
  }, [currentIndex, images.length, preloadImageAtIndex]);

  // 自动播放逻辑
  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, images.length, autoPlayInterval]);

  // 防抖处理点击事件
  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    const now = Date.now();
    if (now - lastClickTime.current < 300) return; // 300ms 防抖
    lastClickTime.current = now;

    setCurrentIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % images.length;
      } else {
        return (prev - 1 + images.length) % images.length;
      }
    });
  }, [images.length]);

  // 鼠标悬停暂停自动播放
  const handleMouseEnter = () => setIsPlaying(false);
  const handleMouseLeave = () => setIsPlaying(true);

  if (images.length === 0) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-2xl h-48 sm:h-56 md:h-64 lg:h-72 flex items-center justify-center ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">暂无图片</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-sm ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 图片容器 */}
      <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.5 
            }}
            className="absolute inset-0"
          >
            <img
              src={images[currentIndex].src}
              alt={images[currentIndex].alt}
              className="w-full h-full object-cover"
              loading={loadedImages.has(currentIndex) ? "eager" : "lazy"}
            />
          </motion.div>
        </AnimatePresence>

        {/* 导航按钮 */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => handleNavigation('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
              aria-label="上一张"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleNavigation('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
              aria-label="下一张"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* 指示器 */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`跳转到第 ${index + 1} 张图片`}
              />
            ))}
          </div>
        )}

        {/* 播放状态指示器 */}
        <div className="absolute top-3 right-3">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-gray-400'} animate-pulse`} />
        </div>
      </div>
    </div>
  );
}
