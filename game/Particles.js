(function (Game, Engine) {
    class ParticleSystem extends Engine.Node2D {
        constructor() {
            super('ParticleSystem');
            this.particles = [];
            this.texts = [];
        }

        spawnBlood(x, y, dir, count = 10) {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    type: 'blood',
                    x,
                    y: y - 38 + (Math.random() - 0.5) * 20,
                    vx: dir * (60 + Math.random() * 140) + (Math.random() - 0.5) * 60,
                    vy: -80 - Math.random() * 140,
                    size: 2.5 + Math.random() * 3.5,
                    life: 0.4 + Math.random() * 0.35,
                    maxLife: 0.75,
                    color: Math.random() > 0.3 ? '#c81d25' : '#800f13'
                });
            }
        }

        spawnSparks(x, y, dir, count = 12) {
            for (let i = 0; i < count; i++) {
                const angle = (Math.random() - 0.5) * 2.2;
                const speed = 130 + Math.random() * 200;
                this.particles.push({
                    type: 'spark',
                    x,
                    y: y - 42,
                    vx: dir * Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 40,
                    size: 2 + Math.random() * 2,
                    life: 0.2 + Math.random() * 0.2,
                    maxLife: 0.4,
                    color: Math.random() > 0.4 ? '#ffe066' : '#ffffff'
                });
            }
        }

        spawnDust(x, y, count = 5) {
            for (let i = 0; i < count; i++) {
                this.particles.push({
                    type: 'dust',
                    x: x + (Math.random() - 0.5) * 20,
                    y: y - 2,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -15 - Math.random() * 35,
                    size: 4 + Math.random() * 6,
                    life: 0.35 + Math.random() * 0.25,
                    maxLife: 0.6,
                    color: 'rgba(218, 188, 140, 0.55)'
                });
            }
        }

        spawnText(x, y, text, color = '#ffffff', size = 16) {
            this.texts.push({
                x: x + (Math.random() - 0.5) * 18,
                y: y - 75,
                vy: -48,
                text,
                color,
                size,
                life: 0.85,
                maxLife: 0.85
            });
        }

        _process(delta) {
            for (const p of this.particles) {
                p.life -= delta;
                if (p.type === 'blood' || p.type === 'spark') {
                    p.vy += 480 * delta;
                }
                p.x += p.vx * delta;
                p.y += p.vy * delta;

                if (p.y > 355 && p.type === 'blood') {
                    p.y = 355;
                    p.vx *= 0.2;
                    p.vy = 0;
                }
            }
            this.particles = this.particles.filter(p => p.life > 0);

            for (const t of this.texts) {
                t.life -= delta;
                t.y += t.vy * delta;
                t.vy *= 0.96;
            }
            this.texts = this.texts.filter(t => t.life > 0);
        }

        _draw(ctx) {
            for (const p of this.particles) {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;

                if (p.type === 'spark') {
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = p.size;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            for (const t of this.texts) {
                const alpha = Math.min(1, (t.life / t.maxLife) * 1.4);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${t.size}px "Segoe UI", sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                ctx.strokeText(t.text, t.x, t.y);
                ctx.fillStyle = t.color;
                ctx.fillText(t.text, t.x, t.y);
                ctx.restore();
            }
        }
    }

    Game.ParticleSystem = ParticleSystem;
})(window.LudusGame = window.LudusGame || {}, window.LudusEngine);