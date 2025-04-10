import React, { useEffect, useRef, useState, memo, useMemo } from 'react';

// Enhanced mouth positions for different visemes - optimized for Hong Kong Chinese male
const mouthPositions = {
  0: { // Silence
    path: "M50,70 Q57,68 65,69 Q73,68 80,70",
    innerPath: "M52,70 Q65,69.5 78,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ
    path: "M48,73 Q57,79 65,80 Q73,79 82,73",
    innerPath: "M50,73 Q65,76 80,73",
    description: "Slight Open"
  },
  2: { // ɑ - Open but culturally appropriate
    path: "M45,78 Q57,89 65,90 Q73,89 85,78",
    innerPath: "M48,78 Q65,86 82,78",
    description: "Open"
  },
  3: { // ɔ - Rounded open, Cantonese pronunciation
    path: "M48,76 Q57,85 65,86 Q73,85 82,76",
    innerPath: "M50,76 Q65,83 80,76",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ - Mid open, Cantonese style
    path: "M48,74 Q57,81 65,82 Q73,81 82,74",
    innerPath: "M50,74 Q65,79 80,74",
    description: "Mid Open"
  },
  5: { // ɝ - R-sound, Hong Kong accent
    path: "M49,73 Q57,79 65,80 Q73,79 81,73",
    innerPath: "M51,73 Q65,77 79,73",
    description: "R-sound"
  },
  6: { // j, i, ɪ - More subtle smile, Hong Kong expression
    path: "M45,68 Q57,71 65,72 Q73,71 85,68",
    innerPath: "M47,69 Q65,70 83,69",
    description: "Smile"
  },
  7: { // w, u - Hong Kong Cantonese pronunciation
    path: "M54,72 Q65,65 76,72",
    innerPath: "M56,71 Q65,67 74,71",
    description: "Rounded"
  },
  8: { // o - Small rounded, Hong Kong accent
    path: "M52,72 Q65,68 78,72",
    innerPath: "M54,71 Q65,69 76,71",
    description: "Small Rounded"
  },
  9: { // aʊ - Wide open, Cantonese pronunciation
    path: "M45,78 Q57,88 65,89 Q73,88 85,78",
    innerPath: "M48,78 Q65,85 82,78",
    description: "Wide Open"
  },
  10: { // ɔɪ - Complex round, Cantonese style
    path: "M48,75 Q57,81 65,82 Q73,81 82,75",
    innerPath: "M50,75 Q65,79 80,75",
    description: "Complex Round"
  },
  11: { // aɪ - Complex open, more natural for Cantonese
    path: "M47,76 Q57,84 65,85 Q73,84 83,76",
    innerPath: "M49,76 Q65,81 81,76",
    description: "Complex Open"
  },
  12: { // h - Restrained breathing, Hong Kong style
    path: "M48,72 Q57,77 65,78 Q73,77 82,72",
    innerPath: "M50,73 Q65,76 80,73",
    description: "Breathing"
  },
  13: { // ɹ - Subtle R-sound, Hong Kong accent
    path: "M50,71 Q57,76 65,77 Q73,76 80,71",
    innerPath: "M52,72 Q65,74 78,72",
    description: "R-sound"
  },
  14: { // l - L-sound, Hong Kong accent
    path: "M50,70 Q57,74 65,75 Q73,74 80,70",
    innerPath: "M52,71 Q65,73 78,71",
    description: "L-sound"
  },
  15: { // s, z - S/Z sound, Cantonese pronunciation
    path: "M53,70 Q65,69 77,70",
    innerPath: "M55,70 Q65,69.5 75,70",
    description: "S/Z Sound"
  },
  16: { // ʃ, tʃ, dʒ, ʒ - SH sound, Hong Kong accent
    path: "M54,70 Q65,67 76,70",
    innerPath: "M56,70 Q65,68 74,70",
    description: "SH Sound"
  },
  17: { // ð - TH sound, Hong Kong accent (often challenging)
    path: "M51,70 Q57,72 65,73 Q73,72 79,70",
    innerPath: "M53,71 Q65,72 77,71",
    description: "TH Sound"
  },
  18: { // f, v - F/V sound, Hong Kong pronunciation
    path: "M52,69 Q57,66 65,65 Q73,66 78,69",
    innerPath: "M54,69 Q65,67 76,69",
    description: "F/V Sound"
  },
  19: { // d, t, n, θ - D/T sound, Hong Kong accent
    path: "M50,70 Q57,72 65,73 Q73,72 80,70",
    innerPath: "M52,71 Q65,71.5 78,71",
    description: "D/T Sound"
  },
  20: { // k, g, ŋ - K/G sound, Cantonese specific
    path: "M50,71 Q57,73 65,74 Q73,73 80,71",
    innerPath: "M52,71 Q65,72 78,71",
    description: "K/G Sound"
  },
  21: { // p, b, m - P/B/M sound, Hong Kong accent
    path: "M55,70 Q65,67 75,70",
    innerPath: "M57,70 Q65,68 73,70",
    description: "P/B/M Sound"
  }
};

// Optimized VisemeFace component for better performance
const VisemeFace = memo(({ visemeData, audioUrl, isPlaying, onPlayComplete }) => {
  // Reduce state to essential values for better performance
  const [currentViseme, setCurrentViseme] = useState(0);
  const [targetViseme, setTargetViseme] = useState(0); 
  const [visemeTransition, setVisemeTransition] = useState(1);
  const [blinkState, setBlinkState] = useState(1);
  const [visemeIndex, setVisemeIndex] = useState(0);
  const [headPosition, setHeadPosition] = useState({ x: 0, y: 0 });
  
  // Audio and animation refs
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  const frameCountRef = useRef(0);
  
  // Refs to avoid re-renders
  const currentVisemeRef = useRef(currentViseme);
  const targetVisemeRef = useRef(targetViseme);
  const visemeTransitionRef = useRef(visemeTransition);
  const visemeDataRef = useRef(visemeData);
  const isPlayingRef = useRef(isPlaying);
  const visemeIndexRef = useRef(visemeIndex);
  const pathCacheRef = useRef({});
  
  // Update refs when values change
  useEffect(() => { currentVisemeRef.current = currentViseme; }, [currentViseme]);
  useEffect(() => { targetVisemeRef.current = targetViseme; }, [targetViseme]);
  useEffect(() => { visemeTransitionRef.current = visemeTransition; }, [visemeTransition]);
  useEffect(() => { visemeDataRef.current = visemeData; }, [visemeData]);
  useEffect(() => { visemeIndexRef.current = visemeIndex; }, [visemeIndex]);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying && visemeData?.length > 0) {
      setVisemeIndex(0);
      visemeIndexRef.current = 0;
    }
  }, [isPlaying, visemeData]);
  
  // Minimal head movement for better performance
  useEffect(() => {
    const interval = setInterval(() => {
      if (frameCountRef.current % 3 === 0 && !isPlayingRef.current) {
        const x = (Math.random() * 2 - 1) * 0.3;
        const y = (Math.random() * 2 - 1) * 0.2;
        setHeadPosition({ x, y });
      }
      frameCountRef.current++;
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Simplified blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      // Quick blink
      setBlinkState(0.2);
      setTimeout(() => setBlinkState(1), 150);
    }, 4000);
    
    return () => clearInterval(blinkInterval);
  }, []);
  
  // Main animation effect - optimized for performance
  useEffect(() => {
    if (isPlaying && audioUrl && visemeData?.length > 0) {
      // Audio playback
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        // Use faster playback rate for quicker speech
        audioRef.current.playbackRate = 1.15;
        // Maintain pitch to keep voice quality natural
        try {
          audioRef.current.preservesPitch = true;
        } catch (e) {
          console.warn('preservesPitch not supported in this browser');
        }
        const playPromise = audioRef.current.play();
        if (playPromise) {
          playPromise.catch(err => console.warn('Audio playback error:', err));
        }
      }
      
      // Animation loop
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    } else {
      // Stop animation and reset
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Reset mouth to neutral
      setTargetViseme(0);
      fastTransition(0);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, audioUrl, visemeData]);
  
  // Fast animation implementation
  const animate = () => {
    if (!isPlayingRef.current || !visemeDataRef.current?.length) {
      animationRef.current = null;
      return;
    }
    
    const audioTime = audioRef.current?.currentTime * 1000 || 0;
    updateVisemeForTime(audioTime);
    
    animationRef.current = requestAnimationFrame(animate);
  };
  
  // Optimized viseme timing update
  const updateVisemeForTime = (currentTime) => {
    const visemeArr = visemeDataRef.current;
    if (!visemeArr?.length) return;
    
    const currentIndex = visemeIndexRef.current;
    const totalVisemes = visemeArr.length;
    
    // Check if we're done - increase the buffer time to ensure all visemes are processed
    const lastVisemeTime = visemeArr[totalVisemes - 1].audioOffset;
    if (currentTime > lastVisemeTime + 1000) {
      if (targetVisemeRef.current !== 0) {
        setTargetViseme(0);
        fastTransition(0);
      }
      
      if (audioRef.current?.ended && onPlayComplete && isPlayingRef.current) {
        onPlayComplete();
      }
      return;
    }
    
    // Find the right viseme for the current time
    let newIndex = currentIndex;
    
    // Make sure we process all visemes, including the last ones
    // First check if we need to jump to a later viseme based on audio time
    while (newIndex < totalVisemes - 1 && 
           visemeArr[newIndex + 1].audioOffset <= currentTime) {
      newIndex++;
    }
    
    // Special case to ensure the very last viseme is played
    // If we're close to the end, ensure we show the last viseme
    if (currentTime > lastVisemeTime - 150 && newIndex < totalVisemes - 1) {
      newIndex = totalVisemes - 1;
    }
    
    // Update if needed
    if (newIndex !== currentIndex) {
      setVisemeIndex(newIndex);
      visemeIndexRef.current = newIndex;
      
      const newVisemeId = visemeArr[newIndex].visemeId;
      if (targetVisemeRef.current !== newVisemeId) {
        setTargetViseme(newVisemeId);
        fastTransition(newVisemeId);
      }
    }
  };
  
  // Accelerated transition with minimal state updates
  const fastTransition = (visemeId) => {
    if (currentVisemeRef.current === visemeId) return;
    
    setTargetViseme(visemeId);
    
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    
    // Fast single-step transition
    setVisemeTransition(0);
    
    transitionTimerRef.current = setTimeout(() => {
      setCurrentViseme(visemeId);
      setVisemeTransition(1);
      transitionTimerRef.current = null;
    }, 80);
  };
  
  // Optimized path calculation with caching
  const getMouthPaths = () => {
    // Direct path for non-transition state
    if (visemeTransition >= 1) {
      const path = mouthPositions[currentViseme] || mouthPositions[0];
      return {
        outerPath: path.path,
        innerPath: path.innerPath
      };
    }
    
    // For transitions, use cached paths if available
    const cacheKey = `${currentViseme}-${targetViseme}-${Math.round(visemeTransition * 10)}`;
    if (pathCacheRef.current[cacheKey]) {
      return pathCacheRef.current[cacheKey];
    }
    
    // Or calculate new paths
    const startPath = mouthPositions[currentViseme] || mouthPositions[0];
    const endPath = mouthPositions[targetViseme] || mouthPositions[0];
    
    // Simple linear interpolation for outer path
    const interpolatePath = (pathA, pathB, progress) => {
      try {
        const numbersA = pathA.match(/-?\d+(\.\d+)?/g).map(Number);
        const numbersB = pathB.match(/-?\d+(\.\d+)?/g).map(Number);
        
        if (numbersA.length !== numbersB.length) {
          return progress < 0.5 ? pathA : pathB;
        }
        
        let result = pathA;
        for (let i = 0; i < numbersA.length; i++) {
          const interpolated = numbersA[i] + (numbersB[i] - numbersA[i]) * progress;
          result = result.replace(numbersA[i].toString(), interpolated.toFixed(1));
        }
        
        return result;
      } catch (e) {
        console.warn('Error interpolating path', e);
        return pathA;
      }
    };
    
    const result = {
      outerPath: interpolatePath(startPath.path, endPath.path, visemeTransition),
      innerPath: interpolatePath(startPath.innerPath, endPath.innerPath, visemeTransition)
    };
    
    // Cache the result
    pathCacheRef.current[cacheKey] = result;
    return result;
  };
  
  // Optimized SVG rendering
  return (
    <div className="viseme-face">
      <audio 
        ref={audioRef} 
        src={audioUrl || ''}
        onEnded={onPlayComplete}
        style={{ display: 'none' }}
      />
      
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 130 130" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simplified face */}
        <circle 
          cx="65" 
          cy="65" 
          r="60" 
          fill="#E3BC8F" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Basic hair */}
        <path
          d="M25,40 Q45,20 65,15 Q85,20 105,40"
          fill="none"
          stroke="#333"
          strokeWidth="3"
          opacity="0.7"
        />
        
        {/* Simplified eyes */}
        <ellipse 
          cx={45 + headPosition.x * 2} 
          cy={45 + headPosition.y} 
          rx="7" 
          ry={4 * blinkState} 
          fill="white" 
          stroke="#333" 
        />
        <circle 
          cx={45 + headPosition.x * 2} 
          cy={45 + headPosition.y} 
          r={3 * blinkState} 
          fill="#3A2A18" 
        />
        
        <ellipse 
          cx={85 + headPosition.x * 2} 
          cy={45 + headPosition.y} 
          rx="7" 
          ry={4 * blinkState} 
          fill="white" 
          stroke="#333" 
        />
        <circle 
          cx={85 + headPosition.x * 2} 
          cy={45 + headPosition.y} 
          r={3 * blinkState} 
          fill="#3A2A18" 
        />
        
        {/* Eyebrows */}
        <path 
          d={`M${35 + headPosition.x * 3},${35 + headPosition.y * 2} Q${45 + headPosition.x * 3},${32 + headPosition.y * 2} ${55 + headPosition.x * 3},${35 + headPosition.y * 2}`} 
          fill="none" 
          stroke="#222" 
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path 
          d={`M${75 + headPosition.x * 3},${35 + headPosition.y * 2} Q${85 + headPosition.x * 3},${32 + headPosition.y * 2} ${95 + headPosition.x * 3},${35 + headPosition.y * 2}`} 
          fill="none" 
          stroke="#222" 
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        
        {/* Nose */}
        <path 
          d="M65,50 L65,65" 
          fill="none" 
          stroke="#333"
          strokeWidth="1.5"
        />
        <path 
          d="M56,65 Q65,72 74,65" 
          fill="none" 
          stroke="#333"
          strokeWidth="1.5"
        />
        
        {/* Mouth - the key animated part */}
        <g className="mouth">
          <path
            d={getMouthPaths().outerPath}
            fill="#C26D60" 
            stroke="#444"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d={getMouthPaths().innerPath}
            fill="none" 
            stroke="#693A34"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
});

export default VisemeFace; 