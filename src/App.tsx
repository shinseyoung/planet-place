import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, Video, Share2, RotateCcw, 
  Settings, RefreshCw, Move, Sparkles, EyeOff, 
  Eye, Library, Download, LogOut, Moon, Save, 
  AlertTriangle, Edit2, Lock, ShoppingCart, Wand2, Zap, Globe
} from 'lucide-react';
import LandingPage from './pages/LandingPage';
import { supabase } from './lib/supabase';
import { cn } from './lib/utils';
import { PaletteSidebar } from './components/ui/PaletteSidebar';
import { ToggleSwitch } from './components/ui/ToggleSwitch';
import { FloatingDock } from './components/ui/FloatingDock';
import { BASIC_PALETTE, type PixelData } from './constants/theme'; 
import { VoxelGlobe, CustomStars, ThumbnailCapturer } from './components/3d/VoxelGlobe';

// @ts-ignore
import earthSeedCsvUrl from './assets/earth_seed.csv?url';

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

  // Palette State
  const [selectedColor, setSelectedColor] = useState<string>(BASIC_PALETTE[0]);
  const [recentColors, setRecentColors] = useState<string[]>(Array(8).fill('')); 
  const [unlockedPacks, setUnlockedPacks] = useState<number[]>([]);
  const [unlockPrompt, setUnlockPrompt] = useState<{name: string, index: number} | null>(null);
  
  // 기능 해금용 팝업 State
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>([]);
  const [featurePrompt, setFeaturePrompt] = useState<{id: string, name: string, price: number} | null>(null);
  
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
  
  const [isSavingPlanet, setIsSavingPlanet] = useState(false);
  const [captureTrigger, setCaptureTrigger] = useState(0);
  const [initialCaptureDone, setInitialCaptureDone] = useState<Record<number, boolean>>({});

  const initPlanets = async (user: any) => {
    const userId = user.id;
    const { data, error } = await supabase.from('planets').select('*').eq('user_id', userId);
    if (error) {
      console.error("Planets fetch error:", error);
      return;
    }

    if (!data || data.length === 0) {
      const initData = [
        { id: `${userId}_1`, user_id: userId, slot_number: 1, name: 'Origin Earth', is_unlocked: true }
      ];
      // 409 방지: ignoreDuplicates true 추가
      await supabase.from('planets').upsert(initData, { onConflict: 'id', ignoreDuplicates: true });
      
      setPlanetNames({ 1: 'Origin Earth', 2: 'Locked Slot', 3: 'Locked Slot' });
      setPlanetUnlocked({ 1: true, 2: false, 3: false });
      setPlanetThumbnails({ 1: null, 2: null, 3: null });
      setPlanetSlots([
        { id: 1, isEmpty: false },
        { id: 2, isEmpty: true },
        { id: 3, isEmpty: true }
      ]);
    } else {
      const names: Record<number, string> = { 1: 'Locked Slot', 2: 'Locked Slot', 3: 'Locked Slot' };
      const unlocked: Record<number, boolean> = { 1: false, 2: false, 3: false };
      const thumbnails: Record<number, string | null> = { 1: null, 2: null, 3: null };
      
      const slots = [1, 2, 3].map(slotNum => {
        const dbSlot = data.find(p => p.slot_number === slotNum);
        if (dbSlot) {
          names[slotNum] = dbSlot.name;
          unlocked[slotNum] = dbSlot.is_unlocked;
          thumbnails[slotNum] = dbSlot.thumbnail_url;
          return { id: slotNum, isEmpty: !dbSlot.is_unlocked || dbSlot.name === 'Empty Slot' || dbSlot.name === 'Locked Slot' };
        }
        return { id: slotNum, isEmpty: true };
      });
      
      setPlanetNames(names);
      setPlanetUnlocked(unlocked);
      setPlanetThumbnails(thumbnails);
      setPlanetSlots(slots);
    }
  };

  useEffect(() => {
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
        fetchProfile(session.user);
        initPlanets(session.user);
      } else {
        setLoadingAuth(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
        initPlanets(session.user);
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

  const fetchProfile = async (user: any) => {
    const userId = user.id;
    // 구글 등 OAuth 로그인 시 가져오는 메타데이터 정보 활용
    const meta = user.user_metadata || {};
    const googleName = meta.full_name || meta.name || 'Explorer';
    const googleAvatar = meta.avatar_url || null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        let currentUsername = data.username;
        let currentAvatar = data.avatar_url;

        // DB에 유저가 존재하지만 이름이 없거나 'Explorer'로 되어있을 경우, 구글 이름으로 덮어쓰기 로직 보강
        if ((!currentUsername || currentUsername === 'Explorer') && googleName !== 'Explorer') {
            currentUsername = googleName;
            await supabase.from('profiles').update({ username: googleName }).eq('id', userId);
        }
        
        if (!currentAvatar && googleAvatar) {
            currentAvatar = googleAvatar;
            await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', userId);
        }

        setProfile({ 
          username: currentUsername, 
          avatar_url: currentAvatar 
        });
        setEditUsername(currentUsername);
        
        if (data.points !== undefined && data.points !== null) {
          setUserPoints(data.points);
        }
        
        // 텍스트, 배열 모든 경우를 대비한 강력한 파싱
        if (data.unlocked_pack_ids) {
          if (Array.isArray(data.unlocked_pack_ids)) {
            setUnlockedPacks(data.unlocked_pack_ids.map(Number));
          } else if (typeof data.unlocked_pack_ids === 'string') {
            try {
              const parsed = data.unlocked_pack_ids.startsWith('{') 
                ? data.unlocked_pack_ids.replace(/^{|}$/g, '').split(',') 
                : JSON.parse(data.unlocked_pack_ids);
              setUnlockedPacks(parsed.map(Number));
            } catch(e) {}
          }
        }

        if (data.unlocked_features) {
          if (Array.isArray(data.unlocked_features)) {
            setUnlockedFeatures(data.unlocked_features);
          } else if (typeof data.unlocked_features === 'string') {
            try {
              const parsed = data.unlocked_features.startsWith('{') 
                ? data.unlocked_features.replace(/^{|}$/g, '').split(',').map((s: string) => s.replace(/"/g, '').trim()) 
                : JSON.parse(data.unlocked_features);
              setUnlockedFeatures(parsed.filter(Boolean));
            } catch(e) {}
          }
        }

      } else {
         // 신규 가입 시 구글 정보 그대로 사용! (ignoreDuplicates 삭제하여 확실한 업데이트 보장)
         const { error: insertError } = await supabase.from('profiles').upsert(
           [{ id: userId, username: googleName, avatar_url: googleAvatar, points: 0, unlocked_pack_ids: [], unlocked_features: [] }],
           { onConflict: 'id' } 
         );
         if(!insertError) {
             setProfile({ username: googleName, avatar_url: googleAvatar });
             setEditUsername(googleName);
             setUserPoints(0);
             setUnlockedPacks([]);
             setUnlockedFeatures([]);
         }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!session?.user || !editUsername.trim()) return;
    setIsSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ username: editUsername.trim() }).eq('id', session.user.id);
      if (error) throw error;
      setProfile(prev => ({ ...prev, username: editUsername.trim() }));
      setIsProfileModalOpen(false);
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

  const handlePurchasePack = async (packIndex: number, price: number) => {
    if (!session) {
      alert("로그인이 필요합니다.");
      setUnlockPrompt(null);
      return;
    }
    
    if (userPoints < price) {
      alert("포인트가 부족합니다. 스토어에서 포인트를 충전해주세요.");
      setIsStoreModalOpen(true);
      setActiveStoreTab('points');
      setUnlockPrompt(null);
      return;
    }

    try {
      const { error: pointError } = await supabase
        .from('profiles')
        .update({ points: userPoints - price })
        .eq('id', session.user.id);
        
      if (pointError) throw pointError;

      const newUnlockedPacks = [...unlockedPacks, packIndex];
      const { error: unlockError } = await supabase
        .from('profiles')
        .update({ unlocked_pack_ids: newUnlockedPacks })
        .eq('id', session.user.id);
        
      if (unlockError) throw unlockError;

      setUserPoints(prev => prev - price);
      setUnlockedPacks(newUnlockedPacks);
      alert("색상 팩을 성공적으로 구매했습니다!");
    } catch (err) {
      console.error(err);
      alert("구매 중 오류가 발생했습니다.");
    } finally {
      setUnlockPrompt(null);
    }
  };

  const handlePurchaseFeature = async (featureId: string, price: number) => {
    if (!session) {
      alert("로그인이 필요합니다.");
      setFeaturePrompt(null);
      return;
    }
    
    if (userPoints < price) {
      alert("포인트가 부족합니다. 스토어에서 포인트를 충전해주세요.");
      setIsStoreModalOpen(true);
      setActiveStoreTab('points');
      setFeaturePrompt(null);
      return;
    }

    try {
      const { error: pointError } = await supabase
        .from('profiles')
        .update({ points: userPoints - price })
        .eq('id', session.user.id);
        
      if (pointError) throw pointError;

      const newUnlockedFeatures = [...unlockedFeatures, featureId];
      const { error: unlockError } = await supabase
        .from('profiles')
        .update({ unlocked_features: newUnlockedFeatures })
        .eq('id', session.user.id);
        
      if (unlockError) throw unlockError;

      setUserPoints(prev => prev - price);
      setUnlockedFeatures(newUnlockedFeatures);
      alert("기능을 성공적으로 해금했습니다!");
    } catch (err) {
      console.error(err);
      alert("구매 중 오류가 발생했습니다.");
    } finally {
      setFeaturePrompt(null);
    }
  };


  const confirmFeaturePurchase = async () => {
    if (!featurePrompt || !session?.user) return;

    if (userPoints < featurePrompt.price) {
      setFeaturePrompt(null);
      setIsStoreModalOpen(true);
      setActiveStoreTab('points');
      return;
    }

    if (featurePrompt.id === 'planet_slot') {
      const nextSlotId = planetUnlocked[2] ? (planetUnlocked[3] ? null : 3) : 2;
      
      if (!nextSlotId) {
         alert("이미 모든 행성 슬롯을 해금하셨습니다!");
         setFeaturePrompt(null);
         return;
      }

      const newPoints = userPoints - featurePrompt.price;
      
      setUserPoints(newPoints);
      setPlanetUnlocked(prev => ({ ...prev, [nextSlotId]: true }));
      setPlanetNames(prev => ({ ...prev, [nextSlotId]: 'Empty Slot' }));
      
      setFeaturePrompt(null);
      setIsStoreModalOpen(false); 
      
      try {
        const { error: profileError } = await supabase
           .from('profiles')
           .update({ points: newPoints })
           .eq('id', session.user.id);
           
        if (profileError) throw profileError;

        const { error: planetError } = await supabase
           .from('planets')
           .insert([{
              id: `${session.user.id}_${nextSlotId}`,
              user_id: session.user.id,
              slot_number: nextSlotId,
              name: 'Empty Slot',
              is_unlocked: true
           }]);

        if (planetError) throw planetError;
      } catch(error) {
         console.error("Slot unlock failed:", error);
         alert("슬롯 해금 중 서버 오류가 발생했습니다. 브라우저를 새로고침 해주세요.");
         fetchProfile(session.user.id);
         initPlanets(session.user.id);
      }
    } else {
      // 일반 프리미엄 도구 해금
      handlePurchaseFeature(featurePrompt.id, featurePrompt.price);
    }
  };

  const unlockedSlotsCount = Object.values(planetUnlocked).filter(Boolean).length;
  const isSlotMaxed = unlockedSlotsCount >= 3;


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
                                  alert('상점(Store)에서 슬롯을 구매해야 사용할 수 있습니다.');
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
                            { label: 'Auto Rotation', state: autoRotate, fn: () => setAutoRotate(!autoRotate), icon: RefreshCw },
                            { label: 'Free Camera', state: freeCamera, fn: () => setFreeCamera(!freeCamera), icon: Move },
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

                <PaletteSidebar
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                  recentColors={recentColors}
                  unlockedPacks={unlockedPacks}
                  setUnlockPrompt={setUnlockPrompt}
                  unlockedFeatures={unlockedFeatures}
                  setFeaturePrompt={setFeaturePrompt}
                  targetIds={targetIds}
                  handlePaint={handlePaint}
                  envStates={{
                    Sunlight: sunLighting,
                    Stars: showStars,
                    Nebula: false,
                    Aurora: false,
                  }}
                  onToggleEnv={(envId) => {
                    if (envId === 'Sunlight') setSunLighting(prev => !prev);
                    if (envId === 'Stars') setShowStars(prev => !prev);
                  }}
                />

              </motion.div>
            )}
          </AnimatePresence>

          {/* --- Modals --- */}
          <AnimatePresence>
            {/* 해금 확인 모달 (Micro-transaction) */}
            {unlockPrompt && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
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
                      onClick={() => handlePurchasePack(unlockPrompt.index, 100)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                      {userPoints >= 100 ? 'Unlock (100 P)' : 'Go to Point Shop'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* 프리미엄 기능 해금 확인 모달 */}
            {featurePrompt && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-[#0a0a12]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Sparkles className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Unlock Feature</h2>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    <span className="text-white font-bold">{featurePrompt.name}</span> 기능을<br/>
                    <span className="text-emerald-400 font-bold">{featurePrompt.price} P</span>로 해금하시겠습니까?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setFeaturePrompt(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/5">
                      Cancel
                    </button>
                    <button 
                      onClick={confirmFeaturePurchase}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    >
                      {userPoints >= featurePrompt.price ? `Unlock` : 'Go to Point Shop'}
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
                            <button 
                               onClick={() => setFeaturePrompt({ id: 'planet_slot', name: '행성 슬롯 추가 (+1)', price: 500 })}
                               disabled={isSlotMaxed}
                               className={cn(
                                 "py-2.5 px-5 rounded-xl font-bold transition-colors text-sm whitespace-nowrap shrink-0",
                                 isSlotMaxed ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                               )}>
                              {isSlotMaxed ? 'Max Reached' : '500 P'}
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
                            <button 
                              onClick={() => setFeaturePrompt({ id: 'paint_pack', name: '스마트 페인트 팩', price: 300 })}
                              className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors text-sm whitespace-nowrap shrink-0"
                            >
                              {unlockedFeatures.includes('paint_pack') ? 'Owned' : '300 P'}
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
                            <button 
                              onClick={() => {
                                if (!unlockedFeatures.includes('hologram')) {
                                  setFeaturePrompt({ id: 'hologram', name: '홀로그램 트레이싱', price: 1000 });
                                }
                              }}
                              className={cn(
                                "py-2.5 px-5 rounded-xl font-bold transition-colors text-sm whitespace-nowrap shrink-0",
                                unlockedFeatures.includes('hologram') ? "bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                              )}
                            >
                              {unlockedFeatures.includes('hologram') ? 'Owned' : '1,000 P'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-900/40 to-blue-900/10 border border-blue-500/30 rounded-2xl p-6 text-center relative overflow-hidden group hover:border-blue-400 transition-colors">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-2xl border border-blue-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <Sparkles className="w-8 h-8 text-blue-400" />
                            </div>
                            <h4 className="text-xl font-black text-white mb-1">500 P</h4>
                            <p className="text-xs text-blue-200/60 mb-6">Starter Pack</p>
                            <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-colors">$4.99</button>
                          </div>

                          <div className="bg-gradient-to-br from-purple-900/50 to-purple-900/20 border border-purple-500/50 rounded-2xl p-6 text-center relative overflow-hidden group hover:border-purple-400 transition-colors transform scale-105 shadow-2xl z-10">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Most Popular</div>
                            <div className="w-16 h-16 mx-auto bg-purple-500/30 rounded-2xl border border-purple-400/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <Zap className="w-8 h-8 text-purple-300" />
                            </div>
                            <h4 className="text-xl font-black text-white mb-1">1,200 P</h4>
                            <p className="text-xs text-purple-200/60 mb-6">+200 Bonus Points</p>
                            <button className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-colors">$9.99</button>
                          </div>

                          <div className="bg-gradient-to-br from-amber-900/40 to-amber-900/10 border border-amber-500/30 rounded-2xl p-6 text-center relative overflow-hidden group hover:border-amber-400 transition-colors">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-2xl border border-amber-400/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                              <Globe className="w-8 h-8 text-amber-400" />
                            </div>
                            <h4 className="text-xl font-black text-white mb-1">3,000 P</h4>
                            <p className="text-xs text-amber-200/60 mb-6">Creator Tier</p>
                            <button className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-[0_0_15px_rgba(217,119,6,0.4)] transition-colors">$19.99</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Reset Planet 모달 */}
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

          {/* 프로필 편집 모달 */}
          {isProfileModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 pointer-events-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
                
                <div className="relative z-10 w-24 h-24 mb-4">
                  <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} alt="avatar" className="w-full h-full rounded-full border-4 border-slate-900 bg-slate-800 shadow-xl" />
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-2 border-slate-900 flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                <h2 className="text-2xl font-black text-white mb-1 z-10">{profile?.username}</h2>
                <p className="text-sm text-blue-400 font-medium mb-8 z-10 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {userPoints} Points</p>

                <div className="w-full space-y-4 z-10">
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

                <div className="flex gap-3 w-full mt-8 z-10">
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
        </>
      )}
    </div>
  );
}