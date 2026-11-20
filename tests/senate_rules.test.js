const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createSenateRuntime() {
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
        'game/SenateRules.js',
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('Senate reputation tiers grant gold, fame, bribe, and upkeep bonuses', () => {
    const { LudusGame: Game } = createSenateRuntime();

    const base = Game.SenateRules.getSenateRewardBonuses({ reputations: { crassus: 0, tullius: 0, valeria: 0 } });
    assert.equal(base.goldBonusMult, 0);
    assert.equal(base.fameBonusMult, 0);
    assert.equal(base.upkeepDiscount, 0);

    const high = Game.SenateRules.getSenateRewardBonuses({ reputations: { crassus: 60, tullius: 30, valeria: 60 } });
    assert.equal(high.goldBonusMult, 0.25);
    assert.equal(high.fameBonusMult, 0.15);
    assert.equal(high.bribeRiskReduction, 0.14);
    assert.equal(high.upkeepDiscount, 0.15); // 150 >= 90
});

test('Senate contract acceptance and match evaluation grant rewards & reputation', () => {
    const { LudusGame: Game } = createSenateRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    // Force deterministic no-shield contract
    mgr.state.senate.dailyContract = {
        id: 'win_no_shield',
        senatorId: 'tullius',
        title: 'Kalkansız Cesaret',
        desc: 'Kalkan takmadan kazan.',
        conditionType: 'no_shield',
        rewardGold: 130,
        rewardFame: 15,
        repReward: 15,
        accepted: false,
        completed: false
    };

    const acc = mgr.acceptSenateContract();
    assert.equal(acc.ok, true);
    assert.equal(mgr.state.senate.dailyContract.accepted, true);

    const opp = mgr.state.dailyOpponents[0];
    const startGold = mgr.state.gold;
    const res = mgr.recordTeamMatchResult([g.id], opp.id, true, [110], { durationSec: 12, consumablesUsed: [null] });

    assert.ok(res.contractCompleted !== null);
    assert.equal(res.contractCompleted.rewardGold, 130);
    assert.equal(mgr.state.senate.reputations.tullius, 15);
    assert.equal(mgr.state.senate.completedContractsCount, 1);
    assert.ok(mgr.state.gold >= startGold + opp.rewardGold + 130);
});

test('Bribe offers respect lethal safety, handle sabotage & throw_match outcomes, and affect Gladiator combat', () => {
    const { LudusData: Data, LudusGame: Game } = createSenateRuntime();
    const mgr = new Game.LudusManager();

    // Lethal opponent should only get sabotage_enemy even if throw_match is not requested
    const lethalOffer = Game.SenateRules.createBribeOfferForOpponent(
        { id: 'x', name: 'Test', lethal: true, isBoss: false, ruleId: 'standard', rewardGold: 100 },
        mgr.state.senate,
        0
    );
    assert.equal(lethalOffer.type, 'sabotage_enemy');

    // Accept & cancel sabotage charges and refunds gold accurately
    const safeOpp = mgr.state.dailyOpponents.find(o => !o.lethal && o.ruleId !== 'team_2v2') || mgr.state.dailyOpponents[0];
    safeOpp.lethal = false;
    safeOpp.bribeOffer = Game.SenateRules.createBribeOfferForOpponent(safeOpp, mgr.state.senate, 0, 'sabotage_enemy');
    const goldBefore = mgr.state.gold;
    assert.equal(mgr.acceptBribeOffer(safeOpp.id).ok, true);
    assert.equal(mgr.state.gold, goldBefore - safeOpp.bribeOffer.upfrontCost);
    assert.equal(mgr.cancelBribeOffer(safeOpp.id).ok, true);
    assert.equal(mgr.state.gold, goldBefore);

    // Resolve outcomes deterministically
    const throwOffer = { type: 'throw_match', bribeGold: 200, riskChance: 0.25, accepted: true };
    const cleanThrow = Game.SenateRules.resolveBribeOutcome(throwOffer, false, 0.80);
    assert.equal(cleanThrow.caught, false);
    assert.equal(cleanThrow.goldDelta, 200);
    assert.equal(cleanThrow.valeriaRepDelta, 8);

    const scandalThrow = Game.SenateRules.resolveBribeOutcome(throwOffer, false, 0.05);
    assert.equal(scandalThrow.caught, true);
    assert.equal(scandalThrow.valeriaRepDelta, -12);

    const brokenDeal = Game.SenateRules.resolveBribeOutcome(throwOffer, true, 0.80);
    assert.equal(brokenDeal.keptDeal, false);
    assert.equal(brokenDeal.valeriaRepDelta, -10);

    // Gladiator sabotaged & bribeThrow combat behavior
    const sabGlad = new Game.Gladiator({
        name: 'Sabotajlı',
        stats: { strength: 10, agility: 10, vitality: 10 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.tunic,
        sabotaged: true
    });
    assert.equal(sabGlad.hp, Math.round(sabGlad.maxHp * 0.75));
    assert.equal(sabGlad.strength, 8);

    const throwGlad = new Game.Gladiator({
        name: 'Şikeci',
        stats: { strength: 10, agility: 10, vitality: 10 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.tunic,
        bribeThrow: true
    });
    throwGlad.hp = Math.round(throwGlad.maxHp * 0.30);
    throwGlad._process(0.016);
    assert.equal(throwGlad.hp, 0);
    assert.equal(throwGlad.fsm.currentStateName, 'DEAD');
});

test('v0.9 saves migrate Senate state and NG+ preserves 50% positive Senator reputation', () => {
    const { LudusGame: Game } = createSenateRuntime();
    const mgr = new Game.LudusManager();

    const v09Save = JSON.stringify({
        day: 5,
        gold: 500,
        fame: 150,
        ngPlusCount: 0,
        currentRegionId: 'imperial',
        tournament: { active: false, round: 0, fighterId: null, completedChampionship: true },
        buildings: { trainingYard: 2, infirmary: 1, blacksmith: 2 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 0, net: 0, potion: 0 } },
        roster: [
            {
                id: 'champ_1',
                name: 'Maximus',
                stats: { strength: 15, agility: 14, vitality: 15 },
                weaponId: 'sword',
                shieldId: 'none',
                armorId: 'leather',
                helmetId: 'none',
                currentHp: 150
            }
        ],
        marketRecruits: [],
        dailyOpponents: []
    });

    assert.equal(mgr.importSaveJSON(v09Save), true);
    assert.ok(mgr.state.senate);
    assert.equal(mgr.state.senate.reputations.crassus, 0);

    mgr.state.senate.reputations.crassus = 40;
    mgr.state.senate.reputations.valeria = -10;
    const ng = mgr.startNewGamePlus('champ_1');
    assert.equal(ng.ok, true);
    assert.equal(mgr.state.senate.reputations.crassus, 20);
    assert.equal(mgr.state.senate.reputations.valeria, 0);
});
