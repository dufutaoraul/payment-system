'use client';

import { createClient } from 'utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SimplePay() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    // 检查用户登录状态
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setAuthLoading(false);
        };
        checkUser();
    }, [supabase]);

    // 处理登录
    const handleLogin = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            setUser(data.user);
        } catch (error: any) {
            alert('登录失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 处理注册
    const handleSignUp = async (email: string, password: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
            alert('注册成功！请检查邮箱验证链接。');
        } catch (error: any) {
            alert('注册失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 处理支付
    const handlePay = async (amount: number, name: string) => {
        if (!user) {
            alert('请先登录');
            return;
        }

        console.log(`开始处理支付: ${name}, 金额: ¥${amount}`);

        try {
            const response = await fetch('/api/checkout/providers/zpay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    money: amount,
                    type: 'alipay',
                    param: { productId: 'test-product' },
                }),
            });

            const data = await response.json();
            console.log('支付API响应状态:', response.status);
            console.log('支付API响应数据:', data);

            if (response.ok && data.paymentUrl) {
                console.log('准备跳转到支付页面:', data.paymentUrl);

                // 显示确认对话框，让用户有时间查看日志
                const shouldProceed = confirm(`支付URL已生成！\n\n点击"确定"跳转到支付页面\n点击"取消"查看详细日志\n\n支付URL: ${data.paymentUrl}`);

                if (shouldProceed) {
                    // 跳转到支付页面
                    window.location.href = data.paymentUrl;
                } else {
                    console.log('用户选择查看日志，不跳转');
                }
            } else {
                console.error('支付失败 - 响应状态:', response.status);
                console.error('支付失败 - 响应数据:', data);
                alert(`创建订单失败: ${data.error || data.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('支付错误:', error);
            alert('网络错误，请稍后再试。');
        }
    };

    // 登出
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">加载中...</div>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-6">简单付费测试</h1>
            
            {!user ? (
                <LoginForm 
                    onLogin={handleLogin} 
                    onSignUp={handleSignUp} 
                    loading={loading} 
                />
            ) : (
                <PaymentSection
                    user={user}
                    onPay={handlePay}
                    onLogout={handleLogout}
                />
            )}
        </div>
    );
}

// 登录表单组件
function LoginForm({ onLogin, onSignUp, loading }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            alert('请填写邮箱和密码');
            return;
        }
        if (isSignUp) {
            onSignUp(email, password);
        } else {
            onLogin(email, password);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入邮箱"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入密码"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
                {loading ? '处理中...' : (isSignUp ? '注册' : '登录')}
            </button>
            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-blue-600 hover:text-blue-500"
                >
                    {isSignUp ? '已有账户？点击登录' : '没有账户？点击注册'}
                </button>
            </div>
        </form>
    );
}

// 支付区域组件
function PaymentSection({ user, onPay, onLogout }: any) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-sm text-gray-600">已登录: {user.email}</p>
                <button
                    onClick={onLogout}
                    className="text-sm text-red-600 hover:text-red-500"
                >
                    退出登录
                </button>
            </div>

            <div className="border-t pt-6">
                <h2 className="text-lg font-semibold mb-4">选择支付金额</h2>
                <div className="space-y-3">
                    <PaymentButton
                        amount={0.01}
                        name="测试支付 - 1分钱"
                        onPay={onPay}
                        description="最小金额测试"
                    />
                    <PaymentButton
                        amount={1}
                        name="测试支付 - 1元"
                        onPay={onPay}
                        description="小额测试"
                    />
                    <PaymentButton
                        amount={5}
                        name="测试支付 - 5元"
                        onPay={onPay}
                        description="中等金额测试"
                    />
                </div>
            </div>
        </div>
    );
}

// 支付按钮组件
function PaymentButton({ amount, name, onPay, description }: any) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClick = async () => {
        if (isProcessing) return;

        setIsProcessing(true);
        try {
            await onPay(amount, name);
        } finally {
            setIsProcessing(false);
        }
    };

    const isDisabled = isProcessing;

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-medium">¥{amount}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                    onClick={handleClick}
                    disabled={isDisabled}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isProcessing ? '处理中...' : '立即支付'}
                </button>
            </div>
        </div>
    );
}
