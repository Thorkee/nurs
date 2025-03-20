import React, { useEffect, useRef, useState } from 'react';

// More expressive mouth positions for different visemes
const mouthPositions = {
  0: { // Silence
    path: "M50,70 Q65,65 80,70",
    description: "Silence/Rest"
  },
  1: { // æ, ə, ʌ
    path: "M50,75 Q65,85 80,75",
    description: "Slight Open"
  },
  2: { // ɑ
    path: "M50,80 Q65,95 80,80",
    description: "Open"
  },
  3: { // ɔ
    path: "M50,78 Q65,92 80,78",
    description: "Rounded Open"
  },
  4: { // ɛ, ʊ
    path: "M50,76 Q65,86 80,76",
    description: "Mid Open"
  },
  5: { // ɝ
    path: "M50,74 Q65,84 80,74",
    description: "R-sound"
  },
  6: { // j, i, ɪ
    path: "M45,70 Q65,74 85,70",
    description: "Smile"
  },
  7: { // w, u
    path: "M55,72 Q65,64 75,72",
    description: "Rounded"
  },
  8: { // o
    path: "M55,72 Q65,66 75,72",
    description: "Small Rounded"
  },
  9: { // aʊ
    path: "M50,78 Q65,88 80,78",
    description: "Wide Open"
  },
  10: { // ɔɪ
    path: "M52,75 Q65,83 78,75",
    description: "Complex Round"
  },
  11: { // aɪ
    path: "M50,76 Q65,88 80,76",
    description: "Complex Open"
  },
  12: { // h
    path: "M50,72 Q65,80 80,72",
    description: "Breathing"
  },
  13: { // ɹ
    path: "M50,72 Q65,78 80,72",
    description: "R-sound"
  },
  14: { // l
    path: "M50,70 Q65,76 80,70",
    description: "L-sound"
  },
  15: { // s, z
    path: "M55,70 Q65,70 75,70",
    description: "S/Z Sound"
  },
  16: { // ʃ, tʃ, dʒ, ʒ
    path: "M55,70 Q65,68 75,70",
    description: "SH Sound"
  },
  17: { // ð
    path: "M50,70 Q65,74 80,70",
    description: "TH Sound"
  },
  18: { // f, v
    path: "M50,69 Q65,63 80,69",
    description: "F/V Sound"
  },
  19: { // d, t, n, θ
    path: "M50,70 Q65,73 80,70",
    description: "D/T Sound"
  },
  20: { // k, g, ŋ
    path: "M50,70 Q65,72 80,70",
    description: "K/G Sound"
  },
  21: { // p, b, m
    path: "M55,70 Q65,67 75,70",
    description: "P/B/M Sound"
  }
};

const VisemeFace = ({ visemeData, audioUrl, isPlaying, onPlayComplete }) => {
  const [currentViseme, setCurrentViseme] = useState(0);
  const [targetViseme, setTargetViseme] = useState(0); // New state for smooth transitions
  const [visemeTransition, setVisemeTransition] = useState(1); // 0-1 transition progress
  const [animationMode, setAnimationMode] = useState('normal'); // Always use normal mode
  const [debugInfo, setDebugInfo] = useState('');
  const [visemeIndex, setVisemeIndex] = useState(0);
  const [processedVisemes, setProcessedVisemes] = useState([]);
  const [manualViseme, setManualViseme] = useState(0);
  const [lastVisemeUpdateTime, setLastVisemeUpdateTime] = useState(0); // Track time of last update
  const [blinkState, setBlinkState] = useState(1); // 1 = fully open, 0 = closed
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const transitionTimerRef = useRef(null);
  const blinkTimerRef = useRef(null);
  
  // Add blinking effect
  useEffect(() => {
    const startBlinking = () => {
      // Random time until next blink
      const nextBlinkTime = 2000 + Math.random() * 4000; // 2-6 seconds
      
      blinkTimerRef.current = setTimeout(() => {
        // Blink sequence: open (1) -> closing (0.8-0.1) -> closed (0) -> opening (0.1-0.8) -> open (1)
        const blinkSequence = async () => {
          // Closing eyes
          for (let i = 10; i >= 0; i--) {
            setBlinkState(i / 10);
            await new Promise(r => setTimeout(r, 15)); // 15ms per step = ~150ms to close
          }
          
          // Keep closed briefly
          await new Promise(r => setTimeout(r, 50));
          
          // Opening eyes
          for (let i = 0; i <= 10; i++) {
            setBlinkState(i / 10);
            await new Promise(r => setTimeout(r, 15)); // 15ms per step = ~150ms to open
          }
          
          // Schedule next blink
          startBlinking();
        };
        
        blinkSequence();
      }, nextBlinkTime);
    };
    
    startBlinking();
    
    return () => {
      if (blinkTimerRef.current) {
        clearTimeout(blinkTimerRef.current);
      }
    };
  }, []);
  
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
  
  // Render eyebrows
  const renderEyebrows = () => {
    // Default neutral eyebrows
    return (
      <>
        {/* Left eyebrow */}
        <path 
          d="M35,35 Q45,30 55,35" 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Right eyebrow */}
        <path 
          d="M75,35 Q85,30 95,35" 
          fill="none" 
          stroke="#333" 
          strokeWidth="2"
        />
      </>
    );
  };
  
  // Process the viseme data when received
  useEffect(() => {
    if (visemeData && visemeData.length > 0) {
      console.log("Received viseme data:", visemeData.length, "events");
      
      // Count visemes by ID
      const counts = {};
      visemeData.forEach(v => {
        counts[v.visemeId] = (counts[v.visemeId] || 0) + 1;
      });
      console.log("Viseme counts by ID:", counts);
      
      // For debugging, show the first few visemes
      console.log("First 5 visemes:", visemeData.slice(0, 5));
      
      // Save a processed copy of the visemes for animation
      // Convert audioOffset (ticks) to milliseconds and sort by time
      let processed = visemeData.map(v => ({
        visemeId: v.visemeId,
        time: Math.round(v.audioOffset / 10000) // Convert 100ns ticks to ms
      })).sort((a, b) => a.time - b.time);
      
      // Ensure proper timing distribution by finding the total duration
      const lastTime = processed[processed.length - 1].time;
      
      // Always ensure we have a silence (rest) viseme at the end
      if (processed[processed.length - 1].visemeId !== 0) {
        processed.push({
          visemeId: 0,
          time: lastTime + 200 // Add a bit more time for the final rest position
        });
      }
      
      setProcessedVisemes(processed);
      setDebugInfo(`Processed ${processed.length} viseme events for animation`);
      
      // Remove the demo animation that was playing a few visemes on load
      // This resolves the issue of viseme demo restarting after audio finishes
    }
  }, [visemeData, isPlaying]);
  
  // Get interpolated mouth path between two visemes (for smooth transitions)
  const getInterpolatedMouthPath = () => {
    // If transition is complete, just return the current viseme path
    if (visemeTransition >= 1) {
      return mouthPositions[currentViseme]?.path || mouthPositions[0].path;
    }
    
    // Otherwise interpolate between the two paths
    const fromPath = mouthPositions[currentViseme]?.path || mouthPositions[0].path;
    const toPath = mouthPositions[targetViseme]?.path || mouthPositions[0].path;
    
    // Simple path interpolation logic
    try {
      // Extract path coordinates (assumes paths are in form "M50,70 Q65,65 80,70")
      const fromMatch = fromPath.match(/M([\d.]+),([\d.]+) Q([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/);
      const toMatch = toPath.match(/M([\d.]+),([\d.]+) Q([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/);
      
      if (fromMatch && toMatch) {
        // Extract coordinates from both paths
        const fromX1 = parseFloat(fromMatch[1]);
        const fromY1 = parseFloat(fromMatch[2]);
        const fromCX = parseFloat(fromMatch[3]);
        const fromCY = parseFloat(fromMatch[4]);
        const fromX2 = parseFloat(fromMatch[5]);
        const fromY2 = parseFloat(fromMatch[6]);
        
        const toX1 = parseFloat(toMatch[1]);
        const toY1 = parseFloat(toMatch[2]);
        const toCX = parseFloat(toMatch[3]);
        const toCY = parseFloat(toMatch[4]);
        const toX2 = parseFloat(toMatch[5]);
        const toY2 = parseFloat(toMatch[6]);
        
        // Interpolate between them based on transition progress
        const x1 = fromX1 + (toX1 - fromX1) * visemeTransition;
        const y1 = fromY1 + (toY1 - fromY1) * visemeTransition;
        const cx = fromCX + (toCX - fromCX) * visemeTransition;
        const cy = fromCY + (toCY - fromCY) * visemeTransition;
        const x2 = fromX2 + (toX2 - fromX2) * visemeTransition;
        const y2 = fromY2 + (toY2 - fromY2) * visemeTransition;
        
        // Return the interpolated path
        return `M${x1.toFixed(2)},${y1.toFixed(2)} Q${cx.toFixed(2)},${cy.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
      }
    } catch (error) {
      console.error("Error interpolating mouth path:", error);
    }
    
    // Fallback to current viseme if interpolation fails
    return fromPath;
  };
  
  // Smoother viseme setter with transitions
  const setVisemeWithTransition = (newVisemeId) => {
    const now = Date.now();
    // Throttle updates to prevent too-frequent changes
    if (now - lastVisemeUpdateTime < 80) { // Increased from 65ms to 80ms for more distinct pauses
      return; // Skip if less than 80ms since last update
    }
    
    if (newVisemeId !== targetViseme) {
      setTargetViseme(newVisemeId);
      setVisemeTransition(0); // Start transition from 0
      setLastVisemeUpdateTime(now);
      
      // Clear any existing transition timer
      if (transitionTimerRef.current) {
        clearInterval(transitionTimerRef.current);
      }
      
      // Start transition animation
      const startTime = performance.now();
      
      // Adjust transition duration based on current pause context
      // This makes transitions slower at comma/period pauses
      const isPauseContext = isPauseViseme(newVisemeId, currentViseme);
      // Longer transition for pauses, shorter for regular speech
      const duration = isPauseContext ? 300 : 150;
      
      const animateTransition = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use ease-out timing function for more natural motion
        const easedProgress = 1 - Math.pow(1 - progress, 2);
        
        setVisemeTransition(easedProgress);
        
        if (progress < 1) {
          transitionTimerRef.current = requestAnimationFrame(animateTransition);
        } else {
          // When transition completes, set current viseme to target
          setCurrentViseme(newVisemeId);
          setVisemeTransition(1);
          transitionTimerRef.current = null;
        }
      };
      
      transitionTimerRef.current = requestAnimationFrame(animateTransition);
    }
  };
  
  // Helper function to detect if we're transitioning to/from a pause viseme
  const isPauseViseme = (newViseme, currentViseme) => {
    // Viseme 0 is silence/rest, which occurs during pauses
    return newViseme === 0 || currentViseme === 0;
  };
  
  // Run the normal animation based on audio timing
  const runAnimation = () => {
    if (!audioRef.current || !processedVisemes.length) return;
    
    // Get current audio time in ms
    const currentTimeMs = audioRef.current.currentTime * 1000;
    
    // Get audio duration for end-of-audio handling
    const audioDurationMs = (audioRef.current.duration || 0) * 1000;
    
    // Calculate remaining time
    const remainingTimeMs = audioDurationMs - currentTimeMs;
    
    // Check if the audio is currently paused at punctuation
    const isPunctuationPause = checkForPunctuationPause(currentTimeMs);
    
    // Apply a dynamic offset based on context
    // This improves synchronization for pauses
    const adjustedTimeMs = isPunctuationPause 
      ? currentTimeMs - 120  // Longer offset during pauses
      : currentTimeMs - 40;  // Reduced offset for better sync (was 60)
    
    // Find the appropriate viseme for this time
    let visemeFound = false;
    let lastValidIndex = 0;
    
    // If we have a very long array of visemes, use binary search for efficiency
    if (processedVisemes.length > 100) {
      // Binary search for the appropriate viseme
      let start = 0;
      let end = processedVisemes.length - 1;
      
      while (start <= end) {
        const mid = Math.floor((start + end) / 2);
        
        if (processedVisemes[mid].time <= adjustedTimeMs) {
          lastValidIndex = mid;
          visemeFound = true;
          start = mid + 1;
        } else {
          end = mid - 1;
        }
      }
    } else {
      // Linear search for smaller arrays
      for (let i = 0; i < processedVisemes.length; i++) {
        if (processedVisemes[i].time <= adjustedTimeMs) {
          lastValidIndex = i;
          visemeFound = true;
        } else {
          break; // Stop when we've gone past current time
        }
      }
    }
    
    if (visemeFound) {
      // Get current viseme ID
      const visemeId = processedVisemes[lastValidIndex].visemeId;
      
      // Determine whether we should use the viseme or force a different one
      let effectiveVisemeId = visemeId;
      
      // If we're not at a punctuation pause but we detected viseme 0 and we were not previously at 0,
      // AND we're not at the end of the audio, we might be stuck
      const isStuckOnNeutral = visemeId === 0 && currentViseme !== 0 && !isPunctuationPause && remainingTimeMs > 500;
      
      // If we seem to be stuck on viseme 0 (neutral), try to use a nearby non-zero viseme
      if (isStuckOnNeutral) {
        // Look ahead for a non-zero viseme
        for (let i = lastValidIndex + 1; i < Math.min(lastValidIndex + 5, processedVisemes.length); i++) {
          if (processedVisemes[i].visemeId !== 0) {
            effectiveVisemeId = processedVisemes[i].visemeId;
            console.log(`Detected possible stuck viseme, using future viseme ${effectiveVisemeId} instead of 0`);
            break;
          }
        }
        
        // If we couldn't find a non-zero viseme ahead, use the last non-zero viseme
        if (effectiveVisemeId === 0) {
          for (let i = lastValidIndex - 1; i >= Math.max(0, lastValidIndex - 5); i--) {
            if (processedVisemes[i].visemeId !== 0) {
              effectiveVisemeId = processedVisemes[i].visemeId;
              console.log(`Using previous viseme ${effectiveVisemeId} instead of 0`);
              break;
            }
          }
        }
        
        // If we still have viseme 0, pick a reasonable default
        if (effectiveVisemeId === 0) {
          effectiveVisemeId = 2; // Default to an "ah" sound if all else fails
          console.log(`Falling back to default viseme ${effectiveVisemeId}`);
        }
      } else if (isPunctuationPause) {
        // If we're at a punctuation pause, ensure we use viseme 0
        effectiveVisemeId = 0;
      }
      
      // Always update the viseme to ensure continuous animation
      setVisemeWithTransition(effectiveVisemeId);
      
      // Less frequent debug info updates to reduce re-renders
      if (Math.random() < 0.1) {
        setDebugInfo(`Viseme ${effectiveVisemeId} at ${Math.round(adjustedTimeMs)}ms (Index: ${lastValidIndex}/${processedVisemes.length})`);
      }
      
      // Special handling for end of audio to ensure animation completes
      if (remainingTimeMs < 500 && lastValidIndex < processedVisemes.length - 2) {
        const nextVisemeIndex = Math.min(lastValidIndex + 1, processedVisemes.length - 1);
        const nextVisemeId = processedVisemes[nextVisemeIndex].visemeId;
        
        // Ensure we animate remaining visemes as we approach the end
        if (nextVisemeId !== 0 && nextVisemeId !== targetViseme) {
          setVisemeWithTransition(nextVisemeId);
          setDebugInfo(`End approaching - viseme ${nextVisemeId} (${Math.round(adjustedTimeMs)}ms)`);
        }
      }
    } else if (processedVisemes.length > 0) {
      // If no viseme found but we have visemes, use the first one
      // This ensures animation starts even if timing is slightly off
      setVisemeWithTransition(processedVisemes[0].visemeId);
    }
    
    // Continue animation loop if still playing or within buffer time of end
    // Increase the buffer time to ensure animation completes
    if (!audioRef.current.paused && (audioRef.current.currentTime < audioRef.current.duration + 0.5)) {
      animationRef.current = requestAnimationFrame(runAnimation);
    } else if (audioRef.current.ended || (audioRef.current.currentTime >= audioRef.current.duration - 0.1)) {
      // Ensure a smooth ending with a proper closure viseme
      if (processedVisemes.length > 0) {
        // End with silence/rest position
        setVisemeWithTransition(0);
      }
      setDebugInfo('Animation complete');
      if (onPlayComplete) onPlayComplete();
    } else {
      // Continue animation if not ended but somehow paused
      animationRef.current = requestAnimationFrame(runAnimation);
    }
  };
  
  // Helper function to detect punctuation pauses based on audio context
  const checkForPunctuationPause = (currentTimeMs) => {
    // Check if we're near a pause in audio
    // This helps identify commas, periods, etc.
    if (!audioRef.current || audioRef.current.paused) return false;

    try {
      // Here we analyze audio context to detect pauses.
      // For now, we'll use a simple heuristic:
      // If the audio has low volume in the current moment, it might be a pause
      // Check if audio playback rate is very slow
      if (audioRef.current.playbackRate < 0.1) return true;
      
      // If playing, check for nearby visemes that indicate a pause
      // Look for silence visemes (0) near current time
      const currentIndex = processedVisemes.findIndex(v => v.time > currentTimeMs);
      if (currentIndex > 0) {
        // Check previous and next visemes
        const prevViseme = processedVisemes[currentIndex - 1];
        const nextViseme = processedVisemes[currentIndex];
        
        // If we're between a non-silence and silence viseme or vice versa
        // This would indicate a transition to/from a pause
        if ((prevViseme.visemeId === 0 && nextViseme.visemeId !== 0) || 
            (prevViseme.visemeId !== 0 && nextViseme.visemeId === 0)) {
          return true;
        }
      }
    } catch (error) {
      // Ignore any errors in our analysis
      console.warn("Error checking for punctuation pause:", error);
    }
    
    return false;
  };
  
  // Start the animation when isPlaying changes
  useEffect(() => {
    if (isPlaying && audioUrl) {
      console.log("VisemeFace: isPlaying=true and audioUrl is available:", audioUrl);
      setAnimationMode('normal');
      
      // Reset to initial state
      setCurrentViseme(0);
      setVisemeIndex(0);
      
      // Set up audio
      if (audioRef.current) {
        console.log("VisemeFace: Setting up audio for playback, URL:", audioUrl);
        
        // Stop previous audio if any
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Clear previous audio source
        audioRef.current.removeAttribute('src');
        
        // Set new source
        audioRef.current.src = audioUrl;
        console.log("VisemeFace: Audio source set:", audioRef.current.src);
        
        // Ensure we preload the audio
        audioRef.current.preload = "auto";
        
        // Avoid multiple oncanplay handlers
        audioRef.current.oncanplay = null;
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.ontimeupdate = null;
        
        // Set up event handlers
        audioRef.current.oncanplay = () => {
          console.log("VisemeFace: Audio ready to play, duration:", audioRef.current.duration);
          
          // Log the duration to help debugging
          console.log(`Audio duration: ${audioRef.current.duration}s, Visemes: ${processedVisemes.length}`);
          
          // Use normal playback rate for better audio quality
          audioRef.current.playbackRate = 1.0;
          
          audioRef.current.play()
            .then(() => {
              console.log("VisemeFace: Audio playback started successfully");
              setDebugInfo('Starting animation with audio');
              if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
              }
              animationRef.current = requestAnimationFrame(runAnimation);
            })
            .catch(error => {
              console.error("VisemeFace: Audio play error:", error);
              setDebugInfo(`Audio error: ${error.message}`);
              
              // Don't fall back to demo mode if audio fails - this prevents the issue
              if (onPlayComplete) onPlayComplete();
            });
        };
        
        // Monitor time updates to help with debugging
        audioRef.current.ontimeupdate = () => {
          // Only log occasionally to avoid console spam
          if (Math.round(audioRef.current.currentTime * 10) % 20 === 0) { // Log every ~2 seconds
            console.log(`VisemeFace: Audio playing: ${audioRef.current.currentTime.toFixed(2)}s / ${audioRef.current.duration.toFixed(2)}s`);
          }
        };
        
        audioRef.current.onended = () => {
          console.log("VisemeFace: Audio playback ended");
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
          setCurrentViseme(0);
          setDebugInfo('Animation complete');
          if (onPlayComplete) onPlayComplete();
        };
        
        // Also add a timeout-based backup to ensure animation completes
        const backupTimeout = setTimeout(() => {
          const audio = audioRef.current;
          if (audio && !audio.paused && audio.currentTime > 0 && audio.currentTime >= audio.duration - 0.2) {
            console.log("VisemeFace: Backup timeout: ensuring animation completes");
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
            setCurrentViseme(0);
            setDebugInfo('Animation complete (timeout)');
            if (onPlayComplete) onPlayComplete();
          }
        }, (audioRef.current.duration || 10) * 1000 + 500); // Duration + 500ms buffer
        
        audioRef.current.onerror = (e) => {
          console.error("VisemeFace: Audio error event:", e);
          setDebugInfo(`Audio error: ${e}`);
          
          // Don't fall back to demo mode if audio fails
          if (onPlayComplete) onPlayComplete();
        };
        
        // Return cleanup function
        return () => {
          clearTimeout(backupTimeout);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
      } else {
        // No audio element, but don't switch to demo mode
        if (onPlayComplete) onPlayComplete();
      }
    } else if (isPlaying && !audioUrl) {
      // No audio URL but want to play
      // Don't switch to demo mode to avoid unwanted animation
      if (onPlayComplete) onPlayComplete();
    } else if (!isPlaying) {
      // Not playing, cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    
    // Main cleanup function on component unmount or dependencies change
    return () => {
      // Cleanup
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        // Clean event handlers on unmount
        audioRef.current.oncanplay = null;
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.ontimeupdate = null;
      }
    };
  }, [isPlaying, audioUrl, processedVisemes]);
  
  // Buttons to manually cycle through visemes (for debugging)
  const nextManualViseme = () => {
    const next = (manualViseme + 1) % 22;
    setManualViseme(next);
    setCurrentViseme(next);
  };
  
  const prevManualViseme = () => {
    const prev = (manualViseme - 1 + 22) % 22;
    setManualViseme(prev);
    setCurrentViseme(prev);
  };

  // Determine current mouth path
  const mouthPath = getInterpolatedMouthPath();
  const visemeDescription = mouthPositions[currentViseme]?.description || "Rest";

  // Enhance facial expression based on viseme
  const eyesWidth = currentViseme >= 2 && currentViseme <= 5 ? 6 : 5;
  const eyesHeight = currentViseme >= 9 && currentViseme <= 11 ? 8 : 7;

  // Cleanup function
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (transitionTimerRef.current) {
        cancelAnimationFrame(transitionTimerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Render the face with inline CSS to ensure the avatar displays properly
  return (
    <div className="viseme-face">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 130 130" 
        preserveAspectRatio="xMidYMid meet"
        style={{ 
          maxWidth: '100%', 
          margin: '0 auto', 
          display: 'block', 
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        {/* Render the face background */}
        <circle 
          cx="65" 
          cy="65" 
          r="55" 
          fill="#FFD2B5" 
          stroke="#EDAA87" 
          strokeWidth="1"
        />
        
        {/* Eyes - with blinking and emotion */}
        {renderEyes()}

        {/* Eyebrows */}
        {renderEyebrows()}
        
        {/* Mouth with interpolated position */}
        <path 
          d={mouthPath} 
          fill="none" 
          stroke="#D5795E" 
          strokeWidth="2" 
          strokeLinecap="round"
        />

        {/* Nose */}
        <path 
          d="M62,55 Q65,60 68,55" 
          fill="none" 
          stroke="#EDAA87" 
          strokeWidth="1.5"
        />

        {/* Cheeks for warmth */}
        <circle cx="40" cy="65" r="8" fill="#FFBBA8" opacity="0.5" />
        <circle cx="90" cy="65" r="8" fill="#FFBBA8" opacity="0.5" />
      </svg>

      {/* Audio element for playback - this was missing */}
      <audio ref={audioRef} src={audioUrl} style={{ display: 'none' }} />

      {/* Debug info if needed */}
      {debugInfo && (
        <div style={{ 
          position: 'absolute', 
          bottom: '10px', 
          left: '10px', 
          fontSize: '10px', 
          color: '#666',
          background: 'rgba(255,255,255,0.6)',
          padding: '2px 5px',
          borderRadius: '3px'
        }}>
          {debugInfo}
        </div>
      )}
    </div>
  );
};

export default VisemeFace; 