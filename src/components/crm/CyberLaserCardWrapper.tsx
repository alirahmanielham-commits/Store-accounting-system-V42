import React from 'react';
import { motion } from 'motion/react';

interface CyberLaserCardWrapperProps {
  children: React.ReactNode;
  cardKey: string | number;
  isHackerTheme?: boolean;
}

/**
 * CyberLaserCardWrapper:
 * Displays a glowing central laser beam that appears horizontally,
 * then splits and expands vertically upwards and downwards to reveal the card.
 */
export const CyberLaserCardWrapper: React.FC<CyberLaserCardWrapperProps> = ({
  children,
  cardKey,
  isHackerTheme = true
}) => {
  const laserColor = isHackerTheme ? '#00ff41' : '#38bdf8';
  const laserGlow = isHackerTheme 
    ? '0 0 15px #00ff41, 0 0 30px #00ff41, 0 0 50px rgba(0,255,65,0.8)' 
    : '0 0 15px #38bdf8, 0 0 30px #38bdf8, 0 0 50px rgba(56,189,248,0.8)';

  return (
    <div className="relative w-full flex items-center justify-center overflow-visible my-auto">
      {/* Central Horizon Laser Flash (Phase 1: Line appears horizontally across the screen) */}
      <motion.div
        key={`center-laser-${cardKey}`}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{
          scaleX: [0, 1.04, 1, 0],
          opacity: [0, 1, 0.9, 0],
          transition: {
            duration: 0.38,
            times: [0, 0.5, 0.8, 1],
            ease: "easeOut"
          }
        }}
        exit={{
          scaleX: [0, 1, 0],
          opacity: [0, 1, 0],
          transition: { duration: 0.25 }
        }}
        className="absolute left-[-2%] right-[-2%] top-1/2 -translate-y-1/2 h-[3.5px] rounded-full z-40 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${laserColor} 15%, #ffffff 50%, ${laserColor} 85%, transparent 100%)`,
          boxShadow: laserGlow
        }}
      />

      {/* Top Splitting Laser Line (Phase 2: Travels from center 50% upwards to 0%) */}
      <motion.div
        key={`top-laser-${cardKey}`}
        initial={{ top: '50%', scaleX: 0, opacity: 1 }}
        animate={{
          top: ['50%', '50%', '0%'],
          scaleX: [0, 1.02, 1],
          opacity: [1, 1, 0.85, 0],
          transition: {
            duration: 0.62,
            times: [0, 0.25, 0.9, 1],
            ease: [0.16, 1, 0.3, 1]
          }
        }}
        exit={{
          top: '50%',
          scaleX: [1, 1, 0],
          opacity: [0, 1, 0],
          transition: { duration: 0.3 }
        }}
        className="absolute left-[-1%] right-[-1%] h-[2.5px] rounded-full z-40 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${laserColor} 20%, #ffffff 50%, ${laserColor} 80%, transparent 100%)`,
          boxShadow: laserGlow
        }}
      />

      {/* Bottom Splitting Laser Line (Phase 2: Travels from center 50% downwards to 100%) */}
      <motion.div
        key={`bottom-laser-${cardKey}`}
        initial={{ top: '50%', scaleX: 0, opacity: 1 }}
        animate={{
          top: ['50%', '50%', '100%'],
          scaleX: [0, 1.02, 1],
          opacity: [1, 1, 0.85, 0],
          transition: {
            duration: 0.62,
            times: [0, 0.25, 0.9, 1],
            ease: [0.16, 1, 0.3, 1]
          }
        }}
        exit={{
          top: '50%',
          scaleX: [1, 1, 0],
          opacity: [0, 1, 0],
          transition: { duration: 0.3 }
        }}
        className="absolute left-[-1%] right-[-1%] h-[2.5px] rounded-full z-40 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${laserColor} 20%, #ffffff 50%, ${laserColor} 80%, transparent 100%)`,
          boxShadow: laserGlow
        }}
      />

      {/* Card Body unfolding from center horizontally-slit aperture */}
      <motion.div
        key={`card-shutter-${cardKey}`}
        initial={{
          clipPath: 'inset(50% 0% 50% 0%)',
          scaleY: 0.02,
          opacity: 0.3,
          filter: 'brightness(2.2) contrast(1.4)'
        }}
        animate={{
          clipPath: 'inset(0% 0% 0% 0%)',
          scaleY: 1,
          opacity: 1,
          filter: 'brightness(1) contrast(1)',
          transition: {
            duration: 0.58,
            delay: 0.1,
            ease: [0.16, 1, 0.3, 1]
          }
        }}
        exit={{
          clipPath: 'inset(50% 0% 50% 0%)',
          scaleY: 0.02,
          opacity: 0,
          filter: 'brightness(2.2) contrast(1.4)',
          transition: {
            duration: 0.28,
            ease: [0.32, 0, 0.67, 0]
          }
        }}
        className="w-full relative flex items-center justify-center"
      >
        {children}
      </motion.div>
    </div>
  );
};
