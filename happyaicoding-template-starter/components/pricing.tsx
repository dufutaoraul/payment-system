// 文件路径: components/Pricing.tsx
'use client';

import { createClient } from 'utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// 定义价格方案的类型
interface Plan {
    id: string;
    name: string;
    price: number;
    features: string[];
}

// 预设的价格方案数据
const plans: Plan[] = [
    {
        id: 'one_time_purchase',
        name: '一次性购买',
        price: 29,
        features: ['永久访问权限', '所有基础功能', '邮件支持'],
    },
    {
        id: 'monthly_subscription',
        name: '按月订阅',
        price: 9.9,
        features: ['每月自动续费', '所有高级功能', '优先技术支持', '持续内容更新'],
    },
];

export default function Pricing() {
    const router = useRouter();
    const supabase = createClient();
    const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

    // 这是处理支付点击事件的核心函数
    const handleCheckout = async (plan: Plan) => {
        setLoadingPlanId(plan.id); // 开始加载，可以给按钮添加加载动画

        // 1. 检查用户是否已登录
        const { data: { user } } = await supabase.auth.getUser();
        console.log('检查登录状态, 获取到的 user 是:', user);
        
        if (!user) {
            // 如果未登录，跳转到登录页面
            router.push('/signin');
            return;
        }

        try {
            // 2. 向我们创建的后端 API 发送请求
            const response = await fetch('/api/checkout/providers/zpay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: plan.name,
                    money: plan.price,
                    type: 'alipay', // 你可以根据需要改成 'wxpay'
                    param: { productId: plan.id }, // 附加参数，可以记录是哪个商品
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 3. 请求成功，获取到支付链接，并跳转
                if (data.paymentUrl) {
                    window.location.href = data.paymentUrl;
                }
            } else {
                // 如果后端返回错误，就在控制台打印出来
                console.error('Checkout failed:', data.error);
                alert(`创建订单失败: ${data.error}`);
            }
        } catch (error) {
            console.error('An unexpected error occurred:', error);
            alert('发生未知错误，请稍后再试。');
        } finally {
            setLoadingPlanId(null); // 结束加载
        }
    };

    return (
        <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6">
            <div className="mx-auto max-w-screen-md text-center mb-8 lg:mb-12">
                <h2 className="mb-4 text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white">选择适合您的方案</h2>
                <p className="mb-5 font-light text-gray-500 sm:text-xl dark:text-gray-400">
                    我们提供灵活的方案以满足不同用户的需求。
                </p>
            </div>
            <div className="space-y-8 lg:grid lg:grid-cols-2 sm:gap-6 xl:gap-10 lg:space-y-0">
                {/* 使用 map 循环渲染价格方案 */}
                {plans.map((plan) => (
                    <div key={plan.id} className="flex flex-col p-6 mx-auto max-w-lg text-center text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
                        <h3 className="mb-4 text-2xl font-semibold">{plan.name}</h3>
                        <div className="flex justify-center items-baseline my-8">
                            <span className="mr-2 text-5xl font-extrabold">¥{plan.price}</span>
                            <span className="text-gray-500 dark:text-gray-400">{plan.id === 'monthly_subscription' ? '/月' : ''}</span>
                        </div>
                        <ul role="list" className="mb-8 space-y-4 text-left">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-center space-x-3">
                                    <svg className="flex-shrink-0 w-5 h-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleCheckout(plan)}
                            disabled={loadingPlanId === plan.id}
                            className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:text-white dark:focus:ring-blue-900 disabled:bg-gray-400"
                        >
                            {loadingPlanId === plan.id ? '处理中...' : '立即购买'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}