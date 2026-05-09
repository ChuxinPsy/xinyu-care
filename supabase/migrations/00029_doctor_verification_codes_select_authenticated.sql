-- 注册医生时若浏览器仍有普通用户 session，JWT 角色为 authenticated 而非 anon，
-- 仅有「anon 可查验证码」会导致 SELECT 被 RLS 拒绝，verifyCode 得到空行误判「验证码不存在」。
-- 与 anon 策略一致：允许任意已登录用户在注册流程中校验码（表内本就只有若干验证码行）。

CREATE POLICY "注册时可以查询验证码_已登录用户" ON public.doctor_verification_codes
  FOR SELECT TO authenticated
  USING (true);
