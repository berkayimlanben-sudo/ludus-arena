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
    const uiRegion = document.getElementById('ui-region');
    const uiNgPlus = document.getElementById('ui-ngplus');
    const uiGold = document.getElementById('ui-gold');
    const uiFame = document.getElementById('ui-fame');
    const uiSenate = document.getElementById('ui-senate');
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
    const arena2v2SynergyBar = document.getElementById('arena-2v2-synergy-bar');
    const careerLadderPanel = document.getElementById('career-ladder-panel');
    const senatePanel = document.getElementById('senate-panel');
    const arenaBettingPanel = document.getElementById('arena-betting-panel');
    const arenaOpponentsList = document.getElementById('arena-opponents-list');
    let selectedBet = { type: 'none', stake: 50 };

    const doctoreBanner = document.getElementById('doctore-banner');
    const romanEventModal = document.getElementById('roman-event-modal');
    const eventModalTitle = document.getElementById('event-modal-title');
    const eventModalDesc = document.getElementById('event-modal-desc');
    const eventModalChoices = document.getElementById('event-modal-choices');

    const championModal = document.getElementById('champion-modal');
    const championModalTitle = document.getElementById('champion-modal-title');
    const championModalDesc = document.getElementById('champion-modal-desc');
    const btnKeepPlaying = document.getElementById('btn-keep-playing');
    const btnStartNgPlus = document.getElementById('btn-start-ngplus');
    let lastChampionGladiatorId = null;
    let pendingChampionCeremony = null;
    let pendingReturnTab = 'ludus';

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

    const crowdHudBar = document.getElementById('crowd-hud-bar');
    const crowdTierLabel = document.getElementById('crowd-tier-label');
    const crowdMercyLabel = document.getElementById('crowd-mercy-label');
    const crowdFavorFill = document.getElementById('crowd-favor-fill');
    const crowdFavorText = document.getElementById('crowd-favor-text');

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
        if (uiRegion) {
            const reg = ludus.getCurrentRegion();
            uiRegion.textContent = `${reg.icon} ${reg.name}`;
        }
        if (uiNgPlus) {
            const ng = ludus.state.ngPlusCount || 0;
            uiNgPlus.classList.toggle('hidden', ng <= 0);
            if (ng > 0) uiNgPlus.textContent = `🔥 NG+${ng}`;
        }
        uiGold.textContent = `🪙 ${ludus.state.gold}`;
        uiFame.textContent = `🏛️ ${ludus.state.fame} Şöhret`;
        if (uiSenate) {
            const totalRep = ludus.getSenateBonuses().totalReputation || 0;
            uiSenate.textContent = `⚖️ ${totalRep} Senato`;
        }
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
            const pendingCount = g.pendingPerkCount || (hasPending ? 1 : 0);
            const loyaltyVal = g.loyalty !== undefined ? g.loyalty : 65;
            const lTier = Game.BondingRules ? Game.BondingRules.getLoyaltyTier(loyaltyVal) : { id: 'steady', badge: '🤝 Güvenilir' };
            const isFavNow = Game.BondingRules && Game.BondingRules.isUsingFavoriteWeapon(g);
            const extraMeta = [
                `${isFavNow ? '★ ' : ''}${w.name}`,
                `${g.wins}G / ${g.losses}M`,
                `Sadakat ${loyaltyVal}`,
                g.activeRequest ? '💬 İstek' : ''
            ].filter(Boolean).join(' · ');

            const card = document.createElement('div');
            card.className = `roster-card ${isSel ? 'selected' : ''} ${hasPending ? 'level-ready' : ''}`;
            card.innerHTML = `
                <div class="rc-top">
                    <strong>${g.name} <span class="lvl-pill">Sv.${g.level}</span></strong>
                    <span class="rc-origin">${g.origin}</span>
                </div>
                <div class="rc-tags">
                    ${hasPending ? `<span class="perk-alert-badge">🌟 PERK SEÇ!${pendingCount > 1 ? ` (×${pendingCount})` : ''}</span>` : ''}
                    ${lTier.id === 'rebellious' ? '<span class="rebellious-badge">⚠️ İsyankâr</span>' : (lTier.id === 'loyal' ? '<span class="loyal-badge">❤️ Sadık</span>' : '')}
                    ${trait ? `<span class="trait-badge">${trait.name}</span>` : ''}
                    ${getFatigueBadge(g.fatigue)}
                    ${injury ? `<span class="injury-badge">🩹 ${injury.name}</span>` : ''}
                </div>
                <div class="rc-sub">${extraMeta}</div>
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
                const pendingCount = sel.pendingPerkCount || 1;
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
                        <div class="perk-picker-title">🌟 SEVİYE ATLADI! (Sv. ${sel.level}) — Bir Perk Seç:${pendingCount > 1 ? ` <span class="badge">${pendingCount} hak bekliyor</span>` : ''}</div>
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

            const favWeapon = sel.favoriteWeaponId ? Data.WEAPONS[sel.favoriteWeaponId] : null;
            const isFavEquipped = Boolean(favWeapon && sel.weaponId === favWeapon.id);
            const loyaltyVal = sel.loyalty !== undefined ? sel.loyalty : 65;
            const lTier = Game.BondingRules
                ? Game.BondingRules.getLoyaltyTier(loyaltyVal)
                : { id: 'steady', name: 'Güvenilir', badge: '🤝 Güvenilir', desc: '' };
            const dialogueText = Game.BondingRules
                ? Game.BondingRules.pickGladiatorDialogue(sel, ludus.state, Data.WEAPONS)
                : '';
            const talkedToday = sel.lastTalkDay === ludus.state.day;
            const wineToday = sel.lastWineDay === ludus.state.day;
            const activeReq = sel.activeRequest;

            const requestHtml = activeReq ? `
                <div class="request-card">
                    <div class="request-card-info">
                        <strong>${activeReq.title}</strong>
                        <p>${activeReq.desc}</p>
                        <div class="request-reward-line">Ödül: +${activeReq.rewardLoyalty} Sadakat · +${activeReq.rewardXp} XP</div>
                    </div>
                    <button id="btn-decline-request" type="button" class="cancel-confirm-btn">Reddet (-6 Sadakat)</button>
                </div>
            ` : '';

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
                        ${favWeapon ? `<div class="fav-weapon-line ${isFavEquipped ? 'active' : ''}">★ Favori Silah: ${favWeapon.name} ${isFavEquipped ? '(Takılı: +%6 Hasar, +%5 Kritik)' : '(Takılırsa +%6 Hasar, +%5 Kritik)'}</div>` : ''}
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

                ${dialogueText ? `<div class="gladiator-dialogue-box">💬 ${dialogueText}</div>` : ''}

                <div class="bonding-panel">
                    <div class="bonding-head">
                        <strong>${lTier.badge} · Sadakat ${loyaltyVal}/100</strong>
                        <span class="bonding-tier-desc">${lTier.desc}</span>
                    </div>
                    <div class="loyalty-bar-wrap">
                        <div class="loyalty-bar-fill ${lTier.id}" style="width:${loyaltyVal}%"></div>
                        <span class="loyalty-bar-text">${loyaltyVal} / 100</span>
                    </div>
                    <div class="bonding-actions-row">
                        <button id="btn-talk-glad" type="button" class="bond-btn" ${talkedToday ? 'disabled' : ''}>
                            ${talkedToday ? '✔️ Bugün Sohbet Edildi' : '🗣️ Sohbet Et (+4 Sadakat)'}
                        </button>
                        <button id="btn-wine-glad" type="button" class="bond-btn wine" ${wineToday ? 'disabled' : ''}>
                            ${wineToday ? '🍷 Şarap İkram Edildi' : '🍷 Şarap İkram Et (🪙25)'}
                        </button>
                        <button id="btn-quarters-glad" type="button" class="bond-btn ${sel.hasPrivateQuarters ? 'quarters-owned' : 'quarters'}" ${sel.hasPrivateQuarters ? 'disabled' : ''}>
                            ${sel.hasPrivateQuarters ? '✅ Özel Oda Tahsis Edildi' : '🛏️ Özel Oda (🪙180)'}
                        </button>
                    </div>
                </div>

                ${requestHtml}
                ${(() => {
                    const teammates = ludus.state.roster.filter(r => r.id !== sel.id);
                    if (teammates.length === 0 || !Game.RelationRules) return '';
                    const selSparedToday = sel.lastSparDay === ludus.state.day;
                    const rowsHtml = teammates.map(other => {
                        const score = ludus.getRelationBetween(sel.id, other.id);
                        const tier = Game.RelationRules.getRelationTier(score);
                        const otherSparedToday = other.lastSparDay === ludus.state.day;
                        const sparDisabled = selSparedToday || otherSparedToday;
                        const btnLabel = sparDisabled
                            ? '✔️ Bugün Talim Yapıldı'
                            : '⚔️ Birlikte Talim (+İlişki, +15 XP)';
                        return `
                            <div class="relation-row">
                                <div class="relation-meta">
                                    <div class="relation-title-line">
                                        <strong>${other.name}</strong>
                                        <span>· ${tier.badge}</span>
                                        <span class="relation-score ${tier.id}">(${score >= 0 ? '+' : ''}${score})</span>
                                    </div>
                                    <div class="relation-effect-line">${tier.desc}</div>
                                </div>
                                <button type="button" class="spar-btn" data-partner-id="${other.id}" ${sparDisabled ? 'disabled' : ''}>
                                    ${btnLabel}
                                </button>
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="relations-panel">
                            <div class="relations-head">
                                <strong>🤝 Avlu İlişkileri (2v2 Yoldaşlık & Rekabet)</strong>
                                <span class="relations-sub">40+ Silah Kardeşi · -30 altı Rakip</span>
                            </div>
                            <div class="relations-list">${rowsHtml}</div>
                        </div>
                    `;
                })()}
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
                    else if (res.fulfilledRequest) {
                        showToast(`💬 ${sel.name} isteğini tamamladın! (+${res.fulfilledRequest.rewardLoyalty} Sadakat, +${res.fulfilledRequest.rewardXp} XP)`);
                    }
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
                    else {
                        ludusScene.triggerAnim(sel.id, 'HEAL');
                        if (res.fulfilledRequest) {
                            showToast(`💬 ${sel.name} iyileşme isteğini tamamladın! (+${res.fulfilledRequest.rewardLoyalty} Sadakat, +${res.fulfilledRequest.rewardXp} XP)`);
                        }
                    }
                    renderAll();
                });
            }

            const talkBtn = document.getElementById('btn-talk-glad');
            if (talkBtn) {
                talkBtn.addEventListener('click', () => {
                    const res = ludus.talkToGladiator(sel.id);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else if (res.ok) showToast(`🗣️ ${sel.name} ile sohbet edildi (+${res.loyaltyDelta} Sadakat)`);
                    renderAll();
                });
            }

            const wineBtn = document.getElementById('btn-wine-glad');
            if (wineBtn) {
                wineBtn.addEventListener('click', () => {
                    const res = ludus.giftWineToGladiator(sel.id);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else if (res.ok) {
                        ludusScene.triggerAnim(sel.id, 'HEAL');
                        const hpTxt = res.hpHealed > 0 ? `, +${res.hpHealed} Can` : '';
                        showToast(`🍷 ${sel.name} şarap ikramına sevindi (+${res.loyaltyDelta} Sadakat${hpTxt})`);
                    }
                    renderAll();
                });
            }

            const quartersBtn = document.getElementById('btn-quarters-glad');
            if (quartersBtn) {
                quartersBtn.addEventListener('click', () => {
                    const res = ludus.assignPrivateQuarters(sel.id);
                    if (!res.ok && res.msg) showToast(res.msg, true);
                    else if (res.ok) {
                        showToast(`🛏️ ${sel.name} özel odaya yerleşti! (+${res.loyaltyDelta} Sadakat, her gece +3 Sadakat & +%10 Can)`);
                    }
                    renderAll();
                });
            }

            const declineReqBtn = document.getElementById('btn-decline-request');
            if (declineReqBtn) {
                declineReqBtn.addEventListener('click', () => {
                    const res = ludus.declineGladiatorRequest(sel.id);
                    if (res.ok) showToast(`😒 ${sel.name} isteğinin reddedilmesine bozuldu (-6 Sadakat)`, true);
                    renderAll();
                });
            }

            detailEl.querySelectorAll('.spar-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const partnerId = btn.dataset.partnerId;
                    const res = ludus.sparTogether(sel.id, partnerId);
                    if (!res.ok) {
                        showToast(res.msg || 'Talim yapılamadı.', true);
                    } else {
                        ludusScene.triggerAnim(sel.id, 'TRAIN_AGI');
                        ludusScene.triggerAnim(partnerId, 'TRAIN_STR');
                        const lvlNote = res.leveledNames && res.leveledNames.length > 0
                            ? ` 🌟 Seviye Atladı: ${res.leveledNames.join(', ')}!`
                            : '';
                        showToast(`⚔️ ${sel.name} ortak talim yaptı (+${res.relationDelta} İlişki → ${res.tier.badge}, +${res.xpEach} XP)${lvlNote}`);
                    }
                    renderAll();
                });
            });

            const doctoreBtn = document.getElementById('btn-retire-doctore');
            if (doctoreBtn) {
                doctoreBtn.addEventListener('click', () => {
                    const performRetire = () => {
                        const res = ludus.retireAsDoctore(sel.id);
                        if (!res.ok) {
                            showToast(res.msg || 'Emekli edilemedi.', true);
                        } else {
                            showToast(`🏛️ ${res.doctore.name} artık Ludus Baş Eğitmeni (Doctore)!`);
                        }
                        renderAll();
                    };

                    if (ludus.state.doctore) {
                        openConfirmModal({
                            kicker: '🏛️ BAŞ EĞİTMEN DEĞİŞİMİ',
                            title: 'Mevcut Doctore Değiştirilsin mi?',
                            desc: `Mevcut Baş Eğitmen ${ludus.state.doctore.name} görevden ayrılacak ve yerine ${sel.name} geçecek. Onaylıyor musun?`,
                            confirmLabel: '🏛️ Evet, Değiştir',
                            cancelLabel: 'Vazgeç',
                            onConfirm: performRetire
                        });
                        return;
                    }

                    performRetire();
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
            const favW = rec.favoriteWeaponId ? Data.WEAPONS[rec.favoriteWeaponId] : null;
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
                ${favW ? `<div class="mc-fav">★ Favori Silah: ${favW.name} (+%6 Hasar, +%5 Kritik)</div>` : ''}
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
                const isFav = Game.BondingRules && Game.BondingRules.isUsingFavoriteWeapon(g);
                const wName = `${isFav ? '★ ' : ''}${Data.WEAPONS[g.weaponId].name}`;

                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = `${g.name} (Sv.${g.level} • ${g.currentHp}/${maxHp} Can • ${wName} • ${stName})${fatText}${injText}`;
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
            renderArenaTab();
        };
        arenaFighterSelect2.onchange = () => {
            renderArenaTab();
        };

        const render2v2SynergyPreview = () => {
            if (!arena2v2SynergyBar) return;
            if (!has2v2Today || arenaFighterSelect.value === arenaFighterSelect2.value) {
                arena2v2SynergyBar.className = 'synergy-preview-bar hidden';
                arena2v2SynergyBar.textContent = '';
                return;
            }
            const syn = ludus.get2v2Synergy(arenaFighterSelect.value, arenaFighterSelect2.value);
            if (!syn) {
                arena2v2SynergyBar.className = 'synergy-preview-bar hidden';
                return;
            }
            arena2v2SynergyBar.className = `synergy-preview-bar ${syn.tier.id}`;
            arena2v2SynergyBar.textContent = `🤝 2v2 Takım Sinerjisi — ${syn.summary}`;
        };
        render2v2SynergyPreview();

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

        renderCareerLadder();
        renderSenatePanel();
        renderBettingPanel();

        arenaOpponentsList.innerHTML = '';
        ludus.state.dailyOpponents.forEach(opp => {
            const w = Data.WEAPONS[opp.weaponId];
            const s = Data.SHIELDS[opp.shieldId];
            const a = Data.ARMORS[opp.armorId];
            const h = Data.HELMETS[opp.helmetId];
            const trait = Data.TRAITS[opp.traitId];
            const oppStyle = Data.FIGHT_STYLES[opp.styleId || 'balanced'];
            const oppPerkTags = (opp.perks || []).map(pid => {
                const p = Data.PERKS[pid];
                return p ? `<span class="perk-badge" title="${p.desc}">${p.name}</span>` : '';
            }).join('');
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
                const pStyle = Data.FIGHT_STYLES[opp.partner.styleId || 'balanced'];
                const pPerks = (opp.partner.perks || []).map(pid => Data.PERKS[pid] ? Data.PERKS[pid].name : '').filter(Boolean);
                const pExtra = [pStyle ? pStyle.name : '', ...pPerks].filter(Boolean).join(' • ');
                partnerHTML = `<div class="partner-line">➕ Ortak: <b>${opp.partner.name}</b> (~${opp.partner.maxHp} Can, ${pw.name}${ps.hasShield ? '+' + ps.name : ''}${pExtra ? ` • ${pExtra}` : ''})</div>`;
            }

            let bribeHTML = '';
            if (opp.bribeOffer && !opp.completed) {
                const bo = opp.bribeOffer;
                const riskPct = Math.round((bo.riskChance || 0.2) * 100);
                const dealMeta = bo.type === 'throw_match'
                    ? `Rüşvet: +🪙${bo.bribeGold} (Yenilmen gerekir)`
                    : `Maliyet: 🪙${bo.upfrontCost} (Rakip -%25 Can / -%20 Güç)`;
                bribeHTML = `
                    <div class="bribe-offer-box ${bo.accepted ? 'active' : ''}">
                        <div class="bribe-head">
                            <span>${bo.title}</span>
                            <span class="bribe-risk">Risk: %${riskPct}</span>
                        </div>
                        <div class="bribe-desc">${bo.desc} • <strong>${dealMeta}</strong></div>
                        <button type="button" class="bribe-toggle-btn ${bo.accepted ? 'active' : ''}" data-opp-id="${opp.id}">
                            ${bo.accepted ? '✅ Şike Aktif (İptal Et)' : '🤫 Şikeyi Kabul Et'}
                        </button>
                    </div>
                `;
            }

            const fighterIdsForOdds = (opp.ruleId === 'team_2v2' && opp.partner)
                ? [arenaFighterSelect.value, arenaFighterSelect2.value]
                : [arenaFighterSelect.value];
            const odds = !opp.completed ? ludus.getMatchOdds(fighterIdsForOdds, opp) : null;
            const throwBribeActive = Boolean(opp.bribeOffer && opp.bribeOffer.accepted && opp.bribeOffer.type === 'throw_match');
            let oddsHTML = '';
            if (odds) {
                oddsHTML = `<div class="oc-odds-line">🎲 Oranlar: Zafer ${odds.winOdds.toFixed(2)}x · &lt;20sn ${odds.fastWinOdds.toFixed(2)}x (${odds.outlook})</div>`;
                if (selectedBet.type !== 'none') {
                    if (throwBribeActive) {
                        oddsHTML += `<div class="oc-bet-preview blocked">⚠️ Şike (bilerek yenilme) aktif — bahis kapalı</div>`;
                    } else {
                        const mult = selectedBet.type === 'fast_win' ? odds.fastWinOdds : odds.winOdds;
                        const payout = Math.round(selectedBet.stake * mult);
                        oddsHTML += `<div class="oc-bet-preview">🎯 Seçili Bahis: 🪙${selectedBet.stake} → Olası Ödeme 🪙${payout}</div>`;
                    }
                }
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
                    ${oppStyle && oppStyle.id !== 'balanced' ? `<span class="badge" title="${oppStyle.desc}">🎯 ${oppStyle.name}</span>` : ''}
                    ${oppPerkTags}
                </div>
                <div class="oc-scout">
                    <div>❤️ Can: ~${opp.maxHp} | Güç ${opp.stats.strength} / Çev ${opp.stats.agility}</div>
                    <div>⚔️ ${w.name}${s.hasShield ? ' + ' + s.name : ''}</div>
                    <div>🛡️ ${a.name}${h.id !== 'none' ? ' + ' + h.name : ''}</div>
                    ${partnerHTML}
                    ${oddsHTML}
                </div>
                ${bribeHTML}
                <div class="oc-reward">Ödül: 🪙${opp.rewardGold} Altın • 🏛️ +${opp.rewardFame} Şöhret</div>
                <button class="primary-btn fight-start-btn" ${opp.completed ? 'disabled' : ''}>
                    ${opp.completed ? '✔️ Tamamlandı' : (opp.isBoss ? '👑 BOSS İLE KAPIŞ!' : (opp.ruleId === 'team_2v2' ? '⚔️ 2v2 MAÇA ÇIK!' : (opp.lethal ? '💀 ÖLÜMÜNE ÇIK!' : '⚔️ Arenaya Çık!')))}
                </button>
            `;

            const bribeBtn = card.querySelector('.bribe-toggle-btn');
            if (bribeBtn) {
                bribeBtn.addEventListener('click', () => {
                    if (opp.bribeOffer.accepted) {
                        ludus.cancelBribeOffer(opp.id);
                        showToast('Şike anlaşması iptal edildi.');
                    } else {
                        const res = ludus.acceptBribeOffer(opp.id);
                        if (!res.ok) showToast(res.msg || 'Şike kabul edilemedi.', true);
                        else showToast(`🤫 ${opp.name} maçı için gizli anlaşma yapıldı!`);
                    }
                    renderAll();
                });
            }

            card.querySelector('.fight-start-btn').addEventListener('click', () => {
                startArenaMatch(opp);
            });
            arenaOpponentsList.appendChild(card);
        });
    }

    function renderBettingPanel() {
        if (!arenaBettingPanel || !Game.BettingRules) return;
        const bStats = ludus.state.bettingStats || { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 };
        const statsText = bStats.totalWagered > 0
            ? `Kuponlar: ${bStats.betsWon} Kazanan / ${bStats.betsLost} Kayıp · Bahis: 🪙${bStats.totalWagered} → Ödeme: 🪙${bStats.totalWon}`
            : 'Maç öncesi bahis seçip aşağıdaki rakiplerden birine girin (altın maç başlarken kesilir)';

        const typeButtons = [
            { id: 'none', label: 'Bahis Yok' },
            { id: 'win', label: '🏆 Zafer Bahsi' },
            { id: 'fast_win', label: '⚡ Hızlı Zafer (<20sn)' }
        ].map(t => `
            <button type="button" class="bet-chip-btn bet-type-btn ${selectedBet.type === t.id ? 'active' : ''}" data-bet-type="${t.id}">
                ${t.label}
            </button>
        `).join('');

        const stakesDisabled = selectedBet.type === 'none';
        const stakeButtons = Game.BettingRules.STAKES.map(st => `
            <button type="button" class="bet-chip-btn bet-stake-btn ${!stakesDisabled && selectedBet.stake === st ? 'active' : ''}" data-stake="${st}" ${stakesDisabled ? 'disabled' : ''}>
                🪙${st}
            </button>
        `).join('');

        arenaBettingPanel.innerHTML = `
            <div class="betting-head">
                <strong>🎲 Arena Bahis Masası</strong>
                <span class="betting-stats-line">${statsText}</span>
            </div>
            <div class="bet-controls-grid">
                <div class="bet-group">
                    <span class="bet-group-label">Tür:</span>
                    ${typeButtons}
                </div>
                <div class="bet-group">
                    <span class="bet-group-label">Miktar:</span>
                    ${stakeButtons}
                </div>
            </div>
            <div class="betting-note">
                ${selectedBet.type === 'none'
                    ? 'Oranlar seçili dövüşçü ile rakibin gücüne göre dinamik hesaplanır.'
                    : `Aktif Seçim: ${selectedBet.type === 'fast_win' ? '⚡ Hızlı Zafer (<20sn)' : '🏆 Zafer Bahsi'} · 🪙${selectedBet.stake} (Rakip kartlarında olası ödemeyi görebilirsin)`}
            </div>
        `;

        arenaBettingPanel.querySelectorAll('.bet-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedBet.type = btn.dataset.betType;
                renderArenaTab();
            });
        });
        arenaBettingPanel.querySelectorAll('.bet-stake-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedBet.stake = parseInt(btn.dataset.stake, 10) || 50;
                renderArenaTab();
            });
        });
    }

    function renderSenatePanel() {
        if (!senatePanel || !Data.SENATORS || !ludus.state.senate) return;
        const senate = ludus.state.senate;
        const reps = senate.reputations || { crassus: 0, tullius: 0, valeria: 0 };
        const bonuses = ludus.getSenateBonuses();
        const upkeepNote = bonuses.upkeepDiscount > 0
            ? `Aktif Senato İndirimi: -%${Math.round(bonuses.upkeepDiscount * 100)} Günlük Masraf`
            : '45+ Toplam İtibarda -%8, 90+ İtibarda -%15 Günlük Masraf indirimi açılır';

        const senatorsHtml = Object.values(Data.SENATORS).map(sen => {
            const val = reps[sen.id] || 0;
            const pct = Math.max(0, Math.min(100, val));
            return `
                <div class="senator-card">
                    <div class="senator-card-top">
                        <span>${sen.icon} ${sen.name}</span>
                        <span class="senator-rep-pill">${val} İtibar</span>
                    </div>
                    <div class="senator-title">${sen.title}</div>
                    <div class="senator-perk">${sen.perkDesc}</div>
                    <div class="senator-rep-bar"><div class="senator-rep-fill" style="width:${pct}%"></div></div>
                </div>
            `;
        }).join('');

        const contract = senate.dailyContract;
        let contractHtml = '';
        if (!contract) {
            contractHtml = `
                <div class="senate-contract-box">
                    <div class="contract-info">
                        <strong>📜 Bugün İçin Bekleyen Senato Kontratı Yok</strong>
                        <p>Yeni güne geçince yeni bir Senato kontratı teklifi gelecek.</p>
                    </div>
                </div>
            `;
        } else {
            const patron = Data.SENATORS[contract.senatorId] || { icon: '🏛️', name: 'Senato' };
            const stateClass = contract.completed ? 'completed' : (contract.accepted ? 'accepted' : '');
            const statusLabel = contract.completed
                ? '✅ Kontrat Tamamlandı'
                : (contract.accepted ? '⏳ Aktif Görev — Maçta Şartı Sağla' : '📜 Yeni Patron Teklifi');
            const actionsHtml = contract.completed
                ? '<span class="safe-badge">✔️ Ödül Alındı</span>'
                : (contract.accepted
                    ? '<span class="perk-alert-badge">⏳ Aktif</span>'
                    : `
                        <button id="btn-accept-contract" type="button" class="senate-accept-btn">📜 Kontratı Kabul Et</button>
                        <button id="btn-decline-contract" type="button" class="cancel-confirm-btn">Reddet</button>
                    `);

            contractHtml = `
                <div class="senate-contract-box ${stateClass}">
                    <div class="contract-info">
                        <strong>${patron.icon} ${patron.name}: ${contract.title} <span class="badge">${statusLabel}</span></strong>
                        <p>${contract.desc}</p>
                        <div class="contract-reward">Ödül: +🪙${contract.rewardGold} Altın • +🏛️${contract.rewardFame} Şöhret • +⚖️${contract.repReward} ${patron.name} İtibarı</div>
                    </div>
                    <div class="contract-actions">${actionsHtml}</div>
                </div>
            `;
        }

        senatePanel.innerHTML = `
            <div class="senate-head">
                <strong>⚖️ Roma Senatosu & Patron Kontratları</strong>
                <span>${upkeepNote}</span>
            </div>
            <div class="senators-grid">${senatorsHtml}</div>
            ${contractHtml}
        `;

        const accBtn = document.getElementById('btn-accept-contract');
        if (accBtn) {
            accBtn.addEventListener('click', () => {
                const res = ludus.acceptSenateContract();
                if (res.ok) showToast(`📜 Senato Kontratı kabul edildi: ${res.contract.title}`);
                renderAll();
            });
        }
        const decBtn = document.getElementById('btn-decline-contract');
        if (decBtn) {
            decBtn.addEventListener('click', () => {
                ludus.declineSenateContract();
                showToast('Senato kontratı reddedildi.');
                renderAll();
            });
        }
    }

    function openChampionModal(fighterId, res) {
        if (!championModal) return;
        const g = ludus.state.roster.find(r => r.id === fighterId) || ludus.getSelectedGladiator();
        lastChampionGladiatorId = g ? g.id : null;
        const nextNg = (ludus.state.ngPlusCount || 0) + 1;
        const docText = ludus.state.doctore
            ? `Mevcut Baş Eğitmenin ${ludus.state.doctore.name} görevine devam eder.`
            : `${g ? g.name : 'Şampiyonun'} otomatik olarak Baş Eğitmen (Doctore) unvanıyla sonraki nesli yetiştirir.`;

        championModalTitle.textContent = `${g ? g.name : 'Şampiyonun'} İmparatorluk Tacını Kazandı!`;
        championModalDesc.textContent =
            `3 maçlık İmparatorluk Turnuvasını fethettin (+${res ? res.goldEarned : 0} Altın, +${res ? res.fameEarned : 0} Şöhret)! ` +
            `Prestijli New Game+${nextNg} başlatırsan: ${240 + nextNg * 120} başlangıç altını, varis gladyatöre +${nextNg * 2} tüm statlar, +%${nextNg * 30} arena ödülleri kazanırsın ve ${docText}`;
        championModal.classList.remove('hidden');
    }

    if (btnKeepPlaying) {
        btnKeepPlaying.addEventListener('click', () => {
            championModal.classList.add('hidden');
            renderAll();
        });
    }
    if (btnStartNgPlus) {
        btnStartNgPlus.addEventListener('click', () => {
            championModal.classList.add('hidden');
            const res = ludus.startNewGamePlus(lastChampionGladiatorId || ludus.state.selectedGladiatorId);
            if (!res.ok) {
                showToast(res.msg || 'New Game+ başlatılamadı.', true);
            } else {
                showToast(`🔥 Prestijli New Game+${res.ngPlusCount} başladı! Varisin ${res.setup.starterName} arenaya hazır!`);
                switchTab('ludus');
            }
            renderAll();
        });
    }

    function renderCareerLadder() {
        if (!careerLadderPanel || !Data.CAREER_REGIONS) return;
        const curRegion = ludus.getCurrentRegion();
        const fame = ludus.state.fame || 0;
        const ng = ludus.state.ngPlusCount || 0;
        const tourney = ludus.state.tournament || { active: false, round: 0, fighterId: null, completedChampionship: false };

        if (tourney.active && tourney.fighterId && ludus.state.roster.some(g => g.id === tourney.fighterId)) {
            arenaFighterSelect.value = tourney.fighterId;
        }

        const regionsHtml = Data.CAREER_REGIONS.map(r => {
            const unlocked = fame >= r.minFame;
            const isActive = curRegion && curRegion.id === r.id;
            const bonusPct = Math.round((r.rewardMult - 1) * 100);
            const bonusText = bonusPct > 0 ? ` • +%${bonusPct} Ödül` : '';
            return `
                <button type="button"
                    class="region-card ${isActive ? 'active' : ''} ${unlocked ? '' : 'locked'}"
                    data-region="${r.id}"
                    ${unlocked ? '' : 'disabled'}>
                    <div class="region-card-top">
                        <span>${r.order}. ${r.icon} ${r.name}</span>
                        <span>${isActive ? '✅' : (unlocked ? '🔓' : '🔒')}</span>
                    </div>
                    <div class="region-card-desc">${r.desc}</div>
                    <div class="region-card-meta">${unlocked ? `Açık${bonusText}` : `${r.minFame} Şöhret Gerekir`}</div>
                </button>
            `;
        }).join('');

        const imperialUnlocked = fame >= 150;
        const roundNum = (tourney.round || 0) + 1;
        const totalRounds = (Data.IMPERIAL_TOURNAMENT && Data.IMPERIAL_TOURNAMENT.length) || 3;
        const activeFighter = tourney.active && tourney.fighterId
            ? ludus.state.roster.find(g => g.id === tourney.fighterId)
            : null;

        let tourneyTitle = '👑 İmparatorluk Turnuvası (3 Maçlık Final)';
        let tourneySub = imperialUnlocked
            ? 'Art arda 3 elit rakibi yenerek İmparatorluk Tacını ve Prestijli New Game+ modunu aç! (Yenilgide kalıcı ölüm yok, turnuva sıfırlanır.)'
            : `İmparatorluk Turnuvası için 150 Şöhret gerekiyor (${fame}/150).`;
        let tourneyBtnLabel = '👑 Turnuvaya Başla (Tur 1/3)';

        if (imperialUnlocked && tourney.active) {
            const tpl = Data.IMPERIAL_TOURNAMENT[tourney.round || 0];
            tourneyTitle = `🔥 Turnuva Devam Ediyor — Maç ${roundNum}/${totalRounds}`;
            tourneySub = `${activeFighter ? activeFighter.name : 'Savaşçın'} sıradaki rakip ${tpl ? tpl.name : ''} ile karşılaşacak!`;
            tourneyBtnLabel = `⚔️ Tur ${roundNum}/${totalRounds} Maçına Çık!`;
        } else if (imperialUnlocked && tourney.completedChampionship) {
            tourneyTitle = '🏆 İmparatorluk Şampiyonu Unvanı Kazanıldı!';
            tourneySub = 'Turnuvayı yeniden oynayabilir veya Prestijli New Game+ ile daha güçlü varis + yüksek ödüllerle yeni döngü başlatabilirsin.';
            tourneyBtnLabel = '👑 Turnuvayı Yeniden Başlat';
        }

        careerLadderPanel.innerHTML = `
            <div class="career-head">
                <strong>🗺️ 4 Bölgeli Kariyer Merdiveni${ng > 0 ? ` (🔥 NG+${ng})` : ''}</strong>
                <span>Şöhret arttıkça yeni arenalar açılır. Açık bir bölgeye tıklayarak rakipleri ve arena atmosferini seçebilirsin.</span>
            </div>
            <div class="career-regions-grid">${regionsHtml}</div>
            <div class="tournament-banner">
                <div class="tournament-info">
                    <strong>${tourneyTitle}</strong>
                    <span>${tourneySub}</span>
                </div>
                <div class="tournament-actions">
                    <button id="btn-start-tournament" type="button" class="primary-btn" ${imperialUnlocked ? '' : 'disabled'}>
                        ${imperialUnlocked ? tourneyBtnLabel : `🔒 150 Şöhret (${fame}/150)`}
                    </button>
                    ${tourney.completedChampionship ? '<button id="btn-arena-ngplus" type="button" class="doctore-btn">🔥 Prestijli New Game+</button>' : ''}
                </div>
            </div>
        `;

        careerLadderPanel.querySelectorAll('.region-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const res = ludus.selectRegion(btn.dataset.region);
                if (!res.ok && res.msg) {
                    showToast(res.msg, true);
                } else if (res.ok && res.region) {
                    showToast(`${res.region.icon} Bölge seçildi: ${res.region.name}`);
                    renderAll();
                }
            });
        });

        const startTourneyBtn = document.getElementById('btn-start-tournament');
        if (startTourneyBtn) {
            startTourneyBtn.addEventListener('click', () => {
                const fighterId = (tourney.active && tourney.fighterId) ? tourney.fighterId : arenaFighterSelect.value;
                const fighter = ludus.state.roster.find(g => g.id === fighterId);
                if (!fighter) {
                    showToast('Turnuva savaşçısı kadroda bulunamadı.', true);
                    return;
                }
                if (!tourney.active) {
                    const maxHp = ludus.getGladiatorMaxHp(fighter);
                    if (fighter.currentHp < Math.ceil(maxHp * 0.25)) {
                        showToast(`${fighter.name} çok yaralı! Turnuva öncesi iyileştir.`, true);
                        return;
                    }
                } else if (fighter.currentHp <= 0) {
                    showToast(`${fighter.name} dövüşemeyecek durumda!`, true);
                    return;
                }
                arenaFighterSelect.value = fighter.id;
                const tRes = ludus.getNextTournamentOpponent(fighter.id);
                if (!tRes.ok) {
                    showToast(tRes.msg || 'Turnuva başlatılamadı.', true);
                    return;
                }
                startArenaMatch(tRes.opp);
            });
        }

        const arenaNgBtn = document.getElementById('btn-arena-ngplus');
        if (arenaNgBtn) {
            arenaNgBtn.addEventListener('click', () => {
                openChampionModal(lastChampionGladiatorId || arenaFighterSelect.value, null);
            });
        }
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
            favoriteWeaponId: g.favoriteWeaponId || null,
            loyalty: g.loyalty !== undefined ? g.loyalty : 65,
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

        const isMidTournamentRound = Boolean(opp.isTournament && (opp.tournamentRound || 1) > 1);
        for (const g of myGlads) {
            const maxHp = ludus.getGladiatorMaxHp(g);
            if (!isMidTournamentRound && g.currentHp < Math.ceil(maxHp * 0.25)) {
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

        if (Game.BettingRules && selectedBet.type !== 'none') {
            const oddsCheck = ludus.getMatchOdds(selectedIds, opp);
            const preCheck = Game.BettingRules.validateBet(selectedBet, ludus.state.gold, opp, oddsCheck);
            if (!preCheck.ok) {
                showToast(preCheck.msg, true);
                return;
            }
        }

        const launchMatch = () => {
            const activeBet = ludus.placeMatchBet(selectedIds, opp, selectedBet);
            if (!activeBet.ok) {
                showToast(activeBet.msg, true);
                return;
            }
            if (activeBet.active) {
                selectedBet.type = 'none';
                renderTopStats();
            }

            const usedConsumables = consIds.map(cid => ludus.consumeArenaItem(cid));

            matchInProgress = true;
            ludusTree.paused = true;
            arenaPrepView.classList.add('hidden');
            arenaCombatView.classList.remove('hidden');
            battleLogEl.innerHTML = '';
            winnerBanner.classList.add('hidden');

            const bribeActive = Boolean(opp.bribeOffer && opp.bribeOffer.accepted);
            const isBribeThrow = bribeActive && opp.bribeOffer.type === 'throw_match';
            const isEnemySabotaged = bribeActive && opp.bribeOffer.type === 'sabotage_enemy';
            const pairSynergy = (is2v2 && selectedIds.length >= 2)
                ? ludus.get2v2Synergy(selectedIds[0], selectedIds[1])
                : null;

            const leftConfigs = myGlads.map((g, idx) => Object.assign(
                toGladiatorConfig(g, false, usedConsumables[idx] || null),
                {
                    bribeThrow: idx === 0 && isBribeThrow,
                    allySynergy: pairSynergy
                }
            ));
            const rightConfigs = is2v2
                ? [toGladiatorConfig(opp, false), toGladiatorConfig(opp.partner, false)]
                : [Object.assign(toGladiatorConfig(opp, Boolean(opp.isBoss)), { sabotaged: isEnemySabotaged })];

            const matchRegionId = opp.isTournament ? 'imperial' : ludus.getCurrentRegion().id;
            const matchIsLethal = Boolean(opp.lethal);
            currentArena = new Game.ArenaScene(leftConfigs, rightConfigs, {
                regionId: matchRegionId,
                isLethal: matchIsLethal
            });
            currentArena.onBattleLog.connect(addLog);

            const updateCrowdHud = () => {
                if (!crowdHudBar || !currentArena || !Game.CrowdRules) return;
                const favorVal = Game.CrowdRules.clampFavor(currentArena.crowdFavor);
                const tier = Game.CrowdRules.getCrowdTier(favorVal);
                crowdHudBar.className = `crowd-hud-bar ${tier.id}`;
                if (crowdTierLabel) {
                    const tipHint = tier.tipMult > 0 ? ` (+%${Math.round(tier.tipMult * 100)} Bahşiş)` : '';
                    crowdTierLabel.textContent = `📣 Seyirci Coşkusu: ${tier.label}${tipHint}`;
                }
                if (crowdFavorFill) crowdFavorFill.style.width = `${favorVal}%`;
                if (crowdFavorText) crowdFavorText.textContent = `${favorVal} / 100`;

                if (crowdMercyLabel) {
                    if (matchIsLethal && !isBribeThrow) {
                        const hasFavTrait = myGlads.some(fg => fg.traitId === 'crowd_favorite');
                        const tulliusRep = (ludus.state.senate && ludus.state.senate.reputations && ludus.state.senate.reputations.tullius) || 0;
                        const mercyChance = Game.CrowdRules.calculateMercyChance(favorVal, hasFavTrait, tulliusRep);
                        crowdMercyLabel.classList.remove('hidden');
                        crowdMercyLabel.textContent = `👍 Pollice Verso Kurtuluş Şansı: %${Math.round(mercyChance * 100)}`;
                    } else {
                        crowdMercyLabel.classList.add('hidden');
                    }
                }
            };
            updateCrowdHud();

            pendingReturnTab = 'ludus';
            pendingChampionCeremony = null;
            returnLudusBtn.textContent = "🏛️ Ludus'a Dön";

            currentArena.onMatchFinished.connect((_, teamSide) => {
                const didWin = teamSide === 'left';
                const remHps = currentArena.leftTeam.map(f => f.hp);
                const matchCrowdFavor = currentArena.getMatchCrowdFavor ? currentArena.getMatchCrowdFavor() : Math.round(currentArena.crowdFavor || 0);

                if (opp.isTournament) {
                    const res = ludus.recordTournamentMatchResult(selectedIds[0], opp, didWin, remHps[0], {
                        durationSec: currentArena.matchTime,
                        activeBet,
                        crowdFavor: matchCrowdFavor
                    });
                    renderTopStats();
                    const betNote = res.betResult ? ` • ${res.betResult.summary}` : '';
                    const sparsioNote = (res.sparsioResult && res.sparsioResult.triggered) ? ` • ${res.sparsioResult.summary}` : '';

                    if (res.wonChampionship) {
                        const lvlMsg = res.leveledNames.length > 0 ? ` 🌟 SEVİYE ATLADI: ${res.leveledNames.join(', ')}!` : '';
                        winnerText.textContent = `👑 İMPARATORLUK ŞAMPİYONU! +${res.goldEarned} Altın, +${res.fameEarned} Şöhret (+${res.xpReward} XP)${lvlMsg}${sparsioNote}${betNote}`;
                        pendingChampionCeremony = { fighterId: selectedIds[0], res };
                        returnLudusBtn.textContent = '👑 Taç Törenini Gör!';
                    } else if (didWin && res.nextRound) {
                        const healNote = res.breatherHeal > 0 ? ` • 💚 +${res.breatherHeal} Soluklanma Canı` : '';
                        winnerText.textContent = `🏆 TUR ${opp.tournamentRound}/3 KAZANILDI! +${res.goldEarned} Altın (+${res.xpReward} XP)${healNote}${sparsioNote}${betNote}`;
                        pendingReturnTab = 'arena';
                        returnLudusBtn.textContent = `⚔️ Arena'ya Dön (Tur ${res.nextRound}/3)`;
                    } else {
                        const injTxt = res.injuries.length > 0 ? ` • 🩹 ${res.injuries[0]}` : '';
                        winnerText.textContent = `💀 Turnuvadan Elendin (${opp.tournamentRound}/3)! (+${res.goldEarned} Altın, +${res.xpReward} XP${injTxt})${betNote}`;
                    }
                    winnerBanner.classList.remove('hidden');
                    return;
                }

                const res = ludus.recordTeamMatchResult(selectedIds, opp.id, didWin, remHps, {
                    durationSec: currentArena.matchTime,
                    consumablesUsed: usedConsumables.map(c => (c ? c.id : null)),
                    activeBet,
                    crowdFavor: matchCrowdFavor
                });
                renderTopStats();

                const contractNote = res.contractCompleted
                    ? ` • 📜 SENATO KONTRATI TAMAMLANDI (${res.contractCompleted.title}: +${res.contractCompleted.rewardGold} Altın, +${res.contractCompleted.repReward} İtibar)!`
                    : '';
                const bribeNote = res.bribeResult ? ` • ${res.bribeResult.summary}` : '';
                const betNote = res.betResult ? ` • ${res.betResult.summary}` : '';
                const sparsioNote = (res.sparsioResult && res.sparsioResult.triggered) ? ` • ${res.sparsioResult.summary}` : '';
                const relNote = res.relationUpdate
                    ? ` • 🤝 Takım İlişkisi +${res.relationUpdate.delta}${res.relationUpdate.promotedTier ? ` (${res.relationUpdate.promotedTier.badge}!)` : ''}`
                    : '';

                const reqNote = (res.fulfilledRequests && res.fulfilledRequests.length > 0)
                    ? ` • 💬 İSTEK TAMAMLANDI: ${res.fulfilledRequests.map(r => r.name).join(', ')}!`
                    : '';

                if (didWin) {
                    const lvlMsg = res.leveledNames.length > 0 ? ` 🌟 SEVİYE ATLADI: ${res.leveledNames.join(', ')}!` : '';
                    const promoMsg = res.promotedRegion ? ` • 🗺️ YENİ BÖLGE: ${res.promotedRegion.icon} ${res.promotedRegion.name}!` : '';
                    winnerText.textContent = `🏆 ZAFER! +${res.goldEarned} Altın, +${res.fameEarned} Şöhret (+${res.xpReward} XP)${lvlMsg}${promoMsg}${sparsioNote}${contractNote}${bribeNote}${betNote}${relNote}${reqNote}`;
                } else if (res.sparedNames && res.sparedNames.length > 0 && res.deadNames.length === 0) {
                    const injTxt = res.injuries.length > 0 ? ` • 🩹 ${res.injuries[0]}` : '';
                    winnerText.textContent = `👍 MISSIO! İmparator başparmağını YUKARI kaldırdı — ${res.sparedNames.join(', ')} bağışlandı (1 Can, +15 Sadakat)! (+${res.goldEarned} Altın, +${res.xpReward} XP${injTxt})${bribeNote}${betNote}${relNote}`;
                } else if (res.deadNames.length > 0) {
                    const rookieMsg = res.rescuedByRookie ? ' (Sokaktan yeni bir çaylak katıldı!)' : '';
                    const sparedMsg = (res.sparedNames && res.sparedNames.length > 0) ? ` • 👍 ${res.sparedNames.join(', ')} İmparator tarafından bağışlandı!` : '';
                    const downPollice = (res.polliceResults && res.polliceResults.find(p => p.eligible && !p.spared));
                    const polliceMsg = downPollice ? ` (${downPollice.summary})` : '';
                    winnerText.textContent = `⚰️ ${res.deadNames.join(', ')} ARENADA CAN VERDİ!${polliceMsg}${sparedMsg}${rookieMsg}${bribeNote}${betNote}`;
                } else if (res.bribeResult && res.bribeResult.keptDeal && res.bribeResult.type === 'throw_match') {
                    winnerText.textContent = `🎭 ŞİKE MAÇI BİTTİ! ${res.bribeResult.summary} (+${res.xpReward} XP)${betNote}`;
                } else {
                    const injTxt = res.injuries.length > 0 ? ` • 🩹 ${res.injuries[0]}` : '';
                    winnerText.textContent = `💀 YENİLGİ! (+${res.goldEarned} Altın, +${res.xpReward} XP${injTxt})${bribeNote}${betNote}${relNote}`;
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
                desc: `⚠️ DİKKAT: ${names} bu maçta yenilirse KALICI OLARAK ÖLECEK (Yüksek seyirci coşkusu İmparatorun Pollice Verso merhametini getirebilir). Yine de arenaya çıksın mı?`,
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
        const ceremony = pendingChampionCeremony;
        pendingChampionCeremony = null;
        returnLudusBtn.textContent = "🏛️ Ludus'a Dön";
        switchTab(pendingReturnTab || 'ludus');
        pendingReturnTab = 'ludus';
        if (ceremony) {
            openChampionModal(ceremony.fighterId, ceremony.res);
        }
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

        if (crowdHudBar && Game.CrowdRules) {
            const favorVal = Game.CrowdRules.clampFavor(currentArena.crowdFavor);
            const tier = Game.CrowdRules.getCrowdTier(favorVal);
            crowdHudBar.className = `crowd-hud-bar ${tier.id}`;
            if (crowdTierLabel) {
                const tipHint = tier.tipMult > 0 ? ` (+%${Math.round(tier.tipMult * 100)} Bahşiş)` : '';
                crowdTierLabel.textContent = `📣 Seyirci Coşkusu: ${tier.label}${tipHint}`;
            }
            if (crowdFavorFill) crowdFavorFill.style.width = `${favorVal}%`;
            if (crowdFavorText) crowdFavorText.textContent = `${favorVal} / 100`;
            if (crowdMercyLabel && !crowdMercyLabel.classList.contains('hidden')) {
                const hasFavTrait = currentArena.leftTeam.some(f => f && f.trait && f.trait.id === 'crowd_favorite');
                const tulliusRep = (ludus.state.senate && ludus.state.senate.reputations && ludus.state.senate.reputations.tullius) || 0;
                const mercyChance = Game.CrowdRules.calculateMercyChance(favorVal, hasFavTrait, tulliusRep);
                crowdMercyLabel.textContent = `👍 Pollice Verso Kurtuluş Şansı: %${Math.round(mercyChance * 100)}`;
            }
        }
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
        const promoted = ludus.devAddFame(25);
        showToast(promoted
            ? `🗺️ Test: +25 Şöhret eklendi — Yeni Bölge Açıldı: ${promoted.icon} ${promoted.name}!`
            : '🛠️ Test: +25 Şöhret eklendi!');
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
    const devUnlockTourneyBtn = document.getElementById('dev-unlock-tourney');
    if (devUnlockTourneyBtn) {
        devUnlockTourneyBtn.addEventListener('click', () => {
            if (matchInProgress) return;
            ludus.devUnlockTournament();
            showToast('👑 Test: İmparatorluk Turnuvası (150 Şöhret) açıldı! Arena sekmesine bak.');
            renderAll();
        });
    }
    const devNewContractBtn = document.getElementById('dev-new-contract');
    if (devNewContractBtn) {
        devNewContractBtn.addEventListener('click', () => {
            if (matchInProgress) return;
            const c = ludus.devGenerateSenateContract();
            showToast(c ? `🏛️ Test: Yeni Senato Kontratı: ${c.title}` : 'Kontrat üretilemedi.', !c);
            renderAll();
        });
    }
    const devSpawnBribeBtn = document.getElementById('dev-spawn-bribe');
    if (devSpawnBribeBtn) {
        devSpawnBribeBtn.addEventListener('click', () => {
            if (matchInProgress) return;
            const res = ludus.devSpawnBribeOffer();
            showToast(res ? `🤫 Test: ${res.opp.name} maçına Şike Teklifi eklendi! Arena sekmesine bak.` : 'Uygun 1v1 rakip yok!', !res);
            renderAll();
        });
    }

    const devLowLoyaltyBtn = document.getElementById('dev-low-loyalty');
    if (devLowLoyaltyBtn) {
        devLowLoyaltyBtn.addEventListener('click', () => {
            const sel = ludus.getSelectedGladiator();
            if (!sel) return;
            const nextVal = ludus.devAdjustLoyalty(sel.id, -30);
            showToast(`😠 Test: ${sel.name} sadakati düşürüldü (${nextVal}/100)!`, true);
            renderAll();
        });
    }
    const devNewRequestBtn = document.getElementById('dev-new-request');
    if (devNewRequestBtn) {
        devNewRequestBtn.addEventListener('click', () => {
            const sel = ludus.getSelectedGladiator();
            if (!sel) return;
            const req = ludus.devGenerateRequest(sel.id);
            showToast(req ? `💬 Test: ${sel.name} için istek üretildi: ${req.title}` : 'İstek üretilemedi.', !req);
            renderAll();
        });
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
        if (matchInProgress) return;
        const info = ludus.nextDay();
        const isBoss = ludus.state.day % 5 === 0;
        const injuryNote = (info.healedInjuries && info.healedInjuries.length > 0)
            ? ` • 🩹 Revirde iyileşti: ${info.healedInjuries.join(', ')}`
            : '';
        const reqNote = (info.fulfilledRequestNames && info.fulfilledRequestNames.length > 0)
            ? ` • 💬 İstek tamamlandı: ${info.fulfilledRequestNames.join(', ')}`
            : '';
        const floorNote = info.starvationFloorApplied
            ? ' (Savaşçı %25 dövüş sınırına toparlandı)'
            : '';
        const relNote = (info.relationEvents && info.relationEvents.triggered && info.relationEvents.events.length > 0)
            ? ` • ${info.relationEvents.events[0].summary}`
            : '';
        const rebellionTriggered = info.rebellionReport && info.rebellionReport.triggered;

        if (rebellionTriggered) {
            showToast(`⚠️ İSYAN RİSKİ! ${info.rebellionReport.instigators.join(', ')} gece huzursuzluk çıkardı — diğerlerinin morali (-6) düştü!`, true);
        } else if (info.starved) {
            showToast(`⚠️ Erzak parası yetmedi (-🪙${info.upkeep})! Kadro az iyileşti ve sadakat düştü${floorNote}.`, true);
        } else if (isBoss) {
            showToast(`👑 Gün ${ludus.state.day}: ŞAMPİYONA BOSS GÜNÜ! (-🪙${info.upkeep})${injuryNote}${reqNote}${relNote}`);
        } else {
            showToast(`Gün ${ludus.state.day} başladı! (-🪙${info.upkeep} masraf)${injuryNote}${reqNote}${relNote}${floorNote}`);
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