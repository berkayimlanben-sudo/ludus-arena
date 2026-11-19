const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createLudusRuntime() {
    const windowObj = {
        performance: { now: () => Date.now() },
        Math,
    };
    windowObj.window = windowObj;

    const context = vm.createContext({
        window: windowObj,
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
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('getLaneY keeps 1v1 at 355 and splits 2v2 into 2.5D lanes', () => {
    const { LudusGame } = createLudusRuntime();
    const { CombatRules } = LudusGame;

    assert.equal(CombatRules.getLaneY(0, 1), 355);
    assert.equal(CombatRules.getLaneY(0, 2), 348);
    assert.equal(CombatRules.getLaneY(1, 2), 370);
});

test('selectBestTarget spreads 2v2 backline to second enemy instead of stacking', () => {
    const { LudusGame } = createLudusRuntime();
    const { CombatRules } = LudusGame;

    const left1 = { x: 270, y: 348, hp: 100, team: 'left', opponent: null };
    const left2 = { x: 195, y: 370, hp: 100, team: 'left', opponent: null };
    const right1 = { x: 690, y: 348, hp: 100, team: 'right' };
    const right2 = { x: 765, y: 370, hp: 100, team: 'right' };

    left1.opponent = CombatRules.selectBestTarget(left1, [right1, right2], [left2]);
    assert.equal(left1.opponent, right1);

    left2.opponent = CombatRules.selectBestTarget(left2, [right1, right2], [left1]);
    assert.equal(left2.opponent, right2);

    // When right1 dies, both target right2
    right1.hp = 0;
    assert.equal(CombatRules.selectBestTarget(left1, [right1, right2], [left2]), right2);
    assert.equal(CombatRules.selectBestTarget(left2, [right1, right2], [left1]), right2);
});

test('computeOverlapPushX lets allies pass freely and allows cross-lane passage past non-target enemies', () => {
    const { LudusGame } = createLudusRuntime();
    const { CombatRules } = LudusGame;

    const left1 = { x: 460, y: 348, hp: 100, team: 'left', opponent: null };
    const left2 = { x: 455, y: 370, hp: 100, team: 'left', opponent: null };
    const right1 = { x: 500, y: 348, hp: 100, team: 'right', opponent: left1 };
    const right2 = { x: 620, y: 370, hp: 100, team: 'right', opponent: left2 };

    left1.opponent = right1;
    left2.opponent = right2;

    // Ally right next to left2 should NOT block left2
    assert.equal(CombatRules.computeOverlapPushX(left2, [left1]), 0);

    // Non-target enemy in the other lane (right1 at y=348, x=500) should NOT block left2 (y=370, x=495)
    const left2PassingRight1 = { x: 495, y: 370, hp: 100, team: 'left', opponent: right2 };
    assert.equal(CombatRules.computeOverlapPushX(left2PassingRight1, [left1, right1, right2]), 0);

    // Same-lane enemy right1 blocks left1 at minGap 38
    const left1TooClose = { x: 480, y: 348, hp: 100, team: 'left', opponent: right1 };
    assert.ok(CombatRules.computeOverlapPushX(left1TooClose, [right1]) < 0);

    // Cross-lane current target still keeps minGap 30 (reachable by dagger range 52)
    const left1ConvergingOnRight2 = { x: 605, y: 348, hp: 100, team: 'left', opponent: right2 };
    assert.ok(CombatRules.computeOverlapPushX(left1ConvergingOnRight2, [right2]) < 0);
});

test('sortArenaChildren orders camera first, fighters by Y depth (dead behind living), and particles last', () => {
    const { LudusGame } = createLudusRuntime();
    const { CombatRules } = LudusGame;

    const cam = { name: 'cam' };
    const particles = { name: 'particles' };
    const fFrontAlive = { name: 'fFrontAlive', y: 370, x: 300, hp: 50 };
    const fFrontDead = { name: 'fFrontDead', y: 370, x: 320, hp: 0 };
    const fBackAlive = { name: 'fBackAlive', y: 348, x: 400, hp: 80 };

    const sorted = CombatRules.sortArenaChildren(
        [cam, fFrontAlive, fBackAlive, fFrontDead, particles],
        cam,
        particles
    );

    assert.deepEqual(
        Array.from(sorted, n => n.name),
        ['cam', 'fBackAlive', 'fFrontDead', 'fFrontAlive', 'particles']
    );
});

test('2v2 simulation: short-range dagger backliner passes frontline and actively lands hits', () => {
    const win = createLudusRuntime();
    const { LudusEngine: Engine, LudusData: Data, LudusGame: Game } = win;

    const fakeCanvas = { width: 960, height: 460, getContext: () => ({}) };
    const tree = new Engine.SceneTree(fakeCanvas);

    const leftConfigs = [
        {
            name: 'FrontShield',
            stats: { strength: 12, agility: 12, vitality: 16 },
            weapon: Data.WEAPONS.sword,
            shield: Data.SHIELDS.scutum,
            armor: Data.ARMORS.leather,
            helmet: Data.HELMETS.galea,
        },
        {
            name: 'BackDagger',
            stats: { strength: 12, agility: 16, vitality: 14 },
            weapon: Data.WEAPONS.dagger, // shortest range: 52
            shield: Data.SHIELDS.none,
            armor: Data.ARMORS.tunic,
            helmet: Data.HELMETS.none,
        },
    ];

    const rightConfigs = [
        {
            name: 'EnemySpear',
            stats: { strength: 12, agility: 12, vitality: 14 },
            weapon: Data.WEAPONS.spear,
            shield: Data.SHIELDS.none,
            armor: Data.ARMORS.tunic,
            helmet: Data.HELMETS.galea,
        },
        {
            name: 'EnemySword',
            stats: { strength: 12, agility: 12, vitality: 14 },
            weapon: Data.WEAPONS.sword,
            shield: Data.SHIELDS.parma,
            armor: Data.ARMORS.leather,
            helmet: Data.HELMETS.none,
        },
    ];

    const scene = new Game.ArenaScene(leftConfigs, rightConfigs);
    const logs = [];
    scene.onBattleLog.connect((msg) => logs.push(msg));
    tree.changeScene(scene);

    const front = scene.leftTeam[0];
    const back = scene.leftTeam[1];
    assert.equal(front.y, 348);
    assert.equal(back.y, 370);
    assert.equal(back.arenaBounds.groundY, 370);

    let backMaxX = back.x;
    const dt = 1 / 60;
    for (let step = 0; step < 60 * 12 && !scene.matchEnded; step++) {
        scene._propagateProcess(dt);
        if (back.x > backMaxX) backMaxX = back.x;
    }

    // Backline dagger fighter should advance well past its starting x=195 and engage enemies
    assert.ok(backMaxX > 360, `Expected BackDagger to advance past x=360, got maxX=${backMaxX}`);

    // Backline dagger fighter must actually participate in combat (logs mention BackDagger hitting/killing)
    const backLogs = logs.filter((l) => l.includes('BackDagger'));
    assert.ok(
        backLogs.length > 0,
        `Expected BackDagger to land hits or engage in battle logs, got logs: ${logs.join(' | ')}`
    );
});
