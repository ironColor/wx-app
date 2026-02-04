import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View } from '@tarojs/components';
import { Search, Popup, Button, Empty, Loading } from '@antmjs/vantui';
import { CheckListProps } from './check-list';
import './index.scss';

export function CheckList(props: CheckListProps) {
  const {
    disabled = false,
    data = [],
    bodyHeight,
    onChange,
    searchLoading = false,
    placeholder = '请选择',
    searchPlaceholder = '请输入搜索关键词',
    searchShow = true,
    ...others
  } = {
    ...props
  };
  // 弹出框显示控制
  const [show, setShow] = useState<boolean>(false);
  // 已选中id（left:左侧元素id；right:右侧元素index)
  const [id, setId] = useState<{ left: number; right: number }>({ left: -1, right: -1 });
  // 搜索关键词
  const [keyWord, setKeyWord] = useState('');
  // 列表展示的所有数据
  const [innerData, setData] = useState<Record<string, any>[]>([]);
  // 加载状态
  const [loading, setLoading] = useState(false);

  const handleCheck = useCallback(
    (flag: boolean, d: number) => {
      if (loading) return;
      if (flag) {
        setId({ left: d, right: -1 });
      } else {
        setId(i => ({ left: i?.left, right: d }));
      }
    },
    [loading]
  );

  const set_Show = () => {
    if (!disabled) {
      setShow(true);
    }
  };

  const handleConfirm = useCallback(() => {
    const [cData] = data.filter(d => d.taskId === id.left);
    onChange?.(cData.planInfo[id.right], cData);
    setShow(false);
    setId({ left: -1, right: -1 });
    setKeyWord('');
  }, [data, id]);


  useEffect(() => {
    setLoading(searchLoading);
  }, [searchLoading]);

  useLayoutEffect(() => {
    setData(data);
  }, []);

  // 每次渲染都会执行
  useDebounce(
    keyWord,
    async vv => {
      if (show) {
        if (vv) {
          const fData =
            data?.filter(it => {
              return it.taskName.includes(vv);
            }) || [];
          setData(fData);
        } else {
          setData(data);
        }
      } else {
        setData(data);
      }
    },
    800
  );

  return (
    <View className='van-check-list-wrapper' {...others}>
      <View onClick={set_Show} className='add-radio'>
        +
      </View>
      <Popup show={show} position='bottom' onClose={() => setShow(false)}>
        <View className='check-list-title'>{placeholder}</View>
        {searchShow && (
          <Search
            shape='round'
            value={keyWord}
            onChange={e => setKeyWord(e.detail)}
            placeholder={searchPlaceholder}
            background='#f5f5f5'
          />
        )}
        <View className='check-list-body' style={{ height: bodyHeight || '40vh' }}>
          {loading && (
            <View className='check-list-loading'>
              <Loading />
            </View>
          )}
          {!loading && innerData.length === 0 && (
            <View className='check-list-empty'>
              <Empty description='暂无数据' />
            </View>
          )}
          <View className='list_1'>
            {innerData?.map((it, index) => {
              return (
                <View
                  key={`left-${index}`}
                  style={id.left === it.taskId ? { color: '#1677FF' } : {}}
                  onClick={() => handleCheck(true, it.taskId)}
                  className='items'
                >
                  {it.taskName || '-'}
                </View>
              );
            })}
          </View>
          <View className='list_2'>
            {innerData.filter(it => it.taskId === id.left)[0]?.planInfo.map((_, index) => {
              return (
                <View
                  key={`right-${index}`}
                  className='items'
                  onClick={() => handleCheck(false, index)}
                  style={id.right === index ? { color: '#1677FF',border: '1PX solid #1677FF' } : {}}
                >
                  {index + 1}
                </View>
              );
            })}
          </View>
        </View>
        <View className='check-list-footer'>
          <Button square block className='check-list-cancel-btn' onClick={() => setShow(false)}>
            取消
          </Button>
          <Button square block type='info' onClick={handleConfirm}>
            确定
          </Button>
        </View>
      </Popup>
    </View>
  );
}

export default CheckList;

function useDebounce(value, fn, delay) {
  const timer = useRef<any>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      fn(value);
    }, delay);

    return () => {
      clearTimeout(timer.current);
      timer.current = null;
    };
  }, [value]);
}
