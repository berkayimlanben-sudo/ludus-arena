const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createFullRuntime(mathOverrides = {}) {
    const storage = new Map();
    const customMath = Object.create(Math);
    Object.assign(customMath, mathOverrides);

    const windowObj = {
        performance: { now: () => Date.now() },
        Math: customMath,
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
        Math: customMath,
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
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('2v2 blood droplets settle at fighter groundY (370) instead of hardcoded 355', () => {
    const { LudusGame: Game } = createFullRuntime();
    const ps = new Game.ParticleSystem();

    ps.spawnBlood(400, 370, 1, 6);
    assert.equal(ps.particles.length, 6);
    assert.ok(ps.particles.every((p) => p.groundY === 370));

    // Step simulation until droplets hit floor
    for (let i = 0; i < 60; i++) {
        ps._process(1 / 60);
    }

    const active = ps.particles.filter((p) => p.type === 'blood');
    if (active.length > 0) {
        assert.ok(active.every((p) => p.y <= 370), 'Blood should not fall past lane groundY 370');
        assert.ok(active.some((p) => p.y > 355), 'Frontline 2v2 blood droplets should land below 355 up to 370');
    }

    // Re-test with guaranteed longer life to inspect exact resting height 370
    const ps2 = new Game.ParticleSystem();
    ps2.spawnBlood(400, 370, 1, 3);
    ps2.particles.forEach((p) => {
        p.life = 2.0;
        p.maxLife = 2.0;
    });
    for (let i = 0; i < 90; i++) {
        ps2._process(1 / 60);
    }
    assert.ok(ps2.particles.every((p) => p.y === 370), 'Blood droplets should rest on groundY=370');
});

test('Velocity damping is framerate-independent between 60Hz and 144Hz', () => {
    const { LudusGame: Game } = createFullRuntime();

    const makeGladiator = () => {
        const g = new Game.Gladiator({ name: 'HzTest', x: 300 });
        const foe = new Game.Gladiator({ name: 'Foe', x: 700, team: 'right' });
        g.enemies = [foe];
        g.opponent = foe;
        g._ready();
        g.fsm.transitionTo('HURT');
        g.vx = 200;
        return g;
    };

    const g60 = makeGladiator();
    const g144 = makeGladiator();

    // Simulate 0.15s (within HURT 0.19s duration)
    for (let i = 0; i < 9; i++) {
        g60.fsm._process(1 / 60); // 9/60 = 0.15s
    }
    // 144Hz equivalent for 0.15s: compare exact total elapsed 0.15s
    const dt144 = 0.15 / 22;
    for (let i = 0; i < 22; i++) {
        g144.fsm._process(dt144);
    }

    assert.ok(
        Math.abs(g60.vx - g144.vx) < 0.01,
        `Expected 60Hz vx (${g60.vx}) and 144Hz vx (${g144.vx}) to match`
    );
});

test('Heavy weapons gain Hyper-Armor during late WINDUP/ATTACK against non-crit hits', () => {
    const seq = [0.8, 0.5, 0.9, 0.1];
    let idx = 0;
    const rt2 = createFullRuntime({
        random: () => seq[idx++ % seq.length],
    });
    const d2 = new rt2.LudusGame.Gladiator({
        name: 'QuickDagger',
        x: 300,
        stats: { strength: 10, agility: 10, vitality: 10 },
        weapon: rt2.LudusData.WEAPONS.dagger,
    });
    const a2 = new rt2.LudusGame.Gladiator({
        name: 'HeavyAxe',
        x: 335,
        team: 'right',
        stats: { strength: 14, agility: 8, vitality: 18 },
        weapon: rt2.LudusData.WEAPONS.axe,
    });
    d2.opponent = a2;
    a2.opponent = d2;
    d2.enemies = [a2];
    a2.enemies = [d2];
    a2._ready();
    a2.fsm.transitionTo('WINDUP');
    a2.stateTimer = a2.stateDuration * 0.6;

    idx = 0;
    d2._performHitCheck();
    assert.equal(a2.fsm.currentStateName, 'WINDUP', 'Heavy axe in late windup must resist HURT interruption');

    // Whereas light dagger in late windup DOES get interrupted into HURT
    const lightOpp = new rt2.LudusGame.Gladiator({
        name: 'LightDagger',
        x: 335,
        team: 'right',
        stats: { strength: 10, agility: 10, vitality: 18 },
        weapon: rt2.LudusData.WEAPONS.dagger, // weight 1 < 6
    });
    lightOpp.opponent = d2;
    lightOpp.enemies = [d2];
    lightOpp._ready();
    lightOpp.fsm.transitionTo('WINDUP');
    lightOpp.stateTimer = lightOpp.stateDuration * 0.6;
    d2.opponent = lightOpp;

    idx = 0;
    d2._performHitCheck();
    assert.equal(lightOpp.fsm.currentStateName, 'HURT', 'Light weapon without Hyper-Armor should enter HURT');
});

test('Gladiator locks target during WINDUP/ATTACK and switches only when safe or target dies', () => {
    const { LudusData: Data, LudusGame: Game } = createFullRuntime();

    const hero = new Game.Gladiator({
        name: 'Hero',
        x: 300,
        y: 348,
        weapon: Data.WEAPONS.sword,
    });
    const foeA = new Game.Gladiator({ name: 'FoeA', x: 380, y: 348, team: 'right' });
    const foeB = new Game.Gladiator({ name: 'FoeB', x: 320, y: 348, team: 'right' });

    hero.enemies = [foeA, foeB];
    hero.opponent = foeA;
    hero._ready();
    hero.opponent = foeA;
    hero.fsm.transitionTo('WINDUP');

    // foeB is much closer (dist 20 vs 80), yet WINDUP locks onto foeA
    hero._process(0.01);
    assert.equal(hero.opponent, foeA, 'Opponent must stay locked during WINDUP');

    hero.fsm.transitionTo('ATTACK');
    hero._process(0.01);
    assert.equal(hero.opponent, foeA, 'Opponent must stay locked during ATTACK');

    // If foeA dies mid-swing, hero immediately retargets
    foeA.hp = 0;
    hero._process(0.01);
    assert.equal(hero.opponent, foeB, 'Opponent updates immediately if current target dies');
});

test('nextDay() stops free injury clearing at Lv.1 or starvation, heals probabilistically at Lv.2+, and prevents starvation softlock', () => {
    // Fixed random 0.1 (below Lv.2 cure chance 0.25)
    const { LudusGame: Game } = createFullRuntime({ random: () => 0.1 });
    const mgr = new Game.LudusManager();

    const g = mgr.state.roster[0];
    g.injuryId = 'broken_rib';
    g.currentHp = 1;
    mgr.state.gold = 0; // Triggers starvation!
    mgr.state.buildings.infirmary = 1;

    // 1) Lv.1 + Starvation: injury must NOT clear, AND starvation softlock floor lifts HP >= 25% maxHp
    const day2 = mgr.nextDay();
    assert.equal(day2.starved, true);
    assert.equal(g.injuryId, 'broken_rib', 'Injury should NOT be cleared for free at Infirmary Lv.1');
    const readyFloor = Math.ceil(mgr.getGladiatorMaxHp(g) * 0.25);
    assert.ok(g.currentHp >= readyFloor, `Expected HP (${g.currentHp}) >= 25% Arena gate (${readyFloor})`);
    assert.equal(day2.starvationFloorApplied, true);

    // 2) Infirmary Lv.2 + Starvation: injury STILL must NOT clear while starving
    mgr.state.buildings.infirmary = 2;
    mgr.state.gold = 0;
    const day3 = mgr.nextDay();
    assert.equal(day3.starved, true);
    assert.equal(g.injuryId, 'broken_rib', 'Starving gladiators should not recover injuries overnight');

    // 3) Infirmary Lv.2 + Fed (enough gold for upkeep): random=0.1 < 0.25 cures injury!
    mgr.state.gold = 200;
    const day4 = mgr.nextDay();
    assert.equal(day4.starved, false);
    assert.equal(g.injuryId, null, 'Fed gladiator at Infirmary Lv.2+ can recover injury overnight');
    assert.ok(day4.healedInjuries.includes(g.name));
});

test('Multi-level-up queues multiple perk picks and choosePerk advances sequentially', () => {
    const { LudusGame: Game } = createFullRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    // Lv.1 needs 100 XP, Lv.2 needs 160 XP => 270 XP grants 2 levels (Lv.1 -> Lv.3)
    const leveled = mgr.grantXp(g, 270);
    assert.equal(leveled, true);
    assert.equal(g.level, 3);
    assert.equal(g.pendingPerkCount, 2);
    assert.ok(Array.isArray(g.pendingPerkChoices) && g.pendingPerkChoices.length === 3);

    const firstPick = g.pendingPerkChoices[0];
    assert.equal(mgr.choosePerk(g.id, firstPick).ok, true);
    assert.equal(g.perks.includes(firstPick), true);
    assert.equal(g.pendingPerkCount, 1);
    assert.ok(
        Array.isArray(g.pendingPerkChoices) && g.pendingPerkChoices.length === 3 && !g.pendingPerkChoices.includes(firstPick),
        'Second queued perk pick should immediately appear without already-chosen perk'
    );

    const secondPick = g.pendingPerkChoices[0];
    assert.equal(mgr.choosePerk(g.id, secondPick).ok, true);
    assert.equal(g.perks.length, 2);
    assert.equal(g.pendingPerkCount, 0);
    assert.equal(g.pendingPerkChoices, null);
});

test('getGladiatorSummary matches Gladiator style speed bonus and Bosses/Enemies spawn with styles & perks', () => {
    const { LudusData: Data, LudusGame: Game } = createFullRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    mgr.setFightStyle(g.id, 'balanced');
    const balSum = mgr.getGladiatorSummary(g);
    const balActor = new Game.Gladiator({
        name: g.name,
        stats: g.stats,
        trait: Data.TRAITS[g.traitId],
        fightStyle: 'balanced',
        weapon: Data.WEAPONS[g.weaponId],
        shield: Data.SHIELDS[g.shieldId],
        armor: Data.ARMORS[g.armorId],
        helmet: Data.HELMETS[g.helmetId],
    });
    assert.equal(balSum.spd, Math.round(balActor.moveSpeed));

    mgr.setFightStyle(g.id, 'skirmisher');
    const skSum = mgr.getGladiatorSummary(g);
    assert.equal(skSum.spd, balSum.spd + 14);

    mgr.setFightStyle(g.id, 'aggressive');
    const agSum = mgr.getGladiatorSummary(g);
    assert.equal(agSum.spd, balSum.spd + 8);

    // Colosseum enemies should have styleId & 1-2 perks
    const colosseumTier = Data.ARENA_TIERS.find((t) => t.id === 'colosseum');
    const enemy = mgr._generateEnemyFighter(colosseumTier, 1.0, 'standard');
    assert.ok(Data.FIGHT_STYLES[enemy.styleId], 'Enemy must have a valid fight style');
    assert.ok(Array.isArray(enemy.perks) && enemy.perks.length >= 1, 'Colosseum enemy must have >= 1 perk');

    // Boss day must include Boss styleId & perks
    mgr.devJumpToBossDay();
    const bossOpp = mgr.state.dailyOpponents.find((o) => o.isBoss);
    assert.ok(bossOpp, 'Boss opponent must be generated on boss day');
    assert.ok(Data.FIGHT_STYLES[bossOpp.styleId] && bossOpp.styleId !== 'balanced', 'Boss must have signature style');
    assert.ok(Array.isArray(bossOpp.perks) && bossOpp.perks.length >= 2, 'Boss must have signature perks');
});
