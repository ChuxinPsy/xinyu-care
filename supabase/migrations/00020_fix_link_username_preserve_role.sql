-- ==========================================
-- 修复 link_username_to_user 函数
-- 确保保留用户注册时指定的角色（医生/用户/管理员）
-- ==========================================

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
