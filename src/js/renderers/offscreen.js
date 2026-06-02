// --- OffscreenCanvas Backend (Offscreen 2D, Main Thread) ---
        const offscreenCanvasRenderer = {
            offscreen: null,
            ctx: null,
            mainCtx: null,

            init(c) {
                if (typeof OffscreenCanvas === 'undefined') return false;
                this.offscreen = new OffscreenCanvas(c.width, c.height);
                this.ctx = this.offscreen.getContext('2d');
                if (!this.ctx) return false;
                this.mainCtx = c.getContext('2d');
                if (!this.mainCtx) return false;
                return true;
            },

            beginFrame() {
                if (this.offscreen.width !== canvas.width || this.offscreen.height !== canvas.height) {
                    this.offscreen.width = canvas.width;
                    this.offscreen.height = canvas.height;
                }
                this.ctx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.fillRect(0, 0, this.offscreen.width, this.offscreen.height);
            },

            drawRect(x, y, w, h, color) {
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, w, h);
            },

            drawRectRotated(x, y, w, h, color, angle, cx, cy) {
                this.ctx.save();
                this.ctx.translate(cx, cy);
                this.ctx.rotate(angle);
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, w, h);
                this.ctx.restore();
            },
            drawImage(source, x, y, w, h, flipX) {
                if (flipX) {
                    this.ctx.save();
                    this.ctx.translate(x + w, y);
                    this.ctx.scale(-1, 1);
                    this.ctx.drawImage(source, 0, 0, w, h);
                    this.ctx.restore();
                } else {
                    this.ctx.drawImage(source, x, y, w, h);
                }
            },

            endFrame() {
                this.mainCtx.clearRect(0, 0, canvas.width, canvas.height);
                this.mainCtx.drawImage(this.offscreen, 0, 0);
            }
        };
