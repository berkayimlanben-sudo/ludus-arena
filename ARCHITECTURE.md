# ARCHITECTURE.md — Ludus Arena Teknik Mimarisi

Bu belge, motor katmanı, olay (event) sistemi, sahne döngüsü ve veri akışını özetler.

---

## 1. Katman & Bağımlılık Sırası
`index.html` içindeki `<script>` sırası katman bağımlılıklarını belirler (üstteki katman alttakine erişemez):

1. **Çekirdek Motor (`engine/`):** `Signal.js` → `Node.js` → `Node2D.js` → `StateMachine.js` → `Camera2D.js` → `SceneTree.js` (`window.LudusEngine`)
2. **Statik Veri (`data/`):** `Items.js`, `LudusConfig.js` (`window.LudusData`)
3. **Yardımcılar (`game/`):** `SoundFX.js`, `Particles.js`
4. **Görsel Katman (`game/renderers/`):** `ArenaRenderer.js`, `GladiatorRenderer.js`, `LudusRenderer.js`
5. **Saf Kural Modülleri (`game/*Rules.js`):** `CombatRules.js`, `CrowdRules.js`, `Phase7Rules.js`, `CareerRules.js`, `SenateRules.js`, `BondingRules.js`, `RelationAndBetRules.js`
6. **Sahne & Aktörler (`game/`):** `Gladiator.js`, `ArenaScene.js`, `LudusScene.js`
7. **Durum Yöneticisi (`game/LudusManager.js`):** Tüm oyun durumunu ve kayıt/göç işlemlerini yönetir.
8. **Uygulama Denetleyicisi (`game/main.js`):** DOM olaylarını, sekme geçişlerini, `ludusTree` ve `tree` örneklerini bağlar.

---

## 2. Sahne & Yaşam Döngüsü (`SceneTree` & `Node`)
Uygulamada iki ayrı Canvas ve iki `Engine.SceneTree` çalışır:
* **`ludusTree` (`#ludus-canvas`):** Ludus sekmesi açıkken aktiftir; diğer sekmelerde `ludusTree.paused = true` yapılır.
* **`tree` (`#arena-canvas`):** Yalnızca Arena maçı başladığında aktif edilir (`paused = false`).

### Döngü Akışı (`SceneTree._loop`)
1. `requestAnimationFrame` üzerinden gelen `rawDelta` en fazla `0.05` saniyeye sınırlandırılır.
2. `paused === false` ise aktif kamera güncellenir (`activeCamera.updateCamera(rawDelta)`).
3. `hitstopTimer > 0` ise vuruş anı dondurulur; değilse `scaledDelta = rawDelta * timeScale` (`1x / 2x / 3x`) ile `root._propagateProcess(scaledDelta)` tüm düğüm ağacında `_process(delta)` çağırır.
4. **Görünmez Sekme Optimizasyonu:** `canvas.offsetParent !== null` kontrolü ile yalnızca ekranda görünür canvas'lar temizlenip `_propagateDraw(ctx)` çalıştırılır.
5. Kare sonunda `onFrameUpdate.emit(rawDelta)` tetiklenir (`main.js` bu sinyalle HUD can/stamina barlarını, seyirci coşkusunu ve taktik cooldown etiketlerini günceller).

### Düğüm Yaşam Döngüsü (`Node.js`)
* `parent.addChild(child)` çağrısı `tree` referansını alt ağaca yayar ve alt düğümlerde bir kez `_ready()` çalıştırır (`_propagateReady`).
* `ArenaScene._ready()` içinde takımlar oluşturulur, `enemies`/`allies` bağlanır, Y-derinlik sıralaması (`CombatRules.sortArenaChildren`) yapılır ve `ArenaRenderer.draw` ile çizilir.

---

## 3. Olay (Event) ve Yapay Zekâ Sistemi
* **Pub/Sub Event Sistemi (`Engine.Signal`):**
  * `signal.connect(callback, context)` ile dinleyici eklenir, `signal.emit(...args)` ile tetiklenir.
  * Başlıca sinyaller: `ArenaScene.onBattleLog`, `ArenaScene.onMatchFinished`, `Gladiator.onCombatEvent`, `Gladiator.onDied`, `Gladiator.onLog`, `SceneTree.onFrameUpdate`.
* **Sonlu Durum Makinesi (`Engine.StateMachine`):**
  * `Gladiator` içinde `this.fsm = new Engine.StateMachine('AI')` alt düğüm olarak yaşar.
  * Durumlar: `IDLE`, `APPROACH`, `WINDUP`, `ATTACK`, `RECOVER`, `BLOCK`, `RETREAT`, `HURT`, `STUNNED`, `DEAD`.
  * `transitionTo(name, data)` önceki durumun `exit()` metodunu ve yeni durumun `enter(data)` metodunu çalıştırır.

---

## 4. Kayıt (Persistence) & Test Mimarisi
* **Kayıt Sistemi (`LudusManager`):**
  * Durum `localStorage` üzerinde `ludus_arena_save_v1` anahtarıyla JSON olarak saklanır.
  * `loadFromLocalStorage()` ve `importSaveJSON()` sonrasında mutlaka `_migrateState()` çalışır.
* **Test Sistemi (`tests/*.test.js`):**
  * Harici test kütüphanesi yoktur; Node.js dahili `node:test` + `node:assert/strict` ve `node:vm` kullanılır.
  * Her test dosyası sanal bir `window` bağlamı (`vm.createContext`) kurarak ilgili `engine/`, `data/` ve `game/` dosyalarını sırayla yükler; bu sayede tarayıcı açmadan `Gladiator`, `ArenaScene` ve `LudusManager` deterministik olarak test edilir.
  * *Not:* `vm.createContext` içinde üretilen dizi/nesneler ana Node bağlamından farklı prototipe sahip olabileceğinden test assertion'larında `deepStrictEqual` yerine alan/uzunluk doğrulaması tercih edilir.
