export const metadata = {
  title: '支付系统',
  description: '安全便捷的在线支付服务',
}

import SimplePay from '@/components/simple-pay'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <SimplePay />
    </div>
  )
}
