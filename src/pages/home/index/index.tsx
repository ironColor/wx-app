import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View } from '@tarojs/components';
import { Swiper, SwiperItem, Image, Row, Col } from '@antmjs/vantui';
import './index.scss';
import * as COMMON from './common';
import { layout } from './layout';

const { images } = COMMON;
const Index = () => {
  const [site, setSite] = useState<any>();


  Taro.useDidShow(() => {
    Taro.getStorage({
      key: 'userInfo',
      fail: () =>
        Taro.showModal({
          title: '请先登录',
          content: '是否跳转到登录页面？',
          success: function (res) {
            if (res.confirm) {
              Taro.navigateTo({ url: `/pages/user/login/index` });
            }
          }
        })
    });
  });

  Taro.useDidShow(() => {
    Taro.getStorage({
      key: 'site',
      success: res => setSite(res.data),
      fail: () =>
        Taro.showModal({
          title: '请选择场地',
          content: '是否跳转到场地选择页面？',
          success: function (res) {
            if (res.confirm) {
              Taro.navigateTo({ url: `/pages/user/site/index` });
            }
          }
        })
    });
  });

  return (
    <View>
      <View
        onClick={() => Taro.navigateTo({ url: `/pages/user/site/index` })}
        style={{
          width: '100%',
          height: '36px',
          marginTop: '62px',
          marginLeft: '24px',
          color: '#4e4e4e'
        }}
      >
        <View style={{ fontWeight: 'bold' }}>{site?.name || '请选择场地'} &gt;</View>
      </View>
      <View
        style={{
          margin: 'auto',
          width: '90%'
        }}
      >
        <Swiper height={200} autoPlay={4000} paginationVisible style={{ borderRadius: '14px' }}>
          {images.map((item, index) => (
            <SwiperItem key={`swiper#${index}`}>
              <Image src={item} fit='cover' width='100%' height={`${200}px`} />
            </SwiperItem>
          ))}
        </Swiper>
      </View>
      <View style={{ width: '100%' }}>
        {layout.map(item => (
          <>
            <View style={{ margin: '24px 24px 0px', fontSize: '14px', color: '#ccc' }}>
              {item.title}
            </View>
            <Row gutter='20' style={{ margin: '10px 24px' }}>
              {item.type.map((type, index) => (
                <Col
                  key={index}
                  span='6'
                  style={{
                    padding: 0,
                    marginBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onClick={() => {
                    Taro.getStorage({
                      key: 'site',
                      success: res => {
                        site.current = res.data;
                        if (item.title === '其他') {
                          Taro.navigateTo({
                            url: `/pages/home/list/other/index?type=${item.title}&title=${type.title}`
                          });
                        } else {
                          Taro.navigateTo({
                            url: `/pages/home/list/index?type=${item.title}&title=${type.title}`
                          });
                        }
                      },
                      fail: () =>
                        Taro.showModal({
                          title: '请选择场地',
                          content: '是否跳转到场地选择页面？',
                          success: function (res) {
                            if (res.confirm) {
                              Taro.navigateTo({ url: `/pages/user/site/index` });
                            } else if (res.cancel) {
                              Taro.navigateBack();
                            }
                          }
                        })
                    });
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#d1d8ec',
                      height: '62px',
                      width: '62px',
                      borderRadius: '8px'
                    }}
                  >
                    <Image
                      src={`${process.env.TARO_APP_UI}/${type.title}.png`}
                      style={{ width: '62px', height: '62px' }}
                    />
                  </View>
                  <View
                    style={{
                      color: '#868686',
                      fontSize: '14Px'
                    }}
                  >
                    {type.title}
                  </View>
                </Col>
              ))}
            </Row>
          </>
        ))}
      </View>
    </View>
  );
};

export default Index;
