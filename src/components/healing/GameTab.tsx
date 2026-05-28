import { motion } from 'framer-motion';
import { Play, Gamepad2, Smartphone, Hand, MoveUp, MoveDown, MoveLeft, MoveRight, Flame, Zap, Rainbow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicAssetUrl } from '@/utils/public-assets';

export default function GameTab() {
  const handleStartGame = () => {
    window.open('https://poki.com/zh/g/temple-run-2-holi-festival#fullscreen', '_blank');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        duration: 0.5,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative -mx-4 mt-1 h-[calc(100vh-160px)] bg-gradient-to-br from-[#f8f9ff] via-[#f0f2ff] to-[#fdfaff] overflow-hidden rounded-t-[32px] rounded-b-[40px] flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.05)] border-t border-white/50">
      {/* Immersive Light Background Gradients & "Stars" */}
      <div className="absolute top-0 inset-x-0 h-[300px] bg-gradient-to-b from-indigo-100/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #818cf8 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 10px 10px, #c084fc 1px, transparent 0)`, backgroundSize: '48px 48px' }} />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center pt-6 px-5 space-y-4 flex-1 overflow-y-auto no-scrollbar"
      >
        {/* Game Icon with Subtle Glow */}
        <motion.div variants={itemVariants} className="relative group">
          <div className="absolute inset-0 bg-orange-400/10 blur-[30px] rounded-full scale-110 group-hover:bg-orange-400/20 transition-all duration-700" />
          <div className="relative w-24 h-24 rounded-[28px] overflow-hidden border-[3px] border-white shadow-lg shadow-indigo-100/50">
            <img 
              src={publicAssetUrl('/temple_run_2_icon.png')} 
              alt="Temple Run 2" 
              className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-110"
            />
          </div>
        </motion.div>

        {/* Title & Specs */}
        <motion.div variants={itemVariants} className="text-center space-y-1.5">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter drop-shadow-sm">神庙逃亡 2</h1>
          <p className="text-indigo-400 text-[10px] font-bold tracking-widest uppercase">Holi Festival · 跑酷闯关</p>
          
          <div className="flex items-center justify-center gap-2 pt-1 border-slate-700">
            <div className="flex items-center gap-1 px-3 py-1 bg-white border border-indigo-50 rounded-full text-indigo-600 text-[10px] font-black shadow-sm">
              <Flame className="w-3 h-3 text-orange-500" /> 动作
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-white border border-indigo-50 rounded-full text-indigo-600 text-[10px] font-black shadow-sm">
              <Zap className="w-3 h-3 text-blue-500" /> 跑酷
            </div>
            <div className="flex items-center gap-1 px-3 py-1 bg-white border border-indigo-50 rounded-full text-indigo-600 text-[10px] font-black shadow-sm">
              <Rainbow className="w-3 h-3 text-purple-500" /> 节日
            </div>
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div variants={itemVariants} className="w-full max-w-[280px]">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-400 rounded-[22px] blur-lg opacity-30 group-hover:opacity-50 transition duration-1000" />
            <Button 
              onClick={handleStartGame}
              className="relative w-full h-14 rounded-[20px] bg-gradient-to-r from-pink-500 via-orange-500 to-yellow-500 hover:scale-[1.02] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white ring-2 ring-white/10">
                <Play className="w-4.5 h-4.5 fill-white" />
              </div>
              <span className="text-lg font-black text-white tracking-wider">开始游戏</span>
            </Button>
          </div>
          <p className="text-center text-[9px] text-slate-400 mt-3 font-bold uppercase tracking-[0.15em] opacity-80">将在浏览器中全屏运行</p>
        </motion.div>

        {/* Info Cards */}
        <div className="w-full max-w-md space-y-3 pb-8">
          {/* Brief */}
          <motion.div variants={itemVariants} className="bg-white/60 p-4 rounded-[28px] border border-white backdrop-blur-md shadow-sm space-y-2">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 rounded-lg bg-orange-50">
                <Gamepad2 className="w-4 h-4 text-orange-400" />
              </div>
              <h3 className="text-slate-800 font-black text-[12px] uppercase tracking-wide">游戏简介</h3>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
              经典无尽跑酷游戏。在 Holi Festival 版本中，奔驰在五彩世界，躲避障碍跳跃，享受飞驰快感！
            </p>
          </motion.div>

          {/* Controls - Two Rows Layout */}
          <motion.div variants={itemVariants} className="bg-white/60 p-4 rounded-[28px] border border-white backdrop-blur-md shadow-sm space-y-3">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1 rounded-lg bg-indigo-50">
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-slate-800 font-black text-[12px] uppercase tracking-wide">操作说明</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-indigo-50/50">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <MoveUp className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-700">上滑 — 跳跃</p>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-indigo-50/50">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <MoveDown className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-700">下滑 — 下蹲</p>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-indigo-50/50">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-400">
                  <MoveLeft className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-700">左滑 — 左转</p>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-white/50 rounded-2xl border border-indigo-50/50">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-400">
                  <MoveRight className="w-4 h-4" />
                </div>
                <p className="text-[11px] font-bold text-slate-700">右滑 — 右转</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-50/30 rounded-xl border border-indigo-50/50">
                <Hand className="w-3 h-3 text-indigo-400" />
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">手势或方向键控制</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
