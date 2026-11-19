(function (Game, Engine, Data) {
    class LudusActor extends Engine.Node2D {
        constructor(gData, x, isSelected, particles, dummy) {
            super('LudusActor_' + gData.id, x, 215);
            this.gladId = gData.id;
            this.isSelected = isSelected;
            this.particles = particles;
            this.dummy = dummy;

            this.skinColor = gData.skinColor;
            this.teamColor = isSelected ? '#c83e37' : '#8c4a32';
            this.facing = 1;
            this.walkPhase = 0;
            this.hitFlash = 0;
            this.deathAngle = 0;

            this.fsm = { currentStateName: 'IDLE' };
            this.stateTimer = 0;
            this.stateDuration = 0;

            this.mode = 'WANDER';
            this.phase = 'IDLE';
            this.wanderTargetX = x;
            this.waitTimer = 0.4 + Math.random() * 1.4;
            this.agiBounces = 0;

            this.syncData(gData, isSelected);
        }

        syncData(gData, isSelected) {
            this.isSelected = isSelected;
            this.teamColor = isSelected ? '#c83e37' : '#7d4b32';
            this.weapon = Data.WEAPONS[gData.weaponId] || Data.WEAPONS.dagger;
            this.shield = Data.SHIELDS[gData.shieldId] || Data.SHIELDS.none;
            this.armor = Data.ARMORS[gData.armorId] || Data.ARMORS.tunic;
            this.helmet = Data.HELMETS[gData.helmetId] || Data.HELMETS.none;
            this.gladName = gData.name;
        }

        triggerAnim(type) {
            this.mode = type;
            this.stateTimer = 0;

            if (type === 'TRAIN_STR') {
                this.phase = 'RUN';
            } else if (type === 'TRAIN_AGI') {
                this.phase = 'DASH_R';
                this.agiBounces = 2;
                this.particles.spawnDust(this.x, this.y, 5);
                if (Game.SoundFX) Game.SoundFX.playSwing(false);
            } else if (type === 'TRAIN_VIT') {
                this.phase = 'FLEX';
                this.vy = -170;
                this.particles.spawnSparks(this.x, this.y, 1, 10);
                this.particles.spawnText(this.x, this.y, '+1 CANLILIK!', '#ff8787', 16);
                if (Game.SoundFX) Game.SoundFX.playSwing(true);
            } else if (type === 'HEAL') {
                this.mode = 'WANDER';
                this.particles.spawnSparks(this.x, this.y, 1, 12);
                this.particles.spawnText(this.x, this.y, '💚 İYİLEŞTİ!', '#69db7c', 16);
            }
        }

        _process(delta) {
            if (this.y < 215 || this.vy < 0) {
                this.vy += 580 * delta;
                this.y += this.vy * delta;
                if (this.y >= 215) {
                    this.y = 215;
                    this.vy = 0;
                    this.particles.spawnDust(this.x, this.y, 4);
                }
            }

            if (this.mode === 'TRAIN_STR') {
                this._processTrainStr(delta);
            } else if (this.mode === 'TRAIN_AGI') {
                this._processTrainAgi(delta);
            } else if (this.mode === 'TRAIN_VIT') {
                this.stateTimer += delta;
                if (this.stateTimer > 0.65) {
                    this.mode = 'WANDER';
                    this.fsm.currentStateName = 'IDLE';
                }
            } else {
                this._processWander(delta);
            }
        }

        _processTrainStr(delta) {
            const isLong = this.weapon.type === 'spear' || this.weapon.type === 'trident';
            const strikeX = this.dummy.x - (isLong ? 88 : 56);

            if (this.phase === 'RUN') {
                this.fsm.currentStateName = 'APPROACH';
                const dx = strikeX - this.x;
                if (Math.abs(dx) > 6) {
                    this.facing = dx > 0 ? 1 : -1;
                    this.x += this.facing * 210 * delta;
                    this.walkPhase += delta * 15;
                } else {
                    this.x = strikeX;
                    this.facing = 1;
                    this.phase = 'WINDUP';
                    this.stateTimer = 0;
                    this.stateDuration = 0.20;
                    this.fsm.currentStateName = 'WINDUP';
                }
            } else if (this.phase === 'WINDUP') {
                this.stateTimer += delta;
                if (this.stateTimer >= this.stateDuration) {
                    this.phase = 'ATTACK';
                    this.stateTimer = 0;
                    this.stateDuration = 0.16;
                    this.fsm.currentStateName = 'ATTACK';
                    this._didDummyHit = false;
                    if (Game.SoundFX) Game.SoundFX.playSwing(false);
                }
            } else if (this.phase === 'ATTACK') {
                this.stateTimer += delta;
                if (!this._didDummyHit && this.stateTimer >= 0.08) {
                    this._didDummyHit = true;
                    this.dummy.shake = 1.0;
                    this.particles.spawnSparks(this.dummy.x - 8, this.dummy.y, -1, 10);
                    this.particles.spawnDust(this.dummy.x, this.dummy.y, 4);
                    this.particles.spawnText(this.dummy.x, this.dummy.y - 12, '+1 GÜÇ!', '#ffd166', 16);
                    if (Game.SoundFX) Game.SoundFX.playHit(false);
                }
                if (this.stateTimer >= this.stateDuration) {
                    this.phase = 'DONE';
                    this.stateTimer = 0;
                    this.fsm.currentStateName = 'IDLE';
                }
            } else if (this.phase === 'DONE') {
                this.stateTimer += delta;
                if (this.stateTimer > 0.35) {
                    this.mode = 'WANDER';
                    this.waitTimer = 0.8;
                }
            }
        }

        _processTrainAgi(delta) {
            this.fsm.currentStateName = 'APPROACH';
            this.walkPhase += delta * 22;

            if (this.phase === 'DASH_R') {
                this.facing = 1;
                this.x = Math.min(620, this.x + 280 * delta);
                this.stateTimer += delta;
                if (this.stateTimer > 0.22) {
                    this.phase = 'DASH_L';
                    this.stateTimer = 0;
                    this.particles.spawnDust(this.x, this.y, 4);
                }
            } else if (this.phase === 'DASH_L') {
                this.facing = -1;
                this.x = Math.max(120, this.x - 280 * delta);
                this.stateTimer += delta;
                if (this.stateTimer > 0.22) {
                    this.agiBounces -= 1;
                    if (this.agiBounces > 0) {
                        this.phase = 'DASH_R';
                        this.stateTimer = 0;
                        this.particles.spawnDust(this.x, this.y, 4);
                    } else {
                        this.particles.spawnText(this.x, this.y, '+1 ÇEVİKLİK!', '#63e6be', 16);
                        this.mode = 'WANDER';
                        this.fsm.currentStateName = 'IDLE';
                        this.walkPhase = 0;
                    }
                }
            }
        }

        _processWander(delta) {
            this.fsm.currentStateName = 'IDLE';
            const dx = this.wanderTargetX - this.x;

            if (Math.abs(dx) > 6) {
                this.facing = dx > 0 ? 1 : -1;
                this.x += this.facing * 52 * delta;
                this.walkPhase += delta * 8;
            } else {
                this.walkPhase = 0;
                this.waitTimer -= delta;
                if (this.waitTimer <= 0) {
                    this.wanderTargetX = 110 + Math.random() * 510;
                    this.waitTimer = 1.2 + Math.random() * 2.5;
                }
            }
        }

        _draw(ctx) {
            ctx.save();
            if (this.isSelected) {
                ctx.strokeStyle = '#ffd166';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(this.x, this.y + 4, 24, 7, 0, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffd166';
                ctx.font = 'bold 11px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`▼ ${this.gladName}`, this.x, this.y - 95);
            } else {
                ctx.fillStyle = 'rgba(243, 234, 216, 0.7)';
                ctx.font = '10px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(this.gladName, this.x, this.y - 88);
            }
            ctx.restore();

            Game.GladiatorRenderer.draw(ctx, this);
        }
    }

    class LudusScene extends Engine.Node2D {
        constructor() {
            super('LudusScene');
            this.particles = new Game.ParticleSystem();
            this.dummy = { x: 755, y: 215, shake: 0, angle: 0 };
            this.buildings = { trainingYard: 1, infirmary: 1, blacksmith: 1 };
            this.actors = [];
            this.animTime = 0;
        }

        _ready() {
            this.addChild(this.particles);
        }

        syncFromState(state) {
            this.buildings = Object.assign({}, state.buildings);

            const validIds = new Set(state.roster.map(g => g.id));
            this.actors = this.actors.filter(a => {
                if (!validIds.has(a.gladId)) {
                    a.queueFree();
                    return false;
                }
                return true;
            });

            state.roster.forEach((g, idx) => {
                const isSel = g.id === state.selectedGladiatorId;
                let actor = this.actors.find(a => a.gladId === g.id);
                if (actor) {
                    actor.syncData(g, isSel);
                } else {
                    const startX = 160 + (idx * 95) % 450;
                    actor = new LudusActor(g, startX, isSel, this.particles, this.dummy);
                    this.actors.push(actor);
                    this.addChild(actor);
                }
            });
        }

        triggerAnim(gladiatorId, animType) {
            const actor = this.actors.find(a => a.gladId === gladiatorId);
            if (actor) actor.triggerAnim(animType);
        }

        findActorAt(canvasX) {
            let best = null;
            let bestDist = 40;
            for (const a of this.actors) {
                const d = Math.abs(a.x - canvasX);
                if (d < bestDist) {
                    bestDist = d;
                    best = a.gladId;
                }
            }
            return best;
        }

        _process(delta) {
            this.animTime += delta;
            if (this.dummy.shake > 0) {
                this.dummy.shake = Math.max(0, this.dummy.shake - delta * 4.2);
                this.dummy.angle = Math.sin(this.animTime * 42) * 0.25 * this.dummy.shake;
            } else {
                this.dummy.angle = 0;
            }
        }

        _draw(ctx) {
            Game.LudusRenderer.draw(ctx, this);
        }
    }

    Game.LudusScene = LudusScene;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine, window.LudusData);