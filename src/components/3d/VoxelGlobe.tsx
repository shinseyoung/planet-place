import { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { GLOBE_RADIUS, MAP_WIDTH, MAP_HEIGHT, VOXEL_SIZE, type PixelData } from '../../constants/theme';

export function CustomStars({ darkMode }: { darkMode: boolean }) {
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

export function ThumbnailCapturer({ captureTrigger, onCaptured }: { captureTrigger: number, onCaptured: (base64: string | null) => void }) {
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
  // 🪐 basePixels가 일부(대륙 등)만 채워진 데이터일 때 나머지 칸을 채울 기본색.
  // Moon/Mars/Saturn/Sun/Inverted Earth처럼 180,000픽셀이 전부 채워진 데이터를 쓸 땐
  // 이 값이 실질적으로 보이지 않으므로 App.tsx에서 null-safe한 값을 내려줍니다.
  baseDefaultColor?: string;
}

export function VoxelGlobe({ selectedColor, targetIds, setTargetIds, paintTrigger, autoRotate, basePixels, serverDataMap, unsavedPixels, setUnsavedPixels, baseDefaultColor = '#0E336B' }: VoxelGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const targetInstancedRef = useRef<THREE.InstancedMesh>(null);
  const lastClickedId = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
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

  const { renderMap, idToCanonical } = useMemo(() => {
    const map = new Map<string, { pos: THREE.Vector3, color: string, id: number }>();
    const idMap = new Map<number, number>();

    if (basePixels.length === 0) return { renderMap: map, idToCanonical: idMap };

    for (let id = 0; id < MAP_WIDTH * MAP_HEIGHT; id++) {
      const x = id % MAP_WIDTH;
      const y = Math.floor(id / MAP_WIDTH);
      const pos = get3DPos(x, y);
      const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;

      if (!map.has(key)) {
        map.set(key, { pos, color: baseDefaultColor, id: id }); 
      }
      idMap.set(id, map.get(key)!.id); 
    }

    basePixels.forEach(p => {
      const pos = get3DPos(p.x, p.y);
      const key = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`;
      if (map.has(key)) {
        map.get(key)!.color = p.color;
      }
    });

    return { renderMap: map, idToCanonical: idMap };
  }, [basePixels, get3DPos, baseDefaultColor]);

  useLayoutEffect(() => {
    if (!meshRef.current || renderMap.size === 0) return;
    
    const finalMap = new Map();
    renderMap.forEach((val, key) => {
        finalMap.set(key, { ...val });
    });

    const applyOverrides = (pixels: Record<number, string>) => {
       Object.entries(pixels).forEach(([idStr, color]) => {
          const id = parseInt(idStr, 10);
          const canonicalId = idToCanonical.get(id) ?? id; 
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

  const getGridFromRay = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!e.uv || !groupRef.current) return null;

    const invMat = new THREE.Matrix4().copy(groupRef.current.matrixWorld).invert();
    const localRay = new THREE.Ray().copy(e.ray).applyMatrix4(invMat);

    const approxX = Math.floor(e.uv.x * MAP_WIDTH);
    const approxY = Math.floor((1 - e.uv.y) * MAP_HEIGHT);

    const halfSize = VOXEL_SIZE / 2;
    let closestId: number | null = null;
    let minDistance = Infinity;

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        let nx = approxX + dx;
        let ny = approxY + dy;

        if (nx < 0) nx += MAP_WIDTH;
        if (nx >= MAP_WIDTH) nx -= MAP_WIDTH;
        if (ny < 0 || ny >= MAP_HEIGHT) continue;

        const rawId = ny * MAP_WIDTH + nx;
        const canonicalId = idToCanonical.get(rawId) ?? rawId; 

        const cx = canonicalId % MAP_WIDTH;
        const cy = Math.floor(canonicalId / MAP_WIDTH);
        const pos = get3DPos(cx, cy);

        mathMin.set(pos.x - halfSize, pos.y - halfSize, pos.z - halfSize);
        mathMax.set(pos.x + halfSize, pos.y + halfSize, pos.z + halfSize);
        mathBox.set(mathMin, mathMax);

        if (localRay.intersectBox(mathBox, mathIntersect)) {
          const dist = localRay.origin.distanceToSquared(mathIntersect);
          if (dist < minDistance) {
            minDistance = dist;
            closestId = canonicalId;
          }
        }
      }
    }

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
    <>
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

      <mesh 
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onPointerUp={handlePointerUp}
      >
        <sphereGeometry args={[GLOBE_RADIUS + (VOXEL_SIZE * 1.5), 64, 64]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
    </>
  );
}