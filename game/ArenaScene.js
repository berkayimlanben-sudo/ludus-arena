(function (Game, Engine) {
    const MATCHUPS = {
        sword_vs_spear: {
            left: {
                name: 'Maximus',
                team: 'left',
                teamColor: '#c83e37',
                helmet: 'galea',
                maxHp: 135,
                maxStamina: 100,
                strength: 13,
                agility: 12,
                defense: 10,
                weapon: { name: 'Gladius', type: 'sword', damage: 15, range: 64, windupTime: 0.22, attackTime: 0.16, recoveryTime: 0.22, staminaCost: 14 },
                shield: { name: 'Scutum Kalkan', blockChance: 0.65, blockMitigation: 0.8, staminaCost: 12, color: '#9e2a2b' }
            },
            right: {
                name: 'Crixus',
                team: 'right',
                teamColor: '#2c6eb5',
                helmet: 'corinthian',
                maxHp: 115,
                maxStamina: 110,
                strength: 11,
                agility: 16,
                defense: 6,
                weapon: { name: 'Uzun Mızrak', type: 'spear', damage: 16, range: 108, windupTime: 0.26, attackTime: 0.18, recoveryTime: 0.24, staminaCost: 16 },
                shield: null
            }
        },
        axe_vs_sword: {
            left: {
                name: 'Gannicus',
                team: 'left',
                teamColor: '#c83e37',
                helmet: 'galea',
                maxHp: 125,
                maxStamina: 105,
                strength: 11,
                agility: 17,
                defense: 8,
                weapon: { name: 'Hızlı Gladius', type: 'sword', damage: 14, range: 62, windupTime: 0.18, attackTime: 0.14, recoveryTime: 0.18, staminaCost: 12 },
                shield: { name: 'Hafif Kalkan', blockChance: 0.5, blockMitigation: 0.72, staminaCost: 10, color: '#8c2f39' }
            },
            right: {
                name: 'Theokoles',
                team: 'right',
                teamColor: '#2c6eb5',
                helmet: 'corinthian',
                maxHp: 160,
                maxStamina: 95,
                strength: 18,
                agility: 8,
                defense: 12,
                weapon: { name: 'Ağır Balta', type: 'axe', damage: 24, range: 74, windupTime: 0.42, attackTime: 0.22, recoveryTime: 0.34, staminaCost: 22 },
                shield: null
            }
        }
    };

    class ArenaScene extends Engine.Node2D {
        constructor(matchupKey = 'sword_vs_spear') {
            super('ArenaScene');
            this.matchupKey = matchupKey;
            this.camera = new Engine.Camera2D('ArenaCam', 480, 240);
            this.particles = new Game.ParticleSystem();
            this.leftFighter = null;
            this.rightFighter = null;

            this.matchEnded = false;
            this.winner = null;
            this.matchTime = 0;

            this.onBattleLog = new Engine.Signal();
            this.onMatchFinished = new Engine.Signal();

            // Arka plan kalabalık animasyonu
            this.crowdExcitement = 0;
            this.crowdTime = 0;
        }

        _ready() {
            this.addChild(this.camera);
            this.tree.activeCamera = this.camera;

            const preset = MATCHUPS[this.matchupKey] || MATCHUPS.sword_vs_spear;

            const leftCfg = Object.assign({ x: 260, y: 355 }, preset.left);
            const rightCfg = Object.assign({ x: 700, y: 355 }, preset.right);

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
            this.onMatchFinished.emit(winner);
        }

        _process(delta) {
            if (!this.matchEnded) {
                this.matchTime += delta;
            }
            this.crowdTime += delta * (3 + this.crowdExcitement * 10);
            this.crowdExcitement = Math.max(0, this.crowdExcitement - delta * 0.45);

            // Dinamik kamera: iki dövüşçünün ortasını takip et ve yaklaştıkça zoom yap
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
            // 1. Gökyüzü (Geniş çizim: kamera sarsıntısında boşluk görünmez)
            const skyGrad = ctx.createLinearGradient(0, -100, 0, 360);
            skyGrad.addColorStop(0, '#1e2438');
            skyGrad.addColorStop(0.55, '#6b3e45');
            skyGrad.addColorStop(1, '#d67e49');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(-160, -120, 1280, 500);

            // 2. Kolezyum Kemerleri (Arka duvar)
            ctx.fillStyle = '#3a2c29';
            ctx.fillRect(-160, 145, 1280, 175);

            ctx.fillStyle = '#251a18';
            for (let x = -100; x < 1080; x += 90) {
                ctx.beginPath();
                ctx.roundRect(x, 165, 58, 95, [28, 28, 0, 0]);
                ctx.fill();

                // Tribündeki seyirci siluetleri
                for (let s = 0; s < 3; s++) {
                    const bounce = Math.abs(Math.sin(this.crowdTime + x + s)) * (2 + this.crowdExcitement * 7);
                    ctx.fillStyle = '#140e0d';
                    ctx.beginPath();
                    ctx.arc(x + 14 + s * 15, 246 - bounce, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(x + 9 + s * 15, 250 - bounce, 10, 12);
                }
                ctx.fillStyle = '#251a18';
            }

            // Arena duvar sınırı
            ctx.fillStyle = '#5c4638';
            ctx.fillRect(-160, 295, 1280, 35);
            ctx.fillStyle = '#7c624e';
            ctx.fillRect(-160, 292, 1280, 6);

            // 3. Kum Zemin
            const sandGrad = ctx.createLinearGradient(0, 325, 0, 560);
            sandGrad.addColorStop(0, '#c2985d');
            sandGrad.addColorStop(0.3, '#b5884c');
            sandGrad.addColorStop(1, '#78562b');
            ctx.fillStyle = sandGrad;
            ctx.fillRect(-160, 325, 1280, 260);

            // Kum dokusu çizgileri
            ctx.fillStyle = 'rgba(92, 62, 28, 0.25)';
            for (let i = 0; i < 24; i++) {
                const sx = (i * 53) % 980 - 20;
                const sy = 342 + ((i * 31) % 65);
                ctx.fillRect(sx, sy, 18 + (i % 15), 2);
            }

            // Sol & Sağ Arena Sınır Kazıkları
            ctx.fillStyle = '#4a3222';
            ctx.fillRect(58, 275, 14, 85);
            ctx.fillRect(888, 275, 14, 85);
        }
    }

    Game.ArenaScene = ArenaScene;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine);