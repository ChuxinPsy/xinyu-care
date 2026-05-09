-- 添加多媒体字段到emotion_diaries表
ALTER TABLE emotion_diaries 
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- 添加注释
COMMENT ON COLUMN emotion_diaries.image_urls IS '图片URL数组';
COMMENT ON COLUMN emotion_diaries.voice_url IS '语音URL';