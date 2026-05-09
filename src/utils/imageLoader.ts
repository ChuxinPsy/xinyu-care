// 图片加载工具函数
export interface CarouselImage {
  src: string;
  alt: string;
  name: string;
}

/**
 * 获取轮播图片列表
 * 直接使用静态路径，避免 Vite import.meta.glob 的 MIME 类型问题
 */
export const loadCarouselImages = (): CarouselImage[] => {
  // 直接返回已知的图片路径
  return [
    { src: '/srcs/img/1.png', alt: '轮播图片 1', name: '1' },
    { src: '/srcs/img/2.png', alt: '轮播图片 2', name: '2' },
    { src: '/srcs/img/3.png', alt: '轮播图片 3', name: '3' },
  ];
};

/**
 * 预加载图片
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * 批量预加载图片
 */
export const preloadImages = async (images: CarouselImage[]): Promise<void> => {
  try {
    await Promise.all(images.map(img => preloadImage(img.src)));
  } catch (error) {
    console.warn('Some images failed to preload:', error);
  }
};