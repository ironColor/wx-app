// https://prettier.io/docs/en/options.html
module.exports = {
  // 使用单引号
  singleQuote: true,
  // 段落分号结尾
  semi: true,
  // 多行属性时，是否打印尾部逗号。默认值是 "es5"
  // "all" 尽可能添加逗号
  // "none" 不允许添加逗
  trailingComma: 'none',
  // 单行长度
  printWidth: 100,
  // 缩进风格，默认是 false，使用空格缩进
  useTabs: false,
  // 缩进长度
  tabWidth: 2,
  // 在 JSX 中使用单引号
  jsxSingleQuote: true,
  // 超过打印宽度时换行
  proseWrap: 'always',
  // 结尾换行符，可选"lf"、"cr"、"crlf"
  endOfLine: 'lf',
  // 是否保留对象内侧两端的空格，比如 { foo: bar }
  bracketSpacing: true,
  // 多行标签时，'>'另起一行闭合
  bracketSameLine: false,
  // JSX 标签多行属性时，'>'另起一行闭合
  jsxBracketSameLine: false,
  // 唯一参数的箭头函数，参数避免使用括号包裹
  arrowParens: 'avoid',
  // 对象中属性是否使用引号，默认为 as-needed
  // "as-needed" 只对需要的属性加引号，
  // "consistent" 同一对象中属性引号保持统一
  // "preserve" 强制使用引号。
  quoteProps: 'as-needed',
  // 覆盖特定文件配置
  overrides: [
    {
      files: '.prettierrc',
      options: {
        // 指定解析器
        parser: 'json'
      }
    },
    {
      files: 'document.ejs',
      options: {
        parser: 'html'
      }
    }
  ]
};
