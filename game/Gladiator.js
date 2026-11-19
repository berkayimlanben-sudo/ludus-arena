(function (Game, Engine) {
    class Gladiator extends Engine.Node2D {
        constructor(config) {
            super(config.name || 'Gladiator', config.x || 200, config.y || 355);

            this.gladiatorName = config.name;
            this.team = config.team || 'left';
            this.teamColor = config.teamColor || '#d9483b';
            this.skinColor = config.skinColor || '#e0ac82';
            this.facing = this.team === 'left' ? 1 : -1;

            // Statlar
            this.maxHp = config.maxHp || 120;
            this.hp = this.maxHp;
            this.maxStamina = config.maxStamina || 100;
            this.stamina = this.maxStamina;

            this.strength = config.strength || 12;
            this.agility = config.agility || 12;
            this.defense = config.defense || 8;

            // Ekipman
            this.weapon = config.weapon;
            this.shield = config.shield || null;
            this.helmet = config.helmet || 'galea';

            // Bağlantılar (ArenaScene tarafından atanır)
            this.opponent = null;
            this.particles = null;
            this.arenaBounds = { left: 80, right: 880, groundY: 355 };

            // Sinyaller
            this.onDied = new Engine.Signal();
            this.onLog = new Engine.Signal();

            // Animasyon ve savaş zamanlayıcıları
            this.walkPhase = 0;
            this.attackCooldown = 0;
            this.stateTimer = 0;
            this.stateDuration = 0;
            this.hasHitThisSwing = false;
            this.hitFlash = 0;
            this.deathAngle = 0;

            // AI Durum Makinesi
            this.fsm = new Engine.StateMachine('AI');
            this.addChild(this.fsm);
            this._setupStates();
        }

        _ready() {
            this.fsm.transitionTo('IDLE');
        }

        getMoveSpeed() {
            const weightPenalty = (this.shield ? 16 : 0) + (this.weapon.type === 'axe' ? 18 : 0);
            return Math.max(75, 110 + this.agility * 3.5 - weightPenalty);
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
                    g.stateTimer = 0.08 + Math.random() * 0.14;
                },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) return;
                    g._faceOpponent();

                    g.stateTimer -= dt;
                    if (g.stateTimer > 0) return;

                    const dist = Math.abs(g.opponent.x - g.x);
                    const oppState = g.opponent.fsm.currentStateName;

                    // Rakip saldırı hazırlığındaysa tepki ver
                    if (oppState === 'WINDUP' && dist <= g.opponent.weapon.range + 28) {
                        if (g.shield && g.stamina >= g.shield.staminaCost && Math.random() < g.shield.blockChance) {
                            g.fsm.transitionTo('BLOCK');
                            return;
                        }
                        if (Math.random() < 0.35 && g.stamina >= 15) {
                            g.fsm.transitionTo('RETREAT', { duration: 0.32 });
                            return;
                        }
                    }

                    // Stamina azsa geri çekilip nefeslen
                    if (g.stamina < g.weapon.staminaCost + 5) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.55 });
                        return;
                    }

                    // Mızrak gibi uzun silah varsa çok dibe girince mesafe aç
                    if (g.weapon.type === 'spear' && dist < 58 && Math.random() < 0.7) {
                        g.fsm.transitionTo('RETREAT', { duration: 0.28 });
                        return;
                    }

                    // Saldırı menzili içindeyse ve cooldown hazırsa saldır
                    if (dist <= g.weapon.range && g.attackCooldown <= 0) {
                        g.fsm.transitionTo('WINDUP');
                        return;
                    }

                    // Aksi halde yaklaş
                    if (dist > g.weapon.range * 0.88) {
                        g.fsm.transitionTo('APPROACH');
                    } else {
                        g.stateTimer = 0.1;
                    }
                }
            });

            this.fsm.addState('APPROACH', {
                enter() {
                    g.stateTimer = 0.45 + Math.random() * 0.35;
                },
                update(dt) {
                    if (!g.opponent || g.opponent.hp <= 0) {
                        g.fsm.transitionTo('IDLE');
                        return;
                    }

                    g._faceOpponent();
                    const dist = Math.abs(g.opponent.x - g.x);

                    // Rakip tam saldırıyorsa refleks blok
                    if (g.opponent.fsm.currentStateName === 'WINDUP' && dist <= g.opponent.weapon.range + 22) {
                        if (g.shield && g.stamina >= g.shield.staminaCost && Math.random() < g.shield.blockChance * 0.85) {
                            g.fsm.transitionTo('BLOCK');
                            return;
                        }
                    }

                    if (dist <= g.weapon.range * 0.9 && g.attackCooldown <= 0) {
                        g.fsm.transitionTo('WINDUP');
                        return;
                    }

                    const idealDist = g.weapon.type === 'spear' ? g.weapon.range * 0.82 : g.weapon.range * 0.75;
                    if (dist > idealDist) {
                        g.vx = g.facing * g.getMoveSpeed();
                    } else {
                        g.fsm.transitionTo('IDLE');
                        return;
                    }

                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) {
                        g.fsm.transitionTo('IDLE');
                    }
                }
            });

            this.fsm.addState('WINDUP', {
                enter() {
                    g.vx = 0;
                    g.stateTimer = 0;
                    g.stateDuration = g.weapon.windupTime;
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
                    g.vx = g.facing * 125; // Öne hafif atılım
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 3);
                },
                update(dt) {
                    g.stateTimer += dt;
                    g.vx *= 0.88;

                    if (!g.hasHitThisSwing && g.stateTimer >= g.stateDuration * 0.45) {
                        g.hasHitThisSwing = true;
                        g._performHitCheck();
                    }

                    if (g.stateTimer >= g.stateDuration) {
                        g.attackCooldown = 0.25 + Math.max(0, (20 - g.agility) * 0.015);
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
                    if (g.stateTimer <= 0) {
                        g.fsm.transitionTo('IDLE');
                    }
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
                    if (g.stateTimer <= 0) {
                        g.fsm.transitionTo('IDLE');
                    }
                }
            });

            this.fsm.addState('RETREAT', {
                enter(data) {
                    g.stateTimer = data.duration || 0.35;
                    g._faceOpponent();
                    g.vx = -g.facing * g.getMoveSpeed() * 0.95;
                    if (g.particles) g.particles.spawnDust(g.x, g.y, 4);
                },
                update(dt) {
                    g.stateTimer -= dt;
                    // Köşeye sıkışırsa dur
                    if (g.x <= g.arenaBounds.left + 15 || g.x >= g.arenaBounds.right - 15) {
                        g.vx = 0;
                    }
                    if (g.stateTimer <= 0) {
                        g.fsm.transitionTo('IDLE');
                    }
                }
            });

            this.fsm.addState('HURT', {
                enter() {
                    g.stateTimer = 0.2;
                },
                update(dt) {
                    g.vx *= 0.85;
                    g.stateTimer -= dt;
                    if (g.stateTimer <= 0) {
                        g.fsm.transitionTo('IDLE');
                    }
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

            if (!isInFront || dist > this.weapon.range + 16) {
                return; // Iskaladı
            }

            const target = this.opponent;
            const hitX = (this.x + target.x) / 2;
            const isBlocking = target.fsm.currentStateName === 'BLOCK' &&
                ((this.x - target.x) * target.facing >= -10);

            if (isBlocking && target.shield) {
                // Kalkan bloku
                const blockedDmg = Math.max(1, Math.round((this.weapon.damage + this.strength * 0.4) * (1 - target.shield.blockMitigation)));
                target.hp = Math.max(0, target.hp - blockedDmg);
                target.stamina = Math.max(0, target.stamina - target.shield.staminaCost);
                target.vx = this.facing * 110;
                this.vx = -this.facing * 95;

                if (this.particles) {
                    this.particles.spawnSparks(hitX, target.y, -this.facing, 14);
                    this.particles.spawnText(target.x, target.y, `BLOK! (-${blockedDmg})`, '#ffe066', 14);
                }
                if (this.tree) {
                    this.tree.hitstop(0.045);
                    if (this.tree.activeCamera) this.tree.activeCamera.shake(4.5);
                }
                this.onLog.emit(`${target.gladiatorName}, ${this.gladiatorName}'ın darbesini kalkanıyla savuşturdu!`);

                if (target.hp <= 0) {
                    target._die(this);
                }
                return;
            }

            // Temiz vuruş
            const critChance = 0.08 + this.agility * 0.008;
            const isCrit = Math.random() < critChance;
            let rawDamage = this.weapon.damage + this.strength * 0.65 - target.defense * 0.35;
            rawDamage = rawDamage * (0.9 + Math.random() * 0.2);
            if (isCrit) rawDamage *= 1.55;

            const finalDmg = Math.max(3, Math.round(rawDamage));
            target.hp = Math.max(0, target.hp - finalDmg);
            target.hitFlash = 0.14;
            target.vx = this.facing * (isCrit ? 190 : 120);

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
                    ? `${this.gladiatorName} müthiş bir KRİTİK darbe indirdi: ${finalDmg} hasar!`
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
            if (this.particles) {
                this.particles.spawnDust(this.x, this.y, 10);
            }
            this.onLog.emit(`⚔️ ${killer.gladiatorName}, ${this.gladiatorName}'ı yere serdi!`);
            this.onDied.emit(this, killer);
        }

        _process(delta) {
            if (this.attackCooldown > 0) this.attackCooldown -= delta;
            if (this.hitFlash > 0) this.hitFlash -= delta;

            // Stamina yenilenmesi (saldırı/blok harici)
            const state = this.fsm.currentStateName;
            if (state !== 'DEAD' && state !== 'ATTACK' && state !== 'WINDUP') {
                const regenRate = state === 'RETREAT' ? 26 : (state === 'BLOCK' ? 6 : 16);
                this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * delta);
            }

            // Hareket ve yerçekimi
            this.x += this.vx * delta;
            if (this.y < this.arenaBounds.groundY || this.vy < 0) {
                this.vy += 520 * delta;
                this.y += this.vy * delta;
                if (this.y >= this.arenaBounds.groundY) {
                    this.y = this.arenaBounds.groundY;
                    this.vy = 0;
                }
            }

            // Arena duvarları
            this.x = Math.max(this.arenaBounds.left, Math.min(this.arenaBounds.right, this.x));

            // İki gladyatörün iç içe geçmesini engelle
            if (this.opponent && this.hp > 0 && this.opponent.hp > 0) {
                const dx = this.x - this.opponent.x;
                const minGap = 40;
                if (Math.abs(dx) < minGap) {
                    const pushDir = dx >= 0 ? 1 : -1;
                    this.x += pushDir * (minGap - Math.abs(dx)) * 0.5;
                }
            }

            // Yürüme animasyonu
            if (Math.abs(this.vx) > 15 && state !== 'DEAD') {
                this.walkPhase += delta * 12;
            } else {
                this.walkPhase = 0;
            }
        }

        _draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Zemin gölgesi
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ölünce yana devrilme
            if (this.fsm.currentStateName === 'DEAD') {
                ctx.rotate(-this.facing * this.deathAngle);
            }

            ctx.scale(this.facing, 1);

            const state = this.fsm.currentStateName;
            const progress = this.stateDuration > 0 ? Math.min(1, this.stateTimer / this.stateDuration) : 0;
            const legSwing = Math.sin(this.walkPhase) * 9;
            const hurtLean = state === 'HURT' ? -0.22 : 0;

            ctx.rotate(hurtLean);

            // Hasar alınca beyaz parlama efekti
            const bodyFill = this.hitFlash > 0 ? '#ffffff' : this.teamColor;
            const skinFill = this.hitFlash > 0 ? '#ffffff' : this.skinColor;

            // 1. Bacaklar
            ctx.strokeStyle = '#3d2b1f';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            // Arka bacak
            ctx.beginPath();
            ctx.moveTo(-4, -24);
            ctx.lineTo(-6 - legSwing, -2);
            ctx.stroke();
            // Ön bacak
            ctx.beginPath();
            ctx.moveTo(4, -24);
            ctx.lineTo(6 + legSwing, -2);
            ctx.stroke();

            // Sandalet / Dizlik
            ctx.fillStyle = '#8b6f47';
            ctx.fillRect(-10 - legSwing, -6, 8, 5);
            ctx.fillRect(2 + legSwing, -6, 8, 5);

            // 2. Gövde (Tunik + Zırh)
            ctx.fillStyle = bodyFill;
            ctx.beginPath();
            ctx.roundRect(-12, -52, 24, 30, 5);
            ctx.fill();

            // Deri kemer & zırh kayışı
            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(-12, -32, 24, 6);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(-3, -32, 6, 6);

            // Omuzluk (Pauldron)
            ctx.fillStyle = '#9aa5b1';
            ctx.beginPath();
            ctx.arc(-10, -49, 7, 0, Math.PI * 2);
            ctx.fill();

            // 3. Kafa & Miğfer
            ctx.fillStyle = skinFill;
            ctx.beginPath();
            ctx.arc(0, -63, 11, 0, Math.PI * 2);
            ctx.fill();

            // Göz
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(4, -65, 3, 3);

            // Miğfer çizimi
            if (this.helmet === 'galea') {
                // Roma miğferi + tüylü sorguç
                ctx.fillStyle = '#8e9aaf';
                ctx.beginPath();
                ctx.arc(0, -65, 12, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(-12, -66, 24, 4);
                // Sorguç (Crest)
                ctx.fillStyle = this.teamColor;
                ctx.beginPath();
                ctx.ellipse(-1, -79, 10, 5, -0.1, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.helmet === 'corinthian') {
                ctx.fillStyle = '#c9a227';
                ctx.beginPath();
                ctx.arc(0, -64, 12.5, Math.PI * 0.85, 0.15);
                ctx.fill();
                ctx.fillRect(2, -68, 10, 11);
                ctx.fillStyle = '#111';
                ctx.fillRect(5, -65, 5, 2.5);
            }

            // 4. Silah Kolu & Silah
            let armAngle = 0.25;
            let thrustOffset = 0;

            if (this.weapon.type === 'spear') {
                armAngle = 0.05;
                if (state === 'WINDUP') thrustOffset = -16 * progress;
                else if (state === 'ATTACK') thrustOffset = 28 * Math.sin(progress * Math.PI);
            } else {
                if (state === 'WINDUP') armAngle = -1.55 * progress;
                else if (state === 'ATTACK') armAngle = -1.55 + 2.6 * progress;
                else if (state === 'BLOCK') armAngle = -0.35;
            }

            ctx.save();
            ctx.translate(4 + thrustOffset, -46);
            ctx.rotate(armAngle);

            // Kol
            ctx.strokeStyle = skinFill;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(14, 4);
            ctx.stroke();

            // Silahı elde çiz
            ctx.translate(14, 4);
            this._drawWeapon(ctx);
            ctx.restore();

            // 5. Kalkan (Varsa)
            if (this.shield) {
                ctx.save();
                const isBlocking = state === 'BLOCK';
                const shieldX = isBlocking ? 16 : 9;
                const shieldY = isBlocking ? -46 : -39;
                ctx.translate(shieldX, shieldY);

                // Scutum / Yuvarlak Kalkan
                ctx.fillStyle = this.shield.color;
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.roundRect(-5, -18, 10, 36, 4);
                ctx.fill();
                ctx.stroke();

                // Kalkan göbeği (Umbo)
                ctx.fillStyle = '#d4af37';
                ctx.beginPath();
                ctx.arc(3, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        _drawWeapon(ctx) {
            if (this.weapon.type === 'sword') {
                // Gladius (Roma kılıcı)
                ctx.fillStyle = '#6b4226';
                ctx.fillRect(-3, -3, 6, 8);
                ctx.fillStyle = '#d4af37';
                ctx.fillRect(-6, -5, 12, 3);
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(-3, -5);
                ctx.lineTo(-2, -38);
                ctx.lineTo(0, -45);
                ctx.lineTo(2, -38);
                ctx.lineTo(3, -5);
                ctx.closePath();
                ctx.fill();
            } else if (this.weapon.type === 'spear') {
                // Uzun Mızrak (Yatay eksende ileri bakar)
                ctx.fillStyle = '#6b4226';
                ctx.fillRect(-28, -2, 82, 4);
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(54, -5);
                ctx.lineTo(72, 0);
                ctx.lineTo(54, 5);
                ctx.closePath();
                ctx.fill();
            } else if (this.weapon.type === 'axe') {
                // Ağır Çift El Balta
                ctx.fillStyle = '#5c3a21';
                ctx.fillRect(-2, -48, 5, 54);
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(2, -46);
                ctx.quadraticCurveTo(20, -42, 16, -24);
                ctx.lineTo(2, -30);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    Game.Gladiator = Gladiator;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine);