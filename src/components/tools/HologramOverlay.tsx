import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Lock, Unlock, X, SlidersHorizontal, Maximize, Move } from 'lucide-react';
import { cn } from '../../lib/utils';

export function HologramOverlay({ isActive, onClose }: { isActive: boolean; onClose: () => void }) {
  const [image, setImage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isActive) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setImage(url);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
      {/* 상단 컨트롤 패널 (항상 클릭 가능) */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex items-center gap-4 shadow-2xl"
      >
        {!image ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
        ) : (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-300 transition-colors"
              title="Change Image"
            >
              <Upload className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-white/20" />
            
            <div className="flex items-center gap-2 group relative" title="Opacity">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0.1" max="1" step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-24 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 group relative" title="Scale">
              <Maximize className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="0.2" max="3" step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24 accent-purple-500 cursor-pointer"
              />
            </div>

            <div className="w-px h-6 bg-white/20" />

            <button
              onClick={() => setIsLocked(!isLocked)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                isLocked ? "bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
              )}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {isLocked ? 'Locked' : 'Unlocked'}
            </button>
          </>
        )}

        <div className="w-px h-6 bg-white/20" />
        
        <button
          onClick={onClose}
          className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-400 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      </motion.div>

      {/* 홀로그램 캔버스 영역 (Lock 시 pointer-events-none 적용으로 3D 클릭 통과) */}
      {image && (
        <motion.div
          drag={!isLocked}
          dragMomentum={false}
          className={cn(
            "absolute cursor-move",
            isLocked ? "pointer-events-none" : "pointer-events-auto"
          )}
        >
          <img
            src={image}
            alt="Hologram Trace"
            draggable={false}
            style={{
              opacity: opacity,
              transform: `scale(${scale})`,
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))',
            }}
            className={cn(
              "max-w-md max-h-md object-contain transition-opacity duration-200",
              !isLocked && "outline outline-2 outline-blue-500/50 outline-dashed"
            )}
          />
          {!isLocked && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500/80 text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm pointer-events-none">
              <Move className="w-3 h-3 inline-block mr-1" /> Drag to move (Lock to draw)
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}