CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'doctor', 'admin') NOT NULL DEFAULT 'user',
  status ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
  metadata JSON NULL,
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  wechat VARCHAR(64) NULL,
  role ENUM('user', 'doctor', 'admin') NOT NULL DEFAULT 'user',
  avatar_url TEXT NULL,
  full_name VARCHAR(128) NULL,
  gender VARCHAR(32) NULL,
  birth_date DATE NULL,
  bio TEXT NULL,
  background_url TEXT NULL,
  selected_background VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_profiles_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS emotion_diaries (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  diary_date DATE NOT NULL,
  emotion_level VARCHAR(32) NOT NULL,
  title VARCHAR(255) NULL,
  content TEXT NULL,
  tags JSON NULL,
  image_urls JSON NULL,
  voice_url TEXT NULL,
  ai_analysis JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_emotion_diaries_user_date (user_id, diary_date),
  CONSTRAINT fk_emotion_diaries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessments (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  assessment_type VARCHAR(64) NOT NULL DEFAULT 'multimodal',
  conversation_history JSON NULL,
  text_input TEXT NULL,
  voice_input_url TEXT NULL,
  image_input_url TEXT NULL,
  video_input_url TEXT NULL,
  ai_analysis JSON NULL,
  risk_level INT NULL DEFAULT 0,
  score INT NULL,
  report JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_assessments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wearable_data (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  record_date DATE NOT NULL,
  heart_rate INT NULL,
  sleep_hours DECIMAL(4,2) NULL,
  sleep_quality INT NULL,
  steps INT NULL,
  calories INT NULL,
  stress_level INT NULL,
  blood_oxygen INT NULL,
  temperature DECIMAL(4,1) NULL,
  data_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_wearable_user_date (user_id, record_date),
  CONSTRAINT fk_wearable_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS healing_contents (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(64) NOT NULL,
  content_type VARCHAR(32) NOT NULL DEFAULT 'audio',
  content_url TEXT NULL,
  duration INT NULL,
  thumbnail_url TEXT NULL,
  author VARCHAR(128) NULL,
  tags JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_healing_records (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  healing_content_id CHAR(36) NOT NULL,
  duration_seconds INT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_user_healing_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_healing_records_content FOREIGN KEY (healing_content_id) REFERENCES healing_contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  icon VARCHAR(64) NULL,
  color VARCHAR(32) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_posts (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  anonymous_name VARCHAR(64) NOT NULL,
  anonymous_nickname VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category_id CHAR(36) NULL,
  tags JSON NULL,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  is_recovery_story BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_community_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_community_posts_category FOREIGN KEY (category_id) REFERENCES post_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS community_comments (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  anonymous_name VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  like_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_community_comments_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_community_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_likes (
  id CHAR(36) PRIMARY KEY,
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_post_likes (post_id, user_id),
  CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meditation_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  content_id CHAR(36) NOT NULL,
  duration INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  mood_before VARCHAR(64) NULL,
  mood_after VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_meditation_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_meditation_sessions_content FOREIGN KEY (content_id) REFERENCES healing_contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_favorites (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  content_id CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_user_favorites (user_id, content_id),
  CONSTRAINT fk_user_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_favorites_content FOREIGN KEY (content_id) REFERENCES healing_contents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_patients (
  id CHAR(36) PRIMARY KEY,
  doctor_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_doctor_patients (doctor_id, patient_id),
  CONSTRAINT fk_doctor_patients_doctor FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_patients_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_alerts (
  id CHAR(36) PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  alert_type VARCHAR(128) NOT NULL,
  risk_level INT NOT NULL,
  description TEXT NOT NULL,
  data_source VARCHAR(128) NULL,
  source_id CHAR(36) NULL,
  is_handled BOOLEAN NOT NULL DEFAULT FALSE,
  handled_by CHAR(36) NULL,
  handled_at DATETIME(3) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_risk_alerts_patient FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_alerts_handled_by FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS knowledge_base (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  tags JSON NULL,
  content_type VARCHAR(32) NOT NULL DEFAULT 'text',
  file_url TEXT NULL,
  file_name VARCHAR(255) NULL,
  file_size INT NULL,
  file_mime_type VARCHAR(128) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_knowledge_base_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_verification_codes (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by CHAR(36) NULL,
  used_at DATETIME(3) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  notes TEXT NULL,
  CONSTRAINT fk_doctor_verification_codes_used_by FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_doctor_verification_codes_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO post_categories (id, name, description, icon, color)
VALUES
  ('11111111-1111-1111-1111-111111111111', '寻求支持', '分享你的困扰，寻求帮助和建议', 'heart', 'pink'),
  ('22222222-2222-2222-2222-222222222222', '分享进展', '分享你的康复进展和积极变化', 'trending-up', 'green'),
  ('33333333-3333-3333-3333-333333333333', '提问', '提出关于心理健康的问题', 'help-circle', 'blue'),
  ('44444444-4444-4444-4444-444444444444', '提供鼓励', '给其他成员提供支持和鼓励', 'smile', 'yellow'),
  ('55555555-5555-5555-5555-555555555555', '康复故事', '分享完整的康复经历', 'star', 'purple')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO doctor_verification_codes (id, code, is_permanent, is_used, notes)
VALUES ('99999999-9999-9999-9999-999999999999', '2026', TRUE, FALSE, '默认永久有效验证码')
ON DUPLICATE KEY UPDATE code = VALUES(code);

INSERT INTO healing_contents (
  id, title, description, category, content_type, content_url, duration, thumbnail_url, author, tags, is_active
) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '呼吸放松练习', '适合在紧张时进行的 5 分钟呼吸训练。', 'meditation', 'audio', '', 300, '', 'XinyuCare', JSON_ARRAY('呼吸', '放松'), TRUE),
  ('bbbb2222-2222-2222-2222-222222222222', '情绪日记写作引导', '帮助你整理当下情绪和触发事件。', 'article', 'article', '', 0, '', 'XinyuCare', JSON_ARRAY('写作', '情绪'), TRUE),
  ('cccc3333-3333-3333-3333-333333333333', '睡前冥想', '适合夜间使用的舒缓冥想。', 'sleep', 'audio', '', 600, '', 'XinyuCare', JSON_ARRAY('睡眠', '冥想'), TRUE)
ON DUPLICATE KEY UPDATE title = VALUES(title);
