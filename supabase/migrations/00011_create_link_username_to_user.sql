CREATE OR REPLACE FUNCTION link_username_to_user(uid uuid, uname text)
RETURNS void AS $$
DECLARE
  old_id uuid;
BEGIN
  SELECT id INTO old_id FROM profiles WHERE username = uname AND id <> uid LIMIT 1;
  IF old_id IS NULL THEN
    -- 如果不存在旧档案，仅确保profiles存在
    INSERT INTO profiles (id, username, role, created_at, updated_at)
    SELECT uid, uname, 'user'::user_role, now(), now()
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = uid);
    RETURN;
  END IF;

  -- 确保新profiles存在
  INSERT INTO profiles (id, username, email, phone, role, avatar_url, full_name, gender, birth_date, created_at, updated_at)
  SELECT uid, p.username, p.email, p.phone, p.role, p.avatar_url, p.full_name, p.gender, p.birth_date, p.created_at, now()
  FROM profiles p WHERE p.id = old_id
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, phone = EXCLUDED.phone,
    role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url, full_name = EXCLUDED.full_name, gender = EXCLUDED.gender,
    birth_date = EXCLUDED.birth_date, updated_at = now();

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
  -- 表引用 auth.users 的
  UPDATE meditation_sessions SET user_id = uid WHERE user_id = old_id;
  UPDATE user_favorites SET user_id = uid WHERE user_id = old_id;

  -- 删除旧profiles
  DELETE FROM profiles WHERE id = old_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

