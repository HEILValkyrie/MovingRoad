// --- OffscreenCanvas + Worker Backend ---
        const workerScriptSource = `
let ctx = null;
let canvas = null;
let imageCache = new Map();

self.onmessage = function(e) {
    const { type, canvas: c, width, height, commands } = e.data;
    if (type === 'init') {
        canvas = c;
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext('2d');
        if (ctx) {
            self.postMessage({ type: 'ready' });
        } else {
            self.postMessage({ type: 'error' });
        }
    } else if (type === 'uploadImages') {
        if (e.data.images) {
            for (let i = 0; i < e.data.images.length; i++) {
                const item = e.data.images[i];
                imageCache.set(item[0], item[1]);
            }
        }
    } else if (type === 'render') {
        if (!ctx) return;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, width, height);
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i];
            if (cmd.type === 'rect') {
                ctx.fillStyle = cmd.color;
                ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
            } else if (cmd.type === 'rectRotated') {
                ctx.save();
                ctx.translate(cmd.cx, cmd.cy);
                ctx.rotate(cmd.angle);
                ctx.fillStyle = cmd.color;
                ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h);
                ctx.restore();
            } else if (cmd.type === 'drawImage') {
                let bmp = cmd.bitmap;
                if (!bmp && cmd.imageId) bmp = imageCache.get(cmd.imageId);
                if (!bmp) continue;
                ctx.save();
                if (cmd.flipX) {
                    ctx.translate(cmd.x + cmd.w, cmd.y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(bmp, 0, 0, cmd.w, cmd.h);
                } else {
                    ctx.drawImage(bmp, cmd.x, cmd.y, cmd.w, cmd.h);
                }
                ctx.restore();
            }
        }
    } else if (type === 'resize') {
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
    }
};
`;

        const offscreenCanvasWorkerRenderer = {
            worker: null,
            commands: [],
            ready: false,

            async init(c) {
                if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || !c.transferControlToOffscreen) {
                    return false;
                }
                try {
                    const blob = new Blob([workerScriptSource], { type: 'application/javascript' });
                    this.worker = new Worker(URL.createObjectURL(blob));
                    const offscreen = c.transferControlToOffscreen();
                    return new Promise((resolve) => {
                        const timeout = setTimeout(() => {
                            this.worker.terminate();
                            resolve(false);
                        }, 2000);
                        this.worker.onmessage = (e) => {
                            if (e.data.type === 'ready') {
                                clearTimeout(timeout);
                                this.ready = true;
                                resolve(true);
                            } else if (e.data.type === 'error') {
                                clearTimeout(timeout);
                                this.worker.terminate();
                                resolve(false);
                            }
                        };
                        this.worker.onerror = (err) => {
                            clearTimeout(timeout);
                            this.worker.terminate();
                            resolve(false);
                        };
                        this.worker.postMessage({ type: 'init', canvas: offscreen, width: c.width, height: c.height }, [offscreen]);
                    });
                } catch (e) {
                    return false;
                }
            },

            beginFrame() {
                this.commands = [];
            },

            drawRect(x, y, w, h, color) {
                this.commands.push({ type: 'rect', x, y, w, h, color });
            },

            drawRectRotated(x, y, w, h, color, angle, cx, cy) {
                this.commands.push({ type: 'rectRotated', x, y, w, h, color, angle, cx, cy });
            },
            drawImage(source, x, y, w, h, flipX) {
                this.commands.push({ type: 'drawImage', source, x, y, w, h, flipX });
            },
            async endFrame() {
                if (this.worker && this.ready) {
                    const commands = [];
                    const transferables = [];
                    for (let i = 0; i < this.commands.length; i++) {
                        const cmd = this.commands[i];
                        if (cmd.type === 'drawImage' && cmd.source) {
                            try {
                                let bmp;
                                if (cmd.source.transferToImageBitmap) {
                                    bmp = cmd.source.transferToImageBitmap();
                                } else {
                                    bmp = await createImageBitmap(cmd.source);
                                }
                                commands.push({ type: 'drawImage', bitmap: bmp, x: cmd.x, y: cmd.y, w: cmd.w, h: cmd.h, flipX: cmd.flipX });
                                transferables.push(bmp);
                            } catch (e) {
                                // skip failed image draw
                            }
                        } else {
                            commands.push(cmd);
                        }
                    }
                    this.worker.postMessage({
                        type: 'render',
                        width: canvas.width,
                        height: canvas.height,
                        commands: commands
                    }, transferables);
                }
            }
        };
