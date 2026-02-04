import request from '@/utils/http';

export async function add(params) {
  return request.post(`/ppc/point/save`, params.body);
}

export async function del(params) {
  return request.delete(`/ppc/point/delete`, params.ids);
}

export async function edit(params) {
  return request.put(`/ppc/point/update`, params);
}

export async function list(params) {
  return request.get('/ppc/point/page', params);
}
