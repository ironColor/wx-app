import Taro from '@tarojs/taro';
import request from '@/utils/http';
import { clear, pageToLogin } from '@/utils/util.js';

export async function login(params) {
  params['grant_type'] = 'password';
  params['scope'] = 'server';

  const response = await request.get(`/auth/oauth/token`, params);
  if (response.code === 0) {
    Taro.setStorageSync('sessionKey', true); // 永久存放用户登录信息
    Taro.setStorageSync('token', `${response.data.token_type} ${response.data.access_token}`);
    Taro.setStorageSync(
      'refresh_token',
      `${response.data.token_type} ${response.data.refresh_token}`
    );
    Taro.setStorageSync('userInfo', {
      nickname: response.data.name,
      username: response.data.username
    });
    Taro.reLaunch({ url: '/pages/home/index/index' });
  } else {
    Taro.showToast({
      title: response.msg || '账号或密码错误',
      icon: 'none',
      duration: 2000
    });
  }
}

export async function logout(params) {
  const response = await request.delete('/auth/token/logout', params);
  if (response.code === 0) {
    clear();
    pageToLogin();
    Taro.showToast({
      title: '账号已退出',
      icon: 'none',
      duration: 2000
    });
  } else {
    Taro.showToast({
      title: response.msg || '账号退出失败',
      icon: 'none',
      duration: 2000
    });
  }
}

export async function del(params) {
  return request.delete(`${params.type ? '/ppcTask/delete' : '/ppcLand/delete'}`, params.ids);
}

export async function edit(params) {
  return request.put(`${params.type ? '/ppcTask/update' : '/ppcLand/update'}`, params.body);
}
