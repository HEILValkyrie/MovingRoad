# Moving Road

A Crossy Road-inspired endless arcade game built with vanilla JavaScript, featuring multiple rendering backends, custom characters, and progressive difficulty scaling. Play it directly in your browser -- no build step, no dependencies.

---

## How to Play

1. Open `index.html` in any modern browser (or visit the live demo).
2. Use **Arrow Keys** / **WASD** on desktop, or **on-screen D-pad** / **tap-to-move** on mobile.
3. Cross as many roads as you can without getting hit.
4. Each forward step earns **1 point**. Moving backward costs 1 point.
5. After score 10, getting hit costs 10 points and grants temporary invincibility instead of instant death.

### Controls

| Input | Action |
|-------|--------|
| Arrow Up / W | Move forward |
| Arrow Down / S | Move backward |
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Tap (mobile) | Move toward tap direction |
| On-screen D-pad | Touch controls |

---

## Technical Highlights

### 7 Rendering Backends (Auto-Detection)

The game probes and selects the best available renderer on launch:

| Backend | Priority | Notes |
|---------|----------|-------|
| WebGPU | 1 | Cutting-edge GPU compute |
| WebGL 2 | 2 | VAO support, better batching |
| WebGL 1 | 3 | Broad compatibility |
| OffscreenCanvas + Worker | 4 | Multi-threaded rendering |
| OffscreenCanvas | 5 | Double-buffered, main thread |
| Canvas 2D | 6 | Universal fallback |
| ImageData | 7 | Raw pixel manipulation |

This abstraction allows the same game code to run on everything from a 2024 flagship to a decade-old feature phone.

### Custom Character System

Drop your own character parts into `assets/character.json` (Base64-encoded PNG images):

- `body` (required) -- Main body sprite
- `leftarm`, `rightarm` -- Arm parts with swing animation
- `leftleg`, `rightleg` -- Leg parts with jump animation
- `crutch` -- Optional accessory (swings with right arm)
- `direction` -- Default facing direction (`R` or `L`)

The game automatically composites parts into an animated character with breathing, jumping, and hit-reaction animations.

### Visual Viewport Adaptation

Handles mobile browser quirks (collapsing address bars, on-screen keyboards, iOS Safari chrome) using the `VisualViewport` API with debounced resize events.

### Object Pooling & World Streaming

- **World streaming** generates and culls world chunks dynamically based on camera position for infinite scrolling.

### Progressive Difficulty

- Vehicle density increases every 4 points.
- Movement speed scales with score (up to 4x).
- Jump speed subtly increases every 5 points.

### Collision System

- Swept AABB collision with sub-tile precision for fast-moving vehicles.
- No false negatives: even vehicles moving multiple pixels per frame are accurately tracked.

---

## Project Structure

```
moving-road/
├── index.html                  # Game entry point
├── README.md                   # This file
├── assets/
│   └── character.json          # Custom character parts (Base64 PNGs)
└── src/
    ├── css/
    │   └── style.css           # Game styles
    └── js/
        ├── main.js             # Entry point: initGame()
        ├── game.js             # Core game loop, world gen, entities, update, draw
        ├── renderer.js         # Renderer interface & auto-selection
        ├── renderers/
        │   ├── canvas2d.js     # Canvas 2D renderer
        │   ├── imagedata.js    # ImageData (pixel-level) renderer
        │   ├── webgl1.js       # WebGL 1 renderer
        │   ├── webgl2.js       # WebGL 2 renderer
        │   ├── webgpu.js       # WebGPU renderer
        │   ├── offscreen.js    # OffscreenCanvas renderer
        │   └── offscreen-worker.js  # OffscreenCanvas + Web Worker
        ├── scoring.js          # Cookie-based high score persistence
        ├── viewport.js         # Visual viewport adaptation system
        ├── character.js        # Custom character loader & composite renderer
        └── utils.js            # Shared utilities (hexToRGBA, collision, etc.)
```

---

## Quick Start

### Local Play

Simply open `index.html` in your browser. No server required.

### GitHub Pages Deploy

1. Fork this repository.
2. Go to **Settings > Pages**.
3. Select **Deploy from a branch** --> `main` --> `/ (root)`.
4. Your game will be live at `https://<your-username>.github.io/moving-road/`.

### Local Development Server (optional)

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .

# Then open http://localhost:8080
```

---

## Browser Compatibility

| Browser | Support | Renderer Fallback |
|---------|---------|-------------------|
| Chrome 113+ | Full | WebGPU -> WebGL2 -> Canvas2D |
| Firefox 88+ | Full | WebGL2 -> Canvas2D |
| Safari 16.5+ | Full | WebGPU -> WebGL2 -> Canvas2D |
| Edge 90+ | Full | WebGL2 -> Canvas2D |
| Mobile Chrome | Full | Auto-detected best backend |
| Mobile Safari | Full | Auto-detected best backend |

---

## Customization

### Adding Your Own Character

1. Prepare 6 PNG images with transparent backgrounds:
   - `body.png` -- main body (recommended: 256x256 or larger)
   - `leftarm.png`, `rightarm.png` -- arm sprites
   - `leftleg.png`, `rightleg.png` -- leg sprites
   - `crutch.png` -- optional accessory

2. Convert each to Base64.

3. Fill in `assets/character.json`:

```json
{
  "body": "iVBORw0KGgo...",
  "leftarm": "iVBORw0KGgo...",
  "rightarm": "iVBORw0KGgo...",
  "leftleg": "iVBORw0KGgo...",
  "rightleg": "iVBORw0KGgo...",
  "crutch": "iVBORw0KGgo...",
  "direction": "R"
}
```

4. Refresh the game -- your character appears automatically.

---

## Architecture Notes

- **Zero external dependencies** -- everything is vanilla JS, CSS, and HTML.
- **Renderer abstraction** -- each backend implements the same uniform interface: `init()`, `beginFrame()`, `drawRect()`, `drawRectRotated()`, `drawImage()`, and `endFrame()`.
- **Graceful degradation** -- if a renderer fails, the next one is tried. If cookies are blocked, scores persist in-memory.
- **Mobile-first input** -- touch, click, keyboard, and D-pad coexist without conflicts.

---

## License

BSD-3 License -- feel free to use, modify, and distribute.

---

## Acknowledgments

- Inspired by [Crossy Road](https://en.wikipedia.org/wiki/Crossy_Road) by Hipster Whale.

---

*Built with patience, pixel math, and a lot of console.log debugging.*
