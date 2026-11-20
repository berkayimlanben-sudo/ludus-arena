(function (Game) {
    function clampReputation(val) {
        return Math.max(-30, Math.min(100, Math.round(val || 0)));
    }

    function createDefaultSenateState() {
        return {
            reputations: {
                crassus: 0,
                tullius: 0,
                valeria: 0
            },
            dailyContract: null,
            completedContractsCount: 0,
            bribesCompleted: 0,
            scandalsCount: 0
        };
    }

    function getTotalReputation(senateState) {
        const reps = (senateState && senateState.reputations) || {};
        return (reps.crassus || 0) + (reps.tullius || 0) + (reps.valeria || 0);
    }

    function getSenateRewardBonuses(senateState) {
        const reps = (senateState && senateState.reputations) || {};
        const c = reps.crassus || 0;
        const t = reps.tullius || 0;
        const v = reps.valeria || 0;
        const total = c + t + v;

        const goldBonusMult = c >= 60 ? 0.25 : (c >= 30 ? 0.15 : (c < 0 ? -0.10 : 0));
        const fameBonusMult = t >= 60 ? 0.25 : (t >= 30 ? 0.15 : (t < 0 ? -0.10 : 0));
        const bribeRiskReduction = v >= 60 ? 0.14 : (v >= 30 ? 0.08 : (v < 0 ? -0.08 : 0));
        const bribeGoldMult = 1 + (v > 0 ? Math.floor(v / 20) * 0.08 : 0);
        const upkeepDiscount = total >= 90 ? 0.15 : (total >= 45 ? 0.08 : 0);

        return {
            goldBonusMult,
            fameBonusMult,
            bribeRiskReduction,
            bribeGoldMult,
            upkeepDiscount,
            totalReputation: total
        };
    }

    function pickDailyContract(templates, regionOrder = 1, has2v2 = false, ngPlusCount = 0, roll = Math.random(), excludeId = null) {
        if (!Array.isArray(templates) || templates.length === 0) return null;
        let pool = templates.filter(tpl => (has2v2 || tpl.conditionType !== 'team_2v2'));
        if (excludeId && pool.length > 1) {
            pool = pool.filter(tpl => tpl.id !== excludeId);
        }
        if (pool.length === 0) pool = templates;

        const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)));
        const tpl = pool[idx];
        const scale = (1 + Math.max(0, regionOrder - 1) * 0.25) * (1 + (ngPlusCount || 0) * 0.25);

        return {
            id: tpl.id,
            senatorId: tpl.senatorId,
            title: tpl.title,
            desc: tpl.desc,
            conditionType: tpl.conditionType,
            rewardGold: Math.round(tpl.baseGold * scale),
            rewardFame: Math.round(tpl.baseFame * scale),
            repReward: tpl.repReward,
            accepted: false,
            completed: false
        };
    }

    function evaluateContractCompletion(contract, matchSummary) {
        if (!contract || !contract.accepted || contract.completed) {
            return { completed: false, rewardGold: 0, rewardFame: 0, repReward: 0, senatorId: null, title: '' };
        }
        if (!matchSummary || !matchSummary.didWin) {
            return { completed: false, rewardGold: 0, rewardFame: 0, repReward: 0, senatorId: contract.senatorId, title: contract.title };
        }

        const fighters = Array.isArray(matchSummary.fighters) ? matchSummary.fighters : [];
        const opp = matchSummary.opp || {};
        const dur = typeof matchSummary.durationSec === 'number' ? matchSummary.durationSec : Infinity;

        let met = false;
        switch (contract.conditionType) {
            case 'no_shield':
                met = fighters.length > 0 && fighters.every(f => !f.shieldId || f.shieldId === 'none');
                break;
            case 'heavy_weapon':
                met = fighters.some(f => f.weaponId === 'axe' || f.weaponId === 'mace');
                break;
            case 'lethal':
                met = Boolean(opp.lethal);
                break;
            case 'with_poison':
                met = fighters.some(f => f.consumableId === 'poison');
                break;
            case 'fast_win':
                met = dur <= 22;
                break;
            case 'team_2v2':
                met = opp.ruleId === 'team_2v2';
                break;
            default:
                met = false;
        }

        return {
            completed: met,
            rewardGold: met ? contract.rewardGold : 0,
            rewardFame: met ? contract.rewardFame : 0,
            repReward: met ? contract.repReward : 0,
            senatorId: contract.senatorId,
            title: contract.title
        };
    }

    function createBribeOfferForOpponent(opp, senateState, ngPlusCount = 0, forcedType = null) {
        if (!opp || opp.isBoss || opp.isTournament || opp.ruleId === 'team_2v2' || opp.completed) {
            return null;
        }
        const bonuses = getSenateRewardBonuses(senateState);
        // Ölümüne maçlarda kalıcı ölümü zorlamamak için yalnızca sabotaj teklifi çıkar
        let offerType = forcedType;
        if (opp.lethal) {
            offerType = 'sabotage_enemy';
        } else if (!offerType) {
            offerType = Math.random() < 0.55 ? 'throw_match' : 'sabotage_enemy';
        }

        if (offerType === 'throw_match') {
            const riskChance = Math.max(0.08, Math.min(0.40, 0.26 - bonuses.bribeRiskReduction));
            const bribeGold = Math.round((160 + (opp.rewardGold || 80) * 0.95) * bonuses.bribeGoldMult);
            return {
                type: 'throw_match',
                senatorId: 'valeria',
                title: '🎭 Bahis Şikesi (Bilerek Yenil)',
                desc: `Valeria'nın bahisçileri ${opp.name} karşısında yere düşmeni istiyor. Anlaşmayı tutarsan büyük rüşvet alırsın!`,
                bribeGold,
                upfrontCost: 0,
                riskChance,
                accepted: false
            };
        }

        const riskChance = Math.max(0.08, Math.min(0.35, 0.20 - bonuses.bribeRiskReduction));
        const upfrontCost = Math.round(45 * (1 + (ngPlusCount || 0) * 0.15));
        return {
            type: 'sabotage_enemy',
            senatorId: 'valeria',
            title: '🧪 Rakibe Gizli Sabotaj',
            desc: `${opp.name}'ın maç öncesi şarabına uyuşukluk iksiri karıştır (-%25 Can & -%20 Güç/Hız).`,
            bribeGold: 0,
            upfrontCost,
            riskChance,
            accepted: false
        };
    }

    function resolveBribeOutcome(offer, didWin, riskRoll = Math.random()) {
        if (!offer || !offer.accepted) {
            return null;
        }

        const caught = riskRoll < (offer.riskChance || 0.2);

        if (offer.type === 'throw_match') {
            if (didWin) {
                return {
                    type: offer.type,
                    keptDeal: false,
                    caught: false,
                    goldDelta: 0,
                    fameDelta: 0,
                    valeriaRepDelta: -10,
                    summary: '🎭 Şike anlaşmasını bozup kazandın! Senatris Valeria öfkelendi (-10 İtibar).'
                };
            }
            if (caught) {
                const fine = Math.round(offer.bribeGold * 0.4);
                return {
                    type: offer.type,
                    keptDeal: true,
                    caught: true,
                    goldDelta: -fine,
                    fameDelta: -15,
                    valeriaRepDelta: -12,
                    summary: `⚖️ ŞİKE SKANDALI! Hakemler hileyi fark etti (-${fine} Altın, -15 Şöhret, -12 Valeria İtibarı)!`
                };
            }
            return {
                type: offer.type,
                keptDeal: true,
                caught: false,
                goldDelta: offer.bribeGold,
                fameDelta: 0,
                valeriaRepDelta: 8,
                summary: `🤫 Şike kusursuz işledi! +${offer.bribeGold} Altın rüşvet ve +8 Valeria İtibarı!`
            };
        }

        if (caught) {
            return {
                type: offer.type,
                keptDeal: true,
                caught: true,
                goldDelta: -60,
                fameDelta: -15,
                valeriaRepDelta: -10,
                summary: '⚖️ SABOTAJ YAKALANDI! Muhafızlar cezası kesti (-60 Altın, -15 Şöhret, -10 Valeria İtibarı)!'
            };
        }

        return {
            type: offer.type,
            keptDeal: true,
            caught: false,
            goldDelta: 0,
            fameDelta: 0,
            valeriaRepDelta: 5,
            summary: '🧪 Sabotaj gizli kaldı! Senatris Valeria memnun (+5 İtibar).'
        };
    }

    Game.SenateRules = {
        clampReputation,
        createDefaultSenateState,
        getTotalReputation,
        getSenateRewardBonuses,
        pickDailyContract,
        evaluateContractCompletion,
        createBribeOfferForOpponent,
        resolveBribeOutcome
    };
})(window.LudusGame = window.LudusGame || {});
