# e-Life: Robust Evolution Simulator ![version](https://img.shields.io/badge/version-2.0-blue)

**Version 2.0 — final multi-core CPU version, preparing for GPU rewrite**

e-Life is an experimental sandbox for large-scale emergent life, physics, and future universe-scale expansions.  
Originally built with **React**, **TypeScript**, and **Web Workers**, it runs a Conway-like cellular automaton with parallel chunking on all available CPU cores.

---

## 📌 **What’s New in 2.0**

**Milestone progress since 1.0:**

✅ Added **Toroidal edge wrapping** (no more static boundaries).  
✅ Added **vector channels** — each pixel now has encoded local velocity and can drift.  
✅ Implemented **chunk-based gravity approximation** (coarse local attraction).  
✅ Verified **CPU parallelism scaling** to all logical cores.  
✅ Rigorous leak testing — runs stably for extended periods.

**What we learned:**

- Pure CPU chunking is solid for discrete life rules (birth/death).
- Local vector sums & drift work, but are not truly “gravity-like” at large scale.
- Global gravity requires whole-field attraction — this is computationally intensive for CPUs alone.
- Memory & CPU usage scale linearly with grid size and cores; the GPU remains underutilized.

---

## ⚙️ **Design Principles**

✅ **Leak-resistant**  
✅ **Full CPU parallelism**  
✅ **Vector field per pixel**  
✅ **True fullscreen + resize-safe**  
✅ **Cross-origin isolated server for SharedArrayBuffer**  
✅ **Clear debug logs + worker timing stats**

---

## 🚩 **Known Constraints in 2.0**

| Feature                    | Status |
| -------------------------- | ------ |
| Edge wrapping              | ✅ |
| Vector-based drift         | ✅ |
| Chunked local gravity      | ✅ _(approximate)_ |
| **True global gravity**    | ❌ _(needs full-field solver)_ |
| **Dead pixel drift**       | ✅ _(coarse)_ |
| Full GPU physics pipeline  | ❌ _(next step)_ |

---

## 🚀 **Next: Full GPU Engine**

Moving forward, the simulator will transition to a **WebGL/WebGPU architecture**:

- **All grid physics** handled in fragment shaders for true parallelism.
- Coarse + global gravity solved on the GPU.
- Smooth orbits and attraction wells possible at scale.
- CPU used only for input & high-level orchestration.

This will unlock:
- Massive performance improvements (10×–100× faster).
- Realistic universal drift & structure formation.
- Lower CPU & RAM footprint.

---

## 🧑‍💻 **Run Locally (with Secure Headers)**

> **Note:**  
> `SharedArrayBuffer` requires COOP/COEP headers. Use the included Express server.

```bash
# Install dependencies
npm install

# Build production
npm run build

# Start secure server
node server.js


-------------

# e-Life: Robust Evolution Simulator ![version](https://img.shields.io/badge/version-1.0-brightgreen)

**Version 1.0 — stable fullscreen multi-core evolution engine**  
A high-performance cellular automaton using **React**, **TypeScript**, and **Web Workers**.  
Designed as an experimental sandbox for large-scale emergent life, physics and universe-scale expansions.

---

## 📌 **Project Summary**

**Key features:**
- `SharedArrayBuffer` double-buffer grid for ultra-fast cell updates.
- Splits work across all CPU cores via `Web Workers`.
- Uses a single `<canvas>` with GPU acceleration.
- True fullscreen — grid and canvas always match window size.
- Includes a minimal hamburger overlay with FPS, PUPS (Pixel Updates Per Second) & worker timings.
- Proven leak resistance: memory stays stable under long runs.

---

## ⚙️ **Core Design Principles**

✅ **Leak-resistant:**  
Reuses shared buffers, swaps read/write safely, avoids heap churn.

✅ **Fully Parallel:**  
Chunks the grid evenly across CPU cores.

✅ **Pixel-accurate:**  
Classic binary state (alive/dead) life rules, using true double buffering.

✅ **Instant Resize:**  
Resizes grid & physics seamlessly — restarts workers safely.

✅ **Browser-friendly:**  
When hidden, browser throttles loops to reduce resource use.

---

## 🚀 **Known State**

| Feature               | Status |
| --------------------- | ------ |
| Fullscreen, responsive | ✅ |
| Smooth physics loop   | ✅ |
| Multi-core chunking   | ✅ |
| Scrollbars: none      | ✅ |
| Hamburger overlay UI  | ✅ |
| Memory stable         | ✅ |
| Edge wrapping         | ❌ _(planned)_ |
| Universe expansion    | ❌ _(planned)_ |
| Gravity physics       | ❌ _(planned)_ |

---

## 📈 **Roadmap**

**1️⃣ Edge wrapping:** Toroidal grid (top/bottom, left/right wrap).  
**2️⃣ Universe expansion:** Dynamic grid growth over time.  
**3️⃣ Local gravity:** Simulate localized attraction wells.

---

## 🧑‍💻 **Run Locally (with Secure Headers)**

> **Important:**  
> `SharedArrayBuffer` requires **cross-origin isolation** (COOP & COEP headers).  
> Local dev servers do **not** set these by default — so this project includes a simple Express server that does.

```bash
# Install dependencies
npm install

# Build production version
npm run build

# Start secure local server (adds required headers)
node server.js

# Or use:
npm run start
# (if you have `start` set to run server.js)
