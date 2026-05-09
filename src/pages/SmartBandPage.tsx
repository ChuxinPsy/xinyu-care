import { Activity, ArrowLeft, Bluetooth, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceConnectionDialog } from '@/components/profile/DeviceConnectionDialog';
import { SmartBandAIEvaluation } from '@/components/profile/SmartBandAIEvaluation';
import { VitalSignsCharts } from '@/components/profile/VitalSignsCharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useSmartBand } from '@/hooks/use-smart-band';
import type { TimeRange, WearableData } from '@/types';
import { getWearableDataByDateRange } from '@/db/api';
import { generateMockWearableData } from '@/utils/mockSmartBandData';
import { format, subDays } from 'date-fns';

export default function SmartBandPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 状态
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 使用智能手环 Hook
  const {
    connectionStatus,
    connectedDevice,
    availableDevices,
    realtimeData,
    scanDevices,
    connectDevice,
    disconnectDevice,
    isScanning,
    isConnecting,
    error,
  } = useSmartBand({
    userId: user?.id || null,
    useMockData: true, // 使用模拟数据模式
  });

  // 加载历史数据
  const loadWearableData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      
      // 尝试从数据库加载数据
      try {
        const data = await getWearableDataByDateRange(user.id, startDate, endDate);
        if (data.length > 0) {
          setWearableData(data);
        } else {
          // 如果没有数据，使用模拟数据
          const mockData = generateMockWearableData(
            user.id,
            subDays(new Date(), 30),
            new Date()
          );
          setWearableData(mockData);
        }
      } catch {
        // 数据库查询失败，使用模拟数据
        const mockData = generateMockWearableData(
          user.id,
          subDays(new Date(), 30),
          new Date()
        );
        setWearableData(mockData);
      }
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadWearableData();
  }, [user?.id]);

  // 获取连接状态颜色
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
      case 'scanning':
        return 'bg-amber-500';
      case 'connection_failed':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  // 获取连接状态文本
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectedDevice?.name || '已连接';
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

  const isConnected = connectionStatus === 'connected';

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-slate-950 pb-24">
      {/* 顶部 Header - 使用智能手环背景图片 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative px-5 pt-8 pb-6 overflow-hidden smartband-header-bg"
      >
        {/* 遮罩层确保文字可读性 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />
        <div className="relative z-10 max-w-md mx-auto">
          {/* 导航栏 */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-white">手环数据</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadWearableData}
              disabled={loading}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* 连接状态卡片 */}
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/20 transition-colors"
            onClick={() => setConnectionDialogOpen(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">智能手环</p>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={isConnected ? {
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
                    />
                    <span className="text-white/80 text-sm">{getConnectionStatusText()}</span>
                  </div>
                </div>
              </div>
              <Bluetooth className="w-5 h-5 text-white/60" />
            </div>

            {/* 实时数据预览 */}
            <AnimatePresence>
              {isConnected && realtimeData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/20"
                >
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-white/60 text-xs">心率</p>
                      <p className="text-white text-lg font-medium">{realtimeData.heart_rate || '--'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">血氧</p>
                      <p className="text-white text-lg font-medium">{realtimeData.blood_oxygen || '--'}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">压力</p>
                      <p className="text-white text-lg font-medium">{realtimeData.stress_level || '--'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">体温</p>
                      <p className="text-white text-lg font-medium">{realtimeData.temperature || '--'}°C</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <div className="max-w-md mx-auto px-4 mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-14 bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl shadow-md">
            <TabsTrigger 
              value="overview"
              className="rounded-xl h-full text-base font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              数据概览
            </TabsTrigger>
            <TabsTrigger 
              value="charts"
              className="rounded-xl h-full text-base font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              趋势图表
            </TabsTrigger>
            <TabsTrigger 
              value="ai"
              className="rounded-xl h-full text-base font-medium transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              AI评估
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-300px)]">
            {/* 数据概览 Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {/* 今日数据卡片 - 采用图片中的美化样式 */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : wearableData.length > 0 ? (
                <>
                  {/* 健康评分环形卡片 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-sm mb-1">今日健康评分</p>
                        <p className="text-5xl font-black">88</p>
                        <p className="text-white/70 text-xs mt-2">您的状态很棒，继续保持！</p>
                      </div>
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
                          <circle cx="48" cy="48" r="40" stroke="white" strokeWidth="8" fill="none" 
                            strokeDasharray={`${2 * Math.PI * 40 * 0.88} ${2 * Math.PI * 40 * 0.12}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold">88%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* 数据卡片网格 */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 平均心率 - 粉色渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 via-rose-50 to-rose-100/30 shadow-sm border border-rose-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">平均心率</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].heart_rate || '79'}
                        <span className="text-base font-normal text-slate-400/80 ml-1">bpm</span>
                      </p>
                    </motion.div>

                    {/* 平均血氧 - 蓝色渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100/30 shadow-sm border border-blue-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">平均血氧</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].blood_oxygen || '96'}
                        <span className="text-base font-normal text-slate-400/80 ml-1">%</span>
                      </p>
                    </motion.div>

                    {/* 总步数 - 黄色渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-50 to-amber-100/30 shadow-sm border border-amber-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">总步数</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].steps 
                          ? (wearableData[0].steps > 10000 
                            ? <>{(wearableData[0].steps / 10000).toFixed(1)}<span className="text-lg font-normal text-slate-400/80 ml-0.5">万</span></>
                            : wearableData[0].steps)
                          : '3827'}
                      </p>
                    </motion.div>

                    {/* 平均睡眠 - 靛蓝渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-50 to-indigo-100/30 shadow-sm border border-indigo-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">平均睡眠</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].sleep_hours || '7.94'}
                        <span className="text-base font-normal text-slate-400/80 ml-1">h</span>
                      </p>
                    </motion.div>

                    {/* 平均压力 - 紫色渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100/30 shadow-sm border border-purple-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">平均压力</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].stress_level || '32'}
                      </p>
                    </motion.div>

                    {/* 平均体温 - 青色渐变 */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 via-teal-50 to-teal-100/30 shadow-sm border border-teal-100/50"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-200/70 flex items-center justify-center shadow-sm">
                          <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">平均体温</span>
                      </div>
                      <p className="text-3xl font-semibold text-slate-800 tracking-tight">
                        {wearableData[0].temperature || '36.6'}
                        <span className="text-base font-normal text-slate-400/80 ml-1">°C</span>
                      </p>
                    </motion.div>
                  </div>

                  {/* 随机健康提示语 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-4"
                  >
                    <p className="text-sm text-slate-500 italic">
                      💡 {(() => {
                        const tips = [
                          '保持规律作息，让身心更健康',
                          '每天步行30分钟，活力满满一整天',
                          '深呼吸放松，缓解压力好方法',
                          '充足睡眠是健康的基石',
                          '多喝水，让身体保持最佳状态',
                          '适度运动，心情更愉悦',
                          '关注心率变化，了解身体状态',
                          '良好的睡眠习惯，从今晚开始',
                        ];
                        return tips[Math.floor(Math.random() * tips.length)];
                      })()}
                    </p>
                  </motion.div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>暂无数据</p>
                  <p className="text-sm">连接手环设备开始同步</p>
                </div>
              )}
            </TabsContent>

            {/* 趋势图表 Tab */}
            <TabsContent value="charts" className="mt-0">
              <VitalSignsCharts 
                data={wearableData} 
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
            </TabsContent>

            {/* AI评估 Tab */}
            <TabsContent value="ai" className="mt-0">
              <SmartBandAIEvaluation data={wearableData} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* 设备连接对话框 */}
      <DeviceConnectionDialog
        open={connectionDialogOpen}
        onOpenChange={setConnectionDialogOpen}
        connectionStatus={connectionStatus}
        availableDevices={availableDevices}
        connectedDevice={connectedDevice}
        isScanning={isScanning}
        isConnecting={isConnecting}
        error={error}
        onScan={scanDevices}
        onConnect={connectDevice}
        onDisconnect={() => {
          disconnectDevice();
          setConnectionDialogOpen(false);
        }}
      />
    </div>
  );
}
