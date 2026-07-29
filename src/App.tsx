import { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Image as ImageIcon, Video, Share2, RotateCcw, 
  Settings, RefreshCw, Move, Sparkles, EyeOff, 
  Eye, Library, Download, Menu,
  LogOut, Sun, Moon, Save, AlertTriangle, Edit2, Lock, ShoppingCart, Search,
  Wand2, Zap
} from 'lucide-react';
import LandingPage from './pages/LandingPage';
import { supabase } from './lib/supabase';

// @ts-ignore
import earthSeedCsvUrl from './assets/earth_seed.csv?url';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 3D Globe Constants ---
const GLOBE_RADIUS = 12; 
const MAP_WIDTH = 600;
const MAP_HEIGHT = 300;
const GRID_SCALE = 80;
const VOXEL_SIZE = GLOBE_RADIUS / GRID_SCALE;

// 32 Basic Colors (기본 제공) - 톤 앤 매너 정렬
export const BASIC_PALETTE = [
  '#000000', '#262626', '#595959', '#A6A6A6', '#FFFFFF',
  '#2A1710', '#633820', '#9E5B32', '#D99B6A', '#F7C59F',
  '#7A001E', '#E60033', '#FF5A52', '#FF7B00', '#FFB700', '#FFE600',
  '#0B3C1B', '#1C8A43', '#39FF14', '#A3E000',
  '#001A4D', '#0044FF', '#3B9EFF', '#9CE3FF', '#004D47', '#00F0FF',
  '#2E004F', '#8B00FF', '#C275FF', '#E6007A', '#FF69B4', '#FFC0CB'
];

// Theme & Country Packs (결제 해금용 팩) - 컨셉 서사 순서 & 중복 0%
export const THEME_PACKS = [
  // --- 감성 테마 팩 ---
  { name: "Abyssal Ocean Trench", type: "theme", colors: ['#000B1E', '#001E3D', '#00F5D4', '#054A29', '#FF6F59', '#E8F1F2', '#FF88D1', '#B2F7EF'] },
  { name: "Y2K Matcha & Berry", type: "theme", colors: ['#FFB8C6', '#B5E2FA', '#C7F9CC', '#FFF1C5', '#E2C2FF', '#D8B4E2', '#FFD1B3', '#8C6D62'] },
  { name: "Martian Terraforma", type: "theme", colors: ['#8B0000', '#C1440E', '#D2691E', '#4A0E00', '#4D7C0F', '#0284C7', '#EAB308', '#E0F2FE'] },
  { name: "Cyberpunk City Lights", type: "theme", colors: ['#CCFF01', '#FF0055', '#00FFC8', '#3A0066', '#FFEE00', '#FF4466', '#00FF41', '#00E5FF'] },
  { name: "Vaporwave Sunset", type: "theme", colors: ['#8A2BE2', '#FF007F', '#2E004E', '#FF7518', '#FFD701', '#00FFFF', '#FFB6C1', '#4B0081'] },
  { name: "8-Bit Retro Arcade", type: "theme", colors: ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F', '#00FF67', '#E60000', '#0033CC', '#808080'] },
  { name: "Deep Space Nebula", type: "theme", colors: ['#4B0082', '#0B0033', '#F0F8FF', '#FF1493', '#FF8C00', '#00CED1', '#05050D', '#C71585'] },
  { name: "Toxic Slime Glow", type: "theme", colors: ['#39FF15', '#CCFF00', '#A3E001', '#00FF66', '#2E4600', '#FF5500', '#9900FF', '#0A1F0A'] },
  { name: "Nordic Aurora Borealis", type: "theme", colors: ['#00FFA3', '#00B37E', '#00C8FF', '#E0F7FA', '#0F2027', '#2C3E50', '#0B132B', '#7B2CBF'] },
  { name: "Desert Oasis Gold", type: "theme", colors: ['#D4AF37', '#EDC9AF', '#C86432', '#00A896', '#5C4033', '#F4A261', '#028090', '#B22222'] },
  { name: "Enchanted Blossom Forest", type: "theme", colors: ['#FFB6C4', '#4A7C59', '#9B5DE5', '#3D262B', '#A8DADC', '#E63946', '#FFD166', '#1D3557'] },
  { name: "Volcanic Magma Core", type: "theme", colors: ['#FF0000', '#FF4500', '#FFA500', '#121212', '#3A3A3A', '#555555', '#E6FF00', '#2B1B17'] },
  
  // --- 국가 팩 (주요 국기색 먼저 등장 후 상징색 배치, White/Black 완벽 분리) ---
  { name: "South Korea", type: "country", colors: ['#CD2E3A', '#0047A0', '#111111', '#FDFDFD', '#007A33', '#E05A2B', '#FF8DA1', '#D4AF38'] },
  { name: "USA", type: "country", colors: ['#B22234', '#3C3B6E', '#F4F6F8', '#81D8D0', '#006A4E', '#8B4514', '#DAA520', '#F04A00'] },
  { name: "Japan", type: "country", colors: ['#BC002D', '#FFFAFA', '#FFC1CC', '#1D2A44', '#2D4739', '#A100FF', '#E60034', '#7BA05B'] },
  { name: "United Kingdom", type: "country", colors: ['#00247D', '#CC0000', '#F0F0F0', '#FFD702', '#E32636', '#1A3B2B', '#6B5B45', '#8B5A2B'] },
  { name: "France", type: "country", colors: ['#002395', '#ED2939', '#F8F9FA', '#E6E6FA', '#007FFF', '#F7E7CE', '#722F37', '#B0C4DE'] },
  { name: "Germany", type: "country", colors: ['#1A1A1C', '#DD0000', '#FFCC00', '#0B3B17', '#1C3B5E', '#0080FF', '#D97707', '#4A5568'] },
  { name: "Brazil", type: "country", colors: ['#009B3A', '#FEDF00', '#002776', '#FCFCFC', '#8A2BE3', '#FF6F00', '#4A2E12', '#F3E5AB'] },
  { name: "Italy", type: "country", colors: ['#009246', '#F9F6F0', '#CE2B37', '#00A897', '#CC7722', '#E5A93D', '#C41E3A', '#556B2F'] },
  { name: "Canada", type: "country", colors: ['#FE0000', '#FDFEFE', '#1E4620', '#A5F2F3', '#5A6B7C', '#E5A93E', '#D97708', '#00FF99'] },
  { name: "Australia", type: "country", colors: ['#003366', '#B83A24', '#FEFDFD', '#00A8A8', '#5B8C5A', '#FFCD00', '#F4D03F', '#8B261C'] },
  { name: "Spain", type: "country", colors: ['#AA152F', '#F1BF00', '#D4AF39', '#008080', '#1A1A1A', '#9B111E', '#0055A5', '#808000'] },
  { name: "India", type: "country", colors: ['#FF9933', '#000080', '#138808', '#FFFDF9', '#FF69B5', '#E5A93F', '#8B4515', '#008081'] },
  { name: "China", type: "country", colors: ['#EE1C25', '#FFDE00', '#00A86B', '#1B4D89', '#C8102E', '#C45B28', '#E07A5F', '#0F1115'] },
  { name: "Mexico", type: "country", colors: ['#006847', '#F4F5F4', '#CE1126', '#00A3A6', '#FF9900', '#4B6B38', '#A0522D', '#800080'] },
  { name: "Argentina", type: "country", colors: ['#74ACDF', '#F6B40E', '#FAFAFA', '#4F772D', '#A61C1C', '#B0E0E6', '#8B5A2B', '#C0C0C0'] }
];

interface PixelData {
  x: number;
  y: number;
  color: string;
}

// ==========================================
// Custom Stars Component 
// ==========================================
function CustomStars({ darkMode }: { darkMode: boolean }) {
  const count = 4000;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 50; 
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={darkMode ? "#ffffff" : "#222222"} size={0.6} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

// ==========================================
// 🚀 [초고압축 캡처기] 128x128 WebP Base64로 추출
// ==========================================
function ThumbnailCapturer({ captureTrigger, onCaptured }: { captureTrigger: number, onCaptured: (base64: string | null) => void }) {
  const { gl, scene, camera } = useThree();
  const onCapturedRef = useRef(onCaptured);

  useEffect(() => {
    onCapturedRef.current = onCaptured;
  }, [onCaptured]);

  useEffect(() => {
    if (captureTrigger > 0) {
      const prevPos = camera.position.clone();
      const prevRot = camera.rotation.clone();

      camera.position.set(0, 0, 50);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/jpeg', 1.0);

      camera.position.copy(prevPos);
      camera.rotation.copy(prevRot);
      camera.updateProjectionMatrix();
      gl.render(scene, camera);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 128, 128);
          const tinyBase64 = canvas.toDataURL('image/webp', 0.8);
          onCapturedRef.current(tinyBase64);
        } else {
          onCapturedRef.current(null);
        }
      };
      img.src = dataUrl;
    }
  }, [captureTrigger, gl, scene, camera]);

  return null;
}

// ==========================================
// 1. 3D Voxel Globe Component 
// ==========================================
interface VoxelGlobeProps {
  selectedColor: string;
  targetIds: Set<number>;
  setTargetIds: (ids: Set<number>) => void;
  paintTrigger: number;
  autoRotate: boolean;
  basePixels: PixelData[];
  serverDataMap: Record<number, string>;
  unsavedPixels: Record<number, string>;
  setUnsavedPixels: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  resetTrigger?: number;
}

function VoxelGlobe({ selectedColor, targetIds, setTargetIds, paintTrigger, autoRotate, basePixels, serverDataMap, unsavedPixels, setUnsavedPixels }: VoxelGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const targetInstancedRef = useRef<THREE.InstancedMesh>(null);
  const lastClickedId = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // AABB 레이마칭용 메모리 할당 (가비지 컬렉션 렉 방지)
  const mathBox = useMemo(() => new THREE.Box3(), []);
  const mathMin = useMemo(() => new THREE.Vector3(), []);
  const mathMax = useMemo(() => new THREE.Vector3(), []);
  const mathIntersect = useMemo(() => new THREE.Vector3(), []);
  
  const get3DPos = useCallback((x: number, y: number) => {
    const u = (x + 0.5) / MAP_WIDTH;
    const v = 1 - (y + 0.5) / MAP_HEIGHT;
    const theta = u * Math.PI * 2;
    const phi = (1 - v) * Math.PI;

    const px = -GLOBE_RADIUS * Math.cos(theta) * Math.sin(phi);
    const py = GLOBE_RADIUS * Math.cos(phi);
    const pz = GLOBE_RADIUS * Math.sin(theta) * Math.sin(phi);
    
    const snapX = Math.round(px / VOXEL_SIZE) * VOXEL_SIZE;
    const snapY = Math.round(py / VOXEL_SIZE) * VOXEL_SIZE;
    const snapZ = Math.round(pz / VOXEL_SIZE) * VOXEL_SIZE;

    return new THREE.Vector3(snapX, snapY, snapZ);
  }, []); 

  // 1. 숨겨진 픽셀(중복 겹침)들을 하나의 유일한 3D 박스로 병합하는 Canonical Map
  const { renderMap, idToCanonical } = useMemo(() => {
    const map = new Map<string, { pos: THREE.Vector3, color: string, id: number }>();
    const idMap = new Map<number, number>();

    if (basePixels.length === 0) return { renderMap: map, idToCanonical: idMap };

    // 1단계: 지구본 베이스(파란 바다) 렌더링 및 3D 스냅핑
    for (let id = 0; id < MAP_WIDTH * MAP_HEIGHT; id++) {
      const x = id % MAP_WIDTH;
      const y = Math.floor(id / MAP_WIDTH);
      const pos = get3DPos(x, y);
      const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;

      if (!map.has(key)) {
        map.set(key, { pos, color: '#0E336B', id: id }); // 최초 발견된 ID를 대표(Canonical) ID로 지정
      }
      idMap.set(id, map.get(key)!.id); // 겹치는 모든 ID들은 대표 ID를 바라보게 함
    }

    // 2단계: 육지 데이터(CSV) 덮어쓰기
    basePixels.forEach(p => {
      const pos = get3DPos(p.x, p.y);
      const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;
      if (map.has(key)) {
        map.get(key)!.color = p.color;
      }
    });

    return { renderMap: map, idToCanonical: idMap };
  }, [basePixels, get3DPos]);

  useLayoutEffect(() => {
    if (!meshRef.current || renderMap.size === 0) return;
    
    // 원본 데이터를 훼손하지 않기 위해 깊은 복사 진행
    const finalMap = new Map();
    renderMap.forEach((val, key) => {
        finalMap.set(key, { ...val });
    });

    const applyOverrides = (pixels: Record<number, string>) => {
       Object.entries(pixels).forEach(([idStr, color]) => {
          const id = parseInt(idStr, 10);
          const canonicalId = idToCanonical.get(id) ?? id; // 칠해진 픽셀도 반드시 대표 ID로 변환
          const x = canonicalId % MAP_WIDTH;
          const y = Math.floor(canonicalId / MAP_WIDTH);
          const pos = get3DPos(x, y);
          const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;
          
          if (finalMap.has(key)) {
            finalMap.get(key)!.color = color;
          } else {
            finalMap.set(key, { pos, color, id: canonicalId });
          }
       });
    };

    applyOverrides(serverDataMap); 
    applyOverrides(unsavedPixels); 

    let i = 0;
    finalMap.forEach((voxel) => {
      dummy.position.copy(voxel.pos);
      dummy.rotation.set(0, 0, 0); 
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, new THREE.Color(voxel.color));
      i++;
    });

    meshRef.current.count = finalMap.size;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [renderMap, idToCanonical, serverDataMap, unsavedPixels, dummy, get3DPos]);

  useEffect(() => {
    if (!targetInstancedRef.current) return;
    const uniqueTargets = new Map<string, THREE.Vector3>();

    targetIds.forEach(id => {
      const x = id % MAP_WIDTH;
      const y = Math.floor(id / MAP_WIDTH);
      const pos = get3DPos(x, y);
      const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;
      uniqueTargets.set(key, pos);
    });

    let i = 0;
    uniqueTargets.forEach((pos) => {
      dummy.position.copy(pos);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      targetInstancedRef.current!.setMatrixAt(i++, dummy.matrix);
    });

    targetInstancedRef.current.count = uniqueTargets.size;
    targetInstancedRef.current.instanceMatrix.needsUpdate = true;
  }, [targetIds, dummy, get3DPos]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const stateRef = useRef({ selectedColor, targetIds });
  useEffect(() => {
    stateRef.current = { selectedColor, targetIds };
  }, [selectedColor, targetIds]);

  useEffect(() => {
    const { selectedColor: colorToPaint, targetIds: idsToPaint } = stateRef.current;
    if (paintTrigger > 0 && idsToPaint.size > 0) {
      setUnsavedPixels(prev => {
        const next = { ...prev };
        idsToPaint.forEach(id => {
          next[id] = colorToPaint;
        });
        return next;
      });
      setTargetIds(new Set()); 
      lastClickedId.current = null;
    }
  }, [paintTrigger, setTargetIds, setUnsavedPixels]);

  // 🚀 완벽한 해결 로직: 월드 레이저를 로컬 좌표계로 변환하여 100% 정밀 AABB 교차 검사
  const getGridFromRay = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!e.uv || !groupRef.current) return null;

    // 1. 현재 카메라에서 쏜 월드 레이저(World Ray)를 지구본의 로컬 공간으로 변환합니다.
    // 지구가 회전해도 블록 좌표와 일치하게 만듭니다.
    const invMat = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert();
    const localRay = new THREE.Ray().copy(e.ray).applyMatrix4(invMat);

    // 2. 투명 구체의 UV로 대략적인 2D 구역을 뽑아냅니다.
    const approxX = Math.floor(e.uv.x * MAP_WIDTH);
    const approxY = Math.floor((1 - e.uv.y) * MAP_HEIGHT);

    const halfSize = VOXEL_SIZE / 2;
    let closestId: number | null = null;
    let minDistance = Infinity;

    // 3. 대략적인 위치 주변 7x7칸(49개)의 실제 3D 레고 블록 좌표들만 뽑아 검사합니다.
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        let nx = approxX + dx;
        let ny = approxY + dy;

        // 좌표계 보정 (좌우 끝 연결)
        if (nx < 0) nx += MAP_WIDTH;
        if (nx >= MAP_WIDTH) nx -= MAP_WIDTH;
        if (ny < 0 || ny >= MAP_HEIGHT) continue;

        const rawId = ny * MAP_WIDTH + nx;
        const canonicalId = idToCanonical.get(rawId) ?? rawId; // 숨겨진 블록 무시 (겉껍질 1개로 통일)

        const cx = canonicalId % MAP_WIDTH;
        const cy = Math.floor(canonicalId / MAP_WIDTH);
        const pos = get3DPos(cx, cy);

        // 상자의 실제 AABB(경계 박스) 생성
        mathMin.set(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize);
        mathMax.set(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize);
        mathBox.set(mathMin, mathMax);

        // 4. 로컬 레이저가 상자를 정확히 뚫고 지나가는지 검사
        if (localRay.intersectBox(mathBox, mathIntersect)) {
          const dist = localRay.origin.distanceToSquared(mathIntersect);
          // 카메라와 가장 가까운 앞면 상자를 선택
          if (dist < minDistance) {
            minDistance = dist;
            closestId = canonicalId;
          }
        }
      }
    }

    // 예외: 마우스가 상자들 사이의 미세한 틈새를 찔러 교차가 안 된 경우 
    if (closestId === null) {
        const rawId = approxY * MAP_WIDTH + approxX;
        return idToCanonical.get(rawId) ?? rawId;
    }

    return closestId;
  }, [get3DPos, idToCanonical, mathBox, mathMin, mathMax, mathIntersect]);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (hoverMeshRef.current) {
      const rawId = getGridFromRay(e);
      if (rawId !== null) {
        const canonicalId = idToCanonical.get(rawId) ?? rawId;
        const cx = canonicalId % MAP_WIDTH;
        const cy = Math.floor(canonicalId / MAP_WIDTH);
        const pos = get3DPos(cx, cy);
        
        hoverMeshRef.current.position.copy(pos);
        hoverMeshRef.current.rotation.set(0, 0, 0);
        hoverMeshRef.current.visible = true;
      } else {
        hoverMeshRef.current.visible = false;
      }
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (hoverMeshRef.current) hoverMeshRef.current.visible = false;
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.delta <= 2) {
      const rawId = getGridFromRay(e);
      if (rawId === null) return;
      
      const id = idToCanonical.get(rawId) ?? rawId;
      const gridX = id % MAP_WIDTH;
      const gridY = Math.floor(id / MAP_WIDTH);

      if (e.shiftKey && lastClickedId.current !== null) {
        const startX = lastClickedId.current % MAP_WIDTH;
        const startY = Math.floor(lastClickedId.current / MAP_WIDTH);
        
        const minY = Math.min(startY, gridY);
        const maxY = Math.max(startY, gridY);

        const newTargets = new Set(targetIds);
        
        const xCoords = [];
        if (Math.abs(gridX - startX) > MAP_WIDTH / 2) {
          const leftBound = Math.max(startX, gridX);
          const rightBound = Math.min(startX, gridX);
          for (let x = leftBound; x < MAP_WIDTH; x++) xCoords.push(x);
          for (let x = 0; x <= rightBound; x++) xCoords.push(x);
        } else {
          const minX = Math.min(startX, gridX);
          const maxX = Math.max(startX, gridX);
          for (let x = minX; x <= maxX; x++) xCoords.push(x);
        }

        for (let y = minY; y <= maxY; y++) {
          for (const x of xCoords) {
            const rId = y * MAP_WIDTH + x;
            const cId = idToCanonical.get(rId) ?? rId; 
            newTargets.add(cId);
          }
        }
        setTargetIds(newTargets);
        lastClickedId.current = id;
      } else if (e.ctrlKey || e.metaKey) {
        const newTargets = new Set(targetIds);
        if (newTargets.has(id)) newTargets.delete(id);
        else newTargets.add(id);
        setTargetIds(newTargets);
        lastClickedId.current = id;
      } else {
        setTargetIds(new Set([id]));
        lastClickedId.current = id;
      }
    }
  };

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[null as any, null as any, 200000]}>
        <boxGeometry args={[VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE]} />
        <meshStandardMaterial roughness={0.7} metalness={0.1} />
      </instancedMesh>
      
      <mesh ref={hoverMeshRef} visible={false}>
        <boxGeometry args={[VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      
      <instancedMesh ref={targetInstancedRef} args={[null as any, null as any, 200000]}>
        <boxGeometry args={[VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>

      {/* 2. 블록의 튀어나온 모서리까지 넉넉하게 덮도록 반경을 유지합니다. */}
      <mesh 
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerUp={handlePointerUp}
      >
        <sphereGeometry args={[GLOBE_RADIUS + (VOXEL_SIZE * 1.5), 64, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ==========================================
// UI Components
// ==========================================
const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cn(
      "w-8 h-4 rounded-full transition-colors relative focus:outline-none shrink-0",
      checked ? "bg-blue-600" : "bg-gray-700"
    )}
  >
    <div className={cn(
      "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform",
      checked ? "translate-x-4.5" : "translate-x-0.5"
    )} />
  </button>
);

const FloatingDock = ({ items }: { items: any[] }) => {
  return (
    <>
      <FloatingDockDesktop items={items} />
      <FloatingDockMobile items={items} />
    </>
  );
};

const FloatingDockMobile = ({ items }: { items: any[] }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative block md:hidden z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-4 flex flex-col gap-3"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, transition: { delay: idx * 0.05 } }}
                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
              >
                <button
                  onClick={() => { item.onClick(); setOpen(false); }}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] mx-auto"
                >
                  <div className="h-5 w-5 text-gray-300">{item.icon}</div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] mx-auto"
      >
        <Menu className="h-6 w-6 text-white" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({ items }: { items: any[] }) => {
  let mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="mx-auto hidden md:flex h-16 items-end gap-4 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 px-5 pb-3 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({ mouseX, title, icon, onClick }: { mouseX: MotionValue; title: string; icon: React.ReactNode; onClick: () => void }) {
  let ref = useRef<HTMLButtonElement>(null);
  let distance = useTransform(mouseX, (val) => {
    let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  let heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

  let width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  let height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  let widthIcon = useSpring(widthTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });
  let heightIcon = useSpring(heightTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });

  const [hovered, setHovered] = useState(false);

  return (
    <button ref={ref} onClick={onClick} className="relative block focus:outline-none">
      <motion.div
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex aspect-square items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-inner"
      >
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="absolute -top-12 left-1/2 w-fit -translate-x-1/2 rounded-lg border border-white/10 bg-black/80 backdrop-blur-md px-3 py-1.5 text-xs whitespace-pre text-white shadow-xl font-medium tracking-wide z-50 pointer-events-none"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div style={{ width: widthIcon, height: heightIcon }} className="flex items-center justify-center text-gray-300">
          {icon}
        </motion.div>
      </motion.div>
    </button>
  );
}

// ==========================================
// 4. Main App Component
// ==========================================
export default function App() {
  const [userPoints, setUserPoints] = useState<number>(0);
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null }>({
    username: 'Explorer',
    avatar_url: null,
  });
  const [editUsername, setEditUsername] = useState('Explorer');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Palette State
  const [selectedColor, setSelectedColor] = useState<string>(BASIC_PALETTE[0]);
  const [recentColors, setRecentColors] = useState<string[]>(Array(8).fill('')); // 세션 휘발성 8칸
  const [unlockedPacks, setUnlockedPacks] = useState<number[]>([]);
  const [unlockPrompt, setUnlockPrompt] = useState<{name: string, index: number} | null>(null);
  
  // Palette Filters & Sort
  const [paletteSearch, setPaletteSearch] = useState('');
  const [paletteTab, setPaletteTab] = useState<'all' | 'theme' | 'country'>('all');

  const packsWithIndex = useMemo(() => {
    return THEME_PACKS.map((pack, idx) => ({ ...pack, originalIndex: idx }));
  }, []);

  const filteredAndSortedPacks = useMemo(() => {
    let filtered = packsWithIndex;
    
    // 1. Tab Filter
    if (paletteTab !== 'all') {
      filtered = filtered.filter(p => p.type === paletteTab);
    }
    
    // 2. Search Filter
    if (paletteSearch.trim()) {
      const lowerSearch = paletteSearch.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    
    // 3. Sort: Unlocked first
    return filtered.sort((a, b) => {
      const aUnlocked = unlockedPacks.includes(a.originalIndex);
      const bUnlocked = unlockedPacks.includes(b.originalIndex);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return 0; // 둘 다 잠겼거나 둘 다 해금이면 원래 순서 유지
    });
  }, [packsWithIndex, paletteTab, paletteSearch, unlockedPacks]);

  const [targetIds, setTargetIds] = useState<Set<number>>(new Set());
  const [paintTrigger, setPaintTrigger] = useState<number>(0);
  
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [freeCamera, setFreeCamera] = useState<boolean>(true); 
  const [showStars, setShowStars] = useState<boolean>(true);
  const [showUI, setShowUI] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [sunLighting, setSunLighting] = useState<boolean>(false);

  const [isMyPlanetsOpen, setIsMyPlanetsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [activeStoreTab, setActiveStoreTab] = useState<'features' | 'points'>('features');
  
  const [activePlanetId, setActivePlanetId] = useState(1);
  const currentPlanetId = session?.user ? `${session.user.id}_${activePlanetId}` : null;
  
  // Modals & Guards
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Planet State Management 
  const [planetSlots, setPlanetSlots] = useState([
    { id: 1, isEmpty: false },
    { id: 2, isEmpty: true },
    { id: 3, isEmpty: true }
  ]);
  const [planetNames, setPlanetNames] = useState<Record<number, string>>({
    1: 'Origin Earth',
    2: 'Locked Slot',
    3: 'Locked Slot'
  });
  const [planetUnlocked, setPlanetUnlocked] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false
  });
  const [planetThumbnails, setPlanetThumbnails] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null
  });
  
  const [editingPlanetId, setEditingPlanetId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Data State
  const [basePixels, setBasePixels] = useState<PixelData[]>([]);
  const [serverDataMap, setServerDataMap] = useState<Record<number, string>>({});
  const [unsavedPixels, setUnsavedPixels] = useState<Record<number, string>>({});
  
  // 캡처 트리거용 상태
  const [isSavingPlanet, setIsSavingPlanet] = useState(false);
  const [captureTrigger, setCaptureTrigger] = useState(0);

  // 자동 캡처 방지용 플래그
  const [initialCaptureDone, setInitialCaptureDone] = useState<Record<number, boolean>>({});

  // DB에서 슬롯 정보 불러오기
  const initPlanets = async (userId: string) => {
    const { data, error } = await supabase.from('planets').select('*').eq('user_id', userId);
    if (error) {
      console.error("Planets fetch error:", error);
      return;
    }

    if (!data || data.length === 0) {
      const initData = [
        { id: `${userId}_1`, user_id: userId, slot_number: 1, name: 'Origin Earth', is_unlocked: true },
        { id: `${userId}_2`, user_id: userId, slot_number: 2, name: 'Locked Slot', is_unlocked: false },
        { id: `${userId}_3`, user_id: userId, slot_number: 3, name: 'Locked Slot', is_unlocked: false }
      ];
      await supabase.from('planets').insert(initData);
      
      setPlanetNames({ 1: 'Origin Earth', 2: 'Locked Slot', 3: 'Locked Slot' });
      setPlanetUnlocked({ 1: true, 2: false, 3: false });
      setPlanetThumbnails({ 1: null, 2: null, 3: null });
      setPlanetSlots([
        { id: 1, isEmpty: false },
        { id: 2, isEmpty: true },
        { id: 3, isEmpty: true }
      ]);
    } else {
      const names: Record<number, string> = {};
      const unlocked: Record<number, boolean> = {};
      const thumbnails: Record<number, string | null> = {};
      
      const slots = [1, 2, 3].map(slotNum => {
        const dbSlot = data.find(p => p.slot_number === slotNum);
        if (dbSlot) {
          names[slotNum] = dbSlot.name;
          unlocked[slotNum] = dbSlot.is_unlocked;
          thumbnails[slotNum] = dbSlot.thumbnail_url;
          return { id: slotNum, isEmpty: !dbSlot.is_unlocked || dbSlot.name === 'Empty Slot' || dbSlot.name === 'Locked Slot' };
        }
        names[slotNum] = 'Locked Slot';
        unlocked[slotNum] = false;
        thumbnails[slotNum] = null;
        return { id: slotNum, isEmpty: true };
      });
      setPlanetNames(names);
      setPlanetUnlocked(unlocked);
      setPlanetThumbnails(thumbnails);
      setPlanetSlots(slots);
    }
  };

  useEffect(() => {
    // 인증과 데이터 로드가 끝나서 3D 렌더링이 시작되면
    if (!loadingAuth && isMapLoaded) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsEngineReady(true);
          }, 300);
        });
      });
    }
  }, [loadingAuth, isMapLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        initPlanets(session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
        initPlanets(session.user.id);
      } else {
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(unsavedPixels).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedPixels]);

  useEffect(() => {
    const loadBaseMap = async () => {
      try {
        let res = await fetch(earthSeedCsvUrl || '/src/assets/earth_seed.csv');
        if (!res.ok) res = await fetch('/assets/earth_seed.csv');
        if (!res.ok) return;

        const text = await res.text();
        const lines = text.trim().split('\n');
        const parsed: PixelData[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 3) {
            parsed.push({ x: parseInt(parts[0], 10), y: parseInt(parts[1], 10), color: parts[2].trim() });
          }
        }
        setBasePixels(parsed);
      } catch (err) {
        console.error("Base Map Loading Error:", err);
      }
    };
    loadBaseMap();
  }, []);

  useEffect(() => {
    if (!currentPlanetId) return;
    
    const fetchChunks = async () => {
      const { data, error } = await supabase
        .from('planet_chunks')
        .select('chunk_id, pixel_data')
        .eq('planet_id', currentPlanetId);
        
      if (error) {
        console.error("Fetch Chunks Error:", error);
        return;
      }

      const mergedMap: Record<number, string> = {};
      data?.forEach(row => {
        Object.assign(mergedMap, row.pixel_data);
      });
      
      setServerDataMap(mergedMap);
      setUnsavedPixels({}); 
      setIsMapLoaded(true); 
    };
    
    fetchChunks();
  }, [currentPlanetId]);

  useEffect(() => {
    if (
      basePixels.length > 0 &&
      currentPlanetId &&
      planetUnlocked[activePlanetId] &&
      planetThumbnails[activePlanetId] === null &&
      !initialCaptureDone[activePlanetId]
    ) {
      const timer = setTimeout(() => {
        setCaptureTrigger(Date.now());
        setInitialCaptureDone(prev => ({ ...prev, [activePlanetId]: true }));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [basePixels.length, currentPlanetId, activePlanetId, planetUnlocked, planetThumbnails, initialCaptureDone]);

  const handleSavePlanet = async () => {
    if (!currentPlanetId || !session?.user?.id) return;
    setIsSavingPlanet(true);

    const finalMap = { ...serverDataMap, ...unsavedPixels };
    const chunksToUpdate = new Set<number>();

    Object.keys(unsavedPixels).forEach(idStr => {
       const id = parseInt(idStr, 10);
       chunksToUpdate.add(Math.floor(id / 5000));
    });

    const upsertPayload = Array.from(chunksToUpdate).map(chunkId => {
       const pixelData: Record<number, string> = {};
       const startId = chunkId * 5000;
       const endId = startId + 4999;
       for (let id = startId; id <= endId; id++) {
          if (finalMap[id]) pixelData[id] = finalMap[id];
       }
       return {
          planet_id: currentPlanetId,
          user_id: session.user.id,
          chunk_id: chunkId,
          pixel_data: pixelData
       };
    });

    const { error } = await supabase.from('planet_chunks').upsert(upsertPayload, { onConflict: 'planet_id,chunk_id' });

    if (!error) {
       setServerDataMap(finalMap); 
       setUnsavedPixels({}); 
       setCaptureTrigger(Date.now());
    } else {
       console.error("Save failed:", error);
       alert("Failed to save. Please try again.");
       setIsSavingPlanet(false);
    }
  };

  const handleCaptured = async (base64Str: string | null) => {
    if (base64Str && currentPlanetId && session?.user?.id) {
      await supabase.from('planets').update({ thumbnail_url: base64Str }).eq('id', currentPlanetId);
      setPlanetThumbnails(prev => ({ ...prev, [activePlanetId]: base64Str }));
    }

    setPlanetSlots(prev => prev.map(slot => 
      slot.id === activePlanetId && slot.isEmpty 
        ? { ...slot, isEmpty: false } 
        : slot
    ));
    
    setPlanetNames(prev => {
      if (prev[activePlanetId] === 'Empty Slot' || prev[activePlanetId] === 'Locked Slot') {
        const newName = 'New Planet';
        supabase.from('planets').update({ name: newName }).eq('id', currentPlanetId).then();
        return { ...prev, [activePlanetId]: newName };
      }
      return prev;
    });

    setIsSavingPlanet(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('username, avatar_url, points').eq('id', userId).single();
      if (error) throw error;
      if (data) {
        setProfile({ username: data.username, avatar_url: data.avatar_url });
        setEditUsername(data.username || 'Explorer');
        if (data.points !== undefined) setUserPoints(data.points);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    setIsSavingProfile(true);
    try {
      let newAvatarUrl = profile.avatar_url;
      if (avatarFile) {
        const filePath = `${session.user.id}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
      }
      const { error } = await supabase.from('profiles').update({ username: editUsername, avatar_url: newAvatarUrl }).eq('id', session.user.id);
      if (error) throw error;
      setProfile({ username: editUsername, avatar_url: newAvatarUrl });
      setIsProfileModalOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      alert(`저장 실패: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePlanetName = async (slotId: number) => {
    const newName = editNameValue.trim();
    if (newName) {
      setPlanetNames(prev => ({ ...prev, [slotId]: newName }));
      if (session?.user) {
        await supabase.from('planets').update({ name: newName }).eq('id', `${session.user.id}_${slotId}`);
      }
    }
    setEditingPlanetId(null);
  };

  const handleLogoutAttempt = () => {
    if (Object.keys(unsavedPixels).length > 0) {
      setPendingAction(() => async () => {
        await supabase.auth.signOut();
        setIsProfileModalOpen(false);
        setIsSettingsOpen(false);
      });
    } else {
      supabase.auth.signOut();
      setIsProfileModalOpen(false);
      setIsSettingsOpen(false);
    }
  };

  const handleSlotChange = (slotId: number) => {
    if (slotId === activePlanetId) return;
    if (Object.keys(unsavedPixels).length > 0) {
      setPendingAction(() => () => setActivePlanetId(slotId));
    } else {
      setActivePlanetId(slotId);
    }
  };

  const handlePaint = () => {
    if (targetIds.size > 0) {
      setPaintTrigger(prev => prev + 1);
      
      setRecentColors(prev => {
        const newColors = prev.filter(c => c !== selectedColor && c !== '');
        newColors.unshift(selectedColor);
        while (newColors.length < 8) newColors.push('');
        return newColors.slice(0, 8);
      });
    }
  };

  const handleResetConfirm = async () => {
    if (!currentPlanetId) return;
    await supabase.from('planet_chunks').delete().eq('planet_id', currentPlanetId);
    setServerDataMap({});
    setUnsavedPixels({});
    setTargetIds(new Set());
    setIsResetModalOpen(false);
    
    setTimeout(() => {
      setCaptureTrigger(Date.now());
    }, 500);
  };

  const dockItems = [
    {
      title: "My Planets",
      icon: <Library className="h-full w-full" />,
      onClick: () => {
        setIsMyPlanetsOpen(!isMyPlanetsOpen);
        setIsExportOpen(false);
        setIsSettingsOpen(false);
        setIsStoreModalOpen(false);
      }
    },
    {
      title: "Store",
      icon: <ShoppingCart className="h-full w-full text-blue-400" />,
      onClick: () => {
        setIsStoreModalOpen(true);
        setActiveStoreTab('features');
        setIsMyPlanetsOpen(false);
        setIsExportOpen(false);
        setIsSettingsOpen(false);
      }
    },
    {
      title: "Export",
      icon: <Download className="h-full w-full" />,
      onClick: () => {
        setIsExportOpen(!isExportOpen);
        setIsMyPlanetsOpen(false);
        setIsSettingsOpen(false);
        setIsStoreModalOpen(false);
      }
    },
    {
      title: "Settings",
      icon: <Settings className="h-full w-full" />,
      onClick: () => {
        setIsSettingsOpen(!isSettingsOpen);
        setIsMyPlanetsOpen(false);
        setIsExportOpen(false);
        setIsStoreModalOpen(false);
      }
    },
    {
      title: "Reset Planet",
      icon: <RotateCcw className="h-full w-full text-red-400" />,
      onClick: () => setIsResetModalOpen(true)
    },
    {
      title: "Profile",
      icon: (
        <div className="h-full w-full rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner text-[10px] overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>
      ),
      onClick: () => {
        setEditUsername(profile.username);
        setAvatarPreview(null);
        setAvatarFile(null);
        setIsProfileModalOpen(true);
      }
    },
  ];

  const showCurtain = loadingAuth || (session && (!isMapLoaded || !isEngineReady));

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden relative select-none">
      
      {/* 1. 화면 깜빡임이 절대 없는 단일 로딩 커튼 */}
      <AnimatePresence>
        {showCurtain && (
          <motion.div
            key="global-curtain"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 bg-[#050505] flex flex-col items-center justify-center z-[9999]"
          >
            <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-neutral-300 font-bold tracking-widest animate-pulse">Loading...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. 비로그인 유저에게만 렌더링되는 랜딩페이지 */}
      {!loadingAuth && !session && (
        <div className="absolute inset-0 z-[5000] bg-[#050505]">
          <LandingPage onLogin={() => {}} /> 
        </div>
      )}

      {/* 3. 로그인 완료 유저에게 렌더링되는 앱 본체 */}
      {!loadingAuth && session && (
        <>
          <Canvas camera={{ position: [0, 0, 50], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
            <color attach="background" args={[darkMode ? '#050505' : '#ffffff']} />
            
            {sunLighting ? (
              <>
                <ambientLight intensity={0.6} />
                <directionalLight position={[15, 20, 10]} intensity={1.5} />
                <directionalLight position={[-10, -20, -10]} intensity={0.5} />
              </>
            ) : (
              <ambientLight intensity={2.5} />
            )}

            {showStars && <CustomStars darkMode={darkMode} />}
            
            <VoxelGlobe 
              selectedColor={selectedColor} 
              targetIds={targetIds}
              setTargetIds={setTargetIds}
              paintTrigger={paintTrigger}
              autoRotate={autoRotate}
              basePixels={basePixels}
              serverDataMap={serverDataMap}
              unsavedPixels={unsavedPixels}
              setUnsavedPixels={setUnsavedPixels}
            />
            
            <OrbitControls 
              enablePan={false} 
              minDistance={13} 
              maxDistance={50} 
              rotateSpeed={0.4}
              dampingFactor={0.1}
              enableRotate={freeCamera} 
              makeDefault 
            />
            
            <ThumbnailCapturer captureTrigger={captureTrigger} onCaptured={handleCaptured} />
          </Canvas>

          <AnimatePresence>
            {!showUI && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setShowUI(true)}
                className="absolute top-6 right-6 z-50 p-3 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full transition-colors shadow-2xl"
                title="Show UI"
              >
                <Eye className="w-5 h-5 text-white" />
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showUI && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                
                <div className="absolute top-6 left-6 z-40 flex items-center gap-3 bg-black/40 backdrop-blur-2xl border border-white/10 py-2.5 pl-2.5 pr-6 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-auto">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <div className="w-4 h-4 bg-black rounded-full"></div>
                  </div>
                  <span className="text-lg font-bold tracking-wider text-white">Planet Studio</span>
                </div>

                {/* 우측 상단: 보라색 다이아몬드 포인트 UI */}
                {session && (
                  <div 
                    onClick={() => {
                      setIsStoreModalOpen(true);
                      setActiveStoreTab('points'); // 포인트 탭으로 자동 연결
                      setIsMyPlanetsOpen(false);
                      setIsExportOpen(false);
                      setIsSettingsOpen(false);
                    }}
                    className="absolute top-6 right-6 z-40 flex items-center gap-2.5 bg-black/40 backdrop-blur-2xl border border-white/10 px-5 py-2.5 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-auto transition-all hover:bg-white/10 cursor-pointer"
                  >
                    <span className="text-lg drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">💎</span>
                    <span className="text-white font-bold tracking-wide text-sm">
                      {userPoints.toLocaleString()} <span className="text-purple-400 ml-0.5">P</span>
                    </span>
                  </div>
                )}

                <AnimatePresence>
                  {Object.keys(unsavedPixels).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, x: '-50%' }}
                      animate={{ opacity: 1, y: 0, x: '-50%' }}
                      exit={{ opacity: 0, y: -20, x: '-50%' }}
                      className="absolute top-6 left-1/2 z-50 flex gap-2 pointer-events-auto"
                    >
                      <button
                        onClick={handleSavePlanet}
                        disabled={isSavingPlanet}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-full font-bold shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {isSavingPlanet ? 'Saving...' : `Save Planet (${Object.keys(unsavedPixels).length})`}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex justify-center pointer-events-auto">
                  <AnimatePresence mode="wait">
                    {isMyPlanetsOpen && (
                      <motion.div 
                        key="myplanets"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-[18rem] p-2 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[2rem]"
                      >
                        <div className="space-y-2">
                          {planetSlots.map((planet) => (
                            <div 
                              key={planet.id}
                              onClick={() => {
                                if (!planetUnlocked[planet.id]) {
                                  alert('This slot is locked. (해금 기능 추후 제공)');
                                  return;
                                }
                                handleSlotChange(planet.id);
                              }}
                              className={cn(
                                "flex items-center w-full p-2 rounded-2xl cursor-pointer transition-all border",
                                activePlanetId === planet.id ? "bg-blue-600/20 border-blue-500/50" : "hover:bg-white/10 border-transparent",
                                !planetUnlocked[planet.id] && "opacity-50 grayscale hover:bg-transparent cursor-not-allowed"
                              )}
                            >
                              <div className="w-10 h-10 rounded-[1rem] bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center border border-white/10 relative">
                                {!planetUnlocked[planet.id] ? (
                                  <Lock className="w-4 h-4 text-gray-500 absolute" />
                                ) : planet.isEmpty ? (
                                  <span className="text-gray-500 text-xs">+</span>
                                ) : (
                                  <img src={planetThumbnails[planet.id] || 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=100&h=100'} className="w-full h-full object-cover opacity-90" alt="planet" />
                                )}
                              </div>
                              
                              <div className="flex flex-col justify-center overflow-hidden pl-3 flex-1">
                                {editingPlanetId === planet.id && planetUnlocked[planet.id] ? (
                                  <input
                                    autoFocus
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={() => handleSavePlanetName(planet.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSavePlanetName(planet.id);
                                    }}
                                    className="text-sm font-bold text-white bg-black/50 border border-blue-500 rounded px-1.5 py-0.5 w-[90%] focus:outline-none mb-1 shadow-inner"
                                    maxLength={18}
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5 group/edit mb-1.5">
                                    <span 
                                      className="text-sm font-bold text-gray-200 truncate leading-none cursor-pointer hover:text-white transition-colors"
                                      onDoubleClick={(e) => {
                                        if (planetUnlocked[planet.id]) {
                                          e.stopPropagation();
                                          setEditingPlanetId(planet.id);
                                          setEditNameValue(planetNames[planet.id] === 'Origin Earth' && profile.username ? `${profile.username}'s Planet` : planetNames[planet.id]);
                                        }
                                      }}
                                    >
                                      {planetNames[planet.id] === 'Origin Earth' && profile.username 
                                          ? `${profile.username}'s Planet` 
                                          : planetNames[planet.id]
                                      }
                                    </span>
                                    {planetUnlocked[planet.id] && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingPlanetId(planet.id);
                                          setEditNameValue(planetNames[planet.id] === 'Origin Earth' && profile.username ? `${profile.username}'s Planet` : planetNames[planet.id]);
                                        }}
                                        className="opacity-0 group-hover/edit:opacity-100 transition-opacity"
                                        title="Edit planet name"
                                      >
                                        <Edit2 className="w-3 h-3 text-gray-400 hover:text-blue-400" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                <span className="text-[10px] text-gray-500 truncate leading-none">
                                  {!planetUnlocked[planet.id] ? 'Locked' : planet.isEmpty ? 'New Planet' : `Slot ${planet.id}`}
                                </span>
                              </div>

                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {isExportOpen && (
                      <motion.div 
                        key="export"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-[18rem] p-2 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[2rem]"
                      >
                        <div className="space-y-1">
                          {[
                            { icon: ImageIcon, label: 'Export PNG' },
                            { icon: Video, label: 'Export GIF' },
                            { icon: Share2, label: 'Share' }
                          ].map((item, idx) => (
                            <button key={idx} className="flex items-center w-full p-3 rounded-2xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white justify-start">
                              <div className="w-6 flex justify-center shrink-0 ml-1">
                                <item.icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-medium whitespace-nowrap overflow-hidden pl-3">
                                {item.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {isSettingsOpen && (
                      <motion.div 
                        key="settings"
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="w-[18rem] p-4 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[2rem]"
                      >
                        <div className="space-y-4">
                          {[
                            { label: 'Space Dark Mode', state: darkMode, fn: () => setDarkMode(!darkMode), icon: Moon },
                            { label: 'Sunlight (Shadows)', state: sunLighting, fn: () => setSunLighting(!sunLighting), icon: Sun },
                            { label: 'Auto Rotation', state: autoRotate, fn: () => setAutoRotate(!autoRotate), icon: RefreshCw },
                            { label: 'Free Camera', state: freeCamera, fn: () => setFreeCamera(!freeCamera), icon: Move },
                            { label: 'Stars', state: showStars, fn: () => setShowStars(!showStars), icon: Sparkles },
                            { label: 'Hide UI', state: !showUI, fn: () => setShowUI(false), icon: EyeOff },
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center text-gray-300">
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="pl-3 text-sm whitespace-nowrap font-medium">{item.label}</span>
                              </div>
                              <ToggleSwitch checked={item.state} onChange={item.fn} />
                            </div>
                          ))}

                          <div className="pt-3 border-t border-white/10 mt-2">
                            <button 
                              onClick={handleLogoutAttempt}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-colors"
                            >
                              <LogOut className="w-4 h-4" />
                              Logout
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
                  <FloatingDock items={dockItems} />
                </div>

                {/* 🎨 팔레트 레이아웃 (상단 스크롤 / 하단 고정) */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-30">
                  <div className="bg-black/40 backdrop-blur-2xl p-4 rounded-3xl flex flex-col border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-64 h-[500px]">

                    {/* [검색 바] */}
                    <div className="relative mb-3 shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        value={paletteSearch}
                        onChange={e => setPaletteSearch(e.target.value)}
                        placeholder="Search packs..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* [상단 스크롤 영역] 색상 팩 목록 */}
                    <div className="w-full flex-1 overflow-y-auto min-h-0 pr-1 pb-2 flex flex-col gap-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      
                      {/* 그룹 A: 기본 색상 (Basic 32색) - 항상 노출 */}
                      <div className="w-full shrink-0">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Basic Colors</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1.5 w-full px-1 py-1">
                          {BASIC_PALETTE.map((color) => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={cn(
                                "w-5 h-5 rounded-md cursor-pointer transition-all hover:scale-125 flex items-center justify-center",
                                selectedColor === color ? 'ring-[1.5px] ring-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)] z-10' : ''
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 팩 탭 필터 (All / Theme / Country) */}
                      <div className="flex gap-1 bg-white/5 p-1 rounded-lg shrink-0 mx-1 border border-white/5">
                        <button onClick={() => setPaletteTab('all')} className={cn("flex-1 py-1 rounded-md text-[10px] font-bold transition-all", paletteTab === 'all' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>All</button>
                        <button onClick={() => setPaletteTab('theme')} className={cn("flex-1 py-1 rounded-md text-[10px] font-bold transition-all", paletteTab === 'theme' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>Theme</button>
                        <button onClick={() => setPaletteTab('country')} className={cn("flex-1 py-1 rounded-md text-[10px] font-bold transition-all", paletteTab === 'country' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>Country</button>
                      </div>

                      {/* 동적 렌더링: 검색 및 필터링, 정렬된 테마 팩 & 국가 팩 */}
                      <div className="flex flex-col gap-5">
                        {filteredAndSortedPacks.map((pack) => {
                          const isUnlocked = unlockedPacks.includes(pack.originalIndex);
                          return (
                            <div key={pack.name} className="w-full relative group">
                              <div className={cn("flex justify-between items-center mb-2 px-1 transition-opacity", !isUnlocked && "opacity-60 group-hover:opacity-100")}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className={cn("text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-wider shrink-0", pack.type === 'theme' ? "bg-purple-500/20 text-purple-300" : "bg-emerald-500/20 text-emerald-300")}>
                                    {pack.type}
                                  </span>
                                  <span className="text-[11px] font-bold text-gray-300 tracking-wider truncate mr-2" title={pack.name}>
                                    {pack.name}
                                  </span>
                                </div>
                                {!isUnlocked && (
                                  <button 
                                    onClick={() => setUnlockPrompt({ name: pack.name, index: pack.originalIndex })} 
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors z-20 cursor-pointer shrink-0"
                                  >
                                    <Lock className="w-3 h-3 text-gray-500 group-hover:text-yellow-400 transition-colors" />
                                  </button>
                                )}
                              </div>
                              <div 
                                className={cn(
                                  "grid grid-cols-8 gap-1.5 w-full px-1 py-1 transition-all duration-300", 
                                  !isUnlocked && "opacity-30 grayscale group-hover:opacity-80 group-hover:grayscale-0 cursor-pointer"
                                )}
                                onClick={() => !isUnlocked && setUnlockPrompt({ name: pack.name, index: pack.originalIndex })}
                              >
                                {pack.colors.map((color, cIdx) => (
                                  <button
                                    key={cIdx}
                                    onClick={(e) => {
                                      if (isUnlocked) {
                                        setSelectedColor(color);
                                      } else {
                                        e.stopPropagation();
                                        setUnlockPrompt({ name: pack.name, index: pack.originalIndex });
                                      }
                                    }}
                                    className={cn(
                                      "w-5 h-5 rounded-md transition-all flex items-center justify-center",
                                      isUnlocked ? "hover:scale-125 cursor-pointer" : "pointer-events-none",
                                      selectedColor === color && isUnlocked ? 'ring-[1.5px] ring-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)] z-10' : ''
                                    )}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {filteredAndSortedPacks.length === 0 && (
                          <div className="text-center text-gray-500 text-xs py-6">No packs match your search.</div>
                        )}
                      </div>
                      
                    </div>

                    {/* [하단 고정 영역] Recent & Paint */}
                    <div className="w-full shrink-0 pt-4 border-t border-white/10 flex flex-col gap-4 mt-2 bg-gradient-to-t from-black/20 to-transparent">
                      {/* 3. 최근 사용 색상 8칸 */}
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent</span>
                        </div>
                        <div className="grid grid-cols-8 gap-1.5 w-full px-1 py-1">
                          {recentColors.map((color, idx) => (
                            <button
                              key={idx}
                              onClick={() => color && setSelectedColor(color)}
                              className={cn(
                                "w-5 h-5 rounded-md transition-all flex items-center justify-center border",
                                color ? "hover:scale-125 border-transparent cursor-pointer" : "border-white/10 bg-white/5 cursor-default",
                                selectedColor === color && color ? 'ring-[1.5px] ring-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.4)] z-10' : ''
                              )}
                              style={{ backgroundColor: color || 'transparent' }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 4. Paint 버튼 */}
                      <button
                        onClick={handlePaint}
                        disabled={targetIds.size === 0}
                        className={cn(
                          "w-full h-14 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 border shadow-lg group relative overflow-hidden",
                          targetIds.size > 0
                            ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer'
                            : 'bg-white/5 border-white/5 cursor-not-allowed opacity-50'
                        )}
                      >
                        <span className={cn("text-xl transition-transform", targetIds.size > 0 && "group-hover:scale-110")}>🎨</span>
                        <span className="text-sm font-bold text-white tracking-wider">PAINT</span>
                        
                        {targetIds.size > 0 && (
                          <div className="absolute top-1 right-1 bg-white text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                            {targetIds.size}
                          </div>
                        )}
                      </button>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* --- Modals --- */}
          <AnimatePresence>
            {/* 해금 확인 모달 (Micro-transaction) */}
            {unlockPrompt && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-[#0a0a12]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
                    <Lock className="w-8 h-8 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Unlock Palette</h2>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    <span className="text-white font-bold">{unlockPrompt.name}</span> 팩을<br/>
                    <span className="text-purple-400 font-bold">100 P</span>로 해금하시겠습니까?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setUnlockPrompt(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (userPoints >= 100) {
                          setUserPoints(prev => prev - 100);
                          setUnlockedPacks(prev => [...prev, unlockPrompt.index]);
                          setUnlockPrompt(null);
                        } else {
                          setUnlockPrompt(null);
                          setIsStoreModalOpen(true);
                          setActiveStoreTab('points'); // 부족하면 바로 포인트 탭으로
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      {userPoints >= 100 ? 'Unlock (100 P)' : 'Go to Point Shop'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* 상점(Store) 모달 */}
            {isStoreModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-[#0a0a12]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <ShoppingCart className="w-6 h-6 text-blue-400" />
                      Studio Shop
                    </h2>
                    <button onClick={() => setIsStoreModalOpen(false)} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                      ✕
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4 p-1.5 bg-black/40 border border-white/10 rounded-2xl w-fit mx-auto shrink-0">
                    <button
                      onClick={() => setActiveStoreTab('features')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                        activeStoreTab === 'features' ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Sparkles className="w-4 h-4" />
                      프리미엄 기능
                    </button>
                    <button
                      onClick={() => setActiveStoreTab('points')}
                      className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2",
                        activeStoreTab === 'points' ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]" : "text-gray-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Zap className="w-4 h-4" />
                      포인트 충전
                    </button>
                  </div>

                  {/* Content View (고정 높이 및 내부 애니메이션 제거로 완벽한 안정성) */}
                  <div className="h-[360px] w-full overflow-hidden relative">
                    <div className="absolute inset-0 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {activeStoreTab === 'features' ? (
                        <div className="flex flex-col gap-3 w-full">
                          {/* Item 1: Planet Slot */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0 text-emerald-400">
                              <Library className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white mb-0.5 truncate">행성 슬롯 추가 (+1)</h3>
                              <p className="text-xs text-gray-400 leading-snug line-clamp-2">나만의 우주를 더 넓히세요. 새로운 픽셀 아트를 저장할 수 있는 빈 행성 슬롯을 해금합니다.</p>
                            </div>
                            <button className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors text-sm whitespace-nowrap shrink-0">
                              500 P
                            </button>
                          </div>

                          {/* Item 2: Smart Tools */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors flex items-center gap-4">
                            <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center shrink-0 text-pink-400">
                              <Wand2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white mb-0.5 truncate">스마트 페인트 팩</h3>
                              <p className="text-xs text-gray-400 leading-snug line-clamp-2">스포이트, 페인트통(채우기), 대칭 모드 등 반복 작업을 획기적으로 줄여주는 도구 세트.</p>
                            </div>
                            <button className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors text-sm whitespace-nowrap shrink-0">
                              300 P
                            </button>
                          </div>

                          {/* Item 3: Hologram Tracing */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0 text-blue-400">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white mb-0.5 truncate">홀로그램 트레이싱</h3>
                              <p className="text-xs text-gray-400 leading-snug line-clamp-2">원하는 이미지를 캔버스 위에 반투명하게 띄워놓고 그대로 따라 그릴 수 있는 마법의 툴입니다.</p>
                            </div>
                            <button className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors text-sm whitespace-nowrap shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                              1,000 P
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 w-full">
                          {/* Tier 1 */}
                          <div className="bg-gradient-to-r from-purple-900/40 to-transparent border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-purple-900/60 transition-colors cursor-pointer">
                            <div className="flex items-center gap-5 flex-1">
                              <div className="text-3xl drop-shadow-[0_0_10px_rgba(168,85,247,0.8)] shrink-0">💎</div>
                              <div>
                                <h3 className="font-black text-white text-lg tracking-wide">100 P</h3>
                              </div>
                            </div>
                            <button className="bg-white text-black font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-gray-200 transition-colors shrink-0 shadow-md">
                              $ 0.99
                            </button>
                          </div>

                          {/* Tier 2 */}
                          <div className="bg-gradient-to-r from-blue-900/40 to-transparent border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-blue-900/60 transition-colors cursor-pointer">
                            <div className="flex items-center gap-5 flex-1">
                              <div className="text-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] shrink-0">💎</div>
                              <div>
                                <h3 className="font-black text-white text-lg tracking-wide">550 P</h3>
                                <p className="text-xs text-blue-400 font-bold">+ 50 Bonus</p>
                              </div>
                            </div>
                            <button className="bg-white text-black font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-gray-200 transition-colors shrink-0 shadow-md">
                              $ 4.99
                            </button>
                          </div>

                          {/* Tier 3 */}
                          <div className="bg-gradient-to-r from-pink-900/40 to-transparent border border-pink-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-pink-900/60 transition-colors cursor-pointer">
                            <div className="flex items-center gap-5 flex-1">
                              <div className="text-3xl drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] shrink-0">💎</div>
                              <div>
                                <h3 className="font-black text-white text-lg tracking-wide">1,100 P</h3>
                                <p className="text-xs text-pink-400 font-bold">+ 100 Bonus</p>
                              </div>
                            </div>
                            <button className="bg-white text-black font-bold py-2.5 px-6 rounded-xl text-sm hover:bg-gray-200 transition-colors shrink-0 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                              $ 9.99
                            </button>
                          </div>

                          {/* Tier 4 (Best Value) */}
                          <div className="bg-gradient-to-r from-yellow-900/60 to-orange-900/40 border-2 border-yellow-500/50 rounded-2xl p-4 flex items-center justify-between hover:bg-yellow-900/80 transition-colors cursor-pointer relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-lg">BEST VALUE</div>
                            <div className="flex items-center gap-5 flex-1">
                              <div className="text-3xl drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] shrink-0">💎</div>
                              <div>
                                <h3 className="font-black text-white text-lg tracking-wide">2,400 P</h3>
                                <p className="text-xs text-yellow-400 font-bold">+ 400 Bonus</p>
                              </div>
                            </div>
                            <button className="bg-yellow-500 text-black font-black py-2.5 px-6 rounded-xl text-sm hover:bg-yellow-400 transition-colors shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                              $ 19.99
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* 이탈 방지 경고 모달 */}
            {pendingAction && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                >
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Unsaved Changes</h2>
                  <p className="text-gray-400 mb-8 text-sm">
                    You have {Object.keys(unsavedPixels).length} unpainted pixels. Do you want to save them before leaving?
                  </p>
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSavePlanet} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
                      Save & Continue
                    </button>
                    <button onClick={() => {
                        setUnsavedPixels({}); 
                        if (pendingAction) pendingAction();
                        setPendingAction(null);
                    }} className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-colors">
                      Discard Changes
                    </button>
                    <button onClick={() => setPendingAction(null)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {isResetModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                >
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Reset Planet</h2>
                  <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                    Are you sure you want to revert to the base map? All your custom pixel artwork will be permanently deleted.
                  </p>
                  <div className="flex gap-3 justify-center w-full">
                    <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                      Cancel
                    </button>
                    <button onClick={handleResetConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                      Wipe Data
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {isProfileModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                >
                  <h2 className="text-xl font-bold text-white mb-6 text-center">Edit Profile</h2>
                  
                  <div className="flex flex-col items-center mb-6">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <div 
                      onClick={handleAvatarClick}
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-3xl text-white shadow-inner relative group cursor-pointer overflow-hidden border border-white/10"
                    >
                      {(avatarPreview || profile.avatar_url) ? (
                        <img src={avatarPreview || profile.avatar_url || undefined} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        editUsername.charAt(0).toUpperCase()
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Username</label>
                      <input 
                        type="text" 
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 w-full mt-8">
                    <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center disabled:opacity-50"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}