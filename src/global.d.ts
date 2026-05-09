// global types

// Web Bluetooth API 类型声明
interface BluetoothDevice {
  id: string;
  name: string | null;
  gatt: BluetoothRemoteGATTServer | null;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic {
  value: DataView | null;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface BluetoothRequestDeviceFilter {
  services?: (string | number)[];
  name?: string;
  namePrefix?: string;
  manufacturerId?: number;
  serviceDataUUID?: string;
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  acceptAllDevices?: boolean;
  optionalServices?: (string | number)[];
}

interface Navigator {
  bluetooth: {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
  };
}

// NodeJS Timeout 类型
type Timeout = ReturnType<typeof setTimeout>;
