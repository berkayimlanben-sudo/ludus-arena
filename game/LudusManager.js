(function (Game, Data) {
    const SAVE_KEY = 'ludus_arena_save_v1';

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function pickRandomKey(dict) {
        const keys = Object.keys(dict);
        return keys[Math.floor(Math.random() * keys.length)];
    }

    class LudusManager {
        constructor() {
            this.state = null;
            if (!this.loadFromLocalStorage()) {
                this.newGame();
            }
        }

        newGame() {
            this.state = {
                day: 1,
                gold: 220,
                fame: 0,
                buildings: {
                    trainingYard: 1,
                    infirmary: 1,
                    blacksmith: 1
                },
                inventory: {
                    weapons: { dagger: 1 },
                    shields: { parma: 1 },
                    armors: { leather: 1 },
                    helmets: { galea: 1 }
                },
                roster: [
                    this._createGladiator({
                        name: 'Maximus',
                        origin: 'Trakyalı',
                        traitId: 'disciplined',
                        stats: { strength: 11, agility: 10, vitality: 11 },
                        weaponId: 'sword',
                        shieldId: 'none',
                        armorId: 'tunic',
                        helmetId: 'none'
                    })
                ],
                selectedGladiatorId: null,
                marketRecruits: [],
                dailyOpponents: []
            };
            this.state.selectedGladiatorId = this.state.roster[0].id;
            this.refreshDailyEvents();
            this.saveToLocalStorage();
        }

        _migrateState() {
            if (!this.state) return;
            const ensureTrait = (obj) => {
                if (!obj.traitId) obj.traitId = pickRandomKey(Data.TRAITS);
                if (obj.injuryId === undefined) obj.injuryId = null;
            };
            (this.state.roster || []).forEach(ensureTrait);
            (this.state.marketRecruits || []).forEach(ensureTrait);
            (this.state.dailyOpponents || []).forEach(ensureTrait);
        }

        _createGladiator(opts = {}) {
            const id = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            const stats = opts.stats || { strength: 9, agility: 9, vitality: 9 };
            const armorId = opts.armorId || 'tunic';
            const g = {
                id,
                name: opts.name || pickRandom(Data.GLADIATOR_NAMES),
                origin: opts.origin || pickRandom(Data.ORIGINS),
                skinColor: opts.skinColor || pickRandom(Data.SKIN_TONES),
                traitId: opts.traitId || pickRandomKey(Data.TRAITS),
                injuryId: null,
                stats,
                weaponId: opts.weaponId || 'dagger',
                shieldId: opts.shieldId || 'none',
                armorId,
                helmetId: opts.helmetId || 'none',
                currentHp: 0,
                wins: 0,
                losses: 0
            };
            g.currentHp = this.getGladiatorMaxHp(g);
            return g;
        }

        getEffectiveStats(g) {
            const s = Object.assign({}, g.stats);
            if (g.injuryId && Data.INJURIES[g.injuryId]) {
                const inj = Data.INJURIES[g.injuryId];
                s[inj.stat] = Math.max(4, s[inj.stat] - inj.penalty);
            }
            return s;
        }

        getGladiatorMaxHp(g) {
            const armor = Data.ARMORS[g.armorId] || Data.ARMORS.tunic;
            const eff = this.getEffectiveStats(g);
            return 80 + eff.vitality * 6 + (armor.hpBonus || 0);
        }

        getGladiatorSummary(g) {
            const w = Data.WEAPONS[g.weaponId];
            const s = Data.SHIELDS[g.shieldId];
            const a = Data.ARMORS[g.armorId];
            const h = Data.HELMETS[g.helmetId];
            const eff = this.getEffectiveStats(g);

            const weight = w.weight + s.weight + a.weight + h.weight;
            const maxHp = this.getGladiatorMaxHp(g);
            const traitDef = g.traitId === 'iron_skin' ? 3 : (g.traitId === 'fierce' ? -2 : 0);
            const traitSpd = g.traitId === 'nimble' ? 18 : 0;

            const def = Math.max(0, Math.round(eff.vitality * 0.35) + a.defense + h.defense + traitDef);
            const spd = Math.max(60, Math.round(128 + eff.agility * 4 - weight * 2.4 + traitSpd));
            return { maxHp, def, spd, weight, eff };
        }

        getSelectedGladiator() {
            let found = this.state.roster.find(g => g.id === this.state.selectedGladiatorId);
            if (!found && this.state.roster.length > 0) {
                found = this.state.roster[0];
                this.state.selectedGladiatorId = found.id;
            }
            return found || null;
        }

        refreshDailyEvents() {
            // 1. Günlük Pazar
            this.state.marketRecruits = [];
            for (let i = 0; i < 3; i++) {
                const fameBonus = Math.floor(this.state.fame / 15);
                const budget = randInt(26, 32) + Math.min(12, fameBonus);
                const stats = { strength: 7, agility: 7, vitality: 7 };
                let rem = budget - 21;
                const keys = ['strength', 'agility', 'vitality'];
                while (rem > 0) {
                    stats[pickRandom(keys)]++;
                    rem--;
                }
                const weaponId = Math.random() < 0.35 ? 'sword' : 'dagger';
                const armorId = Math.random() < 0.3 ? 'leather' : 'tunic';
                const price = 75 + (budget - 26) * 14 + (weaponId === 'sword' ? 35 : 0) + (armorId === 'leather' ? 25 : 0);

                this.state.marketRecruits.push({
                    id: 'rec_' + i + '_' + Date.now(),
                    name: pickRandom(Data.GLADIATOR_NAMES),
                    origin: pickRandom(Data.ORIGINS),
                    skinColor: pickRandom(Data.SKIN_TONES),
                    traitId: pickRandomKey(Data.TRAITS),
                    stats,
                    weaponId,
                    shieldId: 'none',
                    armorId,
                    helmetId: 'none',
                    price,
                    hired: false
                });
            }

            // 2. Günlük Arena Rakipleri
            this.state.dailyOpponents = [];
            const unlockedTiers = Data.ARENA_TIERS.filter(t => this.state.fame >= t.minFame);
            const isBossDay = (this.state.day % 5 === 0);

            for (let i = 0; i < 3; i++) {
                // 5. Günlerde 3. slot Şampiyona Boss'u olur!
                if (isBossDay && i === 2 && Data.BOSSES && Data.BOSSES.length > 0) {
                    const tpl = pickRandom(Data.BOSSES);
                    const bossTier = Math.max(0, Math.floor(this.state.day / 5) - 1);
                    const stats = {
                        strength: tpl.baseStats.strength + bossTier * 2,
                        agility: tpl.baseStats.agility + bossTier * 2,
                        vitality: tpl.baseStats.vitality + bossTier * 2
                    };
                    const armorObj = Data.ARMORS[tpl.armorId];
                    const maxHp = 80 + stats.vitality * 6 + armorObj.hpBonus;

                    this.state.dailyOpponents.push({
                        id: 'boss_' + Date.now(),
                        isBoss: true,
                        tierName: '👑 ŞAMPİYONA BOSS',
                        badge: 'BOSS',
                        name: tpl.name,
                        skinColor: tpl.skinColor,
                        traitId: tpl.traitId,
                        stats,
                        weaponId: tpl.weaponId,
                        shieldId: tpl.shieldId,
                        armorId: tpl.armorId,
                        helmetId: tpl.helmetId,
                        maxHp,
                        rewardGold: 380 + bossTier * 150,
                        rewardFame: 40 + bossTier * 15,
                        completed: false
                    });
                    continue;
                }

                const tier = unlockedTiers[Math.min(i, unlockedTiers.length - 1)];
                const budget = randInt(tier.statBudget[0], tier.statBudget[1]);
                const stats = { strength: 7, agility: 7, vitality: 7 };
                let rem = budget - 21;
                const keys = ['strength', 'agility', 'vitality'];
                while (rem > 0) {
                    stats[pickRandom(keys)]++;
                    rem--;
                }

                const pickItemByTier = (dict, allowNone = false) => {
                    const list = Object.values(dict).filter(it => it.tier <= tier.maxTier && (allowNone || it.id !== 'none'));
                    return pickRandom(list).id;
                };

                const weaponId = pickItemByTier(Data.WEAPONS, false);
                const shieldId = (weaponId === 'spear' || weaponId === 'trident' || weaponId === 'axe')
                    ? 'none'
                    : pickItemByTier(Data.SHIELDS, true);
                const armorId = pickItemByTier(Data.ARMORS, false);
                const helmetId = pickItemByTier(Data.HELMETS, true);

                const armorObj = Data.ARMORS[armorId];
                const maxHp = 80 + stats.vitality * 6 + armorObj.hpBonus;

                this.state.dailyOpponents.push({
                    id: 'opp_' + i + '_' + Date.now(),
                    isBoss: false,
                    tierName: tier.name,
                    badge: tier.badge,
                    name: pickRandom(Data.GLADIATOR_NAMES),
                    skinColor: pickRandom(Data.SKIN_TONES),
                    traitId: pickRandomKey(Data.TRAITS),
                    stats,
                    weaponId,
                    shieldId,
                    armorId,
                    helmetId,
                    maxHp,
                    rewardGold: randInt(tier.rewardGold[0], tier.rewardGold[1]),
                    rewardFame: randInt(tier.rewardFame[0], tier.rewardFame[1]),
                    completed: false
                });
            }
        }

        // --- TEST / GELİŞTİRİCİ ARAÇLARI ---
        devAddGold(amount) {
            this.state.gold += amount;
            this.saveToLocalStorage();
        }

        devAddFame(amount) {
            this.state.fame += amount;
            this.saveToLocalStorage();
        }

        devJumpToBossDay() {
            const rem = this.state.day % 5;
            const add = rem === 0 ? 5 : (5 - rem);
            this.state.day += add;
            this.devHealAll();
            this.refreshDailyEvents();
            this.saveToLocalStorage();
        }

        devHealAll() {
            for (const g of this.state.roster) {
                g.injuryId = null;
                g.currentHp = this.getGladiatorMaxHp(g);
            }
            this.saveToLocalStorage();
        }

        // --- NORMAL EYLEMLER ---
        getTrainingCost(g, statKey) {
            const cur = g.stats[statKey];
            const lvl = this.state.buildings.trainingYard;
            const discount = 1 - (lvl - 1) * 0.10;
            return Math.max(12, Math.round((20 + (cur - 7) * 7) * discount));
        }

        getStatCap() {
            return 18 + (this.state.buildings.trainingYard - 1) * 4;
        }

        trainStat(gladiatorId, statKey) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g) return { ok: false, msg: 'Gladyatör bulunamadı.' };

            const cap = this.getStatCap();
            if (g.stats[statKey] >= cap) {
                return { ok: false, msg: `Stat sınırına (${cap}) ulaşıldı! Eğitim Alanını yükselt.` };
            }

            const cost = this.getTrainingCost(g, statKey);
            if (this.state.gold < cost) return { ok: false, msg: 'Yeterli altın yok!' };

            this.state.gold -= cost;
            g.stats[statKey] += 1;
            if (statKey === 'vitality') g.currentHp += 6;
            this.saveToLocalStorage();
            return { ok: true };
        }

        getHealCost(g) {
            const maxHp = this.getGladiatorMaxHp(g);
            const missing = Math.max(0, maxHp - g.currentHp);
            const injCost = g.injuryId ? 15 : 0;
            if (missing === 0 && !g.injuryId) return 0;
            const rate = Math.max(0.2, 0.55 - (this.state.buildings.infirmary - 1) * 0.08);
            return Math.max(8, Math.ceil(missing * rate) + injCost);
        }

        healGladiator(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g) return { ok: false };
            const cost = this.getHealCost(g);
            if (cost === 0) return { ok: false, msg: 'Tamamen sağlıklı.' };
            if (this.state.gold < cost) return { ok: false, msg: 'Tedavi için altın yetersiz!' };

            this.state.gold -= cost;
            g.injuryId = null;
            g.currentHp = this.getGladiatorMaxHp(g);
            this.saveToLocalStorage();
            return { ok: true };
        }

        buyItem(categoryKey, itemId) {
            const dictMap = { weapons: Data.WEAPONS, shields: Data.SHIELDS, armors: Data.ARMORS, helmets: Data.HELMETS };
            const item = dictMap[categoryKey][itemId];
            if (!item) return { ok: false };
            if (item.tier > this.state.buildings.blacksmith) return { ok: false, msg: `Demirci Seviye ${item.tier} gerekiyor!` };
            if (this.state.gold < item.price) return { ok: false, msg: 'Yeterli altın yok!' };

            this.state.gold -= item.price;
            const inv = this.state.inventory[categoryKey];
            inv[itemId] = (inv[itemId] || 0) + 1;
            this.saveToLocalStorage();
            return { ok: true };
        }

        equipItem(gladiatorId, categoryKey, itemId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g) return { ok: false };

            const propMap = { weapons: 'weaponId', shields: 'shieldId', armors: 'armorId', helmets: 'helmetId' };
            const prop = propMap[categoryKey];
            const oldItemId = g[prop];
            if (oldItemId === itemId) return { ok: false };

            const inv = this.state.inventory[categoryKey];
            const isFreeDefault = (itemId === 'none' || itemId === 'tunic');

            if (!isFreeDefault) {
                if (!inv[itemId] || inv[itemId] <= 0) return { ok: false, msg: 'Envanterde bu eşyadan yok!' };
                inv[itemId] -= 1;
            }
            if (oldItemId !== 'none' && oldItemId !== 'tunic') {
                inv[oldItemId] = (inv[oldItemId] || 0) + 1;
            }

            g[prop] = itemId;
            g.currentHp = Math.min(this.getGladiatorMaxHp(g), g.currentHp);
            this.saveToLocalStorage();
            return { ok: true };
        }

        hireRecruit(recruitId) {
            if (this.state.roster.length >= 6) return { ok: false, msg: 'Ludus kadrosu dolu! (Maksimum 6)' };
            const rec = this.state.marketRecruits.find(r => r.id === recruitId && !r.hired);
            if (!rec) return { ok: false };
            if (this.state.gold < rec.price) return { ok: false, msg: 'Yeterli altın yok!' };

            this.state.gold -= rec.price;
            rec.hired = true;

            const newGlad = this._createGladiator({
                name: rec.name,
                origin: rec.origin,
                skinColor: rec.skinColor,
                traitId: rec.traitId,
                stats: Object.assign({}, rec.stats),
                weaponId: rec.weaponId,
                shieldId: rec.shieldId,
                armorId: rec.armorId,
                helmetId: rec.helmetId
            });
            this.state.roster.push(newGlad);
            this.state.selectedGladiatorId = newGlad.id;
            this.saveToLocalStorage();
            return { ok: true };
        }

        getBuildingUpgradeCost(buildingId) {
            const b = Data.BUILDINGS[buildingId];
            return Math.round(b.baseCost * Math.pow(1.65, this.state.buildings[buildingId] - 1));
        }

        upgradeBuilding(buildingId) {
            const b = Data.BUILDINGS[buildingId];
            if (this.state.buildings[buildingId] >= b.maxLevel) return { ok: false, msg: 'Maksimum seviyede!' };
            const cost = this.getBuildingUpgradeCost(buildingId);
            if (this.state.gold < cost) return { ok: false, msg: 'Altın yetersiz!' };

            this.state.gold -= cost;
            this.state.buildings[buildingId] += 1;
            this.saveToLocalStorage();
            return { ok: true };
        }

        nextDay() {
            this.state.day += 1;
            const healPct = 0.25 + (this.state.buildings.infirmary - 1) * 0.15;

            for (const g of this.state.roster) {
                g.injuryId = null;
                const maxHp = this.getGladiatorMaxHp(g);
                g.currentHp = Math.min(maxHp, g.currentHp + Math.ceil(maxHp * healPct));
            }

            this.refreshDailyEvents();
            this.saveToLocalStorage();
        }

        recordMatchResult(gladiatorId, opponentId, didWin, remainingHp) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            const opp = this.state.dailyOpponents.find(o => o.id === opponentId);

            if (opp) opp.completed = true;

            let goldEarned = 0;
            let fameEarned = 0;
            let injuryName = null;

            if (g) {
                if (didWin) {
                    g.wins += 1;
                    g.currentHp = Math.max(1, Math.round(remainingHp));
                    if (opp) {
                        goldEarned = opp.rewardGold;
                        fameEarned = g.traitId === 'crowd_favorite'
                            ? Math.round(opp.rewardFame * 1.3)
                            : opp.rewardFame;
                    }
                } else {
                    g.losses += 1;
                    g.currentHp = 1;
                    if (Math.random() < 0.75) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuryName = Data.INJURIES[g.injuryId].name;
                    }
                    if (opp) goldEarned = Math.round(opp.rewardGold * 0.15);
                }
            }

            this.state.gold += goldEarned;
            this.state.fame += fameEarned;
            this.saveToLocalStorage();
            return { goldEarned, fameEarned, injuryName };
        }

        saveToLocalStorage() {
            try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
        }

        loadFromLocalStorage() {
            try {
                const raw = localStorage.getItem(SAVE_KEY);
                if (!raw) return false;
                const parsed = JSON.parse(raw);
                if (!parsed || !Array.isArray(parsed.roster)) return false;
                this.state = parsed;
                this._migrateState();
                return true;
            } catch (e) { return false; }
        }

        exportSaveJSON() {
            return JSON.stringify(this.state, null, 2);
        }

        importSaveJSON(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                if (!parsed || !Array.isArray(parsed.roster) || !parsed.buildings) return false;
                this.state = parsed;
                this._migrateState();
                this.saveToLocalStorage();
                return true;
            } catch (e) { return false; }
        }
    }

    Game.LudusManager = LudusManager;
})(window.LudusGame = window.LudusGame || {}, window.LudusData);