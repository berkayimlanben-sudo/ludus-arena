# ⚔️ LUDUS ARENA — Proje Özeti ve AI Devir Teslim (Handoff) Dokümanı

**Repo:** `https://github.com/berkayimlanben-sudo/ludus-arena`  
**Mevcut Sürüm:** `v0.7` (Faz 6 tamamlandı)  
**Hedef:** Sıfır kurulumlu, tarayıcıda (`file://` ve GitHub Pages) çalışan **2D Side-View Auto-Battler + Ludus Management (Gladyatör Menajerlik)** web oyunu (*Domina* ve *Swords & Sandals* esintili).

---

## 1. Oyun Konsepti ve Temel Kurallar
* **Oynanış:** Oyuncu dövüşlerde karakteri klavyeyle yönetmez; **izleyici/yöneticidir (Lanista)**.
* **Yönetim Döngüsü:** Ludus binalarını geliştirir, gladyatör satın alır/eğitir, rakiplere göre ekipman (silah, kalkan, zırh, miğfer) ve dövüş stili seçer, arenaya sürer. Maç sırasında sadece saha kenarından 3 adet cooldown'lu taktik emri (`Bastır`, `Savunma`, `Moral Ver`) verebilir.
* **Görsel & Ses Yaklaşımı:** Harici resim/ses dosyası yoktur. Tüm karakterler, arenalar ve efektler HTML5 Canvas üzerinde çizilir (`game/renderers/`), sesler Web Audio API ile koddan sentezlenir (`game/SoundFX.js`).

---

## 2. Teknik Mimari ve Dosya Yapısı
* **Önemli Kural:** Proje **build aracı ve ES Module (`import/export`) KULLANMAZ**. Hem bilgisayarda `index.html`'e çift tıklayınca (`file://`) hem de GitHub Pages'te sorunsuz çalışması için global namespace (`window.LudusEngine`, `window.LudusData`, `window.LudusGame`) ve IIFE modül yapısı kullanılır. Dosya adları büyük/küçük harfe duyarlıdır (Linux/GitHub Pages uyumu).
* **Mantık / Görünüm Ayrımı:** Savaş/yapay zeka mantığı (`Gladiator.js`, `ArenaScene.js`, `LudusScene.js`) çizim kodlarından (`game/renderers/`) tamamen ayrıdır.

### Klasör Ağacı
* `index.html` & `style.css`: Sekmeli yönetim arayüzü (`Ludus`, `Demirci`, `Pazar`, `Arena`) + Test paneli (`#dev-panel`) + 1v1/2v2 HUD.
* `engine/` *(Godot'dan esinlenen çekirdek 2D mikro-motor)*:
  * `Signal.js`, `Node.js`, `Node2D.js`, `StateMachine.js`, `Camera2D.js`, `SceneTree.js` (1x/2x/3x hız, pause ve hitstop desteği).
* `data/`:
  * `Items.js`: Silahlar (`dagger`, `sword`, `spear`, `trident`, `mace`, `axe`), Kalkanlar (`none`, `parma`, `scutum`), Zırhlar (`tunic`, `leather`, `chain`, `plate`), Miğferler (`none`, `galea`, `corinthian`, `horned`). Her birinde ağırlık, zırh delme, kritik ve özel `effect` tanımları vardır.
  * `LudusConfig.js`: `FIGHT_STYLES`, `TRAITS`, `PERKS`, `ARENA_RULES`, `INJURIES`, `BUILDINGS`, `ARENA_TIERS`, `BOSSES`.
* `game/renderers/`:
  * `GladiatorRenderer.js`: Sert/gölgeli 2D anatomik savaşçılar, ekipmanların görsel değişimi, boss pelerini/ölçeği (`1.18x`) ve stun/slow efektleri.
  * `ArenaRenderer.js`: Karanlık, meşaleli, kan izli Kolezyum arenası.
  * `LudusRenderer.js`: Revir, Demirci örsü ve Tahta Eğitim Kuklası (Palus) bulunan canlı avlu.
* `game/`:
  * `SoundFX.js`, `Particles.js`
  * `Gladiator.js`: Otonom AI `StateMachine`, çoklu hedefleme (`enemies`), yorgunluk/sakatlık/trait/perk hesapları, buff/debuff'lar (`bleed`, `stun`, `slow`, `armorBreak`, `thorns`, `lifestam`, `pierce`).
  * `ArenaScene.js`: 1v1 ve 2v2 takım yönetimi, dinamik kamera.
  * `LudusScene.js`: Ludus sekmesindeki canlı avlu ve eğitim animasyonları.
  * `LudusManager.js`: Ekonomi, kadro, binalar, günlük kontratlar, `localStorage` (`ludus_arena_save_v1`) + JSON Import/Export + `_migrateState()` + `🛠️ Test` hile metodları.
  * `main.js`: Tüm UI render ve olay bağlantıları.

---

## 3. Şu Ana Kadar Tamamlananlar (v0.1 → v0.7)
* ✅ **Faz 1–3:** Çekirdek motor, Side-View arena, ekipman & stat sistemi, Demirci/Pazar/Binalar, Save/Load.
* ✅ **Faz 4A & 4B:** Canlı Ludus avlusu eğitim animasyonları, 3 Lanista Taktik Emri, Trait & Sakatlıklar, karanlık/sert görsel revizyon, silah/kalkan debuff'ları, 5. Gün Bossları, `🛠️ Test` geliştirici paneli.
* ✅ **Faz 5:** Çoklu hedefleme altyapısı, 4 Dövüş Stili (*Dengeli, Baskıcı, Kontracı, Vur-Kaç*), Yorgunluk (Fatigue), Günlük Bakım Gideri, Ölümüne Maçlar (*Sine Missione* — kalıcı ölüm riski).
* ✅ **Faz 6 (Mevcut):** 2v2 Takım Savaşları, XP & Seviye Atlama, 8 adet Perk Kartı (`pendingPerkChoices` ile seçim), Özel Arena Kuralları (`no_shield`, `light_only`, `team_2v2`), Test paneline `+100 XP` ve `2v2 Kontrat Aç` eklendi.

---

## 4. Bilinen Sorun (İlk Çözülecek Konu): 2v2'de Arka Safın Beklemesi
* **Sorun:** 2v2 maçlarda aynı takımdaki iki gladyatör arka arkaya diziliyor; öndeki savaşırken arkadaki kısa menzilli gladyatör öne geçemeyip bekliyor.
* **Teknik Sebep:**
  1. `ArenaScene.js`'de tüm savaşçılar aynı tek `y = 355` çizgisine konuyor.
  2. `Gladiator.js` `_process()` içindeki çarpışma/itme döngüsü `this.allFighters` üzerinden **dostları da** `minGap = 40` mesafeyle birbirini itmeye zorluyor. Bu yüzden arkadaki dost öndeki dostun içinden geçemiyor (`x` ekseninde kilitleniyor) ve kısa menzilli silahı düşmana yetişemiyor.
* **Önerilen Çözüm (2.5D Şerit / Çizim Sırası + Hedefleme):**
  1. `ArenaScene.js`'de takım üyelerine küçük `y` derinliği ver (`idx === 0 ? 350 : 368`) ve `ArenaScene` çocuklarını her karede `y` sırasına göre çiz (veya `Gladiator.js` anti-overlap döngüsünde **dostların** birbirinin içinden geçmesine/yanından sıyrılmasına izin verip sadece **düşmanlar** arasında `minGap = 40` uygula).
  2. Ek olarak 2v2'de arka safın sadece en yakın düşmana takılmak yerine uygun hedefe/boşluğa doğru adım atabilmesi (`flanking` veya `minGap` muafiyeti) ikisinin de aynı anda aktif dövüşmesini sağlar.

---

## 5. Kalan Yol Haritası (Sıradaki Fazlar)
* **Faz 7 (v0.8) — Tüketilebilir Eşyalar, Olay Kartları & Miras (*Doctore*):**
  * Maç öncesi 1 kullanımlık arena eşyaları (*Silah Zehri, Gladyatör Ağı, Can Şurubu*).
  * 10+ zafer kazanan efsane gladyatörü emekli edip **Baş Eğitmen (*Doctore*)** yapma (tüm yeni çaylaklara kalıcı XP/stat bonusu).
  * 3–4 günde bir çıkan karar odaklı **Rastgele Roma Olay Kartları**.
* **Faz 8 (v1.0) — Kariyer Merdiveni, Senatörler & Final:**
  * 4 Bölgeli ilerleyiş (*Capua Çukurları → Eyalet Arenası → Roma Kolezyumu → 3 maçlık İmparatorluk Turnuvası* + Prestijli **New Game+**).
  * Senatör kontratları ve şike teklifleri.
  * Son cila (menülere mini ikonlar, opsiyonel gerçek sesler, Test panelini aç/kapa ayarı).

---

## 6. Yeni AI İçin Çalışma Kuralları
2. Her zaman `window.LudusEngine / LudusData / LudusGame` yapısını koru; `import/export` kullanma.
3. Mevcut oyuncuların `localStorage` kaydının bozulmaması için yeni eklenen gladyatör/oyun alanlarını `LudusManager._migrateState()` içinde mutlaka varsayılan değerle doldur.
4. Görsel değişiklikleri mümkün olduğunca `game/renderers/` içine izole et.
