(function (Game) {
    class ArenaRenderer {
        static draw(ctx, scene) {
            const t = scene.crowdTime || 0;
            const regionId = scene.regionId || 'capua';

            const themes = {
                capua: {
                    skyTop: '#090b10', skyMid: '#2b1518', skyBot: '#6b2c20',
                    stone: '#1f1918', wall: '#2d241f',
                    sandTop: '#8c6943', sandMid: '#6e4f30', sandBot: '#362414'
                },
                provincial: {
                    skyTop: '#0b1018', skyMid: '#1e2c3d', skyBot: '#5c4b37',
                    stone: '#23201e', wall: '#342f2a',
                    sandTop: '#96764d', sandMid: '#755736', sandBot: '#3b2917'
                },
                colosseum: {
                    skyTop: '#12080c', skyMid: '#3d151b', skyBot: '#8f3b24',
                    stone: '#261d19', wall: '#382a22',
                    sandTop: '#a17a49', sandMid: '#7d5b34', sandBot: '#402a14'
                },
                imperial: {
                    skyTop: '#140914', skyMid: '#421324', skyBot: '#a35424',
                    stone: '#291e1a', wall: '#3d2c22',
                    sandTop: '#b0864a', sandMid: '#855e30', sandBot: '#452c12'
                }
            };
            const pal = themes[regionId] || themes.capua;

            // 1. Bölgeye Göre Alacakaranlık Gökyüzü
            const skyGrad = ctx.createLinearGradient(0, -100, 0, 340);
            skyGrad.addColorStop(0, pal.skyTop);
            skyGrad.addColorStop(0.55, pal.skyMid);
            skyGrad.addColorStop(1, pal.skyBot);
            ctx.fillStyle = skyGrad;
            ctx.fillRect(-160, -120, 1280, 500);

            // 2. Karanlık Taş Kolezyum Kemerleri
            ctx.fillStyle = pal.stone;
            ctx.fillRect(-160, 138, 1280, 185);

            for (let x = -100; x < 1080; x += 95) {
                ctx.fillStyle = '#110d0c';
                ctx.beginPath();
                ctx.roundRect(x, 160, 62, 102, [30, 30, 0, 0]);
                ctx.fill();

                if (regionId === 'imperial' || regionId === 'colosseum') {
                    ctx.fillStyle = regionId === 'imperial' ? '#7c1818' : '#591616';
                    ctx.fillRect(x + 25, 166, 12, 42);
                    ctx.fillStyle = '#d4af37';
                    ctx.fillRect(x + 24, 164, 14, 3);
                }

                // Tribündeki karanlık siluetler
                for (let s = 0; s < 3; s++) {
                    const bounce = Math.abs(Math.sin(t + x + s)) * (1.5 + (scene.crowdExcitement || 0) * 7);
                    ctx.fillStyle = '#070505';
                    ctx.beginPath();
                    ctx.arc(x + 15 + s * 16, 248 - bounce, 5.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(x + 10 + s * 16, 252 - bounce, 10, 12);
                }

                // Her iki kemerde bir titreyen Meşale
                if (Math.abs(x) % 190 < 95) {
                    const tx = x - 16;
                    const ty = 212;
                    const flicker = Math.sin(performance.now() * 0.015 + x) * 2.5;

                    const glow = ctx.createRadialGradient(tx, ty - 6, 2, tx, ty - 6, 42 + flicker * 2);
                    glow.addColorStop(0, 'rgba(255, 140, 30, 0.45)');
                    glow.addColorStop(1, 'rgba(255, 60, 0, 0)');
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(tx, ty - 6, 46, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#3d2817';
                    ctx.fillRect(tx - 2, ty, 4, 18);
                    ctx.fillStyle = '#ff922b';
                    ctx.beginPath();
                    ctx.arc(tx, ty - 4 + flicker * 0.4, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Taş Duvar & Demir Parmaklık
            ctx.fillStyle = pal.wall;
            ctx.fillRect(-160, 290, 1280, 40);
            ctx.fillStyle = regionId === 'imperial' ? '#9e7c2e' : '#42362f';
            ctx.fillRect(-160, 287, 1280, 5);

            // 3. Koyu, Tozlu ve Kan İzli Kum Zemin
            const sandGrad = ctx.createLinearGradient(0, 325, 0, 560);
            sandGrad.addColorStop(0, pal.sandTop);
            sandGrad.addColorStop(0.35, pal.sandMid);
            sandGrad.addColorStop(1, pal.sandBot);
            ctx.fillStyle = sandGrad;
            ctx.fillRect(-160, 325, 1280, 260);

            // Eski savaşlardan kalan soluk kan lekeleri
            ctx.fillStyle = 'rgba(95, 14, 14, 0.24)';
            ctx.beginPath();
            ctx.ellipse(320, 360, 34, 7, 0, 0, Math.PI * 2);
            ctx.ellipse(610, 358, 24, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Kum gölge çizgileri
            ctx.fillStyle = 'rgba(25, 16, 8, 0.25)';
            for (let i = 0; i < 24; i++) {
                const sx = (i * 53) % 980 - 20;
                const sy = 342 + ((i * 31) % 65);
                ctx.fillRect(sx, sy, 20 + (i % 15), 2);
            }

            // Çivili Demir/Ahşap Arena Kazıkları
            ctx.fillStyle = '#2b1d14';
            ctx.fillRect(58, 270, 14, 90);
            ctx.fillRect(888, 270, 14, 90);
            ctx.fillStyle = '#6c757d';
            ctx.beginPath();
            ctx.moveTo(58, 270); ctx.lineTo(65, 256); ctx.lineTo(72, 270);
            ctx.moveTo(888, 270); ctx.lineTo(895, 256); ctx.lineTo(902, 270);
            ctx.fill();
        }
    }

    Game.ArenaRenderer = ArenaRenderer;
})(window.LudusGame = window.LudusGame || {});