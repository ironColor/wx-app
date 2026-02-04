import request from '@/utils/http';
import Taro from "@tarojs/taro";

export async function add(params) {
  return request.post(`${params.type ? '/ppc/ppcLand/save' : '/ppc/ppcTask/save'}`, params);
}

export async function edit(params) {
  return request.put(`${params.type ? '/ppc/ppcLand/update' : '/ppc/ppcTask/update'}`, params);
}

export async function list(params) {
  return request.get('/ppc/ppcLand/list', params);
}

export async function detail(params) {
  const result = await request.get(`${params.type ? `/ppc/ppcLand/${params.id}` : `/ppc/ppcTask/${params.id}`}`)

  if (result.code !== 0) {
    Taro.showToast({
      title: `${result.msg || '服务内部错误'}`,
      icon: 'none',
      duration: 3000
    });
    return;
  }
  return result.data;
}

export async function gen(params) {
  return request.post(`/ppc/ppcTask/route`, params);
}
