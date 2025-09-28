// 文件路径: app/api/checkout/providers/zpay/route.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Z-Pay签名生成函数 - 根据官方文档修正
const generateSign = (params: Record<string, any>, key: string): string => {
    const sortedKeys = Object.keys(params).sort();
    // 过滤掉 sign 和 sign_type，以及空值参数
    const filteredParams = sortedKeys
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined);

    const strToSign = filteredParams
        .map(k => `${k}=${params[k]}`)
        .join('&');

    const finalStr = strToSign + key;
    console.log('签名字符串:', strToSign);
    console.log('加密前字符串:', finalStr);

    return crypto.createHash('md5').update(finalStr).digest('hex');
};

// 在 App Router 中，我们导出一个名为 POST 的函数来处理 POST 请求
export async function POST(req: Request) {
    try {
        const cookieStore = cookies()

        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              get(name: string) {
                return cookieStore.get(name)?.value
              },
            },
          }
        )
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = user.id;

        // 从请求 body 中读取数据
        const { name, money, type = 'alipay', param = {} } = await req.json();

        if (!name || !money) {
            return NextResponse.json({ error: 'Missing product name or money.' }, { status: 400 });
        }

        const zpayPid = process.env.ZPAY_PID;
        const zpayKey = process.env.ZPAY_KEY;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!zpayPid || !zpayKey || !appUrl) {
            return NextResponse.json({ error: 'Payment gateway configuration is missing.' }, { status: 500 });
        }

        const outTradeNo = `zpay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const { error: insertError } = await supabase
            .from('zpay_transactions')
            .insert({
                user_id: userId,
                out_trade_no: outTradeNo,
                name: name,
                money: money,
                type: type,
                trade_status: 'PENDING',
                param: param,
            });

        if (insertError) {
            console.error('Database insert error:', insertError);
            return NextResponse.json({ error: 'Failed to create order.' }, { status: 500 });
        }

        // 确保金额格式正确 - Z-Pay要求数字格式
        const formattedMoney = parseFloat(money).toFixed(2);

        const params = {
            pid: zpayPid,
            out_trade_no: outTradeNo,
            name: name,
            money: formattedMoney,
            type: type,
            notify_url: `${appUrl}/api/checkout/providers/zpay/webhook`,
            return_url: `${appUrl}/dashboard`,
            sign_type: 'MD5',
        };

        console.log('Z-Pay配置信息:');
        console.log('- PID:', zpayPid);
        console.log('- KEY:', zpayKey ? `${zpayKey.substring(0, 8)}...` : 'undefined');
        console.log('- APP_URL:', appUrl);
        console.log('支付参数:', params);

        const sign = generateSign(params, zpayKey);
        console.log('生成的签名:', sign);

        const zpayGateway = 'https://zpayz.cn/submit.php';
        // URLSearchParams 会自动处理 URL 编码
        const finalParams = new URLSearchParams({ ...params, sign });
        const paymentUrl = `${zpayGateway}?${finalParams.toString()}`;

        console.log('最终支付URL:', paymentUrl);

        return NextResponse.json({ paymentUrl });

    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}