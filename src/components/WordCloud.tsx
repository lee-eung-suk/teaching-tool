import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';

interface Word {
  text: string;
  count: number;
}

interface CloudWord {
  text: string;
  vwSize: number;
  leftPct: number;
  topPct: number;
  rotate: number;
  color: string;
}

const COLORS = ['#FF5F5F', '#FFA05F', '#FFB800', '#4AC948', '#5FBFFF', '#5F7FFF', '#BF5FFF'];

export function WordCloud({ words }: { words: Word[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cloudWords, setCloudWords] = useState<CloudWord[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const sortedWords = useMemo(() => {
    // Arrange words by descending count to guarantee the Hero word is exactly at index 0
    return [...words].sort((a, b) => b.count - a.count);
  }, [words]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Absolute Positioning Layout (Custom 2D Collision)
  useEffect(() => {
    if (sortedWords.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      setCloudWords([]);
      return;
    }

    const W = dimensions.width;
    const H = dimensions.height;
    const VwUnit = W / 100;

    const placed: CloudWord[] = [];
    const placedRects: {l: number, r: number, t: number, b: number}[] = [];

    for (let i = 0; i < sortedWords.length; i++) {
        const word = sortedWords[i];
        const isHero = i === 0;
        
        let charLength = 0;
        for (let c = 0; c < word.text.length; c++) {
            charLength += word.text.charCodeAt(c) > 255 ? 1.0 : 0.55;
        }
        
        let initialVwSize = 0;
        if (isHero) {
            // Cap initial massive size so it has space on smaller screens
            initialVwSize = Math.min(25, 80 / Math.max(charLength, 1)); 
        } else {
            const baseSize = 2.5 + Math.random() * 5.0; 
            initialVwSize = Math.min(baseSize, 30 / Math.max(charLength, 1));
        }

        let finalVwSize = initialVwSize;
        let success = false;
        let finalX = 0, finalY = 0;
        let finalRotate = 0;

        // Auto Scale-down Loop: Never allow overlapping. Scale down until it fits.
        while (!success && finalVwSize >= 1.0) {
            const pxSize = finalVwSize * VwUnit;
            // Precise padding: 10px strict padding on all sides to breathe
            // Adjust box width based on character count and font rendering
            const boxW = Math.max(charLength, 1) * pxSize * 0.95 + 10; 
            const boxH = pxSize * 1.35 + 10;

            let attempt = 0;
            // 500 attempts at the current font size
            while (!success && attempt < 500) {
                let currentRotate = isHero ? 0 : (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 12 : -12));
                
                // If rotated 12 degrees, the bounding box technically expands
                let effBoxW = boxW;
                let effBoxH = boxH;
                if (currentRotate !== 0) {
                    effBoxW = boxW * 1.05 + boxH * 0.2;
                    effBoxH = boxH * 1.05 + boxW * 0.2;
                }

                if (isHero && attempt < 100) {
                    // Hero tries to stay near center
                    finalX = W / 2 + (Math.random() * (W * 0.1) - (W * 0.05));
                    finalY = H / 2 + (Math.random() * (H * 0.1) - (H * 0.05));
                } else {
                    const minX = effBoxW / 2;
                    const maxX = W - effBoxW / 2;
                    const minY = effBoxH / 2;
                    const maxY = H - effBoxH / 2;
                    
                    // Box is too big for the screen at this font size! Break out to scale it down immediately.
                    if (maxX < minX || maxY < minY) {
                        break; 
                    }

                    finalX = minX + Math.random() * (maxX - minX);
                    finalY = minY + Math.random() * (maxY - minY);
                }

                const rect = {
                    l: finalX - effBoxW / 2,
                    r: finalX + effBoxW / 2,
                    t: finalY - effBoxH / 2,
                    b: finalY + effBoxH / 2
                };

                let collision = false;
                for (const p of placedRects) {
                    // Strict bounding box intersection check 
                    if (!(rect.r < p.l || 
                          rect.l > p.r || 
                          rect.b < p.t || 
                          rect.t > p.b)) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    success = true;
                    finalRotate = currentRotate;
                    placedRects.push(rect);
                }
                attempt++;
            }

            if (!success) {
                // Completely failed 500 attempts at this size. 
                // CRITICAL RULE: shrink the font by 10% and try again. No overlapping allowed.
                finalVwSize *= 0.9;
            }
        }

        // Only place if it successfully found an empty space without skipping rules
        if (success) {
            placed.push({
                text: word.text,
                vwSize: finalVwSize,
                leftPct: (finalX / W) * 100, 
                topPct: (finalY / H) * 100,
                rotate: finalRotate,
                color: COLORS[i % COLORS.length]
            });
        }
    }
    
    setCloudWords(placed);
  }, [sortedWords, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] flex-1 relative bg-transparent overflow-hidden">
        {cloudWords.map((w, i) => (
            <motion.div
                key={`${w.text}-${i}`}
                // REQUIREMENT 1: "Absolute positioning" enforced to strictly prevent standard flex alignment line-ups
                className="absolute font-bold whitespace-nowrap select-none"
                style={{
                    left: `${w.leftPct}%`,
                    top: `${w.topPct}%`,
                    // REQUIREMENT 2: Font sizing exclusively processed with raw 'vw'
                    fontSize: `${w.vwSize}vw`,
                    fontFamily: "'Jua', sans-serif",
                    color: w.color,
                    cursor: 'pointer',
                    textShadow: 'rgba(255, 255, 255, 0.4) 2px 2px 4px',
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation',
                }}
                // Transform -50% forces real center anchor for the absolute percentages 
                initial={{ opacity: 0, scale: 0.2, x: "-50%", y: "-50%", rotate: w.rotate }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%", rotate: w.rotate }}
                whileHover={{ 
                    scale: 1.15,
                    rotate: w.rotate === 0 ? [-2, 2, -1, 0] : [w.rotate, w.rotate+5, w.rotate-5, w.rotate], 
                    filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.3)) brightness(1.15)',
                    zIndex: 50
                }}
                whileTap={{
                    scale: 1.3,
                    rotate: 0,
                    filter: 'drop-shadow(0px 0px 20px rgba(255,255,0,0.6)) drop-shadow(0px 0px 10px rgba(255,255,255,0.8))',
                    zIndex: 100,
                    transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 10
                    }
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    rotate: { duration: 0.4 }
                }}
            >
                {w.text}
            </motion.div>
        ))}
    </div>
  );
}
