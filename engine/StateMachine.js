(function (Engine) {
    class StateMachine extends Engine.Node {
        constructor(name = 'StateMachine') {
            super(name);
            this.states = {};
            this.currentState = null;
            this.currentStateName = '';
        }

        addState(name, stateDefinition) {
            this.states[name] = stateDefinition;
        }

        transitionTo(name, data = {}) {
            if (!this.states[name]) return;

            if (this.currentState && this.currentState.exit) {
                this.currentState.exit();
            }

            this.currentStateName = name;
            this.currentState = this.states[name];

            if (this.currentState.enter) {
                this.currentState.enter(data);
            }
        }

        _process(delta) {
            if (this.currentState && this.currentState.update) {
                this.currentState.update(delta);
            }
        }
    }

    Engine.StateMachine = StateMachine;
})(window.LudusEngine = window.LudusEngine || {});