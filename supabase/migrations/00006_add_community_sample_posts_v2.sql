-- 获取分类ID并插入示例帖子
DO $$
DECLARE
  support_cat_id UUID;
  progress_cat_id UUID;
  question_cat_id UUID;
  encourage_cat_id UUID;
  recovery_cat_id UUID;
  first_user_id UUID;
BEGIN
  -- 获取各分类ID
  SELECT id INTO support_cat_id FROM post_categories WHERE name = '寻求支持';
  SELECT id INTO progress_cat_id FROM post_categories WHERE name = '分享进展';
  SELECT id INTO question_cat_id FROM post_categories WHERE name = '提问';
  SELECT id INTO encourage_cat_id FROM post_categories WHERE name = '提供鼓励';
  SELECT id INTO recovery_cat_id FROM post_categories WHERE name = '康复故事';
  
  -- 获取第一个用户ID
  SELECT id INTO first_user_id FROM auth.users LIMIT 1;

  -- 插入示例帖子
  IF first_user_id IS NOT NULL THEN
    INSERT INTO community_posts (user_id, anonymous_name, title, content, category_id, anonymous_nickname, is_recovery_story, like_count, comment_count, is_pinned, is_hidden) VALUES
      (first_user_id, '匿名用户', '从抑郁中走出来的365天', '一年前的今天,我被诊断为中度抑郁症。那时的我每天都在黑暗中挣扎,觉得生活没有任何意义。但今天,我想告诉大家,我走出来了!这一年里,我坚持服药、定期心理咨询、每天冥想和运动。虽然过程很艰难,但每一个小进步都让我看到了希望。现在的我,重新找回了生活的热情。如果你也在经历黑暗,请相信,光明一定会到来!', recovery_cat_id, '用户a3f9k2', true, 156, 23, false, false),
      (first_user_id, '匿名用户', '今天是我连续冥想的第30天', '坚持冥想一个月了!刚开始的时候很难静下心来,脑子里总是乱糟糟的。但现在,我能感受到内心的平静。焦虑的情绪也减轻了很多。推荐大家试试每天10分钟的呼吸冥想,真的很有帮助!', progress_cat_id, '用户b7k3m9', false, 45, 8, false, false),
      (first_user_id, '匿名用户', '最近总是失眠,该怎么办?', '已经连续一周睡不好觉了,每天晚上躺在床上翻来覆去,脑子里想很多事情。白天精神很差,工作也受影响。有没有什么好的方法可以改善睡眠?', question_cat_id, '用户c2n8p5', false, 12, 15, false, false),
      (first_user_id, '匿名用户', '给所有正在努力的朋友', '看到很多朋友在分享自己的困境和进步,真的很感动。我想说,每一个愿意面对问题、寻求帮助的人都是勇敢的。康复不是一蹴而就的,但每一个小小的进步都值得庆祝。加油,我们一起努力!💪', encourage_cat_id, '用户d5q1r7', false, 89, 12, false, false),
      (first_user_id, '匿名用户', '感觉自己又回到了原点', '本来觉得自己好多了,但最近又开始情绪低落,什么都不想做。是不是我永远都好不了?有时候真的很绝望...', support_cat_id, '用户e8t4w2', false, 34, 18, false, false),
      (first_user_id, '匿名用户', '我的康复之路:从药物到心理治疗', '分享一下我的经历。两年前确诊抑郁症,一开始只靠药物治疗,效果不太理想。后来在医生建议下开始认知行为疗法(CBT),学会了识别和改变负面思维模式。现在已经停药半年了,状态很稳定。想告诉大家,找到适合自己的治疗方法很重要,不要放弃尝试!', recovery_cat_id, '用户f3y7u1', true, 203, 31, false, false),
      (first_user_id, '匿名用户', '今天终于鼓起勇气去看了心理医生', '拖了很久,今天终于迈出了这一步。医生很温和,让我感觉很安全。虽然还是有点紧张,但感觉心里轻松了一些。希望接下来的治疗能帮到我。', progress_cat_id, '用户g6i2o8', false, 67, 14, false, false),
      (first_user_id, '匿名用户', '运动真的有用吗?', '听说运动对改善抑郁有帮助,但我现在连起床都觉得很困难,更别说运动了。有没有什么简单的运动可以推荐?', question_cat_id, '用户h9l5p3', false, 28, 22, false, false)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;