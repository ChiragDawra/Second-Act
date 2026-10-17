import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface MatchRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  subtext?: string;
  className?: string;
}

export const MatchRing: React.FC<MatchRingProps> = ({
  score,
  size = 'md',
  showLabel = true,
  animated = true,
  subtext = 'Role Adjacency Match',
  className = '',
}) => {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);

  useEffect(() => {
    if (!animated) {
      setDisplayScore(score);
      return;
    }

    let start = 0;
    const duration = 1200; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score, animated]);

  // Dimension presets
  const config = {
    sm: { diameter: 72, strokeWidth: 5, fontSize: 'text-lg', labelSize: 'text-[10px]' },
    md: { diameter: 120, strokeWidth: 8, fontSize: 'text-3xl', labelSize: 'text-xs' },
    lg: { diameter: 160, strokeWidth: 10, fontSize: 'text-4xl', labelSize: 'text-sm' },
  }[size];

  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: config.diameter, height: config.diameter }}>
        <svg
          width={config.diameter}
          height={config.diameter}
          className="transform -rotate-90"
        >
          {/* Subtle outer track */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={config.strokeWidth}
            fill="transparent"
          />
          {/* Active progress stroke */}
          <motion.circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke="url(#matchGradient)"
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id="matchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0064D9" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold tracking-tight text-ink-950 ${config.fontSize}`}>
            {displayScore}%
          </span>
          {size !== 'sm' && (
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
              Match
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 text-center">
          <p className={`font-medium text-ink-700 ${config.labelSize}`}>
            {subtext}
          </p>
        </div>
      )}
    </div>
  );
};
