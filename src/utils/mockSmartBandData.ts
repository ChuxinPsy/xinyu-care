import type { WearableData, SmartBandDevice } from '@/types';

// 生成指定日期范围内的模拟手环数据
export const generateMockWearableData = (
  userId: string,
  startDate: Date,
  endDate: Date
): WearableData[] => {
  const data: WearableData[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // 生成随机但合理的数据
    const baseHeartRate = 65 + Math.random() * 20; // 65-85 bpm
    const sleepHours = 5.5 + Math.random() * 3; // 5.5-8.5 hours
    const steps = Math.floor(3000 + Math.random() * 12000); // 3000-15000 steps
    
    data.push({
      id: `mock-${dateStr}`,
      user_id: userId,
      record_date: dateStr,
      heart_rate: Math.floor(baseHeartRate),
      sleep_hours: parseFloat(sleepHours.toFixed(2)),
      sleep_quality: Math.floor(60 + Math.random() * 40), // 60-100
      steps: steps,
      calories: Math.floor(1500 + Math.random() * 800),
      stress_level: Math.floor(20 + Math.random() * 60), // 20-80
      blood_oxygen: Math.floor(95 + Math.random() * 5), // 95-100%
      temperature: parseFloat((36.0 + Math.random() * 1.5).toFixed(1)), // 36.0-37.5
      data_json: {
        heart_rate_variability: Math.floor(20 + Math.random() * 40),
        deep_sleep_hours: parseFloat((sleepHours * 0.2).toFixed(2)),
        rem_sleep_hours: parseFloat((sleepHours * 0.25).toFixed(2)),
        awake_times: Math.floor(1 + Math.random() * 5),
      },
      created_at: currentDate.toISOString(),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return data;
};

// 生成单条实时模拟数据
export const generateRealtimeMockData = (userId: string): Partial<WearableData> => {
  const now = new Date();
  return {
    user_id: userId,
    record_date: now.toISOString().split('T')[0],
    heart_rate: Math.floor(60 + Math.random() * 40),
    blood_oxygen: Math.floor(95 + Math.random() * 5),
    steps: Math.floor(Math.random() * 1000),
    calories: Math.floor(50 + Math.random() * 200),
    stress_level: Math.floor(20 + Math.random() * 60),
    temperature: parseFloat((36.0 + Math.random() * 1.0).toFixed(1)),
  };
};

// 固定的华为手环10设备
const huaweiBand10: SmartBandDevice = {
  id: 'huawei-band-10-fixed',
  name: '华为手环 10',
  manufacturer: 'Huawei',
  model: 'Band 10',
  rssi: -68,
};

// 其他可随机显示的华为设备池
const randomHuaweiDevicesPool: SmartBandDevice[] = [
  {
    id: 'huawei-band-9-001',
    name: '华为手环 9',
    manufacturer: 'Huawei',
    model: 'Band 9',
    rssi: -65,
  },
  {
    id: 'huawei-watch-fit-002',
    name: '华为 Watch Fit 3',
    manufacturer: 'Huawei',
    model: 'Watch Fit 3',
    rssi: -72,
  },
  {
    id: 'huawei-band-8-003',
    name: '华为手环 8',
    manufacturer: 'Huawei',
    model: 'Band 8',
    rssi: -80,
  },
  {
    id: 'huawei-watch-4-004',
    name: '华为 Watch 4',
    manufacturer: 'Huawei',
    model: 'Watch 4',
    rssi: -70,
  },
  {
    id: 'huawei-band-7-005',
    name: '华为手环 7',
    manufacturer: 'Huawei',
    model: 'Band 7',
    rssi: -85,
  },
  {
    id: 'huawei-watch-gt4-006',
    name: '华为 Watch GT 4',
    manufacturer: 'Huawei',
    model: 'Watch GT 4',
    rssi: -68,
  },
  {
    id: 'huawei-band-6-007',
    name: '华为手环 6',
    manufacturer: 'Huawei',
    model: 'Band 6',
    rssi: -88,
  },
  {
    id: 'huawei-watch-fit2-008',
    name: '华为 Watch Fit 2',
    manufacturer: 'Huawei',
    model: 'Watch Fit 2',
    rssi: -75,
  },
];

// 生成随机设备列表（始终包含华为手环10）
export const generateMockDeviceList = (): SmartBandDevice[] => {
  // 随机选择2-4个其他设备
  const numRandomDevices = Math.floor(Math.random() * 3) + 2; // 2-4个
  const shuffled = [...randomHuaweiDevicesPool].sort(() => Math.random() - 0.5);
  const selectedDevices = shuffled.slice(0, numRandomDevices);
  
  // 始终将华为手环10放在第一位，后面跟随机设备
  return [huaweiBand10, ...selectedDevices];
};

// 为了向后兼容，保留原有的静态设备列表
export const mockHuaweiDevices: SmartBandDevice[] = generateMockDeviceList();

// 生成历史趋势数据（用于图表）
export const generateTrendData = (
  days: number,
  type: 'heart_rate' | 'sleep' | 'steps' | 'stress' | 'blood_oxygen' | 'temperature'
) => {
  const data: Array<{ date: string; value: number }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

    let value: number;
    switch (type) {
      case 'heart_rate':
        value = Math.floor(60 + Math.random() * 30);
        break;
      case 'sleep':
        value = parseFloat((5 + Math.random() * 4).toFixed(1));
        break;
      case 'steps':
        value = Math.floor(3000 + Math.random() * 12000);
        break;
      case 'stress':
        value = Math.floor(20 + Math.random() * 60);
        break;
      case 'blood_oxygen':
        value = Math.floor(95 + Math.random() * 5);
        break;
      case 'temperature':
        value = parseFloat((36.0 + Math.random() * 1.5).toFixed(1));
        break;
      default:
        value = 0;
    }

    data.push({ date: dateStr, value });
  }

  return data;
};

// 生成睡眠阶段数据
export const generateSleepStageData = () => {
  const deepSleep = Math.floor(20 + Math.random() * 30); // 20-50%
  const lightSleep = Math.floor(30 + Math.random() * 25); // 30-55%
  const remSleep = Math.floor(15 + Math.random() * 15); // 15-30%
  const awake = 100 - deepSleep - lightSleep - remSleep;

  return [
    { name: '深睡', value: deepSleep, color: '#4f46e5' },
    { name: '浅睡', value: lightSleep, color: '#818cf8' },
    { name: 'REM', value: remSleep, color: '#c7d2fe' },
    { name: '清醒', value: Math.max(0, awake), color: '#e0e7ff' },
  ];
};

// 生成周/月统计数据
export const generateStatsData = (timeRange: 'week' | 'month') => {
  const multiplier = timeRange === 'week' ? 1 : 4;
  
  return {
    avgHeartRate: Math.floor(65 + Math.random() * 15),
    totalSteps: Math.floor((60000 + Math.random() * 40000) * multiplier),
    avgSleep: parseFloat((6 + Math.random() * 2).toFixed(1)),
    avgStress: Math.floor(30 + Math.random() * 40),
    avgBloodOxygen: Math.floor(96 + Math.random() * 3),
    avgTemperature: parseFloat((36.2 + Math.random() * 0.8).toFixed(1)),
    activeDays: Math.floor((5 + Math.random() * 2) * multiplier),
    caloriesBurned: Math.floor((12000 + Math.random() * 8000) * multiplier),
  };
};
