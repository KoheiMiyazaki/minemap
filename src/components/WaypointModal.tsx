import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, ClipboardPaste, Navigation, X } from 'lucide-react';
import {
  CATEGORY_CONFIGS,
  DEFAULT_PLAYER_POSITION,
  DIMENSION_CONFIGS,
  EMOJI_PRESETS,
  PIN_COLOR_PRESETS,
  STORAGE_KEYS,
  type CategoryId,
  type DimensionId,
  type Waypoint,
} from '../data/minecraftMapData';
import {
  convertDimensionCoords,
  parseCoordinateInput,
  type PlayerPosition,
} from '../utils/coordinates';
import { loadLocalString, saveLocalString } from '../utils/storage';

interface WaypointModalProps {
  isOpen: boolean;
  editingWaypoint: Waypoint | null;
  initialCoords?: { x: number; y?: number | null; z: number; dimension: DimensionId } | null;
  isFromMapTap?: boolean;
  playerPosition: PlayerPosition | null;
  activeDimension: DimensionId;
  onClose: () => void;
  onSave: (
    data: Omit<Waypoint, 'id' | 'createdAt' | 'updatedAt'>,
    createPairedNetherPortal?: boolean
  ) => void;
}

export const WaypointModal: React.FC<WaypointModalProps> = ({
  isOpen,
  editingWaypoint,
  initialCoords,
  isFromMapTap = false,
  playerPosition,
  activeDimension,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [xStr, setXStr] = useState('');
  const [yStr, setYStr] = useState('');
  const [zStr, setZStr] = useState('');
  const [dimension, setDimension] = useState<DimensionId>('overworld');
  const [category, setCategory] = useState<CategoryId>('base');
  const [icon, setIcon] = useState('🏠');
  const [color, setColor] = useState('#10b981');
  const [note, setNote] = useState('');
  const [quickPaste, setQuickPaste] = useState('');
  const [createPairedPortal, setCreatePairedPortal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoFillEnabled, setAutoFillEnabled] = useState<boolean>(() => {
    const saved = loadLocalString(STORAGE_KEYS.AUTO_FILL_PLAYER_COORDS);
    return saved === 'true';
  });

  // Fallback to default coordinates when playerPosition is unknown (null)
  const resolvedPlayerOrDefault = playerPosition
    ? { ...playerPosition, isFallbackDefault: false }
    : {
        x: DEFAULT_PLAYER_POSITION.x,
        y: DEFAULT_PLAYER_POSITION.y,
        z: DEFAULT_PLAYER_POSITION.z,
        dimension: activeDimension,
        isFallbackDefault: true,
      };

  const applyPlayerOrDefaultCoords = () => {
    setXStr(String(resolvedPlayerOrDefault.x));
    setYStr(String(resolvedPlayerOrDefault.y));
    setZStr(String(resolvedPlayerOrDefault.z));
    setDimension(resolvedPlayerOrDefault.dimension);
    setErrorMsg(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setQuickPaste('');
    setCreatePairedPortal(false);

    if (editingWaypoint) {
      setName(editingWaypoint.name);
      setXStr(String(editingWaypoint.x));
      setYStr(editingWaypoint.y !== null ? String(editingWaypoint.y) : '');
      setZStr(String(editingWaypoint.z));
      setDimension(editingWaypoint.dimension);
      setCategory(editingWaypoint.category);
      setIcon(editingWaypoint.icon);
      setColor(editingWaypoint.color);
      setNote(editingWaypoint.note);
    } else {
      const cat = CATEGORY_CONFIGS.find((c) => c.id === 'base') ?? CATEGORY_CONFIGS[0];
      setName('');
      setCategory(cat.id);
      setIcon(cat.defaultIcon);
      setColor(cat.pinColor);
      setNote('');

      if (isFromMapTap && initialCoords) {
        setXStr(String(initialCoords.x));
        setYStr(
          initialCoords.y !== undefined && initialCoords.y !== null
            ? String(initialCoords.y)
            : ''
        );
        setZStr(String(initialCoords.z));
        setDimension(initialCoords.dimension);
      } else if (autoFillEnabled && playerPosition) {
        setXStr(String(playerPosition.x));
        setYStr(String(playerPosition.y));
        setZStr(String(playerPosition.z));
        setDimension(playerPosition.dimension);
      } else {
        setXStr('');
        setYStr('');
        setZStr('');
        setDimension(initialCoords?.dimension ?? activeDimension);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingWaypoint, initialCoords, isFromMapTap]);

  if (!isOpen) return null;

  const handleToggleAutoFill = (checked: boolean) => {
    setAutoFillEnabled(checked);
    saveLocalString(STORAGE_KEYS.AUTO_FILL_PLAYER_COORDS, String(checked));
    if (checked) {
      applyPlayerOrDefaultCoords();
    }
  };

  const handleSelectCategory = (catId: CategoryId) => {
    setCategory(catId);
    const cat = CATEGORY_CONFIGS.find((c) => c.id === catId);
    if (cat) {
      setIcon(cat.defaultIcon);
      setColor(cat.pinColor);
      if (!name.trim() && !editingWaypoint) {
        setName(cat.label);
      }
    }
  };

  const handleQuickParse = (val: string) => {
    setQuickPaste(val);
    const parsed = parseCoordinateInput(val);
    if (parsed) {
      setXStr(String(parsed.x));
      if (parsed.y !== null) setYStr(String(parsed.y));
      setZStr(String(parsed.z));
      setErrorMsg(null);
    }
  };

  const toggleSign = (val: string, setter: (v: string) => void) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '0') {
      setter('-');
      return;
    }
    if (trimmed.startsWith('-')) {
      setter(trimmed.slice(1));
    } else {
      setter('-' + trimmed);
    }
  };

  const hasCoordsForPreview =
    xStr.trim() !== '' &&
    zStr.trim() !== '' &&
    !Number.isNaN(Number(xStr)) &&
    !Number.isNaN(Number(zStr));
  const portalPreview = hasCoordsForPreview
    ? convertDimensionCoords(Number(xStr), Number(zStr), dimension)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(xStr, 10);
    const z = parseInt(zStr, 10);
    const y = yStr.trim() === '' ? null : parseInt(yStr, 10);

    if (Number.isNaN(x) || Number.isNaN(z)) {
      setErrorMsg('X座標とZ座標には整数を入力してください。');
      return;
    }
    if (yStr.trim() !== '' && Number.isNaN(y as number)) {
      setErrorMsg('Y座標（高さ）は整数または空欄にしてください。');
      return;
    }

    const catObj = CATEGORY_CONFIGS.find((c) => c.id === category);
    const finalName = name.trim() || catObj?.label || '名称未設定の地点';

    onSave(
      {
        name: finalName,
        x,
        y,
        z,
        dimension,
        category,
        icon: icon.trim() || '📍',
        color,
        note: note.trim(),
      },
      !editingWaypoint && category === 'nether_portal' && createPairedPortal
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl sm:rounded-2xl"
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-3.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {editingWaypoint ? '地点を編集' : '新しい地点を登録'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="waypoint-form"
          onSubmit={handleSubmit}
          className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {/* Auto-Fill Current Player Coordinates Option */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 px-3.5 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {!editingWaypoint ? (
                <label className="flex min-h-[36px] flex-1 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={autoFillEnabled}
                    onChange={(e) => handleToggleAutoFill(e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-600 shrink-0"
                  />
                  <span>現在のプレイヤー座標を自動入力</span>
                </label>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Navigation className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                  <span>プレイヤー現在地</span>
                </span>
              )}

              <button
                type="button"
                onClick={applyPlayerOrDefaultCoords}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 transition hover:bg-sky-500/20 whitespace-nowrap shrink-0"
              >
                <Navigation className="h-3 w-3 shrink-0" />
                <span>今すぐ反映</span>
              </button>
            </div>

            <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
              {resolvedPlayerOrDefault.isFallbackDefault ? (
                <span>
                  現在地が未設定のためデフォルト座標を提示: X:{resolvedPlayerOrDefault.x} · Y:
                  {resolvedPlayerOrDefault.y} · Z:{resolvedPlayerOrDefault.z}
                </span>
              ) : (
                <span>
                  現在地: X:{resolvedPlayerOrDefault.x} · Y:{resolvedPlayerOrDefault.y} · Z:
                  {resolvedPlayerOrDefault.z} (
                  {DIMENSION_CONFIGS.find((d) => d.id === resolvedPlayerOrDefault.dimension)
                    ?.shortName ?? resolvedPlayerOrDefault.dimension}
                  )
                </span>
              )}
            </div>
          </div>

          {/* Smart Coordinate Paste */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <ClipboardPaste className="h-3.5 w-3.5 text-emerald-500" />
              <span>座標テキスト貼り付け（F3・/tpコマンド対応）</span>
            </label>
            <input
              type="text"
              value={quickPaste}
              onChange={(e) => handleQuickParse(e.target.value)}
              placeholder="例: 125 64 -480 や /tp @s 125 64 -480"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* X / Y / Z Inputs with ± sign toggles for easy iPhone negative input */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                X（東西）
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-emerald-500">
                <button
                  type="button"
                  onClick={() => toggleSign(xStr, setXStr)}
                  aria-label="Xの符号を反転"
                  className="flex min-h-[44px] w-9 shrink-0 items-center justify-center border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  ±
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={xStr}
                  onChange={(e) => setXStr(e.target.value)}
                  placeholder="0"
                  className="min-h-[44px] w-full bg-transparent px-2 text-sm font-semibold font-mono-tabular text-slate-900 dark:text-slate-100 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Y（高さ・任意）
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-emerald-500">
                <button
                  type="button"
                  onClick={() => toggleSign(yStr, setYStr)}
                  aria-label="Yの符号を反転"
                  className="flex min-h-[44px] w-9 shrink-0 items-center justify-center border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  ±
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={yStr}
                  onChange={(e) => setYStr(e.target.value)}
                  placeholder="64"
                  className="min-h-[44px] w-full bg-transparent px-2 text-sm font-semibold font-mono-tabular text-slate-900 dark:text-slate-100 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                Z（南北）
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-emerald-500">
                <button
                  type="button"
                  onClick={() => toggleSign(zStr, setZStr)}
                  aria-label="Zの符号を反転"
                  className="flex min-h-[44px] w-9 shrink-0 items-center justify-center border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  ±
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={zStr}
                  onChange={(e) => setZStr(e.target.value)}
                  placeholder="0"
                  className="min-h-[44px] w-full bg-transparent px-2 text-sm font-semibold font-mono-tabular text-slate-900 dark:text-slate-100 placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Dimension Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              ディメンション
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIMENSION_CONFIGS.map((dim) => {
                const active = dimension === dim.id;
                return (
                  <button
                    key={dim.id}
                    type="button"
                    onClick={() => setDimension(dim.id)}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition whitespace-nowrap ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{dim.icon}</span>
                    <span>{dim.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nether <-> Overworld Conversion Preview */}
          {portalPreview && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-purple-500" />
                  {portalPreview.targetDim === 'nether' ? 'ネザー換算座標' : '地上換算座標'}
                </span>
                <span className="font-bold font-mono-tabular text-slate-900 dark:text-slate-100">
                  X: {portalPreview.x} · Z: {portalPreview.z}
                </span>
              </div>
              {!editingWaypoint && category === 'nether_portal' && (
                <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-xs font-medium text-purple-700 dark:text-purple-300">
                  <input
                    type="checkbox"
                    checked={createPairedPortal}
                    onChange={(e) => setCreatePairedPortal(e.target.checked)}
                    className="h-4 w-4 rounded accent-purple-600"
                  />
                  <span>
                    {portalPreview.targetDim === 'nether'
                      ? 'ネザー側にも対となるゲートを自動登録する'
                      : '地上側にも対となるゲートを自動登録する'}
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Category Presets */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              地点の種類
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {CATEGORY_CONFIGS.map((cat) => {
                const active = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{cat.defaultIcon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              地点名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 初期スポーン地点、第2拠点、司書村"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Icon (Emoji) & Color Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                アイコン（絵文字）とピン色
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">直接入力:</span>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={4}
                  aria-label="カスタム絵文字"
                  className="h-9 w-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_PRESETS.map((preset) => (
                <button
                  key={preset.emoji}
                  type="button"
                  title={preset.label}
                  onClick={() => setIcon(preset.emoji)}
                  className={`flex min-h-[44px] items-center justify-center rounded-xl border text-lg transition ${
                    icon === preset.emoji
                      ? 'border-emerald-500 bg-emerald-500/15 scale-105'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.emoji}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {PIN_COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  aria-label={`色 ${hex}`}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    color === hex
                      ? 'scale-110 border-slate-900 dark:border-white'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              メモ（任意）
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="交易品、スポナー情報、目印など..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <p className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </p>
          )}
        </form>

        {/* Footer Actions */}
        <div className="flex items-center gap-2.5 border-t border-slate-200 dark:border-slate-800 px-5 py-3.5 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="waypoint-form"
            className="min-h-[44px] flex-[2] rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            {editingWaypoint ? '変更を保存' : '地点を登録'}
          </button>
        </div>
      </div>
    </div>
  );
};
