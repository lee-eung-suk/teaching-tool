import React, { useEffect, useRef, useState } from 'react';
import * as cloud from 'd3-cloud';

interface Word {
  text: string;
  count: number;
}

interface CloudWord {
  text: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
}

const COLORS = ['#FF5F5F', '#FFA05F', '#FFB800', '#4AC948', '#5FBFFF', '#5F7FFF', '#BF5FFF'];

export function WordCloud({ words }: { words: Word[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cloudWords, setCloudWords] = useState<CloudWord[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  // Compute Layout
  useEffect(() => {
    if (words.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      setCloudWords([]);
      return;
    }

    const minCount = Math.min(...words.map((w) => w.count));
    const maxCount = Math.max(...words.map((w) => w.count));

    const getFontSize = (count: number) => {
      if (minCount === maxCount) return 40; // Default size if all counts are equal
      return 24 + ((count - minCount) / (maxCount - minCount)) * 90; // Scale between 24 and 114
    };

    const layout = cloud<Word>()
      .size([dimensions.width, dimensions.height])
      .words(words.map((w) => ({ ...w })))
      .padding(10)
      .rotate(() => (Math.random() > 0.5 ? 0 : (Math.random() > 0.5 ? -15 : 15))) // Wobbly fun angles
      .font('Arial Rounded MT Bold')
      .fontSize((d) => getFontSize(d.count))
      .on('end', (computedWords) => {
        setCloudWords(
          computedWords.map((w) => ({
            text: w.text || '',
            size: w.size || 20,
            x: w.x || 0,
            y: w.y || 0,
            rotate: w.rotate || 0,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          }))
        );
      });

    layout.start();
  }, [words, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]">
      <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
        <g transform={`translate(${dimensions.width / 2},${dimensions.height / 2})`}>
          {cloudWords.map((w, i) => (
            <text
              key={`${w.text}-${i}`}
              textAnchor="middle"
              transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
              style={{
                fontSize: `${w.size}px`,
                fontFamily: 'Arial Rounded MT Bold, Helvetica Rounded, Arial, sans-serif',
                fontWeight: 900,
                fill: w.color,
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy transition
                textShadow: '2px 2px 0px rgba(255,255,255,0.8)'
              }}
            >
              {w.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}
