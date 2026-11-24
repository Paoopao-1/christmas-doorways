-- 圣诞之门 · 数据库结构（Neon Postgres）
-- 接口首次运行时会自动执行同样的建表语句（见 api/_lib/db.js），这里供查阅和手动初始化。

-- 每份礼物一行：唯一 Gift ID + 完整礼物内容（JSONB）
CREATE TABLE IF NOT EXISTS gifts (
  id          TEXT PRIMARY KEY,               -- 随机生成的 10 位礼物编号
  recipient   TEXT NOT NULL,                  -- 收礼人称呼
  sender      TEXT,                           -- 送礼人署名（匿名时为空）
  world_key   TEXT,                           -- 圣诞世界主题
  days        INTEGER NOT NULL,               -- 日历天数
  tree_style  TEXT,                           -- 圣诞树画风
  data        JSONB NOT NULL,                 -- 完整内容：每日礼盒、照片地址、树的配置、信、最终祝福、时区等
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 收礼人的开启进度（与礼物分开保存；收礼人只能更新进度，不能修改礼物）
CREATE TABLE IF NOT EXISTS gift_progress (
  gift_id     TEXT PRIMARY KEY REFERENCES gifts(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- welcomed / opened[] / starPlaced / answers / done
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
