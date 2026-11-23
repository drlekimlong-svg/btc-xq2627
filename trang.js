/* Trang tra cứu Ban tổ chức XQ2627: chọn vai, xem việc cần làm (checklist) và hướng dẫn từng bước, tìm nhanh.
   Dấu tick chỉ lưu trong trình duyệt của từng máy (localStorage); trang không gửi gì đi đâu. */
(function () {
  'use strict';
  var D = window.NOI_DUNG;
  var main = document.getElementById('trang');
  var KHOA = 'btc-xq2627:';

  function doc(k) { try { return window.localStorage.getItem(KHOA + k); } catch (e) { return null; } }
  function ghi(k, v) {
    try { if (v === null) window.localStorage.removeItem(KHOA + k); else window.localStorage.setItem(KHOA + k, v); } catch (e) { /* bỏ qua */ }
  }
  var tick = {};
  try { tick = JSON.parse(doc('tick') || '{}') || {}; } catch (e) { tick = {}; }
  function luuTick() { ghi('tick', JSON.stringify(tick)); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ---------------------------------------------------------------- ngày
  var THU = ['Chủ nhật', 'thứ Hai', 'thứ Ba', 'thứ Tư', 'thứ Năm', 'thứ Sáu', 'thứ Bảy'];
  function homNay() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('ngay'); } catch (e) { q = null; }
    var d = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(q + 'T00:00:00') : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  var HN = homNay();
  function ngay(iso) { return iso ? new Date(iso + 'T00:00:00') : null; }
  function cach(a, b) { return Math.round((b - a) / 86400000); }
  function hai(n) { return (n < 10 ? '0' : '') + n; }
  function chuNgay(d) { return THU[d.getDay()] + ', ' + hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear(); }

  // ---------------------------------------------------------------- dữ liệu
  var BAN = {}, GD = {};
  D.ban.forEach(function (b) {
    BAN[b.id] = b;
    b.checklist.giai_doan.forEach(function (g) { GD[g.id] = { gd: g, ban: b }; });
  });

  function trangThai(g) {
    var tong = g.viec.length, xong = 0;
    g.viec.forEach(function (v) { if (tick[v.id]) xong++; });
    var bd = ngay(g.bat_dau), kt = ngay(g.ket_thuc), n;
    var r = { xong: xong, tong: tong, ma: 'su-kien', chu: 'Theo sự kiện', uu: 3, moc: 0 };
    if (tong && xong === tong) { r.ma = 'xong'; r.chu = 'Xong'; r.uu = 9; return r; }
    if (kt && HN > kt) { r.ma = 'tre'; r.chu = 'Quá hạn ' + cach(kt, HN) + ' ngày'; r.uu = 0; r.moc = kt; return r; }
    if (bd && HN < bd) {
      n = cach(HN, bd); r.ma = 'sap'; r.chu = n === 1 ? 'Bắt đầu ngày mai' : 'Còn ' + n + ' ngày'; r.uu = 2; r.moc = bd; return r;
    }
    if (kt) {
      n = cach(HN, kt); r.ma = 'dang'; r.chu = n === 0 ? 'Hạn hôm nay' : 'Đang làm · còn ' + n + ' ngày'; r.uu = 1; r.moc = kt; return r;
    }
    if (bd) { r.ma = 'dang'; r.chu = 'Đang làm'; r.uu = 1; r.moc = bd; return r; }
    return r;
  }
  function tienDo(b) {
    var t = 0, x = 0;
    b.checklist.giai_doan.forEach(function (g) { g.viec.forEach(function (v) { t++; if (tick[v.id]) x++; }); });
    return { xong: x, tong: t, pt: t ? Math.round(x * 100 / t) : 0 };
  }
  function xepGd(b) { // giai đoạn chưa xong, gấp nhất trước
    return b.checklist.giai_doan.map(function (g, i) { return { g: g, t: trangThai(g), i: i }; })
      .filter(function (o) { return o.t.ma !== 'xong'; })
      .sort(function (a, c) { return a.t.uu - c.t.uu || (a.t.moc || 0) - (c.t.moc || 0) || a.i - c.i; });
  }

  // ---------------------------------------------------------------- mảnh giao diện
  function theGd(g, b, moSan) {
    var t = trangThai(g);
    var mo = moSan === undefined ? t.ma !== 'xong' : moSan;
    var h = '<details class="gd tt-' + t.ma + '" data-gd="' + g.id + '"' + (mo ? ' open' : '') + '>' +
      '<summary>' + (g.nhan_ngay ? '<span class="gd-ngay">' + esc(g.nhan_ngay) + '</span>' : '<span class="gd-ngay">Không có ngày cố định</span>') +
      '<span class="gd-ten">' + esc(g.ten) + '</span>' +
      '<span class="gd-phai"><span class="chip tt-' + t.ma + '">' + esc(t.chu) + '</span><span class="dem-chu" data-dem>' + t.xong + '/' + t.tong + '</span></span>' +
      '</summary><ul class="viec">';
    g.viec.forEach(function (v) {
      h += '<li><label><input type="checkbox" data-viec="' + v.id + '"' + (tick[v.id] ? ' checked' : '') + '><span>' + v.html + '</span></label></li>';
    });
    return h + '</ul></details>';
  }
  function thanh(p) { return '<div class="thanh" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '"><span style="width:' + p + '%"></span></div>'; }
  function tenVai(b) { return b.id === 'tong-quan' ? 'Mọi người trong Ban tổ chức' : b.ten; }

  // ---------------------------------------------------------------- trang chủ
  function veTrangChu() {
    var vai = doc('vai');
    var h = '<section class="chao"><div class="hom-nay">Hôm nay: ' + chuNgay(HN) + '</div>' +
      '<h1>Ban tổ chức X-quang bụng 2026–2027</h1>' +
      '<p>Chọn vai của bạn để xem việc cần làm theo từng mốc, đánh dấu việc đã xong và đọc cách làm từng bước.</p></section>';

    if (vai && BAN[vai]) {
      var b = BAN[vai], ds = xepGd(b).filter(function (o) { return o.t.ma === 'tre' || o.t.ma === 'dang' || (o.t.ma === 'sap' && cach(HN, o.t.moc) <= 7); });
      h += '<section class="khoi"><div class="tieu-khoi"><h2>Việc của bạn lúc này</h2><a href="#/' + b.id + '">' + esc(tenVai(b)) + ' ›</a></div>';
      if (ds.length) {
        ds.slice(0, 3).forEach(function (o) { h += theGd(o.g, b, true); });
      } else {
        h += '<p class="the phu">Không có việc nào đến hạn trong 7 ngày tới. Xem toàn bộ ở trang <a href="#/' + b.id + '">' + esc(tenVai(b)) + '</a>.</p>';
      }
      h += '</section>';
    }

    h += '<section class="khoi"><div class="tieu-khoi"><h2>Mốc chung</h2></div><ul class="moc">';
    D.moc.forEach(function (m) {
      var bd = ngay(m.bat_dau || m.ket_thuc), kt = ngay(m.ket_thuc), con;
      if (HN > kt) con = 'Đã qua';
      else if (HN >= bd) con = 'Đang diễn ra';
      else { var n = cach(HN, bd); con = n === 1 ? 'Ngày mai' : 'Còn ' + n + ' ngày'; }
      h += '<li class="' + (m.chot ? 'chot' : 'du-kien') + '"><span class="ngay">' + esc(m.ngay) + '</span>' +
        '<span class="viec-moc">' + esc(m.viec) + ' <span class="phu nho">· ' + (m.chot ? 'đã có lịch' : 'dự kiến') + '</span></span>' +
        '<span class="con">' + con + '</span></li>';
    });
    h += '</ul></section>';

    h += '<section class="khoi"><div class="tieu-khoi"><h2>Chọn vai của bạn</h2></div><div class="luoi-vai">';
    var thuTu = D.ban.slice();
    if (vai && BAN[vai]) thuTu.sort(function (a, c) { return (c.id === vai) - (a.id === vai); });
    thuTu.forEach(function (b) {
      var td = tienDo(b), tiep = xepGd(b)[0];
      h += '<a class="vai' + (b.id === vai ? ' cua-toi' : '') + '" href="#/' + b.id + '" data-the-vai="' + b.id + '">' +
        '<span class="ten"><span>' + esc(b.ten) + '</span>' + (b.id === vai ? '<span class="nhan-toi">Vai của tôi</span>' : '<span class="so">' + esc(b.so_nguoi) + '</span>') + '</span>' +
        '<span class="viec-chinh">' + esc(b.viec_chinh) + '</span>' +
        thanh(td.pt) + '<span class="dem-chu" data-tien-do>' + td.xong + '/' + td.tong + ' việc đã đánh dấu</span>' +
        '<span class="tiep">' + (tiep ? '<span class="chip tt-' + tiep.t.ma + '">' + esc(tiep.t.chu) + '</span> ' + esc((tiep.g.nhan_ngay ? tiep.g.nhan_ngay + ' · ' : '') + tiep.g.ten) : 'Đã xong mọi việc trong checklist') + '</span>' +
        '</a>';
    });
    h += '</div></section>';
    h += '<p class="ghi-chu">Gặp vấn đề không biết báo ai: xem <a href="#/tong-quan/huong-dan/m5">sơ đồ báo cáo bốn bậc</a>. ' +
      'Học viên hỏi về app: xem <a href="#/tong-quan/huong-dan/m6">học viên thấy gì trên app</a>.</p>';
    main.innerHTML = h;
    document.title = 'Ban tổ chức XQ2627';
  }

  // ---------------------------------------------------------------- trang một vai
  function veBan(b, tab, muc) {
    var vai = doc('vai');
    var laToi = vai === b.id;
    var tenTab1 = b.id === 'tong-quan' ? 'Checklist chung' : 'Việc cần làm';
    var tenTab2 = b.id === 'tong-quan' ? 'Tổng quan' : 'Hướng dẫn từng bước';
    var h = '<a class="quay" href="#/">‹ Tất cả vai trò</a>' +
      '<div class="dau-vai"><div><h1>' + esc(tenVai(b)) + '</h1><p class="mo-ta">' + esc(b.so_nguoi) + ' · ' + esc(b.viec_chinh) + '</p></div>' +
      '<button type="button" class="nut' + (laToi ? ' chon' : '') + '" data-hanh-dong="vai" data-ban="' + b.id + '" aria-pressed="' + laToi + '">' +
      (laToi ? '★ Vai của tôi' : '☆ Đặt làm vai của tôi') + '</button></div>' +
      '<nav class="tab" aria-label="Phần của trang">' +
      '<a href="#/' + b.id + '"' + (tab === 'viec' ? ' aria-current="page"' : '') + '>' + tenTab1 + '</a>' +
      '<a href="#/' + b.id + '/huong-dan"' + (tab === 'huong-dan' ? ' aria-current="page"' : '') + '>' + tenTab2 + '</a></nav>';
    h += tab === 'viec' ? veViec(b) : veHuongDan(b);
    main.innerHTML = h;
    document.title = tenVai(b) + ' · BTC XQ2627';
    if (tab === 'huong-dan' && muc) {
      var el = document.getElementById(b.id + '-' + muc);
      if (el) {
        el.scrollIntoView();
        var sec = el.closest('.muc');
        if (sec) { sec.classList.add('sang'); setTimeout(function () { sec.classList.remove('sang'); }, 1800); }
      }
    }
  }

  function veViec(b) {
    var td = tienDo(b), an = doc('an-xong') === '1';
    document.body.classList.toggle('an-xong', an);
    var h = '<div class="tom-tat">' +
      '<div class="hang">' + thanh(td.pt) + '<span class="dem-chu" data-tien-do>' + td.xong + '/' + td.tong + ' việc đã đánh dấu</span></div>' +
      '<div class="hang"><label class="chon-an"><input type="checkbox" id="an-xong"' + (an ? ' checked' : '') + '> Ẩn giai đoạn đã xong</label>' +
      '<button type="button" class="nut" data-hanh-dong="in">In checklist</button>' +
      '<button type="button" class="nut" data-hanh-dong="xoa" data-ban="' + b.id + '">Bỏ hết dấu tick</button></div>' +
      '<p class="ghi-chu">Dấu tick lưu trong trình duyệt của máy này, người khác không thấy. Đổi máy hoặc xóa dữ liệu duyệt web thì mất dấu tick.</p></div>';
    if (b.checklist.ghi_chu_html) h += b.checklist.ghi_chu_html;
    b.checklist.giai_doan.forEach(function (g) { h += theGd(g, b); });
    h += '<p class="ghi-chu" style="margin-top:16px">Cách làm từng việc, cách kiểm và xử lý sự cố: <a href="#/' + b.id + '/huong-dan">' +
      (b.id === 'tong-quan' ? 'đọc Tổng quan' : 'xem Hướng dẫn từng bước') + '</a>.</p>';
    return h;
  }

  function veHuongDan(b) {
    var h = '<div class="gioi-thieu">' + b.gioi_thieu_html + '</div>';
    h += '<nav class="muc-luc" aria-label="Các mục"><ol>';
    b.muc.forEach(function (m) { h += '<li><a href="#/' + b.id + '/huong-dan/' + m.id + '">' + esc(m.tieu_de) + '</a></li>'; });
    h += '<li><a href="#/' + b.id + '">' + esc(b.checklist.tieu_de) + ' ›</a></li></ol></nav>';
    b.muc.forEach(function (m) {
      h += '<section class="muc"><h2 id="' + b.id + '-' + m.id + '">' + esc(m.tieu_de) + '</h2>' + m.html + '</section>';
    });
    h += '<section class="muc"><h2>' + esc(b.checklist.tieu_de) + '</h2><p>Checklist nằm ở tab <a href="#/' + b.id + '">' +
      (b.id === 'tong-quan' ? 'Checklist chung' : 'Việc cần làm') + '</a>, có ô đánh dấu.</p></section>';
    return h;
  }

  // ---------------------------------------------------------------- tìm
  function bo(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase(); }
  function boTung(s) { // bỏ dấu từng chữ, giữ nguyên độ dài để cắt đoạn trích
    var r = ''; for (var i = 0; i < s.length; i++) { var c = bo(s.charAt(i)); r += c.length === 1 ? c : s.charAt(i).toLowerCase(); } return r;
  }
  var CHI_MUC = null;
  function chiMuc() {
    if (CHI_MUC) return CHI_MUC;
    CHI_MUC = [];
    D.ban.forEach(function (b) {
      b.muc.forEach(function (m) {
        CHI_MUC.push({ ban: b, tieu: m.tieu_de, chu: m.chu, url: '#/' + b.id + '/huong-dan/' + m.id });
      });
      b.checklist.giai_doan.forEach(function (g) {
        g.viec.forEach(function (v) {
          CHI_MUC.push({ ban: b, tieu: 'Checklist · ' + (g.nhan_ngay ? g.nhan_ngay + ' · ' : '') + g.ten, chu: v.chu, url: '#/' + b.id });
        });
      });
    });
    CHI_MUC.forEach(function (x) { x.k = boTung(x.tieu + ' • ' + x.chu); x.goc = x.tieu + ' • ' + x.chu; });
    return CHI_MUC;
  }
  // Từ 1–2 chữ cái (như "ma", "ca") phải khớp cả từ; từ dài hơn khớp đầu từ.
  function reTu(t) {
    var e = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + e + (t.length <= 2 ? '(?![a-z0-9])' : ''), 'g');
  }
  function viTri(k, tu) {
    var vung = [];
    tu.forEach(function (t) {
      var re = reTu(t), m;
      while ((m = re.exec(k))) { var p = m.index + m[1].length; vung.push([p, p + t.length]); if (re.lastIndex === m.index) re.lastIndex++; }
    });
    return vung.sort(function (u, v) { return u[0] - v[0]; });
  }
  function doanTrich(x, tu) {
    var dau = x.tieu.length + 3;
    var than = viTri(x.k, tu).filter(function (v) { return v[0] >= dau; });
    var i = than.length ? than[0][0] : dau;
    var a = Math.max(dau, i - 60), c = Math.min(x.goc.length, i + 140);
    var s = x.goc.slice(a, c), out = '', j = 0;
    viTri(x.k.slice(a, c), tu).forEach(function (v) {
      if (v[0] >= j) { out += esc(s.slice(j, v[0])) + '<mark>' + esc(s.slice(v[0], v[1])) + '</mark>'; j = v[1]; }
    });
    out += esc(s.slice(j));
    return (a > dau ? '… ' : '') + out + (c < x.goc.length ? ' …' : '');
  }
  function ketQua(q) {
    var tu = bo(q).split(/\s+/).filter(function (t) { return t.length > 0; });
    if (!tu.length) return '';
    var cum = tu.join(' ');
    var kq = chiMuc().filter(function (x) { return tu.every(function (t) { return reTu(t).test(x.k); }); });
    kq.forEach(function (x) {
      var tieuK = x.k.slice(0, x.tieu.length);
      x.diem = (tu.length > 1 && x.k.indexOf(cum) >= 0 ? 20 : 0) +
        (tu.every(function (t) { return reTu(t).test(tieuK); }) ? 8 : 0) + Math.min(viTri(x.k, tu).length, 10);
    });
    kq.sort(function (a, c) { return c.diem - a.diem; });
    if (!kq.length) return '<p class="phu">Không thấy mục nào có “' + esc(q) + '”. Thử từ ngắn hơn, ví dụ “mã”, “điểm danh”, “zalo”.</p>';
    var h = '<p class="phu nho">' + kq.length + ' kết quả' + (kq.length > 40 ? ', hiện 40 kết quả đầu' : '') + '</p><ul class="ket-qua">';
    kq.slice(0, 40).forEach(function (x) {
      h += '<li><a href="' + x.url + '"><span class="nguon">' + esc(x.ban.ten) + '</span><br><span class="tieu">' + esc(x.tieu) +
        '</span><br><span class="doan">' + doanTrich(x, tu) + '</span></a></li>';
    });
    return h + '</ul>';
  }
  function veTim(q) {
    main.innerHTML = '<a class="quay" href="#/">‹ Tất cả vai trò</a><h1>Tìm trong hướng dẫn</h1>' +
      '<input class="o-tim" type="search" id="o-tim" placeholder="Gõ có dấu hay không dấu đều được, ví dụ: diem danh, zalo, ma kich hoat" value="' + esc(q) + '" autocomplete="off">' +
      '<div id="kq-tim">' + ketQua(q) + '</div>';
    document.title = 'Tìm · BTC XQ2627';
    var o = document.getElementById('o-tim');
    o.focus();
    o.addEventListener('input', function () {
      document.getElementById('kq-tim').innerHTML = ketQua(o.value);
      try { history.replaceState(null, '', '#/tim/' + encodeURIComponent(o.value)); } catch (e) { /* bỏ qua */ }
    });
  }

  // ---------------------------------------------------------------- sự kiện
  function capNhatGd(input) {
    var el = input.closest('.gd');
    if (!el) return;
    var o = GD[el.getAttribute('data-gd')];
    var t = trangThai(o.gd);
    document.querySelectorAll('.gd[data-gd="' + o.gd.id + '"]').forEach(function (d) {
      d.className = 'gd tt-' + t.ma;
      var chip = d.querySelector('.chip'); chip.className = 'chip tt-' + t.ma; chip.textContent = t.chu;
      d.querySelector('[data-dem]').textContent = t.xong + '/' + t.tong;
      d.querySelectorAll('input[data-viec]').forEach(function (i) { i.checked = !!tick[i.getAttribute('data-viec')]; });
    });
    var td = tienDo(o.ban);
    var vung = document.querySelector('[data-the-vai="' + o.ban.id + '"]') || main;
    var bar = vung.querySelector('.thanh span'), chu = vung.querySelector('[data-tien-do]');
    if (bar && (vung !== main || main.querySelector('.tom-tat'))) bar.style.width = td.pt + '%';
    if (chu && (vung !== main || main.querySelector('.tom-tat'))) chu.textContent = td.xong + '/' + td.tong + ' việc đã đánh dấu';
  }
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('input[data-viec]')) {
      if (t.checked) tick[t.getAttribute('data-viec')] = 1; else delete tick[t.getAttribute('data-viec')];
      luuTick(); capNhatGd(t);
    } else if (t.id === 'an-xong') {
      ghi('an-xong', t.checked ? '1' : null); document.body.classList.toggle('an-xong', t.checked);
    }
  });
  main.addEventListener('click', function (e) {
    var n = e.target.closest('[data-hanh-dong]');
    if (!n) return;
    var hd = n.getAttribute('data-hanh-dong');
    if (hd === 'vai') {
      var id = n.getAttribute('data-ban');
      ghi('vai', doc('vai') === id ? null : id);
      route();
    } else if (hd === 'in') {
      window.print();
    } else if (hd === 'xoa') {
      var b = BAN[n.getAttribute('data-ban')];
      if (window.confirm('Bỏ hết dấu tick của "' + tenVai(b) + '" trên máy này?')) {
        b.checklist.giai_doan.forEach(function (g) { g.viec.forEach(function (v) { delete tick[v.id]; }); });
        luuTick(); route();
      }
    }
  });
  window.addEventListener('beforeprint', function () { document.querySelectorAll('details.gd').forEach(function (d) { d.open = true; }); });

  // ---------------------------------------------------------------- đường dẫn
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    if (h === 'trang') return;
    var p = h.split('/').map(function (x) { try { return decodeURIComponent(x); } catch (e) { return x; } });
    var cu = main.getAttribute('data-dang') || '';
    main.setAttribute('data-dang', h);
    if (p[0] === 'tim') { veTim(p.slice(1).join('/')); window.scrollTo(0, 0); return; }
    if (p[0] && BAN[p[0]]) {
      veBan(BAN[p[0]], p[1] === 'huong-dan' ? 'huong-dan' : 'viec', p[2]);
      if (!p[2] && cu.split('/').slice(0, 2).join('/') !== h.split('/').slice(0, 2).join('/')) window.scrollTo(0, 0);
      return;
    }
    veTrangChu();
    if (cu !== h) window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  document.getElementById('chan').innerHTML =
    '<p>Bộ hướng dẫn Ban tổ chức bản ' + esc(D.phien_ban) + ', cập nhật ' + esc(D.cap_nhat) + ' · CLB Ngoại khoa Trưng Vương.</p>' +
    '<p>App học viên dùng: <a href="' + esc(D.url_app) + '" target="_blank" rel="noopener">App thành viên NKTV</a>. ' +
    'Trang này là trang công khai, không chứa dữ liệu học viên; dữ liệu học viên chỉ đi qua app hoặc tin nhắn riêng.</p>';
  route();
})();
