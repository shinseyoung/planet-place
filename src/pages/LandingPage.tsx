import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- 유틸리티 함수 ---
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 임시 이미지 데이터 ---
export const products = [
  { title: "Image 1", link: "#", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 2", link: "#", thumbnail: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 3", link: "#", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 4", link: "#", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 5", link: "#", thumbnail: "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 6", link: "#", thumbnail: "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 7", link: "#", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 8", link: "#", thumbnail: "https://images.unsplash.com/photo-1608178398319-48f814d0750c?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 9", link: "#", thumbnail: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 10", link: "#", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 11", link: "#", thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 12", link: "#", thumbnail: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 13", link: "#", thumbnail: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800&auto=format&fit=crop" },
  { title: "Image 14", link: "#", thumbnail: "https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?q=80&w=800&auto=format&fit=crop" },
];

export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="bg-[#050505] min-h-screen w-full relative">
      
      <style>{`
        .animate-scroll {
          animation: scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite;
        }
        @keyframes scroll {
          to {
            transform: translate(calc(-50% - 0.5rem));
          }
        }
      `}</style>

      {/* 1. 상단 고정 헤더 */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm text-white">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full"></div>
          </div>
          <span className="text-xl font-bold tracking-wider">Planet Studio</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-neutral-200 transition-colors"
          >
            Log In
          </button>
        </div>
      </header>

      {/* 2. 메인 패럴랙스 */}
      <HeroParallax products={products} />

      {/* 3. 스크롤 동기화 반응형 타임라인 섹션 */}
      <FeatureTimeline />

      {/* 4. Infinite Moving Cards + 리퀴드 웜홀 배경 */}
      <InfiniteMovingCardsDemo />

      {/* 5. Footer */}
      <Footer />

      {/* 6. 로그인 팝업 모달 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-white">
          <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center">Get Started</h2>
            <button onClick={onLogin} className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-lg font-semibold hover:bg-neutral-200 transition-colors mb-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
            <button className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-lg font-semibold hover:bg-neutral-200 transition-colors mb-6">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.78 1.18-.19 2.31-.88 3.5-.83 1.5.06 2.65.67 3.32 1.63-2.99 1.76-2.48 5.86.33 7.03-.68 1.71-1.61 3.42-2.23 4.36zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Continue with Apple
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-[1px] flex-1 bg-white/10"></div>
              <span className="text-xs text-neutral-500 uppercase">or</span>
              <div className="h-[1px] flex-1 bg-white/10"></div>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Email address</label>
                <input type="email" placeholder="name@example.com" className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30" />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30" />
              </div>
              <button className="w-full bg-[#275EFE] text-white py-3 rounded-lg font-bold hover:bg-[#1f4bcf] transition-colors mt-2">
                Continue with Email
              </button>
            </form>
            <div className="mt-6 text-center">
              <a href="#" className="text-sm text-neutral-400 hover:text-white transition-colors">
                No account? <span className="underline underline-offset-4">Sign up</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- HeroParallax ---

export const HeroParallax = ({
  products,
}: {
  products: {
    title: string;
    link: string;
    thumbnail: string;
  }[];
}) => {
  const firstRow = products.slice(0, 7);
  const secondRow = products.slice(7, 14);
  const ref = React.useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 600]), springConfig);
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -600]), springConfig);
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), springConfig);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), springConfig);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), springConfig);
  const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [-700, 0]), springConfig);

  return (
    <div
      ref={ref}
      className="h-[200vh] py-40 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      <Header />
      <motion.div
        style={{ rotateX, rotateZ, translateY, opacity }}
        className=""
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-10 mb-4">
          {firstRow.map((product, idx) => (
            <ProductCard product={product} translate={translateX} key={`row1-${idx}`} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row space-x-10">
          {secondRow.map((product, idx) => (
            <ProductCard product={product} translate={translateXReverse} key={`row2-${idx}`} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      <h1 className="text-2xl md:text-7xl font-bold text-white">
        Build Your Own Planet <br /> In Real-Time
      </h1>
      <p className="max-w-2xl text-base md:text-xl mt-8 text-neutral-200 font-light">
        Create your own 3D pixel earth and paint it in real-time. A massive canvas that unfolds directly in your browser without any complex installation.
      </p>
    </div>
  );
};

export const ProductCard = ({ product, translate }: { product: any; translate: MotionValue<number>; }) => {
  return (
    <motion.div style={{ x: translate }} whileHover={{ y: -20 }} className="group/product h-96 w-[30rem] relative shrink-0">
      <div className="block group-hover/product:shadow-2xl h-full w-full rounded-2xl overflow-hidden border border-white/5">
        <img
          src={product.thumbnail}
          className="object-cover object-left-top absolute h-full w-full inset-0"
          alt={product.title}
          draggable="false"
        />
      </div>
    </motion.div>
  );
};

// --- 타임라인 섹션 ---

export const FeatureTimeline = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="w-full bg-[#050505] pt-0 pb-16 md:pt-0 md:pb-24 relative font-sans z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10">
        
        <TimelineTitle />

        <div ref={containerRef} className="relative">
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[2px] bg-white/10 transform md:-translate-x-1/2"></div>
          
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-8 md:left-1/2 top-0 w-[2px] bg-gradient-to-b from-[#275EFE] via-purple-500 to-transparent transform md:-translate-x-1/2 origin-top"
          ></motion.div>

          {timelineFeatures.map((feature, idx) => (
            <TimelineItem key={idx} feature={feature} index={idx} />
          ))}
          
        </div>
      </div>
    </div>
  );
};

const TimelineTitle = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0 1", "0.5 0.5"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div 
      ref={ref}
      style={{ y, opacity }}
      className="text-center mt-20 mb-20 md:mt-24 md:mb-24"
    >
      <h2 className="text-4xl md:text-6xl font-bold text-white mb-0">How It Works</h2>
    </motion.div>
  );
};

const timelineFeatures = [
  {
    step: "01",
    title: "Explore the Globe",
    description: "Interact with a highly detailed 3D earth. Spin, pan, and discover the perfect location to start your creation. Seamlessly rotating in real-time.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop"
  },
  {
    step: "02",
    title: "Dive into Details",
    description: "Click any region to zoom in instantly. Our advanced map engine transitions you from space to an interactive grid without a loading screen.",
    image: "https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=800&auto=format&fit=crop"
  },
  {
    step: "03",
    title: "Paint Your World",
    description: "Select your color, target the exact grid coordinates using our precision crosshair, and bring your pixel art to life.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop"
  }
];

const TimelineItem = ({ feature, index }: { feature: any; index: number }) => {
  const isEven = index % 2 === 0;
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["0 1", "0.6 0.6"], 
  });

  const textX = useTransform(scrollYProgress, [0, 1], [isEven ? -100 : 100, 0]);
  const imageX = useTransform(scrollYProgress, [0, 1], [isEven ? 100 : -100, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative flex flex-col md:flex-row items-center justify-between mb-24 md:mb-40 last:mb-0 w-full">
      <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-black border-2 border-[#275EFE] transform -translate-x-[7px] md:-translate-x-1/2 z-10"></div>

      <motion.div
        style={{ x: textX, opacity }}
        className={`w-full md:w-5/12 pl-20 md:pl-0 flex flex-col justify-center ${
          isEven ? "md:text-right md:pr-16" : "md:order-last md:text-left md:pl-16"
        }`}
      >
        <span className="text-[#275EFE] font-mono text-sm md:text-base font-bold mb-3 tracking-widest">
          STEP {feature.step}
        </span>
        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {feature.title}
        </h3>
        <p className="text-neutral-400 text-base md:text-lg leading-relaxed font-light">
          {feature.description}
        </p>
      </motion.div>

      <motion.div
        style={{ x: imageX, opacity }}
        className={`w-full md:w-5/12 pl-20 md:pl-0 mt-8 md:mt-0 ${
          isEven ? "md:order-last md:pl-16" : "md:pr-16"
        }`}
      >
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-[#275efe]/10">
          <img 
            src={feature.image} 
            alt={feature.title} 
            className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700 ease-out" 
            draggable="false"
          />
        </div>
      </motion.div>
    </div>
  );
};


// --- 새롭게 추가된 Infinite Moving Cards 섹션 (입체 곡선 배경) ---

export function InfiniteMovingCardsDemo() {
  return (
    <div className="w-full h-[700px] md:h-[950px] relative antialiased bg-[#08080a] overflow-hidden z-10 -mt-16 md:-mt-24 -mb-16 md:-mb-24">
      
      {/* 1. 프리미엄 WebGL 액체 배경 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <WebGLLiquid
          colorDeep="#050505"      // 사이트 배경과 완벽 일치
          colorMid="#0f172a"       // 깊은 다크 네이비
          colorHighlight="#275EFE" // 사이트의 메인 포인트 블루
          speed={0.6}
          flowStrength={1.2}
          grain={0.04}
          contrast={1.1}
          opacity={0.8}
          reveal={true}
        />
      </div>

      {/* 2. 상단/하단 오목한 검은색 마스크 (터널 효과) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180vw] md:w-[150vw] h-[100px] md:h-[180px] bg-[#050505] rounded-b-[50%] z-20 border-b border-white/10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[180vw] md:w-[150vw] h-[100px] md:h-[180px] bg-[#050505] rounded-t-[50%] z-20 border-t border-white/10 pointer-events-none"></div>
      
      {/* 3. 은은한 내부 빛 번짐 효과 (블루 톤 적용) */}
      <div className="absolute inset-0 shadow-[0_0_150px_rgba(39,94,254,0.15)_inset] pointer-events-none z-0"></div>

      {/* 컨텐츠 중앙 Absolute 배치 */}
      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
        <div className="w-full flex flex-col items-center gap-[22px] md:gap-[30px] pointer-events-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight">Miles Ahead.</h2>
            <p className="text-neutral-400 mt-4 text-2xl">Experience the next generation of pixel art mapping.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="w-full flex justify-center"
          >
            <InfiniteMovingCards
              items={testimonials}
              direction="right"
              speed="normal"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  {
    quote: "Building my own planet felt like an absolute dream. The precision and performance of the rendering engine is simply unmatched.",
    name: "Alex Rivera",
    title: "Digital Artist",
  },
  {
    quote: "Finally, a platform that understands the essence of pixel art mixed with geographical precision. The UI is breathtaking.",
    name: "Sarah Chen",
    title: "UX Designer",
  },
  {
    quote: "The seamless transition from deep space down to exact street coordinates without any loading screens is mind-blowing.",
    name: "Michael Chang",
    title: "Creative Developer",
  },
  {
    quote: "I've tried many world-building tools, but Planet Studio's fluid targeting and real-time syncing feels like magic.",
    name: "Emma Stone",
    title: "Community Builder",
  },
  {
    quote: "The holographic preview mode completely changed how I plan out massive art structures before placing them.",
    name: "David Kim",
    title: "Pixel Architect",
  },
];

// Infinite Moving Cards 코어 컴포넌트
export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  className,
}: {
  items: { quote: string; name: string; title: string }[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    addAnimation();
  }, []);

  const [start, setStart] = useState(false);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty("--animation-direction", "forwards");
      } else {
        containerRef.current.style.setProperty("--animation-direction", "reverse");
      }
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-6 py-6 w-max flex-nowrap",
          start && "animate-scroll" 
        )}
      >
        {items.map((item) => (
          <li
            className="w-[380px] md:w-[550px] max-w-full relative rounded-2xl border border-b-0 flex-shrink-0 border-white/10 px-8 py-8 md:px-10 md:py-10 bg-[#111] shadow-[0_8px_20px_rgb(0_0_0/0.5)]"
            key={item.name}
          >
            <blockquote>
              <div
                aria-hidden="true"
                className="user-select-none -z-1 pointer-events-none absolute -left-0.5 -top-0.5 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
              ></div>
              <span className="relative z-20 text-base md:text-lg leading-[1.6] text-neutral-300 font-light">
                "{item.quote}"
              </span>
              <div className="relative z-20 mt-8 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className="text-base md:text-lg leading-[1.6] text-white font-bold tracking-wide">
                    {item.name}
                  </span>
                  <span className="text-sm md:text-base leading-[1.6] text-neutral-500 font-normal">
                    {item.title}
                  </span>
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- 독립된 CTA(Contact) 섹션 및 Footer ---
export const Footer = () => {
  return (
    <div className="w-full bg-[#050505] font-sans relative z-20">
      
      <section className="pt-10 pb-16 md:pt-16 md:pb-20 px-4 md:px-8 border-b border-white/5">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Ready to build your world?
          </h2>
          <p className="text-neutral-400 text-lg md:text-xl mb-10 max-w-2xl font-light leading-relaxed">
            Interested in advertising, business inquiries, or creating custom private planet instances for your community? 
            Let's create something amazing together.
          </p>
          <button className="px-10 py-4 bg-white text-black text-base md:text-lg font-bold rounded-full hover:bg-neutral-200 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]">
            Contact Our Team
          </button>
        </div>
      </section>

      <footer className="w-full py-5 md:py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
            </div>
            <span className="text-lg font-bold text-white tracking-wider">Planet Studio</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-neutral-500 text-xs md:text-sm font-light">
            <div className="flex gap-5 md:gap-6">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
            </div>
            <span className="hidden md:block w-1 h-1 bg-neutral-700 rounded-full"></span>
            <p>© 2026 Planet Studio. All rights reserved.</p>
          </div>
          
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// WebGLLiquid 코어 로직 (한 파일에 합침)
// ============================================================================

const WebGLErrorBoundary = ({ children, fallback }: any) => {
  const [hasError] = useState(false);
  if (hasError) return fallback;
  return children;
};
const WebGLFallback = ({ className }: any) => <div className={className} />;

const VERTEX_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_colorDeep;
uniform vec3 u_colorMid;
uniform vec3 u_colorHighlight;
uniform float u_speed;
uniform float u_flowStrength;
uniform float u_grain;
uniform float u_contrast;
uniform float u_opacity;
uniform float u_reveal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.86, 0.51, -0.51, 0.86);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 applyContrast(vec3 c, float contrast) {
  return clamp((c - 0.5) * contrast + 0.5, 0.0, 1.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float t = u_time * (0.14 * u_speed);
  vec2 aspect = vec2(u_res.x / max(u_res.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;

  vec2 flowP = vec2(p.x * 1.1, p.y - t * 0.35);
  float n1 = fbm(flowP * 2.8 + vec2(0.0, t * 0.2));
  float n2 = fbm((flowP + n1 * 0.45) * 4.0 - vec2(0.0, t * 0.35));
  float n3 = fbm((flowP + n2 * 0.4) * 6.5 + vec2(t * 0.15, 0.0));

  float structure = n3 * 1.15 + (n2 - 0.5) * 0.5;
  structure += (n1 - 0.5) * 0.3 * u_flowStrength;

  float lowBand = smoothstep(0.18, 0.6, structure);
  float highBand = smoothstep(0.62, 1.08, structure);
  vec3 col = mix(u_colorDeep, u_colorMid, lowBand);
  col = mix(col, u_colorHighlight, highBand);

  float glow = smoothstep(0.52, 0.95, structure) * (0.35 + 0.5 * u_flowStrength);
  col += glow * u_colorHighlight * 0.35;

  float verticalMask = smoothstep(1.05, 0.05, uv.y);
  verticalMask = pow(verticalMask, 1.1);

  float vignette = smoothstep(1.28, 0.36, length(uv - 0.5));
  col *= mix(0.9, 1.05, vignette);

  col = applyContrast(col, u_contrast);

  float dither = (hash(gl_FragCoord.xy + t * 10.0) - 0.5) * u_grain;
  col += dither;

  float alpha = verticalMask * smoothstep(0.08, 0.95, structure);
  alpha *= smoothstep(0.0, 0.28, u_reveal - uv.x);
  alpha *= u_opacity;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

const HEX_COLOR_REGEX = /^#?[0-9a-fA-F]{6}$/;
const FALLBACK_DEEP = "#04050b";
const FALLBACK_MID = "#134d93";
const FALLBACK_HIGHLIGHT = "#8cecff";

function sanitizeHexColor(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return fallback;
  }
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function hexToRgb01(hex: string): [number, number, number] {
  const normalized = sanitizeHexColor(hex, FALLBACK_DEEP).replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export interface WebGLLiquidProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  description?: string;
  colorDeep?: string;
  colorMid?: string;
  colorHighlight?: string;
  speed?: number;
  flowStrength?: number;
  grain?: number;
  contrast?: number;
  opacity?: number;
  reveal?: boolean;
  delayMs?: number;
  revealDuration?: number;
  children?: React.ReactNode;
}

export function WebGLLiquid({
  colorDeep = FALLBACK_DEEP,
  colorMid = FALLBACK_MID,
  colorHighlight = FALLBACK_HIGHLIGHT,
  speed = 1,
  flowStrength = 1,
  grain = 0.05,
  contrast = 1.1,
  opacity = 0.95,
  reveal = true,
  delayMs = 0,
  revealDuration = 1.2,
  className,
  style,
  ...props
}: WebGLLiquidProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hasWebGLError, setHasWebGLError] = useState(false);

  const settings = useMemo(
    () => ({
      colorDeep,
      colorMid,
      colorHighlight,
      speed,
      flowStrength,
      grain,
      contrast,
      opacity,
      reveal,
      delayMs,
      revealDuration,
    }),
    [
      colorDeep,
      colorMid,
      colorHighlight,
      speed,
      flowStrength,
      grain,
      contrast,
      opacity,
      reveal,
      delayMs,
      revealDuration,
    ],
  );

  useEffect(() => {
    if (hasWebGLError) return;

    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    try {
      const gl = canvas.getContext("webgl", { antialias: true, alpha: true });
      if (!gl) {
        setHasWebGLError(true);
        return;
      }

      const compileShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      if (!vertexShader || !fragmentShader) {
        setHasWebGLError(true);
        return;
      }

      const program = gl.createProgram();
      if (!program) {
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setHasWebGLError(true);
        return;
      }

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setHasWebGLError(true);
        return;
      }

      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, "position");
      const quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(program, "u_res");
      const uTime = gl.getUniformLocation(program, "u_time");
      const uColorDeep = gl.getUniformLocation(program, "u_colorDeep");
      const uColorMid = gl.getUniformLocation(program, "u_colorMid");
      const uColorHighlight = gl.getUniformLocation(program, "u_colorHighlight");
      const uSpeed = gl.getUniformLocation(program, "u_speed");
      const uFlowStrength = gl.getUniformLocation(program, "u_flowStrength");
      const uGrain = gl.getUniformLocation(program, "u_grain");
      const uContrast = gl.getUniformLocation(program, "u_contrast");
      const uOpacity = gl.getUniformLocation(program, "u_opacity");
      const uReveal = gl.getUniformLocation(program, "u_reveal");

      if (
        !uRes || !uTime || !uColorDeep || !uColorMid || !uColorHighlight ||
        !uSpeed || !uFlowStrength || !uGrain || !uContrast || !uOpacity || !uReveal
      ) {
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        setHasWebGLError(true);
        return;
      }

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const { width, height } = host.getBoundingClientRect();
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);

      let rafId = 0;
      const start = performance.now();

      const render = (now: number) => {
        const elapsedSec = Math.max(0, (now - start - settings.delayMs) / 1000);
        const revealProgress = settings.reveal
          ? Math.min(1, elapsedSec / Math.max(settings.revealDuration, 0.05))
          : 1;

        const deep = hexToRgb01(settings.colorDeep);
        const mid = hexToRgb01(settings.colorMid);
        const highlight = hexToRgb01(settings.colorHighlight);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(uTime, elapsedSec);
        gl.uniform3f(uColorDeep, deep[0], deep[1], deep[2]);
        gl.uniform3f(uColorMid, mid[0], mid[1], mid[2]);
        gl.uniform3f(uColorHighlight, highlight[0], highlight[1], highlight[2]);
        gl.uniform1f(uSpeed, settings.speed);
        gl.uniform1f(uFlowStrength, settings.flowStrength);
        gl.uniform1f(uGrain, settings.grain);
        gl.uniform1f(uContrast, settings.contrast);
        gl.uniform1f(uOpacity, settings.opacity);
        gl.uniform1f(uReveal, revealProgress);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        rafId = requestAnimationFrame(render);
      };

      rafId = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        gl.deleteBuffer(quadBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      };
    } catch {
      setHasWebGLError(true);
      return;
    }
  }, [hasWebGLError, settings]);

  const fallbackContent = (
    <div
      className={cn("relative w-full h-full bg-[#050505]", className)}
      style={style}
      {...props}
    />
  );

  if (hasWebGLError) return fallbackContent;

  return (
    <WebGLErrorBoundary fallback={fallbackContent}>
      <div ref={hostRef} className={cn("relative w-full h-full", className)} style={style} {...props}>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
    </WebGLErrorBoundary>
  );
}