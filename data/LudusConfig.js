(function (Data) {
    Data.GLADIATOR_NAMES = [
        'Spartacus', 'Crixus', 'Gannicus', 'Oenomaus', 'Agron',
        'Varro', 'Flamma', 'Commodus', 'Verus', 'Priscus',
        'Carpophorus', 'Tetraites', 'Spiculus', 'Castus', 'Batiatus'
    ];

    Data.ORIGINS = [
        'Trakyalı', 'Galyalı', 'Cermen', 'Roma Kaçağı', 'Nubyalı', 'Hispanialı'
    ];

    Data.SKIN_TONES = ['#e0ac82', '#d2996c', '#c68652', '#8d5524', '#f1c29b'];

    Data.FIGHT_STYLES = {
        balanced: { id: 'balanced', name: 'Dengeli', desc: 'Duruma göre saldırı ve savunma dengesi' },
        aggressive: { id: 'aggressive', name: 'Baskıcı', desc: 'Saldırı aralığı -%15, +8 Hız, blok -%15' },
        counter: { id: 'counter', name: 'Kontracı', desc: 'Blok +%18; blok sonrası ilk vuruş +%25 Hasar!' },
        skirmisher: { id: 'skirmisher', name: 'Vur-Kaç', desc: '+14 Hız, vuruş sonrası mesafe açarak oynar' }
    };

    Data.TRAITS = {
        fierce: { id: 'fierce', name: 'Vahşi', desc: 'Kritik +%10, Zırh -2' },
        iron_skin: { id: 'iron_skin', name: 'Demir Deri', desc: '+3 Doğal Zırh' },
        berserker: { id: 'berserker', name: 'Son Nefes', desc: 'Can <%35 iken +%30 Hasar' },
        nimble: { id: 'nimble', name: 'Çevik Gölge', desc: '+18 Hız, Hızlı Stamina' },
        disciplined: { id: 'disciplined', name: 'Disiplinli', desc: 'Blok +%12, Stamina -%15 Maliyet' },
        crowd_favorite: { id: 'crowd_favorite', name: 'Arena Yıldızı', desc: 'Zaferde +%30 Şöhret' }
    };

    Data.PERKS = {
        blood_scent: {
            id: 'blood_scent',
            name: '🩸 Kan Kokusu',
            desc: 'Kanayan rakiplere +%25 fazla hasar vurur.'
        },
        shield_master: {
            id: 'shield_master',
            name: '🛡️ Kalkan Ustası',
            desc: 'Kalkanla blokladıktan sonraki ilk vuruş kesin KRİTİK olur!'
        },
        back_to_back: {
            id: 'back_to_back',
            name: '🤝 Sırt Sırta',
            desc: '2v2 maçlarda yanında dost varken +5 Zırh kazanır.'
        },
        second_wind: {
            id: 'second_wind',
            name: '⚡ İkinci Rüzgar',
            desc: 'Can %40 altına inince maçta 1 kez +15 Can ve +40 Stamina yeniler.'
        },
        executioner: {
            id: 'executioner',
            name: '💀 Cellat',
            desc: 'Canı %45 altında olan rakiplere +%25 Hasar vurur.'
        },
        heavy_hand: {
            id: 'heavy_hand',
            name: '🔨 Ağır El',
            desc: 'Tüm saldırılara +3 Hasar ve +%15 Zırh Delme ekler.'
        },
        iron_will: {
            id: 'iron_will',
            name: '🧱 Demir İrade',
            desc: '+20 Maksimum Can verir ve Sersemletme süresini yarıya düşürür.'
        },
        swift_foot: {
            id: 'swift_foot',
            name: '💨 Rüzgar Adım',
            desc: '+16 Hareket Hızı ve +%8 Kritik şansı kazandırır.'
        }
    };

    Data.ARENA_RULES = {
        standard: { id: 'standard', name: 'Serbest Kurallar', desc: 'Ekipman kısıtı yok' },
        no_shield: { id: 'no_shield', name: 'Kalkansız Düello', desc: 'Kalkan takılamaz (+%25 Ödül)' },
        light_only: { id: 'light_only', name: 'Hafif Sıklet', desc: 'Sadece Tunik veya Deri Zırh (+%25 Ödül)' },
        team_2v2: { id: 'team_2v2', name: '2v2 Takım Savaşı', desc: '2 Gladyatör vs 2 Rakip (1.8x Ödül)' }
    };

    Data.INJURIES = {
        broken_rib: { id: 'broken_rib', name: 'Kırık Kaburga', stat: 'strength', penalty: 3, desc: 'Güç -3 (Revirde iyileşir)' },
        sprained_ankle: { id: 'sprained_ankle', name: 'Burkuk Ayak', stat: 'agility', penalty: 3, desc: 'Çeviklik -3 (Revirde iyileşir)' },
        concussion: { id: 'concussion', name: 'Sarsıntı', stat: 'vitality', penalty: 3, desc: 'Canlılık -3 (Revirde iyileşir)' }
    };

    Data.BUILDINGS = {
        trainingYard: {
            id: 'trainingYard',
            name: 'Eğitim Alanı',
            icon: '🏋️',
            maxLevel: 5,
            baseCost: 110,
            desc: 'Stat sınırını (+4/seviye) artırır, ücreti düşürür ve eğitimde XP kazandırır.'
        },
        infirmary: {
            id: 'infirmary',
            name: 'Revir',
            icon: '🩹',
            maxLevel: 5,
            baseCost: 90,
            desc: 'Gün bitiminde ücretsiz can yenilenmesini artırır ve tedaviyi ucuzlatır.'
        },
        blacksmith: {
            id: 'blacksmith',
            name: 'Demirci Ocağı',
            icon: '🔨',
            maxLevel: 3,
            baseCost: 140,
            desc: 'Dükkanda daha güçlü (Seviye 2 ve Seviye 3) ekipmanların kilidini açar.'
        }
    };

    Data.ARENA_TIERS = [
        {
            id: 'pit',
            name: 'Sokak Çukuru',
            minFame: 0,
            statBudget: [26, 31],
            maxTier: 1,
            rewardGold: [70, 100],
            rewardFame: [6, 9],
            badge: 'Kolay'
        },
        {
            id: 'local',
            name: 'Yerel Arena',
            minFame: 25,
            statBudget: [33, 40],
            maxTier: 2,
            rewardGold: [135, 190],
            rewardFame: [12, 18],
            badge: 'Orta'
        },
        {
            id: 'colosseum',
            name: 'Büyük Kolezyum',
            minFame: 75,
            statBudget: [42, 52],
            maxTier: 3,
            rewardGold: [260, 370],
            rewardFame: [24, 35],
            badge: 'Zor'
        }
    ];

    Data.BOSSES = [
        {
            name: 'Brutus (Kolezyum Kasabı)',
            traitId: 'berserker',
            weaponId: 'axe',
            shieldId: 'none',
            armorId: 'plate',
            helmetId: 'horned',
            skinColor: '#c68652',
            baseStats: { strength: 15, agility: 10, vitality: 16 }
        },
        {
            name: 'Draven (Gölge Avcısı)',
            traitId: 'fierce',
            weaponId: 'dagger',
            shieldId: 'parma',
            armorId: 'chain',
            helmetId: 'corinthian',
            skinColor: '#e0ac82',
            baseStats: { strength: 13, agility: 18, vitality: 14 }
        },
        {
            name: 'Theokoles (Ölümsüz Dev)',
            traitId: 'iron_skin',
            weaponId: 'mace',
            shieldId: 'scutum',
            armorId: 'plate',
            helmetId: 'horned',
            skinColor: '#8d5524',
            baseStats: { strength: 14, agility: 9, vitality: 20 }
        }
    ];
})(window.LudusData = window.LudusData || {});