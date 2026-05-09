-- 为手环数据表添加血氧和体温字段
ALTER TABLE public.wearable_data
ADD COLUMN IF NOT EXISTS blood_oxygen INTEGER,
ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,2);

-- 添加注释
COMMENT ON COLUMN public.wearable_data.blood_oxygen IS '血氧饱和度 (%)';
COMMENT ON COLUMN public.wearable_data.temperature IS '体温 (摄氏度)';

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_wearable_data_blood_oxygen ON public.wearable_data(blood_oxygen) WHERE blood_oxygen IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wearable_data_temperature ON public.wearable_data(temperature) WHERE temperature IS NOT NULL;
