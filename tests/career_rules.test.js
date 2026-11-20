const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createCareerRuntime() {
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
        'game/Gladiator.js',
        'game/ArenaScene.js',
        'game/Phase7Rules.js',
        'game/CareerRules.js',
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('4-region career ladder unlocks by fame and promotes/switches cleanly', () => {
    const { LudusData: Data, LudusGame: Game } = createCareerRuntime();
    const mgr = new Game.LudusManager();

    assert.equal(mgr.getCurrentRegion().id, 'capua');
    assert.equal(mgr.selectRegion('provincial').ok, false, 'Provincial should be locked at 0 fame');

    const promoted = mgr.devAddFame(25);
    assert.equal(promoted.id, 'provincial');
    assert.equal(mgr.getCurrentRegion().id, 'provincial');

    // Can switch back to unlocked capua and return to provincial
    assert.equal(mgr.selectRegion('capua').ok, true);
    assert.equal(mgr.getCurrentRegion().id, 'capua');
    assert.equal(mgr.selectRegion('provincial').ok, true);

    const promo2 = mgr.devAddFame(50); // 75 total -> colosseum
    assert.equal(promo2.id, 'colosseum');

    mgr.devUnlockTournament(); // 150 fame -> imperial
    assert.equal(mgr.state.fame >= 150, true);
    assert.equal(mgr.getCurrentRegion().id, 'imperial');
    assert.equal(Game.CareerRules.getUnlockedRegions(mgr.state.fame, Data.CAREER_REGIONS).length, 4);
});

test('3-round Imperial Tournament tracks progress, heals breather between rounds, and handles loss & victory', () => {
    const { LudusGame: Game } = createCareerRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    // Locked before 150 fame
    assert.equal(mgr.getNextTournamentOpponent(g.id).ok, false);

    mgr.devUnlockTournament();
    const r1 = mgr.getNextTournamentOpponent(g.id);
    assert.equal(r1.ok, true);
    assert.equal(r1.opp.tournamentRound, 1);

    // Win Round 1 with low remaining HP -> should get +15% breather heal and advance to Round 2
    const res1 = mgr.recordTournamentMatchResult(g.id, r1.opp, true, 40);
    assert.equal(res1.nextRound, 2);
    assert.equal(res1.wonChampionship, false);
    assert.ok(res1.breatherHeal > 0);
    assert.equal(g.currentHp, 40 + 6 + res1.breatherHeal);

    // Lose Round 2 -> eliminated safely (not dead!), tournament resets
    const r2 = mgr.getNextTournamentOpponent(g.id);
    assert.equal(r2.opp.tournamentRound, 2);
    const loss2 = mgr.recordTournamentMatchResult(g.id, r2.opp, false, 0);
    assert.equal(loss2.eliminated, true);
    assert.equal(mgr.state.tournament.active, false);
    assert.equal(mgr.state.tournament.round, 0);
    assert.equal(mgr.state.roster.length, 1, 'Gladiator must survive tournament elimination');

    // Replay all 3 rounds and win Championship
    const t1 = mgr.getNextTournamentOpponent(g.id);
    mgr.recordTournamentMatchResult(g.id, t1.opp, true, 120);
    const t2 = mgr.getNextTournamentOpponent(g.id);
    assert.equal(t2.opp.tournamentRound, 2);
    mgr.recordTournamentMatchResult(g.id, t2.opp, true, 110);
    const t3 = mgr.getNextTournamentOpponent(g.id);
    assert.equal(t3.opp.tournamentRound, 3);
    assert.equal(t3.opp.isBoss, true);

    const win3 = mgr.recordTournamentMatchResult(g.id, t3.opp, true, 90);
    assert.equal(win3.wonChampionship, true);
    assert.equal(mgr.state.tournament.completedChampionship, true);
    assert.equal(mgr.state.tournament.active, false);
});

test('Prestigious New Game+ requires Championship, carries Doctore & bonuses, and scales next cycle', () => {
    const { LudusData: Data, LudusGame: Game } = createCareerRuntime();
    const mgr = new Game.LudusManager();
    const hero = mgr.state.roster[0];

    // Cannot start NG+ before winning Imperial Tournament
    assert.equal(mgr.startNewGamePlus(hero.id).ok, false);

    // Win tournament
    mgr.devUnlockTournament();
    for (let r = 0; r < 3; r++) {
        const next = mgr.getNextTournamentOpponent(hero.id);
        mgr.recordTournamentMatchResult(hero.id, next.opp, true, 100);
    }

    const ngRes = mgr.startNewGamePlus(hero.id);
    assert.equal(ngRes.ok, true);
    assert.equal(ngRes.ngPlusCount, 1);
    assert.equal(mgr.state.day, 1);
    assert.equal(mgr.state.gold, 360); // 240 + 120
    assert.ok(mgr.state.doctore !== null, 'Champion should become Doctore if none existed');
    assert.equal(mgr.state.doctore.name, hero.name);

    const heir = mgr.state.roster[0];
    assert.equal(heir.stats.strength, 13); // 11 + 2
    assert.equal(heir.armorId, 'leather');
    assert.equal(mgr.state.tournament.completedChampionship, false);

    // NG+ scales tournament enemies & rewards
    const scaledOpp = Game.CareerRules.buildTournamentOpponent(0, 1, Data.IMPERIAL_TOURNAMENT, Data.ARMORS);
    const baseOpp = Game.CareerRules.buildTournamentOpponent(0, 0, Data.IMPERIAL_TOURNAMENT, Data.ARMORS);
    assert.ok(scaledOpp.stats.strength > baseOpp.stats.strength);
    assert.ok(scaledOpp.rewardGold > baseOpp.rewardGold);
});

test('v0.8 saves migrate cleanly with Career & Tournament defaults', () => {
    const { LudusGame: Game } = createCareerRuntime();
    const mgr = new Game.LudusManager();

    const v08Save = JSON.stringify({
        day: 8,
        gold: 420,
        fame: 80,
        buildings: { trainingYard: 2, infirmary: 1, blacksmith: 2 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 1, net: 0, potion: 0 } },
        roster: [
            {
                id: 'old_max',
                name: 'Maximus',
                stats: { strength: 14, agility: 12, vitality: 13 },
                weaponId: 'sword',
                shieldId: 'none',
                armorId: 'leather',
                helmetId: 'none',
                currentHp: 140,
            },
        ],
        marketRecruits: [],
        dailyOpponents: [],
    });

    assert.equal(mgr.importSaveJSON(v08Save), true);
    assert.equal(mgr.state.ngPlusCount, 0);
    assert.equal(mgr.state.currentRegionId, 'colosseum'); // auto-resolved from 80 fame!
    assert.equal(mgr.state.tournament.active, false);
    assert.equal(mgr.state.tournament.completedChampionship, false);
});
