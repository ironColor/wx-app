import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Input, Map, Text, View } from '@tarojs/components';
import { Dialog, Divider, Form, FormItem, Picker } from '@antmjs/vantui';
import {dotTypes, dotTypes2, dotTypes3} from '@/pages/home/index/common';
import gcoord from 'gcoord';
import mqtt from '@/utils/mqtt.min.js';
import { add, detail, edit } from './servers';
import './index.scss';
import { isNumber } from '@tarojs/shared';

const DialogIns = Dialog.createOnlyDialog();

interface DataItem {
  lon: number;
  lat: number;
  alt: number;
  type?: string;
  speed?: number;
  relativeAlt?: number;
}

interface landItem {
  landId: number;
  landPoints: [];
  oldLandId: number;
  oldLandPoints: [];
}

interface wsDataItem {
  // 设备的SN
  deviceId: string;
  // 航向（度，0～360）
  direction: string;
  // Unix时间(毫秒)
  gpsTime: string;
  // 纬度（度，南纬是负,北纬是正）
  lat: number;
  // 经度（度，东经是正,西经是负）
  lon: number;
  // 海拔高（单位：米，三位小数）
  alt: number;
  // 大地高（单位：米，三位小数）
  high: string;
  // 定位精度（单位：米，三位小数）
  hrms: string;
  // 速度（km/h）
  speed: string;
  // 定位状态(0:初始化;1:单点定位;2:码差分;3:无效PPS;4:固定解;5:浮点解;6:正在估算;7:人工输入固定值;8:模拟模式;9:WAAS差分;)
  stat: string;
  // 卫星数量
  star: string;
  // 可用卫星数量
  destar: string;
  // 电池电量百分比（0-100)
  batt: string;
  // SIM卡ID
  iccid: string;
  // 角度
  xzAng: string;
}

const Index = () => {
  const formIt = Form.useForm();
  // 路由信息
  const { params } = Taro.useRouter();
  // 地块：true，任务：false
  const [type, setType] = useState(true);
  // 存储数据
  const [data, setData] = useState<DataItem[]>([]);
  // 连接状态
  const [wsState, setWsState] = useState(false);
  // RTK实时数据
  const [wsData, setWsData] = useState<wsDataItem>();
  // 按钮选择
  const [radio, setRadio] = useState(0);
  // 经纬度点
  const [points, setPoints] = useState<{ latitude: number; longitude: number; type: string }[]>([]);
  // 地块信息
  const [land, setLand] = useState<landItem>({
    landId: 0,
    landPoints: [],
    oldLandId: 0,
    oldLandPoints: []
  });
  // 场地信息
  const site = useRef<{ name: string; id: number }>({ name: '', id: 0 });
  // 地图实例
  const mapRef = useRef<any>(null);
  // RTK ID TODO
  const rtk = useRef<string>('H11-245266');
  // MQTT实例
  const client = useRef<any>(null);

  const [show, setShow] = useState(false);

  // 表单的数据
  const [formData, setFormData] = useState<any>()

  useEffect(() => {
    console.log(23, params);
    // getAuth('userLocation', !params.id && initLocation);
    initLocation()
    // 创建 MapContext 实例并保存在 ref 中
    mapRef.current = Taro.createMapContext('map');
    // 连接MQTT Socket
    !client.current && initSocket();
    Taro.setNavigationBarTitle({ title: `轨迹点` });
    // 获取场地信息
    Taro.getStorage({
      key: 'site',
      success: res => {
        site.current = res.data;
        // // 获取地块信息；如果路由地址有id值，代表是修改，则不提供选择地块，新建任务时获取供用户选择的地块
        // !params.id &&
        // params.type !== '地块' &&
        // list({ areaId: res.data.id }).then(r => selectedLand(r.data));
      }
    });
    // 地块类型：true；任务类型：false
    setType(params.type === '地块');

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
        setWsData(result);
        console.log(result, 1111);
      });
      // 订阅主题
      subscribe();
    });

    setFormData({
      pointType: '普通点'
    })

    // 修改，路由地址id值存在，代表是修改
    params.id &&
    detail({ id: params.id, type: params.type === '地块' }).then(r => {
      console.log(r, 111);
      setFormData({
        ...r,
        pointType: dotTypes2[r.pointType]
      })
    });

    return () => close();
  }, []);

  const initSocket = () => {
    console.log('正在连接！');
    client.current = mqtt.connect(`${process.env.TARO_APP_WXS}`, {
      // 客户端ID
      clientId: rtk.current + Math.floor(Math.random() * 10000),
      // 用户名
      username: `${process.env.TARO_APP_USERNAME}`,
      // 密码
      password: `${process.env.TARO_APP_PASSWORD}`,
      // 重连的间隔时间，设置为 0 禁用自动重连
      reconnectPeriod: 2000,
      // 连接超时时间
      connectTimeout: 30 * 1000
    });
  };

  // 订阅MQTT主题
  const subscribe = useCallback(() => {
    if (!client.current) {
      console.error('请先连接！');
      return;
    }
    client.current.subscribe(`dsx/mqtt/${rtk.current}`, { qos: 0 }, (err, granted) => {
      if (err) {
        setWsState(false);
        Taro.showToast({
          title: '订阅失败，请检查设备ID',
          icon: 'none',
          duration: 3000
        });
        console.error('订阅失败', err);
        return;
      }
      setWsState(true);
      console.log('订阅成功', granted);
    });
  }, []);

  // 关闭MQTT.JS连接
  const close = useCallback(() => {
    if (!client.current) return;
    // 取消订阅
    if (client.current.connected) {
      client.current.unsubscribe(`dsx/mqtt/${rtk.current}`, err => {
        if (err) {
          console.log('取消订阅失败！', err);
          return;
        }
        console.log('取消订阅成功！');
      });
    }

    // 关闭连接
    client.current.end(false, () => {
      console.log('客户端连接已关闭！');
    });
  }, []);

  const initLocation = () => {
    Taro.getLocation({
      altitude: true,
      highAccuracyExpireTime: 6000,
      isHighAccuracy: true,
      type: 'gcj02', // gcj02 wgs84
      needFullAccuracy: true,
      success: res => {
        console.log('getLocation success：', res);
        mapRef.current?.moveToLocation({
          longitude: res.longitude,
          latitude: res.latitude
        });
      },
      fail: res => {
        console.log('getLocation fail：', res);
      }
    });
  };

  // 可以在这里处理获取到的经纬度信息，比如显示在页面上或发送给后端
  const handleTap = e => {
    console.log('用户点击地图坐标:', e.detail.longitude, e.detail.latitude);
  };

  /**
   * 新增坐标
   */
  const onLocation = useCallback(async () => {
    if (!wsState) {
      Taro.showToast({
        title: '设备连接异常',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (wsData?.stat !== '4') {
      Taro.showToast({
        title: '请等待进入固定解...',
        icon: 'none',
        duration: 1000
      });
      return;
    }
    console.log('current：', wsData);
    const [lon, lat] = gcoord.transform([wsData.lon, wsData.lat], gcoord.WGS84, gcoord.GCJ02);

    setFormData({
      lon: lon,
      lat: lat,
      pointType: 7,
      alt: wsData.lat
    });
    setShow(true)

  }, [wsData, wsState]);

  /**
   * 更新坐标
   */
  const update = useCallback(() => {
    // todo
    if (wsData?.stat !== '5') {
      Taro.showToast({
        title: '请等待进入固定解...',
        icon: 'none',
        duration: 1000
      });
      return;
    }

    setData(pre => {
      // 创建一个新的数组，确保不可变性
      const temp = [...pre];
      // 浅拷贝当前需要更新的项
      const current = { ...temp[radio] };
      current.alt = wsData.alt;
      current.lon = wsData.lon;
      current.lat = wsData.lat;
      // 替换掉 temp 中的对应项
      temp[radio] = current;
      console.log('更新后数据：', temp[radio]);
      return temp;
    });

    Taro.showToast({
      title: '更新成功，可重新打开查看',
      icon: 'none',
      duration: 2000
    });
  }, [radio, wsData]);

  /**
   * 编辑、新增弹窗
   */
  const argDialog = useCallback(
    async (isAdd: boolean, args: number, lon, lat) => {
      // 没有数据，不弹出编辑的弹窗
      if (!isAdd && args === 0) {
        return;
      }
      console.log('弹窗数据:', data[radio], data);
      const result = await DialogIns.confirm({
        title: ``,
        message: (
          <>
            {!isAdd && (
              <View className='top-info'>
                经度：{data[radio].lon} 纬度: {data[radio].lat}
                <Text className='update' onClick={update}>
                  更新
                </Text>
              </View>
            )}
            <Form
              form={formIt}
              initialValues={
                {
                  ...formData,
                }
              }
              className='arg'
            >
              <FormItem
                label='点名称'
                name='pointName'
                required
                trigger='onInput'               // 👈 添加
                valueFormat={e => e.detail.value} // 👈 添加
              >
                <Input style={{ width: '120px' }} />
              </FormItem>
              <FormItem
                label='点类型'
                name='pointType'
                trigger='onChange'
                required
                valueFormat={e => e.detail.value}
              >
                <Picker
                  defaultIndex={0}
                  itemHeight={28}
                  visibleItemCount={2}
                  columns={Object.values(dotTypes2)}
                  style={{ width: '120px' }}
                />
              </FormItem>
              <FormItem
                label='经度'
                name='lon'
                required
                trigger='onInput'
                validateTrigger='onBlur'
                valueFormat={e => e.detail.value}
              >
                <Input type='text' maxlength={6} style={{ width: '120px' }} disabled={type} />
              </FormItem>
              <FormItem
                label='维度'
                name='lat'
                required
                trigger='onInput'
                validateTrigger='onBlur'
                valueFormat={e => e.detail.value}
              >
                <Input type='text' maxlength={6} style={{ width: '120px' }} disabled={type} />
              </FormItem>
              <FormItem
                label='高度'
                name='alt'
                required
                trigger='onInput'
                validateTrigger='onBlur'
                valueFormat={e => e.detail.value}
                renderRight='米'
              >
                <Input type='digit' maxlength={6} style={{ width: '120px' }} disabled={type} />
              </FormItem>
            </Form>
          </>
        )
      });
      if (result === 'cancel') {
        return;
      }


      // const { pointName, alt, lat: latValue, lon: lonValue } = formIt.getFieldsValue();
      //
      // if (!pointName || !alt || !latValue || !lonValue) {
      //   Taro.showToast({
      //     title: '请输入必填数据',
      //     icon: 'none',
      //     duration: 2000
      //   });
      //   return;
      // }

      // 编辑
      if (!isAdd) {
        const updatedFields = formIt.getFieldsValue();
        // 删除海拔高度属性，避免更新坐标时，点击确认后，把原来的海拔高度重新赋值给data数据
        delete updatedFields.alt;

        console.log('编辑后数据：', updatedFields);
        // 修改后更新data数据
        setData(prevData => {
          return prevData.map((item, index) =>
            index === args ? { ...item, ...updatedFields } : item
          );
        });

        // 修改后更新地图上marker点
        setPoints(pre => {
          const newData = [...pre];
          newData[radio].type = formIt.getFieldsValue().type;

          return newData;
        });
        return;
      }
      return formIt.getFieldsValue();
    },
    [data, formData, formIt, radio, type, update]
  );


  const markers = useMemo(() => {
    if (type && points.length >= 2) return undefined;

    return points.map((i, index) => {
      return {
        id: index,
        latitude: i.latitude,
        longitude: i.longitude,
        title: i.type,
        iconPath: `${process.env.TARO_APP_UI}/dot.png`,
        alpha: 1,
        width: 10,
        height: 10,
        callout: {
          content: i.type,
          color: '#222222',
          fontSize: 14,
          borderRadius: 5,
          borderWidth: 0,
          padding: 8,
          display: 'BYCLICK', // ALWAYS，BYCLICK
          bgColor: '#fff'
        } as any,
        anchor: { x: 0.5, y: 0.5 }
      };
    });
  }, [points, type]);

  const polyline = useMemo(() => {
    // 当类型为地块，且少于3个点时，多边形无法绘制，使用线来绘制
    if (type && points.length <= 2) {
      return [
        {
          points: points,
          color: '#314df6',
          width: 2
        }
      ];
    } else if (type && points.length > 2) {
      return undefined;
    }

    return [
      {
        points: points,
        color: '#314df6',
        width: 2
      }
    ];
  }, [points, type]);

  const polygon = useMemo(() => {
    const result = [
      {
        dashArray: [0, 0],
        points: type
          ? points.map(r => ({ latitude: r.latitude, longitude: r.longitude }))
          : land.landPoints,
        strokeWidth: 1,
        strokeColor: '#00B2D5',
        fillColor: '#00B2D54C'
      }
    ];
    if (!type && land.oldLandPoints?.length > 0) {
      result.push({
        dashArray: [0, 0],
        points: land.oldLandPoints,
        strokeWidth: 1,
        strokeColor: '#00B2D5',
        fillColor: '#00B2D54C'
      });
    }

    return result;
  }, [points, type, land]);

  const submit = useCallback(async () => {
    let arg: any = {};
    arg = {
      ...formData,
      pointType: isNumber(formData.pointType) ? formData.pointType : dotTypes[formData.pointType],
      areaId: site.current?.id
    }

    if (params.id) {
      arg.pointId = params.id;
    }
    console.log(11111, formData);
    const res: any = await (params.id ? edit(arg) : add(arg));

    if (res.code === 0) {
      Taro.navigateBack();
      Taro.showToast({
        title: '提交成功',
        icon: 'none',
        duration: 2000
      });
    } else {
      Taro.showToast({
        title: res.msg || '提交失败，请联系管理员',
        icon: 'none',
        duration: 2000
      });
    }
  }, [data, land, params, type, formData]);

  const handleConfirm = () => {
    // 调用 form 实例的 validateFields 方法
    formIt.validateFields((errorMessages, values) => {
      if (errorMessages && errorMessages.length > 0) {
          Taro.showToast({
            title: '请输入必填数据',
            icon: 'none',
            duration: 1000
          });
      } else {
        // 验证成功
        console.log('表单验证通过，提交数据:', values);
        const lonReg =
          /^-?(?:180(?:\.0+)?|1[0-7]\d(?:\.\d+)?|\d{1,2}(?:\.\d+)?)$/;
        if (!lonReg.test(values.lon)) {
          Taro.showToast({
            title: '请输入合法经度',
            icon: 'none',
            duration: 1000
          });
          return;
        }

        const latReg =
          /^-?(?:90(?:\.0+)?|[0-8]?\d(?:\.\d+)?)$/;
        if (!latReg.test(values.lat)) {
          Taro.showToast({
            title: '请输入合法纬度',
            icon: 'none',
            duration: 1000
          });
          return;
        }

        const altReg =
          /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

        if (!altReg.test(values.alt)) {
          Taro.showToast({
            title: '请输入合法高度',
            icon: 'none',
            duration: 1000
          });
          return;
        }
        setFormData(pre => ({
          ...pre,
          pointName: values.pointName,
          pointType: values.pointType
        }))
        setPoints([{ latitude: values.lat, longitude: values.lon, type: values.type }]);
        setData([{ lon: values.lat, lat: values.lon, alt: values.alt }])
        setShow(false);
      }
    });
  }

  return (
    <View className='page'>
      <DialogIns />
      <Dialog
        show={show}
        showCancelButton
        onConfirm={handleConfirm}
        onClose={() => {
          setShow(false);
        }}
      >
        <Form
          form={formIt}
          initialValues={formData}
          className='arg'
        >
          <FormItem
            label='点名称'
            name='pointName'
            required
            trigger='onInput'
            valueFormat={e => e.detail.value}
          >
            <Input style={{ width: '120px' }} />
          </FormItem>
          <FormItem
            label='点类型'
            name='pointType'
            trigger='onChange'
            required
            valueFormat={e => e.detail.value}
          >
            <Picker
              defaultIndex={0}
              itemHeight={28}
              visibleItemCount={2}
              columns={Object.values(dotTypes3)}
              style={{ width: '120px' }}
            />
          </FormItem>
          <FormItem
            label='经度'
            name='lon'
            required
            trigger='onInput'
            validateTrigger='onBlur'
            valueFormat={e => e.detail.value}
          >
            <Input type='text' style={{ width: '120px' }} disabled={type} />
          </FormItem>
          <FormItem
            label='纬度'
            name='lat'
            required
            trigger='onInput'
            validateTrigger='onBlur'
            valueFormat={e => e.detail.value}
          >
            <Input type='text' style={{ width: '120px' }} disabled={type} />
          </FormItem>
          <FormItem
            label='高度'
            name='alt'
            required
            trigger='onInput'
            validateTrigger='onBlur'
            valueFormat={e => e.detail.value}
            renderRight='米'
          >
            <Input type='digit' style={{ width: '120px' }} disabled={type} />
          </FormItem>
        </Form>

      </Dialog>
      <View className='map'>
        <Map
          id='map'
          longitude={117.15361207245223}
          latitude={36.65924761556728}
          // 缩放级别
          scale={20}
          // 支持缩放
          enableZoom
          // 支持拖动
          enableScroll
          // 标记点
          markers={markers}
          polyline={polyline}
          // 用户点击位置
          onTap={handleTap}
          style={{ width: '100%', height: '100%' }}
          onError={() => {
            console.log('onError错误');
          }}
          // includePadding={{ left: 120, right: 120, top: 140, bottom: 100 }}
          // 显示指南针
          // showCompass
          includePoints={points}
          // 多边形
          polygons={polygon}
          // 是否展示建筑物
          enableBuilding
          // 展示当前位置
          showLocation
          // 为了解决安卓bug问题
          setting={{}}
        />
      </View>
      <View className='operate'>
        <View className='operate-title'>
          <View style={{ color: '#1677FF' }} onClick={() => Taro.navigateBack()}>
            返回
          </View>
          <View style={{ fontWeight: '500' }}>轨迹点</View>
          <View style={{ color: '#1677FF' }} onClick={submit}>
            提交
          </View>
        </View>
        <Divider style={{ margin: '0 18px' }} />
        <View className='operate-content'>
          <View className='column-layout'>
          </View>
          <View className='location' onClick={onLocation}>
            <Image src={`${process.env.TARO_APP_UI}/location.png`} className='icon' />
          </View>
          <View className='column-layout'>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Index;
