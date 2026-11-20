# ⚔️ LUDUS ARENA — Proje Özeti ve AI Devir Teslim (Handoff) Dokümanı

**Repo:** `https://github.com/berkayimlanben-sudo/ludus-arena`  
**Mevcut Sürüm:** `v0.9.6` (Gladyatör Bağ Kurma, Favori Silahlar, Sadakat & Kişisel İstekler tamamlandı)  
**Hedef:** Sıfır kurulumlu, tarayıcıda (`file://`, Express statik sunucu ve GitHub Pages) çalışan **2D Side-View Auto-Battler + Ludus Management (Gladyatör Menajerlik)** web oyunu (*Domina* ve *Swords & Sandals* esintili).

---

## 1. Oyun Konsepti ve Temel Kurallar
* **Oynanış:** Oyuncu dövüşlerde karakteri klavyeyle yönetmez; **izleyici/yöneticidir (Lanista)**.
* **Yönetim Döngüsü:** Ludus binalarını geliştirir, gladyatör satın alır/eğitir, rakiplere göre ekipman (silah, kalkan, zırh, miğfer), dövüş stili ve maç öncesi tek kullanımlık eşya seçer, arenaya sürer. Maç sırasında saha kenarından 3 adet cooldown'lu taktik emri (`Bastır`, `Savunma`, `Moral Ver`) verebilir.
* **Görsel & Ses Yaklaşımı:** Harici resim/ses dosyası yoktur. Tüm karakterler, arenalar ve efektler HTML5 Canvas üzerinde çizilir (`game/renderers/`), sesler Web Audio API ile koddan sentezlenir (`game/SoundFX.js`).

---

## 2. Teknik Mimari ve Dosya Yapısı
* **Önemli Kural:** Proje **build aracı ve ES Module (`import/export`) KULLANMAZ**. Global namespace (`window.LudusEngine`, `window.LudusData`, `window.LudusGame`) ve IIFE modül yapısı kullanılır. Dosya adları büyük/küçük harfe duyarlıdır (Linux/GitHub Pages uyumu).
* **Mantık / Görünüm Ayrımı:** Savaş/yapay zeka mantığı (`Gladiator.js`, `ArenaScene.js`, `LudusScene.js`) çizim kodlarından (`game/renderers/`) tamamen ayrıdır; saf oyun kuralları `CombatRules.js`, `Phase7Rules.js`, `CareerRules.js`, `SenateRules.js` ve `BondingRules.js` içinde test edilebilir şekilde ayrıştırılmıştır.

### Klasör Ağacı
* `index.html` & `style.css`: Sekmeli yönetim arayüzü (`Ludus`, `Demirci`, `Pazar`, `Arena`) + Test paneli (`#dev-panel`) + 1v1/2v2 HUD + Roma Olay Kartı (`#roman-event-modal`) + oyun içi Onay Penceresi (`#confirm-modal`) + İmparatorluk Şampiyonu / NG+ penceresi (`#champion-modal`).
* `engine/` *(Godot'dan esinlenen çekirdek 2D mikro-motor)*:
  * `Signal.js`, `Node.js`, `Node2D.js`, `StateMachine.js`, `Camera2D.js`
  * `SceneTree.js`: `1x/2x/3x` hız, pause, hitstop ve gizli sekmelerdeki görünmez canvas çizimlerini atlama (`offsetParent !== null`) optimizasyonu.
* `data/`:
  * `Items.js`: Silahlar (`dagger`, `sword`, `spear`, `trident`, `mace`, `axe`), Kalkanlar (`none`, `parma`, `scutum`), Zırhlar (`tunic`, `leather`, `chain`, `plate`), Miğferler (`none`, `galea`, `corinthian`, `horned`) ve Arena Tüketilebilirleri (`CONSUMABLES`: `poison`, `net`, `potion`).
  * `LudusConfig.js`: `GLADIATOR_NAMES`, `ORIGINS`, `SKIN_TONES`, `FIGHT_STYLES`, `TRAITS`, `PERKS`, `ARENA_RULES`, `INJURIES`, `BUILDINGS`, `ARENA_TIERS`, `BOSSES`, `ROMAN_EVENTS` (5 karar odaklı olay kartı), `CAREER_REGIONS` (4 kariyer bölgesi), `IMPERIAL_TOURNAMENT` (3 final rakibi), `SENATORS` (Crassus, Tullius, Valeria) ve `SENATE_CONTRACT_TEMPLATES` (6 Senato kontratı).
* `game/renderers/`:
  * `GladiatorRenderer.js`: Sert/gölgeli 2D anatomik savaşçılar, ekipmanların görsel değişimi, boss pelerini/ölçeği (`1.18x`) ve `stun`, `slow` ile `poison` (yeşil zehir halkası + yükselen kabarcıklar) görselleri.
  * `ArenaRenderer.js`: 4 kariyer bölgesine (`capua`, `provincial`, `colosseum`, `imperial`) göre dinamik renk/atmosfer sunan Kolezyum arenası.
  * `LudusRenderer.js`: Revir, Demirci örsü ve Tahta Eğitim Kuklası (Palus) bulunan canlı avlu.
* `game/`:
  * `SoundFX.js`
  * `Particles.js`: Kan, kıvılcım, toz, yeşil zehir damlacıkları (`spawnPoison`) ve yüzen hasar/durum metinleri (`spawnText`).
  * `CombatRules.js`: Saf 2.5D şerit koordinatları (`getLaneY`), takım içi hedef dağıtımı (`selectBestTarget`), dost geçişli çarpışma itmesi (`computeOverlapPushX`) ve Y-derinlik sıralaması (`sortArenaChildren`).
  * `Phase7Rules.js`: Saf Doctore ve Roma Olay Kartı kuralları (`getDoctoreBonuses`, `canRetireAsDoctore`, `createDoctoreRecord`, `computeEffectiveXp`, `shouldTriggerRomanEvent`, `pickRomanEvent`, `resolveRomanEventChoice`).
  * `CareerRules.js`: Saf 4 bölgeli kariyer merdiveni, 3 maçlık İmparatorluk Turnuvası ve New Game+ taşıma kuralları.
  * `SenateRules.js`: Saf Senatör itibarları (`crassus`, `tullius`, `valeria`), günlük Senato kontratları ve şike/sabotaj çözümleme kuralları.
  * `BondingRules.js`: Saf gladyatör favori silahları (`+%6` hasar / `+%5` kritik), sadakat kademeleri (`Sadık Yürek`, `İsyankâr`), kişisel istek üretimi/takibi, bağlam duyarlı diyaloglar ve gecelik `%10` isyan riski kuralları.
  * `Gladiator.js`: Otonom AI `StateMachine`, çoklu hedefleme (`enemies`), yorgunluk/sakatlık/trait/perk hesapları, favori silah (`+%6` hasar / `+%5` kritik), sadakat (`Sadık Yürek` / `İsyankâr` -%10 hız & hasar), ağır silah Hyper-Armor, Hz-bağımsız hız sönümlemesi, buff/debuff'lar, sabotaj (`sabotaged`) ve şike (`bribeThrow`) ile tüketilebilir eşya tetikleyicileri.
  * `ArenaScene.js`: 1v1 ve 2v2 takım yönetimi, 2.5D şerit yerleşimi, dinamik kamera, bölge teması (`regionId`).
  * `LudusScene.js`: Ludus sekmesindeki canlı avlu ve eğitim animasyonları.
  * `LudusManager.js`: Ekonomi, kadro, binalar, günlük kontratlar, Senato kontratları & şike teklifleri, gladyatör bağ kurma (`talkToGladiator`, `giftWineToGladiator`, `assignPrivateQuarters`, `declineGladiatorRequest`, kişisel istekler, favori silahlar), kariyer bölgesi seçimi, turnuva akışı, `startNewGamePlus()`, `localStorage` + JSON Import/Export + `_migrateState()` + `🛠️ Test` geliştirici araçları (`devLowLoyalty`, `devNewRequest`, `devGenerateSenateContract`, `devSpawnBribeOffer` vb.).
  * `main.js`: Tüm UI render ve olay bağlantıları.
* `tests/` & Sunucu:
  * `tests/combat_rules.test.js` (5), `tests/phase7_rules.test.js` (4), `tests/bugs_balance.test.js` (7), `tests/career_rules.test.js` (4), `tests/senate_rules.test.js` (4) ve `tests/bonding_rules.test.js` (5) — toplam 29 adet `node:test` birim ve simülasyon testi (`npm test`).
  * `server.js` (Express v5 statik sunucu, `0.0.0.0:3000`).

---

## 3. Şu Ana Kadar Tamamlananlar (v0.1 → v0.9.6)
* ✅ **Faz 1–3:** Çekirdek motor, Side-View arena, ekipman & stat sistemi, Demirci/Pazar/Binalar, Save/Load.
* ✅ **Faz 4A & 4B:** Canlı Ludus avlusu eğitim animasyonları, 3 Lanista Taktik Emri, Trait & Sakatlıklar, karanlık/sert görsel revizyon, silah/kalkan debuff'ları, 5. Gün Bossları, `🛠️ Test` geliştirici paneli.
* ✅ **Faz 5:** Çoklu hedefleme altyapısı, 4 Dövüş Stili (*Dengeli, Baskıcı, Kontracı, Vur-Kaç*), Yorgunluk (Fatigue), Günlük Bakım Gideri, Ölümüne Maçlar (*Sine Missione* — kalıcı ölüm riski).
* ✅ **Faz 6 & v0.7.1:** 2v2 Takım Savaşları, XP & Seviye Atlama, 8 adet Perk Kartı (`pendingPerkChoices`), Özel Arena Kuralları (`no_shield`, `light_only`, `team_2v2`), 2v2 2.5D şerit ve arka saf geçiş düzeltmesi.
* ✅ **Faz 7 (v0.8):**
  * **Arena Tüketilebilir Eşyaları:** Demirci'den alınabilen ve Arena hazırlığında tek tık çipleri/seçici ile kuşanılan *Silah Zehri* (`poison`), *Gladyatör Ağı* (`net`) ve *Can Şurubu* (`potion`); Ludus ekranında çanta özeti (`⚔️ Arena'da Seç`).
  * **Ayrı Zehir Pasif Hasarı & Görseli:** *Silah Zehri* artık kanamadan bağımsız `poison` durumu uygular; her saniye yeşil `-4 ZEHİR` (`#51cf66`) yüzen sayı, yeşil parçacık/halka ve HUD'da `🐍` rozeti gösterir.
  * **Baş Eğitmen (*Doctore*) Sistemi:** `>= 10` zaferli gladyatör (kadroda en az 2 kişi varken) emekli edilip ekipmanı envantere döner; yeni çaylaklara kalıcı stat bonusu, +%25 XP ve -%10 eğitim indirimi sağlar.
  * **Rastgele Roma Olay Kartları:** `nextDay()` ile 3–4 günde bir çıkan 5 farklı karar modalı (`Asilzade Ziyafeti`, `Şehir Muhafızları Denetimi`, `Devrilen Tüccar Arabası`, `Yunan Hekim`, `Gölge Simyacı`).

* ✅ **Faz 8.1 (v0.9):**
  * **4 Bölgeli Kariyer Merdiveni:** *Capua Çukurları (0 Şöhret) → Eyalet Arenası (25) → Roma Kolezyumu (75) → İmparatorluk Turnuvası (150)*; bölgeye özel arena atmosferi (`ArenaRenderer`), ödül çarpanı ve bölge seçimi.
  * **3 Maçlık İmparatorluk Turnuvası:** Art arda *Valerius → Vespera → Commodus Primus*; turlar arası `+%15` soluklanma iyileşmesi, yenilgide kalıcı ölüm olmadan turnuva sıfırlanması ve final zaferinde `#champion-modal` taç töreni.
  * **Prestijli New Game+:** Şampiyonluk sonrası yeni döngüye geçerken ekstra başlangıç altını (`+120 × NG+`), varis gladyatöre kalıcı stat bonusu (`+2 × NG+`), Doctore mirası ve artan düşman/ödül çarpanı (`+%22` zorluk / `+%30` ödül).

* ✅ **Faz 8.2 (v0.9.5):**
  * **3 Roma Senatörü & Patronaj:** *Crassus* (Altın ödül bonusu), *Tullius* (Şöhret bonusu) ve *Valeria* (Şike risk azaltma & rüşvet artışı); toplam itibara bağlı günlük bakım indirimi (`-%8` / `-%15`).
  * **Günlük Senato Kontratları:** Kalkansız zafer, ağır silah, ölümüne maç, zehirli zafer, 22 sn altı hızlı zafer ve 2v2 görevleri; Arena'da kabul/reddet ve maç sonu otomatik ödül + itibar kazanımı.
  * **Şike & Sabotaj Teklifleri:** 1v1 maçlarda `throw_match` (bilerek yere düşüp büyük rüşvet alma) ve `sabotage_enemy` (rakibe -%25 can / -%20 güç-hız sabotajı); yakalanma riski ve skandal cezası mekaniği.

* ✅ **Bağ Kurma, Favori Silahlar & Kişisel İstekler (v0.9.6 — Mevcut):**
  * **Favori Silahlar:** Pazarda dahi görünen favori silah kuşanıldığında `+%6` Hasar ve `+%5` Kritik Şansı verir; diğer silahları cezalandırmaz.
  * **Sadakat (`0–100`) & İsyan Riski:** `75+` (`❤️ Sadık Yürek`) maçta 1 kez `%25` can altında `+10` Stamina ve `+5` Zırh tetikler; `25` altı (`⚠️ İsyankâr`) arenada `-%10` Hasar/Hız, eğitimde `+%15` maliyet ve gecede `%10` ihtimalle tüm kadroya `-6` moral düşüşü yaratır.
  * **Kişisel İstekler:** Revir/dinlenme → favori silah → üst seviye silah → favori silahla zafer öncelik sırası (10 zafer özgürlük/Doctore isteği asla çıkmaz).
  * **Günlük Ludus Jestleri & Diyalog:** Ücretsiz `🗣️ Sohbet Et`, `🍷 Şarap İkram Et (25 Altın)` ve kalıcı `🛏️ Özel Oda Tahsis Et (180 Altın)`.

---

## 4. ✅ Çözülen Sorunlar (v0.7.1 – v0.9.6)
* **2v2'de Arka Safın Beklemesi (`v0.7.1`):** `CombatRules.js` ile 2.5D şerit (`y = 348 / 370`), akıllı hedef dağıtımı ve dost geçişli çarpışma itmesi eklendi.
* **Ölümüne Maçların Iframe İçinde Açılmaması (`v0.8`):** `main.js` içindeki yerleşik `window.confirm()` çağrıları (ölümüne maç ve yeni oyun sıfırlaması) AI Studio iframe sandbox'ında sessizce `false` döndüğü için uygulama içi **`#confirm-modal`** penceresiyle değiştirildi.
* **Zehir Pasif Hasar Görünürlüğü & Eşya Kullanım Akışı (`v0.8`):** Zehir hasarı kanamadan ayrılıp yeşil `-4 ZEHİR` sayacına bağlandı; Arena hazırlığına tek tık seçim çipleri ve Ludus/Demirci yönlendirmeleri eklendi.
* **Gizli Sekme Canvas Yükü (`v0.8`):** `SceneTree._loop` görünmeyen canvaslarda yeniden çizimi atlar.
* **Savaş Fiziği, Denge & Ekonomi Düzeltmeleri (`v0.8`):**
  * Ağır silahlara (`weight >= 6`) geç `WINDUP`/`ATTACK` sırasında Hyper-Armor (kesintiye direnç) eklendi; hız sönümlemesi Hz bağımsız (`Math.pow(factor, dt * 60)`) hale getirildi.
  * Saldırı (`WINDUP`/`ATTACK`) sırasında hedef kilitleme ve 2v2 şerit kan zemini (`groundY`) düzeltildi.
  * Sakatlıkların gecede bedava silinmesi kaldırıldı (yalnızca Revir tedavisi veya aç olmayan kadroda Revir Sv.2+ ile şansla iyileşme) ve açlık + tek gladyatör `<%25` HP softlock engeli eklendi.
  * Çoklu seviye atlamada perk kuyruğu (`pendingPerkCount`), Mevcut Doctore üzerine yazma onayı (`#confirm-modal`), `getGladiatorSummary` stil hız bonusu ve düşman/Boss stil + perk üretimi/keşif etiketleri eklendi.
* **Şike Teklifi Çiftleşme Düzeltmesi (`v0.9.5`):** `devSpawnBribeOffer()` çağrısı mevcut aktif şike tekliflerini temizleyip ön ödemeyi iade ederek aynı anda iki teklifin çıkmasını engeller.

---

## 5. Kalan Yol Haritası (Sıradaki Fazlar)
* **Faz 8.3 (v1.0) — Son Cila:**
  * Menülere mini ikonlar, opsiyonel gerçek sesler/efektler, Test panelini ayarlardan aç/kapa ayarı.

---

## 6. Yeni AI İçin Çalışma Kuralları
1. Her zaman `window.LudusEngine / LudusData / LudusGame` yapısını koru; `import/export` kullanma.
2. Mevcut oyuncuların `localStorage` kaydının bozulmaması için yeni eklenen gladyatör/oyun alanlarını `LudusManager._migrateState()` içinde mutlaka varsayılan değerle doldur.
3. Görsel değişiklikleri mümkün olduğunca `game/renderers/` içine izole et.
4. Tarayıcı iframe engeli nedeniyle asla `window.alert`, `window.confirm` veya `window.open` kullanma; onaylar için mevcut `#confirm-modal` yapısını kullan.
5. Gladyatör kişisel isteklerinde **asla** "10 zaferde özgürlük (Rudis)" veya "Doctore olma" isteği üretme (oyuncu özgürlüğü ve tercih doğrultusu korunur).
6. Değişiklik sonrası `npm test` (`29/29` test) ve `npm run lint` doğrulamalarını mutlaka çalıştır.

