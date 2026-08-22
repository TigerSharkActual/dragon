# Dragon Game — Portfolio Project

## What This Project Is
A 3D browser-based flying game built from scratch using JavaScript and Three.js.
The player controls a dragon that flies through a 3D environment collecting coins.
Features a heads-up display (HUD), leaderboard, and user login system.

---

## Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Page structure and canvas elements |
| CSS3 | Positioning and layering UI elements |
| JavaScript (ES6+) | Game logic and interactivity |
| Three.js | 3D rendering engine |
| Node.js | Local development environment |
| Vite | Development server and build tool |
| npm | Package management |

---

## What I Built and What I Learned

### 1. Project Setup
- Installed Node.js and npm via Homebrew
- Initialized a Node project with `npm init`
- Installed Three.js as a dependency with `npm install three`
- Installed Vite as a dev server with `npm install --save-dev vite`
- Configured `package.json` scripts to run the dev server with `npm run dev`

**Key concept:** The difference between dependencies (shipped with the app) and dev dependencies (used only during development).

---

### 2. HTML Structure
- Created `index.html` as the entry point for the browser
- Learned HTML document structure: `<!DOCTYPE html>`, `<head>`, `<body>`
- Used `<script type="module">` to load modern JavaScript with ES6 imports
- Added a HUD overlay `<div>` positioned absolutely over the 3D canvas
- Added a 2D `<canvas>` element inside the HUD for instrument drawing

**Key concept:** `type="module"` enables ES6 import/export syntax in the browser.

---

### 3. CSS Positioning
- Used `* { margin: 0; padding: 0; }` to remove default browser spacing
- Used `position: absolute` to layer HTML elements on top of the 3D canvas
- Used `pointer-events: none` so HUD elements don't block game input
- Used `z-index` layering concept — higher z-index appears on top
- Positioned the attitude indicator canvas in the bottom left corner

**Key concept:** `position: absolute` removes an element from normal document flow and lets you place it at exact coordinates.

---

### 4. Three.js — 3D Scene Setup
- Created a `WebGLRenderer` and appended its canvas to the DOM
- Created a `Scene` — the 3D world that holds all objects
- Created a `PerspectiveCamera` with field of view, aspect ratio, near/far clipping planes
- Learned the Three.js coordinate system: origin at center, X right, Y up, Z toward camera
- Added a `GridHelper` as a visual reference for the ground plane

**Key concept:** Three.js needs three things to render: a Scene, a Camera, and a Renderer.

---

### 5. 3D Objects
- Created geometry (`ConeGeometry`) and material (`MeshBasicMaterial`) separately
- Combined them into a `Mesh` — the actual visible object
- Used a `Group` as a parent container to separate visual rotation from flight orientation
- Added the cone to the group with a `Math.PI / 2` rotation offset so the point faces forward
- Used `AxesHelper` to visualize local X, Y, Z axes during development

**Key concept:** Separating the mesh from the group allows independent control of visual orientation vs. physics orientation.

---

### 6. Animation Loop
- Used `requestAnimationFrame` to create a 60fps game loop
- Understood that `requestAnimationFrame` schedules the next frame — it's the driver that keeps the loop running
- All game logic, movement, and rendering happens inside the `animate` function

**Key concept:** `requestAnimationFrame` is not a timer — it syncs with the browser's display refresh rate for smooth animation.

---

### 7. Keyboard Input
- Used `window.addEventListener('keydown')` and `'keyup'` to track key state
- Stored key states in a `keys` object — `true` when held, `false` when released
- Checked key state every frame inside `animate` for smooth continuous input

**Key concept:** Tracking keydown/keyup separately allows smooth held-key movement vs. single-press events.

---

### 8. 3D Flight Controls
- Implemented pitch (up/down) using the local X axis
- Implemented roll (left/right arrows) using the local Z axis  
- Implemented yaw (A/D keys) using world Y axis
- Used **quaternions** to represent orientation — avoids gimbal lock that Euler angles cause
- Used `setFromAxisAngle` to create rotation quaternions each frame
- Used `quaternion.multiply` to apply rotations to the dragon's current orientation
- Used `group.getWorldDirection` to extract the forward vector from the current orientation

**Key concept:** Quaternions represent rotation as a single mathematical operation rather than sequential axis rotations, eliminating gimbal lock at 180 degree orientations.

---

### 9. Follow Camera
- Extracted local axes from the group's quaternion each frame
- Positioned camera behind and above the dragon using `addScaledVector`
- Used `camera.up.copy(localAxisY)` so the camera flips correctly when the dragon rolls
- Used `camera.lookAt` aimed at a point ahead of the dragon, not at the dragon itself

**Key concept:** Setting `camera.up` before `lookAt` ensures the camera orientation matches the dragon's local up axis through all maneuvers.

---

### 10. HUD — 2D Canvas Overlay
- Created a 2D canvas element inside an absolutely positioned HUD div
- Got the canvas 2D context with `getContext('2d')`
- Drew shapes using `beginPath`, `arc`, `strokeStyle`, `stroke`
- Cleared the canvas every frame with `clearRect` before redrawing
- Understood `Math.atan2` — converts a 2D vector into an angle in radians

**Key concept:** The HUD is a separate 2D canvas layered on top of the 3D canvas using CSS positioning — two completely independent rendering systems working together.

---

## Coming Next
- Attitude indicator: horizon line, pitch ladder, roll arc
- Compass / heading indicator
- Coin spawning and collection
- Score system and speed scaling
- User login and leaderboard (Node.js + Express + database)
- Deployment to the internet

## Refactor TODO (post-completion)
- Self-collision check in `animate()` (main.js) uses `startPiord` as a flat frame-count gate to avoid false positives while body segments are still clamped to a placeholder position. Works only because current Speed/segment-count/turn-rate happen to clear the stale clump in time. Replace with per-segment validity check: only test collision for segments whose index calc (`posHistory.length - 1 - (i+1)*bodySegmentLag`) is non-negative (i.e. not clamped).
