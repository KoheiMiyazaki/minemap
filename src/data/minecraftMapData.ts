/* ============================================================================
   Minecraft Map Data & Configuration (拡張性ハーネス: データ分離定義)
   このファイル内の配列・設定を書き換えるだけで、地点カテゴリ・絵文字パレット・
   ディメンション設定・初期サンプルデータを自由にカスタマイズできます。
   ============================================================================ */

export type DimensionId = 'overworld' | 'nether' | 'end';

export type CategoryId =
  | 'initial_spawn'
  | 'spawn'
  | 'base'
  | 'village'
  | 'nether_portal'
  | 'fortress'
  | 'stronghold'
  | 'monument'
  | 'mine'
  | 'biome'
  | 'end_city'
  | 'custom';

export type FilterGroupId = 'all' | 'spawn_base' | 'structures' | 'nether_travel' | 'resources';

export interface DimensionConfig {
  id: DimensionId;
  name: string;
  shortName: string;
  icon: string;
  /* TODO: 画像差し替え用パス (例: '/assets/dimensions/overworld.png') */
  iconImagePath?: string;
  accentHex: string;
  canvasBgDark: string;
  canvasBgLight: string;
  gridLineDark: string;
  gridLineLight: string;
  chunkLineDark: string;
  chunkLineLight: string;
  axisLineColor: string;
  description: string;
}

export interface CategoryConfig {
  id: CategoryId;
  label: string;
  defaultIcon: string;
  /* TODO: 画像差し替え用パス (例: '/assets/markers/village.png') */
  iconImagePath?: string;
  pinColor: string;
  filterGroup: FilterGroupId;
  defaultDimension: DimensionId;
}

export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number | null;
  z: number;
  dimension: DimensionId;
  category: CategoryId;
  icon: string;
  /* TODO: 画像差し替え用パス (カスタム画像を各地点に割り当てる場合) */
  customImagePath?: string;
  color: string;
  note: string;
  pinnedToTop?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorldProfile {
  id: string;
  name: string;
  seed?: string;
  waypoints: Waypoint[];
  createdAt: number;
}

export interface EmojiPreset {
  emoji: string;
  label: string;
}

export const DIMENSION_CONFIGS: DimensionConfig[] = [
  {
    id: 'overworld',
    name: 'オーバーワールド',
    shortName: '地上',
    icon: '🌍',
    /* TODO: 画像差し替え用パス (例: '/images/dim_overworld.png') */
    accentHex: '#10b981',
    canvasBgDark: '#0b131e',
    canvasBgLight: '#f4f7f5',
    gridLineDark: 'rgba(148, 163, 184, 0.14)',
    gridLineLight: 'rgba(15, 23, 42, 0.08)',
    chunkLineDark: 'rgba(16, 185, 129, 0.16)',
    chunkLineLight: 'rgba(5, 150, 105, 0.14)',
    axisLineColor: 'rgba(16, 185, 129, 0.55)',
    description: '通常世界（ネザー座標の8倍スケール）',
  },
  {
    id: 'nether',
    name: 'ネザー',
    shortName: 'ネザー',
    icon: '🔥',
    /* TODO: 画像差し替え用パス (例: '/images/dim_nether.png') */
    accentHex: '#f43f5e',
    canvasBgDark: '#190b10',
    canvasBgLight: '#fbf3f4',
    gridLineDark: 'rgba(251, 113, 133, 0.14)',
    gridLineLight: 'rgba(190, 18, 60, 0.08)',
    chunkLineDark: 'rgba(244, 63, 94, 0.2)',
    chunkLineLight: 'rgba(225, 29, 72, 0.14)',
    axisLineColor: 'rgba(244, 63, 94, 0.6)',
    description: '移動距離が地上の1/8になる異世界',
  },
  {
    id: 'end',
    name: 'ジ・エンド',
    shortName: 'エンド',
    icon: '🌌',
    /* TODO: 画像差し替え用パス (例: '/images/dim_end.png') */
    accentHex: '#a855f7',
    canvasBgDark: '#110c1c',
    canvasBgLight: '#f7f4fb',
    gridLineDark: 'rgba(192, 132, 252, 0.14)',
    gridLineLight: 'rgba(126, 34, 206, 0.08)',
    chunkLineDark: 'rgba(168, 85, 247, 0.2)',
    chunkLineLight: 'rgba(147, 51, 234, 0.14)',
    axisLineColor: 'rgba(168, 85, 247, 0.6)',
    description: 'エンダードラゴンとエンドシティの領域',
  },
];

export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: 'initial_spawn',
    label: '初期スポーン地点',
    defaultIcon: '🧭',
    /* TODO: 画像差し替え用パス (例: '/images/pin_initial_spawn.png') */
    pinColor: '#f59e0b',
    filterGroup: 'spawn_base',
    defaultDimension: 'overworld',
  },
  {
    id: 'spawn',
    label: 'スポーン地点・ベッド',
    defaultIcon: '🛏️',
    /* TODO: 画像差し替え用パス (例: '/images/pin_spawn.png') */
    pinColor: '#ef4444',
    filterGroup: 'spawn_base',
    defaultDimension: 'overworld',
  },
  {
    id: 'base',
    label: '拠点・自宅',
    defaultIcon: '🏠',
    /* TODO: 画像差し替え用パス (例: '/images/pin_base.png') */
    pinColor: '#10b981',
    filterGroup: 'spawn_base',
    defaultDimension: 'overworld',
  },
  {
    id: 'village',
    label: '村',
    defaultIcon: '🏘️',
    /* TODO: 画像差し替え用パス (例: '/images/pin_village.png') */
    pinColor: '#22c55e',
    filterGroup: 'structures',
    defaultDimension: 'overworld',
  },
  {
    id: 'nether_portal',
    label: 'ネザーゲート',
    defaultIcon: '🟪',
    /* TODO: 画像差し替え用パス (例: '/images/pin_nether_portal.png') */
    pinColor: '#9333ea',
    filterGroup: 'nether_travel',
    defaultDimension: 'overworld',
  },
  {
    id: 'fortress',
    label: 'ネザー要塞・砦',
    defaultIcon: '🏰',
    /* TODO: 画像差し替え用パス (例: '/images/pin_fortress.png') */
    pinColor: '#e11d48',
    filterGroup: 'nether_travel',
    defaultDimension: 'nether',
  },
  {
    id: 'stronghold',
    label: '要塞・エンドポータル',
    defaultIcon: '👁️',
    /* TODO: 画像差し替え用パス (例: '/images/pin_stronghold.png') */
    pinColor: '#06b6d4',
    filterGroup: 'structures',
    defaultDimension: 'overworld',
  },
  {
    id: 'monument',
    label: '海底神殿・遺跡',
    defaultIcon: '🔱',
    /* TODO: 画像差し替え用パス (例: '/images/pin_monument.png') */
    pinColor: '#0ea5e9',
    filterGroup: 'structures',
    defaultDimension: 'overworld',
  },
  {
    id: 'mine',
    label: '鉱山・トラップ',
    defaultIcon: '⛏️',
    /* TODO: 画像差し替え用パス (例: '/images/pin_mine.png') */
    pinColor: '#64748b',
    filterGroup: 'resources',
    defaultDimension: 'overworld',
  },
  {
    id: 'biome',
    label: '希少バイオーム',
    defaultIcon: '🌸',
    /* TODO: 画像差し替え用パス (例: '/images/pin_biome.png') */
    pinColor: '#ec4899',
    filterGroup: 'resources',
    defaultDimension: 'overworld',
  },
  {
    id: 'end_city',
    label: 'エンドシティ',
    defaultIcon: '🛸',
    /* TODO: 画像差し替え用パス (例: '/images/pin_end_city.png') */
    pinColor: '#a855f7',
    filterGroup: 'structures',
    defaultDimension: 'end',
  },
  {
    id: 'custom',
    label: 'その他・メモ',
    defaultIcon: '📍',
    /* TODO: 画像差し替え用パス (例: '/images/pin_custom.png') */
    pinColor: '#3b82f6',
    filterGroup: 'all',
    defaultDimension: 'overworld',
  },
];

export const FILTER_GROUPS: { id: FilterGroupId; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'spawn_base', label: 'スポーン・拠点' },
  { id: 'structures', label: '村・構造物' },
  { id: 'nether_travel', label: 'ネザー' },
  { id: 'resources', label: '資源・環境' },
];

export const EMOJI_PRESETS: EmojiPreset[] = [
  { emoji: '🧭', label: '初期スポーン' },
  { emoji: '🛏️', label: 'ベッド' },
  { emoji: '🏠', label: '拠点' },
  { emoji: '🏘️', label: '村' },
  { emoji: '🟪', label: 'ゲート' },
  { emoji: '🏰', label: '要塞' },
  { emoji: '👁️', label: 'エンド要塞' },
  { emoji: '🔱', label: '海底神殿' },
  { emoji: '⛏️', label: '鉱山' },
  { emoji: '💎', label: 'ダイヤ場' },
  { emoji: '🌾', label: '農場' },
  { emoji: '🐄', label: '牧場' },
  { emoji: '🌸', label: '桜' },
  { emoji: '🎋', label: '竹林' },
  { emoji: '🏔️', label: '山岳' },
  { emoji: '🏝️', label: '孤島' },
  { emoji: '⚓', label: '港' },
  { emoji: '🛤️', label: '線路・氷道' },
  { emoji: '🔥', label: 'ブレイズ' },
  { emoji: '💀', label: 'トラップ' },
  { emoji: '🛸', label: 'エンド船' },
  { emoji: '🐉', label: '本島' },
  { emoji: '🚩', label: '目印' },
  { emoji: '⭐', label: 'お気に入り' },
];

export const PIN_COLOR_PRESETS: string[] = [
  '#f59e0b',
  '#ef4444',
  '#10b981',
  '#22c55e',
  '#0ea5e9',
  '#3b82f6',
  '#9333ea',
  '#ec4899',
  '#64748b',
];

const now = Date.now();

export const DEFAULT_WORLDS: WorldProfile[] = [
  {
    id: 'world-main',
    name: 'メインワールド',
    seed: '',
    createdAt: now,
    waypoints: [
      {
        id: 'wp-initial-spawn',
        name: '初期スポーン地点',
        x: 0,
        y: 64,
        z: 0,
        dimension: 'overworld',
        category: 'initial_spawn',
        icon: '🧭',
        color: '#f59e0b',
        note: 'ワールド開始位置。コンパスが指す地点。',
        pinnedToTop: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-main-base',
        name: '第1拠点（リスポーンベッド）',
        x: 120,
        y: 68,
        z: -85,
        dimension: 'overworld',
        category: 'spawn',
        icon: '🛏️',
        color: '#ef4444',
        note: '倉庫・エンチャント室・畑がある本拠点。',
        pinnedToTop: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-east-village',
        name: '東の平原の村',
        x: 420,
        y: 71,
        z: 160,
        dimension: 'overworld',
        category: 'village',
        icon: '🏘️',
        color: '#22c55e',
        note: '司書（修繕）と農民の交易所。',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-portal-home',
        name: '拠点ネザーゲート',
        x: 128,
        y: 66,
        z: -96,
        dimension: 'overworld',
        category: 'nether_portal',
        icon: '🟪',
        color: '#9333ea',
        note: 'ネザー側 (16, 66, -12) と直結。',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-nether-hub',
        name: '拠点ゲート（ネザー側）',
        x: 16,
        y: 66,
        z: -12,
        dimension: 'nether',
        category: 'nether_portal',
        icon: '🟪',
        color: '#9333ea',
        note: '地上 (128, 66, -96) に対応。氷ボート道路の起点。',
        pinnedToTop: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-nether-fortress',
        name: '最寄りのネザー要塞',
        x: -185,
        y: 58,
        z: 140,
        dimension: 'nether',
        category: 'fortress',
        icon: '🏰',
        color: '#e11d48',
        note: 'ブレイズスポナー2基あり。暗黒茸の栽培区画。',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wp-end-origin',
        name: '黒曜石の足場（エンド本島）',
        x: 100,
        y: 49,
        z: 0,
        dimension: 'end',
        category: 'initial_spawn',
        icon: '🐉',
        color: '#a855f7',
        note: 'エンドラ討伐・エンダーマントラップ方面。',
        createdAt: now,
        updatedAt: now,
      },
    ],
  },
];

export interface MovementSpeedPreset {
  id: 'walk' | 'sprint' | 'sprint_jump';
  label: string;
  shortLabel: string;
  speedBlocksPerSec: number;
  icon: string;
  /* TODO: 画像差し替え用パス (例: '/images/speed_sprint.png') */
}

/**
 * マイクラ標準移動速度定義 (ブロック/秒)
 * - 歩き: 4.317 B/s (0.21585 B/tick)
 * - 走り (ダッシュ): 5.612 B/s (0.2806 B/tick)
 * - 走りジャンプ: 7.127 B/s (平坦地での連続ジャンプダッシュ平均)
 */
export const MOVEMENT_SPEED_PRESETS: MovementSpeedPreset[] = [
  {
    id: 'walk',
    label: '歩き',
    shortLabel: '歩',
    speedBlocksPerSec: 4.317,
    icon: '🚶',
  },
  {
    id: 'sprint',
    label: '走り (ダッシュ)',
    shortLabel: '走',
    speedBlocksPerSec: 5.612,
    icon: '🏃',
  },
  {
    id: 'sprint_jump',
    label: '走りジャンプ',
    shortLabel: '跳',
    speedBlocksPerSec: 7.127,
    icon: '⚡',
  },
];

export const DEFAULT_PLAYER_POSITION = {
  x: 0,
  y: 64,
  z: 0,
  dimension: 'overworld' as DimensionId,
};

export interface OreYGuideEntry {
  id: string;
  name: string;
  icon: string;
  /* TODO: 画像差し替え用パス (例: '/images/ore_diamond.png') */
  iconImagePath?: string;
  dimension: 'overworld' | 'nether';
  bestYLabel: string;
  peakYMin: number;
  peakYMax: number;
  spawnYMin: number;
  spawnYMax: number;
  accentColor: string;
  tip: string;
}

/**
 * マインクラフト 鉱石別 Y座標ヒントデータ (Java/統合版 1.18〜最新基準)
 */
export const ORE_Y_GUIDE_DATA: OreYGuideEntry[] = [
  {
    id: 'diamond',
    name: 'ダイヤモンド',
    icon: '💎',
    dimension: 'overworld',
    bestYLabel: 'Y = -58 ～ -59',
    peakYMin: -59,
    peakYMax: -58,
    spawnYMin: -64,
    spawnYMax: 16,
    accentColor: '#06b6d4',
    tip: '深いほど生成率が上昇。岩盤直上の Y=-59 でのブランチマイニングが定番（空気に触れにくい場所ほど多い）。',
  },
  {
    id: 'iron',
    name: '鉄鉱石',
    icon: '🪙',
    dimension: 'overworld',
    bestYLabel: 'Y = 16 / 232',
    peakYMin: 15,
    peakYMax: 17,
    spawnYMin: -64,
    spawnYMax: 320,
    accentColor: '#cbd5e1',
    tip: 'Y=16前後と高い山岳（Y=232前後）の2箇所にピーク。Y=-8〜-56の深層では巨大な鉄鉱脈が生成されることも。',
  },
  {
    id: 'copper',
    name: '銅鉱石',
    icon: '🔶',
    dimension: 'overworld',
    bestYLabel: 'Y = 48',
    peakYMin: 46,
    peakYMax: 50,
    spawnYMin: -16,
    spawnYMax: 112,
    accentColor: '#ea580c',
    tip: 'Y=48付近が最も多い。鍾乳洞バイオームでは生成量が大幅に増える。',
  },
  {
    id: 'gold',
    name: '金鉱石',
    icon: '🥇',
    dimension: 'overworld',
    bestYLabel: 'Y = -16（荒野 32～256）',
    peakYMin: -18,
    peakYMax: -14,
    spawnYMin: -64,
    spawnYMax: 32,
    accentColor: '#eab308',
    tip: '通常バイオームは Y=-16 がピーク。荒野（メサ）バイオームでは Y=32〜256 の浅層にも大量に生成される。',
  },
  {
    id: 'coal',
    name: '石炭',
    icon: '⬛',
    dimension: 'overworld',
    bestYLabel: 'Y = 96 / 山岳地表',
    peakYMin: 92,
    peakYMax: 100,
    spawnYMin: 0,
    spawnYMax: 320,
    accentColor: '#475569',
    tip: 'Y=0未満では生成されないため、山岳や浅い洞窟（Y=96〜256）で集めるのが効率的。',
  },
  {
    id: 'redstone',
    name: 'レッドストーン',
    icon: '🔴',
    dimension: 'overworld',
    bestYLabel: 'Y = -59',
    peakYMin: -60,
    peakYMax: -56,
    spawnYMin: -64,
    spawnYMax: 15,
    accentColor: '#ef4444',
    tip: 'Y=-59付近が最も高密度。ダイヤ掘りと同時に大量に集まる。',
  },
  {
    id: 'lapis',
    name: 'ラピスラズリ',
    icon: '🔵',
    dimension: 'overworld',
    bestYLabel: 'Y = -1 ～ 0',
    peakYMin: -2,
    peakYMax: 2,
    spawnYMin: -64,
    spawnYMax: 64,
    accentColor: '#2563eb',
    tip: 'Y=0付近に最大のピーク。空気に露出しない場所限定で生成される塊が多いためブランチマイニング向き。',
  },
  {
    id: 'emerald',
    name: 'エメラルド',
    icon: '💚',
    dimension: 'overworld',
    bestYLabel: 'Y = 232（山岳系限定）',
    peakYMin: 224,
    peakYMax: 256,
    spawnYMin: -16,
    spawnYMax: 320,
    accentColor: '#10b981',
    tip: '吹きさらしの丘や山頂系バイオーム限定。標高が高いほど生成率が高くなる。',
  },
  {
    id: 'ancient_debris',
    name: '古代の残骸（ネザライト）',
    icon: '🟫',
    dimension: 'nether',
    bestYLabel: 'Y = 15',
    peakYMin: 13,
    peakYMax: 17,
    spawnYMin: 8,
    spawnYMax: 119,
    accentColor: '#a16207',
    tip: 'ネザーの Y=15 付近が最高密度。ベッド爆破やTNT採掘では溶岩海の下層（Y=15）を狙うのが定番。',
  },
  {
    id: 'nether_quartz',
    name: 'ネザークォーツ',
    icon: '⬜',
    dimension: 'nether',
    bestYLabel: 'Y = 10 ～ 117（均一）',
    peakYMin: 10,
    peakYMax: 117,
    spawnYMin: 10,
    spawnYMax: 117,
    accentColor: '#e2e8f0',
    tip: 'Y=10〜117の間で高さに関係なく均等に生成。安全に掘りやすい Y=60〜90 帯で集めやすい。',
  },
  {
    id: 'nether_gold',
    name: 'ネザー金鉱石',
    icon: '✨',
    dimension: 'nether',
    bestYLabel: 'Y = 15 ～ 117（均一）',
    peakYMin: 15,
    peakYMax: 117,
    spawnYMin: 10,
    spawnYMax: 117,
    accentColor: '#facc15',
    tip: 'ネザー全域に均等分布。幸運ツルハシで金塊が多く落ち、精錬すると金インゴットになる。',
  },
];

export interface SurvivalStep {
  id: string;
  title: string;
  detail: string;
  mapTip?: string;
}

export interface SurvivalPhase {
  id: string;
  phaseNumber: number;
  title: string;
  icon: string;
  /* TODO: 画像差し替え用パス (例: '/images/phase_nether.png') */
  iconImagePath?: string;
  summary: string;
  steps: SurvivalStep[];
}

/**
 * サバイバルモード：初期スポーンからエンダードラゴン討伐までの推奨進行チャート
 */
export const SURVIVAL_ROADMAP_DATA: SurvivalPhase[] = [
  {
    id: 'phase-1',
    phaseNumber: 1,
    title: '初期スポーン・初日サバイバル',
    icon: '🌱',
    summary: '初日の夜を越えるための最小装備とリスポーン地点の確保',
    steps: [
      {
        id: 'p1-spawn-mark',
        title: '初期スポーン座標をマップに登録',
        detail:
          '木を伐採して作業台と木のツルハシを作成。迷子防止のため初期スポーン位置をメモしておくと安心です。',
        mapTip: 'カテゴリ「初期スポーン地点 (🧭)」で (0, 0) 付近を登録',
      },
      {
        id: 'p1-stone-tools',
        title: '石ツール・かまど・松明を揃える',
        detail:
          '丸石を掘って石の剣・斧・ツルハシ・かまどを作成。原木をかまどで焼いて木炭を作れば、石炭がなくても松明を確保できます。',
      },
      {
        id: 'p1-bed',
        title: '羊を探してベッドを作成',
        detail:
          '羊毛3個＋木材3個でベッドを作り、夜をスキップしてリスポーン地点を固定します。仮拠点の座標も忘れず登録しましょう。',
        mapTip: 'カテゴリ「スポーン地点・ベッド (🛏️)」で登録',
      },
    ],
  },
  {
    id: 'phase-2',
    phaseNumber: 2,
    title: '食料安定・鉄装備・拠点づくり',
    icon: '🏠',
    summary: '洞窟探検やネザー準備に耐えられる装備と補給基盤を整える',
    steps: [
      {
        id: 'p2-village-food',
        title: '村の探索と安定した食料源の確保',
        detail:
          '周辺の村を見つけてベッドや食料（パン・ジャガイモ等）を確保。拠点の近くに小麦畑や牛・豚の牧場を作るとエンチャント準備も同時に進みます。',
        mapTip: '発見した村は「村 (🏘️)」として登録',
      },
      {
        id: 'p2-iron-gear',
        title: '鉄鉱石を集めて鉄装備・盾・水バケツを作成',
        detail:
          '山岳（Y=232付近）や浅い洞窟（Y=16付近）で鉄を採掘。鉄フル装備＋「盾（弓・クリーパー対策）」＋「水バケツ（落下防止・黒曜石生成）」は必須級です。',
      },
      {
        id: 'p2-bookshelf',
        title: '革とサトウキビを集め始める',
        detail:
          '本棚15個（本45冊分）を目標に、サトウキビ畑と牛の繁殖を進めておくと後々のエンチャントがスムーズになります。',
      },
    ],
  },
  {
    id: 'phase-3',
    phaseNumber: 3,
    title: 'ダイヤ採掘・ネザー突入準備',
    icon: '💎',
    summary: 'Y=-58〜-59での採掘とネザーゲートの開通',
    steps: [
      {
        id: 'p3-diamond',
        title: 'Y=-58 ～ -59 でダイヤモンドを採掘',
        detail:
          '鉄ツルハシでダイヤを最低5個（ダイヤツルハシ用に3個＋エンチャントテーブル用に2個）確保します。マグマ対策に水バケツを携行しましょう。',
      },
      {
        id: 'p3-obsidian-portal',
        title: '黒曜石10個以上と火打石を用意してゲート開通',
        detail:
          '溶岩源に水をかけて黒曜石を作り、ダイヤツルハシで採掘。最低10個（四隅省略）でゲートを組み、火打石と打ち金で着火します。',
        mapTip: '地上ゲートは「ネザーゲート (🟪)」で登録（ネザー座標も自動計算）',
      },
    ],
  },
  {
    id: 'phase-4',
    phaseNumber: 4,
    title: 'ネザー攻略（ブレイズ＆パール収集）',
    icon: '🔥',
    summary: 'エンダーアイの材料となる2つのキーアイテムを集める',
    steps: [
      {
        id: 'p4-gold-armor',
        title: '金装備を1部位だけ装備して突入',
        detail:
          '金のブーツかヘルメットを1つ着けるだけでピグリンの中立を保てます。ゲート周辺の囲いとネザー側座標の登録を最優先に。',
      },
      {
        id: 'p4-fortress',
        title: 'ネザー要塞を探してブレイズロッドを7〜10本集める',
        detail:
          '暗黒レンガの要塞を見つけたら即座に座標を登録。ブレイズスポナー周辺を遮蔽物で囲い、盾で炎を防ぎながらロッドを集めます。',
        mapTip: '要塞は「ネザー要塞・砦 (🏰)」でネザーディメンションに登録',
      },
      {
        id: 'p4-ender-pearl',
        title: 'エンダーパールを12〜16個以上集める',
        detail:
          '「歪んだ森（青い森）」でエンダーマン（高さ2マスの屋根の下から攻撃すると安全）を狩るか、ピグリンとの金インゴット交易で集めます。',
      },
    ],
  },
  {
    id: 'phase-5',
    phaseNumber: 5,
    title: '装備強化＆エンド要塞の特定',
    icon: '👁️',
    summary: 'エンダーアイで地下要塞を探し出し、決戦前の準備を完了する',
    steps: [
      {
        id: 'p5-locate-stronghold',
        title: 'エンダーアイを投げて要塞（エンドポータル）を特定',
        detail:
          'ブレイズパウダー＋エンダーパールでエンダーアイを15個前後作成。地上で投げて飛んでいく方角へ進み、真下に吸い込まれる場所を掘り下げます。',
        mapTip: 'ポータル部屋は「要塞・エンドポータル (👁️)」として登録',
      },
      {
        id: 'p5-final-prep',
        title: '決戦装備・水バケツ・ブロック・ベッドを準備',
        detail:
          '防護エンチャント付き装備、弓（矢を十分量）、剣、水バケツ、足場用ブロック（2スタック以上）、落下軽減や治癒ポーション、ガラス瓶（ドラゴンブレス用）を用意します。',
      },
      {
        id: 'p5-portal-bed',
        title: 'ポータル部屋の前でベッドを設置してセーブ',
        detail:
          '万が一エンドで倒れてもすぐ再挑戦できるよう、ポータル部屋の近くにベッドを置いて一度寝てリスポーン地点を更新します。',
      },
    ],
  },
  {
    id: 'phase-6',
    phaseNumber: 6,
    title: 'ジ・エンド突入＆エンダードラゴン討伐',
    icon: '🐉',
    summary: 'クリスタル全破壊からドラゴン撃破・帰還まで',
    steps: [
      {
        id: 'p6-enter-island',
        title: '黒曜石の足場から本島へ安全に渡る',
        detail:
          '足場が島から離れている場合はブロックで橋を架けて本島へ移動。エンダーマンと目を合わせないよう視点はやや下向きを意識します（くり抜かれたカボチャも有効）。',
      },
      {
        id: 'p6-crystals',
        title: '黒曜石の柱のエンドクリスタルをすべて破壊',
        detail:
          'むき出しのクリスタルは弓で撃ち抜き、鉄格子に囲まれた柱はブロックを積んで登り（または下に水を敷いて落下対策しながら）格子を壊して破壊します。',
      },
      {
        id: 'p6-defeat-dragon',
        title: '中央の祭壇に降りたドラゴンを集中攻撃して討伐',
        detail:
          '飛んでいる間は弓で削り、中央の岩盤祭壇へ降りてきたら紫色のドラゴンブレスを避けつつ剣や斧（またはベッド爆破）で一気に倒します。',
      },
      {
        id: 'p6-aftermath',
        title: '経験値・ドラゴンの卵回収＆エンドシティへ',
        detail:
          '中央ポータルから経験値と卵（松明でアイテム化）を回収して帰還。本島外周に現れるエンドゲートウェイを通れば、エリトラがあるエンドシティも探索できます。',
      },
    ],
  },
];

export type CheatSheetCategory = 'structure' | 'event';

export interface CheatSheetEntry {
  id: string;
  category: CheatSheetCategory;
  title: string;
  icon: string;
  /* TODO: 画像差し替え用パス (例: '/images/guide_desert_pyramid.png') */
  iconImagePath?: string;
  dimension: 'overworld' | 'nether' | 'end' | 'any';
  difficultyLabel: string;
  summary: string;
  recommendedPrep: string[];
  keyPoints: string[];
  rewards: string[];
  mapTip?: string;
}

/**
 * 構造物（ピラミッド・沈没船・神殿等）＆イベント（襲撃・ウィザー等）攻略チートシート
 */
export const ADVENTURE_CHEATSHEET_DATA: CheatSheetEntry[] = [
  {
    id: 'desert-pyramid',
    category: 'structure',
    title: '砂漠のピラミッド（寺院）',
    icon: '🏜️',
    dimension: 'overworld',
    difficultyLabel: '★☆☆ 初級',
    summary: '中央の感圧板トラップを回避すれば序盤でも安全に大量の戦利品を入手可能',
    recommendedPrep: ['ツルハシ', '松明（明るさ確保）', 'ブロック数個（足場用）', 'ブラシ（考古学用）'],
    keyPoints: [
      '中央の「青いテラコッタ」真下には石の感圧板とTNT9個があるため、絶対に真下掘りしない。',
      '青テラコッタから1〜2マス横の砂岩を掘って縦穴を作り、最下層の壁際へ安全に降りる。',
      '降りたらまず中央の「石の感圧板」を必ず壊してからチェストを開ける（TNTも回収可）。',
      '階段横の埋まった小部屋にある「怪しげな砂」をブラシで払うと壺の欠片やダイヤが出る。',
    ],
    rewards: ['エンチャント本', '金リンゴ / エンチャント金リンゴ', 'ダイヤモンド / エメラルド', 'TNT×9・砂漠風の鍛冶型'],
    mapTip: '周辺の砂漠探索の目印や考古学スポットとしてメモを残しておくと便利',
  },
  {
    id: 'shipwreck',
    category: 'structure',
    title: '沈没船（難破船）',
    icon: '🚢',
    dimension: 'overworld',
    difficultyLabel: '★☆☆ 初級',
    summary: '海上・海底で鉄やエメラルド、宝の地図を手早く集められる序盤の優良スポット',
    recommendedPrep: ['ドア×2（Java版での水中息継ぎ用）', '水バケツ or 暗視ポーション', 'シャベル（宝探し用）'],
    keyPoints: [
      '完全な船体なら最大3個のチェスト（補給・宝物・地図チェスト）が船首・船尾・船室にある。',
      '「宝の地図」の赤い×印を見つけたら、Java版ではチャンク内座標 (9, *, 9) の位置を掘るとすぐ見つかる。',
      '船底が砂に埋まっていることもあるため、チェストが見つからない時は床下も少し掘ってみる。',
    ],
    rewards: ['宝の地図（海洋の心へ）', '鉄インゴット / 金 / エメラルド', '怪しげなシチュー・竹・海洋風の鍛冶型'],
    mapTip: '宝の地図の目的地を掘ったら、海洋の心や海の目印として座標を登録',
  },
  {
    id: 'jungle-temple',
    category: 'structure',
    title: 'ジャングルの寺院',
    icon: '🗿',
    dimension: 'overworld',
    difficultyLabel: '★☆☆ 初級',
    summary: 'トリップワイヤーと3連レバーの仕掛けを解除して地下チェストを回収',
    recommendedPrep: ['ハサミ（糸を安全に切る）またはツルハシ', '盾（誤作動時の矢ガード）', '松明'],
    keyPoints: [
      '地下通路の入口付近とチェスト前に「トリップワイヤー（糸）」があり、踏むとディスペンサーから矢が飛ぶ。',
      '壁際からハサミで糸を切るか、ディスペンサーを先に壊して矢を回収するのが安全。',
      '3連レバーのパズルを解く代わりに、ツルハシで裏側の壁（粘着ピストン横）を直接壊して隠し部屋へ入ることも可能。',
    ],
    rewards: ['密林風の鍛冶型', 'ダイヤモンド / 金 / 鉄', '馬鎧・粘着ピストン・リピーター'],
  },
  {
    id: 'ocean-monument',
    category: 'structure',
    title: '海底神殿',
    icon: '🔱',
    dimension: 'overworld',
    difficultyLabel: '★★★ 上級',
    summary: 'エルダーガーディアン3体を倒して「採掘速度低下」を解除し、金ブロックとスポンジを獲得',
    recommendedPrep: [
      '牛乳バケツ複数（採掘速度低下の解除）',
      '水中呼吸＆暗視ポーション',
      '水中歩行＆水中採掘エンチャント装備',
      'TNT＋砂（壁を爆破して直行する場合）',
      'トライデント（水中特効）または剣',
    ],
    keyPoints: [
      '近づくとエルダーガーディアンから「採掘速度低下 III」を受けるため、事前に牛乳とポーションを準備。',
      'TNTの周囲に砂/砂利を置いて着火すると水中でもブロックを爆破でき、壁を無視してボス部屋へ突入できる。',
      'ボスは「最上部」「左翼」「右翼」に計3体おり、全員倒せば採掘速度低下が二度とかからなくなる。',
      'ガーディアンのレーザーは壁や柱に隠れて視線を切ると中断できる。',
    ],
    rewards: ['濡れたスポンジ（大量の水抜きに必須）', '金ブロック×8（中央の部屋）', 'プリズマリン系ブロック・タイドの鍛冶型'],
    mapTip: '神殿座標を「海底神殿・遺跡 (🔱)」で登録し、ネザー経由でアクセスすると快適',
  },
  {
    id: 'pillager-outpost',
    category: 'structure',
    title: '略奪者の前哨基地',
    icon: '🏴‍☠️',
    dimension: 'overworld',
    difficultyLabel: '★★☆ 中級',
    summary: 'アレイの救出や不吉な瓶の入手、襲撃イベントの起点として重要な拠点',
    recommendedPrep: ['盾（クロスボウ対策に必須）', '弓（遠距離狙撃用）', 'リード（アレイ連れ帰り用）', '鉄以上の防具'],
    keyPoints: [
      '周辺の丸石檻に「アレイ」が閉じ込められていることが多く、解放してアイテムを渡すと付いてくる。',
      'Ver 1.21以降は、旗持ちの隊長を倒すと「不吉な瓶」を落とし、好きなタイミングで襲撃や試練を開始可能。',
      'タワー周囲でも略奪者が無限リスポーンするため、最上階のチェストを漁る際は足場や壁で遮蔽を作る。',
    ],
    rewards: ['不吉な瓶（襲撃・試練用）', 'アレイ', 'ブタの鼻/略奪者系の戦利品（先端風の鍛冶型）', 'クロスボウ・矢'],
    mapTip: '村から離れた位置なら「その他・メモ」等で登録しておくと不吉な瓶集めに便利',
  },
  {
    id: 'woodland-mansion',
    category: 'structure',
    title: '森の洋館',
    icon: '🏚️',
    dimension: 'overworld',
    difficultyLabel: '★★★ 上級',
    summary: '数千〜数万ブロック先に生成される巨大屋敷。不死のトーテムを入手できる貴重な場所',
    recommendedPrep: ['製図家から購入した「森の探検家の地図」', 'ダイヤ以上の装備・盾', '弓（パワー/無限推奨）', 'エンダーパール・食料大量'],
    keyPoints: [
      '斧を持った「ヴィンディケーター」は近接火力が非常に高いため、狭い廊下では盾で防ぐか2マス上に乗って弓で倒す。',
      '「エヴォーカー」はヴェックス（壁抜け飛翔Mob）と牙攻撃を召喚するため、見つけ次第最優先で速攻撃破する。',
      '館内は非常に暗く広いため、探索済みの部屋は松明を置くかドアに目印を付けて迷子と湧き潰しを同時に行う。',
    ],
    rewards: ['不死のトーテム（エヴォーカーがドロップ）', 'ヴェックス風の鍛冶型', 'ダイヤモンドブロック（隠し部屋）'],
    mapTip: '非常に遠方にあるため、到達時は「拠点」や「ネザーゲート」を登録してネザー氷道で繋ぐと便利',
  },
  {
    id: 'bastion-remnant',
    category: 'structure',
    title: '砦の遺跡（ピグリン要塞）',
    icon: '🐷',
    dimension: 'nether',
    difficultyLabel: '★★★ 上級',
    summary: 'ネザライト装備への強化に必要な「鍛冶型」が手に入る高難度ネザー構造物',
    recommendedPrep: ['金装備1部位（通常ピグリン中立化）', '耐火ポーション', 'ホッパー（チェスト中身抜き取り用）', '溶岩遮蔽用の足場ブロック'],
    keyPoints: [
      '「ピグリンブルート（黒い服・金斧）」は金装備を着ていても無条件で襲ってくる最強クラスMob。溶岩バケツや弓、足場上から処理する。',
      'ピグリンの前でチェストを開ける・金ブロックを掘ると周囲のピグリンが全員敵対する。壁で囲むか下にホッパーを刺して中身を吸うと安全。',
      '「宝物部屋」型には中央マグマの上にチェストがあり、ネザライト強化鍛冶型が確定（または高確率）で入手できる。',
    ],
    rewards: ['ネザライト強化の鍛冶型', 'ブタの鼻の鍛冶型 / 旗の模様', '古代の残骸・ネザライトインゴット・金ブロック'],
    mapTip: '「ネザー要塞・砦 (🏰)」として登録し、どの型（宝物部屋・住居等）かメモ欄に記録',
  },
  {
    id: 'ancient-city',
    category: 'structure',
    title: '古代都市（ディープダーク）',
    icon: '🔊',
    dimension: 'overworld',
    difficultyLabel: '★★★ 上級',
    summary: 'Y=-51付近に広がる静寂の遺跡。音を立てずにスニーク速度上昇などのレア装備を回収',
    recommendedPrep: ['羊毛ブロック大量（2〜3スタック以上）', 'クワ（スカルク系を高速破壊）', '暗視ポーション', '雪玉/矢（センサー誘導用）', 'エリトラ or 水バケツ'],
    keyPoints: [
      '「スカルクシュリーカー」が合計4回起動すると最強ボス「ウォーデン」が出現するため、シュリーカーを見たら周囲を羊毛で囲って破壊する。',
      'チェストの周囲や歩行ルートに羊毛を敷き詰めると足音や開閉音がセンサーに届かなくなる（羊毛上の移動・設置は無音）。',
      '万が一ウォーデンが出たら戦わず、スニークしながら静かに100ブロック以上離れてデスポーン（約60秒）を待つ。',
    ],
    rewards: ['スニーク速度上昇 III のエンチャント本', '静寂/監獄風の鍛冶型', 'エンチャント金リンゴ・残響の欠片（リカバリーコンパス）'],
    mapTip: '山岳バイオーム地下（Y=-51）で見つけたらネザー直結ルート用に座標を登録',
  },
  {
    id: 'trial-chambers',
    category: 'structure',
    title: 'トライアルチャンバー（試練の間）',
    icon: '⚒️',
    dimension: 'overworld',
    difficultyLabel: '★★☆ 中級',
    summary: '銅と凝灰岩でできた地下ダンジョン。試練をクリアしてメイス素材や宝物庫を開放',
    recommendedPrep: ['製図家の「試練の間の地図」', '盾（ブリーズ・スケルトン対策）', '弓＆剣', '牛乳 / ハチミツ瓶（不吉な試練対策）'],
    keyPoints: [
      'トライアルスポナーから出現する敵を全滅させると「試練の鍵」やエメラルドなどの報酬が排出される。',
      '「ブリーズ」は跳ね回り風弾を撃つ。矢を弾く特性があるため、近接武器（剣・斧）で仕留めるのが確実。',
      '「不吉な瓶」を飲んでスポナーに近づくと「不吉な試練」に変化し、難しい代わりに「不吉な宝物庫」用の鍵を入手できる。',
    ],
    rewards: ['ヘビーコア（メイス作成素材）', 'ブリーズロッド（ウィンドチャージ）', 'ネジ/フローの鍛冶型・迅速のエンチャント本'],
  },
  {
    id: 'raid-event',
    category: 'event',
    title: '襲撃イベント（村の防衛）',
    icon: '🛡️',
    dimension: 'overworld',
    difficultyLabel: '★★☆ 中級〜上級',
    summary: '不吉な瓶を使用して村で発生するウェーブ防衛戦。不死のトーテムや村人の大幅割引を獲得',
    recommendedPrep: ['不吉な瓶（Ver 1.21+）または旗持ち隊長撃破', '村を囲う柵/壁（村人保護）', '弓＆盾＆鉄以上の装備', '牛乳バケツ（中断用）'],
    keyPoints: [
      '開始前に村人全員を壁・柵や屋内に隔離し、出入り口をブロックで塞いでおくと襲撃による全滅を防げる。',
      '「村の鐘」を鳴らすと周囲の襲撃者が発光し、どこに隠れているか壁越しでも把握できる。',
      '後半ウェーブの「ラヴェジャー（巨大な獣）」は突進を盾で弾くとスタンする。高さ3マス以上の足場から弓で安全に倒せる。',
      '「エヴォーカー」を倒せば不死のトーテムをドロップ。全ウェーブクリアで「村の英雄」効果を獲得。',
    ],
    rewards: ['不死のトーテム（複数獲得可能）', '村の英雄効果（交易アイテム大幅割引＆贈り物）', 'エメラルド・鞍・エンチャント本'],
    mapTip: '襲撃専用の安全な仮村（または防衛拠点）を地図に登録しておくと事故を防げる',
  },
  {
    id: 'wither-boss',
    category: 'event',
    title: 'ウィザー召喚・討伐戦',
    icon: '💀',
    dimension: 'any',
    difficultyLabel: '★★★ 上級',
    summary: 'ビーコン作成に必須のネザースターを入手するためのボス攻略（地下戦闘が安定）',
    recommendedPrep: [
      'ソウルサンド×4 ＋ ウィザースケルトンの頭蓋骨×3',
      'アンデッド特効 V（スマ―ト）の剣',
      'パワー V 弓 ＋ 回復/再生/力のポーション',
      '牛乳（ウィザー衰弱ダメージ解除）＆不死のトーテム',
    ],
    keyPoints: [
      '地上で召喚すると地形を大規模に破壊しながら飛び回るため、地下最深部（Y=-58付近）に細いトンネルを掘って先端で召喚するのが定番。',
      'HPが半分以下になると青いアーマーを纏い「矢が一切効かなくなる」ため、後半はアンデッド特効の剣で近接決戦に切り替える。',
      '統合版（Bedrock）のウィザーはJava版よりHPが高く突進攻撃も激しいため、広めの地下空間＋治癒スプラッシュ（アンデッドにダメージ）やトーテムを多めに用意。',
    ],
    rewards: ['ネザースター（ビーコンのコア素材）'],
    mapTip: '拠点から十分離れた専用の地下召喚場を登録して事故を防止',
  },
  {
    id: 'piglin-bartering',
    category: 'event',
    title: 'ピグリン交易（物々交換）',
    icon: '🪙',
    dimension: 'nether',
    difficultyLabel: '★☆☆ 初級',
    summary: '金インゴットを渡すだけでエンダーパールや耐火ポーション、黒曜石を大量入手',
    recommendedPrep: ['金インゴット複数スタック', '金装備1部位', '囲い用ブロック（ネザーラック等）'],
    keyPoints: [
      'ピグリンを2〜3ブロックの穴に閉じ込めて金インゴットを投げ渡すと、約6秒後に様々なアイテムを投げ返してくる。',
      'ホッパーとチェストの上にピグリンを立たせれば半自動交易になり、エンダーパール集めや泣く黒曜石収集が飛躍的に楽になる。',
      'ピグリンは周囲で金鉱石やチェストを開けると怒るため、交易場では必ず閉鎖空間で行う。',
    ],
    rewards: ['エンダーパール', '耐火ポーション（スプラッシュ含む）', '黒曜石・泣く黒曜石・ソウルスピードの本'],
  },
  {
    id: 'zombie-siege',
    category: 'event',
    title: '村の夜間ゾンビ襲撃対策',
    icon: '🧟',
    dimension: 'overworld',
    difficultyLabel: '★☆☆ 初級',
    summary: '真夜中に村の近くに発生する突発的なゾンビ大量湧きイベントへの備え',
    recommendedPrep: ['松明・ランタン大量', '柵・壁（村周囲）', 'ベッド（夜を即スキップ）'],
    keyPoints: [
      'ベッドと村人が一定数いる村で、真夜中（時刻18000付近）になると明るさに関係なくゾンビが一斉に湧くことがある。',
      '村に滞在する際は日没と同時にすぐ寝るか、村の外周を柵で囲みアイアンゴーレムが巡回できるようにしておく。',
      'ハード難易度ではゾンビが木のドアを破壊するため、村人の家のドアはブロック1段上げや鉄ドア/フェンスゲートにすると安全。',
    ],
    rewards: ['治療用のゾンビ村人確保（司書等の激安交易化）'],
  },
  {
    id: 'skeleton-trap',
    category: 'event',
    title: 'スケルトンホース（雷雨イベント）',
    icon: '⚡',
    dimension: 'overworld',
    difficultyLabel: '★★☆ 中級',
    summary: '雷雨時に出現する骨馬に近づくと発生する4騎のスケルトン騎士との戦闘',
    recommendedPrep: ['盾', '剣・弓', 'リードまたは鞍（保護用）'],
    keyPoints: [
      '雷雨後に1頭だけポツンといるスケルトンホースに10ブロック以内へ近づくと落雷し、鉄ヘルメット＋エンチャント弓装備のスケルトン4騎が出現する。',
      'エンチャント弓の火力が連続ヒットすると危険なため、まず盾を構えて遮蔽物裏に隠れながら騎士（上のスケルトン）だけを慎重に狙い撃つ。',
      '騎士だけを倒せば残ったスケルトンホースは鞍なしでも騎乗可能で、水中も沈まず走れる貴重な移動手段になる。',
    ],
    rewards: ['スケルトンホース（水中歩行可能な乗用馬）', 'エンチャント済み鉄ヘルメット・弓'],
  },
];

/**
 * ストレージキー定義
 * - IndexedDB 保存（大容量・構造化データ）: WORLDS, PLAYER_POSITION, ROADMAP_PROGRESS
 * - localStorage 保存（軽量・即時復元が必要なUI設定）: ACTIVE_WORLD_ID, ACTIVE_DIMENSION, THEME_MODE, MAP_VIEWPORT, AUTO_FILL_PLAYER_COORDS
 */
export const STORAGE_KEYS = {
  // IndexedDB
  WORLDS: 'minemap_worlds_v1',
  PLAYER_POSITION: 'minemap_player_pos_v1',
  ROADMAP_PROGRESS: 'minemap_roadmap_progress_v1',
  // localStorage
  ACTIVE_WORLD_ID: 'minemap_active_world_v1',
  ACTIVE_DIMENSION: 'minemap_active_dimension_v1',
  THEME_MODE: 'minemap_theme_v1',
  MAP_VIEWPORT: 'minemap_map_viewport_v1',
  AUTO_FILL_PLAYER_COORDS: 'minemap_autofill_player_v1',
};

