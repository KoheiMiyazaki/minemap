import { registerSW } from 'virtual:pwa-register';

/**
 * PWAキャッシュクリーン更新ハーネス:
 * Service Workerの更新を検知したら即座に古いキャッシュを破棄して最新アプリへ自動リロードする。
 */
export function initPWACacheCleanUpdater(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Clear stale runtime caches and trigger immediate activation
      if ('caches' in window) {
        caches.keys().then((names) => {
          Promise.all(
            names
              .filter((name) => !name.includes('google-fonts') && !name.includes('gstatic-fonts'))
              .map((name) => caches.delete(name))
          ).finally(() => {
            updateSW(true);
          });
        });
      } else {
        updateSW(true);
      }
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Poll for updates periodically and when app returns to foreground
      const checkUpdate = () => {
        registration.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });
      setInterval(checkUpdate, 60 * 30 * 1000);
    },
  });
}

