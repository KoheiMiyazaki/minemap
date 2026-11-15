import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  Landmark,
  Pickaxe,
  RotateCcw,
  Search,
  Swords,
  X,
} from 'lucide-react';
import {
  ADVENTURE_CHEATSHEET_DATA,
  ORE_Y_GUIDE_DATA,
  SURVIVAL_ROADMAP_DATA,
  type CheatSheetEntry,
  type OreYGuideEntry,
} from '../data/minecraftMapData';
import {
  INDEXED_DB_KEYS,
  loadIndexedDBWithMigration,
  loadLocalJson,
  saveIndexedDB,
} from '../utils/storage';

export type GuideTabId = 'ores' | 'roadmap' | 'structures' | 'events';

const GUIDE_TABS: GuideTabId[] = ['ores', 'roadmap', 'structures', 'events'];

interface AdventureGuideModalProps {
  isOpen: boolean;
  initialTab: GuideTabId;
  activeWorldId: string;
  activeWorldName: string;
  onClose: () => void;
}

type DimFilter = 'all' | 'overworld' | 'nether';

export const AdventureGuideModal: React.FC<AdventureGuideModalProps> = ({
  isOpen,
  initialTab,
  activeWorldId,
  activeWorldName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTabId>(initialTab);
  const [dimFilter, setDimFilter] = useState<DimFilter>('all');
  const [oreQuery, setOreQuery] = useState('');
  const [structureDimFilter, setStructureDimFilter] = useState<DimFilter>('all');
  const [structureQuery, setStructureQuery] = useState('');
  const [eventQuery, setEventQuery] = useState('');
  const [expandedCheatIds, setExpandedCheatIds] = useState<Record<string, boolean>>({
    'desert-pyramid': true,
    'raid-event': true,
  });
  const [progressByWorld, setProgressByWorld] = useState<Record<string, string[]>>(() =>
    loadLocalJson<Record<string, string[]>>(INDEXED_DB_KEYS.ROADMAP_PROGRESS, {})
  );
  const [isProgressHydrated, setIsProgressHydrated] = useState(false);
  const didEditProgressRef = useRef(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const pagerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);
  const activeTabRef = useRef<GuideTabId>(activeTab);
  activeTabRef.current = activeTab;

  const scrollToTab = useCallback((tabId: GuideTabId, smooth: boolean) => {
    const pager = pagerRef.current;
    if (!pager) return;
    const idx = GUIDE_TABS.indexOf(tabId);
    if (idx < 0) return;

    const targetLeft = idx * pager.clientWidth;
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (smooth) {
      isProgrammaticScrollRef.current = true;
      scrollTimerRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 380);
      pager.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      isProgrammaticScrollRef.current = false;
      pager.scrollTo({ left: targetLeft, behavior: 'auto' });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    activeTabRef.current = initialTab;
    setConfirmReset(false);

    const frameId = window.requestAnimationFrame(() => {
      scrollToTab(initialTab, false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, initialTab, scrollToTab]);

  useEffect(() => {
    if (!isOpen) return;
    const btn = tabRefs.current[activeTab];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const pager = pagerRef.current;
    if (!pager) return;

    const observer = new ResizeObserver(() => {
      if (pager.clientWidth > 0) {
        const idx = GUIDE_TABS.indexOf(activeTabRef.current);
        if (idx >= 0) {
          pager.scrollTo({ left: idx * pager.clientWidth, behavior: 'auto' });
        }
      }
    });
    observer.observe(pager);
    return () => {
      observer.disconnect();
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    let active = true;
    loadIndexedDBWithMigration<Record<string, string[]>>(
      INDEXED_DB_KEYS.ROADMAP_PROGRESS,
      {}
    ).then((loaded) => {
      if (!active) return;
      if (!didEditProgressRef.current && loaded && typeof loaded === 'object') {
        setProgressByWorld(loaded);
      }
      setIsProgressHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isProgressHydrated) return;
    didEditProgressRef.current = true;
    void saveIndexedDB(INDEXED_DB_KEYS.ROADMAP_PROGRESS, progressByWorld);
  }, [progressByWorld, isProgressHydrated]);

  const filteredOres = useMemo(() => {
    const q = oreQuery.trim().toLowerCase();
    return ORE_Y_GUIDE_DATA.filter((ore) => {
      if (dimFilter !== 'all' && ore.dimension !== dimFilter) return false;
      if (q) {
        const hay = `${ore.name} ${ore.bestYLabel} ${ore.tip}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dimFilter, oreQuery]);

  const matchesCheatEntry = useCallback((entry: CheatSheetEntry, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      entry.title,
      entry.summary,
      ...entry.recommendedPrep,
      ...entry.keyPoints,
      ...entry.rewards,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  }, []);

  const filteredStructures = useMemo(
    () =>
      ADVENTURE_CHEATSHEET_DATA.filter((entry) => {
        if (entry.category !== 'structure') return false;
        if (structureDimFilter !== 'all' && entry.dimension !== structureDimFilter) return false;
        return matchesCheatEntry(entry, structureQuery);
      }),
    [structureDimFilter, structureQuery, matchesCheatEntry]
  );

  const filteredEvents = useMemo(
    () =>
      ADVENTURE_CHEATSHEET_DATA.filter((entry) => {
        if (entry.category !== 'event') return false;
        return matchesCheatEntry(entry, eventQuery);
      }),
    [eventQuery, matchesCheatEntry]
  );

  const completedStepIds = useMemo(
    () => new Set(progressByWorld[activeWorldId] ?? []),
    [progressByWorld, activeWorldId]
  );

  const totalSteps = useMemo(
    () => SURVIVAL_ROADMAP_DATA.reduce((sum, ph) => sum + ph.steps.length, 0),
    []
  );

  const completedCount = useMemo(() => {
    let count = 0;
    for (const phase of SURVIVAL_ROADMAP_DATA) {
      for (const step of phase.steps) {
        if (completedStepIds.has(step.id)) count += 1;
      }
    }
    return count;
  }, [completedStepIds]);

  const toggleStep = (stepId: string) => {
    setProgressByWorld((prev) => {
      const current = new Set(prev[activeWorldId] ?? []);
      if (current.has(stepId)) {
        current.delete(stepId);
      } else {
        current.add(stepId);
      }
      return { ...prev, [activeWorldId]: Array.from(current) };
    });
  };

  const toggleCheatExpanded = (id: string) => {
    setExpandedCheatIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetProgress = () => {
    setProgressByWorld((prev) => ({ ...prev, [activeWorldId]: [] }));
    setConfirmReset(false);
  };

  const handleSelectTab = (tabId: GuideTabId) => {
    setActiveTab(tabId);
    if (tabId !== 'roadmap') {
      setConfirmReset(false);
    }
    scrollToTab(tabId, true);
  };

  const handlePagerScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    const pager = pagerRef.current;
    if (!pager || pager.clientWidth === 0) return;

    const rawIdx = Math.round(pager.scrollLeft / pager.clientWidth);
    const clampedIdx = Math.max(0, Math.min(GUIDE_TABS.length - 1, rawIdx));
    const matched = GUIDE_TABS[clampedIdx];
    if (matched && matched !== activeTab) {
      setActiveTab(matched);
      if (matched !== 'roadmap') {
        setConfirmReset(false);
      }
    }
  };

  if (!isOpen) return null;

  const getBarMetrics = (ore: OreYGuideEntry) => {
    const minWorld = ore.dimension === 'overworld' ? -64 : 0;
    const maxWorld = ore.dimension === 'overworld' ? 320 : 128;
    const span = maxWorld - minWorld;

    const clampPct = (val: number) =>
      Math.max(0, Math.min(100, ((val - minWorld) / span) * 100));

    const spawnLeft = clampPct(ore.spawnYMin);
    const spawnRight = clampPct(ore.spawnYMax);
    const peakLeft = clampPct(ore.peakYMin);
    const peakRight = clampPct(ore.peakYMax);

    return {
      minLabel: String(minWorld),
      maxLabel: String(maxWorld),
      spawnLeft,
      spawnWidth: Math.max(2, spawnRight - spawnLeft),
      peakLeft,
      peakWidth: Math.max(3, peakRight - peakLeft),
    };
  };

  const dimensionLabel = (dim: 'overworld' | 'nether' | 'end' | 'any') => {
    if (dim === 'overworld') return '地上';
    if (dim === 'nether') return 'ネザー';
    if (dim === 'end') return 'エンド';
    return '全ディメンション';
  };

  const renderCheatCard = (entry: CheatSheetEntry, forceExpand: boolean) => {
    const isExpanded = forceExpand || Boolean(expandedCheatIds[entry.id]);
    return (
      <article
        key={entry.id}
        className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60"
      >
        <button
          type="button"
          onClick={() => toggleCheatExpanded(entry.id)}
          aria-expanded={isExpanded}
          className="flex w-full items-start justify-between gap-2.5 px-3.5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 text-xl leading-none shrink-0">{entry.icon}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {entry.title}
                </h3>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {dimensionLabel(entry.dimension)}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {entry.summary}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
            <span className="text-[10px] font-semibold font-mono-tabular text-amber-600 dark:text-amber-400 whitespace-nowrap">
              {entry.difficultyLabel}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 px-3.5 py-3 text-xs">
            {/* Recommended Prep */}
            <div>
              <div className="font-bold text-slate-700 dark:text-slate-200">
                🎒 持ち物・事前準備
              </div>
              <ul className="mt-1 space-y-1 text-slate-600 dark:text-slate-300">
                {entry.recommendedPrep.map((item, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-slate-400 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Strategy Points */}
            <div>
              <div className="font-bold text-slate-700 dark:text-slate-200">
                ⚡ 攻略ポイント・注意点
              </div>
              <ol className="mt-1 space-y-1.5 text-slate-600 dark:text-slate-300">
                {entry.keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="font-mono-tabular font-semibold text-sky-600 dark:text-sky-400 shrink-0">
                      {i + 1}.
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Rewards */}
            <div>
              <div className="font-bold text-slate-700 dark:text-slate-200">
                🎁 主な戦利品・メリット
              </div>
              <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                {entry.rewards.join(' ／ ')}
              </p>
            </div>

            {entry.mapTip && (
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                地図活用: {entry.mapTip}
              </p>
            )}
          </div>
        )}
      </article>
    );
  };

  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[86vh] max-h-[92vh] sm:h-[700px] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-2xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-emerald-500 shrink-0" />
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
              サバイバル攻略ガイド
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top 4-Tab Bar: Ores | Ender Dragon Roadmap | Structures | Events */}
        <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-2.5">
          <div
            role="tablist"
            aria-label="ガイド表示切り替え"
            className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              ref={(el) => {
                tabRefs.current.ores = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === 'ores'}
              onClick={() => handleSelectTab('ores')}
              className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'ores'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Pickaxe className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>鉱石Y座標</span>
            </button>

            <button
              ref={(el) => {
                tabRefs.current.roadmap = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === 'roadmap'}
              onClick={() => handleSelectTab('roadmap')}
              className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'roadmap'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>🐉</span>
              <span>エンドラ討伐</span>
            </button>

            <button
              ref={(el) => {
                tabRefs.current.structures = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === 'structures'}
              onClick={() => handleSelectTab('structures')}
              className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'structures'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Landmark className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <span>構造物</span>
            </button>

            <button
              ref={(el) => {
                tabRefs.current.events = el;
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === 'events'}
              onClick={() => handleSelectTab('events')}
              className={`flex min-h-[40px] flex-1 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition whitespace-nowrap ${
                activeTab === 'events'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Swords className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              <span>イベント</span>
            </button>
          </div>
        </div>

        {/* Horizontal Swipeable 4-Pane Pager */}
        <div
          ref={pagerRef}
          onScroll={handlePagerScroll}
          aria-label="左右スワイプで鉱石・エンドラ討伐・構造物・イベントガイドを切り替え"
          className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Pane 1: Ore Y-Level Guide */}
          <div className="flex h-full w-full shrink-0 snap-center snap-always flex-col overflow-hidden">
            <div className="shrink-0 space-y-2.5 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {[
                  { id: 'all' as const, label: 'すべて' },
                  { id: 'overworld' as const, label: '🌍 地上' },
                  { id: 'nether' as const, label: '🔥 ネザー' },
                ].map((tab) => {
                  const active = dimFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDimFilter(tab.id)}
                      className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={oreQuery}
                  onChange={(e) => setOreQuery(e.target.value)}
                  placeholder="鉱石名で検索（例: ダイヤ, 古代, 鉄）..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {oreQuery && (
                  <button
                    type="button"
                    onClick={() => setOreQuery('')}
                    aria-label="検索をクリア"
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto px-4 sm:px-5">
              {filteredOres.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  該当する鉱石が見つかりません。
                </div>
              ) : (
                filteredOres.map((ore) => {
                  const metrics = getBarMetrics(ore);
                  return (
                    <div key={ore.id} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="text-xl leading-none shrink-0">{ore.icon}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                              {ore.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                              {ore.dimension === 'overworld' ? '地上' : 'ネザー'} · 生成範囲 Y:{' '}
                              {ore.spawnYMin} ～ {ore.spawnYMax}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            推奨高度
                          </div>
                          <div className="text-xs font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                            {ore.bestYLabel}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="absolute top-0 h-full rounded-full opacity-30"
                            style={{
                              left: `${metrics.spawnLeft}%`,
                              width: `${metrics.spawnWidth}%`,
                              backgroundColor: ore.accentColor,
                            }}
                          />
                          <div
                            className="absolute top-0 h-full rounded-full"
                            style={{
                              left: `${metrics.peakLeft}%`,
                              width: `${metrics.peakWidth}%`,
                              backgroundColor: ore.accentColor,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 dark:text-slate-500">
                          <span>Y:{metrics.minLabel}</span>
                          <span>ピーク帯（濃い色）</span>
                          <span>Y:{metrics.maxLabel}</span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {ore.tip}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pane 2: Ender Dragon Survival Roadmap */}
          <div className="flex h-full w-full shrink-0 snap-center snap-always flex-col overflow-hidden">
            {/* Progress Header */}
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-4 sm:px-5 py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                  {activeWorldName} の進行度
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                    {completedCount} / {totalSteps} 完了（{progressPct}%）
                  </span>
                  {completedCount > 0 && !confirmReset && (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-500"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>リセット</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {confirmReset && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    チェック進捗をすべてリセットしますか？
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[34px] rounded-lg px-2.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
                    >
                      戻る
                    </button>
                    <button
                      type="button"
                      onClick={handleResetProgress}
                      className="min-h-[34px] rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-500"
                    >
                      確定
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Phase List */}
            <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-4 sm:px-5 py-4">
              {SURVIVAL_ROADMAP_DATA.map((phase) => {
                const phaseDone = phase.steps.filter((s) => completedStepIds.has(s.id)).length;
                return (
                  <section key={phase.id} className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-xl leading-none mt-0.5 shrink-0">
                          {phase.icon}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {String(phase.phaseNumber).padStart(2, '0')}. {phase.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {phase.summary}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold font-mono-tabular text-slate-500 dark:text-slate-400">
                        {phaseDone}/{phase.steps.length}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
                      {phase.steps.map((step) => {
                        const checked = completedStepIds.has(step.id);
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => toggleStep(step.id)}
                            className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition ${
                              checked
                                ? 'bg-emerald-500/8 dark:bg-emerald-500/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <span className="mt-0.5 shrink-0">
                              {checked ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-sm font-semibold ${
                                  checked
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {step.title}
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {step.detail}
                              </p>
                              {step.mapTip && (
                                <p className="mt-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                  地図活用: {step.mapTip}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          {/* Pane 3: Structures Strategy Guide */}
          <div className="flex h-full w-full shrink-0 snap-center snap-always flex-col overflow-hidden">
            <div className="shrink-0 space-y-2.5 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                {[
                  { id: 'all' as const, label: 'すべて' },
                  { id: 'overworld' as const, label: '🌍 地上' },
                  { id: 'nether' as const, label: '🔥 ネザー' },
                ].map((tab) => {
                  const active = structureDimFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStructureDimFilter(tab.id)}
                      className={`min-h-[38px] rounded-lg px-2 text-xs font-semibold transition whitespace-nowrap ${
                        active
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={structureQuery}
                  onChange={(e) => setStructureQuery(e.target.value)}
                  placeholder="ピラミッド・沈没船・神殿などで検索..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {structureQuery && (
                  <button
                    type="button"
                    onClick={() => setStructureQuery('')}
                    aria-label="検索をクリア"
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 sm:px-5 py-3.5">
              {filteredStructures.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  該当する構造物が見つかりません。
                </div>
              ) : (
                filteredStructures.map((entry) =>
                  renderCheatCard(entry, structureQuery.trim().length > 0)
                )
              )}
            </div>
          </div>

          {/* Pane 4: Events Strategy Guide */}
          <div className="flex h-full w-full shrink-0 snap-center snap-always flex-col overflow-hidden">
            <div className="shrink-0 space-y-2 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={eventQuery}
                  onChange={(e) => setEventQuery(e.target.value)}
                  placeholder="襲撃・ウィザー・ピグリン交易などで検索..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
                {eventQuery && (
                  <button
                    type="button"
                    onClick={() => setEventQuery('')}
                    aria-label="検索をクリア"
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                襲撃・ボス戦・交易などの準備と立ち回りチートシート（全{filteredEvents.length}件）
              </p>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 sm:px-5 py-3.5">
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  該当するイベントが見つかりません。
                </div>
              ) : (
                filteredEvents.map((entry) =>
                  renderCheatCard(entry, eventQuery.trim().length > 0)
                )
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Close Button */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3.5 pb-safe">
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
