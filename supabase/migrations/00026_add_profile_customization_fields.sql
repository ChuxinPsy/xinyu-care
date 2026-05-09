-- 添加个人资料自定义字段
-- 这些字段用于存储用户的头像、背景和基本信息

-- 添加 bio 字段（用于存储身高体重等JSON数据）
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 添加 background_url 字段（存储背景设置：preset:bgId 或实际URL）
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS background_url TEXT;

-- 添加 selected_background 字段（存储选中的预设背景ID）
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS selected_background TEXT;

-- 验证字段已添加
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'background_url'
  ) THEN
    RAISE NOTICE '✓ background_url 字段已成功添加到 profiles 表';
  ELSE
    RAISE EXCEPTION 'background_url 字段添加失败';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'selected_background'
  ) THEN
    RAISE NOTICE '✓ selected_background 字段已成功添加到 profiles 表';
  ELSE
    RAISE EXCEPTION 'selected_background 字段添加失败';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bio'
  ) THEN
    RAISE NOTICE '✓ bio 字段已成功添加到 profiles 表';
  ELSE
    RAISE EXCEPTION 'bio 字段添加失败';
  END IF;
END $$;

-- 添加字段注释
COMMENT ON COLUMN public.profiles.bio IS '用户个人简介及扩展数据（JSON格式，包含身高体重等）';
COMMENT ON COLUMN public.profiles.background_url IS '背景图片设置：preset:bgId格式表示预设背景，或实际图片URL';
COMMENT ON COLUMN public.profiles.selected_background IS '已选中的预设背景ID（与background_url配合使用）';
