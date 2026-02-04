// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true
      }
    ]
  ],
  // @antmjs/vantui组件库按需引入配置（babel-plugin-import 插件）
  plugins: [
    [
      'import',
      {
        libraryName: '@antmjs/vantui',
        libraryDirectory: 'es',
        style: true
      },
      '@antmjs/vantui'
    ]
  ]
};
