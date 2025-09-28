# 🚀 个人网站支付功能实现教程

## 👋 教程简介

这是一个完整的教程，教你如何在个人网站上实现支付功能。只需要几个小时，你就能拥有一个完整的支付系统！

### 🎯 你将学到：
- 如何在网站上集成第三方支付
- 用户注册登录系统
- 订单管理
- 支付回调处理
- 从0.01元开始测试支付

### 🛠️ 技术栈：
- **前端**：Next.js + React（界面）
- **后端**：Next.js API（服务器）
- **数据库**：Supabase（免费）
- **支付**：Z-Pay（个人可用的支付网关）
- **部署**：Vercel（免费）

## 📋 准备工作

### 1. 注册必要账号

**Supabase（数据库）**：
- 访问：https://supabase.com
- 注册并创建新项目
- 记录你的项目URL和API密钥

**Z-Pay（支付网关）**：
- 访问：https://zpayz.cn
- 注册并获取PID和KEY
- 这是个人可用的支付网关

**Vercel（部署）**：
- 访问：https://vercel.com
- 用GitHub账号注册

### 2. 本地开发环境

```bash
# 安装Node.js（版本18+）
# 安装Git
# 安装VS Code（推荐）
```

## 🏗️ 项目结构

```
payment-system/
├── app/                    # Next.js 应用目录
│   ├── (default)/
│   │   └── page.tsx       # 首页
│   └── api/               # API路由
│       └── checkout/      # 支付相关API
├── components/            # React组件
│   ├── simple-pay.tsx     # 支付组件
│   └── zpay-test.tsx      # 测试组件
├── utils/                 # 工具函数
│   └── supabase/          # Supabase配置
├── migrations/            # 数据库脚本
└── .env.local            # 环境变量
```

## 🚀 实现步骤

### 第一步：创建Next.js项目

```bash
# 创建项目
npx create-next-app@latest payment-system
cd payment-system

# 安装依赖
npm install @supabase/auth-helpers-nextjs @supabase/ssr @supabase/supabase-js
```

### 第二步：配置环境变量

创建 `.env.local` 文件：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的supabase服务角色密钥

# 应用基础配置
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Z-Pay 支付网关配置
ZPAY_PID=你的ZPAY_PID
ZPAY_KEY=你的ZPAY_KEY
```

### 第三步：设置Supabase数据库

1. 登录Supabase Dashboard
2. 进入SQL Editor
3. 执行以下脚本：

```sql
-- 创建用户信息表
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建支付订单表
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 设置安全权限
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的数据
CREATE POLICY "用户看自己数据" ON public.user_profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "用户看自己订单" ON public.payment_orders FOR ALL USING (auth.uid() = user_id);

-- 自动创建用户信息
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新用户注册时自动执行
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 第四步：创建Supabase客户端

创建 `utils/supabase/client.ts`：

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 第五步：创建支付API

创建 `app/api/checkout/providers/zpay/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { name, money, type = 'alipay' } = await request.json();

        // Z-Pay配置
        const pid = process.env.ZPAY_PID;
        const key = process.env.ZPAY_KEY;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!pid || !key) {
            return NextResponse.json(
                { error: 'Z-Pay配置缺失' },
                { status: 500 }
            );
        }

        // 生成订单号
        const orderNumber = `zpay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // 构建支付参数
        const params = {
            pid,
            out_trade_no: orderNumber,
            name,
            money: money.toString(),
            type,
            notify_url: `${appUrl}/api/checkout/providers/zpay/webhook`,
            return_url: `${appUrl}/dashboard`,
            sign_type: 'MD5'
        };

        // 生成签名
        const sortedParams = Object.keys(params)
            .filter(key => key !== 'sign' && params[key])
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signString = sortedParams + key;
        const sign = crypto.createHash('md5').update(signString).digest('hex');

        // 构建支付URL
        const paymentUrl = `https://zpayz.cn/submit.php?${sortedParams}&sign=${sign}`;

        return NextResponse.json({
            success: true,
            paymentUrl,
            orderNumber
        });

    } catch (error) {
        console.error('支付API错误:', error);
        return NextResponse.json(
            { error: '支付请求失败' },
            { status: 500 }
        );
    }
}
```

### 第六步：创建支付组件

创建 `components/simple-pay.tsx`：

```typescript
'use client';

import { createClient } from 'utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SimplePay() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // 检查用户登录状态
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
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

    // 处理支付
    const handlePay = async (amount: number, name: string) => {
        if (!user) {
            alert('请先登录');
            return;
        }

        try {
            const response = await fetch('/api/checkout/providers/zpay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    money: amount,
                    type: 'alipay'
                }),
            });

            const data = await response.json();

            if (response.ok && data.paymentUrl) {
                // 跳转到支付页面
                window.location.href = data.paymentUrl;
            } else {
                alert(`创建订单失败: ${data.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('支付错误:', error);
            alert('网络错误，请稍后再试。');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-6">支付测试</h1>

            {!user ? (
                <LoginForm
                    onLogin={handleLogin}
                    loading={loading}
                />
            ) : (
                <PaymentSection
                    user={user}
                    onPay={handlePay}
                />
            )}
        </div>
    );
}

// 登录表单组件
function LoginForm({ onLogin, loading }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            alert('请填写邮箱和密码');
            return;
        }
        onLogin(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">邮箱</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="输入邮箱"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">密码</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="输入密码"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
                {loading ? '登录中...' : '登录'}
            </button>
        </form>
    );
}

// 支付区域组件
function PaymentSection({ user, onPay }: any) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-sm text-gray-600">已登录: {user.email}</p>
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

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-medium">¥{amount}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <button
                    onClick={handleClick}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isProcessing ? '处理中...' : '立即支付'}
                </button>
            </div>
        </div>
    );
}
```

### 第七步：创建主页

修改 `app/(default)/page.tsx`：

```typescript
export const metadata = {
  title: '支付系统测试',
  description: '测试支付功能',
}

import SimplePay from '@/components/simple-pay'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <SimplePay />
      </div>
    </div>
  )
}
```

## 🧪 测试步骤

### 1. 本地测试
```bash
npm run dev
```
访问 http://localhost:3000

### 2. 注册测试账号
- 使用真实邮箱注册
- 收到验证邮件并点击确认

### 3. 支付测试
- 登录后点击"测试支付 - 1分钱"
- 会跳转到Z-Pay支付页面
- 使用支付宝扫码支付0.01元

## 🚀 部署到线上

### 1. 推送到GitHub
```bash
git init
git add .
git commit -m "初始化支付系统"
git remote add origin https://github.com/你的用户名/payment-system.git
git push -u origin main
```

### 2. 部署到Vercel
- 访问 https://vercel.com
- 连接GitHub账号
- 选择你的项目仓库
- 设置环境变量（复制.env.local的内容）
- 点击部署

### 3. 更新Supabase配置
- 在Supabase Dashboard中设置Site URL为你的Vercel域名
- 添加Redirect URLs

## 🔧 高级功能

### 1. 支付回调处理
创建 `app/api/checkout/providers/zpay/webhook/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const status = formData.get('status');
        const orderNumber = formData.get('out_trade_no');

        if (status === 'success') {
            // 更新订单状态为已支付
            console.log('支付成功:', orderNumber);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Webhook处理失败' }, { status: 500 });
    }
}
```

### 2. 订单管理
创建订单列表页面，显示用户的所有支付记录。

### 3. 多种支付方式
支持微信支付、银行卡等多种支付方式。

## 📚 学习资源

- **Next.js文档**：https://nextjs.org/docs
- **Supabase文档**：https://supabase.com/docs
- **React文档**：https://react.dev
- **TypeScript教程**：https://www.typescriptlang.org/docs

## 🎉 恭喜！

完成这个教程后，你将拥有：
- ✅ 完整的用户注册登录系统
- ✅ 支付功能（支持支付宝）
- ✅ 订单管理系统
- ✅ 线上部署的网站
- ✅ 真实的支付测试经验

现在你可以在这个基础上继续扩展，添加更多功能！

## 💡 常见问题

**Q: 支付时报错怎么办？**
A: 检查Z-Pay配置是否正确，确保PID和KEY没有错误。

**Q: 注册用户失败？**
A: 确保已经执行了Supabase的SQL脚本。

**Q: 支付后没有回调？**
A: 检查webhook URL是否可以从外网访问。

**Q: 部署后环境变量不生效？**
A: 在Vercel项目设置中重新添加所有环境变量。

---

🎯 **这个教程的核心价值**：让你从零到一掌握网站支付功能的完整实现，为以后的项目打下坚实基础！