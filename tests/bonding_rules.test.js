const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createBondingRuntime() {
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
        'game/LudusManager.js',
    ];

    for (const relPath of files) {
        const fullPath = path.join(__dirname, '..', relPath);
        const code = fs.readFileSync(fullPath, 'utf8');
        vm.runInContext(code, context, { filename: relPath });
    }

    return windowObj;
}

test('Favorite weapon grants light +6% dmg / +5% crit bonus without penalizing other weapons and shows on market recruits', () => {
    const { LudusData: Data, LudusGame: Game } = createBondingRuntime();
    const mgr = new Game.LudusManager();

    // Every market recruit gets a favoriteWeaponId and carries it on hire
    assert.equal(mgr.state.marketRecruits.length, 3);
    for (const rec of mgr.state.marketRecruits) {
        assert.ok(Data.WEAPONS[rec.favoriteWeaponId], 'Market recruit should have valid favoriteWeaponId');
    }
    mgr.state.gold = 500;
    const firstRec = mgr.state.marketRecruits[0];
    const hireRes = mgr.hireRecruit(firstRec.id);
    assert.equal(hireRes.ok, true);
    const hiredGlad = mgr.state.roster.find(g => g.name === firstRec.name && g.favoriteWeaponId === firstRec.favoriteWeaponId);
    assert.ok(hiredGlad);

    // Light bonus calculation
    const favBonus = Game.BondingRules.getFavoriteWeaponBonus({ weaponId: 'sword', favoriteWeaponId: 'sword' });
    assert.equal(favBonus.active, true);
    assert.equal(favBonus.dmgMult, 1.06);
    assert.equal(favBonus.critBonus, 0.05);

    const otherBonus = Game.BondingRules.getFavoriteWeaponBonus({ weaponId: 'dagger', favoriteWeaponId: 'sword' });
    assert.equal(otherBonus.active, false);
    assert.equal(otherBonus.dmgMult, 1.0);
    assert.equal(otherBonus.critBonus, 0);

    // Deterministic hit check comparison in Gladiator.js (Math.random = 0.5 -> no crit, exact mid roll)
    const origRandom = Math.random;
    Math.random = () => 0.5;
    try {
        const makeTarget = () => new Game.Gladiator({
            name: 'Hedef',
            x: 240,
            team: 'right',
            stats: { strength: 10, agility: 10, vitality: 10 },
            weapon: Data.WEAPONS.sword,
            armor: Data.ARMORS.tunic
        });

        const tFav = makeTarget();
        const gFav = new Game.Gladiator({
            name: 'Fav',
            x: 200,
            team: 'left',
            stats: { strength: 20, agility: 10, vitality: 10 },
            weapon: Data.WEAPONS.sword,
            favoriteWeaponId: 'sword',
            loyalty: 65,
            armor: Data.ARMORS.tunic
        });
        gFav.opponent = tFav;
        gFav._performHitCheck();
        const favDmg = tFav.maxHp - tFav.hp;

        const tOther = makeTarget();
        const gOther = new Game.Gladiator({
            name: 'Other',
            x: 200,
            team: 'left',
            stats: { strength: 20, agility: 10, vitality: 10 },
            weapon: Data.WEAPONS.sword,
            favoriteWeaponId: 'axe',
            loyalty: 65,
            armor: Data.ARMORS.tunic
        });
        gOther.opponent = tOther;
        gOther._performHitCheck();
        const otherDmg = tOther.maxHp - tOther.hp;

        assert.ok(favDmg > otherDmg, `Expected favorite weapon (${favDmg}) > non-favorite (${otherDmg})`);
        assert.ok(favDmg <= Math.ceil(otherDmg * 1.1), 'Favorite weapon buff must stay light (~6%)');
    } finally {
        Math.random = origRandom;
    }
});

test('Loyalty tiers apply Sadık Yürek (>=75), low-loyalty penalties (<25), training surcharge, and 10% rebellion spill', () => {
    const { LudusData: Data, LudusGame: Game } = createBondingRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];

    // Sadık Yürek (>=75) triggers once per match below 25% HP for +10 Stamina and +5 Armor
    const loyalGlad = new Game.Gladiator({
        name: 'Sadık',
        stats: { strength: 12, agility: 12, vitality: 12 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.tunic,
        loyalty: 80
    });
    const baseDef = loyalGlad.getEffectiveDefense();
    loyalGlad.stamina = 20;
    loyalGlad.hp = Math.floor(loyalGlad.maxHp * 0.20);
    loyalGlad._process(0.016);
    assert.equal(loyalGlad.loyalHeartUsed, true);
    assert.equal(loyalGlad.getEffectiveDefense(), baseDef + 5);
    assert.ok(loyalGlad.stamina >= 30);

    // Rebellious (<25) slows speed, drops damage, increases training cost by +15%
    const normalCost = mgr.getTrainingCost(g, 'strength');
    g.loyalty = 20;
    const rebCost = mgr.getTrainingCost(g, 'strength');
    assert.equal(rebCost, Math.round(normalCost * 1.15));
    const rebSum = mgr.getGladiatorSummary(g);
    assert.equal(rebSum.loyaltyTier.id, 'rebellious');

    const rebGlad = new Game.Gladiator({
        name: 'İsyankar',
        stats: { strength: 12, agility: 12, vitality: 12 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.tunic,
        loyalty: 20
    });
    const steadyGlad = new Game.Gladiator({
        name: 'Dengeli',
        stats: { strength: 12, agility: 12, vitality: 12 },
        weapon: Data.WEAPONS.sword,
        armor: Data.ARMORS.tunic,
        loyalty: 65
    });
    assert.ok(rebGlad.moveSpeed < steadyGlad.moveSpeed);

    // Overnight rebellion 10% chance spills -6 loyalty to teammates when triggered
    const roster = [
        { id: '1', name: 'Asi', loyalty: 15 },
        { id: '2', name: 'Dost', loyalty: 65 }
    ];
    const noReb = Game.BondingRules.evaluateOvernightRebellion(roster, () => 0.15);
    assert.equal(noReb.triggered, false);
    assert.equal(roster[1].loyalty, 65);

    const yesReb = Game.BondingRules.evaluateOvernightRebellion(roster, () => 0.05);
    assert.equal(yesReb.triggered, true);
    assert.equal(yesReb.instigators.length, 1);
    assert.equal(yesReb.instigators[0], 'Asi');
    assert.equal(roster[1].loyalty, 59);
});

test('Personal requests prioritize heal -> favorite weapon -> higher tier weapon and NEVER ask for freedom or Doctore', () => {
    const { LudusData: Data, LudusGame: Game } = createBondingRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];
    g.wins = 25; // Even with >=10 wins, NEVER generates freedom/Doctore request!

    // 1. Injured -> heal_or_rest
    g.injuryId = 'sprained_ankle';
    let req = mgr.devGenerateRequest(g.id);
    assert.equal(req.type, 'heal_or_rest');

    // Fulfilling heal grants loyalty & XP
    mgr.state.gold = 300;
    g.loyalty = 60;
    const prevXp = g.xp;
    const healRes = mgr.healGladiator(g.id);
    assert.equal(healRes.ok, true);
    assert.ok(healRes.fulfilledRequest !== null);
    assert.equal(g.activeRequest, null);
    assert.ok(g.loyalty > 60);
    assert.ok(g.xp > prevXp);

    // 2. Favorite weapon not equipped -> equip_favorite
    g.favoriteWeaponId = 'axe';
    g.weaponId = 'sword';
    mgr.state.buildings.blacksmith = 3;
    req = mgr.devGenerateRequest(g.id);
    assert.equal(req.type, 'equip_favorite');
    assert.equal(req.targetWeaponId, 'axe');

    // Equip favorite weapon fulfills request
    mgr.state.inventory.weapons.axe = 1;
    const eqRes = mgr.equipItem(g.id, 'weapons', 'axe');
    assert.equal(eqRes.ok, true);
    assert.ok(eqRes.fulfilledRequest !== null);
    assert.equal(g.activeRequest, null);

    // 3. Favorite equipped, higher tier unlocked -> upgrade_weapon (or win_with_favorite when at top tier)
    g.favoriteWeaponId = 'sword';
    g.weaponId = 'sword';
    mgr.state.buildings.blacksmith = 2;
    const reqTier = Game.BondingRules.generatePersonalRequest(g, mgr.state, Data.WEAPONS, mgr.getGladiatorMaxHp(g), 0.2);
    assert.equal(reqTier.type, 'upgrade_weapon');

    // 4. Decline costs -6 loyalty
    g.activeRequest = reqTier;
    const loyaltyBeforeDecline = g.loyalty;
    const decRes = mgr.declineGladiatorRequest(g.id);
    assert.equal(decRes.ok, true);
    assert.equal(g.loyalty, loyaltyBeforeDecline - 6);
    assert.equal(g.activeRequest, null);
});

test('Daily Ludus gestures (talk, wine, private quarters) enforce limits, costs, and nextDay passive bonuses', () => {
    const { LudusGame: Game } = createBondingRuntime();
    const mgr = new Game.LudusManager();
    const g = mgr.state.roster[0];
    mgr.state.gold = 500;
    g.loyalty = 50;
    g.currentHp = Math.floor(mgr.getGladiatorMaxHp(g) * 0.5);

    // Free talk once per day
    const t1 = mgr.talkToGladiator(g.id);
    assert.equal(t1.ok, true);
    assert.equal(g.loyalty, 54);
    const t2 = mgr.talkToGladiator(g.id);
    assert.equal(t2.ok, false);

    // Wine gift costs 25 gold, +8 loyalty & +12% HP once per day
    const hpBeforeWine = g.currentHp;
    const w1 = mgr.giftWineToGladiator(g.id);
    assert.equal(w1.ok, true);
    assert.equal(mgr.state.gold, 475);
    assert.equal(g.loyalty, 62);
    assert.ok(g.currentHp > hpBeforeWine);
    const w2 = mgr.giftWineToGladiator(g.id);
    assert.equal(w2.ok, false);

    // Private quarters costs 180 gold, permanent, +15 loyalty immediately & +3 passive on nextDay
    const q1 = mgr.assignPrivateQuarters(g.id);
    assert.equal(q1.ok, true);
    assert.equal(mgr.state.gold, 295);
    assert.equal(g.hasPrivateQuarters, true);
    assert.equal(g.loyalty, 77);
    const q2 = mgr.assignPrivateQuarters(g.id);
    assert.equal(q2.ok, false);

    // Next day grants +3 passive loyalty when fed
    const nextInfo = mgr.nextDay();
    assert.equal(nextInfo.starved, false);
    assert.equal(g.loyalty, 80);

    // Can talk & gift wine again on new day
    assert.equal(mgr.talkToGladiator(g.id).ok, true);
    assert.equal(mgr.giftWineToGladiator(g.id).ok, true);
});

test('v0.9.5 save migrates bonding fields cleanly', () => {
    const { LudusGame: Game } = createBondingRuntime();
    const mgr = new Game.LudusManager();

    const v095Save = JSON.stringify({
        day: 4,
        gold: 300,
        fame: 40,
        buildings: { trainingYard: 1, infirmary: 1, blacksmith: 1 },
        inventory: { weapons: {}, shields: {}, armors: {}, helmets: {}, consumables: { poison: 0, net: 0, potion: 0 } },
        senate: { reputations: { crassus: 10, tullius: 5, valeria: 0 }, dailyContract: null },
        roster: [
            {
                id: 'old_1',
                name: 'Crixus',
                origin: 'Galyalı',
                traitId: 'fierce',
                stats: { strength: 12, agility: 10, vitality: 12 },
                weaponId: 'sword',
                shieldId: 'none',
                armorId: 'tunic',
                helmetId: 'none',
                currentHp: 120
            }
        ],
        marketRecruits: [],
        dailyOpponents: []
    });

    assert.equal(mgr.importSaveJSON(v095Save), true);
    const g = mgr.state.roster[0];
    assert.ok(g.favoriteWeaponId);
    assert.equal(g.loyalty, 65);
    assert.equal(g.hasPrivateQuarters, false);
    assert.equal(g.activeRequest, null);
});
