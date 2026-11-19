(function (Engine) {
    class Signal {
        constructor() {
            this.listeners = [];
        }

        connect(callback, context = null) {
            this.listeners.push({ callback, context });
        }

        disconnect(callback) {
            this.listeners = this.listeners.filter(l => l.callback !== callback);
        }

        emit(...args) {
            for (const listener of this.listeners) {
                listener.callback.apply(listener.context, args);
            }
        }
    }

    Engine.Signal = Signal;
})(window.LudusEngine = window.LudusEngine || {});