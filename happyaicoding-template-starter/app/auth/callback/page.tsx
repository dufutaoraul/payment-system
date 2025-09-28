'use client';

import { createClient } from 'utils/supabase/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    router.push('/?error=' + encodeURIComponent(error.message));
                    return;
                }

                if (data.session) {
                    // 认证成功，跳转到首页
                    router.push('/');
                } else {
                    // 没有会话，跳转到首页
                    router.push('/');
                }
            } catch (error) {
                console.error('Auth callback error:', error);
                router.push('/');
            }
        };

        handleAuthCallback();
    }, [router, supabase]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">正在验证身份...</p>
            </div>
        </div>
    );
}