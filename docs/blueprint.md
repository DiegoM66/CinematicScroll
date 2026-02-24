# **App Name**: ScrollCinema

## Core Features:

- Frame Renderer: Renders a sequence of WebP frames on a canvas element based on scroll position, providing a frame-by-frame animation effect.
- Scroll Mapping: Maps the current scroll position to a specific frame number across all sequences, ensuring smooth progression through the animation.
- Frame Preloading: Implements lazy preloading with a buffer to efficiently load frames as the user scrolls, optimizing performance and memory usage.
- Sequence Management: Manages multiple animation sequences, transitioning seamlessly from one sequence to the next as the user scrolls.

## Style Guidelines:

- Primary color: Dark, desaturated gray (#333333) for the background, providing a cinematic feel.
- Accent color: Subtle light gray (#AAAAAA) for any loading indicators or minimal UI elements.
- Font: 'Inter', sans-serif. Note: currently only Google Fonts are supported.
- Full-screen canvas or img-based renderer locked to viewport height using CSS, preventing layout shifts.
- Smooth interpolation between frames using requestAnimationFrame, eliminating flicker and creating a fluid scrolling experience.