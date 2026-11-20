(function (Game) {
    class GladiatorRenderer {
        static draw(ctx, g) {
            ctx.save();
            ctx.translate(g.x, g.y);

            const bossScale = g.isBoss ? 1.18 : (g.isNemesis ? 1.09 : 1.0);

            // Zemin gölgesi
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 24 * bossScale, 7 * bossScale, 0, 0, Math.PI * 2);
            ctx.fill();

            const state = g.fsm.currentStateName;
            if (state === 'DEAD') {
                ctx.rotate(-g.facing * g.deathAngle);
            }

            ctx.scale(g.facing * bossScale, bossScale);

            const progress = g.stateDuration > 0 ? Math.min(1, g.stateTimer / g.stateDuration) : 0;
            const legSwing = Math.sin(g.walkPhase) * 10;
            const breathe = state === 'IDLE' ? Math.sin(performance.now() * 0.005) * 1.3 : 0;
            const hurtLean = (state === 'HURT' || state === 'STUNNED') ? -0.24 : 0;
            ctx.rotate(hurtLean);

            const flash = g.hitFlash > 0;
            const bodyFill = flash ? '#ffffff' : g.teamColor;
            const skinFill = flash ? '#ffffff' : g.skinColor;
            const effects = g.activeEffects || {};

            // Dalgalanan Pelerin (Plaka zırhta, Boss'ta veya Kan Davası Nemesis'te)
            if (!flash && (g.isBoss || g.isNemesis || (g.armor && g.armor.style === 'plate'))) {
                const capeWave = Math.sin(performance.now() * 0.008 + g.walkPhase) * 5;
                ctx.fillStyle = g.isBoss
                    ? '#1c1917'
                    : (g.isNemesis ? '#6b1111' : (g.team === 'right' ? '#1e3a5f' : '#5e1414'));
                ctx.beginPath();
                ctx.moveTo(-8, -55 + breathe);
                ctx.quadraticCurveTo(-26, -34, -22 + capeWave, -8);
                ctx.lineTo(-9, -12);
                ctx.closePath();
                ctx.fill();
                if (g.isBoss || g.isNemesis) {
                    ctx.strokeStyle = g.isBoss ? '#d4af37' : '#ff8787';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            // 1. Bacaklar (Anatomik baldır & dizlik)
            this._drawLegs(ctx, g, legSwing, skinFill, flash);

            // 2. Gövde & Zırh (Geniş omuz, V-kesim)
            this._drawTorsoAndArmor(ctx, g, bodyFill, skinFill, breathe, flash);

            // 3. Kafa & Miğfer (Köşeli çene, sert bakış)
            this._drawHeadAndHelmet(ctx, g, skinFill, breathe, flash);

            // 4. Silah Kolu & Silah
            let armAngle = 0.28;
            let thrustOffset = 0;

            if (g.weapon.type === 'spear' || g.weapon.type === 'trident') {
                armAngle = 0.04;
                if (state === 'WINDUP') thrustOffset = -18 * progress;
                else if (state === 'ATTACK') thrustOffset = 32 * Math.sin(progress * Math.PI);
            } else {
                if (state === 'WINDUP') armAngle = -1.65 * progress;
                else if (state === 'ATTACK') armAngle = -1.65 + 2.75 * progress;
                else if (state === 'BLOCK') armAngle = -0.4;
            }

            ctx.save();
            ctx.translate(6 + thrustOffset, -49 + breathe);
            ctx.rotate(armAngle);

            // Kaslı kol & bileklik
            ctx.strokeStyle = skinFill;
            ctx.lineWidth = 6.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, 4);
            ctx.stroke();

            if (!flash) {
                ctx.strokeStyle = '#4a3222';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(9, 2.5);
                ctx.lineTo(14, 3.8);
                ctx.stroke();
            }

            ctx.translate(15, 4);
            this._drawWeapon(ctx, g.weapon.type, flash);
            ctx.restore();

            // 5. Kalkan
            if (g.shield && g.shield.hasShield) {
                this._drawShield(ctx, g, state, breathe, flash);
            }

            // 6. Debuff Görselleri (Canvas uzayında ters dönmemesi için facing geri çevrilir)
            ctx.scale(g.facing, 1);
            if (state === 'STUNNED' || effects.stun > 0) {
                const spin = performance.now() * 0.009;
                ctx.strokeStyle = '#ffd166';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, -86, 14, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                for (let i = 0; i < 3; i++) {
                    const ax = Math.cos(spin + i * 2.1) * 14;
                    const ay = -86 + Math.sin(spin + i * 2.1) * 4;
                    ctx.fillStyle = '#fff3bf';
                    ctx.fillRect(ax - 2, ay - 2, 4, 4);
                }
            }
            if (effects.slow > 0) {
                ctx.strokeStyle = 'rgba(116, 192, 252, 0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, -35, 22, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (effects.poison > 0) {
                const pulse = performance.now() * 0.006;
                ctx.strokeStyle = 'rgba(81, 207, 102, 0.65)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.ellipse(0, -36, 19, 28, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#51cf66';
                for (let i = 0; i < 3; i++) {
                    const bx = Math.sin(pulse + i * 2.1) * 14;
                    const by = -20 - ((pulse * 18 + i * 18) % 44);
                    ctx.beginPath();
                    ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }

        static _drawLegs(ctx, g, legSwing, skinFill, flash) {
            const drawSingleLeg = (offsetX, swing) => {
                ctx.strokeStyle = flash ? '#fff' : skinFill;
                ctx.lineWidth = 7;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(offsetX, -25);
                ctx.lineTo(offsetX + swing * 0.5, -13);
                ctx.lineTo(offsetX + swing, -2);
                ctx.stroke();

                if (!flash) {
                    // Dizlik / Baldır zırhı (Greaves)
                    ctx.strokeStyle = (g.armor && (g.armor.style === 'plate' || g.armor.style === 'chain')) ? '#6c757d' : '#5c3a21';
                    ctx.lineWidth = 7.5;
                    ctx.beginPath();
                    ctx.moveTo(offsetX + swing * 0.55, -12);
                    ctx.lineTo(offsetX + swing, -3);
                    ctx.stroke();

                    // Çizme / Sandalet
                    ctx.fillStyle = '#2b1d14';
                    ctx.fillRect(offsetX + swing - 4, -5, 10, 5);
                }
            };

            drawSingleLeg(-5, -legSwing);
            drawSingleLeg(5, legSwing);
        }

        static _drawTorsoAndArmor(ctx, g, bodyFill, skinFill, breathe, flash) {
            const style = g.armor ? g.armor.style : 'tunic';

            // Alt Etek / Tunik (Pteruges)
            ctx.fillStyle = bodyFill;
            ctx.beginPath();
            ctx.moveTo(-11, -30 + breathe);
            ctx.lineTo(11, -30 + breathe);
            ctx.lineTo(14, -18);
            ctx.lineTo(-14, -18);
            ctx.closePath();
            ctx.fill();

            // V-Kesim Güçlü Gövde
            ctx.fillStyle = style === 'tunic' ? bodyFill : (flash ? '#fff' : '#2b2520');
            ctx.beginPath();
            ctx.moveTo(-15, -55 + breathe);
            ctx.lineTo(15, -55 + breathe);
            ctx.lineTo(10, -28 + breathe);
            ctx.lineTo(-10, -28 + breathe);
            ctx.closePath();
            ctx.fill();

            if (!flash) {
                if (style === 'tunic') {
                    // Kaslı omuz/göğüs gölgesi
                    ctx.fillStyle = skinFill;
                    ctx.fillRect(-13, -55 + breathe, 26, 9);
                    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(-10, -45 + breathe);
                    ctx.lineTo(10, -32 + breathe);
                    ctx.stroke();
                } else if (style === 'leather') {
                    ctx.fillStyle = '#5c3517';
                    ctx.beginPath();
                    ctx.moveTo(-14, -54 + breathe);
                    ctx.lineTo(14, -54 + breathe);
                    ctx.lineTo(10, -30 + breathe);
                    ctx.lineTo(-10, -30 + breathe);
                    ctx.closePath();
                    ctx.fill();
                    ctx.strokeStyle = '#9c6644';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(-9, -50 + breathe, 18, 15);
                } else if (style === 'chain') {
                    ctx.fillStyle = '#5c646d';
                    ctx.beginPath();
                    ctx.moveTo(-15, -55 + breathe);
                    ctx.lineTo(15, -55 + breathe);
                    ctx.lineTo(11, -29 + breathe);
                    ctx.lineTo(-11, -29 + breathe);
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = '#343a40';
                    for (let ry = -51; ry < -31; ry += 5) {
                        ctx.fillRect(-11, ry + breathe, 22, 2);
                    }
                    // Omuz zırhı
                    ctx.fillStyle = '#868e96';
                    ctx.beginPath();
                    ctx.arc(-12, -52 + breathe, 7, 0, Math.PI * 2);
                    ctx.fill();
                } else if (style === 'plate') {
                    // Lorica Segmentata (Çelik + Altın kenar)
                    const plateGrad = ctx.createLinearGradient(-15, -55, 15, -30);
                    plateGrad.addColorStop(0, '#adb5bd');
                    plateGrad.addColorStop(0.5, '#6c757d');
                    plateGrad.addColorStop(1, '#343a40');
                    ctx.fillStyle = plateGrad;
                    ctx.beginPath();
                    ctx.moveTo(-16, -56 + breathe);
                    ctx.lineTo(16, -56 + breathe);
                    ctx.lineTo(11, -29 + breathe);
                    ctx.lineTo(-11, -29 + breathe);
                    ctx.closePath();
                    ctx.fill();

                    ctx.strokeStyle = '#c9a227';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Büyük omuzluk (Pauldron)
                    ctx.fillStyle = '#868e96';
                    ctx.beginPath();
                    ctx.arc(-13, -52 + breathe, 8.5, Math.PI * 0.7, Math.PI * 2.1);
                    ctx.fill();
                    ctx.strokeStyle = '#c9a227';
                    ctx.stroke();
                }

                // Kemer & Toka
                ctx.fillStyle = '#2b180c';
                ctx.fillRect(-11, -32 + breathe, 22, 6);
                ctx.fillStyle = '#c9a227';
                ctx.fillRect(-3, -32 + breathe, 6, 6);
            }
        }

        static _drawHeadAndHelmet(ctx, g, skinFill, breathe, flash) {
            ctx.save();
            ctx.translate(0, breathe);

            // Köşeli çene/kafa silueti
            ctx.fillStyle = skinFill;
            ctx.beginPath();
            ctx.moveTo(-9, -73);
            ctx.lineTo(9, -73);
            ctx.lineTo(10, -61);
            ctx.lineTo(5, -55);
            ctx.lineTo(-6, -55);
            ctx.lineTo(-10, -62);
            ctx.closePath();
            ctx.fill();

            if (!flash) {
                // Sert kaş gölgesi & göz
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(0, -68, 9, 4);
                ctx.fillStyle = g.isBoss ? '#ff3b3b' : '#111111';
                ctx.fillRect(4, -66, 4, 2.5);
                // Kirli sakal gölgesi
                ctx.fillStyle = 'rgba(30,20,15,0.35)';
                ctx.fillRect(-5, -60, 11, 5);
            }

            if (flash) {
                ctx.restore();
                return;
            }

            const style = g.helmet ? g.helmet.style : 'none';

            if (style === 'galea') {
                ctx.fillStyle = '#5c677d';
                ctx.beginPath();
                ctx.arc(0, -67, 11.5, Math.PI, 0);
                ctx.fill();
                // Yanak koruyucu
                ctx.fillRect(-11, -67, 7, 11);
                ctx.fillRect(-12, -68, 24, 3.5);
                // Sorguç
                ctx.fillStyle = g.teamColor;
                ctx.beginPath();
                ctx.moveTo(-10, -76);
                ctx.quadraticCurveTo(0, -89, 11, -76);
                ctx.closePath();
                ctx.fill();
            } else if (style === 'corinthian') {
                ctx.fillStyle = '#b08922';
                ctx.beginPath();
                ctx.arc(0, -66, 12, Math.PI * 0.85, 0.15);
                ctx.fill();
                ctx.fillRect(2, -69, 9, 13);
                ctx.fillRect(-11, -67, 8, 12);
                // Karanlık T-vizör
                ctx.fillStyle = '#0d0d0d';
                ctx.fillRect(4, -67, 6, 3);
                ctx.fillRect(6, -64, 3, 7);
                if (g.isBoss) {
                    ctx.fillStyle = '#ff3b3b';
                    ctx.fillRect(5, -66, 4, 2);
                }
            } else if (style === 'horned') {
                ctx.fillStyle = '#343a40';
                ctx.beginPath();
                ctx.arc(0, -67, 12, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(-12, -68, 24, 5);
                ctx.fillRect(-11, -66, 9, 11);
                // Metalik Vizör
                ctx.fillStyle = '#111';
                ctx.fillRect(3, -65, 7, 3);
                if (g.isBoss) {
                    ctx.fillStyle = '#ff2a2a';
                    ctx.fillRect(5, -65, 3, 2);
                }
                // Keskin Boynuzlar
                ctx.fillStyle = '#ced4da';
                ctx.beginPath();
                ctx.moveTo(-5, -75);
                ctx.quadraticCurveTo(-20, -88, -13, -97);
                ctx.quadraticCurveTo(-9, -84, 0, -77);
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(5, -75);
                ctx.quadraticCurveTo(20, -88, 13, -97);
                ctx.quadraticCurveTo(9, -84, 0, -77);
                ctx.fill();
            }

            ctx.restore();
        }

        static _drawShield(ctx, g, state, breathe, flash) {
            ctx.save();
            const isBlocking = state === 'BLOCK';
            const shieldX = isBlocking ? 17 : 10;
            const shieldY = (isBlocking ? -48 : -41) + breathe;
            ctx.translate(shieldX, shieldY);

            ctx.fillStyle = flash ? '#fff' : g.shield.color;
            ctx.strokeStyle = flash ? '#fff' : '#b8942a';
            ctx.lineWidth = 2.5;

            if (g.shield.shape === 'round') {
                ctx.beginPath();
                ctx.ellipse(0, 0, 7.5, 16, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.roundRect(-5, -20, 11, 40, 3);
                ctx.fill();
                ctx.stroke();
            }

            if (!flash) {
                ctx.fillStyle = '#d4af37';
                ctx.beginPath();
                ctx.arc(3, 0, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        static _drawWeapon(ctx, type, flash) {
            const steelLight = flash ? '#fff' : '#dce1e7';
            const steelDark = flash ? '#fff' : '#7b848f';

            if (type === 'dagger') {
                ctx.fillStyle = '#3d2514';
                ctx.fillRect(-2, -2, 4, 6);
                ctx.fillStyle = steelLight;
                ctx.beginPath();
                ctx.moveTo(-2.5, -2);
                ctx.lineTo(0, -26);
                ctx.lineTo(2.5, -2);
                ctx.closePath();
                ctx.fill();
            } else if (type === 'sword') {
                ctx.fillStyle = '#4a2c16';
                ctx.fillRect(-3, -3, 6, 8);
                ctx.fillStyle = '#b8942a';
                ctx.fillRect(-7, -5, 14, 3);
                ctx.fillStyle = steelDark;
                ctx.fillRect(-3, -40, 3, 35);
                ctx.fillStyle = steelLight;
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(0, -47);
                ctx.lineTo(3.5, -39);
                ctx.lineTo(3, -5);
                ctx.closePath();
                ctx.fill();
            } else if (type === 'spear') {
                ctx.fillStyle = '#4a2c16';
                ctx.fillRect(-30, -2, 86, 4);
                ctx.fillStyle = steelLight;
                ctx.beginPath();
                ctx.moveTo(56, -5.5);
                ctx.lineTo(76, 0);
                ctx.lineTo(56, 5.5);
                ctx.closePath();
                ctx.fill();
            } else if (type === 'trident') {
                ctx.fillStyle = '#3d2514';
                ctx.fillRect(-28, -2, 78, 4);
                ctx.fillStyle = steelLight;
                ctx.fillRect(50, -10, 3, 20);
                ctx.fillRect(50, -10, 17, 2.5);
                ctx.fillRect(50, -1.2, 22, 2.5);
                ctx.fillRect(50, 7.5, 17, 2.5);
            } else if (type === 'mace') {
                ctx.fillStyle = '#3d2514';
                ctx.fillRect(-2.5, -40, 5, 44);
                ctx.fillStyle = '#495057';
                ctx.beginPath();
                ctx.arc(0, -42, 8.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = steelLight;
                ctx.fillRect(-11, -43, 22, 2.5);
                ctx.fillRect(-1.2, -53, 2.5, 22);
            } else if (type === 'axe') {
                ctx.fillStyle = '#3d2514';
                ctx.fillRect(-2.5, -52, 5, 58);
                ctx.fillStyle = steelDark;
                ctx.beginPath();
                ctx.moveTo(2, -50);
                ctx.quadraticCurveTo(24, -44, 18, -22);
                ctx.lineTo(2, -30);
                ctx.closePath();
                ctx.fill();
                // Keskin ağız parıltısı
                ctx.strokeStyle = steelLight;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(15, -44);
                ctx.quadraticCurveTo(22, -34, 17, -23);
                ctx.stroke();
            }
        }
    }

    Game.GladiatorRenderer = GladiatorRenderer;
})(window.LudusGame = window.LudusGame || {});