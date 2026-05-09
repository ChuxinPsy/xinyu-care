import type { RiskAlert } from '@/types';

// 模拟患者姓名
const mockPatientNames = [
  '张小明', '李小红', '王小华', '刘小强', '陈小美',
  '杨小军', '赵小丽', '孙小伟', '周小芳', '吴小东',
  '郑小燕', '冯小刚', '蒋小雨', '韩小雪', '曹小春'
];

// 预警类型
const alertTypes = [
  '抑郁风险预警', '焦虑情绪异常', '睡眠质量下降', '情绪波动剧烈',
  '社交回避行为', '自伤风险提示', '药物依从性差', '认知功能下降',
  '压力过载警告', '情感支持缺失'
];

// 预警描述模板
const alertDescriptions = {
  '抑郁风险预警': [
    '患者近期情绪评分持续低于3分，连续7天出现消极情绪，建议及时干预',
    '检测到患者语音中消极词汇增加40%，情绪低落趋势明显',
    '患者自评量表显示重度抑郁倾向，PHQ-9评分达到18分'
  ],
  '焦虑情绪异常': [
    '患者心率变异性异常，疑似焦虑发作，建议关注',
    '语音分析显示紧张情绪指标超标，GAD-7评分15分',
    '睡眠监测发现频繁夜醒，可能与焦虑相关'
  ],
  '睡眠质量下降': [
    '连续5天睡眠时长不足6小时，睡眠效率低于70%',
    '深度睡眠时间减少50%，REM睡眠周期紊乱',
    '入睡时间超过60分钟，夜间觉醒次数增加'
  ],
  '情绪波动剧烈': [
    '24小时内情绪评分波动超过5分，情绪不稳定',
    '语音情感分析显示极端情绪交替出现',
    '行为模式分析发现异常活动峰值'
  ],
  '社交回避行为': [
    '社交活动参与度下降80%，连续10天无主动社交',
    '通话时长减少90%，社交媒体活跃度显著下降',
    '外出频率降至每周1次，社交回避倾向明显'
  ],
  '自伤风险提示': [
    '语音内容分析发现自伤相关表达，风险等级较高',
    '情绪日记中出现自我伤害想法，需要紧急关注',
    '行为模式异常，疑似自伤行为准备阶段'
  ],
  '药物依从性差': [
    '用药提醒响应率低于30%，可能存在漏服情况',
    '药物摄入时间不规律，治疗效果可能受影响',
    '连续3天未按时服药，建议加强用药指导'
  ],
  '认知功能下降': [
    '记忆测试成绩下降25%，注意力集中困难',
    '决策能力评估异常，执行功能可能受损',
    '语言流畅性测试结果低于正常范围'
  ],
  '压力过载警告': [
    '压力指数持续超过8分，皮质醇水平异常升高',
    '工作压力评估显示严重超负荷状态',
    '生活事件压力累积，心理负荷过重'
  ],
  '情感支持缺失': [
    '社会支持网络评估得分过低，缺乏有效支持',
    '情感表达频率下降，可能存在孤独感',
    '家庭关系紧张，情感支持资源不足'
  ]
};

// 数据来源
const dataSources = [
  '情绪日记分析', '语音情感识别', '睡眠监测设备', '心率变异性分析',
  '行为模式识别', '自评量表结果', '社交活动监测', '用药记录分析',
  '认知功能测试', '压力指标监测'
];

/**
 * 生成模拟预警数据
 */
export const generateMockAlerts = (count: number = 10): RiskAlert[] => {
  const alerts: RiskAlert[] = [];
  
  for (let i = 0; i < count; i++) {
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const descriptions = alertDescriptions[alertType as keyof typeof alertDescriptions];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // 生成风险等级（1-10）
    const riskLevel = Math.floor(Math.random() * 10) + 1;
    
    // 根据风险等级调整处理状态概率
    const isHandled = riskLevel <= 5 ? Math.random() > 0.3 : Math.random() > 0.7;
    
    // 生成时间（最近30天内）
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));
    
    const alert: RiskAlert = {
      id: `mock-alert-${i + 1}`,
      patient_id: `patient-${Math.floor(Math.random() * 15) + 1}`,
      alert_type: alertType,
      risk_level: riskLevel,
      description,
      data_source: dataSources[Math.floor(Math.random() * dataSources.length)],
      source_id: `source-${Math.floor(Math.random() * 1000)}`,
      is_handled: isHandled,
      handled_by: isHandled ? 'doctor-1' : undefined,
      handled_at: isHandled ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      notes: isHandled ? generateHandlingNotes(alertType) : undefined,
      created_at: createdAt.toISOString()
    };
    
    // 添加模拟的患者信息
    (alert as any).profiles = {
      username: `user${Math.floor(Math.random() * 15) + 1}`,
      full_name: mockPatientNames[Math.floor(Math.random() * mockPatientNames.length)]
    };
    
    alerts.push(alert);
  }
  
  return alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * 生成处理备注
 */
const generateHandlingNotes = (alertType: string): string => {
  const notes = {
    '抑郁风险预警': [
      '已联系患者进行电话随访，建议增加心理咨询频次',
      '调整药物剂量，安排下周复诊',
      '已通知家属关注患者情绪变化，提供情感支持'
    ],
    '焦虑情绪异常': [
      '指导患者进行深呼吸练习，推荐放松训练APP',
      '建议减少咖啡因摄入，调整作息时间',
      '安排心理治疗师进行认知行为治疗'
    ],
    '睡眠质量下降': [
      '建议睡前避免电子设备，建立规律作息',
      '开具助眠药物，短期使用改善睡眠',
      '推荐睡眠卫生教育，调整睡眠环境'
    ],
    '情绪波动剧烈': [
      '增加情绪监测频率，教授情绪调节技巧',
      '建议家属陪同就诊，了解情绪触发因素',
      '调整治疗方案，加强情绪稳定性'
    ],
    '社交回避行为': [
      '鼓励参与团体活动，逐步增加社交接触',
      '安排社交技能训练，建立支持网络',
      '联系社区资源，提供社交机会'
    ]
  };
  
  const typeNotes = notes[alertType as keyof typeof notes] || [
    '已记录相关情况，将持续关注患者状态',
    '建议定期随访，监测病情变化',
    '已提供相应指导，患者配合度良好'
  ];
  
  return typeNotes[Math.floor(Math.random() * typeNotes.length)];
};

/**
 * 生成情绪趋势数据
 */
export const generateEmotionTrendData = () => {
  const days = 30;
  const data: { date: string; score: number; label: string }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // 生成情绪分数（1-5分）
    const baseScore = 3 + Math.sin(i * 0.2) * 0.5; // 基础趋势
    const noise = (Math.random() - 0.5) * 1; // 随机波动
    const emotionScore = Math.max(1, Math.min(5, baseScore + noise));
    
    data.push({
      date: date.toISOString().split('T')[0],
      score: Number(emotionScore.toFixed(1)),
      label: date.getDate() + '日'
    });
  }
  
  return data;
};

/**
 * 生成评估分布数据
 */
export const generateAssessmentDistribution = () => {
  return [
    { name: '抑郁评估', value: 35, color: '#ef4444' },
    { name: '焦虑评估', value: 28, color: '#f97316' },
    { name: '压力评估', value: 22, color: '#eab308' },
    { name: '睡眠评估', value: 18, color: '#22c55e' },
    { name: '认知评估', value: 12, color: '#3b82f6' },
    { name: '其他评估', value: 8, color: '#8b5cf6' }
  ];
};
