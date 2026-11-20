const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createDepthRuntime() {
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

test('Relation tiers apply 2v2 Gladiator allySynergy modifiers and ArenaScene announces synergy', () => {
    const { LudusData: Data, LudusGame: Game } = createDepthRuntime();

    const brotherTier = Game.RelationRules.getRelationTier(45);
    assert.equal(brotherTier.id, 'brother');
    assert.equal(brotherTier.dmgMult, 1.06);
    assert.equal(brotherTier.defDelta, 3);

    const rivalTier = Game.RelationRules.getRelationTier(-35);
    assert.equal(rivalTier.id, 'rival');
    assert.equal(rivalTier.critBonus, 0.05);
    assert.equal(rivalTier.defDelta, -3);

    // Gladiator constructor applies defDelta and _performHitCheck applies dmgMult
    const gBrother = new Game.Gladiator({
        name: 'A',
        x: 200,
        team: 'left',
        stats: { strength: 20, agility: 10, vitality: 10 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.leather,
        allySynergy: brotherTier
    });
    const gNeutral = new Game.Gladiator({
        name: 'B',
        x: 200,
        team: 'left',
        stats: { strength: 20, agility: 10, vitality: 10 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.leather,
        allySynergy: Game.RelationRules.getRelationTier(0)
    });
    assert.equal(gBrother.defense, gNeutral.defense + 3);

    const origRandom = Math.random;
    Math.random = () => 0.5;
    try {
        const makeTarget = () => new Game.Gladiator({
            name: 'Target',
            x: 235,
            team: 'right',
            stats: { strength: 10, agility: 10, vitality: 10 },
            weapon: Data.WEAPONS.sword,
            armor: Data.ARMORS.tunic
        });
        const t1 = makeTarget();
        gBrother.opponent = t1;
        gBrother._performHitCheck();
        const dmgBrother = t1.maxHp - t1.hp;

        const t2 = makeTarget();
        gNeutral.opponent = t2;
        gNeutral._performHitCheck();
        const dmgNeutral = t2.maxHp - t2.hp;

        assert.ok(dmgBrother > dmgNeutral, `Expected Silah Kardeşi damage (${dmgBrother}) > neutral (${dmgNeutral})`);
    } finally {
        Math.random = origRandom;
    }

    // ArenaScene emits synergy log at start of 2v2 match
    const logs = [];
    const scene = new Game.ArenaScene(
        [
            { name: 'Maximus', stats: { strength: 10, agility: 10, vitality: 10 }, allySynergy: Game.RelationRules.getCombatPairModifiers({ id: '1', relations: { '2': 50 } }, { id: '2', relations: { '1': 50 } }) },
            { name: 'Agron', stats: { strength: 10, agility: 10, vitality: 10 }, allySynergy: Game.RelationRules.getCombatPairModifiers({ id: '1', relations: { '2': 50 } }, { id: '2', relations: { '1': 50 } }) }
        ],
        [
            { name: 'Enemy1', stats: { strength: 10, agility: 10, vitality: 10 } },
            { name: 'Enemy2', stats: { strength: 10, agility: 10, vitality: 10 } }
        ]
    );
    scene.tree = { activeCamera: null };
    scene.onBattleLog.connect((msg) => logs.push(msg));
    scene._ready();
    assert.ok(logs.some(m => m.includes('SİNERJİSİ') && m.includes('Silah Kardeşi')));
});

test('sparTogether enforces daily cap, 2v2 match increases relation, and evaluateOvernightRelations resolves camaraderie/rivalry', () => {
    const { LudusGame: Game } = createDepthRuntime();
    const mgr = new Game.LudusManager();
    mgr.devSpawn2v2();

    assert.ok(mgr.state.roster.length >= 2);
    const g1 = mgr.state.roster[0];
    const g2 = mgr.state.roster[1];

    const spar1 = mgr.sparTogether(g1.id, g2.id);
    assert.equal(spar1.ok, true);
    assert.ok(spar1.nextScore >= 6);
    assert.equal(mgr.getRelationBetween(g1.id, g2.id), spar1.nextScore);

    // Same day repeat blocked
    const spar2 = mgr.sparTogether(g1.id, g2.id);
    assert.equal(spar2.ok, false);

    // 2v2 win adds +12 relation
    const opp2v2 = mgr.state.dailyOpponents.find(o => o.ruleId === 'team_2v2');
    const matchRes = mgr.recordTeamMatchResult([g1.id, g2.id], opp2v2.id, true, [100, 100], { durationSec: 18 });
    assert.ok(matchRes.relationUpdate);
    assert.equal(matchRes.relationUpdate.delta, 12);
    assert.equal(mgr.getRelationBetween(g1.id, g2.id), spar1.nextScore + 12);

    // Overnight deterministic camaraderie vs rivalry
    const pair = [
        { id: 'a', name: 'A', traitId: 'disciplined', loyalty: 70, relations: {} },
        { id: 'b', name: 'B', traitId: 'nimble', loyalty: 70, relations: {} }
    ];
    let idx = 0;
    const rollsCamaraderie = [0.1, 0.0, 0.0, 0.9]; // trigger (<0.65), pick i1=0, pick i2=1, conflict check >=0.22
    const camRes = Game.RelationRules.evaluateOvernightRelations(pair, () => rollsCamaraderie[idx++]);
    assert.equal(camRes.triggered, true);
    assert.equal(camRes.events[0].type, 'camaraderie');
    assert.equal(pair[0].relations.b, 6);

    const rebPair = [
        { id: 'c', name: 'C', traitId: 'fierce', loyalty: 15, relations: {} },
        { id: 'd', name: 'D', traitId: 'disciplined', loyalty: 70, relations: {} }
    ];
    let rIdx = 0;
    const rollsRivalry = [0.1, 0.0, 0.0, 0.1]; // trigger, pick c, d, conflict (<0.65)
    const rivRes = Game.RelationRules.evaluateOvernightRelations(rebPair, () => rollsRivalry[rIdx++]);
    assert.equal(rivRes.triggered, true);
    assert.equal(rivRes.events[0].type, 'rivalry');
    assert.equal(rebPair[0].relations.d, -8);
});

test('BettingRules scales odds dynamically and resolves win / fast_win / bribe-conflict cleanly', () => {
    const { LudusGame: Game } = createDepthRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    const weakOpp = {
        id: 'weak',
        stats: { strength: 6, agility: 6, vitality: 6 },
        weaponId: 'dagger',
        shieldId: 'none',
        armorId: 'tunic',
        helmetId: 'none',
        lethal: false,
        isBoss: false
    };
    const strongOpp = {
        id: 'strong',
        stats: { strength: 22, agility: 20, vitality: 22 },
        weaponId: 'axe',
        shieldId: 'none',
        armorId: 'plate',
        helmetId: 'horned',
        lethal: true,
        isBoss: true
    };

    const weakOdds = mgr.getMatchOdds([g.id], weakOpp);
    const strongOdds = mgr.getMatchOdds([g.id], strongOpp);
    assert.ok(strongOdds.winOdds > weakOdds.winOdds, `Underdog odds (${strongOdds.winOdds}) must exceed favorite (${weakOdds.winOdds})`);
    assert.ok(strongOdds.fastWinOdds > strongOdds.winOdds);

    // Block betting when throw_match bribe is accepted
    const bribedOpp = Object.assign({}, weakOpp, {
        bribeOffer: { type: 'throw_match', accepted: true, bribeGold: 200 }
    });
    const blockedBet = mgr.placeMatchBet([g.id], bribedOpp, { type: 'win', stake: 50 });
    assert.equal(blockedBet.ok, false);

    // Valid fast_win bet: wins under 20s, loses if >=20s
    mgr.state.gold = 200;
    const opp = mgr.state.dailyOpponents[0];
    const bet = mgr.placeMatchBet([g.id], opp, { type: 'fast_win', stake: 50 });
    assert.equal(bet.ok, true);
    assert.equal(bet.active, true);
    assert.equal(mgr.state.gold, 150);

    const fastRes = mgr.recordTeamMatchResult([g.id], opp.id, true, [80], { durationSec: 12.4, activeBet: bet });
    assert.ok(fastRes.betResult);
    assert.equal(fastRes.betResult.won, true);
    assert.equal(fastRes.betResult.payout, Math.round(50 * bet.odds));
    assert.equal(mgr.state.bettingStats.betsWon, 1);

    // Slow win (>=20s) fails fast_win bet
    const opp2 = mgr.state.dailyOpponents[2];
    const bet2 = mgr.placeMatchBet([g.id], opp2, { type: 'fast_win', stake: 25 });
    assert.equal(bet2.ok, true);
    const slowRes = mgr.recordTeamMatchResult([g.id], opp2.id, true, [60], { durationSec: 24.5, activeBet: bet2 });
    assert.ok(slowRes.betResult);
    assert.equal(slowRes.betResult.won, false);
    assert.equal(slowRes.betResult.payout, 0);
    assert.equal(mgr.state.bettingStats.betsLost, 1);
});

test('v0.9.6 save migrates relation and betting fields cleanly', () => {
    const { LudusGame: Game } = createDepthRuntime();
    const mgr = new Game.LudusManager();

    const v096Save = JSON.stringify({
        day: 6,
        gold: 400,
        fame: 60,
        buildings: { trainingYard: 2, infirmary: 1, blacksmith: 2 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 0, net: 0, potion: 0 } },
        roster: [
            {
                id: 'g_old_1',
                name: 'Spartacus',
                origin: 'Trakyalı',
                traitId: 'disciplined',
                stats: { strength: 13, agility: 12, vitality: 12 },
                weaponId: 'sword',
                favoriteWeaponId: 'sword',
                loyalty: 72,
                shieldId: 'parma',
                armorId: 'leather',
                helmetId: 'galea',
                currentHp: 130
            }
        ],
        marketRecruits: [],
        dailyOpponents: []
    });

    assert.equal(mgr.importSaveJSON(v096Save), true);
    const g = mgr.state.roster[0];
    assert.equal(typeof g.relations, 'object');
    assert.equal(Object.keys(g.relations).length, 0);
    assert.equal(g.lastSparDay, 0);
    assert.equal(mgr.state.bettingStats.totalWagered, 0);
    assert.equal(mgr.state.bettingStats.betsWon, 0);
});
