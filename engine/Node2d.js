(function (Engine) {
    class Node2D extends Engine.Node {
        constructor(name = 'Node2D', x = 0, y = 0) {
            super(name);
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.rotation = 0;
            this.scaleX = 1;
            this.scaleY = 1;
            this.facing = 1; // 1: Sağa bakar, -1: Sola bakar
        }

        getGlobalPosition() {
            let gx = this.x;
            let gy = this.y;
            let current = this.parent;
            while (current && current instanceof Node2D) {
                gx += current.x;
                gy += current.y;
                current = current.parent;
            }
            return { x: gx, y: gy };
        }
    }

    Engine.Node2D = Node2D;
})(window.LudusEngine = window.LudusEngine || {});