import { motion } from 'framer-motion';
import { Brain, 
  ChevronLeft, Heart, Mail, MessageSquare, Shield, Sparkles, 
  Users, 
  Zap,
  Award,
  Clock,
  Target,
  TrendingUp,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function AboutUsPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: '多模态AI识别',
      desc: '融合语音、文本、表情多维度数据',
      color: 'from-indigo-500 to-purple-500',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30'
    },
    {
      icon: Users,
      title: '专家医生复核',
      desc: '专业医生团队二次审核',
      color: 'from-rose-500 to-pink-500',
      bg: 'bg-rose-50 dark:bg-rose-950/30'
    },
    {
      icon: Heart,
      title: '个性化疗愈',
      desc: '定制专属康复计划和建议',
      color: 'from-teal-500 to-emerald-500',
      bg: 'bg-teal-50 dark:bg-teal-950/30'
    },
    {
      icon: Shield,
      title: '医学级隐私',
      desc: '端到端加密，保障数据安全',
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30'
    }
  ];

  const achievements = [
    { icon: Users, label: '服务用户', value: '50k+' },
    { icon: Award, label: '识别精度', value: '98%' },
    { icon: Clock, label: '全天候响应', value: '24/7' },
    { icon: TrendingUp, label: '满意度', value: '96%' }
  ];

  const highlights = [
    '三甲医院医生团队支持',
    '符合HIPAA医疗数据隐私标准',
    '通过国家医疗器械二类认证',
    '已在全球多国上线服务'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20">
      {/* Header */}
      <div className="px-4 py-4 sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">关于我们</h1>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-10">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 shadow-2xl"
        >
          {/* 背景装饰 */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/20 blur-3xl"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/20 blur-3xl"
            />
          </div>

          <div className="text-center space-y-5 relative z-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-20 h-20 rounded-[24px] mx-auto bg-white/20 backdrop-blur-lg border border-white/30 flex items-center justify-center shadow-xl"
            >
              <Brain className="w-11 h-11 text-white" />
            </motion.div>
            
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">心域智护</h2>
              <p className="text-white/90 text-xs font-semibold uppercase tracking-[0.2em]">数字化心理健康服务</p>
            </div>

            <p className="text-sm text-white/95 leading-relaxed max-w-[280px] mx-auto">
              用多模态AI与人文关怀，打造专业、私密、温暖的心理健康服务。
            </p>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge className="bg-white/25 hover:bg-white/30 border-white/40 text-white backdrop-blur-sm">隐私加密</Badge>
              <Badge className="bg-white/25 hover:bg-white/30 border-white/40 text-white backdrop-blur-sm">医学规范</Badge>
              <Badge className="bg-white/25 hover:bg-white/30 border-white/40 text-white backdrop-blur-sm">全天候响应</Badge>
            </div>
          </div>
        </motion.div>

        {/* 核心功能 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">我们做什么</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Card className={`border-0 rounded-2xl ${feature.bg} hover:shadow-lg transition-all group cursor-pointer`}>
                  <CardContent className="p-5 space-y-3">
                    <div className={`w-11 h-11 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{feature.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 专业认证 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">专业认证</h3>
          </div>

          <Card className="border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-2.5">
              {highlights.map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">{text}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 联系方式 */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-center">联系我们</h3>
          <div className="flex justify-center gap-4">
            {[
              { icon: Mail, color: 'from-blue-500 to-cyan-500' },
              { icon: MessageSquare, color: 'from-green-500 to-emerald-500' },
            ].map((item, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg hover:shadow-xl transition-all`}
              >
                <item.icon className="w-6 h-6 text-white" />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-2">
          <p className="text-[11px] text-slate-400 dark:text-slate-600 font-semibold uppercase tracking-widest">
            Made with ❤️ for Mental Health
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-700 mt-2 font-medium">
            心域智护 v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
