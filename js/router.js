// 路由：创建者页面用 #/create/...；收礼人的正式礼物链接是 /gift/<礼物编号>
const GIFT_PATH = /^\/gift\/([A-Za-z0-9]{8,24})\/?$/;

export function currentPath() {
  const m = location.pathname.match(GIFT_PATH);
  if (m) return `/server/${m[1]}`;
  return location.hash.replace(/^#/, '') || '/';
}

export function navigate(path, replace = false) {
  // 从 /gift/<id> 页面跳回创建流程时，先回到网站根路径
  if (location.pathname !== '/' && location.pathname !== '/index.html') {
    location.assign(`/#${path}`);
    return;
  }
  if (replace) location.replace(`#${path}`);
  else location.hash = path;
}
