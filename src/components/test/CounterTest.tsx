import { useEffect, useRef } from 'react';

export default function CounterTest() {
  const countersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animateCounter = (counter: HTMLElement) => {
      const targetStr = counter.getAttribute("data-target") || "0";
      let targetValue: number, suffix = '', isDecimal = false;
      
      // 解析目标值和后缀
      if (targetStr.includes('万')) {
        targetValue = parseFloat(targetStr.replace('万', ''));
        suffix = '万';
        isDecimal = targetValue < 10; // 小于10万的用小数显示
      } else if (targetStr.includes('%')) {
        targetValue = parseFloat(targetStr.replace('%', ''));
        suffix = '%';
        isDecimal = true;
      } else if (targetStr.includes('h')) {
        targetValue = parseFloat(targetStr.replace('h', ''));
        suffix = 'h';
      } else {
        targetValue = parseFloat(targetStr) || 0;
      }
      
      let currentValue = 0;
      const increment = targetValue / 100; // 100步完成动画

      const updateCounter = () => {
        if (currentValue < targetValue) {
          currentValue = Math.min(targetValue, currentValue + increment);
          
          // 格式化显示值
          if (suffix === '万') {
            if (isDecimal) {
              counter.innerText = currentValue.toFixed(1) + '万';
            } else {
              counter.innerText = Math.floor(currentValue) + '万';
            }
          } else if (suffix === '%') {
            counter.innerText = currentValue.toFixed(1) + '%';
          } else if (suffix === 'h') {
            counter.innerText = Math.floor(currentValue) + 'h';
          } else {
            counter.innerText = Math.floor(currentValue).toString();
          }
          
          setTimeout(updateCounter, 20);
        } else {
          counter.innerText = targetStr; // 确保最终显示目标值
        }
      };
      
      updateCounter();
    };

    // 启动动画
    if (countersRef.current) {
      const counters = countersRef.current.querySelectorAll('.counter');
      counters.forEach((counter) => {
        setTimeout(() => animateCounter(counter as HTMLElement), 500);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            计数器动画测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试首页统计数据的计数器动画效果
          </p>
        </div>

        <div ref={countersRef} className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="counter text-purple-600 text-4xl font-bold mb-2" data-target="9500万">
              0
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">抑郁患者</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="counter text-purple-600 text-4xl font-bold mb-2" data-target="6.4万">
              0
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">心理医生</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="counter text-purple-600 text-4xl font-bold mb-2" data-target="17.5%">
              0
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">抑郁患率</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
            <div className="counter text-purple-600 text-4xl font-bold mb-2" data-target="24h">
              0
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">AI赋能筛查</p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
            修复说明
          </h3>
          <div className="text-blue-800 dark:text-blue-200 space-y-2">
            <p><strong>问题：</strong>原始代码无法正确解析包含中文字符的数字（如"9500万"），导致显示 NaN</p>
            <p><strong>解决方案：</strong>改进了数字解析逻辑，支持"万"、"%"、"h"等后缀</p>
            <p><strong>效果：</strong>现在计数器可以正确显示从 0 到目标值的动画效果</p>
          </div>
        </div>
      </div>
    </div>
  );
}