// POST /api/gifts —— 保存一份新礼物，返回唯一 Gift ID
import { put } from '@vercel/blob';
import { sql, ensureSchema, json, fail, readJson, HttpError } from '../_lib/db.js';
import { sanitizeGift, parsePhotos, newId, emptyProgress } from '../_lib/gift.js';

export async function POST(request) {
  try {
    const body = await readJson(request, 4 * 1024 * 1024);
    const gift = sanitizeGift(body);
    const photos = parsePhotos(body.photos);
    await ensureSchema();
    const q = sql();

    let id;
    for (let i = 0; i < 5 && !id; i++) {
      const candidate = newId();
      const rows = await q`SELECT 1 FROM gifts WHERE id = ${candidate}`;
      if (!rows.length) id = candidate;
    }
    if (!id) throw new HttpError(500, '生成礼物编号失败');

    if (photos.length) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, '图片存储还没有配置');
      gift.photos = await Promise.all(photos.map(async (p, i) => {
        const blob = await put(`gifts/${id}/photo-${i + 1}.${p.ext}`, p.buf, {
          access: 'public',
          contentType: p.type,
          addRandomSuffix: true,
        });
        return blob.url;
      }));
    }

    const inserted = await q`
      INSERT INTO gifts (id, recipient, sender, world_key, days, tree_style, data)
      VALUES (${id}, ${gift.to}, ${gift.anonymous ? null : gift.from || null}, ${gift.worldKey}, ${gift.days}, ${gift.treeStyle}, ${JSON.stringify(gift)}::jsonb)
      ON CONFLICT (id) DO NOTHING
      RETURNING id`;
    if (!inserted.length) throw new HttpError(409, '礼物编号冲突，请再试一次');
    await q`INSERT INTO gift_progress (gift_id, data) VALUES (${id}, ${JSON.stringify(emptyProgress())}::jsonb)`;

    return json({ id, path: `/gift/${id}` }, 201);
  } catch (err) {
    return fail(err);
  }
}
