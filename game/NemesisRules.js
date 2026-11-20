(function (Game) {
    function clampRivalry(val) {
        return Math.max(0, Math.min(100, Math.round(val || 0)));
    }

    const RIVALRY_TIERS = [
        { min: 60, id: 'blood_feud', label: '🔥 Ezeli Husumet', rewardMult: 1.25, statBonus: 2, bonusFame: 4 },
        { min: 30, id: 'heated', label: '⚔️ Kızışan Rekabet', rewardMult: 1.12, statBonus: 1, bonusFame: 2 },
        { min: 0, id: 'cold', label: '🤝 Soğuk Rekabet', rewardMult: 1.0, statBonus: 0, bonusFame: 0 }
    ];

    const NEMESIS_RANKS = {
        1: { rank: 1, label: '🩸 Kan Davası Sv.1', rewardMult: 1.75, fameBonus: 10 },
        2: { rank: 2, label: '💀 Azılı Düşman Sv.2', rewardMult: 2.25, fameBonus: 18 },
        3: { rank: 3, label: '🔥 Ezeli Nemesis Sv.3', rewardMult: 2.85, fameBonus: 28 }
    };

    const TAUNTS = [
        'Kumlar senin kanını da emmeye hazır!',
        'Okulumun şanı senin leşinin üstünde yükselecek!',
        'Bu arenadan tek birimiz sağ çıkacak!',
        'Unutma, geçmişin gölgesi kılıçtan keskindir!'
    ];

    const NemesisRules = {
        clampRivalry,

        createDefaultNemesisState(rivalDefs = {}) {
            const schools = {};
            Object.values(rivalDefs || {}).forEach(def => {
                schools[def.id] = {
                    id: def.id,
                    rivalry: clampRivalry(def.baseRivalry || 15),
                    winsAgainst: 0,
                    lossesAgainst: 0
                };
            });
            return {
                schools,
                nemeses: [],
                defeatedNemesisCount: 0
            };
        },

        getSchoolRivalryTier(rivalry) {
            const val = clampRivalry(rivalry);
            for (const tier of RIVALRY_TIERS) {
                if (val >= tier.min) return tier;
            }
            return RIVALRY_TIERS[RIVALRY_TIERS.length - 1];
        },

        getNemesisRankInfo(rank) {
            const r = Math.max(1, Math.min(3, Math.round(rank || 1)));
            return NEMESIS_RANKS[r] || NEMESIS_RANKS[1];
        },

        pickSchoolForEnemy(rivalDefs = {}, schoolsState = {}, rollFn = Math.random) {
            const list = Object.values(rivalDefs || {});
            if (list.length === 0) return null;
            // Higher rivalry schools challenge slightly more often
            const weighted = [];
            list.forEach(s => {
                const st = schoolsState[s.id];
                const riv = st ? st.rivalry : (s.baseRivalry || 15);
                const weight = riv >= 60 ? 3 : (riv >= 30 ? 2 : 1);
                for (let i = 0; i < weight; i++) weighted.push(s);
            });
            const idx = Math.min(weighted.length - 1, Math.max(0, Math.floor(rollFn() * weighted.length)));
            return weighted[idx];
        },

        applySchoolProfileToFighter(fighter, schoolDef, rivalryScore = 0, rollFn = Math.random) {
            if (!fighter || !schoolDef) return fighter;
            const tier = this.getSchoolRivalryTier(rivalryScore);
            const next = Object.assign({}, fighter, {
                schoolId: schoolDef.id,
                schoolName: schoolDef.shortName || schoolDef.name,
                schoolIcon: schoolDef.icon || '⚔️',
                stats: Object.assign({}, fighter.stats)
            });

            if (tier.statBonus > 0) {
                const statKeys = ['strength', 'agility', 'vitality'];
                for (let i = 0; i < tier.statBonus; i++) {
                    const k = statKeys[Math.floor(rollFn() * statKeys.length) % statKeys.length];
                    next.stats[k] = (next.stats[k] || 8) + 1;
                }
            }

            if (Array.isArray(schoolDef.preferredStyles) && schoolDef.preferredStyles.length > 0 && rollFn() < 0.65) {
                next.styleId = schoolDef.preferredStyles[Math.floor(rollFn() * schoolDef.preferredStyles.length)];
            }
            if (Array.isArray(schoolDef.preferredTraits) && schoolDef.preferredTraits.length > 0 && rollFn() < 0.55) {
                next.traitId = schoolDef.preferredTraits[Math.floor(rollFn() * schoolDef.preferredTraits.length)];
            }
            return next;
        },

        recordSchoolMatchOutcome(nemesisState, schoolId, didWin) {
            if (!nemesisState || !nemesisState.schools || !schoolId) return null;
            const entry = nemesisState.schools[schoolId];
            if (!entry) return null;

            const prevTier = this.getSchoolRivalryTier(entry.rivalry);
            const delta = didWin ? 8 : 12;
            entry.rivalry = clampRivalry((entry.rivalry || 0) + delta);
            if (didWin) entry.winsAgainst = (entry.winsAgainst || 0) + 1;
            else entry.lossesAgainst = (entry.lossesAgainst || 0) + 1;

            const nextTier = this.getSchoolRivalryTier(entry.rivalry);
            return {
                schoolId,
                delta,
                rivalry: entry.rivalry,
                promotedTier: nextTier.id !== prevTier.id ? nextTier : null
            };
        },

        createOrUpgradeNemesis(params = {}, rollFn = Math.random) {
            const {
                nemesisState,
                opp,
                victims = [],
                reason = 'slayer',
                day = 1,
                rivalDefs = {},
                epithets = [],
                perksDict = {},
                armorsDict = {}
            } = params;

            if (!nemesisState || !opp) return null;
            if (!Array.isArray(nemesisState.nemeses)) nemesisState.nemeses = [];

            const schoolIds = Object.keys(rivalDefs || {});
            const schoolId = opp.schoolId || (schoolIds.length > 0 ? schoolIds[Math.floor(rollFn() * schoolIds.length)] : 'magnus');
            const schoolDef = rivalDefs[schoolId] || { id: schoolId, shortName: 'Rakip Okul', icon: '🩸' };

            const existing = opp.nemesisId
                ? nemesisState.nemeses.find(n => n.id === opp.nemesisId && !n.defeated)
                : nemesisState.nemeses.find(n => !n.defeated && n.baseName === opp.name && n.schoolId === schoolId);

            if (existing) {
                existing.rank = Math.min(3, (existing.rank || 1) + 1);
                existing.kills = (existing.kills || 0) + Math.max(1, victims.length);
                victims.forEach(v => {
                    if (v && !existing.victims.includes(v)) existing.victims.push(v);
                });
                existing.stats.strength += 2;
                existing.stats.agility += 1;
                existing.stats.vitality += 2;
                existing.lastSeenDay = day;
                if (reason === 'slayer' && victims[0]) {
                    existing.title = `${victims[0]}'un Katili`;
                }

                // Grant an extra perk on rank-up if available
                const perkKeys = Object.keys(perksDict || {}).filter(p => !(existing.perks || []).includes(p) && p !== 'back_to_back');
                if (perkKeys.length > 0) {
                    existing.perks = existing.perks || [];
                    existing.perks.push(perkKeys[Math.floor(rollFn() * perkKeys.length)]);
                }
                const armorHp = (armorsDict[existing.armorId] && armorsDict[existing.armorId].hpBonus) || 0;
                existing.maxHp = 80 + existing.stats.vitality * 6 + armorHp + (existing.perks.includes('iron_will') ? 20 : 0);

                return { action: 'upgraded', nemesis: existing };
            }

            // Cap active nemeses at 4
            const activeList = nemesisState.nemeses.filter(n => !n.defeated);
            if (activeList.length >= 4) {
                const dropIdx = nemesisState.nemeses.findIndex(n => !n.defeated && (n.rank || 1) === 1);
                if (dropIdx !== -1) nemesisState.nemeses.splice(dropIdx, 1);
                else nemesisState.nemeses.shift();
            }

            const baseName = opp.baseName || opp.name || 'Gannicus';
            const epithetList = (Array.isArray(epithets) && epithets.length > 0) ? epithets : ['Kızıl Diş', 'Kan Biçen'];
            const epithet = epithetList[Math.floor(rollFn() * epithetList.length)];
            const fullName = opp.isNemesis ? baseName : `${baseName} "${epithet}"`;

            const strBoost = reason === 'slayer' ? 2 : 1;
            const vitBoost = reason === 'slayer' ? 2 : 1;
            const nextStats = {
                strength: (opp.stats ? opp.stats.strength : 10) + strBoost,
                agility: (opp.stats ? opp.stats.agility : 10) + 1,
                vitality: (opp.stats ? opp.stats.vitality : 10) + vitBoost
            };
            const nextPerks = Array.isArray(opp.perks) ? opp.perks.slice() : [];
            if (nextPerks.length === 0) {
                const pref = Array.isArray(schoolDef.preferredPerks) && schoolDef.preferredPerks.length > 0
                    ? schoolDef.preferredPerks
                    : Object.keys(perksDict || {}).filter(p => p !== 'back_to_back');
                if (pref.length > 0) nextPerks.push(pref[Math.floor(rollFn() * pref.length)]);
            }

            const armorId = opp.armorId || 'leather';
            const armorHp = (armorsDict[armorId] && armorsDict[armorId].hpBonus) || 0;
            const maxHp = 80 + nextStats.vitality * 6 + armorHp + (nextPerks.includes('iron_will') ? 20 : 0);

            const victimName = victims[0] || null;
            const title = (reason === 'slayer' && victimName)
                ? `${victimName}'un Katili`
                : `${schoolDef.shortName} İntikamcısı`;

            const nemesis = {
                id: 'nem_' + Date.now() + '_' + Math.floor(rollFn() * 10000),
                baseName,
                name: fullName,
                epithet,
                title,
                schoolId,
                reason,
                rank: 1,
                kills: reason === 'slayer' ? Math.max(1, victims.length) : 1,
                victims: victims.filter(Boolean),
                skinColor: opp.skinColor || '#c68652',
                traitId: opp.traitId || 'fierce',
                styleId: opp.styleId || 'aggressive',
                perks: nextPerks,
                stats: nextStats,
                weaponId: opp.weaponId || 'sword',
                shieldId: opp.shieldId || 'none',
                armorId,
                helmetId: opp.helmetId || 'galea',
                maxHp,
                taunt: TAUNTS[Math.floor(rollFn() * TAUNTS.length)],
                appearedDay: day,
                lastSeenDay: day,
                defeated: false
            };

            nemesisState.nemeses.push(nemesis);
            return { action: 'created', nemesis };
        },

        pickActiveNemesisForDay(nemesisState, rollFn = Math.random) {
            if (!nemesisState || !Array.isArray(nemesisState.nemeses)) return null;
            const active = nemesisState.nemeses.filter(n => !n.defeated);
            if (active.length === 0) return null;
            // Prefer highest rank or most recent nemesis
            const sorted = active.slice().sort((a, b) => (b.rank || 1) - (a.rank || 1));
            if (sorted.length === 1 || rollFn() < 0.65) return sorted[0];
            return sorted[Math.floor(rollFn() * sorted.length)];
        },

        buildNemesisOpponent(nemesis, schoolDef, region, tier, ngStat = 1.0, ngReward = 1.0, armorsDict = {}) {
            if (!nemesis) return null;
            const rankInfo = this.getNemesisRankInfo(nemesis.rank);
            const schoolName = (schoolDef && (schoolDef.shortName || schoolDef.name)) || 'Rakip Okul';
            const schoolIcon = (schoolDef && schoolDef.icon) || '🩸';

            const stats = {
                strength: Math.round((nemesis.stats.strength || 10) * ngStat),
                agility: Math.round((nemesis.stats.agility || 10) * ngStat),
                vitality: Math.round((nemesis.stats.vitality || 10) * ngStat)
            };
            const armorHp = (armorsDict[nemesis.armorId] && armorsDict[nemesis.armorId].hpBonus) || 0;
            const perks = Array.isArray(nemesis.perks) ? nemesis.perks.slice() : [];
            const maxHp = 80 + stats.vitality * 6 + armorHp + (perks.includes('iron_will') ? 20 : 0);

            const baseGold = tier && tier.rewardGold ? ((tier.rewardGold[0] + tier.rewardGold[1]) / 2) : 110;
            const baseFame = tier && tier.rewardFame ? ((tier.rewardFame[0] + tier.rewardFame[1]) / 2) : 10;
            const rMult = (region && region.rewardMult) || 1.0;

            return {
                id: 'opp_nem_' + nemesis.id + '_' + Date.now(),
                nemesisId: nemesis.id,
                isNemesis: true,
                nemesisRank: nemesis.rank || 1,
                nemesisTitle: nemesis.title,
                nemesisVictims: (nemesis.victims || []).slice(),
                nemesisTaunt: nemesis.taunt,
                schoolId: nemesis.schoolId,
                schoolName,
                schoolIcon,
                isBoss: false,
                lethal: true,
                ruleId: 'standard',
                tierName: `${rankInfo.label}`,
                badge: '🩸 KAN DAVASI',
                name: nemesis.name,
                baseName: nemesis.baseName,
                skinColor: nemesis.skinColor,
                traitId: nemesis.traitId,
                styleId: nemesis.styleId,
                perks,
                stats,
                weaponId: nemesis.weaponId,
                shieldId: nemesis.shieldId,
                armorId: nemesis.armorId,
                helmetId: nemesis.helmetId,
                maxHp,
                partner: null,
                bribeOffer: null,
                rewardGold: Math.round(baseGold * rankInfo.rewardMult * rMult * ngReward),
                rewardFame: Math.round((baseFame * rankInfo.rewardMult + rankInfo.fameBonus) * rMult * ngReward),
                completed: false
            };
        },

        resolveNemesisDefeat(nemesisState, nemesisId) {
            if (!nemesisState || !Array.isArray(nemesisState.nemeses) || !nemesisId) return null;
            const idx = nemesisState.nemeses.findIndex(n => n.id === nemesisId && !n.defeated);
            if (idx === -1) return null;

            const nem = nemesisState.nemeses[idx];
            nem.defeated = true;
            nemesisState.nemeses.splice(idx, 1);
            nemesisState.defeatedNemesisCount = (nemesisState.defeatedNemesisCount || 0) + 1;

            const rankInfo = this.getNemesisRankInfo(nem.rank);
            return {
                nemesisId: nem.id,
                name: nem.name,
                title: nem.title,
                rank: nem.rank || 1,
                victims: (nem.victims || []).slice(),
                rosterLoyaltyBonus: 10,
                bonusFame: Math.round(rankInfo.fameBonus * 0.5)
            };
        }
    };

    Game.NemesisRules = NemesisRules;
})(window.LudusGame = window.LudusGame || {});
