-- 创建情绪等级枚举
CREATE TYPE public.emotion_level AS ENUM ('very_bad', 'bad', 'neutral', 'good', 'very_good');

-- 创建情绪日记表
CREATE TABLE public.emotion_diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  diary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  emotion_level public.emotion_level NOT NULL,
  title TEXT,
  content TEXT,
  tags TEXT[],
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, diary_date)
);

-- 创建评估记录表
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL DEFAULT 'multimodal',
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  text_input TEXT,
  voice_input_url TEXT,
  image_input_url TEXT,
  video_input_url TEXT,
  ai_analysis JSONB,
  risk_level INTEGER DEFAULT 0,
  score INTEGER,
  report JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建手环数据表
CREATE TABLE public.wearable_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  heart_rate INTEGER,
  sleep_hours DECIMAL(4,2),
  sleep_quality INTEGER,
  steps INTEGER,
  calories INTEGER,
  stress_level INTEGER,
  data_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, record_date)
);

-- 创建疗愈内容表
CREATE TABLE public.healing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_url TEXT,
  duration INTEGER,
  thumbnail_url TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建用户疗愈记录表
CREATE TABLE public.user_healing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  healing_content_id UUID NOT NULL REFERENCES healing_contents(id) ON DELETE CASCADE,
  duration_seconds INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 设置RLS策略
ALTER TABLE public.emotion_diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.healing_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_healing_records ENABLE ROW LEVEL SECURITY;

-- emotion_diaries策略
CREATE POLICY "用户可以查看自己的情绪日记" ON emotion_diaries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的情绪日记" ON emotion_diaries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的情绪日记" ON emotion_diaries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的情绪日记" ON emotion_diaries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "医生可以查看所有情绪日记" ON emotion_diaries
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- assessments策略
CREATE POLICY "用户可以查看自己的评估记录" ON assessments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的评估记录" ON assessments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "医生可以查看所有评估记录" ON assessments
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- wearable_data策略
CREATE POLICY "用户可以查看自己的手环数据" ON wearable_data
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的手环数据" ON wearable_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "医生可以查看所有手环数据" ON wearable_data
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- healing_contents策略(公开可读)
CREATE POLICY "所有认证用户可以查看活跃的疗愈内容" ON healing_contents
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "管理员可以管理疗愈内容" ON healing_contents
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- user_healing_records策略
CREATE POLICY "用户可以查看自己的疗愈记录" ON user_healing_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的疗愈记录" ON user_healing_records
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "医生可以查看所有疗愈记录" ON user_healing_records
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- 创建更新时间触发器
CREATE TRIGGER update_emotion_diaries_updated_at
  BEFORE UPDATE ON emotion_diaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_healing_contents_updated_at
  BEFORE UPDATE ON healing_contents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 创建索引
CREATE INDEX idx_emotion_diaries_user_date ON emotion_diaries(user_id, diary_date DESC);
CREATE INDEX idx_assessments_user_created ON assessments(user_id, created_at DESC);
CREATE INDEX idx_wearable_data_user_date ON wearable_data(user_id, record_date DESC);
CREATE INDEX idx_healing_contents_category ON healing_contents(category, is_active);
CREATE INDEX idx_user_healing_records_user ON user_healing_records(user_id, created_at DESC);