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
                    helmets: { galea: 1 },
                    consumables: { poison: 0, net: 0, potion: 0 }
                },
                roster: [
                    this._createGladiator({
                        name: 'Maximus',
                        origin: 'Trakyalı',
                        traitId: 'disciplined',
                        styleId: 'balanced',
                        stats: { strength: 11, agility: 10, vitality: 11 },
                        weaponId: 'sword',
                        favoriteWeaponId: 'sword',
                        loyalty: 65,
                        shieldId: 'none',
                        armorId: 'tunic',
                        helmetId: 'none'
                    })
                ],
                selectedGladiatorId: null,
                doctore: null,
                ngPlusCount: 0,
                currentRegionId: 'capua',
                tournament: {
                    active: false,
                    round: 0,
                    fighterId: null,
                    completedChampionship: false
                },
                senate: Game.SenateRules
                    ? Game.SenateRules.createDefaultSenateState()
                    : { reputations: { crassus: 0, tullius: 0, valeria: 0 }, dailyContract: null, completedContractsCount: 0, bribesCompleted: 0, scandalsCount: 0 },
                lastEventDay: 1,
                lastEventId: null,
                pendingEvent: null,
                bettingStats: { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 },
                marketRecruits: [],
                dailyOpponents: []
            };
            this.state.selectedGladiatorId = this.state.roster[0].id;
            if (Game.BondingRules && this.state.roster[0]) {
                const starter = this.state.roster[0];
                starter.activeRequest = Game.BondingRules.generatePersonalRequest(
                    starter,
                    this.state,
                    Data.WEAPONS,
                    this.getGladiatorMaxHp(starter)
                );
            }
            this.refreshDailyEvents();
            this.saveToLocalStorage();
        }

        _migrateState() {
            if (!this.state) return;
            if (!this.state.inventory) this.state.inventory = {};
            if (!this.state.inventory.weapons) this.state.inventory.weapons = {};
            if (!this.state.inventory.shields) this.state.inventory.shields = {};
            if (!this.state.inventory.armors) this.state.inventory.armors = {};
            if (!this.state.inventory.helmets) this.state.inventory.helmets = {};
            if (!this.state.inventory.consumables) {
                this.state.inventory.consumables = { poison: 0, net: 0, potion: 0 };
            }
            if (this.state.doctore === undefined) this.state.doctore = null;
            if (this.state.ngPlusCount === undefined) this.state.ngPlusCount = 0;
            if (!this.state.currentRegionId) {
                this.state.currentRegionId = (Game.CareerRules && Data.CAREER_REGIONS)
                    ? Game.CareerRules.getHighestUnlockedRegion(this.state.fame || 0, Data.CAREER_REGIONS).id
                    : 'capua';
            }
            if (!this.state.tournament) {
                this.state.tournament = {
                    active: false,
                    round: 0,
                    fighterId: null,
                    completedChampionship: false
                };
            }
            if (!this.state.senate) {
                this.state.senate = Game.SenateRules
                    ? Game.SenateRules.createDefaultSenateState()
                    : { reputations: { crassus: 0, tullius: 0, valeria: 0 }, dailyContract: null, completedContractsCount: 0, bribesCompleted: 0, scandalsCount: 0 };
            }
            if (!this.state.senate.reputations) {
                this.state.senate.reputations = { crassus: 0, tullius: 0, valeria: 0 };
            }
            ['crassus', 'tullius', 'valeria'].forEach(sid => {
                if (this.state.senate.reputations[sid] === undefined) this.state.senate.reputations[sid] = 0;
            });
            if (this.state.senate.dailyContract === undefined) this.state.senate.dailyContract = null;
            if (this.state.senate.completedContractsCount === undefined) this.state.senate.completedContractsCount = 0;
            if (this.state.senate.bribesCompleted === undefined) this.state.senate.bribesCompleted = 0;
            if (this.state.senate.scandalsCount === undefined) this.state.senate.scandalsCount = 0;
            if (this.state.lastEventDay === undefined) this.state.lastEventDay = this.state.day || 1;
            if (this.state.lastEventId === undefined) this.state.lastEventId = null;
            if (this.state.pendingEvent === undefined) this.state.pendingEvent = null;
            if (!this.state.bettingStats) {
                this.state.bettingStats = { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 };
            }

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
                if (obj.pendingPerkCount === undefined) obj.pendingPerkCount = obj.pendingPerkChoices ? 1 : 0;
                if (obj.wins === undefined) obj.wins = 0;
                if (obj.losses === undefined) obj.losses = 0;
                if (!obj.favoriteWeaponId) {
                    obj.favoriteWeaponId = Game.BondingRules
                        ? Game.BondingRules.pickFavoriteWeaponId(obj.origin, obj.traitId, Data.WEAPONS)
                        : (obj.weaponId || 'sword');
                }
                if (obj.loyalty === undefined) obj.loyalty = 65;
                else if (Game.BondingRules) obj.loyalty = Game.BondingRules.clampLoyalty(obj.loyalty);
                if (obj.hasPrivateQuarters === undefined) obj.hasPrivateQuarters = false;
                if (obj.lastTalkDay === undefined) obj.lastTalkDay = 0;
                if (obj.lastWineDay === undefined) obj.lastWineDay = 0;
                if (obj.lastBribeThrowDay === undefined) obj.lastBribeThrowDay = 0;
                if (obj.activeRequest === undefined) obj.activeRequest = null;
                if (!obj.relations || typeof obj.relations !== 'object') obj.relations = {};
                if (obj.lastSparDay === undefined) obj.lastSparDay = 0;
            };
            (this.state.roster || []).forEach(ensureGlad);
            (this.state.marketRecruits || []).forEach(ensureGlad);
            (this.state.dailyOpponents || []).forEach(opp => {
                ensureGlad(opp);
                if (opp.lethal === undefined) opp.lethal = false;
                if (!opp.ruleId) opp.ruleId = 'standard';
                if (opp.partner === undefined) opp.partner = null;
                if (opp.bribeOffer === undefined) opp.bribeOffer = null;
                if (opp.partner) ensureGlad(opp.partner);
            });
        }

        _createGladiator(opts = {}) {
            const id = 'g_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            const stats = opts.stats || { strength: 9, agility: 9, vitality: 9 };
            const armorId = opts.armorId || 'tunic';
            const origin = opts.origin || pickRandom(Data.ORIGINS);
            const traitId = opts.traitId || pickRandomKey(Data.TRAITS);
            const favoriteWeaponId = opts.favoriteWeaponId || (Game.BondingRules
                ? Game.BondingRules.pickFavoriteWeaponId(origin, traitId, Data.WEAPONS)
                : (opts.weaponId || 'sword'));
            const g = {
                id,
                name: opts.name || pickRandom(Data.GLADIATOR_NAMES),
                origin,
                skinColor: opts.skinColor || pickRandom(Data.SKIN_TONES),
                traitId,
                styleId: opts.styleId || 'balanced',
                level: opts.level || 1,
                xp: 0,
                xpToNext: 100,
                perks: opts.perks || [],
                pendingPerkChoices: null,
                pendingPerkCount: 0,
                fatigue: 0,
                injuryId: null,
                stats,
                weaponId: opts.weaponId || 'dagger',
                favoriteWeaponId,
                loyalty: opts.loyalty !== undefined ? (Game.BondingRules ? Game.BondingRules.clampLoyalty(opts.loyalty) : opts.loyalty) : 65,
                hasPrivateQuarters: Boolean(opts.hasPrivateQuarters),
                lastTalkDay: 0,
                lastWineDay: 0,
                lastBribeThrowDay: 0,
                activeRequest: opts.activeRequest || null,
                relations: opts.relations || {},
                lastSparDay: 0,
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
            const styleSpd = g.styleId === 'skirmisher' ? 14 : (g.styleId === 'aggressive' ? 8 : 0);

            const def = Math.max(0, Math.round(eff.vitality * 0.35) + a.defense + h.defense + traitDef);
            const loyaltyTier = Game.BondingRules
                ? Game.BondingRules.getLoyaltyTier(g.loyalty)
                : { id: 'steady', spdMult: 1.0, dmgMult: 1.0, trainingMult: 1.0 };
            const spd = Math.max(60, Math.round((128 + eff.agility * 4 - weight * 2.4 + traitSpd + styleSpd) * (loyaltyTier.spdMult || 1.0)));
            const isFavWeapon = Game.BondingRules ? Game.BondingRules.isUsingFavoriteWeapon(g) : false;
            return { maxHp, def, spd, weight, eff, loyaltyTier, isFavWeapon };
        }

        getSelectedGladiator() {
            let found = this.state.roster.find(g => g.id === this.state.selectedGladiatorId);
            if (!found && this.state.roster.length > 0) {
                found = this.state.roster[0];
                this.state.selectedGladiatorId = found.id;
            }
            return found || null;
        }

        getSenateBonuses() {
            if (!Game.SenateRules || !this.state.senate) {
                return { goldBonusMult: 0, fameBonusMult: 0, bribeRiskReduction: 0, bribeGoldMult: 1, upkeepDiscount: 0, totalReputation: 0 };
            }
            return Game.SenateRules.getSenateRewardBonuses(this.state.senate);
        }

        getDailyUpkeep() {
            const rosterCost = this.state.roster.length * 12;
            const bTotal = this.state.buildings.trainingYard + this.state.buildings.infirmary + this.state.buildings.blacksmith;
            const buildingCost = Math.max(0, (bTotal - 3) * 6);
            const raw = rosterCost + buildingCost;
            const discount = this.getSenateBonuses().upkeepDiscount || 0;
            return Math.max(8, Math.round(raw * (1 - discount)));
        }

        getCurrentRegion() {
            if (!Game.CareerRules || !Data.CAREER_REGIONS) {
                return { id: 'capua', order: 1, name: 'Capua Çukurları', minFame: 0, maxTier: 1, icon: '🏜️', rewardMult: 1.0, budgetScale: 1.0 };
            }
            return Game.CareerRules.getRegionById(this.state.currentRegionId, Data.CAREER_REGIONS);
        }

        _syncRegionAfterFameGain() {
            if (!Game.CareerRules || !Data.CAREER_REGIONS) return null;
            const cur = this.getCurrentRegion();
            const highest = Game.CareerRules.getHighestUnlockedRegion(this.state.fame || 0, Data.CAREER_REGIONS);
            if (highest && cur && highest.order > cur.order) {
                this.state.currentRegionId = highest.id;
                return highest;
            }
            return null;
        }

        selectRegion(regionId) {
            if (!Game.CareerRules || !Data.CAREER_REGIONS) return { ok: false };
            if (!Game.CareerRules.isRegionUnlocked(regionId, this.state.fame || 0, Data.CAREER_REGIONS)) {
                const target = Game.CareerRules.getRegionById(regionId, Data.CAREER_REGIONS);
                return { ok: false, msg: `${target ? target.name : 'Bölge'} için ${target ? target.minFame : 0} Şöhret gerekiyor!` };
            }
            this.state.currentRegionId = regionId;
            if (!this.state.dailyOpponents.some(o => o.completed)) {
                this._generateDailyOpponents();
            }
            this.saveToLocalStorage();
            return { ok: true, region: this.getCurrentRegion() };
        }

        _generateEnemyFighter(tier, budgetScale = 1.0, ruleId = 'standard') {
            const region = this.getCurrentRegion();
            const ngScale = Game.CareerRules ? Game.CareerRules.getNgPlusEnemyScale(this.state.ngPlusCount) : 1.0;
            const rawBudget = randInt(tier.statBudget[0], tier.statBudget[1]);
            const budget = Math.max(24, Math.round(rawBudget * budgetScale * (region.budgetScale || 1.0) * ngScale));
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

            let stylePool = ['balanced', 'aggressive', 'counter', 'skirmisher'];
            if (weaponId === 'spear' || weaponId === 'trident' || weaponId === 'dagger') {
                stylePool = ['skirmisher', 'aggressive', 'balanced'];
            } else if (shieldId !== 'none') {
                stylePool = ['counter', 'balanced', 'aggressive'];
            } else if (weaponId === 'axe' || weaponId === 'mace') {
                stylePool = ['aggressive', 'balanced', 'counter'];
            }
            const styleId = pickRandom(stylePool);

            const perks = [];
            let perkCount = 0;
            if (tier.maxTier === 2) {
                perkCount = Math.random() < 0.70 ? 1 : 0;
            } else if (tier.maxTier >= 3) {
                perkCount = Math.random() < 0.50 ? 2 : 1;
            }
            if (perkCount > 0 && Data.PERKS) {
                const eligible = Object.keys(Data.PERKS).filter(pid => {
                    if (pid === 'shield_master' && shieldId === 'none') return false;
                    if (pid === 'back_to_back' && ruleId !== 'team_2v2') return false;
                    return true;
                }).sort(() => Math.random() - 0.5);
                perks.push(...eligible.slice(0, perkCount));
            }

            const perkHp = perks.includes('iron_will') ? 20 : 0;
            const maxHp = 80 + stats.vitality * 6 + armorObj.hpBonus + perkHp;

            return {
                name: pickRandom(Data.GLADIATOR_NAMES),
                skinColor: pickRandom(Data.SKIN_TONES),
                traitId: pickRandomKey(Data.TRAITS),
                styleId,
                perks,
                stats,
                weaponId,
                shieldId,
                armorId,
                helmetId,
                maxHp
            };
        }

        _create2v2Contract(tier) {
            const region = this.getCurrentRegion();
            const rMult = region.rewardMult || 1.0;
            const ngReward = Game.CareerRules ? Game.CareerRules.getNgPlusRewardScale(this.state.ngPlusCount) : 1.0;
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
                styleId: f1.styleId,
                perks: f1.perks,
                stats: f1.stats,
                weaponId: f1.weaponId,
                shieldId: f1.shieldId,
                armorId: f1.armorId,
                helmetId: f1.helmetId,
                maxHp: f1.maxHp,
                partner: f2,
                rewardGold: Math.round(baseGold * 1.8 * rMult * ngReward),
                rewardFame: Math.round(baseFame * 1.8 * rMult * ngReward),
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
                const origin = pickRandom(Data.ORIGINS);
                const traitId = pickRandomKey(Data.TRAITS);
                const weaponId = Math.random() < 0.35 ? 'sword' : 'dagger';
                const armorId = Math.random() < 0.3 ? 'leather' : 'tunic';
                const favoriteWeaponId = Game.BondingRules
                    ? Game.BondingRules.pickFavoriteWeaponId(origin, traitId, Data.WEAPONS)
                    : weaponId;
                const price = 70 + (budget - 26) * 14 + (weaponId === 'sword' ? 35 : 0) + (armorId === 'leather' ? 25 : 0);

                this.state.marketRecruits.push({
                    id: 'rec_' + i + '_' + Date.now(),
                    name: pickRandom(Data.GLADIATOR_NAMES),
                    origin,
                    skinColor: pickRandom(Data.SKIN_TONES),
                    traitId,
                    stats,
                    weaponId,
                    favoriteWeaponId,
                    loyalty: 65,
                    shieldId: 'none',
                    armorId,
                    helmetId: 'none',
                    price,
                    hired: false
                });
            }

            this._generateDailyOpponents();
        }

        _generateDailyOpponents() {
            this.state.dailyOpponents = [];
            const region = this.getCurrentRegion();
            const regionMaxTier = region.maxTier || 3;
            const rMult = region.rewardMult || 1.0;
            const ngStat = Game.CareerRules ? Game.CareerRules.getNgPlusEnemyScale(this.state.ngPlusCount) : 1.0;
            const ngReward = Game.CareerRules ? Game.CareerRules.getNgPlusRewardScale(this.state.ngPlusCount) : 1.0;

            const unlockedTiers = Data.ARENA_TIERS.filter(t => this.state.fame >= t.minFame && t.maxTier <= regionMaxTier);
            const activeTiers = unlockedTiers.length > 0 ? unlockedTiers : [Data.ARENA_TIERS[0]];
            const isBossDay = (this.state.day % 5 === 0);

            for (let i = 0; i < 3; i++) {
                if (isBossDay && i === 2 && Data.BOSSES && Data.BOSSES.length > 0) {
                    const tpl = pickRandom(Data.BOSSES);
                    const bossTier = Math.max(0, Math.floor(this.state.day / 5) - 1);
                    const stats = {
                        strength: Math.round((tpl.baseStats.strength + bossTier * 2) * ngStat),
                        agility: Math.round((tpl.baseStats.agility + bossTier * 2) * ngStat),
                        vitality: Math.round((tpl.baseStats.vitality + bossTier * 2) * ngStat)
                    };
                    const armorObj = Data.ARMORS[tpl.armorId];
                    const bossPerks = Array.isArray(tpl.perks) ? tpl.perks.slice() : [];
                    const maxHp = 80 + stats.vitality * 6 + armorObj.hpBonus + (bossPerks.includes('iron_will') ? 20 : 0);

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
                        styleId: tpl.styleId || 'balanced',
                        perks: bossPerks,
                        stats,
                        weaponId: tpl.weaponId,
                        shieldId: tpl.shieldId,
                        armorId: tpl.armorId,
                        helmetId: tpl.helmetId,
                        maxHp,
                        partner: null,
                        rewardGold: Math.round((450 + bossTier * 180) * ngReward),
                        rewardFame: Math.round((45 + bossTier * 15) * ngReward),
                        completed: false
                    });
                    continue;
                }

                const tier = activeTiers[Math.min(i, activeTiers.length - 1)];

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
                let rewardGold = Math.round(randInt(tier.rewardGold[0], tier.rewardGold[1]) * rMult * ngReward);
                let rewardFame = Math.round(randInt(tier.rewardFame[0], tier.rewardFame[1]) * rMult * ngReward);

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
                    styleId: f.styleId,
                    perks: f.perks,
                    stats: f.stats,
                    weaponId: f.weaponId,
                    shieldId: f.shieldId,
                    armorId: f.armorId,
                    helmetId: f.helmetId,
                    maxHp: f.maxHp,
                    partner: null,
                    bribeOffer: null,
                    rewardGold,
                    rewardFame,
                    completed: false
                });
            }

            this._refreshDailyBribeAndContract();
        }

        _refreshDailyBribeAndContract(forceContract = false) {
            if (!Game.SenateRules) return;
            if (!this.state.senate) this.state.senate = Game.SenateRules.createDefaultSenateState();

            const curContract = this.state.senate.dailyContract;
            const keepActiveContract = !forceContract && curContract && curContract.accepted && !curContract.completed;
            if (!keepActiveContract && Data.SENATE_CONTRACT_TEMPLATES) {
                const region = this.getCurrentRegion();
                const has2v2 = this.state.roster.length >= 2 || this.state.dailyOpponents.some(o => o.ruleId === 'team_2v2');
                this.state.senate.dailyContract = Game.SenateRules.pickDailyContract(
                    Data.SENATE_CONTRACT_TEMPLATES,
                    region ? region.order : 1,
                    has2v2,
                    this.state.ngPlusCount || 0,
                    Math.random(),
                    curContract ? curContract.id : null
                );
            }

            // Günlük 1v1 rakiplerden en fazla 1 tanesine gizli şike teklifi ekle
            const alreadyHasBribe = this.state.dailyOpponents.some(o => o.bribeOffer && !o.completed);
            if (!alreadyHasBribe && (this.state.day >= 2 || Math.random() < 0.65)) {
                const eligible = this.state.dailyOpponents.filter(o => !o.isBoss && !o.isTournament && o.ruleId !== 'team_2v2' && !o.completed);
                if (eligible.length > 0 && Math.random() < 0.70) {
                    const targetOpp = pickRandom(eligible);
                    targetOpp.bribeOffer = Game.SenateRules.createBribeOfferForOpponent(
                        targetOpp,
                        this.state.senate,
                        this.state.ngPlusCount || 0
                    );
                }
            }
        }

        acceptSenateContract() {
            const c = this.state.senate && this.state.senate.dailyContract;
            if (!c) return { ok: false, msg: 'Aktif senato kontratı yok.' };
            if (c.completed) return { ok: false, msg: 'Bu kontrat zaten tamamlandı.' };
            c.accepted = true;
            this.saveToLocalStorage();
            return { ok: true, contract: c };
        }

        declineSenateContract() {
            if (!this.state.senate || !this.state.senate.dailyContract) return { ok: false };
            const c = this.state.senate.dailyContract;
            if (c.completed) return { ok: false };
            this.state.senate.dailyContract = null;
            this.saveToLocalStorage();
            return { ok: true };
        }

        acceptBribeOffer(opponentId) {
            const opp = this.state.dailyOpponents.find(o => o.id === opponentId);
            if (!opp || !opp.bribeOffer || opp.completed) {
                return { ok: false, msg: 'Geçerli şike teklifi bulunamadı.' };
            }
            const offer = opp.bribeOffer;
            if (offer.accepted) return { ok: true, offer };

            if (offer.upfrontCost > 0 && this.state.gold < offer.upfrontCost) {
                return { ok: false, msg: `Sabotaj için ${offer.upfrontCost} Altın gerekiyor!` };
            }
            if (offer.upfrontCost > 0) {
                this.state.gold -= offer.upfrontCost;
            }
            offer.accepted = true;
            this.saveToLocalStorage();
            return { ok: true, offer };
        }

        cancelBribeOffer(opponentId) {
            const opp = this.state.dailyOpponents.find(o => o.id === opponentId);
            if (!opp || !opp.bribeOffer || !opp.bribeOffer.accepted) return { ok: false };
            const offer = opp.bribeOffer;
            if (offer.upfrontCost > 0) {
                this.state.gold += offer.upfrontCost;
            }
            offer.accepted = false;
            this.saveToLocalStorage();
            return { ok: true };
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
        _rollPerkChoices(g) {
            const available = Object.keys(Data.PERKS).filter(id => !(g.perks || []).includes(id));
            if (available.length === 0) return null;
            const shuffled = available.slice().sort(() => Math.random() - 0.5);
            return shuffled.slice(0, 3);
        }

        grantXp(g, amount) {
            if (!g) return false;
            const effectiveXp = Game.Phase7Rules
                ? Game.Phase7Rules.computeEffectiveXp(amount, this.state.doctore)
                : amount;
            g.xp += effectiveXp;
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

                const choices = g.pendingPerkChoices || this._rollPerkChoices(g);
                if (choices && choices.length > 0) {
                    g.pendingPerkCount = (g.pendingPerkCount || 0) + 1;
                    if (!g.pendingPerkChoices) {
                        g.pendingPerkChoices = choices;
                    }
                }
            }
            return leveledUp;
        }

        choosePerk(gladiatorId, perkId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !g.pendingPerkChoices || !g.pendingPerkChoices.includes(perkId)) return { ok: false };

            g.perks.push(perkId);
            g.pendingPerkCount = Math.max(0, (g.pendingPerkCount || 1) - 1);
            if (g.pendingPerkCount > 0) {
                const nextChoices = this._rollPerkChoices(g);
                if (nextChoices && nextChoices.length > 0) {
                    g.pendingPerkChoices = nextChoices;
                } else {
                    g.pendingPerkChoices = null;
                    g.pendingPerkCount = 0;
                }
            } else {
                g.pendingPerkChoices = null;
            }
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
        devAddFame(amount) {
            this.state.fame += amount;
            const promoted = this._syncRegionAfterFameGain();
            if (promoted && !this.state.dailyOpponents.some(o => o.completed)) {
                this._generateDailyOpponents();
            }
            this.saveToLocalStorage();
            return promoted;
        }
        devUnlockTournament() {
            const need = Math.max(0, 150 - this.state.fame);
            if (need > 0) this.state.fame += need;
            this.state.currentRegionId = 'imperial';
            this._generateDailyOpponents();
            this.saveToLocalStorage();
        }

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

        devGrantWins(gladiatorId, count = 10) {
            const g = this.state.roster.find(x => x.id === gladiatorId) || this.getSelectedGladiator();
            if (!g) return false;
            g.wins = (g.wins || 0) + count;
            this.saveToLocalStorage();
            return true;
        }

        devTriggerEvent() {
            if (!Game.Phase7Rules || !Data.ROMAN_EVENTS) return null;
            const ev = Game.Phase7Rules.pickRomanEvent(Data.ROMAN_EVENTS, this.state.lastEventId);
            if (ev) {
                this.state.pendingEvent = ev;
                this.state.lastEventId = ev.id;
                this.state.lastEventDay = this.state.day;
                this.saveToLocalStorage();
            }
            return ev;
        }

        devGenerateSenateContract() {
            if (!Game.SenateRules || !Data.SENATE_CONTRACT_TEMPLATES) return null;
            this._refreshDailyBribeAndContract(true);
            this.saveToLocalStorage();
            return this.state.senate.dailyContract;
        }

        devSpawnBribeOffer() {
            if (!Game.SenateRules) return null;
            const eligible = this.state.dailyOpponents.filter(o => !o.isBoss && !o.isTournament && o.ruleId !== 'team_2v2' && !o.completed);
            if (eligible.length === 0) return null;
            const targetOpp = eligible.find(o => !o.lethal) || eligible[0];
            const prevType = targetOpp.bribeOffer ? targetOpp.bribeOffer.type : null;

            this.state.dailyOpponents.forEach(o => {
                if (o.bribeOffer && o.bribeOffer.accepted && o.bribeOffer.upfrontCost > 0) {
                    this.state.gold += o.bribeOffer.upfrontCost;
                }
                if (!o.completed) o.bribeOffer = null;
            });

            const forced = targetOpp.lethal
                ? 'sabotage_enemy'
                : (prevType === 'throw_match' ? 'sabotage_enemy' : 'throw_match');
            targetOpp.bribeOffer = Game.SenateRules.createBribeOfferForOpponent(
                targetOpp,
                this.state.senate,
                this.state.ngPlusCount || 0,
                forced
            );
            this.saveToLocalStorage();
            return { opp: targetOpp, offer: targetOpp.bribeOffer };
        }

        devAdjustLoyalty(gladiatorId, delta) {
            const g = this.state.roster.find(x => x.id === gladiatorId) || this.getSelectedGladiator();
            if (!g || !Game.BondingRules) return null;
            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + delta);
            this.saveToLocalStorage();
            return g.loyalty;
        }

        devGenerateRequest(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId) || this.getSelectedGladiator();
            if (!g || !Game.BondingRules) return null;
            g.activeRequest = Game.BondingRules.generatePersonalRequest(
                g,
                this.state,
                Data.WEAPONS,
                this.getGladiatorMaxHp(g)
            );
            this.saveToLocalStorage();
            return g.activeRequest;
        }

        devAdjustRelation(idA, idB, delta = 45) {
            const g1 = this.state.roster.find(x => x.id === idA);
            const g2 = this.state.roster.find(x => x.id === idB);
            if (!g1 || !g2 || !Game.RelationRules) return null;
            const next = Game.RelationRules.adjustRelation(g1, g2, delta);
            this.saveToLocalStorage();
            return next;
        }

        getTrainingCost(g, statKey) {
            const cur = g.stats[statKey];
            const lvl = this.state.buildings.trainingYard;
            const docDiscount = Game.Phase7Rules
                ? Game.Phase7Rules.getDoctoreBonuses(this.state.doctore).trainingDiscount
                : 0;
            const discount = Math.max(0.45, 1 - (lvl - 1) * 0.10 - docDiscount);
            const loyaltyMult = Game.BondingRules
                ? (Game.BondingRules.getLoyaltyTier(g.loyalty).trainingMult || 1.0)
                : 1.0;
            return Math.max(12, Math.round((20 + (cur - 7) * 7) * discount * loyaltyMult));
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
            const maxHp = this.getGladiatorMaxHp(g);
            g.currentHp = maxHp;

            let fulfilledRequest = null;
            if (Game.BondingRules) {
                const reqRes = Game.BondingRules.evaluateRequestProgress(g, 'heal', { maxHp }, Data.WEAPONS);
                if (reqRes.fulfilled) {
                    g.activeRequest = null;
                    g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + reqRes.rewardLoyalty);
                    this.grantXp(g, reqRes.rewardXp);
                    fulfilledRequest = reqRes;
                }
            }

            this.saveToLocalStorage();
            return { ok: true, fulfilledRequest };
        }

        buyItem(categoryKey, itemId) {
            const dictMap = {
                weapons: Data.WEAPONS,
                shields: Data.SHIELDS,
                armors: Data.ARMORS,
                helmets: Data.HELMETS,
                consumables: Data.CONSUMABLES
            };
            const dict = dictMap[categoryKey];
            const item = dict ? dict[itemId] : null;
            if (!item) return { ok: false };
            if (item.tier > this.state.buildings.blacksmith) return { ok: false, msg: `Demirci Seviye ${item.tier} gerekiyor!` };
            if (this.state.gold < item.price) return { ok: false, msg: 'Yeterli altın yok!' };

            this.state.gold -= item.price;
            if (!this.state.inventory[categoryKey]) this.state.inventory[categoryKey] = {};
            const inv = this.state.inventory[categoryKey];
            inv[itemId] = (inv[itemId] || 0) + 1;
            this.saveToLocalStorage();
            return { ok: true };
        }

        consumeArenaItem(consumableId) {
            if (!consumableId || consumableId === 'none') return null;
            const inv = this.state.inventory.consumables || {};
            if (!inv[consumableId] || inv[consumableId] <= 0) return null;
            inv[consumableId] -= 1;
            this.saveToLocalStorage();
            return Data.CONSUMABLES[consumableId] || null;
        }

        retireAsDoctore(gladiatorId) {
            const idx = this.state.roster.findIndex(x => x.id === gladiatorId);
            const g = idx !== -1 ? this.state.roster[idx] : null;
            const check = Game.Phase7Rules
                ? Game.Phase7Rules.canRetireAsDoctore(g, this.state.roster.length)
                : { ok: false, msg: 'Özellik yüklenemedi.' };
            if (!check.ok) return check;

            // Emekli edilen gladyatörün ekipmanını envantere geri al
            if (g.weaponId) {
                this.state.inventory.weapons[g.weaponId] = (this.state.inventory.weapons[g.weaponId] || 0) + 1;
            }
            if (g.shieldId && g.shieldId !== 'none') {
                this.state.inventory.shields[g.shieldId] = (this.state.inventory.shields[g.shieldId] || 0) + 1;
            }
            if (g.armorId && g.armorId !== 'tunic') {
                this.state.inventory.armors[g.armorId] = (this.state.inventory.armors[g.armorId] || 0) + 1;
            }
            if (g.helmetId && g.helmetId !== 'none') {
                this.state.inventory.helmets[g.helmetId] = (this.state.inventory.helmets[g.helmetId] || 0) + 1;
            }

            this.state.doctore = Game.Phase7Rules.createDoctoreRecord(g, this.state.day);
            this.state.roster.splice(idx, 1);

            if (!this.state.roster.some(r => r.id === this.state.selectedGladiatorId)) {
                this.state.selectedGladiatorId = this.state.roster[0] ? this.state.roster[0].id : null;
            }

            this.saveToLocalStorage();
            return { ok: true, doctore: this.state.doctore };
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

            let fulfilledRequest = null;
            if (categoryKey === 'weapons' && Game.BondingRules) {
                const reqRes = Game.BondingRules.evaluateRequestProgress(g, 'equip', {}, Data.WEAPONS);
                if (reqRes.fulfilled) {
                    g.activeRequest = null;
                    g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + reqRes.rewardLoyalty);
                    this.grantXp(g, reqRes.rewardXp);
                    fulfilledRequest = reqRes;
                }
            }

            this.saveToLocalStorage();
            return { ok: true, fulfilledRequest };
        }

        talkToGladiator(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !Game.BondingRules) return { ok: false };
            if (g.lastTalkDay === this.state.day) {
                return { ok: false, msg: `${g.name} ile bugün zaten sohbet ettin.` };
            }
            g.lastTalkDay = this.state.day;
            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + 4);
            const dialogue = Game.BondingRules.pickGladiatorDialogue(g, this.state, Data.WEAPONS);
            this.saveToLocalStorage();
            return { ok: true, loyaltyDelta: 4, dialogue };
        }

        giftWineToGladiator(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !Game.BondingRules) return { ok: false };
            const cost = 25;
            if (g.lastWineDay === this.state.day) {
                return { ok: false, msg: `${g.name} bugün zaten şarap ikramını aldı.` };
            }
            if (this.state.gold < cost) {
                return { ok: false, msg: `Şarap ikramı için ${cost} Altın gerekiyor!` };
            }
            this.state.gold -= cost;
            g.lastWineDay = this.state.day;
            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + 8);
            const maxHp = this.getGladiatorMaxHp(g);
            const prevHp = g.currentHp;
            g.currentHp = Math.min(maxHp, g.currentHp + Math.ceil(maxHp * 0.12));
            const hpHealed = Math.max(0, g.currentHp - prevHp);
            this.saveToLocalStorage();
            return { ok: true, cost, loyaltyDelta: 8, hpHealed };
        }

        assignPrivateQuarters(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !Game.BondingRules) return { ok: false };
            if (g.hasPrivateQuarters) {
                return { ok: false, msg: `${g.name} zaten özel odaya sahip.` };
            }
            const cost = 180;
            if (this.state.gold < cost) {
                return { ok: false, msg: `Özel oda tahsisi için ${cost} Altın gerekiyor!` };
            }
            this.state.gold -= cost;
            g.hasPrivateQuarters = true;
            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + 15);
            this.saveToLocalStorage();
            return { ok: true, cost, loyaltyDelta: 15 };
        }

        declineGladiatorRequest(gladiatorId) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            if (!g || !g.activeRequest || !Game.BondingRules) return { ok: false };
            g.activeRequest = null;
            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) - 6);
            this.saveToLocalStorage();
            return { ok: true, loyaltyDelta: -6 };
        }

        getRelationBetween(idA, idB) {
            const g1 = this.state.roster.find(x => x.id === idA);
            const g2 = this.state.roster.find(x => x.id === idB);
            if (!g1 || !g2 || !Game.RelationRules) return 0;
            return Game.RelationRules.getRelationScore(g1, g2);
        }

        get2v2Synergy(idA, idB) {
            const g1 = this.state.roster.find(x => x.id === idA);
            const g2 = this.state.roster.find(x => x.id === idB);
            if (!g1 || !g2 || g1.id === g2.id || !Game.RelationRules) return null;
            return Game.RelationRules.getCombatPairModifiers(g1, g2);
        }

        sparTogether(idA, idB) {
            const g1 = this.state.roster.find(x => x.id === idA);
            const g2 = this.state.roster.find(x => x.id === idB);
            if (!g1 || !g2 || g1.id === g2.id || !Game.RelationRules) {
                return { ok: false, msg: 'Birlikte talim için iki farklı gladyatör seçmelisin.' };
            }
            if (g1.lastSparDay === this.state.day) {
                return { ok: false, msg: `${g1.name} bugün zaten ortak talim yaptı.` };
            }
            if (g2.lastSparDay === this.state.day) {
                return { ok: false, msg: `${g2.name} bugün zaten ortak talim yaptı.` };
            }

            g1.lastSparDay = this.state.day;
            g2.lastSparDay = this.state.day;

            const delta = ((g1.loyalty ?? 65) >= 50 && (g2.loyalty ?? 65) >= 50) ? 8 : 6;
            const nextScore = Game.RelationRules.adjustRelation(g1, g2, delta);
            const tier = Game.RelationRules.getRelationTier(nextScore);

            const leveledNames = [];
            if (this.grantXp(g1, 15)) leveledNames.push(g1.name);
            if (this.grantXp(g2, 15)) leveledNames.push(g2.name);

            this.saveToLocalStorage();
            return { ok: true, relationDelta: delta, nextScore, tier, xpEach: 15, leveledNames };
        }

        getMatchOdds(gladiatorIds, opp) {
            if (!Game.BettingRules || !opp) return null;
            const myTeam = (gladiatorIds || []).map(id => this.state.roster.find(g => g.id === id)).filter(Boolean);
            if (myTeam.length === 0) return null;
            return Game.BettingRules.calculateMatchOdds(myTeam, opp, {
                weapons: Data.WEAPONS,
                shields: Data.SHIELDS,
                armors: Data.ARMORS,
                helmets: Data.HELMETS
            });
        }

        placeMatchBet(gladiatorIds, opp, betSpec) {
            if (!Game.BettingRules) return { ok: true, active: false, type: 'none', stake: 0, odds: 1 };
            const odds = this.getMatchOdds(gladiatorIds, opp);
            const check = Game.BettingRules.validateBet(betSpec, this.state.gold, opp, odds);
            if (!check.ok) return check;
            if (check.active) {
                this.state.gold -= check.stake;
                if (!this.state.bettingStats) {
                    this.state.bettingStats = { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 };
                }
                this.state.bettingStats.totalWagered += check.stake;
                this.saveToLocalStorage();
            }
            return check;
        }

        _resolveAndApplyBet(activeBet, didWin, durationSec = 0) {
            if (!Game.BettingRules || !activeBet || !activeBet.active) return null;
            const res = Game.BettingRules.resolveBet(activeBet, didWin, durationSec);
            if (!res.placed) return null;
            if (!this.state.bettingStats) {
                this.state.bettingStats = { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 };
            }
            if (res.won) {
                this.state.gold += res.payout;
                this.state.bettingStats.totalWon += res.payout;
                this.state.bettingStats.betsWon += 1;
            } else {
                this.state.bettingStats.betsLost += 1;
            }
            return res;
        }

        hireRecruit(recruitId) {
            if (this.state.roster.length >= 6) return { ok: false, msg: 'Ludus kadrosu dolu! (Maksimum 6)' };
            const rec = this.state.marketRecruits.find(r => r.id === recruitId && !r.hired);
            if (!rec) return { ok: false };
            if (this.state.gold < rec.price) return { ok: false, msg: 'Yeterli altın yok!' };

            this.state.gold -= rec.price;
            rec.hired = true;

            const docBonus = Game.Phase7Rules
                ? Game.Phase7Rules.getDoctoreBonuses(this.state.doctore).statBonus
                : 0;
            const stats = Object.assign({}, rec.stats);
            if (docBonus > 0) {
                stats.strength += docBonus;
                stats.agility += docBonus;
                stats.vitality += docBonus;
            }

            const newGlad = this._createGladiator({
                name: rec.name,
                origin: rec.origin,
                skinColor: rec.skinColor,
                traitId: rec.traitId,
                stats,
                weaponId: rec.weaponId,
                favoriteWeaponId: rec.favoriteWeaponId,
                loyalty: rec.loyalty !== undefined ? rec.loyalty : 65,
                shieldId: rec.shieldId,
                armorId: rec.armorId,
                helmetId: rec.helmetId
            });
            this.state.roster.push(newGlad);
            this.state.selectedGladiatorId = newGlad.id;
            this.saveToLocalStorage();
            return { ok: true, docBonus };
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

            const infLvl = this.state.buildings.infirmary || 1;
            const overnightCureChance = (!starved && infLvl >= 2) ? Math.min(0.85, (infLvl - 1) * 0.25) : 0;
            const healedInjuries = [];
            const fulfilledRequestNames = [];

            for (const g of this.state.roster) {
                g.fatigue = 0;
                if (g.injuryId && overnightCureChance > 0 && Math.random() < overnightCureChance) {
                    g.injuryId = null;
                    healedInjuries.push(g.name);
                }
                const maxHp = this.getGladiatorMaxHp(g);
                const extraRoomHeal = (!starved && g.hasPrivateQuarters) ? 0.10 : 0;
                g.currentHp = Math.min(maxHp, g.currentHp + Math.ceil(maxHp * (healPct + extraRoomHeal)));

                if (Game.BondingRules) {
                    if (starved) {
                        g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) - 8);
                    } else if (g.hasPrivateQuarters) {
                        g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + 3);
                    }

                    const reqRes = Game.BondingRules.evaluateRequestProgress(g, 'next_day', { maxHp, starved }, Data.WEAPONS);
                    if (reqRes.fulfilled) {
                        g.activeRequest = null;
                        g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + reqRes.rewardLoyalty);
                        this.grantXp(g, reqRes.rewardXp);
                        fulfilledRequestNames.push(g.name);
                    }
                }
            }

            const rebellionReport = Game.BondingRules
                ? Game.BondingRules.evaluateOvernightRebellion(this.state.roster)
                : { triggered: false, instigators: [], affectedNames: [] };

            const relationEvents = Game.RelationRules
                ? Game.RelationRules.evaluateOvernightRelations(this.state.roster)
                : { triggered: false, events: [] };
            if (relationEvents.triggered) {
                relationEvents.events.forEach(ev => {
                    if (ev.xpEach > 0 && Array.isArray(ev.names)) {
                        ev.names.forEach(n => {
                            const member = this.state.roster.find(r => r.name === n);
                            if (member) this.grantXp(member, ev.xpEach);
                        });
                    }
                });
            }

            if (Game.BondingRules) {
                for (const g of this.state.roster) {
                    if (!g.activeRequest && Math.random() < 0.75) {
                        g.activeRequest = Game.BondingRules.generatePersonalRequest(
                            g,
                            this.state,
                            Data.WEAPONS,
                            this.getGladiatorMaxHp(g)
                        );
                    }
                }
            }

            // Açlık + yetersiz altın + tüm kadro <%25 can ölüm spiralini (softlock) önle
            let starvationFloorApplied = false;
            if (this.state.roster.length > 0) {
                const anyArenaReady = this.state.roster.some(r => r.currentHp >= Math.ceil(this.getGladiatorMaxHp(r) * 0.25));
                const minHealCost = Math.min(...this.state.roster.map(r => this.getHealCost(r)));
                if (!anyArenaReady && this.state.gold < minHealCost) {
                    const fallback = this.getSelectedGladiator() || this.state.roster[0];
                    const readyFloor = Math.ceil(this.getGladiatorMaxHp(fallback) * 0.25);
                    if (fallback.currentHp < readyFloor) {
                        fallback.currentHp = readyFloor;
                        starvationFloorApplied = true;
                    }
                }
            }

            this.refreshDailyEvents();

            let eventTriggered = false;
            if (!this.state.pendingEvent && Game.Phase7Rules && Data.ROMAN_EVENTS) {
                if (Game.Phase7Rules.shouldTriggerRomanEvent(this.state.day, this.state.lastEventDay)) {
                    const ev = Game.Phase7Rules.pickRomanEvent(Data.ROMAN_EVENTS, this.state.lastEventId);
                    if (ev) {
                        this.state.pendingEvent = ev;
                        this.state.lastEventId = ev.id;
                        this.state.lastEventDay = this.state.day;
                        eventTriggered = true;
                    }
                }
            }

            this.saveToLocalStorage();
            return {
                upkeep,
                starved,
                eventTriggered,
                healedInjuries,
                starvationFloorApplied,
                fulfilledRequestNames,
                rebellionReport,
                relationEvents
            };
        }

        resolveRomanEvent(choiceId) {
            if (!this.state.pendingEvent || !Game.Phase7Rules) {
                return { ok: false, msg: 'Bekleyen olay yok.' };
            }
            const res = Game.Phase7Rules.resolveRomanEventChoice(
                this.state.pendingEvent,
                choiceId,
                this.state,
                {
                    grantXp: (g, amt) => this.grantXp(g, amt),
                    getMaxHp: (g) => this.getGladiatorMaxHp(g)
                }
            );
            if (!res.ok) return res;
            this.state.pendingEvent = null;
            this.saveToLocalStorage();
            return res;
        }

        recordTeamMatchResult(gladiatorIds, opponentId, didWin, remainingHps, matchMeta = {}) {
            const opp = this.state.dailyOpponents.find(o => o.id === opponentId);
            if (opp) opp.completed = true;

            const senateBonuses = this.getSenateBonuses();
            const bribeAccepted = Boolean(opp && opp.bribeOffer && opp.bribeOffer.accepted);
            const isIntentionalThrow = bribeAccepted && opp.bribeOffer.type === 'throw_match' && !didWin;

            let goldEarned = 0;
            let fameEarned = 0;
            const deadNames = [];
            const leveledNames = [];
            const injuries = [];
            const fulfilledRequests = [];
            let rescuedByRookie = false;

            const wasInjuredById = {};
            const fighterSnapshots = gladiatorIds.map((gId, idx) => {
                const gf = this.state.roster.find(r => r.id === gId);
                wasInjuredById[gId] = Boolean(gf && gf.injuryId);
                return {
                    weaponId: gf ? gf.weaponId : null,
                    shieldId: gf ? gf.shieldId : 'none',
                    consumableId: (matchMeta.consumablesUsed && matchMeta.consumablesUsed[idx]) || null
                };
            });

            if (opp) {
                if (didWin) {
                    goldEarned = Math.round(opp.rewardGold * (1 + (senateBonuses.goldBonusMult || 0)));
                    const hasFav = gladiatorIds.some(id => {
                        const gf = this.state.roster.find(r => r.id === id);
                        return gf && gf.traitId === 'crowd_favorite';
                    });
                    const rawFame = hasFav ? Math.round(opp.rewardFame * 1.3) : opp.rewardFame;
                    fameEarned = Math.max(1, Math.round(rawFame * (1 + (senateBonuses.fameBonusMult || 0))));
                } else {
                    goldEarned = isIntentionalThrow ? 0 : Math.round(opp.rewardGold * 0.15);
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
                const foughtInjured = Boolean(wasInjuredById[gId]);

                if (didWin) {
                    g.wins += 1;
                    g.fatigue = (g.fatigue || 0) + 1;
                    g.currentHp = remHp > 0 ? Math.round(remHp) : 1;
                    if (remHp <= 0 && Math.random() < 0.5) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuries.push(`${g.name}: ${Data.INJURIES[g.injuryId].name}`);
                    }
                    if (Game.BondingRules) {
                        const usingFav = Game.BondingRules.isUsingFavoriteWeapon(g);
                        let loyaltyDelta = usingFav ? 5 : 3;
                        if (foughtInjured) loyaltyDelta -= 5;
                        g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + loyaltyDelta);

                        const reqRes = Game.BondingRules.evaluateRequestProgress(g, 'match_win', { didWin: true }, Data.WEAPONS);
                        if (reqRes.fulfilled) {
                            g.activeRequest = null;
                            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + reqRes.rewardLoyalty);
                            if (this.grantXp(g, reqRes.rewardXp)) leveledNames.push(g.name);
                            fulfilledRequests.push({ name: g.name, title: reqRes.request.title });
                        }
                    }
                    if (this.grantXp(g, xpReward) && !leveledNames.includes(g.name)) leveledNames.push(g.name);
                } else if (opp && opp.lethal) {
                    deadNames.push(g.name);
                    this.state.roster.splice(gIdx, 1);
                } else {
                    g.losses += 1;
                    g.fatigue = (g.fatigue || 0) + 1;
                    g.currentHp = isIntentionalThrow ? Math.max(1, Math.round(this.getGladiatorMaxHp(g) * 0.35)) : 1;
                    if (!isIntentionalThrow && Math.random() < 0.75) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuries.push(`${g.name}: ${Data.INJURIES[g.injuryId].name}`);
                    }
                    if (Game.BondingRules) {
                        let loyaltyDelta = isIntentionalThrow ? -10 : 0;
                        if (isIntentionalThrow) g.lastBribeThrowDay = this.state.day;
                        if (foughtInjured) loyaltyDelta -= 5;
                        if (loyaltyDelta !== 0) {
                            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + loyaltyDelta);
                        }
                    }
                    if (this.grantXp(g, xpReward) && !leveledNames.includes(g.name)) leveledNames.push(g.name);
                }
            });

            if (this.state.roster.length === 0 && this.state.gold < 75) {
                const docBonus = Game.Phase7Rules
                    ? Game.Phase7Rules.getDoctoreBonuses(this.state.doctore).statBonus
                    : 0;
                const rookie = this._createGladiator({
                    name: 'Çaylak ' + pickRandom(Data.GLADIATOR_NAMES),
                    stats: { strength: 8 + docBonus, agility: 8 + docBonus, vitality: 9 + docBonus },
                    weaponId: 'dagger',
                    armorId: 'tunic'
                });
                this.state.roster.push(rookie);
                rescuedByRookie = true;
            }

            if (!this.state.roster.some(r => r.id === this.state.selectedGladiatorId)) {
                this.state.selectedGladiatorId = this.state.roster[0] ? this.state.roster[0].id : null;
            }

            let contractCompleted = null;
            if (Game.SenateRules && this.state.senate && this.state.senate.dailyContract) {
                const evalRes = Game.SenateRules.evaluateContractCompletion(this.state.senate.dailyContract, {
                    didWin,
                    fighters: fighterSnapshots,
                    opp,
                    durationSec: matchMeta.durationSec
                });
                if (evalRes.completed) {
                    this.state.senate.dailyContract.completed = true;
                    this.state.senate.completedContractsCount = (this.state.senate.completedContractsCount || 0) + 1;
                    const sid = evalRes.senatorId;
                    if (sid && this.state.senate.reputations) {
                        this.state.senate.reputations[sid] = Game.SenateRules.clampReputation(
                            (this.state.senate.reputations[sid] || 0) + evalRes.repReward
                        );
                    }
                    goldEarned += evalRes.rewardGold;
                    fameEarned += evalRes.rewardFame;
                    contractCompleted = evalRes;
                }
            }

            let bribeResult = null;
            if (Game.SenateRules && bribeAccepted) {
                bribeResult = Game.SenateRules.resolveBribeOutcome(opp.bribeOffer, didWin);
                if (bribeResult) {
                    goldEarned += bribeResult.goldDelta;
                    fameEarned += bribeResult.fameDelta;
                    if (this.state.senate && this.state.senate.reputations) {
                        this.state.senate.reputations.valeria = Game.SenateRules.clampReputation(
                            (this.state.senate.reputations.valeria || 0) + bribeResult.valeriaRepDelta
                        );
                        if (bribeResult.caught) {
                            this.state.senate.scandalsCount = (this.state.senate.scandalsCount || 0) + 1;
                        } else if (bribeResult.keptDeal) {
                            this.state.senate.bribesCompleted = (this.state.senate.bribesCompleted || 0) + 1;
                        }
                    }
                }
            }

            let relationUpdate = null;
            if (Game.RelationRules && gladiatorIds.length >= 2) {
                const g1 = this.state.roster.find(r => r.id === gladiatorIds[0]);
                const g2 = this.state.roster.find(r => r.id === gladiatorIds[1]);
                if (g1 && g2) {
                    relationUpdate = Game.RelationRules.applyMatchRelationUpdate(g1, g2, didWin);
                }
            }

            const betResult = this._resolveAndApplyBet(matchMeta.activeBet, didWin, matchMeta.durationSec || 0);

            this.state.gold = Math.max(0, this.state.gold + goldEarned);
            this.state.fame = Math.max(0, this.state.fame + fameEarned);
            const promotedRegion = this._syncRegionAfterFameGain();
            this.saveToLocalStorage();
            return {
                goldEarned,
                fameEarned,
                xpReward,
                deadNames,
                leveledNames,
                injuries,
                fulfilledRequests,
                rescuedByRookie,
                promotedRegion,
                contractCompleted,
                bribeResult,
                relationUpdate,
                betResult
            };
        }

        // --- İMPARATORLUK TURNUVASI & NEW GAME+ ---
        getNextTournamentOpponent(fighterId) {
            if (!Game.CareerRules || !Data.IMPERIAL_TOURNAMENT || !Data.CAREER_REGIONS) {
                return { ok: false, msg: 'Turnuva kuralları yüklenemedi.' };
            }
            if (!Game.CareerRules.isRegionUnlocked('imperial', this.state.fame || 0, Data.CAREER_REGIONS)) {
                return { ok: false, msg: 'İmparatorluk Turnuvası için 150 Şöhret gerekiyor!' };
            }
            if (!this.state.tournament.active) {
                this.state.tournament = {
                    active: true,
                    round: 0,
                    fighterId,
                    completedChampionship: Boolean(this.state.tournament && this.state.tournament.completedChampionship)
                };
            }
            const roundIdx = this.state.tournament.round || 0;
            const opp = Game.CareerRules.buildTournamentOpponent(
                roundIdx,
                this.state.ngPlusCount || 0,
                Data.IMPERIAL_TOURNAMENT,
                Data.ARMORS
            );
            this.saveToLocalStorage();
            return { ok: true, opp, roundIndex: roundIdx };
        }

        recordTournamentMatchResult(gladiatorId, opp, didWin, remainingHp, matchMeta = {}) {
            const g = this.state.roster.find(x => x.id === gladiatorId);
            const goldEarned = didWin ? opp.rewardGold : Math.round(opp.rewardGold * 0.25);
            const hasFav = g && g.traitId === 'crowd_favorite';
            const fameEarned = didWin ? (hasFav ? Math.round(opp.rewardFame * 1.3) : opp.rewardFame) : 5;
            const xpReward = didWin ? (85 + (opp.tournamentRound || 1) * 35) : 35;
            const leveledNames = [];
            const injuries = [];

            if (g) {
                if (didWin) {
                    g.wins += 1;
                    g.currentHp = remainingHp > 0 ? Math.round(remainingHp) : 1;
                    if (Game.BondingRules) {
                        const usingFav = Game.BondingRules.isUsingFavoriteWeapon(g);
                        g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + (usingFav ? 5 : 3));
                        const reqRes = Game.BondingRules.evaluateRequestProgress(g, 'match_win', { didWin: true }, Data.WEAPONS);
                        if (reqRes.fulfilled) {
                            g.activeRequest = null;
                            g.loyalty = Game.BondingRules.clampLoyalty((g.loyalty ?? 65) + reqRes.rewardLoyalty);
                            if (this.grantXp(g, reqRes.rewardXp)) leveledNames.push(g.name);
                        }
                    }
                } else {
                    g.losses += 1;
                    g.fatigue = (g.fatigue || 0) + 1;
                    g.currentHp = 1;
                    if (Math.random() < 0.75) {
                        g.injuryId = pickRandomKey(Data.INJURIES);
                        injuries.push(`${g.name}: ${Data.INJURIES[g.injuryId].name}`);
                    }
                }
                if (this.grantXp(g, xpReward) && !leveledNames.includes(g.name)) leveledNames.push(g.name);
            }

            const prevTourney = this.state.tournament || { active: true, round: 0, fighterId: gladiatorId, completedChampionship: false };
            const nextTourney = Game.CareerRules.advanceTournament(prevTourney, didWin, Data.IMPERIAL_TOURNAMENT.length);
            this.state.tournament = {
                active: nextTourney.active,
                round: nextTourney.round,
                fighterId: nextTourney.fighterId,
                completedChampionship: nextTourney.completedChampionship
            };

            let breatherHeal = 0;
            if (didWin && nextTourney.active && g) {
                const maxHp = this.getGladiatorMaxHp(g);
                breatherHeal = Math.ceil(maxHp * 0.15);
                g.currentHp = Math.min(maxHp, g.currentHp + breatherHeal);
            }

            let championshipBonusGold = 0;
            let championshipBonusFame = 0;
            if (nextTourney.wonChampionship) {
                const ngReward = Game.CareerRules.getNgPlusRewardScale(this.state.ngPlusCount || 0);
                championshipBonusGold = Math.round(300 * ngReward);
                championshipBonusFame = Math.round(40 * ngReward);
            }

            const betResult = this._resolveAndApplyBet(matchMeta.activeBet, didWin, matchMeta.durationSec || 0);

            this.state.gold += goldEarned + championshipBonusGold;
            this.state.fame += fameEarned + championshipBonusFame;
            const promotedRegion = this._syncRegionAfterFameGain();
            this.saveToLocalStorage();

            return {
                goldEarned: goldEarned + championshipBonusGold,
                fameEarned: fameEarned + championshipBonusFame,
                xpReward,
                leveledNames,
                injuries,
                breatherHeal,
                wonChampionship: nextTourney.wonChampionship,
                eliminated: nextTourney.eliminated,
                nextRound: nextTourney.active ? nextTourney.round + 1 : null,
                promotedRegion,
                betResult
            };
        }

        startNewGamePlus(championId) {
            if (!Game.CareerRules || !this.state.tournament || !this.state.tournament.completedChampionship) {
                return { ok: false, msg: 'New Game+ için önce İmparatorluk Turnuvasını kazanmalısın!' };
            }
            const champ = this.state.roster.find(r => r.id === championId) || this.getSelectedGladiator() || this.state.roster[0];
            const setup = Game.CareerRules.createNewGamePlusSetup(this.state, champ, Game.Phase7Rules);

            const prevReps = (this.state.senate && this.state.senate.reputations) || {};
            const carriedReps = {
                crassus: Math.max(0, Math.round((prevReps.crassus || 0) * 0.5)),
                tullius: Math.max(0, Math.round((prevReps.tullius || 0) * 0.5)),
                valeria: Math.max(0, Math.round((prevReps.valeria || 0) * 0.5))
            };

            this.state = {
                day: 1,
                gold: setup.startGold,
                fame: setup.startFame,
                buildings: {
                    trainingYard: 1,
                    infirmary: 1,
                    blacksmith: 1
                },
                inventory: {
                    weapons: { dagger: 1 },
                    shields: { parma: 1 },
                    armors: { leather: 1 },
                    helmets: { galea: 1 },
                    consumables: { poison: 0, net: 0, potion: 0 }
                },
                roster: [
                    this._createGladiator({
                        name: setup.starterName,
                        origin: champ ? champ.origin : 'Trakyalı',
                        traitId: 'disciplined',
                        styleId: 'balanced',
                        stats: setup.starterStats,
                        weaponId: 'sword',
                        favoriteWeaponId: (champ && champ.favoriteWeaponId) ? champ.favoriteWeaponId : 'sword',
                        loyalty: 75,
                        shieldId: 'none',
                        armorId: 'leather',
                        helmetId: 'none'
                    })
                ],
                selectedGladiatorId: null,
                doctore: setup.carriedDoctore,
                ngPlusCount: setup.nextNgPlus,
                currentRegionId: 'capua',
                tournament: {
                    active: false,
                    round: 0,
                    fighterId: null,
                    completedChampionship: false
                },
                senate: {
                    reputations: carriedReps,
                    dailyContract: null,
                    completedContractsCount: (this.state.senate && this.state.senate.completedContractsCount) || 0,
                    bribesCompleted: (this.state.senate && this.state.senate.bribesCompleted) || 0,
                    scandalsCount: (this.state.senate && this.state.senate.scandalsCount) || 0
                },
                lastEventDay: 1,
                lastEventId: null,
                pendingEvent: null,
                bettingStats: this.state.bettingStats || { totalWagered: 0, totalWon: 0, betsWon: 0, betsLost: 0 },
                marketRecruits: [],
                dailyOpponents: []
            };

            this.state.selectedGladiatorId = this.state.roster[0].id;
            this._syncRegionAfterFameGain();
            this.refreshDailyEvents();
            this.saveToLocalStorage();
            return { ok: true, ngPlusCount: this.state.ngPlusCount, setup };
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