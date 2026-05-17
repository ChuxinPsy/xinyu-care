import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { BandConnectionStatus, SmartBandDevice, WearableData } from '@/types';
import { generateMockDeviceList, generateRealtimeMockData } from '@/utils/mockSmartBandData';
import { upsertWearableData } from '@/db/api';

interface UseSmartBandOptions {
  userId: string | null;
  useMockData?: boolean;
}

interface UseSmartBandReturn {
  // 连接状态
  connectionStatus: BandConnectionStatus;
  connectedDevice: SmartBandDevice | null;
  availableDevices: SmartBandDevice[];
  
  // 实时数据
  realtimeData: Partial<WearableData> | null;
  
  // 操作方法
  scanDevices: () => Promise<void>;
  connectDevice: (device: SmartBandDevice) => Promise<void>;
  disconnectDevice: () => void;
  refreshData: () => void;
  
  // 状态
  isScanning: boolean;
  isConnecting: boolean;
  error: string | null;
}

// 心率服务 UUID（标准 GATT）
const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

export function useSmartBand({ userId, useMockData = true }: UseSmartBandOptions): UseSmartBandReturn {
  // 状态
  const [connectionStatus, setConnectionStatus] = useState<BandConnectionStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<SmartBandDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<SmartBandDevice[]>([]);
  const [realtimeData, setRealtimeData] = useState<Partial<WearableData> | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const gattServerRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const dataIntervalRef = useRef<Timeout | null>(null);
  const mockDataIntervalRef = useRef<Timeout | null>(null);

  // 清理函数
  const cleanup = useCallback(() => {
    if (dataIntervalRef.current) {
      clearInterval(dataIntervalRef.current);
      dataIntervalRef.current = null;
    }
    if (mockDataIntervalRef.current) {
      clearInterval(mockDataIntervalRef.current);
      mockDataIntervalRef.current = null;
    }
    if (gattServerRef.current?.connected) {
      gattServerRef.current.disconnect();
    }
    bluetoothDeviceRef.current = null;
    gattServerRef.current = null;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // 扫描设备
  const scanDevices = useCallback(async () => {
    setError(null);
    setIsScanning(true);
    setConnectionStatus('scanning');
    
    try {
      if (useMockData) {
        // 模拟扫描延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        // 生成包含固定华为手环10和随机其他设备的列表
        const deviceList = generateMockDeviceList();
        setAvailableDevices(deviceList);
        toast.success(`发现 ${deviceList.length} 个设备`);
      } else {
        // 真实蓝牙扫描
        if (!navigator.bluetooth) {
          throw new Error('您的浏览器不支持蓝牙功能');
        }
        
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [HEART_RATE_SERVICE_UUID],
        });
        
        const smartDevice: SmartBandDevice = {
          id: device.id,
          name: device.name || '未知设备',
          manufacturer: 'Unknown',
          gatt: device.gatt || undefined,
        };
        
        setAvailableDevices([smartDevice]);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '扫描设备失败';
      setError(errorMsg);
      toast.error(errorMsg);
      setConnectionStatus('disconnected');
    } finally {
      setIsScanning(false);
    }
  }, [useMockData]);

  // 处理心率数据
  const handleHeartRateMeasurement = useCallback((event: Event) => {
    const value = (event.target as unknown as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    
    // 解析心率数据（GATT标准格式）
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let heartRate: number;
    
    if (rate16Bits) {
      heartRate = value.getUint16(1, true);
    } else {
      heartRate = value.getUint8(1);
    }
    
    setRealtimeData(prev => ({
      ...prev,
      heart_rate: heartRate,
      user_id: userId || '',
      record_date: new Date().toISOString().split('T')[0],
    }));
  }, [userId]);

  // 连接设备
  const connectDevice = useCallback(async (device: SmartBandDevice) => {
    if (!userId) {
      toast.error('请先登录');
      return;
    }
    
    setError(null);
    setIsConnecting(true);
    setConnectionStatus('connecting');
    
    try {
      if (useMockData) {
        // 模拟连接延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setConnectedDevice(device);
        setConnectionStatus('connected');
        toast.success(`已连接到 ${device.name}`);
        
        // 启动模拟数据生成
        mockDataIntervalRef.current = setInterval(() => {
          const newData = generateRealtimeMockData(userId);
          setRealtimeData(prev => ({
            ...prev,
            ...newData,
          }));
        }, 3000);
        
        // 初始数据
        setRealtimeData(generateRealtimeMockData(userId));
      } else {
        // 真实蓝牙连接
        if (!navigator.bluetooth) {
          throw new Error('您的浏览器不支持蓝牙功能');
        }
        
        const bluetoothDevice = await navigator.bluetooth.requestDevice({
          filters: [{ name: device.name }],
          optionalServices: [HEART_RATE_SERVICE_UUID],
        });
        
        bluetoothDeviceRef.current = bluetoothDevice;
        
        const server = await bluetoothDevice.gatt?.connect();
        if (!server) {
          throw new Error('无法连接到 GATT 服务器');
        }
        
        gattServerRef.current = server;
        
        // 获取心率服务
        const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
        const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
        
        // 监听心率数据
        characteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
        await characteristic.startNotifications();
        
        setConnectedDevice(device);
        setConnectionStatus('connected');
        toast.success(`已连接到 ${device.name}`);
        
        // 监听断开连接
        bluetoothDevice.addEventListener('gattserverdisconnected', () => {
          setConnectionStatus('disconnected');
          setConnectedDevice(null);
          cleanup();
          toast.info('设备已断开连接');
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '连接设备失败';
      setError(errorMsg);
      setConnectionStatus('connection_failed');
      toast.error(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, [userId, useMockData, handleHeartRateMeasurement, cleanup]);

  // 断开设备
  const disconnectDevice = useCallback(() => {
    cleanup();
    setConnectedDevice(null);
    setConnectionStatus('disconnected');
    setRealtimeData(null);
    toast.info('已断开连接');
  }, [cleanup]);

  // 刷新数据（保存到数据库）
  const refreshData = useCallback(async () => {
    if (!userId || !realtimeData) return;
    
    try {
      await upsertWearableData(realtimeData);
      toast.success('数据已同步');
    } catch (err) {
      console.error('同步数据失败:', err);
      toast.error('数据同步失败');
    }
  }, [userId, realtimeData]);

  // 定期保存实时数据到数据库
  useEffect(() => {
    if (connectionStatus === 'connected' && realtimeData && userId) {
      const interval = setInterval(() => {
        upsertWearableData(realtimeData).catch(console.error);
      }, 60000); // 每分钟保存一次
      
      return () => clearInterval(interval);
    }
  }, [connectionStatus, realtimeData, userId]);

  return {
    connectionStatus,
    connectedDevice,
    availableDevices,
    realtimeData,
    scanDevices,
    connectDevice,
    disconnectDevice,
    refreshData,
    isScanning,
    isConnecting,
    error,
  };
}
