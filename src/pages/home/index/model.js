import { getExamine } from './servers';

export default {
  namespace: 'home',
  state: {
    examine: {
      list: [],
      pagination: {}
    }
  },
  effects: {
    *fetchExamine({ payload }, { call, put }) {
      const response = yield call(getExamine, payload);
      if (response.code === 0) {
        yield put({
          type: 'saveData',
          payload: {
            list: response.data.records,
            pagination: {
              total: response.data.total,
              current: response.data.current,
              pageSize: response.data.size
            }
          }
        });
      }
      return response;
    },
  },
  reducers: {
    saveData(state, action) {
      return {
        ...state,
        examine: action.payload,
      };
    }
  }
}
