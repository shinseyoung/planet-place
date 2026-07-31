import { useMemo, useState } from 'react';
import { Search, Lock, Unlock, Globe, Sparkles, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BASIC_PALETTE, THEME_PACKS } from '../../constants/theme';

interface PaletteSidebarProps {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  recentColors: string[];
  unlockedPacks: number[];
  setUnlockPrompt: (prompt: { name: string; index: number } | null) => void;
  unlockedFeatures: string[];
  setFeaturePrompt: (prompt: { id: string; name: string; price: number } | null) => void;
  targetIds: Set<number>;
  handlePaint: () => void;
  
  // ⭐️ 부모(App.tsx)로부터 환경 설정 상태와 토글 함수를 전달받습니다!
  envStates: Record<string, boolean>;
  onToggleEnv: (envId: string) => void;

  // 🪐 부모(App.tsx)로부터 Planet Base 선택 상태와 변경 함수를 전달받습니다!
  selectedBase: string;
  onSelectBase: (baseId: string) => void;
}

const PLANET_BASES = [
  { id: 'Earth', name: 'Earth', price: 0, defaultUnlocked: true },
  { id: 'Moon', name: 'Moon', price: 500, defaultUnlocked: false },
  { id: 'Mars', name: 'Mars', price: 500, defaultUnlocked: false },
  { id: 'Sun', name: 'Sun', price: 500, defaultUnlocked: false },
  { id: 'White', name: 'White', price: 500, defaultUnlocked: false },
];

const ENVIRONMENTS = [
  { id: 'Sunlight', name: 'Sunlight', price: 0, defaultUnlocked: true },
  { id: 'Stars', name: 'Stars', price: 0, defaultUnlocked: true },
];

export function PaletteSidebar({
  selectedColor,
  setSelectedColor,
  recentColors,
  unlockedPacks,
  setUnlockPrompt,
  unlockedFeatures,
  setFeaturePrompt,
  targetIds,
  handlePaint,
  envStates,     // ⭐️ Props 추가
  onToggleEnv,   // ⭐️ Props 추가
  selectedBase,  // 🪐 Props 추가
  onSelectBase   // 🪐 Props 추가
}: PaletteSidebarProps) {
  const [paletteSearch, setPaletteSearch] = useState('');
  const [paletteTab, setPaletteTab] = useState<'all' | 'theme' | 'country'>('all');
  
  const [isPacksExpanded, setIsPacksExpanded] = useState(false);
  const [activeModal, setActiveModal] = useState<'base' | 'env' | null>(null);
  
  // 💡 기존에 있던 내부 useState(envStates / selectedBase)는 완전히 삭제하여 부모에게 제어권을 넘겼습니다!

  const packsWithIndex = useMemo(() => {
    return THEME_PACKS.map((pack, idx) => ({ ...pack, originalIndex: idx }));
  }, []);

  const filteredAndSortedPacks = useMemo(() => {
    let filtered = packsWithIndex;
    
    if (paletteTab !== 'all') {
      filtered = filtered.filter(p => p.type === paletteTab);
    }
    
    if (paletteSearch.trim()) {
      const lowerSearch = paletteSearch.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    
    return filtered.sort((a, b) => {
      const aUnlocked = unlockedPacks.includes(a.originalIndex);
      const bUnlocked = unlockedPacks.includes(b.originalIndex);
      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;
      return 0; 
    });
  }, [packsWithIndex, paletteTab, paletteSearch, unlockedPacks]);

  const handleBaseSelect = (base: typeof PLANET_BASES[0]) => {
    const isUnlocked = base.defaultUnlocked || unlockedFeatures.includes(`base_${base.id.toLowerCase()}`);
    if (isUnlocked) {
      onSelectBase(base.id);
    } else {
      setFeaturePrompt({
        id: `base_${base.id.toLowerCase()}`,
        name: `${base.name} Base`,
        price: base.price
      });
    }
  };

  const handleEnvToggle = (env: typeof ENVIRONMENTS[0]) => {
    const isUnlocked = env.defaultUnlocked || unlockedFeatures.includes(`env_${env.id.toLowerCase()}`);
    if (isUnlocked) {
      onToggleEnv(env.id); // ⭐️ 클릭 시 App.tsx의 함수를 호출하여 실제 상태를 바꿉니다!
    } else {
      setFeaturePrompt({
        id: `env_${env.id.toLowerCase()}`,
        name: `${env.name} Environment`,
        price: env.price
      });
    }
  };

  return (
    <>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto z-30">
        
        {/* 메인 사이드바 패널 */}
        <div className="bg-black/40 backdrop-blur-2xl p-4 rounded-3xl flex flex-col border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] w-64 relative z-10 transition-all duration-300">
          
          {/* =========================================================
              [SECTION 1: COLOR PACKS] - 드롭다운 오버레이 형태
             ========================================================= */}
          <div className="w-full shrink-0 flex flex-col relative z-40">
            <div className="flex justify-between items-center px-1 mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Color Packs</span>
            </div>

            {/* 토글 버튼 */}
            <button
              onClick={() => setIsPacksExpanded(!isPacksExpanded)}
              className={cn(
                "flex justify-between items-center px-3 py-2 w-full rounded-xl border transition-all active:scale-95 group",
                isPacksExpanded
                  ? "bg-blue-600/20 border-blue-500/50 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="text-[11px] font-bold tracking-wider">
                Color Collections
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-300 ease-in-out", 
                isPacksExpanded ? "rotate-180 text-blue-400" : "text-gray-500 group-hover:text-gray-300"
              )} />
            </button>

            {/* 펼쳐지는 본문 영역 (아래쪽 요소들을 덮어씌우는 Absolute 레이어) */}
            <div className={cn(
              "absolute top-[calc(100%+8px)] left-0 w-full transition-all duration-300 origin-top shadow-[0_20px_40px_rgba(0,0,0,0.8)]",
              isPacksExpanded ? "opacity-100 scale-y-100" : "opacity-0 scale-y-95 pointer-events-none"
            )}>
              <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3">
                
                {/* 팩 탭 필터 */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                  <button onClick={() => setPaletteTab('all')} className={cn("flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all", paletteTab === 'all' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>All</button>
                  <button onClick={() => setPaletteTab('theme')} className={cn("flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all", paletteTab === 'theme' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>Theme</button>
                  <button onClick={() => setPaletteTab('country')} className={cn("flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all", paletteTab === 'country' ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white")}>Country</button>
                </div>

                {/* 검색 바 */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={paletteSearch}
                    onChange={e => setPaletteSearch(e.target.value)}
                    placeholder="Search collections..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* 팩 목록 */}
                <div className="w-full max-h-[220px] overflow-y-auto px-1 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filteredAndSortedPacks.map((pack) => {
                    const isUnlocked = unlockedPacks.includes(pack.originalIndex);
                    return (
                      <div key={pack.name} className="w-full relative group shrink-0">
                        <div className={cn("flex justify-between items-center mb-1.5 px-1 transition-opacity", !isUnlocked && "opacity-60 group-hover:opacity-100")}>
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
                            "grid grid-cols-8 gap-1.5 w-full px-1 transition-all duration-300", 
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
                                  setIsPacksExpanded(false); 
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
                    <div className="text-center text-gray-500 text-xs py-6">No packs match.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              구분선 1 
             ========================================================= */}
          <div className="w-full h-px bg-white/10 shrink-0 my-3"></div>

          {/* =========================================================
              [SECTION 2: BASIC PALETTE]
             ========================================================= */}
          <div className="w-full shrink-0 px-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Basic Palette</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5 w-full">
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

          {/* =========================================================
              구분선 2 
             ========================================================= */}
          <div className="w-full h-px bg-white/10 shrink-0 my-3"></div>

          {/* =========================================================
              [SECTION 3: THEMES & ENVIRONMENT] 
             ========================================================= */}
          <div className="w-full shrink-0 px-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
                Themes & Environment
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal(prev => prev === 'base' ? null : 'base')}
                className={cn(
                  "flex-1 h-10 rounded-xl hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                  activeModal === 'base' ? "bg-blue-600/30 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-white/5"
                )}
              >
                <Globe className="w-3 h-3 text-blue-400" />
                Planet Base
              </button>
              <button
                onClick={() => setActiveModal(prev => prev === 'env' ? null : 'env')}
                className={cn(
                  "flex-1 h-10 rounded-xl hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95",
                  activeModal === 'env' ? "bg-purple-600/30 border-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]" : "bg-white/5"
                )}
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                Environment
              </button>
            </div>
          </div>

          {/* =========================================================
              구분선 3 
             ========================================================= */}
          <div className="w-full h-px bg-white/10 shrink-0 my-3"></div>

          {/* =========================================================
              [SECTION 4: RECENT & PAINT]
             ========================================================= */}
          <div className="w-full shrink-0 px-1 flex flex-col gap-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recent</span>
              </div>
              <div className="grid grid-cols-8 gap-1.5 w-full">
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

        {/* ---------------- 모달 사이드 팝업 영역 ---------------- */}
        
        {/* Planet Base 서브 팝업 */}
        {activeModal === 'base' && (
          <div className="absolute right-[calc(100%+16px)] bottom-0 w-60 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-right-2 duration-200 z-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
                <Globe className="w-3.5 h-3.5" />
                Planet Base
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/40 hover:text-white p-1 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {PLANET_BASES.map(base => {
                const isUnlocked = base.defaultUnlocked || unlockedFeatures.includes(`base_${base.id.toLowerCase()}`);
                const isSelected = selectedBase === base.id;

                return (
                  <button
                    key={base.id}
                    onClick={() => handleBaseSelect(base)}
                    className={cn(
                      "w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium transition-all group",
                      isSelected
                        ? "bg-blue-600/20 border-blue-500 text-white"
                        : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!isUnlocked && <Lock className="w-3 h-3 text-amber-500/80 group-hover:text-amber-400 transition-colors" />}
                      <span>{base.name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    {!isUnlocked && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">PRO</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Environment 서브 팝업 */}
        {activeModal === 'env' && (
          <div className="absolute right-[calc(100%+16px)] bottom-0 w-60 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-right-2 duration-200 z-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-bold text-xs text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                Environment Settings
              </div>
              <button onClick={() => setActiveModal(null)} className="text-white/40 hover:text-white p-1 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {ENVIRONMENTS.map(env => {
                const isUnlocked = env.defaultUnlocked || unlockedFeatures.includes(`env_${env.id.toLowerCase()}`);
                
                // ⭐️ 부모(App.tsx)에서 전달받은 진짜 환경 상태를 매핑합니다
                const isOn = envStates[env.id] || false;

                return (
                  <div
                    key={env.id}
                    onClick={() => handleEnvToggle(env)}
                    className={cn(
                      "w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium cursor-pointer transition-all group",
                      isOn && isUnlocked
                        ? "bg-purple-600/20 border-purple-500 text-white"
                        : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!isUnlocked && <Lock className="w-3 h-3 text-amber-500/80 group-hover:text-amber-400 transition-colors" />}
                      <span>{env.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isUnlocked && <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">PRO</span>}
                      <div className={cn(
                        "w-8 h-4.5 rounded-full p-0.5 transition-colors relative",
                        isOn && isUnlocked ? "bg-purple-500" : "bg-white/20"
                      )}>
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full bg-white transition-transform shadow-sm",
                          isOn && isUnlocked ? "translate-x-3.5" : "translate-x-0"
                        )} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}