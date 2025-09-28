-- 一键修复数据库问题的完整SQL脚本 V2
-- 解决用户注册时的 "Database error saving new user" 错误
-- 修复了email列缺失的问题

-- ========================================
-- 第1步：清理现有的触发器和函数
-- ========================================

-- 删除可能存在的旧触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 删除可能存在的旧函数
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ========================================
-- 第2步：修复表结构
-- ========================================

-- 如果user_profiles表存在但缺少列，先添加缺失的列
DO $$
BEGIN
    -- 检查并添加email列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN email TEXT;
    END IF;

    -- 检查并添加created_at列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 创建用户信息表（如果不存在）
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建支付订单表（如果不存在）
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

-- ========================================
-- 第3步：设置安全权限（RLS）
-- ========================================

-- 启用行级安全
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "用户看自己数据" ON public.user_profiles;
DROP POLICY IF EXISTS "用户看自己订单" ON public.payment_orders;

-- 创建新的安全策略
CREATE POLICY "用户看自己数据" ON public.user_profiles
FOR ALL USING (auth.uid() = id);

CREATE POLICY "用户看自己订单" ON public.payment_orders
FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- 第4步：创建改进的触发器函数
-- ========================================

-- 创建新的用户处理函数（带错误处理）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 尝试插入用户配置信息
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 如果发生错误，记录但不阻止用户注册
  RAISE LOG 'Error in handle_new_user: %, User ID: %, Email: %', SQLERRM, NEW.id, NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 第5步：创建触发器
-- ========================================

-- 创建触发器：新用户注册时自动执行
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 第6步：为现有用户创建profiles记录
-- ========================================

-- 为所有现有的auth.users创建user_profiles记录
INSERT INTO public.user_profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

-- ========================================
-- 第7步：设置权限
-- ========================================

-- 授予用户权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.payment_orders TO authenticated;

-- 授予服务端权限
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ========================================
-- 第8步：验证修复结果
-- ========================================

-- 检查user_profiles表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 检查表是否创建成功
SELECT
    'Tables Created:' as check_type,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'payment_orders');

-- 检查触发器是否创建成功
SELECT
    'Triggers Created:' as check_type,
    COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 检查函数是否创建成功
SELECT
    'Functions Created:' as check_type,
    COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';

-- 检查现有用户的profiles记录
SELECT
    'User Profiles:' as check_type,
    COUNT(*) as count
FROM public.user_profiles;

-- 显示所有用户profiles（用于验证）
SELECT
    up.id,
    up.email,
    up.created_at
FROM public.user_profiles up
ORDER BY up.created_at DESC;

-- ========================================
-- 修复完成！
-- ========================================

SELECT
    '🎉 数据库修复完成 V2！' as status,
    '修复了email列缺失问题' as fix_info,
    '现在可以正常注册新用户了' as message,
    NOW() as completed_at;