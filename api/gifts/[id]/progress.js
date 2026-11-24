// POST /api/gifts/:id/progress —— 更新收礼人的开启进度（不能修改礼物本身）
// 服务器按日期判断：还没到日子的门不能打开（除非送礼人允许提前打开）。
import { sql, ensureSchema, json, fail, readJson, HttpError } from '../../_lib/db.js';
import { ID_RE, todayIndex, emptyProgress } from '../../_lib/gift.js';

export async function POST(request) {
  try {
    const id = new URL(request.url).pathname.split('/').filter(Boolean)[2];
    if (!ID_RE.test(id || '')) throw new HttpError(404, '找不到这份礼物');
    const body = await readJson(request, 8 * 1024);
    await ensureSchema();
    const q = sql();
    const rows = await q`
      SELECT g.data AS gift, p.data AS progress
      FROM gifts g LEFT JOIN gift_progress p ON p.gift_id = g.id
      WHERE g.id = ${id}`;
    if (!rows.length) throw new HttpError(404, '找不到这份礼物');
    const gift = rows[0].gift;
    const pr = { ...emptyProgress(), ...(rows[0].progress || {}) };
    const today = todayIndex(gift);
    const day = parseInt(body.day, 10);
    const isOpened = (d) => pr.opened.includes(d);

    switch (body.op) {
      case 'welcome':
        pr.welcomed = true;
        break;
      case 'open':
        if (!(day >= 1 && day <= gift.days)) throw new HttpError(400, '没有这扇门');
        if (day > today && !gift.allowEarly) throw new HttpError(403, '这扇门还没到打开的日子');
        if (!isOpened(day)) pr.opened = [...pr.opened, day].sort((a, b) => a - b);
        pr.welcomed = true;
        break;
      case 'star':
        if (!isOpened(gift.days)) throw new HttpError(403, '最后一扇门还没有打开');
        pr.starPlaced = true;
        break;
      case 'answer':
        if (!isOpened(day)) throw new HttpError(403, '这扇门还没有打开');
        pr.answers = { ...pr.answers, [day]: String(body.text ?? '').slice(0, 500) };
        break;
      case 'done':
        if (!isOpened(day)) throw new HttpError(403, '这扇门还没有打开');
        pr.done = { ...pr.done, [day]: !!body.value };
        break;
      default:
        throw new HttpError(400, '不支持的操作');
    }

    await q`
      INSERT INTO gift_progress (gift_id, data, updated_at) VALUES (${id}, ${JSON.stringify(pr)}::jsonb, now())
      ON CONFLICT (gift_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return json({ progress: pr, today });
  } catch (err) {
    return fail(err);
  }
}
