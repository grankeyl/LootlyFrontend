export function preloadImages(urls: (string | null | undefined)[], timeout = 15000) {
  const u = (urls || []).filter(Boolean) as string[];
  if (!u.length) return Promise.resolve();

  return Promise.all(
    u.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const done = () => resolve();
          const tid = window.setTimeout(done, timeout);

          img.onload = () => {
            clearTimeout(tid);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(tid);
            resolve();
          };

          img.src = src;
        })
    )
  );
}