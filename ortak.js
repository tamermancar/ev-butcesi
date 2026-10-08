/**
 * EV BÜTÇESİ — ortak hesaplama kodu
 * Bu dosya hem telefondaki uygulamada hem de Apps Script'te (Kod.gs bu dosyayı GitHub'dan okur) çalışır.
 * Ay hesabı, borç/alacak, kilitler, tahminler ve kayıt işlemleri buradadır.
 * Tablo işlemleri (satirYaz_, topluEkle_, satirlariSil_) ve tarih yardımcıları (buAy_, bugun_...) çalıştığı yerde tanımlıdır.
 */
var ORTAK_SURUM = '3.9';

/* Toplu işlem: telefonda biriken kayıtlar tek istekte gönderilir.
   Kod.gs'e dokunmadan yeni işlem eklenebilsin diye satirKaydet üzerinden çalışır.
   Her işlem tekrar gönderilse de aynı sonucu verir (çift kayıt oluşmaz). */
function topluIslem_(veri, liste) {
  var islemler = {
    satirKaydet: satirKaydet_, harcamaEkle: harcamaEkle_, satirSil: satirSil_, satirGeriEkle: satirGeriEkle_,
    borcEkle: borcEkle_, borcSil: borcSil_, kalemKaydet: kalemKaydet_, kalemSonlandir: kalemSonlandir_,
    kalemYenidenAc: kalemYenidenAc_, kalemTasi: kalemTasi_, kategoriTasi: kategoriTasi_, ikizOnay: ikizOnay_
  };
  var sunucuda = typeof veriOku_ === 'function';
  if (sunucuda) veri = ciftKayitTemizle_(veri);
  liste.forEach(function (o, i) {
    var fn = islemler[o.ad];
    if (!fn) throw new Error('Bilinmeyen işlem: ' + o.ad);
    // Sunucuda her işlemden önce tablo yeniden okunur (silinen satırlar yüzünden satır numaraları kaymasın)
    var v = (i > 0 && typeof veriOku_ === 'function') ? veriOku_() : veri;
    fn.apply(null, [v].concat(o.args || []));
  });
  // Yazılanları kilit bırakılmadan tabloya kesin olarak işle. Bu yapılmazsa, cevabı telefona ulaşmayan
  // bir kayıt tekrar gönderildiğinde sunucu tabloyu eski hâliyle okuyup aynı kaydı ikinci kez ekleyebiliyordu.
  if (sunucuda && typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.flush) SpreadsheetApp.flush();
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

function num_(v) {
  if (typeof v === 'number') return v;
  const s = String(v === undefined || v === null ? '' : v).replace(/\s|₺|TL/gi, '');
  if (!s) return 0;
  const n = s.indexOf(',') >= 0 ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s);
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
  let t = 0;
  veri.hareketler.forEach(function (h) {
    const bagli = String(h.bagli || '') === String(k.id) || String(h.kalemId) === String(k.id);
    if (bagli && h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı') t += num_(h.tutar);
  });
  return t;
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
  satirYaz_('Kalemler', k);
  topluEkle_('Hareketler', [{
    id: p.girisId || yeniId_('h'), ay: ay, kalemId: '', ad: ad, tur: tip === 'borc' ? 'gelir' : 'gider',
    kategori: k.kategori, tutar: tutar, odendi: true, kart: false, tarih: ay >= buAy_() ? bugun_() : '',
    not: String(p.not || ''), sonTarih: '', tip: tip, bagli: String(k.id)
  }]);
}

/** Yanlış girilen borcu tamamen siler. Ödemesi yapılmış borç silinmez (kapatılır). */
function borcSil_(veri, id, kilitAcik) {
  const k = veri.kalemler.find(function (x) { return String(x.id) === String(id) && x.tip; });
  if (!k) return; // zaten silinmiş
  const ait = veri.hareketler.filter(function (h) { return String(h.bagli || '') === String(k.id) || String(h.kalemId) === String(k.id); });
  if (ait.some(function (h) { return h.tur === k.tur && bool_(h.odendi) && h.not !== 'Atlandı'; }))
    throw new Error('Bu kayda ödeme yapılmış, silinemez. Bunun yerine kapatabilirsin.');
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
  satirYaz_('TutarDegisiklikleri', d);
  veri.hareketler.forEach(function (h) {
    if (String(h.kalemId) === kalemId && ay_(h.ay) >= ay && !bool_(h.odendi) && h.not !== 'Atlandı') {
      h.tutar = tutar;
      satirYaz_('Hareketler', h);
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
  const kMap = {};
  veri.kalemler.forEach(function (k) { kMap[String(k.id)] = k; });
  const satirlar = [], olan = {}, gorulenId = {};
  veri.hareketler.forEach(function (h) {
    if (ay_(h.ay) !== ay) return;
    if (gorulenId[String(h.id)]) return; // aynı kimlikli kopya bir kez sayılır
    gorulenId[String(h.id)] = true;
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

/** Bir satırı günceller: tutar, odendi, not, atla, geriAl, sonraki (sonraki aylara da uygula) */
function satirKaydet_(veri, p) {
  if (p && p.toplu) return topluIslem_(veri, p.toplu);
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
  // Tek seferlik kayıtlarda kategori, kart ve ay sonradan değiştirilebilir
  if (!h.kalemId && !h.tip) {
    if (p.kategori !== undefined && String(p.kategori).trim()) h.kategori = String(p.kategori).trim();
    if (p.kart !== undefined && h.tur === 'gider') { h.kart = !!p.kart; if (h.kart) h.odendi = true; }
    if (p.yeniAy && ay_(p.yeniAy) !== ay_(h.ay)) {
      if (ayDurumu_(ay_(p.yeniAy)) === 'arsiv') throw new Error('Arşivdeki bir aya taşınamaz.');
      h.ay = ay_(p.yeniAy);
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
  if (!(toplam > 0)) throw new Error('Tutar girin.');
  // Aynı işlem daha önce kaydedildiyse tekrar ekleme
  if (p.idler && p.idler.length && veri.hareketler.some(function (h) { return p.idler.indexOf(String(h.id)) >= 0; })) return;
  // Borç ödemesi / tahsilat: bağlı olduğu borç ya da alacağın yönünü alır
  const bk = p.bagli ? veri.kalemler.find(function (x) { return String(x.id) === String(p.bagli) && x.tip; }) : null;
  if (p.bagli && !bk) throw new Error('Borç ya da alacak bulunamadı.');
  if (bk) {
    topluEkle_('Hareketler', [{
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
  topluEkle_('Hareketler', yeni);
}

/** id tek bir kayıt ya da kayıt listesi olabilir (taksitli eklemeyi geri almak için) */
function satirSil_(veri, id, kilitAcik) {
  const idler = [].concat(id).map(String);
  const silinecek = veri.hareketler.filter(function (x) { return idler.indexOf(String(x.id)) >= 0; });
  silinecek.forEach(function (h) {
    if (h.kalemId) throw new Error('Düzenli kalemler silinmez; bu ay için "Bu ay yok" seçin.');
    if (ay_(h.ay) < buAy_()) kilitKontrol_(ay_(h.ay), kilitAcik);
  });
  if (silinecek.length) satirlariSil_('Hareketler', silinecek.map(function (h) { return h._satir; }));
}

function kalemKaydet_(veri, g) {
  const bu = buAy_();
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
  satirYaz_('Kalemler', k);
  // Yeni borç/alacakta bu ay elden çıkan ya da ele geçen para (eski borçlarda boş bırakılır)
  if (yeniMi && tip && num_(g.girisTutar) > 0) {
    const girisAy = ay_(g.girisAy) || bu;
    if (ayDurumu_(girisAy) === 'arsiv') throw new Error('Arşivdeki bir aya kayıt eklenemez.');
    topluEkle_('Hareketler', [{
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
  satirYaz_('Kalemler', k);
  if (k.tip) {
    // Kapatılan borç/alacak: ödenmemiş taksitler (hangi ayda olursa olsun) kalkar, ödenenler kalır
    satirlariSil_('Hareketler', veri.hareketler.filter(function (h) {
      return String(h.kalemId) === String(k.id) && !bool_(h.odendi);
    }).map(function (h) { return h._satir; }));
  } else senkron_(k, veri);
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

/** Yıllık tablo: kalemler satırda, aylar sütunda. Uygulamadaki Tablo görünümü ve E-Tablo'daki özet sayfası bunu kullanır. */
function yillikMatris_(veri, yil) {
  const bu = buAy_();
  const aylar = [];
  for (let m = 1; m <= 12; m++) aylar.push(yil + '-' + String(m).padStart(2, '0'));
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
  toplamSatiri('kalan', 'Ay sonu kalan', function (o) { return o.kalan; });
  return { aylar: aylar, bu: bu, satirlar: satirlar };
}
