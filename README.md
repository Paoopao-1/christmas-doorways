# 圣诞之门 · Christmas Doorways

为一个重要的人，亲手准备一份**每天打开一扇门、直到圣诞节才完整揭晓**的数字圣诞礼物。

- 线上地址：https://christmas-doorways.vercel.app
- 风格：手作圣诞绘本 —— 哑光纸张、手绘线条、水粉笔触、邮票齿孔、复古贺卡

## 功能

**送礼人（创建礼物）**

1. 送给谁：选择关系，写下收礼人称呼与署名（可匿名）
2. 想象：选一个画面（落雪的公寓 / 无月的森林 / 午夜列车站 / 只属于你们的地方），写下一件关于 TA 的小事
3. 世界：生成专属的圣诞世界（世界名、想象锚点、情绪弧线），可换一个方向
4. 塑造：7 / 12 / 24 / 25 天或自定义（3–31），结束于圣诞节或平安夜，是否允许提前打开；实时预览日历小屋排版
5. 装饰圣诞树：三种画风（手绘油画 / 复古手作 / 梦幻星光）、挂饰配色、树顶星星、最多 3 张照片挂饰、挂饰留言、开场信、最终祝福
6. 编辑礼盒：逐扇改写每天的标题和内容，或换一份内容
7. 包装：礼物封面 + 放进圣诞信封的动画（封口、火漆、邮票、邮戳）
8. 送出：保存到数据库，生成唯一的 `/gift/<礼物编号>` 链接，可复制或调用手机分享

**收礼人（打开礼物，无需登录）**

- 信封 → 开场信 → 手绘圣诞小屋倒数日历（窗户 / 邮票 / 信封 / 礼盒 / 贺卡五种开启动画）
- 未到日期的门由**服务器**按日期拒绝打开（除非送礼人允许提前打开）
- 每打开一扇门，挂饰飞上圣诞树；圣诞树可拖动 / 触摸旋转，点挂饰重温那一天
- 最后一天放上树顶星星，整棵树点亮，揭晓最终祝福
- 开启进度保存在数据库，刷新或换设备不会丢失

## 技术结构

```
index.html            单页应用入口
css/styles.css        手作风格设计系统
js/                   原生 ES Modules，无构建步骤
  pages/              各页面（创建流程 + 收礼人视图）
  tree.js             Canvas 2D 交互圣诞树（三种画风）
  ui/calendar.js      手绘圣诞小屋倒数日历
  share.js            离线链接（服务器不可用时的备用方案）
api/                  Vercel Functions（Node.js）
  gifts/index.js            POST  /api/gifts                 创建礼物，上传照片，返回 Gift ID
  gifts/[id]/index.js       GET   /api/gifts/:id             读取礼物（只读）与进度
  gifts/[id]/progress.js    POST  /api/gifts/:id/progress    更新开启进度（服务器校验日期）
  health.js                 GET   /api/health                数据库 / 图片存储连接状态
db/schema.sql         数据库结构
vercel.json           /gift/:id 路由重写与响应头
```

- **数据库**：Neon Postgres（Vercel Marketplace 免费方案），表 `gifts` 与 `gift_progress`，首次请求自动建表
- **图片存储**：Vercel Blob（公开读取，文件名带随机后缀）
- **安全**：只接受白名单字段并限制长度；收礼人只能更新进度，不能修改礼物；礼物编号为 10 位随机字符

## 本地运行

只看前端（不连数据库，送出时会生成离线链接）：

```bash
python3 serve.py
```

打开 http://localhost:5173

连同接口一起运行（需要先 `vercel link` 并拉取环境变量）：

```bash
npm install
vercel env pull .env.local
vercel dev
```

## 部署

1. 在 Vercel 新建项目并关联本仓库（Framework Preset 选 **Other**，无需构建命令，输出目录为仓库根目录）
2. Storage → 创建 **Blob** 存储并连接到项目（自动注入 `BLOB_READ_WRITE_TOKEN`）
3. Marketplace → 添加 **Neon** 免费数据库并连接到项目（自动注入 `DATABASE_URL`）
4. 推送到 `main` 分支即自动部署；访问 `/api/health` 确认 `database: ok`、`blob: configured`

环境变量见 `.env.example`，**不要把真实密钥提交到仓库**。

## 已知限制

- Vercel 的默认域名在中国大陆访问可能不稳定；面向国内用户建议绑定已备案的自定义域名或使用国内托管
- 字体从 jsDelivr 加载，加载失败时会回退到系统楷体 / 宋体
- 歌曲为占位，插画为程序生成的矢量图（建议替换为插画师作品）
- 解锁日期按送礼人创建礼物时所在的时区计算
