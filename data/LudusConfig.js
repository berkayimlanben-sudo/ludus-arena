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
})(window.LudusData = window.LudusData || {});