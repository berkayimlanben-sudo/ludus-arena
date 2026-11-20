(function (Game) {
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    const CROWD_TIERS = [
        { min: 85, id: 'frenzied', label: '👑 ÇILGIN KİTLE!', tipMult: 0.30, fameBonus: 10, mercyChance: 0.50 },
        { min: 60, id: 'roaring', label: '🔥 Coşkulu Arena', tipMult: 0.18, fameBonus: 5, mercyChance: 0.32 },
        { min: 30, id: 'warm', label: '👏 İlgili Kalabalık', tipMult: 0.08, fameBonus: 2, mercyChance: 0.15 },
        { min: 0, id: 'quiet', label: '😐 Sessiz Tribün', tipMult: 0, fameBonus: 0, mercyChance: 0 }
    ];

    const CrowdRules = {
        clampFavor(val) {
            return clamp(Math.round(val || 0), 0, 100);
        },

        getInitialFavor(leftConfigs = []) {
            const hasFav = Array.isArray(leftConfigs) && leftConfigs.some(c => c && c.trait && c.trait.id === 'crowd_favorite');
            return hasFav ? 24 : 15;
        },

        getFavorDeltaForEvent(eventType, attacker, target) {
            let delta = 0;
            if (eventType === 'crit') delta = 14;
            else if (eventType === 'hit') delta = 4;
            else if (eventType === 'block') delta = 8;
            else if (eventType === 'ko') delta = 18;
            else if (eventType === 'tactic_MORALE') delta = 22;
            else if (eventType === 'tactic_AGGRESSIVE') delta = 8;
            else if (eventType === 'tactic_DEFENSIVE') delta = 2;

            if ((eventType === 'hit' || eventType === 'crit') && attacker && attacker.hp > 0 && attacker.hp <= attacker.maxHp * 0.30) {
                delta += 5;
            }
            if ((eventType === 'hit' || eventType === 'crit' || eventType === 'ko') && attacker && attacker.trait && attacker.trait.id === 'crowd_favorite') {
                delta = Math.round(delta * 1.25);
            }
            return delta;
        },

        getCrowdTier(favor) {
            const val = this.clampFavor(favor);
            for (const tier of CROWD_TIERS) {
                if (val >= tier.min) return tier;
            }
            return CROWD_TIERS[CROWD_TIERS.length - 1];
        },

        calculateMercyChance(favor, isCrowdFavorite = false, tulliusRep = 0) {
            const tier = this.getCrowdTier(favor);
            if (tier.mercyChance <= 0 && !isCrowdFavorite) return 0;
            const favBonus = isCrowdFavorite ? 0.12 : 0;
            const senBonus = Math.min(0.10, Math.floor(Math.max(0, tulliusRep || 0) / 10) * 0.01);
            return Number(Math.min(0.75, tier.mercyChance + favBonus + senBonus).toFixed(2));
        },

        computeSparsioReward(favor, baseGold, isCrowdFavorite = false) {
            const tier = this.getCrowdTier(favor);
            if (tier.tipMult <= 0) {
                return { triggered: false, tier, bonusGold: 0, bonusFame: 0, summary: '' };
            }
            const mult = tier.tipMult * (isCrowdFavorite ? 1.25 : 1.0);
            const bonusGold = Math.max(2, Math.round((baseGold || 0) * mult));
            const bonusFame = tier.fameBonus + (isCrowdFavorite ? 2 : 0);
            return {
                triggered: true,
                tier,
                bonusGold,
                bonusFame,
                summary: `📣 Seyirci Bahşişi (${tier.label}): +🪙${bonusGold} Altın, +🏛️${bonusFame} Şöhret`
            };
        },

        evaluatePolliceVerso(params = {}, rollFn = Math.random) {
            const {
                isLethal = false,
                favor = 0,
                isCrowdFavorite = false,
                tulliusRep = 0,
                isBribeThrow = false
            } = params;

            if (!isLethal || isBribeThrow) {
                return { eligible: false, spared: false, chance: 0, verdict: 'none', summary: '' };
            }

            const chance = this.calculateMercyChance(favor, isCrowdFavorite, tulliusRep);
            if (chance <= 0) {
                return {
                    eligible: true,
                    spared: false,
                    chance: 0,
                    verdict: 'down',
                    summary: '👎 Tribünler soğuk kaldı — İmparator başparmağını AŞAĞI indirdi!'
                };
            }

            const spared = rollFn() < chance;
            if (spared) {
                return {
                    eligible: true,
                    spared: true,
                    chance,
                    verdict: 'up',
                    summary: `👍 MISSIO! Çılgın seyirci hayatını istedi (%${Math.round(chance * 100)}) — İmparator başparmağını YUKARI kaldırdı!`
                };
            }

            return {
                eligible: true,
                spared: false,
                chance,
                verdict: 'down',
                summary: `👎 POLLICE VERSO! Merhamet oylaması yetmedi (%${Math.round(chance * 100)}) — İmparator başparmağını AŞAĞI indirdi!`
            };
        }
    };

    Game.CrowdRules = CrowdRules;
})(window.LudusGame = window.LudusGame || {});
