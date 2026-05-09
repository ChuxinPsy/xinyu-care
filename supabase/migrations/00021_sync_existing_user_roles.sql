-- ==========================================
-- 修复已存在用户的角色
-- 将 auth.users 的 metadata 角色同步到 profiles 表
-- ==========================================

-- 更新所有角色不匹配的用户
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

-- 显示修复结果
SELECT 
  p.username,
  p.role as current_role,
  u.raw_user_meta_data->>'role' as auth_metadata_role,
  CASE 
    WHEN p.role::text = COALESCE(u.raw_user_meta_data->>'role', 'user') THEN '✓ 一致'
    ELSE '✗ 不一致'
  END as status
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 20;
