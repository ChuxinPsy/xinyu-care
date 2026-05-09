import { Bluetooth, Loader2, RefreshCw, Signal, Watch, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BandConnectionStatus, SmartBandDevice } from '@/types';

interface DeviceConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionStatus: BandConnectionStatus;
  availableDevices: SmartBandDevice[];
  connectedDevice: SmartBandDevice | null;
  isScanning: boolean;
  isConnecting: boolean;
  error: string | null;
  onScan: () => void;
  onConnect: (device: SmartBandDevice) => void;
  onDisconnect: () => void;
}

export function DeviceConnectionDialog({
  open,
  onOpenChange,
  connectionStatus,
  availableDevices,
  connectedDevice,
  isScanning,
  isConnecting,
  error,
  onScan,
  onConnect,
  onDisconnect,
}: DeviceConnectionDialogProps) {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-500 bg-emerald-50';
      case 'connecting':
        return 'text-amber-500 bg-amber-50';
      case 'scanning':
        return 'text-blue-500 bg-blue-50';
      case 'connection_failed':
        return 'text-rose-500 bg-rose-50';
      default:
        return 'text-slate-500 bg-slate-50';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'scanning':
        return '扫描中...';
      case 'connection_failed':
        return '连接失败';
      default:
        return '未连接';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor()}`}>
              <Bluetooth className="w-4 h-4" />
            </div>
            连接智能手环
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 连接状态指示器 */}
          <div className={`p-4 rounded-xl ${getStatusColor()} border border-current border-opacity-20`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={connectionStatus === 'scanning' || connectionStatus === 'connecting' ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.5, 1],
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Signal className="w-5 h-5" />
                </motion.div>
                <div>
                  <p className="font-medium">{getStatusText()}</p>
                  {connectedDevice && (
                    <p className="text-xs opacity-80">{connectedDevice.name}</p>
                  )}
                </div>
              </div>
              {connectionStatus === 'connected' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDisconnect}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  断开
                </Button>
              )}
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">
              {error}
            </div>
          )}

          {/* 扫描按钮 */}
          {connectionStatus !== 'connected' && (
            <Button
              onClick={onScan}
              disabled={isScanning || isConnecting}
              className="w-full"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  扫描中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  扫描设备
                </>
              )}
            </Button>
          )}

          {/* 设备列表 */}
          <AnimatePresence>
            {availableDevices.length > 0 && connectionStatus !== 'connected' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <p className="text-sm font-medium text-slate-600">可用设备</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableDevices.map((device) => (
                    <motion.div
                      key={device.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => onConnect(device)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <Watch className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{device.name}</p>
                          <p className="text-xs text-slate-500">
                            {device.manufacturer} {device.model}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.rssi && (
                          <span className="text-xs text-slate-400">
                            {device.rssi > -70 ? '信号强' : device.rssi > -85 ? '信号中' : '信号弱'}
                          </span>
                        )}
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : (
                          <Button size="sm" variant="ghost">
                            连接
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 已连接设备信息 */}
          {connectionStatus === 'connected' && connectedDevice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-50 border border-emerald-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Watch className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-medium">{connectedDevice.name}</p>
                  <p className="text-xs text-emerald-600">设备已连接，正在同步数据</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 提示信息 */}
          <div className="text-xs text-slate-400 text-center">
            请确保您的手环已开启蓝牙并处于可发现模式
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
