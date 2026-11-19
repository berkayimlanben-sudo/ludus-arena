(function (Game) {
    class LudusRenderer {
        static draw(ctx, scene) {
            // 1. Karanlık Akşamüstü Gökyüzü
            const sky = ctx.createLinearGradient(0, 0, 0, 180);
            sky.addColorStop(0, '#0d1017');
            sky.addColorStop(0.6, '#2b1b1d');
            sky.addColorStop(1, '#5e2c21');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, 960, 260);

            // 2. Koyu Taş Avlu Duvarı & Kemerler
            ctx.fillStyle = '#211a17';
            ctx.fillRect(0, 90, 960, 105);

            for (let x = 35; x < 920; x += 110) {
                ctx.fillStyle = '#120e0c';
                ctx.beginPath();
                ctx.roundRect(x, 105, 65, 85, [32, 32, 0, 0]);
                ctx.fill();
            }

            // 3. Sol Taraf: Revir Çardağı
            const infLvl = scene.buildings.infirmary || 1;
            ctx.fillStyle = '#3b2414';
            ctx.fillRect(42, 118, 8, 97);
            ctx.fillRect(155, 118, 8, 97);
            ctx.fillStyle = infLvl >= 2 ? '#6e1d24' : '#4a3224';
            ctx.beginPath();
            ctx.moveTo(32, 122);
            ctx.lineTo(102, 95);
            ctx.lineTo(172, 122);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#2e1d12';
            ctx.fillRect(62, 198, 78, 8);
            ctx.fillRect(66, 206, 6, 9);
            ctx.fillRect(130, 206, 6, 9);
            if (infLvl >= 3) {
                ctx.fillStyle = '#b5a895';
                ctx.fillRect(66, 194, 20, 5);
            }

            // 4. Orta: Demirci Ocağı & Kor Ateşi
            const smithLvl = scene.buildings.blacksmith || 1;
            ctx.fillStyle = '#1c1816';
            ctx.fillRect(390, 142, 74, 54);

            const fireGlow = 0.7 + Math.sin(scene.animTime * 8) * 0.2;
            const glowGrad = ctx.createRadialGradient(427, 180, 4, 427, 180, 48);
            glowGrad.addColorStop(0, `rgba(255, 110, 20, ${fireGlow})`);
            glowGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(427, 180, 48, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = `rgba(255, ${smithLvl >= 2 ? 130 : 85}, 25, 0.95)`;
            ctx.beginPath();
            ctx.arc(427, 182, smithLvl >= 2 ? 15 : 11, Math.PI, 0);
            ctx.fill();

            ctx.fillStyle = smithLvl >= 3 ? '#868e96' : '#495057';
            ctx.fillRect(475, 196, 30, 8);
            ctx.fillRect(482, 204, 14, 11);

            // 5. Koyu Avlu Zemini
            const floor = ctx.createLinearGradient(0, 195, 0, 260);
            floor.addColorStop(0, '#6e5033');
            floor.addColorStop(1, '#362414');
            ctx.fillStyle = floor;
            ctx.fillRect(0, 195, 960, 65);

            ctx.fillStyle = '#332419';
            ctx.fillRect(0, 193, 960, 5);

            // 6. Sağ Taraf: Sert Eğitim Kuklası (Palus)
            const trainLvl = scene.buildings.trainingYard || 1;
            ctx.save();
            ctx.translate(scene.dummy.x, scene.dummy.y);

            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.rotate(scene.dummy.angle);

            ctx.fillStyle = '#4a2c17';
            ctx.fillRect(-9, -76, 18, 76);
            ctx.fillStyle = '#361f0f';
            ctx.fillRect(-26, -54, 52, 9);

            ctx.fillStyle = trainLvl >= 3 ? '#6c757d' : '#5e3c23';
            ctx.beginPath();
            ctx.arc(0, -82, 11, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#9c7e58';
            ctx.fillRect(-10, -45, 20, 8);
            ctx.fillRect(-10, -64, 20, 6);
            ctx.restore();

            if (trainLvl >= 2) {
                ctx.fillStyle = '#2e1d12';
                ctx.fillRect(835, 165, 6, 50);
                ctx.fillRect(885, 165, 6, 50);
                ctx.fillRect(830, 175, 66, 5);
                ctx.fillStyle = '#adb5bd';
                ctx.fillRect(850, 158, 3, 42);
                ctx.fillRect(868, 162, 3, 38);
            }
        }
    }

    Game.LudusRenderer = LudusRenderer;
})(window.LudusGame = window.LudusGame || {});