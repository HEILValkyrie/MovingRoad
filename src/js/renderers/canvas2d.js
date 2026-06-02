// --- Canvas 2D Backend ---
        const canvas2dRenderer = {
            ctx: null,
            init(c) {
                this.ctx = c.getContext('2d');
                return !!this.ctx;
            },
            beginFrame() {
                this.ctx.clearRect(0, 0, canvas.width, canvas.height);
                this.ctx.fillStyle = '#87CEEB';
                this.ctx.fillRect(0, 0, canvas.width, canvas.height);
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
            endFrame() {}
        };
