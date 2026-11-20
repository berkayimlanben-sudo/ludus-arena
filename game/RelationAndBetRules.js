(function (Game) {
    function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    const RELATION_TIERS = {
        brother: {
            id: 'brother',
            name: 'Silah Kardeşi',
            badge: '⚔️ Silah Kardeşi',
            dmgMult: 1.06,
            defDelta: 3,
            critBonus: 0,
            desc: '2v2 maçta +%6 Hasar ve +3 Zırh'
        },
        friendly: {
            id: 'friendly',
            name: 'Uyumlu',
            badge: '🤝 Uyumlu',
            dmgMult: 1.03,
            defDelta: 0,
            critBonus: 0,
            desc: '2v2 maçta +%3 Hasar'
        },
        neutral: {
            id: 'neutral',
            name: 'Nötr',
            badge: '➖ Nötr',
            dmgMult: 1.0,
            defDelta: 0,
            critBonus: 0,
            desc: '2v2 sinerjisi dengeli'
        },
        rival: {
            id: 'rival',
            name: 'Rakip / Gergin',
            badge: '⚡ Rakip',
            dmgMult: 1.0,
            defDelta: -3,
            critBonus: 0.05,
            desc: '2v2 maçta +%5 Kritik, -3 Zırh'
        }
    };

    const RelationRules = {
        clampRelation(val) {
            return clamp(Math.round(val || 0), -100, 100);
        },

        getRelationScore(g1, g2) {
            if (!g1 || !g2 || g1.id === g2.id) return 0;
            if (g1.relations && g1.relations[g2.id] !== undefined) {
                return this.clampRelation(g1.relations[g2.id]);
            }
            if (g2.relations && g2.relations[g1.id] !== undefined) {
                return this.clampRelation(g2.relations[g1.id]);
            }
            return 0;
        },

        getRelationTier(score) {
            const val = this.clampRelation(score);
            if (val >= 40) return RELATION_TIERS.brother;
            if (val >= 15) return RELATION_TIERS.friendly;
            if (val <= -30) return RELATION_TIERS.rival;
            return RELATION_TIERS.neutral;
        },

        adjustRelation(g1, g2, delta) {
            if (!g1 || !g2 || g1.id === g2.id) return 0;
            if (!g1.relations) g1.relations = {};
            if (!g2.relations) g2.relations = {};
            const current = this.getRelationScore(g1, g2);
            const next = this.clampRelation(current + delta);
            g1.relations[g2.id] = next;
            g2.relations[g1.id] = next;
            return next;
        },

        getCombatPairModifiers(g1, g2) {
            const score = this.getRelationScore(g1, g2);
            const tier = this.getRelationTier(score);
            return {
                score,
                tier,
                dmgMult: tier.dmgMult,
                defDelta: tier.defDelta,
                critBonus: tier.critBonus,
                summary: `${tier.badge} (${score >= 0 ? '+' : ''}${score}): ${tier.desc}`
            };
        },

        applyMatchRelationUpdate(g1, g2, didWin) {
            if (!g1 || !g2 || g1.id === g2.id) return null;
            const prevScore = this.getRelationScore(g1, g2);
            const delta = didWin ? 12 : 3;
            const nextScore = this.adjustRelation(g1, g2, delta);
            const prevTier = this.getRelationTier(prevScore);
            const nextTier = this.getRelationTier(nextScore);
            return {
                prevScore,
                nextScore,
                delta,
                promotedTier: prevTier.id !== nextTier.id ? nextTier : null
            };
        },

        evaluateOvernightRelations(roster, rollFn = Math.random) {
            if (!Array.isArray(roster) || roster.length < 2) {
                return { triggered: false, events: [] };
            }

            if (rollFn() >= 0.65) {
                return { triggered: false, events: [] };
            }

            const i1 = Math.floor(rollFn() * roster.length) % roster.length;
            let i2 = Math.floor(rollFn() * (roster.length - 1)) % (roster.length - 1);
            if (i2 >= i1) i2 += 1;

            const a = roster[i1];
            const b = roster[i2];
            if (!a || !b || a.id === b.id) return { triggered: false, events: [] };

            const frictionTraits = new Set(['fierce', 'berserker']);
            const hasRebellious = ((a.loyalty ?? 65) < 30) || ((b.loyalty ?? 65) < 30);
            const hasFierce = frictionTraits.has(a.traitId) || frictionTraits.has(b.traitId);
            const currentScore = this.getRelationScore(a, b);
            const conflictChance = hasRebellious ? 0.65 : (hasFierce && currentScore <= 10 ? 0.45 : 0.22);

            if (rollFn() < conflictChance) {
                const nextScore = this.adjustRelation(a, b, -8);
                return {
                    triggered: true,
                    events: [{
                        type: 'rivalry',
                        names: [a.name, b.name],
                        relationDelta: -8,
                        nextScore,
                        xpEach: 0,
                        summary: `⚡ Avlu Tartışması: ${a.name} ile ${b.name} gece gerginlik yaşadı (-8 İlişki).`
                    }]
                };
            }

            const nextScore = this.adjustRelation(a, b, 6);
            return {
                triggered: true,
                events: [{
                    type: 'camaraderie',
                    names: [a.name, b.name],
                    relationDelta: 6,
                    nextScore,
                    xpEach: 10,
                    summary: `🤝 Avlu Yoldaşlığı: ${a.name} ve ${b.name} gece talim yaptı (+6 İlişki, +10 XP).`
                }]
            };
        }
    };

    const BET_STAKES = [25, 50, 100];

    const BettingRules = {
        STAKES: BET_STAKES,

        computeFighterPower(fighter, dicts = {}) {
            if (!fighter) return 0;
            const stats = fighter.stats || { strength: 10, agility: 10, vitality: 10 };
            const fat = fighter.fatigue || 0;
            const fatMult = fat >= 2 ? 0.72 : (fat === 1 ? 0.86 : 1.0);

            const weapons = dicts.weapons || {};
            const shields = dicts.shields || {};
            const armors = dicts.armors || {};
            const helmets = dicts.helmets || {};

            const w = weapons[fighter.weaponId] || { damage: 10 };
            const s = shields[fighter.shieldId] || { blockMitigation: 0, hasShield: false };
            const a = armors[fighter.armorId] || { defense: 1, hpBonus: 0 };
            const h = helmets[fighter.helmetId] || { defense: 0 };

            const perkCount = Array.isArray(fighter.perks) ? fighter.perks.length : 0;
            const maxHp = fighter.maxHp || (80 + stats.vitality * 6 + (a.hpBonus || 0) + (perkCount > 0 ? 10 : 0));
            const curHp = fighter.currentHp !== undefined ? fighter.currentHp : maxHp;
            const hpRatio = clamp(curHp / Math.max(1, maxHp), 0.3, 1.0);

            const raw = (stats.strength * 2.4 + stats.agility * 2.0 + stats.vitality * 1.9)
                + (w.damage || 10) * 1.7
                + ((a.defense || 0) + (h.defense || 0)) * 2.2
                + (s.hasShield ? 8 : 0)
                + perkCount * 7
                + (fighter.isBoss ? 18 : 0);

            return Math.round(raw * fatMult * (0.65 + 0.35 * hpRatio));
        },

        calculateMatchOdds(myTeam, opp, dicts = {}) {
            const myList = Array.isArray(myTeam) ? myTeam.filter(Boolean) : [myTeam].filter(Boolean);
            const oppList = (opp && opp.ruleId === 'team_2v2' && opp.partner)
                ? [opp, opp.partner]
                : [opp].filter(Boolean);

            const myPower = Math.max(20, myList.reduce((acc, g) => acc + this.computeFighterPower(g, dicts), 0));
            const oppPower = Math.max(20, oppList.reduce((acc, e) => acc + this.computeFighterPower(e, dicts), 0));

            const ratio = oppPower / myPower;
            let baseWin = 1.75 * Math.pow(ratio, 0.85);
            if (opp && opp.lethal) baseWin += 0.08;
            if (opp && opp.isBoss) baseWin += 0.12;

            const winOdds = Number(clamp(baseWin, 1.30, 2.95).toFixed(2));
            const fastWinOdds = Number(clamp(winOdds * 1.48, 2.05, 4.35).toFixed(2));

            let outlook = 'Dengeli';
            if (winOdds <= 1.55) outlook = 'Favori';
            else if (winOdds >= 2.05) outlook = 'Zorlu (Yüksek Oran)';

            return {
                myPower,
                oppPower,
                winOdds,
                fastWinOdds,
                outlook
            };
        },

        validateBet(betSpec, gold, opp, computedOdds) {
            if (!betSpec || !betSpec.type || betSpec.type === 'none' || !betSpec.stake) {
                return { ok: true, active: false, type: 'none', stake: 0, odds: 1 };
            }
            if (betSpec.type !== 'win' && betSpec.type !== 'fast_win') {
                return { ok: false, msg: 'Geçersiz bahis türü.' };
            }
            if (opp && opp.bribeOffer && opp.bribeOffer.accepted && opp.bribeOffer.type === 'throw_match') {
                return { ok: false, msg: 'Şike (bilerek yenilme) aktifken kendi galibiyetine bahis oynayamazsın!' };
            }
            const stake = Math.max(0, Math.round(betSpec.stake));
            if (stake <= 0) {
                return { ok: true, active: false, type: 'none', stake: 0, odds: 1 };
            }
            if ((gold || 0) < stake) {
                return { ok: false, msg: `Bahis için ${stake} Altın gerekiyor!` };
            }
            const odds = betSpec.type === 'fast_win'
                ? (computedOdds ? computedOdds.fastWinOdds : 2.5)
                : (computedOdds ? computedOdds.winOdds : 1.75);

            return {
                ok: true,
                active: true,
                type: betSpec.type,
                stake,
                odds
            };
        },

        resolveBet(activeBet, didWin, durationSec = 0) {
            if (!activeBet || !activeBet.active || !activeBet.stake) {
                return { placed: false, won: false, payout: 0, netDelta: 0, summary: '' };
            }

            const isFast = activeBet.type === 'fast_win';
            const won = Boolean(didWin) && (!isFast || (durationSec < 20));
            const payout = won ? Math.round(activeBet.stake * activeBet.odds) : 0;
            const netDelta = payout - activeBet.stake;
            const label = isFast ? '⚡ Hızlı Zafer (<20sn)' : '🏆 Zafer Bahsi';

            let summary = '';
            if (won) {
                summary = `🎲 ${label} TUTTU (${activeBet.odds.toFixed(2)}x): +🪙${payout} Ödeme (+${netDelta} Kâr)`;
            } else if (isFast && didWin) {
                summary = `🎲 ${label} KAYIP (${Math.round(durationSec)}sn sürdü, -🪙${activeBet.stake})`;
            } else {
                summary = `🎲 ${label} KAYIP (-🪙${activeBet.stake})`;
            }

            return {
                placed: true,
                won,
                betType: activeBet.type,
                stake: activeBet.stake,
                odds: activeBet.odds,
                payout,
                netDelta,
                durationSec,
                summary
            };
        }
    };

    Game.RelationRules = RelationRules;
    Game.BettingRules = BettingRules;
})(window.LudusGame = window.LudusGame || {});
