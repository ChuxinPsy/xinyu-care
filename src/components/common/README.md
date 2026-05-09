# ImageCarousel 轮播图组件

一个功能完整的横向轮播图组件，专为医生端首页设计。

## 功能特性

### 🔄 自动轮播
- 每 6 秒自动切换到下一张图片
- 循环播放，无缝衔接
- 鼠标悬停时暂停播放

### 📁 动态图片加载
- 自动从 `srcs/img` 目录读取所有图片文件
- 支持 PNG、JPG、JPEG、WEBP 格式
- 无需硬编码图片路径

### 🎨 平滑动画
- 使用 Framer Motion 实现横向滑动效果
- 支持 Spring 动画，提供自然的过渡效果
- 响应式设计，适配各种屏幕尺寸

### 🎯 交互控制
- 左右导航按钮
- 底部指示器点击跳转
- 防抖处理，避免频繁点击

### ⚡ 性能优化
- 图片懒加载
- 预缓存当前及相邻两张图片
- 首次加载时优先加载第一张图片

## 使用方法

### 基础用法

```tsx
import ImageCarousel from '@/components/common/ImageCarousel';

function MyComponent() {
  return (
    <div>
      <ImageCarousel />
    </div>
  );
}
```

### 自定义配置

```tsx
<ImageCarousel 
  className="w-full h-64" 
  autoPlayInterval={8000} // 8秒切换间隔
/>
```

## Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `className` | `string` | `''` | 自定义 CSS 类名 |
| `autoPlayInterval` | `number` | `6000` | 自动播放间隔（毫秒） |

## 图片要求

1. 将图片文件放置在 `srcs/img/` 目录下
2. 支持的格式：`.png`、`.jpg`、`.jpeg`、`.webp`
3. 建议图片尺寸比例为 16:9 或 4:3
4. 文件名将作为图片的 alt 属性

## 技术实现

- **React Hooks**: 使用 `useState`、`useEffect`、`useCallback`、`useRef`
- **Framer Motion**: 提供平滑的动画效果
- **Vite Glob Import**: 动态导入图片资源
- **TypeScript**: 完整的类型支持
- **Tailwind CSS**: 响应式样式设计

## 注意事项

1. 确保 `srcs/img` 目录存在且包含图片文件
2. 图片文件名应避免特殊字符
3. 大图片可能影响加载性能，建议优化图片大小
4. 组件会自动处理空图片列表的情况