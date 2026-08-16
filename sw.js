// 増田整形外科 病床管理アプリ Service Worker
//
// 方針: ネットワーク優先(network-first)。
//   - オンラインのときは必ず最新版を取りに行くので、Netlifyにファイルを上げ直せば
//     アプリを開き直すだけで新しい内容が反映される(更新が古いまま固まらない)。
//   - 院内Wi-Fiが不安定・圏外のときだけキャッシュした前回の内容を表示する。
// この方針は「iPadだけで更新したい」という要件と相性が良いため意図的に選んでいる。

const CACHE = "masuda-bed-mgmt-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 取得できた最新版をキャッシュに保存(オフライン時の予備として使う)
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        // オフライン時: キャッシュ → それも無ければトップページを返す
        caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
  );
});
