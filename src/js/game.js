// ==================== Core Game Logic ====================
// Game state, world generation, entity system, update & draw loops.

        let player;
        let vehicles = [], trees = [], lanes = [];
        let score = 0, tileSize = 50;
        let gameOver = false;
        let cameraY = 0, targetCameraY = 0;
        let jumpProgress = 0;
        let frameCount = 0;
        let playerInvincible = 0;
        let autoSaveTimer = 0;

        function getDifficultyMultiplier() {
            return Math.min(4.0, 1 + score * 0.03);
        }

        function getJumpSpeed() {
            return 0.052 + Math.floor(score / 5) * 0.009;
        }

        function getDensityTier() {
            return Math.floor(score / 4);
        }

        function getPlayerBaseY() {
            return visualViewportHeight / 2 + (tileSize - tileSize * 0.8) / 2;
        }

        function spawnVehiclesForLane(worldY, laneSpeed, direction, slowNeeded, fastNeeded) {
            const slowCount = slowNeeded !== undefined ? slowNeeded : Math.min(1 + getDensityTier(), 5);
            const fastCount = fastNeeded !== undefined ? fastNeeded : Math.min(1 + getDensityTier(), 6);

            const minGap = player.width * 1.5;
            const gap = Math.max(minGap, 200 - score * 4);
            const clusterCenter = canvas.width / 2 + (Math.random() - 0.5) * 120;

            const slowMinSpeed = laneSpeed * 0.12;
            const slowMaxSpeed = laneSpeed * 0.32;
            const slowMinLen = tileSize * 0.9;
            const slowMaxLen = tileSize * 1.8;

            for (let i = 0; i < slowCount; i++) {
                const speedVal = slowMinSpeed + Math.random() * (slowMaxSpeed - slowMinSpeed);
                const speedRatio = (speedVal - slowMinSpeed) / (slowMaxSpeed - slowMinSpeed);
                const len = slowMaxLen - speedRatio * (slowMaxLen - slowMinLen);

                const offset = (i - (slowCount - 1) / 2) * gap + (Math.random() - 0.5) * 40;
                let x = clusterCenter + offset - len / 2;
                x = Math.max(10, Math.min(canvas.width - len - 10, x));

                vehicles.push({
                    worldX: x,
                    worldY: worldY,
                    width: len,
                    height: tileSize * 0.8,
                    baseSpeed: speedVal,
                    direction: direction,
                    type: 'car',
                    color: '#FFB74D',
                    isSlow: true,
                    respawnTimer: 0,
                    state: 'normal'
                });
            }

            const fastMinSpeed = laneSpeed * 0.9;
            const fastMaxSpeed = laneSpeed * 1.5;
            const fastMinLen = tileSize * 0.8;
            const fastMaxLen = tileSize * 2.2;

            for (let i = 0; i < fastCount; i++) {
                const speedVal = fastMinSpeed + Math.random() * (fastMaxSpeed - fastMinSpeed);
                const speedRatio = (speedVal - fastMinSpeed) / (fastMaxSpeed - fastMinSpeed);
                const len = fastMaxLen - speedRatio * (fastMaxLen - fastMinLen);

                const vehicleType = Math.random() > 0.5 ? 'car' : 'truck';
                let x;
                if (direction > 0) {
                    x = -len - Math.random() * 400;
                } else {
                    x = canvas.width + Math.random() * 400;
                }

                vehicles.push({
                    worldX: x,
                    worldY: worldY,
                    width: len,
                    height: tileSize * 0.8,
                    baseSpeed: speedVal,
                    direction: direction,
                    type: vehicleType,
                    color: getRandomColor(),
                    isSlow: false,
                    respawnTimer: Math.floor(Math.random() * 180),
                    state: 'normal'
                });
            }
        }

        function replenishVehicles() {
            const targetSlow = Math.min(1 + getDensityTier(), 5);
            const targetFast = Math.min(1 + getDensityTier(), 6);

            const laneStats = new Map();
            for (let v of vehicles) {
                if (v.state !== 'normal') continue;
                const key = v.worldY;
                if (!laneStats.has(key)) laneStats.set(key, { slow: 0, fast: 0 });
                if (v.isSlow) laneStats.get(key).slow++;
                else laneStats.get(key).fast++;
            }

            for (let lane of lanes) {
                if (lane.type !== 'road') continue;
                const stats = laneStats.get(lane.worldY) || { slow: 0, fast: 0 };
                if (stats.slow < targetSlow) {
                    const need = targetSlow - stats.slow;
                    const gap = Math.max(player.width * 1.5, 200 - score * 4);
                    const clusterCenter = canvas.width / 2 + (Math.random() - 0.5) * 120;
                    const slowMinSpeed = lane.speed * 0.12;
                    const slowMaxSpeed = lane.speed * 0.32;
                    const slowMinLen = tileSize * 0.9;
                    const slowMaxLen = tileSize * 1.8;

                    for (let i = 0; i < need; i++) {
                        const speedVal = slowMinSpeed + Math.random() * (slowMaxSpeed - slowMinSpeed);
                        const speedRatio = (speedVal - slowMinSpeed) / (slowMaxSpeed - slowMinSpeed);
                        const len = slowMaxLen - speedRatio * (slowMaxLen - slowMinLen);
                        const offset = (stats.slow + i - (targetSlow - 1) / 2) * gap + (Math.random() - 0.5) * 40;
                        let x = clusterCenter + offset - len / 2;
                        x = Math.max(10, Math.min(canvas.width - len - 10, x));

                        vehicles.push({
                            worldX: x,
                            worldY: lane.worldY,
                            width: len,
                            height: tileSize * 0.8,
                            baseSpeed: speedVal,
                            direction: lane.direction,
                            type: 'car',
                            color: '#FFB74D',
                            isSlow: true,
                            respawnTimer: 0,
                            state: 'normal'
                        });
                    }
                }
                if (stats.fast < targetFast) {
                    const need = targetFast - stats.fast;
                    const fastMinSpeed = lane.speed * 0.9;
                    const fastMaxSpeed = lane.speed * 1.5;
                    const fastMinLen = tileSize * 0.8;
                    const fastMaxLen = tileSize * 2.2;

                    for (let i = 0; i < need; i++) {
                        const speedVal = fastMinSpeed + Math.random() * (fastMaxSpeed - fastMinSpeed);
                        const speedRatio = (speedVal - fastMinSpeed) / (fastMaxSpeed - fastMinSpeed);
                        const len = fastMaxLen - speedRatio * (fastMaxLen - fastMinLen);
                        const vehicleType = Math.random() > 0.5 ? 'car' : 'truck';
                        let x;
                        if (lane.direction > 0) {
                            x = -len - Math.random() * 400;
                        } else {
                            x = canvas.width + Math.random() * 400;
                        }

                        vehicles.push({
                            worldX: x,
                            worldY: lane.worldY,
                            width: len,
                            height: tileSize * 0.8,
                            baseSpeed: speedVal,
                            direction: lane.direction,
                            type: vehicleType,
                            color: getRandomColor(),
                            isSlow: false,
                            respawnTimer: Math.floor(Math.random() * 180),
                            state: 'normal'
                        });
                    }
                }
            }
        }

        async function initGame() {
            await initRenderer();
            await loadCustomCharacter();

            // Load high score from cookie
            highScore = getHighScore();
            updateHighScoreDisplay();

            const baseY = getPlayerBaseY();
            player = {
                x: canvas.width / 2 - tileSize * 0.4,
                y: baseY,
                width: tileSize * 0.8,
                height: tileSize * 0.8,
                targetX: canvas.width / 2 - tileSize * 0.4,
                isJumping: false,
                facing: customCharacter ? customCharacter.direction : 'R',
                swingTimer: 0
            };

            createLanes();
            createTrees();
            createVehicles();

            canvas.addEventListener('touchstart', handleTouch, { passive: false });
            canvas.addEventListener('click', handleClick);
            document.getElementById('restart-btn').addEventListener('click', restartGame);

            document.getElementById('left-btn').addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer(-1, 0); });
            document.getElementById('right-btn').addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer(1, 0); });
            document.getElementById('up-btn').addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer(0, -1); });
            document.getElementById('down-btn').addEventListener('touchstart', (e) => { e.preventDefault(); movePlayer(0, 1); });

            document.addEventListener('keydown', handleKeyDown);
            window.addEventListener('resize', resizeCanvas);
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', resizeCanvas);
                window.visualViewport.addEventListener('scroll', resizeCanvas);
            }
            readVisualViewport();
            applyVisualViewport();

            gameLoop();
        }

        function createLanes() {
            lanes = [];
            const numLanes = Math.ceil(canvas.height / tileSize) + 20;
            const halfLanes = Math.ceil(numLanes / 2);
            for (let i = -halfLanes; i < halfLanes; i++) {
                const laneIndex = Math.abs(i);
                const laneType = laneIndex % 2 === 0 ? 'grass' : 'road';
                lanes.push({
                    worldY: i * tileSize,
                    type: laneType,
                    direction: laneIndex % 4 === 1 ? 1 : -1,
                    speed: 1.5 + Math.random() * 1.0
                });
            }
        }

        function createTrees() {
            trees = [];
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i].type === 'grass') {
                    const numTrees = Math.floor(Math.random() * 3) + 1;
                    for (let j = 0; j < numTrees; j++) {
                        trees.push({
                            worldX: Math.random() * canvas.width,
                            worldY: lanes[i].worldY,
                            width: tileSize * 0.8,
                            height: tileSize
                        });
                    }
                }
            }
        }

        function createVehicles() {
            vehicles = [];
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i].type === 'road') {
                    spawnVehiclesForLane(lanes[i].worldY, lanes[i].speed, lanes[i].direction);
                }
            }
        }

        function getRandomColor() {
            const colors = ['#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', '#9C27B0', '#00BCD4'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        function handleTouch(e) {
            e.preventDefault();
            handleInput(e.touches[0].clientX, e.touches[0].clientY);
        }

        function handleClick(e) {
            handleInput(e.clientX, e.clientY);
        }

        function handleKeyDown(e) {
            if (gameOver || player.isJumping) return;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': movePlayer(0, -1); break;
                case 'ArrowDown': case 's': case 'S': movePlayer(0, 1); break;
                case 'ArrowLeft': case 'a': case 'A': movePlayer(-1, 0); break;
                case 'ArrowRight': case 'd': case 'D': movePlayer(1, 0); break;
            }
        }

        function handleInput(x, y) {
            if (gameOver || player.isJumping) return;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const offsetX = x - centerX;
            const offsetY = y - centerY;

            if (Math.abs(offsetX) > Math.abs(offsetY)) {
                movePlayer(offsetX < 0 ? -1 : 1, 0);
            } else {
                movePlayer(0, offsetY < 0 ? -1 : 1);
            }
        }

        function movePlayer(dirX, dirY) {
            if (player.isJumping || gameOver) return;

            if (dirX !== 0 && customCharacter) {
                player.facing = dirX > 0 ? 'R' : 'L';
            }

            targetCameraY += dirY * tileSize;

            let nextX = player.x + dirX * tileSize;
            nextX = Math.max(0, Math.min(canvas.width - player.width, nextX));
            player.targetX = nextX;

            if (dirY !== 0) {
                player.isJumping = true;
                jumpProgress = 0;
            }

            if (dirY < 0) {
                score++;
            } else if (dirY > 0 && score > 0) {
                score--;
            }
            document.getElementById('score').textContent = `Score: ${score}`;
            recordScore(score);
        }

        function update() {
            if (gameOver) return;
            frameCount++;

            const jumpSpeed = getJumpSpeed();
            const multiplier = getDifficultyMultiplier();

            const camDiff = targetCameraY - cameraY;
            const scrollStep = tileSize * jumpSpeed * 1.2;
            if (Math.abs(camDiff) > scrollStep) {
                cameraY += Math.sign(camDiff) * scrollStep;
            } else {
                cameraY = targetCameraY;
            }

            const hDiff = player.targetX - player.x;
            if (Math.abs(hDiff) > 0.8) {
                player.x += hDiff * 0.35;
            } else {
                player.x = player.targetX;
            }

            let jumpOffset = 0;
            if (player.isJumping) {
                jumpProgress += jumpSpeed;
                if (jumpProgress >= 1) {
                    jumpProgress = 0;
                    player.isJumping = false;
                } else {
                    jumpOffset = -Math.sin(jumpProgress * Math.PI) * (tileSize * 0.42);
                }
            }

            if (playerInvincible > 0) playerInvincible--;
            if (player.swingTimer > 0) player.swingTimer--;

            const playerDrawY = player.y + jumpOffset;
            const playerWorldY = cameraY - canvas.height / 2 + player.y;

            for (let i = 0; i < vehicles.length; i++) {
                const v = vehicles[i];

                if (v.state === 'flying') {
                    v.flyX += v.flyVx;
                    v.flyY += v.flyVy;
                    v.flyVy += v.flyGravity;
                    v.flyRotation += v.flyRotSpeed;
                    if (v.flyY > canvas.height + 120) {
                        v.state = 'dead';
                    }
                    continue;
                }

                if (v.respawnTimer > 0) {
                    v.respawnTimer--;
                } else {
                    const speedNow = v.isSlow
                        ? v.baseSpeed * Math.min(1.5, 1 + score * 0.006)
                        : v.baseSpeed * multiplier;
                    const moveDist = speedNow;

                    v.worldX += speedNow * v.direction;

                    if (v.direction > 0 && v.worldX > canvas.width + v.width + 50) {
                        v.worldX = -v.width - 50 - Math.random() * 300;
                        v.respawnTimer = Math.floor(Math.random() * 150 + 30);
                    } else if (v.direction < 0 && v.worldX < -v.width - 50) {
                        v.worldX = canvas.width + 50 + Math.random() * 300;
                        v.respawnTimer = Math.floor(Math.random() * 150 + 30);
                    }
                }

                if (playerInvincible > 0) continue;
                if (Math.abs(v.worldY - playerWorldY) > tileSize * 0.5) continue;
                if (player.isJumping) continue;
                if (v.respawnTimer > 0) continue;

                const screenY = v.worldY - cameraY + canvas.height / 2;
                const prevX = v.worldX - (v.respawnTimer > 0 ? 0 : v.baseSpeed * (v.isSlow ? Math.min(1.5, 1 + score * 0.006) : multiplier) * v.direction);
                const pathBox = {
                    x: Math.min(v.worldX, prevX),
                    y: screenY,
                    width: v.width + Math.abs(v.worldX - prevX),
                    height: v.height
                };

                if (checkCollision(
                    { x: player.x, y: playerDrawY, width: player.width, height: player.height },
                    pathBox
                )) {
                    if (score >= 10) {
                        score -= 10;
                        document.getElementById('score').textContent = `Score: ${score}`;
                        playerInvincible = 45;
                        player.swingTimer = 25;

                        v.state = 'flying';
                        v.flyX = v.worldX;
                        v.flyY = screenY;
                        v.flyVx = (Math.random() - 0.5) * 14;
                        v.flyVy = -12 - Math.random() * 6;
                        v.flyGravity = 0.7;
                        v.flyRotation = 0;
                        v.flyRotSpeed = 22;
                    } else {
                        gameOver = true;
                        // Record and save high score immediately on death
                        recordScore(score);
                        trySaveHighScore(true);
                        document.getElementById('final-score').textContent = `Score: ${score}`;
                        document.getElementById('final-high-score').textContent = `Best: ${highScore}`;
                        document.getElementById('game-over').style.display = 'block';
                    }
                }
            }

            vehicles = vehicles.filter(v => v.state !== 'dead');

            generateWorld();
            if (frameCount % 5 === 0) cleanupWorld();
            if (frameCount % 90 === 0) replenishVehicles();

            // Auto-save high score every ~10 seconds (approx 600 frames @ 60fps)
            autoSaveTimer++;
            if (autoSaveTimer >= 600) {
                autoSaveTimer = 0;
                trySaveHighScore(false);
            }
        }

        function generateWorld() {
            const topVisibleY = cameraY - canvas.height / 2 - tileSize * 2;
            let minWorldY = Infinity;
            for (let i = 0; i < lanes.length; i++) {
                if (lanes[i].worldY < minWorldY) minWorldY = lanes[i].worldY;
            }

            while (minWorldY > topVisibleY) {
                minWorldY -= tileSize;
                const newLaneIndex = Math.floor(Math.abs(minWorldY / tileSize));
                const laneType = newLaneIndex % 2 === 0 ? 'grass' : 'road';
                const direction = newLaneIndex % 4 === 1 ? 1 : -1;
                const speed = 1.5 + Math.random() * 1.0;

                lanes.push({ worldY: minWorldY, type: laneType, direction, speed });

                if (laneType === 'road') {
                    spawnVehiclesForLane(minWorldY, speed, direction);
                } else {
                    const numTrees = Math.floor(Math.random() * 3) + 1;
                    for (let j = 0; j < numTrees; j++) {
                        trees.push({
                            worldX: Math.random() * canvas.width,
                            worldY: minWorldY,
                            width: tileSize * 0.8, height: tileSize
                        });
                    }
                }
            }
        }

        function cleanupWorld() {
            const topVisibleY = cameraY - canvas.height / 2 - tileSize * 5;
            const bottomVisibleY = cameraY + canvas.height / 2 + tileSize * 5;
            lanes = lanes.filter(l => l.worldY > topVisibleY && l.worldY < bottomVisibleY);
            vehicles = vehicles.filter(v => v.worldY > topVisibleY && v.worldY < bottomVisibleY);
            trees = trees.filter(t => t.worldY > topVisibleY && t.worldY < bottomVisibleY);
        }

        function checkCollision(a, b) {
            return a.x < b.x + b.width &&
                   a.x + a.width > b.x &&
                   a.y < b.y + b.height &&
                   a.y + a.height > b.y;
        }

        async function draw() {
            renderer.beginFrame();

            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const screenY = lane.worldY - cameraY + canvas.height / 2;
                if (screenY < -tileSize || screenY > canvas.height + tileSize) continue;

                renderer.drawRect(0, screenY, canvas.width, tileSize, lane.type === 'grass' ? '#4CAF50' : '#555555');

                if (lane.type === 'road') {
                    for (let x = 0; x < canvas.width; x += tileSize) {
                        renderer.drawRect(x + tileSize / 4, screenY + tileSize / 2 - 2, tileSize / 2, 4, '#FFFFFF');
                    }
                }
            }

            for (let i = 0; i < trees.length; i++) {
                const tree = trees[i];
                const screenY = tree.worldY - cameraY + canvas.height / 2;
                if (screenY < -tileSize || screenY > canvas.height + tileSize) continue;

                renderer.drawRect(tree.worldX + tree.width / 3, screenY + tree.height / 2, tree.width / 3, tree.height / 2, '#8B4513');
                renderer.drawRect(tree.worldX, screenY, tree.width, tree.height / 2, '#2E7D32');
            }

            for (let i = 0; i < vehicles.length; i++) {
                const v = vehicles[i];

                if (v.state === 'flying') {
                    const cx = v.flyX + v.width / 2;
                    const cy = v.flyY + v.height / 2;
                    const rot = v.flyRotation * Math.PI / 180;

                    if (v.isSlow) {
                        renderer.drawRectRotated(-v.width / 2, -tileSize * 0.25, v.width, tileSize * 0.55, v.color, rot, cx, cy);
                        renderer.drawRectRotated(-v.width * 0.1, -tileSize * 0.45, v.width * 0.2, tileSize * 0.15, '#FF5722', rot, cx, cy);
                        renderer.drawRectRotated(-v.width * 0.4, tileSize * 0.2, tileSize * 0.2, tileSize * 0.15, '#333333', rot, cx, cy);
                        renderer.drawRectRotated(v.width * 0.2, tileSize * 0.2, tileSize * 0.2, tileSize * 0.15, '#333333', rot, cx, cy);
                    } else {
                        renderer.drawRectRotated(-v.width / 2, -tileSize * 0.2, v.width, tileSize * 0.6, v.color, rot, cx, cy);
                        renderer.drawRectRotated(-v.width * 0.4, -tileSize * 0.4, v.width * 0.8, tileSize * 0.3, '#333333', rot, cx, cy);
                        renderer.drawRectRotated(-v.width * 0.35, tileSize * 0.2, tileSize * 0.2, tileSize * 0.2, '#000000', rot, cx, cy);
                        renderer.drawRectRotated(v.width * 0.15, tileSize * 0.2, tileSize * 0.2, tileSize * 0.2, '#000000', rot, cx, cy);
                    }
                    continue;
                }

                const screenY = v.worldY - cameraY + canvas.height / 2;
                if (screenY < -tileSize * 2 || screenY > canvas.height + tileSize * 2) continue;

                if (v.isSlow) {
                    renderer.drawRect(v.worldX, screenY + tileSize * 0.15, v.width, tileSize * 0.55, v.color);
                    renderer.drawRect(v.worldX + v.width * 0.4, screenY - tileSize * 0.05, v.width * 0.2, tileSize * 0.15, '#FF5722');
                    renderer.drawRect(v.worldX + v.width * 0.1, screenY + tileSize * 0.7, tileSize * 0.2, tileSize * 0.15, '#333333');
                    renderer.drawRect(v.worldX + v.width * 0.7, screenY + tileSize * 0.7, tileSize * 0.2, tileSize * 0.15, '#333333');
                } else {
                    renderer.drawRect(v.worldX, screenY + tileSize * 0.1, v.width, tileSize * 0.6, v.color);
                    renderer.drawRect(v.worldX + v.width * 0.1, screenY - tileSize * 0.1, v.width * 0.8, tileSize * 0.3, '#333333');
                    renderer.drawRect(v.worldX + v.width * 0.15, screenY + tileSize * 0.7, tileSize * 0.2, tileSize * 0.2, '#000000');
                    renderer.drawRect(v.worldX + v.width * 0.65, screenY + tileSize * 0.7, tileSize * 0.2, tileSize * 0.2, '#000000');
                }
            }

            const jumpOffset = player.isJumping ? -Math.sin(jumpProgress * Math.PI) * (tileSize * 0.42) : 0;
            const drawY = player.y + jumpOffset;

            if (playerInvincible <= 0 || Math.floor(playerInvincible / 4) % 2 === 0) {
                if (customCharacter) {
                    renderPlayerComposite(player.facing, player.isJumping, jumpProgress, player.swingTimer || 0, frameCount);
                    if (renderer === offscreenCanvasWorkerRenderer) {
                        try {
                            if (playerCompositeBitmap) playerCompositeBitmap.close();
                            playerCompositeBitmap = await createImageBitmap(playerCompositeCanvas);
                        } catch (e) {}
                        renderer.drawImage(playerCompositeBitmap, player.x, drawY, player.width, player.height, false);
                    } else {
                        renderer.drawImage(playerCompositeCanvas, player.x, drawY, player.width, player.height, false);
                    }
                } else {
                    renderer.drawRect(player.x, drawY, player.width, player.height, '#FFFFFF');
                    const fs = player.width * 0.82 / 1082;
                    const faceW = 1082 * fs;
                    const faceH = 908 * fs;
                    const fx = player.x + (player.width - faceW) / 2;
                    const fy = drawY + (player.height - faceH) / 2;
                    renderer.drawRect(fx +   0 * fs, fy +   0 * fs, 139 * fs, 269 * fs, '#333333');
                    renderer.drawRect(fx + 949 * fs, fy +   0 * fs, 133 * fs, 269 * fs, '#333333');
                    renderer.drawRect(fx + 555 * fs, fy + 134 * fs, 120 * fs, 405 * fs, '#333333');
                    renderer.drawRect(fx + 405 * fs, fy + 399 * fs, 150 * fs, 140 * fs, '#333333');
                    renderer.drawRect(fx +   1 * fs, fy + 572 * fs, 137 * fs, 132 * fs, '#333333');
                    renderer.drawRect(fx + 950 * fs, fy + 572 * fs, 133 * fs, 132 * fs, '#333333');
                    renderer.drawRect(fx + 138 * fs, fy + 704 * fs, 135 * fs, 138 * fs, '#333333');
                    renderer.drawRect(fx + 814 * fs, fy + 704 * fs, 136 * fs, 138 * fs, '#333333');
                    renderer.drawRect(fx + 273 * fs, fy + 776 * fs, 540 * fs, 132 * fs, '#333333');
                }
            }

            if (renderer.endFrame) {
                const frameResult = renderer.endFrame();
                if (frameResult && typeof frameResult.then === 'function') {
                    await frameResult;
                }
            }
        }

        async function gameLoop() {
            update();
            await draw();
            requestAnimationFrame(gameLoop);
        }

        function restartGame() {
            score = 0; gameOver = false;
            cameraY = 0; targetCameraY = 0;
            jumpProgress = 0; player.isJumping = false;
            playerInvincible = 0;
            autoSaveTimer = 0;
            player.swingTimer = 0;
            player.facing = customCharacter ? customCharacter.direction : 'R';
            document.getElementById('score').textContent = `Score: ${score}`;
            document.getElementById('game-over').style.display = 'none';

            const baseY = getPlayerBaseY();
            player.x = canvas.width / 2 - tileSize * 0.4;
            player.y = baseY;
            player.targetX = player.x;
            player.isJumping = false;

            createLanes(); createTrees(); createVehicles();
        }

        function resizeCanvas() {
            onVisualViewportChange();
        }