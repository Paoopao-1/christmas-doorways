// 数据库：Neon Postgres（通过 Vercel Marketplace 连接，环境变量 DATABASE_URL）
import { neon } from '@neondatabase/serverless';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

let client;
let ready;

export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new HttpError(503, '数据库还没有配置（缺少 DATABASE_URL）');
    client = neon(url);
  }
  return client;
}

// 首次调用时自动建表（与 db/schema.sql 一致）
export function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const q = sql();
      await q`CREATE TABLE IF NOT EXISTS gifts (
        id          TEXT PRIMARY KEY,
        recipient   TEXT NOT NULL,
        sender      TEXT,
        world_key   TEXT,
        days        INTEGER NOT NULL,
        tree_style  TEXT,
        data        JSONB NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await q`CREATE TABLE IF NOT EXISTS gift_progress (
        gift_id     TEXT PRIMARY KEY REFERENCES gifts(id) ON DELETE CASCADE,
        data        JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function fail(err) {
  if (err instanceof HttpError) return json({ error: err.message }, err.status);
  console.error(err);
  return json({ error: '服务器开小差了，请稍后再试' }, 500);
}

export async function readJson(request, maxBytes) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) throw new HttpError(413, '内容太大了');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, '内容太大了');
  try { return JSON.parse(text); } catch { throw new HttpError(400, '数据格式不对'); }
}
