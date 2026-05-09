import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function HourCounterTest() {
  const [currentValue, setCurrentValue] = useState("0");
  const [isAnimating, setIsAnimating] = useState(false);

  const animateToTarget = () => {
    setIsAnimating(true);
    setCurrentValue("0");
    
    const targetStr = "24h";
    const targetValue = parseFloat(targetStr.replace('h', '')); // 24
    
    let current = 0;
    const steps = Math.max(50, Math.min(100, targetValue * 2)); // 48步
    const increment = targetValue / steps; // 0.5
    
    console.log('开始动画:', { targetValue, steps, increment });
    
    const updateCounter = () => {
      if (current < targetValue) {
        current = Math.min(targetValue, current + increment);
        const displayValue = Math.ceil(current) + 'h';
        
        console.log('动画步骤:', { current, displayValue });
        setCurrentValue(displayValue);
        
        setTimeout(updateCounter, 30);
      } else {
        setCurrentValue(targetStr);
        setIsAnimating(false);
        console.log('动画完成:', targetStr);
      }
    };
    
    setTimeout(updateCounter, 100); // 延迟开始
  };

  const resetCounter = () => {
    setCurrentValue("0");
    setIsAnimating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            24h 计数器专项测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            专门测试 "24h" 的动画显示问题
          </p>
          
          <div className="flex gap-4 justify-center mb-8">
            <Button onClick={animateToTarget} disabled={isAnimating}>
              {isAnimating ? '动画中...' : '开始动画'}
            </Button>
            <Button variant="outline" onClick={resetCounter} disabled={isAnimating}>
              重置
            </Button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
          <div className="text-purple-600 text-6xl font-bold mb-4">
            {currentValue}
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">心理咨询</p>
          <p className="text-xs text-gray-500 mt-2">目标: 24h</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
            调试信息
          </h3>
          <div className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
            <p><strong>目标值：</strong>24h</p>
            <p><strong>解析后：</strong>24 (数字) + "h" (后缀)</p>
            <p><strong>动画步数：</strong>48步 (Math.max(50, Math.min(100, 24 * 2)))</p>
            <p><strong>每步增量：</strong>0.5 (24 / 48)</p>
            <p><strong>显示逻辑：</strong>Math.ceil(current) + 'h'</p>
            <p><strong>动画间隔：</strong>30ms</p>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-900 dark:text-green-100">
            修复要点
          </h3>
          <div className="text-green-800 dark:text-green-200 space-y-2 text-sm">
            <p>1. <strong>使用 Math.ceil()：</strong>确保小数值也能显示（如 0.5 → 1h）</p>
            <p>2. <strong>动态步数：</strong>根据目标值调整动画步数，确保平滑过渡</p>
            <p>3. <strong>适当延迟：</strong>给动画一个启动时间</p>
            <p>4. <strong>最终确认：</strong>动画结束时强制设置为目标值</p>
          </div>
        </div>
      </div>
    </div>
  );
}