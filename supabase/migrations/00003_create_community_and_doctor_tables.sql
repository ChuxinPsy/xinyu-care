-- 创建树洞帖子表(匿名)
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anonymous_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建树洞评论表
CREATE TABLE public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anonymous_name TEXT NOT NULL,
  content TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建点赞记录表
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 创建医生患者关系表
CREATE TABLE public.doctor_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id)
);

-- 创建风险预警表
CREATE TABLE public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  risk_level INTEGER NOT NULL,
  description TEXT NOT NULL,
  data_source TEXT,
  source_id UUID,
  is_handled BOOLEAN NOT NULL DEFAULT false,
  handled_by UUID REFERENCES profiles(id),
  handled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建知识库表
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 设置RLS策略
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- community_posts策略
CREATE POLICY "所有认证用户可以查看未隐藏的帖子" ON community_posts
  FOR SELECT TO authenticated USING (is_hidden = false);

CREATE POLICY "用户可以创建帖子" ON community_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的帖子" ON community_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的帖子" ON community_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "管理员可以管理所有帖子" ON community_posts
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- community_comments策略
CREATE POLICY "所有认证用户可以查看评论" ON community_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "用户可以创建评论" ON community_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的评论" ON community_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- post_likes策略
CREATE POLICY "所有认证用户可以查看点赞" ON post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "用户可以点赞" ON post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以取消点赞" ON post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- doctor_patients策略
CREATE POLICY "医生可以查看自己的患者" ON doctor_patients
  FOR SELECT TO authenticated USING (auth.uid() = doctor_id OR is_admin(auth.uid()));

CREATE POLICY "患者可以查看自己的医生" ON doctor_patients
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE POLICY "医生可以添加患者" ON doctor_patients
  FOR INSERT TO authenticated WITH CHECK (is_doctor(auth.uid()) AND auth.uid() = doctor_id);

CREATE POLICY "医生可以更新患者关系" ON doctor_patients
  FOR UPDATE TO authenticated USING (auth.uid() = doctor_id);

-- risk_alerts策略
CREATE POLICY "医生可以查看所有预警" ON risk_alerts
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "系统可以创建预警" ON risk_alerts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "医生可以处理预警" ON risk_alerts
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- knowledge_base策略
CREATE POLICY "医生可以查看知识库" ON knowledge_base
  FOR SELECT TO authenticated USING (is_admin(auth.uid()) AND is_active = true);

CREATE POLICY "管理员可以管理知识库" ON knowledge_base
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 创建更新时间触发器
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_doctor_patients_updated_at
  BEFORE UPDATE ON doctor_patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 创建索引
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_tags ON community_posts USING GIN(tags);
CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at DESC);
CREATE INDEX idx_doctor_patients_doctor ON doctor_patients(doctor_id, status);
CREATE INDEX idx_doctor_patients_patient ON doctor_patients(patient_id);
CREATE INDEX idx_risk_alerts_patient ON risk_alerts(patient_id, created_at DESC);
CREATE INDEX idx_risk_alerts_handled ON risk_alerts(is_handled, created_at DESC);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category, is_active);