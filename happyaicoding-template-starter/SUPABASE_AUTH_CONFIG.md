# Supabase 认证系统配置指南

## 🎯 完整配置步骤

基于2025年最新的Supabase认证文档，以下是完整的配置指南：

## 📧 第一步：邮箱认证配置

### 1. 在Supabase Dashboard中：

1. **进入Authentication → Settings**
2. **配置Site URL**：
   ```
   生产环境: https://payment.dufutao.asia
   开发环境: http://localhost:3001
   ```

3. **配置Redirect URLs（重要！）**：
   ```
   https://payment.dufutao.asia/auth/callback
   https://payment.dufutao.asia/
   https://payment.dufutao.asia/auth/reset-password
   http://localhost:3001/auth/callback
   http://localhost:3001/
   http://localhost:3001/auth/reset-password
   ```

### 2. 邮件模板配置

在 **Authentication → Email Templates** 中：

**确认邮件模板**：
- 确保 `{{ .ConfirmationURL }}` 指向正确域名
- 建议使用默认模板或自定义为简洁版本

**密码重置模板**：
- 确保 `{{ .RedirectTo }}` 指向 `/auth/reset-password`

## 🔐 第二步：认证策略配置

### 1. 基础安全设置

在 **Authentication → Settings** 中：

- **Enable email confirmations**: ✅ 开启（生产环境）/ ❌ 关闭（开发测试）
- **Enable phone confirmations**: ❌ 关闭（除非需要手机验证）
- **Enable secure email change**: ✅ 开启
- **Double confirm email changes**: ✅ 开启（推荐）

### 2. 密码策略

- **Minimum password length**: 6（可根据需求调整）
- **Require special characters**: 可选
- **Require numbers**: 可选

## 🛠️ 第三步：环境变量配置

### 本地开发 (.env.local)：
```env
NEXT_PUBLIC_SUPABASE_URL=https://tarluhsejlzqmwfiwxkb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 生产环境 (Vercel)：
```env
NEXT_PUBLIC_SUPABASE_URL=https://tarluhsejlzqmwfiwxkb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://payment.dufutao.asia
```

## 🧪 第四步：测试认证流程

### 1. 注册流程测试：
1. 访问网站，点击"注册"
2. 输入邮箱和密码
3. 如果启用邮箱验证：检查邮箱并点击确认链接
4. 应该跳转回网站并自动登录

### 2. 密码重置测试：
1. 点击"忘记密码？"
2. 输入邮箱地址
3. 检查邮箱中的重置链接
4. 点击链接，应该跳转到 `/auth/reset-password`
5. 输入新密码并确认

### 3. 登录测试：
1. 使用错误密码登录 → 应显示清晰错误信息
2. 使用正确密码登录 → 应成功进入支付页面

## 🚨 常见问题和解决方案

### 问题1：邮箱确认链接跳转到localhost
**原因**：Site URL配置不正确
**解决**：在Supabase Dashboard中更新Site URL为生产域名

### 问题2：密码重置邮件收不到
**解决方案**：
1. 检查邮箱是否在垃圾邮件中
2. 确认在Supabase中Email Templates配置正确
3. 验证SMTP设置（如果使用自定义SMTP）

### 问题3：注册后用户无法登录
**原因**：数据库触发器问题
**解决**：执行我们提供的`FIX_DATABASE_V2.sql`脚本

### 问题4：认证状态不同步
**解决方案**：
```javascript
// 在组件中添加认证状态监听
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

## 📧 自定义SMTP配置（可选）

如果需要使用自定义邮件服务：

1. 在 **Authentication → Settings → SMTP Settings**
2. 配置：
   - **Host**: smtp.gmail.com（或其他服务商）
   - **Port**: 587
   - **Username**: 你的邮箱
   - **Password**: 应用密码
   - **Sender email**: 发件人邮箱
   - **Sender name**: 发件人名称

## 🔒 Row Level Security (RLS) 配置

我们的系统已经配置了基础的RLS策略：

```sql
-- 用户只能访问自己的数据
CREATE POLICY "用户看自己数据" ON public.user_profiles
FOR ALL USING (auth.uid() = id);

CREATE POLICY "用户看自己订单" ON public.payment_orders
FOR ALL USING (auth.uid() = user_id);
```

## 📊 监控和调试

### 1. 查看认证日志
在Supabase Dashboard的 **Authentication → Users** 中可以查看：
- 用户注册时间
- 最后登录时间
- 邮箱确认状态

### 2. 调试工具
在开发时可以在浏览器控制台查看：
```javascript
// 获取当前用户
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// 获取会话信息
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

## ✅ 配置检查清单

- [ ] Site URL已设置为生产域名
- [ ] Redirect URLs包含所有必要路径
- [ ] 邮件模板配置正确
- [ ] 环境变量在Vercel中正确设置
- [ ] 数据库触发器正常工作
- [ ] RLS策略已启用
- [ ] 注册流程测试通过
- [ ] 登录流程测试通过
- [ ] 密码重置流程测试通过

完成这些配置后，你的认证系统就完全可以在生产环境中使用了！