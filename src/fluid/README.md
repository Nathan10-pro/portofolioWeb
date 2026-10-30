# systems/fluid → src/fluid — Fluid Engine v1.0 (Tahap 5)

Pipeline GPU Stable Fluids 2D untuk Photo Scene:
Input → Velocity Field → Advection/Divergence/Pressure/Projection → Dye → Mask → Composite.

- core/FluidEngine.ts      : orkestrator + loop fixed-timestep + idle sleep
- core/FluidConfig.ts      : parameter terpusat (SHAPE/MOTION/RIPPLE/LIFECYCLE)
- core/RenderTargetManager : ping-pong FBO (velocity/dye/pressure)
- shaders/shaders.ts       : GLSL splat, advect, divergence, curl, vorticity,
                             pressure (Jacobi), gradient-subtract, mask, composite
- utils/capabilities.ts    : probe half-float RT + fallback RGBA8

Constraint keras: dye HANYA menjadi mask warna; geometri foto tidak pernah berubah.
