(function (Game) {
    class ArenaRenderer {
        static draw(ctx, scene) {
            // 1. Gökyüzü
            const skyGrad = ctx.createLinearGradient(0, -100, 0, 360);
            skyGrad.addColorStop(0, '#1e2438');
            skyGrad.addColorStop(0.55, '#6b3e45');
            skyGrad.addColorStop(1, '#d67e49');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(-160, -120, 1280, 500);

            // 2. Kolezyum Kemerleri
            ctx.fillStyle = '#3a2c29';
            ctx.fillRect(-160, 145, 1280, 175);

            ctx.fillStyle = '#251a18';
            for (let x = -100; x < 1080; x += 90) {
                ctx.beginPath();
                ctx.roundRect(x, 165, 58, 95, [28, 28, 0, 0]);
                ctx.fill();

                for (let s = 0; s < 3; s++) {
                    const bounce = Math.abs(Math.sin(scene.crowdTime + x + s)) * (2 + scene.crowdExcitement * 7);
                    ctx.fillStyle = '#140e0d';
                    ctx.beginPath();
                    ctx.arc(x + 14 + s * 15, 246 - bounce, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillRect(x + 9 + s * 15, 250 - bounce, 10, 12);
                }
                ctx.fillStyle = '#251a18';
            }

            // Duvar sınırı
            ctx.fillStyle = '#5c4638';
            ctx.fillRect(-160, 295, 1280, 35);
            ctx.fillStyle = '#7c624e';
            ctx.fillRect(-160, 292, 1280, 6);

            // 3. Kum Zemin
            const sandGrad = ctx.createLinearGradient(0, 325, 0, 560);
            sandGrad.addColorStop(0, '#c2985d');
            sandGrad.addColorStop(0.3, '#b5884c');
            sandGrad.addColorStop(1, '#78562b');
            ctx.fillStyle = sandGrad;
            ctx.fillRect(-160, 325, 1280, 260);

            ctx.fillStyle = 'rgba(92, 62, 28, 0.25)';
            for (let i = 0; i < 24; i++) {
                const sx = (i * 53) % 980 - 20;
                const sy = 342 + ((i * 31) % 65);
                ctx.fillRect(sx, sy, 18 + (i % 15), 2);
            }

            // Arena kazıkları
            ctx.fillStyle = '#4a3222';
            ctx.fillRect(58, 275, 14, 85);
            ctx.fillRect(888, 275, 14, 85);
        }
    }

    Game.ArenaRenderer = ArenaRenderer;
})(window.LudusGame = window.LudusGame || {});