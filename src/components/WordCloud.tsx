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
        
        let vwSize = 0;
        if (isHero) {
            // REQUIREMENTS 1 & 2: Hero word is massive, up to 35vw (35% of screen).
            // It clamps down based on character length to ensure it doesn't overflow 90% of screen horizontally.
            vwSize = Math.min(35, 90 / Math.max(word.text.length, 1)); 
        } else {
            // REQUIREMENT 3: Variable rhythm. Min 2.5vw, max ~8.5vw.
            const baseSize = 2.5 + Math.random() * 6.0; 
            vwSize = Math.min(baseSize, 40 / Math.max(word.text.length, 1));
        }

        const pxSize = vwSize * VwUnit;
        // Bounding box approximation roughly matching the blocky 'Jua' font format
        const boxW = Math.max(word.text.length, 1) * pxSize * 0.9; 
        const boxH = pxSize * 1.35;

        let attempt = 0;
        let success = false;
        let x = 0, y = 0;

        // Try placing the word with random generation up to 2000 times
        while (!success && attempt < 2000) {
            if (isHero && attempt < 50) {
                // Ensure the core word drops near the visual center reliably
                x = W / 2 + (Math.random() * (W * 0.1) - (W * 0.05));
                y = H / 2 + (Math.random() * (H * 0.1) - (H * 0.05));
            } else {
                // Completely random distribution for all secondary words across the full boundary range
                const marginX = W * 0.05;
                const marginY = H * 0.05;
                const minX = boxW / 2 + marginX;
                const maxX = W - boxW / 2 - marginX;
                const minY = boxH / 2 + marginY;
                const maxY = H - boxH / 2 - marginY;

                x = minX + Math.random() * Math.max(maxX - minX, 1);
                y = minY + Math.random() * Math.max(maxY - minY, 1);
            }

            const rect = {
                l: x - boxW / 2,
                r: x + boxW / 2,
                t: y - boxH / 2,
                b: y + boxH / 2
            };

            let collision = false;
            // Pad hitboxes slightly more for the hero to give it breathing room physically
            const collisionMargin = isHero ? pxSize * 0.10 : pxSize * 0.05;

            // REQUIREMENT 4: Bounding Box Collision Check
            for (const p of placedRects) {
                if (!(rect.r + collisionMargin < p.l || 
                      rect.l - collisionMargin > p.r || 
                      rect.b + collisionMargin < p.t || 
                      rect.t - collisionMargin > p.b)) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                success = true;
                placedRects.push(rect);
                placed.push({
                    text: word.text,
                    vwSize,
                    leftPct: (x / W) * 100, // Safe percentage coordinate mapping
                    topPct: (y / H) * 100,
                    rotate: isHero ? 0 : (Math.random() > 0.7 ? 0 : (Math.random() > 0.5 ? 12 : -12)),
                    color: COLORS[i % COLORS.length]
                });
            }
            attempt++;
        }

        if (!success) {
            // Graceful degradation: place near center safely if screen gets completely choked
            placed.push({
                text: word.text,
                vwSize,
                leftPct: 50 + (Math.random() * 20 - 10),
                topPct: 50 + (Math.random() * 20 - 10),
                rotate: 0,
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
