import request from '@/utils/http';

export async function add(params) {
  return request.post(`${params.type ? 'ppcLand/delete' : 'ppcLand/save'}`, params.body);
}

export async function del(params) {
  return request.delete(`${params.type ? 'ppcTask/delete' : 'ppcLand/delete'}`, params.ids);
}

export async function edit(params) {
  return request.put(`${params.type ? 'ppcTask/update' : 'ppcLand/update'}`, params.body);
}
export async function getList(params) {
  return request.get(`${params.type ? 'ppcTask/page' : 'ppcLand/page'}`, params);
}
