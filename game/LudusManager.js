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
                gold: 240,
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
                        styleId: 'balanced',
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
            const ensureGlad = (obj) => {
                if (!obj.traitId) obj.traitId = pickRandomKey(Data.TRAITS);
                if (!obj.styleId) obj.styleId = 'balanced';
                if (obj.fatigue === undefined) obj.fatigue = 0;
                if (obj.injuryId === undefined) obj.injuryId = null;
                if (obj.level === undefined) obj.level = 1;
                if (obj.xp === undefined) obj.xp = 0;
                if (obj.xpToNext === undefined) obj.xpToNext = 100 + (obj.level - 1) * 60;
                if (!Array.isArray(obj.perks)) obj.perks = [];
                if (obj.pendingPerkChoices === undefined) obj.pendingPerkChoices = null;
            };
            (this.state.roster || []).forEach(ensureGlad);
            (this.state.marketRecruits || []).forEach(ensureGlad);
            (this.state.dailyOpponents || []).forEach(opp => {
                ensureGlad(opp);
                if (opp.lethal === undefined) opp.lethal = false;
                if (!opp.ruleId) opp.ruleId = 'standard';
                if (opp.partner === undefined) opp.partner = null;
            });
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
                styleId: opts.styleId || 'balanced',
                level: opts.level || 1,
                xp: 0,
                xpToNext: 100,
                perks: opts.perks || [],
                pendingPerkChoices: null,
                fatigue: 0,
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
            const fat = g.fatigue || 0;
            const fatMult = fat >= 2 ? 0.60 : (fat === 1 ? 0.80 : 1.0);
            if (fatMult < 1.0) {
                s.strength = Math.max(4, Math.round(s.strength * fatMult));
                s.agility = Math.max(4, Math.round(s.agility * fatMult));
                s.vitality = Math.max(4, Math.round(s.vitality * fatMult));
            }
            if (g.injuryId && Data.INJURIES[g.injuryId]) {
                const inj = Data.INJURIES[g.injuryId];
                s[inj.stat] = Math.max(4, s[inj.stat] - inj.penalty);
            }
            return s;
        }

        getGladiatorMaxHp(g) {
            const armor = Data.ARMORS[g.armorId] || Data.ARMORS.tunic;
            const eff = this.getEffectiveStats(g);
            const perkHp = (g.perks && g.perks.includes('iron_will')) ? 20 : 0;
            return 80 + eff.vitality * 6 + (armor.hpBonus || 0) + perkHp;
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
            const traitSpd = (g.traitId === 'nimble' ? 18 : 0) + ((g.perks && g.perks.includes('swift_foot')) ? 16 : 0);

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

        getDailyUpkeep() {
            const rosterCost = this.state.roster.length * 12;
            const bTotal = this.state.buildings.trainingYard + this.state.buildings.infirmary + this.state.buildings.blacksmith;
            const buildingCost = Math.max(0, (bTotal - 3) * 6);
            return rosterCost + buildingCost;
        }

        _generateEnemyFighter(tier, budgetScale = 1.0, ruleId = 'standard') {
            const rawBudget = randInt(tier.statBudget[0], tier.statBudget[1]);
            const budget = Math.max(24, Math.round(rawBudget * budgetScale));
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
            let shieldId = (weaponId === 'spear' || weaponId === 'trident' || weaponId === 'axe')
                ? 'none'
                : pickItemByTier(Data.SHIELDS, true);
            if (ruleId === 'no_shield') shieldId = 'none';

            let armorId = pickItemByTier(Data.ARMORS, false);
            if (ruleId === 'light_only') armorId = Math.random() < 0.5 ? 'tunic' : 'leather';

            const helmetId = pickItemByTier(Data.HELMETS, true);
            const armorObj = Data.ARMORS[armorId];
            const maxHp = 80 + stats.vitality * 6 + armorObj.hpBonus;

            return {
                name: pickRandom(Data.GLADIATOR_NAMES),
                skinColor: pickRandom(Data.SKIN_TONES),
                traitId: pickRandomKey(Data.TRAITS),
                stats,
                weaponId,
                shieldId,
                armorId,
                helmetId,
                maxHp
            };
        }

        _create2v2Contract(tier) {
            const f1 = this._generateEnemyFighter(tier, 0.88, 'team_2v2');
            const f2 = this._generateEnemyFighter(tier, 0.85, 'team_2v2');
            const baseGold = randInt(tier.rewardGold[0], tier.rewardGold[1]);
            const baseFame = randInt(tier.rewardFame[0], tier.rewardFame[1]);

            return {
                id: 'opp2v2_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                isBoss: false,
                lethal: false,
                ruleId: 'team_2v2',
                tierName: tier.name,
                badge: '2v2',
                name: f1.name,
                skinColor: f1.skinColor,
                traitId: f1.traitId,
                stats: f1.stats,
                weaponId: f1.weaponId,
                shieldId: f1.shieldId,
                armorId: f1.armorId,
                helmetId: f1.helmetId,
                maxHp: f1.maxHp,
                partner: f2,
                rewardGold: Math.round(baseGold * 1.8),
                rewardFame: Math.round(baseFame * 1.8),
                completed: false
            };
        }

        refreshDailyEvents() {
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
                const price = 70 + (budget - 26) * 14 + (weaponId === 'sword' ? 35 : 0) + (armorId === 'leather' ? 25 : 0);

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

            this.state.dailyOpponents = [];
            const unlockedTiers = Data.ARENA_TIERS.filter(t => this.state.fame >= t.minFame);
            const isBossDay = (this.state.day % 5 === 0);

            for (let i = 0; i < 3; i++) {
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
                        lethal: true,
                        ruleId: 'standard',
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
                        partner: null,
                        rewardGold: 450 + bossTier * 180,
                        rewardFame: 45 + bossTier * 15,
                        completed: false
                    });
                    continue;
                }

                const tier = unlockedTiers[Math.min(i, unlockedTiers.length - 1)];

                // Kadroda 2+ gladyatör varsa 2. slot 2v2 Takım Savaşı olur!
                if (i === 1 && this.state.roster.length >= 2) {
                    this.state.dailyOpponents.push(this._create2v2Contract(tier));
                    continue;
                }

                let ruleId = 'standard';
                if (i === 0 && Math.random() < 0.40) {
                    ruleId = Math.random() < 0.5 ? 'no_shield' : 'light_only';
                }

                const f = this._generateEnemyFighter(tier, 1.0, ruleId);
                const isLethal = (i === 2) || (i === 1 && Math.random() < 0.35);
                let rewardGold = randInt(tier.rewardGold[0], tier.rewardGold[1]);
                let rewardFame = randInt(tier.rewardFame[0], tier.rewardFame[1]);

                if (ruleId !== 'standard') {
                    rewardGold = Math.round(rewardGold * 1.25);
                    rewardFame = Math.round(rewardFame * 1.25);
                }
                if (isLethal) {
                    rewardGold = Math.round(rewardGold * 2.2);
                    rewardFame = Math.round(rewardFame * 2.2);
                }

                this.state.dailyOpponents.push({
                    id: 'opp_' + i + '_' + Date.now(),
                    isBoss: false,
                    lethal: isLethal,
                    ruleId,
                    tierName: tier.name,
                    badge: tier.badge,
                    name: f.name,
                    skinColor: f.skinColor,
                    traitId: f.traitId,
                    stats: f.stats,
                    weaponId: f.weaponId,
                    shieldId: f.shieldId,
                    armorId: f.armorId,
                    helmetId: f.helmetId,
                    maxHp: f.maxHp,
                    partner: null,
                    rewardGold,
                    rewardFame,
                    completed: false
                });
            }
        }

        validateFighterForRule(g, ruleId) {
            if (ruleId === 'no_shield' && g.shieldId !== 'none') {
                return { ok: false, msg: `${g.name} kalkanlı! Bu maçta kalkan takılamaz.` };
            }
            if (ruleId === 'light_only' && g.armorId !== 'tunic' && g.armorId !== 'leather') {
                return { ok: false, msg: `${g.name} ağır zırhlı! Sadece Tunik veya Deri Zırh girebilir.` };
            }
            return { ok: true };
        }

        // --- XP, SEVİYE VE PERK SİSTEMİ ---
        grantXp(g, amount) {
            if (!g) return false;
            g.xp += amount;
            let leveledUp = false;

            while (g.xp >= g.xpToNext) {
                g.xp -= g.xpToNext;
                g.level += 1;
                g.xpToNext = 100 + (g.level - 1) * 60;
                g.stats.strength += 1;
                g.stats.agility += 1;
                g.stats.vitality += 1;
                g.currentHp = Math.min(this.getGladiatorMaxHp(g), g.currentHp + 6);
                leveledUp = true;

                if (!g.pendingPerkChoices) {
                    const available = Object.keys(Data.PERKS).filter(id => !g.perks.includes(id));
                    if (available.length > 0) {
                        const shuffled = available.sort(() => Math.random() - 0.5);
                        g.pendingPerkChoices = shuffled.slice(0, 3);
                    }
                }
            }
            return leveledUp;
        }

        choosePerk(gladiatorId, perkId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !g.pendingPerkChoices || !g.pendingPerkChoices.includes(perkId)) return { ok: false };

            g.perks.push(perkId);
            g.pendingPerkChoices = null;
            if (perkId === 'iron_will') {
                g.currentHp = Math.min(this.getGladiatorMaxHp(g), g.currentHp + 20);
            }
            this.saveToLocalStorage();
            return { ok: true };
        }

        setFightStyle(gladiatorId, styleId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !Data.FIGHT_STYLES[styleId]) return;
            g.styleId = styleId;
            this.saveToLocalStorage();
        }

        // --- TEST ARAÇLARI ---
        devAddGold(amount) { this.state.gold += amount; this.saveToLocalStorage(); }
        devAddFame(amount) { this.state.fame += amount; this.saveToLocalStorage(); }

        devAddXp(gladiatorId, amount) {
            const g = this.state.roster.find(x => x.id === gladiatorId) || this.getSelectedGladiator();
            if (!g) return false;
            const lvl = this.grantXp(g, amount);
            this.saveToLocalStorage();
            return lvl;
        }

        devSpawn2v2() {
            let hiredTest = false;
            if (this.state.roster.length < 2) {
                const ally = this._createGladiator({
                    name: 'Agron (Test Ortağı)',
                    origin: 'Cermen',
                    stats: { strength: 10, agility: 12, vitality: 11 },
                    weaponId: 'spear',
                    armorId: 'leather'
                });
                this.state.roster.push(ally);
                hiredTest = true;
            }
            const unlocked = Data.ARENA_TIERS.filter(t => this.state.fame >= t.minFame);
            const tier = unlocked[unlocked.length - 1] || Data.ARENA_TIERS[0];
            this.state.dailyOpponents[1] = this._create2v2Contract(tier);
            this.saveToLocalStorage();
            return hiredTest;
        }

        devJumpToBossDay() {
            const rem = this.state.day % 5;
            this.state.day += (rem === 0 ? 5 : 5 - rem);
            this.devHealAll();
            this.refreshDailyEvents();
            this.saveToLocalStorage();
        }

        devHealAll() {
            for (const g of this.state.roster) {
                g.injuryId = null;
                g.fatigue = 0;
                g.currentHp = this.getGladiatorMaxHp(g);
            }
            this.saveToLocalStorage();
        }

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
            const leveledUp = this.grantXp(g, 15);
            this.saveToLocalStorage();
            return { ok: true, leveledUp };
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
            const upkeep = this.getDailyUpkeep();
            let starved = false;

            if (this.state.gold >= upkeep) {
                this.state.gold -= upkeep;
            } else {
                this.state.gold = 0;
                starved = true;
            }

            let healPct = 0.25 + (this.state.buildings.infirmary - 1) * 0.15;
            if (starved) healPct *= 0.4;

            for (const g of this.state.roster) {
                g.fatigue = 0;
                g.injuryId = null;
                const maxHp = this.getGladiatorMaxHp(g);
                g.currentHp = Math.min(maxHp, g.currentHp + Math.ceil(maxHp * healPct));
            }

            this.refreshDailyEvents();
            this.saveToLocalStorage();
            return { upkeep, starved };
        }

        recordTeamMatchResult(gladiatorIds, opponentId, didWin, remainingHps) {
            const opp = this.state.dailyOpponents.find(o => o.id === opponentId);
            if (opp) opp.completed = true;

            let goldEarned = 0;
            let fameEarned = 0;
            const deadNames = [];
            const leveledNames = [];
            const injuries = [];
            let rescuedByRookie = false;

            if (opp) {
                if (didWin) {
                    goldEarned = opp.rewardGold;
                    const hasFav = gladiatorIds.some(id => {
                        const gf = this.state.roster.find(r => r.id === id);
                        return gf && gf.traitId === 'crowd_favorite';
                    });
                    fameEarned = hasFav ? Math.round(opp.rewardFame * 1.3) : opp.rewardFame;
                } else {
                    goldEarned = Math.round(opp.rewardGold * 0.15);
                }
            }

            const xpReward = didWin
                ? (55 + (opp && opp.isBoss ? 65 : 0) + (opp && opp.ruleId === 'team_2v2' ? 25 : 0))
                : 25;

            gladiatorIds.forEach((gId, idx) => {
                const gIdx = this.state.roster.findIndex(x => x.id === gId);
                if (gIdx === -1) return;
                const g = this.state.roster[gIdx];
                const remHp = remainingHps[idx] !== undefined ? remainingHps[idx] : 0;

                if (didWin) {
                    g.wins += 1;
                    g.fatigue = (g.fatigue || 0) + 1;
                    g.currentHp = remHp > 0 ? Math.round(remHp) : 1;
                    if (remHp <= 0 && Math.random() < 0.5) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuries.push(`${g.name}: ${Data.INJURIES[g.injuryId].name}`);
                    }
                    if (this.grantXp(g, xpReward)) leveledNames.push(g.name);
                } else if (opp && opp.lethal) {
                    deadNames.push(g.name);
                    this.state.roster.splice(gIdx, 1);
                } else {
                    g.losses += 1;
                    g.fatigue = (g.fatigue || 0) + 1;
                    g.currentHp = 1;
                    if (Math.random() < 0.75) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuries.push(`${g.name}: ${Data.INJURIES[g.injuryId].name}`);
                    }
                    if (this.grantXp(g, xpReward)) leveledNames.push(g.name);
                }
            });

            if (this.state.roster.length === 0 && this.state.gold < 75) {
                const rookie = this._createGladiator({
                    name: 'Çaylak ' + pickRandom(Data.GLADIATOR_NAMES),
                    stats: { strength: 8, agility: 8, vitality: 9 },
                    weaponId: 'dagger',
                    armorId: 'tunic'
                });
                this.state.roster.push(rookie);
                rescuedByRookie = true;
            }

            if (!this.state.roster.some(r => r.id === this.state.selectedGladiatorId)) {
                this.state.selectedGladiatorId = this.state.roster[0] ? this.state.roster[0].id : null;
            }

            this.state.gold += goldEarned;
            this.state.fame += fameEarned;
            this.saveToLocalStorage();
            return { goldEarned, fameEarned, xpReward, deadNames, leveledNames, injuries, rescuedByRookie };
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