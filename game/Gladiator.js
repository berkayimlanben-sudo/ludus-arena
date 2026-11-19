(function (Game, Engine, Data) {
    class Gladiator extends Engine.Node2D {
        constructor(config) {
            super(config.name || 'Gladiator', config.x || 200, config.y || 355);

            this.gladiatorName = config.name;
            this.team = config.team || 'left';
            this.teamColor = config.teamColor || '#c83e37';
            this.skinColor = config.skinColor || '#e0ac82';
            this.facing = this.team === 'left' ? 1 : -1;

            // Temel Statlar
            this.stats = Object.assign({ strength: 12, agility: 12, vitality: 12 }, config.stats || {});

            // Ekipman
            this.weapon = config.weapon || Data.WEAPONS.sword;
            this.shield = config.shield || Data.SHIELDS.none;
            this.armor = config.armor || Data.ARMORS.tunic;
            this.helmet = config.helmet || Data.HELMETS.none;

            // Türetilmiş Savaş Değerleri
            this.totalWeight = (this.weapon.weight || 0) + (this.shield.weight || 0) +
                               (this.armor.weight || 0) + (this.helmet.weight || 0);

            this.maxHp = 80 + this.stats.vitality * 6 + (this.armor.hpBonus || 0);
            this.hp = (config.currentHp !== undefined)
                ? Math.min(this.maxHp, Math.max(1, config.currentHp))
                : this.maxHp;

            this.maxStamina = Math.round(70 + this.stats.vitality * 3 + this.stats.agility * 1.5);
            this.stamina = this.maxStamina;

            this.strength = this.stats.strength;
            this.agility = this.stats.agility;
            this.defense = Math.round(this.stats.vitality * 0.35) + (this.armor.defense || 0) + (this.helmet.defense || 0);
            this.moveSpeed = Math.max(60, 128 + this.agility * 4 - this.totalWeight * 2.4);

            this.opponent = null;
            this.particles = null;
            this.arenaBounds = { left: 80, right: 880, groundY: 355 };

            this.onDied = new Engine.Signal();
            this.onLog = new Engine.Signal();

            this.walkPhase = 0;
            this.attackCooldown = 0;
            this.stateTimer = 0;
            this.stateDuration = 0;
            this.hasHitThisSwing = false;
            this.hitFlash = 0;
            this.deathAngle = 0;

            this.fsm = new Engine.StateMachine('AI');
            this.addChild(this.fsm);
            this._setupStates();
        }

        _ready() {
            this.fsm.transitionTo('IDLE');
        }

        getWindupTime() {
            return this.weapon.windupTime * (1 + this.totalWeight * 0.012);
        }

        getStateLabel() {
            const map = {
                IDLE: 'HAZIR',
                APPROACH: 'YAKLAŞIYOR',
                WINDUP: 'HAMLE',
                ATTACK: 'SALDIRI',
                RECOVER: 'TOPARLANMA',
                BLOCK: 'KALKAN BLOKU',
                RETREAT: 'MESAFE / NEFES',
                HURT: 'SARSILDI',
                DEAD: 'YENİLDİ'
            };
            return map[this.fsm.currentStateName] || '';
        }

        _setupStates() {
            const g = this;

            this.fsm.addState('IDLE', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = 0.07 + Math.random() * 0.12;
                },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) return;
                    g._faceOpponent();

                    g.stateTimer -= dt;
                    if (g.stateTimer > 0) return;

                    const dist = Math.abs(g.opponent.x - g.x);
                    const oppState = g.opponent.fsm.currentStateName;

                    if (oppState === 'WINDUP' && dist <= g.opponent.weapon.range + 28) {
                        if (g.shield && g.shield.hasShield && g.stamina >= g.shield.staminaCost && Math.random() < g.shield.blockChance) {
                            g.fsm.transitionTo('BLOCK');
                            return;
                        }
                        if (Math.random() < 0.35 && g.stamina >= 15) {
                            g.fsm.transitionTo('RETREAT', { duration: 0.30 });
                            return;
                        }
                    }

                    if (g.stamina < g.weapon.staminaCost + 4) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.50 });
                        return;
                    }

                    if ((g.weapon.type === 'spear' || g.weapon.type === 'trident') && dist < 58 && Math.random() < 0.7) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.28 });
                        return;
                    }

                    if (dist <= g.weapon.range && g.attackCooldown <= 0) {
                        g.fsm.transitionTo('WINDUP');
                        return;
                    }

                    if (dist > g.weapon.range * 0.88) {
                        g.fsm.transitionTo('APPROACH');
                    } else {
                        g.stateTimer = 0.08;
                    }
                }
            });

            this.fsm.addState('APPROACH', {
                enter() {
                    g.stateTimer = 0.45 + Math.random() * 0.30;
                },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) {
                        g.fsm.transitionTo('IDLE');
                        return;
                    }

                    g._faceOpponent();
                    const dist = Math.abs(g.opponent.x - g.x);

                    if (g.opponent.fsm.currentStateName === 'WINDUP' && dist <= g.opponent.weapon.range + 22) {
                        if (g.shield && g.shield.hasShield && g.stamina >= g.shield.staminaCost && Math.random() < g.shield.blockChance * 0.85) {
                            g.fsm.transitionTo('BLOCK');
                            return;
                        }
                    }

                    if (dist <= g.weapon.range * 0.9 && g.attackCooldown <= 0) {
                        g.fsm.transitionTo('WINDUP');
                        return;
                    }

                    const isLong = g.weapon.type === 'spear' || g.weapon.type === 'trident';
                    const idealDist = isLong ? g.weapon.range * 0.82 : g.weapon.range * 0.75;
                    if (dist > idealDist) {
                        g.vx = g.facing * g.moveSpeed;
                    } else {
                        g.fsm.transitionTo('IDLE');
                        return;
                    }

                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('WINDUP', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = 0;
                    g.stateDuration = g.getWindupTime();
                    g._faceOpponent();
                },
                update(dt) {
                    g.stateTimer += dt;
                    if (g.stateTimer >= g.stateDuration) {
                        g.fsm.transitionTo('ATTACK');
                    }
                }
            });

            this.fsm.addState('ATTACK', {
                enter() {
                    g.stateTimer = 0;
                    g.stateDuration = g.weapon.attackTime;
                    g.hasHitThisSwing = false;
                    g.stamina = Math.max(0, g.stamina - g.weapon.staminaCost);
                    g.vx = g.facing * 125;
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 3);
                    if (Game.SoundFX) Game.SoundFX.playSwing(g.weapon.weight >= 6);
                },
                update(dt) {
                    g.stateTimer += dt;
                    g.vx *= 0.88;

                    if (!g.hasHitThisSwing && g.stateTimer >= g.stateDuration * 0.45) {
                        g.hasHitThisSwing = true;
                        g._performHitCheck();
                    }

                    if (g.stateTimer >= g.stateDuration) {
                        g.attackCooldown = 0.22 + Math.max(0, (22 - g.agility) * 0.014) + g.totalWeight * 0.008;
                        g.fsm.transitionTo('RECOVER');
                    }
                }
            });

            this.fsm.addState('RECOVER', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = g.weapon.recoveryTime;
                },
                update(dt) {
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('BLOCK', {
                enter() {
                    g.vx = -g.facing * 20;
                    g.stateTimer = 0.45 + Math.random() * 0.25;
                    g._faceOpponent();
                },
                update(dt) {
                    g.vx *= 0.9;
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('RETREAT', {
                enter(data) {
                    g.stateTimer = data.duration || 0.35;
                    g._faceOpponent();
                    g.vx = -g.facing * g.moveSpeed * 0.95;
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 4);
                },
                update(dt) {
                    g.stateTimer -= dt;
                    if (g.x <= g.arenaBounds.left + 15 || g.x >= g.arenaBounds.right - 15) {
                        g.vx = 0;
                    }
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('HURT', {
                enter() { g.stateTimer = 0.19; },
                update(dt) {
                    g.vx *= 0.85;
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('DEAD', {
                enter() {
                    g.vx = -g.facing * 90;
                    g.vy = -80;
                },
                update(dt) {
                    g.vx *= 0.92;
                    g.deathAngle = Math.min(Math.PI / 2, g.deathAngle + dt * 4.5);
                }
            });
        }

        _faceOpponent() {
            if (!this.opponent) return;
            this.facing = this.opponent.x >= this.x ? 1 : -1;
        }

        _performHitCheck() {
            if (!this.opponent || this.opponent.hp <= 0) return;

            const toOpp = this.opponent.x - this.x;
            const isInFront = (toOpp * this.facing) >= -15;
            const dist = Math.abs(toOpp);

            if (!isInFront || dist > this.weapon.range + 16) return;

            const target = this.opponent;
            const hitX = (this.x + target.x) / 2;
            const isBlocking = target.fsm.currentStateName === 'BLOCK' &&
                ((this.x - target.x) * target.facing >= -10);

            if (isBlocking && target.shield && target.shield.hasShield) {
                const blockedDmg = Math.max(1, Math.round((this.weapon.damage + this.strength * 0.4) * (1 - target.shield.blockMitigation)));
                target.hp = Math.max(0, target.hp - blockedDmg);
                target.stamina = Math.max(0, target.stamina - target.shield.staminaCost);
                target.vx = this.facing * 110;
                this.vx = -this.facing * 95;

                if (Game.SoundFX) Game.SoundFX.playBlock();
                if (this.particles) {
                    this.particles.spawnSparks(hitX, target.y, -this.facing, 14);
                    this.particles.spawnText(target.x, target.y, `BLOK! (-${blockedDmg})`, '#ffe066', 14);
                }
                if (this.tree) {
                    this.tree.hitstop(0.045);
                    if (this.tree.activeCamera) this.tree.activeCamera.shake(4.5);
                }
                this.onLog.emit(`${target.gladiatorName}, ${this.gladiatorName}'ın darbesini kalkanıyla savuşturdu!`);

                if (target.hp <= 0) target._die(this);
                return;
            }

            // Kritik & Zırh Delme Hesabı
            const rawCrit = 0.05 + this.agility * 0.007 + (this.weapon.critBonus || 0);
            const finalCritChance = rawCrit * (1 - (target.helmet ? target.helmet.critResist : 0));
            const isCrit = Math.random() < finalCritChance;

            const effectiveDef = target.defense * (1 - (this.weapon.armorPen || 0));
            let rawDamage = this.weapon.damage + this.strength * 0.65 - effectiveDef * 0.45;
            rawDamage = rawDamage * (0.9 + Math.random() * 0.2);
            if (isCrit) rawDamage *= 1.55;

            const finalDmg = Math.max(3, Math.round(rawDamage));
            target.hp = Math.max(0, target.hp - finalDmg);
            target.hitFlash = 0.14;
            target.vx = this.facing * (isCrit ? 190 : 120);

            if (Game.SoundFX) Game.SoundFX.playHit(isCrit);
            if (this.particles) {
                this.particles.spawnBlood(target.x, target.y, this.facing, isCrit ? 16 : 9);
                const label = isCrit ? `KRİTİK -${finalDmg}!` : `-${finalDmg}`;
                this.particles.spawnText(target.x, target.y, label, isCrit ? '#ff4d4d' : '#ffffff', isCrit ? 19 : 15);
            }

            if (this.tree) {
                this.tree.hitstop(isCrit ? 0.08 : 0.05);
                if (this.tree.activeCamera) this.tree.activeCamera.shake(isCrit ? 9 : 5.5);
            }

            this.onLog.emit(
                isCrit
                    ? `${this.gladiatorName} KRİTİK darbe indirdi: ${finalDmg} hasar!`
                    : `${this.gladiatorName}, ${target.gladiatorName}'a ${finalDmg} hasar vurdu.`
            );

            if (target.hp <= 0) {
                target._die(this);
            } else if (isCrit || Math.random() < 0.45) {
                target.fsm.transitionTo('HURT');
            }
        }

        _die(killer) {
            this.hp = 0;
            this.fsm.transitionTo('DEAD');
            if (this.particles) this.particles.spawnDust(this.x, this.y, 10);
            this.onLog.emit(`⚔️ ${killer.gladiatorName}, ${this.gladiatorName}'ı yere serdi!`);
            this.onDied.emit(this, killer);
        }

        _process(delta) {
            if (this.attackCooldown > 0) this.attackCooldown -= delta;
            if (this.hitFlash > 0) this.hitFlash -= delta;

            const state = this.fsm.currentStateName;
            if (state !== 'DEAD' && state !== 'ATTACK' && state !== 'WINDUP') {
                const regenRate = state === 'RETREAT' ? 26 : (state === 'BLOCK' ? 6 : 16);
                this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * delta);
            }

            this.x += this.vx * delta;
            if (this.y < this.arenaBounds.groundY || this.vy < 0) {
                this.vy += 520 * delta;
                this.y += this.vy * delta;
                if (this.y >= this.arenaBounds.groundY) {
                    this.y = this.arenaBounds.groundY;
                    this.vy = 0;
                }
            }

            this.x = Math.max(this.arenaBounds.left, Math.min(this.arenaBounds.right, this.x));

            if (this.opponent && this.hp > 0 && this.opponent.hp > 0) {
                const dx = this.x - this.opponent.x;
                const minGap = 40;
                if (Math.abs(dx) < minGap) {
                    const pushDir = dx >= 0 ? 1 : -1;
                    this.x += pushDir * (minGap - Math.abs(dx)) * 0.5;
                }
            }

            if (Math.abs(this.vx) > 15 && state !== 'DEAD') {
                this.walkPhase += delta * 12;
            } else {
                this.walkPhase = 0;
            }
        }

        _draw(ctx) {
            Game.GladiatorRenderer.draw(ctx, this);
        }
    }

    Game.Gladiator = Gladiator;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine, window.LudusData);