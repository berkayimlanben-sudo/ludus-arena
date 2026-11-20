# AGENTS.md — Ludus Arena Geliştirme & AI Rehberi

Bu dosya, **Ludus Arena** projesinde çalışan tüm yapay zekâ ajanları ve geliştiriciler için tek kaynaklı teknik kurallar özetidir.
* **Mimari & Döngü Detayları:** `ARCHITECTURE.md`
* **Sürüm Geçmişi & Yol Haritası:** `BRIEFING.md`

---

## 1. Hızlı Klasör Haritası
| Klasör / Dosya | Sorumluluk |
| :--- | :--- |
| `index.html`, `style.css` | Sekmeli UI (`Ludus`, `Demirci`, `Pazar`, `Arena`), modallar (`#confirm-modal`, `#roman-event-modal`, `#champion-modal`) ve `<script>` yükleme sırası. |
| `game/main.js` | Tüm DOM render işlemleri, kullanıcı olayları, `SceneTree` sahne başlatma ve toast/modal yönetimi. |
| `game/LudusManager.js` | Oyun durumu (`this.state`), ekonomi, kadro, binalar, kontrat/şike/bağ/ilişki/bahis kuralları, `localStorage` + JSON Import/Export ve `_migrateState()`. |
| `game/*Rules.js` | DOM ve Canvas'tan izole **saf oyun kuralı modülleri** (`CombatRules`, `Phase7Rules`, `CareerRules`, `SenateRules`, `BondingRules`, `RelationAndBetRules`). |
| `game/Gladiator.js`, `game/ArenaScene.js`, `game/LudusScene.js` | Otonom dövüşçü AI (`StateMachine`), 1v1/2v2 sahne yönetimi ve Ludus avlu sahnesi. |
| `game/renderers/` | Canvas 2D çizim katmanı (`ArenaRenderer`, `GladiatorRenderer`, `LudusRenderer`). Oyun mantığı içermez. |
| `data/` | Statik oyun verileri ve denge tabloları (`Items.js`, `LudusConfig.js`). |
| `engine/` | Bağımsız 2D mikro-motor (`Signal`, `Node`, `Node2D`, `StateMachine`, `Camera2D`, `SceneTree`). |
| `tests/*.test.js` | `node:test` + `vm.createContext` tabanlı birim ve simülasyon testleri. |
| `server.js` | Express v5 statik sunucu (`0.0.0.0:3000`). |

---

## 2. Kırmızı Çizgiler & Kodlama Kuralları
1. **ES Module (`import` / `export`) KULLANMA:** Proje build adımı olmadan doğrudan tarayıcıda (`file://`, Express, GitHub Pages) çalışır. Tüm dosyalar IIFE kalıbı ve global namespace (`window.LudusEngine`, `window.LudusData`, `window.LudusGame`) kullanmalıdır.
2. **Script Yükleme Sırasını Koru:** Yeni bir kural veya veri dosyası eklendiğinde hem `index.html` içindeki `<script>` sırasına (bağımlısı olduğu modülden önce/sonra) hem de ilgili `tests/*.test.js` içindeki `vm` dosya listesine ekle.
3. **Kayıt Göçü Zorunluluğu (`_migrateState`):** `this.state` veya gladyatör objelerine eklenen her yeni alan, eski `localStorage`/JSON kayıtlarının bozulmaması için `LudusManager.prototype._migrateState()` içinde güvenli varsayılan değerle doldurulmalıdır.
4. **Iframe Uyumlu Diyaloglar:** `window.alert()`, `window.confirm()` ve `window.open()` **kesinlikle kullanma** (iframe sandbox içinde sessizce başarısız olur). Onaylar için `#confirm-modal`, bildirimler için `showToast()` kullan.
5. **Dosya Adı Duyarlılığı:** Tüm dosya adları ve `<script src>` yolları Linux/GitHub Pages için birebir büyük/küçük harf uyumlu olmalıdır.
6. **Mantık / Çizim Ayrımı:** Yeni görsel efektleri `game/renderers/` veya `game/Particles.js` içinde tut; yeni hesaplama/denge mantıklarını saf `*Rules.js` modüllerine yazarak test edilebilir bırak.

---

## 3. Dokunulmaması Gereken Tasarım & Fizik Kuralları
* **Oynanış Kimliği:** Oyuncu dövüşlerde klavyeyle karakter yönetmez; **Lanista** olarak maç öncesi hazırlık yapar ve maç içinde saha kenarından taktik emri verir.
* **Kişisel İstek Kısıtı (`BondingRules.js`):** Gladyatör kişisel isteklerinde **asla** "10 zaferle özgürlük (Rudis)" veya "Doctore olma" isteği üretilmez; oyuncunun kadro ve silah özgürlüğü korunur.
* **Savaş Fiziği (`Gladiator.js` & `CombatRules.js`):**
  * Hız sönümlemesi Hz-bağımsız (`Math.pow(factor, dt * 60)`) kalmalıdır.
  * Ağır silahların (`weight >= 6`) geç `WINDUP`/`ATTACK` Hyper-Armor davranışı ve `WINDUP`/`ATTACK` sırasındaki hedef kilitlemesi bozulmamalıdır.
  * `2v2` maçlarda kan/efekt zemini sabit `355` değil dövüşçünün `groundY` değerini kullanmalıdır.

---

## 4. Doğrulama Komutları
Her kod değişikliğinden sonra mutlaka çalıştır:
```bash
npm test      # 33/33 birim ve simülasyon testi (tests/*.test.js)
npm run lint  # engine/, data/, game/ ve server.js sözdizimi doğrulaması
```
