import React, { useEffect, useRef, useState, memo } from 'react';

// More expressive mouth positions for different visemes
const mouthPositions = {
  0: { // Silence
    path: "M50,70 Q65,65 80,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ
    path: "M48,75 Q65,88 82,75",
    description: "Slight Open"
  },
  2: { // ɑ
    path: "M45,82 Q65,100 85,82",
    description: "Open"
  },
  3: { // ɔ
    path: "M48,80 Q65,98 82,80",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ
    path: "M48,78 Q65,92 82,78",
    description: "Mid Open"
  },
  5: { // ɝ
    path: "M48,75 Q65,90 82,75",
    description: "R-sound"
  },
  6: { // j, i, ɪ
    path: "M42,70 Q65,76 88,70",
    description: "Smile"
  },
  7: { // w, u
    path: "M55,72 Q65,60 75,72",
    description: "Rounded"
  },
  8: { // o
    path: "M55,72 Q65,62 75,72",
    description: "Small Rounded"
  },
  9: { // aʊ
    path: "M45,80 Q65,96 85,80",
    description: "Wide Open"
  },
  10: { // ɔɪ
    path: "M48,76 Q65,90 82,76",
    description: "Complex Round"
  },
  11: { // aɪ
    path: "M46,78 Q65,94 84,78",
    description: "Complex Open"
  },
  12: { // h
    path: "M48,74 Q65,86 82,74",
    description: "Breathing"
  },
  13: { // ɹ
    path: "M50,72 Q65,82 80,72",
    description: "R-sound"
  },
  14: { // l
    path: "M50,70 Q65,78 80,70",
    description: "L-sound"
  },
  15: { // s, z
    path: "M55,70 Q65,70 75,70",
    description: "S/Z Sound"
  },
  16: { // ʃ, tʃ, dʒ, ʒ
    path: "M55,70 Q65,66 75,70",
    description: "SH Sound"
  },
  17: { // ð
    path: "M48,70 Q65,76 82,70",
    description: "TH Sound"
  },
  18: { // f, v
    path: "M50,69 Q65,60 80,69",
    description: "F/V Sound"
  },
  19: { // d, t, n, θ
    path: "M50,70 Q65,74 80,70",
    description: "D/T Sound"
  },
  20: { // k, g, ŋ
    path: "M50,70 Q65,72 80,70",
    description: "K/G Sound"
  },
  21: { // p, b, m
    path: "M55,70 Q65,64 75,70",
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
  
  // Transition between visemes smoothly
  const transitionToViseme = (visemeId) => {
    if (currentVisemeRef.current === visemeId) {
      return;
    }
    
    // Clear any existing transition
    if (transitionTimerRef.current) {
      clearInterval(transitionTimerRef.current);
    }
    
    // Reset transition progress
    setVisemeTransition(0);
    
    // Create a faster transition
    const transitionDuration = 80; // ms - faster transition
    const startTime = performance.now();
    
    const updateTransition = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / transitionDuration);
      
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
  
  // Render eyes with blinking
  const renderEyes = () => {
    // Calculate eye shape based on blink state
    const eyeHeight = 5 * blinkState; // When blinkState=0, height=0 (closed)
    
    return (
      <>
        {/* Left eye */}
        <ellipse
          cx="45" 
          cy="45" 
          rx="8"
          ry={eyeHeight} 
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        <circle 
          cx="45" 
          cy="45" 
          r={blinkState * 2.5} 
          fill="#333"
        />
        
        {/* Right eye */}
        <ellipse
          cx="85" 
          cy="45" 
          rx="8"
          ry={eyeHeight} 
          fill="white"
          stroke="#333"
          strokeWidth="1"
        />
        <circle 
          cx="85" 
          cy="45" 
          r={blinkState * 2.5} 
          fill="#333"
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
        {/* Face background */}
        <circle 
          cx="65" 
          cy="65" 
          r="60" 
          fill="#F7D08A" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Eyes */}
        {renderEyes()}
        
        {/* Eyebrows */}
        <path 
          d="M35,35 Q45,30 55,35" 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
        />
        <path 
          d="M75,35 Q85,30 95,35" 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Nose */}
        <path 
          d="M65,50 L65,65 M58,65 Q65,70 72,65" 
          fill="none" 
          stroke="#333"
          strokeWidth="1.5"
        />
        
        {/* Mouth */}
        <path
          d={getMouthPath()}
          fill="none" 
          stroke="#333"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
});

export default VisemeFace; 