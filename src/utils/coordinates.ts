import type { DimensionId } from '../data/minecraftMapData';

export interface Point2D {
  x: number;
  z: number;
}

export interface PlayerPosition {
  x: number;
  y: number;
  z: number;
  dimension: DimensionId;
}

/**
 * 2点間の水平直線距離 (ブロック数)
 */
export function calcHorizontalDistance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.round(Math.hypot(dx, dz));
}

/**
 * 3D直線距離 (Yが両方ある場合)
 */
export function calc3DDistance(
  a: { x: number; y: number | null; z: number },
  b: { x: number; y: number | null; z: number }
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dy = a.y !== null && b.y !== null ? b.y - a.y : 0;
  return Math.round(Math.hypot(dx, dy, dz));
}

/**
 * 距離 (ブロック) と速度 (B/s) から移動時間 (秒) を計算
 */
export function calcTravelTimeSeconds(distanceBlocks: number, speedBlocksPerSec: number): number {
  if (distanceBlocks <= 0 || speedBlocksPerSec <= 0) return 0;
  return Math.round(distanceBlocks / speedBlocksPerSec);
}

/**
 * 秒数を日本語の読みやすい時間表記へフォーマット (例: 45秒, 2分13秒, 1時間05分)
 */
export function formatDurationJa(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0秒';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}時間${String(mins).padStart(2, '0')}分`;
  }
  if (mins > 0) {
    return `${mins}分${String(secs).padStart(2, '0')}秒`;
  }
  return `${secs}秒`;
}

/**
 * マイクラ基準の8方位を返す (-Z=北, +Z=南, +X=東, -X=西)
 */
export function calcCardinalDirection(from: Point2D, to: Point2D): {
  label: string;
  angleDeg: number;
} {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (dx === 0 && dz === 0) {
    return { label: '同地点', angleDeg: 0 };
  }
  // 北(-Z)を0度とし、時計回り(東+Xが90度、南+Zが180度、西-Xが270度)
  let deg = (Math.atan2(dx, -dz) * 180) / Math.PI;
  if (deg < 0) deg += 360;

  const dirs = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'];
  const index = Math.round(deg / 45) % 8;
  return { label: dirs[index], angleDeg: Math.round(deg) };
}

/**
 * チャンク座標 (16x16) とリージョンファイル座標 (32x32 chunks = 512x512) を計算
 */
export function calcChunkAndRegion(x: number, z: number): {
  chunkX: number;
  chunkZ: number;
  regionX: number;
  regionZ: number;
} {
  const chunkX = Math.floor(x / 16);
  const chunkZ = Math.floor(z / 16);
  const regionX = Math.floor(chunkX / 32);
  const regionZ = Math.floor(chunkZ / 32);
  return { chunkX, chunkZ, regionX, regionZ };
}

/**
 * オーバーワールド <-> ネザー座標変換
 */
export function convertDimensionCoords(
  x: number,
  z: number,
  from: DimensionId
): { targetDim: DimensionId; x: number; z: number } | null {
  if (from === 'overworld') {
    return { targetDim: 'nether', x: Math.round(x / 8), z: Math.round(z / 8) };
  }
  if (from === 'nether') {
    return { targetDim: 'overworld', x: Math.round(x * 8), z: Math.round(z * 8) };
  }
  return null;
}

/**
 * F3・/tpコマンド・カンマ/スペース区切りテキストから座標を自動抽出
 * 例: "/tp @s 125 64 -480", "X: 120, Y: 70, Z: -30", "120 -45"
 */
export function parseCoordinateInput(raw: string): {
  x: number;
  y: number | null;
  z: number;
} | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Match labeled coordinates like "x: 120 y: 64 z: -300" or "X=120 Z=-300"
  const xMatch = cleaned.match(/x\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  const yMatch = cleaned.match(/y\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  const zMatch = cleaned.match(/z\s*[:=]\s*(-?\d+(?:\.\d+)?)/i);
  if (xMatch && zMatch) {
    return {
      x: Math.round(Number(xMatch[1])),
      y: yMatch ? Math.round(Number(yMatch[1])) : null,
      z: Math.round(Number(zMatch[1])),
    };
  }

  // Extract all signed numbers
  const nums = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;

  if (nums.length === 2) {
    return {
      x: Math.round(Number(nums[0])),
      y: null,
      z: Math.round(Number(nums[1])),
    };
  }

  // 3 or more numbers: assume X Y Z (Minecraft standard order)
  return {
    x: Math.round(Number(nums[0])),
    y: Math.round(Number(nums[1])),
    z: Math.round(Number(nums[2])),
  };
}
