# Game Loop Notes

## requestAnimationFrame

Browser games typically use `requestAnimationFrame` to run work before the next repaint. It aligns rendering with the browser refresh cycle and pauses more efficiently when the tab is inactive.

## Delta Time

Delta time is the elapsed time between frames. Movement, timers, and animations should use delta time so gameplay speed is not tied directly to frame rate.

## Fixed vs Variable Timestep

A variable timestep uses the actual frame delta each update. It is simple and responsive, but large frame spikes can produce unstable movement or collision.

A fixed timestep updates simulation in consistent increments. It improves determinism and stability, especially for physics-like behavior, but requires accumulation and interpolation decisions.

For this project, start simple and use delta-aware updates. Move to a fixed timestep only if gameplay stability requires it.
