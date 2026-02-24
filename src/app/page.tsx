
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

// --- Balloon Trigger Metadata ---
// This structure defines exactly when and with what content a balloon should appear.
// Each object represents a specific trigger point in the animation.
const balloonMetadata = [
  { 
    sequenceIndex: 0, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Space',
      primaryColors: ['#0a0a2a', '#4a0e4a', '#f0f8ff'],
      creature: 'Cosmic Dragon',
      description: 'A celestial dragon born among the stars, drifting through galaxies as a living constellation.',
    }
  },
  { 
    sequenceIndex: 1, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Sky',
      primaryColors: ['#87CEEB', '#FFD700', '#FFFFFF'],
      creature: 'Griffin',
      description: 'A majestic sky guardian, combining the strength of the lion with the freedom of the eagle.',
    }
  },
  { 
    sequenceIndex: 2, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Sky',
      primaryColors: ['#1E3A8A', '#FFFFFF', '#FDBA74'],
      creature: 'Sky Whale',
      description: 'An ancient and gentle giant that swims through the heavens like a dream made of clouds.',
    }
  },
  {
    sequenceIndex: 3, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Twilight / Sunset Sky',
      primaryColors: ['#E67E22', '#FFA500', '#00FFFF'],
      creature: 'Sky Ray',
      description: 'A graceful celestial ray gliding silently through the skies, its luminous patterns flowing like living air currents.',
    }
  },
  { 
    sequenceIndex: 4, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Forest',
      primaryColors: ['#228B22', '#556B2F', '#FFFACD'],
      creature: 'Forest Spirit',
      description: 'A silent guardian of the enchanted forest, bound to ancient trees and natural magic.',
    }
  },
  { 
    sequenceIndex: 5, 
    frameIndex: 0, 
    scene: {
      sceneType: 'Underground',
      primaryColors: ['#556B2F', '#7CB342', '#D2B48C'],
      creature: 'Mole',
      description: 'A curious underground dweller, tirelessly carving tunnels beneath the forest floor.',
    }
  },
  { 
    sequenceIndex: 5, 
    frameIndex: 191, 
    scene: {
      sceneType: 'Deep Cave',
      primaryColors: ['#5D4037', '#1A1A1A', '#00FFFF'],
      creature: 'Cave Spider',
      description: 'A patient hunter lurking deep underground, ruling its cavern through silk and silence.',
    }
  }
];


// --- Constants ---
const SEQUENCE_COUNT = 6;
const FRAMES_PER_SEQUENCE = 192;
const TOTAL_FRAMES = SEQUENCE_COUNT * FRAMES_PER_SEQUENCE;
// Adjust this value to change the scroll "speed". Higher means more scrolling needed per frame.
const SCROLL_HEIGHT_PER_FRAME = 25;
// The number of frames a balloon should stay visible after being triggered.
const BALLOON_VISIBILITY_WINDOW = 50;


// --- Preloading Configuration ---
// How many frames to preload for the initial screen before the app is interactive
const INITIAL_PRELOAD_COUNT = 60;
// How many frames to preload ahead of the current frame during scrolling
const PRELOAD_AHEAD = 30;
// How many frames to keep loaded behind the current frame
const PRELOAD_BEHIND = 10;

// --- Helper Functions ---
/**
 * Generates the URL for a specific frame index.
 * @param frameIndex The absolute index of the frame (0 to TOTAL_FRAMES - 1).
 * @returns The URL of the webp image for the frame.
 */
const getFrameUrl = (frameIndex: number): string => {
  if (frameIndex < 0 || frameIndex >= TOTAL_FRAMES) return '';
  const sequence = Math.floor(frameIndex / FRAMES_PER_SEQUENCE) + 1;
  const frameInSequence = frameIndex % FRAMES_PER_SEQUENCE;
  const framePadded = String(frameInSequence).padStart(3, '0');
  // This is the source of the filename we will check against.
  return `https://vfaebucipncrmdqwnoue.supabase.co/storage/v1/object/public/Webp%20Sequence%20${sequence}/frame_${framePadded}_delay-0.04s.webp`;
};

/**
 * A simple loading spinner component displayed while initial frames are loading.
 */
function LoadingSpinner() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-background z-20"
      aria-label="Loading animation"
      role="status"
    >
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-accent"></div>
    </div>
  );
}

// --- Single, Fixed-Position Story Balloon ---
/**
 * Renders a single descriptive balloon in a fixed position. Its content and style
 * are derived from the active scene's metadata.
 * @param scene The metadata object for the active scene, or null to hide the balloon.
 */
function StoryBalloon({ scene }: { scene: (typeof balloonMetadata[0]['scene']) | null }) {
  // isVisible controls the CSS classes for the fade/translate animation.
  const isVisible = scene !== null;

  // Dynamically create styles based on the scene's metadata.
  const style = scene ? { 
    // Use the first primary color with ~75% transparency for the background.
    backgroundColor: `${scene.primaryColors[0]}bf`,
    // Use a backdrop filter for a blurred, frosted glass effect.
    backdropFilter: 'blur(8px)',
    // Add a subtle glow using a box-shadow, derived from the scene's color.
    boxShadow: `0 0 25px 5px ${scene.primaryColors[0]}60`,
  } : {};

  return (
    <div
      // This div is fixed to the top-left of the viewport.
      className={`fixed top-8 left-8 p-6 rounded-lg ring-1 ring-white/10 transition-all duration-500 ease-in-out font-storybook w-full max-w-md z-10 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
      style={style}
    >
      {/* Content is only rendered when a scene is active to prevent empty flashes. */}
      {scene && (
        <>
          <h3 className="text-2xl font-bold text-white mb-2">{scene.creature}</h3>
          <p className="text-gray-200">{scene.description}</p>
        </>
      )}
    </div>
  );
}


/**
 * The main component that orchestrates the scroll-driven animation.
 * It combines a tall scrollable area with a fixed canvas to create the cinematic effect.
 */
export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeScene, setActiveScene] = useState<(typeof balloonMetadata[0]['scene']) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());
  const appState = useRef({
    targetFrame: 0,
    lastDrawnFrame: -1,
  });

  const totalScrollHeight = SCROLL_HEIGHT_PER_FRAME * TOTAL_FRAMES;

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const img = imageCache.current.get(frameIndex);
    
    if (!canvas || !img || !img.complete || img.naturalHeight === 0) return;
    if (appState.current.lastDrawnFrame === frameIndex) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const canvasAspect = canvasWidth / canvasHeight;
    const imgAspect = imgWidth / imgHeight;

    let sx, sy, sWidth, sHeight;

    if (imgAspect > canvasAspect) {
      sHeight = imgHeight;
      sWidth = sHeight * canvasAspect;
      sx = (imgWidth - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = imgWidth;
      sHeight = sWidth / canvasAspect;
      sx = 0;
      sy = (imgHeight - sHeight) / 2;
    }
    
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);

    appState.current.lastDrawnFrame = frameIndex;
  }, []);

  const preloadFrames = useCallback(() => {
    const { targetFrame } = appState.current;
    const start = Math.max(0, targetFrame - PRELOAD_BEHIND);
    const end = Math.min(TOTAL_FRAMES - 1, targetFrame + PRELOAD_AHEAD);

    for (let i = start; i <= end; i++) {
      if (!imageCache.current.has(i)) {
        const img = new Image();
        img.src = getFrameUrl(i);
        imageCache.current.set(i, img);
      }
    }
  }, []);

  // Effect for initial loading of a batch of frames
  useEffect(() => {
    const imagePromises: Promise<void>[] = [];
    for (let i = 0; i < INITIAL_PRELOAD_COUNT; i++) {
        const promise = new Promise<void>((resolve) => {
            const img = new Image();
            img.src = getFrameUrl(i);
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Don't block forever on a failed image
            imageCache.current.set(i, img);
        });
        imagePromises.push(promise);
    }

    Promise.all(imagePromises).then(() => {
        setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      const targetFrame = appState.current.targetFrame;

      // Find the most recent trigger point the user has scrolled past.
      let mostRecentTrigger: (typeof balloonMetadata[0]) | null = null;
      for (let i = balloonMetadata.length - 1; i >= 0; i--) {
        const trigger = balloonMetadata[i];
        const triggerAbsoluteFrame = (trigger.sequenceIndex * FRAMES_PER_SEQUENCE) + trigger.frameIndex;
        if (targetFrame >= triggerAbsoluteFrame) {
          mostRecentTrigger = trigger;
          break;
        }
      }

      // Determine if the balloon for that trigger should be visible.
      if (mostRecentTrigger) {
        const triggerAbsoluteFrame = (mostRecentTrigger.sequenceIndex * FRAMES_PER_SEQUENCE) + mostRecentTrigger.frameIndex;
        
        if (targetFrame < triggerAbsoluteFrame + BALLOON_VISIBILITY_WINDOW) {
          if (activeScene?.creature !== mostRecentTrigger.scene.creature) {
             setActiveScene(mostRecentTrigger.scene);
          }
        } else {
          if (activeScene !== null) {
            setActiveScene(null);
          }
        }
      } else {
        if (activeScene !== null) {
          setActiveScene(null);
        }
      }
      
      drawFrame(targetFrame);
      preloadFrames();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Don't start the animation loop until the initial load is complete
    if (!isLoading) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeScene, drawFrame, preloadFrames, isLoading]);

  useEffect(() => {
    // We only set up scroll and resize listeners once the initial load is done.
    if (isLoading) return;

    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;
      
      const scrollFraction = window.scrollY / scrollableHeight;
      const frame = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(scrollFraction * TOTAL_FRAMES))
      );
      
      if (!isNaN(frame)) {
          appState.current.targetFrame = frame;
      }
    };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      appState.current.lastDrawnFrame = -1; // Force redraw on resize
      drawFrame(appState.current.targetFrame);
    };

    // Initial setup
    handleResize();
    handleScroll(); // Set initial frame based on scroll position (usually 0)
    drawFrame(0); // Explicitly draw frame 0 to be safe
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoading, drawFrame]);

  return (
    <main style={{ height: `${totalScrollHeight}px` }} className="bg-background relative">
      <div className="fixed top-0 left-0 w-screen h-screen outline-none">
        {isLoading && <LoadingSpinner />}
        <canvas 
          ref={canvasRef} 
          className={`w-full h-full transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
        />
        
        <StoryBalloon scene={activeScene} />
      </div>
    </main>
  );
}
