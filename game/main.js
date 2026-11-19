(function () {
    const Engine = window.LudusEngine;
    const Game = window.LudusGame;

    const canvas = document.getElementById('arena-canvas');
    const tree = new Engine.SceneTree(canvas);

    // HUD Elemanları
    const leftNameEl = document.getElementById('left-name');
    const leftGearEl = document.getElementById('left-gear');
    const leftHpBar = document.getElementById('left-hp-bar');
    const leftHpText = document.getElementById('left-hp-text');
    const leftStamBar = document.getElementById('left-stam-bar');
    const leftStateEl = document.getElementById('left-state');

    const rightNameEl = document.getElementById('right-name');
    const rightGearEl = document.getElementById('right-gear');
    const rightHpBar = document.getElementById('right-hp-bar');
    const rightHpText = document.getElementById('right-hp-text');
    const rightStamBar = document.getElementById('right-stam-bar');
    const rightStateEl = document.getElementById('right-state');

    const winnerBanner = document.getElementById('winner-banner');
    const winnerText = document.getElementById('winner-text');
    const battleLogEl = document.getElementById('battle-log');
    const matchupSelect = document.getElementById('matchup-select');
    const restartBtn = document.getElementById('restart-btn');
    const speedBtns = document.querySelectorAll('.speed-btn');

    let currentArena = null;

    function addLog(msg) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = msg;
        battleLogEl.prepend(line);
        while (battleLogEl.children.length > 25) {
            battleLogEl.removeChild(battleLogEl.lastChild);
        }
    }

    function startMatch() {
        battleLogEl.innerHTML = '';
        winnerBanner.classList.add('hidden');

        currentArena = new Game.ArenaScene(matchupSelect.value);
        currentArena.onBattleLog.connect(addLog);
        currentArena.onMatchFinished.connect((winner) => {
            winnerText.textContent = `🏆 ZAFER: ${winner.gladiatorName.toUpperCase()}!`;
            winnerBanner.classList.remove('hidden');
        });

        tree.changeScene(currentArena);

        // Başlangıç ekipman bilgilerini yaz
        const L = currentArena.leftFighter;
        const R = currentArena.rightFighter;
        leftNameEl.textContent = L.gladiatorName;
        leftGearEl.textContent = `${L.weapon.name}${L.shield ? ' + ' + L.shield.name : ''}`;
        rightNameEl.textContent = R.gladiatorName;
        rightGearEl.textContent = `${R.weapon.name}${R.shield ? ' + ' + R.shield.name : ''}`;
    }

    tree.onFrameUpdate.connect(() => {
        if (!currentArena) return;
        const L = currentArena.leftFighter;
        const R = currentArena.rightFighter;
        if (!L || !R) return;

        leftHpBar.style.width = `${(L.hp / L.maxHp) * 100}%`;
        leftHpText.textContent = `${L.hp} / ${L.maxHp}`;
        leftStamBar.style.width = `${(L.stamina / L.maxStamina) * 100}%`;
        leftStateEl.textContent = L.getStateLabel();

        rightHpBar.style.width = `${(R.hp / R.maxHp) * 100}%`;
        rightHpText.textContent = `${R.hp} / ${R.maxHp}`;
        rightStamBar.style.width = `${(R.stamina / R.maxStamina) * 100}%`;
        rightStateEl.textContent = R.getStateLabel();
    });

    speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            speedBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const speed = parseFloat(btn.dataset.speed);
            if (speed === 0) {
                tree.paused = true;
            } else {
                tree.paused = false;
                tree.timeScale = speed;
            }
        });
    });

    restartBtn.addEventListener('click', startMatch);
    matchupSelect.addEventListener('change', startMatch);

    startMatch();
    tree.start();
})();