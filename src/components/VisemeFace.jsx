import React, { useEffect, useRef, useState, memo, useCallback } from 'react';

// Enhanced mouth positions for Hong Kong Cantonese and English pronunciation
const mouthPositions = {
  0: { // Silence - neutral position for Hong Kong male
    path: "M52,70 Q65,69 78,70",
    innerPath: "M54,70 Q65,69.5 76,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ - common in Hong Kong English
    path: "M50,72 Q65,76 80,72",
    innerPath: "M52,72 Q65,74 78,72",
    description: "Slight Open"
  },
  2: { // ɑ - Open for Cantonese vowels
    path: "M48,76 Q65,84 82,76",
    innerPath: "M50,76 Q65,80 80,76",
    description: "Open"
  },
  3: { // ɔ - Rounded open for Cantonese
    path: "M50,74 Q65,80 80,74",
    innerPath: "M52,74 Q65,77 78,74",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ - Mid open for Cantonese
    path: "M49,73 Q65,78 81,73",
    innerPath: "M51,73 Q65,76 79,73",
    description: "Mid Open"
  },
  5: { // ɝ - R-sound (less pronounced in HK accent)
    path: "M51,71 Q65,74 79,71",
    innerPath: "M53,71 Q65,73 77,71",
    description: "R-sound"
  },
  6: { // j, i, ɪ - Smile (more reserved)
    path: "M48,69 Q65,71 82,69",
    innerPath: "M50,69 Q65,70 80,69",
    description: "Smile"
  },
  7: { // w, u - Rounded (HK pronunciation)
    path: "M54,70 Q65,66 76,70",
    innerPath: "M56,70 Q65,67 74,70",
    description: "Rounded"
  },
  8: { // o - Small rounded (Cantonese)
    path: "M53,71 Q65,68 77,71",
    innerPath: "M55,71 Q65,69 75,71",
    description: "Small Rounded"
  },
  9: { // aʊ - Wide open (Cantonese diphthong)
    path: "M47,75 Q65,82 83,75",
    innerPath: "M49,75 Q65,79 81,75",
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
  const [targetViseme, setTargetViseme] = useState(0);
  const [visemeTransition, setVisemeTransition] = useState(1);
  const [blinkState, setBlinkState] = useState(1);
  const [visemeIndex, setVisemeIndex] = useState(0);
  const [expressionState, setExpressionState] = useState({
    eyebrowRaise: 0,
    mouthTension: 0,
    cheekRaise: 0
  });
  
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
  
  // Add new ref for tracking audio load state
  const audioLoadedRef = useRef(false);
  
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
  
  // Enhanced blinking with natural variations
  useEffect(() => {
    let rafId;
    let lastBlinkTime = 0;
    let blinkProbability = 0.1; // Base probability
    
    const animateBlink = (timestamp) => {
      const timeSinceLastBlink = timestamp - lastBlinkTime;
      
      // Increase probability of blinking as time passes
      if (timeSinceLastBlink > 2000) {
        blinkProbability = Math.min(0.8, blinkProbability + 0.1);
        
        if (Math.random() < blinkProbability) {
          lastBlinkTime = timestamp;
          blinkProbability = 0.1; // Reset probability
          doBlink();
        }
      }
      
      rafId = requestAnimationFrame(animateBlink);
    };
    
    const doBlink = () => {
      let closingProgress = 1;
      const closingSpeed = 0.15 + Math.random() * 0.1; // Variable speed
      
      const closeEyes = () => {
        closingProgress -= closingSpeed;
        setBlinkState(Math.max(0, closingProgress));
        
        if (closingProgress > 0) {
          setTimeout(closeEyes, 16);
        } else {
          setTimeout(openEyes, 30 + Math.random() * 20); // Variable pause
        }
      };
      
      const openEyes = () => {
        let openingProgress = 0;
        const openingSpeed = 0.12 + Math.random() * 0.08;
        
        const animate = () => {
          openingProgress += openingSpeed;
          setBlinkState(Math.min(1, openingProgress));
          
          if (openingProgress < 1) {
            setTimeout(animate, 16);
          }
        };
        
        animate();
      };
      
      closeEyes();
    };
    
    rafId = requestAnimationFrame(animateBlink);
    
    return () => cancelAnimationFrame(rafId);
  }, []);
  
  // Enhanced viseme animation with natural micro-movements
  const animateViseme = useCallback(() => {
    if (!isPlayingRef.current || !visemeDataRef.current || visemeDataRef.current.length === 0) {
      return;
    }
    
    const currentIndex = visemeIndex;
    
    if (currentIndex >= visemeDataRef.current.length) {
      if (onPlayComplete) {
        onPlayComplete();
      }
      return;
    }
    
    const visemeId = visemeDataRef.current[currentIndex].visemeId;
    setTargetViseme(visemeId);
    
    // Add subtle micro-movements
    setExpressionState(prev => ({
      eyebrowRaise: Math.random() * 0.2,
      mouthTension: Math.random() * 0.15,
      cheekRaise: Math.random() * 0.1
    }));
    
    transitionToViseme(visemeId);
    
    const currentTime = visemeDataRef.current[currentIndex].audioOffset;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < visemeDataRef.current.length) {
      const nextTime = visemeDataRef.current[nextIndex].audioOffset;
      const timeToNextViseme = nextTime - currentTime;
      
      setTimeout(() => {
        setVisemeIndex(nextIndex);
        animationRef.current = requestAnimationFrame(animateViseme);
      }, Math.max(16, timeToNextViseme));
    }
  }, [visemeIndex, onPlayComplete]);
  
  // Improved transition with dynamic easing
  const transitionToViseme = useCallback((visemeId) => {
    if (currentVisemeRef.current === visemeId) {
      return;
    }
    
    if (transitionTimerRef.current) {
      cancelAnimationFrame(transitionTimerRef.current);
    }
    
    setTargetViseme(visemeId);
    setVisemeTransition(0);
    
    const transitionDuration = 60 + Math.random() * 40; // Variable duration
    const startTime = performance.now();
    
    const updateTransition = () => {
      const elapsed = performance.now() - startTime;
      let progress = Math.min(1, elapsed / transitionDuration);
      
      // Custom easing function with natural acceleration/deceleration
      progress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      if (progress < 1) {
        setVisemeTransition(progress);
        transitionTimerRef.current = requestAnimationFrame(updateTransition);
      } else {
        setCurrentViseme(visemeId);
        setVisemeTransition(1);
      }
    };
    
    transitionTimerRef.current = requestAnimationFrame(updateTransition);
  }, []);
  
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
  
  // Enhanced audio handling
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleCanPlay = () => {
      console.log('Audio can play');
      audioLoadedRef.current = true;
      if (isPlaying) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(error => {
            console.error('Audio playback failed:', error);
          });
        }
      }
    };

    const handleEnded = () => {
      console.log('Audio playback ended');
      if (onPlayComplete) {
        onPlayComplete();
      }
    };

    const handleError = (error) => {
      console.error('Audio error:', error);
      audioLoadedRef.current = false;
      if (onPlayComplete) {
        onPlayComplete();
      }
    };

    // Add event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Cleanup
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onPlayComplete]);

  // Handle play state changes
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (isPlaying) {
      if (audioLoadedRef.current) {
        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(error => {
            console.error('Audio playback failed:', error);
          });
        }
      } else {
        console.log('Audio not loaded yet, waiting for canplay event');
      }
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isPlaying]);

  // Update audio source
  useEffect(() => {
    if (!audioRef.current) return;

    audioLoadedRef.current = false;
    audioRef.current.load();
  }, [audioUrl]);

  return (
    <div className="viseme-face">
      {/* Audio element for playing speech */}
      <audio 
        ref={audioRef} 
        src={audioUrl || ''}
        preload="auto"
        onEnded={onPlayComplete}
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
          d="M25,42 Q45,25 65,22 Q85,25 105,42"
          fill="none"
          stroke="#222"
          strokeWidth="3"
        />
        
        {/* Age-appropriate features for 58-year-old Asian male */}
        
        {/* Forehead lines */}
        <path
          d="M40,32 Q65,28 90,32"
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
          d="M30,65 Q45,85 50,90"
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
          d="M60,50 Q65,52 70,50" 
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
        <g className="mouth" style={{
          transform: `translate(0, ${expressionState.mouthTension}px)`
        }}>
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
            fill="#A85C50" 
            stroke="#444"
            strokeWidth="1"
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