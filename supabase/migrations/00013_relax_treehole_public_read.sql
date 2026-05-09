-- 为树洞相关表开放只读访问，便于未登录用户浏览
-- community_posts：公开可读未隐藏内容
DROP POLICY IF EXISTS "所有人可以查看未隐藏的帖子(公开)" ON community_posts;
CREATE POLICY "所有人可以查看未隐藏的帖子(公开)" ON community_posts
  FOR SELECT TO public USING (is_hidden = false);

-- community_comments：公开可读评论（仅查看）
DROP POLICY IF EXISTS "所有人可以查看评论(公开)" ON community_comments;
CREATE POLICY "所有人可以查看评论(公开)" ON community_comments
  FOR SELECT TO public USING (true);

-- post_categories：公开可读分类
DROP POLICY IF EXISTS "所有人可以查看帖子分类(公开)" ON post_categories;
CREATE POLICY "所有人可以查看帖子分类(公开)" ON post_categories
  FOR SELECT TO public USING (true);
