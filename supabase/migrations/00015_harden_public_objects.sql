-- 安全基线：修复 Security Advisor 提示的两个问题
-- 1) public.view_backups：启用 RLS，并仅允许 service_role 访问
-- 2) public.public_profiles：使用 security_invoker，使视图遵循调用者的RLS策略

-- 1) public.view_backups
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'view_backups'
  ) THEN
    -- 启用并强制 RLS
    EXECUTE 'ALTER TABLE public.view_backups ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.view_backups FORCE ROW LEVEL SECURITY';

    -- 收紧权限（PostgREST 访问依赖 RLS 授权，普通角色不授予对象级权限）
    EXECUTE 'REVOKE ALL ON TABLE public.view_backups FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON TABLE public.view_backups FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.view_backups FROM authenticated';

    -- 清理旧策略（如果存在）
    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='view_backups' AND policyname='view_backups_service_only'
    ) THEN
      EXECUTE 'DROP POLICY view_backups_service_only ON public.view_backups';
    END IF;

    -- 仅允许 service_role 读写（注意：service_role 默认可绕过RLS，这里用于显式声明）
    EXECUTE $pol$
      CREATE POLICY view_backups_service_only
      ON public.view_backups
      FOR ALL
      TO public
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
    $pol$;
  END IF;
END
$$;

-- 2) public.public_profiles 使用 security_invoker（而不是默认的“视图拥有者权限”）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'public_profiles'
  ) THEN
    EXECUTE 'DROP VIEW public.public_profiles';
  END IF;
END
$$;

CREATE VIEW public.public_profiles
WITH (security_invoker = on)
AS
  SELECT id, username, avatar_url, full_name, role
  FROM public.profiles;

