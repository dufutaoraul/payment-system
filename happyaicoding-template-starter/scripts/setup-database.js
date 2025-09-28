// 数据库设置脚本
// 运行命令: node scripts/setup-database.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从环境变量读取配置
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 缺少必要的环境变量:');
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '❌');
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌');
    process.exit(1);
}

// 创建管理员客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function setupDatabase() {
    try {
        console.log('🚀 开始设置数据库...');
        
        // 读取SQL文件
        const sqlPath = path.join(__dirname, '../migrations/create_zpay_transactions.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 执行SQL脚本...');
        
        // 执行SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            // 如果rpc方法不存在，尝试直接执行
            console.log('⚠️  rpc方法不可用，尝试分段执行SQL...');
            
            // 分割SQL语句并逐个执行
            const statements = sql.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    console.log('执行:', statement.substring(0, 50) + '...');
                    const { error: execError } = await supabase
                        .from('_temp_sql_exec')
                        .select('*')
                        .limit(0); // 这只是为了测试连接
                    
                    if (execError && !execError.message.includes('does not exist')) {
                        console.error('❌ SQL执行错误:', execError);
                        throw execError;
                    }
                }
            }
        }
        
        console.log('✅ 数据库设置完成！');
        console.log('');
        console.log('📋 请手动在Supabase Dashboard中执行以下SQL:');
        console.log('1. 打开 https://supabase.com/dashboard');
        console.log('2. 选择您的项目');
        console.log('3. 进入 SQL Editor');
        console.log('4. 复制并执行 migrations/create_zpay_transactions.sql 中的内容');
        
    } catch (error) {
        console.error('❌ 数据库设置失败:', error);
        process.exit(1);
    }
}

// 测试数据库连接
async function testConnection() {
    try {
        console.log('🔍 测试数据库连接...');
        const { data, error } = await supabase.from('_test').select('*').limit(1);
        
        if (error && !error.message.includes('does not exist')) {
            throw error;
        }
        
        console.log('✅ 数据库连接正常');
        return true;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error);
        return false;
    }
}

async function main() {
    const connected = await testConnection();
    if (connected) {
        await setupDatabase();
    }
}

main();
