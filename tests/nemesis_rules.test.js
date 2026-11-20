const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createNemesisRuntime() {
    const storage = new Map();
    const windowObj = {
        performance: { now: () => Date.now() },
        Math,
        localStorage: {
            getItem: (k) => (storage.has(k) ? storage.get(k) : null),
            setItem: (k, v) => storage.set(k, String(v)),
        },
    };
    windowObj.window = windowObj;

    const context = vm.createContext({
        window: windowObj,
        localStorage: windowObj.localStorage,
        performance: windowObj.performance,
        console,
        Math,
        Set,
        Array,
        Object,
        Number,
        Boolean,
        String,
        Infinity,
    });

    const files = [
        'engine/Signal.js',
        'engine/Node.js',
        'engine/Node2D.js',
        'engine/StateMachine.js',
        'engine/Camera2D.js',
        'engine/SceneTree.js',
        'data/Items.js',
        'data/LudusConfig.js',
        'game/Particles.js',
        'game/CombatRules.js',
        'game/CrowdRules.js',
        'game/NemesisRules.js',
        'game/Gladiator.js',
        'game/ArenaScene.js',
        'game/Phase7Rules.js',
        'game/CareerRules.js',
        'game/SenateRules.js',
        'game/BondingRules.js',
        'game/RelationAndBetRules.js',
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('NemesisRules tracks rival school rivalry tiers, applies school profiles, and scales rewards', () => {
    const { LudusData: Data, LudusGame: Game } = createNemesisRuntime();
    const NR = Game.NemesisRules;

    assert.equal(NR.getSchoolRivalryTier(15).id, 'cold');
    assert.equal(NR.getSchoolRivalryTier(35).id, 'heated');
    assert.equal(NR.getSchoolRivalryTier(65).id, 'blood_feud');

    const nemState = NR.createDefaultNemesisState(Data.RIVAL_LUDUSES);
    assert.equal(nemState.schools.batiatus.rivalry, 20);
    assert.equal(nemState.schools.magnus.rivalry, 12);
    assert.equal(nemState.schools.solonis.rivalry, 15);

    const fighter = {
        name: 'Kael',
        stats: { strength: 10, agility: 10, vitality: 10 },
        styleId: 'balanced',
        traitId: 'fierce'
    };
    const profiled = NR.applySchoolProfileToFighter(fighter, Data.RIVAL_LUDUSES.magnus, 65, () => 0.1);
    assert.equal(profiled.schoolId, 'magnus');
    assert.equal(profiled.schoolName, 'Ludus Magnus');
    assert.equal(profiled.stats.strength + profiled.stats.agility + profiled.stats.vitality, 32); // +2 stat bonus at blood_feud

    // Recording losses pushes rivalry faster (+12) than wins (+8)
    const lossRes = NR.recordSchoolMatchOutcome(nemState, 'batiatus', false);
    assert.equal(lossRes.rivalry, 32);
    assert.equal(lossRes.promotedTier.id, 'heated');
    assert.equal(nemState.schools.batiatus.lossesAgainst, 1);

    const winRes = NR.recordSchoolMatchOutcome(nemState, 'batiatus', true);
    assert.equal(winRes.rivalry, 40);
    assert.equal(nemState.schools.batiatus.winsAgainst, 1);
});

test('NemesisRules creates named slayer nemeses, ranks them up up to Lv.3, and caps active list at 4', () => {
    const { LudusData: Data, LudusGame: Game } = createNemesisRuntime();
    const NR = Game.NemesisRules;
    const nemState = NR.createDefaultNemesisState(Data.RIVAL_LUDUSES);

    const opp = {
        name: 'Verus',
        schoolId: 'solonis',
        stats: { strength: 12, agility: 13, vitality: 11 },
        weaponId: 'trident',
        shieldId: 'none',
        armorId: 'leather',
        helmetId: 'galea',
        perks: []
    };

    const created = NR.createOrUpgradeNemesis({
        nemesisState: nemState,
        opp,
        victims: ['Spartacus'],
        reason: 'slayer',
        day: 4,
        rivalDefs: Data.RIVAL_LUDUSES,
        epithets: Data.NEMESIS_EPITHETS,
        perksDict: Data.PERKS,
        armorsDict: Data.ARMORS
    }, () => 0.25);

    assert.equal(created.action, 'created');
    assert.equal(created.nemesis.rank, 1);
    assert.ok(created.nemesis.title.includes("Spartacus'un Katili"));
    assert.equal(created.nemesis.victims[0], 'Spartacus');
    assert.equal(created.nemesis.stats.strength, 14);
    assert.ok(created.nemesis.perks.length >= 1);

    // Repeat encounter ranks up to Rank 2 -> Rank 3
    const nemOpp = NR.buildNemesisOpponent(
        created.nemesis,
        Data.RIVAL_LUDUSES.solonis,
        Data.CAREER_REGIONS[0],
        Data.ARENA_TIERS[0],
        1.0,
        1.0,
        Data.ARMORS
    );
    const up1 = NR.createOrUpgradeNemesis({
        nemesisState: nemState,
        opp: nemOpp,
        victims: ['Crixus'],
        reason: 'slayer',
        day: 6,
        rivalDefs: Data.RIVAL_LUDUSES,
        epithets: Data.NEMESIS_EPITHETS,
        perksDict: Data.PERKS,
        armorsDict: Data.ARMORS
    }, () => 0.2);
    assert.equal(up1.action, 'upgraded');
    assert.equal(up1.nemesis.rank, 2);
    assert.equal(up1.nemesis.victims.length, 2);

    // Cap at 4 active nemeses
    for (let i = 0; i < 5; i++) {
        NR.createOrUpgradeNemesis({
            nemesisState: nemState,
            opp: Object.assign({}, opp, { name: `Rival_${i}` }),
            victims: [`Victim_${i}`],
            reason: 'slayer',
            day: 7 + i,
            rivalDefs: Data.RIVAL_LUDUSES,
            epithets: Data.NEMESIS_EPITHETS,
            perksDict: Data.PERKS,
            armorsDict: Data.ARMORS
        }, () => 0.1);
    }
    assert.equal(nemState.nemeses.length, 4);
});

test('LudusManager injects active Nemesis into Slot 2 on non-Boss days and ArenaScene logs intro taunt', () => {
    const { LudusData: Data, LudusGame: Game } = createNemesisRuntime();
    const mgr = new Game.LudusManager();

    // Ensure non-boss day
    mgr.state.day = 3;
    const spawned = mgr.devSpawnNemesis();
    assert.ok(spawned && spawned.nemesis && spawned.opp);
    assert.equal(mgr.state.dailyOpponents[2].isNemesis, true);
    assert.equal(mgr.state.dailyOpponents[2].nemesisId, spawned.nemesis.id);

    // Refresh on non-boss day keeps injecting active nemesis in Slot 2
    mgr.refreshDailyEvents();
    assert.equal(mgr.state.dailyOpponents[2].isNemesis, true);

    // ArenaScene logs crimson Nemesis intro taunt on _ready()
    const logs = [];
    const opp = mgr.state.dailyOpponents[2];
    const scene = new Game.ArenaScene(
        [
            {
                name: 'Maximus',
                stats: { strength: 12, agility: 12, vitality: 12 },
                weapon: Data.WEAPONS.sword,
                armor: Data.ARMORS.leather
            }
        ],
        [
            {
                name: opp.name,
                isNemesis: true,
                schoolName: opp.schoolName,
                nemesisTaunt: opp.nemesisTaunt,
                stats: opp.stats,
                weapon: Data.WEAPONS[opp.weaponId],
                armor: Data.ARMORS[opp.armorId]
            }
        ],
        { isLethal: true }
    );
    scene.tree = { activeCamera: null };
    scene.onBattleLog.connect(m => logs.push(m));
    scene._ready();

    assert.ok(logs.some(line => line.includes('KAN DAVASI:')), 'Expected Nemesis intro taunt log');
});

test('LudusManager creates Nemesis on lethal death and clears Nemesis on vengeance victory with roster loyalty & XP bonus', () => {
    const { LudusGame: Game } = createNemesisRuntime();
    const mgr = new Game.LudusManager();
    mgr.state.gold = 300; // avoid street rookie rescue interfering with roster count

    const g1 = mgr.state.roster[0];
    const g2 = mgr._createGladiator({
        name: 'Agron',
        weaponId: 'sword',
        favoriteWeaponId: 'axe',
        stats: { strength: 11, agility: 11, vitality: 11 }
    });
    g2.loyalty = 50;
    g2.xp = 0;
    g2.xpToNext = 500;
    mgr.state.roster.push(g2);

    const lethalOpp = mgr.state.dailyOpponents[1];
    lethalOpp.lethal = true;
    lethalOpp.isBoss = false;
    lethalOpp.completed = false;
    lethalOpp.schoolId = 'magnus';

    // Lethal defeat spawns a slayer Nemesis
    const lossRes = mgr.recordTeamMatchResult([g1.id], lethalOpp.id, false, [0], {
        durationSec: 18,
        crowdFavor: 20,
        polliceRollFn: () => 0.99,
        nemesisRollFn: () => 0.1
    });

    assert.equal(lossRes.deadNames.length, 1);
    assert.ok(lossRes.nemesisEvent && lossRes.nemesisEvent.type === 'created');
    assert.equal(lossRes.nemesisEvent.reason, 'slayer');
    assert.equal(mgr.state.nemesis.nemeses.length, 1);
    assert.equal(mgr.state.nemesis.schools.magnus.lossesAgainst, 1);

    // Refresh day puts the Nemesis in Slot 2, then defeat them for vengeance bonus
    mgr.state.day = 4; // non-boss day
    mgr.refreshDailyEvents();
    const nemOpp = mgr.state.dailyOpponents[2];
    assert.equal(nemOpp.isNemesis, true);

    const prevLoyalty = g2.loyalty;
    const prevXp = g2.xp;
    const winRes = mgr.recordTeamMatchResult([g2.id], nemOpp.id, true, [60], {
        durationSec: 20,
        crowdFavor: 40
    });

    assert.ok(winRes.nemesisEvent && winRes.nemesisEvent.type === 'defeated');
    assert.equal(mgr.state.nemesis.nemeses.length, 0);
    assert.equal(mgr.state.nemesis.defeatedNemesisCount, 1);
    // +3 (non-fav win) + 10 (nemesis defeated roster bonus)
    assert.equal(g2.loyalty, prevLoyalty + 13);
    assert.equal(g2.xp, prevXp + winRes.xpReward + 25);
});

test('v0.9.8 save migrates nemesis schools, active list, and opponent school tags cleanly', () => {
    const { LudusGame: Game } = createNemesisRuntime();
    const mgr = new Game.LudusManager();

    const v098Save = JSON.stringify({
        day: 6,
        gold: 400,
        fame: 60,
        buildings: { trainingYard: 2, infirmary: 1, blacksmith: 2 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 0, net: 0, potion: 0 } },
        roster: [
            {
                id: 'g_old_3',
                name: 'Oenomaus',
                origin: 'Numidyalı',
                traitId: 'disciplined',
                stats: { strength: 13, agility: 13, vitality: 13 },
                weaponId: 'spear',
                favoriteWeaponId: 'spear',
                loyalty: 75,
                relations: {},
                shieldId: 'parma',
                armorId: 'leather',
                helmetId: 'galea',
                currentHp: 130
            }
        ],
        crowdStats: { totalSparsioGold: 45, polliceMercies: 1 },
        marketRecruits: [],
        dailyOpponents: [
            {
                id: 'old_opp_1',
                name: 'Eski Rakip',
                tierName: 'Acemi',
                stats: { strength: 9, agility: 9, vitality: 9 },
                weaponId: 'sword',
                shieldId: 'none',
                armorId: 'tunic',
                helmetId: 'none',
                maxHp: 134,
                rewardGold: 75,
                rewardFame: 8
            }
        ]
    });

    assert.equal(mgr.importSaveJSON(v098Save), true);
    assert.ok(mgr.state.nemesis);
    assert.equal(mgr.state.nemesis.defeatedNemesisCount, 0);
    assert.equal(mgr.state.nemesis.schools.batiatus.rivalry, 20);
    assert.equal(mgr.state.nemesis.schools.magnus.rivalry, 12);
    assert.equal(mgr.state.nemesis.schools.solonis.rivalry, 15);
    assert.equal(mgr.state.dailyOpponents[0].schoolId, null);
    assert.equal(mgr.state.dailyOpponents[0].isNemesis, false);
});
