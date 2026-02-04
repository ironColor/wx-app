import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
/**
 * defineConfig 辅助函数
 * defineConfig 函数包裹配置对象，可以获得 类型提示 和 自动补全
 * @param merge - 为webpack-mergin, 兼容以前的配置
 * @param command, mode - "taro build --type weapp --mode development" 则 command 的值为 build, mode 的值为 development
 */
export default defineConfig(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport = {
    // 项目名称
    projectName: '光伏场地信息管理系统',
    // 项目创建日期
    date: '2024-4-10',
    // 设计稿尺寸
    designWidth: 750,
    // 设计稿尺寸换算规则
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    // 项目源码目录
    sourceRoot: 'src',
    // 项目产出目录
    outputRoot: `dist`,
    // Taro 插件配置
    plugins: [],
    // 全局变量设置
    defineConstants: {},
    // 文件 copy 配置
    copy: {
      patterns: [],
      options: {}
    },
    // 开发框架，（react，nerv，vue, vue3 等）
    framework: 'react',

    compiler: 'webpack5',
    cache: {
      // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
      enable: false
    },
    // 小程序端专用配置
    mini: {
      miniCssExtractPluginOption: {
        //忽略css文件引入顺序
        ignoreOrder: true
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        // 小程序端样式引用本地资源内联配置
        url: {
          enable: true,
          config: {
            limit: 1024 // 设定转换尺寸上限
          }
        },
        cssModules: {
          enable: true, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      // 自定义 Webpack 配置
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin);
      }
    },
    // H5 端专用配置
    h5: {
      // @antmjs/vantui配置，由于引用 node_modules 的模块，默认不会编译，所以需要额外给 H5 配置 esnextModules
      esnextModules: ['/@antmjs[/]vantui/'],
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: true, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin);
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  };
  // process.env.NODE_ENV === mode（变量)
  if (process.env.NODE_ENV === 'development') {
    console.log('运行模式：', command, ' 当前环境：', mode);
    // dev 独有配置，本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }

  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
