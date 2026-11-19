(function (Engine) {
    class SceneTree {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.root = new Engine.Node('Root');
            this.root.tree = this;
            this.root._isReady = true;

            this.currentScene = null;
            this.activeCamera = null;

            this.timeScale = 1.0;
            this.paused = false;
            this.hitstopTimer = 0;
            this._lastTime = 0;
            this._running = false;

            this.onFrameUpdate = new Engine.Signal();
        }

        changeScene(sceneNode) {
            this.root.children = [];
            this.activeCamera = null;
            this.currentScene = sceneNode;
            this.root.addChild(sceneNode);
        }

        hitstop(duration) {
            this.hitstopTimer = Math.max(this.hitstopTimer, duration);
        }

        start() {
            if (this._running) return;
            this._running = true;
            this._lastTime = performance.now();
            requestAnimationFrame((t) => this._loop(t));
        }

        _loop(timestamp) {
            const rawDelta = Math.min((timestamp - this._lastTime) / 1000, 0.05);
            this._lastTime = timestamp;

            if (!this.paused) {
                if (this.activeCamera) {
                    this.activeCamera.updateCamera(rawDelta);
                }

                if (this.hitstopTimer > 0) {
                    this.hitstopTimer -= rawDelta;
                } else {
                    const scaledDelta = rawDelta * this.timeScale;
                    this.root._propagateProcess(scaledDelta);
                }
            }

            // Çizim
            const w = this.canvas.width;
            const h = this.canvas.height;
            this.ctx.clearRect(0, 0, w, h);

            if (this.activeCamera) {
                this.activeCamera.applyTransform(this.ctx, w, h);
            }

            this.root._propagateDraw(this.ctx);

            if (this.activeCamera) {
                this.activeCamera.restoreTransform(this.ctx);
            }

            this.onFrameUpdate.emit(rawDelta);

            if (this._running) {
                requestAnimationFrame((t) => this._loop(t));
            }
        }
    }

    Engine.SceneTree = SceneTree;
})(window.LudusEngine = window.LudusEngine || {});