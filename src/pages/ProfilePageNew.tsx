import { Activity, ChevronRight, 
  Edit, FileText, Heart, LogOut, Pill, 
  Settings, Stethoscope, UserCircle, Watch 
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { getAssessments, getEmotionDiaries, updateProfile } from '@/db/api';

export default function ProfilePageNew() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // 健康评分
  const [healthScore] = useState(87);
  const [assessmentCount, setAssessmentCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    loadHealthData();
  }, [profile, user]);

  const loadHealthData = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      const [assessments, diaries] = await Promise.all([
        getAssessments(user.id, 100),
        getEmotionDiaries(user.id, 100),
      ]);
      setAssessmentCount(assessments.length);
    } catch (error) {
      console.error('加载健康数据失败:', error);
      toast.error('加载健康数据失败，请重试');
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    try {
      await updateProfile(user.id, {
        full_name: fullName || undefined,
        phone: phone || undefined,
      });
      await refreshProfile();
      toast.success('资料已更新');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新资料失败，请重试');
    }
  };

  const menuItems = [
    {
      title: '评估历史',
      subtitle: `${assessmentCount}次评估`,
      icon: Activity,
      iconBg: 'bg-blue-500',
      iconColor: 'text-white',
      onClick: () => navigate('/assessment'),
    },
    {
      title: '健康档案',
      subtitle: '查看完整健康记录',
      icon: FileText,
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      onClick: () => toast.info('健康档案功能开发中'),
    },
    {
      title: '体征监测',
      subtitle: '心率、血压等数据',
      icon: Heart,
      iconBg: 'bg-rose-500',
      iconColor: 'text-white',
      onClick: () => toast.info('体征监测功能开发中'),
    },
    {
      title: '在线问诊',
      subtitle: '咨询专业医生',
      icon: Stethoscope,
      iconBg: 'bg-cyan-500',
      iconColor: 'text-white',
      onClick: () => toast.info('在线问诊功能开发中'),
    },
    {
      title: '用药提醒',
      subtitle: '按时服药记录',
      icon: Pill,
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
      onClick: () => toast.info('用药提醒功能开发中'),
    },
  ];

  const getUserInitial = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = () => {
    return profile?.full_name || user?.email?.split('@')[0] || '用户';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* 个人信息卡片 - 医疗蓝主题 */}
        <Card className="border-0 shadow-xl overflow-hidden animate-fade-in-down bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500">
          <CardContent className="p-6 space-y-6">
            {/* 用户信息 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20 border-4 border-white/40 shadow-2xl ring-4 ring-white/20">
                  <AvatarFallback className="bg-white text-blue-600 text-2xl font-bold">
                    {getUserInitial()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-bold text-white">
                    {getUserDisplayName()}
                  </h2>
                  <p className="text-white/90 text-sm">
                    {user?.email}
                  </p>
                  <Badge className="bg-white/25 text-white border-0 backdrop-blur-sm hover:bg-white/30 transition-colors">
                    <UserCircle className="w-3 h-3 mr-1" />
                    患者
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditDialogOpen(true)}
                className="text-white hover:bg-white/20 transition-all duration-300 rounded-full"
              >
                <Edit className="w-5 h-5" />
              </Button>
            </div>

            {/* 健康评分卡片 - 玻璃拟态 */}
            <div className="bg-white/15 backdrop-blur-xl rounded-2xl p-6 border border-white/30 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold text-lg">健康评分</span>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </div>
              
              <div className="flex items-end gap-2 mb-4">
                <span className="text-7xl font-bold text-white leading-none">{healthScore}</span>
                <span className="text-3xl text-white/80 mb-1">/100</span>
              </div>

              {/* 圆角进度条 */}
              <div className="w-full h-3 bg-white/25 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-white via-cyan-100 to-white rounded-full transition-all duration-1000 ease-out shadow-lg"
                  style={{ width: `${healthScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 快捷功能 */}
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 px-1">快捷功能</h3>
          
          <div className="grid gap-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-fade-in-up group bg-white dark:bg-slate-800"
                  style={{ animationDelay: `${(index + 1) * 0.05}s` }}
                  onClick={item.onClick}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      {/* 医疗图标 */}
                      <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 ${item.iconColor}`} />
                      </div>

                      {/* 文字信息 */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {item.subtitle}
                        </p>
                      </div>

                      {/* 箭头 */}
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 设置和退出 */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Card
            className="border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white dark:bg-slate-800"
            onClick={() => setEditDialogOpen(true)}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-base mb-1">
                    设置
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    账户与隐私设置
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full h-14 text-base font-medium border-2 border-slate-200 dark:border-slate-700 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 rounded-2xl"
          >
            <LogOut className="w-5 h-5 mr-2" />
            退出登录
          </Button>
        </div>

        {/* 版本信息 */}
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 pb-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <p>心域智护（XinyuCare）v1.0.0</p>
          <p className="text-xs mt-1">© 2026 心域智护. 专业心理健康管理</p>
        </div>
      </div>

      {/* 编辑资料对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-200">编辑个人资料</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                姓名
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="请输入您的姓名"
                className="h-12 rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                手机号
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入您的手机号"
                className="h-12 rounded-xl border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                邮箱
              </Label>
              <Input
                value={user?.email || ''}
                disabled
                className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="flex-1 h-12 rounded-xl border-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateProfile}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
            >
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
