-- 创建知识文档存储桶
-- 用于存储医生上传的PDF、Word、Excel等专业文档

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-documents',
  'knowledge-documents',
  true,  -- 公开访问，便于RAG检索时下载
  52428800,  -- 50MB文件大小限制
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "医生可以上传知识文档" ON storage.objects;
DROP POLICY IF EXISTS "所有人可以查看知识文档" ON storage.objects;
DROP POLICY IF EXISTS "医生可以删除知识文档" ON storage.objects;

-- 存储策略: 医生和管理员可上传文档
CREATE POLICY "医生可以上传知识文档"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-documents' 
  AND (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('doctor', 'admin'))
  )
);

-- 存储策略: 所有人可查看文档(便于RAG检索和用户下载)
CREATE POLICY "所有人可以查看知识文档"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'knowledge-documents');

-- 存储策略: 医生和管理员可删除文档
CREATE POLICY "医生可以删除知识文档"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-documents'
  AND auth.uid() IN (SELECT id FROM profiles WHERE role IN ('doctor', 'admin'))
);
