// ==================== Visual Viewport Adaptation System ====================
// Handles Android address bar / bottom nav bar occlusion issues.

        let visualViewportWidth = window.innerWidth;
        let visualViewportHeight = window.innerHeight;
        let visualViewportOffsetTop = 0;
        let visualViewportOffsetLeft = 0;

        function readVisualViewport() {
            const vv = window.visualViewport;
            if (vv) {
                visualViewportWidth = vv.width;
                visualViewportHeight = vv.height;
                visualViewportOffsetTop = vv.offsetTop;
                visualViewportOffsetLeft = vv.offsetLeft;
            } else {
                visualViewportWidth = window.innerWidth;
                visualViewportHeight = window.innerHeight;
                visualViewportOffsetTop = 0;
                visualViewportOffsetLeft = 0;
            }
        }

        function applyVisualViewport() {
            const container = document.getElementById('game-container');
            if (container) {
                container.style.width = Math.max(1, Math.round(visualViewportWidth)) + 'px';
                container.style.height = Math.max(1, Math.round(visualViewportHeight)) + 'px';
                container.style.top = visualViewportOffsetTop + 'px';
                container.style.left = visualViewportOffsetLeft + 'px';
            }
            if (canvas) {
                const targetW = Math.max(1, Math.round(visualViewportWidth));
                const targetH = Math.max(1, Math.round(visualViewportHeight));
                if (canvas.width !== targetW || canvas.height !== targetH) {
                    canvas.width = targetW;
                    canvas.height = targetH;
                    if (renderer === offscreenCanvasWorkerRenderer && renderer.worker && renderer.ready) {
                        renderer.worker.postMessage({ type: 'resize', width: canvas.width, height: canvas.height });
                    }
                }
                const baseY = getPlayerBaseY();
                if (player) {
                    player.y = baseY;
                    player.targetX = Math.max(0, Math.min(canvas.width - player.width, player.targetX || 0));
                    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
                }
            }
        }

        function onVisualViewportChange() {
            readVisualViewport();
            applyVisualViewport();
        }