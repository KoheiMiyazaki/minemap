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

/**
 * オンメモリリソース原則に基づく iOS Safari apple-touch-icon 動的生成:
 * リポジトリ内にバイナリPNGファイルを持たず、Canvasからオンメモリで180x180 PNGを合成してheadに付与する。
 */
export function injectOnMemoryAppleTouchIcon(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[rel="apple-touch-icon"]')) return;

  try {
    const size = 180;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Base green grassy terrain
    ctx.fillStyle = '#82c953';
    ctx.fillRect(0, 0, size, size);

    // Pixelated darker grass patches around edges (32x32 pixel scale -> unit = 5.625)
    const u = size / 32;
    const drawPx = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * u), Math.round(y * u), Math.ceil(w * u), Math.ceil(h * u));
    };

    // Outer darker grass border & organic clusters
    drawPx(0, 0, 32, 2, '#5ea33b');
    drawPx(0, 2, 10, 2, '#5ea33b');
    drawPx(22, 2, 10, 2, '#5ea33b');
    drawPx(0, 4, 5, 3, '#5ea33b');
    drawPx(27, 4, 5, 3, '#5ea33b');
    drawPx(0, 25, 5, 7, '#5ea33b');
    drawPx(27, 25, 5, 7, '#5ea33b');
    drawPx(5, 28, 22, 4, '#5ea33b');

    drawPx(0, 0, 6, 2, '#4a852d');
    drawPx(26, 0, 6, 2, '#4a852d');
    drawPx(0, 29, 4, 3, '#4a852d');
    drawPx(28, 29, 4, 3, '#4a852d');

    // Subtle earthy spots & light meadow patches
    drawPx(4, 3, 3, 2, '#b09e70');
    drawPx(26, 24, 3, 3, '#b09e70');
    drawPx(8, 7, 3, 2, '#96d663');
    drawPx(19, 7, 4, 2, '#96d663');
    drawPx(9, 22, 4, 2, '#96d663');

    // Cute pixel-art cottage in upper-left clearing
    drawPx(7, 6, 5, 1, '#7c2d12');
    drawPx(8, 5, 3, 1, '#b84a39');
    drawPx(9, 4, 1, 1, '#c25745');
    drawPx(8, 6, 3, 1, '#b84a39');
    drawPx(8, 7, 3, 3, '#fef3c7');
    drawPx(9, 8, 1, 2, '#854d0e');

    // Tiny pixel flower dots
    drawPx(5, 9, 1, 1, '#f472b6');
    drawPx(6, 8, 1, 1, '#f472b6');
    drawPx(6, 9, 1, 1, '#fde047');
    drawPx(7, 10, 1, 1, '#f472b6');

    drawPx(22, 7, 1, 1, '#fde047');
    drawPx(23, 8, 1, 1, '#ffffff');
    drawPx(24, 7, 1, 1, '#fde047');

    drawPx(7, 23, 1, 1, '#f472b6');
    drawPx(8, 24, 1, 1, '#fde047');
    drawPx(23, 23, 1, 1, '#ffffff');
    drawPx(24, 24, 1, 1, '#fde047');

    // Ocean-blue square mosaic cells spelling "MineMAP" with sandy shoreline
    const glyphs: number[][][] = [
      // M (5x7)
      [
        [1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
      ],
      // i (1x7)
      [[1], [0], [1], [1], [1], [1], [1]],
      // n (4x7)
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
      ],
      // e (4x7)
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [0, 1, 1, 1],
      ],
      // M (5x7)
      [
        [1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1],
      ],
      // A (4x7)
      [
        [0, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
      ],
      // P (4x7)
      [
        [1, 1, 1, 0],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
      ],
    ];

    const cell = 4.6;
    let cursorX = 14;
    const startY = 74;

    // First pass: darker earthy soil brown outline
    ctx.fillStyle = '#5c3a21';
    for (const glyph of glyphs) {
      const cols = glyph[0].length;
      for (let r = 0; r < glyph.length; r++) {
        for (let c = 0; c < cols; c++) {
          if (glyph[r][c]) {
            ctx.fillRect(
              Math.round(cursorX + c * cell - 3),
              Math.round(startY + r * cell - 3),
              Math.ceil(cell + 6),
              Math.ceil(cell + 6)
            );
          }
        }
      }
      cursorX += cols * cell + 5;
    }

    // Second pass: brighter ocean-turquoise water cells
    cursorX = 14;
    for (const glyph of glyphs) {
      const cols = glyph[0].length;
      for (let r = 0; r < glyph.length; r++) {
        for (let c = 0; c < cols; c++) {
          if (glyph[r][c]) {
            ctx.fillStyle = r < 2 ? '#67e8f9' : r < 5 ? '#22d3ee' : '#0ea5e9';
            ctx.fillRect(
              Math.round(cursorX + c * cell),
              Math.round(startY + r * cell),
              Math.ceil(cell),
              Math.ceil(cell)
            );
          }
        }
      }
      cursorX += cols * cell + 5;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = dataUrl;
    document.head.appendChild(link);
  } catch {
    // Fallback silently if canvas is unavailable
  }
}
