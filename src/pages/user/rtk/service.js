import request from '@/utils/http';

export async function add(id) {
  return request.post(`/ppc/rtk/save?deviceId=${id}`);
}

export async function del(id) {
  return request.delete(`/ppc/rtk/delete/${id}`);
}

export async function list(params) {
  return request.get(`/ppc/rtk/page`, params);
}
