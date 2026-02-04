import { FunctionComponent } from 'react'
import { ViewProps } from '@tarojs/components'

export interface CheckListProps extends ViewProps {
  /**
   * @description 是否禁用
   * @default false
   */
  disabled?: boolean
  /**
   * @description 选择提示和弹窗标题
   * @default 请选择
   */
  placeholder?: string
  /**
   * @description 搜索过滤的提示
   * @default 请输入搜索关键词
   */
  searchPlaceholder?: string
  /**
   * @description 数据列表
   * @default []
   */
  data?: Array<Record<string, any>>
  /**
   * @description 回调方法, 参数一和其他表单统一，参数二选中的具体数据
   */
  onChange?: (
    e: {},
    d: {},
  ) => void
  /**
   * @description 数据对象label的key
   * @default name
   */
  labelName?: string
  /**
   * @description 数据对象值的key
   * @default id
   */
  fieldName?: string
  /**
   * @description 勾选容器的高度
   * @default 40vh
   */
  bodyHeight?: string
  /**
   * @description 自定义渲染
   */
  renderShow?: (
    data: Array<Record<string, any>>,
    setShow: () => void,
  ) => React.ReactNode
  /**
   * @description 是否展示搜索框
   * @default true
   */
  searchShow?: boolean
  /**
   * @description 列表数据加载的loading
   * @default false
   */
  searchLoading?: boolean
}

declare const CheckList: FunctionComponent<CheckListProps>

export { CheckList }
