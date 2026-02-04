import request from '@/utils/http';

export async function detail(params) {
  return request.get(`/ppc/ppcNotice/${params}`);
}
