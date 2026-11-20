const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createCrowdRuntime() {
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

test('CrowdRules calculates tiers, favor deltas, Sparsio tips, and Pollice Verso mercy chances accurately', () => {
    const { LudusData: Data, LudusGame: Game } = createCrowdRuntime();
    const CR = Game.CrowdRules;

    assert.equal(CR.getCrowdTier(15).id, 'quiet');
    assert.equal(CR.getCrowdTier(30).id, 'warm');
    assert.equal(CR.getCrowdTier(60).id, 'roaring');
    assert.equal(CR.getCrowdTier(85).id, 'frenzied');

    const favAttacker = {
        hp: 25,
        maxHp: 100,
        trait: Data.TRAITS.crowd_favorite
    };
    // Low HP comeback (+5) + crit (14) => 19 * 1.25 = 24
    const critComebackDelta = CR.getFavorDeltaForEvent('crit', favAttacker, null);
    assert.equal(critComebackDelta, 24);
    assert.equal(CR.getFavorDeltaForEvent('tactic_MORALE', null, null), 22);

    // Sparsio tips scale by tier & crowd_favorite trait
    const quietTip = CR.computeSparsioReward(20, 100, false);
    assert.equal(quietTip.triggered, false);
    assert.equal(quietTip.bonusGold, 0);

    const frenziedTip = CR.computeSparsioReward(90, 100, true);
    assert.equal(frenziedTip.triggered, true);
    assert.equal(frenziedTip.bonusGold, 38); // round(100 * 0.30 * 1.25)
    assert.equal(frenziedTip.bonusFame, 12); // 10 + 2

    // Mercy chance: 85+ tier (0.50) + crowd_favorite (0.12) + 100 Tullius rep (0.10) = 0.72, capped at 0.75
    assert.equal(CR.calculateMercyChance(15, false, 0), 0);
    assert.equal(CR.calculateMercyChance(65, false, 50), 0.37);
    assert.equal(CR.calculateMercyChance(90, true, 100), 0.72);
    assert.equal(CR.calculateMercyChance(95, true, 500), 0.72);

    // Pollice Verso rules: spared vs down vs blocked on throw_match bribe
    const spared = CR.evaluatePolliceVerso({ isLethal: true, favor: 70, isCrowdFavorite: false, tulliusRep: 0, isBribeThrow: false }, () => 0.10);
    assert.equal(spared.eligible, true);
    assert.equal(spared.spared, true);
    assert.equal(spared.verdict, 'up');

    const killed = CR.evaluatePolliceVerso({ isLethal: true, favor: 70, isCrowdFavorite: false, tulliusRep: 0, isBribeThrow: false }, () => 0.90);
    assert.equal(killed.eligible, true);
    assert.equal(killed.spared, false);
    assert.equal(killed.verdict, 'down');

    const blockedBribe = CR.evaluatePolliceVerso({ isLethal: true, favor: 95, isCrowdFavorite: true, tulliusRep: 100, isBribeThrow: true }, () => 0.01);
    assert.equal(blockedBribe.eligible, false);
    assert.equal(blockedBribe.spared, false);
});

test('ArenaScene connects Gladiator combat signals and tactics to live crowdFavor and announces hype tiers', () => {
    const { LudusData: Data, LudusGame: Game } = createCrowdRuntime();
    const logs = [];

    const scene = new Game.ArenaScene(
        [
            {
                name: 'Maximus',
                stats: { strength: 20, agility: 12, vitality: 12 },
                trait: Data.TRAITS.crowd_favorite,
                weapon: Data.WEAPONS.sword,
                armor: Data.ARMORS.leather
            }
        ],
        [
            {
                name: 'Rival',
                stats: { strength: 8, agility: 8, vitality: 8 },
                weapon: Data.WEAPONS.dagger,
                armor: Data.ARMORS.tunic
            }
        ],
        { isLethal: true }
    );
    scene.tree = { activeCamera: null };
    scene.onBattleLog.connect((m) => logs.push(m));
    scene._ready();

    assert.equal(scene.isLethal, true);
    assert.equal(scene.crowdFavor, 24); // crowd_favorite starts at 24

    // Emitting combat event boosts crowdFavor
    scene.leftFighter.onCombatEvent.emit('crit', scene.leftFighter, scene.rightFighter);
    assert.ok(scene.crowdFavor > 24);

    // MORALE tactic boosts crowdFavor by +22 and triggers roaring announcement (>=60)
    scene.issueTactic('MORALE');
    assert.ok(scene.crowdFavor >= 60, `Expected crowdFavor >= 60, got ${scene.crowdFavor}`);
    assert.ok(logs.some(l => l.includes('SEYİRCİ COŞTU')));
    assert.ok(scene.getMatchCrowdFavor() >= 60);
});

test('LudusManager applies Sparsio rewards on victory and resolves Pollice Verso mercy or permadeath in lethal losses', () => {
    const { LudusGame: Game } = createCrowdRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    // 1. Victory with high crowd favor triggers Sparsio bonus gold & fame
    const safeOpp = mgr.state.dailyOpponents.find(o => !o.lethal) || mgr.state.dailyOpponents[0];
    safeOpp.lethal = false;
    safeOpp.rewardGold = 100;
    safeOpp.rewardFame = 10;

    const winRes = mgr.recordTeamMatchResult([g.id], safeOpp.id, true, [90], {
        durationSec: 16,
        crowdFavor: 88
    });
    assert.ok(winRes.sparsioResult && winRes.sparsioResult.triggered);
    assert.equal(winRes.sparsioResult.bonusGold, 30);
    assert.equal(winRes.sparsioResult.bonusFame, 10);
    assert.equal(winRes.goldEarned, 130);
    assert.equal(winRes.fameEarned, 20);
    assert.equal(mgr.state.crowdStats.totalSparsioGold, 30);

    // 2. Lethal loss with lucky Pollice Verso roll saves gladiator at 1 HP with +15 loyalty
    g.loyalty = 50;
    g.xp = 0;
    g.xpToNext = 500;
    const lethalOpp1 = Object.assign({}, safeOpp, { id: 'lethal_1', lethal: true, completed: false });
    mgr.state.dailyOpponents.push(lethalOpp1);
    const sparedRes = mgr.recordTeamMatchResult([g.id], lethalOpp1.id, false, [0], {
        durationSec: 22,
        crowdFavor: 86,
        polliceRollFn: () => 0.05 // guaranteed mercy
    });
    assert.equal(sparedRes.sparedNames.length, 1);
    assert.equal(sparedRes.deadNames.length, 0);
    assert.equal(mgr.state.roster.length, 1);
    assert.equal(g.currentHp, 1);
    assert.equal(g.loyalty, 65); // +15 loyalty for surviving by imperial mercy
    assert.equal(mgr.state.crowdStats.polliceMercies, 1);

    // 3. Lethal loss with failed Pollice Verso roll triggers permadeath
    const lethalOpp2 = Object.assign({}, safeOpp, { id: 'lethal_2', lethal: true, completed: false });
    mgr.state.dailyOpponents.push(lethalOpp2);
    mgr.state.gold = 200; // prevent rookie bailout so we verify splice cleanly
    const deadRes = mgr.recordTeamMatchResult([g.id], lethalOpp2.id, false, [0], {
        durationSec: 14,
        crowdFavor: 35,
        polliceRollFn: () => 0.99 // thumbs down
    });
    assert.equal(deadRes.sparedNames.length, 0);
    assert.equal(deadRes.deadNames.length, 1);
    assert.equal(mgr.state.roster.length, 0);
});

test('v0.9.7 save migrates crowdStats cleanly', () => {
    const { LudusGame: Game } = createCrowdRuntime();
    const mgr = new Game.LudusManager();

    const v097Save = JSON.stringify({
        day: 8,
        gold: 500,
        fame: 80,
        buildings: { trainingYard: 2, infirmary: 1, blacksmith: 2 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 0, net: 0, potion: 0 } },
        roster: [
            {
                id: 'g_old_2',
                name: 'Crixus',
                origin: 'Galyalı',
                traitId: 'fierce',
                stats: { strength: 15, agility: 11, vitality: 13 },
                weaponId: 'axe',
                favoriteWeaponId: 'axe',
                loyalty: 80,
                relations: {},
                shieldId: 'none',
                armorId: 'chain',
                helmetId: 'galea',
                currentHp: 140
            }
        ],
        bettingStats: { totalWagered: 50, totalWon: 90, betsWon: 1, betsLost: 0 },
        marketRecruits: [],
        dailyOpponents: []
    });

    assert.equal(mgr.importSaveJSON(v097Save), true);
    assert.equal(mgr.state.crowdStats.totalSparsioGold, 0);
    assert.equal(mgr.state.crowdStats.polliceMercies, 0);
});
