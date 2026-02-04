import Taro from "@tarojs/taro"
import { pageToLogin, clear } from "./util"
import { HTTP_STATUS } from './config'

const customInterceptor = (chain) => {

  const requestParams = chain.requestParams

  return chain.proceed(requestParams).then(res => {

    // 只要请求成功，不管返回什么状态码，都走这个回调
    if (res.statusCode === HTTP_STATUS.NOT_FOUND) {
      Taro.showToast({
        title: res.data,
        icon: 'none',
        duration: 1500
      })
      return Promise.reject("请求资源不存在")

    } else if (res.statusCode === HTTP_STATUS.BAD_GATEWAY) {
      Taro.showToast({
        title: res.data,
        icon: 'none',
        duration: 1500
      })
      return Promise.reject("服务端出现了问题")

    } else if (res.statusCode === HTTP_STATUS.FORBIDDEN) {
      Taro.showToast({
        title: res.data,
        icon: 'none',
        duration: 1500
      })
      clear()
      pageToLogin()
      // TODO 根据自身业务修改
      return Promise.reject("没有权限访问");

    } else if (res.statusCode === HTTP_STATUS.SERVER_ERROR) {
      Taro.showToast({
        title: res.data,
        icon: 'none',
        duration: 1500
      });
      // TODO 根据自身业务修改
      return Promise.reject(res.data);
    } else if (res.statusCode === HTTP_STATUS.AUTHENTICATE) {
      Taro.showToast({
        title: res.data,
        icon: 'none',
        duration: 1500
      });
      clear();
      pageToLogin();
      return Promise.reject('需要鉴权');
    } else if (res.statusCode === HTTP_STATUS.SUCCESS) {
      return res.data;
      // const error = res.data.code.toString();
      // const msg = res.data.message.toString();
      // if (res.data.tokens) {
      //   try {
      //     Taro.setStorageSync('xAuthToken', response.data.tokens.token + ' ' + response.data.tokens.refesh_token);
      //   } catch (e) {
      //     Taro.showToast({ title: '登录信息存储失败', icon: "none" })
      //   }
      // }
      // if (error === '1' || error === '0') {
      //   // Taro.setStorageSync('xAuthToken', false)
      //   // 判断有没有登录信息
      //   if (!Taro.getStorageSync('xAuthToken')) {
      //     pageToLogin();
      //   }
      //   return res.data;
      // }
      // if (error === '-99' || error === '-96') {
      //   Taro.showToast({ title: msg, icon: "none" })
      //   try {
      //     Taro.removeStorageSync('xAuthToken')
      //     //跳转到登录页面
      //     //window.location.href = '/'
      //   } catch (e) {
      //     //Taro.showToast({ title: '登录信息删除失败', icon: "none" })
      //   }
      //   return;
      // }
      // //弹出错误信息
      // Taro.showToast({ title: msg, icon: "none" })
      // return;
    }
  })

}

// Taro 提供了两个内置拦截器
// logInterceptor - 用于打印请求的相关信息
// timeoutInterceptor - 在请求超时时抛出错误。
const interceptors = [customInterceptor, Taro.interceptors.logInterceptor]

export default interceptors
