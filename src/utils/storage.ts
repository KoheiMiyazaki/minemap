import { STORAGE_KEYS } from '../data/minecraftMapData';

/**
 * ストレージ使い分け設計（System Instructions 準拠）
 *
 * 1. IndexedDB (`minemap_db` / store: `app_data`)
 *    - ワールドプロファイル・全地点（ウェイポイント）配列 (`WORLDS`)
 *    - プレイヤー現在地 (`PLAYER_POSITION`)
 *    - エンドラ討伐チェックリスト進捗 (`ROADMAP_PROGRESS`)
 *    -> 件数増加に伴う容量制限（localStorage 5MB上限）を回避するため IndexedDB に永続化。
 *    -> 既存の localStorage 保存データがある場合は初回ロード時に自動移行し、localStorage 側を解放する。
 *
 * 2. localStorage
 *    - テーマ設定 (`THEME_MODE`)
 *    - 選択中のワールドID / ディメンション (`ACTIVE_WORLD_ID`, `ACTIVE_DIMENSION`)
 *    - 地図ビューポート座標・ズーム (`MAP_VIEWPORT`)
 *    - フォーム補助設定 (`AUTO_FILL_PLAYER_COORDS`)
 *    -> 初回描画時のチラつき防止や軽量UI状態の即時参照に利用。
 */

const DB_NAME = 'minemap_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not supported'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });

  return dbPromise;
}

async function idbGetRaw<T>(key: string): Promise<T | undefined> {
  const db = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetRaw<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * IndexedDB からデータを読み込み。
 * 未保存かつ localStorage に旧データがある場合は自動的に IndexedDB へ移行し、localStorage を整理する。
 */
export async function loadIndexedDBWithMigration<T>(key: string, fallback: T): Promise<T> {
  try {
    const existing = await idbGetRaw<T>(key);
    if (existing !== undefined) {
      // Ensure stale legacy localStorage entry is cleaned up if still present
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
      return existing;
    }

    // Legacy migration from localStorage -> IndexedDB
    try {
      const legacyRaw = localStorage.getItem(key);
      if (legacyRaw !== null) {
        const parsed = JSON.parse(legacyRaw) as T;
        await idbSetRaw(key, parsed);
        localStorage.removeItem(key);
        return parsed;
      }
    } catch {
      // Ignore legacy parse/migration failure
    }

    return fallback;
  } catch {
    // Fallback to localStorage if IndexedDB is blocked (e.g., restricted private mode)
    return loadLocalJson<T>(key, fallback);
  }
}

/**
 * IndexedDB へメインデータを保存（非対応環境では localStorage にフォールバック）
 */
export async function saveIndexedDB<T>(key: string, value: T): Promise<void> {
  try {
    await idbSetRaw(key, value);
  } catch {
    saveLocalJson(key, value);
  }
}

/**
 * localStorage から同期的にJSONを読み込み（軽量UI設定・マイグレーション前の初期表示補助用）
 */
export function loadLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLocalJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveLocalString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota errors
  }
}

export const INDEXED_DB_KEYS = {
  WORLDS: STORAGE_KEYS.WORLDS,
  PLAYER_POSITION: STORAGE_KEYS.PLAYER_POSITION,
  ROADMAP_PROGRESS: STORAGE_KEYS.ROADMAP_PROGRESS,
} as const;
