CREATE SCHEMA IF NOT EXISTS pre_migration_backup;

CREATE TABLE IF NOT EXISTS pre_migration_backup.profiles AS SELECT * FROM public.profiles;
CREATE TABLE IF NOT EXISTS pre_migration_backup.emotion_diaries AS SELECT * FROM public.emotion_diaries;
CREATE TABLE IF NOT EXISTS pre_migration_backup.assessments AS SELECT * FROM public.assessments;
CREATE TABLE IF NOT EXISTS pre_migration_backup.wearable_data AS SELECT * FROM public.wearable_data;
CREATE TABLE IF NOT EXISTS pre_migration_backup.healing_contents AS SELECT * FROM public.healing_contents;
CREATE TABLE IF NOT EXISTS pre_migration_backup.user_healing_records AS SELECT * FROM public.user_healing_records;
CREATE TABLE IF NOT EXISTS pre_migration_backup.community_posts AS SELECT * FROM public.community_posts;
CREATE TABLE IF NOT EXISTS pre_migration_backup.community_comments AS SELECT * FROM public.community_comments;
CREATE TABLE IF NOT EXISTS pre_migration_backup.post_likes AS SELECT * FROM public.post_likes;
CREATE TABLE IF NOT EXISTS pre_migration_backup.doctor_patients AS SELECT * FROM public.doctor_patients;
CREATE TABLE IF NOT EXISTS pre_migration_backup.risk_alerts AS SELECT * FROM public.risk_alerts;
CREATE TABLE IF NOT EXISTS pre_migration_backup.knowledge_base AS SELECT * FROM public.knowledge_base;
CREATE TABLE IF NOT EXISTS pre_migration_backup.meditation_sessions AS SELECT * FROM public.meditation_sessions;
CREATE TABLE IF NOT EXISTS pre_migration_backup.user_favorites AS SELECT * FROM public.user_favorites;
CREATE TABLE IF NOT EXISTS pre_migration_backup.post_categories AS SELECT * FROM public.post_categories;

