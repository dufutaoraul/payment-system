// 文件路径: app/api/checkout/providers/zpay/webhook/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// 签名验证函数
const verifySign = (params: URLSearchParams, key: string): boolean => {
    const sign = params.get('sign');
    if (!sign) return false;

    const paramsToSign: Record<string, string> = {};
    params.forEach((value, key) => {
        if (key !== 'sign' && key !== 'sign_type') {
            paramsToSign[key] = value;
        }
    });

    const sortedKeys = Object.keys(paramsToSign).sort();
    const strToSign = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
    
    const calculatedSign = crypto.createHash('md5').update(strToSign + key).digest('hex');

    return calculatedSign === sign;
};

// 在 App Router 中，我们导出一个名为 GET 的函数来处理 GET 请求
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    
    console.log('Webhook 收到通知:', searchParams.toString());

    const zpayKey = process.env.ZPAY_KEY;
    if (!zpayKey) {
        console.error('ZPAY_KEY not configured.');
        return new Response('error', { status: 500 });
    }

    // 1. 验证签名
    if (!verifySign(searchParams, zpayKey)) {
        console.error('Webhook 签名验证失败!');
        return new Response('error', { status: 400 });
    }

    // 2. 获取关键参数
    const trade_status = searchParams.get('trade_status');
    const out_trade_no = searchParams.get('out_trade_no');
    const money = searchParams.get('money');

    if (trade_status !== 'TRADE_SUCCESS' || !out_trade_no || !money) {
        // 如果不是成功状态或缺少参数，直接返回成功，避免 Z-Pay 重复通知
        return new Response('success', { status: 200 });
    }
    
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    try {
        // 3. 从数据库查找订单
        const { data: transaction, error: findError } = await supabase
            .from('zpay_transactions')
            .select('*')
            .eq('out_trade_no', out_trade_no)
            .single();

        if (findError || !transaction) {
            console.error(`Webhook: 订单号 ${out_trade_no} 未在数据库中找到。`);
            return new Response('error', { status: 404 });
        }

        // 4. 检查订单状态，防止重复处理
        if (transaction.trade_status === 'SUCCESS') {
            console.log(`Webhook: 订单号 ${out_trade_no} 已处理，无需重复操作。`);
            return new Response('success', { status: 200 });
        }
        
        // 5. 核对金额
        if (Number(transaction.money) !== Number(money)) {
            console.error(`Webhook: 订单号 ${out_trade_no} 金额不匹配! 数据库金额: ${transaction.money}, 通知金额: ${money}`);
            return new Response('error', { status: 400 });
        }

        // 6. 更新订单状态
        const { error: updateError } = await supabase
            .from('zpay_transactions')
            .update({ 
                trade_status: 'SUCCESS',
                trade_no: searchParams.get('trade_no') // 记录下 Z-Pay 的订单号
            })
            .eq('out_trade_no', out_trade_no);

        if (updateError) {
            console.error(`Webhook: 更新订单 ${out_trade_no} 状态失败:`, updateError);
            return new Response('error', { status: 500 });
        }

        console.log(`Webhook: 订单 ${out_trade_no} 成功处理并更新状态!`);
        
        // TODO: 在这里执行开通会员等业务逻辑
        // 例如：if (transaction.is_subscription) { ... }

        // 7. 向 Z-Pay 返回成功标识
        return new Response('success', { status: 200 });

    } catch (error) {
        console.error('Webhook 处理异常:', error);
        return new Response('error', { status: 500 });
    }
}