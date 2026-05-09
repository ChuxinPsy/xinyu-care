import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function SimpleCounterTest() {
  const [counters, setCounters] = useState([
    { id: 1, target: "9500万", current: "0", label: "抑郁患者" },
    { id: 2, target: "6.4万", current: "0", label: "心理医生" },
    { id: 3, target: "17.5%", current: "0", label: "抑郁患率" },
    { id: 4, target: "24h", current: "0", label: "心理咨询" }
  ]);

  const animateCounter = (index: number) => {
    const counter = counters[index];
    const targetStr = counter.target;
    let targetValue: number, suffix = '', isDecimal = false;
    
    // 解析目标值和后缀
    if (targetStr.includes('万')) {
      targetValue = parseFloat(targetStr.replace('万', ''));
      suffix = '万';
      isDecimal = targetValue < 10;
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
    const steps = Math.max(50, Math.min(100, targetValue * 2));
    const increment = targetValue / steps;
    
    const updateCounter = () => {
      if (currentValue < targetValue) {
        currentValue = Math.min(targetValue, currentValue + increment);
        
        let displayValue: string;
        if (suffix === '万') {
          if (isDecimal) {
            displayValue = currentValue.toFixed(1) + '万';
          } else {
            displayValue = Math.floor(currentValue) + '万';
          }
        } else if (suffix === '%') {
          displayValue = currentValue.toFixed(1) + '%';
        } else if (suffix === 'h') {
          displayValue = Math.ceil(currentValue) + 'h'; // 使用ceil确保显示
        } else {
          displayValue = Math.floor(currentValue).toString();
        }
        
        setCounters(prev => prev.map((c, i) => 
          i === index ? { ...c, current: displayValue } : c
        ));
        
        setTimeout(updateCounter, 30);
      } else {
        setCounters(prev => prev.map((c, i) => 
          i === index ? { ...c, current: targetStr } : c
        ));
      }
    };
    
    updateCounter();
  };

  const resetCounters = () => {
    setCounters(prev => prev.map(c => ({ ...c, current: "0" })));
  };

  const startAnimation = () => {
    resetCounters();
    counters.forEach((_, i) => {
      setTimeout(() => animateCounter(i), i * 200);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            计数器动画测试（简化版）
          </h1>
          <div className="flex gap-4 justify-center">
            <Button onClick={startAnimation}>开始动画</Button>
            <Button variant="outline" onClick={resetCounters}>重置</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {counters.map((counter, index) => (
            <div key={counter.id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
              <div className="text-purple-600 text-4xl font-bold mb-2">
                {counter.current}
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">{counter.label}</p>
              <p className="text-xs text-gray-500 mt-2">目标: {counter.target}</p>
            </div>
          ))}
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-900 dark:text-green-100">
            修复逻辑说明
          </h3>
          <div className="text-green-800 dark:text-green-200 space-y-2 text-sm">
            <p><strong>问题：</strong>原来的逻辑将"6.4万"转换为64000，然后除以10000显示，导致精度丢失</p>
            <p><strong>解决：</strong>直接在显示单位上进行计算，保持小数精度</p>
            <p><strong>逻辑：</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>"9500万" → 目标值9500，显示时加"万"</li>
              <li>"6.4万" → 目标值6.4，显示时保留1位小数加"万"</li>
              <li>"17.5%" → 目标值17.5，显示时保留1位小数加"%"</li>
              <li>"24h" → 目标值24，显示时取整加"h"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}