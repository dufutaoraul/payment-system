-- 创建 zpay_transactions 表
CREATE TABLE IF NOT EXISTS zpay_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    out_trade_no VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    money DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'alipay',
    trade_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    trade_no VARCHAR(255),
    param JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_zpay_transactions_user_id ON zpay_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_zpay_transactions_out_trade_no ON zpay_transactions(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_zpay_transactions_trade_status ON zpay_transactions(trade_status);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zpay_transactions_updated_at 
    BEFORE UPDATE ON zpay_transactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 设置行级安全策略 (RLS)
ALTER TABLE zpay_transactions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的交易记录
CREATE POLICY "Users can view own transactions" ON zpay_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的交易记录
CREATE POLICY "Users can insert own transactions" ON zpay_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 系统可以更新交易状态（通过服务角色）
CREATE POLICY "Service role can update transactions" ON zpay_transactions
    FOR UPDATE USING (true);
