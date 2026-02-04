import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';
import { View } from '@tarojs/components';
import { detail } from './service';
import './index.scss';

const Index = () => {
  const [data, setData] = useState<any>({});
  const { params } = Taro.useRouter();

  useEffect(() => {
    detail(params.id).then((res: any) => {
      if (res.code !== 0) {
        Taro.showToast({
          title: '获取数据失败',
          icon: 'none',
          duration: 3000
        });
        return;
      }
      setData(res.data);
    });
  }, []);

  return (
    <View className='page'>
      <View className='title'>{data.title}</View>
      <View className='desc'>{data.content}</View>
      <View className='time'>发布时间：{data.createTime}</View>
    </View>
  );
};

export default Index;
