-- 创建diary-images存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-images',
  'diary-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 删除旧策略(如果存在)
DROP POLICY IF EXISTS "用户可以上传日记图片" ON storage.objects;
DROP POLICY IF EXISTS "所有人可以查看日记图片" ON storage.objects;
DROP POLICY IF EXISTS "用户可以删除自己的日记图片" ON storage.objects;

-- 设置存储策略: 允许认证用户上传
CREATE POLICY "用户可以上传日记图片"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diary-images');

-- 设置存储策略: 允许所有人查看
CREATE POLICY "所有人可以查看日记图片"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diary-images');

-- 设置存储策略: 用户可以删除自己的图片
CREATE POLICY "用户可以删除自己的日记图片"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'diary-images');