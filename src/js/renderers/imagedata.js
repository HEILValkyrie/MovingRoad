// --- ImageData Backend (Raw Pixel Manipulation) ---
        const imageDataRenderer = {
            ctx: null,
            imageData: null,
            width: 0,
            height: 0,

            init(c) {
                this.ctx = c.getContext('2d', { willReadFrequently: true });
                if (!this.ctx) return false;
                this.width = c.width;
                this.height = c.height;
                this.imageData = this.ctx.createImageData(this.width, this.height);
                return true;
            },

            beginFrame() {
                if (this.width !== canvas.width || this.height !== canvas.height) {
                    this.width = canvas.width;
                    this.height = canvas.height;
                    this.imageData = this.ctx.createImageData(this.width, this.height);
                }
                const data = this.imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = 135;
                    data[i + 1] = 206;
                    data[i + 2] = 235;
                    data[i + 3] = 255;
                }
            },

            drawRect(x, y, w, h, color) {
                const [r, g, b, a] = hexToRGBA(color);
                const R = Math.round(r * 255);
                const G = Math.round(g * 255);
                const B = Math.round(b * 255);

                const x0 = Math.max(0, Math.floor(x));
                const y0 = Math.max(0, Math.floor(y));
                const x1 = Math.min(this.width, Math.ceil(x + w));
                const y1 = Math.min(this.height, Math.ceil(y + h));

                if (x0 >= x1 || y0 >= y1) return;

                const data = this.imageData.data;
                const rowStride = this.width * 4;

                for (let py = y0; py < y1; py++) {
                    const rowOffset = py * rowStride;
                    for (let px = x0; px < x1; px++) {
                        const idx = rowOffset + px * 4;
                        data[idx] = R;
                        data[idx + 1] = G;
                        data[idx + 2] = B;
                        data[idx + 3] = 255;
                    }
                }
            },

            drawRectRotated(x, y, w, h, color, angle, cx, cy) {
                const [r, g, b, a] = hexToRGBA(color);
                const R = Math.round(r * 255);
                const G = Math.round(g * 255);
                const B = Math.round(b * 255);

                const cos = Math.cos(angle), sin = Math.sin(angle);

                const p0x = cx + x * cos - y * sin;
                const p0y = cy + x * sin + y * cos;
                const p1x = cx + (x + w) * cos - y * sin;
                const p1y = cy + (x + w) * sin + y * cos;
                const p2x = cx + x * cos - (y + h) * sin;
                const p2y = cy + x * sin + (y + h) * cos;
                const p3x = cx + (x + w) * cos - (y + h) * sin;
                const p3y = cy + (x + w) * sin + (y + h) * cos;

                let minX = Math.min(p0x, p1x, p2x, p3x);
                let maxX = Math.max(p0x, p1x, p2x, p3x);
                let minY = Math.min(p0y, p1y, p2y, p3y);
                let maxY = Math.max(p0y, p1y, p2y, p3y);

                const x0 = Math.max(0, Math.floor(minX));
                const x1 = Math.min(this.width, Math.ceil(maxX));
                const y0 = Math.max(0, Math.floor(minY));
                const y1 = Math.min(this.height, Math.ceil(maxY));

                if (x0 >= x1 || y0 >= y1) return;

                const data = this.imageData.data;
                const rowStride = this.width * 4;

                for (let py = y0; py < y1; py++) {
                    const rowOffset = py * rowStride;
                    for (let px = x0; px < x1; px++) {
                        const dx = px - cx;
                        const dy = py - cy;
                        const lx = dx * cos + dy * sin;
                        const ly = -dx * sin + dy * cos;

                        if (lx >= x && lx <= x + w && ly >= y && ly <= y + h) {
                            const idx = rowOffset + px * 4;
                            data[idx] = R;
                            data[idx + 1] = G;
                            data[idx + 2] = B;
                            data[idx + 3] = 255;
                        }
                    }
                }
            },
            drawImage(source, x, y, w, h, flipX) {
                if (!this._tmpCanvas) {
                    this._tmpCanvas = document.createElement('canvas');
                    this._tmpCtx = this._tmpCanvas.getContext('2d', { willReadFrequently: true });
                }
                const sw = Math.ceil(w);
                const sh = Math.ceil(h);
                if (this._tmpCanvas.width < sw || this._tmpCanvas.height < sh) {
                    this._tmpCanvas.width = Math.max(this._tmpCanvas.width, sw);
                    this._tmpCanvas.height = Math.max(this._tmpCanvas.height, sh);
                }
                this._tmpCtx.clearRect(0, 0, sw, sh);
                if (flipX) {
                    this._tmpCtx.save();
                    this._tmpCtx.translate(sw, 0);
                    this._tmpCtx.scale(-1, 1);
                    this._tmpCtx.drawImage(source, 0, 0, sw, sh);
                    this._tmpCtx.restore();
                } else {
                    this._tmpCtx.drawImage(source, 0, 0, sw, sh);
                }
                const srcImgData = this._tmpCtx.getImageData(0, 0, sw, sh);
                const srcData = srcImgData.data;
                const x0 = Math.max(0, Math.floor(x));
                const y0 = Math.max(0, Math.floor(y));
                const x1 = Math.min(this.width, Math.ceil(x + w));
                const y1 = Math.min(this.height, Math.ceil(y + h));
                if (x0 >= x1 || y0 >= y1) return;
                const data = this.imageData.data;
                const rowStride = this.width * 4;
                const srcStride = sw * 4;
                for (let py = y0; py < y1; py++) {
                    const rowOffset = py * rowStride;
                    const srcRow = (py - y0) * srcStride;
                    for (let px = x0; px < x1; px++) {
                        const srcIdx = srcRow + (px - x0) * 4;
                        const a = srcData[srcIdx + 3];
                        if (a === 0) continue;
                        const idx = rowOffset + px * 4;
                        if (a === 255) {
                            data[idx] = srcData[srcIdx];
                            data[idx + 1] = srcData[srcIdx + 1];
                            data[idx + 2] = srcData[srcIdx + 2];
                            data[idx + 3] = 255;
                        } else {
                            const alpha = a / 255;
                            const invAlpha = 1 - alpha;
                            data[idx] = Math.round(srcData[srcIdx] * alpha + data[idx] * invAlpha);
                            data[idx + 1] = Math.round(srcData[srcIdx + 1] * alpha + data[idx + 1] * invAlpha);
                            data[idx + 2] = Math.round(srcData[srcIdx + 2] * alpha + data[idx + 2] * invAlpha);
                            data[idx + 3] = 255;
                        }
                    }
                }
            },

            endFrame() {
                this.ctx.putImageData(this.imageData, 0, 0);
            }
        };
