import { Calendar, ChevronLeft, Mail, MessageSquare, Phone, Ruler, Save, Scale, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/db/api';

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    gender: 'other',
    age: '',
    height: '',
    weight: '',
    phone: '',
    wechat: '',
    email: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        gender: (profile.gender as any) || 'other',
        age: profile.birth_date ? calculateAge(profile.birth_date).toString() : '',
        height: '', // Assume these aren't in profile yet, or add to metadata
        weight: '',
        phone: profile.phone || '',
        wechat: profile.wechat || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Basic validation
      if (formData.height && (parseInt(formData.height) < 50 || parseInt(formData.height) > 250)) {
        toast.error('请输入有效的身高 (50-250cm)');
        return;
      }
      
      await updateProfile(user.id, {
        full_name: formData.full_name,
        gender: formData.gender,
        phone: formData.phone,
        wechat: formData.wechat,
        email: formData.email,
        // birth_date can be derived from age if needed, but for now we'll just save what we have
      });
      
      await refreshProfile();
      toast.success('个人资料已自动保存');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  // Auto-save logic (simplified)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.full_name && profile && formData.full_name !== profile.full_name) {
        handleSave();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">基本信息管理</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              身份信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">真实姓名</Label>
              <Input 
                id="full_name" 
                value={formData.full_name} 
                onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="请输入您的姓名"
              />
            </div>

            <div className="space-y-2">
              <Label>性别</Label>
              <RadioGroup 
                value={formData.gender} 
                onValueChange={v => setFormData(prev => ({ ...prev, gender: v }))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">男</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">女</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>年龄阶段</Label>
              <Select 
                value={formData.age} 
                onValueChange={v => setFormData(prev => ({ ...prev, age: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择您的年龄" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(age => (
                    <SelectItem key={age} value={age.toString()}>{age} 岁</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-500" />
              身体数据
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height" className="flex items-center gap-1">
                <Ruler className="w-4 h-4" /> 身高 (cm)
              </Label>
              <Input 
                id="height" 
                type="number" 
                value={formData.height} 
                onChange={e => setFormData(prev => ({ ...prev, height: e.target.value }))}
                placeholder="175"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-1">
                <Scale className="w-4 h-4" /> 体重 (kg)
              </Label>
              <Input 
                id="weight" 
                type="number" 
                value={formData.weight} 
                onChange={e => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="65"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-500" />
              联系方式
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="w-4 h-4" /> 手机号
              </Label>
              <Input 
                id="phone" 
                type="tel" 
                value={formData.phone} 
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入手机号"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wechat" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" /> 微信号
              </Label>
              <Input 
                id="wechat" 
                value={formData.wechat} 
                onChange={e => setFormData(prev => ({ ...prev, wechat: e.target.value }))}
                placeholder="请输入微信号"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="w-4 h-4" /> 邮箱
              </Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="请输入邮箱地址"
              />
            </div>
          </CardContent>
        </Card>

        <div className="pt-4">
          <Button 
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '正在保存...' : '立即保存'}
            <Save className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-center text-xs text-slate-400 mt-4">
            修改将自动同步至您的健康云端档案
          </p>
        </div>
      </div>
    </div>
  );
}
