// --- WebGL2 Backend ---
        const webgl2Renderer = {
            gl: null,
            program: null,
            buffer: null,
            vao: null,
            vertices: [],

            init(c) {
                const gl = c.getContext('webgl2', { alpha: false, antialias: false });
                if (!gl) return false;
                this.gl = gl;

                const vsSrc = `
                    attribute vec2 a_position;
                    attribute vec4 a_color;
                    varying vec4 v_color;
                    void main() {
                        gl_Position = vec4(a_position, 0.0, 1.0);
                        v_color = a_color;
                    }
                `;
                const fsSrc = `
                    precision mediump float;
                    varying vec4 v_color;
                    void main() {
                        gl_FragColor = v_color;
                    }
                `;

                function compile(type, src) {
                    const s = gl.createShader(type);
                    gl.shaderSource(s, src);
                    gl.compileShader(s);
                    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                        gl.deleteShader(s);
                        return null;
                    }
                    return s;
                }
                const vs = compile(gl.VERTEX_SHADER, vsSrc);
                const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
                if (!vs || !fs) return false;

                const prog = gl.createProgram();
                gl.attachShader(prog, vs);
                gl.attachShader(prog, fs);
                gl.linkProgram(prog);
                if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
                this.program = prog;

                this.buffer = gl.createBuffer();

                this.vao = gl.createVertexArray();
                gl.bindVertexArray(this.vao);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

                const posLoc = gl.getAttribLocation(this.program, 'a_position');
                const colLoc = gl.getAttribLocation(this.program, 'a_color');
                gl.enableVertexAttribArray(posLoc);
                gl.enableVertexAttribArray(colLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 24, 0);
                gl.vertexAttribPointer(colLoc, 4, gl.FLOAT, false, 24, 8);

                gl.bindVertexArray(null);

                gl.disable(gl.DEPTH_TEST);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
                const gl = this.gl;
                const vsSrc = `
                    attribute vec2 a_position;
                    attribute vec2 a_texCoord;
                    varying vec2 v_texCoord;
                    void main() {
                        gl_Position = vec4(a_position, 0.0, 1.0);
                        v_texCoord = a_texCoord;
                    }
                `;
                const fsSrc = `
                    precision mediump float;
                    varying vec2 v_texCoord;
                    uniform sampler2D u_texture;
                    void main() {
                        gl_FragColor = texture2D(u_texture, v_texCoord);
                    }
                `;
                function compile(type, src) {
                    const s = gl.createShader(type);
                    gl.shaderSource(s, src);
                    gl.compileShader(s);
                    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                        gl.deleteShader(s);
                        return null;
                    }
                    return s;
                }
                const vs = compile(gl.VERTEX_SHADER, vsSrc);
                const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
                if (!vs || !fs) return;
                const prog = gl.createProgram();
                gl.attachShader(prog, vs);
                gl.attachShader(prog, fs);
                gl.linkProgram(prog);
                if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
                this._texProg = prog;
                this._texBuffer = gl.createBuffer();
                this._tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this._tex);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                this._texVao = gl.createVertexArray();
                gl.bindVertexArray(this._texVao);
                gl.bindBuffer(gl.ARRAY_BUFFER, this._texBuffer);
                const posLoc = gl.getAttribLocation(this._texProg, 'a_position');
                const texLoc = gl.getAttribLocation(this._texProg, 'a_texCoord');
                gl.enableVertexAttribArray(posLoc);
                gl.enableVertexAttribArray(texLoc);
                gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
                gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);
                gl.bindVertexArray(null);
            },
            drawImage(source, x, y, w, h, flipX) {
                if (!this._texProg) this._initTex();
                const gl = this.gl;
                gl.bindTexture(gl.TEXTURE_2D, this._tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
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
                const gl = this.gl;
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.clearColor(0.5294, 0.8078, 0.9216, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                if (this.vertices.length > 0) {
                    gl.useProgram(this.program);
                    gl.bindVertexArray(this.vao);
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
                    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 6);
                    gl.bindVertexArray(null);
                }

                if (this._texVerts && this._texVerts.length > 0) {
                    gl.useProgram(this._texProg);
                    gl.bindVertexArray(this._texVao);
                    gl.bindBuffer(gl.ARRAY_BUFFER, this._texBuffer);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this._tex);
                    gl.uniform1i(gl.getUniformLocation(this._texProg, 'u_texture'), 0);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._texVerts), gl.DYNAMIC_DRAW);
                    gl.drawArrays(gl.TRIANGLES, 0, this._texVerts.length / 4);
                    gl.bindVertexArray(null);
                    this._texVerts = [];
                }
            }
        };
