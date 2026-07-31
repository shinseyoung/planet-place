import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { Menu } from 'lucide-react';
import { cn } from '../../lib/utils';

export const FloatingDock = ({ items }: { items: any[] }) => {
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

  let width = useSpring(widthTransform, { mass: 0.1, stiffness: 400, damping: 18 });
  let height = useSpring(heightTransform, { mass: 0.1, stiffness: 400, damping: 18 });
  let widthIcon = useSpring(widthTransformIcon, { mass: 0.1, stiffness: 400, damping: 18 });
  let heightIcon = useSpring(heightTransformIcon, { mass: 0.1, stiffness: 400, damping: 18 });

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