import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Input, Map, View } from '@tarojs/components';
import {
  Dialog,
  Divider,
  Field,
  Form,
  FormItem,
  Picker,
  Radio,
  RadioGroup,
  Slider
} from '@antmjs/vantui';
import { dotlist, dotTypes, dotTypes2, taskTypes2 } from '@/pages/home/index/common';
import { getAuth } from '@/utils/util.js';
import {DataItem, wateringItem, wsDataItem} from '@/pages/types';
import mqtt from '@/utils/mqtt.min.js';
import gcoord from 'gcoord';
import { add, detail, edit, gen, list } from './servers';
import './index.scss';

const DialogIns = Dialog.createOnlyDialog();

const Index = () => {
  const formIt = Form.useForm();
  // 路由信息
  const { params } = Taro.useRouter();
  // 打点功能/查看功能
  const [flag, setFlag] = useState<0 | 1 | 2>(0);
  // 地块：true，任务：false
  const [type, setType] = useState(true);
  // 存储数据
  const [data, setData] = useState<DataItem[]>([]);
  // RTK状态
  const [wsState, setWsState] = useState(false);
  // RTK实时数据
  const [wsData, setWsData] = useState<wsDataItem>();
  // 按钮选择
  const [radio, setRadio] = useState(0);
  // 经纬度点
  const [points, setPoints] = useState<{ latitude: number; longitude: number; type: string }[]>([]);
  // 地块信息
  const [land, setLand] = useState<{landId: number, landPoints: any[]}>({ landId: 0, landPoints: [] });
  // 作业设置
  const [work, setWork] = useState<wateringItem>({ width: 2, start: 1, direction: 2, height: 3, speed: 3 });
  // 场地信息
  const site = useRef<{ name: string; id: number }>({ name: '', id: 0 });
  // 地图实例
  const mapRef = useRef<any>(null);
  // RTK ID
  const rtk = useRef<string>('');
  // MQTT实例
  const client = useRef<any>(null);

  useEffect(() => {
    getAuth('userLocation', !params.id && initLocation);

    // 创建 MapContext 实例并保存在 ref 中
    mapRef.current = Taro.createMapContext('map');
    // 连接MQTT Socket
    !client.current && initSocket();
    Taro.setNavigationBarTitle({ title: `${params.title}${params.type}打点` });
    // 获取场地信息
    Taro.getStorage({
      key: 'site',
      success: res => {
        site.current = res.data;
        // 获取地块信息；如果路由地址有id值，代表是修改，则不提供选择地块，新建任务时获取供用户选择的地块
        !params.id &&
          params.type !== '地块' &&
          list({ areaId: res.data.id }).then(r => selectedLand(r.data));
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
        console.log(result);
      });
      // 订阅主题
      subscribe();
    });

    // 修改，路由地址id值存在，代表是修改
    params.id &&
      detail({ id: params.id, type: params.type === '地块' }).then(r => {
        const point =
          params.type === '地块'
            ? r.landPoints
            : r.planInfo.map(i => ({ ...i, type: dotTypes2[i.type] }));
        setData(point);
        setLand({
          landId: r.landId,
          landPoints: r.landPoints?.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { ...i, latitude: lat, longitude: lon };
          })
        });

        setPoints(
          point.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { latitude: lat, longitude: lon, type: i.type };
          })
        );
        const { startPoint, width, speed, relativeAlt, directionPoint } = r.extendParam;
        setWork({
          start: startPoint,
          width,
          speed,
          height: relativeAlt,
          direction: directionPoint
        });
      });

    return () => close();
  }, []);

  Taro.useDidShow(() => {
    Taro.getStorage({
      key: 'rtk',
      success: res => (rtk.current = res.data),
      fail: () =>
        Taro.showModal({
          title: '设备获取失败，请选择RTK',
          content: '是否跳转到RTK选择页面？',
          success: function (res) {
            if (res.confirm) {
              Taro.navigateTo({ url: `/pages/user/rtk/index` });
            } else if (res.cancel) {
              Taro.navigateBack();
            }
          }
        })
    });
  });

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

  const selectedLand = useCallback(
    async landList => {
      console.log('landList', landList);
      const result = await DialogIns.confirm({
        title: '请选择地块',
        message: (
          <Form form={formIt} className='arg'>
            <FormItem name='landId' layout='vertical' label={undefined}>
              <Picker
                itemHeight={32}
                visibleItemCount={5}
                defaultIndex={0}
                columns={landList.map(i => ({ id: i.landId, text: i.landName }))}
                style={{ width: '120px' }}
              />
            </FormItem>
          </Form>
        )
      });
      if (result === 'cancel') {
        Taro.navigateBack();
      }
      const landId = formIt.getFieldValue('landId')?.value.id || landList[0].landId;

      const getLandPoints = id =>
        landList
          .find(i => i.landId === id)
          ?.landPoints?.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { ...i, latitude: lat, longitude: lon };
          });

      setLand({
        landId: landId,
        landPoints: getLandPoints(landId)
      });
    },
    [formIt]
  );

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

  const onLocation = async () => {
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

    if (data.length >= 1) {
      setFlag(2);
      return;
    }

    const values: any = !type && (await argDialog(true, wsData.alt));
    if (!values && !type) return;
    const [lon, lat] = gcoord.transform([wsData.lon, wsData.lat], gcoord.WGS84, gcoord.GCJ02);
    setPoints(prevData => prevData.concat({ latitude: lat, longitude: lon, type: values.type }));

    setData(prevData =>
      prevData.concat({
        lon: wsData.lon,
        lat: wsData.lat,
        alt: wsData.alt,
        type: values.type,
        speed: values.speed,
        relativeAlt: values.relativeAlt
      })
    );

    if (data.length === 1 || data.length === 2) {
      setFlag(2);
    }
  };

  const argDialog = async (isEdit: boolean, value: number) => {
    // 没有数据，不弹出编辑的弹窗
    if (!isEdit && value === 0 && data.length === 0) {
      return;
    }
    const dotType = dotlist[params.title || ''];
    console.log('data', data[radio]);

    const result = await DialogIns.confirm({
      title: ``,
      message: (
        <Form
          form={formIt}
          initialValues={
            !isEdit
              ? data[radio]
              : {
                  type: '起飞点',
                  speed: 1,
                  relativeAlt: 3
                }
          }
          className='arg'
        >
          {!type && (
            <>
              <FormItem
                label='航点类型'
                name='type'
                trigger='onChange'
                required
                valueFormat={e => e.detail.value}
              >
                <Picker
                  itemHeight={28}
                  visibleItemCount={2}
                  defaultIndex={
                    !isEdit ? dotType.findIndex(r => r === data[radio].type) : undefined
                  }
                  columns={dotType}
                  style={{ width: '120px' }}
                />
              </FormItem>
              <FormItem
                label='飞行速度'
                name='speed'
                required
                trigger='onInput'
                validateTrigger='onBlur'
                valueFormat={e => e.detail.value}
                renderRight='米/秒'
              >
                <Input type='digit' maxlength={6} style={{ width: '120px' }} />
              </FormItem>
            </>
          )}
          <FormItem
            label={`${type ? '地块高度' : '飞行高度'}`}
            name='relativeAlt'
            required
            trigger='onInput'
            validateTrigger='onBlur'
            valueFormat={e => e.detail.value}
            renderRight='米'
          >
            <Input type='digit' maxlength={6} style={{ width: '120px' }} disabled={type} />
          </FormItem>
        </Form>
      )
    });
    if (result === 'cancel') {
      return;
    }

    // 编辑，坐标修正
    if (!isEdit) {
      // 修改后更新data数据
      setData(prevData => {
        const newData = [...prevData];
        newData[value] = {
          ...newData[value],
          ...formIt.getFieldsValue()
        };
        return newData;
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
  };

  const radioClick = useCallback((lon, lat, i) => {
    mapRef.current?.removeMarkers({ markerIds: [999] });
    mapRef.current?.addMarkers({
      markers: [
        {
          id: 999,
          latitude: lat,
          longitude: lon,
          iconPath: `${process.env.TARO_APP_UI}/display.png`,
          alpha: 1,
          width: 11,
          height: 11,
          anchor: { x: 0.5, y: 0.5 },
          callout: {
            content: `${i}`,
            color: '#222222',
            fontSize: 14,
            borderRadius: 5,
            borderWidth: 0,
            padding: 8,
            display: 'ALWAYS', // ALWAYS，BYCLICK
            bgColor: '#fff'
          }
        }
      ]
    });
  }, []);

  /**
   * 撤销功能
   */
  const delLocation = useCallback(() => {
    if (data.length > 1) {
      setData(prevData => [prevData[0]]);
      setPoints(prevData => [prevData[0]]);
    } else if (data.length <= 0) {
      Taro.showToast({
        title: '已撤销所有点',
        icon: 'none',
        duration: 2000
      });
    } else {
      // 删除数组中最后一个点
      setData(prevData => prevData.slice(0, -1));
      setPoints(prevData => prevData.slice(0, -1));
    }
  }, [data]);

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

  /**
   * 任务轨迹渲染
   */
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

  /**
   * 地块渲染
   */
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
    return result;
  }, [points, type, land]);

  const submit = useCallback(async () => {
    if (data.length < 2) {
      Taro.showToast({
        title: '不能少于两个点',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (data[0].type !== '起飞点') {
      Taro.showToast({
        title: '请检查第一个点是否为起飞点',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    let name = params.name || `${params.title}${params.type}`;
    const result = await DialogIns.confirm({
      title: `提交任务`,
      message: (
        <Field
          required
          clearable
          border={false}
          label='任务名称'
          value={name}
          onChange={e => (name = e.detail)}
        />
      )
    });
    if (result === 'cancel') return;

    const arg = {
      type: type,
      taskName: name,
      taskType: taskTypes2[params.title!],
      planInfo: data.map((item, index) => ({
        ...item,
        serial: index,
        type: dotTypes[item.type]
      })),
      landId: land.landId,
      areaId: site.current.id,
      taskId: params.id,
      extendParam: {
        startPoint: work.start,
        directionPoint: work.direction,
        width: work.width,
        speed: work.speed,
        relativeAlt: work.height
      }
    };

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
  }, [data, land, params, type]);

  const itemProps = {
    activeColor: '#1677FF',
    barHeight: '3px',
    className: 'generate-content-item-value'
  };

  const generate = useCallback(async () => {
    if (
      !(
        Math.abs(work.start - work.direction) === 1 ||
        (work.start === 1 && work.direction === 4) ||
        (work.start === 4 && work.direction === 1)
      )
    ) {
      Taro.showToast({
        title: '请选择相邻的方向点',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 已规划过，重新规划时，删除之前规划的轨迹
    if (data.length >= 1) {
      setData(prevData => [prevData[0]]);
      setPoints(prevData => [prevData[0]]);
    }
    const result: any = await gen({
      landPoints: land.landPoints,
      startPoint: work.start,
      directionPoint: work.direction,
      width: work.width,
      relativeAlt: work.height,
      speed: work.speed
    });

    if (result.code !== 0) {
      Taro.showToast({
        title: result.msg || '路径规划失败',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    setPoints(prevData => {
      return [
        prevData[0],
        ...result.data.map(i => {
          const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
          return {
            latitude: lat,
            longitude: lon,
            type: dotTypes2[i.type]
          };
        })
      ];
    });

    setData(prevData => [
      prevData[0],
      ...result.data.map(i => ({
        ...i,
        speed: work.speed,
        type: dotTypes2[i.type]
      }))
    ]);
    setFlag(0);
  }, [data, land, work]);

  return (
    <View className='page'>
      <DialogIns />
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
          includePadding={{ left: 120, right: 120, top: 140, bottom: 100 }}
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
      {flag === 0 && (
        <View className='operate'>
          <View className='operate-title'>
            <View style={{ color: '#1677FF' }} onClick={() => Taro.navigateBack()}>
              返回
            </View>
            <View style={{ fontWeight: '500' }}>新 建 {type ? '地 块' : '任 务'}</View>
            <View style={{ color: '#1677FF' }} onClick={submit}>
              提交
            </View>
          </View>
          <Divider style={{ margin: '0 18px' }} />
          <View className='operate-content'>
            <View className='column-layout' onClick={() => setFlag(1)}>
              <Image src={`${process.env.TARO_APP_UI}/edit.png`} className='icon' />
              <View className='column-layout-text'>查看</View>
            </View>
            <View className='location' onClick={onLocation}>
              <Image
                src={`${process.env.TARO_APP_UI}/${data.length >= 1 ? 'generate' : 'location'}.png`}
                className='icon'
              />
            </View>
            <View className='column-layout' onClick={delLocation}>
              <Image src={`${process.env.TARO_APP_UI}/revoke.png`} className='icon' />
              <View className='column-layout-text'>撤销</View>
            </View>
          </View>
        </View>
      )}
      {flag === 1 && (
        <View className='edit'>
          <View className='edit-title'>
            <View style={{ color: '#1677FF' }} onClick={() => setFlag(0)}>
              返回
            </View>
            <View className='edit-title-desc'>
              {data &&
                data[radio] &&
                `${data[radio].type || ''} ${data[radio].speed ? `速度:${data[radio].speed}m/s` : ''} 高度:${data[radio].relativeAlt}m`}
            </View>
          </View>
          <Divider style={{ margin: '0 18px' }} />
          <View className='edit-content'>
            <View>
              <RadioGroup
                value={radio}
                onChange={e => {
                  setRadio(e.detail);
                  radioClick(points[e.detail].longitude, points[e.detail].latitude, e.detail + 1);
                }}
                className='edit-content-radio'
              >
                {data?.map((_, index) => (
                  <Radio key={index} name={index}>
                    {index + 1}
                  </Radio>
                ))}
              </RadioGroup>
            </View>
            <Divider className='edit-content-divider' />
            <View className='edit-content-operate'>
              <View onClick={() => argDialog(false, radio)}>编辑</View>
              <View onClick={delLocation}>撤销</View>
            </View>
          </View>
        </View>
      )}
      {flag === 2 && (
        <View className='generate'>
          <View className='generate-banner'>
            <View style={{ color: '#1677FF' }} onClick={() => setFlag(0)}>
              返回
            </View>
            <View style={{ fontWeight: '500' }}>作 业 设 置</View>
            <View style={{ color: '#1677FF' }} onClick={generate}>
              规划
            </View>
          </View>
          <Divider style={{ margin: '0 18px' }} />
          {/* 设置内容 */}
          <View className='generate-content'>
            {/* 宽幅 */}
            <View className='generate-content-item'>
              <View className='generate-content-item-title'>宽幅</View>
              <Slider
                {...itemProps}
                min={0.3}
                max={3}
                step={0.1}
                value={work.width}
                onDrag={e =>
                  setWork(prevState => ({ ...prevState, width: +e.detail.value.toFixed(1) }))
                }
                onChange={e =>
                  setWork(prevState => ({ ...prevState, width: +e.detail.toFixed(1) }))
                }
                renderButton={<View className='customButton'>{work.width}m</View>}
              />
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.width > 0.3) {
                    setWork(prevState => ({
                      ...prevState,
                      width: +(prevState.width - 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                -
              </View>
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.width < 3) {
                    setWork(prevState => ({
                      ...prevState,
                      width: +(prevState.width + 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                +
              </View>
            </View>
            {/* 起始点 */}
            <View className='generate-content-item'>
              <View className='generate-content-item-title'>起始点</View>
              <Slider
                {...itemProps}
                min={1}
                max={4}
                value={work.start}
                onDrag={e => setWork(prevState => ({ ...prevState, start: e.detail.value }))}
                onChange={e => {
                  radioClick(
                    land.landPoints[e.detail - 1].longitude,
                    land.landPoints[e.detail - 1].latitude,
                    e.detail
                  );
                  setWork(prevState => ({ ...prevState, start: e.detail }));
                }}
                renderButton={<View className='customButton'>{work.start}</View>}
              />
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.start > 1) {
                    setWork(prevState => ({
                      ...prevState,
                      start: prevState.start - 1
                    }));
                  }
                }}
              >
                -
              </View>
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.start < 4) {
                    setWork(prevState => ({
                      ...prevState,
                      start: prevState.start + 1
                    }));
                  }
                }}
              >
                +
              </View>
            </View>
            {/* 方向点 */}
            <View className='generate-content-item'>
              <View className='generate-content-item-title'>方向点</View>
              <Slider
                {...itemProps}
                min={1}
                max={4}
                value={work.direction}
                onDrag={e => setWork(prevState => ({ ...prevState, direction: e.detail.value }))}
                onChange={e => {
                  radioClick(
                    land.landPoints[e.detail - 1].longitude,
                    land.landPoints[e.detail - 1].latitude,
                    e.detail
                  );
                  setWork(prevState => ({ ...prevState, direction: e.detail }));
                }}
                renderButton={<View className='customButton'>{work.direction}</View>}
              />
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.direction > 1) {
                    setWork(prevState => ({
                      ...prevState,
                      direction: prevState.direction - 1
                    }));
                  }
                }}
              >
                -
              </View>
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.direction < 4) {
                    setWork(prevState => ({
                      ...prevState,
                      direction: prevState.direction + 1
                    }));
                  }
                }}
              >
                +
              </View>
            </View>
            {/* 高度 */}
            <View className='generate-content-item'>
              <View className='generate-content-item-title'>高度</View>
              <Slider
                {...itemProps}
                min={3}
                max={10}
                step={0.1}
                value={work.height}
                onDrag={e =>
                  setWork(prevState => ({ ...prevState, height: +e.detail.value.toFixed(1) }))
                }
                onChange={e =>
                  setWork(prevState => ({ ...prevState, height: +e.detail.toFixed(1) }))
                }
                renderButton={<View className='customButton'>{work.height}m</View>}
              />
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.height > 3) {
                    setWork(prevState => ({
                      ...prevState,
                      height: +(prevState.height - 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                -
              </View>
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.height < 10) {
                    setWork(prevState => ({
                      ...prevState,
                      height: +(prevState.height + 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                +
              </View>
            </View>
            {/* 速度 */}
            <View className='generate-content-item'>
              <View className='generate-content-item-title'>速度</View>
              <Slider
                {...itemProps}
                min={0}
                max={10}
                step={0.1}
                value={work.speed}
                onDrag={e =>
                  setWork(prevState => ({ ...prevState, speed: +e.detail.value.toFixed(1) }))
                }
                onChange={e =>
                  setWork(prevState => ({ ...prevState, speed: +e.detail.toFixed(1) }))
                }
                renderButton={<View className='customButton'>{work.speed}m/s</View>}
              />
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.speed > 0) {
                    setWork(prevState => ({
                      ...prevState,
                      speed: +(prevState.speed - 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                -
              </View>
              <View
                className='generate-content-item-step'
                onClick={() => {
                  if (work.speed < 10) {
                    setWork(prevState => ({
                      ...prevState,
                      speed: +(prevState.speed + 0.1).toFixed(1)
                    }));
                  }
                }}
              >
                +
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default Index;
