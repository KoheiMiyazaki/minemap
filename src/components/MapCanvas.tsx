import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Grid3X3,
  Maximize2,
  Minus,
  Plus,
  MapPinPlus,
  X,
} from 'lucide-react';
import {
  DIMENSION_CONFIGS,
  MOVEMENT_SPEED_PRESETS,
  type DimensionId,
  type Waypoint,
} from '../data/minecraftMapData';
import {
  calcCardinalDirection,
  calcChunkAndRegion,
  calcHorizontalDistance,
  calcTravelTimeSeconds,
  formatDurationJa,
  type PlayerPosition,
  type Point2D,
} from '../utils/coordinates';

interface MapCanvasProps {
  dimension: DimensionId;
  waypoints: Waypoint[];
  selectedWaypointId: string | null;
  playerPosition: PlayerPosition | null;
  centerTarget: { x: number; z: number; zoom?: number; nonce: number } | null;
  isDark: boolean;
  onSelectWaypoint: (id: string | null) => void;
  onQuickAddAtCoord: (x: number, z: number) => void;
  onUpdateViewportState?: (centerX: number, centerZ: number, zoom: number) => void;
  initialCenter?: { x: number; z: number; zoom: number };
}

interface DroppedPin {
  x: number;
  z: number;
}

const MIN_ZOOM = 0.04; // 1 block = 0.04px (wide regional view)
const MAX_ZOOM = 18; // 1 block = 18px (block-level detail)

export const MapCanvas: React.FC<MapCanvasProps> = ({
  dimension,
  waypoints,
  selectedWaypointId,
  playerPosition,
  centerTarget,
  isDark,
  onSelectWaypoint,
  onQuickAddAtCoord,
  onUpdateViewportState,
  initialCenter,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Camera state stored in ref for 60fps canvas drawing + state for HUD readouts
  const cameraRef = useRef({
    x: initialCenter?.x ?? 0,
    z: initialCenter?.z ?? 0,
    zoom: initialCenter?.zoom ?? 0.65, // pixels per block
  });

  const [hudCenter, setHudCenter] = useState<Point2D>({
    x: Math.round(cameraRef.current.x),
    z: Math.round(cameraRef.current.z),
  });
  const [zoomDisplay, setZoomDisplay] = useState<number>(cameraRef.current.zoom);
  const [showChunkGrid, setShowChunkGrid] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 500,
  });
  const [droppedPin, setDroppedPin] = useState<DroppedPin | null>(null);
  const [hoverCoord, setHoverCoord] = useState<Point2D | null>(null);
  const minimapDragRef = useRef<boolean>(false);

  // Pointer / touch interaction tracking
  const pointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    camX: number;
    camZ: number;
    moved: boolean;
  } | null>(null);
  const pinchRef = useRef<{
    dist: number;
    zoom: number;
    worldX: number;
    worldZ: number;
  } | null>(null);

  const dimConfig =
    DIMENSION_CONFIGS.find((d) => d.id === dimension) ?? DIMENSION_CONFIGS[0];

  const syncHudFromCamera = useCallback(() => {
    const cam = cameraRef.current;
    setHudCenter({ x: Math.round(cam.x), z: Math.round(cam.z) });
    setZoomDisplay(cam.zoom);
    onUpdateViewportState?.(cam.x, cam.z, cam.zoom);
  }, [onUpdateViewportState]);

  // Smoothly jump when centerTarget changes
  useEffect(() => {
    if (!centerTarget) return;
    cameraRef.current.x = centerTarget.x;
    cameraRef.current.z = centerTarget.z;
    if (centerTarget.zoom !== undefined) {
      cameraRef.current.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, centerTarget.zoom));
    } else if (cameraRef.current.zoom < 0.35) {
      cameraRef.current.zoom = 0.75;
    }
    setDroppedPin(null);
    syncHudFromCamera();
  }, [centerTarget, syncHudFromCamera]);

  // Helper: convert screen CSS px (relative to canvas) <-> Minecraft world (X, Z)
  const screenToWorld = useCallback((sx: number, sy: number, width: number, height: number) => {
    const cam = cameraRef.current;
    return {
      x: cam.x + (sx - width / 2) / cam.zoom,
      z: cam.z + (sy - height / 2) / cam.zoom,
    };
  }, []);

  const worldToScreen = useCallback((wx: number, wz: number, width: number, height: number) => {
    const cam = cameraRef.current;
    return {
      sx: width / 2 + (wx - cam.x) * cam.zoom,
      sy: height / 2 + (wz - cam.z) * cam.zoom,
    };
  }, []);

  // Choose adaptive grid step in Minecraft blocks
  const getGridStep = (zoom: number): number => {
    const targetPx = 90;
    const rawBlocks = targetPx / zoom;
    const steps = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
    for (const s of steps) {
      if (s >= rawBlocks) return s;
    }
    return 4096;
  };

  // Render canvas loop
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    const cam = cameraRef.current;
    const bg = isDark ? dimConfig.canvasBgDark : dimConfig.canvasBgLight;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const minWorldX = cam.x - width / 2 / cam.zoom;
    const maxWorldX = cam.x + width / 2 / cam.zoom;
    const minWorldZ = cam.z - height / 2 / cam.zoom;
    const maxWorldZ = cam.z + height / 2 / cam.zoom;

    // 1. Optional 16x16 Chunk grid when zoomed in reasonably
    if (showChunkGrid && 16 * cam.zoom >= 14) {
      ctx.strokeStyle = isDark ? dimConfig.chunkLineDark : dimConfig.chunkLineLight;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      const startChunkX = Math.floor(minWorldX / 16) * 16;
      const startChunkZ = Math.floor(minWorldZ / 16) * 16;

      ctx.beginPath();
      for (let wx = startChunkX; wx <= maxWorldX; wx += 16) {
        const { sx } = worldToScreen(wx, 0, width, height);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let wz = startChunkZ; wz <= maxWorldZ; wz += 16) {
        const { sy } = worldToScreen(0, wz, width, height);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Major adaptive coordinate grid + labels
    const step = getGridStep(cam.zoom);
    ctx.strokeStyle = isDark ? dimConfig.gridLineDark : dimConfig.gridLineLight;
    ctx.lineWidth = 1;
    const startX = Math.floor(minWorldX / step) * step;
    const startZ = Math.floor(minWorldZ / step) * step;

    ctx.beginPath();
    for (let wx = startX; wx <= maxWorldX; wx += step) {
      if (wx === 0) continue;
      const { sx } = worldToScreen(wx, 0, width, height);
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    for (let wz = startZ; wz <= maxWorldZ; wz += step) {
      if (wz === 0) continue;
      const { sy } = worldToScreen(0, wz, width, height);
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();

    // 3. Region 512x512 subtle boundary when zoomed out
    if (512 * cam.zoom >= 36 && step !== 512) {
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.09)';
      ctx.lineWidth = 1.2;
      const rStartX = Math.floor(minWorldX / 512) * 512;
      const rStartZ = Math.floor(minWorldZ / 512) * 512;
      ctx.beginPath();
      for (let wx = rStartX; wx <= maxWorldX; wx += 512) {
        if (wx === 0) continue;
        const { sx } = worldToScreen(wx, 0, width, height);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
      }
      for (let wz = rStartZ; wz <= maxWorldZ; wz += 512) {
        if (wz === 0) continue;
        const { sy } = worldToScreen(0, wz, width, height);
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
      }
      ctx.stroke();
    }

    // 4. Origin Axes (X=0, Z=0)
    const origin = worldToScreen(0, 0, width, height);
    ctx.strokeStyle = dimConfig.axisLineColor;
    ctx.lineWidth = 1.5;
    if (origin.sx >= 0 && origin.sx <= width) {
      ctx.beginPath();
      ctx.moveTo(origin.sx, 0);
      ctx.lineTo(origin.sx, height);
      ctx.stroke();
    }
    if (origin.sy >= 0 && origin.sy <= height) {
      ctx.beginPath();
      ctx.moveTo(0, origin.sy);
      ctx.lineTo(width, origin.sy);
      ctx.stroke();
    }

    // Coordinate tick labels
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.72)' : 'rgba(51, 65, 85, 0.72)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let wx = startX; wx <= maxWorldX; wx += step) {
      const { sx } = worldToScreen(wx, 0, width, height);
      if (sx > 40 && sx < width - 48) {
        ctx.fillText(`X:${wx}`, sx + 4, 8);
      }
    }
    ctx.textBaseline = 'bottom';
    for (let wz = startZ; wz <= maxWorldZ; wz += step) {
      const { sy } = worldToScreen(0, wz, width, height);
      if (sy > 28 && sy < height - 28) {
        ctx.fillText(`Z:${wz}`, 8, sy - 4);
      }
    }

    // Origin badge dot
    if (origin.sx >= -20 && origin.sx <= width + 20 && origin.sy >= -20 && origin.sy <= height + 20) {
      ctx.beginPath();
      ctx.arc(origin.sx, origin.sy, 4, 0, Math.PI * 2);
      ctx.fillStyle = dimConfig.accentHex;
      ctx.fill();
    }

    // 5. Distance Vector Line from Player Position (or Origin) to Selected Waypoint
    const selectedWp = waypoints.find((w) => w.id === selectedWaypointId) ?? null;
    const activePlayer =
      playerPosition && playerPosition.dimension === dimension ? playerPosition : null;

    if (selectedWp && activePlayer) {
      const pScreen = worldToScreen(activePlayer.x, activePlayer.z, width, height);
      const wScreen = worldToScreen(selectedWp.x, selectedWp.z, width, height);

      ctx.save();
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.85)' : 'rgba(2, 132, 199, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(pScreen.sx, pScreen.sy);
      ctx.lineTo(wScreen.sx, wScreen.sy);
      ctx.stroke();
      ctx.restore();

      const dist = calcHorizontalDistance(activePlayer, selectedWp);
      const dir = calcCardinalDirection(activePlayer, selectedWp);
      const sprintPreset =
        MOVEMENT_SPEED_PRESETS.find((p) => p.id === 'sprint') ?? MOVEMENT_SPEED_PRESETS[0];
      const sprintTime = formatDurationJa(
        calcTravelTimeSeconds(dist, sprintPreset.speedBlocksPerSec)
      );
      const midX = (pScreen.sx + wScreen.sx) / 2;
      const midY = (pScreen.sy + wScreen.sy) / 2;
      const distText = `${dist.toLocaleString()}B (${dir.label}) · 走${sprintTime}`;

      ctx.font = '600 11px "JetBrains Mono", "Noto Sans JP", sans-serif';
      const tw = ctx.measureText(distText).width;
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.6)' : 'rgba(2, 132, 199, 0.5)';
      ctx.lineWidth = 1;
      const pillW = tw + 14;
      const pillH = 22;
      ctx.beginPath();
      ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#7dd3fc' : '#0369a1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(distText, midX, midY);
    }

    // 6. Player Position Marker
    if (activePlayer) {
      const pScreen = worldToScreen(activePlayer.x, activePlayer.z, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(pScreen.sx, pScreen.sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pScreen.sx, pScreen.sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px "Plus Jakarta Sans", "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = isDark ? '#e0f2fe' : '#0c4a6e';
      ctx.fillText('Player (現在地)', pScreen.sx, pScreen.sy - 12);
      ctx.restore();
    }

    // 7. Dropped Temporary Pin (tapped empty map coordinate)
    if (droppedPin) {
      const dScreen = worldToScreen(droppedPin.x, droppedPin.z, width, height);
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dScreen.sx, dScreen.sy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(dScreen.sx - 8, dScreen.sy);
      ctx.lineTo(dScreen.sx + 8, dScreen.sy);
      ctx.moveTo(dScreen.sx, dScreen.sy - 8);
      ctx.lineTo(dScreen.sx, dScreen.sy + 8);
      ctx.stroke();
      ctx.restore();
    }

    // 8. Waypoint Pins (draw unselected first, selected last on top)
    const orderedWaypoints = [...waypoints].sort((a, b) => {
      if (a.id === selectedWaypointId) return 1;
      if (b.id === selectedWaypointId) return -1;
      return 0;
    });

    for (const wp of orderedWaypoints) {
      const { sx, sy } = worldToScreen(wp.x, wp.z, width, height);
      if (sx < -60 || sx > width + 60 || sy < -60 || sy > height + 60) continue;

      const isSelected = wp.id === selectedWaypointId;
      const radius = isSelected ? 21 : 17;

      ctx.save();

      // Outer selection ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = wp.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Pin Circle Shadow + Background
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = isSelected ? 12 : 6;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.lineWidth = isSelected ? 3 : 2.2;
      ctx.strokeStyle = wp.color;
      ctx.stroke();

      // Emoji Icon
      ctx.font = `${isSelected ? 20 : 17}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(wp.icon, sx, sy + 1);

      // Label plate beneath pin
      const label = wp.name;
      ctx.font = `${isSelected ? '700' : '600'} 11.5px "Plus Jakarta Sans", "Noto Sans JP", sans-serif`;
      const labelWidth = Math.min(ctx.measureText(label).width, 160);
      const boxW = labelWidth + 12;
      const boxH = 20;
      const boxY = sy + radius + 5;

      ctx.fillStyle = isSelected
        ? wp.color
        : isDark
          ? 'rgba(15, 23, 42, 0.86)'
          : 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = isSelected
        ? wp.color
        : isDark
          ? 'rgba(148, 163, 184, 0.25)'
          : 'rgba(15, 23, 42, 0.12)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(sx - boxW / 2, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? '#ffffff' : isDark ? '#f1f5f9' : '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx, boxY + boxH / 2, 156);

      ctx.restore();
    }

    ctx.restore();
  }, [
    dimension,
    dimConfig,
    droppedPin,
    isDark,
    playerPosition,
    selectedWaypointId,
    showChunkGrid,
    waypoints,
    worldToScreen,
  ]);

  // Redraw when dependencies change or resize occurs
  useEffect(() => {
    let rafId = 0;
    const render = () => {
      drawMap();
    };
    rafId = requestAnimationFrame(render);

    const container = containerRef.current;
    if (!container) return () => cancelAnimationFrame(rafId);

    const syncContainerSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w > 0 && h > 0) {
        setViewportSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };
    syncContainerSize();

    const observer = new ResizeObserver(() => {
      syncContainerSize();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(render);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [drawMap, hudCenter, zoomDisplay]);

  // Pointer & Pinch-Zoom Events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        camX: cameraRef.current.x,
        camZ: cameraRef.current.z,
        moved: false,
      };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
      const rect = canvas.getBoundingClientRect();
      const midX = (pts[0].clientX + pts[1].clientX) / 2 - rect.left;
      const midY = (pts[0].clientY + pts[1].clientY) / 2 - rect.top;
      const worldMid = screenToWorld(midX, midY, rect.width, rect.height);
      pinchRef.current = {
        dist,
        zoom: cameraRef.current.zoom,
        worldX: worldMid.x,
        worldZ: worldMid.z,
      };
      dragStartRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Update hover coordinate on mouse devices
    if (e.pointerType === 'mouse' && pointersRef.current.size === 0) {
      const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
      setHoverCoord({ x: Math.round(w.x), z: Math.round(w.z) });
    }

    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
      if (pinchRef.current.dist > 0) {
        const scale = dist / pinchRef.current.dist;
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchRef.current.zoom * scale));
        const midX = (pts[0].clientX + pts[1].clientX) / 2 - rect.left;
        const midY = (pts[0].clientY + pts[1].clientY) / 2 - rect.top;
        cameraRef.current.zoom = nextZoom;
        cameraRef.current.x = pinchRef.current.worldX - (midX - rect.width / 2) / nextZoom;
        cameraRef.current.z = pinchRef.current.worldZ - (midY - rect.height / 2) / nextZoom;
        syncHudFromCamera();
      }
      return;
    }

    if (pointersRef.current.size === 1 && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      if (Math.hypot(dx, dy) > 6) {
        dragStartRef.current.moved = true;
      }
      cameraRef.current.x = dragStartRef.current.camX - dx / cameraRef.current.zoom;
      cameraRef.current.z = dragStartRef.current.camZ - dy / cameraRef.current.zoom;
      syncHudFromCamera();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    const wasTap =
      pointersRef.current.size === 1 && dragStartRef.current && !dragStartRef.current.moved;

    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }

    if (wasTap && canvas) {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // Hit test waypoints
      let closestId: string | null = null;
      let closestDist = 28; // generous touch hit radius
      for (const wp of waypoints) {
        const pt = worldToScreen(wp.x, wp.z, rect.width, rect.height);
        const dist = Math.hypot(pt.sx - sx, pt.sy - sy);
        if (dist <= closestDist) {
          closestDist = dist;
          closestId = wp.id;
        }
      }

      if (closestId) {
        setDroppedPin(null);
        onSelectWaypoint(closestId);
      } else {
        onSelectWaypoint(null);
        const worldPt = screenToWorld(sx, sy, rect.width, rect.height);
        setDroppedPin({ x: Math.round(worldPt.x), z: Math.round(worldPt.z) });
      }
    }

    if (pointersRef.current.size === 0) {
      dragStartRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldBefore = screenToWorld(sx, sy, rect.width, rect.height);

    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cameraRef.current.zoom * factor));
    cameraRef.current.zoom = nextZoom;
    cameraRef.current.x = worldBefore.x - (sx - rect.width / 2) / nextZoom;
    cameraRef.current.z = worldBefore.z - (sy - rect.height / 2) / nextZoom;
    syncHudFromCamera();
  };

  const zoomBy = (factor: number) => {
    cameraRef.current.zoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, cameraRef.current.zoom * factor)
    );
    syncHudFromCamera();
  };

  const fitAllWaypoints = () => {
    if (waypoints.length === 0) {
      cameraRef.current = { x: 0, z: 0, zoom: 0.65 };
      syncHudFromCamera();
      return;
    }
    if (waypoints.length === 1) {
      cameraRef.current = { x: waypoints[0].x, z: waypoints[0].z, zoom: 0.8 };
      syncHudFromCamera();
      return;
    }
    const container = containerRef.current;
    const w = container?.clientWidth || 600;
    const h = container?.clientHeight || 500;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const wp of waypoints) {
      minX = Math.min(minX, wp.x);
      maxX = Math.max(maxX, wp.x);
      minZ = Math.min(minZ, wp.z);
      maxZ = Math.max(maxZ, wp.z);
    }
    const spanX = Math.max(120, maxX - minX);
    const spanZ = Math.max(120, maxZ - minZ);
    const zoom = Math.max(
      MIN_ZOOM,
      Math.min(2.0, Math.min((w * 0.68) / spanX, (h * 0.68) / spanZ))
    );
    cameraRef.current = {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      zoom,
    };
    syncHudFromCamera();
  };

  const activeCoord = hoverCoord ?? hudCenter;
  const chunkInfo = calcChunkAndRegion(activeCoord.x, activeCoord.z);

  // Minimap geometry & live viewport projection
  const minimapModel = useMemo(() => {
    const MINI_SIZE = 120;
    const pts: Point2D[] = [{ x: 0, z: 0 }];
    for (const wp of waypoints) {
      pts.push({ x: wp.x, z: wp.z });
    }
    if (playerPosition && playerPosition.dimension === dimension) {
      pts.push({ x: playerPosition.x, z: playerPosition.z });
    }

    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }

    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const halfSpan = Math.max(260, Math.max(maxX - minX, maxZ - minZ) * 0.68);
    const scale = MINI_SIZE / (halfSpan * 2);

    const toMini = (wx: number, wz: number) => ({
      mx: MINI_SIZE / 2 + (wx - centerX) * scale,
      my: MINI_SIZE / 2 + (wz - centerZ) * scale,
    });

    const fromMini = (mx: number, my: number) => ({
      wx: centerX + (mx - MINI_SIZE / 2) / scale,
      wz: centerZ + (my - MINI_SIZE / 2) / scale,
    });

    const viewHalfW = viewportSize.width / 2 / zoomDisplay;
    const viewHalfH = viewportSize.height / 2 / zoomDisplay;
    const topLeft = toMini(hudCenter.x - viewHalfW, hudCenter.z - viewHalfH);
    const bottomRight = toMini(hudCenter.x + viewHalfW, hudCenter.z + viewHalfH);

    const vx = topLeft.mx;
    const vy = topLeft.my;
    const vw = Math.max(8, bottomRight.mx - topLeft.mx);
    const vh = Math.max(8, bottomRight.my - topLeft.my);

    const viewCenterMini = toMini(hudCenter.x, hudCenter.z);
    const isViewportOutsideMini =
      viewCenterMini.mx < 0 ||
      viewCenterMini.mx > MINI_SIZE ||
      viewCenterMini.my < 0 ||
      viewCenterMini.my > MINI_SIZE;

    const viewMinX = hudCenter.x - viewHalfW;
    const viewMaxX = hudCenter.x + viewHalfW;
    const viewMinZ = hudCenter.z - viewHalfH;
    const viewMaxZ = hudCenter.z + viewHalfH;
    const isAnyWaypointVisible =
      waypoints.length === 0 ||
      waypoints.some(
        (wp) => wp.x >= viewMinX && wp.x <= viewMaxX && wp.z >= viewMinZ && wp.z <= viewMaxZ
      );

    return {
      size: MINI_SIZE,
      origin: toMini(0, 0),
      toMini,
      fromMini,
      viewportBox: { vx, vy, vw, vh },
      viewCenterClamped: {
        mx: Math.max(6, Math.min(MINI_SIZE - 6, viewCenterMini.mx)),
        my: Math.max(6, Math.min(MINI_SIZE - 6, viewCenterMini.my)),
      },
      isViewportOutsideMini,
      isAnyWaypointVisible,
    };
  }, [waypoints, playerPosition, dimension, viewportSize, zoomDisplay, hudCenter]);

  const jumpToMinimapClientPos = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const mx = ((e.clientX - rect.left) / rect.width) * minimapModel.size;
    const my = ((e.clientY - rect.top) / rect.height) * minimapModel.size;
    const worldPt = minimapModel.fromMini(mx, my);
    cameraRef.current.x = worldPt.wx;
    cameraRef.current.z = worldPt.wz;
    syncHudFromCamera();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden touch-none select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHoverCoord(null)}
        onWheel={handleWheel}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Center Crosshair subtle indicator */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-5 w-5 opacity-30">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-400 dark:bg-slate-500" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-400 dark:bg-slate-500" />
        </div>
      </div>

      {/* Top-Left Live Coordinate & Chunk Telemetry Readout */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/88 dark:bg-slate-900/88 px-3 py-2 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono-tabular">
          <Crosshair className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>X: {activeCoord.x}</span>
          <span className="text-slate-400">·</span>
          <span>Z: {activeCoord.z}</span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
          Chunk ({chunkInfo.chunkX}, {chunkInfo.chunkZ}) · r.{chunkInfo.regionX}.{chunkInfo.regionZ}
        </div>
      </div>

      {/* Top-Right Cluster: Compass + Interactive Minimap + Fit-All Jump Button */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowMinimap((v) => !v)}
            aria-label={showMinimap ? 'ミニマップを隠す' : 'ミニマップを表示'}
            title={showMinimap ? 'ミニマップを折りたたむ' : 'ミニマップを開く'}
            className="flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 px-2.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {showMinimap ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">ミニマップ</span>
          </button>

          <div className="pointer-events-none flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 backdrop-blur-md shadow-sm">
            <span className="text-[10px] font-bold tracking-wider text-rose-500 leading-none">
              N (-Z)
            </span>
            <Compass className="my-0.5 h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          </div>
        </div>

        {showMinimap && (
          <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-700/90 bg-white/92 dark:bg-slate-900/92 p-1 shadow-md backdrop-blur-md">
            <svg
              viewBox={`0 0 ${minimapModel.size} ${minimapModel.size}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                minimapDragRef.current = true;
                jumpToMinimapClientPos(e);
              }}
              onPointerMove={(e) => {
                if (!minimapDragRef.current) return;
                jumpToMinimapClientPos(e);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                minimapDragRef.current = false;
              }}
              onPointerCancel={() => {
                minimapDragRef.current = false;
              }}
              className="h-[96px] w-[96px] sm:h-[132px] sm:w-[132px] cursor-crosshair rounded-lg touch-none"
              style={{
                backgroundColor: isDark ? dimConfig.canvasBgDark : dimConfig.canvasBgLight,
              }}
              aria-label="全体ミニマップ（タップ・ドラッグで移動）"
            >
              {/* Origin Crosshair Axes */}
              <line
                x1={minimapModel.origin.mx}
                y1={0}
                x2={minimapModel.origin.mx}
                y2={minimapModel.size}
                stroke={dimConfig.axisLineColor}
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
              <line
                x1={0}
                y1={minimapModel.origin.my}
                x2={minimapModel.size}
                y2={minimapModel.origin.my}
                stroke={dimConfig.axisLineColor}
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />

              {/* Waypoint Dots */}
              {waypoints.map((wp) => {
                const pt = minimapModel.toMini(wp.x, wp.z);
                const isSel = wp.id === selectedWaypointId;
                return (
                  <g key={wp.id}>
                    {isSel && (
                      <circle
                        cx={pt.mx}
                        cy={pt.my}
                        r={5.5}
                        fill="none"
                        stroke={wp.color}
                        strokeWidth="1.5"
                      />
                    )}
                    <circle
                      cx={pt.mx}
                      cy={pt.my}
                      r={isSel ? 3.4 : 2.6}
                      fill={wp.color}
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                      strokeWidth="0.9"
                    />
                  </g>
                );
              })}

              {/* Player Marker */}
              {playerPosition && playerPosition.dimension === dimension && (
                <circle
                  cx={minimapModel.toMini(playerPosition.x, playerPosition.z).mx}
                  cy={minimapModel.toMini(playerPosition.x, playerPosition.z).my}
                  r={3.2}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              )}

              {/* Live Viewport Bounding Rectangle */}
              {!minimapModel.isViewportOutsideMini ? (
                <rect
                  x={minimapModel.viewportBox.vx}
                  y={minimapModel.viewportBox.vy}
                  width={minimapModel.viewportBox.vw}
                  height={minimapModel.viewportBox.vh}
                  fill="rgba(16, 185, 129, 0.14)"
                  stroke={isDark ? '#34d399' : '#059669'}
                  strokeWidth="1.5"
                  rx="2"
                />
              ) : (
                <circle
                  cx={minimapModel.viewCenterClamped.mx}
                  cy={minimapModel.viewCenterClamped.my}
                  r={4.5}
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              )}
            </svg>
          </div>
        )}

        {/* Prominent Fit-All Jump Button */}
        <button
          type="button"
          onClick={fitAllWaypoints}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-white/92 dark:bg-slate-900/92 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-sm backdrop-blur-md transition hover:bg-emerald-50 dark:hover:bg-emerald-950/50 active:scale-95 whitespace-nowrap"
        >
          <Maximize2 className="h-3.5 w-3.5 shrink-0" />
          <span>全体表示</span>
        </button>
      </div>

      {/* Off-Screen Rescue Jump Prompt when panned away from all waypoints */}
      {!minimapModel.isAnyWaypointVisible && !selectedWaypointId && !droppedPin && (
        <div className="pointer-events-none absolute bottom-4 left-3 right-16 z-20 flex justify-center">
          <button
            type="button"
            onClick={fitAllWaypoints}
            className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/50 bg-white/95 dark:bg-slate-900/95 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 shadow-lg backdrop-blur-md transition hover:bg-amber-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Maximize2 className="h-4 w-4 text-amber-500 shrink-0" />
            <span>登録地点が画面外 · 全体表示へ戻る</span>
          </button>
        </div>
      )}

      {/* Right-Side Map Controls (Zoom, Origin, Chunk Grid) */}
      <div className="absolute right-3 bottom-4 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.45)}
          aria-label="ズームイン"
          title="拡大"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/92 dark:bg-slate-900/92 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.45)}
          aria-label="ズームアウト"
          title="縮小"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/92 dark:bg-slate-900/92 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
        >
          <Minus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            cameraRef.current = { x: 0, z: 0, zoom: 0.65 };
            syncHudFromCamera();
          }}
          aria-label="原点 (0, 0) へ戻る"
          title="原点 (0, 0) へ移動"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white/92 dark:bg-slate-900/92 text-xs font-bold font-mono-tabular text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-md transition hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
        >
          0,0
        </button>
        <button
          type="button"
          onClick={() => setShowChunkGrid((v) => !v)}
          aria-label="チャンクグリッド切替"
          title="16×16チャンク境界の表示切替"
          className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition active:scale-95 ${
            showChunkGrid
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-700 bg-white/92 dark:bg-slate-900/92 text-slate-500 dark:text-slate-400'
          }`}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </div>

      {/* Dropped Empty-Map Pin Action Bar */}
      {droppedPin && !selectedWaypointId && (
        <div className="absolute bottom-4 left-3 right-16 z-20 flex max-w-sm items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-white/95 dark:bg-slate-900/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              地図上の選択座標
            </div>
            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 font-mono-tabular">
              X: {droppedPin.x} · Z: {droppedPin.z}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onQuickAddAtCoord(droppedPin.x, droppedPin.z);
                setDroppedPin(null);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 whitespace-nowrap"
            >
              <MapPinPlus className="h-4 w-4" />
              <span>ここを登録</span>
            </button>
            <button
              type="button"
              onClick={() => setDroppedPin(null)}
              aria-label="選択解除"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
