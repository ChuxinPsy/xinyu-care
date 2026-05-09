-- 确保 profiles 表所有扩展字段都存在（幂等）
-- 修复用户资料保存失败问题：wechat / bio / background_url / selected_background

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wechat TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS background_url TEXT,
  ADD COLUMN IF NOT EXISTS selected_background TEXT;

-- 字段注释
COMMENT ON COLUMN public.profiles.wechat IS '微信号';
COMMENT ON COLUMN public.profiles.bio IS '用户扩展数据（JSON格式，包含身高体重等）';
COMMENT ON COLUMN public.profiles.background_url IS '背景图片：preset:bgId 或实际图片URL';
COMMENT ON COLUMN public.profiles.selected_background IS '已选中的预设背景ID';
