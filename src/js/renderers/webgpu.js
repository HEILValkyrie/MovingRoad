// --- WebGPU Backend ---
        const webgpuRenderer = {
            device: null,
            context: null,
            pipeline: null,
            buffer: null,
            vertices: [],
            maxVertexCount: 20000,

            async init(c) {
                if (!navigator.gpu) return false;
                const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
                if (!adapter) return false;
                this.device = await adapter.requestDevice();
                this.context = c.getContext('webgpu');
                const format = navigator.gpu.getPreferredCanvasFormat();
                this.context.configure({ device: this.device, format, alphaMode: 'opaque' });

                const shaderCode = `
                    struct VertexOutput {
                        @builtin(position) position: vec4f,
                        @location(0) color: vec4f,
                    };
                    @vertex
                    fn vs_main(@location(0) pos: vec2f, @location(1) color: vec4f) -> VertexOutput {
                        var out: VertexOutput;
                        out.position = vec4f(pos, 0.0, 1.0);
                        out.color = color;
                        return out;
                    }
                    @fragment
                    fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                        return in.color;
                    }
                `;

                const shaderModule = this.device.createShaderModule({ code: shaderCode });
                this.pipeline = this.device.createRenderPipeline({
                    layout: 'auto',
                    vertex: {
                        module: shaderModule,
                        entryPoint: 'vs_main',
                        buffers: [{
                            arrayStride: 24,
                            attributes: [
                                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                                { shaderLocation: 1, offset: 8, format: 'float32x4' }
                            ]
                        }]
                    },
                    fragment: {
                        module: shaderModule,
                        entryPoint: 'fs_main',
                        targets: [{ format }]
                    },
                    primitive: { topology: 'triangle-list' }
                });

                this.buffer = this.device.createBuffer({
                    size: this.maxVertexCount * 24,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
                });
                return true;
            },

            beginFrame() { this.vertices = []; },

            drawRect(x, y, w, h, color) { this.drawRectRotated(x, y, w, h, color, 0, 0, 0); },

            drawRectRotated(x, y, w, h, color, angle, cx, cy) {
                const [r, g, b, a] = hexToRGBA(color);
                const W = canvas.width, H = canvas.height;
                const cos = Math.cos(angle), sin = Math.sin(angle);

                const transform = (lx, ly) => {
                    const rx = lx * cos + ly * sin;
                    const ry = -lx * sin + ly * cos;
                    return [toClipX(cx + rx, W), toClipY(cy + ry, H)];
                };

                const c0 = transform(x, y);
                const c1 = transform(x + w, y);
                const c2 = transform(x, y + h);
                const c3 = transform(x + w, y + h);

                this.vertices.push(c0[0], c0[1], r, g, b, a);
                this.vertices.push(c1[0], c1[1], r, g, b, a);
                this.vertices.push(c2[0], c2[1], r, g, b, a);

                this.vertices.push(c1[0], c1[1], r, g, b, a);
                this.vertices.push(c2[0], c2[1], r, g, b, a);
                this.vertices.push(c3[0], c3[1], r, g, b, a);
            },

            _initTex() {
                const device = this.device;
                const shaderCode = `
                    struct VertexOutput {
                        @builtin(position) position: vec4f,
                        @location(0) texCoord: vec2f,
                    };
                    @vertex
                    fn vs_main(@location(0) pos: vec2f, @location(1) texCoord: vec2f) -> VertexOutput {
                        var out: VertexOutput;
                        out.position = vec4f(pos, 0.0, 1.0);
                        out.texCoord = texCoord;
                        return out;
                    }
                    @fragment
                    fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                        return textureSample(myTexture, mySampler, in.texCoord);
                    }
                `;
                const shaderModule = device.createShaderModule({ code: shaderCode });
                const bindGroupLayout = device.createBindGroupLayout({
                    entries: [
                        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: {} },
                        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: {} }
                    ]
                });
                this._texPipeline = device.createRenderPipeline({
                    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
                    vertex: {
                        module: shaderModule,
                        entryPoint: 'vs_main',
                        buffers: [{
                            arrayStride: 16,
                            attributes: [
                                { shaderLocation: 0, offset: 0, format: 'float32x2' },
                                { shaderLocation: 1, offset: 8, format: 'float32x2' }
                            ]
                        }]
                    },
                    fragment: {
                        module: shaderModule,
                        entryPoint: 'fs_main',
                        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
                    },
                    primitive: { topology: 'triangle-list' }
                });
                this._texBuffer = device.createBuffer({
                    size: 6 * 16,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
                });
                this._texSampler = device.createSampler({
                    magFilter: 'linear',
                    minFilter: 'linear',
                    addressModeU: 'clamp-to-edge',
                    addressModeV: 'clamp-to-edge'
                });
                this._texBindGroupLayout = bindGroupLayout;
            },
            drawImage(source, x, y, w, h, flipX) {
                if (!this._texPipeline) this._initTex();
                const device = this.device;
                const srcW = source.width || source.videoWidth || source.naturalWidth || 256;
                const srcH = source.height || source.videoHeight || source.naturalHeight || 256;
                if (!this._tex || this._texWidth !== srcW || this._texHeight !== srcH) {
                    this._tex = device.createTexture({
                        size: [srcW, srcH],
                        format: 'rgba8unorm',
                        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
                    });
                    this._texWidth = srcW;
                    this._texHeight = srcH;
                    this._texBindGroup = device.createBindGroup({
                        layout: this._texBindGroupLayout,
                        entries: [
                            { binding: 0, resource: this._tex.createView() },
                            { binding: 1, resource: this._texSampler }
                        ]
                    });
                }
                try {
                    device.queue.copyExternalImageToTexture({ source }, { texture: this._tex }, [srcW, srcH]);
                } catch (e) {
                    return;
                }
                const W = canvas.width, H = canvas.height;
                const x1 = (x / W) * 2 - 1;
                const x2 = ((x + w) / W) * 2 - 1;
                const y1 = -((y / H) * 2 - 1);
                const y2 = -(((y + h) / H) * 2 - 1);
                const u0 = flipX ? 1 : 0, u1 = flipX ? 0 : 1;
                if (!this._texVerts) this._texVerts = [];
                this._texVerts.push(
                    x1, y1, u0, 0,
                    x2, y1, u1, 0,
                    x1, y2, u0, 1,
                    x2, y1, u1, 0,
                    x1, y2, u0, 1,
                    x2, y2, u1, 1
                );
            },
            endFrame() {
                const device = this.device;
                const encoder = device.createCommandEncoder();
                const pass = encoder.beginRenderPass({
                    colorAttachments: [{
                        view: this.context.getCurrentTexture().createView(),
                        loadOp: 'clear',
                        storeOp: 'store',
                        clearValue: { r: 135 / 255, g: 206 / 255, b: 235 / 255, a: 1 }
                    }]
                });

                if (this.vertices.length > 0) {
                    const vertexCount = this.vertices.length / 6;
                    const data = new Float32Array(this.vertices);
                    device.queue.writeBuffer(this.buffer, 0, data);
                    pass.setPipeline(this.pipeline);
                    pass.setVertexBuffer(0, this.buffer);
                    pass.draw(vertexCount);
                }

                if (this._texVerts && this._texVerts.length > 0) {
                    const data = new Float32Array(this._texVerts);
                    device.queue.writeBuffer(this._texBuffer, 0, data);
                    pass.setPipeline(this._texPipeline);
                    pass.setVertexBuffer(0, this._texBuffer);
                    pass.setBindGroup(0, this._texBindGroup);
                    pass.draw(this._texVerts.length / 4);
                    this._texVerts = [];
                }

                pass.end();
                device.queue.submit([encoder.finish()]);
            }
        };
