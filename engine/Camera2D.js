(function (Engine) {
    class Camera2D extends Engine.Node2D {
        constructor(name = 'Camera2D', x = 480, y = 230) {
            super(name, x, y);
            this.targetX = x;
            this.targetY = y;
            this.zoom = 1.0;
            this.targetZoom = 1.0;
            this.shakeAmount = 0;
            this.shakeDecay = 32;
            this.smoothSpeed = 5;
        }

        shake(intensity) {
            this.shakeAmount = Math.max(this.shakeAmount, intensity);
        }

        updateCamera(rawDelta) {
            const t = Math.min(1, this.smoothSpeed * rawDelta);
            this.x += (this.targetX - this.x) * t;
            this.y += (this.targetY - this.y) * t;
            this.zoom += (this.targetZoom - this.zoom) * t;

            if (this.shakeAmount > 0) {
                this.shakeAmount = Math.max(0, this.shakeAmount - this.shakeDecay * rawDelta);
            }
        }

        applyTransform(ctx, width, height) {
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(this.zoom, this.zoom);

            const sx = this.shakeAmount > 0 ? (Math.random() - 0.5) * 2 * this.shakeAmount : 0;
            const sy = this.shakeAmount > 0 ? (Math.random() - 0.5) * 2 * this.shakeAmount : 0;

            ctx.translate(-this.x + sx, -this.y + sy);
        }

        restoreTransform(ctx) {
            ctx.restore();
        }
    }

    Engine.Camera2D = Camera2D;
})(window.LudusEngine = window.LudusEngine || {});