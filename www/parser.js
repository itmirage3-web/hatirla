/* Türkçe doğal dil zaman ayrıştırıcı.
   parseTR("yarın saat 9 için burak ile görüş") -> { title: "Burak ile görüş", due: Date } */
(function (root) {
  var L = '(?<![\\p{L}\\d])', R = '(?![\\p{L}\\d])';
  var AP = "['’]";
  function rx(s) { return new RegExp(L + s + R, 'iu'); }

  var NUM = { bir: 1, iki: 2, 'üç': 3, 'dört': 4, 'beş': 5, 'altı': 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10, 'on bir': 11, 'on iki': 12 };
  var WD = { pazartesi: 1, 'salı': 2, 'çarşamba': 3, 'perşembe': 4, cuma: 5, cumartesi: 6, pazar: 0 };
  var MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
  var H = '(\\d{1,2}|on iki|on bir|bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on)';

  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function hv(s) { return /^\d/.test(s) ? +s : NUM[s]; }

  function tidy(s) {
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/(^|[\s,.])(?:bana\s+)?hatırlat\p{L}*/giu, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    var prev;
    do {
      prev = s;
      s = s.replace(/^(?:[,.\-–:]+|(?:için|ve)(?![\p{L}]))\s*/iu, '').trim();
      s = s.replace(/\s*(?:[,.\-–:]+|(?<![\p{L}])(?:için|ve))$/iu, '').trim();
    } while (s !== prev);
    return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
  }

  function parseTR(raw, now) {
    now = now || new Date();
    var o = { orig: String(raw).replace(/\s+/g, ' ').trim() };
    o.low = o.orig.toLocaleLowerCase('tr');
    function cut(re) {
      var m = re.exec(o.low);
      if (!m) return null;
      var a = m.index, b = a + m[0].length;
      o.low = o.low.slice(0, a) + ' ' + o.low.slice(b);
      o.orig = o.orig.slice(0, a) + ' ' + o.orig.slice(b);
      return m;
    }
    function done(due) { return { title: tidy(o.orig), due: due }; }
    var base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var m;

    // Göreli süreler
    if ((m = cut(rx('yarım\\s+saat\\s+sonra')))) return done(new Date(now.getTime() + 30 * 60000));
    if ((m = cut(rx('(\\d+|bir|iki|üç|dört|beş)\\s*saat\\s+sonra')))) return done(new Date(now.getTime() + hv(m[1]) * 3600000));
    if ((m = cut(rx('(\\d+)\\s*(?:dakika|dk)\\s+sonra')))) return done(new Date(now.getTime() + (+m[1]) * 60000));

    // Gün dilimi
    var day = null, per = null, wdMode = false;
    if ((m = cut(rx('bu\\s+(akşam|sabah|gece)\\p{L}*')))) { day = base; per = m[1]; }
    if (!per && (m = cut(rx('(öğleden\\s+sonra|akşam|gece|sabah|öğle|öğlen)\\p{L}*')))) {
      per = /^öğleden/.test(m[1]) ? 'ogleden' : /^öğle/.test(m[1]) ? 'ogle' : m[1];
    }

    // Gün
    if ((m = cut(rx('(?:yarından\\s+sonra|öbür\\s+gün|obur\\s+gun)')))) day = addDays(base, 2);
    else if ((m = cut(rx('yarın\\p{L}*')))) day = addDays(base, 1);
    else if ((m = cut(rx('bugün\\p{L}*')))) day = base;

    if (!day && (m = cut(rx('(\\d{1,2})\\s*(' + MONTHS.join('|') + ')' + AP + '?\\p{L}*')))) {
      var mi = MONTHS.indexOf(m[2]);
      var dd = new Date(now.getFullYear(), mi, +m[1]);
      if (dd < base) dd = new Date(now.getFullYear() + 1, mi, +m[1]);
      day = dd;
    }
    if (!day && (m = cut(rx('(haftaya\\s+)?(pazartesi|salı|çarşamba|perşembe|cumartesi|cuma|pazar)(?:ya|ye|günü|gün)?')))) {
      var wd = WD[m[2]];
      if (m[1]) {
        var dow = (base.getDay() + 6) % 7;
        day = addDays(base, 7 - dow + ((wd + 6) % 7));
      } else {
        day = addDays(base, (wd - base.getDay() + 7) % 7);
        wdMode = true;
      }
    }
    if (!day && (m = cut(rx('haftaya')))) day = addDays(base, 7);

    // Saat
    var hh = null, mm = 0;
    if ((m = cut(rx('saat\\s*' + H + '(?:[:.](\\d{2}))?(?:' + AP + '\\p{L}*)?(\\s*buçuk)?(?:\\s+(?:da|de|ta|te))?')))) {
      hh = hv(m[1]); mm = m[2] ? +m[2] : (m[3] ? 30 : 0);
    } else if ((m = cut(rx('(\\d{1,2})[:.](\\d{2})')))) {
      hh = +m[1]; mm = +m[2];
    } else if ((m = cut(rx('(\\d{1,2})(\\s*buçuk)?\\s*' + AP + '?\\s*(?:da|de|ta|te)')))) {
      hh = +m[1]; mm = m[2] ? 30 : 0;
    }

    if (hh !== null) {
      if ((per === 'akşam' || per === 'ogleden') && hh < 12) hh += 12;
      else if (per === 'gece') { if (hh === 12) hh = 0; else if (hh >= 6 && hh < 12) hh += 12; }
      else if (per === 'ogle' && hh <= 5) hh += 12;
    } else if (per) {
      hh = { sabah: 9, ogle: 12, ogleden: 15, 'akşam': 19, gece: 22 }[per]; mm = 0;
    }

    if (day === null && hh === null) return done(null);
    if (hh === null) { hh = 9; mm = 0; }
    if (hh > 23 || mm > 59) return done(null);

    var when;
    if (day) {
      when = new Date(day); when.setHours(hh, mm, 0, 0);
      if (wdMode && when <= now) when = addDays(when, 7);
    } else {
      when = new Date(base); when.setHours(hh, mm, 0, 0);
      if (when <= now) when = addDays(when, 1);
    }
    return done(when);
  }

  root.parseTR = parseTR;
  if (typeof module !== 'undefined') module.exports = { parseTR: parseTR };
})(typeof window !== 'undefined' ? window : globalThis);
