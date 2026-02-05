import Taro from '@tarojs/taro';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Input, Map, Text, View } from '@tarojs/components';
import {
  Dialog,
  Divider,
  Field,
  Form,
  FormItem,
  Picker,
  Radio,
  RadioGroup
} from '@antmjs/vantui';
import { dotlist, dotTypes, dotTypes2, siteTypes2, taskTypes2 } from '@/pages/home/index/common';
import { getAuth } from '@/utils/util.js';
import gcoord from 'gcoord';
import mqtt from '@/utils/mqtt.min.js';
import { DataItem, wsDataItem, landItem } from '@/pages/types';
import CheckList from '@/components/search-list';
import {add, detail, edit, list, taskList} from './servers';
import styles from './index.module.scss';

const DialogIns = Dialog.createOnlyDialog();

const Index = () => {
  const formIt = Form.useForm();
  // 路由信息
  const { params } = Taro.useRouter();
  // 打点功能/查看功能
  const [flag, setFlag] = useState(true);
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
  // RTK ID
  const rtk = useRef<string>('');
  // MQTT实例
  const client = useRef<any>(null);
  // 所有任务数据（复用功能）
  const [taskData, setTaskData] = useState<any[]>([]);

  const [originPlotId, setOriginPlotId] = useState();
  const [originArrayId, setArrayId] = useState();
  const [originStrId, setOriginStrId] = useState();

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
        // 复用功能
        taskList({ areaId: res.data.id }).then(r => setTaskData(r.data));
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
        setOriginPlotId(r.plotId);
        setOriginStrId(r.strId);
        setArrayId(r.arrayId);
        setData(point);
        setLand({
          landId: r.landId,
          landPoints: r.landPoints?.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { latitude: lat, longitude: lon };
          }),
          oldLandId: r.oldLandId,
          oldLandPoints: r.oldLandPoints?.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { latitude: lat, longitude: lon };
          })
        });

        setPoints(
          point.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { latitude: lat, longitude: lon, type: i.type };
          })
        );
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

  const selectedLand = useCallback(
    async landList => {
      console.log('landList', landList);
      const result = await DialogIns.confirm({
        title: '请选择地块',
        message: (
          <Form form={formIt} className={styles['arg']}>
            {params.title === '转移' && (
              <FormItem
                name='oldLandId'
                layout='vertical'
                label={<View style={{ fontWeight: 'bold', width: '100px' }}>转移前地块</View>}
              >
                <Picker
                  itemHeight={32}
                  visibleItemCount={5}
                  defaultIndex={0}
                  columns={landList.map(i => ({ id: i.landId, text: i.landName }))}
                  style={{ width: '120px' }}
                />
              </FormItem>
            )}
            <FormItem
              name='landId'
              layout='vertical'
              label={
                params.title === '转移' && (
                  <View style={{ fontWeight: 'bold', width: '100px' }}>请选择地块</View>
                )
              }
            >
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
      // 转移任务,获取转移前地块id,默认选中第一个地块
      const oldLandId =
        params.title === '转移' &&
        (formIt.getFieldValue('oldLandId')?.value.id || landList[0].landId);
      const landId = formIt.getFieldValue('landId')?.value.id || landList[0].landId;

      const getLandPoints = id =>
        landList
          .find(i => i.landId === id)
          ?.landPoints?.map(i => {
            const [lon, lat] = gcoord.transform([i.lon, i.lat], gcoord.WGS84, gcoord.GCJ02);
            return { latitude: lat, longitude: lon };
          });

      setLand({
        landId: landId,
        landPoints: getLandPoints(landId),
        oldLandId: oldLandId,
        oldLandPoints: getLandPoints(oldLandId)
      });
      // 定位当前选中地块位置
      mapRef.current?.moveToLocation({
        longitude: getLandPoints(landId)[0].longitude,
        latitude: getLandPoints(landId)[0].latitude
      });
    },
    [formIt, params.title]
  );

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

    const values: any = !type && (await argDialog(true, wsData.alt));
    if (!values && !type) return;
    const [lon, lat] = gcoord.transform([wsData.lon, wsData.lat], gcoord.WGS84, gcoord.GCJ02);
    setPoints(prevData => prevData.concat({ latitude: lat, longitude: lon, type: values.type }));

    setData(prevData => {
        if (prevData.length === 4) {
          Taro.showToast({
            title: '只能四个点...',
            icon: 'none',
            duration: 1000
          });
          return  prevData
        }
        return prevData.concat({
          lon: wsData.lon,
          lat: wsData.lat,
          alt: wsData.alt,
          type: values.type,
          speed: values.speed,
          relativeAlt: values.relativeAlt
        })
      }
    );
  }, [type, wsData, wsState]);

  /**
   * 更新坐标
   */
  const update = useCallback(() => {
    if (wsData?.stat !== '4') {
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
    async (isAdd: boolean, args: number) => {
      // 没有数据，不弹出编辑的弹窗
      if (!isAdd && args === 0 && data.length === 0) {
        return;
      }
      const dotType = dotlist[params.title || ''];
      console.log('弹窗数据:', data[radio]);
      const result = await DialogIns.confirm({
        title: ``,
        message: (
          <>
            {!isAdd && (
              <View className={styles['top-info']}>
                经度：{data[radio].lon} 纬度: {data[radio].lat}
                <Text className={styles['update']} onClick={update}>
                  更新
                </Text>
              </View>
            )}
            <Form
              form={formIt}
              initialValues={
                !isAdd
                  ? data[radio]
                  : {
                      type: '起飞点',
                      speed: 1,
                      relativeAlt: 3,
                      alt: args
                    }
              }
              className={styles['arg']}
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
                        !isAdd ? dotType.findIndex(r => r === data[radio].type) : undefined
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
                  <FormItem
                    label='飞行高度'
                    name='relativeAlt'
                    required
                    trigger='onInput'
                    validateTrigger='onBlur'
                    valueFormat={e => e.detail.value}
                    renderRight='米'
                  >
                    <Input type='digit' maxlength={6} style={{ width: '120px' }} disabled={type} />
                  </FormItem>
                </>
              )}
              <FormItem
                label={`${type ? '地块高度' : '海拔高度'}`}
                name='alt'
                required
                renderRight='米'
              >
                <Input style={{ width: '120px' }} disabled />
              </FormItem>
            </Form>
          </>
        )
      });
      if (result === 'cancel') {
        return;
      }

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
    [data, formIt, params, radio, type, update]
  );

  const radioClick = useCallback(
    e => {
      mapRef.current?.removeMarkers({ markerIds: [999] });
      setRadio(e);
      mapRef.current?.addMarkers({
        markers: [
          {
            id: 999,
            latitude: points[e].latitude,
            longitude: points[e].longitude,
            iconPath: `${process.env.TARO_APP_UI}/display.png`,
            alpha: 1,
            width: 11,
            height: 11,
            anchor: { x: 0.5, y: 0.5 },
            callout: {
              content: `${e + 1}`,
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
    },
    [points]
  );

  const delLocation = () => {
    if (flag) {
      setData(preData => preData.slice(0, -1));
      setPoints(preData => preData.slice(0, -1));
      if (data.length === 0) {
        Taro.showToast({
          title: '已撤销所有点',
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      setPoints(preData => preData.filter((_, index) => index !== radio));
      setData(prevData => prevData.filter((_, index) => index !== radio));
    }
  };

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
    if (data.length !== 4) {
      Taro.showToast({
        title: '必须四个点',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (!type && data[0].type !== '起飞点') {
      Taro.showToast({
        title: '请检查第一个点是否为起飞点',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    let name = params.name || `${params.title}${params.type}`;
    let plotId = originPlotId, arrayId = originArrayId, strId = originStrId;


    const result = await DialogIns.confirm({
      title: `提交${type ? '地块' : '任务'}`,
      message: (
        <>
          {
            type ? <>
                <Field
                  required
                  clearable
                  border={false}
                  label='地块号'
                  value={plotId}
                  onChange={e => (plotId = e.detail)}
                  placeholder='请输入数字'
                />
                <Field
                  required
                  clearable
                  border={false}
                  label='矩阵号'
                  value={arrayId}
                  onChange={e => (arrayId = e.detail)}
                  placeholder='请输入数字'
                />
                <Field
                  required
                  clearable
                  border={false}
                  label='组串号'
                  value={strId}
                  onChange={e => (strId = e.detail)}
                  placeholder='请输入数字'
                />
            </> :
              <Field
                required
                clearable
                border={false}
                label={`${type ? '地块' : '任务'}名称`}
                value={name}
                onChange={e => (name = e.detail)}
              />
          }
        </>
      )
    });
    if (result === 'cancel') return;

    let arg = {};
    if (type) {
      const reg = /^\d+$/;
      if (!reg.test(plotId) || !reg.test(arrayId) || !reg.test(strId)) {
        Taro.showToast({
          title: '请输入数字',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      arg = {
        plotId,
        arrayId,
        strId,
        type: type,
        landName: name,
        landType: siteTypes2[params.title!],
        landHeight: Math.max(...data.map(item => item.alt)),
        landPoints: data.map((item, index) => ({
          serial: index,
          ...item
        })),
        areaId: site.current.id,
        landId: params.id
      };
    } else {
      arg = {
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
        oldLandId: params.title === '转移' ? land.oldLandId : undefined,
        taskId: params.id
      };
    }

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
  }, [data, land.landId, land.oldLandId, originArrayId, originPlotId, originStrId, params.id, params.name, params.title, params.type, type]);

  const onChange = (e) => {
    const [lon, lat] = gcoord.transform([e.lon, e.lat], gcoord.WGS84, gcoord.GCJ02);
    setPoints(prevData => prevData.concat({ latitude: lat, longitude: lon, type: dotTypes2[e.type] }));

    setData(prevData =>
      prevData.concat({
        lon: e.lon,
        lat: e.lat,
        alt: e.alt,
        type: dotTypes2[e.type],
        speed: e.speed,
        relativeAlt: e.relativeAlt
      })
    );
  };

  return (
    <View className={styles.page}>
      <DialogIns />
      <View className={styles.map}>
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
      {flag ? (
        <View className={styles.operate}>
          <View className={styles['operate-title']}>
            <View style={{ color: '#1677FF' }} onClick={() => Taro.navigateBack()}>
              返回
            </View>
            <View style={{ fontWeight: '500' }}>新 建 {type ? '地 块' : '任 务'}</View>
            <View style={{ color: '#1677FF' }} onClick={submit}>
              提交
            </View>
          </View>
          <Divider style={{ margin: '0 18px' }} />
          <View className={styles['operate-content']}>
            <View className={styles['column-layout']} onClick={() => setFlag(false)}>
              <Image src={`${process.env.TARO_APP_UI}/edit.png`} className={styles['icon']} />
              <View className={styles['column-layout-text']}>查看</View>
            </View>
            <View className={styles['location']} onClick={onLocation}>
              <Image src={`${process.env.TARO_APP_UI}/location.png`} className={styles['icon']} />
            </View>
            <View className={styles['column-layout']} onClick={delLocation}>
              <Image src={`${process.env.TARO_APP_UI}/revoke.png`} className={styles['icon']} />
              <View className={styles['column-layout-text']}>撤销</View>
            </View>
          </View>
        </View>
      ) : (
        <View className={styles['edit']}>
          <View className={styles['edit-title']}>
            <View style={{ color: '#1677FF' }} onClick={() => setFlag(true)}>
              返回
            </View>
            <View className={styles['edit-title-desc']}>
              {data &&
                data[radio] &&
                `${data[radio].type || ''} ${data[radio].speed ? `速度:${data[radio].speed}米/秒` : ''} 高度:${type ? data[radio].alt : data[radio].relativeAlt}米`}
            </View>
          </View>
          <Divider style={{ margin: '0 18px' }} />
          <View className={styles['edit-content']}>
            <View>
              <RadioGroup
                value={radio}
                onChange={e => radioClick(e.detail)}
                className={styles['edit-content-radio']}
              >
                {data?.map((_, index) => (
                  <Radio key={index} name={index}>
                    {index + 1}
                  </Radio>
                ))}
                <CheckList onChange={onChange} data={taskData} />
              </RadioGroup>
            </View>
            <Divider className={styles['edit-content-divider']} />
            <View className={styles['edit-content-operate']}>
              <View onClick={() => argDialog(false, radio)}>编辑</View>
              <View onClick={delLocation}>删除</View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default Index;
