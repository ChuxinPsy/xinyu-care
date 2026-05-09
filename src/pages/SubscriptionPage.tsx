import { ArrowRight, Check, 
  ChevronLeft, 
  CreditCard, Crown, History, Receipt, ShieldCheck, Sparkles, Star, Zap 
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const plans = [
    {
      id: 'monthly',
      name: '月度会员',
      price: '¥28',
      originalPrice: '¥45',
      tag: '入门首选',
      features: ['多模态AI情绪分析', '全量心理评估量表', '高清报告下载', '7x24小时AI陪伴']
    },
    {
      id: 'yearly',
      name: '年度会员',
      price: '¥198',
      originalPrice: '¥540',
      tag: '超值推荐',
      popular: true,
      features: ['包含月度所有权益', '专家1对1咨询折扣', '高级冥想课程解锁', '专属身份标识']
    },
    {
      id: 'lifetime',
      name: '终身会员',
      price: '¥698',
      tag: '一劳永逸',
      features: ['终身解锁所有功能', '未来所有高级权益', '限量定制周边', '终身云端存储']
    }
  ];

  const handleSubscribe = () => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: '正在调起支付模块...',
        success: '支付环境安全，请在弹出的窗口中完成支付',
        error: '支付模块初始化失败'
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20">
      {/* 顶部导航 - 紫色渐变 */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4 pt-4 pb-16 relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <Crown className="w-40 h-40 text-white" />
        </div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-10 right-1/3 w-20 h-20 rounded-full bg-white/10 blur-2xl" />
        
        <div className="flex items-center gap-4 relative z-10 text-white">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/20 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">会员中心</h1>
        </div>
        
        {/* 当前状态 - 玻璃卡片 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 px-2 relative z-10"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white text-lg font-bold">普通会员</span>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px]">未开通</Badge>
              </div>
              <p className="text-white/80 text-xs">开通会员，解锁 12 项高级 AI 疗愈权益</p>
            </div>
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto p-4 -mt-10 relative z-20 space-y-6">
        {/* 套餐选择 - 卡片式 */}
        <div className="space-y-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                onClick={() => setSelectedPlan(plan.id)}
                className={`border-2 transition-all cursor-pointer overflow-hidden rounded-2xl ${
                  selectedPlan === plan.id 
                  ? 'border-purple-500 shadow-xl shadow-purple-500/20 scale-[1.02] bg-gradient-to-br from-purple-50/50 to-pink-50/50' 
                  : 'border-slate-200/60 shadow-md hover:border-purple-200 hover:shadow-lg bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold text-center py-1.5 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 inline-block mr-1" />
                    最受欢迎
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        selectedPlan === plan.id 
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                          : 'bg-slate-100'
                      }`}>
                        {plan.id === 'lifetime' ? 
                          <Zap className={`w-6 h-6 ${selectedPlan === plan.id ? 'text-white' : 'text-purple-500'}`} /> : 
                          <CreditCard className={`w-6 h-6 ${selectedPlan === plan.id ? 'text-white' : 'text-purple-500'}`} />
                        }
                      </div>
                      <div>
                        <div className="font-bold text-lg text-slate-900">{plan.name}</div>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-0 mt-1">
                          {plan.tag}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
                        {plan.price}
                      </div>
                      {plan.originalPrice && (
                        <div className="text-xs text-slate-400 line-through">{plan.originalPrice}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* 权益展示 */}
                  <div className={`flex flex-wrap gap-2 pt-3 border-t ${selectedPlan === plan.id ? 'border-purple-200' : 'border-slate-100'}`}>
                    {plan.features.map((f, i) => (
                      <div key={f} className="flex items-center gap-1 text-[11px] text-slate-600">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          selectedPlan === plan.id ? 'bg-purple-100' : 'bg-slate-100'
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${selectedPlan === plan.id ? 'text-purple-500' : 'text-slate-500'}`} />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 支付方式 */}
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              安全支付环境
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 p-4">
            <div className="flex-1 p-3 rounded-xl border-2 border-blue-100 bg-blue-50/50 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">支</div>
              <span className="text-[11px] font-semibold text-slate-700">支付宝</span>
            </div>
            <div className="flex-1 p-3 rounded-xl border-2 border-emerald-100 bg-emerald-50/50 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-all">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/30">微</div>
              <span className="text-[11px] font-semibold text-slate-700">微信支付</span>
            </div>
            <div className="flex-1 p-3 rounded-xl border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center gap-2 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-slate-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold text-slate-700">信用卡</span>
            </div>
          </CardContent>
        </Card>

        {/* 管理功能 */}
        <div className="grid grid-cols-3 gap-3">
          <Button variant="ghost" className="flex flex-col h-auto p-4 gap-2 bg-white dark:bg-slate-800 shadow-md rounded-2xl hover:shadow-lg transition-all border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-600">历史记录</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-auto p-4 gap-2 bg-white dark:bg-slate-800 shadow-md rounded-2xl hover:shadow-lg transition-all border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-rose-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-600">申请发票</span>
          </Button>
          <Button variant="ghost" className="flex flex-col h-auto p-4 gap-2 bg-white dark:bg-slate-800 shadow-md rounded-2xl hover:shadow-lg transition-all border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[11px] font-medium text-slate-600">续费管理</span>
          </Button>
        </div>

        {/* 开通按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            className="w-full h-14 text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-2xl shadow-purple-500/30 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleSubscribe}
          >
            <Crown className="w-5 h-5 mr-2" />
            立即开通会员
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-center text-[10px] text-slate-400 mt-3">开通即表示同意《会员服务协议》</p>
        </motion.div>
      </div>
    </div>
  );
}
