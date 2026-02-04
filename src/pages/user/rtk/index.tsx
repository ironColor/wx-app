import Taro from '@tarojs/taro';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { View } from '@tarojs/components';
import mqtt from '@/utils/mqtt.min.js';
import {
  Button,
  SwipeCell,
  PullToRefresh,
  VirtualList,
  InfiniteScroll,
  InfiniteScrollInstance,
  IVirtualListInstance,
  InfiniteScrollProps,
  IPullToRefreshProps,
  Field,
  Dialog,
  Notify,
} from '@antmjs/vantui';
import './index.scss';
import { add, del, list } from './service';

const DialogIns = Dialog.createOnlyDialog();

const Index = () => {
  // 设备ID
  const [value, setValue] = useState<any>();
  // RTK ID
  const [rtk, setRtk] = useState<any>();
  // 储存数据
  const [data, setData] = useState([]);
  // RTK实时数据
  const [wsData, setWsData] = useState<string[]>([]);
  // 当前页码
  const [current, setCurrent] = useState<number>(1);
  // MQTT实例
  const client = useRef<any>(null);
  // 滚动实例
  const infiniteScrollInstance = useRef<InfiniteScrollInstance>();
  // 虚拟列表实例
  const virtualListInstance = useRef<IVirtualListInstance>();

  Taro.useDidShow(() => {
    Taro.getStorage({
      key: 'rtk',
      success: res => setRtk(res.data)
    });
  });

  useEffect(() => {
    // 连接MQTT Socket
    !client.current && initSocket();

    // MQTT连接状态
    client.current?.on('connect', () => {
      console.log('连接成功！', client.current);
      client.current?.on('error', err => {
        Taro.showToast({
          title: '网络错误',
          icon: 'none',
          duration: 3000
        });
        console.error('客户端错误！', err);
      });
      client.current?.on('offline', () => {
        console.log('网络连接错误！');
      });
      client.current?.on('close', () => {
        console.log('连接已关闭！');
      });
      client.current?.on('reconnect', () => {
        console.log('正在重连！');
      });
      client.current?.on('message', (_, message, __) => {
        const result = JSON.parse(message.toString());
        setWsData((prevState) => [...new Set([...prevState, result.deviceId])]);
        console.log(result);
      });
    });

    return () => close();
  }, []);

  // 监听列表数据,当列表数据改变时代表刷新过,重新订阅
  useEffect(() => {
    // 重新订阅获取消息
    data?.length > 0 && subscribe();
  }, [data]);

  const initSocket = useCallback(() => {
    console.log('正在连接！');
    client.current = mqtt.connect(`${process.env.TARO_APP_WXS}`, {
      // 客户端ID
      clientId: 'RTK-' + Math.floor(Math.random() * 10000),
      // 用户名
      username: `${process.env.TARO_APP_USERNAME}`,
      // 密码
      password: `${process.env.TARO_APP_PASSWORD}`,
      // 重连的间隔时间，设置为 0 禁用自动重连
      reconnectPeriod: 2000,
      // 连接超时时间
      connectTimeout: 30 * 1000
    });
  }, []);

  // 订阅MQTT主题
  const subscribe = useCallback(() => {
    if (!client.current) {
      console.error('请先连接！');
      return;
    }

    client.current.subscribe(data.map((item:{ deviceId: string }) => (`dsx/mqtt/${item.deviceId}`)), { qos: 0 }, (err, granted) => {
      if (err) {
        Taro.showToast({
          title: '订阅失败，请检查设备ID',
          icon: 'none',
          duration: 3000
        });
        console.error('订阅失败', err);
        return;
      }
      // 清空wsData,避免旧数据影响在线状态
      setWsData([]);
      // 延时取消订阅
      unsubscribe()
      console.log('订阅成功', granted);
    });
  }, [data]);

  // 延时取消订阅
  const unsubscribe = () => {
    setTimeout(() => {
      unsub();
    }, 4000);
  };

  // 取消订阅
  const unsub = useCallback(() => {
    if (!client.current) return;
    // 取消订阅
    if (client.current.connected) {
      client.current.unsubscribe(
        data.map((item: { deviceId: string }) => `dsx/mqtt/${item.deviceId}`),
        err => {
          if (err) {
            console.log('取消订阅失败！', err);
            return;
          }
          console.log('取消订阅成功！');
        }
      );
    }
  }, [data]);

  // 关闭MQTT.JS连接
  const close = useCallback(() => {
    // 取消订阅
    unsub();

    // 关闭连接
    client.current.end(true, () => {
      console.log('客户端连接已关闭！');
    });
  }, []);

  // 下拉刷新
  const onRefresh: IPullToRefreshProps['onRefresh'] = async () => {
    const res: any = await list({
      size: 10,
      current: 1
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

  // 下滑更多
  const loadMore: InfiniteScrollProps['loadMore'] = async () => {
    try {
      const res: any = await list({
        size: 10,
        current
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

  // 删除弹窗提醒
  const dialog = async (id: number) => {
    const result = await DialogIns.confirm({
      title: '删除提醒',
      message: '确定删除当前设备？'
    });

    if (result === 'cancel') return;

    const res: any = await del(id);
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

  // 添加RTK设备
  const onAdd = async () => {
    if (!value) {
      Notify.show({
        message: '请输入RTK设备ID',
        type: 'warning'
      });
      return;
    }
    const res: any = await add(value);
    if (res.code === 0) {
      await onRefresh();
      Taro.showToast({
        title: '操作成功',
        icon: 'none',
        duration: 3000
      });
      setValue('');
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
      <View className='connect'>
        <View className='connect-title'>一、添加RTK设备</View>
        <Field
          className='connect-input'
          value={value}
          placeholder='请输入RTK设备ID'
          onChange={e => setValue(e.detail)}
          maxlength={16}
          clearable
        />
        <Button className='connect-add' type='info' onClick={onAdd}>
          添 加
        </Button>
        <View className='connect-title-select'>
          <View className='connect-title'>二、选择RTK设备</View>
        </View>
      </View>
      <PullToRefresh onRefresh={onRefresh} touchMinTime={0} disable={false}>
        <VirtualList
          height='100%'
          dataSource={data}
          showCount={15}
          ref={virtualListInstance}
          footer={<InfiniteScroll loadMore={loadMore} ref={infiniteScrollInstance} />}
          ItemRender={memo(({ item }: { item: any }) => {
            const isActive = wsData.includes((item?.deviceId) as never);
            return (
              <View className='content'>
                <SwipeCell
                  key={item.id}
                  rightWidth={50}
                  className='list'
                  renderRight={
                    <Button type='danger' className='list-operate' onClick={() => dialog(item.id)}>
                      删除
                    </Button>
                  }
                >
                  <View
                    className='list-items'
                    key={item.id}
                    onClick={() => {
                      setRtk(item.deviceId);
                      Taro.setStorage({
                        key: 'rtk',
                        data: item.deviceId,
                        success: () => {
                          Notify.show({
                            message: '选择成功',
                            type: 'success'
                          });
                        }
                      });
                    }}
                    style={item.deviceId === rtk ? { border: '2PX solid #314df6' } : {}}
                  >
                    <View className='list-items-title'>
                      <View>{item.deviceId}</View>
                      <View className='list-items-status'>
                        <View
                          className='list-items-status-badge'
                          style={{
                            backgroundColor: isActive ? '#52c41a' : 'rgba(0, 0, 0, 0.25)'
                          }}
                        />
                        <View className='list-items-status-text'>{isActive ? '在线' : '离线'}</View>
                      </View>
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
