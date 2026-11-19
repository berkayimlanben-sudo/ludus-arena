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
    const nextDayBtn = document.getElementById('btn-next-day');
    const toastEl = document.getElementById('toast-msg');
    const devPanel = document.getElementById('dev-panel');

    const arenaPrepView = document.getElementById('arena-prep-view');
    const arenaCombatView = document.getElementById('arena-combat-view');
    const arenaFighterSelect = document.getElementById('arena-fighter-select');
    const arenaConsumableWrap = document.getElementById('arena-consumable-wrap');
    const arenaConsumableSelect = document.getElementById('arena-consumable-select');
    const arenaConsumableChips = document.getElementById('arena-consumable-chips');
    const arenaFighter2Wrap = document.getElementById('arena-fighter-2-wrap');
    const arenaFighterSelect2 = document.getElementById('arena-fighter-select-2');
    const arenaConsumable2Wrap = document.getElementById('arena-consumable-2-wrap');
    const arenaConsumableSelect2 = document.getElementById('arena-consumable-select-2');
    const arenaOpponentsList = document.getElementById('arena-opponents-list');

    const doctoreBanner = document.getElementById('doctore-banner');
    const romanEventModal = document.getElementById('roman-event-modal');
    const eventModalTitle = document.getElementById('event-modal-title');
    const eventModalDesc = document.getElementById('event-modal-desc');
    const eventModalChoices = document.getElementById('event-modal-choices');

    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalKicker = document.getElementById('confirm-modal-kicker');
    const confirmModalTitle = document.getElementById('confirm-modal-title');
    const confirmModalDesc = document.getElementById('confirm-modal-desc');
    const confirmModalCancel = document.getElementById('confirm-modal-cancel');
    const confirmModalOk = document.getElementById('confirm-modal-ok');
    let pendingConfirmAction = null;

    function closeConfirmModal() {
        pendingConfirmAction = null;
        if (confirmModal) confirmModal.classList.add('hidden');
    }

    function openConfirmModal({ kicker, title, desc, confirmLabel = 'Onayla', cancelLabel = 'Vazgeç', onConfirm }) {
        if (!confirmModal) {
            if (onConfirm) onConfirm();
            return;
        }
        confirmModalKicker.textContent = kicker || '⚠️ ONAY';
        confirmModalTitle.textContent = title || 'Emin misin?';
        confirmModalDesc.textContent = desc || '';
        confirmModalOk.textContent = confirmLabel;
        confirmModalCancel.textContent = cancelLabel;
        pendingConfirmAction = onConfirm || null;
        confirmModal.classList.remove('hidden');
    }

    if (confirmModalCancel) {
        confirmModalCancel.addEventListener('click', closeConfirmModal);
    }
    if (confirmModalOk) {
        confirmModalOk.addEventListener('click', () => {
            const action = pendingConfirmAction;
            closeConfirmModal();
            if (action) action();
        });
    }
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) closeConfirmModal();
        });
    }

    const leftNameEl = document.getElementById('left-name');
    const leftGearEl = document.getElementById('left-gear');
    const leftHpBar = document.getElementById('left-hp-bar');
    const leftHpText = document.getElementById('left-hp-text');
    const leftStamBar = document.getElementById('left-stam-bar');
    const leftStateEl = document.getElementById('left-state');

    const leftAllyHud = document.getElementById('left-ally-hud');
    const leftAllyName = document.getElementById('left-ally-name');
    const leftAllyHpBar = document.getElementById('left-ally-hp-bar');
    const leftAllyHpText = document.getElementById('left-ally-hp-text');
    const leftAllyState = document.getElementById('left-ally-state');

    const rightNameEl = document.getElementById('right-name');
    const rightGearEl = document.getElementById('right-gear');
    const rightHpBar = document.getElementById('right-hp-bar');
    const rightHpText = document.getElementById('right-hp-text');
    const rightStamBar = document.getElementById('right-stam-bar');
    const rightStateEl = document.getElementById('right-state');

    const rightAllyHud = document.getElementById('right-ally-hud');
    const rightAllyName = document.getElementById('right-ally-name');
    const rightAllyHpBar = document.getElementById('right-ally-hp-bar');
    const rightAllyHpText = document.getElementById('right-ally-hp-text');
    const rightAllyState = document.getElementById('right-ally-state');

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
        toastTimer = setTimeout(() => { toastEl.classList.add('hidden'); }, 3200);
    }

    function getFatigueBadge(fatigue) {
        if (!fatigue || fatigue === 0) return '<span class="fatigue-badge fresh">⚡ Dinç</span>';
        if (fatigue === 1) return '<span class="fatigue-badge tired">😓 Yorgun (-%20)</span>';
        return '<span class="fatigue-badge exhausted">🥵 Bitkin (-%40)</span>';
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
        nextDayBtn.textContent = `🌙 Günü Bitir (-🪙${ludus.getDailyUpkeep()})`;
    }

    function renderLudusTab() {
        ludusScene.syncFromState(ludus.state);

        const rosterEl = document.getElementById('roster-list');
        const detailEl = document.getElementById('selected-gladiator-panel');
        const buildingsEl = document.getElementById('buildings-list');

        const doc = ludus.state.doctore;
        if (doc) {
            doctoreBanner.classList.remove('hidden');
            doctoreBanner.innerHTML = `
                <strong>🏛️ Baş Eğitmen (Doctore): ${doc.name} (${doc.wins}G)</strong>
                <span>Yeni çaylaklara +${doc.statBonus} Tüm Statlar • +%${doc.xpBonusPct} XP • -%${Math.round((doc.trainingDiscount || 0.1) * 100)} Eğitim Ücreti</span>
            `;
        } else {
            doctoreBanner.classList.add('hidden');
            doctoreBanner.innerHTML = '';
        }

        rosterEl.innerHTML = '';
        ludus.state.roster.forEach(g => {
            const maxHp = ludus.getGladiatorMaxHp(g);
            const pct = Math.round((g.currentHp / maxHp) * 100);
            const isSel = g.id === ludus.state.selectedGladiatorId;
            const w = Data.WEAPONS[g.weaponId];
            const trait = Data.TRAITS[g.traitId];
            const injury = g.injuryId ? Data.INJURIES[g.injuryId] : null;
            const hasPending = Boolean(g.pendingPerkChoices);

            const card = document.createElement('div');
            card.className = `roster-card ${isSel ? 'selected' : ''} ${hasPending ? 'level-ready' : ''}`;
            card.innerHTML = `
                <div class="rc-top">
                    <strong>${g.name} <span class="lvl-pill">Sv.${g.level}</span></strong>
                    <span class="rc-origin">${g.origin}</span>
                </div>
                <div class="rc-tags">
                    ${hasPending ? '<span class="perk-alert-badge">🌟 PERK SEÇ!</span>' : ''}
                    ${trait ? `<span class="trait-badge">${trait.name}</span>` : ''}
                    ${getFatigueBadge(g.fatigue)}
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
            const curStyle = Data.FIGHT_STYLES[sel.styleId || 'balanced'];
            const xpPct = Math.min(100, Math.round((sel.xp / sel.xpToNext) * 100));

            const perkPills = (sel.perks || []).map(pid => {
                const p = Data.PERKS[pid];
                return p ? `<span class="perk-badge" title="${p.desc}">${p.name}</span>` : '';
            }).join('');

            let perkChoiceHTML = '';
            if (sel.pendingPerkChoices && sel.pendingPerkChoices.length > 0) {
                const cards = sel.pendingPerkChoices.map(pid => {
                    const p = Data.PERKS[pid];
                    return `
                        <button class="perk-choice-card" data-perk="${pid}">
                            <strong>${p.name}</strong>
                            <span>${p.desc}</span>
                        </button>
                    `;
                }).join('');
                perkChoiceHTML = `
                    <div class="perk-picker-box">
                        <div class="perk-picker-title">🌟 SEVİYE ATLADI! (Sv. ${sel.level}) — Bir Perk Seç:</div>
                        <div class="perk-choices-grid">${cards}</div>
                    </div>
                `;
            }

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

            const styleOpts = Object.values(Data.FIGHT_STYLES).map(st =>
                `<option value="${st.id}" ${st.id === curStyle.id ? 'selected' : ''}>${st.name}</option>`
            ).join('');

            const statRow = (key, label) => {
                const cost = ludus.getTrainingCost(sel, key);
                const maxed = sel.stats[key] >= cap;
                const penalized = (injury && injury.stat === key) || (sel.fatigue > 0);
                const effVal = sum.eff[key];

                return `
                    <div class="train-box">
                        <span>${label}: <strong class="${penalized ? 'injured-txt' : ''}">${effVal}</strong>${penalized ? ` (${sel.stats[key]})` : ''} / ${cap}</span>
                        <button class="train-btn" data-stat="${key}" ${maxed ? 'disabled' : ''}>
                            ${maxed ? 'MAKS' : `+1 Eğit (🪙${cost})`}
                        </button>
                    </div>
                `;
            };

            detailEl.innerHTML = `
                <div class="detail-header">
                    <div style="flex:1;">
                        <h3>${sel.name} <span class="lvl-pill">Sv.${sel.level}</span> <span class="rc-origin">(${sel.origin})</span></h3>
                        <div class="xp-bar-wrap" title="XP: ${sel.xp} / ${sel.xpToNext}">
                            <div class="xp-bar-fill" style="width:${xpPct}%"></div>
                            <span class="xp-bar-text">XP: ${sel.xp} / ${sel.xpToNext}</span>
                        </div>
                        <div class="rc-tags" style="margin-top:6px;">
                            ${trait ? `<span class="trait-badge">${trait.name}: ${trait.desc}</span>` : ''}
                            ${getFatigueBadge(sel.fatigue)}
                            ${injury ? `<span class="injury-badge">🩹 ${injury.name}: ${injury.desc}</span>` : ''}
                            ${perkPills}
                        </div>
                        <div class="summary-line">Can: ${sel.currentHp}/${sum.maxHp} | Zırh: ${sum.def} | Hız: ${sum.spd} | Ağırlık: ${sum.weight}</div>
                    </div>
                    <div class="detail-actions">
                        <button id="btn-heal-glad" class="heal-btn" ${healCost === 0 ? 'disabled' : ''}>
                            ${healCost === 0 ? '💚 Sağlıklı' : `🩹 İyileştir (🪙${healCost})`}
                        </button>
                        ${(sel.wins || 0) >= 10
                            ? `<button id="btn-retire-doctore" class="doctore-btn" ${ludus.state.roster.length < 2 ? 'disabled title="En az 2 gladyatör gerekir"' : ''}>🏛️ Doctore Yap</button>`
                            : `<span class="doctore-progress">🏛️ Doctore için Zafer: ${sel.wins || 0}/10</span>`}
                    </div>
                </div>

                ${perkChoiceHTML}

                <div class="style-select-box">
                    <label>🎯 Dövüş Stili:
                        <select id="sel-fight-style">${styleOpts}</select>
                    </label>
                    <span class="style-desc">${curStyle.desc}</span>
                </div>

                <div class="equip-grid">
                    ${renderEquipSelect('Silah', 'weapons', Data.WEAPONS, sel.weaponId)}
                    ${renderEquipSelect('Kalkan', 'shields', Data.SHIELDS, sel.shieldId)}
                    ${renderEquipSelect('Zırh', 'armors', Data.ARMORS, sel.armorId)}
                    ${renderEquipSelect('Miğfer', 'helmets', Data.HELMETS, sel.helmetId)}
                </div>

                ${(() => {
                    const invCons = ludus.state.inventory.consumables || {};
                    const ownedCons = Object.values(Data.CONSUMABLES || {}).filter(c => (invCons[c.id] || 0) > 0);
                    if (ownedCons.length === 0) return '';
                    const itemsText = ownedCons.map(c => `${c.name} ×${invCons[c.id]}`).join(' • ');
                    return `
                        <div class="bag-consumables-bar">
                            <div class="bag-cons-info">
                                <strong>🧪 Çantadaki Maç Eşyaları:</strong>
                                <span>${itemsText} — <em>Maça girerken Arena sekmesinden seçilir</em></span>
                            </div>
                            <button id="btn-go-arena-cons" class="bag-cons-btn">⚔️ Arena'da Seç</button>
                        </div>
                    `;
                })()}

                <div class="train-grid">
                    ${statRow('strength', 'Güç')}
                    ${statRow('agility', 'Çeviklik')}
                    ${statRow('vitality', 'Canlılık')}
                </div>
            `;

            detailEl.querySelectorAll('.perk-choice-card').forEach(btn => {
                btn.addEventListener('click', () => {
                    ludus.choosePerk(sel.id, btn.dataset.perk);
                    showToast(`🌟 ${sel.name}, ${Data.PERKS[btn.dataset.perk].name} perkini kazandı!`);
                    renderAll();
                });
            });

            document.getElementById('sel-fight-style').addEventListener('change', (e) => {
                ludus.setFightStyle(sel.id, e.target.value);
                renderLudusTab();
            });

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
                        if (res.leveledUp) showToast(`🌟 ${sel.name} Seviye Atladı! Perk seçebilirsin!`);
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

            const doctoreBtn = document.getElementById('btn-retire-doctore');
            if (doctoreBtn) {
                doctoreBtn.addEventListener('click', () => {
                    const res = ludus.retireAsDoctore(sel.id);
                    if (!res.ok) {
                        showToast(res.msg || 'Emekli edilemedi.', true);
                    } else {
                        showToast(`🏛️ ${res.doctore.name} artık Ludus Baş Eğitmeni (Doctore)!`);
                    }
                    renderAll();
                });
            }

            const goArenaConsBtn = document.getElementById('btn-go-arena-cons');
            if (goArenaConsBtn) {
                goArenaConsBtn.addEventListener('click', () => switchTab('arena'));
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
            { title: '🪖 Miğferler', key: 'helmets', dict: Data.HELMETS },
            { title: '🧪 Arena Tüketilebilirleri (Arena sekmesinde maça girerken seçilir)', key: 'consumables', dict: Data.CONSUMABLES }
        ];

        sections.forEach(sec => {
            const secDiv = document.createElement('div');
            secDiv.className = 'shop-section';
            secDiv.innerHTML = `<h4>${sec.title}</h4><div class="shop-grid"></div>`;
            const grid = secDiv.querySelector('.shop-grid');

            Object.values(sec.dict).forEach(item => {
                if (item.price === 0) return;
                const locked = item.tier > smithLvl;
                const ownedCount = (ludus.state.inventory[sec.key] && ludus.state.inventory[sec.key][item.id]) || 0;
                const metaInfo = sec.key === 'consumables' ? 'Maç öncesi Arena\'da seçilir' : `Ağr: ${item.weight}`;

                const card = document.createElement('div');
                card.className = `shop-card ${locked ? 'locked' : ''}`;
                card.innerHTML = `
                    <div class="sc-top">
                        <strong>${item.name}</strong>
                        <span class="badge">Sv.${item.tier}</span>
                    </div>
                    <div class="sc-desc">${item.desc} • ${metaInfo}</div>
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
                    else if (sec.key === 'consumables') {
                        showToast(`${item.name} çantada! Arena sekmesinden "Maç Eşyası" olarak seçip kullanabilirsin.`);
                    } else {
                        showToast(`${item.name} satın alındı!`);
                    }
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

        const has2v2Today = ludus.state.dailyOpponents.some(o => o.ruleId === 'team_2v2' && !o.completed);
        arenaFighter2Wrap.classList.toggle('hidden', !has2v2Today);
        arenaConsumable2Wrap.classList.toggle('hidden', !has2v2Today);

        const fillSelect = (selEl, defaultIdx) => {
            const prevVal = selEl.value;
            selEl.innerHTML = '';
            ludus.state.roster.forEach((g, idx) => {
                const maxHp = ludus.getGladiatorMaxHp(g);
                const injText = g.injuryId ? ` [🩹 ${Data.INJURIES[g.injuryId].name}]` : '';
                const fatText = g.fatigue >= 2 ? ' [🥵 Bitkin]' : (g.fatigue === 1 ? ' [😓 Yorgun]' : '');
                const stName = Data.FIGHT_STYLES[g.styleId || 'balanced'].name;

                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = `${g.name} (Sv.${g.level} • ${g.currentHp}/${maxHp} Can • ${Data.WEAPONS[g.weaponId].name} • ${stName})${fatText}${injText}`;
                if (prevVal && g.id === prevVal) opt.selected = true;
                else if (!prevVal && idx === defaultIdx) opt.selected = true;
                selEl.appendChild(opt);
            });
        };

        fillSelect(arenaFighterSelect, 0);
        if (ludus.state.selectedGladiatorId && ludus.state.roster.some(g => g.id === ludus.state.selectedGladiatorId)) {
            arenaFighterSelect.value = ludus.state.selectedGladiatorId;
        }
        fillSelect(arenaFighterSelect2, ludus.state.roster.length > 1 ? 1 : 0);

        arenaFighterSelect.onchange = () => {
            ludus.state.selectedGladiatorId = arenaFighterSelect.value;
        };

        const fillConsumableSelect = (selEl) => {
            const prev = selEl.value;
            const inv = ludus.state.inventory.consumables || {};
            selEl.innerHTML = '<option value="none">Eşya Yok</option>';
            Object.values(Data.CONSUMABLES || {}).forEach(item => {
                const count = inv[item.id] || 0;
                if (count > 0) {
                    const opt = document.createElement('option');
                    opt.value = item.id;
                    opt.textContent = `${item.name} (Çantada: ${count})`;
                    if (prev === item.id) opt.selected = true;
                    selEl.appendChild(opt);
                }
            });
        };
        fillConsumableSelect(arenaConsumableSelect);
        fillConsumableSelect(arenaConsumableSelect2);

        const renderConsumableChips = () => {
            const inv = ludus.state.inventory.consumables || {};
            const owned = Object.values(Data.CONSUMABLES || {}).filter(item => (inv[item.id] || 0) > 0);
            if (arenaConsumableWrap) {
                arenaConsumableWrap.classList.toggle('has-items', owned.length > 0);
            }
            if (!arenaConsumableChips) return;
            arenaConsumableChips.innerHTML = '';
            if (owned.length === 0) {
                const hint = document.createElement('span');
                hint.className = 'consumable-empty-hint';
                hint.textContent = 'Çantada maç eşyası yok (Demirci’den alabilirsin)';
                arenaConsumableChips.appendChild(hint);
                return;
            }

            const makeChip = (val, label) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `consumable-chip ${arenaConsumableSelect.value === val ? 'active' : ''}`;
                btn.textContent = label;
                btn.addEventListener('click', () => {
                    arenaConsumableSelect.value = val;
                    renderConsumableChips();
                });
                return btn;
            };

            arenaConsumableChips.appendChild(makeChip('none', 'Kullanma'));
            owned.forEach(item => {
                arenaConsumableChips.appendChild(makeChip(item.id, `${item.name} (×${inv[item.id]})`));
            });
        };

        arenaConsumableSelect.onchange = renderConsumableChips;
        renderConsumableChips();

        arenaOpponentsList.innerHTML = '';
        ludus.state.dailyOpponents.forEach(opp => {
            const w = Data.WEAPONS[opp.weaponId];
            const s = Data.SHIELDS[opp.shieldId];
            const a = Data.ARMORS[opp.armorId];
            const h = Data.HELMETS[opp.helmetId];
            const trait = Data.TRAITS[opp.traitId];
            const rule = Data.ARENA_RULES[opp.ruleId || 'standard'];

            const cardClass = [
                'opp-card',
                opp.isBoss ? 'boss-card' : '',
                opp.lethal && !opp.isBoss ? 'lethal-card' : '',
                opp.ruleId === 'team_2v2' ? 'team-card' : '',
                opp.completed ? 'done' : ''
            ].filter(Boolean).join(' ');

            const matchTypeTag = opp.lethal
                ? '<span class="lethal-badge">💀 ÖLÜMÜNE (Kalıcı Ölüm!)</span>'
                : '<span class="safe-badge">🛡️ Gösteri</span>';

            const ruleTag = opp.ruleId !== 'standard'
                ? `<span class="rule-badge">${rule.name}</span>`
                : '';

            let partnerHTML = '';
            if (opp.ruleId === 'team_2v2' && opp.partner) {
                const pw = Data.WEAPONS[opp.partner.weaponId];
                const ps = Data.SHIELDS[opp.partner.shieldId];
                partnerHTML = `<div class="partner-line">➕ Ortak: <b>${opp.partner.name}</b> (~${opp.partner.maxHp} Can, ${pw.name}${ps.hasShield ? '+' + ps.name : ''})</div>`;
            }

            const card = document.createElement('div');
            card.className = cardClass;
            card.innerHTML = `
                <div class="oc-top">
                    <span class="badge ${opp.isBoss ? 'boss-badge' : ''}">${opp.tierName}</span>
                    <strong>${opp.name}</strong>
                </div>
                <div class="rc-tags">
                    ${matchTypeTag}
                    ${ruleTag}
                    ${trait ? `<span class="trait-badge">${trait.name}</span>` : ''}
                </div>
                <div class="oc-scout">
                    <div>❤️ Can: ~${opp.maxHp} | Güç ${opp.stats.strength} / Çev ${opp.stats.agility}</div>
                    <div>⚔️ ${w.name}${s.hasShield ? ' + ' + s.name : ''}</div>
                    <div>🛡️ ${a.name}${h.id !== 'none' ? ' + ' + h.name : ''}</div>
                    ${partnerHTML}
                </div>
                <div class="oc-reward">Ödül: 🪙${opp.rewardGold} Altın • 🏛️ +${opp.rewardFame} Şöhret</div>
                <button class="primary-btn fight-start-btn" ${opp.completed ? 'disabled' : ''}>
                    ${opp.completed ? '✔️ Tamamlandı' : (opp.isBoss ? '👑 BOSS İLE KAPIŞ!' : (opp.ruleId === 'team_2v2' ? '⚔️ 2v2 MAÇA ÇIK!' : (opp.lethal ? '💀 ÖLÜMÜNE ÇIK!' : '⚔️ Arenaya Çık!')))}
                </button>
            `;
            card.querySelector('.fight-start-btn').addEventListener('click', () => {
                startArenaMatch(opp);
            });
            arenaOpponentsList.appendChild(card);
        });
    }

    function addLog(msg) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = msg;
        battleLogEl.prepend(line);
        while (battleLogEl.children.length > 30) {
            battleLogEl.removeChild(battleLogEl.lastChild);
        }
    }

    function toGladiatorConfig(g, isBoss = false, consumable = null) {
        return {
            name: g.name,
            skinColor: g.skinColor,
            isBoss,
            currentHp: g.currentHp,
            fatigue: g.fatigue || 0,
            fightStyle: g.styleId || 'balanced',
            perks: g.perks || [],
            trait: Data.TRAITS[g.traitId] || null,
            injury: g.injuryId ? Data.INJURIES[g.injuryId] : null,
            stats: Object.assign({}, g.stats),
            weapon: Data.WEAPONS[g.weaponId],
            shield: Data.SHIELDS[g.shieldId],
            armor: Data.ARMORS[g.armorId],
            helmet: Data.HELMETS[g.helmetId],
            consumable
        };
    }

    function startArenaMatch(opp) {
        const is2v2 = opp.ruleId === 'team_2v2' && opp.partner;
        const selectedIds = is2v2
            ? [arenaFighterSelect.value, arenaFighterSelect2.value]
            : [arenaFighterSelect.value];

        if (is2v2 && selectedIds[0] === selectedIds[1]) {
            showToast('2v2 maç için 2 FARKLI gladyatör seçmelisin!', true);
            return;
        }

        const myGlads = selectedIds.map(id => ludus.state.roster.find(g => g.id === id)).filter(Boolean);
        if (myGlads.length !== selectedIds.length) return;

        for (const g of myGlads) {
            const maxHp = ludus.getGladiatorMaxHp(g);
            if (g.currentHp < Math.ceil(maxHp * 0.25)) {
                showToast(`${g.name} çok yaralı! Önce iyileştir veya başka dövüşçü seç.`, true);
                return;
            }
            const ruleCheck = ludus.validateFighterForRule(g, opp.ruleId);
            if (!ruleCheck.ok) {
                showToast(ruleCheck.msg, true);
                return;
            }
        }

        const consIds = is2v2
            ? [arenaConsumableSelect.value, arenaConsumableSelect2.value]
            : [arenaConsumableSelect.value];
        const consInv = ludus.state.inventory.consumables || {};
        if (is2v2 && consIds[0] !== 'none' && consIds[0] === consIds[1] && (consInv[consIds[0]] || 0) < 2) {
            showToast('Aynı tüketilebilir eşyadan 2 gladyatöre vermek için çantada en az 2 adet olmalı!', true);
            return;
        }

        const launchMatch = () => {
            const usedConsumables = consIds.map(cid => ludus.consumeArenaItem(cid));

            matchInProgress = true;
            ludusTree.paused = true;
            arenaPrepView.classList.add('hidden');
            arenaCombatView.classList.remove('hidden');
            battleLogEl.innerHTML = '';
            winnerBanner.classList.add('hidden');

            const leftConfigs = myGlads.map((g, idx) => toGladiatorConfig(g, false, usedConsumables[idx] || null));
            const rightConfigs = is2v2
                ? [toGladiatorConfig(opp, false), toGladiatorConfig(opp.partner, false)]
                : [toGladiatorConfig(opp, Boolean(opp.isBoss))];

            currentArena = new Game.ArenaScene(leftConfigs, rightConfigs);
            currentArena.onBattleLog.connect(addLog);

            currentArena.onMatchFinished.connect((_, teamSide) => {
                const didWin = teamSide === 'left';
                const remHps = currentArena.leftTeam.map(f => f.hp);
                const res = ludus.recordTeamMatchResult(selectedIds, opp.id, didWin, remHps);
                renderTopStats();

                if (didWin) {
                    const lvlMsg = res.leveledNames.length > 0 ? ` 🌟 SEVİYE ATLADI: ${res.leveledNames.join(', ')}!` : '';
                    winnerText.textContent = `🏆 ZAFER! +${res.goldEarned} Altın, +${res.fameEarned} Şöhret (+${res.xpReward} XP)${lvlMsg}`;
                } else if (res.deadNames.length > 0) {
                    const rookieMsg = res.rescuedByRookie ? ' (Sokaktan yeni bir çaylak katıldı!)' : '';
                    winnerText.textContent = `⚰️ ${res.deadNames.join(', ')} ARENADA CAN VERDİ!${rookieMsg}`;
                } else {
                    const injTxt = res.injuries.length > 0 ? ` • 🩹 ${res.injuries[0]}` : '';
                    winnerText.textContent = `💀 YENİLGİ! (+${res.goldEarned} Altın, +${res.xpReward} XP${injTxt})`;
                }
                winnerBanner.classList.remove('hidden');
            });

            tree.changeScene(currentArena);
            tree.paused = false;

            // HUD Hazırlığı (1v1 ve 2v2)
            const L1 = currentArena.leftTeam[0];
            const R1 = currentArena.rightTeam[0];
            leftNameEl.textContent = L1.gladiatorName;
            const c1Tag = L1.consumable ? ` • ${L1.consumable.name}` : '';
            leftGearEl.textContent = `${L1.weapon.name}${L1.shield.hasShield ? ' + ' + L1.shield.name : ''} • ${L1.armor.name}${c1Tag}`;
            rightNameEl.textContent = R1.gladiatorName;
            rightGearEl.textContent = `${R1.weapon.name}${R1.shield.hasShield ? ' + ' + R1.shield.name : ''} • ${R1.armor.name}`;

            const hasLeft2 = currentArena.leftTeam.length > 1;
            const hasRight2 = currentArena.rightTeam.length > 1;
            leftAllyHud.classList.toggle('hidden', !hasLeft2);
            rightAllyHud.classList.toggle('hidden', !hasRight2);

            if (hasLeft2) {
                const L2 = currentArena.leftTeam[1];
                leftAllyName.textContent = `${L2.gladiatorName}${L2.consumable ? ' • ' + L2.consumable.name : ''}`;
            }
            if (hasRight2) rightAllyName.textContent = currentArena.rightTeam[1].gladiatorName;
        };

        if (opp.lethal) {
            const names = myGlads.map(g => g.name).join(' ve ');
            openConfirmModal({
                kicker: '💀 ÖLÜMÜNE ARENA MAÇI',
                title: `${opp.name} ile Ölümüne Düello`,
                desc: `⚠️ DİKKAT: ${names} bu maçta yenilirse KALICI OLARAK ÖLECEK. Yine de arenaya çıksın mı?`,
                confirmLabel: '💀 Evet, Ölümüne Çık!',
                cancelLabel: '🛡️ Vazgeç',
                onConfirm: launchMatch
            });
            return;
        }

        launchMatch();
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
        const L1 = currentArena.leftTeam[0];
        const R1 = currentArena.rightTeam[0];
        if (!L1 || !R1) return;

        leftHpBar.style.width = `${(L1.hp / L1.maxHp) * 100}%`;
        leftHpText.textContent = `${L1.hp} / ${L1.maxHp}`;
        leftStamBar.style.width = `${(L1.stamina / L1.maxStamina) * 100}%`;
        leftStateEl.textContent = L1.getStateLabel();

        rightHpBar.style.width = `${(R1.hp / R1.maxHp) * 100}%`;
        rightHpText.textContent = `${R1.hp} / ${R1.maxHp}`;
        rightStamBar.style.width = `${(R1.stamina / R1.maxStamina) * 100}%`;
        rightStateEl.textContent = R1.getStateLabel();

        if (currentArena.leftTeam.length > 1) {
            const L2 = currentArena.leftTeam[1];
            leftAllyHpBar.style.width = `${(L2.hp / L2.maxHp) * 100}%`;
            leftAllyHpText.textContent = `${L2.hp} / ${L2.maxHp}`;
            leftAllyState.textContent = L2.getStateLabel();
        }
        if (currentArena.rightTeam.length > 1) {
            const R2 = currentArena.rightTeam[1];
            rightAllyHpBar.style.width = `${(R2.hp / R2.maxHp) * 100}%`;
            rightAllyHpText.textContent = `${R2.hp} / ${R2.maxHp}`;
            rightAllyState.textContent = R2.getStateLabel();
        }

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

    function renderEventModal() {
        const ev = ludus.state.pendingEvent;
        if (!ev || matchInProgress) {
            romanEventModal.classList.add('hidden');
            return;
        }
        romanEventModal.classList.remove('hidden');
        eventModalTitle.textContent = ev.title;
        eventModalDesc.textContent = ev.desc;
        eventModalChoices.innerHTML = '';

        (ev.choices || []).forEach(ch => {
            const canAfford = ludus.state.gold >= (ch.minGold || 0);
            const btn = document.createElement('button');
            btn.className = 'event-choice-btn';
            btn.disabled = !canAfford;
            btn.innerHTML = `
                <strong>${ch.label}</strong>
                <span>${ch.hint}${canAfford ? '' : ' (Altın yetersiz!)'}</span>
            `;
            btn.addEventListener('click', () => {
                const res = ludus.resolveRomanEvent(ch.id);
                if (!res.ok) {
                    showToast(res.msg || 'Karar uygulanamadı.', true);
                } else {
                    const lvlTxt = (res.leveledNames && res.leveledNames.length > 0)
                        ? ` 🌟 Seviye Atladı: ${res.leveledNames.join(', ')}!`
                        : '';
                    showToast(res.summary + lvlTxt);
                }
                renderAll();
            });
            eventModalChoices.appendChild(btn);
        });
    }

    function renderAll() {
        renderTopStats();
        if (activeTab === 'ludus') renderLudusTab();
        else if (activeTab === 'shop') renderShopTab();
        else if (activeTab === 'market') renderMarketTab();
        else if (activeTab === 'arena') renderArenaTab();
        renderEventModal();
    }

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
    document.getElementById('dev-add-xp').addEventListener('click', () => {
        const sel = ludus.getSelectedGladiator();
        if (!sel) return;
        const leveled = ludus.devAddXp(sel.id, 100);
        showToast(leveled ? `🌟 ${sel.name} Seviye Atladı! Ludus'ta Perk seç!` : `🛠️ ${sel.name} +100 XP aldı!`);
        renderAll();
    });
    document.getElementById('dev-spawn-2v2').addEventListener('click', () => {
        if (matchInProgress) return;
        const hired = ludus.devSpawn2v2();
        showToast(hired ? '⚔️ 2v2 Kontratı + Test Ortağı Agron eklendi! Arena sekmesine bak.' : '⚔️ Arena sekmesine yeni 2v2 Maç eklendi!');
        renderAll();
    });
    document.getElementById('dev-boss-day').addEventListener('click', () => {
        if (matchInProgress) return;
        ludus.devJumpToBossDay();
        showToast(`👑 Test: Gün ${ludus.state.day} (BOSS GÜNÜ) açıldı!`);
        renderAll();
    });
    document.getElementById('dev-heal-all').addEventListener('click', () => {
        ludus.devHealAll();
        showToast('💚 Test: Tüm kadro iyileştirildi!');
        renderAll();
    });
    document.getElementById('dev-add-wins').addEventListener('click', () => {
        const sel = ludus.getSelectedGladiator();
        if (!sel) return;
        ludus.devGrantWins(sel.id, 10);
        showToast(`🏆 Test: ${sel.name} +10 Zafer kazandı (${sel.wins}G)!`);
        renderAll();
    });
    document.getElementById('dev-trigger-event').addEventListener('click', () => {
        if (matchInProgress) return;
        ludus.devTriggerEvent();
        renderAll();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (matchInProgress) return;
        const info = ludus.nextDay();
        const isBoss = ludus.state.day % 5 === 0;
        if (info.starved) {
            showToast(`⚠️ Erzak parası yetmedi (-🪙${info.upkeep})! Kadro yarı yarıya iyileşti.`, true);
        } else if (isBoss) {
            showToast(`👑 Gün ${ludus.state.day}: ŞAMPİYONA BOSS GÜNÜ! (-🪙${info.upkeep})`);
        } else {
            showToast(`Gün ${ludus.state.day} başladı! (-🪙${info.upkeep} masraf)`);
        }
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
        openConfirmModal({
            kicker: '🗑️ YENİ OYUN',
            title: 'Kayıt Silinsin mi?',
            desc: 'Tüm ilerlemen silinip sıfırdan yeni bir Ludus başlatılacak, emin misin?',
            confirmLabel: '🗑️ Sıfırla ve Başlat',
            cancelLabel: 'Vazgeç',
            onConfirm: () => {
                ludus.newGame();
                showToast('Yeni Ludus başlatıldı!');
                renderAll();
            }
        });
    });

    renderAll();
})();