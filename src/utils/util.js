import Taro from '@tarojs/taro';
import request from '@/utils/http';

/**
 * 将字符串转换成ArrayBufer
 */
export function string2buffer(str) {
  if (!str) return;
  var val = '';
  for (var i = 0; i < str.length; i++) {
    val += str.charCodeAt(i).toString(16);
  }
  console.log(val);
  str = val;
  val = '';
  let length = str.length;
  let index = 0;
  let array = [];
  while (index < length) {
    array.push(str.substring(index, index + 2));
    index = index + 2;
  }
  val = array.join(',');
  // 将16进制转化为ArrayBuffer
  return new Uint8Array(
    val.match(/[\da-f]{2}/gi).map(function (h) {
      return parseInt(h, 16);
    })
  ).buffer;
}

/**
 * 将ArrayBuffer转换成字符串
 */
export function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
    return ('00' + bit.toString(16)).slice(-2);
  });
  return hexArr.join(':');
}

/**
 * 获取mac
 */
export function array2String(buffer) {
  let hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
    return ('00' + bit.toString(16)).slice(-2);
  });
  return `${hexArr[7]}:${hexArr[6]}:${hexArr[5]}:${hexArr[2]}:${hexArr[1]}:${hexArr[0]}`;
}

/**
 * 截取url 获取参数方法
 * @returns
 */
export function getUrlParam(url, name) {
  var reg = new RegExp('(^|&|/?)' + name + '=([^&|/?]*)(&|/?|$)', 'i');
  var r = url.substr(1).match(reg);
  if (r != null) {
    return r[2];
  }
  return null;
}

/**
 * @description 获取当前页url
 */
export const getCurrentPageUrl = () => {
  let currentPage = Taro.getCurrentPages().pop();
  let url = currentPage.route || currentPage.path;
  return url;
};

/**
 * 页面返回到登录页
 */
export const pageToLogin = () => {
  let path = getCurrentPageUrl();
  if (!path.includes('login')) {
    Taro.navigateTo({
      url: '/pages/user/login/index'
    });
  }
};

/**
 * 清空stroage
 */
export const clear = () => {
  Taro.removeStorageSync('sessionKey');
  Taro.removeStorageSync('token');
  Taro.removeStorageSync('userInfo');
  Taro.removeStorageSync('refresh_token');
};

/**
 * 用户登录
 */
export const loginSubmit = (userInfo, success, error) => {
  const accountInfo = Taro.getAccountInfoSync();
  const { appId } = accountInfo.miniProgram;
  Taro.login({
    success: async rsp => {
      // 请求自己的服务器，解密用户信息 获取openId, unionId等加密信息
      const res = await getOpenId(appId, { code: rsp.code });
      if (res.code === 0) {
        // 添加用户
        const resp = await addUser({
          openId: res.data.openid,
          username: userInfo.nickName,
          tenantId: '42a633a52956c5b96581a896e14c7fae'
        }); // 租户id tenantId 写死
        if (resp.code === 0 || resp.code === 10001) {
          // 10001表示用户已经添加过
          // 通过openId 去获取token
          const response = await getToken({
            openId: res.data.openid,
            grant_type: 'wechat',
            scope: 'server'
          });
          if (response.code === 0) {
            Taro.setStorageSync('sessionKey', true); // 永久存放用户登录信息
            Taro.setStorageSync('token', `bearer ${response.data.access_token}`);
            // console.log('1', { ...userInfo, userId: response.data.user_id });
            Taro.setStorageSync('userInfo', {
              ...userInfo,
              userId: response.data.user_id,
              openId: res.data.openid
            });
            // 回调
            success && success({ ...userInfo, userId: response.data.user_id });
          } else {
            error && error(response);
            Taro.showToast({
              title: response.msg,
              icon: 'none',
              duration: 1500
            });
          }
        } else {
          error && error(resp);
          Taro.showToast({
            title: resp.msg,
            icon: 'none',
            duration: 1500
          });
        }
      } else {
        error && error(res);
        Taro.showToast({
          title: res.msg,
          icon: 'none',
          duration: 1500
        });
      }
    },
    fail: () => {
      Taro.removeStorageSync('sessionKey');
    }
  });
};

/**
 * 判断传值是否为空、[]、{}
 * @param {*} param
 * @returns
 */
export const isEmpty = param => {
  if (param == null) {
    return true;
  } else if (typeof param === 'string') {
    return param == '';
  } else if (typeof param === 'object') {
    return JSON.stringify(param) == '[]' || JSON.stringify(param) == '{}';
  }
  return false;
};

/**
 * 防抖
 * delay毫秒内只能触发一次fn方法（一直触发导致fn不执行）
 * @param {*} param
 * @returns
 */
export const debounce = (fn, delay) => {
  let timer = null; // 借助闭包
  return function () {
    if (timer) {
      clearTimeout(timer); // 进入该分支语句，说明当前正在一个计时过程中，并且又触发了相同事件。所以要取消当前的计时，重新开始计时
    }
    timer = setTimeout(fn, delay); // 进入该分支说明当前并没有在计时，那么就开始一个计时
  };
};

/**
 * 节流
 * delay毫秒内只能触发一次fn方法（第一次触发一次）
 * @param {*} param
 * @returns
 */
export const throttle = (fn, delay) => {
  let valid = true;
  return function () {
    if (!valid) {
      // 休息时间 暂不接客
      return false;
    }
    // 工作时间，执行函数并且在间隔期内把状态位设为无效
    valid = false;
    setTimeout(() => {
      fn();
      valid = true;
    }, delay);
  };
};

/**
 * 判断是否是json
 * @param {*} str
 * @returns
 */
export const isJSON = str => {
  if (typeof str == 'string') {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }
  return false;
};

export async function getOpenId(appId, params) {
  return request.get(`auth/wx/${appId}/code2Session`, params);
}

export async function getToken(params) {
  return request.get(`auth/oauth/token`, params);
}

export async function addUser(params) {
  return request.post(`admin/user/app/add`, params);
}

export async function getScanDataById(params) {
  return request.get(`heatmap/examine-code/app/${params}`);
}

/**
 * 用户授权
 *
 */
export const getAuth = (authorize, callback) => {
  const back = () => {
    Taro.navigateBack({
      delta: 1
    });
    Taro.showToast({
      title: '授权失败，该功能使用受限',
      icon: 'none',
      duration: 2000
    });
  };

  Taro.getSetting({
    success: res => {
      console.log('getSetting()：', res.authSetting);

      let auth = res.authSetting[`scope.${authorize}`];
      if (auth === true) {
        // 用户已经同意授权
        callback && callback();
      } else if (auth === undefined) {
        // 首次发起授权
        Taro.authorize({
          scope: `scope.${authorize}`,
          success: () => {
            callback && callback();
          },
          fail: rps => {
            console.log(rps);
            back();
          }
        });
      } else if (auth === false) {
        // 非首次发起授权，用户拒绝过(一段时间内不能再次调用微信授权) => 弹出提示对话框
        Taro.showModal({
          title: '授权提示',
          content: '前往设置页开启对应权限',
          success: tipRes => {
            if (tipRes.confirm) {
              Taro.openSetting({
                success: settingRes => {
                  console.log('openSetting', settingRes);
                  if (!settingRes.authSetting[`scope.${authorize}`]) {
                    callback && callback();
                    back();
                  }
                }
              });
            } else {
              back();
            }
          },
          fail: () => back()
        });
      }
    },
    fail: () => back()
  });
};
