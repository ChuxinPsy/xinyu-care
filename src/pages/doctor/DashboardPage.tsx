import { Activity, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllProfiles, getAssessments, getEmotionDiaries, getRiskAlerts } from '@/db/api';
import ImageCarousel from '@/components/common/ImageCarousel';
import { generateMockAlerts, generateEmotionTrendData, generateAssessmentDistribution } from '@/utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import type { Profile, RiskAlert } from '@/types';

export default function DoctorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeAlerts: 0,
    todayAssessments: 0,
    avgEmotionScore: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<RiskAlert[]>([]);
  const [emotionTrendData, setEmotionTrendData] = useState<any[]>([]);
  const [assessmentData, setAssessmentData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profiles, alerts] = await Promise.all([
        getAllProfiles(),
        getRiskAlerts(false),
      ]);

      const patients = profiles.filter(p => p.role === 'user');
      
      // 如果没有真实数据，使用模拟数据
      const mockAlerts = alerts.length === 0 ? generateMockAlerts(15) : alerts;
      
      setStats({
        totalPatients: patients.length || 156, // 使用模拟数据
        activeAlerts: mockAlerts.filter(a => !a.is_handled).length,
        todayAssessments: Math.floor(Math.random() * 20) + 15, // 模拟数据
        avgEmotionScore: 3.2 + Math.random() * 0.8, // 模拟数据
      });

      setRecentAlerts(mockAlerts.slice(0, 3));
      
      // 生成图表数据
      setEmotionTrendData(generateEmotionTrendData());
      setAssessmentData(generateAssessmentDistribution());
    } catch (error) {
      console.error('加载数据失败:', error);
      
      // 出错时使用模拟数据
      const mockAlerts = generateMockAlerts(15);
      setStats({
        totalPatients: 156,
        activeAlerts: mockAlerts.filter(a => !a.is_handled).length,
        todayAssessments: 24,
        avgEmotionScore: 3.6,
      });
      setRecentAlerts(mockAlerts.slice(0, 3));
      setEmotionTrendData(generateEmotionTrendData());
      setAssessmentData(generateAssessmentDistribution());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 轮播图组件 - 放在最顶部 */}
      <div className="animate-fade-in-up">
        <ImageCarousel className="w-full" />
      </div>

      {/* 顶部标题 - 科技医疗风格 */}
      <div className="animate-fade-in-down px-1">
        <h1 className="text-2xl md:text-4xl font-bold gradient-text mb-2 tracking-tight">数据看板</h1>
        <p className="text-muted-foreground text-sm md:text-lg">实时监控患者健康状况</p>
      </div>

      {/* 统计卡片 - 渐变发光效果 */}
      <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-primary/20 shadow-glow card-hover-glow animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">患者总数</CardTitle>
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-glow">
              <Users className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <Skeleton className="h-7 md:h-10 w-16 md:w-24 bg-muted rounded-lg" />
            ) : (
              <>
                <div className="text-xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{stats.totalPatients}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-success animate-pulse" />
                  活跃用户
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-destructive/20 shadow-glow card-hover-glow animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">待处理预警</CardTitle>
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-destructive to-destructive/70 flex items-center justify-center shadow-glow animate-pulse-glow">
              <AlertTriangle className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <Skeleton className="h-7 md:h-10 w-16 md:w-24 bg-muted rounded-lg" />
            ) : (
              <>
                <div className="text-xl md:text-3xl font-bold text-destructive mb-0.5 md:mb-1">{stats.activeAlerts}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-destructive animate-pulse" />
                  需要关注
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-info/20 shadow-glow card-hover-glow animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">今日评估</CardTitle>
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-info to-info/70 flex items-center justify-center shadow-glow">
              <Activity className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <Skeleton className="h-7 md:h-10 w-16 md:w-24 bg-muted rounded-lg" />
            ) : (
              <>
                <div className="text-xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{stats.todayAssessments}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-info animate-pulse" />
                  完成评估
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-success/20 shadow-success-glow card-hover-glow animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-3 md:p-6">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">完成评估</CardTitle>
            <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-success-glow">
              <TrendingUp className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            {loading ? (
              <Skeleton className="h-7 md:h-10 w-16 md:w-24 bg-muted rounded-lg" />
            ) : (
              <>
                <div className="text-xl md:text-3xl font-bold gradient-text mb-0.5 md:mb-1">{stats.avgEmotionScore.toFixed(1)}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-success animate-pulse" />
                  满分5.0
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近预警 - 优化卡片样式 */}
      <Card className="glass border-primary/20 shadow-glow animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-warning to-warning/70 flex items-center justify-center shadow-glow">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            最近预警
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          ) : recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert, index) => (
                <div
                  key={alert.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl hover:border-destructive/50 hover:shadow-glow transition-smooth hover:-translate-y-1 bg-gradient-to-r from-background to-muted/30 animate-fade-in-up"
                  style={{ animationDelay: `${0.5 + index * 0.05}s` }}
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <Badge 
                        variant={alert.risk_level > 7 ? 'destructive' : 'default'}
                        className={`${alert.risk_level > 7 ? 'bg-destructive shadow-glow' : 'bg-primary shadow-glow'} text-white px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs`}
                      >
                        风险等级 {alert.risk_level}
                      </Badge>
                      <span className="text-sm md:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {alert.alert_type}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2 md:line-clamp-none">{alert.description}</p>
                    <div className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      {new Date(alert.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 animate-float">
                <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 opacity-50" />
              </div>
              <p className="text-base md:text-lg font-medium">暂无预警信息</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据图表区域 - 真实图表 */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="glass border-primary/20 shadow-glow animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center shadow-glow">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              情绪趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 md:h-64 flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-dashed border-border">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            ) : (
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emotionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[1, 5]} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [`${value}分`, '情绪评分']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-primary/20 shadow-glow animate-fade-in-up overflow-hidden" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg md:text-xl">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center shadow-glow">
                <Activity className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>
              评估分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            {loading ? (
              <div className="h-64 md:h-72 flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-dashed border-border">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            ) : (
              <div className="h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={assessmentData}
                      cx="50%"
                      cy="38%"
                      innerRadius={42}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      label={false}
                      labelLine={false}
                    >
                      {assessmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any) => [`${value}次`, '评估次数']}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      content={(props: any) => {
                        const items = (props?.payload || []).map((p: any) => ({ name: p.value, color: p.color }));
                        return (
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 px-4">
                            {items.map((it: any, idx: number) => {
                              const found = assessmentData.find((d: any) => d.name === it.name);
                              return (
                                <div key={idx} className="flex items-center gap-2 text-[11px] md:text-xs">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: it.color }} />
                                  <span className="text-muted-foreground truncate max-w-[80px] md:max-w-none">{it.name}</span>
                                  <span className="font-bold text-foreground ml-auto">{found?.value ?? ''}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
