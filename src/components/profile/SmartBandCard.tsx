import { Activity, Bluetooth, ChevronRight, Heart, Moon, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { BandConnectionStatus, WearableData } from '@/types';

interface SmartBandCardProps {
  connectionStatus: BandConnectionStatus;
  realtimeData: Partial<WearableData> | null;
  onConnectClick: () => void;
}

export function SmartBandCard({ connectionStatus, realtimeData, onConnectClick }: SmartBandCardProps) {
  const navigate = useNavigate();
  const isConnected = connectionStatus === 'connected';

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
      case 'scanning':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中';
      case 'scanning':
        return '扫描中';
      default:
        return '未连接';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
      onClick={() => navigate('/profile/smart-band')}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="relative z-10">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">手环数据</h3>
              <div className="flex items-center gap-2">
                <motion.div
                  animate={isConnected ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${getStatusColor()}`}
                />
                <span className="text-white/80 text-sm">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </div>

        {/* 数据展示 */}
        {isConnected && realtimeData ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 text-rose-300" />
                <span className="text-white/70 text-xs">心率</span>
              </div>
              <p className="text-white font-bold text-lg">
                {realtimeData.heart_rate || '--'}
                <span className="text-white/60 text-xs font-normal ml-0.5">bpm</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-white/70 text-xs">血氧</span>
              </div>
              <p className="text-white font-bold text-lg">
                {realtimeData.blood_oxygen || '--'}
                <span className="text-white/60 text-xs font-normal ml-0.5">%</span>
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-white/70 text-xs">步数</span>
              </div>
              <p className="text-white font-bold text-lg">
                {realtimeData.steps ? (realtimeData.steps > 999 ? `${(realtimeData.steps / 1000).toFixed(1)}k` : realtimeData.steps) : '--'}
              </p>
            </div>
          </div>
        ) : (
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-center gap-2 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onConnectClick();
            }}
          >
            <Bluetooth className="w-5 h-5 text-white/80" />
            <span className="text-white/80 text-sm">点击连接手环设备</span>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-white/60 text-xs">
            {isConnected ? '数据实时同步中' : '连接设备查看详细数据'}
          </p>
          {isConnected && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
              实时
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
