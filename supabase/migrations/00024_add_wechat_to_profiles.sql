-- ==========================================
-- 为 profiles 表添加微信号字段
-- ==========================================

-- 添加 wechat 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wechat TEXT;

-- 添加字段注释
COMMENT ON COLUMN public.profiles.wechat IS '微信号';

-- 验证字段已添加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'wechat'
  ) THEN
    RAISE NOTICE '✓ wechat 字段已成功添加到 profiles 表';
  ELSE
    RAISE EXCEPTION 'wechat 字段添加失败';
  END IF;
END $$;
