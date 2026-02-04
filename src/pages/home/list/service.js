import request from '@/utils/http';

export async function add(params) {
  return request.post(`${params.type ? '/ppc/ppcLand/save' : '/ppc/ppcTask/save'}`, params.body);
}

export async function del(params) {
  return request.delete(`${params.type ? '/ppc/ppcLand/delete' : '/ppc/ppcTask/delete'}`, params.ids);
}

export async function edit(params) {
  return request.put(`${params.type ? '/ppc/ppcLand/update' : '/ppc/ppcTask/update'}`, params);
}

export async function list(params) {
  return request.get(`${params.type ? '/ppc/ppcLand/page' : '/ppc/ppcTask/page'}`, params);
}
