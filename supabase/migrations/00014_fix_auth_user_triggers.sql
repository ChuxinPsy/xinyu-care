-- Fix auth.users triggers to avoid signup failures due to unique username conflicts
-- 1) Make handle_new_user insertion safe with ON CONFLICT on username
-- 2) Remove the confirmed_at update trigger which can cause unexpected errors

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  uname text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  uname := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  INSERT INTO public.profiles (id, username, email, phone, role)
  VALUES (
    NEW.id,
    uname,
    NEW.email,
    NEW.phone,
    CASE 
      WHEN user_count = 0 THEN 'admin'::public.user_role
      WHEN COALESCE(NEW.raw_user_meta_data->>'role','') = 'doctor' THEN 'doctor'::public.user_role
      ELSE 'user'::public.user_role
    END
  )
  ON CONFLICT (username) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop update trigger to reduce side effects during auth.users updates
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Ensure create trigger exists and uses updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
