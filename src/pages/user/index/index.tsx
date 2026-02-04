import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View } from '@tarojs/components';
import { Tag, Cell } from '@antmjs/vantui';
import './index.scss';

const Index = () => {
  const [info, setInfo] = useState<any>();

  Taro.useDidShow(() => {
    Taro.getStorage({
      key: 'userInfo',
      success: res => setInfo(res.data)
    });
  });

  const logout = () => {
    Taro.navigateTo({ url: '/pages/user/login/index' })
    Taro.clearStorage();
  };

  return (
    <View className='page'>
      <View className='info'>
        <View className='head'>🥵</View>
        <View className='user-info'>
          <View className='user-info-head'>
            <View className='user-info-head-name'>{info?.nickname}</View>
            <Tag round type='primary'>
              巽达科技
            </Tag>
          </View>
          <View className='user-info-phone'>{info?.username}</View>
        </View>
      </View>
      <View className='list'>
        <Cell className='items' title='我的场地' isLink url='/pages/user/site/index' />
        <Cell className='items' title='RTK配置' isLink url='/pages/user/rtk/index' />
        <Cell className='items' title='蓝牙通信' isLink url='/pages/user/bluetooth/index/index' />
        <Cell className='items' title='意见反馈' isLink url='/pages/user/feedback/index' />
        <Cell className='items' title='系统公告' isLink url='/pages/user/notice/index/index' />
      </View>
      <View className='logout-bottom' onClick={logout}>
        退出登录
      </View>
    </View>
  );
};
export default Index;
