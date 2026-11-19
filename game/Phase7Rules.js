(function (Game) {
    class Phase7Rules {
        static getDoctoreBonuses(doctore) {
            if (!doctore) {
                return { statBonus: 0, xpBonusPct: 0, trainingDiscount: 0 };
            }
            return {
                statBonus: doctore.statBonus || 2,
                xpBonusPct: doctore.xpBonusPct || 25,
                trainingDiscount: doctore.trainingDiscount || 0.10
            };
        }

        static canRetireAsDoctore(gladiator, rosterLength) {
            if (!gladiator) {
                return { ok: false, msg: 'Gladyatör bulunamadı.' };
            }
            if ((gladiator.wins || 0) < 10) {
                return { ok: false, msg: `Doctore olmak için en az 10 zafer gerekir (${gladiator.wins || 0}/10).` };
            }
            if (rosterLength < 2) {
                return { ok: false, msg: 'Emekli etmek için kadroda en az 1 başka gladyatör kalmalı.' };
            }
            return { ok: true };
        }

        static createDoctoreRecord(gladiator, day) {
            const wins = gladiator.wins || 10;
            const extraWins = Math.max(0, wins - 10);
            return {
                name: gladiator.name,
                origin: gladiator.origin,
                wins,
                level: gladiator.level || 1,
                skinColor: gladiator.skinColor,
                retiredDay: day,
                statBonus: 2 + Math.floor(extraWins / 5),
                xpBonusPct: 25 + Math.min(25, Math.floor(extraWins / 2) * 5),
                trainingDiscount: 0.10
            };
        }

        static computeEffectiveXp(baseXp, doctore) {
            const bonusPct = doctore ? (doctore.xpBonusPct || 0) : 0;
            return Math.round(baseXp * (1 + bonusPct / 100));
        }

        static shouldTriggerRomanEvent(day, lastEventDay, roll = Math.random()) {
            const elapsed = day - (lastEventDay || 1);
            if (elapsed >= 4) return true;
            if (elapsed >= 3 && roll < 0.65) return true;
            return false;
        }

        static pickRomanEvent(events, lastEventId, roll = Math.random()) {
            if (!Array.isArray(events) || events.length === 0) return null;
            const pool = events.length > 1
                ? events.filter(ev => ev.id !== lastEventId)
                : events;
            const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)));
            return pool[idx];
        }

        static resolveRomanEventChoice(eventDef, choiceId, state, helpers) {
            if (!eventDef || !state) return { ok: false, msg: 'Geçersiz olay.' };
            const choice = (eventDef.choices || []).find(c => c.id === choiceId);
            if (!choice) return { ok: false, msg: 'Seçenek bulunamadı.' };

            const minGold = choice.minGold || 0;
            if (state.gold < minGold) {
                return { ok: false, msg: `Yeterli altın yok! (${minGold} altın gerekiyor)` };
            }

            if (!state.inventory.consumables) {
                state.inventory.consumables = { poison: 0, net: 0, potion: 0 };
            }

            const cons = state.inventory.consumables;
            const roster = state.roster || [];
            const selected = roster.find(g => g.id === state.selectedGladiatorId) || roster[0] || null;
            const leveledNames = [];
            let summary = 'Karar verildi.';

            const grantAllXp = (amt) => {
                for (const g of roster) {
                    if (helpers && helpers.grantXp && helpers.grantXp(g, amt)) {
                        leveledNames.push(g.name);
                    }
                }
            };

            if (eventDef.id === 'patrician_banquet') {
                if (choiceId === 'send_fighter') {
                    state.gold += 75;
                    state.fame += 18;
                    if (selected) selected.currentHp = Math.max(1, selected.currentHp - 15);
                    summary = `${selected ? selected.name : 'Savaşçın'} ziyafette parladı! +75 Altın, +18 Şöhret.`;
                } else if (choiceId === 'bribe_wine') {
                    state.gold -= 50;
                    state.fame += 20;
                    summary = 'Asillerle bağların güçlendi! +20 Şöhret.';
                } else {
                    summary = 'Davet nazikçe geri çevrildi.';
                }
            } else if (eventDef.id === 'city_watch') {
                if (choiceId === 'pay_bribe') {
                    state.gold -= 65;
                    state.fame += 6;
                    summary = 'Muhafızlar susturuldu (+6 Şöhret).';
                } else if (choiceId === 'stand_firm') {
                    state.fame = Math.max(0, state.fame - 10);
                    grantAllXp(90);
                    summary = 'Avluyu savundunuz (-10 Şöhret), tüm kadro +90 XP kazandı!';
                }
            } else if (eventDef.id === 'merchant_wagon') {
                if (choiceId === 'help_merchant') {
                    state.gold += 40;
                    state.fame += 14;
                    summary = 'Tüccar minnettar kaldı: +40 Altın, +14 Şöhret!';
                } else if (choiceId === 'buy_cheap') {
                    state.gold -= 45;
                    cons.potion = (cons.potion || 0) + 1;
                    cons.net = (cons.net || 0) + 1;
                    summary = '+1 Can Şurubu ve +1 Gladyatör Ağı envantere eklendi!';
                }
            } else if (eventDef.id === 'greek_physician') {
                if (choiceId === 'treat_all') {
                    state.gold -= 55;
                    for (const g of roster) {
                        g.injuryId = null;
                        g.fatigue = 0;
                        if (helpers && helpers.getMaxHp) {
                            g.currentHp = helpers.getMaxHp(g);
                        }
                    }
                    summary = 'Yunan hekim tüm kadroyu tamamen iyileştirdi!';
                } else if (choiceId === 'buy_potion') {
                    state.gold -= 35;
                    cons.potion = (cons.potion || 0) + 1;
                    summary = '+1 Can Şurubu satın alındı!';
                } else {
                    summary = 'Hekim yoluna devam etti.';
                }
            } else if (eventDef.id === 'shadow_alchemist') {
                if (choiceId === 'buy_kit') {
                    state.gold -= 55;
                    cons.poison = (cons.poison || 0) + 1;
                    cons.net = (cons.net || 0) + 1;
                    summary = '+1 Silah Zehri ve +1 Gladyatör Ağı satın alındı!';
                } else if (choiceId === 'spar_test') {
                    state.gold -= 35;
                    if (selected) selected.stats.strength += 1;
                    summary = `${selected ? selected.name : 'Gladyatör'} +1 Güç kazandı!`;
                } else {
                    summary = 'Simyacı avludan uzaklaştırıldı.';
                }
            }

            return { ok: true, summary, leveledNames };
        }
    }

    Game.Phase7Rules = Phase7Rules;
})(window.LudusGame = window.LudusGame || {});
