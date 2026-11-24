// GET /api/gifts/:id —— 收礼人读取礼物（只读）和开启进度
import { sql, ensureSchema, json, fail, HttpError } from '../../_lib/db.js';
import { ID_RE, todayIndex, emptyProgress } from '../../_lib/gift.js';

export async function GET(request) {
  try {
    const id = new URL(request.url).pathname.split('/').filter(Boolean)[2];
    if (!ID_RE.test(id || '')) throw new HttpError(404, '找不到这份礼物');
    await ensureSchema();
    const rows = await sql()`
      SELECT g.data AS gift, p.data AS progress
      FROM gifts g LEFT JOIN gift_progress p ON p.gift_id = g.id
      WHERE g.id = ${id}`;
    if (!rows.length) throw new HttpError(404, '找不到这份礼物');
    const { gift, progress } = rows[0];
    return json({ id, gift, progress: { ...emptyProgress(), ...(progress || {}) }, today: todayIndex(gift) });
  } catch (err) {
    return fail(err);
  }
}
