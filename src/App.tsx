import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Globe, Landmark, List, Map as MapIcon, Pickaxe, Plus, Settings2, Swords } from 'lucide-react';
import { AdventureGuideModal, type GuideTabId } from './components/AdventureGuideModal';
import { MapCanvas } from './components/MapCanvas';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { WaypointDetailCard } from './components/WaypointDetailCard';
import { WaypointListPanel } from './components/WaypointListPanel';
import { WaypointModal } from './components/WaypointModal';
import { WorldAndPlayerModal } from './components/WorldAndPlayerModal';
import {
  DEFAULT_WORLDS,
  DIMENSION_CONFIGS,
  STORAGE_KEYS,
  type DimensionId,
  type Waypoint,
  type WorldProfile,
} from './data/minecraftMapData';
import { convertDimensionCoords, type PlayerPosition } from './utils/coordinates';
import {
  INDEXED_DB_KEYS,
  loadIndexedDBWithMigration,
  loadLocalJson,
  loadLocalString,
  saveIndexedDB,
  saveLocalJson,
  saveLocalString,
} from './utils/storage';
/* TODO: 画像差し替え用パス (別バナーやロゴへ差し替える場合はここを変更) */
import brandIconImg from './assets/images/minemap_pixel_icon_v2_1794736804035.jpg';

type MobileTab = 'map' | 'list';

export default function App() {
  // メインデータ（ワールド・地点群・現在地）は IndexedDB に永続化（初期描画のみ移行前キャッシュを参照）
  const [worlds, setWorlds] = useState<WorldProfile[]>(() =>
    loadLocalJson<WorldProfile[]>(STORAGE_KEYS.WORLDS, DEFAULT_WORLDS)
  );
  const [isWorldsHydrated, setIsWorldsHydrated] = useState(false);

  const [playerPosition, setPlayerPosition] = useState<PlayerPosition | null>(() =>
    loadLocalJson<PlayerPosition | null>(STORAGE_KEYS.PLAYER_POSITION, null)
  );
  const [isPlayerHydrated, setIsPlayerHydrated] = useState(false);

  const didEditWorldsRef = useRef(false);
  const didEditPlayerRef = useRef(false);

  // 軽量なUI状態・表示設定は localStorage から同期復元
  const [activeWorldId, setActiveWorldId] = useState<string>(() => {
    const saved = loadLocalString(STORAGE_KEYS.ACTIVE_WORLD_ID);
    return saved || DEFAULT_WORLDS[0].id;
  });
  const [activeDimension, setActiveDimension] = useState<DimensionId>(() => {
    const saved = loadLocalString(STORAGE_KEYS.ACTIVE_DIMENSION) as DimensionId | null;
    return saved === 'nether' || saved === 'end' || saved === 'overworld' ? saved : 'overworld';
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = loadLocalString(STORAGE_KEYS.THEME_MODE);
    if (saved === 'light') return false;
    if (saved === 'dark') return true;
    return true;
  });

  const [initialViewport] = useState<{ x: number; z: number; zoom: number }>(() =>
    loadLocalJson(STORAGE_KEYS.MAP_VIEWPORT, { x: 80, z: 0, zoom: 0.65 })
  );

  const [mobileTab, setMobileTab] = useState<MobileTab>('map');
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
  const [centerTarget, setCenterTarget] = useState<{
    x: number;
    z: number;
    zoom?: number;
    nonce: number;
  } | null>(null);

  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState(false);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [modalInitialCoords, setModalInitialCoords] = useState<{
    x: number;
    y?: number | null;
    z: number;
    dimension: DimensionId;
  } | null>(null);
  const [modalFromMapTap, setModalFromMapTap] = useState(false);
  const [isWorldModalOpen, setIsWorldModalOpen] = useState(false);
  const [guideModalTab, setGuideModalTab] = useState<GuideTabId | null>(null);

  // Hydrate main structured data from IndexedDB (with automatic legacy localStorage migration)
  useEffect(() => {
    let active = true;

    loadIndexedDBWithMigration<WorldProfile[]>(INDEXED_DB_KEYS.WORLDS, DEFAULT_WORLDS).then(
      (loaded) => {
        if (!active) return;
        if (!didEditWorldsRef.current && Array.isArray(loaded) && loaded.length > 0) {
          setWorlds(loaded);
        }
        setIsWorldsHydrated(true);
      }
    );

    loadIndexedDBWithMigration<PlayerPosition | null>(
      INDEXED_DB_KEYS.PLAYER_POSITION,
      null
    ).then((loaded) => {
      if (!active) return;
      if (!didEditPlayerRef.current) {
        setPlayerPosition(loaded);
      }
      setIsPlayerHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Sync theme class on <html> + persist lightweight UI settings to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveLocalString(STORAGE_KEYS.THEME_MODE, isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    saveLocalString(STORAGE_KEYS.ACTIVE_WORLD_ID, activeWorldId);
  }, [activeWorldId]);

  useEffect(() => {
    saveLocalString(STORAGE_KEYS.ACTIVE_DIMENSION, activeDimension);
  }, [activeDimension]);

  // Persist main data (worlds & player position) to IndexedDB after hydration
  useEffect(() => {
    if (!isWorldsHydrated) return;
    didEditWorldsRef.current = true;
    void saveIndexedDB(INDEXED_DB_KEYS.WORLDS, worlds);
  }, [worlds, isWorldsHydrated]);

  useEffect(() => {
    if (!isPlayerHydrated) return;
    didEditPlayerRef.current = true;
    void saveIndexedDB(INDEXED_DB_KEYS.PLAYER_POSITION, playerPosition);
  }, [playerPosition, isPlayerHydrated]);

  const activeWorld = useMemo(
    () => worlds.find((w) => w.id === activeWorldId) ?? worlds[0],
    [worlds, activeWorldId]
  );

  const activeDimensionWaypoints = useMemo(
    () => activeWorld.waypoints.filter((w) => w.dimension === activeDimension),
    [activeWorld, activeDimension]
  );

  const selectedWaypoint = useMemo(
    () => activeWorld.waypoints.find((w) => w.id === selectedWaypointId) ?? null,
    [activeWorld, selectedWaypointId]
  );

  const handleViewportChange = useCallback((x: number, z: number, zoom: number) => {
    saveLocalJson(STORAGE_KEYS.MAP_VIEWPORT, { x, z, zoom });
  }, []);

  const triggerCenter = useCallback((x: number, z: number, zoom?: number) => {
    setCenterTarget({ x, z, zoom, nonce: Date.now() + Math.random() });
  }, []);

  const handleOpenAddModal = (coords?: { x: number; z: number }) => {
    setEditingWaypoint(null);
    setModalFromMapTap(Boolean(coords));
    setModalInitialCoords(
      coords ? { x: coords.x, z: coords.z, dimension: activeDimension } : null
    );
    setIsWaypointModalOpen(true);
  };

  const handleSaveWaypoint = (
    data: Omit<Waypoint, 'id' | 'createdAt' | 'updatedAt'>,
    createPairedNetherPortal?: boolean
  ) => {
    const now = Date.now();

    if (editingWaypoint) {
      setWorlds((prev) =>
        prev.map((w) =>
          w.id !== activeWorld.id
            ? w
            : {
                ...w,
                waypoints: w.waypoints.map((wp) =>
                  wp.id === editingWaypoint.id ? { ...wp, ...data, updatedAt: now } : wp
                ),
              }
        )
      );
      setActiveDimension(data.dimension);
      setSelectedWaypointId(editingWaypoint.id);
      triggerCenter(data.x, data.z);
    } else {
      const newId = `wp-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const newWp: Waypoint = {
        ...data,
        id: newId,
        createdAt: now,
        updatedAt: now,
      };
      const additions: Waypoint[] = [newWp];

      if (createPairedNetherPortal) {
        const paired = convertDimensionCoords(data.x, data.z, data.dimension);
        if (paired) {
          additions.push({
            id: `wp-${now}-pair-${Math.random().toString(36).slice(2, 6)}`,
            name: `${data.name}（${paired.targetDim === 'nether' ? 'ネザー側' : '地上側'}）`,
            x: paired.x,
            y: data.y,
            z: paired.z,
            dimension: paired.targetDim,
            category: 'nether_portal',
            icon: data.icon,
            color: data.color,
            note: `${data.dimension === 'overworld' ? '地上' : 'ネザー'} (${data.x}, ${data.z}) と対応するゲート。`,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      setWorlds((prev) =>
        prev.map((w) =>
          w.id !== activeWorld.id
            ? w
            : { ...w, waypoints: [...w.waypoints, ...additions] }
        )
      );
      setActiveDimension(data.dimension);
      setSelectedWaypointId(newId);
      setMobileTab('map');
      triggerCenter(data.x, data.z, 0.85);
    }

    setIsWaypointModalOpen(false);
    setEditingWaypoint(null);
  };

  const handleDeleteWaypoint = (id: string) => {
    setWorlds((prev) =>
      prev.map((w) =>
        w.id !== activeWorld.id
          ? w
          : { ...w, waypoints: w.waypoints.filter((wp) => wp.id !== id) }
      )
    );
    if (selectedWaypointId === id) {
      setSelectedWaypointId(null);
    }
  };

  const handleSelectWaypointFromList = (wp: Waypoint) => {
    setActiveDimension(wp.dimension);
    setSelectedWaypointId(wp.id);
    setMobileTab('map');
    triggerCenter(wp.x, wp.z);
  };

  const handleJumpToDimensionCoord = (dim: DimensionId, x: number, z: number) => {
    setActiveDimension(dim);
    setSelectedWaypointId(null);
    setMobileTab('map');
    triggerCenter(x, z, 0.9);
  };

  const handleCreateWorld = (name: string) => {
    const newWorld: WorldProfile = {
      id: `world-${Date.now()}`,
      name,
      createdAt: Date.now(),
      waypoints: [
        {
          id: `wp-spawn-${Date.now()}`,
          name: '初期スポーン地点',
          x: 0,
          y: 64,
          z: 0,
          dimension: 'overworld',
          category: 'initial_spawn',
          icon: '🧭',
          color: '#f59e0b',
          note: 'ワールド開始地点',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };
    setWorlds((prev) => [...prev, newWorld]);
    setActiveWorldId(newWorld.id);
    setSelectedWaypointId(null);
    triggerCenter(0, 0, 0.65);
  };

  const handleDeleteWorld = (id: string) => {
    if (worlds.length <= 1) return;
    const next = worlds.filter((w) => w.id !== id);
    setWorlds(next);
    if (activeWorldId === id) {
      setActiveWorldId(next[0].id);
      setSelectedWaypointId(null);
    }
  };

  const handleImportWorlds = (imported: WorldProfile[]) => {
    setWorlds(imported);
    setActiveWorldId(imported[0].id);
    setSelectedWaypointId(null);
  };

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar: Meadow-green header blending seamlessly with the MineMAP pixel banner */}
      <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-2.5 border-b border-[#3f7525] bg-gradient-to-r from-[#82c34b] via-[#6eb240] to-[#4f8b30] px-3.5 shadow-sm lg:h-14 lg:gap-4 lg:px-5 xl:gap-6 xl:px-6">
        {/* Zone 1: Horizontally-cropped pixel-art MineMAP lettering blended into the meadow header */}
        <div
          aria-label="MineMAP"
          className="relative h-9 w-[132px] overflow-hidden shrink-0 lg:h-10 lg:w-[152px] [mask-image:linear-gradient(to_right,transparent_0%,black_7%,black_93%,transparent_100%)]"
        >
          <img
            src={brandIconImg}
            alt="MineMAP"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute left-1/2 top-1/2 w-[112%] max-w-none -translate-x-[51%] -translate-y-1/2 select-none"
          />
        </div>

        {/* Zone 2: Desktop Dimension & Guide Controls */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          <div className="flex items-center gap-1 rounded-xl bg-slate-950/55 p-1 backdrop-blur-sm">
            {DIMENSION_CONFIGS.map((dim) => {
              const active = activeDimension === dim.id;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => {
                    setActiveDimension(dim.id);
                    setSelectedWaypointId(null);
                  }}
                  className={`flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 xl:px-3 text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/85 hover:text-white'
                  }`}
                >
                  <span>{dim.icon}</span>
                  <span>{dim.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setGuideModalTab('ores')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/45 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-slate-950/65 whitespace-nowrap shrink-0"
          >
            <Pickaxe className="h-4 w-4 text-amber-300 shrink-0" />
            <span>鉱石Y座標</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('roadmap')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/45 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-slate-950/65 whitespace-nowrap shrink-0"
          >
            <BookOpen className="h-4 w-4 text-purple-300 shrink-0" />
            <span>エンドラ討伐</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('structures')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/45 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-slate-950/65 whitespace-nowrap shrink-0"
          >
            <Landmark className="h-4 w-4 text-sky-300 shrink-0" />
            <span>構造物</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideModalTab('events')}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-slate-950/45 px-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-slate-950/65 whitespace-nowrap shrink-0"
          >
            <Swords className="h-4 w-4 text-rose-300 shrink-0" />
            <span>イベント</span>
          </button>
        </div>

        {/* Zone 3: Right-aligned World Name (expands leftward) + PWA Install + Primary Action */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={() => setIsWorldModalOpen(true)}
            className="group relative inline-flex min-h-[38px] min-w-0 max-w-full items-center justify-end gap-1.5 px-3.5 text-xs font-semibold text-white transition active:scale-[0.98] lg:max-w-[220px] xl:max-w-[280px]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-slate-950/65 backdrop-blur-sm transition group-hover:bg-slate-950/80 [clip-path:polygon(8px_0,calc(100%-8px)_0,100%_8px,100%_calc(100%-8px),calc(100%-8px)_100%,8px_100%,0_calc(100%-8px),0_8px)]"
            />
            <Globe className="relative z-10 h-4 w-4 text-emerald-400 shrink-0" />
            <span className="relative z-10 truncate">{activeWorld.name}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="hidden lg:inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-950/80 px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-slate-950 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 text-emerald-400" />
            <span>地点を登録</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar / Mobile List View */}
        <aside
          className={`${
            mobileTab === 'list' ? 'flex w-full' : 'hidden'
          } lg:flex lg:w-[390px] xl:w-[420px] shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 overflow-hidden`}
        >
          <WaypointListPanel
            waypoints={activeWorld.waypoints}
            activeDimension={activeDimension}
            selectedWaypointId={selectedWaypointId}
            playerPosition={playerPosition}
            onChangeDimension={(dim) => {
              setActiveDimension(dim);
              setSelectedWaypointId(null);
            }}
            onSelectWaypoint={handleSelectWaypointFromList}
            onOpenAddModal={() => handleOpenAddModal()}
            onOpenPlayerSettings={() => setIsWorldModalOpen(true)}
          />
        </aside>

        {/* Interactive Map Canvas */}
        <section
          className={`${
            mobileTab === 'map' ? 'flex' : 'hidden'
          } lg:flex relative flex-1 flex-col overflow-hidden`}
        >
          {/* Mobile Compact Dimension Switcher inside Map Viewport */}
          <div className="absolute left-3 top-[66px] z-10 flex lg:hidden items-center gap-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/92 dark:bg-slate-900/92 p-1 shadow-md backdrop-blur-md">
            {DIMENSION_CONFIGS.map((dim) => {
              const active = activeDimension === dim.id;
              return (
                <button
                  key={dim.id}
                  type="button"
                  onClick={() => {
                    setActiveDimension(dim.id);
                    setSelectedWaypointId(null);
                  }}
                  className={`flex min-h-[38px] items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition whitespace-nowrap ${
                    active
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{dim.icon}</span>
                  <span>{dim.shortName}</span>
                </button>
              );
            })}
          </div>

          <MapCanvas
            dimension={activeDimension}
            waypoints={activeDimensionWaypoints}
            selectedWaypointId={selectedWaypointId}
            playerPosition={playerPosition}
            centerTarget={centerTarget}
            isDark={isDark}
            onSelectWaypoint={(id) => setSelectedWaypointId(id)}
            onQuickAddAtCoord={(x, z) => handleOpenAddModal({ x, z })}
            onUpdateViewportState={handleViewportChange}
            initialCenter={initialViewport}
          />

          {/* Selected Waypoint Detail Overlay */}
          {selectedWaypoint && (
            <div className="absolute bottom-4 left-3 right-3 z-20 sm:left-4 sm:right-auto sm:w-[370px]">
              <WaypointDetailCard
                waypoint={selectedWaypoint}
                playerPosition={playerPosition}
                onClose={() => setSelectedWaypointId(null)}
                onEdit={(wp) => {
                  setEditingWaypoint(wp);
                  setIsWaypointModalOpen(true);
                }}
                onDelete={handleDeleteWaypoint}
                onCenterOnMap={(wp) => triggerCenter(wp.x, wp.z, 0.9)}
                onSetAsPlayerPos={(wp) => {
                  setPlayerPosition({
                    x: wp.x,
                    y: wp.y ?? 64,
                    z: wp.z,
                    dimension: wp.dimension,
                  });
                }}
                onOpenPlayerSettings={() => setIsWorldModalOpen(true)}
                onJumpToDimensionCoord={handleJumpToDimensionCoord}
              />
            </div>
          )}
        </section>
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb Zone, h-14 + safe area) */}
      <nav className="z-30 grid h-14 shrink-0 grid-cols-5 items-center border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-safe lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition whitespace-nowrap ${
            mobileTab === 'map'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <MapIcon className="h-5 w-5" />
          <span>地図</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition whitespace-nowrap ${
            mobileTab === 'list'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <List className="h-5 w-5" />
          <span>地点 ({activeDimensionWaypoints.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenAddModal()}
          className="flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
        >
          <Plus className="h-5 w-5" />
          <span>座標登録</span>
        </button>

        <button
          type="button"
          onClick={() => setGuideModalTab('roadmap')}
          className="flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
        >
          <BookOpen className="h-5 w-5 text-amber-500" />
          <span>攻略ガイド</span>
        </button>

        <button
          type="button"
          onClick={() => setIsWorldModalOpen(true)}
          className="flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
        >
          <Settings2 className="h-5 w-5" />
          <span>設定</span>
        </button>
      </nav>

      {/* Modals */}
      <WaypointModal
        isOpen={isWaypointModalOpen}
        editingWaypoint={editingWaypoint}
        initialCoords={modalInitialCoords}
        isFromMapTap={modalFromMapTap}
        playerPosition={playerPosition}
        activeDimension={activeDimension}
        onClose={() => {
          setIsWaypointModalOpen(false);
          setEditingWaypoint(null);
          setModalFromMapTap(false);
        }}
        onSave={handleSaveWaypoint}
      />

      <WorldAndPlayerModal
        isOpen={isWorldModalOpen}
        worlds={worlds}
        activeWorldId={activeWorld.id}
        activeDimension={activeDimension}
        playerPosition={playerPosition}
        isDark={isDark}
        onClose={() => setIsWorldModalOpen(false)}
        onToggleTheme={() => setIsDark((d) => !d)}
        onSelectWorld={(id) => {
          setActiveWorldId(id);
          setSelectedWaypointId(null);
          setIsWorldModalOpen(false);
        }}
        onCreateWorld={handleCreateWorld}
        onDeleteWorld={handleDeleteWorld}
        onSavePlayerPosition={setPlayerPosition}
        onImportWorldData={handleImportWorlds}
      />

      <AdventureGuideModal
        isOpen={guideModalTab !== null}
        initialTab={guideModalTab ?? 'roadmap'}
        activeWorldId={activeWorld.id}
        activeWorldName={activeWorld.name}
        onClose={() => setGuideModalTab(null)}
      />

      <OfflineIndicator />
    </div>
  );
}
