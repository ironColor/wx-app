import Taro from '@tarojs/taro';
import { useState, useEffect, useRef } from 'react';
import { View } from '@tarojs/components';
import { Button, Notify, Picker } from '@antmjs/vantui';
import {ab2hex, formatTimestamp} from '@/utils/utils';
import { state } from '@/pages/home/index/common';
import './index.scss';

const Index = () => {
  const [data, setData] = useState<{ text: string; id: string }[]>([]);
  const realTimeData = useRef<string[]>();
  const [current, setCurrent] = useState<string[]>();

  useEffect(() => {
    initBLE();
    return () => closeBLE();
  }, []);

  const initBLE = () => {
    Taro.openBluetoothAdapter({
      success: () => {
        console.log('蓝牙适配器已打开');
      },
      fail: () => {
        Notify.show({
          message: '请先打开蓝牙',
          type: 'primary',
          duration: 3000
        });
      }
    });
  };

  const findBLE = () => {
    Taro.startBluetoothDevicesDiscovery({
      services: ['0000FFF0-0000-1000-8000-00805F9B34FB'], // uuid
      allowDuplicatesKey: false,
      interval: 0,
      success: () => {
        Taro.showLoading({
          title: '正在搜索设备'
        });
        setTimeout(() => {
          stopDiscovery();
        }, 3000);
      },
      fail: res => {
        Notify.show({
          message: '蓝牙设备服务发现失败' + res.errMsg,
          type: 'warning',
          duration: 3000
        });
      }
    });
  };

  const stopDiscovery = () => {
    Taro.hideLoading();
    Taro.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('关闭蓝牙搜索');
        getBLE();
      }
    });
  };

  /**
   * 获取发现的蓝牙设备
   */
  const getBLE = () => {
    // 获取发现的蓝牙设备
    Taro.getBluetoothDevices({
      success: res => {
        const list = res.devices;
        console.log('蓝牙列表', list);
        if (list.length === 0) {
          return;
        }
        setData(list.map(i => ({ text: i.localName || i.name, id: i.deviceId })));
      },
      fail: () => {
        Notify.show({
          message: '搜索蓝牙设备失败',
          type: 'warning',
          duration: 3000
        });
      }
    });
  };

  const connectBLE = (id: string) => {
    Taro.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('关闭蓝牙搜索');
      }
    });
    Taro.createBLEConnection({
      deviceId: id,
      success: () => {
        Notify.show({
          message: '蓝牙设备连接成功',
          type: 'primary',
          duration: 3000
        });
        getService(id);
      },
      fail: res => {
        Notify.show({
          message: '蓝牙设备连接失败' + res.errMsg,
          type: 'warning',
          duration: 3000
        });
      }
    });
  };

  const closeBLE = () => {
    Taro.closeBluetoothAdapter({
      success: () => {
        Notify.show({
          message: '蓝牙模块已关闭',
          type: 'info',
          duration: 1000
        });
      },
      fail: () => {
        Notify.show({
          message: '蓝牙模块未关闭',
          type: 'warning',
          duration: 1000
        });
      }
    });
  };

  // const closeConnect = deviceId => {
  //   Taro.closeBLEConnection({
  //     deviceId: deviceId,
  //     success: () => {
  //       console.log('断开蓝牙设备成功：', deviceId);
  //     },
  //     fail: () => {
  //       console.error('断开蓝牙设备失败：', deviceId);
  //     }
  //   });
  // };

  /**
   * 获取服务列表
   */
  const getService = id => {
    Taro.getBLEDeviceServices({
      deviceId: id,
      success: res => {
        const services = res.services;
        if (services?.length === 0) {
          Notify.show({
            message: '未找到主服务列表',
            type: 'warning',
            duration: 3000
          });
          return;
        }
        getBLECharactedId(id, services[0].uuid);
      },
      fail: res => {
        console.log('获取设备服务列表失败' + res.errMsg);
      }
    });
  };

  const getBLECharactedId = (deviceId, serviceId) => {
    Taro.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: res => {
        console.log(res);
        const chars = res.characteristics;
        if (chars?.length === 0) {
          return;
        }
        for (let i = 0; i < chars.length; i++) {
          const char = chars[i];
          const prop = char.properties;
          console.log('-----特征值', char);

          if (prop.notify == true) {
            recvBLECharacterNotice(deviceId, serviceId, char.uuid);
            return;
          }
        }
      },
      fail: () => {
        console.log('获取设备特征值失败');
      }
    });
  };

  const recvBLECharacterNotice = (deviceId, serviceId, charId) => {
    //接收设置是否成功
    Taro.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: charId,
      state: true, //启用Notify功能
      success: () => {
        Taro.onBLECharacteristicValueChange(res => {
          const d = ab2hex(res.value);
          if (!d.startsWith('$GNPOS')) return;
          // 处理数据,只保留 $GNDEV之前的数据
          const index = d.indexOf('$GNDEV');
          const cleaned = index !== -1 ? d.slice(0, index).trim() : d;
          const dataArray = cleaned.split(',');
          realTimeData.current = dataArray;
          console.log('收到Notify数据: ', dataArray);
        });
      },
      fail: res => {
        console.log('特征值Notice 接收数据失败: ' + res);
      }
    });
  };

  /**
   * 点击复制剪切板
   */
  const clipboard = d => {
    Taro.setClipboardData({
      data: d
    });
  };

  return (
    <View className='page'>
      <View className='title'>步骤一：连接蓝牙</View>
      <View className='layout'>
        <View className='subTitle'>蓝牙设备</View>
        <Picker
          mode='content'
          showToolbar
          title='请选择'
          onConfirm={e => connectBLE(e.detail.value.id)}
          columns={data}
        />
      </View>
      <Button type='info' className='discoveryButton' onClick={findBLE}>
        搜 索 蓝 牙
      </Button>
      <View className='title'>步骤二：获取数据</View>
      <View className='layout' onClick={() => current && clipboard(current[2])}>
        <View className='subTitle'>经度</View>
        <View className='subContent'>{current ? current[2] : '暂无数据'}</View>
      </View>
      <View className='layout' onClick={() => current && clipboard(current[1])}>
        <View className='subTitle'>纬度</View>
        <View className='subContent'>{current ? current[1] : '暂无数据'}</View>
      </View>
      <View className='layout' onClick={() => current && clipboard(current[3])}>
        <View className='subTitle'>高度</View>
        <View className='subContent'>{current ? current[3] : '暂无数据'}</View>
      </View>
      <View className='layout'>
        <View className='subTitle'>状态</View>
        <View className='subContent'>{current ? state[current[5]] : '暂无数据'}</View>
      </View>
      <View className='layout'>
        <View className='subTitle'>时间</View>
        <View className='subContent'>{current ? formatTimestamp(Number(current[18])) : '暂无数据'}</View>
      </View>
      <Button type='info' className='dataButton' onClick={() => setCurrent(realTimeData.current)}>
        获 取 数 据
      </Button>
    </View>
  );
};

export default Index;
