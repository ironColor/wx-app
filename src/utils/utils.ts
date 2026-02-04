import Taro from '@tarojs/taro';

export const setToken = (token: string) => {
  Taro.setStorage({
    key: 'token',
    data: token,
    success: () => {
      console.log('token set success');
    },
    fail: res => {
      console.log('token set fail：', res);
    }
  });
};

export const getToken = () => {
  return Taro.getStorage({
    key: 'token',
    success: res => console.log('token get success：', res),
    fail: res => console.log('token get fail：', res)
  });
};

/**
 * 将ArrayBuffer转换成字符串
 */
export function ab2hex(buffer: ArrayBuffer) {
  const uint8Array = new Uint8Array(buffer);
  let out = '';
  let i = 0;

  while (i < uint8Array.length) {
    const c = uint8Array[i++];
    if (c >> 7 === 0) {
      out += String.fromCharCode(c);
    } else if (c >> 5 === 0b110) {
      const c2 = uint8Array[i++];
      out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
    } else if (c >> 4 === 0b1110) {
      const c2 = uint8Array[i++];
      const c3 = uint8Array[i++];
      out += String.fromCharCode(((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f));
    } else {
      // 4字节UTF-8处理略过（微信小程序可能用不到）
      i += 3;
    }
  }

  return out;
}

/**
 * 时间戳转北京时间
 * @param timestamp 时间戳（支持秒或毫秒）
 * @param format 输出格式，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的北京时间字符串
 */
export const formatTimestamp = (
  timestamp: number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  // 如果是10位（秒），转换成毫秒
  if (String(timestamp).length === 10) {
    timestamp = timestamp * 1000;
  }

  const date = new Date(timestamp);

  // 手动转为北京时间（UTC+8）
  const offset = date.getTimezoneOffset(); // 单位是分钟
  const beijingDate = new Date(date.getTime() + (offset + 480) * 60 * 1000);

  const padZero = (n: number) => (n < 10 ? `0${n}` : n);

  const YYYY = beijingDate.getFullYear();
  const MM = padZero(beijingDate.getMonth() + 1);
  const DD = padZero(beijingDate.getDate());
  const HH = padZero(beijingDate.getHours());
  const mm = padZero(beijingDate.getMinutes());
  const ss = padZero(beijingDate.getSeconds());

  if (format === 'YYYY-MM-DD') {
    return `${YYYY}-${MM}-${DD}`;
  } else if (format === 'HH:mm:ss') {
    return `${HH}:${mm}:${ss}`;
  } else {
    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
  }
};
