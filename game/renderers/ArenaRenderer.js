(function (Game) {
    class ArenaRenderer {
        static draw(ctx, scene) {
            const t = scene.crowdTime || 0;

            // 1. Dumanlı Alacakaranlık Gökyüzü
            const skyGrad = ctx.createLinearGradient(0, -100, 0, 340);
            skyGrad.addColorStop(0, '#090b10');
            skyGrad.addColorStop(0.55, '#2b1518');
            skyGrad.addColorStop(1, '#6b2c20');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(-160, -120, 1280, 500);

            // 2. Karanlık Taş Kolezyum Kemerleri
            ctx.fillStyle = '#1f1918';
            ctx.fillRect(-160, 138, 1280, 185);

            for (let x = -100; x < 1080; x += 95) {
                ctx.fillStyle = '#110d0c';
                ctx.beginPath();
                ctx.roundRect(x, 160, 62, 102, [30, 30, 0, 0]);
                ctx.fill();

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
            ctx.fillStyle = '#2d241f';
            ctx.fillRect(-160, 290, 1280, 40);
            ctx.fillStyle = '#42362f';
            ctx.fillRect(-160, 287, 1280, 5);

            // 3. Koyu, Tozlu ve Kan İzli Kum Zemin
            const sandGrad = ctx.createLinearGradient(0, 325, 0, 560);
            sandGrad.addColorStop(0, '#8c6943');
            sandGrad.addColorStop(0.35, '#6e4f30');
            sandGrad.addColorStop(1, '#362414');
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