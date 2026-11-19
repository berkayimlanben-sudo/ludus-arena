(function (Game, Engine, Data) {
    class ArenaScene extends Engine.Node2D {
        constructor(leftConfig, rightConfig) {
            super('ArenaScene');
            this.leftConfig = leftConfig;
            this.rightConfig = rightConfig;

            this.camera = new Engine.Camera2D('ArenaCam', 480, 240);
            this.particles = new Game.ParticleSystem();
            this.leftFighter = null;
            this.rightFighter = null;

            this.matchEnded = false;
            this.winner = null;
            this.matchTime = 0;

            this.onBattleLog = new Engine.Signal();
            this.onMatchFinished = new Engine.Signal();

            this.crowdExcitement = 0;
            this.crowdTime = 0;
        }

        _ready() {
            this.addChild(this.camera);
            this.tree.activeCamera = this.camera;

            const leftCfg = Object.assign({
                x: 260, y: 355, team: 'left', teamColor: '#c83e37',
                weapon: Data.WEAPONS.sword, shield: Data.SHIELDS.scutum,
                armor: Data.ARMORS.leather, helmet: Data.HELMETS.galea
            }, this.leftConfig);

            const rightCfg = Object.assign({
                x: 700, y: 355, team: 'right', teamColor: '#2c6eb5',
                weapon: Data.WEAPONS.spear, shield: Data.SHIELDS.none,
                armor: Data.ARMORS.tunic, helmet: Data.HELMETS.corinthian
            }, this.rightConfig);

            this.leftFighter = new Game.Gladiator(leftCfg);
            this.rightFighter = new Game.Gladiator(rightCfg);

            this.leftFighter.opponent = this.rightFighter;
            this.rightFighter.opponent = this.leftFighter;
            this.leftFighter.particles = this.particles;
            this.rightFighter.particles = this.particles;

            this.leftFighter.onLog.connect((msg) => {
                this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.35);
                this.onBattleLog.emit(msg);
            });
            this.rightFighter.onLog.connect((msg) => {
                this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.35);
                this.onBattleLog.emit(msg);
            });

            this.leftFighter.onDied.connect((_, killer) => this._endMatch(killer));
            this.rightFighter.onDied.connect((_, killer) => this._endMatch(killer));

            this.addChild(this.leftFighter);
            this.addChild(this.rightFighter);
            this.addChild(this.particles);

            this.onBattleLog.emit(`🔔 DÜELLO BAŞLADI: ${this.leftFighter.gladiatorName} vs ${this.rightFighter.gladiatorName}!`);
        }

        _endMatch(winner) {
            if (this.matchEnded) return;
            this.matchEnded = true;
            this.winner = winner;
            this.crowdExcitement = 1.0;
            if (Game.SoundFX) Game.SoundFX.playVictory();
            this.onMatchFinished.emit(winner);
        }

        _process(delta) {
            if (!this.matchEnded) this.matchTime += delta;
            this.crowdTime += delta * (3 + this.crowdExcitement * 10);
            this.crowdExcitement = Math.max(0, this.crowdExcitement - delta * 0.45);

            if (this.leftFighter && this.rightFighter) {
                const midX = (this.leftFighter.x + this.rightFighter.x) / 2;
                const dist = Math.abs(this.leftFighter.x - this.rightFighter.x);

                const targetZoom = dist < 170 ? 1.15 : (dist < 300 ? 1.07 : 1.0);
                this.camera.targetZoom = targetZoom;

                const minX = 480 / targetZoom;
                const maxX = 960 - minX;
                this.camera.targetX = Math.max(minX, Math.min(maxX, midX));
                this.camera.targetY = targetZoom > 1.05 ? 265 : 235;
            }
        }

        _draw(ctx) {
            Game.ArenaRenderer.draw(ctx, this);
        }
    }

    Game.ArenaScene = ArenaScene;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine, window.LudusData);