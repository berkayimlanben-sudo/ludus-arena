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
            desc: 'Gün bitiminde can yenilenmesini artırır, tedaviyi ucuzlatır ve Sv.2+ ile gecede sakatlık iyileştirme şansı verir.'
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
            styleId: 'aggressive',
            perks: ['heavy_hand', 'executioner'],
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
            styleId: 'skirmisher',
            perks: ['blood_scent', 'swift_foot'],
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
            styleId: 'counter',
            perks: ['iron_will', 'shield_master'],
            weaponId: 'mace',
            shieldId: 'scutum',
            armorId: 'plate',
            helmetId: 'horned',
            skinColor: '#8d5524',
            baseStats: { strength: 14, agility: 9, vitality: 20 }
        }
    ];

    Data.ROMAN_EVENTS = [
        {
            id: 'patrician_banquet',
            title: '🍷 Asilzade Ziyafeti',
            desc: 'Zengin bir Romalı patrici konağındaki ziyafet için gösteri dövüşçüsü istiyor.',
            choices: [
                {
                    id: 'send_fighter',
                    label: 'En iyi savaşçını gösteriye gönder',
                    hint: '+75 Altın, +18 Şöhret • Seçili gladyatör -15 Can',
                    minGold: 0
                },
                {
                    id: 'bribe_wine',
                    label: 'Şarap ikram et ve bağlantı kur',
                    hint: '-50 Altın • +20 Şöhret',
                    minGold: 50
                },
                {
                    id: 'decline',
                    label: 'Nazikçe reddet',
                    hint: 'Etki yok',
                    minGold: 0
                }
            ]
        },
        {
            id: 'city_watch',
            title: '⚖️ Şehir Muhafızlarının Baskını',
            desc: 'Muhafız yüzbaşısı ruhsat ve vergi bahanesiyle avlu kapısına dayandı.',
            choices: [
                {
                    id: 'pay_bribe',
                    label: 'Keseyi aç ve rüşvet öde',
                    hint: '-65 Altın • +6 Şöhret',
                    minGold: 65
                },
                {
                    id: 'stand_firm',
                    label: 'Kapıyı kapat ve nöbet tut',
                    hint: '-10 Şöhret • Tüm kadro +90 XP',
                    minGold: 0
                }
            ]
        },
        {
            id: 'merchant_wagon',
            title: '🚚 Devrilmiş Tüccar Arabası',
            desc: 'Ludus dışındaki yolda arena malzemeleri taşıyan bir arabanın tekeri kırılmış.',
            choices: [
                {
                    id: 'help_merchant',
                    label: 'Gladyatörlerle arabaya yardım et',
                    hint: '+40 Altın • +14 Şöhret',
                    minGold: 0
                },
                {
                    id: 'buy_cheap',
                    label: 'Ucuza ikmal sandığı satın al',
                    hint: '-45 Altın • +1 Can Şurubu, +1 Gladyatör Ağı',
                    minGold: 45
                }
            ]
        },
        {
            id: 'greek_physician',
            title: '🩺 Gezgin Yunan Hekim',
            desc: 'Ünlü bir hekim Capua yolundan geçerken revirine uğradı.',
            choices: [
                {
                    id: 'treat_all',
                    label: 'Tüm kadroyu muayene ettir',
                    hint: '-55 Altın • Tüm kadro tam iyileşir ve sakatlıklar silinir',
                    minGold: 55
                },
                {
                    id: 'buy_potion',
                    label: 'Can Şurubu satın al',
                    hint: '-35 Altın • +1 Can Şurubu',
                    minGold: 35
                },
                {
                    id: 'decline',
                    label: 'Teşekkür edip gönder',
                    hint: 'Etki yok',
                    minGold: 0
                }
            ]
        },
        {
            id: 'shadow_alchemist',
            title: '🐍 Gizemli Simyacı',
            desc: 'Karanlık cübbeli bir satıcı arena için özel zehir ve ağlar teklif ediyor.',
            choices: [
                {
                    id: 'buy_kit',
                    label: 'Gizli sandığı satın al',
                    hint: '-55 Altın • +1 Silah Zehri, +1 Gladyatör Ağı',
                    minGold: 55
                },
                {
                    id: 'spar_test',
                    label: 'Bileme taşını kullan',
                    hint: '-35 Altın • Seçili gladyatöre +1 Güç',
                    minGold: 35
                },
                {
                    id: 'decline',
                    label: 'Uzaklaşmasını söyle',
                    hint: 'Etki yok',
                    minGold: 0
                }
            ]
        }
    ];

    Data.CAREER_REGIONS = [
        {
            id: 'capua',
            order: 1,
            name: 'Capua Çukurları',
            minFame: 0,
            maxTier: 1,
            icon: '🏜️',
            desc: 'Kum ve ter kokan yerel çukurlar. Yeni gladyatörlerin ilk sınavı.',
            rewardMult: 1.0,
            budgetScale: 1.0
        },
        {
            id: 'provincial',
            order: 2,
            name: 'Eyalet Arenası',
            minFame: 25,
            maxTier: 2,
            icon: '🏟️',
            desc: 'Taş tribünlü eyalet arenaları. Dövüş stilleri ve ilk perkli rakipler başlar.',
            rewardMult: 1.15,
            budgetScale: 1.06
        },
        {
            id: 'colosseum',
            order: 3,
            name: 'Roma Kolezyumu',
            minFame: 75,
            maxTier: 3,
            icon: '🦅',
            desc: 'Başkentin dev arenası. Ağır zırhlı, çift perkli ustalar ve yüksek ödüller.',
            rewardMult: 1.35,
            budgetScale: 1.12
        },
        {
            id: 'imperial',
            order: 4,
            name: 'İmparatorluk Turnuvası',
            minFame: 150,
            maxTier: 3,
            icon: '👑',
            desc: 'İmparatorun locası önünde 3 maçlık final şampiyonası ve New Game+ prestiji!',
            rewardMult: 1.5,
            budgetScale: 1.18
        }
    ];

    Data.IMPERIAL_TOURNAMENT = [
        {
            round: 1,
            title: 'Turnuva 1/3 — Praetorian Öncüsü',
            name: 'Valerius (Praetorian)',
            traitId: 'disciplined',
            styleId: 'counter',
            perks: ['shield_master', 'iron_will'],
            weaponId: 'sword',
            shieldId: 'scutum',
            armorId: 'chain',
            helmetId: 'corinthian',
            skinColor: '#e0ac82',
            baseStats: { strength: 13, agility: 12, vitality: 15 },
            rewardGold: 220,
            rewardFame: 20,
            isBoss: false
        },
        {
            round: 2,
            title: 'Turnuva 2/3 — Doğu Lejyonu Ustası',
            name: 'Vespera (Mızrak Fırtınası)',
            traitId: 'nimble',
            styleId: 'skirmisher',
            perks: ['swift_foot', 'blood_scent', 'second_wind'],
            weaponId: 'trident',
            shieldId: 'none',
            armorId: 'chain',
            helmetId: 'galea',
            skinColor: '#d2996c',
            baseStats: { strength: 14, agility: 17, vitality: 14 },
            rewardGold: 340,
            rewardFame: 30,
            isBoss: false
        },
        {
            round: 3,
            title: 'Turnuva 3/3 — İmparatorluk Finali',
            name: 'Commodus Primus (İmparatorluk Tacı)',
            traitId: 'berserker',
            styleId: 'aggressive',
            perks: ['heavy_hand', 'executioner', 'iron_will'],
            weaponId: 'axe',
            shieldId: 'none',
            armorId: 'plate',
            helmetId: 'horned',
            skinColor: '#c68652',
            baseStats: { strength: 17, agility: 14, vitality: 19 },
            rewardGold: 750,
            rewardFame: 75,
            isBoss: true
        }
    ];

    Data.SENATORS = {
        crassus: {
            id: 'crassus',
            name: 'Senatör Crassus',
            title: 'Savaş Lordu & Altın Hamisi',
            icon: '🪙',
            perkDesc: '30+ İtibar: +%15 Altın • 60+ İtibar: +%25 Arena Altın Ödülü'
        },
        tullius: {
            id: 'tullius',
            name: 'Senatör Tullius',
            title: 'Halk Tribünü',
            icon: '🏛️',
            perkDesc: '30+ İtibar: +%15 Şöhret • 60+ İtibar: +%25 Arena Şöhret Ödülü'
        },
        valeria: {
            id: 'valeria',
            name: 'Senatris Valeria',
            title: 'Entrika & Şike Patronu',
            icon: '🎭',
            perkDesc: 'Yüksek itibar şike yakalanma riskini azaltır ve rüşveti büyütür'
        }
    };

    Data.SENATE_CONTRACT_TEMPLATES = [
        {
            id: 'win_no_shield',
            senatorId: 'tullius',
            title: 'Kalkansız Cesaret',
            desc: 'Kalkan takmadan bir arena maçı kazan.',
            conditionType: 'no_shield',
            baseGold: 130,
            baseFame: 15,
            repReward: 15
        },
        {
            id: 'win_heavy_weapon',
            senatorId: 'crassus',
            title: 'Ağır Çelik Gösterisi',
            desc: 'Çift El Balta veya Çivili Gürz ile bir arena maçı kazan.',
            conditionType: 'heavy_weapon',
            baseGold: 150,
            baseFame: 14,
            repReward: 15
        },
        {
            id: 'win_lethal',
            senatorId: 'crassus',
            title: 'Kana Susamış Senato',
            desc: 'Ölümüne (Sine Missione) bir arena maçı kazan.',
            conditionType: 'lethal',
            baseGold: 190,
            baseFame: 22,
            repReward: 18
        },
        {
            id: 'win_poison',
            senatorId: 'valeria',
            title: 'Sessiz Zehir',
            desc: 'Silah Zehri kuşanarak bir arena maçı kazan.',
            conditionType: 'with_poison',
            baseGold: 145,
            baseFame: 14,
            repReward: 16
        },
        {
            id: 'win_fast',
            senatorId: 'valeria',
            title: 'Yıldırım İnfazı',
            desc: 'Bir arena maçını 22 saniyeden kısa sürede kazan.',
            conditionType: 'fast_win',
            baseGold: 165,
            baseFame: 18,
            repReward: 16
        },
        {
            id: 'win_2v2',
            senatorId: 'tullius',
            title: 'Kardeşlik Yemini',
            desc: '2v2 Takım Savaşı kontratı kazan.',
            conditionType: 'team_2v2',
            baseGold: 180,
            baseFame: 20,
            repReward: 18
        }
    ];

    Data.RIVAL_LUDUSES = {
        batiatus: {
            id: 'batiatus',
            name: 'House of Batiatus',
            shortName: 'Batiatus Okulu',
            icon: '🦁',
            color: '#d4af37',
            motto: 'Altın, çelik ve şan.',
            preferredWeapons: ['sword', 'mace'],
            preferredStyles: ['counter', 'balanced'],
            preferredTraits: ['disciplined', 'iron_skin'],
            preferredPerks: ['shield_master', 'second_wind'],
            baseRivalry: 20
        },
        magnus: {
            id: 'magnus',
            name: 'Ludus Magnus',
            shortName: 'Ludus Magnus',
            icon: '🦅',
            color: '#c83e37',
            motto: 'İmparatorluğun demir yumruğu.',
            preferredWeapons: ['axe', 'mace', 'sword'],
            preferredStyles: ['aggressive', 'counter'],
            preferredTraits: ['berserker', 'iron_skin'],
            preferredPerks: ['heavy_hand', 'iron_will', 'executioner'],
            baseRivalry: 12
        },
        solonis: {
            id: 'solonis',
            name: 'Schola Solonis',
            shortName: 'Solonis Okulu',
            icon: '🐍',
            color: '#2b8a3e',
            motto: 'Hız, zehir ve acımasızlık.',
            preferredWeapons: ['trident', 'spear', 'dagger'],
            preferredStyles: ['skirmisher', 'aggressive'],
            preferredTraits: ['nimble', 'fierce'],
            preferredPerks: ['swift_foot', 'blood_scent'],
            baseRivalry: 15
        }
    };

    Data.NEMESIS_EPITHETS = [
        'Kızıl Diş',
        'Kan Biçen',
        'Mezarcı',
        'Demir Yumruk',
        'Gölge Katili',
        'Kumların Laneti',
        'Kırık Kalkan',
        'İntikamcı'
    ];
})(window.LudusData = window.LudusData || {});