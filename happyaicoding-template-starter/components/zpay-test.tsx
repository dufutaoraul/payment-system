'use client';

import { useState } from 'react';

export default function ZPayTest() {
    const [testResult, setTestResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const testZPayConfig = async () => {
        setIsLoading(true);
        setTestResult('正在测试Z-Pay配置...');

        try {
            const response = await fetch('/api/checkout/providers/zpay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: '配置测试',
                    money: '0.01',
                    type: 'alipay'
                }),
            });

            const data = await response.json();
            
            if (response.ok && data.paymentUrl) {
                setTestResult(`✅ Z-Pay配置正常！\n\n支付URL: ${data.paymentUrl}\n\n现在可以手动访问这个URL测试支付`);
            } else {
                setTestResult(`❌ Z-Pay配置有问题：\n\n错误信息: ${data.error || '未知错误'}`);
            }
        } catch (error) {
            setTestResult(`❌ 网络错误: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">Z-Pay 配置测试</h2>
            
            <div className="space-y-4">
                <button
                    onClick={testZPayConfig}
                    disabled={isLoading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                    {isLoading ? '测试中...' : '测试 Z-Pay 配置'}
                </button>

                {testResult && (
                    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                        <h3 className="font-bold mb-2">测试结果：</h3>
                        <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
                    </div>
                )}

                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="font-bold text-yellow-800 mb-2">⚠️ 注意事项：</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• 确保您的Z-Pay商户账户状态正常</li>
                        <li>• 确保PID和KEY配置正确</li>
                        <li>• 如果测试失败，请检查.env.local文件中的配置</li>
                        <li>• 某些支付网关可能需要白名单域名</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
