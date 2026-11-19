(function (Game) {
    class GladiatorRenderer {
        static draw(ctx, g) {
            ctx.save();
            ctx.translate(g.x, g.y);

            // Zemin gölgesi
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            const state = g.fsm.currentStateName;
            if (state === 'DEAD') {
                ctx.rotate(-g.facing * g.deathAngle);
            }

            ctx.scale(g.facing, 1);

            const progress = g.stateDuration > 0 ? Math.min(1, g.stateTimer / g.stateDuration) : 0;
            const legSwing = Math.sin(g.walkPhase) * 9;
            const hurtLean = state === 'HURT' ? -0.22 : 0;
            ctx.rotate(hurtLean);

            const flash = g.hitFlash > 0;
            const bodyFill = flash ? '#ffffff' : g.teamColor;
            const skinFill = flash ? '#ffffff' : g.skinColor;

            // 1. Bacaklar
            ctx.strokeStyle = '#3d2b1f';
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-4, -24);
            ctx.lineTo(-6 - legSwing, -2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(4, -24);
            ctx.lineTo(6 + legSwing, -2);
            ctx.stroke();

            ctx.fillStyle = g.armor.style === 'plate' ? '#8d99ae' : '#8b6f47';
            ctx.fillRect(-10 - legSwing, -8, 8, 7);
            ctx.fillRect(2 + legSwing, -8, 8, 7);

            // 2. Gövde & Zırh
            this._drawTorsoAndArmor(ctx, g, bodyFill, flash);

            // 3. Kafa & Miğfer
            this._drawHeadAndHelmet(ctx, g, skinFill, flash);

            // 4. Silah Kolu & Silah
            let armAngle = 0.25;
            let thrustOffset = 0;

            if (g.weapon.type === 'spear' || g.weapon.type === 'trident') {
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

            ctx.strokeStyle = skinFill;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(14, 4);
            ctx.stroke();

            ctx.translate(14, 4);
            this._drawWeapon(ctx, g.weapon.type);
            ctx.restore();

            // 5. Kalkan
            if (g.shield && g.shield.hasShield) {
                this._drawShield(ctx, g, state);
            }

            ctx.restore();
        }

        static _drawTorsoAndArmor(ctx, g, bodyFill, flash) {
            const style = g.armor ? g.armor.style : 'tunic';

            // Alt Tunik
            ctx.fillStyle = bodyFill;
            ctx.beginPath();
            ctx.roundRect(-12, -52, 24, 30, 5);
            ctx.fill();

            if (!flash) {
                if (style === 'leather') {
                    ctx.fillStyle = '#6f4518';
                    ctx.fillRect(-11, -50, 22, 18);
                    ctx.fillStyle = '#a47148';
                    ctx.fillRect(-11, -44, 22, 3);
                } else if (style === 'chain') {
                    ctx.fillStyle = '#7b8794';
                    ctx.fillRect(-12, -52, 24, 21);
                    ctx.fillStyle = '#52606d';
                    for (let ry = -49; ry < -33; ry += 5) {
                        ctx.fillRect(-10, ry, 20, 2);
                    }
                } else if (style === 'plate') {
                    ctx.fillStyle = '#9aa5b1';
                    ctx.beginPath();
                    ctx.roundRect(-13, -53, 26, 23, 4);
                    ctx.fill();
                    ctx.strokeStyle = '#d4af37';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(-10, -49, 20, 14);
                    // Omuzluk
                    ctx.fillStyle = '#cbd2d9';
                    ctx.beginPath();
                    ctx.arc(-11, -49, 8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Kemer
            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(-12, -32, 24, 6);
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(-3, -32, 6, 6);
        }

        static _drawHeadAndHelmet(ctx, g, skinFill, flash) {
            ctx.fillStyle = skinFill;
            ctx.beginPath();
            ctx.arc(0, -63, 11, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(4, -65, 3, 3);

            if (flash) return;
            const style = g.helmet ? g.helmet.style : 'none';

            if (style === 'galea') {
                ctx.fillStyle = '#8e9aaf';
                ctx.beginPath();
                ctx.arc(0, -65, 12, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(-12, -66, 24, 4);
                ctx.fillStyle = g.teamColor;
                ctx.beginPath();
                ctx.ellipse(-1, -79, 10, 5, -0.1, 0, Math.PI * 2);
                ctx.fill();
            } else if (style === 'corinthian') {
                ctx.fillStyle = '#c9a227';
                ctx.beginPath();
                ctx.arc(0, -64, 12.5, Math.PI * 0.85, 0.15);
                ctx.fill();
                ctx.fillRect(2, -68, 10, 11);
                ctx.fillStyle = '#111';
                ctx.fillRect(5, -65, 5, 2.5);
            } else if (style === 'horned') {
                ctx.fillStyle = '#4a5568';
                ctx.beginPath();
                ctx.arc(0, -65, 12.5, Math.PI, 0);
                ctx.fill();
                ctx.fillRect(-12, -67, 24, 5);
                // Boynuzlar
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(-4, -73);
                ctx.quadraticCurveTo(-18, -86, -12, -93);
                ctx.quadraticCurveTo(-8, -82, 0, -75);
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(4, -73);
                ctx.quadraticCurveTo(18, -86, 12, -93);
                ctx.quadraticCurveTo(8, -82, 0, -75);
                ctx.fill();
            }
        }

        static _drawShield(ctx, g, state) {
            ctx.save();
            const isBlocking = state === 'BLOCK';
            const shieldX = isBlocking ? 16 : 9;
            const shieldY = isBlocking ? -46 : -39;
            ctx.translate(shieldX, shieldY);

            ctx.fillStyle = g.shield.color;
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2.5;

            if (g.shield.shape === 'round') {
                ctx.beginPath();
                ctx.ellipse(0, 0, 7, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.roundRect(-5, -18, 10, 36, 4);
                ctx.fill();
                ctx.stroke();
            }

            ctx.fillStyle = '#d4af37';
            ctx.beginPath();
            ctx.arc(3, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        static _drawWeapon(ctx, type) {
            if (type === 'dagger') {
                ctx.fillStyle = '#5c3a21';
                ctx.fillRect(-2, -2, 4, 6);
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(-2, -2);
                ctx.lineTo(0, -24);
                ctx.lineTo(2, -2);
                ctx.closePath();
                ctx.fill();
            } else if (type === 'sword') {
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
            } else if (type === 'spear') {
                ctx.fillStyle = '#6b4226';
                ctx.fillRect(-28, -2, 82, 4);
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(54, -5);
                ctx.lineTo(72, 0);
                ctx.lineTo(54, 5);
                ctx.closePath();
                ctx.fill();
            } else if (type === 'trident') {
                ctx.fillStyle = '#5c3a21';
                ctx.fillRect(-26, -2, 76, 4);
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(50, -9, 3, 18);
                ctx.fillRect(50, -9, 16, 2.5);
                ctx.fillRect(50, -1.2, 20, 2.5);
                ctx.fillRect(50, 6.5, 16, 2.5);
            } else if (type === 'mace') {
                ctx.fillStyle = '#5c3a21';
                ctx.fillRect(-2, -38, 4, 42);
                ctx.fillStyle = '#64748b';
                ctx.beginPath();
                ctx.arc(0, -40, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(-10, -41, 20, 2);
                ctx.fillRect(-1, -50, 2, 20);
            } else if (type === 'axe') {
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

    Game.GladiatorRenderer = GladiatorRenderer;
})(window.LudusGame = window.LudusGame || {});