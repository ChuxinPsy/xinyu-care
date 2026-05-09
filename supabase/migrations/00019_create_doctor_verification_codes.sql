-- 创建医生验证码管理表
CREATE TABLE public.doctor_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- 添加索引
CREATE INDEX idx_verification_codes_code ON doctor_verification_codes(code);
CREATE INDEX idx_verification_codes_is_used ON doctor_verification_codes(is_used);
CREATE INDEX idx_verification_codes_created_by ON doctor_verification_codes(created_by);

-- 插入默认永久验证码
INSERT INTO doctor_verification_codes (code, is_permanent, is_used, notes)
VALUES ('2026', true, false, '默认永久有效验证码');

-- 启用 RLS
ALTER TABLE public.doctor_verification_codes ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略：医生和管理员可以查看所有验证码
CREATE POLICY "医生和管理员可以查看验证码" ON doctor_verification_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- 创建 RLS 策略：医生和管理员可以创建验证码
CREATE POLICY "医生和管理员可以创建验证码" ON doctor_verification_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- 创建 RLS 策略：医生和管理员可以删除非永久验证码
CREATE POLICY "医生和管理员可以删除非永久验证码" ON doctor_verification_codes
  FOR DELETE TO authenticated
  USING (
    is_permanent = false
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('doctor', 'admin')
    )
  );

-- 创建 RLS 策略：允许在注册时查询验证码
CREATE POLICY "注册时可以查询验证码" ON doctor_verification_codes
  FOR SELECT TO anon
  USING (true);

-- 创建函数：验证并使用验证码
CREATE OR REPLACE FUNCTION verify_and_use_code(
  p_code TEXT,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- 查找验证码
  SELECT * INTO v_code_record
  FROM doctor_verification_codes
  WHERE code = p_code;

  -- 验证码不存在
  IF v_code_record IS NULL THEN
    RETURN false;
  END IF;

  -- 非永久验证码且已被使用
  IF NOT v_code_record.is_permanent AND v_code_record.is_used THEN
    RETURN false;
  END IF;

  -- 如果是非永久验证码，标记为已使用
  IF NOT v_code_record.is_permanent THEN
    UPDATE doctor_verification_codes
    SET is_used = true,
        used_by = p_user_id,
        used_at = NOW()
    WHERE id = v_code_record.id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
