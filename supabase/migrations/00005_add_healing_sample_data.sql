-- 添加知识库内容
INSERT INTO healing_contents (title, description, category, content_type, duration, author, view_count, like_count, is_active) VALUES
  ('认识抑郁症:症状与诊断', '了解抑郁症的常见症状、诊断标准和治疗方法', 'knowledge', 'article', 0, '灵愈医疗团队', 1250, 89, true),
  ('如何应对焦虑情绪', '学习有效的焦虑管理技巧和应对策略', 'knowledge', 'article', 0, '心理咨询师李医生', 980, 67, true),
  ('睡眠与心理健康', '探索睡眠质量对心理健康的重要影响', 'knowledge', 'video', 1200, '睡眠专家王教授', 2100, 156, true),
  ('抑郁症康复之路', '真实的康复故事分享,给你带来希望和力量', 'knowledge', 'audio', 1800, '康复者小明', 3200, 245, true),
  ('认知行为疗法(CBT)介绍', '认知行为疗法简介
认知行为疗法（Cognitive Behavioral Therapy，简称CBT）是一种结构化的心理治疗方法，核心思想是：影响我们情绪的，不是事件本身，而是我们对事件的看法。
一、核心理念：认知决定情绪
CBT的基本模型可以概括为：情境—思维—情绪—行为。当面对某个情境时，我们脑中自动浮现的思维（即“自动思维”）直接决定了我们产生什么样的情绪，进而影响行为反应。
二、三个层次的认知
自动思维：最表层的、具体情境下自动产生的想法。它们一闪而过，但直接影响情绪。
中间信念：包括态度、规则和假设，如“我必须完美，否则就是失败”。
核心信念：最深层的、关于自我、他人和世界的绝对化信念，如“我是无能的”“我不可爱”。 
三、治疗过程与技术
CBT是短程、结构化的治疗，通常持续8-20次。
', 'knowledge', 'article', 0, '心理治疗师陈医生', 1500, 98, true),
  ('运动与心理健康', '科学证据表明运动对心理健康的积极作用', 'knowledge', 'video', 600, '运动心理学专家', 1100, 78, true),
  ('家人如何支持抑郁症患者', '一、正确认识抑郁症
抑郁症是常见精神疾病，通过治疗可以康复。患者会有负面情绪，但不会无故伤害他人。了解常见症状有助于更好地帮助他们：
1、持续情绪低落、哭泣
2、对事物失去兴趣
3、疲惫无力、工作效率下降
4、食欲或体重变化
5、睡眠障碍

二、做好「陪伴者」
1、用心倾听：不急于劝解、辩解或指责，避免说“想开点”“振作起来”之类的话。接纳对方的痛苦，表达愿意陪伴的态度。
2、调动身体活动：在对方愿意的前提下，陪伴进行简单运动，如散步，并坚持下来。
3、恢复信心：通过尊重和关心，让对方感受被需要。适当“示弱”也能激发其价值感。

三、做好「监督人」
1、观察记录变化：留意饮食、睡眠、情绪等，异常变化及时联系医生。
2、提醒按时服药：必要时督促药物治疗，与医生保持沟通。', 'knowledge', 'article', 0, '家庭治疗师刘医生', 890, 56, true)
ON CONFLICT DO NOTHING;

-- 更新现有冥想内容的content_type
UPDATE healing_contents SET content_type = 'audio' WHERE content_type IS NULL OR content_type = '';

-- 添加更多冥想内容
INSERT INTO healing_contents (title, description, category, content_type, duration, is_active) VALUES
  ('专注力训练', '提升注意力和工作效率的专注训练', 'focus', 'audio', 600, true),
  ('身体扫描冥想', '通过身体扫描释放紧张和压力', 'relax', 'audio', 900, true),
  ('睡前放松引导', '帮助你快速进入深度睡眠的放松练习', 'sleep', 'audio', 1200, true),
  ('焦虑缓解呼吸法', '通过呼吸练习快速缓解焦虑情绪', 'relief', 'audio', 300, true)
ON CONFLICT DO NOTHING;