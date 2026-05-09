import ImageCarousel from '@/components/common/ImageCarousel';

export default function CarouselTest() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          轮播图组件测试
        </h1>
        
        
        {/* 单独的轮播图测试 */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            独立轮播图组件
          </h2>
          <ImageCarousel className="w-full" />
        </div>
        
        {/* 功能说明 */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
            功能特性
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            <li>• 自动轮播：每 6 秒切换一次</li>
            <li>• 动态加载：从 srcs/img 目录读取所有图片</li>
            <li>• 平滑动画：使用 Framer Motion 实现横向滑动</li>
            <li>• 交互控制：支持手动切换和悬停暂停</li>
            <li>• 性能优化：图片懒加载和预缓存</li>
            <li>• 防抖处理：避免频繁点击</li>
            <li>• 响应式设计：适配不同屏幕尺寸</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
