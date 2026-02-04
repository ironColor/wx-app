import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View, Map } from '@tarojs/components';
import gcoord from 'gcoord';
import { list } from './servers';
import './index.scss';

export default function Index() {
  const [land, setLand] = useState([]);
  const [point, setPoint] = useState<{ latitude: number; longitude: number }[]>([]);

  Taro.useDidShow(async () => {
    Taro.showNavigationBarLoading();

    setPoint([]);
    Taro.getStorage({
      key: 'site',
      success: res => {
        Taro.setNavigationBarTitle({ title: `${res.data.name}` });
        list({ areaId: res.data.id }).then(r => {
          const data = r.data?.map(item => {
            const p = item.landPoints.map(i => {
              const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);

              return { latitude: lat, longitude: lon };
            });
            setPoint(preData => [...preData, ...p]);

            return {
              dashArray: [0, 0],
              points: p,
              strokeWidth: 1,
              strokeColor: '#00B2D5',
              fillColor: '#00B2D54C'
            };
          });

          setLand(data);
          Taro.hideNavigationBarLoading();
        });
      }
    });
  });

  return (
    <View className='page'>
      <Map
        id='map'
        longitude={117.15361207245223}
        latitude={36.65924761556728}
        // 缩放级别
        scale={20}
        style={{ width: '100%', height: '100%' }}
        onError={() => {
          console.log('onError错误');
        }}
        includePadding={{ left: 120, right: 120, top: 160, bottom: 100 }}
        // 缩放视野到包含所有点
        includePoints={point}
        // 多边形
        polygons={land}
        // 是否展示建筑物
        enableBuilding
        // 显示当前定位
        showLocation
        // 显示指南针
        // showCompass
        // 显示比例尺
        showScale
        // 显示俯视
        enableOverlooking
        // 支持缩放
        enableZoom
        // 支持拖动
        enableScroll
        // 支持旋转
        enableRotate
        // 开启卫星图
        enableSatellite={false}
        // 开启路况
        enableTraffic={false}
      />
    </View>
  );
}
