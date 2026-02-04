import Taro from '@tarojs/taro';
import { memo, useEffect, useRef, useState } from 'react';
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
  Dialog,
  Notify
} from '@antmjs/vantui';
import { add, del, edit, list } from './service';
import './index.scss';

const DialogIns = Dialog.createOnlyDialog();
const Index = () => {
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState<number>(1);
  const [searchValue, setSearchValue] = useState('');
  const [selected, setSelected] = useState<any>();
  const infiniteScrollInstance = useRef<InfiniteScrollInstance>();
  const virtualListInstance = useRef<IVirtualListInstance>();

  useEffect(() => {
    Taro.getStorage({
      key: 'site',
      success: res => setSelected(res.data)
    });
  }, []);

  const loadMore: InfiniteScrollProps['loadMore'] = async () => {
    try {
      const res: any = await list({
        size: 10,
        current,
        ...(searchValue && { areaName: searchValue })
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
      size: 10,
      current: 1,
      areaName: searchValue
    });

    if (res.code !== 0) {
      return;
    }

    await virtualListInstance.current?.reset();
    setCurrent(res.data.current + 1);
    setData(res.data.records);
    // 重置加载状态,解决下滑获取到所有数据后,再次下拉刷新无法加载更多的问题
    infiniteScrollInstance.current?.reset()
  };

  const dialog = async (type: number, arg?: string, id?: number) => {
    let name = '';
    const result = await DialogIns.confirm({
      title: `${type ? (type === 1 ? '创建场地' : '修改') : '删除'}`,
      message: (
        <>
          {type ? (
            <Field
              required
              clearable
              border={false}
              label='场地名称'
              value={name || arg}
              onChange={e => (name = e.detail)}
            />
          ) : (
            '确定要删除当前场地？'
          )}
        </>
      )
    });

    if (result === 'cancel') return;

    let res: any = {};
    if (type === 0) {
      res = await del([arg]);
    } else if (type === 1) {
      res = await add({ areaName: name });
    } else {
      res = await edit({ areaId: id, areaName: name });
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
          <Button type='info' className='search-add' onClick={() => dialog(1)}>
            创 建
          </Button>
        }
      />
      <PullToRefresh onRefresh={onRefresh} touchMinTime={0} disable={true}>
        <VirtualList
          height='100%'
          dataSource={data}
          showCount={15}
          ref={virtualListInstance}
          footer={<InfiniteScroll loadMore={loadMore} ref={infiniteScrollInstance} />}
          ItemRender={memo(({ item }: { item: any }) => {
            return (
              <View className='content'>
                <SwipeCell
                  key={item.areaId}
                  rightWidth={100}
                  className='list'
                  renderRight={
                    <>
                      <Button
                        type='info'
                        className='list-operate'
                        onClick={() => dialog(2, item.areaName, item.areaId)}
                      >
                        修改
                      </Button>
                      <Button
                        type='danger'
                        className='list-operate'
                        onClick={() => dialog(0, item.areaId)}
                      >
                        删除
                      </Button>
                    </>
                  }
                >
                  <View
                    className='list-items'
                    key={item.areaId}
                    onClick={() => {
                      setSelected({ id: item.areaId, name: item.areaName });
                      Taro.setStorage({
                        key: 'site',
                        data: { id: item.areaId, name: item.areaName },
                        success: () => {
                          Notify.show({
                            message: '选择成功',
                            type: 'success'
                          });
                        }
                      });
                    }}
                    style={item.areaId === selected?.id ? { border: '2PX solid #314df6' } : {}}
                  >
                    <View className='list-items-title'>
                      <View>{item.areaName}</View>
                      <Tag round plain type='primary'>
                        {item.landCount}个地块
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
