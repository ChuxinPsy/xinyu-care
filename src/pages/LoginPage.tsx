import { Loader2, Stethoscope, User } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getProfile, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { validateUsername, sanitizeUsername } from '@/utils/validation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithUsername, signUpWithUsername } = useAuth();
  const [role, setRole] = useState<'user' | 'doctor'>('user');
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';
  const safeUserRedirect = typeof from === 'string' && from.startsWith('/doctor') ? '/' : from;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 清理用户名
    const cleanedUsername = sanitizeUsername(username);
    
    if (!cleanedUsername || !password) {
      toast.error('请输入用户名和密码');
      return;
    }
    if (role === 'doctor' && password.length < 6) {
      toast.error('医生端密码至少需要6个字符');
      return;
    }

    setLoading(true);
    const { error } = await signInWithUsername(cleanedUsername, password);
    setLoading(false);

    if (error) {
      toast.error('登录失败: ' + error.message);
    } else {
      // 根据数据库中的实际角色进行跳转
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let userRole: 'user' | 'doctor' | 'admin' | undefined = undefined;
        if (session?.user) {
          const p = await getProfile(session.user.id);
          userRole = p?.role;
        }
        
        // 根据数据库中的实际角色判断跳转，忽略界面上的角色选择
        if (userRole === 'doctor' || userRole === 'admin') {
          // 医生或管理员账号，跳转到医生端
          toast.success('医生端登录成功');
          navigate('/doctor/dashboard', { replace: true });
        } else if (userRole === 'user') {
          // 普通用户账号，跳转到用户端
          toast.success('登录成功');
          navigate(safeUserRedirect, { replace: true });
        } else {
          // 角色未知或未设置
          toast.success('登录成功');
          navigate(safeUserRedirect, { replace: true });
        }
      } catch (err) {
        console.error('获取用户角色失败:', err);
        toast.success('登录成功');
        navigate(safeUserRedirect, { replace: true });
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 清理用户名
    const cleanedUsername = sanitizeUsername(username);
    
    // 验证用户名格式
    const usernameValidation = validateUsername(cleanedUsername);
    if (!usernameValidation.valid) {
      toast.error(usernameValidation.message || '用户名格式不正确');
      return;
    }
    
    if (!password) {
      toast.error('请输入密码');
      return;
    }
    if (password.length < 6) {
      toast.error('密码至少需要6个字符');
      return;
    }
    
    // 医生端注册需要验证码
    if (role === 'doctor') {
      if (!verificationCode) {
        toast.error('医生端注册需要验证码');
        return;
      }
    }

    setLoading(true);
    const { error } = await signUpWithUsername(cleanedUsername, password, role, verificationCode);
    setLoading(false);

    if (error) {
      toast.error('注册失败: ' + error.message);
    } else {
      toast.success('注册成功,正在登录...');
      // 医生端注册成功后跳转到医生端界面
      if (role === 'doctor') {
        navigate('/doctor/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
              <img src="https://www.gitcc.com/uploads/-/system/appearance/header_logo/1/gitpp.png" alt="心域智护" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl">心域智护（XinyuCare）</CardTitle>
          <CardDescription>您的心理健康守护者</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 角色选择器 */}
          <div className="mb-4">
            <Label className="mb-2 inline-block">登录角色</Label>
            <ToggleGroup type="single" value={role} onValueChange={(v) => v && setRole(v as 'user' | 'doctor')} className="w-full">
              <ToggleGroupItem value="user" className="flex-1 data-[state=on]:bg-blue-600 data-[state=on]:text-white">
                <User className="w-4 h-4 mr-1" /> 用户端
              </ToggleGroupItem>
              <ToggleGroupItem value="doctor" className="flex-1 data-[state=on]:bg-emerald-600 data-[state=on]:text-white">
                <Stethoscope className="w-4 h-4 mr-1" /> 医生端
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">用户名</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder={role === 'doctor' ? '请输入医生账号用户名' : '请输入用户名'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder={role === 'doctor' ? '医生端至少6位密码' : '请输入密码'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  登录
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">用户名</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="支持中文、英文、数字（2-20个字符）"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    可使用中文昵称，支持中文、英文、数字、下划线和连字符
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">密码</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="至少6个字符"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {role === 'doctor' && (
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">验证码</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="请输入医生端验证码"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">医生端注册需要验证码，请联系管理员获取</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  注册
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
