(function (Game) {
    const ORIGIN_FAVORITE_POOLS = {
        'Trakyalı': ['dagger', 'sword', 'spear'],
        'Galyalı': ['sword', 'axe', 'mace'],
        'Cermen': ['axe', 'spear', 'mace'],
        'Roma Kaçağı': ['sword', 'dagger', 'spear'],
        'Nubyalı': ['spear', 'trident', 'dagger'],
        'Hispanialı': ['sword', 'dagger', 'trident']
    };

    function clampLoyalty(val) {
        const n = typeof val === 'number' && !Number.isNaN(val) ? val : 65;
        return Math.max(0, Math.min(100, Math.round(n)));
    }

    function getLoyaltyTier(loyalty) {
        const l = clampLoyalty(loyalty);
        if (l >= 75) {
            return {
                id: 'loyal',
                name: 'Sadık Yürek',
                badge: '❤️ Sadık Yürek',
                desc: 'Can %25 altına inince maçta 1 kez +10 Stamina ve +5 Zırh direnci kazanır.',
                dmgMult: 1.0,
                spdMult: 1.0,
                trainingMult: 1.0,
                rebellionRisk: 0
            };
        }
        if (l >= 40) {
            return {
                id: 'steady',
                name: 'Güvenilir',
                badge: '🤝 Güvenilir',
                desc: 'Ludus düzenine uyumlu ve istikrarlı.',
                dmgMult: 1.0,
                spdMult: 1.0,
                trainingMult: 1.0,
                rebellionRisk: 0
            };
        }
        if (l >= 25) {
            return {
                id: 'uneasy',
                name: 'Hoşnutsuz',
                badge: '😒 Hoşnutsuz',
                desc: 'İsteklerini karşılamak ve moral vermek gerekir.',
                dmgMult: 1.0,
                spdMult: 1.0,
                trainingMult: 1.0,
                rebellionRisk: 0
            };
        }
        return {
            id: 'rebellious',
            name: 'İsyankâr',
            badge: '⚠️ İsyankâr',
            desc: 'Arenada -%10 Hasar/Hız • +%15 Eğitim Ücreti • Gecede %10 İsyan Riski',
            dmgMult: 0.90,
            spdMult: 0.90,
            trainingMult: 1.15,
            rebellionRisk: 0.10
        };
    }

    function pickFavoriteWeaponId(origin, traitId, weaponDict, roll = Math.random()) {
        const keys = weaponDict ? Object.keys(weaponDict) : ['dagger', 'sword', 'spear', 'trident', 'mace', 'axe'];
        let pool = ORIGIN_FAVORITE_POOLS[origin] ? ORIGIN_FAVORITE_POOLS[origin].slice() : keys.slice();
        if (traitId === 'fierce' && !pool.includes('axe')) pool.push('axe');
        if (traitId === 'nimble' && !pool.includes('dagger')) pool.push('dagger');
        if (traitId === 'iron_skin' && !pool.includes('mace')) pool.push('mace');
        pool = pool.filter(id => keys.includes(id));
        if (pool.length === 0) pool = keys;
        const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(roll * pool.length)));
        return pool[idx];
    }

    function isUsingFavoriteWeapon(gladiator) {
        return Boolean(gladiator && gladiator.favoriteWeaponId && gladiator.weaponId === gladiator.favoriteWeaponId);
    }

    function getFavoriteWeaponBonus(gladiator) {
        if (isUsingFavoriteWeapon(gladiator)) {
            return { active: true, dmgMult: 1.06, critBonus: 0.05 };
        }
        return { active: false, dmgMult: 1.0, critBonus: 0 };
    }

    function generatePersonalRequest(gladiator, state, weaponDict, maxHp, roll = Math.random()) {
        if (!gladiator || !state || !weaponDict) return null;
        const day = state.day || 1;
        const smithLvl = (state.buildings && state.buildings.blacksmith) || 1;
        const ownedWeapons = (state.inventory && state.inventory.weapons) || {};
        const curWeapon = weaponDict[gladiator.weaponId] || { id: 'sword', name: 'Gladius Kılıç', tier: 1 };
        const favWeapon = gladiator.favoriteWeaponId ? weaponDict[gladiator.favoriteWeaponId] : null;

        // 1. Öncelik: Sakat, çok yaralı veya bitkinse Revir / dinlenme isteği
        if (gladiator.injuryId || gladiator.currentHp < Math.ceil(maxHp * 0.65) || (gladiator.fatigue || 0) >= 2) {
            return {
                id: `req_heal_${day}_${Math.floor(roll * 1000)}`,
                type: 'heal_or_rest',
                title: '🩹 Revir & Dinlenme İsteği',
                desc: 'Yaralarım ağırlaşıyor Efendim; beni Revirde iyileştir veya yarına kadar dinlendir.',
                rewardLoyalty: 12,
                rewardXp: 25,
                createdDay: day
            };
        }

        // 2. Öncelik: Favori silahı henüz takılı değilse önce favori silahını ister
        if (favWeapon && gladiator.weaponId !== favWeapon.id) {
            const favAvailable = favWeapon.tier <= smithLvl || (ownedWeapons[favWeapon.id] || 0) > 0;
            if (favAvailable) {
                return {
                    id: `req_fav_${day}_${Math.floor(roll * 1000)}`,
                    type: 'equip_favorite',
                    title: `★ Favori Silah: ${favWeapon.name}`,
                    desc: `Elim ${favWeapon.name} için yaratılmış Efendim! Bana favori silahımı kuşanma fırsatı ver.`,
                    targetWeaponId: favWeapon.id,
                    rewardLoyalty: 15,
                    rewardXp: 35,
                    createdDay: day
                };
            }
        }

        // 3. Öncelik: Favori silahı zaten takılıysa (veya favorisi Demirci'de henüz kapalıysa) üst seviye silah ister
        const higherTierWeapons = Object.values(weaponDict).filter(w =>
            w.tier > curWeapon.tier && (w.tier <= smithLvl || (ownedWeapons[w.id] || 0) > 0)
        );
        if (higherTierWeapons.length > 0 && roll < 0.72) {
            const pick = higherTierWeapons[Math.min(higherTierWeapons.length - 1, Math.floor(roll * higherTierWeapons.length))];
            return {
                id: `req_upg_${day}_${Math.floor(roll * 1000)}`,
                type: 'upgrade_weapon',
                title: `⚔️ Üst Seviye Silah: ${pick.name}`,
                desc: `${curWeapon.name} iyi ama daha ağır sınavlar geliyor; bana Seviye ${pick.tier} bir silah (${pick.name} veya eşdeğeri) kuşan!`,
                targetWeaponId: pick.id,
                targetTier: pick.tier,
                rewardLoyalty: 14,
                rewardXp: 40,
                createdDay: day
            };
        }

        // 4. Favori silahı takılıyken favori silahıyla zafer kazanma isteği (10 zafer/özgürlük/Doctore isteği ASLA üretilmez)
        if (favWeapon && gladiator.weaponId === favWeapon.id) {
            return {
                id: `req_winfav_${day}_${Math.floor(roll * 1000)}`,
                type: 'win_with_favorite',
                title: `🏆 ${favWeapon.name} ile Zafer`,
                desc: `Elimdeki ${favWeapon.name} ile arenaya çıkıp adımı kumlara kazımak istiyorum!`,
                targetWeaponId: favWeapon.id,
                rewardLoyalty: 14,
                rewardXp: 40,
                createdDay: day
            };
        }

        return {
            id: `req_win_${day}_${Math.floor(roll * 1000)}`,
            type: 'win_match',
            title: '⚔️ Arenada Zafer Arzusu',
            desc: 'Kenarda beklemekten sıkıldım Efendim. Beni arenaya çıkar ve bir zafer kazanalım.',
            rewardLoyalty: 12,
            rewardXp: 30,
            createdDay: day
        };
    }

    function evaluateRequestProgress(gladiator, eventType, context = {}, weaponDict = {}) {
        const req = gladiator && gladiator.activeRequest;
        if (!req) return { fulfilled: false };

        let fulfilled = false;
        if (eventType === 'equip') {
            const equipped = weaponDict[gladiator.weaponId];
            if (req.type === 'equip_favorite' && gladiator.weaponId === req.targetWeaponId) {
                fulfilled = true;
            } else if (req.type === 'upgrade_weapon' && equipped && equipped.tier >= (req.targetTier || 2)) {
                fulfilled = true;
            }
        } else if (eventType === 'heal') {
            if (req.type === 'heal_or_rest' && !gladiator.injuryId && gladiator.currentHp >= Math.ceil((context.maxHp || 100) * 0.90)) {
                fulfilled = true;
            }
        } else if (eventType === 'next_day') {
            if (req.type === 'heal_or_rest' && !gladiator.injuryId && !context.starved && gladiator.currentHp >= Math.ceil((context.maxHp || 100) * 0.70)) {
                fulfilled = true;
            }
        } else if (eventType === 'match_win' && context.didWin) {
            if (req.type === 'win_with_favorite' && gladiator.weaponId === req.targetWeaponId) {
                fulfilled = true;
            } else if (req.type === 'win_match') {
                fulfilled = true;
            }
        }

        if (!fulfilled) return { fulfilled: false };
        return {
            fulfilled: true,
            request: req,
            rewardLoyalty: req.rewardLoyalty || 12,
            rewardXp: req.rewardXp || 30
        };
    }

    function pickGladiatorDialogue(gladiator, state, weaponDict = {}) {
        if (!gladiator) return '';
        const loyalty = clampLoyalty(gladiator.loyalty);
        const day = (state && state.day) || 1;
        const fav = gladiator.favoriteWeaponId && weaponDict[gladiator.favoriteWeaponId];

        if (gladiator.lastBribeThrowDay === day) {
            return '"Beni bahisçiler için yere yatırdın Efendim... Kumun tadı hâlâ ağzımda."';
        }
        if (loyalty < 25) {
            return '"Bize köpek gibi davranmaya devam edersen bu Ludus’un duvarları üstüne yıkılır!"';
        }
        if (gladiator.injuryId) {
            return '"Sakatlığım sızlıyor. İyileşmeden arenaya çıkmak istemiyorum."';
        }
        if (gladiator.activeRequest) {
            return `"${gladiator.activeRequest.desc}"`;
        }
        if (gladiator.hasPrivateQuarters && loyalty >= 60) {
            return '"Özel odamda huzurla dinlendim Efendim. Bu kılıç artık sadece senin şanın için kalkar."';
        }
        if (fav && gladiator.weaponId === fav.id) {
            return `"${fav.name} elimdeyken kendimi yenilmez hissediyorum. Sıradaki rakibi getir!"`;
        }
        if (loyalty >= 75) {
            return '"Sana güvenim tam Efendim. Ölümüne bile emrini sorgulamam."';
        }
        if (fav) {
            return `"${gladiator.origin} topraklarında ${fav.name} ile büyüdüm; bir gün yine elime yakışacak."`;
        }
        return '"Eğitim kuklası beni bekliyor Efendim. Her gün biraz daha güçleniyorum."';
    }

    function evaluateOvernightRebellion(roster, rollFn = Math.random) {
        if (!Array.isArray(roster) || roster.length === 0) {
            return { triggered: false, instigators: [], affectedNames: [] };
        }
        const instigators = [];
        const affectedSet = new Set();

        for (const g of roster) {
            if (clampLoyalty(g.loyalty) < 25 && rollFn() < 0.10) {
                instigators.push(g.name);
                for (const other of roster) {
                    if (other.id !== g.id) {
                        other.loyalty = clampLoyalty((other.loyalty ?? 65) - 6);
                        affectedSet.add(other.name);
                    }
                }
            }
        }

        return {
            triggered: instigators.length > 0,
            instigators,
            affectedNames: Array.from(affectedSet)
        };
    }

    Game.BondingRules = {
        clampLoyalty,
        getLoyaltyTier,
        pickFavoriteWeaponId,
        isUsingFavoriteWeapon,
        getFavoriteWeaponBonus,
        generatePersonalRequest,
        evaluateRequestProgress,
        pickGladiatorDialogue,
        evaluateOvernightRebellion
    };
})(window.LudusGame = window.LudusGame || {});
