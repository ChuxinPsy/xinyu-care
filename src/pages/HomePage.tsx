import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Heart, MessageCircle, 
  Wind, Moon, ChevronRight,
  Flower2, Music, Palette, Gamepad2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getEmotionDiaries } from '@/db/api';

// 动画配置已内联到组件中

export default function HomePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');


  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('夜深了');
    else if (hour < 9) setGreeting('早上好');
    else if (hour < 12) setGreeting('上午好');
    else if (hour < 14) setGreeting('中午好');
    else if (hour < 18) setGreeting('下午好');
    else setGreeting('晚上好');
  }, []);

  useEffect(() => {
    if (user) {
      loadLatestEmotion();
    }
  }, [user]);

  const loadLatestEmotion = async () => {
    // 逻辑保留但移除未使用的 state 设置
    try {
      await getEmotionDiaries(user!.id, 1);
    } catch (error) {
      console.error(error);
    }
  };



  // 主要功能 - 大卡片设计
  const mainFeatures = [
    {
      title: '开始评估',
      subtitle: 'AI心理测评',
      desc: '了解你的内心世界',
      icon: Sparkles,
      gradient: 'from-rose-300 via-pink-400 to-purple-400',
      shadow: 'shadow-rose-200',
      link: '/assessment',
      size: 'large'
    },
    {
      title: '记录心情',
      subtitle: '情绪日记',
      desc: '记录每一天的感受',
      icon: Heart,
      gradient: 'from-orange-300 via-amber-300 to-yellow-300',
      shadow: 'shadow-orange-200',
      link: '/record',
      size: 'small'
    },
    {
      title: '放松疗愈',
      subtitle: '冥想空间',
      desc: '找到内心的宁静',
      icon: Flower2,
      gradient: 'from-teal-300 via-emerald-300 to-green-300',
      shadow: 'shadow-teal-200',
      link: '/healing',
      size: 'small'
    }
  ];

  // 快捷功能 - 圆形图标
  const quickActions = [
    { title: 'AI对话', icon: MessageCircle, color: 'bg-violet-100 text-violet-600', link: '/assessment', state: {} },
    { title: '睡眠', icon: Moon, color: 'bg-indigo-100 text-indigo-600', link: '/healing', state: { activeTab: 'meditation', activeCategory: 'sleep' } },
    { title: '放松', icon: Wind, color: 'bg-sky-100 text-sky-600', link: '/healing', state: { activeTab: 'meditation', activeCategory: 'relax' } },
    { title: '音乐', icon: Music, color: 'bg-rose-100 text-rose-600', link: '/healing', state: { activeTab: 'meditation' } },
    { title: '更多', icon: Palette, color: 'bg-amber-100 text-amber-600', link: '/healing', state: {} },
  ];

  // 精选内容 - 对应冥想库的音乐
  const featuredContent = [
    {
      title: '焦虑缓解呼吸法',
      type: '放松',
      duration: '3分钟',
      image: '🌸',
      bgColor: 'bg-gradient-to-br from-pink-100 to-rose-100',
      trackIndex: 0 // 对应冥想库中的索引
    },
    {
      title: '睡前放松引导',
      type: '睡眠',
      duration: '15分钟',
      image: '🌙',
      bgColor: 'bg-gradient-to-br from-indigo-100 to-purple-100',
      trackIndex: 1
    },
    {
      title: '身体扫描冥想',
      type: '放松',
      duration: '10分钟',
      image: '☀️',
      bgColor: 'bg-gradient-to-br from-amber-100 to-orange-100',
      trackIndex: 2
    },
    {
      title: '专注力训练',
      type: '专注',
      duration: '8分钟',
      image: '🎯',
      bgColor: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      trackIndex: 3
    },
    {
      title: '抑郁症康复之路',
      type: '专注',
      duration: '12分钟',
      image: '🌈',
      bgColor: 'bg-gradient-to-br from-violet-100 to-purple-100',
      trackIndex: 4
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-slate-950 md:pb-0 pb-24">
      {/* 顶部区域 - 柔和渐变背景 */}
      <div className="relative overflow-hidden">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-b from-rose-50/80 via-purple-50/50 to-transparent dark:from-slate-900 dark:via-slate-900/50" />
        
        {/* 装饰圆形 */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 right-0 w-72 h-72 bg-gradient-to-br from-rose-200/40 to-pink-200/40 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-20 -left-20 w-64 h-64 bg-gradient-to-br from-violet-200/40 to-purple-200/40 rounded-full blur-3xl" 
        />

        <div className="relative z-10 px-5 md:px-8 lg:px-12 pt-8 pb-6">
          <div className="max-w-md md:max-w-5xl lg:max-w-7xl mx-auto">
            {/* 顶部导航 */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3"
            >
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-0.5">{greeting}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
                  {profile?.full_name || '朋友'} ✨
                </h1>
              </div>
            </motion.div>


          </div>
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="px-5 md:px-8 lg:px-12 max-w-md md:max-w-5xl lg:max-w-7xl mx-auto space-y-6">
        {/* 主要功能 - 瀑布流卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5">
            {/* 大卡片 */}
            <motion.div
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(mainFeatures[0].link)}
              className={`col-span-2 md:col-span-1 lg:col-span-2 relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br ${mainFeatures[0].gradient} ${mainFeatures[0].shadow} shadow-lg cursor-pointer`}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <Badge className="bg-white/30 text-white border-none text-[10px] md:text-xs">
                    {mainFeatures[0].subtitle}
                  </Badge>
                </div>
                <h4 className="text-xl md:text-2xl font-bold text-white mb-1">{mainFeatures[0].title}</h4>
                <p className="text-white/80 text-sm md:text-base">{mainFeatures[0].desc}</p>
              </div>
            </motion.div>

            {/* 两个小卡片 */}
            {mainFeatures.slice(1).map((feature) => {
              const FeatureIcon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(feature.link)}
                  className={`relative overflow-hidden rounded-2xl md:rounded-3xl p-4 md:p-6 bg-gradient-to-br ${feature.gradient} ${feature.shadow} shadow-lg cursor-pointer`}
                >
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 md:w-32 md:h-32 bg-white/20 rounded-full" />
                  <div className="relative z-10">
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center mb-3">
                      <FeatureIcon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <h4 className="text-base md:text-lg font-bold text-white mb-0.5">{feature.title}</h4>
                    <p className="text-white/70 text-xs md:text-sm">{feature.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 精选内容标题 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">精选内容</h3>
            <motion.button 
              whileHover={{ x: 3 }}
              onClick={() => navigate('/healing')}
              className="text-sm text-violet-600 font-medium flex items-center gap-1"
            >
              全部 <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* 房树人测验卡片 - 放在精选内容标题下方 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mb-4"
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/healing', { state: { activeTab: 'game' } })}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-5 md:p-6 shadow-xl shadow-blue-200 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gamepad2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  <span className="text-white font-bold md:text-lg">趣味疗愈游戏</span>
                </div>
                <p className="text-white/80 text-sm md:text-base">
                  基于认知训练的趣味交互，释放压力并提升专注力
                </p>
              </div>
              <div className="flex -space-x-2">
                {['🎮', '🧩', '🚀'].map((emoji, i) => (
                  <div key={i} className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-lg md:text-xl border-2 border-white/50">
                    {emoji}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 精选内容卡片 - 可左右滑动 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="overflow-x-auto scrollbar-hide -mx-5 md:-mx-8 lg:-mx-12 px-5 md:px-8 lg:px-12">
            <div className="flex lg:grid lg:grid-cols-5 gap-3 md:gap-4 lg:gap-5 pb-2">
              {featuredContent.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => navigate('/healing', { state: { activeTab: 'meditation', trackIndex: item.trackIndex } })}
                  className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-lg shadow-slate-200/50 cursor-pointer flex-shrink-0 w-[140px] md:w-[180px] lg:w-auto"
                >
                  <div className={`h-24 md:h-32 ${item.bgColor} flex items-center justify-center text-4xl md:text-5xl relative`}>
                    {item.image}
                  </div>
                  <div className="p-3 md:p-4">
                    <p className="text-[10px] md:text-xs text-slate-400 mb-1">{item.type} · {item.duration}</p>
                    <h4 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                      {item.title}
                    </h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
        
 {/* 快捷功能 - 圆形图标 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex justify-between md:justify-center md:gap-8">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.link, { state: action.state })}
                className="flex flex-col items-center gap-2 md:gap-3"
              >
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${action.color} flex items-center justify-center shadow-lg`}>
                  {action.icon === MessageCircle && <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />}
                  {action.icon === Moon && <Moon className="w-6 h-6 md:w-7 md:h-7" />}
                  {action.icon === Wind && <Wind className="w-6 h-6 md:w-7 md:h-7" />}
                  {action.icon === Music && <Music className="w-6 h-6 md:w-7 md:h-7" />}
                  {action.icon === Palette && <Palette className="w-6 h-6 md:w-7 md:h-7" />}
                </div>
                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {action.title}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* 友好提示语 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center pb-6"
        >
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {[
              '🌿 今天也要好好爱自己哦',
              '🌟 每一天都是崭新的开始',
              '💖 你值得拥有美好的一切',
              '🌈 生活充满希望，一起加油',
              '✨ 每个早晨都是新的奇迹',
              '🌸 微笑面对生活，温暖常在',
            ][Math.floor(Math.random() * 6)]}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
