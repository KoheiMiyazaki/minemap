import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Globe,
  Moon,
  Navigation,
  Plus,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DIMENSION_CONFIGS,
  type DimensionId,
  type WorldProfile,
} from '../data/minecraftMapData';
import { parseCoordinateInput, type PlayerPosition } from '../utils/coordinates';

interface WorldAndPlayerModalProps {
  isOpen: boolean;
  worlds: WorldProfile[];
  activeWorldId: string;
  activeDimension: DimensionId;
  playerPosition: PlayerPosition | null;
  isDark: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  onSelectWorld: (id: string) => void;
  onCreateWorld: (name: string) => void;
  onDeleteWorld: (id: string) => void;
  onSavePlayerPosition: (pos: PlayerPosition | null) => void;
  onImportWorldData: (imported: WorldProfile[]) => void;
}

export const WorldAndPlayerModal: React.FC<WorldAndPlayerModalProps> = ({
  isOpen,
  worlds,
  activeWorldId,
  activeDimension,
  playerPosition,
  isDark,
  onClose,
  onToggleTheme,
  onSelectWorld,
  onCreateWorld,
  onDeleteWorld,
  onSavePlayerPosition,
  onImportWorldData,
}) => {
  const [px, setPx] = useState(String(playerPosition?.x ?? 0));
  const [py, setPy] = useState(String(playerPosition?.y ?? 64));
  const [pz, setPz] = useState(String(playerPosition?.z ?? 0));
  const [pDim, setPDim] = useState<DimensionId>(playerPosition?.dimension ?? activeDimension);
  const [quickPaste, setQuickPaste] = useState('');
  const [newWorldName, setNewWorldName] = useState('');
  const [importText, setImportText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPx(String(playerPosition?.x ?? 0));
    setPy(String(playerPosition?.y ?? 64));
    setPz(String(playerPosition?.z ?? 0));
    setPDim(playerPosition?.dimension ?? activeDimension);
    setQuickPaste('');
    setFeedback(null);
  }, [isOpen, playerPosition, activeDimension]);

  if (!isOpen) return null;

  const toggleSign = (val: string, setter: (v: string) => void) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0') {
      setter('-');
      return;
    }
    setter(trimmed.startsWith('-') ? trimmed.slice(1) : '-' + trimmed);
  };

  const handleQuickPaste = (val: string) => {
    setQuickPaste(val);
    const parsed = parseCoordinateInput(val);
    if (parsed) {
      setPx(String(parsed.x));
      if (parsed.y !== null) setPy(String(parsed.y));
      setPz(String(parsed.z));
    }
  };

  const handleApplyPlayerPos = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(px, 10);
    const y = parseInt(py || '64', 10);
    const z = parseInt(pz, 10);
    if (Number.isNaN(x) || Number.isNaN(z)) {
      setFeedback('XとZ座標に整数を入力してください。');
      return;
    }
    onSavePlayerPosition({ x, y: Number.isNaN(y) ? 64 : y, z, dimension: pDim });
    setFeedback('現在地を更新しました。各地点までの距離が表示されます。');
  };

  const handleCreateWorld = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWorldName.trim();
    if (!trimmed) return;
    onCreateWorld(trimmed);
    setNewWorldName('');
    setFeedback(`ワールド「${trimmed}」を作成しました。`);
  };

  const handleExportCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(worlds, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setFeedback('クリップボードへのコピーに失敗しました。');
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(worlds, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minemap-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].waypoints) {
        setFeedback('JSONの形式が正しくありません。');
        return;
      }
      onImportWorldData(parsed);
      setImportText('');
      setFeedback('ワールドデータを読み込みました。');
    } catch {
      setFeedback('JSONの解析に失敗しました。');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            現在地・ワールド管理
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="外観テーマ切替"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {feedback && (
            <div className="rounded-xl bg-emerald-500/12 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {feedback}
            </div>
          )}

          {/* Section 1: Player Position */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Navigation className="h-4 w-4 text-sky-500" />
                <span>プレイヤー現在地（距離・方角計算）</span>
              </h3>
              {playerPosition && (
                <button
                  type="button"
                  onClick={() => {
                    onSavePlayerPosition(null);
                    setFeedback('現在地ピンを解除しました。');
                  }}
                  className="text-xs font-medium text-rose-500 hover:underline"
                >
                  解除
                </button>
              )}
            </div>

            <form onSubmit={handleApplyPlayerPos} className="space-y-2.5">
              <input
                type="text"
                value={quickPaste}
                onChange={(e) => handleQuickPaste(e.target.value)}
                placeholder="座標を一括貼り付け (例: 240 68 -120)"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'X', val: px, set: setPx },
                  { label: 'Y', val: py, set: setPy },
                  { label: 'Z', val: pz, set: setPz },
                ].map((axis) => (
                  <div
                    key={axis.label}
                    className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSign(axis.val, axis.set)}
                      className="flex min-h-[44px] w-8 shrink-0 items-center justify-center border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-500"
                    >
                      ±
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={axis.val}
                      onChange={(e) => axis.set(e.target.value)}
                      aria-label={`現在地 ${axis.label}`}
                      className="min-h-[44px] w-full bg-transparent px-2 text-sm font-semibold font-mono-tabular text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pDim}
                  onChange={(e) => setPDim(e.target.value as DimensionId)}
                  className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100"
                >
                  {DIMENSION_CONFIGS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon} {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-500 whitespace-nowrap"
                >
                  現在地を反映
                </button>
              </div>
            </form>
          </section>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: World Profiles */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Globe className="h-4 w-4 text-emerald-500" />
              <span>ワールド一覧（自動保存）</span>
            </h3>

            <div className="space-y-1.5">
              {worlds.map((world) => {
                const isActive = world.id === activeWorldId;
                return (
                  <div
                    key={world.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectWorld(world.id)}
                      className="flex min-h-[40px] flex-1 items-center justify-between gap-2 text-left"
                    >
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {world.name}
                      </span>
                      <span className="shrink-0 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                        {world.waypoints.length} 地点
                      </span>
                    </button>
                    {worlds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteWorld(world.id)}
                        aria-label={`${world.name}を削除`}
                        className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleCreateWorld} className="flex items-center gap-2">
              <input
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                placeholder="新しいワールド名（例: マルチ鯖）"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-100 px-3.5 text-xs font-semibold text-white dark:text-slate-900 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>追加</span>
              </button>
            </form>
          </section>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 3: Backup Export / Import */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              データのバックアップ・共有（JSON）
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportCopy}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                {copiedJson ? <Check className="h-4 w-4 text-emerald-500" /> : <Download className="h-4 w-4" />}
                <span>{copiedJson ? 'JSONをコピー済' : 'JSONコピー'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>ファイル保存</span>
              </button>
            </div>

            <div className="space-y-2">
              <textarea
                rows={2}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="エクスポートしたJSONデータをここに貼り付けて復元..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono-tabular text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              {importText.trim() && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <Upload className="h-4 w-4" />
                  <span>JSONから復元する</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Fixed Bottom Footer Bar for Mobile Thumb Reach */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-5 py-3.5 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 transition hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.99]"
          >
            とじる
          </button>
        </div>
      </div>
    </div>
  );
};
