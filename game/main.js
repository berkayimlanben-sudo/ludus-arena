(function () {
    const Engine = window.LudusEngine;
    const Game = window.LudusGame;
    const Data = window.LudusData;

    const ludus = new Game.LudusManager();
    const canvas = document.getElementById('arena-canvas');
    const tree = new Engine.SceneTree(canvas);
    tree.paused = true;
    tree.start();

    let activeTab = 'ludus';
    let matchInProgress = false;
    let currentArena = null;

    // Üst Bar
    const uiDay = document.getElementById('ui-day');
    const uiGold = document.getElementById('ui-gold');
    const uiFame = document.getElementById('ui-fame');
    const toastEl = document.getElementById('toast-msg');

    // Arena Elemanları
    const arenaPrepView = document.getElementById('arena-prep-view');
    const arenaCombatView = document.getElementById('arena-combat-view');
    const arenaFighterSelect = document.getElementById('arena-fighter-select');
    const arenaOpponentsList = document.getElementById('arena-opponents-list');

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
    const returnLudusBtn = document.getElementById('return-ludus-btn');
    const battleLogEl = document.getElementById('battle-log');

    let toastTimer = null;
    function showToast(msg, isError = false) {
        toastEl.textContent = msg;
        toastEl.className = `toast ${isError ? 'error' : 'ok'}`;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toastEl.classList.add('hidden'); }, 2600);
    }

    function switchTab(tabName) {
        if (matchInProgress) {
            showToast('Önce arenadaki dövüşün bitmesini bekle!', true);
            return;
        }
        activeTab = tabName;
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('hidden', p.id !== `tab-${tabName}`);
        });
        renderAll();
    }

    function renderTopStats() {
        uiDay.textContent = `Gün ${ludus.state.day}`;
        uiGold.textContent = `🪙 ${ludus.state.gold}`;
        uiFame.textContent = `🏛️ ${ludus.state.fame} Şöhret`;
    }

    function renderLudusTab() {
        const rosterEl = document.getElementById('roster-list');
        const detailEl = document.getElementById('selected-gladiator-panel');
        const buildingsEl = document.getElementById('buildings-list');

        // 1. Kadro Listesi
        rosterEl.innerHTML = '';
        ludus.state.roster.forEach(g => {
            const maxHp = ludus.getGladiatorMaxHp(g);
            const pct = Math.round((g.currentHp / maxHp) * 100);
            const isSel = g.id === ludus.state.selectedGladiatorId;
            const w = Data.WEAPONS[g.weaponId];

            const card = document.createElement('div');
            card.className = `roster-card ${isSel ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="rc-top">
                    <strong>${g.name}</strong>
                    <span class="rc-origin">${g.origin}</span>
                </div>
                <div class="rc-sub">${w.name} • ${g.wins}G / ${g.losses}M</div>
                <div class="bar-wrap hp small">
                    <div class="bar-fill" style="width:${pct}%"></div>
                    <span class="bar-label">${g.currentHp} / ${maxHp}</span>
                </div>
            `;
            card.addEventListener('click', () => {
                ludus.state.selectedGladiatorId = g.id;
                renderLudusTab();
            });
            rosterEl.appendChild(card);
        });

        // 2. Seçili Gladyatör Detayı
        const sel = ludus.getSelectedGladiator();
        if (!sel) {
            detailEl.innerHTML = '<p>Kadroda gladyatör yok. Köle Pazarından birini al!</p>';
        } else {
            const sum = ludus.getGladiatorSummary(sel);
            const healCost = ludus.getHealCost(sel);
            const cap = ludus.getStatCap();

            const renderEquipSelect = (label, catKey, dict, curId) => {
                const inv = ludus.state.inventory[catKey];
                let opts = `<option value="${curId}" selected>${dict[curId].name} (Takılı)</option>`;
                Object.keys(dict).forEach(id => {
                    if (id === curId) return;
                    const count = inv[id] || 0;
                    const isFree = (id === 'none' || id === 'tunic');
                    if (isFree || count > 0) {
                        opts += `<option value="${id}">${dict[id].name}${isFree ? '' : ` (Çantada: ${count})`}</option>`;
                    }
                });
                return `<label>${label} <select class="equip-sel" data-cat="${catKey}">${opts}</select></label>`;
            };

            const statRow = (key, label) => {
                const cost = ludus.getTrainingCost(sel, key);
                const maxed = sel.stats[key] >= cap;
                return `
                    <div class="train-box">
                        <span>${label}: <strong>${sel.stats[key]}</strong> / ${cap}</span>
                        <button class="train-btn" data-stat="${key}" ${maxed ? 'disabled' : ''}>
                            ${maxed ? 'MAKS' : `+1 Eğit (🪙${cost})`}
                        </button>
                    </div>
                `;
            };

            detailEl.innerHTML = `
                <div class="detail-header">
                    <div>
                        <h3>${sel.name} <span class="rc-origin">(${sel.origin})</span></h3>
                        <div class="summary-line">Can: ${sel.currentHp}/${sum.maxHp} | Zırh: ${sum.def} | Hız: ${sum.spd} | Ağırlık: ${sum.weight}</div>
                    </div>
                    <button id="btn-heal-glad" class="heal-btn" ${healCost === 0 ? 'disabled' : ''}>
                        ${healCost === 0 ? '💚 Can Dolu' : `🩹 İyileştir (🪙${healCost})`}
                    </button>
                </div>

                <div class="equip-grid">
                    ${renderEquipSelect('Silah', 'weapons', Data.WEAPONS, sel.weaponId)}
                    ${renderEquipSelect('Kalkan', 'shields', Data.SHIELDS, sel.shieldId)}
                    ${renderEquipSelect('Zırh', 'armors', Data.ARMORS, sel.armorId)}
                    ${renderEquipSelect('Miğfer', 'helmets', Data.HELMETS, sel.helmetId)}
                </div>

                <div class="train-grid">
                    ${statRow('strength', 'Güç')}
                    ${statRow('agility', 'Çeviklik')}
                    ${statRow('vitality', 'Canlılık')}
                </div>
            `;

            detailEl.querySelectorAll('.equip-sel').forEach(sEl => {
                sEl.addEventListener('change', () => {
                    const res = ludus.equipItem(sel.id, sEl.dataset.cat, sEl.value);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    renderAll();
                });
            });

            detailEl.querySelectorAll('.train-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const res = ludus.trainStat(sel.id, btn.dataset.stat);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else showToast(`${sel.name} antrenman yaptı!`);
                    renderAll();
                });
            });

            const healBtn = document.getElementById('btn-heal-glad');
            if (healBtn) {
                healBtn.addEventListener('click', () => {
                    const res = ludus.healGladiator(sel.id);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else showToast(`${sel.name} tedavi edildi!`);
                    renderAll();
                });
            }
        }

        // 3. Ludus Binaları
        buildingsEl.innerHTML = '';
        Object.values(Data.BUILDINGS).forEach(b => {
            const lvl = ludus.state.buildings[b.id];
            const maxed = lvl >= b.maxLevel;
            const cost = ludus.getBuildingUpgradeCost(b.id);

            const card = document.createElement('div');
            card.className = 'building-card';
            card.innerHTML = `
                <div class="b-title">${b.icon} ${b.name} <span class="badge">Sv. ${lvl}/${b.maxLevel}</span></div>
                <p class="b-desc">${b.desc}</p>
                <button class="b-up-btn" ${maxed ? 'disabled' : ''}>
                    ${maxed ? 'Maksimum Seviye' : `Yükselt (🪙${cost})`}
                </button>
            `;
            card.querySelector('.b-up-btn').addEventListener('click', () => {
                const res = ludus.upgradeBuilding(b.id);
                if (!res.ok) showToast(res.msg, true);
                else showToast(`${b.name} Seviye ${lvl + 1} oldu!`);
                renderAll();
            });
            buildingsEl.appendChild(card);
        });
    }

    function renderShopTab() {
        const container = document.getElementById('shop-items');
        container.innerHTML = '';
        const smithLvl = ludus.state.buildings.blacksmith;

        const sections = [
            { title: '⚔️ Silahlar', key: 'weapons', dict: Data.WEAPONS },
            { title: '🛡️ Kalkanlar', key: 'shields', dict: Data.SHIELDS },
            { title: '🦺 Zırhlar', key: 'armors', dict: Data.ARMORS },
            { title: '🪖 Miğferler', key: 'helmets', dict: Data.HELMETS }
        ];

        sections.forEach(sec => {
            const secDiv = document.createElement('div');
            secDiv.className = 'shop-section';
            secDiv.innerHTML = `<h4>${sec.title}</h4><div class="shop-grid"></div>`;
            const grid = secDiv.querySelector('.shop-grid');

            Object.values(sec.dict).forEach(item => {
                if (item.price === 0) return;
                const locked = item.tier > smithLvl;
                const ownedCount = ludus.state.inventory[sec.key][item.id] || 0;

                const card = document.createElement('div');
                card.className = `shop-card ${locked ? 'locked' : ''}`;
                card.innerHTML = `
                    <div class="sc-top">
                        <strong>${item.name}</strong>
                        <span class="badge">Sv.${item.tier}</span>
                    </div>
                    <div class="sc-desc">${item.desc} • Ağr: ${item.weight}</div>
                    <div class="sc-bot">
                        <span class="owned-txt">Çantada: ${ownedCount}</span>
                        <button class="buy-btn" ${locked ? 'disabled' : ''}>
                            ${locked ? `🔒 Demirci Sv.${item.tier}` : `Satın Al (🪙${item.price})`}
                        </button>
                    </div>
                `;
                card.querySelector('.buy-btn').addEventListener('click', () => {
                    const res = ludus.buyItem(sec.key, item.id);
                    if (!res.ok) showToast(res.msg, true);
                    else showToast(`${item.name} satın alındı!`);
                    renderAll();
                });
                grid.appendChild(card);
            });

            container.appendChild(secDiv);
        });
    }

    function renderMarketTab() {
        const listEl = document.getElementById('market-list');
        listEl.innerHTML = '';

        ludus.state.marketRecruits.forEach(rec => {
            const w = Data.WEAPONS[rec.weaponId];
            const a = Data.ARMORS[rec.armorId];
            const card = document.createElement('div');
            card.className = 'market-card';
            card.innerHTML = `
                <div class="mc-head">
                    <strong>${rec.name}</strong>
                    <span class="rc-origin">${rec.origin}</span>
                </div>
                <div class="mc-stats">
                    Güç: <b>${rec.stats.strength}</b> • Çeviklik: <b>${rec.stats.agility}</b> • Canlılık: <b>${rec.stats.vitality}</b>
                </div>
                <div class="mc-gear">Ekipman: ${w.name} + ${a.name}</div>
                <button class="hire-btn" ${rec.hired ? 'disabled' : ''}>
                    ${rec.hired ? '✅ Kadroya Katıldı' : `Satın Al (🪙${rec.price})`}
                </button>
            `;
            card.querySelector('.hire-btn').addEventListener('click', () => {
                const res = ludus.hireRecruit(rec.id);
                if (!res.ok) showToast(res.msg, true);
                else showToast(`${rec.name} Ludus'a katıldı!`);
                renderAll();
            });
            listEl.appendChild(card);
        });
    }

    function renderArenaTab() {
        arenaPrepView.classList.toggle('hidden', matchInProgress);
        arenaCombatView.classList.toggle('hidden', !matchInProgress);
        if (matchInProgress) return;

        // Gladyatör seçici
        arenaFighterSelect.innerHTML = '';
        ludus.state.roster.forEach(g => {
            const maxHp = ludus.getGladiatorMaxHp(g);
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = `${g.name} (Can: ${g.currentHp}/${maxHp} • ${Data.WEAPONS[g.weaponId].name})`;
            if (g.id === ludus.state.selectedGladiatorId) opt.selected = true;
            arenaFighterSelect.appendChild(opt);
        });

        arenaFighterSelect.onchange = () => {
            ludus.state.selectedGladiatorId = arenaFighterSelect.value;
        };

        // Rakip sözleşmeleri
        arenaOpponentsList.innerHTML = '';
        ludus.state.dailyOpponents.forEach(opp => {
            const w = Data.WEAPONS[opp.weaponId];
            const s = Data.SHIELDS[opp.shieldId];
            const a = Data.ARMORS[opp.armorId];
            const h = Data.HELMETS[opp.helmetId];

            const card = document.createElement('div');
            card.className = `opp-card ${opp.completed ? 'done' : ''}`;
            card.innerHTML = `
                <div class="oc-top">
                    <span class="badge">${opp.tierName} (${opp.badge})</span>
                    <strong>${opp.name}</strong>
                </div>
                <div class="oc-scout">
                    <div>❤️ Can: ~${opp.maxHp} | Güç ${opp.stats.strength} / Çev ${opp.stats.agility}</div>
                    <div>⚔️ ${w.name}${s.hasShield ? ' + ' + s.name : ''}</div>
                    <div>🛡️ ${a.name}${h.id !== 'none' ? ' + ' + h.name : ''}</div>
                </div>
                <div class="oc-reward">Ödül: 🪙${opp.rewardGold} Altın • 🏛️ +${opp.rewardFame} Şöhret</div>
                <button class="primary-btn fight-start-btn" ${opp.completed ? 'disabled' : ''}>
                    ${opp.completed ? '✔️ Tamamlandı' : '⚔️ Arenaya Çık!'}
                </button>
            `;
            card.querySelector('.fight-start-btn').addEventListener('click', () => {
                startArenaMatch(arenaFighterSelect.value, opp);
            });
            arenaOpponentsList.appendChild(card);
        });
    }

    function addLog(msg) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = msg;
        battleLogEl.prepend(line);
        while (battleLogEl.children.length > 25) {
            battleLogEl.removeChild(battleLogEl.lastChild);
        }
    }

    function startArenaMatch(myGladId, opp) {
        const myGlad = ludus.state.roster.find(g => g.id === myGladId);
        if (!myGlad) return;

        const maxHp = ludus.getGladiatorMaxHp(myGlad);
        if (myGlad.currentHp < Math.ceil(maxHp * 0.25)) {
            showToast(`${myGlad.name} çok yaralı! Önce Revirde iyileştir veya günü bitir.`, true);
            return;
        }

        matchInProgress = true;
        arenaPrepView.classList.add('hidden');
        arenaCombatView.classList.remove('hidden');
        battleLogEl.innerHTML = '';
        winnerBanner.classList.add('hidden');

        const leftConfig = {
            name: myGlad.name,
            skinColor: myGlad.skinColor,
            currentHp: myGlad.currentHp,
            stats: Object.assign({}, myGlad.stats),
            weapon: Data.WEAPONS[myGlad.weaponId],
            shield: Data.SHIELDS[myGlad.shieldId],
            armor: Data.ARMORS[myGlad.armorId],
            helmet: Data.HELMETS[myGlad.helmetId]
        };

        const rightConfig = {
            name: opp.name,
            skinColor: opp.skinColor,
            stats: Object.assign({}, opp.stats),
            weapon: Data.WEAPONS[opp.weaponId],
            shield: Data.SHIELDS[opp.shieldId],
            armor: Data.ARMORS[opp.armorId],
            helmet: Data.HELMETS[opp.helmetId]
        };

        currentArena = new Game.ArenaScene(leftConfig, rightConfig);
        currentArena.onBattleLog.connect(addLog);

        currentArena.onMatchFinished.connect((winner) => {
            const didWin = winner === currentArena.leftFighter;
            const res = ludus.recordMatchResult(myGlad.id, opp.id, didWin, currentArena.leftFighter.hp);
            renderTopStats();

            if (didWin) {
                winnerText.textContent = `🏆 ZAFER! +${res.goldEarned} Altın, +${res.fameEarned} Şöhret`;
            } else {
                winnerText.textContent = `💀 YENİLGİ! (${myGlad.name} yaralı düştü • +${res.goldEarned} Altın)`;
            }
            winnerBanner.classList.remove('hidden');
        });

        tree.changeScene(currentArena);
        tree.paused = false;

        const L = currentArena.leftFighter;
        const R = currentArena.rightFighter;
        leftNameEl.textContent = L.gladiatorName;
        leftGearEl.textContent = `${L.weapon.name}${L.shield.hasShield ? ' + ' + L.shield.name : ''} • ${L.armor.name}`;
        rightNameEl.textContent = R.gladiatorName;
        rightGearEl.textContent = `${R.weapon.name}${R.shield.hasShield ? ' + ' + R.shield.name : ''} • ${R.armor.name}`;
    }

    returnLudusBtn.addEventListener('click', () => {
        matchInProgress = false;
        tree.paused = true;
        switchTab('ludus');
    });

    tree.onFrameUpdate.connect(() => {
        if (!matchInProgress || !currentArena) return;
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

    function renderAll() {
        renderTopStats();
        if (activeTab === 'ludus') renderLudusTab();
        else if (activeTab === 'shop') renderShopTab();
        else if (activeTab === 'market') renderMarketTab();
        else if (activeTab === 'arena') renderArenaTab();
    }

    // Event Bağlantıları
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (matchInProgress) return;
        ludus.nextDay();
        showToast(`Gün ${ludus.state.day} başladı! Kadro dinlendi ve yeni rakipler geldi.`);
        renderAll();
    });

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const speed = parseFloat(btn.dataset.speed);
            if (speed === 0) tree.paused = true;
            else {
                if (matchInProgress) tree.paused = false;
                tree.timeScale = speed;
            }
        });
    });

    document.getElementById('sound-btn').addEventListener('click', (e) => {
        Game.SoundFX.enabled = !Game.SoundFX.enabled;
        e.target.textContent = Game.SoundFX.enabled ? '🔊 Ses' : '🔇 Sessiz';
    });

    // Save / Load / Reset
    document.getElementById('btn-export-save').addEventListener('click', () => {
        const blob = new Blob([ludus.exportSaveJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ludus-save-gun${ludus.state.day}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('input-import-save').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (ludus.importSaveJSON(reader.result)) {
                showToast('Kayıt dosyası başarıyla yüklendi!');
                renderAll();
            } else {
                showToast('Geçersiz kayıt dosyası!', true);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });

    document.getElementById('btn-reset-save').addEventListener('click', () => {
        if (matchInProgress) return;
        if (confirm('Tüm ilerlemen silinip sıfırdan başlanacak, emin misin?')) {
            ludus.newGame();
            showToast('Yeni Ludus başlatıldı!');
            renderAll();
        }
    });

    renderAll();
})();