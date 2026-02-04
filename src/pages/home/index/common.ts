export const images = [
  `${process.env.TARO_APP_UI}/001.jpg`,
  `${process.env.TARO_APP_UI}/002.jpg`,
  `${process.env.TARO_APP_UI}/003.jpg`,
  `${process.env.TARO_APP_UI}/004.jpg`
];

export const siteTypes: Record<number, string> = {
  1: '光伏类型',
  2: '洒水类型',
  3: '割草类型'
};

export const taskTypes: Record<number, string> = {
  0: '喷洒类型',
  2: '投放类型',
  3: '回收类型',
  4: '转移类型',
  5: '割草类型',
  6: '巡检类型'
};

export const siteTypes2: Record<string, number> = {
  光伏: 1,
  洒水: 2,
  '割 草': 3
};

export const taskTypes2: Record<string, number> = {
  喷洒: 0,
  投放: 2,
  回收: 3,
  转移: 4,
  割草: 5,
  巡检: 6
};

export const dotTypes: Record<string, number> = {
  普通点: 0,
  喷洒点: 2,
  投放点: 3,
  回收点: 4,
  割草点: 5,
  巡检点: 6,
  挂载点: 7,
  卸载点: 8,
  作业点: 9,
  起飞点: 10
};

export const dotTypes2: Record<string, string> = {
  0: '普通点',
  2: '喷洒点',
  3: '投放点',
  4: '回收点',
  5: '割草点',
  6: '巡检点',
  7: '挂载点',
  8: '卸载点',
  9: '作业点',
  10: '起飞点'
};

export const dotlist: Record<string, string[]> = {
  投放: ['起飞点', '普通点', '投放点', '挂载点', '卸载点'],
  转移: ['起飞点', '普通点', '投放点', '回收点', '挂载点', '卸载点'],
  回收: ['起飞点', '普通点', '回收点', '挂载点', '卸载点'],
  巡检: ['起飞点', '普通点', '投放点', '回收点', '巡检点', '降落点'],
  割草: ['起飞点', '普通点', '投放点', '回收点', '割草点', '降落点'],
  喷洒: ['起飞点', '喷洒点', '普通点']
};

export const state: Record<number, string> = {
  0: '初始化',
  1: '单点定位',
  2: '码差分',
  3: '无效PPS',
  4: '固定解',
  5: '浮点解',
  6: '正在估算',
  7: '人工输入固定值',
  8: '模拟模式',
  9: 'WAAS差分'
};
