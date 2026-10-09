# Ev Bütçesi

Evin aylık gelir ve giderlerini takip eden, telefona uygulama gibi kurulan bir defter. Maaş, kira ve fatura gibi her ay tekrar eden kalemler kendiliğinden listeye gelir. Sen sadece ödedikçe işaretlersin, arada yaptığın harcamaları da eklersin. Uygulama da şu an elinde ne kadar kaldığını ve ay sonunda ne kadar kalacağını hesaplar.

Kayıtların senin Google E-Tablolar dosyanda durur. Telefon ve bilgisayar aynı tabloyu kullanır.

- [Kullanım](#kullanım)
- [Kurulum ve bakım (sadece yönetici için)](#kurulum-ve-bakım-sadece-yönetici-için)
- [Neler değişti](#neler-değişti)

---

# Kullanım

## Ekranın üst bölümü

En üstte ayın adı yazar. Oklarla önceki ya da sonraki aya geçersin. Ayın adına dokunursan bir yılın 12 ayı açılır ve istediğin aya atlarsın. **Bu aya dön** seni bugünün ayına getirir.

Altındaki iki kutu ayın para hareketini gösterir:

| Sol kutu (giren) | Sağ kutu (çıkan) |
|---|---|
| **Önceki aydan:** geçen aylardan devreden para | **Giderler:** ödenen düzenli giderler |
| **Bu ay gelen:** alınan gelirler | **Ek harcamalar:** ay içinde eklediğin harcamalar |
| **Alınan borç:** birinden borç aldıysan | **Borç ödemesi:** borcuna yaptığın ödemeler |
| **Tahsilat:** alacağından geri gelen | **Verilen borç:** birine borç verdiysen |

Kutularda sadece **işaretlenmiş**, yani gerçekten gerçekleşmiş tutarlar sayılır.

- **Şu an elde kalan:** giren toplamdan çıkan toplam düşülünce kalan para.
- **Alınacak / Ödenecek:** bu ay henüz işaretlenmemiş gelirler ve giderler.
- **Ay sonunda:** hepsi gerçekleşince elinde kalacak para.
- En alttaki cümle ayın kısa özetidir, örneğin "Bu ay artan 6.350 ₺, gelirin gideri karşılıyor."

### Göz simgesi (gizli mod)

Ekranı birine gösterirken "Şu an elde kalan" yanındaki göze dokun. Tutarlar `•••• ₺` olur, adların sadece ilk iki harfi görünür, açıklamalar gizlenir. Gizli moddayken değişiklik yapılamaz. Tekrar dokununca her şey görünür. Bu ayar sadece o cihazda geçerlidir.

## Kayıtları işaretleme

- Satırın solundaki yuvarlağa dokununca kayıt **ödendi** (gelirse **alındı**) olur ve yeşil tik çıkar. Tekrar dokunursan geri alınır.
- Satırın kendisine dokununca düzenleme penceresi açılır. Burada tutarı, açıklamayı ve son ödeme tarihini değiştirebilirsin.
  - Düzenli bir kalemde **Sonraki aylarda da bu tutar olsun** işaretlenirse, yeni tutar bu aydan itibaren geçerli olur (örneğin zam).
  - Tek seferlik kayıtlarda adı, kategoriyi, ayı ve "Kartla ödedim"i de değiştirebilirsin.
  - **Bu ay yok:** düzenli bir kalem bu ay olmayacaksa (örneğin o ay fatura gelmedi) bunu seç.
- Değişiklikten sonra altta beliren balondaki **Geri al** ile son işlemi birkaç saniye içinde geri alabilirsin.

### Renkler

- **Yeşil tik:** ödendi ya da alındı.
- **Kırmızı:** son ödeme günü geçti, hâlâ ödenmedi.
- **Soluk:** henüz gelmemiş bir ayın tahmini tutarı.

## Ekleme (sağ alttaki + düğmesi)

**Tutar yazımı:** `1250`, `1.250`, `1.250,50` ya da `1250,50` yazabilirsin, ₺ ve TL de yazılabilir. Virgül kuruşu ayırır. Nokta binlik ayracıdır. Noktadan sonra 3'ten az rakam varsa, örneğin `12.50`, nokta da kuruş sayılır. Harf ya da eksi işareti olan bir tutar kabul edilmez.

**Gider / Gelir:** Tek seferlik harcama ya da gelir ekler. Örnekler: market, benzin, bir defalık iş geliri.
- Kategori seçilir. Kategorileri Ayarlar'dan düzenlersin.
- **Taksit:** Toplam tutarı yazıp taksit sayısını seçersen tutar o kadar aya bölünür.
- **Kartla ödedim:** Kredi kartıyla yapılan harcama kayıtta görünür ama toplamlara eklenmez. Para, kartın ekstresini ödediğinde "Kredi kartı" satırından çıkar. Böylece aynı harcama iki kez sayılmaz.

**Borç / Alacak:**
- **Borç aldım / Borç verdim:** kimden ya da kime, ne kadar. Geri ödeme şekli seçilir:
  - **Tek seferde:** belli bir tarihte tamamı ödenecek.
  - **Taksitli:** her ay belli bir taksit ödenecek.
  - **Belli değil:** ödedikçe girilecek.
- **Borç ödedim / Alacak tahsil ettim:** açık borçlardan birini seçip ödediğin tutarı yazarsın.
  - O borcun bu ay ödenmemiş bir taksiti varsa, taksit ödendi olarak işaretlenir. Yazdığın tutar farklıysa taksitin tutarı da o olur.
  - Bu ayın taksiti zaten ödendiyse ek bir ödeme olarak ayrı satıra yazılır.
- Borç tamamen ödenince yeni taksit satırı oluşmaz. Bir borcu satırından **Borcu kapat** ile elle de kapatabilirsin.

## Sabitler

Her ay listeye kendiliğinden gelen düzenli kalemlerin listesi: maaş, kira, faturalar, aidat gibi. Yeni kalemi + ile eklersin.

- **Her ay** ya da **Belirli aylar:** örneğin sadece Ocak ve Temmuz'da gelen bir ödeme.
- **Ödeme günü:** bu gün geçip ödenmemişse kayıt kırmızı (gecikti) görünür.
- **Zam ayı:** her yıl zam yapılan ay. O ay satırda "Zam ayı, tutarı kontrol et" hatırlatması çıkar.
- Tutarı değiştirince yeni tutar bu aydan itibaren geçerli olur, geçmiş aylar olduğu gibi kalır.
- Artık olmayan bir kalemi **kapat**. Geçmişte görünmeye devam eder, yeni aylara gelmez. Kapatılanlar alttaki **Kapananlar** bölümünde durur ve oradan yeniden açılabilir.
- Sırayı oklarla değiştirebilirsin.

## Gecikenler

Önceki aylardan ödenmemiş kalan kayıtlar bu ayın listesinin üstünde **Gecikenler** başlığıyla görünür. Buradan doğrudan ödendi olarak işaretleyebilirsin. Ödeme, o kaydın ayı kilitli olsa bile yapılabilir.

## Geçmiş ayların kilidi

Eski aylar yanlışlıkla değişmesin diye kilitlenir:
- **Bu ay ve gelecek aylar** her zaman açıktır.
- **Önceki ay** her ayın 10'una kadar açıktır. Bu sayede ay başında geç gelen faturaları rahatça girersin.
- **Son 3 ay** kilitlidir. Üstteki kilide dokunup onaylayınca o ayı düzenleyebilirsin.
- **Daha eski aylar** arşivdir ve değiştirilemez.

## Kopya kayıt uyarısı

Aynı ay içinde aynı ad ve tutarla iki tek seferlik kayıt varsa, örneğin aynı bileti hem telefondan hem bilgisayardan girdiysen, satırların yanında turuncu bir ünlem ve listenin altında bir uyarı çıkar.
- Gerçekten aynı kayıtsa birini sil, uyarı kendiliğinden kaybolur.
- Farklı kayıtlarsa uyarıdaki **Kapat**'a dokun. Bu onay iki kayda bağlıdır ve diğer cihazlarda da görünmez.

## Kaydetme ve sağ üstteki simge

Yaptığın değişiklik önce telefonda görünür, ardından birkaç saniye içinde tabloya gönderilir. İnternet yoksa telefonda saklanır, bağlantı gelince kendiliğinden gönderilir. Uygulamayı kapatsan bile kaybolmaz.

| Simge | Anlamı |
|---|---|
| Bulut, içinde yukarı kayan ok | Kaydediliyor |
| Yeşil tikli bulut | Kaydedildi (1,5 saniye görünür) |
| Turuncu üçgen | Gönderilemedi (internet yok ya da bağlantı sorunu). Telefonda saklanıyor, tekrar denenecek. |
| Dönen iki ok | Tablodaki son hâl alınıyor (dokununca balonla da yazar) |

Turuncu üçgene dokununca **Bekleyen kayıtlar** penceresi açılır. Orada kaç kaydın beklediğini görür, **Şimdi tekrar dene** ile gönderebilir ya da gerekirse **Bekleyenleri iptal et** ile vazgeçebilirsin.

Tablo bir değişikliği kabul etmezse sebebi bir balonda yazılır. Örneğin "Elektrik kaydedilemedi: Bu ay kilitli". Diğer değişiklikler yine kaydedilir, ekran da tablodaki hâline döner.

## İki cihazda kullanım

Telefon ve bilgisayar aynı tabloyu kullanır. Uygulama açıkken 30 saniyede bir ve uygulamaya her dönüşünde tablodaki son hâli alır. Başka cihazda değişiklik olduysa "Diğer cihazdaki değişiklikler alındı" yazar.

## Grafikler

Yılın aylara göre gelir ve giderleri ile giderlerin kategorilere dağılımı burada görünür. **Grafik** ve **Tablo** görünümleri arasında geçebilirsin. Bir aya dokununca o ayın listesi açılır. Soluk sütunlar henüz gelmemiş ayların tahminleridir.

Borç ve alacak hareketleri gelir ya da gider sayılmaz, çubukların üstünde **turuncu** olarak görünür:
- Gelir çubuğunun üstünde alınan borç ve tahsilat.
- Gider çubuğunun üstünde borç ödemesi ve verilen borç.

Örneğin borç alıp o parayla büyük bir ödeme yaptığın ayda gider çubuğu uzun olur, gelir çubuğunun üstünde de alınan borç görünür. Üstte iki rakam yan yana durur: **Gelir − gider farkı** sadece gelir ile giderin farkıdır. **Borç ve alacakla birlikte** ise borç ve alacak hareketleri de eklenince elindeki paranın yıl içinde gerçekte ne kadar değiştiğini gösterir.

## Araçlar

Alttaki menünün üçüncü sekmesi. Dört hesaplama aracı var. Araçlar'a her girişte döviz ve altın fiyatları arka planda yenilenir (en fazla 15 dakikada bir), böylece Döviz ve altın'ı açınca hazır olur.

**Kredi hesabı:** Kredi tutarı, aylık faiz ve vadeyi yazınca aylık taksit, toplam geri ödeme ve toplam faiz çıkar. "Vergiler dahil" işaretliyse ihtiyaç kredilerindeki %15 KKDF ve %15 BSMV faize eklenir.

**Bütçeme uyar mı?** Bir şey almadan önce, peşin ya da taksitli ödemenin bütçene sığıp sığmadığını gösterir.
- Peşin fiyatını ve bir ya da birkaç taksit seçeneğini yaz: taksit sayısı ile aylık taksit ya da toplam. Hangisini biliyorsan onu yazman yeter, diğeri kendiliğinden hesaplanır. İlk taksit ayı varsayılan olarak gelecek aydır.
- Her seçenek için toplam fiyat, en ucuz seçeneğe göre fark ve tek cümlelik bir sonuç çıkar: ✅ rahat sığıyor, 🟠 sıkışık (bir ayda gelirinin %10'undan az kalıyor), ⚠️ zorlanabilirsin (bir ayda eksiye düşüyor).
- Bir seçeneğin kartına dokununca ay ay tablosu görünür: gelir, giderler ve kalan.
- **Peşin** seçeneği bu ayın sonuna bakar: şu an elindeki para, bu ay daha gelecek ve ödenecek olanlar ve ayın kalan tahmini ek harcaması.
- Gelecek aylar sabit kalemlerinden, borç ödemelerinden ve daha önce taksitle aldıklarının kalan taksitlerinden hesaplanır. Ek harcamalar için son 3 ayın ortalaması kullanılır, eski taksit parçaları bu ortalamaya katılmaz.
- Tutarlar gizliyken bu araç çalışmaz.

**Kira artışı:**
1. Kira kalemini seç. Mevcut kira kendiliğinden gelir.
2. Artış oranını yaz. Bu oran TÜFE'nin 12 aylık ortalamasıdır, TÜİK her ay açıklar.
3. Araç yasal üst sınırı gösterir ve **anlaşılan yeni kira** kutusuna yuvarlak bir öneri yazar. Öneri, tam ya da buçuklu bir rakama aşağı yuvarlanmıştır, örneğin 25.487 yerine 25.000. 10.000 ₺'nin altındaki kiralarda öneri 100'lük rakama yuvarlanır. Üstteki düğmelerle diğer seçenekleri seçebilir ya da ev sahibiyle anlaştığın tutarı doğrudan yazabilirsin. Altındaki satır artış yüzdesini ve yasal sınıra göre farkı gösterir.
4. **Kira kalemine uygula**, kutudaki tutarı seçtiğin aydan itibaren kira kalemine işler. Geçmiş aylar değişmez.

Hesap bilgi amaçlıdır, hukuki danışmanlık yerine geçmez.

**Döviz ve altın:** En üstteki çeviriciye miktar ve birim yazınca, örneğin 100 dolar ya da 8 çeyrek, alırken ve bozdururken kaç TL ettiğini gösterir. Birim her açılışta dolar gelir. Altında dolar, euro, sterlin, gram, çeyrek, yarım, tam ve Cumhuriyet altını, 22 ayar bilezik ve gümüşün güncel alış ve satış fiyatları listelenir.
- Döviz kurları Merkez Bankası'ndan, altın ve diğer değerli metal fiyatları Truncgil Finans'tan alınır. Kaynaklar ve güncelleme zamanları en alttaki dipnotta yazar.
- Truncgil Finans resmi bir kaynak değildir, kuyumcu fiyatlarıyla birebir aynı olmayabilir. Altın fiyatları bir günden eskiyse dipnot bunu turuncu yazıyla belirtir.
- Fiyatlar alınamazsa son kayıtlı fiyatlar gösterilir.

## Kaydırınca üstte kalan bar

Aylık listede aşağı kaydırınca üstte ince bir bar belirir. Barda ay, şu an elde kalan ve ay sonunda kalacak tutar görünür. Oklarla başka aya geçebilir, ayın adına dokunup ay seçebilirsin. Grafikler'de aynı barda yıl ve gelir − gider farkı görünür.

## Ayarlar

- **Tema:** 4 renk (Petrol, Orman, Lacivert, Erik) ve Açık, Koyu ya da Otomatik mod.
- **Görünüm:** Sıkı (ekrana daha çok satır sığar), Normal ya da Büyük.
- **Tutarlar:** kuruşları ve ₺ işaretini göster ya da gizle.
  - Tema, görünüm ve tutar ayarları sadece o cihazda geçerlidir.
- **Harcama kategorileri:** + ile eklerken çıkan kategoriler. İlk sıradaki varsayılan olarak seçili gelir. Kayıtları olan bir kategori silinirse kayıtları seçtiğin başka bir kategoriye taşınır. Kategoriler tabloda saklanır, tüm cihazlarda aynıdır.
- **Yedekler:** (aşağıda)
- **Başka cihaza bağla:** Karekodu diğer cihazın kamerasıyla okut ya da bağlantıyı kendine gönder, adres ve anahtar otomatik girilir. Bu kod şifre gibidir.
- **Veriler:** Tabloyu açar ya da bu cihazdaki bağlantıyı kaldırır. Bağlantıyı kaldırmak tablodaki kayıtları silmez.

En altta uygulamanın, hesaplama kodunun ve tablonun sürüm numaraları yazar.

## Yedekler

- Her gün, o günkü ilk değişiklikten önce otomatik yedek alınır. Yedekler Drive'da **Ev Bütçesi Yedekleri** klasöründe durur.
- **Her yedek, o andaki tüm verinin eksiksiz bir kopyasıdır.** Yedekler birbirinin devamı değildir. "İçinde 148 kayıt", o yedekte toplam kaç kayıt olduğunu gösterir: sabit kalemler ve aylık kayıtlar.
- Son 7 yedek saklanır. Ayrıca her ayın ilk otomatik yedeği **Ay başı yedeği** olarak son 3 ay boyunca tutulur. Böylece bir hatayı geç fark etsen de geri dönebileceğin bir yedek olur.
- Yedekler sadece değişiklik yapılan günlerde alınır. Uygulamayı uzun süre kullanmasan da eldeki yedekler silinmez.
- Listede en yeni yedek görünür. Diğerleri **Diğer yedekler**'e dokununca açılır.
- **Geri yükle**'ye iki kez dokunursan tablo o yedekteki hâline döner. Geri yüklemeden önce o anki hâl de ayrıca yedeklenir, yani yanlışlıkla geri yüklesen bile kayıp olmaz.
- Kayıt sayısında birden düşüş görürsen, örneğin 145'ten 12'ye, bir silme ya da bozulma olmuş demektir. Hemen öncesindeki yedeğe dönebilirsin.

---

# Kurulum ve bakım (sadece yönetici için)

## Yapı

Uygulama üç parçadan oluşur:

| Parça | Nerede | Ne yapar |
|---|---|---|
| **Google E-Tablo** | Google Drive | Veriler burada durur. Gri sekmeler uygulamanın veri deposudur, elle doldurulmaz. "Özet 2026" sayfası otomatik oluşur. |
| **Kod.gs** | Tabloda Uzantılar → Apps Komut Dosyası | Tabloya okuma ve yazma, yedekler ve özet sayfası. Nadiren değişir. |
| **GitHub dosyaları** | github.com'daki `ev-butcesi` deposu | Telefondaki ekran (`index.html`) ve hesaplama kodu (`ortak.js`). Kod.gs de hesaplama kodunu buradan okur. |

Depodaki dosyalar: `index.html`, `ortak.js`, `sw.js`, `manifest.webmanifest`, `README.md` ve 4 ikon (`ikon-192.png`, `ikon-512.png`, `ikon-maskable-512.png`, `apple-touch-icon.png`).

## İlk kurulum

Bilgisayardan yapmak daha kolay, toplam 20 dakika kadar sürer.

### 1. Apps Script
1. Tabloda **Uzantılar → Apps Komut Dosyası**'nı aç. **Kod.gs**'in içini tamamen sil, yeni Kod.gs'i yapıştır ve 💾 ile kaydet.
2. Fonksiyon listesinden **kurulum**'u seç ve **▶ Çalıştır**'a bas. Google izin isteyecek: **İzinleri incele → hesabın → Gelişmiş → Ev Bütçesi'ne git → İzin ver**.
3. **Dağıt → Yeni dağıtım** (ilk kez) ya da **Dağıt → Dağıtımları yönet → ✏️** ile şunları ayarla:
   - Tür: **Web uygulaması**
   - Çalıştıran: **Ben**
   - Erişimi olanlar: **Herkes**
   - Sürüm: **Yeni sürüm**

   Sonra **Dağıt**'a bas. "Herkes" ayarı güvenlidir, çünkü kapıyı sadece senin bildiğin uzun bir anahtar açar.
4. Tabloyu yenile. **Bütçe → Bağlantı bilgilerini göster** menüsünde **Bağlantı adresi** ve **Anahtar** görünür.

### 2. GitHub
1. github.com'da hesap aç. **+ → New repository** ile `ev-butcesi` adında **Public** bir depo oluştur.
2. **Add file → Upload files** ile yukarıdaki dosyaları yükle ve **Commit changes**'e bas.
3. **Settings → Pages** sayfasında Branch olarak `main` ve `/ (root)` seç, **Save**'e bas. 1-2 dakika sonra adres çıkar: `https://KULLANICIADIN.github.io/ev-butcesi/`

### 3. Telefon
1. Adresi Chrome'da aç, bağlantı adresini ve anahtarı yapıştırıp **Bağlan**'a bas.
2. Chrome menüsünden **Uygulamayı yükle** ya da **Ana ekrana ekle**'yi seç.
3. Başka cihazları **Ayarlar → Başka cihaza bağla**'daki karekodla bağlamak daha kolaydır.

## Güncelleme

**Sadece GitHub dosyaları değiştiyse (çoğu güncelleme):**
1. Depoda **Add file → Upload files** ile yeni dosyaları yükle. Aynı adlı dosyalar üzerine yazılır.
2. **Commit changes**'e bas.
3. 1-2 dakika sonra uygulamayı kapatıp aç. Gerekirse bir kez daha kapatıp aç.

**Kod.gs de değiştiyse (nadiren, bilgisayardan):**
1. Apps Script'te Kod.gs'in içini sil, yenisini yapıştır ve kaydet.
2. **Dağıt → Dağıtımları yönet → ✏️ → Sürüm: Yeni sürüm → Dağıt.** Adres değişmez.
3. Güncelleme notunda "kurulum çalıştır" yazıyorsa **kurulum**'u bir kez çalıştır. Yeni bir izin ya da tablo sütunu gerektiğinde bu gerekir.

**Sürüm kontrolü:** Ayarlar'ın en altında `Ev Bütçesi · Sürüm 3.22.2` yazar. Bu uygulamanın sürümüdür. Bu satıra dokununca altında teknik sürümler görünür, örneğin `hesaplama 3.12 · tablo 3.7`.

**Sürüm numaraları** üç parçadan oluşur: **Büyük.Özellik.Düzeltme**, örneğin 3.20.0.
- **Büyük:** Kapsamlı bir yenilikte artar, örneğin tasarım yenilemesi 4.0.0 olur.
- **Özellik:** Yeni bir bölüm ya da özellik geldiğinde artar: 3.21.0.
- **Düzeltme:** Küçük düzeltmelerde artar: 3.20.1.

3.16'ya kadar sürümler iki parçalıydı.
- **Hesaplama**, GitHub'daki `ortak.js` dosyasının sürümüdür.
- **Tablo**, Kod.gs'in sürümüdür.

Güncellemeden sonra beklenen numaraları görmüyorsan uygulamayı birkaç kez kapatıp aç.

## Sorun çıkarsa

- **Uygulama güncellenmedi:** Uygulamayı tamamen kapatıp tekrar aç. Olmazsa tarayıcıda sayfayı yenile.
- **"Bağlantı anahtarı hatalı":** Anahtar yenilenmiş olabilir. Tabloda **Bütçe → Bağlantı bilgilerini göster** ile yeni anahtarı al.
- **Bağlanılamadı / turuncu üçgen geçmiyor:** İnterneti kontrol et. Brave kullanıyorsan kalkanı (Shields) bu site için kapat. Apps Script dağıtımında Erişim'in **Herkes** olduğundan emin ol.
- **Veriler bozuldu ya da yanlışlıkla silindi:** **Ayarlar → Yedekler**'den uygun yedeği geri yükle.
- **Anahtarın başkasının eline geçtiğinden şüpheleniyorsan:** Tabloda **Bütçe → Bağlantı anahtarını yenile**'yi kullan, sonra her cihazda yeni anahtarla bağlan.
- **Tüm verileri sıfırlamak:** Tabloda **Bütçe → Tüm verileri sıfırla**. Kalemler ve kayıtlar silinir, ayarlar ve kategoriler kalır. Silmeden önce otomatik yedek alınır.

---

# Neler değişti

**3.22.2 (uygulama)**
- Alttaki menünün sırası: Aylık liste · Grafikler · Araçlar · Sabitler · Ayarlar.
- Araç adları: Kredi hesabı, Bütçeme uyar mı?, Kira artışı, Döviz ve altın. Araç pencerelerinin başlığında ikon var.
- Döviz ve altın: çevirici en üstte (yazarken sonuç klavyenin üstünde kalıyor), birim her açılışta dolar, fiyat listesi "Güncel fiyatlar" etiketiyle altta.
- Pencere başlıkları daha belirgin. Açılır kutuların oku biraz daha içeride ve her cihazda aynı görünüyor.

**3.22.1 (uygulama)**
- Araçlar'daki kartların açıklamaları yenilendi, ikonlar değişti: Bütçeme uyar mı? için soru işaretli cüzdan, Döviz / altın için oklu dolar. Kartlar artık hep aynı boyda.

**3.22.0 (uygulama)**
- "Peşin mi, taksit mi?" aracının yerine **Bütçeme uyar mı?** geldi. Peşin ve taksit seçeneklerinin bütçene sığıp sığmadığını kendi verilerinle, ay ay gösteriyor. Getiri ve faiz karşılaştırması kaldırıldı.

**3.21.0 (uygulama)**
- Yeni araç: **Peşin mi, taksit mi?** Paranın getirisini yazınca hangisinin kârlı olduğunu söylüyor. Kredi aracı sadeleşti.
- Pencerelerdeki kapatma çarpısı, pencere kaydırılınca da üstte görünür kalıyor.
- Döviz ve altın fiyatları Araçlar'a girince arka planda hazırlanıyor (15 dakikada bir).
- Bilgisayarda alttaki menü, 5. sekme eklenince içerikten taşıyordu; yine içerikle aynı hizada.
- Araçlar'daki kuruşlu tutarlar hep iki haneli yazılıyor (25.487,70 ₺).

**3.20.0 (uygulama) · 3.12 (hesaplama) · 3.7 (tablo)**
- Yeni **Araçlar** sekmesi: kredi/taksit, kira artışı ve döviz/altın.
  - Kira artışında yuvarlak tutar önerisi var, sonuç kira kalemine uygulanabiliyor.
  - Döviz/altın fiyatları Merkez Bankası'ndan ve Truncgil Finans'tan geliyor.
- Aylık liste ve Grafikler'de aşağı kaydırınca ay ve kalan tutarlar üstte ince bir barda görünür kalıyor.
- Sürüm numaraları üç parçalı oldu (Büyük.Özellik.Düzeltme).
- Kod.gs güncellemesi gerekiyor: döviz ve altın fiyatlarını çeken bölüm eklendi. "kurulum"u çalıştırmak gerekmiyor, sadece Yeni sürüm yeterli.

**3.16 (uygulama)**
- Veri yenilenirken sağ üstte "Güncelleniyor…" yazısı yerine dönen oklu küçük bir simge çıkıyor. Simgeye dokununca "Tablodaki son hâl alınıyor…" balonu görünüyor.

**3.15 (uygulama)**
- Bilgisayarda + düğmesi listenin sağ kenarına taşıyordu (tarayıcının kaydırma çubuğu içeriği biraz sola itiyordu). Artık her ekranda ve her görünümde telefondaki gibi kartın biraz içinde duruyor.

**3.14 (uygulama)**
- Grafikler'in üstünde iki rakam yan yana ve eşit büyüklükte: **Gelir − gider farkı** ve **Borç ve alacakla birlikte**. Borç ya da alacak yoksa sadece ilki görünür.
- Bilgisayarda geniş pencerede + düğmesi ve kaydetme simgesi pencerenin kenarına kaçmıyor, uygulamanın içinde kalıyor.

**3.13 (uygulama)**
- Grafikler'deki Tablo görünümünde gelecek ayların (tahmini) hücreleri kayıyordu: Kasım hücresinde iki değer alt alta duruyordu, yıl toplamları Aralık sütununa düşüyordu. Düzeltildi.

**3.12 (uygulama) · 3.11 (hesaplama) · 3.6 (tablo)**
- Uygulamanın kendi açılış ekranı kaldırıldı, sadece Chrome'unki çıkıyor. Uygulama telefondaki son veriyle hemen açılıyor, en az 1 saniye daha hızlı.
- Ayarlar'da sadece uygulama sürümü yazıyor (Ev Bütçesi · Sürüm 3.12). Teknik sürümler bu satıra dokununca görünüyor.
- Alttaki balon parmakla sağa, sola ya da aşağı itilince kapanıyor.
- Yazı kutularında yazım denetimi kapatıldı. Kırmızı alt çizgi ve "Sözlüğe ekle" menüsü artık çıkmıyor.
- Grafiklerde borç ve alacak hareketleri çubukların üstünde turuncu görünüyor. "Yıl içinde artan"ın altında "Borç ve alacaklar dahil" satırı eklendi.

**3.11 (uygulama) · 3.10 (hesaplama) · 3.6 (tablo)**
- Kaydetme simgesi hareketli: değişiklik yapılınca içinde yukarı kayan oklu bulut, kaydedilince yeşil tikli bulut görünür.
- Bir kaydın adı değiştirilince balonda yeni adı yazıyor. Uzun adlar kısaltılıyor, "Geri al" hep aynı satırda kalıyor.
- Yedekler:
  - Son 7 yedek ve son 3 ayın ay başı yedeği saklanıyor.
  - Yedekteki kayıt sayısı görünüyor.
  - Tarihler "Bugün 09:15" ve "Dün 21:40" gibi yazılıyor, açıklamalar daha anlaşılır.
  - Listede en yeni yedek görünüyor, diğerleri "Diğer yedekler" ile açılıyor.
- Tablonun kabul etmediği tek bir değişiklik artık diğerlerini tıkamıyor. Sebebi gösteriliyor, diğer değişiklikler kaydediliyor.
- "Borç ödedim" ile girilen ödeme, o ayın ödenmemiş taksitini işaretliyor. Ödeme artık iki kez sayılmıyor.
- İnternetsizken art arda yapılan tik ve düzenlemelerin sırası korunuyor.
- Gizli modda iki bildirimde görünen gerçek adlar gizlendi.
- Kategori değişiklikleri de bekleyen kayıtlarla gidiyor, internetsizken kaybolmuyor.
- Tablodaki ad, kategori ve not sütunları düz metin yapıldı, "15.10" gibi notlar tarihe dönüşmüyor.
- Tutar kutuları sıkılaştı. `12a`, `-50`, `10.000.5` gibi hatalı yazımlar artık sessizce yanlış tutar olarak kaydedilmiyor, "Geçerli bir tutar yaz" uyarısı çıkıyor. Tabloya elle yazılan tutarlar da aynı kuralla okunuyor (`1.250` = 1250).
- Tablodaki tutar sütunları `21.000,00` biçiminde görünüyor.
- Özet sayfası yenilenirken telefondan gelen kayıtlarla çakışma önlendi.
- Çevrimdışı önbellek sadece sağlam dosyaları saklıyor.
- "Nasıl kullanılır?" bağlantısı eklendi (Ayarlar'ın en altında).

**3.10 ve öncesi (özet)**
- Uygulama Apps Script'ten GitHub'a taşındı: Google girişi olmadan, anahtarla bağlantı.
- Değişiklikler önce telefonda görünüyor, arkadan gönderiliyor. İnternetsizken saklanıyor, tekrar deneniyor.
- Borç ve alacak takibi: tek seferde, taksitli ya da belli değil.
- Üst bölüm yeniden tasarlandı: giren ve çıkan kutuları, şu an elde kalan, ay sonu tahmini.
- Geçmiş ay kilidi, Gecikenler bölümü, Geri al.
- Gizli mod (göz simgesi), ay seçici, Android geri hareketi.
- Diğer cihazdaki değişiklikler otomatik alınıyor.
- Kopya kayıt uyarısı.
- Aynı kaydın tabloya iki kez yazılması hatası giderildi.
- Günlük otomatik yedek ve uygulamadan geri yükleme.
