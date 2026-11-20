(function (Game) {
    class CareerRules {
        static getUnlockedRegions(fame, regions) {
            if (!Array.isArray(regions) || regions.length === 0) return [];
            const f = fame || 0;
            return regions.filter(r => f >= r.minFame);
        }

        static getHighestUnlockedRegion(fame, regions) {
            const unlocked = CareerRules.getUnlockedRegions(fame, regions);
            if (unlocked.length > 0) return unlocked[unlocked.length - 1];
            return (regions && regions[0]) || null;
        }

        static getRegionById(regionId, regions) {
            if (!Array.isArray(regions) || regions.length === 0) return null;
            return regions.find(r => r.id === regionId) || regions[0];
        }

        static isRegionUnlocked(regionId, fame, regions) {
            const r = CareerRules.getRegionById(regionId, regions);
            if (!r) return false;
            return (fame || 0) >= r.minFame;
        }

        static getNgPlusEnemyScale(ngPlusCount) {
            return 1 + Math.max(0, ngPlusCount || 0) * 0.22;
        }

        static getNgPlusRewardScale(ngPlusCount) {
            return 1 + Math.max(0, ngPlusCount || 0) * 0.30;
        }

        static buildTournamentOpponent(roundIndex, ngPlusCount, tournamentList, armors) {
            if (!Array.isArray(tournamentList) || !tournamentList[roundIndex]) return null;
            const tpl = tournamentList[roundIndex];
            const statScale = CareerRules.getNgPlusEnemyScale(ngPlusCount);
            const rewardScale = CareerRules.getNgPlusRewardScale(ngPlusCount);

            const stats = {
                strength: Math.round(tpl.baseStats.strength * statScale),
                agility: Math.round(tpl.baseStats.agility * statScale),
                vitality: Math.round(tpl.baseStats.vitality * statScale)
            };
            const armorObj = (armors && armors[tpl.armorId]) ? armors[tpl.armorId] : { hpBonus: 0 };
            const perks = Array.isArray(tpl.perks) ? tpl.perks.slice() : [];
            const maxHp = 80 + stats.vitality * 6 + (armorObj.hpBonus || 0) + (perks.includes('iron_will') ? 20 : 0);

            return {
                id: `tourney_r${roundIndex + 1}_${Date.now()}`,
                isTournament: true,
                tournamentRound: roundIndex + 1,
                isBoss: Boolean(tpl.isBoss),
                lethal: false,
                ruleId: 'standard',
                tierName: tpl.title,
                badge: `TUR ${roundIndex + 1}/${tournamentList.length}`,
                name: tpl.name,
                skinColor: tpl.skinColor,
                traitId: tpl.traitId,
                styleId: tpl.styleId || 'balanced',
                perks,
                stats,
                weaponId: tpl.weaponId,
                shieldId: tpl.shieldId,
                armorId: tpl.armorId,
                helmetId: tpl.helmetId,
                maxHp,
                partner: null,
                rewardGold: Math.round(tpl.rewardGold * rewardScale),
                rewardFame: Math.round(tpl.rewardFame * rewardScale),
                completed: false
            };
        }

        static advanceTournament(tournament, didWin, totalRounds = 3) {
            const prevCompleted = Boolean(tournament && tournament.completedChampionship);
            const curRound = (tournament && typeof tournament.round === 'number') ? tournament.round : 0;

            if (!didWin) {
                return {
                    active: false,
                    round: 0,
                    fighterId: null,
                    completedChampionship: prevCompleted,
                    wonChampionship: false,
                    eliminated: true
                };
            }

            const nextRound = curRound + 1;
            if (nextRound >= totalRounds) {
                return {
                    active: false,
                    round: 0,
                    fighterId: null,
                    completedChampionship: true,
                    wonChampionship: true,
                    eliminated: false
                };
            }

            return {
                active: true,
                round: nextRound,
                fighterId: tournament ? tournament.fighterId : null,
                completedChampionship: prevCompleted,
                wonChampionship: false,
                eliminated: false
            };
        }

        static createNewGamePlusSetup(prevState, championGladiator, phase7Rules) {
            const nextNgPlus = ((prevState && prevState.ngPlusCount) || 0) + 1;
            const startGold = 240 + nextNgPlus * 120;
            const startFame = Math.min(60, Math.round(((prevState && prevState.fame) || 0) * 0.20));

            let carriedDoctore = (prevState && prevState.doctore) ? Object.assign({}, prevState.doctore) : null;
            if (!carriedDoctore && championGladiator && phase7Rules) {
                const pseudoChamp = Object.assign({}, championGladiator, {
                    wins: Math.max(10, championGladiator.wins || 10)
                });
                carriedDoctore = phase7Rules.createDoctoreRecord(pseudoChamp, 1);
            }

            const heirBonus = nextNgPlus * 2;
            return {
                nextNgPlus,
                startGold,
                startFame,
                carriedDoctore,
                starterName: championGladiator ? `${championGladiator.name} II` : 'Maximus II',
                starterStats: {
                    strength: 11 + heirBonus,
                    agility: 10 + heirBonus,
                    vitality: 11 + heirBonus
                }
            };
        }
    }

    Game.CareerRules = CareerRules;
})(window.LudusGame = window.LudusGame || {});
