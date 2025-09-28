-- Supabase认证配置更新脚本
-- 更新为正式域名：payment.dufutao.asia

-- 注意：这个脚本只是参考，实际配置需要在Supabase Dashboard中手动设置

/*
在Supabase Dashboard中进行以下配置：

1. 进入 Authentication → Settings
2. 更新以下设置：

Site URL:
https://payment.dufutao.asia

Redirect URLs (添加以下URL):
https://payment.dufutao.asia/auth/callback
https://payment.dufutao.asia/
http://localhost:3001/auth/callback
http://localhost:3001/

Additional Redirect URLs:
https://payment-system-hazel.vercel.app/auth/callback
https://payment-system-hazel.vercel.app/

3. 在Environment Variables (Vercel)中更新：
NEXT_PUBLIC_APP_URL=https://payment.dufutao.asia

4. 邮件模板配置：
在 Auth > Email Templates 中确保使用正确的域名
*/

-- 验证当前用户配置
SELECT
    'Current Users:' as info,
    COUNT(*) as count
FROM auth.users;

-- 显示提示信息
SELECT
    '请在Supabase Dashboard中手动更新以下配置：' as step,
    '1. Site URL: https://payment.dufutao.asia' as config1,
    '2. Redirect URLs: https://payment.dufutao.asia/auth/callback' as config2,
    '3. 更新Vercel环境变量' as config3;