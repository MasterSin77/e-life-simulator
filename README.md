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
