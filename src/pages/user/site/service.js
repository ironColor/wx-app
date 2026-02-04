import request from '@/utils/http';

export async function add(params) {
  return request.post(`/ppc/area/save`, params);
}

export async function del(params) {
  return request.delete(`/ppc/area/delete`, params);
}

export async function edit(params) {
  return request.put('/ppc/area/update', params);
}

export async function detail(params) {
  return request.get(`/ppc/area/${params}`);
}


export async function list(params) {
  return request.get(`/ppc/area/page`, params);
}
