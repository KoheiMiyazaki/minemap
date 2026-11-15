import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Navigation, Plus, Search, X } from 'lucide-react';
import {
  CATEGORY_CONFIGS,
  DIMENSION_CONFIGS,
  FILTER_GROUPS,
  MOVEMENT_SPEED_PRESETS,
  type DimensionId,
  type FilterGroupId,
  type Waypoint,
} from '../data/minecraftMapData';
import {
  calcCardinalDirection,
  calcHorizontalDistance,
  calcTravelTimeSeconds,
  formatDurationJa,
  type PlayerPosition,
} from '../utils/coordinates';

interface WaypointListPanelProps {
  waypoints: Waypoint[];
  activeDimension: DimensionId;
  selectedWaypointId: string | null;
  playerPosition: PlayerPosition | null;
  onChangeDimension: (dim: DimensionId) => void;
  onSelectWaypoint: (wp: Waypoint) => void;
  onOpenAddModal: () => void;
  onOpenPlayerSettings: () => void;
}

type SortMode = 'distance' | 'newest' | 'name';

export const WaypointListPanel: React.FC<WaypointListPanelProps> = ({
  waypoints,
  activeDimension,
  selectedWaypointId,
  playerPosition,
  onChangeDimension,
  onSelectWaypoint,
  onOpenAddModal,
  onOpenPlayerSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<FilterGroupId>('all');
  const [sortMode, setSortMode] = useState<SortMode>('distance');

  const pagerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimerRef = useRef<number | null>(null);
  const activeGroupRef = useRef<FilterGroupId>(filterGroup);
  activeGroupRef.current = filterGroup;

  const refPoint = useMemo(
    () =>
      playerPosition && playerPosition.dimension === activeDimension
        ? { x: playerPosition.x, z: playerPosition.z, isPlayer: true }
        : { x: 0, z: 0, isPlayer: false },
    [playerPosition, activeDimension]
  );

  const sprintSpeed = useMemo(
    () =>
      (MOVEMENT_SPEED_PRESETS.find((p) => p.id === 'sprint') ?? MOVEMENT_SPEED_PRESETS[0])
        .speedBlocksPerSec,
    []
  );

  // Precompute sorted & filtered waypoints per filter group so swiping shows live adjacent tabs
  const waypointsByGroup = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const dimList = waypoints.filter((wp) => {
      if (wp.dimension !== activeDimension) return false;
      if (q) {
        const cat = CATEGORY_CONFIGS.find((c) => c.id === wp.category);
        const hay = `${wp.name} ${wp.note} ${cat?.label ?? ''} ${wp.x} ${wp.z}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortedDimList = [...dimList].sort((a, b) => {
      if (sortMode === 'distance') {
        return calcHorizontalDistance(refPoint, a) - calcHorizontalDistance(refPoint, b);
      }
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return b.updatedAt - a.updatedAt;
    });

    const map: Record<FilterGroupId, Waypoint[]> = {
      all: sortedDimList,
      spawn_base: [],
      structures: [],
      nether_travel: [],
      resources: [],
    };

    for (const wp of sortedDimList) {
      const cat = CATEGORY_CONFIGS.find((c) => c.id === wp.category);
      if (cat && cat.filterGroup !== 'all') {
        map[cat.filterGroup].push(wp);
      }
    }

    return map;
  }, [waypoints, activeDimension, searchQuery, sortMode, refPoint]);

  const scrollToGroup = useCallback((groupId: FilterGroupId, smooth: boolean) => {
    const pager = pagerRef.current;
    if (!pager) return;
    const idx = FILTER_GROUPS.findIndex((g) => g.id === groupId);
    if (idx < 0) return;

    const targetLeft = idx * pager.clientWidth;
    if (smooth) {
      isProgrammaticScrollRef.current = true;
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 380);
      pager.scrollTo({ left: targetLeft, behavior: 'smooth' });
    } else {
      pager.scrollTo({ left: targetLeft, behavior: 'auto' });
    }
  }, []);

  const handleSelectTab = (groupId: FilterGroupId) => {
    setFilterGroup(groupId);
    scrollToGroup(groupId, true);
  };

  // Keep tab pill bar centered on active tab
  useEffect(() => {
    const btn = tabRefs.current[filterGroup];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [filterGroup]);

  // Keep pager aligned when container transitions from hidden -> visible or resizes
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;

    const observer = new ResizeObserver(() => {
      if (pager.clientWidth > 0) {
        const idx = FILTER_GROUPS.findIndex((g) => g.id === activeGroupRef.current);
        if (idx >= 0) {
          pager.scrollTo({ left: idx * pager.clientWidth, behavior: 'auto' });
        }
      }
    });
    observer.observe(pager);
    return () => {
      observer.disconnect();
      if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handlePagerScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    const pager = pagerRef.current;
    if (!pager || pager.clientWidth === 0) return;

    const idx = Math.round(pager.scrollLeft / pager.clientWidth);
    const matched = FILTER_GROUPS[idx];
    if (matched && matched.id !== filterGroup) {
      setFilterGroup(matched.id);
    }
  };

  const cycleSort = () => {
    setSortMode((prev) =>
      prev === 'distance' ? 'newest' : prev === 'newest' ? 'name' : 'distance'
    );
  };

  const sortLabel =
    sortMode === 'distance' ? '近い順' : sortMode === 'newest' ? '新しい順' : '名前順';

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 overflow-hidden">
      {/* Dimension Switcher + Search + Swipeable Category Tabs + Player Reference */}
      <div className="space-y-2.5 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1">
          {DIMENSION_CONFIGS.map((dim) => {
            const active = activeDimension === dim.id;
            const count = waypoints.filter((w) => w.dimension === dim.id).length;
            return (
              <button
                key={dim.id}
                type="button"
                onClick={() => onChangeDimension(dim.id)}
                className={`flex min-h-[40px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{dim.icon}</span>
                <span>{dim.shortName}</span>
                <span className="text-[11px] font-mono-tabular opacity-65">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="地点名・メモ・座標を検索..."
              className="min-h-[44px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="検索をクリア"
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={cycleSort}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>{sortLabel}</span>
          </button>
        </div>

        {/* Category Filter Tabs (Synced with Horizontal Swipe Pager) */}
        <div className="custom-scrollbar flex items-center gap-1 overflow-x-auto pb-0.5">
          {FILTER_GROUPS.map((fg) => {
            const active = filterGroup === fg.id;
            const groupCount = waypointsByGroup[fg.id].length;
            return (
              <button
                key={fg.id}
                ref={(el) => {
                  tabRefs.current[fg.id] = el;
                }}
                type="button"
                onClick={() => handleSelectTab(fg.id)}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{fg.label}</span>
                <span
                  className={`text-[11px] font-mono-tabular ${
                    active ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {groupCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Reference Strip */}
        <button
          type="button"
          onClick={onOpenPlayerSettings}
          className="flex min-h-[40px] w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-1.5 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
            <Navigation className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <span>
              {refPoint.isPlayer
                ? `現在地: X ${refPoint.x} · Z ${refPoint.z}`
                : '距離の基準: 原点 (0, 0)'}
            </span>
          </span>
          <span className="font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap">
            現在地を設定
          </span>
        </button>
      </div>

      {/* Horizontal Swipeable Pager across Category Tabs */}
      <div
        ref={pagerRef}
        onScroll={handlePagerScroll}
        className="flex flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FILTER_GROUPS.map((fg) => {
          const groupWaypoints = waypointsByGroup[fg.id];
          return (
            <div
              key={fg.id}
              className="custom-scrollbar h-full w-full shrink-0 snap-center snap-always overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80"
            >
              {groupWaypoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  <div className="text-3xl">🗺️</div>
                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    「{fg.label}」に該当する地点がありません
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    左右スワイプで他のタブへ切り替えるか、新しい地点を登録できます。
                  </p>
                  <button
                    type="button"
                    onClick={onOpenAddModal}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <Plus className="h-4 w-4" />
                    <span>地点を登録</span>
                  </button>
                </div>
              ) : (
                groupWaypoints.map((wp) => {
                  const isSelected = wp.id === selectedWaypointId;
                  const cat = CATEGORY_CONFIGS.find((c) => c.id === wp.category);
                  const dist = calcHorizontalDistance(refPoint, wp);
                  const dir = calcCardinalDirection(refPoint, wp);
                  const sprintTime = formatDurationJa(
                    calcTravelTimeSeconds(dist, sprintSpeed)
                  );

                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => onSelectWaypoint(wp)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        isSelected
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 text-xl bg-white dark:bg-slate-900"
                        style={{ borderColor: wp.color }}
                      >
                        {wp.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                            {wp.name}
                          </span>
                          <span className="shrink-0 text-xs font-semibold font-mono-tabular text-emerald-600 dark:text-emerald-400">
                            {dist.toLocaleString()}B · {dir.label}
                          </span>
                        </div>

                        <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                          <span className="truncate">
                            X:{wp.x} · Y:{wp.y ?? '—'} · Z:{wp.z} ·{' '}
                            <span className="font-sans">{cat?.label}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                            走 {sprintTime}
                          </span>
                        </div>

                        {wp.note && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {wp.note}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
