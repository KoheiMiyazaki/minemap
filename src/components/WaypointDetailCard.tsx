import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Crosshair,
  Navigation,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_CONFIGS,
  DIMENSION_CONFIGS,
  MOVEMENT_SPEED_PRESETS,
  type DimensionId,
  type Waypoint,
} from '../data/minecraftMapData';
import {
  calc3DDistance,
  calcCardinalDirection,
  calcChunkAndRegion,
  calcHorizontalDistance,
  calcTravelTimeSeconds,
  convertDimensionCoords,
  formatDurationJa,
  type PlayerPosition,
} from '../utils/coordinates';

interface WaypointDetailCardProps {
  waypoint: Waypoint;
  playerPosition: PlayerPosition | null;
  onClose: () => void;
  onEdit: (wp: Waypoint) => void;
  onDelete: (id: string) => void;
  onCenterOnMap: (wp: Waypoint) => void;
  onSetAsPlayerPos: (wp: Waypoint) => void;
  onOpenPlayerSettings?: () => void;
  onJumpToDimensionCoord: (dim: DimensionId, x: number, z: number) => void;
}

export const WaypointDetailCard: React.FC<WaypointDetailCardProps> = ({
  waypoint,
  playerPosition,
  onClose,
  onEdit,
  onDelete,
  onCenterOnMap,
  onSetAsPlayerPos,
  onOpenPlayerSettings,
  onJumpToDimensionCoord,
}) => {
  const [copiedTp, setCopiedTp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const catConfig = CATEGORY_CONFIGS.find((c) => c.id === waypoint.category);
  const dimConfig = DIMENSION_CONFIGS.find((d) => d.id === waypoint.dimension);
  const chunk = calcChunkAndRegion(waypoint.x, waypoint.z);
  const converted = convertDimensionCoords(waypoint.x, waypoint.z, waypoint.dimension);

  const sameDimPlayer =
    playerPosition && playerPosition.dimension === waypoint.dimension ? playerPosition : null;

  const refPoint = sameDimPlayer
    ? {
        x: sameDimPlayer.x,
        y: sameDimPlayer.y,
        z: sameDimPlayer.z,
        label: `現在地 (${sameDimPlayer.x}, ${sameDimPlayer.z}) からの直線距離`,
        isPlayer: true,
      }
    : {
        x: 0,
        y: 64,
        z: 0,
        label: '原点 (0, 0) からの直線距離',
        isPlayer: false,
      };

  const distance2D = calcHorizontalDistance(refPoint, waypoint);
  const distance3D =
    waypoint.y !== null
      ? calc3DDistance(refPoint, { x: waypoint.x, y: waypoint.y, z: waypoint.z })
      : null;
  const direction = calcCardinalDirection(refPoint, waypoint);

  const travelTimes = MOVEMENT_SPEED_PRESETS.map((preset) => ({
    ...preset,
    durationText: formatDurationJa(
      calcTravelTimeSeconds(distance2D, preset.speedBlocksPerSec)
    ),
  }));

  const tpCommand = `/tp @s ${waypoint.x} ${waypoint.y ?? '~'} ${waypoint.z}`;

  const handleCopyTp = async () => {
    try {
      await navigator.clipboard.writeText(tpCommand);
      setCopiedTp(true);
      setTimeout(() => setCopiedTp(false), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/90 bg-white/96 dark:bg-slate-900/96 p-4 shadow-xl backdrop-blur-md">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 text-2xl bg-slate-50 dark:bg-slate-800"
            style={{ borderColor: waypoint.color }}
          >
            {waypoint.icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
              {waypoint.name}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>{catConfig?.label ?? '地点'}</span>
              <span aria-hidden="true">·</span>
              <span>{dimConfig?.name}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="詳細を閉じる"
          className="flex min-h-[44px] min-w-[44px] -mr-2 -mt-2 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Coordinates & Straight-Line Distance Summary */}
      <div className="mt-3.5 space-y-3 border-y border-slate-100 dark:border-slate-800 py-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              座標 (X / Y / Z)
            </div>
            <div className="mt-0.5 text-sm font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
              {waypoint.x} / {waypoint.y ?? '—'} / {waypoint.z}
            </div>
            <div className="mt-0.5 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              Chunk {chunk.chunkX}, {chunk.chunkZ}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="truncate">{refPoint.label}</span>
              {onOpenPlayerSettings && (
                <button
                  type="button"
                  onClick={onOpenPlayerSettings}
                  className="shrink-0 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  変更
                </button>
              )}
            </div>
            <div className="mt-0.5 text-sm font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
              {distance2D.toLocaleString()} B · {direction.label}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              {distance3D !== null && distance3D !== distance2D && (
                <span>3D: {distance3D.toLocaleString()} B</span>
              )}
              {converted && (
                <button
                  type="button"
                  onClick={() =>
                    onJumpToDimensionCoord(converted.targetDim, converted.x, converted.z)
                  }
                  className="inline-flex items-center gap-1 font-medium text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <ArrowLeftRight className="h-3 w-3 shrink-0" />
                  <span>
                    {converted.targetDim === 'nether' ? 'ネザー' : '地上'}: {converted.x},{' '}
                    {converted.z}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Travel Time Estimates (Walk / Sprint / Sprint-Jump) */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span>移動時間目安（直線 {distance2D.toLocaleString()} B）</span>
            {!refPoint.isPlayer && playerPosition && (
              <span className="text-amber-600 dark:text-amber-400">
                ※現在地は別ディメンション中
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {travelTimes.map((item) => (
              <div key={item.id} className="min-w-0">
                <div className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {item.icon} {item.label}
                </div>
                <div className="mt-0.5 text-xs font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                  {item.durationText}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {waypoint.note && (
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {waypoint.note}
        </p>
      )}

      {/* Action Buttons */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCenterOnMap(waypoint)}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-3 py-2 text-xs font-semibold text-white dark:text-slate-900 transition hover:opacity-90 whitespace-nowrap"
        >
          <Crosshair className="h-3.5 w-3.5" />
          <span>地図中央</span>
        </button>

        <button
          type="button"
          onClick={() => onSetAsPlayerPos(waypoint)}
          title="この地点を現在地（距離計算の基準）に設定"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          <Navigation className="h-3.5 w-3.5 text-sky-500" />
          <span>現在地に</span>
        </button>

        <button
          type="button"
          onClick={handleCopyTp}
          title={tpCommand}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          {copiedTp ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>コピー済</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>/tp</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(waypoint)}
          aria-label="編集"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="削除"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex w-full items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs">
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              この地点を削除しますか？
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[36px] rounded-lg px-2.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => onDelete(waypoint.id)}
                className="min-h-[36px] rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-500"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
