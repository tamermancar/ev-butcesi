/**
 * EV BÜTÇESİ — Gelir Gider Defteri  (sürüm 3.5)
 * Veriler: Google E-Tablolar  |  Uygulama ekranı ve hesaplama kodu (ortak.js): GitHub Pages
 * Bu dosya sadece tabloya okuma/yazma, yedek ve özet sayfası işlerini yapar.
 * Hesaplama kuralları GitHub'daki ortak.js'tedir; Kod.gs onu oradan okur. Bu yüzden bu dosya nadiren değişir.
 *
 * İLK KURULUM / GÜNCELLEME SONRASI: "kurulum" fonksiyonunu bir kez çalıştırın.
 * Bağlantı anahtarı: tabloda Bütçe → Bağlantı bilgilerini göster.
 * Sayfalar (gri sekmeler uygulamanın veri deposudur, elle doldurmayın):
 *   Kalemler             → sabit/düzenli kalemler (şablon)
 *   Hareketler           → her ayın gerçek kayıtları
 *   TutarDegisiklikleri  → zam / tutar değişikliği geçmişi
 *   Ayarlar              → kategoriler ve görünüm ayarları
 */

const SURUM = '3.5';
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
    ortakYukle_(istek.kod);
    cevap = { ok: true, sonuc: fn.apply(null, istek.args || []) };
  } catch (err) {
    cevap = { ok: false, hata: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(cevap)).setMimeType(ContentService.MimeType.JSON);
}

/** GitHub'daki ortak.js'i (hesaplama kodu) okuyup çalıştırır.
 *  Güvenlik: sadece ilk bağlanılan GitHub adresindeki kod kabul edilir. */
function ortakYukle_(kod) {
  const pr = PropertiesService.getScriptProperties();
  let url = pr.getProperty('ORTAK_URL');
  if (kod && kod.url) {
    if (!/^https:\/\/[\w-]+\.github\.io\/[^?#]*ortak\.js$/.test(kod.url)) throw new Error('Uygulama adresi geçersiz.');
    if (!url) { url = kod.url; pr.setProperty('ORTAK_URL', url); }
    else if (url !== kod.url) throw new Error('Bu tablo başka bir uygulama adresine bağlı. Değiştirmek için tabloda Bütçe → Bağlantı anahtarını yenile.');
  }
  if (!url) throw new Error('Uygulama henüz hiç açılmadı. Önce telefondan uygulamayı aç.');
  const surum = kod && kod.surum ? String(kod.surum) : (pr.getProperty('ORTAK_SURUM') || '');
  if (globalThis.__ortakSurum !== undefined && globalThis.__ortakSurum === surum) return;
  const onbellek = CacheService.getScriptCache();
  let metin = surum ? onbellek.get('ortak_' + surum) : null;
  if (!metin) {
    const r = UrlFetchApp.fetch(url + '?v=' + encodeURIComponent(surum || String(Date.now())), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('Hesaplama kodu GitHub\'dan alınamadı (' + r.getResponseCode() + ').');
    metin = r.getContentText();
    const m = metin.match(/ORTAK_SURUM\s*=\s*'([^']+)'/);
    if (!m) throw new Error('GitHub\'daki ortak.js dosyası tanınmadı.');
    onbellek.put('ortak_' + m[1], metin, 21600);
    pr.setProperty('ORTAK_SURUM', m[1]);
  }
  (0, eval)(metin);
  globalThis.__ortakSurum = surum;
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
  try { ozetYenile_(Number(buAy_().slice(0, 4))); } catch (e) { console.error(e); }
}
/** Özet sayfası hesaplama koduna ihtiyaç duyar; uygulama hiç açılmadıysa sessizce atlanır */
function ozetYenile_(yil) {
  try { ortakYukle_(); } catch (e) { console.warn('Özet atlandı: ' + e.message); return false; }
  yillikTablo_(yil);
  return true;
}
function menuYenile() {
  if (!ozetYenile_(Number(buAy_().slice(0, 4)))) SpreadsheetApp.getUi().alert('Özet, uygulama telefondan ilk kez açıldıktan sonra oluşturulabilir.');
}
function menuBaskaYil() {
  const ui = SpreadsheetApp.getUi();
  const c = ui.prompt('Hangi yıl?', 'Örn. 2026', ui.ButtonSet.OK_CANCEL);
  const y = Number(c.getResponseText());
  if (c.getSelectedButton() === ui.Button.OK && y > 2000) ozetYenile_(y);
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
  PropertiesService.getScriptProperties().deleteProperty('ORTAK_URL');
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
  ozetYenile_(Number(buAy_().slice(0, 4)));
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
  ozetYenile_(Number(buAy_().slice(0, 4)));
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
    ayarlar: ayarlarOku_(), buAy: buAy_(), gun: bugunGun_(), bugun: bugun_(), tabloUrl: ss_().getUrl(), surum: SURUM
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



/* ───────────── İşlemler (sunucuda ve telefonda aynı kod çalışır) ───────────── */







/* ───────────── Hesaplama ───────────── */


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

/** Özet sayfası için: geçmiş ayların kayıtlarını oluşturur, sonra yıllık tabloyu ortak.js ile hesaplar */
function yillikIcerik_(yil, veri) {
  const bu = buAy_();
  for (let m = 1; m <= 12; m++) { const a = yil + '-' + String(m).padStart(2, '0'); if (a <= bu) ayiHazirla_(a, veri); }
  return yillikMatris_(veri, yil); // ortak.js
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
