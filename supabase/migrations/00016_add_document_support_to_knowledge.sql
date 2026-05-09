-- 为知识库表添加文档支持字段
-- 用于存储上传的PDF、Word、Excel等文档信息

ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',  -- 'text' | 'document'
ADD COLUMN IF NOT EXISTS file_url TEXT,                      -- Storage文件路径
ADD COLUMN IF NOT EXISTS file_name TEXT,                     -- 原始文件名
ADD COLUMN IF NOT EXISTS file_size INTEGER,                  -- 文件大小(bytes)
ADD COLUMN IF NOT EXISTS file_mime_type TEXT;                -- MIME类型

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_type ON knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_file_url ON knowledge_base(file_url) WHERE file_url IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN knowledge_base.content_type IS '内容类型: text(纯文本) 或 document(文档)';
COMMENT ON COLUMN knowledge_base.file_url IS 'Storage中的文件路径';
COMMENT ON COLUMN knowledge_base.file_name IS '原始文件名';
COMMENT ON COLUMN knowledge_base.file_size IS '文件大小(字节)';
COMMENT ON COLUMN knowledge_base.file_mime_type IS '文件MIME类型';
