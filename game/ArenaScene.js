(function (Game, Engine, Data) {
    class ArenaScene extends Engine.Node2D {
        constructor(leftConfig, rightConfig, options = {}) {
            super('ArenaScene');
            this.leftConfig = leftConfig;
            this.rightConfig = rightConfig;
            this.regionId = options.regionId || 'capua';
            this.isLethal = Boolean(options.isLethal);

            this.camera = new Engine.Camera2D('ArenaCam', 480, 240);
            this.particles = new Game.ParticleSystem();

            this.leftTeam = [];
            this.rightTeam = [];
            this.allFighters = [];
            this.leftFighter = null;
            this.rightFighter = null;

            this.matchEnded = false;
            this.winner = null;
            this.winningTeam = null;
            this.matchTime = 0;

            this.tacticCooldowns = { AGGRESSIVE: 0, DEFENSIVE: 0, MORALE: 0 };

            this.onBattleLog = new Engine.Signal();
            this.onMatchFinished = new Engine.Signal();

            const leftListInit = Array.isArray(leftConfig) ? leftConfig : [leftConfig];
            this.crowdFavor = Game.CrowdRules ? Game.CrowdRules.getInitialFavor(leftListInit) : 15;
            this.peakCrowdFavor = this.crowdFavor;
            this._announcedCrowdTiers = new Set();
            this.crowdExcitement = this.crowdFavor / 100;
            this.crowdTime = 0;
        }

        _boostCrowdFavor(delta) {
            if (!delta || delta <= 0) return;
            const prevTier = Game.CrowdRules ? Game.CrowdRules.getCrowdTier(this.crowdFavor) : null;
            this.crowdFavor = Game.CrowdRules
                ? Game.CrowdRules.clampFavor(this.crowdFavor + delta)
                : Math.min(100, Math.max(0, this.crowdFavor + delta));
            if (this.crowdFavor > this.peakCrowdFavor) {
                this.peakCrowdFavor = this.crowdFavor;
            }
            this.crowdExcitement = Math.max(this.crowdExcitement, this.crowdFavor / 100);

            if (Game.CrowdRules) {
                const nextTier = Game.CrowdRules.getCrowdTier(this.crowdFavor);
                if (prevTier && nextTier.id !== prevTier.id && !this._announcedCrowdTiers.has(nextTier.id)) {
                    if (nextTier.id === 'roaring') {
                        this._announcedCrowdTiers.add('roaring');
                        this.onBattleLog.emit('🔥 SEYİRCİ COŞTU! Tribünler tezahüratla inliyor (Bahşiş & Merhamet şansı arttı)!');
                    } else if (nextTier.id === 'frenzied') {
                        this._announcedCrowdTiers.add('frenzied');
                        this.onBattleLog.emit('👑 KİTLE ÇILDIRDI! Kalabalık altın yağdırmaya ve merhamet dilemeye hazır!');
                    }
                }
            }
        }

        getMatchCrowdFavor() {
            return Math.round(Math.max(this.crowdFavor, this.peakCrowdFavor * 0.85));
        }

        _ready() {
            this.addChild(this.camera);
            this.tree.activeCamera = this.camera;

            const leftList = Array.isArray(this.leftConfig) ? this.leftConfig : [this.leftConfig];
            const rightList = Array.isArray(this.rightConfig) ? this.rightConfig : [this.rightConfig];

            leftList.forEach((cfg, idx) => {
                const laneY = Game.CombatRules ? Game.CombatRules.getLaneY(idx, leftList.length) : 355;
                const full = Object.assign({
                    x: 270 - idx * 75, y: laneY, groundY: laneY, team: 'left',
                    teamColor: idx === 0 ? '#c83e37' : '#8f241f',
                    weapon: Data.WEAPONS.sword, shield: Data.SHIELDS.scutum,
                    armor: Data.ARMORS.leather, helmet: Data.HELMETS.galea
                }, cfg);
                const f = new Game.Gladiator(full);
                f.particles = this.particles;
                this.leftTeam.push(f);
                this.allFighters.push(f);
            });

            rightList.forEach((cfg, idx) => {
                const laneY = Game.CombatRules ? Game.CombatRules.getLaneY(idx, rightList.length) : 355;
                const full = Object.assign({
                    x: 690 + idx * 75, y: laneY, groundY: laneY, team: 'right',
                    teamColor: idx === 0 ? '#2c6eb5' : '#1b497a',
                    weapon: Data.WEAPONS.spear, shield: Data.SHIELDS.none,
                    armor: Data.ARMORS.tunic, helmet: Data.HELMETS.corinthian
                }, cfg);
                const f = new Game.Gladiator(full);
                f.particles = this.particles;
                this.rightTeam.push(f);
                this.allFighters.push(f);
            });

            this.leftFighter = this.leftTeam[0];
            this.rightFighter = this.rightTeam[0];

            this.leftTeam.forEach(f => {
                f.enemies = this.rightTeam;
                f.allies = this.leftTeam.filter(a => a !== f);
                f.allFighters = this.allFighters;
                f.onLog.connect((msg) => {
                    this.crowdExcitement = Math.min(1, Math.max(this.crowdExcitement + 0.12, this.crowdFavor / 100));
                    this.onBattleLog.emit(msg);
                });
                f.onCombatEvent.connect((evtType, actor, target) => {
                    if (Game.CrowdRules) {
                        this._boostCrowdFavor(Game.CrowdRules.getFavorDeltaForEvent(evtType, actor, target));
                    }
                });
                f.onDied.connect(() => this._checkMatchEnd());
                this.addChild(f);
            });

            this.rightTeam.forEach(f => {
                f.enemies = this.leftTeam;
                f.allies = this.rightTeam.filter(a => a !== f);
                f.allFighters = this.allFighters;
                f.onLog.connect((msg) => {
                    this.crowdExcitement = Math.min(1, Math.max(this.crowdExcitement + 0.12, this.crowdFavor / 100));
                    this.onBattleLog.emit(msg);
                });
                f.onCombatEvent.connect((evtType, actor, target) => {
                    if (Game.CrowdRules) {
                        this._boostCrowdFavor(Game.CrowdRules.getFavorDeltaForEvent(evtType, actor, target));
                    }
                });
                f.onDied.connect(() => this._checkMatchEnd());
                this.addChild(f);
            });

            this.addChild(this.particles);
            if (Game.CombatRules) {
                this.children = Game.CombatRules.sortArenaChildren(this.children, this.camera, this.particles);
            }

            const lNames = this.leftTeam.map(f => f.gladiatorName).join(' & ');
            const rNames = this.rightTeam.map(f => f.gladiatorName).join(' & ');
            this.onBattleLog.emit(`🔔 DÜELLO BAŞLADI: ${lNames} vs ${rNames}!`);
            this.leftTeam.forEach(f => {
                if (f.bribeThrow) {
                    this.onBattleLog.emit(`🎭 ŞİKE AKTİF: ${f.gladiatorName} bahisçiler için bu maçı vermeye hazırlanıyor...`);
                }
            });
            if (this.leftTeam.length >= 2 && this.leftTeam[0].allySynergy && this.leftTeam[0].allySynergy.tier && this.leftTeam[0].allySynergy.tier.id !== 'neutral') {
                const syn = this.leftTeam[0].allySynergy;
                this.onBattleLog.emit(`${syn.tier.badge} SİNERJİSİ (${this.leftTeam[0].gladiatorName} & ${this.leftTeam[1].gladiatorName}): ${syn.tier.desc}`);
            }
            this.rightTeam.forEach(f => {
                if (f.sabotaged) {
                    this.onBattleLog.emit(`🧪 SABOTAJ: ${f.gladiatorName} zehirli şaraptan ötürü bitkin (-%25 Can, -%20 Güç/Hız)!`);
                }
            });
        }

        _checkMatchEnd() {
            if (this.matchEnded) return;
            const leftAlive = this.leftTeam.filter(f => f.hp > 0);
            const rightAlive = this.rightTeam.filter(f => f.hp > 0);

            if (rightAlive.length === 0) {
                this._endMatch(leftAlive[0] || this.leftTeam[0], 'left');
            } else if (leftAlive.length === 0) {
                this._endMatch(rightAlive[0] || this.rightTeam[0], 'right');
            }
        }

        issueTactic(type) {
            if (this.matchEnded) return false;
            const aliveLeft = this.leftTeam.filter(f => f.hp > 0);
            if (aliveLeft.length === 0) return false;
            if (this.tacticCooldowns[type] > 0) return false;

            aliveLeft.forEach(f => f.applyTactic(type));
            if (Game.CrowdRules) {
                this._boostCrowdFavor(Game.CrowdRules.getFavorDeltaForEvent(`tactic_${type}`, aliveLeft[0], null));
            }
            if (type === 'MORALE') {
                this.crowdExcitement = 1.0;
                this.tacticCooldowns.MORALE = 13;
            } else {
                this.tacticCooldowns[type] = 9;
            }
            return true;
        }

        _endMatch(winner, teamSide) {
            if (this.matchEnded) return;
            this.matchEnded = true;
            this.winner = winner;
            this.winningTeam = teamSide;
            this.crowdExcitement = 1.0;
            if (Game.SoundFX) Game.SoundFX.playVictory();
            this.onMatchFinished.emit(winner, teamSide);
        }

        _process(delta) {
            if (!this.matchEnded) {
                this.matchTime += delta;
                if (this.crowdFavor > 10) {
                    this.crowdFavor = Math.max(10, this.crowdFavor - delta * 1.4);
                }
                Object.keys(this.tacticCooldowns).forEach(k => {
                    if (this.tacticCooldowns[k] > 0) {
                        this.tacticCooldowns[k] = Math.max(0, this.tacticCooldowns[k] - delta);
                    }
                });
            }

            this.crowdTime += delta * (3 + this.crowdExcitement * 10);
            this.crowdExcitement = Math.max(this.crowdFavor / 100, this.crowdExcitement - delta * 0.35);

            const active = this.allFighters.filter(f => f.hp > 0);
            const tracked = active.length >= 2 ? active : this.allFighters;
            if (tracked.length >= 2) {
                const xs = tracked.map(f => f.x);
                const minFighterX = Math.min(...xs);
                const maxFighterX = Math.max(...xs);
                const midX = (minFighterX + maxFighterX) / 2;
                const dist = maxFighterX - minFighterX;

                const targetZoom = dist < 170 ? 1.15 : (dist < 300 ? 1.07 : 1.0);
                this.camera.targetZoom = targetZoom;

                const minX = 480 / targetZoom;
                const maxX = 960 - minX;
                this.camera.targetX = Math.max(minX, Math.min(maxX, midX));
                this.camera.targetY = targetZoom > 1.05 ? 265 : 235;
            }

            if (Game.CombatRules) {
                this.children = Game.CombatRules.sortArenaChildren(this.children, this.camera, this.particles);
            }
        }

        _draw(ctx) {
            Game.ArenaRenderer.draw(ctx, this);
        }
    }

    Game.ArenaScene = ArenaScene;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine, window.LudusData);