const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createPhase7Runtime() {
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
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('Consumables: buy, consume once, and trigger poison, net, and potion in ArenaScene', () => {
    const win = createPhase7Runtime();
    const { LudusEngine: Engine, LudusData: Data, LudusGame: Game } = win;

    const mgr = new Game.LudusManager();
    mgr.state.gold = 300;

    assert.equal(mgr.buyItem('consumables', 'poison').ok, true);
    assert.equal(mgr.buyItem('consumables', 'net').ok, true);
    assert.equal(mgr.buyItem('consumables', 'potion').ok, true);
    assert.equal(mgr.state.inventory.consumables.poison, 1);

    const poison = mgr.consumeArenaItem('poison');
    assert.equal(poison.id, 'poison');
    assert.equal(mgr.state.inventory.consumables.poison, 0);
    assert.equal(mgr.consumeArenaItem('poison'), null);

    // Test net & poison in ArenaScene
    const net = mgr.consumeArenaItem('net');
    const fakeCanvas = { width: 960, height: 460, getContext: () => ({}) };
    const tree = new Engine.SceneTree(fakeCanvas);

    const scene = new Game.ArenaScene(
        {
            name: 'Viper',
            stats: { strength: 14, agility: 14, vitality: 14 },
            weapon: Data.WEAPONS.sword,
            shield: Data.SHIELDS.none,
            armor: Data.ARMORS.leather,
            helmet: Data.HELMETS.none,
            consumable: poison,
        },
        {
            name: 'TargetDummy',
            stats: { strength: 8, agility: 8, vitality: 16 },
            weapon: Data.WEAPONS.dagger,
            shield: Data.SHIELDS.none,
            armor: Data.ARMORS.tunic,
            helmet: Data.HELMETS.none,
            consumable: net,
        }
    );

    const logs = [];
    scene.onBattleLog.connect((m) => logs.push(m));
    tree.changeScene(scene);

    for (let i = 0; i < 60 * 6 && !scene.matchEnded; i++) {
        scene._propagateProcess(1 / 60);
    }

    assert.ok(logs.some((l) => l.includes('gladyatör ağı fırlattı')), 'Net should trigger on approach');
    assert.ok(logs.some((l) => l.includes('zehirli darbesi')), 'Poison should trigger on unblocked hit');

    // Test potion auto-heal under 45% HP
    const potion = mgr.consumeArenaItem('potion');
    const g = new Game.Gladiator({
        name: 'AlchemistTest',
        stats: { strength: 10, agility: 10, vitality: 10 },
        currentHp: 50, // maxHp = 80 + 60 = 140, 50 <= 63 (45%)
        consumable: potion,
    });
    const potionLogs = [];
    g.onLog.connect((m) => potionLogs.push(m));
    g.enemies = [new Game.Gladiator({ name: 'Foe', x: 700 })];
    g._ready();
    g._process(0.016);

    assert.equal(g.consumableUsed, true);
    assert.equal(g.hp, 85);
    assert.ok(potionLogs.some((l) => l.includes('Can Şurubu içti')));
});

test('Poison passive DoT deals periodic damage and spawns green floating damage number', () => {
    const { LudusData: Data, LudusGame: Game } = createPhase7Runtime();
    const particles = new Game.ParticleSystem();

    const attacker = new Game.Gladiator({
        name: 'Viper',
        x: 200,
        stats: { strength: 12, agility: 12, vitality: 12 },
        weapon: Data.WEAPONS.sword,
        consumable: Data.CONSUMABLES.poison,
    });
    const defender = new Game.Gladiator({
        name: 'Victim',
        x: 240,
        team: 'right',
        stats: { strength: 8, agility: 8, vitality: 14 },
        weapon: Data.WEAPONS.dagger,
    });

    attacker.particles = particles;
    defender.particles = particles;
    attacker.opponent = defender;
    defender.opponent = attacker;
    attacker.enemies = [defender];
    defender.enemies = [attacker];
    attacker.facing = 1;
    defender.facing = -1;

    attacker._performHitCheck();
    assert.ok(defender.activeEffects.poison > 0, 'Poison status should be active on hit');
    assert.ok(defender.getStateLabel().includes('🐍'), 'State label should show poison indicator');

    const hpAfterHit = defender.hp;
    // Step 1.05s to trigger first passive poison tick
    defender._process(0.55);
    defender._process(0.50);

    assert.equal(defender.hp, hpAfterHit - 4, 'Poison tick should subtract 4 HP');
    const greenPoisonText = particles.texts.find(
        (t) => t.color === '#51cf66' && t.text.includes('-4') && t.text.includes('ZEHİR')
    );
    assert.ok(greenPoisonText, 'Passive poison tick should spawn green -4 ZEHİR floating number');

    // Lethal poison tick kills defender cleanly
    defender.hp = 3;
    defender._process(1.0);
    assert.equal(defender.hp, 0);
    assert.equal(defender.fsm.currentStateName, 'DEAD');
});

test('Doctore: eligibility, gear return on retirement, and bonuses for new recruits & XP', () => {
    const { LudusGame: Game } = createPhase7Runtime();
    const mgr = new Game.LudusManager();

    const hero = mgr.state.roster[0];
    // Cannot retire with < 10 wins
    assert.equal(mgr.retireAsDoctore(hero.id).ok, false);

    hero.wins = 12;
    // Cannot retire when roster has only 1 gladiator
    assert.equal(mgr.retireAsDoctore(hero.id).ok, false);

    // Add second gladiator so retirement is allowed
    mgr.state.gold = 500;
    const recruit = mgr.state.marketRecruits[0];
    assert.equal(mgr.hireRecruit(recruit.id).ok, true);

    const prevSwords = mgr.state.inventory.weapons.sword || 0;
    const res = mgr.retireAsDoctore(hero.id);
    assert.equal(res.ok, true);
    assert.equal(mgr.state.doctore.name, hero.name);
    assert.equal(mgr.state.inventory.weapons.sword, prevSwords + 1);
    assert.equal(mgr.state.roster.some((g) => g.id === hero.id), false);

    // Newly hired recruit receives Doctore statBonus (+2)
    const nextRecruit = mgr.state.marketRecruits[1];
    const baseStr = nextRecruit.stats.strength;
    assert.equal(mgr.hireRecruit(nextRecruit.id).ok, true);
    const hiredGlad = mgr.state.roster[mgr.state.roster.length - 1];
    assert.equal(hiredGlad.stats.strength, baseStr + res.doctore.statBonus);

    // XP gain receives Doctore XP bonus
    const beforeXp = hiredGlad.xp;
    mgr.grantXp(hiredGlad, 40);
    assert.ok(hiredGlad.xp > 40 + beforeXp, 'Doctore should boost gained XP');
});

test('Roman Events: 3-4 day cadence, choice resolution, and v0.7 save migration', () => {
    const { LudusGame: Game, LudusData: Data } = createPhase7Runtime();
    const { Phase7Rules } = Game;

    assert.equal(Phase7Rules.shouldTriggerRomanEvent(2, 1, 0.1), false);
    assert.equal(Phase7Rules.shouldTriggerRomanEvent(3, 1, 0.1), false);
    assert.equal(Phase7Rules.shouldTriggerRomanEvent(4, 1, 0.2), true);
    assert.equal(Phase7Rules.shouldTriggerRomanEvent(5, 1, 0.99), true);

    const mgr = new Game.LudusManager();
    mgr.state.gold = 100;
    mgr.state.pendingEvent = Data.ROMAN_EVENTS.find((e) => e.id === 'merchant_wagon');
    const res = mgr.resolveRomanEvent('buy_cheap');
    assert.equal(res.ok, true);
    assert.equal(mgr.state.gold, 55);
    assert.equal(mgr.state.inventory.consumables.potion, 1);
    assert.equal(mgr.state.inventory.consumables.net, 1);
    assert.equal(mgr.state.pendingEvent, null);

    // Backward-compatible migration of an old v0.7 save without Phase 7 fields
    const oldSave = JSON.stringify({
        day: 6,
        gold: 180,
        fame: 20,
        buildings: { trainingYard: 1, infirmary: 1, blacksmith: 1 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {} },
        roster: [
            {
                id: 'old_1',
                name: 'LegacyMax',
                stats: { strength: 10, agility: 10, vitality: 10 },
                weaponId: 'sword',
                shieldId: 'none',
                armorId: 'tunic',
                helmetId: 'none',
                currentHp: 120,
            },
        ],
        marketRecruits: [],
        dailyOpponents: [],
    });

    assert.equal(mgr.importSaveJSON(oldSave), true);
    assert.deepEqual(
        Object.assign({}, mgr.state.inventory.consumables),
        { poison: 0, net: 0, potion: 0 }
    );
    assert.equal(mgr.state.doctore, null);
    assert.equal(mgr.state.lastEventDay, 6);
    assert.equal(mgr.state.roster[0].wins, 0);
});
