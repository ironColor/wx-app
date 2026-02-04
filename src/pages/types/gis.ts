/**
 * @description: 请求后端实体
 */
export interface DataItem {
  // 经度
  lon: number;
  // 纬度
  lat: number;
  // 海拔高度
  alt: number;
  // 任务类型
  type: string;
  // 速度
  speed: number;
  // 相对高度
  relativeAlt: number;
}

/**
 * @description: 地块信息
 */
export interface landItem {
  // 转移后地块id
  landId: number;
  // 转移后地块点位
  landPoints: [];
  // 转移前地块ID
  oldLandId: number;
  // 转移前地块点位
  oldLandPoints: [];
}

/**
 * @description: MQTT实时数据
 */
export interface wsDataItem {
  // 设备的SN
  deviceId: string;
  // 航向（度，0～360）
  direction: string;
  // Unix时间(毫秒)
  gpsTime: string;
  // 纬度（度，南纬是负,北纬是正）
  lat: number;
  // 经度（度，东经是正,西经是负）
  lon: number;
  // 海拔高（单位：米，三位小数）
  alt: number;
  // 大地高（单位：米，三位小数）
  high: string;
  // 定位精度（单位：米，三位小数）
  hrms: string;
  // 速度（km/h）
  speed: string;
  // 定位状态(0:初始化;1:单点定位;2:码差分;3:无效PPS;4:固定解;5:浮点解;6:正在估算;7:人工输入固定值;8:模拟模式;9:WAAS差分;)
  stat: string;
  // 卫星数量
  star: string;
  // 可用卫星数量
  destar: string;
  // 电池电量百分比（0-100)
  batt: string;
  // SIM卡ID
  iccid: string;
  // 角度
  xzAng: string;
}

/**
 * @description: 喷洒作业实体
 */
export interface wateringItem {
  width: number;
  start: number;
  direction: number;
  height: number;
  speed: number;
}
