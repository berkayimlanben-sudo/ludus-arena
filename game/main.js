(function () {
    const Engine = window.LudusEngine;
    const Game = window.LudusGame;
    const Data = window.LudusData;

    const ludus = new Game.LudusManager();

    const ludusCanvas = document.getElementById('ludus-canvas');
    const ludusTree = new Engine.SceneTree(ludusCanvas);
    const ludusScene = new Game.LudusScene();
    ludusTree.changeScene(ludusScene);
    ludusTree.start();

    const arenaCanvas = document.getElementById('arena-canvas');
    const tree = new Engine.SceneTree(arenaCanvas);
    tree.paused = true;
    tree.start();

    let activeTab = 'ludus';
    let matchInProgress = false;
    let currentArena = null;

    const uiDay = document.getElementById('ui-day');
    const uiGold = document.getElementById('ui-gold');
    const uiFame = document.getElementById('ui-fame');
    const toastEl = document.getElementById('toast-msg');
    const devPanel = document.getElementById('dev-panel');

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

    const tacticBtns = {
        AGGRESSIVE: document.getElementById('tactic-aggressive'),
        DEFENSIVE: document.getElementById('tactic-defensive'),
        MORALE: document.getElementById('tactic-morale')
    };

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
        ludusTree.paused = (tabName !== 'ludus');

        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('hidden', p.id !== `tab-${tabName}`);
        });
        renderAll();
    }

    function renderTopStats() {
        const isBoss = ludus.state.day % 5 === 0;
        uiDay.textContent = isBoss ? `👑 Gün ${ludus.state.day} (BOSS!)` : `Gün ${ludus.state.day}`;
        uiGold.textContent = `🪙 ${ludus.state.gold}`;
        uiFame.textContent = `🏛️ ${ludus.state.fame} Şöhret`;
    }

    function renderLudusTab() {
        ludusScene.syncFromState(ludus.state);

        const rosterEl = document.getElementById('roster-list');
        const detailEl = document.getElementById('selected-gladiator-panel');
        const buildingsEl = document.getElementById('buildings-list');

        rosterEl.innerHTML = '';
        ludus.state.roster.forEach(g => {
            const maxHp = ludus.getGladiatorMaxHp(g);
            const pct = Math.round((g.currentHp / maxHp) * 100);
            const isSel = g.id === ludus.state.selectedGladiatorId;
            const w = Data.WEAPONS[g.weaponId];
            const trait = Data.TRAITS[g.traitId];
            const injury = g.injuryId ? Data.INJURIES[g.injuryId] : null;

            const card = document.createElement('div');
            card.className = `roster-card ${isSel ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="rc-top">
                    <strong>${g.name}</strong>
                    <span class="rc-origin">${g.origin}</span>
                </div>
                <div class="rc-tags">
                    ${trait ? `<span class="trait-badge">${trait.name}</span>` : ''}
                    ${injury ? `<span class="injury-badge">🩹 ${injury.name}</span>` : ''}
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

        const sel = ludus.getSelectedGladiator();
        if (!sel) {
            detailEl.innerHTML = '<p>Kadroda gladyatör yok. Köle Pazarından birini al!</p>';
        } else {
            const sum = ludus.getGladiatorSummary(sel);
            const healCost = ludus.getHealCost(sel);
            const cap = ludus.getStatCap();
            const trait = Data.TRAITS[sel.traitId];
            const injury = sel.injuryId ? Data.INJURIES[sel.injuryId] : null;

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
                const isInjuredStat = injury && injury.stat === key;
                const effVal = sum.eff[key];

                return `
                    <div class="train-box">
                        <span>${label}: <strong class="${isInjuredStat ? 'injured-txt' : ''}">${effVal}</strong>${isInjuredStat ? ` (${sel.stats[key]})` : ''} / ${cap}</span>
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
                        <div class="rc-tags" style="margin-top:4px;">
                            ${trait ? `<span class="trait-badge" title="${trait.desc}">${trait.name}: ${trait.desc}</span>` : ''}
                            ${injury ? `<span class="injury-badge">🩹 ${injury.name}: ${injury.desc}</span>` : ''}
                        </div>
                        <div class="summary-line">Can: ${sel.currentHp}/${sum.maxHp} | Zırh: ${sum.def} | Hız: ${sum.spd} | Ağırlık: ${sum.weight}</div>
                    </div>
                    <button id="btn-heal-glad" class="heal-btn" ${healCost === 0 ? 'disabled' : ''}>
                        ${healCost === 0 ? '💚 Sağlıklı' : `🩹 İyileştir (🪙${healCost})`}
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
                    const stat = btn.dataset.stat;
                    const res = ludus.trainStat(sel.id, stat);
                    if (!res.ok && res.msg) {
                        showToast(res.msg, true);
                    } else {
                        const animMap = { strength: 'TRAIN_STR', agility: 'TRAIN_AGI', vitality: 'TRAIN_VIT' };
                        ludusScene.triggerAnim(sel.id, animMap[stat]);
                    }
                    renderAll();
                });
            });

            const healBtn = document.getElementById('btn-heal-glad');
            if (healBtn) {
                healBtn.addEventListener('click', () => {
                    const res = ludus.healGladiator(sel.id);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else ludusScene.triggerAnim(sel.id, 'HEAL');
                    renderAll();
                });
            }
        }

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
            const trait = Data.TRAITS[rec.traitId];
            const card = document.createElement('div');
            card.className = 'market-card';
            card.innerHTML = `
                <div class="mc-head">
                    <strong>${rec.name}</strong>
                    <span class="rc-origin">${rec.origin}</span>
                </div>
                ${trait ? `<div><span class="trait-badge">${trait.name}: ${trait.desc}</span></div>` : ''}
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

        arenaFighterSelect.innerHTML = '';
        ludus.state.roster.forEach(g => {
            const maxHp = ludus.getGladiatorMaxHp(g);
            const injText = g.injuryId ? ` [🩹 ${Data.INJURIES[g.injuryId].name}]` : '';
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = `${g.name} (Can: ${g.currentHp}/${maxHp} • ${Data.WEAPONS[g.weaponId].name})${injText}`;
            if (g.id === ludus.state.selectedGladiatorId) opt.selected = true;
            arenaFighterSelect.appendChild(opt);
        });

        arenaFighterSelect.onchange = () => {
            ludus.state.selectedGladiatorId = arenaFighterSelect.value;
        };

        arenaOpponentsList.innerHTML = '';
        ludus.state.dailyOpponents.forEach(opp => {
            const w = Data.WEAPONS[opp.weaponId];
            const s = Data.SHIELDS[opp.shieldId];
            const a = Data.ARMORS[opp.armorId];
            const h = Data.HELMETS[opp.helmetId];
            const trait = Data.TRAITS[opp.traitId];

            const card = document.createElement('div');
            card.className = `opp-card ${opp.isBoss ? 'boss-card' : ''} ${opp.completed ? 'done' : ''}`;
            card.innerHTML = `
                <div class="oc-top">
                    <span class="badge ${opp.isBoss ? 'boss-badge' : ''}">${opp.tierName}</span>
                    <strong>${opp.name}</strong>
                </div>
                ${trait ? `<div><span class="trait-badge">${trait.name}</span></div>` : ''}
                <div class="oc-scout">
                    <div>❤️ Can: ~${opp.maxHp} | Güç ${opp.stats.strength} / Çev ${opp.stats.agility}</div>
                    <div>⚔️ ${w.name}${s.hasShield ? ' + ' + s.name : ''}</div>
                    <div>🛡️ ${a.name}${h.id !== 'none' ? ' + ' + h.name : ''}</div>
                </div>
                <div class="oc-reward">Ödül: 🪙${opp.rewardGold} Altın • 🏛️ +${opp.rewardFame} Şöhret</div>
                <button class="primary-btn fight-start-btn" ${opp.completed ? 'disabled' : ''}>
                    ${opp.completed ? '✔️ Tamamlandı' : (opp.isBoss ? '👑 BOSS İLE KAPIŞ!' : '⚔️ Arenaya Çık!')}
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
        ludusTree.paused = true;
        arenaPrepView.classList.add('hidden');
        arenaCombatView.classList.remove('hidden');
        battleLogEl.innerHTML = '';
        winnerBanner.classList.add('hidden');

        const leftConfig = {
            name: myGlad.name,
            skinColor: myGlad.skinColor,
            currentHp: myGlad.currentHp,
            trait: Data.TRAITS[myGlad.traitId] || null,
            injury: myGlad.injuryId ? Data.INJURIES[myGlad.injuryId] : null,
            stats: Object.assign({}, myGlad.stats),
            weapon: Data.WEAPONS[myGlad.weaponId],
            shield: Data.SHIELDS[myGlad.shieldId],
            armor: Data.ARMORS[myGlad.armorId],
            helmet: Data.HELMETS[myGlad.helmetId]
        };

        const rightConfig = {
            name: opp.name,
            skinColor: opp.skinColor,
            isBoss: Boolean(opp.isBoss),
            trait: Data.TRAITS[opp.traitId] || null,
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
                const injTxt = res.injuryName ? ` • 🩹 ${res.injuryName}` : '';
                winnerText.textContent = `💀 YENİLGİ! (${myGlad.name} düştü${injTxt} • +${res.goldEarned} Altın)`;
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

    ludusCanvas.addEventListener('click', (e) => {
        const rect = ludusCanvas.getBoundingClientRect();
        const scaleX = ludusCanvas.width / rect.width;
        const clickX = (e.clientX - rect.left) * scaleX;
        const hitId = ludusScene.findActorAt(clickX);
        if (hitId) {
            ludus.state.selectedGladiatorId = hitId;
            renderLudusTab();
        }
    });

    Object.keys(tacticBtns).forEach(type => {
        tacticBtns[type].addEventListener('click', () => {
            if (currentArena) currentArena.issueTactic(type);
        });
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

        const labels = {
            AGGRESSIVE: '🔥 BASTIR!',
            DEFENSIVE: '🛡️ SAVUNMA!',
            MORALE: '🍷 MORAL VER!'
        };
        Object.keys(tacticBtns).forEach(k => {
            const cd = currentArena.tacticCooldowns[k];
            const btn = tacticBtns[k];
            if (currentArena.matchEnded) {
                btn.disabled = true;
                btn.textContent = labels[k];
            } else if (cd > 0) {
                btn.disabled = true;
                btn.textContent = `${labels[k]} (${Math.ceil(cd)}sn)`;
            } else {
                btn.disabled = false;
                btn.textContent = labels[k];
            }
        });
    });

    function renderAll() {
        renderTopStats();
        if (activeTab === 'ludus') renderLudusTab();
        else if (activeTab === 'shop') renderShopTab();
        else if (activeTab === 'market') renderMarketTab();
        else if (activeTab === 'arena') renderArenaTab();
    }

    // TEST / GELİŞTİRİCİ PANELİ
    document.getElementById('btn-toggle-dev').addEventListener('click', () => {
        devPanel.classList.toggle('hidden');
    });
    document.getElementById('dev-add-gold').addEventListener('click', () => {
        ludus.devAddGold(500);
        showToast('🛠️ Test: +500 Altın eklendi!');
        renderAll();
    });
    document.getElementById('dev-add-fame').addEventListener('click', () => {
        ludus.devAddFame(25);
        showToast('🛠️ Test: +25 Şöhret eklendi!');
        renderAll();
    });
    document.getElementById('dev-boss-day').addEventListener('click', () => {
        if (matchInProgress) return;
        ludus.devJumpToBossDay();
        showToast(`👑 Test: Gün ${ludus.state.day} (BOSS GÜNÜ) açıldı! Arena sekmesine bak.`);
        renderAll();
    });
    document.getElementById('dev-heal-all').addEventListener('click', () => {
        ludus.devHealAll();
        showToast('💚 Test: Tüm kadro iyileştirildi!');
        renderAll();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (matchInProgress) return;
        ludus.nextDay();
        const isBoss = ludus.state.day % 5 === 0;
        showToast(isBoss ? `👑 Gün ${ludus.state.day}: ŞAMPİYONA BOSS GÜNÜ!` : `Gün ${ludus.state.day} başladı!`);
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