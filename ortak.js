/**
 * EV BÜTÇESİ — ortak hesaplama kodu
 * Bu dosya hem telefondaki uygulamada hem de Apps Script'te (Kod.gs bu dosyayı GitHub'dan okur) çalışır.
 * Ay hesabı, borç/alacak, kilitler, tahminler ve kayıt işlemleri buradadır.
 * Tablo işlemleri (satirYaz_, topluEkle_, satirlariSil_) ve tarih yardımcıları (buAy_, bugun_...) çalıştığı yerde tanımlıdır.
 */
var ORTAK_SURUM = '3.15';

/* İşlem günü: değişikliğin telefonda yapıldığı gün (internetsizken biriken kayıtlar sonradan gönderilir).
   Kilit kontrolü ve ödeme tarihi bu güne göre yapılır; böylece ay kilitlenmeden önce yapılan bir değişiklik,
   ay kilitlendikten sonra gönderilse de kabul edilir. Boşsa bugün kullanılır. */
var ISLEM_GUNU_ = '';
function islemGunu_() { return ISLEM_GUNU_ || bugun_(); }
function islemAyi_() { return islemGunu_().slice(0, 7); }
/** Telefondan gelen işlem gününü denetler: geçerli biçimde, bugünden sonra değil ve en fazla 2 ay öncesi */
function gunGecerli_(g) {
  g = String(g || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return '';
  const b = bugun_();
  if (g > b || ayFarki_(g.slice(0, 7), b.slice(0, 7)) > 2) return '';
  return g;
}
/** Düzenli bir kalemin bir aydaki satırının kimliği. Her cihaz aynı kimliği üretir; böylece iki cihaz aynı satırı
 *  oluşturursa çakışmaz. */
function kalemSatirId_(kalemId, ay) { return 'h' + String(kalemId) + '_' + String(ay).replace('-', ''); }
/** Bir gönderim içinde: telefonun yeni satıra verdiği kimlik → tablodaki mevcut satırın kimliği (eski sürümden
 *  kalan bekleyen kayıtlar rastgele kimlik kullanıyordu; sonraki işlemleri de aynı satırı bulsun) */
var ID_ESLESME_ = {};

/* Toplu işlem: telefonda biriken kayıtlar tek istekte gönderilir.
   Kod.gs'e dokunmadan yeni işlem eklenebilsin diye satirKaydet üzerinden çalışır.
   Her işlem tekrar gönderilse de aynı sonucu verir (çift kayıt oluşmaz). */
function topluIslem_(veri, liste) {
  var islemler = {
    satirKaydet: satirKaydet_, harcamaEkle: harcamaEkle_, satirSil: satirSil_, satirGeriEkle: satirGeriEkle_,
    borcEkle: borcEkle_, borcSil: borcSil_, kalemKaydet: kalemKaydet_, kalemSonlandir: kalemSonlandir_,
    kalemYenidenAc: kalemYenidenAc_, kalemTasi: kalemTasi_, kategoriTasi: kategoriTasi_, ikizOnay: ikizOnay_,
    kategorilerKaydet: kategorilerKaydet_, kiraUygula: kiraUygula_
  };
  var sunucuda = typeof veriOku_ === 'function';
  // Kod.gs 3.6 ve sonrası: kaydedilemeyen bir işlem diğerlerini durdurmaz, hata listesiyle telefona bildirilir.
  // Eski Kod.gs'te ilk hatada eskisi gibi durulur (hata listesini telefona iletemez).
  var hataDoner = typeof TOPLU_HATA_DONER !== 'undefined' && TOPLU_HATA_DONER;
  var hatalar = [];
  ID_ESLESME_ = {};
  if (sunucuda) {
    veri = ciftKayitTemizle_(veri);
    // Değişikliklerden önce geçmiş aylar sabitlenir (kalem değişikliği geçmişi bozmasın)
    try { if (gecmisiDondur_(veri)) veri = veriOku_(); } catch (e) { console.warn('Geçmiş aylar sabitlenemedi: ' + e); veri = veriOku_(); }
  }
  liste.forEach(function (o, i) {
    var fn = islemler[o.ad];
    // Sunucuda her işlemden önce tablo yeniden okunur (silinen satırlar yüzünden satır numaraları kaymasın)
    var v = (i > 0 && sunucuda) ? veriOku_() : veri;
    ISLEM_GUNU_ = gunGecerli_(o.gun);
    try {
      if (!fn) throw new Error('Bilinmeyen işlem: ' + o.ad);
      fn.apply(null, [v].concat(o.args || []));
    } catch (e) {
      if (!hataDoner) { ISLEM_GUNU_ = ''; throw e; }
      hatalar.push({ i: i, hata: String(e && e.message || e) });
    }
    ISLEM_GUNU_ = '';
  });
  // Yazılanları kilit bırakılmadan tabloya kesin olarak işle. Bu yapılmazsa, cevabı telefona ulaşmayan
  // bir kayıt tekrar gönderildiğinde sunucu tabloyu eski hâliyle okuyup aynı kaydı ikinci kez ekleyebiliyordu.
  if (sunucuda && typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.flush) SpreadsheetApp.flush();
  return hatalar.length ? { hatalar: hatalar } : null;
}

/** Kategori listesini kaydeder (bekleyen kayıtlarla birlikte gider; internetsizken de kaybolmaz) */
function kategorilerKaydet_(veri, liste) {
  var l = [].concat(liste || []).map(function (x) { return String(x).replace(/,/g, ' ').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  if (!l.length) throw new Error('En az bir kategori olmalı.');
  if (typeof ayarYaz_ === 'function') ayarYaz_('kategoriler', l.join(', '));
  if (veri.ayarlar) veri.ayarlar.kategoriler = l;
}

/** Kira artışı aracı: bir kalemin tutarını seçilen aydan itibaren değiştirir (geçmiş aylar olduğu gibi kalır) */
function kiraUygula_(veri, kalemId, ay, tutar) {
  ay = ay_(ay);
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(kalemId); });
  if (!k) throw new Error('Kalem bulunamadı.');
  if (!ay) throw new Error('Ayı seç.');
  if (ayDurumu_(ay) !== 'acik') throw new Error('Kira artışı geçmiş bir aya uygulanamaz. Bu aydan ya da sonraki bir aydan başlat.');
  const t = num_(tutar);
  if (!(t > 0)) throw new Error('Tutarı gir.');
  tutarDegistir_(String(k.id), ay, t, veri);
}

/** Aynı kimlikle iki kez yazılmış satırları siler (ilkini tutar). Sadece sunucuda çalışır. */
function ciftKayitTemizle_(veri) {
  var gorulen = {}, fazla = [];
  veri.hareketler.forEach(function (h) {
    var id = String(h.id);
    if (gorulen[id]) fazla.push(h._satir); else gorulen[id] = true;
  });
  if (!fazla.length) return veri;
  satirlariSil_('Hareketler', fazla);
  if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.flush) SpreadsheetApp.flush();
  return veriOku_();
}

/** Aynı ad ve tutarlı kayıtlar için "farklı kayıtlar" onayı. anahtar: kayıt kimliklerinin sıralı listesi.
 *  Onaylar Ayarlar sayfasında "ikizOnay" satırında tutulur; böylece diğer cihazlar da bilir. kaldir: onayı geri al. */
function ikizOnay_(veri, anahtar, kaldir) {
  anahtar = String(anahtar || ''); if (!anahtar) return;
  var mevcut = typeof ayarOku_ === 'function' ? ayarOku_('ikizOnay') : ((veri.ayarlar && veri.ayarlar.ikizOnay) || '');
  var l = String(mevcut || '').split(';').filter(Boolean);
  var i = l.indexOf(anahtar);
  if (kaldir) { if (i >= 0) l.splice(i, 1); } else if (i < 0) l.push(anahtar);
  var d = l.slice(-300).join(';');
  if (typeof ayarYaz_ === 'function') ayarYaz_('ikizOnay', d);
  if (veri.ayarlar) veri.ayarlar.ikizOnay = d;
}

/** Bir kategorideki tüm kayıtları başka kategoriye taşır (kategori silinirken) */
function kategoriTasi_(veri, eski, yeni) {
  eski = String(eski || '').trim(); yeni = String(yeni || '').trim();
  if (!eski || !yeni || eski === yeni) return;
  veri.hareketler.forEach(function (h) {
    if (!h.tip && String(h.kategori || '') === eski) { h.kategori = yeni; satirYaz_('Hareketler', h); }
  });
  veri.kalemler.forEach(function (k) {
    if (!k.tip && String(k.kategori || '') === eski) { k.kategori = yeni; satirYaz_('Kalemler', k); }
  });
}

function ay_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM');
  const m = String(v).trim().match(/^(\d{4})-(\d{1,2})/);
  return m ? m[1] + '-' + m[2].padStart(2, '0') : '';
}

/** Yazılan tutarı sayıya çevirir; geçersizse NaN. Telefon ve tablo aynı kuralı kullanır.
 *  Kabul: rakam, nokta, virgül, boşluk, ₺ ve "TL". Virgül ondalıktır (1.250,50).
 *  Virgül yoksa: noktadan sonra 3 rakamlı gruplar binlik ayracıdır (1.250 = 1250), değilse nokta ondalıktır (1.25).
 *  Harf, eksi işareti ya da birden fazla ondalık ayracı varsa geçersizdir (12a, -50, 10.000.5, 1,2,3).
 *  Kuruştan küçük basamak kabul edilmez (1250,505 ya da 1.2345 geçersiz). */
function tutarCoz_(v) {
  if (typeof v === 'number') return isFinite(v) && v >= 0 ? v : NaN;
  let s = String(v === undefined || v === null ? '' : v).replace(/\s|₺/g, '').replace(/tl$/i, '');
  if (!s || !/^[0-9.,]+$/.test(s)) return NaN;
  const grup = /^[1-9]\d{0,2}(\.\d{3})+$/; // 1.250 / 12.500.000 (0.001 binlik sayılmaz)
  if (s.indexOf(',') >= 0) {
    const p = s.split(',');
    if (p.length !== 2 || !/^\d{0,2}$/.test(p[1]) || !(/^\d+$/.test(p[0]) || grup.test(p[0]) || p[0] === '')) return NaN;
    s = (p[0].replace(/\./g, '') || '0') + '.' + (p[1] || '0');
  } else if (grup.test(s)) s = s.replace(/\./g, '');
  else if (!/^\d*\.?\d{1,2}$/.test(s) && !/^\d+$/.test(s) && !/^\d+\.$/.test(s)) return NaN;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}
function num_(v) {
  if (typeof v === 'number') return v;
  if (v === undefined || v === null || String(v).trim() === '') return 0;
  const n = tutarCoz_(v);
  return isNaN(n) ? 0 : n;
}

function bool_(v) { return v === true || v === 1 || String(v).toUpperCase() === 'TRUE'; }

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

function ayFarki_(a, b) {
  const x = a.split('-').map(Number), y = b.split('-').map(Number);
  return (y[0] - x[0]) * 12 + (y[1] - x[1]);
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

/** "acik": düzenlenebilir | "kilitli": son 3 ay, onayla açılır | "arsiv": daha eski, değiştirilemez.
 *  Önceki ay, yeni ayın 10'una kadar açık kalır. Değişikliğin yapıldığı güne göre bakılır (islemGunu_). */
function ayDurumu_(ay) {
  const g = islemGunu_(), bu = g.slice(0, 7);
  if (ay >= bu) return 'acik';
  const fark = ayFarki_(ay, bu);
  if (fark === 1 && Number(g.slice(8, 10)) <= 10) return 'acik';
  return fark <= 3 ? 'kilitli' : 'arsiv';
}

function kilitKontrol_(ay, kilitAcik) {
  const d = ayDurumu_(ay);
  if (d === 'arsiv') throw new Error('Arşivdeki aylar değiştirilemez.');
  if (d === 'kilitli' && !kilitAcik) throw new Error('Bu ay kilitli. Düzenlemek için önce kilidi aç.');
}

/** Silinen tek seferlik kaydı aynı kimlikle geri koyar (Geri al için) */
function satirGeriEkle_(veri, h, kilitAcik) {
  kilitKontrol_(ay_(h.ay), kilitAcik);
  if (veri.hareketler.some(function (x) { return String(x.id) === String(h.id); })) return;
  topluEkle_('Hareketler', [{
    id: String(h.id), ay: ay_(h.ay), kalemId: '', ad: String(h.ad), tur: h.tur === 'gelir' ? 'gelir' : 'gider',
    kategori: String(h.kategori || ''), tutar: num_(h.tutar), odendi: !!h.odendi, kart: !!h.kart,
    tarih: tarihStr_(h.tarih), not: String(h.not || ''), sonTarih: tarihStr_(h.sonTarih),
    tip: String(h.tip || ''), bagli: String(h.bagli || '')
  }]);
}

/** Borçta ödenen, alacakta tahsil edilen toplam (sadece gerçekten tiklenmiş kayıtlar) */
function borcOdenen_(k, veri) {
  const hz = veri.__hz, kid = String(k.id);
  if (hz && hz.odenen[kid] !== undefined) return hz.odenen[kid];
  let t = 0;
  veri.hareketler.forEach(function (h) {
    const bagli = String(h.bagli || '') === kid || String(h.kalemId) === kid;
    if (bagli && h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı') t += num_(h.tutar);
  });
  if (hz) hz.odenen[kid] = t;
  return t;
}

/** Borç/alacak planı: toplamı belli bir borçta ödenmemiş taksitler kalan tutara göre kırpılır.
 *  Fazla ödeme son taksitleri azaltır, kısmi tahsilat beklenen tutarı düşürür, borç bitince taksit kalmaz.
 *  Dönen nesne: { "2026-11": 2000, ... } (ödenmemiş taksitlerin gösterilecek tutarı). Toplam bilinmiyorsa null. */
function borcPlani_(k, veri) {
  const hz = veri.__hz, kid = String(k.id);
  if (hz && hz.plan[kid] !== undefined) return hz.plan[kid];
  let plan = null;
  const toplam = num_(k.toplam);
  if (k.tip && toplam > 0) {
    plan = {};
    let kalan = Math.round((toplam - borcOdenen_(k, veri)) * 100) / 100;
    const satir = {}; // ay → bu borcun o aydaki taksit satırı
    let ilk = ay_(k.baslangic), son = ay_(k.bitis), gercekSon = '';
    (hz ? hz.kalemSatirlari[kid] || [] : veri.hareketler.filter(function (h) { return String(h.kalemId) === kid; })).forEach(function (h) {
      const a = ay_(h.ay); if (!a) return;
      satir[a] = h;
      if (!ilk || a < ilk) ilk = a;
      if (a > gercekSon) gercekSon = a;
    });
    for (let a = ilk, n = 0; a && n < 600; a = ayEkle_(a, 1), n++) {
      if (a > gercekSon) { // kayıtlı satırlardan sonrası: sadece plana göre gelecek taksitler
        if (son && a > son) break;
        if (!son && a > ayEkle_(buAy_(), 60)) break; // bitişi olmayan borçta 5 yıldan ötesi planlanmaz
        if (!bool_(k.aktif) || !ay_(k.baslangic)) break;
        if (!son && kalan <= 0.005) break;
      }
      const h = satir[a];
      let nominal;
      if (h) {
        if (bool_(h.odendi) || h.not === 'Atlandı') continue; // ödenen zaten kalan tutardan düşüldü
        nominal = num_(h.tutar);
      } else if (kalemBuAyda_(k, a)) nominal = tahmin_(k, a, veri);
      else continue;
      // Tutarı henüz belli olmayan taksit (değişken ya da 0): kalan borç varsa olduğu gibi gösterilir
      if (!(nominal > 0)) { plan[a] = kalan > 0.005 ? null : 0; continue; }
      const t = Math.max(0, Math.min(nominal, kalan));
      plan[a] = Math.round(t * 100) / 100;
      kalan = Math.round((kalan - t) * 100) / 100;
    }
  }
  if (hz) hz.plan[kid] = plan;
  return plan;
}

/** Toplamı belli bir borç/alacak tamamen ödendiyse true (yeni taksit satırı oluşmaz) */
function borcBitti_(k, veri) {
  return !!k.tip && num_(k.toplam) > 0 && borcOdenen_(k, veri) >= num_(k.toplam) - 0.005;
}

/** Aylık listeden borç ya da alacak ekler: kişi + tutar (giriş kaydı) ve geri ödeme şekli.
 *  sekil: "tek" (tek seferde, tarihli) | "taksit" (aylık taksit) | "belirsiz" (ödedikçe eklenir) */
function borcEkle_(veri, p) {
  const ay = ay_(p.ay) || buAy_();
  kilitKontrol_(ay, p.kilitAcik);
  if (p.kalemId && veri.kalemler.some(function (x) { return String(x.id) === String(p.kalemId); })) return; // zaten kaydedilmiş
  const tip = p.tip === 'alacak' ? 'alacak' : 'borc';
  const ad = String(p.ad || '').trim();
  if (!ad) throw new Error(tip === 'borc' ? 'Kimden aldığını yaz.' : 'Kime verdiğini yaz.');
  const tutar = num_(p.tutar);
  if (!(tutar > 0)) throw new Error('Tutarı gir.');
  const k = {
    id: p.kalemId || yeniId_('k'), ad: ad, tur: tip === 'borc' ? 'gider' : 'gelir', kategori: tip === 'borc' ? 'Borç' : 'Alacak',
    degisken: false, aylar: '', zamAyi: '', aktif: true, not: String(p.not || ''), tip: tip, odemeGunu: '', bitis: '',
    sira: veri.kalemler.reduce(function (m, x) { return Math.max(m, num_(x.sira)); }, 0) + 1
  };
  if (p.sekil === 'tek') {
    const t = tarihStr_(p.tarih);
    if (!t) throw new Error(tip === 'borc' ? 'Geri ödeme tarihini seç.' : 'Geri alınacak tarihi seç.');
    if (t.slice(0, 7) < ay) throw new Error(tip === 'borc' ? 'Geri ödeme tarihi, borcun alındığı aydan önce olamaz.' : 'Geri alınacak tarih, borcun verildiği aydan önce olamaz.');
    // Geçmiş aylar sabit: geri ödemesi geçmiş bir aya düşen borç o ayın listesine eklenemez
    if (t.slice(0, 7) < islemAyi_()) throw new Error(tip === 'borc' ? 'Geri ödeme tarihi geçmiş bir ay olamaz.' : 'Geri alınacak tarih geçmiş bir ay olamaz.');
    Object.assign(k, { baslangic: t.slice(0, 7), bitis: t.slice(0, 7), odemeGunu: Number(t.slice(8, 10)), tutar: tutar, toplam: tutar });
  } else if (p.sekil === 'taksit') {
    const n = Math.min(120, Math.max(1, parseInt(p.taksitSayisi, 10) || 1));
    const taksit = num_(p.taksit);
    if (!(taksit > 0)) throw new Error('Aylık taksiti yaz.');
    const ilk = ay_(p.ilkAy) || ayEkle_(ay, 1);
    if (ilk < ay) throw new Error('İlk taksit ayı, borcun ' + (tip === 'borc' ? 'alındığı' : 'verildiği') + ' aydan önce olamaz.');
    if (ilk < islemAyi_()) throw new Error('İlk taksit ayı geçmiş bir ay olamaz. Ödenmiş taksitleri toplamdan düşerek bu aydan başlat.');
    Object.assign(k, { baslangic: ilk, bitis: ayEkle_(ilk, n - 1), tutar: taksit, toplam: Math.round(taksit * n * 100) / 100 });
  } else {
    Object.assign(k, { baslangic: '', tutar: 0, toplam: tutar });
  }
  satirYaz_('Kalemler', k);
  // Para bütçeye girmediyse (kartla, altınla, birikimden) giriş satırı yazılmaz; sadece borç takip edilir
  if (p.girisYok) return;
  topluEkle_('Hareketler', [{
    id: p.girisId || yeniId_('h'), ay: ay, kalemId: '', ad: ad, tur: tip === 'borc' ? 'gelir' : 'gider',
    kategori: k.kategori, tutar: tutar, odendi: true, kart: false, tarih: ay >= islemAyi_() ? islemGunu_() : '',
    not: String(p.not || ''), sonTarih: '', tip: tip, bagli: String(k.id)
  }]);
}

/** Yanlış girilen borcu tamamen siler. Ödemesi yapılmış borç silinmez (kapatılır). */
function borcSil_(veri, id, kilitAcik) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id) && x.tip; });
  if (!k) return; // zaten silinmiş
  const ait = veri.hareketler.filter(function (h) { return String(h.bagli || '') === String(k.id) || String(h.kalemId) === String(k.id); });
  if (ait.some(function (h) { return h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı'; }))
    throw new Error(k.tip === 'borc' ? 'Bu borca ödeme yapılmış, silinemez. Bunun yerine kapatabilirsin.' : 'Bu alacaktan tahsilat yapılmış, silinemez. Bunun yerine kapatabilirsin.');
  ait.forEach(function (h) { if (ay_(h.ay) < buAy_()) kilitKontrol_(ay_(h.ay), kilitAcik); });
  satirlariSil_('Hareketler', ait.map(function (h) { return h._satir; }));
  satirlariSil_('Kalemler', [k._satir]);
}

function kalemYenidenAc_(veri, id) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id); });
  if (!k) throw new Error('Kalem bulunamadı.');
  k.aktif = true;
  satirYaz_('Kalemler', k);
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
    id: kalemSatirId_(k.id, ay), ay: ay, kalemId: String(k.id), ad: k.ad, tur: k.tur, kategori: k.kategori,
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
  const hz = veri.__hz;
  (hz ? hz.kalemSatirlari[String(k.id)] || [] : veri.hareketler).forEach(function (h) {
    const hAy = ay_(h.ay);
    if (String(h.kalemId) === String(k.id) && bool_(h.odendi) && num_(h.tutar) > 0 && hAy < ay && hAy > sonAy) {
      sonAy = hAy; son = num_(h.tutar);
    }
  });
  return (son !== null && sonAy >= g.degAy) ? son : g.tutar;
}

/** Tutar bu aydan itibaren değişir. Daha ileri bir ay için önceden girilmiş bir değişiklik (ör. planlanmış zam)
 *  varsa o aydan sonrasına dokunulmaz. */
function tutarDegistir_(kalemId, ay, tutar, veri) {
  let d = veri.deg.find(function (x) { return String(x.kalemId) === kalemId && ay_(x.gecerliAy) === ay; });
  if (!d) { d = { kalemId: kalemId, gecerliAy: ay }; veri.deg.push(d); }
  d.tutar = tutar;
  satirYaz_('TutarDegisiklikleri', d);
  let sonraki = '';
  veri.deg.forEach(function (x) {
    const g = ay_(x.gecerliAy);
    if (String(x.kalemId) === kalemId && g > ay && (!sonraki || g < sonraki)) sonraki = g;
  });
  veri.hareketler.forEach(function (h) {
    const a = ay_(h.ay);
    if (String(h.kalemId) === kalemId && a >= ay && (!sonraki || a < sonraki) && !bool_(h.odendi) && h.not !== 'Atlandı') {
      h.tutar = tutar;
      satirYaz_('Hareketler', h);
    }
  });
}

/** Kalem değişince bu ay (ya da basAy) ve sonrasındaki ödenmemiş satırları uyumlu hale getirir */
function senkron_(k, veri, basAy) {
  const bu = basAy || buAy_(), sil = [];
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) !== String(k.id)) return;
    const tip = String(k.tip || '');
    if (String(h.tip || '') !== tip || (tip && h.tur !== k.tur)) {
      h.tip = tip; h.bagli = tip ? String(k.id) : ''; h.tur = k.tur; h.kategori = k.kategori;
      satirYaz_('Hareketler', h);
    }
  });
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) !== String(k.id) || ay_(h.ay) < bu || bool_(h.odendi)) return;
    if (!kalemBuAyda_(k, ay_(h.ay))) { sil.push(h._satir); return; }
    if (h.ad !== k.ad || h.tur !== k.tur || h.kategori !== k.kategori) {
      h.ad = k.ad; h.tur = k.tur; h.kategori = k.kategori;
      satirYaz_('Hareketler', h);
    }
  });
  satirlariSil_('Hareketler', sil);
}

/** "v:kalemId" sanal satırsa kaydı oluşturur (o ay için zaten varsa onu kullanır) */
function satirBul_(id, ay, veri, yeniId) {
  if (id.indexOf('v:') === 0) {
    const kid = id.slice(2);
    // Satır başka bir cihazdan zaten oluşturulduysa o kullanılır; kimliği değiştirilmez (diğer cihazın kaydı bozulmasın)
    const mevcut = veri.hareketler.find(function (x) { return String(x.kalemId) === kid && ay_(x.ay) === ay; });
    if (mevcut) { if (yeniId && String(mevcut.id) !== String(yeniId)) ID_ESLESME_[String(yeniId)] = String(mevcut.id); return mevcut; }
    const k = veri.kalemler.find(function (x) { return String(x.id) === kid; });
    if (!k) throw new Error('Kalem bulunamadı.');
    const h = hareketYeni_(k, ay, veri);
    if (yeniId) h.id = yeniId;
    veri.hareketler.push(h);
    return h;
  }
  if (ID_ESLESME_[id]) id = ID_ESLESME_[id];
  let h = veri.hareketler.find(function (x) { return String(x.id) === id; });
  // Düzenli kalem satırı başka kimlikle (eski sürümde) oluşturulmuşsa kalem ve aya göre bulunur
  const m = !h && id.match(/^h(.+)_(\d{4})(\d{2})$/);
  if (m) h = veri.hareketler.find(function (x) { return String(x.kalemId) === m[1] && ay_(x.ay) === m[2] + '-' + m[3]; });
  if (!h) throw new Error('Kayıt bulunamadı. Uygulamayı yeniden aç.');
  return h;
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

/** Bir ayın satırlarını ve özetini hesaplar (yazmaz). Kaydı olmayan kalemler "sanal" satır olarak gösterilir. */
function ayHesapla_(ay, veri) {
  const bu = buAy_();
  if (veri.gun === undefined) veri.gun = bugunGun_();
  if (veri.bugun === undefined) veri.bugun = bugun_();
  const hz = veri.__hz;
  let kMap = hz && hz.kMap;
  if (!kMap) { kMap = {}; veri.kalemler.forEach(function (k) { kMap[String(k.id)] = k; }); }
  const satirlar = [], olan = {}, gorulenId = {};
  // Borç taksitinin gösterilecek tutarı (kalan borca göre kırpılmış). 0 ise satır gösterilmez (borç bitti).
  const borcTutari = function (k, h) {
    if (!k || !k.tip || bool_(h.odendi) || h.not === 'Atlandı' || bool_(h.kart)) return null;
    const p = borcPlani_(k, veri);
    if (!p) return null;
    return p[ay] === undefined ? 0 : p[ay]; // null: tutarı belli değil, olduğu gibi göster
  };
  (hz ? hz.ayda[ay] || [] : veri.hareketler).forEach(function (h) {
    if (ay_(h.ay) !== ay) return;
    if (gorulenId[String(h.id)]) return; // aynı kimlikli kopya bir kez sayılır
    gorulenId[String(h.id)] = true;
    const k = h.kalemId ? kMap[String(h.kalemId)] : null;
    if (h.kalemId) olan[String(h.kalemId)] = true;
    let t = null;
    if (k && k.tip && !bool_(h.odendi) && h.not !== 'Atlandı') {
      if (!bool_(k.aktif)) return; // kapatılan borcun ödenmemiş taksiti
      t = borcTutari(k, h);
      if (t !== null && !(t > 0.005)) return; // borç bitti, bu taksit kalmadı
    }
    const s = satirNesne_(h, k, ay, veri, bu, false);
    if (t !== null) s.tutar = t;
    satirlar.push(s);
  });
  // Kaydı olmayan kalemler: gelecek aylarda ve sabitlenmemiş (donmusAy'dan sonraki) aylarda sanal satır olarak görünür.
  // Sabitlenmiş geçmiş aylarda sadece tabloda yazılı olan satırlar görünür; kalem sonradan değişse de geçmiş değişmez.
  if (ay > bu || (veri.sanalHepsi && ay > donmusAy_(veri))) {
    veri.kalemler.forEach(function (k) {
      if (olan[String(k.id)] || !kalemBuAyda_(k, ay) || borcBitti_(k, veri)) return;
      const h = hareketYeni_(k, ay, veri);
      const t = borcTutari(k, h);
      if (t !== null && !(t > 0.005)) return;
      h.id = 'v:' + k.id;
      const s = satirNesne_(h, k, ay, veri, bu, true);
      if (t !== null) s.tutar = t;
      satirlar.push(s);
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

/* ───────────── Geçmiş ayların sabitlenmesi ─────────────
   Bu aydan önceki aylarda düzenli kalemlerin satırları tabloya yazılır ve "donmusAy" ayarına son sabitlenen ay
   kaydedilir. Sabitlenen aylarda sadece tablodaki satırlar görünür: bir kalemi sonradan kapatmak, adını,
   başlangıcını ya da aylarını değiştirmek geçmiş ayları değiştirmez. Her değişiklikten önce (sunucuda ve telefonda)
   çalışır; ayda bir kez iş yapar. */
function donmusAy_(veri) {
  if (!veri.ayarlar && typeof ayarOku_ === 'function') veri.ayarlar = { donmusAy: ayarOku_('donmusAy') };
  return ay_((veri.ayarlar && veri.ayarlar.donmusAy) || '');
}
function gecmisiDondur_(veri) {
  const hedef = ayEkle_(buAy_(), -1);
  const donmus = donmusAy_(veri);
  if (donmus && donmus >= hedef) return false;
  // Başlangıç: daha önce sabitlenen aydan sonrası; ilk kez ise en eski kayıt ya da kalem başlangıcı
  // (ekranda bugüne kadar görünen geçmiş aylar olduğu gibi kalsın). En fazla 3 yıl geri gidilir.
  let bas = donmus ? ayEkle_(donmus, 1) : '';
  if (!bas) {
    veri.hareketler.forEach(function (h) { const a = ay_(h.ay); if (a && (!bas || a < bas)) bas = a; });
    veri.kalemler.forEach(function (k) { const a = ay_(k.baslangic); if (bool_(k.aktif) && a && (!bas || a < bas)) bas = a; });
  }
  const enEski = ayEkle_(hedef, -35);
  if (bas && bas < enEski) bas = enEski;
  const yeni = [];
  if (bas) {
    const olan = {};
    veri.hareketler.forEach(function (h) { if (h.kalemId) olan[String(h.kalemId) + '|' + ay_(h.ay)] = true; });
    for (let a = bas; a <= hedef; a = ayEkle_(a, 1)) {
      veri.kalemler.forEach(function (k) {
        if (olan[String(k.id) + '|' + a] || !kalemBuAyda_(k, a) || borcBitti_(k, veri)) return;
        yeni.push(hareketYeni_(k, a, veri));
      });
    }
  }
  if (yeni.length) topluEkle_('Hareketler', yeni);
  if (typeof ayarYaz_ === 'function') ayarYaz_('donmusAy', hedef);
  if (veri.ayarlar) veri.ayarlar.donmusAy = hedef;
  return true;
}

/* ───────────── Hızlı hesap ─────────────
   Aylık liste, devreden para ve Gecikenler her ayı baştan hesaplar. Kayıtlar aylara göre bir kez gruplanır
   (veri.__hz); sadece okuma sırasında kullanılır. Değişiklik yapan işlemler bu grubu kullanmaz. */
function hesapHazirla_(veri) {
  const hz = { ayda: {}, kMap: {}, kalemSatirlari: {}, odenen: {}, plan: {} };
  veri.kalemler.forEach(function (k) { hz.kMap[String(k.id)] = k; });
  veri.hareketler.forEach(function (h) {
    const a = ay_(h.ay);
    (hz.ayda[a] = hz.ayda[a] || []).push(h);
    if (h.kalemId) (hz.kalemSatirlari[String(h.kalemId)] = hz.kalemSatirlari[String(h.kalemId)] || []).push(h);
  });
  Object.defineProperty(veri, '__hz', { value: hz, configurable: true, enumerable: false, writable: true });
  return hz;
}
function hesapBirak_(veri) { if (veri && veri.__hz) delete veri.__hz; }

/** Bir satırı günceller: tutar, odendi, not, atla, geriAl, sonraki (sonraki aylara da uygula) */
function satirKaydet_(veri, p) {
  if (p && p.toplu) return topluIslem_(veri, p.toplu);
  const ay = ay_(p.ay);
  // "Gecikenler" bölümünden yapılan ödeme kilitli aylarda da yapılabilir. Bu yolla sadece tutar, ödendi ve not değişir.
  const gecikenOdeme = !!p.gecikenOdeme && !p.atla && !p.geriAl && !p.sonraki && p.sonTarih === undefined;
  if (!gecikenOdeme) kilitKontrol_(ay, p.kilitAcik);
  const yeniAy = !gecikenOdeme && p.yeniAy ? ay_(p.yeniAy) : '';
  const h = satirBul_(String(p.id), ay, veri, p.yeniId);
  if (!gecikenOdeme && ay_(h.ay) !== ay) kilitKontrol_(ay_(h.ay), p.kilitAcik);
  // Gecikenler yolu sadece ödenmemiş bir kaydı öder (ya da Geri al ile ödemeyi geri alır)
  if (gecikenOdeme && bool_(h.odendi) && p.odendi !== false) throw new Error('Bu kayıt zaten ödenmiş.');
  // Borç taksiti tutar yazılmadan işaretlenirse ekranda görünen (kalan borca göre azaltılmış) tutar ödenir
  if (p.odendi && !bool_(h.odendi) && (p.tutar === undefined || p.tutar === null || p.tutar === '') && h.kalemId) {
    const bk = veri.kalemler.find(function (x) { return String(x.id) === String(h.kalemId); });
    const pl = bk && bk.tip ? borcPlani_(bk, veri) : null;
    if (pl && pl[ay_(h.ay)] > 0) h.tutar = pl[ay_(h.ay)];
  }
  // Başka aya taşıma: arşive hiç taşınmaz; kilitli bir aya sadece kilidi açılmış bir aydan (düzeltme yaparken,
  // ya da Geri al ile) taşınabilir. Kontrol, hiçbir şey değişmeden önce yapılır; kayıt yarım kalmasın.
  if (yeniAy && yeniAy !== ay_(h.ay) && !h.kalemId && !h.tip) {
    const d = ayDurumu_(yeniAy);
    if (d === 'arsiv') throw new Error('Arşivdeki bir aya taşınamaz.');
    if (d === 'kilitli' && !p.kilitAcik) throw new Error('Kilitli bir aya taşınamaz. O aya gidip kilidi açarak orada ekle.');
  }
  if (p.tutar !== undefined && p.tutar !== null && p.tutar !== '') h.tutar = num_(p.tutar);
  // Ödeme günü: bu ay ya da Gecikenler'den ödenince değişikliğin yapıldığı gün. Geçmiş aya sonradan girilen
  // kayıtta boş kalır, böylece "Geç ödendi" sadece gerçekten geç ödenenlerde görünür.
  if (p.odendi !== undefined) { h.odendi = !!p.odendi; h.tarih = h.odendi && (gecikenOdeme || ay >= islemAyi_()) ? islemGunu_() : ''; }
  if (p.not !== undefined) h.not = String(p.not);
  if (!gecikenOdeme) {
    if (p.ad !== undefined && !h.kalemId && String(p.ad).trim()) h.ad = String(p.ad).trim();
    // Tek seferlik kayıtlarda kategori, kart ve ay sonradan değiştirilebilir
    if (!h.kalemId && !h.tip) {
      if (p.kategori !== undefined && String(p.kategori).trim()) h.kategori = String(p.kategori).trim();
      if (p.kart !== undefined && h.tur === 'gider') { h.kart = !!p.kart; if (h.kart) h.odendi = true; }
      if (yeniAy && yeniAy !== ay_(h.ay)) h.ay = yeniAy;
    }
  }
  if (p.sonTarih !== undefined) h.sonTarih = tarihStr_(p.sonTarih);
  if (p.atla) { h.tutar = 0; h.odendi = true; h.not = 'Atlandı'; h.tarih = ''; }
  if (p.geriAl) {
    const k = veri.kalemler.find(function (x) { return String(x.id) === String(h.kalemId); });
    h.not = ''; h.odendi = false; h.tarih = '';
    if (k) h.tutar = tahmin_(k, ay, veri);
  }
  satirYaz_('Hareketler', h);
  if (p.sonraki && h.kalemId) tutarDegistir_(String(h.kalemId), ay, num_(h.tutar), veri);
  return h;
}

/** Tek seferlik harcama / gelir. taksit > 1 ise sonraki aylara böler. */
function harcamaEkle_(veri, p) {
  const ay = ay_(p.ay) || buAy_();
  kilitKontrol_(ay, p.kilitAcik);
  const n = Math.min(36, Math.max(1, parseInt(p.taksit, 10) || 1));
  const toplam = num_(p.tutar);
  if (!(toplam > 0)) throw new Error('Tutarı gir.');
  // Aynı işlem daha önce kaydedildiyse tekrar ekleme
  if (p.idler && p.idler.length && veri.hareketler.some(function (h) { return p.idler.indexOf(String(h.id)) >= 0; })) return;
  // Borç ödemesi / tahsilat: bağlı olduğu borç ya da alacağın yönünü alır
  const bk = p.bagli ? veri.kalemler.find(function (x) { return String(x.id) === String(p.bagli) && x.tip; }) : null;
  if (p.bagli && !bk) throw new Error('Borç ya da alacak bulunamadı.');
  if (bk) {
    topluEkle_('Hareketler', [{
      id: (p.idler && p.idler[0]) || yeniId_('h'), ay: ay, kalemId: '', ad: String(bk.ad), tur: bk.tur,
      kategori: bk.tip === 'borc' ? 'Borç' : 'Alacak', tutar: toplam, odendi: true, kart: false, tarih: ay >= islemAyi_() ? islemGunu_() : '',
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
      odendi: kart || i === 0, kart: kart, tarih: i === 0 && ay >= islemAyi_() ? islemGunu_() : '', not: String(p.not || ''), tip: '', bagli: ''
    });
  }
  topluEkle_('Hareketler', yeni);
}

/** id tek bir kayıt ya da kayıt listesi olabilir (taksitli eklemeyi geri almak için) */
function satirSil_(veri, id, kilitAcik) {
  const idler = [].concat(id).map(String);
  const silinecek = veri.hareketler.filter(function (x) { return idler.indexOf(String(x.id)) >= 0; });
  silinecek.forEach(function (h) {
    if (h.kalemId) throw new Error('Düzenli kalemler silinmez. Bu ay için "Bu ay yok" olarak işaretle.');
    if (ay_(h.ay) < buAy_()) kilitKontrol_(ay_(h.ay), kilitAcik);
  });
  if (silinecek.length) satirlariSil_('Hareketler', silinecek.map(function (h) { return h._satir; }));
}

function kalemKaydet_(veri, g) {
  const bu = islemAyi_(); // değişikliğin yapıldığı ay (internetsiz yapılıp sonra gönderilse de)
  if (!String(g.ad || '').trim()) throw new Error('Kalem adı boş olamaz.');
  if (!g.id && g.yeniId && veri.kalemler.some(function (x) { return String(x.id) === String(g.yeniId); })) return; // zaten eklenmiş
  let k = g.id ? veri.kalemler.find(function (x) { return String(x.id) === String(g.id); }) : null;
  const yeniMi = !k;
  if (yeniMi) {
    k = {
      id: g.yeniId || yeniId_('k'), aktif: true,
      sira: veri.kalemler.reduce(function (m, x) { return Math.max(m, num_(x.sira)); }, 0) + 1
    };
  }
  const eskiGuncel = yeniMi ? null : gecerliTutar_(k, bu, veri.deg).tutar;
  const eskiBas = yeniMi ? '' : ay_(k.baslangic);
  // Borç: ödemeler para çıkışı (gider yönü). Alacak: tahsilatlar para girişi (gelir yönü).
  const tip = g.tip === 'borc' || g.tip === 'alacak' ? g.tip : '';
  // Giriş kaydının ayı, hiçbir şey yazılmadan önce denetlenir (kayıt yarım kalmasın). Geçmiş aylar sabit olduğu için
  // açık bir ay olmalı; geçmiş bir aya borç girişi aylık listede o ayın kilidi açılarak + ile yapılır.
  const girisVar = yeniMi && tip && num_(g.girisTutar) > 0;
  const girisAy = girisVar ? (ay_(g.girisAy) || bu) : '';
  if (girisVar && ayDurumu_(girisAy) !== 'acik')
    throw new Error(ayDurumu_(girisAy) === 'arsiv' ? 'Arşivdeki bir aya kayıt eklenemez.' : 'Geçmiş bir aya borç girişi için o aya gidip kilidi aç, + ile ekle.');
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
  satirYaz_('Kalemler', k);
  // Yeni borç/alacakta bu ay elden çıkan ya da ele geçen para (eski borçlarda boş bırakılır)
  if (girisVar) {
    topluEkle_('Hareketler', [{
      id: g.girisId || yeniId_('h'), ay: girisAy, kalemId: '', ad: k.ad, tur: tip === 'borc' ? 'gelir' : 'gider',
      kategori: k.kategori, tutar: num_(g.girisTutar), odendi: true, kart: false, tarih: girisAy < islemAyi_() ? '' : islemGunu_(), not: '',
      sonTarih: '', tip: tip, bagli: String(k.id)
    }]);
  }
  // Başlangıcı geçmişe konan (ya da geriye alınan) kalem: sabitlenmiş geçmiş aylardan sadece arşivde olmayanlara
  // (son 3 ay) satırı yazılır, örneğin geçen ay başlayan kira. Arşivdeki aylara hiçbir zaman satır eklenmez.
  const donmus = donmusAy_(veri), yeniBas = ay_(k.baslangic);
  if (donmus && yeniBas && yeniBas <= donmus && (!eskiBas || yeniBas < eskiBas)) {
    const ekle = [];
    for (let a = yeniBas; a <= donmus; a = ayEkle_(a, 1)) {
      if ((eskiBas && a >= eskiBas) || ayDurumu_(a) === 'arsiv' || !kalemBuAyda_(k, a) || borcBitti_(k, veri)) continue;
      if (veri.hareketler.some(function (h) { return String(h.kalemId) === String(k.id) && ay_(h.ay) === a; })) continue;
      ekle.push(hareketYeni_(k, a, veri));
    }
    if (ekle.length) topluEkle_('Hareketler', ekle);
  }
  // Mevcut kalemde tutar değiştiyse: geçmişi bozmadan bu aydan itibaren geçerli yap
  if (!yeniMi && num_(g.tutar) !== eskiGuncel) tutarDegistir_(String(k.id), bu, num_(g.tutar), veri);
  senkron_(k, veri);
}

/** Kalemi kapatır. Geçmiş aylar olduğu gibi kalır.
 *  Düzenli kalem: bu ayın satırı yerinde kalır (gerekmiyorsa "Bu ay yok" denir), sonraki aylara gelmez.
 *  Borç/alacak: bu ay ve sonraki ödenmemiş taksitler silinir; geçmiş aylardaki ödenmemiş taksitler tabloda
 *  kalır ama gösterilmez (borç kapalı). Yeniden açılırsa geri gelirler. */
function kalemSonlandir_(veri, id) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id); });
  if (!k) throw new Error('Kalem bulunamadı.');
  const bu = islemAyi_();
  if (!k.tip && bool_(k.aktif) && kalemBuAyda_(k, bu) &&
    !veri.hareketler.some(function (h) { return String(h.kalemId) === String(k.id) && ay_(h.ay) === bu; })) {
    topluEkle_('Hareketler', [hareketYeni_(k, bu, veri)]);
  }
  k.aktif = false;
  satirYaz_('Kalemler', k);
  if (k.tip) {
    satirlariSil_('Hareketler', veri.hareketler.filter(function (h) {
      return String(h.kalemId) === String(k.id) && !bool_(h.odendi) && ay_(h.ay) >= bu;
    }).map(function (h) { return h._satir; }));
  } else senkron_(k, veri, ayEkle_(bu, 1));
}

function kalemTasi_(veri, id, yon, siraListesi) {
  if (Array.isArray(siraListesi) && siraListesi.length) {
    siraListesi.forEach(function (kid, i) {
      const k = veri.kalemler.find(function (x) { return String(x.id) === String(kid); });
      if (k && num_(k.sira) !== i + 1) { k.sira = i + 1; satirYaz_('Kalemler', k); }
    });
    return;
  }
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
    if (num_(k.sira) !== yeni[k.id]) { k.sira = yeni[k.id]; satirYaz_('Kalemler', k); }
  });
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

function istatistikHesapla_(veri, yil) {
  const bu = buAy_();
  const eski = veri.sanalHepsi;
  veri.sanalHepsi = true;
  if (!veri.__hz) hesapHazirla_(veri);
  const kat = {};
  let gelirT = 0, giderT = 0, doluAy = 0, borcGirenT = 0, borcCikanT = 0;
  const aylar = [];
  for (let m = 1; m <= 12; m++) aylar.push(yil + '-' + String(m).padStart(2, '0'));
  const sonuc = aylar.map(function (a) {
    const d = ayHesapla_(a, veri);
    // Borç ve alacak hareketleri gelir/gider sayılmaz; grafikte ayrı gösterilsin diye ayrıca toplanır
    // borcGiren: alınan borç + tahsilat, borcCikan: borç ödemesi + verilen borç
    // Geçmiş aylarda sadece gerçekleşenler (işaretlenenler) sayılır; bu ay ve sonrası plan
    const gecmis = a < bu, sayilir = function (s) { return !gecmis || s.odendi; };
    let bg = 0, bc = 0;
    d.satirlar.forEach(function (s) { if (s.tip && !s.kart && sayilir(s)) { if (s.tur === 'gelir') bg += s.tutar; else bc += s.tutar; } });
    const gelir = gecmis ? d.ozet.gelirAlinan : d.ozet.gelir, gider = gecmis ? d.ozet.giderOdenen : d.ozet.gider;
    if (a <= bu) {
      gelirT += gelir; giderT += gider; borcGirenT += bg; borcCikanT += bc;
      if (d.satirlar.length) doluAy++;
      d.satirlar.forEach(function (s) {
        if (s.tur === 'gider' && !s.kart && !s.tip && s.tutar > 0 && sayilir(s)) {
          const ad = s.kategori || 'Diğer';
          kat[ad] = (kat[ad] || 0) + s.tutar;
        }
      });
    }
    return { ay: a, gelir: gelir, gider: gider, borcGiren: bg, borcCikan: bc, gelecek: a > bu };
  });
  veri.sanalHepsi = eski;
  let ilkAy = bu;
  veri.hareketler.forEach(function (h) { const a = ay_(h.ay); if (a && a < ilkAy) ilkAy = a; });
  veri.kalemler.forEach(function (k) { const a = ay_(k.baslangic); if (a && a < ilkAy) ilkAy = a; });
  return {
    yil: yil, aylar: sonuc,
    kategoriler: Object.keys(kat).map(function (k) { return { ad: k, tutar: kat[k] }; })
      .sort(function (a, b) { return b.tutar - a.tutar; }),
    toplam: { gelir: gelirT, gider: giderT, fark: gelirT - giderT, ortalamaGider: doluAy ? Math.round(giderT / doluAy) : 0,
      borcGiren: borcGirenT, borcCikan: borcCikanT, borcluFark: gelirT - giderT + borcGirenT - borcCikanT },
    ilkYil: Number(ilkAy.slice(0, 4)), buYil: Number(bu.slice(0, 4))
  };
}

/** Yıllık tablo: kalemler satırda, aylar sütunda. Uygulamadaki Tablo görünümü ve E-Tablo'daki özet sayfası bunu kullanır. */
function yillikMatris_(veri, yil) {
  const bu = buAy_();
  const aylar = [];
  for (let m = 1; m <= 12; m++) aylar.push(yil + '-' + String(m).padStart(2, '0'));
  if (!veri.__hz) hesapHazirla_(veri);
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
      c.durumlar.push(s.kart ? 'notr' : s.atlandi ? 'atla' : s.odendi ? 'odendi' : s.gecikti ? 'gecikti' : aylar[mi] > bu ? 'tahmin' : 'bekliyor');
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
    satirlar.push({ tip: 'ara', ad: 'Ek harcamalar' });
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
  // Ayın kendi farkı (önceki aylardan devreden para hariç). Uygulamadaki "Ay sonunda" devri de içerir.
  toplamSatiri('kalan', 'Ayın farkı (devir hariç)', function (o) { return o.kalan; });
  return { aylar: aylar, bu: bu, satirlar: satirlar };
}
