import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------
// [Supabase 설정]
// ---------------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type ViewState = 'space' | 'transition' | 'ground';

// ---------------------------------------------------------
// [전역 상태 & 캐시]
// ---------------------------------------------------------
const globalPixelsRef = {
  data: new Map<string, string>()
};

const globalCache = {
  earthTex: null as THREE.Texture | null,
};

// ---------------------------------------------------------
// [핵심 엔진] 완벽한 픽셀 정렬을 위한 무결성 격자 시스템
// ---------------------------------------------------------
const GRID_COLS = 500000;

function project(lng: number, lat: number) {
  const x = (lng + 180) / 360;
  let sinLat = Math.sin(lat * Math.PI / 180);
  sinLat = Math.max(Math.min(sinLat, 0.9999), -0.9999);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return { x, y };
}

function unproject(x: number, y: number) {
  const lng = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lng, lat };
}

function getGridCell(lng: number, lat: number) {
  const p = project(lng, lat);
  return { ix: Math.floor(p.x * GRID_COLS), iy: Math.floor(p.y * GRID_COLS) };
}

function getCellCenter(ix: number, iy: number) {
  return unproject((ix + 0.5) / GRID_COLS, (iy + 0.5) / GRID_COLS);
}

// ---------------------------------------------------------
// 0. 로딩 컴포넌트
// ---------------------------------------------------------
const SplashScreen = ({ progress }: { progress: number }) => (
  <div className="absolute inset-0 bg-[#0a0a12] flex flex-col items-center justify-center z-50 transition-opacity duration-1000">
    <div className="text-center">
      <h1 className="text-6xl font-black tracking-tighter text-[#f3f4f6] mb-4 animate-pulse">
        PLANET <span className="text-[#3b82f6]">PLACE</span>
      </h1>
      <p className="text-[#3b82f6] font-mono text-sm tracking-widest mb-8">
        FETCHING PLANET DATA...
      </p>
      <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
        <div className="h-full bg-[#3b82f6] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------
// 1. 3D 지구본 컴포넌트
// ---------------------------------------------------------
const Globe = ({ 
  viewState, 
  setViewState,
  setTargetCoords,
  diveTarget,
  setDiveTarget,
  renderTrigger 
}: { 
  viewState: ViewState, 
  setViewState: (v: ViewState) => void,
  setTargetCoords: (coords: {lng: number, lat: number}) => void,
  diveTarget: THREE.Vector3 | null,
  setDiveTarget: (v: THREE.Vector3 | null) => void,
  renderTrigger: number
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (viewState === 'space') {
      camera.position.set(0, 0, 6);
      camera.lookAt(0, 0, 0);
    }
  }, [viewState, camera]);

  const particlesGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const size = globalPixelsRef.data.size;
    if (size === 0) return geo;

    const positions = new Float32Array(size * 3);
    const colors = new Float32Array(size * 3);
    const tempColor = new THREE.Color();

    let i = 0;
    globalPixelsRef.data.forEach((color, key) => {
      const [ix, iy] = key.split(',').map(Number);
      const { lng, lat } = getCellCenter(ix, iy); 
      
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const r = 2.02;

      positions[i * 3] = -(r * Math.sin(phi) * Math.cos(theta));
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      tempColor.set(color);
      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
      i++;
    });

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [renderTrigger]);

  useFrame((_, delta) => {
    if (viewState === 'space' && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
    
    if (viewState === 'transition' && diveTarget) {
      const targetPos = diveTarget.clone().normalize().multiplyScalar(2.15); 
      camera.position.lerp(targetPos, 0.1);
      camera.lookAt(0, 0, 0); 
      
      if (camera.position.distanceTo(targetPos) < 0.05) {
        setViewState('ground');
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta <= 2 && viewState === 'space') {
      const pt = e.point.clone();
      setDiveTarget(pt);

      if (groupRef.current) {
        const localPt = groupRef.current.worldToLocal(pt.clone()).normalize();
        const phi = Math.acos(localPt.y);
        const lat = 90 - (phi * 180 / Math.PI);
        
        const theta = Math.atan2(localPt.z, -localPt.x);
        let lng = (theta * 180 / Math.PI) - 180;
        
        while (lng < -180) lng += 360;
        while (lng > 180) lng -= 360;
        
        setTargetCoords({ lng, lat });
      }
      setViewState('transition');
    }
  };

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial 
          map={globalCache.earthTex || undefined}
          color={globalCache.earthTex ? "#ffffff" : "#050510"} 
          roughness={0.6} 
          metalness={0.1} 
        />
      </mesh>
      
      {globalPixelsRef.data.size > 0 && (
        <points geometry={particlesGeometry}>
          <pointsMaterial size={0.005} vertexColors transparent opacity={0.9} sizeAttenuation={true} />
        </points>
      )}
    </group>
  );
};

// ---------------------------------------------------------
// 2. 자체 구축 Native Canvas 지도 엔진
// ---------------------------------------------------------
const tileCache = new Map<string, HTMLImageElement>();
const getTile = (z: number, x: number, y: number) => {
  const key = `${z}/${x}/${y}`;
  if (tileCache.has(key)) return tileCache.get(key);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
  tileCache.set(key, img);
  return img;
};

const GroundView = ({ 
  onReturn, 
  initialCoords,
  onLocalUpdate
}: { 
  onReturn: () => void, 
  initialCoords: { lng: number, lat: number },
  onLocalUpdate: () => void
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coordRef = useRef<HTMLDivElement>(null); 
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // [복구 완료] 타겟 고정 상태
  const [hasTarget, setHasTarget] = useState(false);
  
  const TILE_SIZE = 256;

  const stateRef = useRef({
    lng: initialCoords.lng, 
    lat: initialCoords.lat, 
    zoom: 13, 
    isDragging: false, 
    dragStartX: 0, 
    dragStartY: 0, 
    cameraStartProj: { x: 0, y: 0 },
    isMoved: false,
    hoverPixel: null as { ix: number, iy: number } | null,
    targetPixel: null as { ix: number, iy: number } | null, // 사용자가 클릭하여 확정한 픽셀
    previewPixels: null as { dx: number, dy: number, color: string }[] | null
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.fillStyle = '#e8f0f6';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const { lng, lat, zoom, hoverPixel, targetPixel, previewPixels } = stateRef.current;
      const scale = Math.pow(2, zoom);
      const worldSize = TILE_SIZE * scale;

      const centerProj = project(lng, lat);
      const centerX = centerProj.x * worldSize;
      const centerY = centerProj.y * worldSize;

      const startX = centerX - rect.width / 2;
      const startY = centerY - rect.height / 2;

      // 1. 실제 지도 타일 그리기
      const z = Math.floor(zoom);
      const tileScale = Math.pow(2, zoom - z);
      const actualTileSize = TILE_SIZE * tileScale;

      const startCol = Math.floor(startX / actualTileSize);
      const endCol = Math.floor((startX + rect.width) / actualTileSize);
      const startRow = Math.floor(startY / actualTileSize);
      const endRow = Math.floor((startY + rect.height) / actualTileSize);
      const maxTile = Math.pow(2, z);

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          if (row < 0 || row >= maxTile) continue;
          const wrappedCol = ((col % maxTile) + maxTile) % maxTile;
          const img = getTile(z, wrappedCol, row);
          if (img && img.complete) {
            const drawX = col * actualTileSize - startX;
            const drawY = row * actualTileSize - startY;
            ctx.drawImage(img, Math.floor(drawX), Math.floor(drawY), Math.ceil(actualTileSize) + 1, Math.ceil(actualTileSize) + 1);
          }
        }
      }

      // 2. 그려진 픽셀 렌더링
      const cellSize = (1 / GRID_COLS) * worldSize;
      const startProjX = startX / worldSize;
      const endProjX = (startX + rect.width) / worldSize;
      const startProjY = startY / worldSize;
      const endProjY = (startY + rect.height) / worldSize;

      const startIx = Math.floor(startProjX * GRID_COLS);
      const endIx = Math.floor(endProjX * GRID_COLS);
      const startIy = Math.floor(startProjY * GRID_COLS);
      const endIy = Math.floor(endProjY * GRID_COLS);

      globalPixelsRef.data.forEach((color, key) => {
        const [ix, iy] = key.split(',').map(Number);
        
        if (ix >= startIx && ix <= endIx && iy >= startIy && iy <= endIy) {
          const drawX = (ix / GRID_COLS) * worldSize - startX;
          const drawY = (iy / GRID_COLS) * worldSize - startY;
          ctx.fillStyle = color;
          ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(cellSize) + 0.5, Math.ceil(cellSize) + 0.5);
        }
      });

      // --- UI 렌더링 도우미 함수 ---
      const renderPreviewUI = (ix: number, iy: number, alpha: number, showGuide: boolean) => {
        ctx.globalAlpha = alpha;
        previewPixels?.forEach(p => {
          const pIx = ix + p.dx;
          const pIy = iy + p.dy;
          const drawX = Math.floor((pIx / GRID_COLS) * worldSize - startX);
          const drawY = Math.floor((pIy / GRID_COLS) * worldSize - startY);
          ctx.fillStyle = p.color;
          ctx.fillRect(drawX, drawY, Math.ceil(cellSize) + 0.5, Math.ceil(cellSize) + 0.5);
        });
        ctx.globalAlpha = 1.0;

        if (showGuide) {
          const minDx = -16;
          const drawX = Math.floor(((ix + minDx) / GRID_COLS) * worldSize - startX);
          const drawY = Math.floor(((iy + minDx) / GRID_COLS) * worldSize - startY);
          const drawSize = Math.ceil(cellSize * 32);
          
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
          ctx.strokeRect(drawX, drawY, drawSize, drawSize);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(0, 0, 0, 0.8)`;
          ctx.strokeRect(drawX - 1, drawY - 1, drawSize + 2, drawSize + 2);
        }
      };

      const renderSingleUI = (ix: number, iy: number, alpha: number, isTarget: boolean) => {
        const drawX = Math.floor((ix / GRID_COLS) * worldSize - startX);
        const drawY = Math.floor((iy / GRID_COLS) * worldSize - startY);
        const drawSize = Math.ceil(cellSize);

        ctx.fillStyle = selectedColor;
        ctx.globalAlpha = alpha;
        ctx.fillRect(drawX, drawY, drawSize, drawSize);
        ctx.globalAlpha = 1.0;

        const borderAlpha = isTarget ? (0.7 + 0.3 * Math.abs(Math.sin(Date.now() / 200))) : 0.4;
        ctx.lineWidth = isTarget ? 2 : 1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${borderAlpha})`;
        ctx.strokeRect(drawX, drawY, drawSize, drawSize);
        
        if (isTarget) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(0, 0, 0, ${borderAlpha})`;
          ctx.strokeRect(drawX - 1, drawY - 1, drawSize + 2, drawSize + 2);
        }
      };

      // 3. 클릭해서 고정된 타겟(Target) 렌더링
      if (targetPixel) {
        if (isPreviewMode) renderPreviewUI(targetPixel.ix, targetPixel.iy, 0.9, true);
        else renderSingleUI(targetPixel.ix, targetPixel.iy, 0.8, true);
      }

      // 4. 움직이는 마우스 Hover 렌더링 (Target과 겹치지 않을 때만)
      if (hoverPixel && (!targetPixel || hoverPixel.ix !== targetPixel.ix || hoverPixel.iy !== targetPixel.iy)) {
        if (isPreviewMode) renderPreviewUI(hoverPixel.ix, hoverPixel.iy, 0.4, false);
        else renderSingleUI(hoverPixel.ix, hoverPixel.iy, 0.4, false);
      }

      // 5. 허공 조준점 (Hover도 없고 Target도 없을 때)
      if (!hoverPixel && !targetPixel) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rect.width / 2 - 10, rect.height / 2);
        ctx.lineTo(rect.width / 2 + 10, rect.height / 2);
        ctx.moveTo(rect.width / 2, rect.height / 2 - 10);
        ctx.lineTo(rect.width / 2, rect.height / 2 + 10);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedColor, isPreviewMode]);

  // --- 이벤트 핸들러 ---
  const updateHoverPixel = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { lng, lat, zoom } = stateRef.current;
    
    const worldSize = TILE_SIZE * Math.pow(2, zoom);
    const startX = project(lng, lat).x * worldSize - rect.width / 2;
    const startY = project(lng, lat).y * worldSize - rect.height / 2;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mouseProjX = (startX + mouseX) / worldSize;
    const mouseProjY = (startY + mouseY) / worldSize;
    const mouseLngLat = unproject(mouseProjX, mouseProjY);
    
    if (coordRef.current) {
      coordRef.current.innerText = `Lng: ${mouseLngLat.lng.toFixed(4)} | Lat: ${mouseLngLat.lat.toFixed(4)}`;
    }

    const targetCell = getGridCell(mouseLngLat.lng, mouseLngLat.lat);
    stateRef.current.hoverPixel = { ix: targetCell.ix, iy: targetCell.iy };

    return { mouseX, mouseY, worldSize };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isUploading) return;
    stateRef.current.isDragging = true;
    stateRef.current.isMoved = false;
    stateRef.current.dragStartX = e.clientX;
    stateRef.current.dragStartY = e.clientY;
    stateRef.current.cameraStartProj = project(stateRef.current.lng, stateRef.current.lat);
    canvasRef.current?.setPointerCapture(e.pointerId);
    updateHoverPixel(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const coords = updateHoverPixel(e);
    if (!coords) return;

    if (stateRef.current.isDragging) {
      const dx = coords.mouseX - stateRef.current.dragStartX;
      const dy = coords.mouseY - stateRef.current.dragStartY;
      
      if (Math.hypot(dx, dy) > 3) stateRef.current.isMoved = true;

      if (stateRef.current.isMoved) {
        const newCenterX = stateRef.current.cameraStartProj.x * coords.worldSize - dx;
        const newCenterY = stateRef.current.cameraStartProj.y * coords.worldSize - dy;
        const newCenter = unproject(newCenterX / coords.worldSize, newCenterY / coords.worldSize);
        stateRef.current.lng = newCenter.lng;
        stateRef.current.lat = newCenter.lat;
      }
    }
  };

  // [수정됨] 마우스를 떼었을 때(클릭) 해당 격자를 Target으로 고정
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isUploading) return;
    stateRef.current.isDragging = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);

    if (!stateRef.current.isMoved && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const { lng, lat, zoom } = stateRef.current;
      const worldSize = TILE_SIZE * Math.pow(2, zoom);
      
      const startX = project(lng, lat).x * worldSize - rect.width / 2;
      const startY = project(lng, lat).y * worldSize - rect.height / 2;
      const mouseProjX = (startX + e.clientX - rect.left) / worldSize;
      const mouseProjY = (startY + e.clientY - rect.top) / worldSize;
      
      const clickLngLat = unproject(mouseProjX, mouseProjY);
      const targetCell = getGridCell(clickLngLat.lng, clickLngLat.lat);

      stateRef.current.targetPixel = { ix: targetCell.ix, iy: targetCell.iy };
      setHasTarget(true); // 타겟팅 UI 활성화
    }
  };

  const handlePointerLeave = () => {
    stateRef.current.hoverPixel = null;
    stateRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const zoomDelta = e.deltaY * -0.002;
    let newZoom = stateRef.current.zoom + zoomDelta;

    if (newZoom <= 3) {
      stateRef.current.hoverPixel = null;
      stateRef.current.targetPixel = null; // 오토 리턴 시 타겟 해제
      setHasTarget(false);
      onReturn();
      return;
    }
    
    // 줌 시에도 위치 고정이 바뀌므로 사용자 편의상 타겟은 유지하되, 필요시 지워도 됨. (여기서는 유지)
    newZoom = Math.max(3, Math.min(newZoom, 19)); 

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const oldScale = Math.pow(2, stateRef.current.zoom);
    const oldWorldSize = TILE_SIZE * oldScale;
    const oldCenterProj = project(stateRef.current.lng, stateRef.current.lat);
    
    const mouseProjX = oldCenterProj.x + (mouseX - rect.width / 2) / oldWorldSize;
    const mouseProjY = oldCenterProj.y + (mouseY - rect.height / 2) / oldWorldSize;
    
    const newScale = Math.pow(2, newZoom);
    const newWorldSize = TILE_SIZE * newScale;
    
    const newCenterProjX = mouseProjX - (mouseX - rect.width / 2) / newWorldSize;
    const newCenterProjY = mouseProjY - (mouseY - rect.height / 2) / newWorldSize;
    
    const newCenter = unproject(newCenterProjX, newCenterProjY);
    stateRef.current.lng = newCenter.lng;
    stateRef.current.lat = newCenter.lat;
    stateRef.current.zoom = newZoom;
  };

  // --- 버튼 액션 핸들러 ---
  const handlePaint = () => {
    if (!stateRef.current.targetPixel) return;
    const { ix, iy } = stateRef.current.targetPixel;
    
    if (isPreviewMode && stateRef.current.previewPixels) {
      const newPixels: { x: number, y: number, color: string }[] = [];
      
      stateRef.current.previewPixels.forEach(p => {
        const pIx = ix + p.dx;
        const pIy = iy + p.dy;
        const key = `${pIx},${pIy}`;
        const center = getCellCenter(pIx, pIy);
        
        globalPixelsRef.data.set(key, p.color);
        newPixels.push({ x: Number(center.lng.toFixed(5)), y: Number(center.lat.toFixed(5)), color: p.color });
      });

      const uploadChunks = async () => {
        setIsUploading(true);
        const chunkSize = 500;
        for (let i = 0; i < newPixels.length; i += chunkSize) {
          const chunk = newPixels.slice(i, i + chunkSize);
          await supabase.from('pixels').upsert(chunk);
        }
        setIsUploading(false);
        setIsPreviewMode(false);
        stateRef.current.previewPixels = null;
        stateRef.current.targetPixel = null;
        setHasTarget(false);
      };
      uploadChunks();
      onLocalUpdate();

    } else {
      const key = `${ix},${iy}`;
      globalPixelsRef.data.set(key, selectedColor);
      
      const center = getCellCenter(ix, iy);
      supabase.from('pixels').upsert({ 
        x: Number(center.lng.toFixed(5)), 
        y: Number(center.lat.toFixed(5)), 
        color: selectedColor 
      }).then();
      
      onLocalUpdate();
      stateRef.current.targetPixel = null;
      setHasTarget(false);
    }
  };

  const handleCancelTarget = () => {
    stateRef.current.targetPixel = null;
    setHasTarget(false);
  };

  const handleCancelPreview = () => {
    setIsPreviewMode(false);
    stateRef.current.previewPixels = null;
    stateRef.current.targetPixel = null;
    setHasTarget(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canvasRef.current) return;

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const size = 32;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = size;
        tempCanvas.height = size;
        const oCtx = tempCanvas.getContext('2d');
        if (!oCtx) return;

        oCtx.drawImage(img, 0, 0, size, size);
        const imageData = oCtx.getImageData(0, 0, size, size).data;

        const newPreview: { dx: number, dy: number, color: string }[] = [];

        for (let py = 0; py < size; py++) {
          for (let px = 0; px < size; px++) {
            const i = (py * size + px) * 4;
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            const a = imageData[i + 3];

            if (a > 128) {
              const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              const dx = px - Math.floor(size / 2);
              const dy = py - Math.floor(size / 2);
              newPreview.push({ dx, dy, color: hex });
            }
          }
        }
        
        stateRef.current.previewPixels = newPreview;
        setIsPreviewMode(true);
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#c084fc', '#ffffff', '#000000'];

  return (
    <div className="absolute inset-0 bg-[#e8f0f6] animate-in fade-in duration-500 z-10">
      <canvas
        ref={canvasRef}
        className={`w-full h-full touch-none ${isUploading ? 'cursor-wait' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />
      
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />

      {/* 우측 하단 위경도 표시 */}
      <div ref={coordRef} className="absolute bottom-6 right-6 font-mono text-xs text-[#050510] bg-white/80 px-3 py-1.5 rounded-md border border-gray-300 backdrop-blur-sm pointer-events-none z-20 shadow-sm">
        Lng: 0 | Lat: 0
      </div>

      {/* [수정됨] 상단 기능 버튼 모음 (UI 겹침 완전 차단) */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-20">
        <button
          onClick={() => {
            stateRef.current.targetPixel = null;
            setHasTarget(false);
            onReturn();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="px-6 py-2 bg-white/90 border border-gray-300 text-gray-800 hover:bg-gray-100 transition-colors rounded-full backdrop-blur-sm shadow-md font-bold text-sm"
        >
          ← 우주로 돌아가기
        </button>

        {!isPreviewMode && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            onPointerDown={(e) => e.stopPropagation()} 
            className="px-4 py-2 bg-white/90 border border-gray-300 text-gray-700 rounded-full backdrop-blur-md hover:bg-gray-100 transition-all text-xs font-bold disabled:opacity-50 shadow-md"
          >
            {isUploading ? "변환 중..." : "📸 32x32 사진 변환"}
          </button>
        )}
      </div>

      {/* [수정됨] 하단 팔레트 및 타겟 확정(칠하기) 버튼 영역 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20 pointer-events-none">
        
        {/* 모드별 타겟 확정 버튼 (클릭해서 타겟이 잡혔을 때만 나타남) */}
        {hasTarget && (
          <div className="transition-all duration-300 pointer-events-auto flex gap-3 animate-in slide-in-from-bottom-2">
            {!isPreviewMode ? (
              <>
                <button
                  onClick={handlePaint}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-black tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 hover:bg-red-600 transition-all border border-red-400/50"
                >
                  🎨 칠하기 (PLACE)
                </button>
                <button
                  onClick={handleCancelTarget}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-6 py-3 bg-gray-700 text-white rounded-full font-bold shadow-lg hover:scale-105 hover:bg-gray-800 transition-all"
                >
                  ❌ 취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePaint}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-8 py-3 bg-blue-500 text-white rounded-full font-black shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:scale-105 hover:bg-blue-600 transition-all"
                >
                  ✅ 사진 배치 확정
                </button>
                <button
                  onClick={handleCancelPreview}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="px-6 py-3 bg-gray-700 text-white rounded-full font-bold shadow-lg hover:scale-105 hover:bg-gray-800 transition-all"
                >
                  ❌ 취소
                </button>
              </>
            )}
          </div>
        )}

        {/* 하단 색상 팔레트 (사진 모드일 때는 숨김 처리하여 화면 공간 확보) */}
        {!isPreviewMode && (
          <div className="flex gap-2 bg-white/90 p-3 rounded-2xl backdrop-blur-sm border border-gray-200 shadow-xl pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setSelectedColor(c)}
                className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${selectedColor === c ? 'border-4 border-gray-400 scale-110 shadow-md' : 'border border-gray-200'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

// ---------------------------------------------------------
// 3. 메인 App 컴포넌트 
// ---------------------------------------------------------
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [viewState, setViewState] = useState<ViewState>('space');
  const [targetCoords, setTargetCoords] = useState({ lng: 0, lat: 0 });
  const [diveTarget, setDiveTarget] = useState<THREE.Vector3 | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0); 

  const fetchGlobalData = async () => {
    let start = 0;
    const step = 1000;
    globalPixelsRef.data.clear(); 

    const imgUrl = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
    
    await new Promise<void>((resolve) => {
      if (globalCache.earthTex) {
        resolve();
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgUrl;
        img.onload = () => {
          const tex = new THREE.Texture(img);
          tex.needsUpdate = true;
          tex.colorSpace = THREE.SRGBColorSpace;
          globalCache.earthTex = tex;
          resolve();
        };
        img.onerror = () => resolve(); 
      }
    });

    while (true) {
      const { data, error } = await supabase
        .from('pixels')
        .select('x, y, color')
        .range(start, start + step - 1);
        
      if (error || !data || data.length === 0) break;
      
      data.forEach(p => {
        const cell = getGridCell(p.x, p.y);
        globalPixelsRef.data.set(`${cell.ix},${cell.iy}`, p.color);
      });
      setLoadingProgress((prev) => Math.min(prev + 10, 95)); 
      
      if (data.length < step) break;
      start += step;
    }
    
    setLoadingProgress(100);
    setTimeout(() => setIsReady(true), 500);
    setRenderTrigger(prev => prev + 1); 
  };

  useEffect(() => {
    if (viewState === 'space') {
      setLoadingProgress(0);
      fetchGlobalData();
    }
  }, [viewState]);

  return (
    <div className="relative w-full h-full bg-[#0a0a12] overflow-hidden">
      
      {!isReady && <SplashScreen progress={loadingProgress} />}

      {isReady && (
        <>
          {(viewState === 'space' || viewState === 'transition') && (
            <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
              <ambientLight intensity={1.5} /> 
              <pointLight position={[10, 10, 10]} intensity={3} color="#ffffff" />
              <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
              
              <Globe 
                viewState={viewState} 
                setViewState={setViewState} 
                setTargetCoords={setTargetCoords}
                diveTarget={diveTarget}
                setDiveTarget={setDiveTarget}
                renderTrigger={renderTrigger}
              />
              
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI - Math.PI / 4}
                enabled={viewState === 'space'} 
              />
            </Canvas>
          )}

          {viewState === 'ground' && (
            <GroundView 
              onReturn={() => setViewState('space')} 
              initialCoords={targetCoords}
              onLocalUpdate={() => setRenderTrigger(prev => prev + 1)}
            />
          )}

          <div className="absolute top-6 left-6 text-white font-sans pointer-events-none z-20">
            <h1 className="text-3xl font-bold tracking-tighter text-[#3b82f6] drop-shadow-md">
              PLANET <span className="text-white">PLACE</span>
            </h1>
            <p className="text-sm text-gray-300 mt-1 font-medium">MVP Final : Perfect Target UI Layout</p>
          </div>
        </>
      )}
    </div>
  );
}