import Taro from '@tarojs/taro';
import { memo, useRef, useState, useEffect } from 'react';
import { View } from '@tarojs/components';
import {
  Button,
  Search,
  SwipeCell,
  Tag,
  PullToRefresh,
  VirtualList,
  InfiniteScroll,
  InfiniteScrollInstance,
  IVirtualListInstance,
  InfiniteScrollProps,
  IPullToRefreshProps,
  Field,
  Dialog
} from '@antmjs/vantui';
import { siteTypes2, taskTypes2 } from '@/pages/home/index/common';
import { del, edit, list } from './service';
import './index.scss';

const Option = {
  0: "普通点",
  2: "喷洒",
  3: "投放",
  4: "回收",
  5: "割草",
  6: "巡检",
  7: "挂载点",
  8: "卸载点",
  9: "作业点",
  10: "起飞点",
}

const DialogIns = Dialog.createOnlyDialog();
const Index = () => {
  const [flag, setFlag] = useState(true);
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState<number>(1);
  const [searchValue, setSearchValue] = useState('');
  const site = useRef<any>();
  const infiniteScrollInstance = useRef<InfiniteScrollInstance>();
  const virtualListInstance = useRef<IVirtualListInstance>();
  const { params } = Taro.useRouter();

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: `${params.title}${params.type}列表` });

    Taro.getStorage({
      key: 'site',
      success: res => (site.current = res.data),
      fail: () =>
        Taro.showModal({
          title: '请选择场地',
          content: '是否跳转到场地选择页面？',
          success: function (res) {
            if (res.confirm) {
              Taro.navigateTo({ url: `/pages/user/site/index` });
            } else if (res.cancel) {
              Taro.navigateBack();
            }
          }
        })
    });
    setFlag(params.type === '地块');
  }, []);

  Taro.useDidShow(async () => {
    await onRefresh();
  });

  const loadMore: InfiniteScrollProps['loadMore'] = async () => {
    try {
      const res: any = await list({
        size: 10,
        current,
        areaId: site.current.id,
      });

      if (res.code === 0) {
        const newData = res.data.records;
        setCurrent(res.data.current + 1);
        setData(prevData => prevData.concat(newData));
        return newData.length < 10 ? 'complete' : 'loading';
      } else {
        return 'error';
      }
    } catch {
      return 'error';
    }
  };

  const onRefresh: IPullToRefreshProps['onRefresh'] = async () => {
    const res: any = await list({
      type: flag,
      size: 10,
      current: 1,
      areaId: site.current.id,
      pointName: searchValue
    });

    if (res.code !== 0) {
      return;
    }

    await virtualListInstance.current?.reset();
    setCurrent(res.data.current + 1);
    setData(res.data.records);
  };

  const dialog = async (type: boolean, arg: any) => {
    let name = '';
    const result = await DialogIns.confirm({
      title: `${type ? '修改' : '删除'}`,
      message: (
        <>
          {type ? (
            <Field
              required
              clearable
              border={false}
              label='轨迹点名称'
              value={name || arg.pointName}
              onChange={e => (name = e.detail)}
            />
          ) : (
            '确定要删除？'
          )}
        </>
      )
    });

    if (result === 'cancel') return;

    let res: any = {};
    if (type) {
      const newData = arg;
      // 删除对象update属性
      delete newData.updateTime;
      flag ? (newData.landName = name) : (newData.taskName = name);
      res = await edit({ type: flag, ...newData });
    } else {
      res = await del({ ids: [arg.pointId] });
    }

    if (res.code === 0) {
      await onRefresh();
      Taro.showToast({
        title: '操作成功',
        icon: 'none',
        duration: 3000
      });
    } else {
      Taro.showToast({
        title: res.msg || '操作失败，请联系管理员',
        icon: 'none',
        duration: 3000
      });
    }
  };

  return (
    <View className='page'>
      <Search
        background='transparent'
        placeholder='请输入搜索关键词'
        className='search'
        onSearch={onRefresh}
        value={searchValue}
        onChange={e => setSearchValue(e.detail)}
        renderAction={
          <Button
            type='info'
            className='search-add'
            onClick={() => {
              Taro.navigateTo({
                url: `/pages/home/gis/diffGis/point/index?type=${params.type}&title=${params.title}`
              });
            }}
          >
            创 建
          </Button>
        }
      />
      <PullToRefresh onRefresh={onRefresh} touchMinTime={0} disable>
        <VirtualList
          height='100%'
          dataSource={data}
          showCount={15}
          ref={virtualListInstance}
          footer={<InfiniteScroll loadMore={loadMore} ref={infiniteScrollInstance} />}
          ItemRender={memo(({ item, id }: { item: any; id: string }) => {
            return (
              <View className='content' id={id}>
                <SwipeCell
                  key={item.pointId}
                  id={id}
                  rightWidth={100}
                  className='list'
                  renderRight={
                    <>
                      <Button
                        type='info'
                        className='list-operate'
                        onClick={() =>
                          Taro.navigateTo({
                          url: `/pages/home/gis/diffGis/point/index?type=${params.type}&title=${params.title}&id=${item.pointId}`
                        })}
                      >
                        重制
                      </Button>
                      <Button
                        type='danger'
                        className='list-operate'
                        onClick={() => dialog(false, item)}
                      >
                        删除
                      </Button>
                    </>
                  }
                >
                  <View
                    className='list-items'
                    key={flag ? item.landId : item.taskId}
                  >
                    <View className='list-items-title'>
                      <View>{item.pointName}</View>
                      <Tag round plain type='primary'>
                        {Option[item.pointType]}
                      </Tag>
                    </View>
                    <View className='list-items-desc'>
                      <View>{item.createName}</View>
                      <View>{item.createTime}</View>
                    </View>
                  </View>
                </SwipeCell>
              </View>
            );
          })}
        />
      </PullToRefresh>
      <DialogIns />
    </View>
  );
};

export default Index;
