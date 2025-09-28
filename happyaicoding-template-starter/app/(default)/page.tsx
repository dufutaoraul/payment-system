export const metadata = {
  title: '简单付费测试',
  description: '测试Z-Pay支付功能',
}

import SimplePay from '@/components/simple-pay'
import ZPayTest from '@/components/zpay-test'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Z-Pay配置测试 */}
        <ZPayTest />

        {/* 分隔线 */}
        <div className="border-t border-gray-300 my-8"></div>

        {/* 简单支付界面 */}
        <SimplePay />
      </div>
    </div>
  )
}
