import React, { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

// 그리드 해상도 유지 (유저 요청: 건들지 마라)
const GRID_SCALE = 100; 
const GLOBE_RADIUS = 12; 
const VOXEL_SIZE = GLOBE_RADIUS / GRID_SCALE;

const PALETTE = [
  '#ef4444', '#f97316', '#facc15', '#4ade80', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#000000'
];

interface VoxelGlobeProps {
  selectedColor: string;
  targetIds: Set<number>;
  setTargetIds: (ids: Set<number>) => void;
  paintTrigger: number;
  autoRotate: boolean;
  resetTrigger: number;
}

function VoxelGlobe({ selectedColor, targetIds, setTargetIds, paintTrigger, autoRotate, resetTrigger }: VoxelGlobeProps) {
  // 지구본, Hover, Target을 모두 묶어서 함께 회전시킬 그룹 Ref
  const groupRef = useRef<THREE.Group>(null);
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const targetInstancedRef = useRef<THREE.InstancedMesh>(null);
  
  // Shift 클릭 범위 계산을 위한 마지막 클릭 ID 저장
  const lastClickedId = useRef<number | null>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // 유저가 칠한 픽셀들을 저장하는 임시 로컬 DB 역할
  const paintedPixelsRef = useRef<Map<number, string>>(new Map());

  // 실제 지구본 텍스처 데이터를 담을 상태
  const [earthMap, setEarthMap] = useState<ImageData | 'fallback' | null>(null);

  // 1. 진짜 지구 맵 이미지를 비동기로 불러와 픽셀 데이터 추출
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1024, 512);
        setEarthMap(ctx.getImageData(0, 0, 1024, 512));
      }
    };
    img.onerror = () => {
      console.warn("지구 맵을 불러오지 못해 기본 노이즈로 대체합니다.");
      setEarthMap('fallback');
    };
  }, []);

  // 2. 3D 공간을 정수 그리드(Voxel)로 나누어 블록 위치 및 UV 좌표 생성
  const { voxelArray, count } = useMemo(() => {
    const voxels = new Map<string, { pos: [number, number, number], uv: [number, number] }>();
    const samples = 1200000; 
    const offset = 2 / samples;
    const increment = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < samples; i++) {
      const y = ((i * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1 - Math.pow(y, 2));
      const phi = i * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      const vx = Math.round(x * GRID_SCALE);
      const vy = Math.round(y * GRID_SCALE);
      const vz = Math.round(z * GRID_SCALE);
      const key = `${vx},${vy},${vz}`;

      if (!voxels.has(key)) {
        const u = 0.5 + (Math.atan2(z, x) / (2 * Math.PI));
        const v = 0.5 + (Math.asin(y / GLOBE_RADIUS) / Math.PI); 
        voxels.set(key, { pos: [vx, vy, vz], uv: [u, v] });
      }
    }
    return { voxelArray: Array.from(voxels.values()), count: voxels.size };
  }, []);

  // 기본 지구본 색상을 칠하는 함수
  const applyBaseColors = useCallback(() => {
    if (!meshRef.current) return;
    const colorObj = new THREE.Color();

    voxelArray.forEach((v, i) => {
      if (paintedPixelsRef.current.has(i)) {
        colorObj.set(paintedPixelsRef.current.get(i)!);
      } else {
        if (earthMap && earthMap !== 'fallback') {
          const px = Math.floor(v.uv[0] * earthMap.width);
          const py = Math.floor((1 - v.uv[1]) * earthMap.height);
          const idx = (py * earthMap.width + px) * 4;
          
          const r = earthMap.data[idx];
          const g = earthMap.data[idx + 1];
          const b = earthMap.data[idx + 2];
          
          colorObj.setRGB(r / 255, g / 255, b / 255);
        } else {
          const lat = Math.abs(v.pos[1] / GRID_SCALE);
          if (lat > 0.8) colorObj.setHex(0xffffff); 
          else colorObj.setHex(0x1d4ed8);
        }
      }
      meshRef.current!.setColorAt(i, colorObj);
    });
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [voxelArray, earthMap]);

  // 위치 초기화 및 베이스 컬러 맵핑
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    voxelArray.forEach((v, i) => {
      dummy.position.set(v.pos[0] * VOXEL_SIZE, v.pos[1] * VOXEL_SIZE, v.pos[2] * VOXEL_SIZE);
      dummy.rotation.set(0, 0, 0); 
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    
    applyBaseColors();
  }, [voxelArray, dummy, applyBaseColors]);

  // 선택된 타겟(targetIds)이 변경될 때 다중 선택 박스를 InstancedMesh로 즉시 렌더링
  useEffect(() => {
    if (!targetInstancedRef.current) return;
    let i = 0;
    targetIds.forEach(id => {
      const v = voxelArray[id];
      dummy.position.set(v.pos[0] * VOXEL_SIZE, v.pos[1] * VOXEL_SIZE, v.pos[2] * VOXEL_SIZE);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      targetInstancedRef.current!.setMatrixAt(i++, dummy.matrix);
    });
    targetInstancedRef.current.count = targetIds.size;
    targetInstancedRef.current.instanceMatrix.needsUpdate = true;
  }, [targetIds, voxelArray, dummy]);

  // 지구본 회전 - 핵심 수정 사항: 메쉬 하나가 아니라 전체 Group을 회전시킵니다!
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  // 유저가 칠하기 버튼을 누르면 모든 선택된 픽셀들을 덮어씀
  useEffect(() => {
    if (paintTrigger > 0 && targetIds.size > 0 && meshRef.current) {
      const color = new THREE.Color(selectedColor);
      targetIds.forEach(id => {
        paintedPixelsRef.current.set(id, selectedColor);
        meshRef.current!.setColorAt(id, color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
      setTargetIds(new Set()); // 칠한 후 선택 해제
      lastClickedId.current = null;
    }
  }, [paintTrigger]);

  // 초기화 버튼 클릭 시
  useEffect(() => {
    if (resetTrigger > 0 && meshRef.current) {
      paintedPixelsRef.current.clear();
      applyBaseColors();
      setTargetIds(new Set());
      lastClickedId.current = null;
    }
  }, [resetTrigger, applyBaseColors, setTargetIds]);

  // 마우스 이동 (Hover) 시 React 상태를 우회하여 초고속으로 Mesh 위치만 변경
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && hoverMeshRef.current) {
      const pos = voxelArray[e.instanceId].pos;
      hoverMeshRef.current.position.set(pos[0] * VOXEL_SIZE, pos[1] * VOXEL_SIZE, pos[2] * VOXEL_SIZE);
      hoverMeshRef.current.visible = true;
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (hoverMeshRef.current) hoverMeshRef.current.visible = false;
  };

  // 픽셀 클릭 처리 (단일, 누적, 범위 선택)
  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { instanceId, delta } = e;
    
    if (delta <= 2 && instanceId !== undefined) {
      if (e.shiftKey && lastClickedId.current !== null) {
        // [범위 선택] 시작점과 끝점을 모서리로 하는 직육면체(Bounding Box) 범위 내 픽셀 모두 선택
        const start = voxelArray[lastClickedId.current].pos;
        const end = voxelArray[instanceId].pos;
        const minX = Math.min(start[0], end[0]);
        const maxX = Math.max(start[0], end[0]);
        const minY = Math.min(start[1], end[1]);
        const maxY = Math.max(start[1], end[1]);
        const minZ = Math.min(start[2], end[2]);
        const maxZ = Math.max(start[2], end[2]);

        const newTargets = new Set(targetIds);
        voxelArray.forEach((v, idx) => {
          if (v.pos[0] >= minX && v.pos[0] <= maxX &&
              v.pos[1] >= minY && v.pos[1] <= maxY &&
              v.pos[2] >= minZ && v.pos[2] <= maxZ) {
            newTargets.add(idx);
          }
        });
        setTargetIds(newTargets);
        lastClickedId.current = instanceId;
      } else if (e.ctrlKey || e.metaKey) {
        // [누적 선택] 이미 선택된 픽셀이면 해제, 아니면 추가
        const newTargets = new Set(targetIds);
        if (newTargets.has(instanceId)) newTargets.delete(instanceId);
        else newTargets.add(instanceId);
        setTargetIds(newTargets);
        lastClickedId.current = instanceId;
      } else {
        // [단일 선택] 기존 선택 초기화 후 새로 선택
        setTargetIds(new Set([instanceId]));
        lastClickedId.current = instanceId;
      }
    }
  };

  // 핵심 수정: group 태그로 감싸서, 지구본과 마우스 추적 박스들이 완벽하게 똑같이 회전하도록 처리
  return (
    <group ref={groupRef}>
      {/* 1. 실제 지구본 픽셀 메쉬 */}
      <instancedMesh 
        ref={meshRef} 
        args={[null as any, null as any, count]}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE]} />
        <meshStandardMaterial roughness={0.7} metalness={0.1} />
      </instancedMesh>

      {/* 2. 초고속 반응형 Hover 메쉬 */}
      <mesh ref={hoverMeshRef} visible={false}>
        <boxGeometry args={[VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* 3. 다중 선택 확정된 픽셀들을 프레임 드랍 없이 그리는 InstancedMesh 격자선 */}
      <instancedMesh ref={targetInstancedRef} args={[null as any, null as any, count]}>
        <boxGeometry args={[VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

export default function App() {
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [targetIds, setTargetIds] = useState<Set<number>>(new Set());
  const [paintTrigger, setPaintTrigger] = useState<number>(0);
  
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [cameraLocked, setCameraLocked] = useState<boolean>(false); // 뷰 고정용 상태
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const handlePaint = () => {
    if (targetIds.size > 0) {
      setPaintTrigger(prev => prev + 1);
    }
  };

  return (
    <div className="w-full h-screen bg-[#0a0a12] text-white overflow-hidden relative select-none">
      <Canvas camera={{ position: [0, 0, 50], fov: 45 }}>
        <color attach="background" args={['#0a0a12']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[15, 20, 10]} intensity={1.5} />
        <directionalLight position={[-10, -20, -10]} intensity={0.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <VoxelGlobe 
          selectedColor={selectedColor} 
          targetIds={targetIds}
          setTargetIds={setTargetIds}
          paintTrigger={paintTrigger}
          autoRotate={autoRotate}
          resetTrigger={resetTrigger}
        />
        
        {/* cameraLocked가 true면 화면 회전(드래그)을 막아서 오직 칠하는 데 집중하게 합니다 */}
        <OrbitControls 
          enablePan={false} 
          minDistance={13} 
          maxDistance={50} 
          rotateSpeed={0.4}
          dampingFactor={0.1}
          enableRotate={!cameraLocked} 
          makeDefault 
        />
      </Canvas>
      
      <div className="absolute top-6 left-6 pointer-events-none">
        <h1 className="text-2xl font-bold">My Personal Planet</h1>
        <p className="text-gray-400 text-sm">
          클릭: 단일 선택 | Ctrl+클릭: 다중 누적 | Shift+클릭: 범위 선택
        </p>
      </div>

      {/* 우측 사이드 버튼 (회전 토글 / 카메라 고정 / 초기화) */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-4 z-10">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg border ${
            autoRotate 
              ? 'bg-[#1e1e24] border-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
          }`}
          title={autoRotate ? "회전 멈추기" : "자동 회전 시작"}
        >
          <span className="text-xl leading-none mb-1">{autoRotate ? '⏸' : '▶️'}</span>
          <span className="text-[10px] font-bold leading-none">{autoRotate ? 'STOP' : 'PLAY'}</span>
        </button>

        {/* 화면 고정(드래그 방지) 버튼 */}
        <button
          onClick={() => setCameraLocked(!cameraLocked)}
          className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg border ${
            cameraLocked 
              ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
              : 'bg-[#1e1e24] border-gray-600 hover:bg-gray-700 text-white'
          }`}
          title={cameraLocked ? "화면 고정 해제" : "화면 고정 (칠하기 모드)"}
        >
          <span className="text-xl leading-none mb-1">{cameraLocked ? '🔒' : '🔓'}</span>
          <span className="text-[10px] font-bold leading-none">{cameraLocked ? 'LOCK' : 'FREE'}</span>
        </button>

        <button
          onClick={() => setResetTrigger(prev => prev + 1)}
          className="w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-lg border bg-red-600 hover:bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]"
          title="지구 초기화"
        >
          <span className="text-xl leading-none mb-1">↺</span>
          <span className="text-[10px] font-bold leading-none">RESET</span>
        </button>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="bg-[#1e1e24] p-3 rounded-2xl flex gap-3 shadow-xl border border-gray-700">
          {PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-110 flex items-center justify-center ${
                selectedColor === color ? 'ring-2 ring-white scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <button
          onClick={handlePaint}
          disabled={targetIds.size === 0}
          className={`px-8 py-3 rounded-full font-bold text-lg transition-all duration-200 shadow-lg border ${
            targetIds.size > 0
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)] cursor-pointer hover:scale-105'
              : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-70'
          }`}
        >
          {targetIds.size > 0 ? `🎨 칠하기 (${targetIds.size}개)` : '픽셀을 먼저 선택하세요'}
        </button>
      </div>
    </div>
  );
}