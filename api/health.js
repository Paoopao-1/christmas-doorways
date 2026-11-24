// GET /api/health —— 检查数据库与图片存储是否已连接（不返回任何密钥）
import { sql, ensureSchema, json } from './_lib/db.js';

export async function GET() {
  const status = { database: 'missing', blob: process.env.BLOB_READ_WRITE_TOKEN ? 'configured' : 'missing' };
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      await ensureSchema();
      const [{ count }] = await sql()`SELECT count(*)::int AS count FROM gifts`;
      status.database = 'ok';
      status.gifts = count;
    } catch (e) {
      status.database = 'error';
      console.error(e);
    }
  }
  return json(status, status.database === 'ok' ? 200 : 503);
}
