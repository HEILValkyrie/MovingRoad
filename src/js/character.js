// ==================== Custom Character System ====================
// Loads a composite character from parts defined in assets/character.json.

        let customCharacter = null;
        let playerCompositeCanvas = null;
        let playerCompositeCtx = null;
        let playerCompositeBitmap = null;

        function loadImageFromBase64(base64) {
            return new Promise((resolve) => {
                if (!base64 || typeof base64 !== 'string' || base64 === '[BASE64_STRING_REQUIRED]') {
                    resolve(null);
                    return;
                }
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                let src = base64;
                if (!src.startsWith('data:image')) {
                    src = 'data:image/png;base64,' + src;
                }
                img.src = src;
            });
        }

        async function loadCustomCharacter() {
            try {
                const response = await fetch('assets/character.json');
                if (!response.ok) return false;
                const json = await response.json();
                const parts = ['rightarm', 'leftarm', 'body', 'leftleg', 'rightleg', 'crutch'];
                const loaded = {};
                for (const part of parts) {
                    const img = await loadImageFromBase64(json[part]);
                    if (img) loaded[part] = img;
                }
                if (!loaded.body) return false;
                customCharacter = {
                    parts: loaded,
                    direction: (json.direction || 'R').toUpperCase()
                };
                playerCompositeCanvas = document.createElement('canvas');
                playerCompositeCanvas.width = 256;
                playerCompositeCanvas.height = 256;
                playerCompositeCtx = playerCompositeCanvas.getContext('2d');
                return true;
            } catch (e) {
                console.log('Custom character load failed, using default');
                return false;
            }
        }

        function renderPlayerComposite(facing, isJumping, jumpProgress, swingTimer, frameCount) {
            const ctx = playerCompositeCtx;
            const W = playerCompositeCanvas.width;
            const H = playerCompositeCanvas.height;
            ctx.clearRect(0, 0, W, H);
            const parts = customCharacter.parts;
            const dir = customCharacter.direction;
            const needsFlip = (facing !== dir);
            ctx.save();
            if (needsFlip) {
                ctx.translate(W, 0);
                ctx.scale(-1, 1);
            }
            const bodyW = W * 0.5;
            const bodyH = H * 0.55;
            let bodyX = (W - bodyW) / 2;
            let bodyY = H * 0.25;
            let legOffset1 = 0, legOffset2 = 0;
            let armAngle1 = 0, armAngle2 = 0;
            if (isJumping) {
                const t = jumpProgress * Math.PI;
                legOffset1 = Math.sin(t) * 18;
                legOffset2 = Math.sin(t + Math.PI) * 18;
                armAngle1 = Math.sin(t) * 0.18;
                armAngle2 = Math.sin(t + Math.PI) * 0.18;
            } else {
                const breathe = Math.sin(frameCount * 0.08) * 3;
                bodyY += breathe * 0.3;
            }
            if (swingTimer > 0) {
                const swingT = 1 - (swingTimer / 25);
                armAngle2 = -Math.sin(swingT * Math.PI) * 1.4;
            }
            function drawPart(img, cx, cy, maxW, maxH, angle) {
                if (!img) return;
                const scale = Math.min(maxW / img.width, maxH / img.height, 1);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.save();
                ctx.translate(cx, cy);
                if (angle) ctx.rotate(angle);
                ctx.drawImage(img, -w / 2, -h / 2, w, h);
                ctx.restore();
            }
            const legW = W * 0.22;
            const legH = H * 0.35;
            const armW = W * 0.18;
            const armH = H * 0.35;
            drawPart(parts.leftleg, bodyX + bodyW * 0.25, bodyY + bodyH + legH * 0.4 + legOffset1, legW, legH);
            drawPart(parts.leftarm, bodyX, bodyY + bodyH * 0.2 + armAngle1 * 10, armW, armH, armAngle1);
            drawPart(parts.body, bodyX + bodyW / 2, bodyY + bodyH / 2, bodyW, bodyH);
            drawPart(parts.rightleg, bodyX + bodyW * 0.65, bodyY + bodyH + legH * 0.4 + legOffset2, legW, legH);
            const rArmCx = bodyX + bodyW * 0.85;
            const rArmCy = bodyY + bodyH * 0.2;
            drawPart(parts.rightarm, rArmCx, rArmCy + armAngle2 * 10, armW, armH, armAngle2);
            if (parts.crutch && swingTimer > 0) {
                const crutchW = W * 0.12;
                const crutchH = H * 0.5;
                ctx.save();
                ctx.translate(rArmCx, rArmCy + armH * 0.3);
                ctx.rotate(armAngle2 - 0.3);
                const scale = Math.min(crutchW / parts.crutch.width, crutchH / parts.crutch.height, 1);
                const cw = parts.crutch.width * scale;
                const ch = parts.crutch.height * scale;
                ctx.drawImage(parts.crutch, -cw / 2, -ch * 0.2, cw, ch);
                ctx.restore();
            }
            ctx.restore();
        }