// ==================== Cookie High Score System (Fault-Tolerant Design) ====================
        const COOKIE_KEY = 'crossy_high_score';
        const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

        function getHighScore() {
            try {
                const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_KEY + '=([^;]*)'));
                if (match) {
                    const val = parseInt(decodeURIComponent(match[1]), 10);
                    return isNaN(val) ? 0 : Math.max(0, val);
                }
            } catch (e) {
                // Cookie read failed (private mode, cookies disabled) — silently return 0
            }
            return 0;
        }

        function setHighScore(value) {
            try {
                const safeValue = Math.max(0, Math.floor(value));
                const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000).toUTCString();
                document.cookie = `${COOKIE_KEY}=${encodeURIComponent(safeValue)}; expires=${expires}; path=/; SameSite=Lax`;
                return true;
            } catch (e) {
                // Write failed — game continues unaffected
                return false;
            }
        }

        let highScore = 0;
        let highScoreDirty = false; // Flag: unsaved new high score exists

        function updateHighScoreDisplay() {
            document.getElementById('high-score').textContent = `Best: ${highScore}`;
        }

        function trySaveHighScore(force) {
            if (highScoreDirty || force) {
                setHighScore(highScore);
                highScoreDirty = false;
            }
        }

        function recordScore(current) {
            if (current > highScore) {
                highScore = current;
                highScoreDirty = true;
                updateHighScoreDisplay();
            }
        }