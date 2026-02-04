import request from '@/utils/http';

export async function list(params) {
  return request.get(`/ppc/ppcNotice/page`, params);
}
