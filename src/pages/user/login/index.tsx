import { View, Input } from '@tarojs/components';
import { Button, Form, FormItem } from '@antmjs/vantui';
import { login } from './service';
import './index.scss';

const Index = () => {
  const formIt = Form.useForm();

  const submit = () => {
    formIt.validateFields(async (_, fieldValues) => {
      login(fieldValues);
    });
  };

  return (
    <View className='page'>
      <View className='tips'>
        <View className='welcome'>欢迎</View>
        <View className='tip'>请登录后再使用</View>
      </View>
      <Form form={formIt}>
        <FormItem
          label='账号'
          name='username'
          required
          trigger='onInput'
          validateTrigger='onBlur'
          valueFormat={e => e.detail.value}
          className='username'
          style={{ borderRadius: '14px' }}
        >
          <Input maxlength={11} placeholder='请输入账号' />
        </FormItem>

        <FormItem
          label='密码'
          name='password'
          required
          valueFormat={e => e.detail.value}
          trigger='onInput'
          className='password'
          style={{ borderRadius: '14px' }}
        >
          <Input type='text' password maxlength={16} placeholder='请输入密码' />
        </FormItem>
        <Button className='submit' type='primary' onClick={submit} formType='submit'>
          登录
        </Button>
      </Form>
    </View>
  );
};
export default Index;
