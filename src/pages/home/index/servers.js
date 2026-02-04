import request from "@/utils/http"

export async function getExamine(params) {
  return request.get(`heatmap/examine/app/page/${params.type}`, {
    current: params.current,
    size: params.size
  });
}

export async function delExamineById(params) {
  return request.delete(`heatmap/examine/delExamineById?examineId=${params}`);
}
