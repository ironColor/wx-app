import Taro from "@tarojs/taro";
import { useState } from 'react';
import { View } from '@tarojs/components';
import { Button, Field } from '@antmjs/vantui';
import './index.scss';
import { add } from './service';

const Index = () => {
  const [value, setValue] = useState();

  const submit = async () => {
    const res: any = await add({ content: value });

    console.log(res);
    if (res.code !== 0) {
      return;
    }
    // 返回上级目录
    Taro.navigateBack();
    Taro.showToast({
      title: '提交成功',
      icon: 'none',
      duration: 3000
    });
  };

  return (
    <View className='page'>
      <Field
        type='textarea'
        placeholder='请描述反馈内容'
        maxlength={500}
        autosize={{ minHeight: '220px' }}
        className='input'
        value={value}
        onChange={e => setValue(e.detail)}
      />
      <Button formType='submit' onClick={submit} className='page-button' color='#1677ff'>
        提交
      </Button>
    </View>
  );
};

export default Index;
