import request from '@/utils/http';

export async function add(params) {
  return request.post(`/ppc/ppcFeedback/save`, params);
}
