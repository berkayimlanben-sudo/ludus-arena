# ⚔️ LUDUS ARENA — Proje Özeti ve AI Devir Teslim (Handoff) Dokümanı

**Repo:** `https://github.com/berkayimlanben-sudo/ludus-arena`  
**Mevcut Sürüm:** `v0.9.8` (Seyirci Coşkusu *Sparsio* & İmparatorun Başparmağı *Pollice Verso* tamamlandı)  
**AI & Mimari Rehberleri:** Teknik kurallar için `AGENTS.md`, motor/döngü mimarisi için `ARCHITECTURE.md` dosyalarına bak.  
**Hedef:** Sıfır kurulumlu, tarayıcıda (`file://`, Express statik sunucu ve GitHub Pages) çalışan **2D Side-View Auto-Battler + Ludus Management (Gladyatör Menajerlik)** web oyunu (*Domina* ve *Swords & Sandals* esintili).

---

## 1. Oyun Konsepti ve Temel Kurallar
* **Oynanış:** Oyuncu dövüşlerde karakteri klavyeyle yönetmez; **izleyici/yöneticidir (Lanista)**.
* **Yönetim Döngüsü:** Ludus binalarını geliştirir, gladyatör satın alır/eğitir, rakiplere göre ekipman (silah, kalkan, zırh, miğfer), dövüş stili ve maç öncesi tek kullanımlık eşya seçer, arenaya sürer. Maç sırasında saha kenarından 3 adet cooldown'lu taktik emri (`Bastır`, `Savunma`, `Moral Ver`) verebilir.
* **Görsel & Ses Yaklaşımı:** Harici resim/ses dosyası yoktur. Tüm karakterler, arenalar ve efektler HTML5 Canvas üzerinde çizilir (`game/renderers/`), sesler Web Audio API ile koddan sentezlenir (`game/SoundFX.js`).

---

## 2. Teknik Mimari ve Dosya Yapısı
* **Önemli Kural:** Proje **build aracı ve ES Module (`import/export`) KULLANMAZ**. Global namespace (`window.LudusEngine`, `window.LudusData`, `window.LudusGame`) ve IIFE modül yapısı kullanılır. Dosya adları büyük/küçük harfe duyarlıdır (Linux/GitHub Pages uyumu).
* **Mantık / Görünüm Ayrımı:** Savaş/yapay zeka mantığı (`Gladiator.js`, `ArenaScene.js`, `LudusScene.js`) çizim kodlarından (`game/renderers/`) tamamen ayrıdır; saf oyun kuralları `CombatRules.js`, `CrowdRules.js`, `Phase7Rules.js`, `CareerRules.js`, `SenateRules.js`, `BondingRules.js` ve `RelationAndBetRules.js` içinde test edilebilir şekilde ayrıştırılmıştır.

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
  * `ArenaRenderer.js`: 4 kariyer bölgesine (`capua`, `provincial`, `colosseum`, `imperial`) göre dinamik renk/atmosfer sunan Kolezyum arenası, İmparator Locası (*Imperial Box*) silueti ve yüksek coşkuda (`60+`) altın tribün kıvılcımları.
  * `LudusRenderer.js`: Revir, Demirci örsü ve Tahta Eğitim Kuklası (Palus) bulunan canlı avlu.
* `game/`:
  * `SoundFX.js`
  * `Particles.js`: Kan, kıvılcım, toz, yeşil zehir damlacıkları (`spawnPoison`) ve yüzen hasar/durum metinleri (`spawnText`).
  * `CombatRules.js`: Saf 2.5D şerit koordinatları (`getLaneY`), takım içi hedef dağıtımı (`selectBestTarget`), dost geçişli çarpışma itmesi (`computeOverlapPushX`) ve Y-derinlik sıralaması (`sortArenaChildren`).
  * `CrowdRules.js`: Saf seyirci coşkusu (`0–100`), olay bazlı favori artışı (`hit`/`crit`/`block`/`ko`/taktikler), *Sparsio* zafer bahşişi çarpanları ve ölümüne maçlarda *Pollice Verso* (İmparator merhameti) olasılık/çözüm kuralları.
  * `Phase7Rules.js`: Saf Doctore ve Roma Olay Kartı kuralları (`getDoctoreBonuses`, `canRetireAsDoctore`, `createDoctoreRecord`, `computeEffectiveXp`, `shouldTriggerRomanEvent`, `pickRomanEvent`, `resolveRomanEventChoice`).
  * `CareerRules.js`: Saf 4 bölgeli kariyer merdiveni, 3 maçlık İmparatorluk Turnuvası ve New Game+ taşıma kuralları.
  * `SenateRules.js`: Saf Senatör itibarları (`crassus`, `tullius`, `valeria`), günlük Senato kontratları ve şike/sabotaj çözümleme kuralları.
  * `BondingRules.js`: Saf gladyatör favori silahları (`+%6` hasar / `+%5` kritik), sadakat kademeleri (`Sadık Yürek`, `İsyankâr`), kişisel istek üretimi/takibi, bağlam duyarlı diyaloglar ve gecelik `%10` isyan riski kuralları.
  * `RelationAndBetRules.js`: Saf ikili yoldaşlık/rekabet (`RelationRules`: `-100..+100`, `Silah Kardeşi` / `Rakip`, 2v2 sinerjisi, avlu gecelik etkileşimleri) ve Arena Bahis Sistemi (`BettingRules`: dinamik güç oranı, *Zafer* ve *<20sn Hızlı Zafer* bahisleri) kuralları.
  * `Gladiator.js`: Otonom AI `StateMachine`, çoklu hedefleme (`enemies`), yorgunluk/sakatlık/trait/perk hesapları, favori silah (`+%6` hasar / `+%5` kritik), 2v2 takım sinerjisi (`allySynergy`), sadakat (`Sadık Yürek` / `İsyankâr` -%10 hız & hasar), ağır silah Hyper-Armor, Hz-bağımsız hız sönümlemesi, buff/debuff'lar, `onCombatEvent` sinyali, sabotaj (`sabotaged`) ve şike (`bribeThrow`) ile tüketilebilir eşya tetikleyicileri.
  * `ArenaScene.js`: 1v1 ve 2v2 takım yönetimi, 2.5D şerit yerleşimi, dinamik kamera, bölge teması (`regionId`), canlı `crowdFavor` sayacı (`peakCrowdFavor`, kademe duyuruları) ve 2v2 sinerji savaş kaydı duyurusu.
  * `LudusScene.js`: Ludus sekmesindeki canlı avlu ve eğitim animasyonları.
  * `LudusManager.js`: Ekonomi, kadro, binalar, günlük kontratlar, Senato kontratları & şike teklifleri, gladyatör bağ kurma (`talkToGladiator`, `giftWineToGladiator`, `assignPrivateQuarters`, `declineGladiatorRequest`), ortak talim (`sparTogether`), Arena bahisleri (`getMatchOdds`, `placeMatchBet`), *Sparsio* bahşişleri & *Pollice Verso* merhamet çözümü (`crowdStats`), kariyer bölgesi seçimi, turnuva akışı, `startNewGamePlus()`, `localStorage` + JSON Import/Export + `_migrateState()` + `🛠️ Test` geliştirici araçları.
  * `main.js`: Tüm UI render ve olay bağlantıları.
* `tests/` & Sunucu:
  * `tests/combat_rules.test.js` (5), `tests/phase7_rules.test.js` (4), `tests/bugs_balance.test.js` (7), `tests/career_rules.test.js` (4), `tests/senate_rules.test.js` (4), `tests/bonding_rules.test.js` (5), `tests/relation_bet_rules.test.js` (4) ve `tests/crowd_rules.test.js` (4) — toplam 37 adet `node:test` birim ve simülasyon testi (`npm test`).
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

* ✅ **Bağ Kurma, Favori Silahlar & Kişisel İstekler (v0.9.6):**
  * **Favori Silahlar:** Pazarda dahi görünen favori silah kuşanıldığında `+%6` Hasar ve `+%5` Kritik Şansı verir; diğer silahları cezalandırmaz.
  * **Sadakat (`0–100`) & İsyan Riski:** `75+` (`❤️ Sadık Yürek`) maçta 1 kez `%25` can altında `+10` Stamina ve `+5` Zırh tetikler; `25` altı (`⚠️ İsyankâr`) arenada `-%10` Hasar/Hız, eğitimde `+%15` maliyet ve gecede `%10` ihtimalle tüm kadroya `-6` moral düşüşü yaratır.
  * **Kişisel İstekler:** Revir/dinlenme → favori silah → üst seviye silah → favori silahla zafer öncelik sırası (10 zafer özgürlük/Doctore isteği asla çıkmaz).
  * **Günlük Ludus Jestleri & Diyalog:** Ücretsiz `🗣️ Sohbet Et`, `🍷 Şarap İkram Et (25 Altın)` ve kalıcı `🛏️ Özel Oda Tahsis Et (180 Altın)`.

* ✅ **Yoldaşlık/Rekabet & Arena Bahis Sistemi (v0.9.7):**
  * **Gladyatörler Arası Yoldaşlık & Rekabet:** Kadrodaki gladyatörler arasında `-100..+100` ilişki puanı; `⚔️ Birlikte Talim` günlük aksiyonu (`+6/+8` ilişki, `+15 XP`), gecelik avlu etkileşimleri ve `2v2` maçlarda aktif sinerji (`⚔️ Silah Kardeşi` `+%6` hasar & `+3` zırh, `🤝 Uyumlu` `+%3` hasar, `⚡ Rakip` `+%5` kritik & `-3` zırh).
  * **Arena Bahis Sistemi:** Maç öncesi dinamik güç karşılaştırmasına göre canlı oranlar (`1.30x–2.95x` Zafer Bahsi, `2.05x–4.35x` `<20sn` Hızlı Zafer Bahsi), `25/50/100 Altın` bahis seçimi, şike (`throw_match`) ile kendi galibiyetine bahis engelleyici ve maç sonu otomatik kupon ödemesi.

* ✅ **Seyirci Coşkusu & İmparatorun Başparmağı — *Pollice Verso* (v0.9.8 — Mevcut):**
  * **Canlı Seyirci Coşkusu (`0–100`):** Arena HUD üzerinde canlı coşku barı; vuruş (`+4`), kritik (`+14`), blok (`+8`), `%30` can altı geri dönüş (`+5`), nakavt (`+18`) ve `MORAL VER!` (`+22`) ile yükselir, zamanla yavaşça soğur (`-1.4/sn`). `crowd_favorite` özelliği `1.25x` çarpan sağlar.
  * **Sparsio (Seyirci Bahşişi):** `30+` (*İlgili Kalabalık*, `+%8` Altın / `+2` Şöhret), `60+` (*Coşkulu Arena*, `+%18` / `+5`) ve `85+` (*Çılgın Kitle*, `+%30` / `+10`) kademelerinde galibiyet ödülüne ek bahşiş kazandırır.
  * **Pollice Verso (*Missio* / Merhamet):** Ölümüne maçlarda kaybeden gladyatörün coşku seviyesi (`%15`/`%32`/`%50`), `crowd_favorite` (`+%12`) ve Senatör Tullius itibarı (maks `+%10`, tavan `%75`) ile İmparatorun başparmağını yukarı kaldırma (`👍 MISSIO!`) şansı doğar; bağışlanan savaşçı `1 Can`, sakatlık ve `+15 Sadakat` ile hayatta kalır (şike ile bilerek yenilmede merhamet çalışmaz).
  * **Arena Görsel Atmosferi:** Ölümüne maçlarda, Kolezyum/İmparatorluk arenasında veya coşku `60+` iken kemer üstünde İmparator Locası (*Imperial Box*) silueti ve tribünlerde altın kıvılcımlar belirir.

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

## 5. Kalan Yol Haritası (Planlı Fazlar & İleri Backlog)
* **Sıradaki Planlı Fazlar:**
  * **Faz 9.1 — Rakip Ludus'lar & Kan Davası (*Nemesis* Sistemi):** Şehrin rakip okulları, ölümüne maçlarda eski gladyatörünü deviren düşmanların isimlenip güçlenmesi, intikam odaklı kan davası düelloları ve ekstra ödüller.
  * **Faz 9.2 — Demirci Ustalığı (Silah Bileyi) & Gezici Kervan (*Mercator*):** Demirci binası seviyesine bağlı silah bileyleme/geliştirme (+Hasar / +Kritik) ve nadir günlere özel indirimli/özel eşya sunan gezici tüccar kervanı.
  * **Faz 10 (v1.0) — Son Cila:** Menülere mini ikonlar, opsiyonel ses efektleri/müzik dokunuşları ve Test panelini ayarlardan aç/kapa ayarı.
* **İleride / Opsiyonel Eklenebilecekler (Backlog):**
  * **Vahşi Hayvanlar (*Venatio*) & Arena Tuzakları:** Arenaya aslan/kurt/ayı gibi özel yapay zekâlı vahşi hayvanların ve zemin tuzaklarının eklenmesi.

---

## 6. Yeni AI İçin Çalışma Kuralları
1. Her zaman `window.LudusEngine / LudusData / LudusGame` yapısını koru; `import/export` kullanma.
2. Mevcut oyuncuların `localStorage` kaydının bozulmaması için yeni eklenen gladyatör/oyun alanlarını `LudusManager._migrateState()` içinde mutlaka varsayılan değerle doldur.
3. Görsel değişiklikleri mümkün olduğunca `game/renderers/` içine izole et.
4. Tarayıcı iframe engeli nedeniyle asla `window.alert`, `window.confirm` veya `window.open` kullanma; onaylar için mevcut `#confirm-modal` yapısını kullan.
5. Gladyatör kişisel isteklerinde **asla** "10 zaferde özgürlük (Rudis)" veya "Doctore olma" isteği üretme (oyuncu özgürlüğü ve tercih doğrultusu korunur).
6. Değişiklik sonrası `npm test` (`37/37` test) ve `npm run lint` doğrulamalarını mutlaka çalıştır.

