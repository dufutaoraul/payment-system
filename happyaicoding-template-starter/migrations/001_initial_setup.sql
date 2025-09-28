-- Supabase 支付系统数据库初始化脚本
-- 此脚本包含用户系统、支付订单和相关功能的完整数据库结构

-- ========================================
-- 1. 确保必要的扩展已启用
-- ========================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 启用 pgcrypto 扩展用于密码加密
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 2. 用户配置表 (存储用户额外信息)
-- ========================================

-- 用户配置表 - 关联到 auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为用户配置表添加注释
COMMENT ON TABLE public.user_profiles IS '用户配置信息表，扩展 auth.users 的基础信息';
COMMENT ON COLUMN public.user_profiles.id IS '用户ID，关联 auth.users.id';
COMMENT ON COLUMN public.user_profiles.email IS '用户邮箱';
COMMENT ON COLUMN public.user_profiles.full_name IS '用户全名';
COMMENT ON COLUMN public.user_profiles.avatar_url IS '头像URL';
COMMENT ON COLUMN public.user_profiles.phone IS '手机号码';

-- ========================================
-- 3. 支付订单表
-- ========================================

-- 支付订单状态枚举
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded');

-- 支付方式枚举
CREATE TYPE payment_method AS ENUM ('alipay', 'wechat', 'bank', 'other');

-- 支付订单表
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- 订单基本信息
    order_number TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    product_description TEXT,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'CNY',

    -- 支付信息
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_url TEXT,
    external_order_id TEXT, -- 第三方支付平台的订单ID

    -- 支付网关信息
    gateway_name TEXT DEFAULT 'zpay',
    gateway_response JSONB, -- 存储网关返回的完整响应

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),

    -- 额外参数
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 为订单表添加注释
COMMENT ON TABLE public.payment_orders IS '支付订单表，记录所有支付订单信息';
COMMENT ON COLUMN public.payment_orders.order_number IS '订单号，全局唯一';
COMMENT ON COLUMN public.payment_orders.amount IS '支付金额，单位为元';
COMMENT ON COLUMN public.payment_orders.external_order_id IS '第三方支付平台订单ID';
COMMENT ON COLUMN public.payment_orders.gateway_response IS '支付网关完整响应数据';
COMMENT ON COLUMN public.payment_orders.expired_at IS '订单过期时间，默认30分钟';

-- ========================================
-- 4. 支付记录表 (记录支付流水)
-- ========================================

CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.payment_orders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- 日志信息
    action TEXT NOT NULL, -- 'created', 'paid', 'failed', 'cancelled', 'refunded'
    message TEXT,
    request_data JSONB,
    response_data JSONB,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.payment_logs IS '支付操作日志表，记录所有支付相关操作';
COMMENT ON COLUMN public.payment_logs.action IS '操作类型：created/paid/failed/cancelled/refunded';

-- ========================================
-- 5. 添加索引优化查询性能
-- ========================================

-- 用户配置表索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 订单表索引
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_number ON public.payment_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON public.payment_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_external_id ON public.payment_orders(external_order_id);

-- 支付日志表索引
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_id ON public.payment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON public.payment_logs(created_at);

-- ========================================
-- 6. Row Level Security (RLS) 策略
-- ========================================

-- 启用 RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- 用户配置表 RLS 策略
CREATE POLICY "用户只能查看自己的配置" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户只能更新自己的配置" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "用户只能插入自己的配置" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 支付订单表 RLS 策略
CREATE POLICY "用户只能查看自己的订单" ON public.payment_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的订单" ON public.payment_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的订单" ON public.payment_orders
    FOR UPDATE USING (auth.uid() = user_id);

-- 支付日志表 RLS 策略
CREATE POLICY "用户只能查看自己的支付日志" ON public.payment_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "系统可以插入支付日志" ON public.payment_logs
    FOR INSERT WITH CHECK (true); -- 允许系统服务插入日志

-- ========================================
-- 7. 自动化触发器
-- ========================================

-- 自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表添加自动更新触发器
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payment_orders_updated_at
    BEFORE UPDATE ON public.payment_orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 自动创建用户配置的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 当新用户注册时自动创建用户配置
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 生成订单号的函数
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. 便捷的视图和函数
-- ========================================

-- 用户订单汇总视图
CREATE OR REPLACE VIEW public.user_order_summary AS
SELECT
    u.id as user_id,
    u.email,
    up.full_name,
    COUNT(po.id) as total_orders,
    COUNT(CASE WHEN po.payment_status = 'completed' THEN 1 END) as completed_orders,
    COALESCE(SUM(CASE WHEN po.payment_status = 'completed' THEN po.amount END), 0) as total_paid_amount,
    MAX(po.created_at) as last_order_date
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.payment_orders po ON u.id = po.user_id
GROUP BY u.id, u.email, up.full_name;

COMMENT ON VIEW public.user_order_summary IS '用户订单汇总视图，显示每个用户的订单统计信息';

-- 获取用户有效订单的函数
CREATE OR REPLACE FUNCTION public.get_user_active_orders(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    order_number TEXT,
    product_name TEXT,
    amount DECIMAL,
    payment_status payment_status,
    payment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        po.id,
        po.order_number,
        po.product_name,
        po.amount,
        po.payment_status,
        po.payment_url,
        po.created_at,
        po.expired_at
    FROM public.payment_orders po
    WHERE po.user_id = user_uuid
    AND po.payment_status IN ('pending', 'processing')
    AND po.expired_at > NOW()
    ORDER BY po.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. 数据清理函数
-- ========================================

-- 清理过期订单的函数
CREATE OR REPLACE FUNCTION public.cleanup_expired_orders()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.payment_orders
    SET payment_status = 'cancelled'
    WHERE payment_status = 'pending'
    AND expired_at < NOW();

    GET DIAGNOSTICS affected_rows = ROW_COUNT;

    -- 记录清理日志
    INSERT INTO public.payment_logs (order_id, user_id, action, message)
    SELECT id, user_id, 'cancelled', '订单超时自动取消'
    FROM public.payment_orders
    WHERE payment_status = 'cancelled' AND updated_at = NOW();

    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 10. 测试数据清理 (可选)
-- ========================================

-- 清理测试数据的函数 (仅在开发环境使用)
CREATE OR REPLACE FUNCTION public.cleanup_test_data()
RETURNS VOID AS $$
BEGIN
    -- 删除测试订单 (金额小于 1 元的订单)
    DELETE FROM public.payment_orders WHERE amount < 1.00;

    -- 删除超过30天的日志
    DELETE FROM public.payment_logs WHERE created_at < NOW() - INTERVAL '30 days';

    RAISE NOTICE '测试数据清理完成';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 11. 权限设置
-- ========================================

-- 授予 authenticated 用户适当的权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.payment_orders TO authenticated;
GRANT SELECT ON public.payment_logs TO authenticated;
GRANT SELECT ON public.user_order_summary TO authenticated;

-- 授予 service_role 完整权限 (用于服务端操作)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================
-- 脚本执行完成
-- ========================================

-- 插入初始化完成标记
INSERT INTO public.payment_logs (
    order_id,
    user_id,
    action,
    message
) VALUES (
    uuid_generate_v4(),
    uuid_generate_v4(),
    'system',
    '数据库初始化完成 - ' || NOW()::TEXT
) ON CONFLICT DO NOTHING;

-- 显示执行结果
SELECT
    '数据库初始化完成!' as status,
    NOW() as completed_at,
    'Supabase 支付系统已准备就绪' as message;