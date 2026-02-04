/**
 * 小程序全局配置
 */
export default defineAppConfig({
  // 页面路径列表
  pages: [
    'pages/home/index/index',
    'pages/home/gis/index',
    'pages/home/gis/diffGis/watering/index',
    'pages/home/list/index',
    'pages/browse/index/index',
    'pages/user/index/index',
    'pages/user/login/index',
    'pages/user/site/index',
    'pages/user/rtk/index',
    'pages/user/feedback/index',
    'pages/user/notice/index/index',
    'pages/user/notice/detail/index',
    'pages/user/bluetooth/index/index',
    'pages/home/list/other/index',
    'pages/home/gis/diffGis/point/index',
  ],
  // 全局的默认窗口表现
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  // 底部 tab 栏的表现
  tabBar: {
    // tab 列表
    list: [
      {
        text: '首页',
        pagePath: 'pages/home/index/index',
        iconPath: './assets/home.png',
        selectedIconPath: './assets/home-click.png'
      },
      {
        text: '浏览',
        pagePath: 'pages/browse/index/index',
        iconPath: './assets/browse.png',
        selectedIconPath: './assets/browse-click.png'
      },
      {
        text: '我的',
        pagePath: 'pages/user/index/index',
        iconPath: './assets/user.png',
        selectedIconPath: './assets/user-click.png'
      }
    ],
    // 文字选中时颜色
    selectedColor: '#314df6',
    // tabbar 上边框颜色
    borderStyle: 'white',
    // 文字颜色
    color: '#000000',
    // tab 的背景色
    backgroundColor: '#f6f6f6'
  },
  networkTimeout: {
    request: 60000,
    connectSocket: 60000,
    uploadFile: 180000,
    downloadFile: 300000
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于该页面地图定位'
    }
  },
  requiredPrivateInfos: ['getLocation']
});
