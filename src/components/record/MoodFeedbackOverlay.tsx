import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Droplets, Eye, Heart, Leaf, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type MoodFeedbackType = 'giver' | 'receiver' | 'observer' | null;

interface MoodFeedbackOverlayProps {
  type: MoodFeedbackType;
  content: string;
  onClose: () => void;
  onShareToTreeHole?: (content: string) => void;
}

const MOCK_MESSAGES = [
  "嘿陌生人，虽然不知道你经历了什么，但我今天吃到了超好吃的蛋糕，分你一半好运！🍰",
  "不要难过，抬头看看天空，云朵正在为你跳舞。☁️",
  "记得深呼吸，你已经做得很棒了，接下来的路我们一起走。🌿",
  "世界偶尔灰暗，但你本身就是光。✨",
  "工作压力大吗？没关系，先抱抱自己，明天又是新的一天。🌙"
];

export default function MoodFeedbackOverlay({ type, content, onClose, onShareToTreeHole }: MoodFeedbackOverlayProps) {
  const [step, setStep] = useState<'anim' | 'interact'>('anim');
  const [flipped, setFlipped] = useState(false);
  const [randomMsg] = useState(MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)]);

  useEffect(() => {
    if (type) {
      const timer = setTimeout(() => setStep('interact'), 2500);
      return () => clearTimeout(timer);
    }
  }, [type]);

  if (!type) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto">
      {/* 调暗背景 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: type === 'receiver' ? 0.8 : 0.6 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950"
      />

      {/* 场景 A: 发光者 (🥰 / 😄) */}
      {type === 'giver' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <AnimatePresence>
            {step === 'anim' && (
              <motion.div
                initial={{ scale: 1, y: 0, opacity: 1 }}
                animate={{ 
                  scale: [1, 1.2, 0.2], 
                  y: [0, -100, -400], 
                  x: [0, 20, 100],
                  opacity: [1, 1, 0] 
                }}
                transition={{ duration: 2, ease: "easeIn" }}
                className="w-24 h-24 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full blur-xl shadow-[0_0_50px_rgba(251,191,36,0.8)]"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step === 'interact' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-xs w-full bg-white dark:bg-slate-900 rounded-[32px] p-8 text-center space-y-6 shadow-2xl relative z-10"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">今天的你闪闪发光！✨</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    你的好心情不仅治愈了自己，也可以照亮别人。愿意把这句话做成“盲盒”，留给未来某个需要安慰的人吗？
                  </p>
                </div>
                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      onShareToTreeHole?.(content);
                      toast.success('已存入树洞，愿这份温暖继续传递', { duration: 1500 });
                      onClose();
                    }}
                    className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20"
                  >
                    <Send className="w-4 h-4 mr-2" /> 存入树洞
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onClose}
                    className="w-full text-slate-400 text-xs font-bold"
                  >
                    <Eye className="w-4 h-4 mr-2" /> 仅自己可见
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 场景 B: 受光者 (😔 / 🤯) */}
      {type === 'receiver' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <AnimatePresence>
            {step === 'anim' && (
              <motion.div
                initial={{ y: -400, opacity: 0, rotate: -45 }}
                animate={{ 
                  y: 0, 
                  opacity: 1, 
                  rotate: [0, 10, -10, 0],
                  x: [0, -20, 20, 0]
                }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                className="flex flex-col items-center gap-4"
              >
                <Leaf className="w-16 h-16 text-emerald-400/60 blur-[1px]" />
                <span className="text-white/80 font-bold tracking-widest animate-pulse">接住你了...</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step === 'interact' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-xs w-full perspective-1000 relative z-10"
              >
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  className="w-full h-64 relative preserve-3d"
                >
                  {/* 正面: 抱抱 */}
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl border-2 border-emerald-100/20">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                      <Heart className="w-8 h-8 text-emerald-500 fill-current" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">抱抱。</h3>
                    <p className="text-sm text-slate-500">树洞里有一份专门留给你的温暖...</p>
                    <Button 
                      onClick={() => setFlipped(true)}
                      className="mt-2 rounded-full px-6 bg-emerald-500 hover:bg-emerald-600 font-bold"
                    >
                      点击拆开
                    </Button>
                  </div>

                  {/* 背面: 暖心话语 */}
                  <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-8 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl text-white">
                    <p className="text-sm font-medium italic leading-relaxed">
                      “{randomMsg}”
                    </p>
                    <div className="pt-4 w-full">
                      <Button 
                        onClick={() => {
                          toast.success('对方收到了你的暖意 ❤️', { duration: 1500 });
                          onClose();
                        }}
                        className="w-full h-12 rounded-2xl bg-white text-emerald-600 hover:bg-white/90 font-black"
                      >
                        <Heart className="w-4 h-4 mr-2 fill-current" /> 收到温暖
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 场景 C: 观察者 (😶) */}
      {type === 'observer' && (
        <div className="relative w-full h-full flex items-center justify-center">
          <AnimatePresence>
            {step === 'anim' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 2], opacity: [0, 0.5, 0] }}
                transition={{ duration: 2 }}
                className="w-40 h-40 border-2 border-white/30 rounded-full flex items-center justify-center"
              >
                <div className="w-20 h-20 border border-white/20 rounded-full" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step === 'interact' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xs w-full bg-white dark:bg-slate-900 rounded-[32px] p-8 text-center space-y-6 shadow-2xl relative z-10"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                  <Droplets className="w-8 h-8 text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">平静也是一种力量。</h3>
                  <p className="text-sm text-slate-500">
                    去“树洞广场”看看吧，听听那些不曾被打扰的心跳声。
                  </p>
                </div>
                <div className="pt-2">
                  <Button 
                    onClick={onClose}
                    className="w-full h-12 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold"
                  >
                    看看广场 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 关闭按钮 (仅在交互阶段显示) */}
      {step === 'interact' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-10 right-6 text-white/40 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
