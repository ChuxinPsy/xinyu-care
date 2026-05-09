import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface EmotionAvatarProps {
  emotion: 'very_good' | 'good' | 'neutral' | 'bad' | 'very_bad';
}

export default function EmotionAvatar({ emotion }: EmotionAvatarProps) {
  // 根据情绪定义颜色和表情
  const emotionConfig = {
    very_good: {
      color: 'from-yellow-300 to-pink-400',
      shadow: 'shadow-yellow-200',
      eyes: '^^',
      mouth: 'smile',
      decoration: '✨',
    },
    good: {
      color: 'from-emerald-300 to-blue-400',
      shadow: 'shadow-emerald-200',
      eyes: '··',
      mouth: 'smile',
      decoration: '🍀',
    },
    neutral: {
      color: 'from-purple-200 to-indigo-300',
      shadow: 'shadow-purple-100',
      eyes: '--',
      mouth: 'neutral',
      decoration: '☁️',
    },
    bad: {
      color: 'from-blue-300 to-cyan-400',
      shadow: 'shadow-blue-200',
      eyes: 'uu',
      mouth: 'sad',
      decoration: '💧',
    },
    very_bad: {
      color: 'from-red-400 to-orange-500',
      shadow: 'shadow-red-200',
      eyes: '>>',
      mouth: 'angry',
      decoration: '💢',
    },
  };

  const config = emotionConfig[emotion] || emotionConfig.neutral;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* 背景光晕 */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`absolute inset-0 rounded-full blur-2xl bg-gradient-to-tr ${config.color} opacity-30`}
      />

      {/* 3D 球体主体 */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: 5 }}
        className={`relative w-28 h-28 rounded-full bg-gradient-to-tr ${config.color} shadow-2xl flex flex-col items-center justify-center overflow-hidden border-b-4 border-black/10`}
      >
        {/* 高光 */}
        <div className="absolute top-3 left-6 w-8 h-4 bg-white/30 rounded-full blur-sm rotate-[-20deg]" />
        
        {/* 眼睛 */}
        <div className="flex gap-6 mb-1">
          <motion.div 
            animate={emotion === 'neutral' ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}
            className="w-3 h-3 flex items-center justify-center text-lg font-bold text-slate-800/80"
          >
            {config.eyes[0]}
          </motion.div>
          <motion.div 
            animate={emotion === 'neutral' ? { scaleY: [1, 0.2, 1] } : {}}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}
            className="w-3 h-3 flex items-center justify-center text-lg font-bold text-slate-800/80"
          >
            {config.eyes[1]}
          </motion.div>
        </div>

        {/* 嘴巴 */}
        <motion.div
          animate={emotion === 'very_good' ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {config.mouth === 'smile' && (
            <div className="w-6 h-3 border-b-3 border-slate-800/80 rounded-full" />
          )}
          {config.mouth === 'neutral' && (
            <div className="w-4 h-1 bg-slate-800/80 rounded-full" />
          )}
          {config.mouth === 'sad' && (
            <div className="w-6 h-3 border-t-3 border-slate-800/80 rounded-full mt-3" />
          )}
          {config.mouth === 'angry' && (
            <div className="w-6 h-1 bg-slate-800/80 rounded-sm" />
          )}
        </motion.div>

        {/* 腮红 */}
        <div className="absolute inset-x-0 bottom-6 flex justify-between px-6 opacity-40">
          <div className="w-3 h-1 bg-pink-400 rounded-full blur-[1px]" />
          <div className="w-3 h-1 bg-pink-400 rounded-full blur-[1px]" />
        </div>
      </motion.div>

      {/* 装饰元素 (Zzz, Sparkles, etc.) */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-2 -right-2 text-2xl"
        >
          {config.decoration}
        </motion.div>
      </AnimatePresence>

      {/* 睡眠气泡 (针对中性/无聊情绪) */}
      {emotion === 'neutral' && (
        <div className="absolute -top-6 -left-3 space-y-[-8px]">
          <motion.span
            animate={{ y: [-8, -24], x: [0, 8], opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="block text-lg font-bold text-purple-400"
          >
            Z
          </motion.span>
          <motion.span
            animate={{ y: [-8, -24], x: [0, 12], opacity: [0, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="block text-sm font-bold text-purple-300"
          >
            z
          </motion.span>
        </div>
      )}
    </div>
  );
}
