# Supabase 数据库设置指南

## 🎯 问题解决
你遇到的注册失败问题是因为 Supabase 数据库缺少必要的表结构。本指南将帮你一步步解决这个问题。

## 📋 设置步骤

### 第一步：登录 Supabase Dashboard
1. 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. 使用你的账号登录
3. 选择你的项目

### 第二步：启用 Authentication
1. 在左侧菜单点击 **Authentication**
2. 点击 **Settings** 标签
3. 确保 **Enable email confirmations** 设置根据你的需求：
   - **测试阶段**：建议关闭 (Disable)，方便测试
   - **生产环境**：建议开启 (Enable)
4. 在 **Auth Providers** 中确保 **Email** 已启用

### 第三步：执行数据库初始化脚本

#### 方法1：使用完整脚本（推荐）
1. 在 Supabase Dashboard 左侧菜单点击 **SQL Editor**
2. 点击 **New Query**
3. 复制 `migrations/001_initial_setup.sql` 的全部内容
4. 粘贴到查询编辑器中
5. 点击 **Run** 执行

#### 方法2：使用精简脚本（快速设置）
1. 如果上面的脚本太复杂，可以使用 `migrations/002_essential_only.sql`
2. 同样在 SQL Editor 中执行

### 第四步：验证设置
执行以下查询验证表已正确创建：

```sql
-- 检查表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'payment_orders');

-- 检查RLS策略
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### 第五步：设置网站URL（重要！）
1. 在 Supabase Dashboard 点击 **Authentication** → **Settings**
2. 在 **Site URL** 中设置：
   - **本地开发**：`http://localhost:3001`
   - **生产环境**：你的 Vercel 域名（如 `https://your-app.vercel.app`）
3. 在 **Redirect URLs** 中添加：
   - `http://localhost:3001/auth/callback`
   - `https://your-app.vercel.app/auth/callback`

## 🔧 环境变量配置

确保你的 `.env.local` 和 Vercel 环境变量都包含：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 测试设置

执行SQL脚本后，你应该能够：

1. **注册新用户** - 不再出现数据库错误
2. **自动创建用户配置** - 新用户注册时会自动在 `user_profiles` 表中创建记录
3. **创建支付订单** - 用户可以创建支付订单
4. **查看用户数据** - 每个用户只能看到自己的数据（RLS保护）

## 📊 数据库结构说明

### 核心表格：

1. **`user_profiles`** - 用户配置信息
   - 自动关联到 `auth.users`
   - 存储扩展的用户信息

2. **`payment_orders`** - 支付订单
   - 记录所有支付订单
   - 支持多种支付状态和方式
   - 包含过期时间控制

3. **`payment_logs`** (完整版脚本) - 支付日志
   - 记录所有支付相关操作
   - 便于调试和审计

### 安全特性：

- **Row Level Security (RLS)** - 确保用户只能访问自己的数据
- **自动触发器** - 新用户注册时自动创建配置
- **数据验证** - 金额必须大于0等约束条件

## 🚀 立即测试

SQL脚本执行成功后：

1. 访问你的应用 (localhost:3001 或 Vercel URL)
2. 尝试注册一个新账号
3. 注册成功后尝试支付功能
4. 检查 Supabase Dashboard 中的 **Table Editor** 查看数据

## ⚠️ 注意事项

1. **生产环境**：确保启用邮箱验证
2. **安全设置**：定期检查 RLS 策略
3. **备份**：重要数据定期备份
4. **监控**：关注 Supabase Dashboard 中的使用情况

## 🆘 故障排除

如果仍然有问题：

1. 检查 Supabase Dashboard 的 **Logs** 查看错误信息
2. 在 **Table Editor** 中手动检查表是否创建
3. 验证 **Authentication** 设置是否正确
4. 确认环境变量配置无误

执行完这些步骤后，你的注册功能应该可以正常工作了！