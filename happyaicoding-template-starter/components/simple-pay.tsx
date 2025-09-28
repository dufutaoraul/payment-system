'use client';

import { createClient } from 'utils/supabase/client';
import { useState, useEffect } from 'react';

export default function SimplePay() {
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

    // 处理找回密码
    const handleResetPassword = async (email: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (error) throw error;
            alert('密码重置邮件已发送，请检查邮箱！');
        } catch (error: any) {
            alert('发送失败: ' + error.message);
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

        setLoading(true);
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
                    param: { productId: 'payment-system' },
                }),
            });

            const data = await response.json();

            if (response.ok && data.paymentUrl) {
                // 跳转到支付页面
                window.location.href = data.paymentUrl;
            } else {
                alert(`创建订单失败: ${data.error || data.msg || '未知错误'}`);
            }
        } catch (error) {
            console.error('支付错误:', error);
            alert('网络错误，请稍后再试。');
        } finally {
            setLoading(false);
        }
    };

    // 登出
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-lg text-gray-600">加载中...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">支付系统</h1>

            {!user ? (
                <AuthSection
                    onLogin={handleLogin}
                    onSignUp={handleSignUp}
                    onResetPassword={handleResetPassword}
                    loading={loading}
                />
            ) : (
                <PaymentSection
                    user={user}
                    onPay={handlePay}
                    onLogout={handleLogout}
                    loading={loading}
                />
            )}
        </div>
    );
}

// 认证区域组件（包含登录、注册、找回密码）
function AuthSection({ onLogin, onSignUp, onResetPassword, loading }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            alert('请填写邮箱');
            return;
        }

        if (mode === 'reset') {
            onResetPassword(email);
            return;
        }

        if (!password) {
            alert('请填写密码');
            return;
        }

        if (mode === 'signup') {
            onSignUp(email, password);
        } else {
            onLogin(email, password);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入邮箱地址"
                    />
                </div>

                {mode !== 'reset' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="输入密码"
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? '处理中...' :
                        mode === 'login' ? '登录' :
                        mode === 'signup' ? '注册' : '发送重置邮件'}
                </button>
            </form>

            <div className="text-center space-y-2">
                {mode === 'login' && (
                    <>
                        <button
                            onClick={() => setMode('signup')}
                            className="text-sm text-blue-600 hover:text-blue-500"
                        >
                            没有账户？点击注册
                        </button>
                        <div>
                            <button
                                onClick={() => setMode('reset')}
                                className="text-sm text-gray-600 hover:text-gray-500"
                            >
                                忘记密码？
                            </button>
                        </div>
                    </>
                )}

                {mode === 'signup' && (
                    <button
                        onClick={() => setMode('login')}
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        已有账户？点击登录
                    </button>
                )}

                {mode === 'reset' && (
                    <button
                        onClick={() => setMode('login')}
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        返回登录
                    </button>
                )}
            </div>
        </div>
    );
}

// 支付区域组件（简化版）
function PaymentSection({ user, onPay, onLogout, loading }: any) {
    return (
        <div className="space-y-6">
            <div className="text-center pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600">
                    欢迎，{user.email}
                </p>
                <button
                    onClick={onLogout}
                    className="text-sm text-red-600 hover:text-red-500 mt-1"
                >
                    退出登录
                </button>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-800">选择支付金额</h2>

                <PaymentButton
                    amount={0.01}
                    name="测试支付"
                    onPay={onPay}
                    description="最小金额测试（1分钱）"
                    loading={loading}
                />

                <PaymentButton
                    amount={1}
                    name="小额支付"
                    onPay={onPay}
                    description="1元支付测试"
                    loading={loading}
                />

                <PaymentButton
                    amount={5}
                    name="标准支付"
                    onPay={onPay}
                    description="5元支付测试"
                    loading={loading}
                />
            </div>
        </div>
    );
}

// 支付按钮组件
function PaymentButton({ amount, name, onPay, description, loading }: any) {
    const [processing, setProcessing] = useState(false);

    const handleClick = async () => {
        if (processing || loading) return;

        setProcessing(true);
        try {
            await onPay(amount, name);
        } finally {
            setProcessing(false);
        }
    };

    const isDisabled = processing || loading;

    return (
        <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-medium text-gray-800">¥{amount}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                    onClick={handleClick}
                    disabled={isDisabled}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {processing ? '处理中...' : '立即支付'}
                </button>
            </div>
        </div>
    );
}