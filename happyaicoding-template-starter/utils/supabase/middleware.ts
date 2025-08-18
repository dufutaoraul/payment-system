// 文件路径: utils/supabase/middleware.ts (修正版)

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  console.log('中间件收到的 Cookies:', request.cookies.getAll());
  // 创建一个空的响应对象，我们将在后续操作中修改它
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 创建一个能在中间件、服务器组件、API路由中使用的 Supabase 客户端
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // get 方法从传入的请求中读取 cookie
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // set 方法在传出的响应对象上设置 cookie
        set(name: string, value: string, options: CookieOptions) {
          // 注意：这里我们只操作 response 对象
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        // remove 方法在传出的响应对象上删除 cookie
        remove(name: string, options: CookieOptions) {
          // 注意：这里我们只操作 response 对象
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 刷新 session cookie。如果用户已登录，这将确保状态是最新的。
  // 这是保证服务端能正确获取用户状态的核心！
  await supabase.auth.getUser()

  // 将带有更新后 cookie（如果需要的话）的响应返回，继续处理请求
  return response
}