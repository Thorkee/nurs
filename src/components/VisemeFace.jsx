import React, { useEffect, useRef, useState, memo } from 'react';

// More expressive mouth positions for different visemes
const mouthPositions = {
  0: { // Silence
    path: "M48,70 Q57,67 65,68 Q73,67 82,70",
    innerPath: "M50,70 Q65,69 80,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ
    path: "M45,74 Q57,83 65,84 Q73,83 85,74",
    innerPath: "M48,75 Q65,78 82,75",
    description: "Slight Open"
  },
  2: { // ɑ - Wide open
    path: "M42,83 Q57,103 65,105 Q73,103 88,83",
    innerPath: "M45,85 Q65,95 85,85",
    description: "Open"
  },
  3: { // ɔ - Rounded open
    path: "M48,80 Q57,93 65,95 Q73,93 82,80",
    innerPath: "M50,81 Q65,88 80,81",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ - Mid open
    path: "M46,76 Q57,88 65,90 Q73,88 84,76",
    innerPath: "M49,78 Q65,84 81,78",
    description: "Mid Open"
  },
  5: { // ɝ - R-sound
    path: "M48,75 Q57,84 65,86 Q73,84 82,75",
    innerPath: "M50,76 Q65,80 80,76",
    description: "R-sound"
  },
  6: { // j, i, ɪ - Smile
    path: "M40,68 Q55,73 65,74 Q75,73 90,68",
    innerPath: "M42,70 Q65,72 88,70",
    description: "Smile"
  },
  7: { // w, u - Rounded
    path: "M58,72 Q65,57 72,72",
    innerPath: "M59,70 Q65,63 71,70",
    description: "Rounded"
  },
  8: { // o - Small rounded
    path: "M55,72 Q65,60 75,72",
    innerPath: "M57,71 Q65,65 73,71",
    description: "Small Rounded"
  },
  9: { // aʊ - Wide open
    path: "M40,82 Q57,100 65,102 Q73,100 90,82",
    innerPath: "M45,83 Q65,93 85,83",
    description: "Wide Open"
  },
  10: { // ɔɪ - Complex round
    path: "M45,76 Q57,88 65,90 Q73,88 85,76",
    innerPath: "M48,77 Q65,83 82,77",
    description: "Complex Round"
  },
  11: { // aɪ - Complex open
    path: "M43,78 Q57,92 65,94 Q73,92 87,78",
    innerPath: "M46,79 Q65,87 84,79",
    description: "Complex Open"
  },
  12: { // h - Breathing
    path: "M46,74 Q57,83 65,85 Q73,83 84,74",
    innerPath: "M48,75 Q65,79 82,75",
    description: "Breathing"
  },
  13: { // ɹ - R-sound
    path: "M48,72 Q57,79 65,81 Q73,79 82,72",
    innerPath: "M50,73 Q65,76 80,73",
    description: "R-sound"
  },
  14: { // l - L-sound
    path: "M48,70 Q57,75 65,77 Q73,75 82,70",
    innerPath: "M50,71 Q65,73 80,71",
    description: "L-sound"
  },
  15: { // s, z - S/Z sound
    path: "M54,70 Q65,68 76,70",
    innerPath: "M55,70 Q65,69 75,70",
    description: "S/Z Sound"
  },
  16: { // ʃ, tʃ, dʒ, ʒ - SH sound
    path: "M52,70 Q65,64 78,70",
    innerPath: "M55,69 Q65,66 75,69",
    description: "SH Sound"
  },
  17: { // ð - TH sound
    path: "M46,70 Q57,74 65,76 Q73,74 84,70",
    innerPath: "M48,71 Q65,73 82,71",
    description: "TH Sound"
  },
  18: { // f, v - F/V sound
    path: "M50,69 Q57,61 65,60 Q73,61 80,69",
    innerPath: "M52,68 Q65,63 78,68",
    description: "F/V Sound"
  },
  19: { // d, t, n, θ - D/T sound
    path: "M48,70 Q57,73 65,75 Q73,73 82,70",
    innerPath: "M50,71 Q65,72 80,71",
    description: "D/T Sound"
  },
  20: { // k, g, ŋ - K/G sound
    path: "M49,70 Q57,71 65,73 Q73,71 81,70",
    innerPath: "M50,70 Q65,71 80,70",
    description: "K/G Sound"
  },
  21: { // p, b, m - P/B/M sound
    path: "M54,69 Q65,63 76,69",
    innerPath: "M56,69 Q65,65 74,69",
    description: "P/B/M Sound"
  }
};

// Use memo to prevent unnecessary re-renders
const VisemeFace = memo(({ visemeData, audioUrl, isPlaying, onPlayComplete }) => {
  const [currentViseme, setCurrentViseme] = useState(0);
  const [targetViseme, setTargetViseme] = useState(0); // New state for smooth transitions
  const [visemeTransition, setVisemeTransition] = useState(1); // 0-1 transition progress
  const [blinkState, setBlinkState] = useState(1); // 1 = fully open, 0 = closed
  const [visemeIndex, setVisemeIndex] = useState(0);
  
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  
  // Use refs to track latest state without triggering re-renders
  const currentVisemeRef = useRef(currentViseme);
  const targetVisemeRef = useRef(targetViseme);
  const visemeTransitionRef = useRef(visemeTransition);
  const visemeDataRef = useRef(visemeData);
  const isPlayingRef = useRef(isPlaying);
  
  // Update refs when state changes to avoid unnecessary rerenders
  useEffect(() => {
    currentVisemeRef.current = currentViseme;
  }, [currentViseme]);
  
  useEffect(() => {
    targetVisemeRef.current = targetViseme;
  }, [targetViseme]);
  
  useEffect(() => {
    visemeTransitionRef.current = visemeTransition;
  }, [visemeTransition]);
  
  useEffect(() => {
    visemeDataRef.current = visemeData;
  }, [visemeData]);
  
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    // Reset animation when playback starts
    if (isPlaying && visemeData?.length > 0) {
      setVisemeIndex(0);
    }
  }, [isPlaying, visemeData]);
  
  // Add blinking effect using requestAnimationFrame for better performance
  useEffect(() => {
    let rafId;
    let lastBlinkTime = 0;
    
    const animateBlink = (timestamp) => {
      const blinkInterval = 3000 + (Math.random() * 3000); // 3-6 seconds
      
      if (timestamp - lastBlinkTime > blinkInterval) {
        lastBlinkTime = timestamp;
        doBlink();
      }
      
      rafId = requestAnimationFrame(animateBlink);
    };
    
    const doBlink = () => {
      // Eye closing animation
      let closingProgress = 1;
      
      const closeEyes = () => {
        closingProgress -= 0.1;
        setBlinkState(closingProgress);
        
        if (closingProgress > 0) {
          setTimeout(closeEyes, 10);
        } else {
          // Eyes fully closed, pause briefly
          setTimeout(openEyes, 40);
        }
      };
      
      // Eye opening animation
      const openEyes = () => {
        let openingProgress = 0;
        
        const animate = () => {
          openingProgress += 0.1;
          setBlinkState(openingProgress);
          
          if (openingProgress < 1) {
            setTimeout(animate, 10);
          }
        };
        
        animate();
      };
      
      closeEyes();
    };
    
    // Start animation loop
    rafId = requestAnimationFrame(animateBlink);
    
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);
  
  // Handle viseme animation
  useEffect(() => {
    if (!isPlaying || !visemeData || visemeData.length === 0) {
      // Reset to neutral when not playing
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      setTargetViseme(0);
      transitionToViseme(0);
      return;
    }
    
    // Start animation
    setVisemeIndex(0);
    
    // Play audio if URL is provided
    if (audioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('Audio playback error:', err);
        });
      }
    }
    
    // Start animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animateViseme);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, visemeData, audioUrl]);
  
  // Process viseme animation
  const animateViseme = () => {
    if (!isPlayingRef.current || !visemeDataRef.current || visemeDataRef.current.length === 0) {
      return;
    }
    
    // Get current viseme based on index
    const currentIndex = visemeIndex;
    
    if (currentIndex >= visemeDataRef.current.length) {
      // Animation finished
      if (onPlayComplete) {
        onPlayComplete();
      }
      return;
    }
    
    // Set target viseme
    const visemeId = visemeDataRef.current[currentIndex].visemeId;
    setTargetViseme(visemeId);
    transitionToViseme(visemeId);
    
    // Schedule next viseme
    const currentTime = visemeDataRef.current[currentIndex].audioOffset;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < visemeDataRef.current.length) {
      const nextTime = visemeDataRef.current[nextIndex].audioOffset;
      const timeToNextViseme = nextTime - currentTime;
      
      setTimeout(() => {
        setVisemeIndex(nextIndex);
        animationRef.current = requestAnimationFrame(animateViseme);
      }, Math.max(16, timeToNextViseme)); // Ensure minimum 16ms (60fps)
    }
  };
  
  // Transition between visemes with improved easing
  const transitionToViseme = (visemeId) => {
    if (currentVisemeRef.current === visemeId) {
      return;
    }
    
    // Clear any existing transition
    if (transitionTimerRef.current) {
      cancelAnimationFrame(transitionTimerRef.current);
    }
    
    // Store target viseme for transition
    setTargetViseme(visemeId);
    
    // Reset transition progress
    setVisemeTransition(0);
    
    // Create a faster but smoother transition
    const transitionDuration = 65; // ms - slightly faster for more responsive animation
    const startTime = performance.now();
    
    const updateTransition = () => {
      const elapsed = performance.now() - startTime;
      let progress = Math.min(1, elapsed / transitionDuration);
      
      // Use easeOutQuad for smoother acceleration/deceleration
      // t*(2-t) creates a more natural feel than linear
      progress = progress * (2 - progress);
      
      if (progress < 1) {
        setVisemeTransition(progress);
        transitionTimerRef.current = requestAnimationFrame(updateTransition);
      } else {
        // Transition complete
        setCurrentViseme(visemeId);
        setVisemeTransition(1);
      }
    };
    
    transitionTimerRef.current = requestAnimationFrame(updateTransition);
  };
  
  // Render mouth shape using current and target viseme
  const getMouthPath = () => {
    const currentPath = mouthPositions[currentViseme]?.path || mouthPositions[0].path;
    
    // Use direct target path for faster visual feedback
    return currentPath;
  };
  
  // Get current viseme mouth paths with interpolation between shapes
  const getMouthPaths = () => {
    // If not in transition, just return current viseme paths
    if (visemeTransition >= 1) {
      const currentOuterPath = mouthPositions[currentViseme]?.path || mouthPositions[0].path;
      const currentInnerPath = mouthPositions[currentViseme]?.innerPath || mouthPositions[0].innerPath;
      
      return { 
        outerPath: currentOuterPath,
        innerPath: currentInnerPath
      };
    }
    
    // Else interpolate between current and target viseme
    // This creates smoother transitions by actual path interpolation
    const startOuterPath = mouthPositions[currentViseme]?.path || mouthPositions[0].path;
    const endOuterPath = mouthPositions[targetViseme]?.path || mouthPositions[0].path;
    
    const startInnerPath = mouthPositions[currentViseme]?.innerPath || mouthPositions[0].innerPath;
    const endInnerPath = mouthPositions[targetViseme]?.innerPath || mouthPositions[0].innerPath;
    
    // SVG path interpolation (simplified for this context)
    // Only works well for paths with same structure and command count
    const interpolatePath = (pathA, pathB, progress) => {
      // Extract numeric values from paths (assumes paths have same structure)
      const numbersA = pathA.match(/-?\d+(\.\d+)?/g).map(Number);
      const numbersB = pathB.match(/-?\d+(\.\d+)?/g).map(Number);
      
      if (numbersA.length !== numbersB.length) {
        // Fallback if structures don't match
        return progress < 0.5 ? pathA : pathB;
      }
      
      // Create a template from path A
      let result = pathA;
      
      // Replace each number with interpolated value
      for (let i = 0; i < numbersA.length; i++) {
        const interpolated = numbersA[i] + (numbersB[i] - numbersA[i]) * progress;
        result = result.replace(numbersA[i], interpolated.toFixed(2));
      }
      
      return result;
    };
    
    return {
      outerPath: interpolatePath(startOuterPath, endOuterPath, visemeTransition),
      innerPath: interpolatePath(startInnerPath, endInnerPath, visemeTransition)
    };
  };
  
  // Render eyes with blinking
  const renderEyes = () => {
    // Calculate eye shape based on blink state
    const eyeHeight = 6 * blinkState; // Slightly larger eyes
    
    // Make eyes slightly more expressive based on viseme
    // For certain visemes (like surprised or wide open mouth), eyes react slightly
    const isWideOpenMouth = [2, 9, 11].includes(currentViseme);
    const isSmileMouth = [6].includes(currentViseme);
    
    // Adjust eye height based on mouth shape
    const eyeHeightAdjusted = isWideOpenMouth ? eyeHeight * 1.15 : 
                              isSmileMouth ? eyeHeight * 0.9 : eyeHeight;
    
    // Eye position adjustments - slight upward look for wide mouth, slight down for smile
    const eyeYPosition = isWideOpenMouth ? 44 : isSmileMouth ? 45.5 : 45;
    
    return (
      <>
        {/* Eyelids - slight shadow above eyes */}
        <path 
          d={`M37,${eyeYPosition-eyeHeightAdjusted/1.2} Q45,${eyeYPosition-eyeHeightAdjusted*1.1} 53,${eyeYPosition-eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1.5"
          opacity="0.3"
        />
        <path 
          d={`M77,${eyeYPosition-eyeHeightAdjusted/1.2} Q85,${eyeYPosition-eyeHeightAdjusted*1.1} 93,${eyeYPosition-eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1.5"
          opacity="0.3"
        />
        
        {/* Left eye */}
        <ellipse
          cx="45" 
          cy={eyeYPosition} 
          rx="8.5"
          ry={eyeHeightAdjusted} 
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Eye shadow under eye */}
        <path 
          d={`M37,${eyeYPosition+eyeHeightAdjusted/1.5} Q45,${eyeYPosition+eyeHeightAdjusted*1.1} 53,${eyeYPosition+eyeHeightAdjusted/1.5}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1"
          opacity="0.2"
        />
        
        {/* Left iris & pupil */}
        <circle 
          cx="45" 
          cy={eyeYPosition} 
          r={blinkState * 3.5} 
          fill="#6B4F4F"
        />
        <circle 
          cx="45" 
          cy={eyeYPosition} 
          r={blinkState * 2} 
          fill="#333"
        />
        {/* Light reflection in eye */}
        <circle 
          cx="46.5" 
          cy={eyeYPosition-1} 
          r={blinkState * 0.8} 
          fill="white"
          opacity="0.8"
        />
        
        {/* Right eye */}
        <ellipse
          cx="85" 
          cy={eyeYPosition} 
          rx="8.5"
          ry={eyeHeightAdjusted} 
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Eye shadow under eye */}
        <path 
          d={`M77,${eyeYPosition+eyeHeightAdjusted/1.5} Q85,${eyeYPosition+eyeHeightAdjusted*1.1} 93,${eyeYPosition+eyeHeightAdjusted/1.5}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1"
          opacity="0.2"
        />
        
        {/* Right iris & pupil */}
        <circle 
          cx="85" 
          cy={eyeYPosition} 
          r={blinkState * 3.5} 
          fill="#6B4F4F"
        />
        <circle 
          cx="85" 
          cy={eyeYPosition} 
          r={blinkState * 2} 
          fill="#333"
        />
        {/* Light reflection in eye */}
        <circle 
          cx="86.5" 
          cy={eyeYPosition-1} 
          r={blinkState * 0.8} 
          fill="white"
          opacity="0.8"
        />
      </>
    );
  };
  
  // Render eyebrows with subtle movement based on viseme
  const renderEyebrows = () => {
    // Adjust eyebrows based on mouth shape - subtle expressions
    const isWideOpenMouth = [2, 9, 11].includes(currentViseme);
    const isSmileMouth = [6].includes(currentViseme);
    const isNarrowMouth = [7, 8, 15, 16, 21].includes(currentViseme);
    
    // Eyebrow positions
    let leftBrowPath, rightBrowPath;
    
    if (isWideOpenMouth) {
      // Surprised expression - eyebrows raised
      leftBrowPath = "M33,32 Q45,25 57,32";
      rightBrowPath = "M73,32 Q85,25 97,32";
    } else if (isSmileMouth) {
      // Happy expression - eyebrows relaxed
      leftBrowPath = "M35,36 Q45,32 55,36";
      rightBrowPath = "M75,36 Q85,32 95,36";
    } else if (isNarrowMouth) {
      // Focused expression - eyebrows slightly angled
      leftBrowPath = "M35,34 Q45,31 55,35";
      rightBrowPath = "M75,35 Q85,31 95,34";
    } else {
      // Neutral expression
      leftBrowPath = "M35,35 Q45,30 55,35";
      rightBrowPath = "M75,35 Q85,30 95,35";
    }
    
    return (
      <>
        <path 
          d={leftBrowPath} 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path 
          d={rightBrowPath} 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    );
  };
  
  return (
    <div className="viseme-face">
      {/* Audio element for playing speech */}
      <audio 
        ref={audioRef} 
        src={audioUrl || ''}
        onEnded={() => {
          if (onPlayComplete) {
            onPlayComplete();
          }
        }}
        style={{ display: 'none' }}
      />
      
      {/* SVG Face */}
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 130 130" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Face background with subtle gradient */}
        <defs>
          <radialGradient id="faceGradient" cx="65" cy="60" r="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFEBC9" />
            <stop offset="95%" stopColor="#F5D08A" />
          </radialGradient>
        </defs>
        
        <circle 
          cx="65" 
          cy="65" 
          r="60" 
          fill="url(#faceGradient)" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Subtle cheeks */}
        <circle 
          cx="40" 
          cy="72" 
          r="8" 
          fill="#FFBFBF"
          opacity="0.25"
        />
        <circle 
          cx="90" 
          cy="72" 
          r="8" 
          fill="#FFBFBF"
          opacity="0.25"
        />
        
        {/* Eyes */}
        {renderEyes()}
        
        {/* Eyebrows */}
        {renderEyebrows()}
        
        {/* Nose */}
        <path 
          d="M65,50 L65,65 M58,65 Q65,70 72,65" 
          fill="none" 
          stroke="#333"
          strokeWidth="1.5"
        />
        
        {/* Mouth - Enhanced with lip definition */}
        <g className="mouth">
          {/* Lip outline */}
          <path
            d={getMouthPaths().outerPath}
            fill="#e57373" 
            stroke="#333"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          
          {/* Inner mouth line */}
          <path
            d={getMouthPaths().innerPath}
            fill="none" 
            stroke="#7c2929"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
});

export default VisemeFace; 