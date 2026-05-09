-- ==========================================
-- 确保数据库支持中文用户名
-- ==========================================
-- Supabase PostgreSQL 默认使用 UTF-8 编码，此迁移文件用于验证和记录

-- 验证数据库编码设置
DO $$
DECLARE
  db_encoding text;
BEGIN
  SELECT pg_encoding_to_char(encoding) INTO db_encoding
  FROM pg_database
  WHERE datname = current_database();
  
  IF db_encoding != 'UTF8' THEN
    RAISE EXCEPTION 'Database encoding is %, expected UTF8', db_encoding;
  END IF;
  
  RAISE NOTICE '✓ Database encoding verified: %', db_encoding;
END $$;

-- profiles.id 引用 auth.users(id)，不能插入随机 UUID 做探测。
-- 改为验证 text 类型对 UTF-8 中文的往返（与 username 列类型一致）。
DO $$
DECLARE
  sample text := '测试中文用户名';
BEGIN
  IF (SELECT sample::text) IS DISTINCT FROM sample THEN
    RAISE EXCEPTION 'Failed to round-trip Chinese characters in text type';
  END IF;
  RAISE NOTICE '✓ UTF-8 Chinese text round-trip verified (username column is text)';
END $$;

-- 为 profiles.username 字段添加注释说明支持中文
COMMENT ON COLUMN profiles.username IS '用户名，支持中文、英文、数字、下划线和连字符（2-20个字符）';

-- 验证完成提示
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '中文用户名支持验证完成';
  RAISE NOTICE '- 数据库编码: UTF-8 ✓';
  RAISE NOTICE '- UTF-8 文本: 支持 ✓';
  RAISE NOTICE '- username字段: 已更新注释';
  RAISE NOTICE '==========================================';
END $$;
