import { Brain, Heart, AlertTriangle, CheckCircle, Lightbulb, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WearableData } from '@/types';

interface SmartBandAIEvaluationProps {
  data: WearableData[];
}

interface HealthInsight {
  category: string;
  status: 'good' | 'warning' | 'attention';
  score: number;
  description: string;
  recommendations: string[];
}

export function SmartBandAIEvaluation({ data }: SmartBandAIEvaluationProps) {
  // 基于手环数据生成健康洞察
  const insights: HealthInsight[] = (() => {
    if (data.length === 0) return [];

    const avgHeartRate = data.reduce((sum, d) => sum + (d.heart_rate || 70), 0) / data.length;
    const avgSleep = data.reduce((sum, d) => sum + (d.sleep_hours || 7), 0) / data.length;
    const avgStress = data.reduce((sum, d) => sum + (d.stress_level || 40), 0) / data.length;
    const avgBloodOxygen = data.reduce((sum, d) => sum + (d.blood_oxygen || 98), 0) / data.length;

    const results: HealthInsight[] = [];

    // 心率分析
    if (avgHeartRate > 80) {
      results.push({
        category: '心率健康',
        status: 'attention',
        score: 65,
        description: '您的平均心率略高，可能存在轻度焦虑或压力',
        recommendations: [
          '尝试深呼吸练习，每天3次，每次5分钟',
          '减少咖啡因摄入，避免午后饮用咖啡',
          '增加有氧运动，如快走、慢跑',
        ],
      });
    } else {
      results.push({
        category: '心率健康',
        status: 'good',
        score: 85,
        description: '您的心率处于正常范围，心脏健康状况良好',
        recommendations: [
          '保持当前的运动习惯',
          '继续监测心率变化',
        ],
      });
    }

    // 睡眠质量分析
    if (avgSleep < 6) {
      results.push({
        category: '睡眠质量',
        status: 'warning',
        score: 55,
        description: '您的睡眠时间不足，可能影响情绪和认知功能',
        recommendations: [
          '建立规律的作息时间，每天同一时间入睡和起床',
          '睡前1小时避免使用电子设备',
          '尝试冥想或放松练习帮助入睡',
        ],
      });
    } else if (avgSleep < 7) {
      results.push({
        category: '睡眠质量',
        status: 'attention',
        score: 70,
        description: '您的睡眠时间略短，建议适当增加',
        recommendations: [
          '尝试提前30分钟入睡',
          '优化睡眠环境，保持安静和适宜温度',
        ],
      });
    } else {
      results.push({
        category: '睡眠质量',
        status: 'good',
        score: 90,
        description: '您的睡眠时长充足，有助于身心健康',
        recommendations: [
          '继续保持良好的睡眠习惯',
          '关注深度睡眠比例',
        ],
      });
    }

    // 压力分析
    if (avgStress > 60) {
      results.push({
        category: '压力水平',
        status: 'warning',
        score: 50,
        description: '您的压力水平较高，需要及时调节',
        recommendations: [
          '识别压力源，尝试解决问题或寻求帮助',
          '每天进行15-20分钟的正念冥想',
          '与亲友交流，分享您的感受',
          '必要时咨询专业心理咨询师',
        ],
      });
    } else if (avgStress > 40) {
      results.push({
        category: '压力水平',
        status: 'attention',
        score: 70,
        description: '您的压力水平中等，注意适当放松',
        recommendations: [
          '安排一些休闲活动，如阅读、听音乐',
          '保持社交活动，与朋友聚会',
          '学习压力管理技巧',
        ],
      });
    } else {
      results.push({
        category: '压力水平',
        status: 'good',
        score: 88,
        description: '您的压力水平控制良好',
        recommendations: [
          '继续保持当前的生活节奏',
          '分享您的压力管理经验',
        ],
      });
    }

    // 血氧分析
    if (avgBloodOxygen < 95) {
      results.push({
        category: '血氧饱和度',
        status: 'attention',
        score: 75,
        description: '您的血氧水平略低，建议关注呼吸健康',
        recommendations: [
          '保持室内通风良好',
          '进行深呼吸练习',
          '如持续偏低，建议咨询医生',
        ],
      });
    } else {
      results.push({
        category: '血氧饱和度',
        status: 'good',
        score: 92,
        description: '您的血氧水平正常，呼吸系统健康',
        recommendations: [
          '继续保持良好的生活习惯',
          '适当进行有氧运动增强肺功能',
        ],
      });
    }

    return results;
  })();

  // 计算综合健康评分
  const overallScore = insights.length > 0
    ? Math.floor(insights.reduce((sum, i) => sum + i.score, 0) / insights.length)
    : 0;

  // 生成心理健康风险评估
  const mentalHealthRisk = (() => {
    const avgStress = data.reduce((sum, d) => sum + (d.stress_level || 40), 0) / data.length;
    const avgSleep = data.reduce((sum, d) => sum + (d.sleep_hours || 7), 0) / data.length;
    const avgHeartRate = data.reduce((sum, d) => sum + (d.heart_rate || 70), 0) / data.length;

    let riskLevel: 'low' | 'moderate' | 'high' = 'low';
    let riskScore = 0;

    if (avgStress > 70 && avgSleep < 6) {
      riskLevel = 'high';
      riskScore = 75;
    } else if (avgStress > 50 || avgSleep < 6.5 || avgHeartRate > 85) {
      riskLevel = 'moderate';
      riskScore = 50;
    } else {
      riskLevel = 'low';
      riskScore = 25;
    }

    return { level: riskLevel, score: riskScore };
  })();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'attention':
        return <Heart className="w-5 h-5 text-rose-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'attention':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getRiskBadge = () => {
    switch (mentalHealthRisk.level) {
      case 'high':
        return <Badge className="bg-rose-500 text-white">高风险</Badge>;
      case 'moderate':
        return <Badge className="bg-amber-500 text-white">中等风险</Badge>;
      default:
        return <Badge className="bg-emerald-500 text-white">低风险</Badge>;
    }
  };

  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">暂无足够数据进行AI评估</p>
          <p className="text-sm text-slate-400 mt-1">请连接手环设备并同步数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 综合评估卡片 */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI 心理健康评估</h3>
                <p className="text-white/70 text-sm">基于生理数据的智能分析</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black">{overallScore}</p>
              <p className="text-xs text-white/70">综合评分</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">抑郁风险指数</span>
              {getRiskBadge()}
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mentalHealthRisk.score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  mentalHealthRisk.level === 'high' 
                    ? 'bg-rose-400' 
                    : mentalHealthRisk.level === 'moderate' 
                      ? 'bg-amber-400' 
                      : 'bg-emerald-400'
                }`}
              />
            </div>
            <p className="text-xs text-white/70 mt-2">
              {mentalHealthRisk.level === 'high' 
                ? '您的生理指标显示较高的心理压力，建议及时寻求专业帮助'
                : mentalHealthRisk.level === 'moderate'
                  ? '您的压力水平中等，建议关注心理健康并进行适当调节'
                  : '您的心理健康状况良好，继续保持！'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 健康洞察列表 */}
      <div className="space-y-3">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          健康洞察与建议
        </h4>
        
        {insights.map((insight, index) => (
          <motion.div
            key={insight.category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`border ${getStatusColor(insight.status)}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(insight.status)}
                    <CardTitle className="text-base">{insight.category}</CardTitle>
                  </div>
                  <span className="text-lg font-bold">{insight.score}分</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{insight.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lightbulb className="w-4 h-4" />
                    改善建议
                  </div>
                  <ul className="space-y-1.5">
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 免责声明 */}
      <div className="text-xs text-slate-400 text-center p-4 bg-slate-50 rounded-xl">
        <p>AI评估结果仅供参考，不能替代专业医疗诊断</p>
        <p>如有健康疑虑，请咨询专业医生</p>
      </div>
    </div>
  );
}
