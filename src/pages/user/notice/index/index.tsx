import Taro from '@tarojs/taro';
import { memo, useRef, useState } from 'react';
import { View } from '@tarojs/components';
import {
  Search,
  PullToRefresh,
  VirtualList,
  InfiniteScroll,
  InfiniteScrollInstance,
  IVirtualListInstance,
  InfiniteScrollProps,
  IPullToRefreshProps,
  Cell
} from '@antmjs/vantui';
import { list } from './service';
import './index.scss';

const Index = () => {
  const [data, setData] = useState([]);
  const [current, setCurrent] = useState<number>(1);
  const [searchValue, setSearchValue] = useState('');
  const infiniteScrollInstance = useRef<InfiniteScrollInstance>();
  const virtualListInstance = useRef<IVirtualListInstance>();

  Taro.useDidShow(async () => {
    await onRefresh();
  });

  const loadMore: InfiniteScrollProps['loadMore'] = async () => {
    try {
      const res: any = await list({
        size: 10,
        current,
        title: searchValue
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
      title: searchValue
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

  return (
    <View className='page'>
      <Search
        background='transparent'
        placeholder='请输入搜索关键词'
        className='search'
        onSearch={onRefresh}
        value={searchValue}
        onChange={e => setSearchValue(e.detail)}
      />
      <PullToRefresh onRefresh={onRefresh} touchMinTime={0} disable>
        <VirtualList
          height='100%'
          dataSource={data}
          showCount={15}
          ref={virtualListInstance}
          footer={<InfiniteScroll loadMore={loadMore} ref={infiniteScrollInstance} />}
          className='content'
          ItemRender={memo(({ item, id }: { item: any; id: string }) => {
            return (
              <Cell
                key={id}
                isLink
                className='content-cell'
                onClick={() => {
                  Taro.navigateTo({
                    url: `/pages/user/notice/detail/index?id=${item.id}`
                  });
                }}
                renderTitle={
                  <View>
                    <View className='content-cell-title'>{item.title}</View>
                    <View className='content-cell-date'>{item.createTime}</View>
                  </View>
                }
              />
            );
          })}
        />
      </PullToRefresh>
    </View>
  );
};

export default Index;
