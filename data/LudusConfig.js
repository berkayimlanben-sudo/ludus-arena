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

    Data.TRAITS = {
        fierce: { id: 'fierce', name: 'Vahşi', desc: 'Kritik +%10, Zırh -2' },
        iron_skin: { id: 'iron_skin', name: 'Demir Deri', desc: '+3 Doğal Zırh' },
        berserker: { id: 'berserker', name: 'Son Nefes', desc: 'Can <%35 iken +%30 Hasar' },
        nimble: { id: 'nimble', name: 'Çevik Gölge', desc: '+18 Hız, Hızlı Stamina' },
        disciplined: { id: 'disciplined', name: 'Disiplinli', desc: 'Blok +%12, Stamina -%15 Maliyet' },
        crowd_favorite: { id: 'crowd_favorite', name: 'Arena Yıldızı', desc: 'Zaferde +%30 Şöhret' }
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
            desc: 'Maksimum stat sınırını (+4/seviye) artırır ve eğitim ücretini düşürür.'
        },
        infirmary: {
            id: 'infirmary',
            name: 'Revir',
            icon: '🩹',
            maxLevel: 5,
            baseCost: 90,
            desc: 'Gün bitiminde ücretsiz can yenilenmesini artırır ve anlık tedaviyi ucuzlatır.'
        },
        blacksmith: {
            id: 'blacksmith',
            name: 'Demirci Ocağı',
            icon: '🔨',
            maxLevel: 3,
            baseCost: 140,
            desc: 'Dükkanda daha güçlü (Seviye 2 ve Seviye 3) silah, zırh ve kalkanların kilidini açar.'
        }
    };

    Data.ARENA_TIERS = [
        {
            id: 'pit',
            name: 'Sokak Çukuru',
            minFame: 0,
            statBudget: [26, 31],
            maxTier: 1,
            rewardGold: [65, 95],
            rewardFame: [6, 9],
            badge: 'Kolay'
        },
        {
            id: 'local',
            name: 'Yerel Arena',
            minFame: 25,
            statBudget: [33, 40],
            maxTier: 2,
            rewardGold: [130, 185],
            rewardFame: [12, 18],
            badge: 'Orta'
        },
        {
            id: 'colosseum',
            name: 'Büyük Kolezyum',
            minFame: 75,
            statBudget: [42, 52],
            maxTier: 3,
            rewardGold: [250, 360],
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