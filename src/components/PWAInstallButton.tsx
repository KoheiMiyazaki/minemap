import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-slate-950/85 active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>アプリ追加</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/65 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-slate-950/80 whitespace-nowrap shrink-0"
        >
          <Share className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>ホーム画面に追加</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  iPhone / iPad に追加
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="閉じる"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>1. Safari画面下部の「共有」アイコンをタップします。</li>
                <li>2. メニューを下へスクロールし「ホーム画面に追加」を選択します。</li>
                <li>3. 右上の「追加」を押すとオフラインでも開けるアプリになります。</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-slate-100 py-2.5 text-sm font-semibold text-white dark:text-slate-900 transition hover:opacity-90"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
