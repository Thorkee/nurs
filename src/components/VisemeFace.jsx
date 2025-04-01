import React, { useEffect, useRef, useState, memo } from 'react';

// More expressive mouth positions for different visemes
const mouthPositions = {
  0: { // Silence
    path: "M50,70 Q57,68 65,69 Q73,68 80,70",
    innerPath: "M52,70 Q65,69.5 78,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ
    path: "M48,74 Q57,80 65,81 Q73,80 82,74",
    innerPath: "M50,74 Q65,77 80,74",
    description: "Slight Open"
  },
  2: { // ɑ - Open but less exaggerated
    path: "M45,80 Q57,92 65,94 Q73,92 85,80",
    innerPath: "M48,81 Q65,89 82,81",
    description: "Open"
  },
  3: { // ɔ - Rounded open, more controlled
    path: "M50,78 Q57,88 65,90 Q73,88 80,78",
    innerPath: "M52,79 Q65,85 78,79",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ - Mid open, more realistic
    path: "M48,76 Q57,84 65,86 Q73,84 82,76",
    innerPath: "M50,76 Q65,81 80,76",
    description: "Mid Open"
  },
  5: { // ɝ - R-sound, slightly restrained
    path: "M50,75 Q57,82 65,84 Q73,82 80,75",
    innerPath: "M52,75 Q65,78 78,75",
    description: "R-sound"
  },
  6: { // j, i, ɪ - More subtle smile
    path: "M45,68 Q57,72 65,73 Q73,72 85,68",
    innerPath: "M47,69 Q65,71 83,69",
    description: "Smile"
  },
  7: { // w, u - Asian pronunciation, less rounded
    path: "M55,72 Q65,64 75,72",
    innerPath: "M57,71 Q65,66 73,71",
    description: "Rounded"
  },
  8: { // o - Small rounded, adjusted for Asian pronunciation
    path: "M53,72 Q65,67 77,72",
    innerPath: "M55,71 Q65,68 75,71",
    description: "Small Rounded"
  },
  9: { // aʊ - Wide open but less dramatic
    path: "M45,80 Q57,91 65,92 Q73,91 85,80",
    innerPath: "M48,80 Q65,88 82,80",
    description: "Wide Open"
  },
  10: { // ɔɪ - Complex round, more controlled
    path: "M47,76 Q57,84 65,86 Q73,84 83,76",
    innerPath: "M50,76 Q65,81 80,76",
    description: "Complex Round"
  },
  11: { // aɪ - Complex open, more natural
    path: "M46,78 Q57,88 65,90 Q73,88 84,78",
    innerPath: "M49,79 Q65,85 81,79",
    description: "Complex Open"
  },
  12: { // h - Restrained breathing
    path: "M48,74 Q57,80 65,82 Q73,80 82,74",
    innerPath: "M50,75 Q65,78 80,75",
    description: "Breathing"
  },
  13: { // ɹ - Subtle R-sound, Asian accent
    path: "M50,72 Q57,78 65,79 Q73,78 80,72",
    innerPath: "M52,73 Q65,76 78,73",
    description: "R-sound"
  },
  14: { // l - L-sound, Asian accent
    path: "M50,71 Q57,75 65,76 Q73,75 80,71",
    innerPath: "M52,71 Q65,73 78,71",
    description: "L-sound"
  },
  15: { // s, z - S/Z sound, more natural
    path: "M52,70 Q65,69 78,70",
    innerPath: "M54,70 Q65,69.5 76,70",
    description: "S/Z Sound"
  },
  16: { // ʃ, tʃ, dʒ, ʒ - SH sound, Asian accent
    path: "M53,70 Q65,67 77,70",
    innerPath: "M55,70 Q65,68 75,70",
    description: "SH Sound"
  },
  17: { // ð - TH sound, often challenging for Asian speakers
    path: "M50,70 Q57,73 65,74 Q73,73 80,70",
    innerPath: "M52,71 Q65,72 78,71",
    description: "TH Sound"
  },
  18: { // f, v - F/V sound, Asian pronunciation
    path: "M52,69 Q57,65 65,64 Q73,65 78,69",
    innerPath: "M54,69 Q65,66 76,69",
    description: "F/V Sound"
  },
  19: { // d, t, n, θ - D/T sound, Asian accent
    path: "M50,70 Q57,72 65,73 Q73,72 80,70",
    innerPath: "M52,71 Q65,71.5 78,71",
    description: "D/T Sound"
  },
  20: { // k, g, ŋ - K/G sound, subtle
    path: "M50,70 Q57,71 65,72 Q73,71 80,70",
    innerPath: "M52,70 Q65,70.5 78,70",
    description: "K/G Sound"
  },
  21: { // p, b, m - P/B/M sound, Asian accent
    path: "M55,69 Q65,66 75,69",
    innerPath: "M57,69 Q65,67 73,69",
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
    
    // More controlled transition for older speaker - slightly slower, more deliberate
    const transitionDuration = 80; // ms - slightly slower for more realistic movement of older person
    const startTime = performance.now();
    
    const updateTransition = () => {
      const elapsed = performance.now() - startTime;
      let progress = Math.min(1, elapsed / transitionDuration);
      
      // Custom easing function - more controlled, less bouncy
      // This creates a more mature, deliberate mouth movement
      progress = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
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
    const eyeHeight = 4.5 * blinkState; // Smaller, more asian-looking eyes
    
    // Make eyes slightly more expressive based on viseme
    const isWideOpenMouth = [2, 9, 11].includes(currentViseme);
    const isSmileMouth = [6].includes(currentViseme);
    
    // Adjust eye height based on mouth shape
    const eyeHeightAdjusted = isWideOpenMouth ? eyeHeight * 1.15 : 
                              isSmileMouth ? eyeHeight * 0.85 : eyeHeight;
    
    // Eye position adjustments
    const eyeYPosition = isWideOpenMouth ? 44 : isSmileMouth ? 45.5 : 45;
    
    return (
      <>
        {/* Asian eye shape - epicanthic fold */}
        <path 
          d={`M35,${eyeYPosition-eyeHeightAdjusted/2} Q40,${eyeYPosition-eyeHeightAdjusted*1.2} 45,${eyeYPosition-eyeHeightAdjusted/1.5}`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          opacity="0.6"
        />
        <path 
          d={`M75,${eyeYPosition-eyeHeightAdjusted/2} Q80,${eyeYPosition-eyeHeightAdjusted*1.2} 85,${eyeYPosition-eyeHeightAdjusted/1.5}`}
          fill="none"
          stroke="#333"
          strokeWidth="1"
          opacity="0.6"
        />
        
        {/* Eyelids shadow - aged appearance */}
        <path 
          d={`M37,${eyeYPosition-eyeHeightAdjusted/1.2} Q45,${eyeYPosition-eyeHeightAdjusted*1.1} 53,${eyeYPosition-eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1.5"
          opacity="0.5"
        />
        <path 
          d={`M77,${eyeYPosition-eyeHeightAdjusted/1.2} Q85,${eyeYPosition-eyeHeightAdjusted*1.1} 93,${eyeYPosition-eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1.5"
          opacity="0.5"
        />
        
        {/* Left eye - more almond shaped */}
        <path
          d={`M38,${eyeYPosition} Q45,${eyeYPosition+eyeHeightAdjusted} 52,${eyeYPosition} Q45,${eyeYPosition-eyeHeightAdjusted} 38,${eyeYPosition}`}
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Aged appearance - slight eye bags */}
        <path 
          d={`M37,${eyeYPosition+eyeHeightAdjusted/1.2} Q45,${eyeYPosition+eyeHeightAdjusted*1.8} 53,${eyeYPosition+eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1"
          opacity="0.4"
        />
        
        {/* Left iris & pupil - dark brown */}
        <circle 
          cx="45" 
          cy={eyeYPosition} 
          r={blinkState * 3.2} 
          fill="#4A3520"
        />
        <circle 
          cx="45" 
          cy={eyeYPosition} 
          r={blinkState * 1.8} 
          fill="#1A1108"
        />
        {/* Light reflection in eye */}
        <circle 
          cx="46.5" 
          cy={eyeYPosition-1} 
          r={blinkState * 0.7} 
          fill="white"
          opacity="0.8"
        />
        
        {/* Right eye - more almond shaped */}
        <path
          d={`M78,${eyeYPosition} Q85,${eyeYPosition+eyeHeightAdjusted} 92,${eyeYPosition} Q85,${eyeYPosition-eyeHeightAdjusted} 78,${eyeYPosition}`}
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Aged appearance - slight eye bags */}
        <path 
          d={`M77,${eyeYPosition+eyeHeightAdjusted/1.2} Q85,${eyeYPosition+eyeHeightAdjusted*1.8} 93,${eyeYPosition+eyeHeightAdjusted/1.2}`}
          fill="none"
          stroke="#88665D"
          strokeWidth="1"
          opacity="0.4"
        />
        
        {/* Right iris & pupil - dark brown */}
        <circle 
          cx="85" 
          cy={eyeYPosition} 
          r={blinkState * 3.2} 
          fill="#4A3520"
        />
        <circle 
          cx="85" 
          cy={eyeYPosition} 
          r={blinkState * 1.8} 
          fill="#1A1108"
        />
        {/* Light reflection in eye */}
        <circle 
          cx="86.5" 
          cy={eyeYPosition-1} 
          r={blinkState * 0.7} 
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
    
    // Eyebrow positions - straighter, more horizontal for Asian appearance
    let leftBrowPath, rightBrowPath;
    
    if (isWideOpenMouth) {
      // Surprised expression - eyebrows raised
      leftBrowPath = "M33,32 Q45,28 57,32";
      rightBrowPath = "M73,32 Q85,28 97,32";
    } else if (isSmileMouth) {
      // Happy expression - eyebrows slightly curved
      leftBrowPath = "M35,36 Q45,34 55,36";
      rightBrowPath = "M75,36 Q85,34 95,36";
    } else if (isNarrowMouth) {
      // Focused expression - eyebrows slightly angled
      leftBrowPath = "M35,34 Q45,32 55,35";
      rightBrowPath = "M75,35 Q85,32 95,34";
    } else {
      // Neutral expression - straighter brows
      leftBrowPath = "M35,35 Q45,33 55,35";
      rightBrowPath = "M75,35 Q85,33 95,35";
    }
    
    return (
      <>
        {/* Thicker, darker eyebrows with some gray for age */}
        <path 
          d={leftBrowPath} 
          fill="none" 
          stroke="#222" 
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path 
          d={rightBrowPath} 
          fill="none" 
          stroke="#222" 
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        
        {/* Gray hairs in eyebrows */}
        <path 
          d={leftBrowPath} 
          fill="none" 
          stroke="#888" 
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="2,4"
          opacity="0.6"
        />
        <path 
          d={rightBrowPath} 
          fill="none" 
          stroke="#888" 
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeDasharray="2,4"
          opacity="0.6"
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
            <stop offset="0%" stopColor="#F2D4B1" />
            <stop offset="95%" stopColor="#E3BC8F" />
          </radialGradient>
          
          {/* Subtle skin texture */}
          <pattern id="skinTexture" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect width="10" height="10" fill="url(#faceGradient)" />
            <path d="M0,0 L10,10 M10,0 L0,10" stroke="#D5AA80" strokeWidth="0.2" opacity="0.1" />
          </pattern>
        </defs>
        
        {/* Base face */}
        <circle 
          cx="65" 
          cy="65" 
          r="60" 
          fill="url(#skinTexture)" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Add hairline - short, receding with some gray */}
        <path
          d="M25,40 Q45,20 65,15 Q85,20 105,40"
          fill="none"
          stroke="#333"
          strokeWidth="3"
          opacity="0.7"
        />
        <path
          d="M25,40 Q45,20 65,15 Q85,20 105,40"
          fill="none"
          stroke="#888"
          strokeWidth="2"
          strokeDasharray="3,5"
          opacity="0.5"
        />
        
        {/* Age-appropriate features for 58-year-old Asian male */}
        
        {/* Forehead lines */}
        <path
          d="M40,30 Q65,25 90,30"
          fill="none"
          stroke="#BA9980"
          strokeWidth="0.8"
          opacity="0.3"
        />
        <path
          d="M42,34 Q65,30 88,34"
          fill="none"
          stroke="#BA9980"
          strokeWidth="0.7"
          opacity="0.25"
        />
        
        {/* Age-appropriate cheeks - more angular for a man */}
        <path 
          d="M30,65 Q40,80 45,90"
          fill="none"
          stroke="#BA9980"
          strokeWidth="0.9"
          opacity="0.3"
        />
        <path 
          d="M100,65 Q90,80 85,90"
          fill="none"
          stroke="#BA9980"
          strokeWidth="0.9"
          opacity="0.3"
        />
        
        {/* Nasolabial folds - deeper at 58 */}
        <path 
          d="M47,62 Q50,75 55,85" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="1.2" 
          opacity="0.4"
        />
        <path 
          d="M83,62 Q80,75 75,85" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="1.2" 
          opacity="0.4"
        />
        
        {/* Crow's feet around eyes */}
        <path 
          d="M30,45 L35,43 M32,48 L37,47" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="0.8" 
          opacity="0.3"
        />
        <path 
          d="M100,45 L95,43 M98,48 L93,47" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="0.8" 
          opacity="0.3"
        />
        
        {/* Subtle malar (cheek) bags common in older Asian men */}
        <path 
          d="M35,60 Q45,65 55,62" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="0.8" 
          opacity="0.25"
        />
        <path 
          d="M95,60 Q85,65 75,62" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="0.8" 
          opacity="0.25"
        />
        
        {/* Slight double chin - common in older men */}
        <path 
          d="M50,105 Q65,110 80,105" 
          fill="none" 
          stroke="#BA9980" 
          strokeWidth="1" 
          opacity="0.3"
        />
        
        {/* Eyes */}
        {renderEyes()}
        
        {/* Eyebrows */}
        {renderEyebrows()}
        
        {/* Asian male nose - broader, flatter bridge */}
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
        <path 
          d="M60,55 Q65,53 70,55" 
          fill="none" 
          stroke="#333"
          strokeWidth="1"
          opacity="0.7"
        />
        <path 
          d="M60,65 Q65,62 70,65" 
          fill="none" 
          stroke="#555"
          strokeWidth="0.7"
          opacity="0.5"
        />
        
        {/* Mouth - More realistic Asian male lips */}
        <g className="mouth">
          {/* Subtle creases around mouth for age */}
          <path
            d={`M48,78 Q54,85 60,88`}
            fill="none"
            stroke="#BA9980"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <path
            d={`M82,78 Q76,85 70,88`}
            fill="none"
            stroke="#BA9980"
            strokeWidth="0.8"
            opacity="0.4"
          />
          
          {/* Lip outline - thinner, more masculine */}
          <path
            d={getMouthPaths().outerPath}
            fill="#C26D60" 
            stroke="#444"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          
          {/* Inner mouth line - darker, more subtle */}
          <path
            d={getMouthPaths().innerPath}
            fill="none" 
            stroke="#693A34"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      </svg>
    </div>
  );
});

export default VisemeFace; 