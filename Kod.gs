/**
 * EV BÜTÇESİ — Gelir Gider Defteri  (sürüm 3)
 * Veriler: Google E-Tablolar  |  Uygulama ekranı: GitHub Pages
 * Bu dosya, telefondaki uygulamanın veri aldığı/gönderdiği bağlantı noktasıdır.
 *
 * İLK KURULUM / GÜNCELLEME SONRASI: "kurulum" fonksiyonunu bir kez çalıştırın.
 * Bağlantı anahtarı: tabloda Bütçe → Bağlantı bilgilerini göster.
 * Sayfalar (gri sekmeler uygulamanın veri deposudur, elle doldurmayın):
 *   Kalemler             → sabit/düzenli kalemler (şablon)
 *   Hareketler           → her ayın gerçek kayıtları
 *   TutarDegisiklikleri  → zam / tutar değişikliği geçmişi
 *   Ayarlar              → kategoriler ve görünüm ayarları
 */

const SURUM = '3.4';
const YEDEK_KLASORU = 'Ev Bütçesi Yedekleri';
const YEDEK_SAYISI = 5;

const SAYFA = { KALEM: 'Kalemler', HAREKET: 'Hareketler', TUTAR: 'TutarDegisiklikleri', AYAR: 'Ayarlar' };

const BASLIK = {
  Kalemler: ['id', 'sira', 'ad', 'tur', 'kategori', 'tutar', 'degisken', 'aylar', 'baslangic', 'bitis', 'odemeGunu', 'zamAyi', 'aktif', 'not', 'tip', 'toplam'],
  Hareketler: ['id', 'ay', 'kalemId', 'ad', 'tur', 'kategori', 'tutar', 'odendi', 'kart', 'tarih', 'not', 'sonTarih', 'tip', 'bagli'],
  TutarDegisiklikleri: ['kalemId', 'gecerliAy', 'tutar'],
  Ayarlar: ['anahtar', 'deger']
};

// E-Tablolar bu sütunları tarihe/sayıya çevirmesin diye düz metin yapılır
const METIN_SUTUNLARI = {
  Kalemler: ['A:A', 'H:J', 'O:O'],
  Hareketler: ['A:C', 'J:J', 'L:N'],
  TutarDegisiklikleri: ['A:B'],
  Ayarlar: ['A:B']
};

const VARSAYILAN_KATEGORILER = ['Market', 'Benzin', 'Giyim', 'Sağlık', 'Ev', 'Çocuklar', 'Eğitim', 'Ulaşım',
  'Yeme-İçme', 'Eğlence', 'Hediye', 'Vergi/Harç', 'Diğer'];
const VARSAYILAN_AYARLAR = { renk: 'petrol', mod: 'otomatik', gorunum: 'normal', kurus: 'hayir' };
const IZINLI_AYARLAR = ['renk', 'mod', 'gorunum', 'kurus', 'kategoriler'];

/* ───────────── Bağlantı noktası (GitHub'daki uygulama buraya istek gönderir) ───────────── */

function doGet() {
  return ContentService.createTextOutput('Ev Bütçesi bağlantı noktası çalışıyor (sürüm ' + SURUM + ').');
}

const ISLEMLER = {
  veri: function () { return api_veri(); },
  satirKaydet: function (p) { return api_satirKaydet(p); },
  harcamaEkle: function (p) { return api_harcamaEkle(p); },
  satirSil: function (id, kilitAcik) { return api_satirSil(id, kilitAcik); },
  satirGeriEkle: function (h, kilitAcik) { return api_satirGeriEkle(h, kilitAcik); },
  borcEkle: function (p) { return yaz_(function (v) { borcEkle_(v, p); }); },
  borcSil: function (id, kilitAcik) { return yaz_(function (v) { borcSil_(v, id, kilitAcik); }); },
  kalemYenidenAc: function (id) { return yaz_(function (v) { kalemYenidenAc_(v, id); }); },
  kalemKaydet: function (g) { return api_kalemKaydet(g); },
  kalemSonlandir: function (id) { return api_kalemSonlandir(id); },
  kalemTasi: function (id, yon) { return api_kalemTasi(id, yon); },
  ayarKaydet: function (a, d) { return api_ayarKaydet(a, d); },
  yedekler: function () { return api_yedekler(); },
  yedekAl: function () { return api_yedekAl(); },
  yedekGeriYukle: function (id) { return api_yedekGeriYukle(id); }
};

function doPost(e) {
  let cevap;
  try {
    const istek = JSON.parse(e.postData.contents);
    const anahtar = PropertiesService.getScriptProperties().getProperty('ANAHTAR');
    if (!anahtar || istek.anahtar !== anahtar) throw new Error('Bağlantı anahtarı hatalı.');
    const fn = ISLEMLER[istek.islem];
    if (!fn) throw new Error('Bilinmeyen işlem.');
    cevap = { ok: true, sonuc: fn.apply(null, istek.args || []) };
  } catch (err) {
    cevap = { ok: false, hata: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(cevap)).setMimeType(ContentService.MimeType.JSON);
}

/** Hesaplama fonksiyonları telefona da gönderilir; böylece ay geçişleri ve grafikler beklemeden çizilir */
function ortakKod_() {
  const fonksiyonlar = [ay_, num_, bool_, aylarListe_, ayEkle_, ayFarki_, tarihStr_, ayGunSayisi_, ayDurumu_, kilitKontrol_,
    satirGeriEkle_, borcOdenen_, borcBitti_, borcEkle_, borcSil_, kalemYenidenAc_, kalemBuAyda_,
    hareketYeni_, gecerliTutar_, tahmin_, tutarDegistir_, senkron_, satirBul_, satirNesne_, ayHesapla_, satirKaydet_,
    harcamaEkle_, satirSil_, kalemKaydet_, kalemSonlandir_, kalemTasi_, kalemListesiHesapla_, istatistikHesapla_];
  return 'var SAYFA = ' + JSON.stringify(SAYFA) + ';\n' + fonksiyonlar.map(String).join('\n\n');
}

function anahtar_() {
  const pr = PropertiesService.getScriptProperties();
  let a = pr.getProperty('ANAHTAR');
  if (!a) { a = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12); pr.setProperty('ANAHTAR', a); }
  return a;
}

/* ───────────── Tablo menüsü ───────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bütçe')
    .addItem('Özet tabloyu yenile', 'menuYenile')
    .addItem('Başka bir yılın özetini oluştur', 'menuBaskaYil')
    .addSeparator()
    .addItem('Bağlantı bilgilerini göster', 'menuBaglanti')
    .addItem('Bağlantı anahtarını yenile…', 'menuAnahtarYenile')
    .addSeparator()
    .addItem('Tüm verileri sıfırla…', 'menuSifirla')
    .addToUi();
  try { yillikTablo_(Number(buAy_().slice(0, 4))); } catch (e) { console.error(e); }
}
function menuYenile() { yillikTablo_(Number(buAy_().slice(0, 4))); }
function menuBaskaYil() {
  const ui = SpreadsheetApp.getUi();
  const c = ui.prompt('Hangi yıl?', 'Örn. 2026', ui.ButtonSet.OK_CANCEL);
  const y = Number(c.getResponseText());
  if (c.getSelectedButton() === ui.Button.OK && y > 2000) yillikTablo_(y);
}
function menuBaglanti() {
  let url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) {}
  const kutu = function (baslik, deger) {
    return '<p style="margin:14px 0 4px;font:600 13px sans-serif">' + baslik + '</p>' +
      '<input readonly value="' + deger + '" onclick="this.select()" style="width:100%;padding:8px;font:14px monospace">';
  };
  const html = '<div style="font:14px sans-serif">Uygulamayı ilk açtığında bu iki bilgiyi ister. Kutuya dokunup kopyala.' +
    kutu('Bağlantı adresi', url.indexOf('/exec') > 0 ? url : 'Dağıt → Dağıtımları yönet ekranındaki Web uygulaması URL\'si') +
    kutu('Anahtar (kimseyle paylaşma)', anahtar_()) + '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(460).setHeight(260), 'Bağlantı bilgileri');
}
function menuAnahtarYenile() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Anahtar yenilensin mi?', 'Eski anahtarla bağlı tüm cihazların bağlantısı kesilir, yeni anahtarı girmen gerekir.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().deleteProperty('ANAHTAR');
  menuBaglanti();
}

function menuSifirla() {
  const ui = SpreadsheetApp.getUi();
  const c = ui.alert('Tüm veriler silinsin mi?',
    'Sabit kalemler, tüm aylık kayıtlar ve tutar değişiklikleri silinir. Ayarlar ve kategoriler kalır. Silmeden önce otomatik yedek alınır, gerekirse uygulamada Ayarlar → Yedekler\'den geri dönebilirsin.',
    ui.ButtonSet.YES_NO);
  if (c !== ui.Button.YES) return;
  kilitli_(function () {
    yedekAl_('Sıfırlamadan önce');
    [SAYFA.KALEM, SAYFA.HAREKET, SAYFA.TUTAR].forEach(function (ad) {
      const sh = sayfa_(ad), son = sh.getLastRow();
      if (son > 1) sh.deleteRows(2, son - 1);
    });
    ss_().getSheets().forEach(function (sh) { if (/^Özet \d{4}$/.test(sh.getName())) ss_().deleteSheet(sh); });
  });
  yillikTablo_(Number(buAy_().slice(0, 4)));
  ui.alert('Veriler silindi. Uygulamayı telefonda kapatıp yeniden aç.');
}

/* ───────────── Kurulum ───────────── */

function kurulum() {
  const ss = ss_();
  Object.keys(BASLIK).forEach(function (ad) {
    const sh = ss.getSheetByName(ad) || ss.insertSheet(ad);
    METIN_SUTUNLARI[ad].forEach(function (a) { sh.getRange(a).setNumberFormat('@'); });
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, BASLIK[ad].length).setValues([BASLIK[ad]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    sh.setTabColor('#9AA5AB');
  });
  semaKontrol_();
  gecTarihleriTemizle_();
  if (!ayarOku_('kategoriler')) ayarYaz_('kategoriler', VARSAYILAN_KATEGORILER.join(', '));
  anahtar_();
  yedekKlasoru_();
  yillikTablo_(Number(buAy_().slice(0, 4)));
  const bos = ss.getSheetByName('Sayfa1') || ss.getSheetByName('Sheet1');
  if (bos && bos.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(bos);
  return 'Kurulum tamamlandı';
}

/* ───────────── API (arayüzün çağırdığı fonksiyonlar) ───────────── */

/** Tüm veriyi tek seferde gönderir; telefon hesaplamaları kendisi yapar */
function api_veri() {
  return kilitli_(function () { return veriPaketi_(veriOku_()); });
}
function api_satirKaydet(p) { return yaz_(function (v) { satirKaydet_(v, p); }); }
function api_harcamaEkle(p) { return yaz_(function (v) { harcamaEkle_(v, p); }); }
function api_satirSil(id, kilitAcik) { return yaz_(function (v) { satirSil_(v, id, kilitAcik); }); }
function api_satirGeriEkle(h, kilitAcik) { return yaz_(function (v) { satirGeriEkle_(v, h, kilitAcik); }); }
function api_kalemKaydet(g) { return yaz_(function (v) { kalemKaydet_(v, g); }); }
function api_kalemSonlandir(id) { return yaz_(function (v) { kalemSonlandir_(v, id); }); }
function api_kalemTasi(id, yon) { return yaz_(function (v) { kalemTasi_(v, id, yon); }); }
function api_ayarKaydet(anahtar, deger) {
  if (IZINLI_AYARLAR.indexOf(anahtar) < 0) throw new Error('Bilinmeyen ayar.');
  return kilitli_(function () {
    ayarYaz_(anahtar, Array.isArray(deger) ? deger.map(function (x) { return String(x).replace(/,/g, ' ').trim(); }).join(', ') : String(deger));
    return true;
  });
}

function yaz_(fn) {
  return kilitli_(function () {
    semaKontrol_();
    try {
      const pr = PropertiesService.getScriptProperties();
      if (pr.getProperty('SON_YEDEK_GUN') !== bugun_()) yedekAl_('Günün ilk değişikliğinden önce');
    } catch (e) { console.warn('Otomatik yedek alınamadı: ' + e); }
    fn(veriOku_());
    return veriPaketi_(veriOku_());
  });
}

function veriPaketi_(veri) {
  return {
    kalemler: veri.kalemler.map(function (k) {
      return {
        _satir: k._satir, id: String(k.id), sira: num_(k.sira), ad: String(k.ad), tur: k.tur === 'gelir' ? 'gelir' : 'gider',
        kategori: String(k.kategori || ''), tutar: num_(k.tutar), degisken: bool_(k.degisken), aylar: aylarListe_(k.aylar).join(','),
        baslangic: ay_(k.baslangic), bitis: ay_(k.bitis), odemeGunu: Number(k.odemeGunu) || '', zamAyi: Number(k.zamAyi) || '',
        aktif: bool_(k.aktif), not: String(k.not || ''), tip: String(k.tip || ''), toplam: num_(k.toplam) || ''
      };
    }),
    hareketler: veri.hareketler.map(function (h) {
      return {
        _satir: h._satir, id: String(h.id), ay: ay_(h.ay), kalemId: h.kalemId ? String(h.kalemId) : '', ad: String(h.ad),
        tur: h.tur === 'gelir' ? 'gelir' : 'gider', kategori: String(h.kategori || ''), tutar: num_(h.tutar),
        odendi: bool_(h.odendi), kart: bool_(h.kart), not: String(h.not || ''), sonTarih: tarihStr_(h.sonTarih),
        tarih: tarihStr_(h.tarih), tip: String(h.tip || ''), bagli: String(h.bagli || '')
      };
    }),
    deg: veri.deg.map(function (d) { return { _satir: d._satir, kalemId: String(d.kalemId), gecerliAy: ay_(d.gecerliAy), tutar: num_(d.tutar) }; }),
    ayarlar: ayarlarOku_(), buAy: buAy_(), gun: bugunGun_(), bugun: bugun_(), tabloUrl: ss_().getUrl(), surum: SURUM,
    kod: ortakKod_()
  };
}

/* ───────────── Yedekler (Drive'da "Ev Bütçesi Yedekleri" klasörü, son 5 yedek) ───────────── */

function api_yedekler() {
  const tz = tz_();
  return yedekDosyalari_().map(function (f) {
    return { id: f.getId(), tarih: Utilities.formatDate(f.getDateCreated(), tz, 'dd.MM.yyyy HH:mm'), not: f.getDescription() || '' };
  });
}
function api_yedekAl() {
  kilitli_(function () { yedekAl_('Elle alınan yedek'); });
  return api_yedekler();
}
function api_yedekGeriYukle(id) {
  return kilitli_(function () {
    const dosya = yedekDosyalari_().find(function (f) { return f.getId() === id; });
    if (!dosya) throw new Error('Yedek bulunamadı.');
    const yedek = JSON.parse(dosya.getBlob().getDataAsString());
    yedekAl_('Geri yüklemeden önceki hâl');
    [SAYFA.KALEM, SAYFA.HAREKET, SAYFA.TUTAR].forEach(function (ad) {
      const sh = sayfa_(ad), son = sh.getLastRow();
      if (son > 1) sh.deleteRows(2, son - 1);
      const satirlar = (yedek.veri[ad] || []).slice(1);
      if (satirlar.length) {
        const gen = satirlar.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        sh.getRange(2, 1, satirlar.length, gen).setValues(satirlar.map(function (r) {
          while (r.length < gen) r.push('');
          return r;
        }));
      }
      METIN_SUTUNLARI[ad].forEach(function (a) { sh.getRange(a).setNumberFormat('@'); });
    });
    semaKontrol_();
    return veriPaketi_(veriOku_());
  });
}
function yedekKlasoru_() {
  const it = DriveApp.getFoldersByName(YEDEK_KLASORU);
  return it.hasNext() ? it.next() : DriveApp.createFolder(YEDEK_KLASORU);
}
function yedekDosyalari_() {
  const it = yedekKlasoru_().getFiles(), liste = [];
  while (it.hasNext()) liste.push(it.next());
  return liste.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
}
function yedekAl_(not) {
  const tz = tz_(), veri = {};
  [SAYFA.KALEM, SAYFA.HAREKET, SAYFA.TUTAR].forEach(function (ad) {
    veri[ad] = sayfa_(ad).getDataRange().getValues().map(function (r) {
      return r.map(function (v) { return Object.prototype.toString.call(v) === '[object Date]' ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v; });
    });
  });
  const ad = 'Ev Bütçesi yedek ' + Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH.mm') + '.json';
  const f = yedekKlasoru_().createFile(ad, JSON.stringify({ surum: SURUM, veri: veri }), MimeType.PLAIN_TEXT);
  f.setDescription(not || '');
  PropertiesService.getScriptProperties().setProperty('SON_YEDEK_GUN', bugun_());
  yedekDosyalari_().slice(YEDEK_SAYISI).forEach(function (x) { x.setTrashed(true); });
}

/** Sürüm 3.3'e geçişte bir kez: geçmiş aylara sonradan girilen kayıtlardaki ödeme gününü siler */
function gecTarihleriTemizle_() {
  const pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('GEC_TARIH_TEMIZ')) return;
  veriOku_().hareketler.forEach(function (h) {
    const t = tarihStr_(h.tarih);
    if (bool_(h.odendi) && t && t.slice(0, 7) > ay_(h.ay)) { h.tarih = ''; satirYaz_(SAYFA.HAREKET, h); }
  });
  pr.setProperty('GEC_TARIH_TEMIZ', '1');
}

/** Yeni sürümde eklenen sütun başlıklarını eski tablolara ekler */
function semaKontrol_() {
  Object.keys(BASLIK).forEach(function (ad) {
    const sh = ss_().getSheetByName(ad);
    if (!sh) return;
    const b = BASLIK[ad], mevcut = sh.getLastColumn();
    if (mevcut < b.length) {
      if (sh.getMaxColumns() < b.length) sh.insertColumnsAfter(sh.getMaxColumns(), b.length - sh.getMaxColumns());
      sh.getRange(1, mevcut + 1, 1, b.length - mevcut).setValues([b.slice(mevcut)]).setFontWeight('bold');
      METIN_SUTUNLARI[ad].forEach(function (a) { sh.getRange(a).setNumberFormat('@'); });
    }
  });
}

function ayarlarOku_() {
  const o = Object.assign({}, VARSAYILAN_AYARLAR);
  oku_(SAYFA.AYAR).forEach(function (r) { o[String(r.anahtar)] = String(r.deger); });
  o.kategoriler = String(o.kategoriler || VARSAYILAN_KATEGORILER.join(','))
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return o;
}

/* ───────────── Geçmiş ayların korunması ───────────── */

/** "acik": düzenlenebilir | "kilitli": son 3 ay, onayla açılır | "arsiv": daha eski, değiştirilemez.
 *  Önceki ay, yeni ayın 10'una kadar açık kalır. */
function ayDurumu_(ay) {
  const bu = buAy_();
  if (ay >= bu) return 'acik';
  const fark = ayFarki_(ay, bu);
  if (fark === 1 && bugunGun_() <= 10) return 'acik';
  return fark <= 3 ? 'kilitli' : 'arsiv';
}
function kilitKontrol_(ay, kilitAcik) {
  const d = ayDurumu_(ay);
  if (d === 'arsiv') throw new Error('Arşivdeki aylar değiştirilemez.');
  if (d === 'kilitli' && !kilitAcik) throw new Error('Bu ay kilitli. Düzenlemek için önce kilidi aç.');
}

/* ───────────── İşlemler (sunucuda ve telefonda aynı kod çalışır) ───────────── */

/** Bir satırı günceller: tutar, odendi, not, atla, geriAl, sonraki (sonraki aylara da uygula) */
function satirKaydet_(veri, p) {
  const ay = ay_(p.ay);
  // "Gecikenler" bölümünden yapılan ödeme kilitli aylarda da yapılabilir (tutar + ödendi + not)
  const gecikenOdeme = !!p.gecikenOdeme && !p.atla && !p.geriAl && !p.sonraki && p.sonTarih === undefined;
  if (!gecikenOdeme) kilitKontrol_(ay, p.kilitAcik);
  const h = satirBul_(String(p.id), ay, veri, p.yeniId);
  if (!gecikenOdeme && ay_(h.ay) !== ay) kilitKontrol_(ay_(h.ay), p.kilitAcik);
  if (p.tutar !== undefined && p.tutar !== null && p.tutar !== '') h.tutar = num_(p.tutar);
  // Ödeme günü: bu ay ya da Gecikenler'den ödenince bugün. Geçmiş aya sonradan girilen kayıtta boş kalır,
  // böylece "Geç ödendi" sadece gerçekten geç ödenenlerde görünür.
  if (p.odendi !== undefined) { h.odendi = !!p.odendi; h.tarih = h.odendi && (gecikenOdeme || ay >= buAy_()) ? bugun_() : ''; }
  if (p.not !== undefined) h.not = String(p.not);
  if (p.ad !== undefined && !h.kalemId && String(p.ad).trim()) h.ad = String(p.ad).trim();
  if (p.sonTarih !== undefined) h.sonTarih = tarihStr_(p.sonTarih);
  if (p.atla) { h.tutar = 0; h.odendi = true; h.not = 'Atlandı'; h.tarih = ''; }
  if (p.geriAl) {
    const k = veri.kalemler.find(function (x) { return String(x.id) === String(h.kalemId); });
    h.not = ''; h.odendi = false; h.tarih = '';
    if (k) h.tutar = tahmin_(k, ay, veri);
  }
  satirYaz_(SAYFA.HAREKET, h);
  if (p.sonraki && h.kalemId) tutarDegistir_(String(h.kalemId), ay, num_(h.tutar), veri);
  return h;
}

/** Tek seferlik harcama / gelir. taksit > 1 ise sonraki aylara böler. */
function harcamaEkle_(veri, p) {
  const ay = ay_(p.ay) || buAy_();
  kilitKontrol_(ay, p.kilitAcik);
  const n = Math.min(36, Math.max(1, parseInt(p.taksit, 10) || 1));
  const toplam = num_(p.tutar);
  if (!(toplam > 0)) throw new Error('Tutar girin.');
  // Borç ödemesi / tahsilat: bağlı olduğu borç ya da alacağın yönünü alır
  const bk = p.bagli ? veri.kalemler.find(function (x) { return String(x.id) === String(p.bagli) && x.tip; }) : null;
  if (p.bagli && !bk) throw new Error('Borç ya da alacak bulunamadı.');
  if (bk) {
    topluEkle_(SAYFA.HAREKET, [{
      id: (p.idler && p.idler[0]) || yeniId_('h'), ay: ay, kalemId: '', ad: String(bk.ad), tur: bk.tur,
      kategori: bk.tip === 'borc' ? 'Borç' : 'Alacak', tutar: toplam, odendi: true, kart: false, tarih: ay >= buAy_() ? bugun_() : '',
      not: String(p.not || ''), sonTarih: '', tip: bk.tip, bagli: String(bk.id)
    }]);
    return;
  }
  const parca = Math.round(toplam / n * 100) / 100;
  const tur = p.tur === 'gelir' ? 'gelir' : 'gider';
  const kart = tur === 'gider' && !!p.kart;
  const ad = String(p.ad || p.kategori || 'Harcama').trim();
  const yeni = [];
  for (let i = 0; i < n; i++) {
    yeni.push({
      id: (p.idler && p.idler[i]) || yeniId_('h'), ay: ayEkle_(ay, i), kalemId: '',
      ad: n > 1 ? ad + ' (' + (i + 1) + '/' + n + ')' : ad,
      tur: tur, kategori: String(p.kategori || 'Diğer'),
      tutar: i === n - 1 ? Math.round((toplam - parca * (n - 1)) * 100) / 100 : parca,
      odendi: kart || i === 0, kart: kart, tarih: i === 0 && ay >= buAy_() ? bugun_() : '', not: String(p.not || ''), tip: '', bagli: ''
    });
  }
  topluEkle_(SAYFA.HAREKET, yeni);
}

/** id tek bir kayıt ya da kayıt listesi olabilir (taksitli eklemeyi geri almak için) */
function satirSil_(veri, id, kilitAcik) {
  const idler = [].concat(id).map(String);
  const silinecek = veri.hareketler.filter(function (x) { return idler.indexOf(String(x.id)) >= 0; });
  silinecek.forEach(function (h) {
    if (h.kalemId) throw new Error('Düzenli kalemler silinmez; bu ay için "Bu ay yok" seçin.');
    if (ay_(h.ay) < buAy_()) kilitKontrol_(ay_(h.ay), kilitAcik);
  });
  if (silinecek.length) satirlariSil_(SAYFA.HAREKET, silinecek.map(function (h) { return h._satir; }));
}

/** Silinen tek seferlik kaydı aynı kimlikle geri koyar (Geri al için) */
function satirGeriEkle_(veri, h, kilitAcik) {
  kilitKontrol_(ay_(h.ay), kilitAcik);
  if (veri.hareketler.some(function (x) { return String(x.id) === String(h.id); })) return;
  topluEkle_(SAYFA.HAREKET, [{
    id: String(h.id), ay: ay_(h.ay), kalemId: '', ad: String(h.ad), tur: h.tur === 'gelir' ? 'gelir' : 'gider',
    kategori: String(h.kategori || ''), tutar: num_(h.tutar), odendi: !!h.odendi, kart: !!h.kart,
    tarih: tarihStr_(h.tarih), not: String(h.not || ''), sonTarih: tarihStr_(h.sonTarih),
    tip: String(h.tip || ''), bagli: String(h.bagli || '')
  }]);
}

function kalemKaydet_(veri, g) {
  const bu = buAy_();
  if (!String(g.ad || '').trim()) throw new Error('Kalem adı boş olamaz.');
  let k = g.id ? veri.kalemler.find(function (x) { return String(x.id) === String(g.id); }) : null;
  const yeniMi = !k;
  if (yeniMi) {
    k = {
      id: g.yeniId || yeniId_('k'), aktif: true,
      sira: veri.kalemler.reduce(function (m, x) { return Math.max(m, num_(x.sira)); }, 0) + 1
    };
  }
  const eskiGuncel = yeniMi ? null : gecerliTutar_(k, bu, veri.deg).tutar;
  // Borç: ödemeler para çıkışı (gider yönü). Alacak: tahsilatlar para girişi (gelir yönü).
  const tip = g.tip === 'borc' || g.tip === 'alacak' ? g.tip : '';
  Object.assign(k, {
    ad: String(g.ad).trim(),
    tur: tip === 'borc' ? 'gider' : tip === 'alacak' ? 'gelir' : (g.tur === 'gelir' ? 'gelir' : 'gider'),
    kategori: tip === 'borc' ? 'Borç' : tip === 'alacak' ? 'Alacak' : String(g.kategori || '').trim(),
    tip: tip, toplam: tip ? (num_(g.toplam) || '') : '',
    degisken: !!g.degisken, aylar: (g.aylar || []).join(','),
    baslangic: g.baslamadi ? '' : (ay_(g.baslangic) || bu), bitis: ay_(g.bitis),
    odemeGunu: Number(g.odemeGunu) || '', zamAyi: Number(g.zamAyi) || '', not: String(g.not || '')
  });
  if (yeniMi) k.tutar = num_(g.tutar);
  satirYaz_(SAYFA.KALEM, k);
  // Yeni borç/alacakta bu ay elden çıkan ya da ele geçen para (eski borçlarda boş bırakılır)
  if (yeniMi && tip && num_(g.girisTutar) > 0) {
    const girisAy = ay_(g.girisAy) || bu;
    if (ayDurumu_(girisAy) === 'arsiv') throw new Error('Arşivdeki bir aya kayıt eklenemez.');
    topluEkle_(SAYFA.HAREKET, [{
      id: g.girisId || yeniId_('h'), ay: girisAy, kalemId: '', ad: k.ad, tur: tip === 'borc' ? 'gelir' : 'gider',
      kategori: k.kategori, tutar: num_(g.girisTutar), odendi: true, kart: false, tarih: girisAy < bu ? '' : bugun_(), not: '',
      sonTarih: '', tip: tip, bagli: String(k.id)
    }]);
  }
  // Mevcut kalemde tutar değiştiyse: geçmişi bozmadan bu aydan itibaren geçerli yap
  if (!yeniMi && num_(g.tutar) !== eskiGuncel) tutarDegistir_(String(k.id), bu, num_(g.tutar), veri);
  senkron_(k, veri);
}

function kalemSonlandir_(veri, id) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id); });
  if (!k) throw new Error('Kalem bulunamadı.');
  k.aktif = false;
  satirYaz_(SAYFA.KALEM, k);
  if (k.tip) {
    // Kapatılan borç/alacak: ödenmemiş taksitler (hangi ayda olursa olsun) kalkar, ödenenler kalır
    satirlariSil_(SAYFA.HAREKET, veri.hareketler.filter(function (h) {
      return String(h.kalemId) === String(k.id) && !bool_(h.odendi);
    }).map(function (h) { return h._satir; }));
  } else senkron_(k, veri);
}

function kalemYenidenAc_(veri, id) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id); });
  if (!k) throw new Error('Kalem bulunamadı.');
  k.aktif = true;
  satirYaz_(SAYFA.KALEM, k);
}

/** Aylık listeden borç ya da alacak ekler: kişi + tutar (giriş kaydı) ve geri ödeme şekli.
 *  sekil: "tek" (tek seferde, tarihli) | "taksit" (aylık taksit) | "belirsiz" (ödedikçe eklenir) */
function borcEkle_(veri, p) {
  const ay = ay_(p.ay) || buAy_();
  kilitKontrol_(ay, p.kilitAcik);
  const tip = p.tip === 'alacak' ? 'alacak' : 'borc';
  const ad = String(p.ad || '').trim();
  if (!ad) throw new Error(tip === 'borc' ? 'Kimden aldığını yaz.' : 'Kime verdiğini yaz.');
  const tutar = num_(p.tutar);
  if (!(tutar > 0)) throw new Error('Tutar girin.');
  const k = {
    id: p.kalemId || yeniId_('k'), ad: ad, tur: tip === 'borc' ? 'gider' : 'gelir', kategori: tip === 'borc' ? 'Borç' : 'Alacak',
    degisken: false, aylar: '', zamAyi: '', aktif: true, not: String(p.not || ''), tip: tip, odemeGunu: '', bitis: '',
    sira: veri.kalemler.reduce(function (m, x) { return Math.max(m, num_(x.sira)); }, 0) + 1
  };
  if (p.sekil === 'tek') {
    const t = tarihStr_(p.tarih);
    if (!t) throw new Error('Geri ödeme tarihini seç.');
    if (t.slice(0, 7) < ay) throw new Error('Geri ödeme tarihi, borcun alındığı aydan önce olamaz.');
    Object.assign(k, { baslangic: t.slice(0, 7), bitis: t.slice(0, 7), odemeGunu: Number(t.slice(8, 10)), tutar: tutar, toplam: tutar });
  } else if (p.sekil === 'taksit') {
    const n = Math.min(120, Math.max(1, parseInt(p.taksitSayisi, 10) || 1));
    const taksit = num_(p.taksit);
    if (!(taksit > 0)) throw new Error('Aylık taksiti yaz.');
    const ilk = ay_(p.ilkAy) || ayEkle_(ay, 1);
    Object.assign(k, { baslangic: ilk, bitis: ayEkle_(ilk, n - 1), tutar: taksit, toplam: Math.round(taksit * n * 100) / 100 });
  } else {
    Object.assign(k, { baslangic: '', tutar: 0, toplam: tutar });
  }
  satirYaz_(SAYFA.KALEM, k);
  topluEkle_(SAYFA.HAREKET, [{
    id: p.girisId || yeniId_('h'), ay: ay, kalemId: '', ad: ad, tur: tip === 'borc' ? 'gelir' : 'gider',
    kategori: k.kategori, tutar: tutar, odendi: true, kart: false, tarih: ay >= buAy_() ? bugun_() : '',
    not: String(p.not || ''), sonTarih: '', tip: tip, bagli: String(k.id)
  }]);
}

/** Yanlış girilen borcu tamamen siler. Ödemesi yapılmış borç silinmez (kapatılır). */
function borcSil_(veri, id, kilitAcik) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id) && x.tip; });
  if (!k) throw new Error('Borç bulunamadı.');
  const ait = veri.hareketler.filter(function (h) { return String(h.bagli || '') === String(k.id) || String(h.kalemId) === String(k.id); });
  if (ait.some(function (h) { return h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı'; }))
    throw new Error('Bu kayda ödeme yapılmış, silinemez. Bunun yerine kapatabilirsin.');
  ait.forEach(function (h) { if (ay_(h.ay) < buAy_()) kilitKontrol_(ay_(h.ay), kilitAcik); });
  satirlariSil_(SAYFA.HAREKET, ait.map(function (h) { return h._satir; }));
  satirlariSil_(SAYFA.KALEM, [k._satir]);
}

function kalemTasi_(veri, id, yon) {
  const grup = veri.kalemler.filter(function (k) { return bool_(k.aktif); })
    .sort(function (a, b) { return num_(a.sira) - num_(b.sira); });
  const yeni = {};
  grup.forEach(function (k, i) { yeni[k.id] = i + 1; });
  const ben = grup.find(function (k) { return String(k.id) === String(id); });
  if (ben) {
    const grupAdi = function (k) { return k.tip || k.tur; };
    const ayni = grup.filter(function (k) { return grupAdi(k) === grupAdi(ben); });
    const i = ayni.indexOf(ben), j = i + (yon < 0 ? -1 : 1);
    if (j >= 0 && j < ayni.length) {
      const t = yeni[ben.id]; yeni[ben.id] = yeni[ayni[j].id]; yeni[ayni[j].id] = t;
    }
  }
  grup.forEach(function (k) {
    if (num_(k.sira) !== yeni[k.id]) { k.sira = yeni[k.id]; satirYaz_(SAYFA.KALEM, k); }
  });
}

/* ───────────── Hesaplama ───────────── */

/** Bir ayın satırlarını ve özetini hesaplar (yazmaz). Kaydı olmayan kalemler "sanal" satır olarak gösterilir. */
function ayHesapla_(ay, veri) {
  const bu = buAy_();
  if (veri.gun === undefined) veri.gun = bugunGun_();
  if (veri.bugun === undefined) veri.bugun = bugun_();
  const kMap = {};
  veri.kalemler.forEach(function (k) { kMap[String(k.id)] = k; });
  const satirlar = [], olan = {};
  veri.hareketler.forEach(function (h) {
    if (ay_(h.ay) !== ay) return;
    const k = h.kalemId ? kMap[String(h.kalemId)] : null;
    if (h.kalemId) olan[String(h.kalemId)] = true;
    satirlar.push(satirNesne_(h, k, ay, veri, bu, false));
  });
  if (ay > bu || veri.sanalHepsi) {
    veri.kalemler.forEach(function (k) {
      if (olan[String(k.id)] || !kalemBuAyda_(k, ay) || borcBitti_(k, veri)) return;
      const h = hareketYeni_(k, ay, veri);
      h.id = 'v:' + k.id;
      satirlar.push(satirNesne_(h, k, ay, veri, bu, true));
    });
  }
  satirlar.sort(function (a, b) { return (a.sira - b.sira) || (a.satir - b.satir); });

  const o = { gelir: 0, gider: 0, gelirAlinan: 0, giderOdenen: 0, kart: 0, borc: 0 };
  satirlar.forEach(function (s) {
    if (s.kart) { o.kart += s.tutar; return; }
    if (s.tip) { o.borc += s.tur === 'gelir' ? s.tutar : -s.tutar; return; } // gelir/gider sayılmaz, kalana dahil

    if (s.tur === 'gelir') { o.gelir += s.tutar; if (s.odendi) o.gelirAlinan += s.tutar; }
    else { o.gider += s.tutar; if (s.odendi) o.giderOdenen += s.tutar; }
  });
  o.kalan = o.gelir - o.gider + o.borc;
  o.bekleyen = o.gider - o.giderOdenen;
  return { ay: ay, buAy: bu, satirlar: satirlar, ozet: o };
}

/** Geçmiş ve bu ay için şablondaki eksik satırları Hareketler'e yazar (özet tablo için) */
function ayiHazirla_(ay, veri) {
  const olan = {};
  veri.hareketler.forEach(function (h) { if (ay_(h.ay) === ay && h.kalemId !== '') olan[String(h.kalemId)] = true; });
  const yeni = [];
  veri.kalemler.forEach(function (k) {
    if (olan[String(k.id)] || !kalemBuAyda_(k, ay) || borcBitti_(k, veri)) return;
    yeni.push(hareketYeni_(k, ay, veri));
  });
  if (yeni.length) {
    topluEkle_(SAYFA.HAREKET, yeni);
    yeni.forEach(function (h) { veri.hareketler.push(h); });
  }
}

function satirNesne_(h, k, ay, veri, bu, sanal) {
  const s = {
    id: String(h.id), kalemId: h.kalemId ? String(h.kalemId) : '',
    ad: String(h.ad), tur: h.tur === 'gelir' ? 'gelir' : 'gider', kategori: String(h.kategori || ''),
    tutar: num_(h.tutar), odendi: bool_(h.odendi), kart: bool_(h.kart), not: String(h.not || ''),
    sanal: !!sanal, sira: k ? num_(k.sira) : 9999, satir: h._satir || 0,
    tip: String(h.tip || (k && k.tip) || ''), bagli: String(h.bagli || (k && k.tip ? k.id : '') || ''),
    rozetler: [], gecikti: false, zam: false, atlandi: false
  };
  let gun = 0;
  if (k) {
    const bas = ay_(k.baslangic), bit = ay_(k.bitis);
    if (bas && bit && !aylarListe_(k.aylar).length) {
      s.rozetler.push((ayFarki_(bas, ay) + 1) + '/' + (ayFarki_(bas, bit) + 1));
    }
    // Zam uyarısı: kalem başladıktan sonraki ilk iki ayda gösterilmez
    if (Number(k.zamAyi) === Number(ay.slice(5)) && !s.odendi && (!bas || ayFarki_(bas, ay) >= 2) &&
      !veri.deg.some(function (d) { return String(d.kalemId) === s.kalemId && ay_(d.gecerliAy) === ay; })) {
      s.zam = true;
    }
    gun = Number(k.odemeGunu) || 0;
  }
  // Son ödeme tarihi: bu aya özel girilen tarih, yoksa kalemin her ayki son ödeme günü
  s.sonTarih = tarihStr_(h.sonTarih) ||
    (gun ? ay + '-' + String(Math.min(gun, ayGunSayisi_(ay))).padStart(2, '0') : '');
  s.odemeTarihi = tarihStr_(h.tarih);
  if (s.not === 'Atlandı') s.atlandi = true;
  if (!s.odendi && !s.kart && !s.atlandi) {
    s.gecikti = s.sonTarih ? veri.bugun > s.sonTarih : ay < bu;
  }
  return s;
}

function kalemBuAyda_(k, ay) {
  if (!bool_(k.aktif)) return false;
  const bas = ay_(k.baslangic), bit = ay_(k.bitis);
  if (!bas) return false; // henüz başlamadı
  if (ay < bas) return false;
  if (bit && ay > bit) return false;
  const aylar = aylarListe_(k.aylar);
  return !aylar.length || aylar.indexOf(Number(ay.slice(5))) >= 0;
}

function hareketYeni_(k, ay, veri) {
  return {
    id: yeniId_('h'), ay: ay, kalemId: String(k.id), ad: k.ad, tur: k.tur, kategori: k.kategori,
    tutar: tahmin_(k, ay, veri), odendi: false, kart: false, tarih: '', not: '', sonTarih: '',
    tip: String(k.tip || ''), bagli: k.tip ? String(k.id) : ''
  };
}

function gecerliTutar_(k, ay, deg) {
  let tutar = num_(k.tutar), degAy = '';
  deg.forEach(function (d) {
    const g = ay_(d.gecerliAy);
    if (String(d.kalemId) === String(k.id) && g && g <= ay && g >= degAy) { degAy = g; tutar = num_(d.tutar); }
  });
  return { tutar: tutar, degAy: degAy };
}

/** Değişken kalemlerde son ödenen tutarı, sabitlerde geçerli tutarı önerir */
function tahmin_(k, ay, veri) {
  const g = gecerliTutar_(k, ay, veri.deg);
  if (!bool_(k.degisken)) return g.tutar;
  let son = null, sonAy = '';
  veri.hareketler.forEach(function (h) {
    const hAy = ay_(h.ay);
    if (String(h.kalemId) === String(k.id) && bool_(h.odendi) && num_(h.tutar) > 0 && hAy < ay && hAy > sonAy) {
      sonAy = hAy; son = num_(h.tutar);
    }
  });
  return (son !== null && sonAy >= g.degAy) ? son : g.tutar;
}

function tutarDegistir_(kalemId, ay, tutar, veri) {
  let d = veri.deg.find(function (x) { return String(x.kalemId) === kalemId && ay_(x.gecerliAy) === ay; });
  if (!d) { d = { kalemId: kalemId, gecerliAy: ay }; veri.deg.push(d); }
  d.tutar = tutar;
  satirYaz_(SAYFA.TUTAR, d);
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) === kalemId && ay_(h.ay) >= ay && !bool_(h.odendi) && h.not !== 'Atlandı') {
      h.tutar = tutar;
      satirYaz_(SAYFA.HAREKET, h);
    }
  });
}

/** Kalem değişince bu ay ve sonrasındaki ödenmemiş satırları uyumlu hale getirir */
function senkron_(k, veri) {
  const bu = buAy_(), sil = [];
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) !== String(k.id)) return;
    const tip = String(k.tip || '');
    if (String(h.tip || '') !== tip || (tip && h.tur !== k.tur)) {
      h.tip = tip; h.bagli = tip ? String(k.id) : ''; h.tur = k.tur; h.kategori = k.kategori;
      satirYaz_(SAYFA.HAREKET, h);
    }
  });
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) !== String(k.id) || ay_(h.ay) < bu || bool_(h.odendi)) return;
    if (!kalemBuAyda_(k, ay_(h.ay))) { sil.push(h._satir); return; }
    if (h.ad !== k.ad || h.tur !== k.tur || h.kategori !== k.kategori) {
      h.ad = k.ad; h.tur = k.tur; h.kategori = k.kategori;
      satirYaz_(SAYFA.HAREKET, h);
    }
  });
  satirlariSil_(SAYFA.HAREKET, sil);
}

/** "v:kalemId" sanal satırsa kaydı oluşturur (o ay için zaten varsa onu kullanır) */
function satirBul_(id, ay, veri, yeniId) {
  if (id.indexOf('v:') === 0) {
    const kid = id.slice(2);
    const mevcut = veri.hareketler.find(function (x) { return String(x.kalemId) === kid && ay_(x.ay) === ay; });
    if (mevcut) { if (yeniId) mevcut.id = yeniId; return mevcut; }
    const k = veri.kalemler.find(function (x) { return String(x.id) === kid; });
    if (!k) throw new Error('Kalem bulunamadı.');
    const h = hareketYeni_(k, ay, veri);
    if (yeniId) h.id = yeniId;
    veri.hareketler.push(h);
    return h;
  }
  const h = veri.hareketler.find(function (x) { return String(x.id) === id; });
  if (!h) throw new Error('Kayıt bulunamadı. Uygulamayı yeniden açın.');
  return h;
}

function kalemListesiHesapla_(veri) {
  const bu = buAy_();
  return veri.kalemler.filter(function (k) { return bool_(k.aktif); }).map(function (k) {
    return {
      id: String(k.id), sira: num_(k.sira), ad: String(k.ad), tur: k.tur === 'gelir' ? 'gelir' : 'gider',
      kategori: String(k.kategori || ''), tutar: gecerliTutar_(k, bu, veri.deg).tutar, oneri: tahmin_(k, bu, veri),
      degisken: bool_(k.degisken), aylar: aylarListe_(k.aylar), baslangic: ay_(k.baslangic), bitis: ay_(k.bitis),
      baslamadi: !ay_(k.baslangic), odemeGunu: Number(k.odemeGunu) || '', zamAyi: Number(k.zamAyi) || '', not: String(k.not || ''),
      tip: String(k.tip || ''), toplam: num_(k.toplam) || 0, odenen: k.tip ? borcOdenen_(k, veri) : 0
    };
  }).sort(function (a, b) { return a.sira - b.sira; });
}

/** Toplamı belli bir borç/alacak tamamen ödendiyse true (yeni taksit satırı oluşmaz) */
function borcBitti_(k, veri) {
  return !!k.tip && num_(k.toplam) > 0 && borcOdenen_(k, veri) >= num_(k.toplam) - 0.005;
}

/** Borçta ödenen, alacakta tahsil edilen toplam (sadece gerçekten tiklenmiş kayıtlar) */
function borcOdenen_(k, veri) {
  let t = 0;
  veri.hareketler.forEach(function (h) {
    const bagli = String(h.bagli || '') === String(k.id) || String(h.kalemId) === String(k.id);
    if (bagli && h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı') t += num_(h.tutar);
  });
  return t;
}

function istatistikHesapla_(veri, yil) {
  const bu = buAy_();
  const eski = veri.sanalHepsi;
  veri.sanalHepsi = true;
  const kat = {};
  let gelirT = 0, giderT = 0, doluAy = 0;
  const aylar = [];
  for (let m = 1; m <= 12; m++) aylar.push(yil + '-' + String(m).padStart(2, '0'));
  const sonuc = aylar.map(function (a) {
    const d = ayHesapla_(a, veri);
    if (a <= bu) {
      gelirT += d.ozet.gelir; giderT += d.ozet.gider;
      if (d.satirlar.length) doluAy++;
      d.satirlar.forEach(function (s) {
        if (s.tur === 'gider' && !s.kart && !s.tip && s.tutar > 0) {
          const ad = s.kategori || 'Diğer';
          kat[ad] = (kat[ad] || 0) + s.tutar;
        }
      });
    }
    return { ay: a, gelir: d.ozet.gelir, gider: d.ozet.gider, gelecek: a > bu };
  });
  veri.sanalHepsi = eski;
  let ilkAy = bu;
  veri.hareketler.forEach(function (h) { const a = ay_(h.ay); if (a && a < ilkAy) ilkAy = a; });
  veri.kalemler.forEach(function (k) { const a = ay_(k.baslangic); if (a && a < ilkAy) ilkAy = a; });
  return {
    yil: yil, aylar: sonuc,
    kategoriler: Object.keys(kat).map(function (k) { return { ad: k, tutar: kat[k] }; })
      .sort(function (a, b) { return b.tutar - a.tutar; }),
    toplam: { gelir: gelirT, gider: giderT, fark: gelirT - giderT, ortalamaGider: doluAy ? Math.round(giderT / doluAy) : 0 },
    ilkYil: Number(ilkAy.slice(0, 4)), buYil: Number(bu.slice(0, 4))
  };
}

/* ───────────── Tablo yardımcıları ───────────── */

function ss_() { return SpreadsheetApp.getActive(); }
function sayfa_(ad) {
  const sh = ss_().getSheetByName(ad);
  if (!sh) throw new Error('"' + ad + '" sayfası yok. Önce kurulum fonksiyonunu çalıştırın.');
  return sh;
}
function veriOku_() {
  return { kalemler: oku_(SAYFA.KALEM), hareketler: oku_(SAYFA.HAREKET), deg: oku_(SAYFA.TUTAR) };
}
function oku_(ad) {
  const v = sayfa_(ad).getDataRange().getValues();
  const b = v[0] || [], out = [];
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] === '' || v[i][0] === null) continue;
    const o = { _satir: i + 1 };
    b.forEach(function (k, j) { o[k] = v[i][j]; });
    out.push(o);
  }
  return out;
}
function satirYaz_(ad, n) {
  const sh = sayfa_(ad), b = BASLIK[ad];
  const r = n._satir || sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, b.length).setValues([b.map(function (k) { return n[k] === undefined || n[k] === null ? '' : n[k]; })]);
  n._satir = r;
}
function topluEkle_(ad, liste) {
  if (!liste.length) return;
  const sh = sayfa_(ad), b = BASLIK[ad], bas = sh.getLastRow() + 1;
  sh.getRange(bas, 1, liste.length, b.length).setValues(liste.map(function (n) {
    return b.map(function (k) { return n[k] === undefined || n[k] === null ? '' : n[k]; });
  }));
  liste.forEach(function (n, i) { n._satir = bas + i; });
}
function satirlariSil_(ad, satirlar) {
  const sh = sayfa_(ad);
  satirlar.slice().sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}
function ayarOku_(anahtar) {
  const r = oku_(SAYFA.AYAR).find(function (x) { return x.anahtar === anahtar; });
  return r ? String(r.deger) : '';
}
function ayarYaz_(anahtar, deger) {
  const r = oku_(SAYFA.AYAR).find(function (x) { return x.anahtar === anahtar; }) || { anahtar: anahtar };
  r.deger = deger;
  satirYaz_(SAYFA.AYAR, r);
}
function kategoriler_() {
  return (ayarOku_('kategoriler') || VARSAYILAN_KATEGORILER.join(','))
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}
function kilitli_(fn) {
  const l = LockService.getScriptLock();
  l.waitLock(20000);
  try { return fn(); } finally { l.releaseLock(); }
}

/* ───────────── Küçük yardımcılar ───────────── */

function tz_() { return ss_().getSpreadsheetTimeZone(); }
function buAy_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM'); }
function bugun_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function bugunGun_() { return Number(Utilities.formatDate(new Date(), tz_(), 'd')); }
function yeniId_(on) { return (on || '') + Utilities.getUuid().replace(/-/g, '').slice(0, 9); }
function bool_(v) { return v === true || v === 1 || String(v).toUpperCase() === 'TRUE'; }
function num_(v) {
  if (typeof v === 'number') return v;
  const s = String(v === undefined || v === null ? '' : v).replace(/\s|₺|TL/gi, '');
  if (!s) return 0;
  const n = s.indexOf(',') >= 0 ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function ay_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM');
  const m = String(v).trim().match(/^(\d{4})-(\d{1,2})/);
  return m ? m[1] + '-' + m[2].padStart(2, '0') : '';
}
function aylarListe_(v) {
  return String(v === undefined || v === null ? '' : v).split(/[^0-9]+/).filter(Boolean).map(Number)
    .filter(function (n) { return n >= 1 && n <= 12; });
}
function ayEkle_(ay, n) {
  const p = ay.split('-').map(Number);
  let y = p[0], m = p[1] + n;
  y += Math.floor((m - 1) / 12);
  m = (((m - 1) % 12) + 12) % 12 + 1;
  return y + '-' + String(m).padStart(2, '0');
}
function tarihStr_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : '';
}
function ayGunSayisi_(ay) {
  return new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)), 0).getDate();
}
function ayFarki_(a, b) {
  const x = a.split('-').map(Number), y = b.split('-').map(Number);
  return (y[0] - x[0]) * 12 + (y[1] - x[1]);
}


/* ───────────── Yıllık özet sayfası (sadece görüntü, uygulamadan otomatik oluşur) ───────────── */

const RENK = {
  baslik: '#1D5870', baslikYazi: '#FFFFFF', alt: '#5F6F75', cizgi: '#D7DFDC',
  gelirBas: '#1E8449', gelirAd: '#E6F4EA', giderBas: '#A23B3F', giderAd: '#FBEAEA', araBas: '#F3F6F5',
  odendi: '#DCF1E3', odendiYazi: '#1E8449', gecikti: '#FBE1E1', geciktiYazi: '#C62828',
  bekliyorYazi: '#4A5258', tahminYazi: '#9AA5AB', buAy: '#F6EACB', kalan: '#1D5870'
};
const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Bir yılın satır/sütun düzenini ve renklerini hesaplar (tabloya yazmadan) */
function yillikIcerik_(yil, veri) {
  const bu = buAy_();
  const aylar = AY_ADLARI.map(function (_, i) { return yil + '-' + String(i + 1).padStart(2, '0'); });
  aylar.forEach(function (a) { if (a <= bu) ayiHazirla_(a, veri); });
  const hesap = aylar.map(function (a) { return ayHesapla_(a, veri); });

  // Satır anahtarları: düzenli kalemler tek tek, diğer harcamalar kategoriye göre
  const gruplar = {};
  const sira = [];
  hesap.forEach(function (h, mi) {
    h.satirlar.forEach(function (s) {
      let key, ad, bolum, srt;
      if (s.kart) { key = 'kart'; ad = 'Kartla yapılanlar (toplama dahil değil)'; bolum = 'kart'; srt = 99999; }
      else if (s.tip) {
        const bk = veri.kalemler.find(function (x) { return String(x.id) === String(s.bagli || s.kalemId); });
        key = 'b:' + (s.bagli || s.kalemId); bolum = 'borc'; srt = bk ? num_(bk.sira) : 9999;
        ad = (bk ? bk.ad : s.ad) + (s.tip === 'borc' ? ' (borç)' : ' (alacak)');
      }
      else if (s.kalemId) { key = 'k:' + s.kalemId; ad = s.ad; bolum = s.tur === 'gelir' ? 'gelir' : 'duzenli'; srt = s.sira; }
      else { key = 'e:' + s.tur + ':' + (s.kategori || 'Diğer'); ad = s.kategori || 'Diğer'; bolum = s.tur === 'gelir' ? 'gelir' : 'diger'; srt = 10000 + ad.charCodeAt(0); }
      if (!gruplar[key]) { gruplar[key] = { ad: ad, bolum: bolum, sira: srt, aylar: aylar.map(function () { return null; }) }; sira.push(key); }
      const g = gruplar[key];
      if (s.kalemId && !s.tip) g.ad = s.ad;
      const c = g.aylar[mi] || (g.aylar[mi] = { tutar: 0, durumlar: [], notlar: [] });
      c.tutar += (bolum === 'borc' && s.tur !== 'gelir') ? -s.tutar : s.tutar;
      c.durumlar.push(s.kart ? 'notr' : s.atlandi ? 'atla' : s.odendi ? 'odendi' : s.gecikti ? 'gecikti' : (s.sanal || aylar[mi] > bu) ? 'tahmin' : 'bekliyor');
      if (s.not && !s.atlandi) c.notlar.push((s.kalemId ? '' : s.ad + ': ') + s.not);
    });
  });
  const bolumu = function (b) {
    return sira.map(function (k) { return gruplar[k]; }).filter(function (g) { return g.bolum === b; })
      .sort(function (a, c) { return a.sira - c.sira || a.ad.localeCompare(c.ad, 'tr'); });
  };

  const satirlar = []; // her biri {tip, ad, hucreler:[{v, durum, not}], toplam}
  const ekle = function (tip, ad, grup) {
    const h = aylar.map(function (_, i) {
      const c = grup && grup.aylar[i];
      if (!c) return { v: '', durum: '' };
      const d = c.durumlar;
      const durum = d.indexOf('gecikti') >= 0 ? 'gecikti'
        : d.every(function (x) { return x === 'odendi' || x === 'atla'; }) ? (d.every(function (x) { return x === 'atla'; }) ? 'atla' : 'odendi')
          : d.indexOf('notr') >= 0 ? 'notr' : d.indexOf('bekliyor') >= 0 ? 'bekliyor' : 'tahmin';
      return { v: c.tutar, durum: durum, not: c.notlar.join('\n') };
    });
    satirlar.push({ tip: tip, ad: ad, hucreler: h });
  };
  const toplamSatiri = function (tip, ad, fn) {
    satirlar.push({ tip: tip, ad: ad, hucreler: hesap.map(function (h, i) { return { v: fn(h.ozet), durum: aylar[i] > bu ? 'tahmin' : '' }; }) });
  };

  satirlar.push({ tip: 'gelirBas', ad: 'GELİRLER' });
  bolumu('gelir').forEach(function (g) { ekle('gelir', g.ad, g); });
  toplamSatiri('toplamGelir', 'Toplam gelir', function (o) { return o.gelir; });
  satirlar.push({ tip: 'bosluk', ad: '' });
  satirlar.push({ tip: 'giderBas', ad: 'GİDERLER' });
  satirlar.push({ tip: 'ara', ad: 'Düzenli giderler' });
  bolumu('duzenli').forEach(function (g) { ekle('gider', g.ad, g); });
  const diger = bolumu('diger');
  if (diger.length) {
    satirlar.push({ tip: 'ara', ad: 'Diğer harcamalar' });
    diger.forEach(function (g) { ekle('gider', g.ad, g); });
  }
  toplamSatiri('toplamGider', 'Toplam gider', function (o) { return o.gider; });
  if (gruplar.kart) ekle('kart', gruplar.kart.ad, gruplar.kart);
  const borclar = bolumu('borc');
  if (borclar.length) {
    satirlar.push({ tip: 'bosluk', ad: '' });
    satirlar.push({ tip: 'borcBas', ad: 'BORÇ VE ALACAK  (+ giriş, − çıkış)' });
    borclar.forEach(function (g) { ekle('borc', g.ad, g); });
  }
  satirlar.push({ tip: 'bosluk', ad: '' });
  toplamSatiri('kalan', 'Ay sonu kalan', function (o) { return o.kalan; });
  return { aylar: aylar, bu: bu, satirlar: satirlar };
}

function yillikTablo_(yil) {
  const ss = ss_();
  const veri = veriOku_();
  const ic = yillikIcerik_(yil, veri);
  const adi = 'Özet ' + yil;
  let sh = ss.getSheetByName(adi);
  if (!sh) {
    sh = ss.insertSheet(adi, 0);
    sh.setTabColor(RENK.baslik);
    sh.protect().setDescription('Otomatik oluşturulur').setWarningOnly(true);
  }
  const SUTUN = 14, ust = 3, n = ic.satirlar.length;
  sh.setFrozenRows(0); sh.setFrozenColumns(0);
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart();
  sh.clear(); sh.clearNotes();
  if (sh.getMaxColumns() < SUTUN) sh.insertColumnsAfter(sh.getMaxColumns(), SUTUN - sh.getMaxColumns());
  if (sh.getMaxRows() < ust + n + 2) sh.insertRowsAfter(sh.getMaxRows(), ust + n + 2 - sh.getMaxRows());
  sh.setHiddenGridlines(true);

  // Başlık
  // Hücre birleştirme yok (dondurulmuş sütunla çakışıyor); yazı yan hücrelere taşar
  sh.getRange(1, 1, 1, SUTUN).setBackground(RENK.baslik).setVerticalAlignment('middle');
  sh.getRange(1, 1).setValue(yil + ' GELİR – GİDER')
    .setFontColor(RENK.baslikYazi).setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('left').setWrap(false);
  sh.getRange(2, 1).setValue('Otomatik oluşur, buraya yazmayın.')
    .setFontColor(RENK.alt).setFontSize(9).setVerticalAlignment('middle').setWrap(false);
  sh.getRange(2, 2).setValue('Yeşil: ödendi     Kırmızı: ödenmedi     Gri: bekliyor     Soluk italik: tahmini')
    .setFontColor(RENK.alt).setFontSize(9).setVerticalAlignment('middle').setHorizontalAlignment('left').setWrap(false);
  const bas = ['Kalem'].concat(AY_ADLARI, ['Yıl toplamı']);
  sh.getRange(ust, 1, 1, SUTUN).setValues([bas]).setFontWeight('bold').setBackground('#24323A').setFontColor('#FFFFFF')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(ust, 1).setHorizontalAlignment('left');
  const buAyIdx = ic.aylar.indexOf(ic.bu);
  if (buAyIdx >= 0) sh.getRange(ust, buAyIdx + 2).setBackground('#8A5D05');

  // Gövde
  const deg = [], arka = [], yazi = [], kalin = [], egik = [], notlar = [], hiza = [];
  ic.satirlar.forEach(function (r) {
    const d = [r.ad], a = [], y = [], k = [], e = [], nt = [''], hz = ['left'];
    let toplam = 0, var_ = false;
    for (let i = 0; i < 12; i++) {
      const c = r.hucreler ? r.hucreler[i] : null;
      d.push(c ? c.v : '');
      nt.push(c && c.not ? c.not : '');
      hz.push('right');
      if (c && c.v !== '' && c.durum !== 'tahmin' && r.tip !== 'kart') { toplam += c.v; var_ = true; }
    }
    d.push(r.hucreler && var_ ? toplam : ''); nt.push(''); hz.push('right');
    for (let j = 0; j < SUTUN; j++) {
      const c = j >= 1 && j <= 12 && r.hucreler ? r.hucreler[j - 1] : null;
      let bg = '#FFFFFF', fc = RENK.bekliyorYazi, fw = 'normal', fs = 'normal';
      if (r.tip === 'gelirBas') { bg = RENK.gelirBas; fc = '#FFFFFF'; fw = 'bold'; }
      else if (r.tip === 'giderBas') { bg = RENK.giderBas; fc = '#FFFFFF'; fw = 'bold'; }
      else if (r.tip === 'borcBas') { bg = '#8A5D05'; fc = '#FFFFFF'; fw = 'bold'; }
      else if (r.tip === 'ara') { bg = RENK.araBas; fc = RENK.alt; fw = 'bold'; }
      else if (r.tip === 'bosluk') { bg = '#FFFFFF'; }
      else if (r.tip === 'kalan') { bg = RENK.kalan; fc = '#FFFFFF'; fw = 'bold'; if (c && c.durum === 'tahmin') fs = 'italic'; }
      else if (r.tip === 'toplamGelir' || r.tip === 'toplamGider') {
        bg = '#F3F6F5'; fw = 'bold'; fc = r.tip === 'toplamGelir' ? RENK.gelirBas : RENK.giderBas;
        if (c && c.durum === 'tahmin') { fs = 'italic'; fc = RENK.tahminYazi; }
      } else {
        if (j === 0) { bg = r.tip === 'gelir' ? RENK.gelirAd : r.tip === 'kart' ? '#FFFFFF' : r.tip === 'borc' ? '#FBF3E0' : RENK.giderAd; fc = '#15252B'; fw = r.tip === 'kart' ? 'normal' : '500'; if (r.tip === 'kart') { fs = 'italic'; fc = RENK.alt; } }
        else if (j === 13) { fw = 'bold'; fc = '#15252B'; bg = '#F3F6F5'; }
        else if (c && c.v !== '') {
          if (c.durum === 'odendi') { bg = RENK.odendi; fc = RENK.odendiYazi; }
          else if (c.durum === 'gecikti') { bg = RENK.gecikti; fc = RENK.geciktiYazi; fw = 'bold'; }
          else if (c.durum === 'tahmin') { fc = RENK.tahminYazi; fs = 'italic'; }
          else if (c.durum === 'atla' || c.durum === 'notr') { fc = RENK.tahminYazi; }
        }
      }
      if (fw === '500') fw = 'normal';
      a.push(bg); y.push(fc); k.push(fw); e.push(fs);
    }
    deg.push(d); arka.push(a); yazi.push(y); kalin.push(k); egik.push(e); notlar.push(nt); hiza.push(hz);
  });
  const govde = sh.getRange(ust + 1, 1, n, SUTUN);
  govde.setValues(deg).setBackgrounds(arka).setFontColors(yazi).setFontWeights(kalin).setFontStyles(egik)
    .setNotes(notlar).setHorizontalAlignments(hiza).setVerticalAlignment('middle');
  sh.getRange(ust + 1, 2, n, SUTUN - 1).setNumberFormat('#,##0 "₺";-#,##0 "₺";""');
  govde.setBorder(null, null, true, null, null, true, RENK.cizgi, SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(ust, 2, n + 1, 1).setBorder(null, true, null, null, null, null, '#9AA5AB', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(ust, SUTUN, n + 1, 1).setBorder(null, true, null, null, null, null, '#9AA5AB', SpreadsheetApp.BorderStyle.SOLID);

  // Ölçüler
  sh.setRowHeight(1, 40); sh.setRowHeight(2, 22); sh.setRowHeight(ust, 30);
  sh.setRowHeights(ust + 1, n, 26);
  ic.satirlar.forEach(function (r, i) { if (r.tip === 'bosluk') sh.setRowHeight(ust + 1 + i, 10); });
  sh.setColumnWidth(1, 230); sh.setColumnWidths(2, 12, 92); sh.setColumnWidth(SUTUN, 110);
  sh.setFrozenRows(ust); sh.setFrozenColumns(1);
  return adi;
}
