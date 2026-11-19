(function (Engine) {
    class Node {
        constructor(name = 'Node') {
            this.name = name;
            this.parent = null;
            this.children = [];
            this.tree = null;
            this.visible = true;
            this._isReady = false;
            this._queuedForDeletion = false;
        }

        addChild(child) {
            if (child.parent) {
                child.parent.removeChild(child);
            }
            child.parent = this;
            this.children.push(child);

            if (this.tree) {
                child._setTree(this.tree);
                child._propagateReady();
            }
            return child;
        }

        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx !== -1) {
                this.children.splice(idx, 1);
                child.parent = null;
                child._setTree(null);
            }
        }

        queueFree() {
            this._queuedForDeletion = true;
        }

        _setTree(tree) {
            this.tree = tree;
            for (const child of this.children) {
                child._setTree(tree);
            }
        }

        _propagateReady() {
            for (const child of this.children) {
                child._propagateReady();
            }
            if (!this._isReady) {
                this._isReady = true;
                this._ready();
            }
        }

        _propagateProcess(delta) {
            if (this._queuedForDeletion) return;

            this._process(delta);

            for (let i = 0; i < this.children.length; i++) {
                this.children[i]._propagateProcess(delta);
            }

            this.children = this.children.filter(c => !c._queuedForDeletion);
        }

        _propagateDraw(ctx) {
            if (!this.visible || this._queuedForDeletion) return;

            this._draw(ctx);

            for (let i = 0; i < this.children.length; i++) {
                this.children[i]._propagateDraw(ctx);
            }
        }

        // Alt sınıfların ezeceği Godot tarzı yaşam döngüsü metodları
        _ready() {}
        _process(delta) {}
        _draw(ctx) {}
    }

    Engine.Node = Node;
})(window.LudusEngine = window.LudusEngine || {});