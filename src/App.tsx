import { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Image as ImageIcon, Video, Share2, RotateCcw, 
  Settings, RefreshCw, Move, Sparkles, EyeOff, 
  ChevronDown, Check, Eye, Library, Download, Menu
} from 'lucide-react';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 3D Globe Constants ---
const GRID_SCALE = 100; 
const GLOBE_RADIUS = 12; 
const VOXEL_SIZE = GLOBE_RADIUS / GRID_SCALE;

const PALETTE = [
  '#ef4444', '#f97316', '#facc15', '#4ade80', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#000000'
];

// --- Mock Data ---
const MOCK_PLANETS = [
  { id: 1, name: 'Origin Earth', date: '2026.07.20', isEmpty: false, image: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&q=80&w=100&h=100' },
  { id: 2, name: 'Cyberpunk Seoul', date: '2026.07.21', isEmpty: false, image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=100&h=100' },
  { id: 3, name: '', date: '', isEmpty: true, image: '' }
];

// ==========================================
// 1. 3D Voxel Globe Component
// ==========================================
interface VoxelGlobeProps {
  selectedColor: string;
  targetIds: Set<number>;
  setTargetIds: (ids: Set<number>) => void;
  paintTrigger: number;
  autoRotate: boolean;
  resetTrigger: number;
}

function VoxelGlobe({ selectedColor, targetIds, setTargetIds, paintTrigger, autoRotate, resetTrigger }: VoxelGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoverMeshRef = useRef<THREE.Mesh>(null);
  const targetInstancedRef = useRef<THREE.InstancedMesh>(null);
  const lastClickedId = useRef<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const paintedPixelsRef = useRef<Map<number, string>>(new Map());
  const [earthMap, setEarthMap] = useState<ImageData | 'fallback' | null>(null);

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
    img.onerror = () => setEarthMap('fallback');
  }, []);

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

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  useEffect(() => {
    if (paintTrigger > 0 && targetIds.size > 0 && meshRef.current) {
      const color = new THREE.Color(selectedColor);
      targetIds.forEach(id => {
        paintedPixelsRef.current.set(id, selectedColor);
        meshRef.current!.setColorAt(id, color);
      });
      meshRef.current.instanceColor!.needsUpdate = true;
      setTargetIds(new Set()); 
      lastClickedId.current = null;
    }
  }, [paintTrigger]);

  useEffect(() => {
    if (resetTrigger > 0 && meshRef.current) {
      paintedPixelsRef.current.clear();
      applyBaseColors();
      setTargetIds(new Set());
      lastClickedId.current = null;
    }
  }, [resetTrigger, applyBaseColors, setTargetIds]);

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

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { instanceId, delta } = e;
    if (delta <= 2 && instanceId !== undefined) {
      if (e.shiftKey && lastClickedId.current !== null) {
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
        const newTargets = new Set(targetIds);
        if (newTargets.has(instanceId)) newTargets.delete(instanceId);
        else newTargets.add(instanceId);
        setTargetIds(newTargets);
        lastClickedId.current = instanceId;
      } else {
        setTargetIds(new Set([instanceId]));
        lastClickedId.current = instanceId;
      }
    }
  };

  return (
    <group ref={groupRef}>
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
      <mesh ref={hoverMeshRef} visible={false}>
        <boxGeometry args={[VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05, VOXEL_SIZE * 1.05]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <instancedMesh ref={targetInstancedRef} args={[null as any, null as any, count]}>
        <boxGeometry args={[VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15, VOXEL_SIZE * 1.15]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

// ==========================================
// 2. UI Components (Toggle, Modals)
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

// ==========================================
// 3. Floating Dock Components (Adapted for App)
// ==========================================
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
        <motion.div
          style={{ width: widthIcon, height: heightIcon }}
          className="flex items-center justify-center text-gray-300"
        >
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
  // Core State
  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [targetIds, setTargetIds] = useState<Set<number>>(new Set());
  const [paintTrigger, setPaintTrigger] = useState<number>(0);
  
  // App Settings State
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [freeCamera, setFreeCamera] = useState<boolean>(true); 
  const [showStars, setShowStars] = useState<boolean>(true);
  const [showUI, setShowUI] = useState<boolean>(true);
  const [performance, setPerformance] = useState<'Eco' | 'Standard' | 'Ultra'>('Standard');
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Popup & Modals State
  const [isMyPlanetsOpen, setIsMyPlanetsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activePlanetId, setActivePlanetId] = useState(1);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handlePaint = () => {
    if (targetIds.size > 0) setPaintTrigger(prev => prev + 1);
  };

  const handleResetConfirm = () => {
    setResetTrigger(prev => prev + 1);
    setIsResetModalOpen(false);
  };

  // Dock items configuration
  const dockItems = [
    {
      title: "My Planets",
      icon: <Library className="h-full w-full" />,
      onClick: () => {
        setIsMyPlanetsOpen(!isMyPlanetsOpen);
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
      }
    },
    {
      title: "Settings",
      icon: <Settings className="h-full w-full" />,
      onClick: () => {
        setIsSettingsOpen(!isSettingsOpen);
        setIsMyPlanetsOpen(false);
        setIsExportOpen(false);
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
        <div className="h-full w-full rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white shadow-inner text-[10px]">
          A
        </div>
      ),
      onClick: () => setIsProfileModalOpen(true)
    },
  ];

  return (
    <div className="w-full h-screen bg-[#050505] text-white overflow-hidden relative select-none">
      
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 50], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[15, 20, 10]} intensity={1.5} />
        <directionalLight position={[-10, -20, -10]} intensity={0.5} />
        {showStars && (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        )}
        
        <VoxelGlobe 
          selectedColor={selectedColor} 
          targetIds={targetIds}
          setTargetIds={setTargetIds}
          paintTrigger={paintTrigger}
          autoRotate={autoRotate}
          resetTrigger={resetTrigger}
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
      </Canvas>

      {/* Hide UI Recovery Button */}
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

      {/* Main UI Layer */}
      <AnimatePresence>
        {showUI && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            
            {/* Top Left Logo (Independent from Sidebar) */}
            <div className="absolute top-6 left-6 z-40 flex items-center gap-3 bg-black/40 backdrop-blur-2xl border border-white/10 py-2.5 pl-2.5 pr-6 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.5)] pointer-events-auto">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                <div className="w-4 h-4 bg-black rounded-full"></div>
              </div>
              <span className="text-lg font-bold tracking-wider text-white">Planet Studio</span>
            </div>

            {/* Bottom Center Floating Popups (My Planets, Export, Settings) */}
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
                      {MOCK_PLANETS.map((planet) => (
                        <div 
                          key={planet.id}
                          onClick={() => setActivePlanetId(planet.id)}
                          className={cn(
                            "flex items-center w-full p-2 rounded-2xl cursor-pointer transition-all border",
                            activePlanetId === planet.id ? "bg-blue-600/20 border-blue-500/50" : "hover:bg-white/10 border-transparent"
                          )}
                        >
                          <div className="w-10 h-10 rounded-[1rem] bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                            {planet.isEmpty ? <span className="text-gray-500 text-xs">+</span> : <img src={planet.image} className="w-full h-full object-cover" alt="planet" />}
                          </div>
                          <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap pl-3">
                            <span className="text-sm font-bold text-gray-200 truncate leading-none mb-1.5">{planet.isEmpty ? 'Empty Slot' : planet.name}</span>
                            <span className="text-[10px] text-gray-500 truncate leading-none">{planet.isEmpty ? 'No Planet' : `Created ${planet.date}`}</span>
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
                      <div className="flex items-center justify-between pt-3 border-t border-white/10">
                        <span className="text-sm font-medium text-gray-300 whitespace-nowrap pl-1">Performance</span>
                        <div className="relative group cursor-pointer flex items-center gap-1">
                          <span className="text-sm text-blue-400 font-bold">{performance}</span>
                          <ChevronDown className="w-4 h-4 text-blue-400" />
                          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-[#1a1a24] border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden min-w-[100px]">
                            {['Eco', 'Standard', 'Ultra'].map(p => (
                              <div 
                                key={p} 
                                onClick={() => setPerformance(p as any)}
                                className="px-4 py-2 text-sm hover:bg-blue-600/30 text-gray-200 hover:text-white"
                              >{p}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Center Floating Dock */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
              <FloatingDock items={dockItems} />
            </div>

            {/* Right Toolkit (Floating Capsule Style) */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 pointer-events-auto z-30">
              <div className="bg-black/40 backdrop-blur-2xl p-4 rounded-[2rem] flex flex-col items-center gap-5 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                
                {/* Current Color Indicator */}
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className="w-12 h-12 rounded-full border-4 border-[#1e1e24] shadow-lg" style={{ backgroundColor: selectedColor }} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Color</span>
                </div>

                {/* Palette Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 flex items-center justify-center",
                        selectedColor === color ? 'ring-2 ring-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]' : ''
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <div className="w-full h-px bg-white/10 my-1" />

                {/* Paint Button */}
                <button
                  onClick={handlePaint}
                  disabled={targetIds.size === 0}
                  className={cn(
                    "w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border shadow-lg group relative overflow-hidden",
                    targetIds.size > 0
                      ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer'
                      : 'bg-white/5 border-white/5 cursor-not-allowed opacity-50'
                  )}
                >
                  <span className={cn("text-2xl mb-1 transition-transform", targetIds.size > 0 && "group-hover:scale-110")}>🎨</span>
                  <span className="text-[10px] font-bold text-white tracking-wider">PAINT</span>
                  
                  {/* Selected Count Badge */}
                  {targetIds.size > 0 && (
                    <div className="absolute top-1 right-1 bg-white text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center">
                      {targetIds.size}
                    </div>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Modals --- */}
      <AnimatePresence>
        {isResetModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
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
                Are you sure you want to annihilate this planet? All your pixel artwork will be lost forever.
              </p>
              <div className="flex gap-3 justify-center w-full">
                <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                  Cancel
                </button>
                <button onClick={handleResetConfirm} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                  Annihilate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isProfileModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#0a0a12]/80 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
              
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-3xl text-white shadow-inner mb-3 relative group cursor-pointer">
                  A
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </div>
                <span className="text-xs text-blue-400 cursor-pointer hover:underline">Change Avatar</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Username</label>
                  <input type="text" defaultValue="Andrew Luo" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Handle</label>
                  <input type="text" defaultValue="@andrew_dev" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
              </div>

              <div className="flex gap-3 w-full mt-8">
                <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                  Cancel
                </button>
                <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}