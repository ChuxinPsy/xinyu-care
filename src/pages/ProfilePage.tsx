import { Activity, Calendar, Edit, LogOut, Mail, Phone, Shield, User, FileText, ChevronRight, AlertTriangle, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showFusionReport, setShowFusionReport] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setGender(profile.gender || '');
      setBirthDate(profile.birth_date || '');
    }
  }, [profile]);

  useEffect(() => {
    if (searchParams.get('openReport') === '1') {
      setShowFusionReport(true);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user.id, {
        full_name: fullName || undefined,
        gender: gender || undefined,
        birth_date: birthDate || undefined,
      });
      await refreshProfile();
      toast.success('资料已更新');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败');
    }
  };

  const roleMap: Record<string, string> = {
    user: '普通用户',
    doctor: '医生',
    admin: '管理员',
  };

  // Mock fusion report data
  const fusionData = {
    riskScore: 78,
    riskLevel: '高风险',
    timestamp: new Date().toLocaleString(),
    scaleScore: 18, // PHQ-9
    voiceRisk: '中',
    expressionRisk: '高',
    summary: '综合多模态评估显示，您的抑郁风险指数较高（78/100）。量表得分提示重度抑郁症状，面部微表情（眉心皱纹、嘴角下垂）与语音特征（语速慢、停顿长）均呈现显著的一致性。建议立即预约专业医生进行临床诊断。',
    weights: { scale: 50, voice: 20, expression: 30 }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 顶部个人信息 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 pb-12">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20 border-4 border-primary-foreground/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary-foreground/20 text-2xl">
                {profile?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile?.full_name || profile?.username}</h1>
              <p className="text-primary-foreground/90">@{profile?.username}</p>
              <Badge variant="secondary" className="mt-2">
                {profile?.role && roleMap[profile.role]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 -mt-6 space-y-4">
        {/* 融合报告卡片 (当有参数时显示) */}
        {showFusionReport && (
          <Card className="border-l-4 border-l-rose-500 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-500" />
                    最新多模态融合评估报告
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">生成时间: {fusionData.timestamp}</p>
                </div>
                <Badge variant={fusionData.riskScore >= 70 ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                  {fusionData.riskLevel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl flex items-center justify-between">
                 <div className="space-y-1">
                   <p className="text-xs text-muted-foreground font-bold uppercase">综合风险分值</p>
                   <p className={`text-3xl font-black ${fusionData.riskScore >= 70 ? 'text-rose-500' : 'text-primary'}`}>
                     {fusionData.riskScore}<span className="text-sm text-muted-foreground font-normal">/100</span>
                   </p>
                 </div>
                 <div className="text-right space-y-1">
                   <p className="text-xs text-muted-foreground">量表(50%) + 语音(20%) + 表情(30%)</p>
                   {fusionData.riskScore >= 70 && (
                     <div className="flex items-center gap-1 text-xs text-rose-500 font-bold justify-end">
                       <AlertTriangle className="w-3 h-3" /> 已自动推送预警
                     </div>
                   )}
                 </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                <span className="font-bold">AI 综合结论：</span>{fusionData.summary}
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    1. 心理量表评估 (PHQ-9)
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>总分</span>
                        <span className="font-bold">{fusionData.scaleScore} (重度)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">主要症状：情绪低落、睡眠障碍、疲乏无力。</p>
                      <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs">
                        <Download className="w-3 h-3 mr-2" /> 下载量表报告
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    2. 语音情绪识别
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>风险等级</span>
                        <span className="font-bold text-amber-500">{fusionData.voiceRisk}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">特征：语速偏慢(110字/分)，基频方差小，缺乏抑扬顿挫。</p>
                      <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs">
                        <Download className="w-3 h-3 mr-2" /> 下载语音报告
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    3. 表情微反应分析
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>风险等级</span>
                        <span className="font-bold text-rose-500">{fusionData.expressionRisk}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">特征：悲伤情绪占比45%，眉心皱纹频繁，嘴角持续下垂。</p>
                      <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs">
                        <Download className="w-3 h-3 mr-2" /> 下载表情报告
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex gap-3 pt-2">
                 <Button className="flex-1 bg-primary text-white shadow-lg shadow-primary/20">
                   <FileText className="w-4 h-4 mr-2" /> 导出完整融合报告
                 </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 个人资料 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                个人资料
              </div>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    编辑
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>编辑资料</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">姓名</Label>
                      <Input
                        id="full-name"
                        placeholder="请输入姓名"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">性别</Label>
                      <Input
                        id="gender"
                        placeholder="男/女"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birth-date">出生日期</Label>
                      <Input
                        id="birth-date"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleUpdateProfile} className="w-full">
                      保存
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-3 text-muted-foreground" />
              <span className="text-muted-foreground w-20">用户名</span>
              <span className="font-medium">{profile?.username}</span>
            </div>
            {profile?.full_name && (
              <div className="flex items-center text-sm">
                <User className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="text-muted-foreground w-20">姓名</span>
                <span className="font-medium">{profile.full_name}</span>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center text-sm">
                <Mail className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="text-muted-foreground w-20">邮箱</span>
                <span className="font-medium">{profile.email}</span>
              </div>
            )}
            {profile?.phone && (
              <div className="flex items-center text-sm">
                <Phone className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="text-muted-foreground w-20">手机</span>
                <span className="font-medium">{profile.phone}</span>
              </div>
            )}
            {profile?.birth_date && (
              <div className="flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-3 text-muted-foreground" />
                <span className="text-muted-foreground w-20">生日</span>
                <span className="font-medium">
                  {new Date(profile.birth_date).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 功能菜单 */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {(profile?.role === 'doctor' || profile?.role === 'admin') && (
                <Button
                  variant="ghost"
                  className="w-full justify-start h-14 rounded-none"
                  onClick={() => navigate('/doctor/dashboard')}
                >
                  <Shield className="w-5 h-5 mr-3 text-primary" />
                  <span>医生管理后台</span>
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start h-14 rounded-none"
                onClick={() => navigate('/record')}
              >
                <Activity className="w-5 h-5 mr-3 text-primary" />
                <span>我的健康档案</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 退出登录 */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          退出登录
        </Button>

        {/* 版本信息 */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>心域智护（XinyuCare）v1.0.0</p>
          <p className="mt-1">© 2026 心域智护</p>
        </div>
      </div>
    </div>
  );
}
