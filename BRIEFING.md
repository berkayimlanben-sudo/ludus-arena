# ⚔️ LUDUS ARENA — Proje Özeti ve AI Devir Teslim (Handoff) Dokümanı

**Repo:** `https://github.com/berkayimlanben-sudo/ludus-arena`  
**Mevcut Sürüm:** `v0.8` (Faz 7 — Tüketilebilir Eşyalar, Doctore, Roma Olay Kartları & Oynanış/UI İyileştirmeleri tamamlandı)  
**Hedef:** Sıfır kurulumlu, tarayıcıda (`file://`, Express statik sunucu ve GitHub Pages) çalışan **2D Side-View Auto-Battler + Ludus Management (Gladyatör Menajerlik)** web oyunu (*Domina* ve *Swords & Sandals* esintili).

---

## 1. Oyun Konsepti ve Temel Kurallar
* **Oynanış:** Oyuncu dövüşlerde karakteri klavyeyle yönetmez; **izleyici/yöneticidir (Lanista)**.
* **Yönetim Döngüsü:** Ludus binalarını geliştirir, gladyatör satın alır/eğitir, rakiplere göre ekipman (silah, kalkan, zırh, miğfer), dövüş stili ve maç öncesi tek kullanımlık eşya seçer, arenaya sürer. Maç sırasında saha kenarından 3 adet cooldown'lu taktik emri (`Bastır`, `Savunma`, `Moral Ver`) verebilir.
* **Görsel & Ses Yaklaşımı:** Harici resim/ses dosyası yoktur. Tüm karakterler, arenalar ve efektler HTML5 Canvas üzerinde çizilir (`game/renderers/`), sesler Web Audio API ile koddan sentezlenir (`game/SoundFX.js`).

---

## 2. Teknik Mimari ve Dosya Yapısı
* **Önemli Kural:** Proje **build aracı ve ES Module (`import/export`) KULLANMAZ**. Global namespace (`window.LudusEngine`, `window.LudusData`, `window.LudusGame`) ve IIFE modül yapısı kullanılır. Dosya adları büyük/küçük harfe duyarlıdır (Linux/GitHub Pages uyumu).
* **Mantık / Görünüm Ayrımı:** Savaş/yapay zeka mantığı (`Gladiator.js`, `ArenaScene.js`, `LudusScene.js`) çizim kodlarından (`game/renderers/`) tamamen ayrıdır; saf oyun kuralları `CombatRules.js` ve `Phase7Rules.js` içinde test edilebilir şekilde ayrıştırılmıştır.

### Klasör Ağacı
* `index.html` & `style.css`: Sekmeli yönetim arayüzü (`Ludus`, `Demirci`, `Pazar`, `Arena`) + Test paneli (`#dev-panel`) + 1v1/2v2 HUD + Roma Olay Kartı (`#roman-event-modal`) + oyun içi Onay Penceresi (`#confirm-modal`).
* `engine/` *(Godot'dan esinlenen çekirdek 2D mikro-motor)*:
  * `Signal.js`, `Node.js`, `Node2D.js`, `StateMachine.js`, `Camera2D.js`
  * `SceneTree.js`: `1x/2x/3x` hız, pause, hitstop ve gizli sekmelerdeki görünmez canvas çizimlerini atlama (`offsetParent !== null`) optimizasyonu.
* `data/`:
  * `Items.js`: Silahlar (`dagger`, `sword`, `spear`, `trident`, `mace`, `axe`), Kalkanlar (`none`, `parma`, `scutum`), Zırhlar (`tunic`, `leather`, `chain`, `plate`), Miğferler (`none`, `galea`, `corinthian`, `horned`) ve Arena Tüketilebilirleri (`CONSUMABLES`: `poison`, `net`, `potion`).
  * `LudusConfig.js`: `FIGHT_STYLES`, `TRAITS`, `PERKS`, `ARENA_RULES`, `INJURIES`, `BUILDINGS`, `ARENA_TIERS`, `BOSSES`, `ROMAN_EVENTS` (5 karar odaklı Roma olay kartı).
* `game/renderers/`:
  * `GladiatorRenderer.js`: Sert/gölgeli 2D anatomik savaşçılar, ekipmanların görsel değişimi, boss pelerini/ölçeği (`1.18x`) ve `stun`, `slow` ile `poison` (yeşil zehir halkası + yükselen kabarcıklar) görselleri.
  * `ArenaRenderer.js`: Karanlık, meşaleli, kan izli Kolezyum arenası.
  * `LudusRenderer.js`: Revir, Demirci örsü ve Tahta Eğitim Kuklası (Palus) bulunan canlı avlu.
* `game/`:
  * `SoundFX.js`
  * `Particles.js`: Kan, kıvılcım, toz, yeşil zehir damlacıkları (`spawnPoison`) ve yüzen hasar/durum metinleri (`spawnText`).
  * `CombatRules.js`: Saf 2.5D şerit koordinatları (`getLaneY`), takım içi hedef dağıtımı (`selectBestTarget`), dost geçişli çarpışma itmesi (`computeOverlapPushX`) ve Y-derinlik sıralaması (`sortArenaChildren`).
  * `Phase7Rules.js`: Saf Doctore ve Roma Olay Kartı kuralları (`getDoctoreBonuses`, `canRetireAsDoctore`, `createDoctoreRecord`, `computeEffectiveXp`, `shouldTriggerRomanEvent`, `pickRomanEvent`, `resolveRomanEventChoice`).
  * `Gladiator.js`: Otonom AI `StateMachine`, çoklu hedefleme (`enemies`), yorgunluk/sakatlık/trait/perk hesapları, buff/debuff'lar (`bleed`, `poison` [saniyede `-4 ZEHİR` yeşil yüzen sayı + `🐍` HUD etiketi], `stun`, `slow`, `armorBreak`, `thorns`, `lifestam`, `pierce`) ve tüketilebilir eşya tetikleyicileri (`poison`, `net`, `potion`).
  * `ArenaScene.js`: 1v1 ve 2v2 takım yönetimi, 2.5D şerit yerleşimi, dinamik kamera.
  * `LudusScene.js`: Ludus sekmesindeki canlı avlu ve eğitim animasyonları.
  * `LudusManager.js`: Ekonomi, kadro, binalar, günlük kontratlar, `consumeArenaItem()`, `retireAsDoctore()`, `resolveRomanEvent()`, `localStorage` (`ludus_arena_save_v1`) + JSON Import/Export + `_migrateState()` (`v0.7 → v0.8` geriye dönük uyumlu) + `🛠️ Test` hile metodları (`+10 Zafer` ve `Olay Kartı` dahil).
  * `main.js`: Tüm UI render ve olay bağlantıları (Arena tüketilebilir hızlı seçim çipleri, Ludus çanta eşyası çubuğu, Doctore kartı, Roma olay modalı, `#confirm-modal`).
* `tests/` & Sunucu:
  * `tests/combat_rules.test.js` (5 test), `tests/phase7_rules.test.js` (4 test) ve `tests/bugs_balance.test.js` (7 test) — toplam 16 adet `node:test` birim ve simülasyon testi (`npm test`).
  * `server.js` (Express v5 statik sunucu, `0.0.0.0:3000`).

---

## 3. Şu Ana Kadar Tamamlananlar (v0.1 → v0.8)
* ✅ **Faz 1–3:** Çekirdek motor, Side-View arena, ekipman & stat sistemi, Demirci/Pazar/Binalar, Save/Load.
* ✅ **Faz 4A & 4B:** Canlı Ludus avlusu eğitim animasyonları, 3 Lanista Taktik Emri, Trait & Sakatlıklar, karanlık/sert görsel revizyon, silah/kalkan debuff'ları, 5. Gün Bossları, `🛠️ Test` geliştirici paneli.
* ✅ **Faz 5:** Çoklu hedefleme altyapısı, 4 Dövüş Stili (*Dengeli, Baskıcı, Kontracı, Vur-Kaç*), Yorgunluk (Fatigue), Günlük Bakım Gideri, Ölümüne Maçlar (*Sine Missione* — kalıcı ölüm riski).
* ✅ **Faz 6 & v0.7.1:** 2v2 Takım Savaşları, XP & Seviye Atlama, 8 adet Perk Kartı (`pendingPerkChoices`), Özel Arena Kuralları (`no_shield`, `light_only`, `team_2v2`), 2v2 2.5D şerit ve arka saf geçiş düzeltmesi.
* ✅ **Faz 7 (v0.8 — Mevcut):**
  * **Arena Tüketilebilir Eşyaları:** Demirci'den alınabilen ve Arena hazırlığında tek tık çipleri/seçici ile kuşanılan *Silah Zehri* (`poison`), *Gladyatör Ağı* (`net`) ve *Can Şurubu* (`potion`); Ludus ekranında çanta özeti (`⚔️ Arena'da Seç`).
  * **Ayrı Zehir Pasif Hasarı & Görseli:** *Silah Zehri* artık kanamadan bağımsız `poison` durumu uygular; her saniye yeşil `-4 ZEHİR` (`#51cf66`) yüzen sayı, yeşil parçacık/halka ve HUD'da `🐍` rozeti gösterir.
  * **Baş Eğitmen (*Doctore*) Sistemi:** `>= 10` zaferli gladyatör (kadroda en az 2 kişi varken) emekli edilip ekipmanı envantere döner; yeni çaylaklara kalıcı stat bonusu, +%25 XP ve -%10 eğitim indirimi sağlar.
  * **Rastgele Roma Olay Kartları:** `nextDay()` ile 3–4 günde bir çıkan 5 farklı karar modalı (`Asilzade Ziyafeti`, `Şehir Muhafızları Denetimi`, `Devrilen Tüccar Arabası`, `Yunan Hekim`, `Gölge Simyacı`).

---

## 4. ✅ Çözülen Sorunlar (v0.7.1 – v0.8)
* **2v2'de Arka Safın Beklemesi (`v0.7.1`):** `CombatRules.js` ile 2.5D şerit (`y = 348 / 370`), akıllı hedef dağıtımı ve dost geçişli çarpışma itmesi eklendi.
* **Ölümüne Maçların Iframe İçinde Açılmaması (`v0.8`):** `main.js` içindeki yerleşik `window.confirm()` çağrıları (ölümüne maç ve yeni oyun sıfırlaması) AI Studio iframe sandbox'ında sessizce `false` döndüğü için uygulama içi **`#confirm-modal`** penceresiyle değiştirildi.
* **Zehir Pasif Hasar Görünürlüğü & Eşya Kullanım Akışı (`v0.8`):** Zehir hasarı kanamadan ayrılıp yeşil `-4 ZEHİR` sayacına bağlandı; Arena hazırlığına tek tık seçim çipleri ve Ludus/Demirci yönlendirmeleri eklendi.
* **Gizli Sekme Canvas Yükü (`v0.8`):** `SceneTree._loop` görünmeyen canvaslarda yeniden çizimi atlar.
* **Savaş Fiziği, Denge & Ekonomi Düzeltmeleri (`v0.8`):**
  * Ağır silahlara (`weight >= 6`) geç `WINDUP`/`ATTACK` sırasında Hyper-Armor (kesintiye direnç) eklendi; hız sönümlemesi Hz bağımsız (`Math.pow(factor, dt * 60)`) hale getirildi.
  * Saldırı (`WINDUP`/`ATTACK`) sırasında hedef kilitleme ve 2v2 şerit kan zemini (`groundY`) düzeltildi.
  * Sakatlıkların gecede bedava silinmesi kaldırıldı (yalnızca Revir tedavisi veya aç olmayan kadroda Revir Sv.2+ ile şansla iyileşme) ve açlık + tek gladyatör `<%25` HP softlock engeli eklendi.
  * Çoklu seviye atlamada perk kuyruğu (`pendingPerkCount`), Mevcut Doctore üzerine yazma onayı (`#confirm-modal`), `getGladiatorSummary` stil hız bonusu ve düşman/Boss stil + perk üretimi/keşif etiketleri eklendi.

---

## 5. Kalan Yol Haritası (Sıradaki Fazlar)
* **Faz 8 (v1.0) — Kariyer Merdiveni, Senatörler & Final:**
  * 4 Bölgeli ilerleyiş (*Capua Çukurları → Eyalet Arenası → Roma Kolezyumu → 3 maçlık İmparatorluk Turnuvası* + Prestijli **New Game+**).
  * Senatör kontratları ve şike teklifleri.
  * Son cila (menülere mini ikonlar, opsiyonel gerçek sesler, Test panelini aç/kapa ayarı).

---

## 6. Yeni AI İçin Çalışma Kuralları
1. Her zaman `window.LudusEngine / LudusData / LudusGame` yapısını koru; `import/export` kullanma.
2. Mevcut oyuncuların `localStorage` kaydının bozulmaması için yeni eklenen gladyatör/oyun alanlarını `LudusManager._migrateState()` içinde mutlaka varsayılan değerle doldur.
3. Görsel değişiklikleri mümkün olduğunca `game/renderers/` içine izole et.
4. Tarayıcı iframe engeli nedeniyle asla `window.alert`, `window.confirm` veya `window.open` kullanma; onaylar için mevcut `#confirm-modal` yapısını kullan.

