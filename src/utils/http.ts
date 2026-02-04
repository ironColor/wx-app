import Taro from '@tarojs/taro';
import { Base64 } from '@/utils/base64';
import interceptors from './interceptors';

interceptors.forEach(interceptorItem => Taro.addInterceptor(interceptorItem));

class request {
  baseOptions(params, method) {
    // console.log(Taro.getStorageSync('token'))
    let { url, data } = params;
    let contentType = 'application/json';
    contentType = params.contentType || contentType;
    const option = {
      url: url.startsWith('http') ? url : process.env.TARO_APP_API + url,
      data: data,
      method: method || 'GET',
      header: {
        'content-type': contentType,
        Authorization:
          Taro.getStorageSync('token') || `Basic ${Base64.btoa('daihaiApp:daihaiApp')}`,
        timestamp: Date.now()
        // appid: '10003',
        // secretkey: 'housetop#dinxin#staff',
        // Authorization: `Bearer `,
      }
    };
    return Taro.request(option);
  }

  get(url, data) {
    let option = { url, data };
    return this.baseOptions(option, 'GET');
  }

  post(url, data, contentType) {
    let params = { url, data, contentType };
    return this.baseOptions(params, 'POST');
  }

  put(url, data = '') {
    let option = { url, data };
    return this.baseOptions(option, 'PUT');
  }

  delete(url, data = '') {
    let option = { url, data };
    return this.baseOptions(option, 'DELETE');
  }
}

export default new request();
