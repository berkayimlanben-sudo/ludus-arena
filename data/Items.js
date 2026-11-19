(function (Data) {
    Data.WEAPONS = {
        dagger: {
            id: 'dagger',
            name: 'Kısa Hançer',
            type: 'dagger',
            tier: 1,
            price: 35,
            damage: 9,
            range: 52,
            windupTime: 0.12,
            attackTime: 0.10,
            recoveryTime: 0.12,
            staminaCost: 8,
            critBonus: 0.16,
            armorPen: 0.25,
            weight: 1,
            desc: 'Çok hızlı, yüksek kritik, kısa menzil'
        },
        sword: {
            id: 'sword',
            name: 'Gladius Kılıç',
            type: 'sword',
            tier: 1,
            price: 75,
            damage: 15,
            range: 64,
            windupTime: 0.20,
            attackTime: 0.15,
            recoveryTime: 0.20,
            staminaCost: 13,
            critBonus: 0.06,
            armorPen: 0.10,
            weight: 3,
            desc: 'Dengeli hız, hasar ve menzil'
        },
        spear: {
            id: 'spear',
            name: 'Hasta Mızrak',
            type: 'spear',
            tier: 2,
            price: 130,
            damage: 16,
            range: 108,
            windupTime: 0.24,
            attackTime: 0.17,
            recoveryTime: 0.22,
            staminaCost: 15,
            critBonus: 0.07,
            armorPen: 0.25,
            weight: 4,
            desc: 'Uzun menzil, mesafeci dövüş'
        },
        trident: {
            id: 'trident',
            name: 'Üç Dişli Mızrak',
            type: 'trident',
            tier: 2,
            price: 170,
            damage: 18,
            range: 102,
            windupTime: 0.26,
            attackTime: 0.18,
            recoveryTime: 0.24,
            staminaCost: 17,
            critBonus: 0.10,
            armorPen: 0.15,
            weight: 5,
            desc: 'Güçlü orta-uzun menzil'
        },
        mace: {
            id: 'mace',
            name: 'Çivili Topuz',
            type: 'mace',
            tier: 3,
            price: 220,
            damage: 20,
            range: 62,
            windupTime: 0.30,
            attackTime: 0.18,
            recoveryTime: 0.27,
            staminaCost: 18,
            critBonus: 0.04,
            armorPen: 0.60,
            weight: 6,
            desc: 'Zırhın %60\'ını deler, tank kırıcı'
        },
        axe: {
            id: 'axe',
            name: 'Çift El Balta',
            type: 'axe',
            tier: 3,
            price: 280,
            damage: 26,
            range: 74,
            windupTime: 0.38,
            attackTime: 0.20,
            recoveryTime: 0.32,
            staminaCost: 22,
            critBonus: 0.08,
            armorPen: 0.35,
            weight: 8,
            desc: 'Çok ağır hasar, yavaş savurma'
        }
    };

    Data.SHIELDS = {
        none: {
            id: 'none',
            name: 'Kalkan Yok',
            tier: 1,
            price: 0,
            hasShield: false,
            blockChance: 0,
            blockMitigation: 0,
            staminaCost: 0,
            weight: 0,
            shape: 'none',
            color: 'transparent',
            desc: 'Maksimum çeviklik'
        },
        parma: {
            id: 'parma',
            name: 'Yuvarlak Parma',
            tier: 1,
            price: 55,
            hasShield: true,
            blockChance: 0.45,
            blockMitigation: 0.72,
            staminaCost: 9,
            weight: 3,
            shape: 'round',
            color: '#8c2f39',
            desc: '%45 blok şansı, hafif'
        },
        scutum: {
            id: 'scutum',
            name: 'Ağır Scutum',
            tier: 2,
            price: 150,
            hasShield: true,
            blockChance: 0.68,
            blockMitigation: 0.85,
            staminaCost: 12,
            weight: 7,
            shape: 'rect',
            color: '#9e2a2b',
            desc: '%68 blok şansı, ağır koruma'
        }
    };

    Data.ARMORS = {
        tunic: {
            id: 'tunic',
            name: 'Hafif Tunik',
            tier: 1,
            price: 0,
            defense: 0,
            hpBonus: 0,
            weight: 0,
            style: 'tunic',
            desc: 'Sıfır ağırlık'
        },
        leather: {
            id: 'leather',
            name: 'Deri Zırh',
            tier: 1,
            price: 60,
            defense: 4,
            hpBonus: 15,
            weight: 3,
            style: 'leather',
            desc: '+4 Zırh, +15 Can'
        },
        chain: {
            id: 'chain',
            name: 'Zincir Zırh',
            tier: 2,
            price: 145,
            defense: 8,
            hpBonus: 30,
            weight: 6,
            style: 'chain',
            desc: '+8 Zırh, +30 Can'
        },
        plate: {
            id: 'plate',
            name: 'Lejyoner Plaka',
            tier: 3,
            price: 260,
            defense: 13,
            hpBonus: 50,
            weight: 10,
            style: 'plate',
            desc: '+13 Zırh, +50 Can'
        }
    };

    Data.HELMETS = {
        none: {
            id: 'none',
            name: 'Miğfer Yok',
            tier: 1,
            price: 0,
            defense: 0,
            critResist: 0,
            weight: 0,
            style: 'none',
            desc: 'Korumasız'
        },
        galea: {
            id: 'galea',
            name: 'Roma Galea',
            tier: 1,
            price: 50,
            defense: 3,
            critResist: 0.25,
            weight: 2,
            style: 'galea',
            desc: '+3 Zırh, %25 Kritik Direnci'
        },
        corinthian: {
            id: 'corinthian',
            name: 'Korint Miğferi',
            tier: 2,
            price: 120,
            defense: 5,
            critResist: 0.45,
            weight: 4,
            style: 'corinthian',
            desc: '+5 Zırh, %45 Kritik Direnci'
        },
        horned: {
            id: 'horned',
            name: 'Boynuzlu Miğfer',
            tier: 3,
            price: 200,
            defense: 6,
            critResist: 0.50,
            weight: 5,
            style: 'horned',
            desc: '+6 Zırh, %50 Kritik Direnci'
        }
    };
})(window.LudusData = window.LudusData || {});