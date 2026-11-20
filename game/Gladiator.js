(function (Game, Engine, Data) {
    class Gladiator extends Engine.Node2D {
        constructor(config) {
            super(config.name || 'Gladiator', config.x || 200, config.y || 355);

            this.gladiatorName = config.name;
            this.team = config.team || 'left';
            this.teamColor = config.teamColor || '#c83e37';
            this.skinColor = config.skinColor || '#e0ac82';
            this.isBoss = Boolean(config.isBoss);
            this.facing = this.team === 'left' ? 1 : -1;

            this.trait = config.trait || null;
            this.injury = config.injury || null;
            this.fatigue = config.fatigue || 0;
            this.fightStyle = config.fightStyle || 'balanced';
            this.perks = new Set(config.perks || []);
            this.sabotaged = Boolean(config.sabotaged);
            this.bribeThrow = Boolean(config.bribeThrow);
            this._bribeDiveTriggered = false;
            this.favoriteWeaponId = config.favoriteWeaponId || null;
            this.loyalty = config.loyalty !== undefined ? config.loyalty : 65;
            this.loyaltyTier = Game.BondingRules
                ? Game.BondingRules.getLoyaltyTier(this.loyalty)
                : { id: 'steady', dmgMult: 1.0, spdMult: 1.0 };
            this.loyalHeartUsed = false;
            this.loyalHeartDefBonus = 0;
            this.allySynergy = config.allySynergy || null;

            const baseStats = Object.assign({ strength: 12, agility: 12, vitality: 12 }, config.stats || {});

            const fatMult = this.fatigue >= 2 ? 0.60 : (this.fatigue === 1 ? 0.80 : 1.0);
            if (fatMult < 1.0) {
                baseStats.strength = Math.max(4, Math.round(baseStats.strength * fatMult));
                baseStats.agility = Math.max(4, Math.round(baseStats.agility * fatMult));
                baseStats.vitality = Math.max(4, Math.round(baseStats.vitality * fatMult));
            }

            if (this.sabotaged) {
                baseStats.strength = Math.max(4, Math.round(baseStats.strength * 0.80));
                baseStats.agility = Math.max(4, Math.round(baseStats.agility * 0.80));
            }

            if (this.injury && baseStats[this.injury.stat] !== undefined) {
                baseStats[this.injury.stat] = Math.max(4, baseStats[this.injury.stat] - this.injury.penalty);
            }
            this.stats = baseStats;

            this.weapon = config.weapon || Data.WEAPONS.sword;
            this.shield = config.shield || Data.SHIELDS.none;
            this.armor = config.armor || Data.ARMORS.tunic;
            this.helmet = config.helmet || Data.HELMETS.none;
            this.consumable = config.consumable || null;
            this.consumableUsed = false;
            this.consumableCharges = (this.consumable && this.consumable.charges) ? this.consumable.charges : 0;

            const tId = this.trait ? this.trait.id : '';
            this.traitCritBonus = (tId === 'fierce' ? 0.10 : 0) + (this.hasPerk('swift_foot') ? 0.08 : 0);
            this.traitDefMod = tId === 'iron_skin' ? 3 : (tId === 'fierce' ? -2 : 0);
            this.traitSpeedMod = (tId === 'nimble' ? 18 : 0) + (this.hasPerk('swift_foot') ? 16 : 0);
            this.traitStamRegenMod = tId === 'nimble' ? 4 : 0;
            this.traitBlockBonus = tId === 'disciplined' ? 0.12 : 0;
            this.staminaCostMult = tId === 'disciplined' ? 0.85 : 1.0;

            this.styleBlockMod = this.fightStyle === 'counter' ? 0.18 : (this.fightStyle === 'aggressive' ? -0.15 : (this.fightStyle === 'skirmisher' ? -0.05 : 0));
            this.styleRetreatChance = this.fightStyle === 'counter' ? 0.55 : (this.fightStyle === 'skirmisher' ? 0.60 : (this.fightStyle === 'aggressive' ? 0.12 : 0.35));
            this.styleCdMult = this.fightStyle === 'aggressive' ? 0.85 : (this.fightStyle === 'skirmisher' ? 0.95 : 1.0);
            this.styleSpeedBonus = this.fightStyle === 'skirmisher' ? 14 : (this.fightStyle === 'aggressive' ? 8 : 0);

            this.totalWeight = (this.weapon.weight || 0) + (this.shield.weight || 0) +
                               (this.armor.weight || 0) + (this.helmet.weight || 0);

            const perkHpBonus = this.hasPerk('iron_will') ? 20 : 0;
            this.maxHp = 80 + this.stats.vitality * 6 + (this.armor.hpBonus || 0) + perkHpBonus;
            const startHp = (config.currentHp !== undefined)
                ? Math.min(this.maxHp, Math.max(1, config.currentHp))
                : this.maxHp;
            this.hp = this.sabotaged ? Math.max(1, Math.round(startHp * 0.75)) : startHp;

            this.maxStamina = Math.round(70 + this.stats.vitality * 3 + this.stats.agility * 1.5);
            this.stamina = this.maxStamina;

            this.strength = this.stats.strength;
            this.agility = this.stats.agility;
            const synDefDelta = this.allySynergy ? (this.allySynergy.defDelta || 0) : 0;
            this.defense = Math.max(0, Math.round(this.stats.vitality * 0.35) + (this.armor.defense || 0) + (this.helmet.defense || 0) + this.traitDefMod + synDefDelta);
            const loyaltySpdMult = this.loyaltyTier ? (this.loyaltyTier.spdMult || 1.0) : 1.0;
            this.moveSpeed = Math.max(60, Math.round((128 + this.agility * 4 - this.totalWeight * 2.4 + this.traitSpeedMod + this.styleSpeedBonus) * loyaltySpdMult));

            this.enemies = [];
            this.allies = [];
            this.allFighters = [];
            this.opponent = null;
            this.particles = null;
            this.arenaBounds = { left: 80, right: 880, groundY: config.groundY || config.y || 355 };

            this.tacticOrder = null;
            this.tacticTimer = 0;
            this.counterReady = false;
            this.guaranteedCrit = false;
            this.secondWindUsed = false;

            this.activeEffects = {
                bleed: 0,
                bleedTick: 0,
                poison: 0,
                poisonTick: 0,
                poisonDmg: 4,
                stun: 0,
                slow: 0,
                armorBreak: 0
            };
            this.lastPoisonAttacker = null;

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

        hasPerk(id) {
            return this.perks.has(id);
        }

        _ready() {
            this.updateTarget();
            this.fsm.transitionTo('IDLE');
        }

        updateTarget() {
            if (this.enemies && this.enemies.length > 0) {
                if (Game.CombatRules) {
                    this.opponent = Game.CombatRules.selectBestTarget(this, this.enemies, this.allies);
                    return;
                }
                const living = this.enemies.filter(e => e && e.hp > 0);
                if (living.length === 0) {
                    this.opponent = null;
                    return;
                }
                let nearest = living[0];
                let minDist = Math.abs(nearest.x - this.x);
                for (let i = 1; i < living.length; i++) {
                    const d = Math.abs(living[i].x - this.x);
                    if (d < minDist) {
                        minDist = d;
                        nearest = living[i];
                    }
                }
                this.opponent = nearest;
            }
        }

        getEffectiveDefense() {
            let d = this.defense + (this.loyalHeartDefBonus || 0) - (this.activeEffects.armorBreak > 0 ? 5 : 0);
            if (this.hasPerk('back_to_back') && this.allies.some(a => a && a.hp > 0 && Math.abs(a.x - this.x) <= 165)) {
                d += 5;
            }
            return Math.max(0, d);
        }

        applyTactic(type) {
            if (this.hp <= 0) return;

            if (type === 'AGGRESSIVE') {
                this.tacticOrder = 'AGGRESSIVE';
                this.tacticTimer = 4.5;
                if (this.particles) {
                    this.particles.spawnSparks(this.x, this.y, 1, 10);
                    this.particles.spawnText(this.x, this.y, '🔥 BASTIR!', '#ff6b6b', 16);
                }
                this.onLog.emit(`📣 Lanista emri: ${this.gladiatorName} saldırıya geçti!`);
            } else if (type === 'DEFENSIVE') {
                this.tacticOrder = 'DEFENSIVE';
                this.tacticTimer = 4.5;
                if (this.particles) {
                    this.particles.spawnSparks(this.x, this.y, -1, 10);
                    this.particles.spawnText(this.x, this.y, '🛡️ SAVUNMA!', '#74c0fc', 16);
                }
                this.onLog.emit(`📣 Lanista emri: ${this.gladiatorName} savunmaya geçti!`);
            } else if (type === 'MORALE') {
                const healHp = Math.round(this.maxHp * 0.10);
                const regenStam = Math.round(this.maxStamina * 0.30);
                this.hp = Math.min(this.maxHp, this.hp + healHp);
                this.stamina = Math.min(this.maxStamina, this.stamina + regenStam);
                if (this.particles) {
                    this.particles.spawnSparks(this.x, this.y, 1, 14);
                    this.particles.spawnText(this.x, this.y, `🍷 +${healHp} CAN!`, '#ffd166', 16);
                }
                this.onLog.emit(`🍷 Seyirci desteği! ${this.gladiatorName} moral topladı (+${healHp} Can).`);
            }
        }

        getEffectiveMoveSpeed() {
            const slowMult = this.activeEffects.slow > 0 ? 0.65 : 1.0;
            return this.moveSpeed * slowMult;
        }

        getWindupTime() {
            const aggMult = this.tacticOrder === 'AGGRESSIVE' ? 0.78 : 1.0;
            const slowMult = this.activeEffects.slow > 0 ? 1.35 : 1.0;
            return this.weapon.windupTime * (1 + this.totalWeight * 0.012) * aggMult * slowMult;
        }

        getStateLabel() {
            let prefix = this.tacticOrder === 'AGGRESSIVE' ? '🔥 ' : (this.tacticOrder === 'DEFENSIVE' ? '🛡️ ' : '');
            if (this.sabotaged) prefix += '🧪 ';
            if (this.bribeThrow) prefix += '🎭 ';
            if (this.activeEffects.poison > 0) prefix += '🐍 ';
            if (this.activeEffects.bleed > 0) prefix += '🩸 ';
            if (this.activeEffects.slow > 0) prefix += '🕸️ ';
            if (this.activeEffects.armorBreak > 0) prefix += '💔 ';

            const map = {
                IDLE: 'HAZIR',
                APPROACH: 'YAKLAŞIYOR',
                WINDUP: 'HAMLE',
                ATTACK: 'SALDIRI',
                RECOVER: 'TOPARLANMA',
                BLOCK: 'KALKAN BLOKU',
                RETREAT: 'MESAFE / NEFES',
                HURT: 'SARSILDI',
                STUNNED: '💫 SERSEMLEDİ',
                DEAD: 'YENİLDİ'
            };
            return prefix + (map[this.fsm.currentStateName] || '');
        }

        _setupStates() {
            const g = this;

            this.fsm.addState('IDLE', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = (g.tacticOrder === 'AGGRESSIVE' || g.fightStyle === 'aggressive')
                        ? 0.04
                        : (0.07 + Math.random() * 0.12);
                },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) return;
                    g._faceOpponent();

                    g.stateTimer -= dt;
                    if (g.stateTimer > 0) return;

                    const dist = Math.abs(g.opponent.x - g.x);
                    const oppState = g.opponent.fsm.currentStateName;
                    const blockBonus = g.traitBlockBonus + g.styleBlockMod + (g.tacticOrder === 'DEFENSIVE' ? 0.28 : 0);

                    if (oppState === 'WINDUP' && dist <= g.opponent.weapon.range + 28) {
                        if (g.shield && g.shield.hasShield && g.stamina >= g.shield.staminaCost && Math.random() < (g.shield.blockChance + blockBonus)) {
                            g.fsm.transitionTo('BLOCK');
                            return;
                        }
                        const retChance = g.tacticOrder === 'DEFENSIVE' ? 0.65 : g.styleRetreatChance;
                        if (g.tacticOrder !== 'AGGRESSIVE' && Math.random() < retChance && g.stamina >= 14) {
                            g.fsm.transitionTo('RETREAT', { duration: 0.30 });
                            return;
                        }
                    }

                    if (g.tacticOrder !== 'AGGRESSIVE' && g.stamina < (g.weapon.staminaCost * g.staminaCostMult) + 4) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.48 });
                        return;
                    }

                    if ((g.weapon.type === 'spear' || g.weapon.type === 'trident' || g.fightStyle === 'skirmisher') && dist < 56 && Math.random() < 0.65) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.26 });
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
                enter() { g.stateTimer = 0.45 + Math.random() * 0.30; },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) {
                        g.fsm.transitionTo('IDLE');
                        return;
                    }

                    g._faceOpponent();
                    const dist = Math.abs(g.opponent.x - g.x);
                    const blockBonus = g.traitBlockBonus + g.styleBlockMod + (g.tacticOrder === 'DEFENSIVE' ? 0.25 : 0);

                    if (g.opponent.fsm.currentStateName === 'WINDUP' && dist <= g.opponent.weapon.range + 22) {
                        if (g.shield && g.shield.hasShield && g.stamina >= g.shield.staminaCost && Math.random() < (g.shield.blockChance * 0.85 + blockBonus)) {
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
                        const spdMult = g.tacticOrder === 'AGGRESSIVE' ? 1.18 : 1.0;
                        g.vx = g.facing * g.getEffectiveMoveSpeed() * spdMult;
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
                    if (g.stateTimer >= g.stateDuration) g.fsm.transitionTo('ATTACK');
                }
            });

            this.fsm.addState('ATTACK', {
                enter() {
                    g.stateTimer = 0;
                    g.stateDuration = g.weapon.attackTime;
                    g.hasHitThisSwing = false;
                    g.stamina = Math.max(0, g.stamina - g.weapon.staminaCost * g.staminaCostMult);
                    g.vx = g.facing * 125;
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 3);
                    if (Game.SoundFX) Game.SoundFX.playSwing(g.weapon.weight >= 6);
                },
                update(dt) {
                    g.stateTimer += dt;
                    g.vx *= Math.pow(0.88, dt * 60);

                    if (!g.hasHitThisSwing && g.stateTimer >= g.stateDuration * 0.45) {
                        g.hasHitThisSwing = true;
                        g._performHitCheck();
                    }

                    if (g.stateTimer >= g.stateDuration) {
                        const baseCd = (0.22 + Math.max(0, (22 - g.agility) * 0.014) + g.totalWeight * 0.008) * g.styleCdMult;
                        g.attackCooldown = g.tacticOrder === 'AGGRESSIVE' ? baseCd * 0.5 : baseCd;
                        g.fsm.transitionTo('RECOVER');
                    }
                }
            });

            this.fsm.addState('RECOVER', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = g.tacticOrder === 'AGGRESSIVE' ? g.weapon.recoveryTime * 0.7 : g.weapon.recoveryTime;
                },
                update(dt) {
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) {
                        if (g.fightStyle === 'skirmisher' && Math.random() < 0.55 && g.stamina >= 15) {
                            g.fsm.transitionTo('RETREAT', { duration: 0.25 });
                        } else {
                            g.fsm.transitionTo('IDLE');
                        }
                    }
                }
            });

            this.fsm.addState('BLOCK', {
                enter() {
                    g.vx = -g.facing * 20;
                    g.stateTimer = (g.tacticOrder === 'DEFENSIVE' || g.fightStyle === 'counter') ? 0.68 : (0.45 + Math.random() * 0.25);
                    g._faceOpponent();
                },
                update(dt) {
                    g.vx *= Math.pow(0.90, dt * 60);
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('RETREAT', {
                enter(data) {
                    g.stateTimer = data.duration || 0.35;
                    g._faceOpponent();
                    g.vx = -g.facing * g.getEffectiveMoveSpeed() * 0.95;
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 4);
                },
                update(dt) {
                    g.stateTimer -= dt;
                    if (g.x <= g.arenaBounds.left + 15 || g.x >= g.arenaBounds.right - 15) g.vx = 0;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('HURT', {
                enter() { g.stateTimer = 0.19; },
                update(dt) {
                    g.vx *= Math.pow(0.85, dt * 60);
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('STUNNED', {
                enter() { g.vx = 0; },
                update(dt) {
                    g.vx *= Math.pow(0.85, dt * 60);
                    if (g.activeEffects.stun <= 0) g.fsm.transitionTo('IDLE');
                }
            });

            this.fsm.addState('DEAD', {
                enter() {
                    g.vx = -g.facing * 90;
                    g.vy = -80;
                },
                update(dt) {
                    g.vx *= Math.pow(0.92, dt * 60);
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
                target.stamina = Math.max(0, target.stamina - target.shield.staminaCost * target.staminaCostMult);
                target.vx = this.facing * 110;
                this.vx = -this.facing * 95;

                if (target.fightStyle === 'counter') target.counterReady = true;
                if (target.hasPerk('shield_master')) target.guaranteedCrit = true;

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

                if (target.hp > 0 && target.shield.effect && target.shield.effect.type === 'thorns') {
                    const thornsDmg = target.shield.effect.dmg;
                    this.hp = Math.max(0, this.hp - thornsDmg);
                    if (this.particles) this.particles.spawnText(this.x, this.y, `-${thornsDmg} DİKEN`, '#ffa94d', 12);
                    if (this.hp <= 0) {
                        this._die(target);
                        return;
                    }
                }

                if (target.hp <= 0) target._die(this);
                return;
            }

            const isFavWeapon = Boolean(this.favoriteWeaponId && this.weapon && this.weapon.id === this.favoriteWeaponId);
            const favCritBonus = isFavWeapon ? 0.05 : 0;
            const favDmgMult = isFavWeapon ? 1.06 : 1.0;
            const synCritBonus = this.allySynergy ? (this.allySynergy.critBonus || 0) : 0;
            const synDmgMult = this.allySynergy ? (this.allySynergy.dmgMult || 1.0) : 1.0;

            const rawCrit = 0.05 + this.agility * 0.007 + (this.weapon.critBonus || 0) + this.traitCritBonus + favCritBonus + synCritBonus;
            const finalCritChance = rawCrit * (1 - (target.helmet ? target.helmet.critResist : 0));
            const isCrit = this.guaranteedCrit || (Math.random() < finalCritChance);
            this.guaranteedCrit = false;

            const armorPenTotal = Math.min(0.95, (this.weapon.armorPen || 0) + (this.hasPerk('heavy_hand') ? 0.15 : 0));
            const effectiveDef = target.getEffectiveDefense() * (1 - armorPenTotal);
            const perkDmgBonus = this.hasPerk('heavy_hand') ? 3 : 0;

            let rawDamage = (this.weapon.damage + perkDmgBonus) + this.strength * 0.65 - effectiveDef * 0.45;
            rawDamage = rawDamage * (0.9 + Math.random() * 0.2) * favDmgMult * synDmgMult;
            if (this.loyaltyTier && this.loyaltyTier.dmgMult !== 1.0) {
                rawDamage *= this.loyaltyTier.dmgMult;
            }

            if (this.trait && this.trait.id === 'berserker' && this.hp <= this.maxHp * 0.35) rawDamage *= 1.30;
            if (this.hasPerk('blood_scent') && target.activeEffects.bleed > 0) rawDamage *= 1.25;
            if (this.hasPerk('executioner') && target.hp <= target.maxHp * 0.45) rawDamage *= 1.25;

            if (this.counterReady) {
                rawDamage *= 1.25;
                this.counterReady = false;
                if (this.particles) this.particles.spawnText(this.x, this.y - 18, '⚡ KONTRA!', '#74c0fc', 13);
            }
            if (this.tacticOrder === 'AGGRESSIVE') rawDamage *= 1.15;
            if (target.tacticOrder === 'DEFENSIVE') rawDamage *= 0.80;

            let effectApplied = null;
            const weff = this.weapon.effect;
            if (weff && Math.random() < weff.chance) {
                effectApplied = weff.type;
                if (weff.type === 'pierce') rawDamage += weff.bonusDmg;
            }

            let poisonTriggered = false;
            if (this.consumable && this.consumable.id === 'poison' && this.consumableCharges > 0) {
                this.consumableCharges -= 1;
                rawDamage += (this.consumable.bonusDmg || 4);
                poisonTriggered = true;
            }

            if (isCrit) rawDamage *= 1.55;
            if (this.bribeThrow) rawDamage *= 0.55;

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

            let stunnedNow = false;
            if (target.hp > 0 && effectApplied) {
                if (effectApplied === 'bleed') {
                    target.activeEffects.bleed = weff.duration;
                    if (this.particles) this.particles.spawnText(target.x, target.y - 16, '🩸 KANAMA!', '#e03131', 13);
                    this.onLog.emit(`🩸 ${target.gladiatorName} kanamaya başladı!`);
                } else if (effectApplied === 'slow') {
                    target.activeEffects.slow = weff.duration;
                    if (this.particles) this.particles.spawnText(target.x, target.y - 16, '🕸️ YAVAŞLADI!', '#74c0fc', 13);
                    this.onLog.emit(`🕸️ ${target.gladiatorName} yavaşlatıldı!`);
                } else if (effectApplied === 'armorBreak') {
                    target.activeEffects.armorBreak = weff.duration;
                    if (this.particles) this.particles.spawnText(target.x, target.y - 16, '💥 ZIRH KIRILDI!', '#ffa94d', 13);
                    this.onLog.emit(`💥 ${target.gladiatorName}'ın zırhı yarıldı!`);
                } else if (effectApplied === 'stun') {
                    const stunDur = weff.duration * (target.hasPerk('iron_will') ? 0.5 : 1.0);
                    target.activeEffects.stun = stunDur;
                    stunnedNow = true;
                    target.fsm.transitionTo('STUNNED');
                    if (this.particles) this.particles.spawnText(target.x, target.y - 16, '💫 SERSEMLEDİ!', '#ffd43b', 14);
                    this.onLog.emit(`💫 ${target.gladiatorName} sersemledi!`);
                } else if (effectApplied === 'lifestam') {
                    this.stamina = Math.min(this.maxStamina, this.stamina + weff.amount);
                } else if (effectApplied === 'pierce') {
                    if (this.particles) this.particles.spawnText(target.x, target.y - 16, '📌 DELİCİ!', '#ffe066', 13);
                }
            }

            if (target.hp > 0 && poisonTriggered) {
                const poisonDur = (this.consumable && (this.consumable.poisonDuration || this.consumable.bleedDuration)) || 4.0;
                const poisonTickDmg = (this.consumable && this.consumable.poisonTickDmg) || 4;
                target.activeEffects.poison = Math.max(target.activeEffects.poison, poisonDur);
                target.activeEffects.poisonDmg = poisonTickDmg;
                target.lastPoisonAttacker = this;
                if (this.particles) {
                    this.particles.spawnPoison(target.x, target.y, 6);
                    this.particles.spawnText(target.x, target.y - 24, '🐍 ZEHİR!', '#51cf66', 14);
                }
                this.onLog.emit(`🐍 ${this.gladiatorName}'ın zehirli darbesi ${target.gladiatorName}'ı zehirledi!`);
            }

            const targetState = target.fsm.currentStateName;
            const hasHyperArmor = (target.weapon && target.weapon.weight >= 6) &&
                ((targetState === 'WINDUP' && target.stateTimer >= target.stateDuration * 0.45) || targetState === 'ATTACK');

            if (target.hp <= 0) {
                target._die(this);
            } else if (!stunnedNow && !hasHyperArmor && (isCrit || Math.random() < 0.45)) {
                target.fsm.transitionTo('HURT');
            }
        }

        _die(killer) {
            this.hp = 0;
            this.tacticOrder = null;
            this.activeEffects = { bleed: 0, bleedTick: 0, poison: 0, poisonTick: 0, poisonDmg: 4, stun: 0, slow: 0, armorBreak: 0 };
            this.lastPoisonAttacker = null;
            this.fsm.transitionTo('DEAD');
            if (this.particles) this.particles.spawnDust(this.x, this.y, 10);
            this.onLog.emit(`⚔️ ${killer.gladiatorName}, ${this.gladiatorName}'ı yere serdi!`);
            this.onDied.emit(this, killer);
        }

        _process(delta) {
            const curState = this.fsm.currentStateName;
            if (!this.opponent || this.opponent.hp <= 0 ||
                curState === 'IDLE' || curState === 'APPROACH' || curState === 'RETREAT') {
                this.updateTarget();
            }

            if (this.attackCooldown > 0) this.attackCooldown -= delta;
            if (this.hitFlash > 0) this.hitFlash -= delta;

            if (this.tacticTimer > 0) {
                this.tacticTimer -= delta;
                if (this.tacticTimer <= 0) this.tacticOrder = null;
            }

            const state = this.fsm.currentStateName;

            if (state !== 'DEAD') {
                // Şike anlaşması: can %38 altına indiğinde kasıtlı olarak yere düş
                if (this.bribeThrow && !this._bribeDiveTriggered && this.hp > 0 && this.hp <= this.maxHp * 0.38) {
                    this._bribeDiveTriggered = true;
                    if (this.particles) {
                        this.particles.spawnText(this.x, this.y - 18, '🎭 BİLEREK DÜŞTÜ!', '#ffd166', 15);
                    }
                    this.onLog.emit(`🎭 ${this.gladiatorName} şike anlaşması gereği darbenin ardından bilerek yere yığıldı!`);
                    this._die(this.opponent || this);
                    return;
                }

                // İkinci Rüzgar Perki
                if (this.hasPerk('second_wind') && !this.secondWindUsed && this.hp > 0 && this.hp <= this.maxHp * 0.40) {
                    this.secondWindUsed = true;
                    this.hp = Math.min(this.maxHp, this.hp + 15);
                    this.stamina = Math.min(this.maxStamina, this.stamina + 40);
                    if (this.particles) {
                        this.particles.spawnSparks(this.x, this.y, 1, 14);
                        this.particles.spawnText(this.x, this.y - 10, '⚡ İKİNCİ RÜZGAR!', '#63e6be', 15);
                    }
                    this.onLog.emit(`⚡ ${this.gladiatorName} İkinci Rüzgarını yakaladı (+15 Can, +40 Stamina)!`);
                }

                // Sadık Yürek (Sadakat >= 75): Can %25 altına inince maçta 1 kez +10 Stamina ve +5 Zırh
                if ((this.loyalty || 0) >= 75 && !this.loyalHeartUsed && this.hp > 0 && this.hp <= this.maxHp * 0.25) {
                    this.loyalHeartUsed = true;
                    this.loyalHeartDefBonus = 5;
                    this.stamina = Math.min(this.maxStamina, this.stamina + 10);
                    if (this.particles) {
                        this.particles.spawnSparks(this.x, this.y, 1, 14);
                        this.particles.spawnText(this.x, this.y - 18, '❤️ SADIK YÜREK!', '#ff8787', 15);
                    }
                    this.onLog.emit(`❤️ SADIK YÜREK! ${this.gladiatorName} sadakatiyle direndi (+10 Stamina, +5 Zırh)!`);
                }

                // Can Şurubu Tüketilebilir Eşyası
                if (this.consumable && this.consumable.id === 'potion' && !this.consumableUsed && this.hp > 0 && this.hp <= this.maxHp * (this.consumable.hpThreshold || 0.45)) {
                    this.consumableUsed = true;
                    const heal = this.consumable.healAmount || 35;
                    const stam = this.consumable.staminaAmount || 25;
                    this.hp = Math.min(this.maxHp, this.hp + heal);
                    this.stamina = Math.min(this.maxStamina, this.stamina + stam);
                    if (this.particles) {
                        this.particles.spawnSparks(this.x, this.y, 1, 14);
                        this.particles.spawnText(this.x, this.y - 14, `🧪 +${heal} CAN!`, '#69db7c', 16);
                    }
                    this.onLog.emit(`🧪 ${this.gladiatorName} Can Şurubu içti (+${heal} Can, +${stam} Stamina)!`);
                }

                // Gladyatör Ağı Tüketilebilir Eşyası
                if (this.consumable && this.consumable.id === 'net' && !this.consumableUsed && this.opponent && this.opponent.hp > 0) {
                    const netRange = this.consumable.range || 240;
                    if (Math.abs(this.opponent.x - this.x) <= netRange) {
                        this.consumableUsed = true;
                        const slowDur = this.consumable.slowDuration || 4.5;
                        this.opponent.activeEffects.slow = Math.max(this.opponent.activeEffects.slow, slowDur);
                        this.opponent.vx *= 0.2;
                        if (this.particles) {
                            this.particles.spawnSparks(this.opponent.x, this.opponent.y, -this.facing, 10);
                            this.particles.spawnText(this.opponent.x, this.opponent.y - 16, '🕸️ AĞ ATILDI!', '#74c0fc', 15);
                        }
                        this.onLog.emit(`🕸️ ${this.gladiatorName}, ${this.opponent.gladiatorName}'a gladyatör ağı fırlattı!`);
                    }
                }

                if (this.activeEffects.stun > 0) this.activeEffects.stun = Math.max(0, this.activeEffects.stun - delta);
                if (this.activeEffects.slow > 0) this.activeEffects.slow = Math.max(0, this.activeEffects.slow - delta);
                if (this.activeEffects.armorBreak > 0) this.activeEffects.armorBreak = Math.max(0, this.activeEffects.armorBreak - delta);

                if (this.activeEffects.bleed > 0) {
                    this.activeEffects.bleed = Math.max(0, this.activeEffects.bleed - delta);
                    this.activeEffects.bleedTick += delta;
                    if (this.activeEffects.bleedTick >= 1.0) {
                        this.activeEffects.bleedTick -= 1.0;
                        this.hp = Math.max(0, this.hp - 3);
                        if (this.particles) {
                            this.particles.spawnBlood(this.x, this.y, -this.facing, 4);
                            this.particles.spawnText(this.x, this.y, '-3 KANAMA', '#e03131', 12);
                        }
                        if (this.hp <= 0) {
                            this._die(this.opponent || this);
                            return;
                        }
                    }
                }

                if (this.activeEffects.poison > 0) {
                    this.activeEffects.poison = Math.max(0, this.activeEffects.poison - delta);
                    this.activeEffects.poisonTick += delta;
                    if (this.activeEffects.poisonTick >= 1.0) {
                        this.activeEffects.poisonTick -= 1.0;
                        const pDmg = this.activeEffects.poisonDmg || 4;
                        this.hp = Math.max(0, this.hp - pDmg);
                        if (this.particles) {
                            this.particles.spawnPoison(this.x, this.y, 6);
                            this.particles.spawnText(this.x, this.y - 8, `-${pDmg} ZEHİR`, '#51cf66', 15);
                        }
                        if (this.hp <= 0) {
                            this._die(this.lastPoisonAttacker || this.opponent || this);
                            return;
                        }
                    }
                }
            }

            if (state !== 'DEAD' && state !== 'ATTACK' && state !== 'WINDUP' && state !== 'STUNNED') {
                const defBonus = this.tacticOrder === 'DEFENSIVE' ? 8 : 0;
                const regenRate = (state === 'RETREAT' ? 26 : (state === 'BLOCK' ? 6 : 16)) + this.traitStamRegenMod + defBonus;
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

            const others = this.allFighters.length > 0 ? this.allFighters : (this.opponent ? [this.opponent] : []);
            if (Game.CombatRules) {
                this.x += Game.CombatRules.computeOverlapPushX(this, others);
                this.x = Math.max(this.arenaBounds.left, Math.min(this.arenaBounds.right, this.x));
            } else {
                for (const other of others) {
                    if (other !== this && other.hp > 0 && this.hp > 0) {
                        const dx = this.x - other.x;
                        const minGap = 40;
                        if (Math.abs(dx) < minGap) {
                            const pushDir = dx >= 0 ? 1 : -1;
                            this.x += pushDir * (minGap - Math.abs(dx)) * 0.5;
                        }
                    }
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