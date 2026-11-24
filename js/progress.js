// 收礼人进度
//   正式礼物（/gift/<id>）：保存在服务器数据库，换设备、刷新都不会丢
//   创建者预览 / 示例礼物 / 离线链接：保存在当前浏览器
const PREFIX = 'cd.progress.v2:';

const empty = () => ({ welcomed: false, opened: [], simDay: 1, answers: {}, done: {}, starPlaced: false });

let id = 'preview';
let remote = null;   // 正式礼物的编号
let state = load();
let answerTimer;

function load() {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}
const save = () => { try { localStorage.setItem(PREFIX + id, JSON.stringify(state)); } catch { /* ignore */ } };

async function post(body) {
  const res = await fetch(`/api/gifts/${remote}/progress`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '保存失败');
  return data;
}

export const progress = {
  use(giftId) { remote = null; id = giftId; state = load(); return state; },
  useRemote(giftId, data) { remote = giftId; id = `remote:${giftId}`; state = { ...empty(), ...data }; return state; },
  isRemote: () => !!remote,
  get: () => state,

  set(patch) {
    const prev = state;
    state = { ...state, ...patch };
    if (!remote) { save(); return state; }
    if (patch.welcomed && !prev.welcomed) post({ op: 'welcome' }).catch(() => {});
    if (patch.starPlaced && !prev.starPlaced) post({ op: 'star' }).catch(() => {});
    if (patch.done) {
      for (const [day, v] of Object.entries(patch.done)) if (prev.done[day] !== v) post({ op: 'done', day: +day, value: v }).catch(() => {});
    }
    if (patch.answers) {
      clearTimeout(answerTimer);
      answerTimer = setTimeout(() => {
        for (const [day, text] of Object.entries(patch.answers)) if (prev.answers[day] !== text) post({ op: 'answer', day: +day, text }).catch(() => {});
      }, 600);
    }
    return state;
  },

  // 打开一扇门：正式礼物由服务器判断日期，没到日子会被拒绝
  async open(day) {
    if (remote) {
      const data = await post({ op: 'open', day });
      state = { ...state, ...data.progress };
      return state;
    }
    if (!state.opened.includes(day)) state = { ...state, opened: [...state.opened, day] };
    save();
    return state;
  },

  reset() { state = empty(); if (!remote) save(); return state; },
};
