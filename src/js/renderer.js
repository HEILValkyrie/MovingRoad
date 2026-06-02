// ==================== Renderer Backend Auto-Detection ====================
// Probes all rendering backends and selects the best available one.

        function makeProbeCanvas() {
            const c = document.createElement('canvas');
            c.width = 1;
            c.height = 1;
            return c;
        }

        async function probeBackend(backend, name) {
            let probe;
            try {
                if (name === 'OffscreenCanvas+Worker') {
                    probe = document.createElement('canvas');
                    probe.width = 1;
                    probe.height = 1;
                } else {
                    probe = makeProbeCanvas();
                }
                const ok = await backend.init(probe);
                if (!ok) {
                    if (name === 'OffscreenCanvas+Worker' && backend.worker) {
                        backend.worker.terminate();
                        backend.worker = null;
                        backend.ready = false;
                    }
                    return false;
                }
                return true;
            } catch (e) {
                console.warn(`[Probe] ${name} failed:`, e);
                if (name === 'OffscreenCanvas+Worker' && backend.worker) {
                    backend.worker.terminate();
                    backend.worker = null;
                    backend.ready = false;
                }
                return false;
            }
        }

        async function initRenderer() {
            const container = document.getElementById('game-container');

            const backends = [
                { backend: webgpuRenderer, name: 'WebGPU' },
                { backend: webgl2Renderer, name: 'WebGL2' },
                { backend: webgl1Renderer, name: 'WebGL1' },
                { backend: offscreenCanvasWorkerRenderer, name: 'OffscreenCanvas+Worker' },
                { backend: offscreenCanvasRenderer, name: 'OffscreenCanvas' },
                { backend: canvas2dRenderer, name: 'Canvas2D' },
                { backend: imageDataRenderer, name: 'ImageData' }
            ];

            let selected = null;
            for (const { backend, name } of backends) {
                if (await probeBackend(backend, name)) {
                    selected = { backend, name };
                    console.log(`[Renderer] Probed ${name} — OK`);
                    break;
                } else {
                    console.log(`[Renderer] Probed ${name} — FAIL, trying next...`);
                }
            }

            if (!selected) {
                console.error('All renderers failed');
                return;
            }

            canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            readVisualViewport();
            canvas.width = Math.max(1, Math.round(visualViewportWidth));
            canvas.height = Math.max(1, Math.round(visualViewportHeight));
            container.appendChild(canvas);

            const { backend, name } = selected;
            if (name === 'OffscreenCanvas+Worker') {
                if (backend.worker) {
                    backend.worker.terminate();
                    backend.worker = null;
                    backend.ready = false;
                }
            }
            const ok = await backend.init(canvas);
            if (!ok) {
                console.error(`[Renderer] ${name} re-init on real canvas failed`);
                return;
            }
            renderer = backend;
            console.log(`[Renderer] Active: ${name}`);
        }