-- ==========================================
-- 医生端注册角色修复 - 完整执行指南
-- ==========================================
-- 问题：医生端注册后角色显示为"用户"而非"医生"
-- 原因：link_username_to_user 函数覆盖了 handle_new_user 设置的角色
-- 解决：修复函数逻辑 + 同步已存在用户的角色
-- ==========================================

-- ========== 步骤 1：修复 link_username_to_user 函数 ==========
-- 确保该函数保留用户注册时指定的角色

CREATE OR REPLACE FUNCTION link_username_to_user(uid uuid, uname text)
RETURNS void AS $$
DECLARE
  old_id uuid;
  user_role user_role;
  existing_profile_id uuid;
BEGIN
  -- 从 auth.users 的 metadata 中获取用户注册时指定的角色
  SELECT 
    CASE 
      WHEN COALESCE(raw_user_meta_data->>'role', '') = 'doctor' THEN 'doctor'::user_role
      WHEN COALESCE(raw_user_meta_data->>'role', '') = 'admin' THEN 'admin'::user_role
      ELSE 'user'::user_role
    END INTO user_role
  FROM auth.users 
  WHERE id = uid;

  -- 检查当前用户是否已经有 profile
  SELECT id INTO existing_profile_id FROM profiles WHERE id = uid;

  -- 查找是否有其他用户使用相同用户名（用于迁移旧数据）
  SELECT id INTO old_id FROM profiles WHERE username = uname AND id <> uid LIMIT 1;
  
  IF old_id IS NULL THEN
    -- 情况1：没有其他用户使用这个用户名
    IF existing_profile_id IS NULL THEN
      -- 当前用户还没有 profile，创建新的
      INSERT INTO profiles (id, username, role, created_at, updated_at)
      VALUES (uid, uname, user_role, now(), now());
    ELSE
      -- 当前用户已有 profile（由 handle_new_user 触发器创建），更新角色和用户名
      UPDATE profiles 
      SET role = user_role, 
          username = uname, 
          updated_at = now()
      WHERE id = uid;
    END IF;
    RETURN;
  END IF;

  -- 情况2：有其他用户使用这个用户名，需要迁移数据
  -- 确保新用户的 profile 存在并设置正确的角色
  INSERT INTO profiles (id, username, email, phone, role, avatar_url, full_name, gender, birth_date, created_at, updated_at)
  SELECT uid, p.username, p.email, p.phone, user_role, p.avatar_url, p.full_name, p.gender, p.birth_date, p.created_at, now()
  FROM profiles p WHERE p.id = old_id
  ON CONFLICT (id) DO UPDATE SET 
    username = EXCLUDED.username, 
    email = EXCLUDED.email, 
    phone = EXCLUDED.phone,
    role = user_role,  -- 使用从 auth.users 获取的角色
    avatar_url = EXCLUDED.avatar_url, 
    full_name = EXCLUDED.full_name, 
    gender = EXCLUDED.gender,
    birth_date = EXCLUDED.birth_date, 
    updated_at = now();

  -- 迁移引用 old_id 的所有外键到 uid
  UPDATE emotion_diaries SET user_id = uid WHERE user_id = old_id;
  UPDATE assessments SET user_id = uid WHERE user_id = old_id;
  UPDATE wearable_data SET user_id = uid WHERE user_id = old_id;
  UPDATE user_healing_records SET user_id = uid WHERE user_id = old_id;
  UPDATE community_posts SET user_id = uid WHERE user_id = old_id;
  UPDATE community_comments SET user_id = uid WHERE user_id = old_id;
  UPDATE post_likes SET user_id = uid WHERE user_id = old_id;
  UPDATE doctor_patients SET doctor_id = uid WHERE doctor_id = old_id;
  UPDATE doctor_patients SET patient_id = uid WHERE patient_id = old_id;
  UPDATE risk_alerts SET patient_id = uid WHERE patient_id = old_id;
  UPDATE risk_alerts SET handled_by = uid WHERE handled_by = old_id;
  UPDATE knowledge_base SET created_by = uid WHERE created_by = old_id;
  UPDATE meditation_sessions SET user_id = uid WHERE user_id = old_id;
  UPDATE user_favorites SET user_id = uid WHERE user_id = old_id;

  -- 删除旧 profile
  DELETE FROM profiles WHERE id = old_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========== 步骤 2：修复已存在用户的角色 ==========
-- 将 auth.users 的 metadata 角色同步到 profiles 表

UPDATE profiles p
SET role = CASE 
  WHEN COALESCE(u.raw_user_meta_data->>'role', '') = 'doctor' THEN 'doctor'::user_role
  WHEN COALESCE(u.raw_user_meta_data->>'role', '') = 'admin' THEN 'admin'::user_role
  ELSE 'user'::user_role
END,
updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND (
    -- 情况1：auth.users 标记为 doctor 但 profiles 不是
    (COALESCE(u.raw_user_meta_data->>'role', '') = 'doctor' AND p.role != 'doctor'::user_role)
    OR
    -- 情况2：auth.users 标记为 admin 但 profiles 不是
    (COALESCE(u.raw_user_meta_data->>'role', '') = 'admin' AND p.role != 'admin'::user_role)
  );


-- ========== 步骤 3：验证修复结果 ==========
-- 检查所有用户的角色是否一致

SELECT 
  p.username,
  p.role as profile_role,
  u.raw_user_meta_data->>'role' as auth_role,
  p.created_at,
  CASE 
    WHEN p.role::text = COALESCE(u.raw_user_meta_data->>'role', 'user') THEN '✓ 一致'
    ELSE '✗ 不一致'
  END as status
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;


-- ========== 步骤 4：单独检查特定用户（如 xiao5）==========
-- 替换 'xiao5' 为你要检查的用户名

SELECT 
  p.id,
  p.username,
  p.role as profile_role,
  p.email,
  u.raw_user_meta_data->>'role' as auth_metadata_role,
  u.raw_user_meta_data->>'username' as auth_metadata_username,
  p.created_at,
  p.updated_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username = 'xiao5';
