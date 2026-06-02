// ==================== Renderer Backend Abstraction Layer ====================
// Shared utilities used by all rendering backends.

        let canvas;
        let renderer = null;

        function hexToRGBA(hex) {
            let r = 0, g = 0, b = 0, a = 1;
            if (hex && hex.startsWith('#')) {
                if (hex.length === 4) {
                    r = parseInt(hex[1] + hex[1], 16) / 255;
                    g = parseInt(hex[2] + hex[2], 16) / 255;
                    b = parseInt(hex[3] + hex[3], 16) / 255;
                } else if (hex.length === 7) {
                    r = parseInt(hex.slice(1, 3), 16) / 255;
                    g = parseInt(hex.slice(3, 5), 16) / 255;
                    b = parseInt(hex.slice(5, 7), 16) / 255;
                }
            }
            return [r, g, b, a];
        }

        function toClipX(x, w) { return (x / w) * 2 - 1; }
        function toClipY(y, h) { return -((y / h) * 2 - 1); }