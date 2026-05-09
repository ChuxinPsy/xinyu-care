-- 冥想记录表
CREATE TABLE IF NOT EXISTS meditation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES healing_contents(id) ON DELETE CASCADE,
  duration INTEGER NOT NULL, -- 冥想时长(秒)
  completed BOOLEAN DEFAULT false,
  mood_before TEXT, -- 冥想前情绪
  mood_after TEXT, -- 冥想后情绪
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 内容库表(扩展healing_contents)
ALTER TABLE healing_contents ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'audio'; -- audio, video, article
ALTER TABLE healing_contents ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE healing_contents ADD COLUMN IF NOT EXISTS author TEXT;
ALTER TABLE healing_contents ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE healing_contents ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES healing_contents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- 帖子分类表
CREATE TABLE IF NOT EXISTS post_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 为community_posts添加分类字段
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES post_categories(id);
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_recovery_story BOOLEAN DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS anonymous_nickname TEXT;

-- 插入帖子分类
INSERT INTO post_categories (name, description, icon, color) VALUES
  ('寻求支持', '分享你的困扰,寻求树洞的帮助和建议', 'heart', 'pink'),
  ('分享进展', '分享你的康复进展和积极变化', 'trending-up', 'green'),
  ('提问', '提出关于心理健康的问题', 'help-circle', 'blue'),
  ('提供鼓励', '给其他成员提供支持和鼓励', 'smile', 'yellow'),
  ('康复故事', '分享完整的康复经历,给他人带来希望', 'star', 'purple')
ON CONFLICT (name) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON meditation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_created_at ON meditation_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category_id ON community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_is_recovery_story ON community_posts(is_recovery_story);

-- RLS策略
ALTER TABLE meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

-- meditation_sessions策略
CREATE POLICY "用户可以查看自己的冥想记录" ON meditation_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可以创建自己的冥想记录" ON meditation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以更新自己的冥想记录" ON meditation_sessions FOR UPDATE USING (auth.uid() = user_id);

-- user_favorites策略
CREATE POLICY "用户可以查看自己的收藏" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "用户可以添加收藏" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以删除收藏" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- post_categories策略
CREATE POLICY "所有人可以查看帖子分类" ON post_categories FOR SELECT USING (true);

-- 更新healing_contents的view_count和like_count函数
CREATE OR REPLACE FUNCTION increment_view_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE healing_contents SET view_count = view_count + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_like_count(content_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE healing_contents SET like_count = like_count + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;