// 生成冥想音频封面图片的脚本
const fs = require('fs');
const path = require('path');

const covers = [
  {
    name: '焦虑缓解呼吸法',
    gradient: 'from-emerald-400 to-teal-500',
    colors: ['#34d399', '#14b8a6'],
    icon: 'cloud'
  },
  {
    name: '身体扫描冥想',
    gradient: 'from-violet-400 to-purple-500',
    colors: ['#a78bfa', '#a855f7'],
    icon: 'sparkles'
  },
  {
    name: '睡前放松引导',
    gradient: 'from-indigo-400 to-blue-500',
    colors: ['#818cf8', '#3b82f6'],
    icon: 'moon'
  },
  {
    name: '专注力训练',
    gradient: 'from-amber-400 to-orange-500',
    colors: ['#fbbf24', '#f97316'],
    icon: 'zap'
  },
  {
    name: '抑郁症康复之路',
    gradient: 'from-rose-400 to-pink-500',
    colors: ['#fb7185', '#ec4899'],
    icon: 'heart'
  }
];

const iconPaths = {
  cloud: 'M3.5 13a3.5 3.5 0 0 1-.38-6.97.5.5 0 0 1 .14-.02c.44-2.23 2.31-3.88 4.54-3.88 1.96 0 3.73 1.22 4.4 3.08.13.36.2.75.2 1.15l.01.2c1.8.13 3.24 1.69 3.24 3.58 0 2-1.6 3.61-3.57 3.61H4.14A3.5 3.5 0 0 1 3.5 13z',
  sparkles: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  zap: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'
};

const coversDir = path.join(__dirname, '../public/srcs/music/covers');

// 确保目录存在
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

covers.forEach(cover => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${cover.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cover.colors[0]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${cover.colors[1]};stop-opacity:1" />
    </linearGradient>
    <filter id="blur1">
      <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
    </filter>
    <filter id="blur2">
      <feGaussianBlur in="SourceGraphic" stdDeviation="30" />
    </filter>
  </defs>
  
  <!-- 背景渐变 -->
  <rect width="400" height="400" fill="url(#grad-${cover.name})"/>
  
  <!-- 装饰光晕 -->
  <circle cx="320" cy="80" r="80" fill="white" opacity="0.15" filter="url(#blur1)"/>
  <circle cx="80" cy="320" r="60" fill="white" opacity="0.1" filter="url(#blur2)"/>
  
  <!-- 图标 -->
  <g transform="translate(200, 200)">
    <path d="${iconPaths[cover.icon]}" 
          transform="translate(-12, -12) scale(4)" 
          fill="white" 
          opacity="0.3" 
          stroke="white" 
          stroke-width="0.5"/>
  </g>
</svg>`;

  const filename = `${cover.name}.svg`;
  const filepath = path.join(coversDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✓ 生成封面: ${filename}`);
});

console.log('\n所有封面图片生成完成！');
