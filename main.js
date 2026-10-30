import './style.css';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/bricolage-grotesque';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  collection, doc as fsDoc, setDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot
} from 'firebase/firestore';

(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rp = function (n) { return 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID'); };
  var fmtNum = function (n) { return Math.round(n).toLocaleString('id-ID'); };
  var dstr = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var todayStr = function () { return dstr(new Date()); };
  var rid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); };
  var WHO = { suami: 'Suami', istri: 'Istri' };

  var ICONS = {
    makan: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2.2 1.6-3 4.2-3 7h3v11"/>',
    belanja: '<path d="M4 9h16l-1.6 10.2a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8L4 9zM8.5 9l2.5-5M15.5 9L13 4"/>',
    transport: '<rect x="4" y="5" width="16" height="12" rx="3"/><path d="M4 12h16M8 17v3M16 17v3"/>',
    tagihan: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9.5 8h5M9.5 12h5"/>',
    anak: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14c1 1.6 6 1.6 7 0M9 9.5h.01M15 9.5h.01"/>',
    hiburan: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    kesehatan: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 7.5v9M7.5 12h9"/>',
    lain: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
    gaji: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/>',
    usaha: '<path d="M4 9l1.2-5h13.6L20 9M5 9v11h14V9M9.5 20v-6h5v6"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1"/>',
    cam: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[k] + '</svg>'; };

  var DEF = [
    { id: 'makan', t: 'out', n: 'Makan', c: 'var(--c1)', i: 'makan' },
    { id: 'belanja', t: 'out', n: 'Belanja Rumah', c: 'var(--c2)', i: 'belanja' },
    { id: 'transport', t: 'out', n: 'Transport', c: 'var(--c3)', i: 'transport' },
    { id: 'tagihan', t: 'out', n: 'Tagihan', c: 'var(--c4)', i: 'tagihan' },
    { id: 'anak', t: 'out', n: 'Anak', c: 'var(--c5)', i: 'anak' },
    { id: 'hiburan', t: 'out', n: 'Hiburan', c: 'var(--c6)', i: 'hiburan' },
    { id: 'kesehatan', t: 'out', n: 'Kesehatan', c: 'var(--c7)', i: 'kesehatan' },
    { id: 'lain_out', t: 'out', n: 'Lainnya', c: 'var(--c8)', i: 'lain' },
    { id: 'gaji', t: 'in', n: 'Gaji', c: 'var(--in)', i: 'gaji' },
    { id: 'usaha', t: 'in', n: 'Usaha', c: 'var(--in)', i: 'usaha' },
    { id: 'lain_in', t: 'in', n: 'Lainnya', c: 'var(--in)', i: 'plus' }
  ];
  var CATS = DEF.slice(), CAT = {};
  function rebuildCats() {
    var cu = S.custom.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); }).map(function (d) {
      var isIn = d.type === 'in';
      var ci = Math.min(8, Math.max(1, parseInt(d.ci, 10) || 8));
      return { id: d.id, t: isIn ? 'in' : 'out', n: String(d.name || 'Tanpa nama'), c: isIn ? 'var(--in)' : 'var(--c' + ci + ')', i: 'tag', custom: true };
    });
    var base = DEF.slice(), out = [];
    base.forEach(function (c) { if (c.id.indexOf('lain_') !== 0) out.push(c); });
    CATS = out.concat(cu, base.filter(function (c) { return c.id.indexOf('lain_') === 0; }));
    CAT = {};
    CATS.forEach(function (c) { CAT[c.id] = c; });
  }
  var catOf = function (id, t, name) { return CAT[id] || { id: id, t: t, n: name || 'Lainnya', c: 'var(--c8)', i: 'lain' }; };

  /* ---------- penyimpanan: bersama (db) atau lokal bila db tidak tersedia ---------- */
  function fbStore(fs, hid) {
    var C = function (n) { return collection(fs, 'households', hid, n); };
    var map = function (s) { return s.docs.map(function (d) { return Object.assign({}, d.data(), { id: d.id }); }); };
    var inRange = function (s, e) { return [where('date', '>=', s), where('date', '<', e)]; };
    // Tulis ke cache lokal dulu; jangan menunggu server agar tetap lancar saat offline.
    var fast = function (p) { p.catch(function () {}); return Promise.race([p, new Promise(function (r) { setTimeout(r, 1500); })]); };
    return {
      watchTx: function (s, e, cb, err) {
        return onSnapshot(query.apply(null, [C('transactions')].concat(inRange(s, e), [orderBy('date', 'desc'), limit(1000)])), function (x) { cb(map(x)); }, err);
      },
      watch: function (n, cb, err) { return onSnapshot(query(C(n), limit(500)), function (x) { cb(map(x)); }, err); },
      range: function (s, e) {
        return getDocs(query.apply(null, [C('transactions')].concat(inRange(s, e), [orderBy('date', 'asc'), limit(1000)]))).then(map);
      },
      newId: function () { return fsDoc(C('transactions')).id; },
      get: function (n, id) { return getDoc(fsDoc(fs, 'households', hid, n, id)).then(function (x) { return x.exists() ? x.data() : null; }); },
      set: function (n, id, d) { return fast(setDoc(fsDoc(fs, 'households', hid, n, id), d)); },
      del: function (n, id) { return fast(deleteDoc(fsDoc(fs, 'households', hid, n, id))); }
    };
  }
  function localStore() {
    var KEY = 'kk-data2', D = null, subs = [];
    var NAMES = ['transactions', 'categories', 'budgets', 'recurring', 'receipts'];
    function load() {
      if (D) return D;
      try { D = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { D = {}; }
      NAMES.forEach(function (k) { D[k] = D[k] || {}; });
      return D;
    }
    function persist() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* tetap di memori */ } }
    function list(n) { var d = load()[n]; return Object.keys(d).map(function (id) { return Object.assign({}, d[id], { id: id }); }); }
    function emit(n) { subs.slice().forEach(function (s) { if (s.n === n) s.f(); }); }
    function sub(n, f) { var s = { n: n, f: f }; subs.push(s); setTimeout(f, 0); return function () { subs = subs.filter(function (x) { return x !== s; }); }; }
    var within = function (s, e) { return list('transactions').filter(function (t) { return t.date >= s && t.date < e; }); };
    return {
      watchTx: function (s, e, cb) { return sub('transactions', function () { cb(within(s, e)); }); },
      watch: function (n, cb) { return sub(n, function () { cb(list(n)); }); },
      range: function (s, e) { return Promise.resolve(within(s, e)); },
      newId: function () { return rid('l'); },
      get: function (n, id) { var d = load()[n][id]; return Promise.resolve(d ? Object.assign({}, d) : null); },
      set: function (n, id, d) { load()[n][id] = JSON.parse(JSON.stringify(d)); persist(); emit(n); return Promise.resolve(); },
      del: function (n, id) { delete load()[n][id]; persist(); emit(n); return Promise.resolve(); }
    };
  }

  /* ---------- state ---------- */
  var now = new Date();
  var S = {
    tab: 'home', y: now.getFullYear(), m: now.getMonth() + 1,
    txs: [], loaded: false, mode: 'pending', readOnly: false, error: false,
    uid: null, role: null, dl: null,
    fType: 'all', fWho: 'all', q: '',
    custom: [], budgets: {}, recs: [], editBudget: null, armed: null,
    syncMode: 'new', syncMsg: '', syncBusy: false, exPeriod: 'month', exBusy: false, exMsg: '', ncType: 'out', ncMsg: '',
    editing: null, sMode: 'tx', sType: 'out', sCat: null, sWho: null,
    sReceipt: null, sReceiptChanged: false, sReceiptBusy: false, sZoom: false, newCat: false
  };
  try { var r0 = localStorage.getItem('kk-role'); if (r0 === 'suami' || r0 === 'istri') S.role = r0; } catch (e) { /* abaikan */ }
  rebuildCats();
  var store = null, unsubTx = null, lastFocus = null, armT = null, toastT = null;

  var range = function () {
    var ny = S.m === 12 ? S.y + 1 : S.y, nm = S.m === 12 ? 1 : S.m + 1;
    return { start: S.y + '-' + pad(S.m) + '-01', end: ny + '-' + pad(nm) + '-01' };
  };
  var isCurrentMonth = function () { return S.y === now.getFullYear() && S.m === now.getMonth() + 1; };

  function subscribeTx() {
    if (!store) return;
    if (unsubTx) { unsubTx(); unsubTx = null; }
    S.loaded = false; S.error = false; S.txs = [];
    render();
    var r = range();
    unsubTx = store.watchTx(r.start, r.end, function (txs) { S.txs = txs; S.loaded = true; S.error = false; render(); },
      function () { S.error = true; S.loaded = true; render(); });
  }
  var auxUnsubs = [];
  function subscribeAux() {
    auxUnsubs.forEach(function (u) { try { u(); } catch (e) { /* abaikan */ } });
    auxUnsubs = [];
    auxUnsubs.push(store.watch('categories', function (d) { S.custom = d; rebuildCats(); render(); if (!$('#sheet').hidden) renderSheetCats(); }, function () {}));
    auxUnsubs.push(store.watch('budgets', function (d) { var b = {}; d.forEach(function (x) { b[x.id] = Number(x.amount) || 0; }); S.budgets = b; render(); }, function () {}));
    auxUnsubs.push(store.watch('recurring', function (d) { S.recs = d; render(); genRecurring(); }, function () {}));
  }

  /* ---------- util tampilan ---------- */
  function preserve(el, fn) {
    var a = document.activeElement, id = a && a.id && el.contains(a) ? a.id : null, v = id ? a.value : null, s0 = null, s1 = null;
    if (id) { try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (x) { /* abaikan */ } }
    fn();
    if (id) {
      var n = document.getElementById(id);
      if (n) { if (v != null) n.value = v; n.focus(); try { if (s0 != null) n.setSelectionRange(s0, s1); } catch (x) { /* abaikan */ } }
    }
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2400);
  }
  function arm(key) {
    S.armed = key; clearTimeout(armT);
    armT = setTimeout(function () { S.armed = null; render(); }, 4000);
    render();
  }
  function writeFailed(e) {
    var code = e && e.code;
    if (code === 'permission-denied' || code === 'unauthenticated') { return 'Ditolak oleh Firebase. Periksa aturan Firestore dan metode masuk Anonymous.'; }
    if (code === 'resource-exhausted') return 'Kuota Firebase hari ini habis. Coba lagi besok.';
    return 'Belum tersimpan. Periksa koneksi lalu coba lagi.';
  }
  var canWrite = function () { return !!store && !S.readOnly; };

  /* ---------- render ---------- */
  var sumType = function (t) { return S.txs.reduce(function (a, x) { return x.type === t ? a + (Number(x.amount) || 0) : a; }, 0); };
  var spentBy = function () {
    var by = {};
    S.txs.forEach(function (t) { if (t.type === 'out') by[t.category] = (by[t.category] || 0) + (Number(t.amount) || 0); });
    return by;
  };

  function render() {
    var label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(S.y, S.m - 1, 1));
    $('#month').textContent = label;
    $('#next').disabled = isCurrentMonth();
    $('#monthbar').hidden = !(S.tab === 'home' || S.tab === 'budget');
    ['home', 'budget', 'rec', 'more'].forEach(function (t) { $('#p-' + t).hidden = S.tab !== t; });
    document.querySelectorAll('[data-act="tab"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tab === S.tab)); });
    document.querySelectorAll('[data-act="role"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.role === S.role)); });

    var banner = $('#banner'), msg = '';
    if (S.error) msg = '<strong>Data belum bisa dimuat.</strong> Periksa koneksi, lalu buka ulang halaman ini.';
    else if (S.readOnly) msg = '<strong>Hanya bisa melihat.</strong>';
    else if (S.mode === 'local') msg = '<strong>Mode perangkat: catatan hanya tersimpan di HP ini.</strong> Hubungkan Firebase agar Anda dan pasangan melihat catatan yang sama.<br><button type="button" class="chip" data-act="go-sync" style="margin-top:8px">Atur sinkron</button>';
    banner.hidden = !msg; banner.innerHTML = msg;

    if (S.tab === 'home') renderHome(label);
    else if (S.tab === 'budget') renderBudget();
    else if (S.tab === 'rec') renderRec();
    else renderMore();
  }

  function renderHome(label) {
    document.querySelectorAll('[data-act="ftype"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === S.fType)); });
    document.querySelectorAll('[data-act="fwho"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === S.fWho)); });
    $('#add-out').disabled = !canWrite(); $('#add-in').disabled = !canWrite();
    var inc = sumType('in'), out = sumType('out'), bal = inc - out;
    var A = function (v) { return S.loaded ? rp(v) : 'Rp —'; };
    $('#summary').innerHTML =
      '<span class="lbl">Sisa bulan ini</span>' +
      '<span class="big num' + (S.loaded && bal < 0 ? ' neg' : '') + '">' + (S.loaded && bal < 0 ? '−' : '') + A(bal) + '</span>' +
      '<div class="flows"><div class="in"><span class="k">Pemasukan</span><span class="v num">' + A(inc) + '</span></div>' +
      '<div class="out"><span class="k">Pengeluaran</span><span class="v num">' + A(out) + '</span></div></div>';
    renderAlerts();
    renderChart(out);
    renderList(label);
  }

  function budgetRows() {
    var by = spentBy();
    return CATS.filter(function (c) { return c.t === 'out'; }).map(function (c) {
      var lim = S.budgets[c.id] || 0, sp = by[c.id] || 0;
      return { c: c, lim: lim, sp: sp, pct: lim ? sp / lim * 100 : 0 };
    });
  }

  function renderAlerts() {
    var el = $('#alerts');
    if (!S.loaded) { el.innerHTML = ''; return; }
    var hot = budgetRows().filter(function (r) { return r.lim > 0 && r.pct >= 80; }).sort(function (a, b) { return b.pct - a.pct; });
    if (!hot.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<section class="card alerts" aria-label="Anggaran perlu perhatian"><h3 class="sec">Anggaran perlu perhatian</h3>' + hot.map(function (r) {
      var over = r.pct > 100;
      return '<div class="alert-row"><span class="nm">' + esc(r.c.n) + '<small class="num">' + rp(r.sp) + ' dari ' + rp(r.lim) + '</small></span><span class="pill ' + (over ? 'over' : 'warn') + ' num">' + (over ? 'Lewat ' + rp(r.sp - r.lim) : Math.round(r.pct) + '%') + '</span></div>';
    }).join('') + '</section>';
  }

  function renderChart(out) {
    var el = $('#chart');
    if (!S.loaded) { el.innerHTML = '<p class="muted" style="margin:0">Memuat…</p>'; return; }
    if (!out) { el.innerHTML = '<p class="muted" style="margin:0">Belum ada pengeluaran bulan ini. Rincian per kategori muncul setelah Anda mencatat.</p>'; return; }
    var by = {}, names = {}, who = { suami: 0, istri: 0 };
    S.txs.forEach(function (t) {
      if (t.type !== 'out') return;
      by[t.category] = (by[t.category] || 0) + (Number(t.amount) || 0);
      if (t.catName) names[t.category] = t.catName;
      if (who[t.who] != null) who[t.who] += Number(t.amount) || 0;
    });
    var items = Object.keys(by).map(function (id) { var c = catOf(id, 'out', names[id]); return { id: id, n: c.n, c: c.c, v: by[id] }; })
      .sort(function (a, b) { return b.v - a.v; });
    var r = 15.9155, off = 25, gap = items.length > 1 ? 0.7 : 0, segs = '';
    items.forEach(function (it) {
      var p = it.v / out * 100, len = Math.max(p - gap, 0.01);
      segs += '<circle cx="21" cy="21" r="' + r + '" fill="none" stroke-width="6" style="stroke:' + it.c + '" stroke-dasharray="' + len.toFixed(3) + ' ' + (100 - len).toFixed(3) + '" stroke-dashoffset="' + off.toFixed(3) + '"/>';
      off -= p;
    });
    var legend = items.map(function (it) {
      return '<li><span class="dot" style="background:' + it.c + '"></span><span class="nm">' + esc(it.n) + '</span><span class="num">' + rp(it.v) + '</span><span class="pc num">' + Math.round(it.v / out * 100) + '%</span></li>';
    }).join('');
    var split = '';
    if (who.suami + who.istri > 0) {
      split = '<div class="who-split">' + ['suami', 'istri'].map(function (k) {
        return '<div class="who-row"><span>' + WHO[k] + '</span><span class="bar"><i style="width:' + (who[k] / out * 100).toFixed(1) + '%"></i></span><span class="num">' + rp(who[k]) + '</span></div>';
      }).join('') + '</div>';
    }
    el.innerHTML =
      '<div class="chart"><div class="donut"><svg viewBox="0 0 42 42" role="img" aria-label="Diagram donat pengeluaran per kategori"><circle cx="21" cy="21" r="' + r + '" fill="none" stroke-width="6" style="stroke:var(--line)"/>' + segs + '</svg>' +
      '<div class="mid"><small>Total keluar</small><b class="num">' + rp(out) + '</b></div></div>' +
      '<ul class="legend">' + legend + '</ul></div>' + split;
  }

  function dayLabel(ds) {
    var p = ds.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((t - d) / 86400000);
    var base = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }).format(d);
    return diff === 0 ? 'Hari ini · ' + base : diff === 1 ? 'Kemarin · ' + base : base;
  }

  function renderList(monthLabel) {
    var el = $('#list');
    if (!S.loaded) { el.innerHTML = '<div class="empty">Memuat catatan…</div>'; return; }
    if (!S.txs.length) {
      el.innerHTML = '<div class="empty"><b>Belum ada catatan di ' + esc(monthLabel) + '</b><span>Ketuk <b style="display:inline;font-size:inherit">+ Pengeluaran</b> setiap selesai belanja atau membayar sesuatu. Cukup nominal dan kategori.</span></div>';
      return;
    }
    var q = S.q.trim().toLowerCase();
    var rows = S.txs.filter(function (t) {
      if (S.fType !== 'all' && t.type !== S.fType) return false;
      if (S.fWho !== 'all' && t.who !== S.fWho) return false;
      if (q) {
        var hay = ((t.note || '') + ' ' + catOf(t.category, t.type, t.catName).n + ' ' + (WHO[t.who] || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0); });
    if (!rows.length) { el.innerHTML = '<div class="empty"><b>Tidak ada yang cocok</b><span>Ubah kata kunci atau filter di atas.</span></div>'; return; }
    var html = '', cur = null;
    rows.forEach(function (t) {
      if (t.date !== cur) {
        if (cur !== null) html += '</ul></section>';
        html += '<section class="day"><h4>' + esc(dayLabel(t.date)) + '</h4><ul>';
        cur = t.date;
      }
      var c = catOf(t.category, t.type, t.catName);
      var tags = (t.hasReceipt ? ' <span class="tag">Struk</span>' : '') + (t.recurId ? ' <span class="tag">Berulang</span>' : '');
      html += '<li><button type="button" class="tx" data-act="edit" data-id="' + esc(t.id) + '">' +
        '<span class="ic" style="--cat:' + c.c + '">' + svg(c.i) + '</span>' +
        '<span class="tx-main"><span class="tx-name">' + esc(c.n) + tags + '</span><span class="tx-sub">' + (t.note ? esc(t.note) + ' · ' : '') + esc(WHO[t.who] || '—') + '</span></span>' +
        '<span class="tx-amt num ' + t.type + '">' + (t.type === 'in' ? '+' : '−') + rp(t.amount) + '</span></button></li>';
    });
    el.innerHTML = html + '</ul></section>';
  }

  /* ---------- tab anggaran ---------- */
  function renderBudget() {
    var el = $('#p-budget');
    preserve(el, function () {
      if (!S.loaded) { el.innerHTML = '<div class="empty">Memuat…</div>'; return; }
      var rows = budgetRows();
      var withB = rows.filter(function (r) { return r.lim > 0; }).sort(function (a, b) { return b.pct - a.pct; });
      var without = rows.filter(function (r) { return !(r.lim > 0); });
      var totLim = withB.reduce(function (a, r) { return a + r.lim; }, 0), totSp = withB.reduce(function (a, r) { return a + r.sp; }, 0);
      var h = '';
      if (withB.length) {
        var tp = totLim ? totSp / totLim * 100 : 0;
        h += '<section class="card"><h3 class="sec">Total anggaran</h3><div class="b-sub"><span class="num">' + rp(totSp) + ' dari ' + rp(totLim) + '</span><span class="pill ' + (tp > 100 ? 'over' : tp >= 80 ? 'warn' : 'ok') + ' num">' + Math.round(tp) + '%</span></div>' +
          '<div class="meter" role="img" aria-label="Terpakai ' + Math.round(tp) + ' persen"><i style="width:' + Math.min(100, tp).toFixed(1) + '%;background:' + (tp > 100 ? 'var(--out)' : tp >= 80 ? 'var(--warn)' : 'var(--in)') + '"></i></div></section>';
      }
      h += '<section class="card"><h3 class="sec">Batas per kategori</h3><p class="hint">Batas berlaku tiap bulan. Pemakaian dihitung dari catatan pengeluaran di bulan yang tampil.</p>' +
        withB.concat(without).map(budgetRowHtml).join('') + '</section>';
      el.innerHTML = h;
    });
  }
  function budgetRowHtml(r) {
    var c = r.c, editing = S.editBudget === c.id, pc = r.pct > 100 ? 'over' : r.pct >= 80 ? 'warn' : 'ok';
    var h = '<div class="b-row"><div class="b-top"><span class="ic" style="--cat:' + c.c + '">' + svg(c.i) + '</span><span class="b-name">' + esc(c.n) + '</span>' +
      (canWrite() && !editing ? '<button type="button" class="chip" data-act="bg-edit" data-id="' + esc(c.id) + '">' + (r.lim ? 'Ubah' : 'Atur') + '</button>' : '<span></span>') + '</div>';
    if (r.lim > 0) {
      h += '<div class="meter" role="img" aria-label="Terpakai ' + Math.round(r.pct) + ' persen"><i style="width:' + Math.min(100, r.pct).toFixed(1) + '%;background:' + (pc === 'over' ? 'var(--out)' : pc === 'warn' ? 'var(--warn)' : 'var(--in)') + '"></i></div>' +
        '<div class="b-sub"><span class="num">' + rp(r.sp) + ' dari ' + rp(r.lim) + '</span><span class="pill ' + pc + ' num">' + (r.pct > 100 ? 'Lewat ' + rp(r.sp - r.lim) : 'Sisa ' + rp(r.lim - r.sp)) + '</span></div>';
    } else {
      h += '<div class="b-sub"><span>Belum ada batas</span><span class="num">Terpakai ' + rp(r.sp) + '</span></div>';
    }
    if (editing) {
      h += '<form class="b-form" id="bgform" data-id="' + esc(c.id) + '" novalidate><label class="amount" for="bgin"><span>Rp</span><input id="bgin" data-money inputmode="numeric" autocomplete="off" placeholder="0" value="' + (r.lim ? fmtNum(r.lim) : '') + '" aria-label="Batas bulanan ' + esc(c.n) + '"></label>' +
        '<p class="err" id="bgerr" role="alert"></p><div class="panel-actions">' +
        (r.lim ? '<button type="button" class="del" data-act="bg-del" data-id="' + esc(c.id) + '">Hapus</button>' : '') +
        '<button type="button" class="chip" data-act="bg-cancel">Batal</button><button type="submit" class="save">Simpan</button></div></form>';
    }
    return h + '</div>';
  }

  /* ---------- tab berulang ---------- */
  function renderRec() {
    var el = $('#p-rec');
    preserve(el, function () {
      var h = '<section class="card"><h3 class="sec">Transaksi berulang</h3><p class="hint">Untuk cicilan, listrik, internet, atau gaji tetap. Kas Kita mencatatnya otomatis tiap bulan saat dibuka pada atau setelah tanggalnya.</p>' +
        '<button type="button" class="act plain" data-act="add-rec"' + (canWrite() ? '' : ' disabled') + '>+ Tambah transaksi berulang</button></section>';
      if (!S.recs.length) {
        h += '<div class="empty"><b>Belum ada transaksi berulang</b><span>Contoh: Internet tiap tanggal 5, atau Gaji tiap tanggal 25.</span></div>';
      } else {
        h += '<section class="card"><ul class="plain">' + S.recs.slice().sort(function (a, b) { return (a.day || 0) - (b.day || 0); }).map(function (r) {
          var c = catOf(r.category, r.type, r.catName), on = r.active !== false;
          return '<li class="rec-row"><button type="button" class="tx" data-act="rec-edit" data-id="' + esc(r.id) + '"><span class="ic" style="--cat:' + c.c + '">' + svg(c.i) + '</span>' +
            '<span class="tx-main"><span class="tx-name">' + esc(c.n) + '</span><span class="tx-sub">Tiap tanggal ' + (+r.day || 1) + ' · ' + esc(WHO[r.who] || '—') + (r.note ? ' · ' + esc(r.note) : '') + '</span></span>' +
            '<span class="tx-amt num ' + r.type + '">' + (r.type === 'in' ? '+' : '−') + rp(r.amount) + '</span></button>' +
            '<div class="rec-actions"><span class="pill ' + (on ? 'ok' : '') + '">' + (on ? 'Aktif' : 'Dijeda') + '</span>' +
            (canWrite() ? '<button type="button" class="chip" data-act="rec-toggle" data-id="' + esc(r.id) + '">' + (on ? 'Jeda' : 'Aktifkan') + '</button>' : '') + '</div></li>';
        }).join('') + '</ul></section>';
      }
      el.innerHTML = h;
    });
  }

  /* ---------- tab lainnya ---------- */
  function exportLabels() { return { month: 'Bulan ini', year: 'Tahun ' + S.y, last12: '12 bulan' }; }
  function renderMore() {
    var el = $('#p-more');
    preserve(el, function () {
      var custom = CATS.filter(function (c) { return c.custom; });
      var h = syncCardHtml() + '<section class="card"><h3 class="sec">Kategori sendiri</h3><p class="hint">Tambahkan kategori di luar bawaan, misalnya Zakat atau Pendidikan. Kategori juga bisa dibuat langsung dari layar catat lewat tombol Baru.</p>';
      if (custom.length) {
        h += '<ul class="plain">' + custom.map(function (c) {
          var key = 'cat:' + c.id;
          return '<li class="cat-row"><span class="ic" style="--cat:' + c.c + '">' + svg('tag') + '</span><span class="tx-main"><span class="tx-name">' + esc(c.n) + '</span><span class="tx-sub">' + (c.t === 'in' ? 'Pemasukan' : 'Pengeluaran') + '</span></span>' +
            (canWrite() ? '<button type="button" class="chip danger' + (S.armed === key ? ' armed' : '') + '" data-act="cat-del" data-id="' + esc(c.id) + '">' + (S.armed === key ? 'Yakin hapus?' : 'Hapus') + '</button>' : '<span></span>') + '</li>';
        }).join('') + '</ul>';
      }
      if (canWrite()) {
        h += '<form class="nc-form" id="ncform" novalidate><div class="seg type" role="group" aria-label="Jenis kategori">' +
          '<button type="button" data-act="nc-type" data-v="out" aria-pressed="' + (S.ncType === 'out') + '">Pengeluaran</button>' +
          '<button type="button" data-act="nc-type" data-v="in" aria-pressed="' + (S.ncType === 'in') + '">Pemasukan</button></div>' +
          '<div class="line"><input class="field" id="ncname2" type="text" maxlength="24" placeholder="Nama kategori" autocomplete="off" aria-label="Nama kategori baru"><button class="add-btn" type="submit">Tambah</button></div>' +
          '<p class="err" role="alert">' + esc(S.ncMsg) + '</p></form>';
      }
      h += '</section>';
      var L = exportLabels();
      h += '<section class="card"><h3 class="sec">Ekspor data</h3><p class="hint">Simpan catatan sebagai file untuk dibuka di Excel atau disimpan sebagai arsip.</p>' +
        '<div class="seg" role="group" aria-label="Periode ekspor">' + Object.keys(L).map(function (k) { return '<button type="button" data-act="ex-period" data-v="' + k + '" aria-pressed="' + (S.exPeriod === k) + '">' + esc(L[k]) + '</button>'; }).join('') + '</div>';
      var dis = S.exBusy || !store ? ' disabled' : '';
      h += '<div class="ex-actions"><button type="button" class="act plain" data-act="ex-xlsx"' + dis + '>Unduh Excel</button><button type="button" class="act plain" data-act="ex-csv"' + dis + '>Unduh CSV</button></div>' +
        (S.dl ? '' : '<button type="button" class="chip" data-act="ex-copy"' + dis + '>Salin sebagai teks, lalu tempel di Excel</button>') +
        '<p class="hint">CSV memakai pemisah titik koma, cocok untuk Excel berbahasa Indonesia.</p>';
      h += '<p class="hint" role="status" style="color:var(--ink)">' + esc(S.exBusy ? 'Menyiapkan file…' : S.exMsg) + '</p></section>';
      el.innerHTML = h;
    });
  }

  /* ---------- lembar catat ---------- */
  function renderSheetCats() {
    var list = CATS.filter(function (c) { return c.t === S.sType; });
    $('#cats').innerHTML = list.map(function (c) {
      return '<button type="button" class="cat" role="radio" data-act="cat" data-id="' + esc(c.id) + '" aria-checked="' + (S.sCat === c.id) + '" style="--cat:' + c.c + '"><span class="ic">' + svg(c.i) + '</span>' + esc(c.n) + '</button>';
    }).join('') + (canWrite() ? '<button type="button" class="cat new" data-act="nc-open" style="--cat:var(--muted)"><span class="ic">' + svg('plus') + '</span>Baru</button>' : '');
    $('#newcat').hidden = !S.newCat;
  }
  function renderReceipt() {
    var box = $('#receipt');
    if (S.sReceipt === 'loading') box.innerHTML = '<span class="muted">Memuat foto struk…</span>';
    else if (S.sReceipt) box.innerHTML = '<img class="rimg' + (S.sZoom ? ' big' : '') + '" data-act="rzoom" src="' + S.sReceipt + '" alt="Foto struk. Ketuk untuk memperbesar"><div class="r-actions"><label class="chip" for="rfile">Ganti foto</label><button type="button" class="chip danger" data-act="rdel">Hapus foto</button></div>';
    else box.innerHTML = '<label class="rbtn" for="rfile">' + svg('cam') + '<span>' + (S.sReceiptBusy ? 'Memproses foto…' : 'Foto struk (opsional)') + '</span></label>';
  }
  function renderSheetState() {
    var rec = S.sMode === 'rec', out = S.sType === 'out';
    $('#sheet-title').textContent = rec ? (S.editing ? 'Ubah berulang: ' : 'Berulang: ') + (out ? 'pengeluaran' : 'pemasukan') : (S.editing ? 'Ubah ' : 'Catat ') + (out ? 'pengeluaran' : 'pemasukan');
    document.querySelectorAll('[data-act="settype"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.type === S.sType)); });
    document.querySelectorAll('[data-act="setwho"]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === S.sWho)); });
    $('#date').hidden = rec; $('#day').hidden = !rec; $('#rec-hint').hidden = !rec; $('#receipt-wrap').hidden = rec;
    renderSheetCats();
    renderReceipt();
  }
  function buildDays() {
    var o = '';
    for (var i = 1; i <= 31; i++) o += '<option value="' + i + '">Tiap tanggal ' + i + '</option>';
    $('#day').innerHTML = o;
  }
  function openSheet(type, item, mode) {
    lastFocus = document.activeElement;
    S.sMode = mode || 'tx'; S.editing = item || null;
    S.sType = item ? item.type : type;
    S.sCat = item ? item.category : null;
    S.sWho = item ? item.who : S.role;
    S.newCat = false; S.sReceipt = null; S.sReceiptChanged = false; S.sReceiptBusy = false; S.sZoom = false;
    $('#amt').value = item ? fmtNum(item.amount) : '';
    $('#note').value = item ? (item.note || '') : '';
    $('#date').value = (item && S.sMode === 'tx') ? item.date : todayStr();
    $('#day').value = String(item && S.sMode === 'rec' ? (+item.day || 1) : new Date().getDate());
    $('#ncname').value = '';
    $('#err').textContent = '';
    var del = $('#del'); del.hidden = !item; del.textContent = 'Hapus'; del.classList.remove('armed');
    if (item && S.sMode === 'tx' && item.hasReceipt) {
      var id = item.id; S.sReceipt = 'loading';
      store.get('receipts', id).then(function (d) {
        if (S.editing && S.editing.id === id && S.sReceipt === 'loading') { S.sReceipt = (d && d.img) || null; renderReceipt(); }
      }, function () { if (S.sReceipt === 'loading') { S.sReceipt = null; renderReceipt(); } });
    }
    renderSheetState();
    $('#sheet').hidden = false;
    setTimeout(function () { $('#amt').focus(); }, 30);
  }
  function closeSheet() {
    $('#sheet').hidden = true;
    clearTimeout(armT);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* abaikan */ } }
  }

  function compress(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var dim = 1100, out = null;
        for (var t = 0; t < 5 && !out; t++) {
          var sc = Math.min(1, dim / Math.max(img.width, img.height));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * sc)); cv.height = Math.max(1, Math.round(img.height * sc));
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
          for (var q = 0.7; q >= 0.35; q -= 0.1) { var u = cv.toDataURL('image/jpeg', q); if (u.length < 180000) { out = u; break; } }
          dim = Math.round(dim * 0.75);
        }
        out ? res(out) : rej(new Error('besar'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('gambar')); };
      img.src = url;
    });
  }
  $('#rfile').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    S.sReceiptBusy = true; renderReceipt(); $('#err').textContent = '';
    compress(f).then(function (u) { S.sReceipt = u; S.sReceiptChanged = true; S.sReceiptBusy = false; S.sZoom = false; renderReceipt(); },
      function () { S.sReceiptBusy = false; renderReceipt(); $('#err').textContent = 'Foto tidak bisa dibaca. Coba foto lain.'; });
  });

  /* ---------- kategori sendiri ---------- */
  function addCategory(type, name) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) return Promise.reject({ code: 'empty' });
    if (CATS.some(function (c) { return c.t === type && c.n.toLowerCase() === name.toLowerCase(); })) return Promise.reject({ code: 'dup' });
    var id = rid('c'), ci = (S.custom.filter(function (c) { return c.type === 'out'; }).length % 7) + 1;
    var doc = { type: type, name: name, ci: ci, createdAt: Date.now() };
    S.custom.push(Object.assign({ id: id }, doc)); rebuildCats();
    return Promise.resolve(store.set('categories', id, doc)).then(function () { return id; }, function (e) {
      S.custom = S.custom.filter(function (c) { return c.id !== id; }); rebuildCats(); throw e;
    });
  }
  var catMsg = function (e) { return e && e.code === 'empty' ? 'Tulis nama kategori.' : e && e.code === 'dup' ? 'Kategori itu sudah ada.' : writeFailed(e); };

  /* ---------- transaksi berulang ---------- */
  var nextYm = function (ym) { var p = ym.split('-'), y = +p[0], m = +p[1]; return m === 12 ? (y + 1) + '-01' : y + '-' + pad(m + 1); };
  var prevYm = function (ym) { var p = ym.split('-'), y = +p[0], m = +p[1]; return m === 1 ? (y - 1) + '-12' : y + '-' + pad(m - 1); };
  var dueOn = function (ym, day) { var p = ym.split('-'), last = new Date(+p[0], +p[1], 0).getDate(); return ym + '-' + pad(Math.min(Math.max(1, +day || 1), last)); };
  var recData = function (r, over) { var d = Object.assign({}, r, over); delete d.id; return d; };
  var genBusy = false, genFail = false;

  function genRecurring() {
    if (!store || S.readOnly || genBusy || genFail || !S.recs.length) return;
    var today = todayStr(), cur = today.slice(0, 7), plan = [];
    S.recs.forEach(function (r) {
      if (r.active === false) return;
      var ym = nextYm(r.through || prevYm(cur)), items = [], last = null, n = 0;
      while (ym <= cur && n < 24) {
        var dt = dueOn(ym, r.day);
        if (dt > today) break;
        items.push({ ym: ym, date: dt }); last = ym; ym = nextYm(ym); n++;
      }
      if (items.length) plan.push({ r: r, items: items, last: last });
    });
    if (!plan.length) return;
    genBusy = true;
    var made = 0, chain = Promise.resolve();
    plan.forEach(function (p) {
      chain = chain.then(function () {
        var seq = Promise.resolve();
        p.items.forEach(function (it) {
          seq = seq.then(function () {
            return store.set('transactions', 'r_' + p.r.id + '_' + it.ym, {
              type: p.r.type, amount: p.r.amount, category: p.r.category, catName: p.r.catName || '', note: p.r.note || '',
              date: it.date, who: p.r.who, uid: S.uid || null, createdAt: Date.now(), recurId: p.r.id, hasReceipt: false
            }).then(function () { made++; });
          });
        });
        return seq.then(function () { return store.set('recurring', p.r.id, recData(p.r, { through: p.last })); });
      });
    });
    chain.then(function () { genBusy = false; if (made) toast(made + ' transaksi berulang dicatat'); },
      function () { genBusy = false; genFail = true; });
  }

  /* ---------- ekspor ---------- */
  function monthsFor() {
    var list = [], y, m, i;
    if (S.exPeriod === 'month') list.push([S.y, S.m]);
    else if (S.exPeriod === 'year') { for (m = 1; m <= 12; m++) list.push([S.y, m]); }
    else { y = now.getFullYear(); m = now.getMonth() + 1; for (i = 0; i < 12; i++) { list.unshift([y, m]); m--; if (m < 1) { m = 12; y--; } } }
    return list;
  }
  function collect() {
    var all = [], chain = Promise.resolve();
    monthsFor().forEach(function (p) {
      chain = chain.then(function () {
        var ny = p[1] === 12 ? p[0] + 1 : p[0], nm = p[1] === 12 ? 1 : p[1] + 1;
        return store.range(p[0] + '-' + pad(p[1]) + '-01', ny + '-' + pad(nm) + '-01').then(function (r) { all = all.concat(r); });
      });
    });
    return chain.then(function () { return all.sort(function (a, b) { return a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0); }); });
  }
  var HEAD = ['Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Dicatat oleh', 'Nominal (Rp)'];
  var rowOf = function (t) { return [t.date, t.type === 'in' ? 'Pemasukan' : 'Pengeluaran', catOf(t.category, t.type, t.catName).n, t.note || '', WHO[t.who] || '', Number(t.amount) || 0]; };
  function fileTag() { return S.exPeriod === 'month' ? S.y + '-' + pad(S.m) : S.exPeriod === 'year' ? String(S.y) : '12-bulan-terakhir'; }
  function saveFile(fn, data) {
    if (S.dl) return S.dl.save({ filename: fn, data: data });
    return new Promise(function (res, rej) {
      try {
        var type = /\.csv$/.test(fn) ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        var url = URL.createObjectURL(new Blob([data], { type: type })), a = document.createElement('a');
        a.href = url; a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000); res();
      } catch (e) { rej(e); }
    });
  }
  function doExport(kind) {
    if (S.exBusy || !store) return;
    S.exBusy = true; S.exMsg = ''; render();
    collect().then(function (txs) {
      if (!txs.length) { S.exMsg = 'Tidak ada transaksi pada periode ini.'; return null; }
      var rows = txs.map(rowOf), name = 'kas-kita-' + fileTag(), data, fn;
      if (kind === 'copy') {
        if (!navigator.clipboard) { S.exMsg = 'Browser tidak mendukung salin. Pakai Unduh CSV.'; return null; }
        var tsv = [HEAD].concat(rows).map(function (r) { return r.map(function (v) { return String(v).replace(/[\t\r\n]+/g, ' '); }).join('\t'); }).join('\n');
        return navigator.clipboard.writeText(tsv).then(function () { S.exMsg = 'Tersalin. Tempel di Excel atau Google Sheets.'; }, function () { S.exMsg = 'Browser menolak menyalin. Pakai Unduh CSV.'; });
      }
      if (kind === 'csv') {
        var q = function (v) { var s = String(v == null ? '' : v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
        data = '﻿' + [HEAD].concat(rows).map(function (r) { return r.map(q).join(';'); }).join('\r\n');
        fn = name + '.csv';
      } else {
        var X = XLSX;
        if (!X) { S.exMsg = 'Pustaka Excel belum termuat. Coba lagi atau pakai CSV.'; return null; }
        var wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet([HEAD].concat(rows));
        ws['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 16 }];
        X.utils.book_append_sheet(wb, ws, 'Transaksi');
        var byM = {}, byC = {};
        txs.forEach(function (t) {
          var k = t.date.slice(0, 7), a = Number(t.amount) || 0;
          byM[k] = byM[k] || { i: 0, o: 0 }; byM[k][t.type === 'in' ? 'i' : 'o'] += a;
          var ck = (t.type === 'in' ? 'Pemasukan' : 'Pengeluaran') + '|' + catOf(t.category, t.type, t.catName).n;
          byC[ck] = (byC[ck] || 0) + a;
        });
        var sm = [['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Selisih (Rp)']].concat(Object.keys(byM).sort().map(function (k) { return [k, byM[k].i, byM[k].o, byM[k].i - byM[k].o]; }));
        sm.push([], ['Jenis', 'Kategori', 'Total (Rp)']);
        Object.keys(byC).sort().forEach(function (k) { var p = k.split('|'); sm.push([p[0], p[1], byC[k]]); });
        var ws2 = X.utils.aoa_to_sheet(sm); ws2['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
        X.utils.book_append_sheet(wb, ws2, 'Ringkasan');
        data = X.write(wb, { bookType: 'xlsx', type: 'array' });
        fn = name + '.xlsx';
      }
      return saveFile(fn, data).then(function () { S.exMsg = S.dl ? 'File siap: ' + fn : 'Unduhan dimulai: ' + fn + '. Bila tidak muncul, pakai Salin sebagai teks.'; });
    }).catch(function (e) {
      var c = e && e.code;
      S.exMsg = (c === 'declined' || /cancel/i.test(String((e && e.message) || ''))) ? 'Dibatalkan.' : c === 'rate_limited' ? 'Tunggu sebentar lalu coba lagi.' : 'Unduhan gagal. Coba lagi.';
    }).then(function () { S.exBusy = false; render(); });
  }

  /* ---------- input ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-money]')) {
      var d = t.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 12);
      t.value = d ? Number(d).toLocaleString('id-ID') : '';
    }
  });
  $('#q').addEventListener('input', function (e) { S.q = e.target.value; renderList($('#month').textContent); });
  $('#ncname').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doNcAdd(); } });
  function doNcAdd() {
    var inp = $('#ncname');
    addCategory(S.sType, inp.value).then(function (id) { S.sCat = id; S.newCat = false; inp.value = ''; $('#err').textContent = ''; renderSheetCats(); },
      function (e) { $('#err').textContent = catMsg(e); });
  }

  $('#form').addEventListener('submit', function (e) {
    e.preventDefault();
    var amount = parseInt($('#amt').value.replace(/\D/g, '') || '0', 10), err = $('#err'), rec = S.sMode === 'rec';
    if (!amount) { err.textContent = 'Isi nominal terlebih dahulu.'; $('#amt').focus(); return; }
    if (!S.sCat) { err.textContent = 'Pilih kategori.'; return; }
    if (!S.sWho) { err.textContent = 'Pilih siapa yang mencatat: Suami atau Istri.'; return; }
    var prev = S.editing, btn = $('#save'), cname = catOf(S.sCat, S.sType).n, note = $('#note').value.trim().slice(0, 120);
    var after = function (msg, y, m) {
      btn.disabled = false;
      if (!S.role) { S.role = S.sWho; try { localStorage.setItem('kk-role', S.role); } catch (x) { /* abaikan */ } }
      closeSheet(); toast(msg);
      if (y && (y !== S.y || m !== S.m)) { S.y = y; S.m = m; subscribeTx(); } else render();
    };
    var fail = function (ex) { btn.disabled = false; err.textContent = writeFailed(ex); };
    btn.disabled = true; err.textContent = '';

    if (rec) {
      var day = parseInt($('#day').value, 10) || 1, cur = todayStr().slice(0, 7);
      var rule = {
        type: S.sType, amount: amount, category: S.sCat, catName: cname, note: note, day: day, who: S.sWho,
        active: prev ? prev.active !== false : true,
        through: prev ? (prev.through || prevYm(cur)) : (dueOn(cur, day) < todayStr() ? cur : prevYm(cur)),
        createdAt: (prev && prev.createdAt) || Date.now()
      };
      Promise.resolve(store.set('recurring', prev ? prev.id : rid('rc'), rule)).then(function () { after(prev ? 'Perubahan tersimpan' : 'Transaksi berulang ditambahkan'); }, fail);
      return;
    }
    var date = $('#date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { btn.disabled = false; err.textContent = 'Pilih tanggal.'; return; }
    if (S.sReceipt === 'loading') { btn.disabled = false; err.textContent = 'Tunggu foto struk selesai dimuat.'; return; }
    var id = prev ? prev.id : store.newId();
    var hasR = !!S.sReceipt;
    var data = {
      type: S.sType, amount: amount, category: S.sCat, catName: cname, note: note, date: date, who: S.sWho,
      uid: (prev && prev.uid) || S.uid || null, createdAt: (prev && prev.createdAt) || Date.now(), hasReceipt: hasR
    };
    if (prev && prev.recurId) data.recurId = prev.recurId;
    var recStep = Promise.resolve();
    if (S.sReceiptChanged) recStep = hasR ? store.set('receipts', id, { img: S.sReceipt }) : store.del('receipts', id);
    Promise.resolve(recStep).then(function () { return store.set('transactions', id, data); })
      .then(function () { var p = date.split('-'); after(prev ? 'Perubahan tersimpan' : 'Tersimpan', +p[0], +p[1]); }, fail);
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'form') return;
    e.preventDefault();
    if (f.id === 'bgform') {
      var id = f.dataset.id, v = parseInt(($('#bgin').value || '').replace(/\D/g, '') || '0', 10), er = $('#bgerr');
      if (!v) { er.textContent = 'Isi batas bulanan, atau pilih Hapus.'; return; }
      Promise.resolve(store.set('budgets', id, { amount: v })).then(function () { S.editBudget = null; render(); toast('Anggaran tersimpan'); },
        function (ex) { er.textContent = writeFailed(ex); });
    } else if (f.id === 'ncform') {
      addCategory(S.ncType, $('#ncname2').value).then(function () { S.ncMsg = ''; render(); toast('Kategori ditambahkan'); },
        function (ex) { S.ncMsg = catMsg(ex); render(); });
    }
  });

  /* ---------- aksi ---------- */
  var byId = function (list, id) { return list.filter(function (x) { return x.id === id; })[0]; };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var a = el.dataset.act, id = el.dataset.id;
    if (a === 'tab') { S.tab = el.dataset.tab; S.editBudget = null; render(); }
    else if (a === 'prev') { if (S.m === 1) { S.m = 12; S.y--; } else S.m--; subscribeTx(); }
    else if (a === 'next') { if (isCurrentMonth()) return; if (S.m === 12) { S.m = 1; S.y++; } else S.m++; subscribeTx(); }
    else if (a === 'role') { S.role = el.dataset.role; try { localStorage.setItem('kk-role', S.role); } catch (x) { /* abaikan */ } render(); }
    else if (a === 'ftype') { S.fType = el.dataset.v; render(); }
    else if (a === 'fwho') { S.fWho = el.dataset.v; render(); }
    else if (a === 'add-out') openSheet('out');
    else if (a === 'add-in') openSheet('in');
    else if (a === 'add-rec') openSheet('out', null, 'rec');
    else if (a === 'edit') { if (!canWrite()) return; var tx = byId(S.txs, id); if (tx) openSheet(tx.type, tx, 'tx'); }
    else if (a === 'rec-edit') { if (!canWrite()) return; var rc = byId(S.recs, id); if (rc) openSheet(rc.type, rc, 'rec'); }
    else if (a === 'rec-toggle') {
      var rr = byId(S.recs, id); if (!rr) return;
      Promise.resolve(store.set('recurring', id, recData(rr, { active: rr.active === false }))).then(function () { toast(rr.active === false ? 'Transaksi berulang diaktifkan' : 'Transaksi berulang dijeda'); }, function (ex) { toast(writeFailed(ex)); });
    }
    else if (a === 'close') closeSheet();
    else if (a === 'settype') { if (S.sType !== el.dataset.type) { S.sType = el.dataset.type; S.sCat = null; S.newCat = false; } renderSheetState(); }
    else if (a === 'cat') { S.sCat = id; renderSheetCats(); }
    else if (a === 'setwho') { S.sWho = el.dataset.v; renderSheetState(); }
    else if (a === 'nc-open') { S.newCat = !S.newCat; renderSheetCats(); if (S.newCat) setTimeout(function () { $('#ncname').focus(); }, 20); }
    else if (a === 'nc-add') doNcAdd();
    else if (a === 'rdel') { S.sReceipt = null; S.sReceiptChanged = true; S.sZoom = false; renderReceipt(); }
    else if (a === 'rzoom') { S.sZoom = !S.sZoom; renderReceipt(); }
    else if (a === 'del') {
      if (!S.editing) return;
      if (!el.classList.contains('armed')) {
        el.classList.add('armed'); el.textContent = 'Yakin hapus?';
        clearTimeout(armT);
        armT = setTimeout(function () { el.classList.remove('armed'); el.textContent = 'Hapus'; }, 4000);
        return;
      }
      var cur = S.editing, isRec = S.sMode === 'rec';
      var job = isRec ? store.del('recurring', cur.id) : Promise.resolve(store.del('transactions', cur.id)).then(function () { return cur.hasReceipt ? store.del('receipts', cur.id) : null; });
      Promise.resolve(job).then(function () { closeSheet(); toast(isRec ? 'Transaksi berulang dihapus' : 'Catatan dihapus'); },
        function (ex) { $('#err').textContent = writeFailed(ex); });
    }
    else if (a === 'bg-edit') { S.editBudget = id; render(); setTimeout(function () { var i = $('#bgin'); if (i) i.focus(); }, 20); }
    else if (a === 'bg-cancel') { S.editBudget = null; render(); }
    else if (a === 'bg-del') {
      Promise.resolve(store.del('budgets', id)).then(function () { S.editBudget = null; render(); toast('Anggaran dihapus'); }, function (ex) { var er = $('#bgerr'); if (er) er.textContent = writeFailed(ex); });
    }
    else if (a === 'cat-del') {
      var key = 'cat:' + id;
      if (S.armed !== key) { arm(key); return; }
      S.armed = null;
      Promise.resolve(store.del('categories', id)).then(function () { S.custom = S.custom.filter(function (c) { return c.id !== id; }); rebuildCats(); render(); toast('Kategori dihapus. Catatan lama tetap tersimpan.'); }, function (ex) { toast(writeFailed(ex)); render(); });
    }
    else if (a === 'nc-type') { S.ncType = el.dataset.v; S.ncMsg = ''; render(); }
    else if (a === 'ex-period') { S.exPeriod = el.dataset.v; S.exMsg = ''; render(); }
    else if (a === 'ex-xlsx') doExport('xlsx');
    else if (a === 'ex-csv') doExport('csv');
    else if (a === 'ex-copy') doExport('copy');
    else if (a === 'go-sync') { S.tab = 'more'; render(); window.scrollTo(0, 0); }
    else if (a === 'sync-mode') { S.syncMode = el.dataset.v; S.syncMsg = ''; render(); }
    else if (a === 'sync-copy') { copyInvite(); }
    else if (a === 'sync-off') { if (S.armed !== 'sync:off') { arm('sync:off'); return; } S.armed = null; try { localStorage.removeItem(CONN_KEY); } catch (x) { /* abaikan */ } location.reload(); }
    else if (a === 'sync-new') { syncNew(); }
    else if (a === 'sync-join') { syncJoin(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

  /* ---------- mulai ---------- */
  buildDays();
  render();
  /* ---------- sinkron Firebase ---------- */
  var CONN_KEY = 'kk-conn', conn = null, fbDb = null, probeApp = null;
  var readConn = function () { try { var c = JSON.parse(localStorage.getItem(CONN_KEY) || 'null'); return c && c.c && c.h ? c : null; } catch (e) { return null; } };
  var inviteCode = function () { return conn ? 'KK1.' + btoa(unescape(encodeURIComponent(JSON.stringify(conn)))) : ''; };
  function parseInvite(t) {
    t = String(t || '').replace(/\s+/g, '');
    if (t.indexOf('KK1.') !== 0) return null;
    try { var o = JSON.parse(decodeURIComponent(escape(atob(t.slice(4))))); return o && o.c && o.c.apiKey && o.h ? o : null; } catch (e) { return null; }
  }
  function parseConfig(t) {
    var o = {};
    String(t || '').replace(/["']?(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId|measurementId)["']?\s*:\s*["']([^"']+)["']/g, function (m, k, v) { o[k] = v; return m; });
    return o.apiKey && o.projectId && o.appId ? o : null;
  }
  function newHid() { var a = new Uint8Array(18); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join(''); }
  function withTimeout(p, ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej({ code: 'timeout' }); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function syncError(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/operation-not-allowed' || c === 'auth/admin-restricted-operation') return 'Aktifkan metode masuk Anonymous di Firebase: Authentication, Sign-in method, Anonymous.';
    if (c.indexOf('invalid-api-key') > -1 || c.indexOf('api-key-not-valid') > -1) return 'Konfigurasi Firebase salah. Salin ulang firebaseConfig dari Project settings.';
    if (c === 'auth/network-request-failed' || c === 'timeout' || c === 'unavailable') return 'Tidak bisa terhubung ke Firebase. Periksa internet lalu coba lagi.';
    if (c === 'permission-denied') return 'Aturan Firestore belum dipasang. Tempel isi firestore.rules di Firestore Database, tab Rules, lalu Publish.';
    if (c === 'bad-code') return 'Kode undangan tidak valid. Salin ulang seluruh kodenya.';
    if (c === 'bad-config') return 'Konfigurasi tidak terbaca. Tempel seluruh blok firebaseConfig, termasuk apiKey dan appId.';
    if (c === 'no-household') return 'Kode itu belum dikenali. Pastikan pasangan sudah menyambungkan dan kodenya lengkap.';
    if (c === 'failed-precondition' || c === 'not-found') return 'Firestore belum dibuat. Buka Firestore Database di Firebase lalu klik Create database.';
    return 'Gagal menyambungkan (' + (c || 'tidak diketahui') + ').';
  }
  function probe(cfg, hid, create) {
    var cleanup = probeApp ? deleteApp(probeApp).catch(function () {}) : Promise.resolve();
    probeApp = null;
    return cleanup.then(function () {
      probeApp = initializeApp(cfg);
      var ref = fsDoc(getFirestore(probeApp), 'households', hid, 'meta', 'info');
      return withTimeout(signInAnonymously(getAuth(probeApp)), 15000).then(function () {
        if (create) return withTimeout(setDoc(ref, { createdAt: Date.now() }), 15000);
        return withTimeout(getDoc(ref), 15000).then(function (s) { if (!s.exists()) throw { code: 'no-household' }; });
      });
    });
  }
  function finishConnect(c, migrate) {
    try { localStorage.setItem(CONN_KEY, JSON.stringify(c)); if (migrate) localStorage.setItem('kk-migrate', '1'); } catch (e) { S.syncBusy = false; S.syncMsg = 'Penyimpanan HP penuh atau diblokir.'; render(); return; }
    location.reload();
  }
  function syncFail(e) { S.syncBusy = false; S.syncMsg = syncError(e); render(); }
  function syncNew() {
    var cfg = parseConfig(($('#synnew') || {}).value);
    if (!cfg) return syncFail({ code: 'bad-config' });
    var hid = newHid(); S.syncBusy = true; S.syncMsg = ''; render();
    probe(cfg, hid, true).then(function () { finishConnect({ c: cfg, h: hid }, true); }, syncFail);
  }
  function syncJoin() {
    var inv = parseInvite(($('#synjoin') || {}).value);
    if (!inv) return syncFail({ code: 'bad-code' });
    S.syncBusy = true; S.syncMsg = ''; render();
    probe(inv.c, inv.h, false).then(function () { finishConnect(inv, false); }, syncFail);
  }
  function copyInvite() {
    var code = inviteCode();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { toast('Kode undangan tersalin'); }, function () { var t = $('#invcode'); if (t) { t.select(); } toast('Tekan lama lalu salin kodenya'); });
    } else { var t = $('#invcode'); if (t) { t.select(); } toast('Tekan lama lalu salin kodenya'); }
  }
  function syncCardHtml() {
    var dis = S.syncBusy ? ' disabled' : '', h = '<section class="card"><h3 class="sec">Sinkron dengan pasangan</h3>';
    if (S.mode === 'shared') {
      var on = S.armed === 'sync:off';
      h += '<p class="hint"><span class="pill ok">Tersambung</span> Catatan tersinkron lewat Firebase dan tetap bisa dicatat saat tidak ada internet.</p>' +
        '<p class="hint">Kirim kode undangan ini ke pasangan. Di HP-nya buka Lainnya, pilih Gabung, lalu tempel kodenya.</p>' +
        '<textarea class="field code" id="invcode" readonly rows="3" aria-label="Kode undangan">' + esc(inviteCode()) + '</textarea>' +
        '<div class="row-actions"><button type="button" class="chip" data-act="sync-copy">Salin kode</button>' +
        '<button type="button" class="chip danger' + (on ? ' armed' : '') + '" data-act="sync-off">' + (on ? 'Yakin putuskan?' : 'Putuskan di HP ini') + '</button></div>';
    } else {
      h += '<p class="hint">Saat ini catatan hanya ada di HP ini. Hubungkan Firebase supaya Anda dan pasangan melihat catatan yang sama.</p>' +
        '<div class="seg" role="group" aria-label="Cara menyambungkan"><button type="button" data-act="sync-mode" data-v="new" aria-pressed="' + (S.syncMode !== 'join') + '">Mulai baru</button><button type="button" data-act="sync-mode" data-v="join" aria-pressed="' + (S.syncMode === 'join') + '">Gabung</button></div>';
      if (S.syncMode === 'join') {
        h += '<textarea class="field code" id="synjoin" rows="4" placeholder="Tempel kode undangan dari pasangan" aria-label="Kode undangan"></textarea>' +
          '<button type="button" class="act plain" data-act="sync-join"' + dis + '>Gabung</button>';
      } else {
        h += '<p class="hint">Buat proyek Firebase gratis dulu (langkahnya ada di panduan), lalu tempel blok firebaseConfig dari Project settings di sini. Catatan yang sudah ada di HP ini ikut dipindahkan.</p>' +
          '<textarea class="field code" id="synnew" rows="6" placeholder="const firebaseConfig = {\n  apiKey: &quot;...&quot;,\n  ...\n};" aria-label="Konfigurasi Firebase"></textarea>' +
          '<button type="button" class="act plain" data-act="sync-new"' + dis + '>Sambungkan dan buat kode</button>';
      }
    }
    return h + '<p class="hint" role="status" style="color:var(--ink)">' + esc(S.syncBusy ? 'Menyambungkan…' : S.syncMsg) + '</p></section>';
  }
  function migrateIfNeeded() {
    var flag = null, D = {};
    try { flag = localStorage.getItem('kk-migrate'); D = JSON.parse(localStorage.getItem('kk-data2') || '{}'); } catch (e) { /* abaikan */ }
    if (!flag) return;
    var jobs = [];
    ['transactions', 'categories', 'budgets', 'recurring', 'receipts'].forEach(function (n) {
      var m = D[n] || {}; Object.keys(m).forEach(function (id) { jobs.push([n, id, m[id]]); });
    });
    var chain = Promise.resolve();
    jobs.forEach(function (j) { chain = chain.then(function () { return store.set(j[0], j[1], j[2]); }); });
    chain.then(function () {
      try { localStorage.removeItem('kk-migrate'); localStorage.removeItem('kk-data2'); } catch (e) { /* abaikan */ }
      if (jobs.length) toast(jobs.length + ' catatan lama dipindahkan');
    }, function () { /* coba lagi di pembukaan berikutnya */ });
  }

  /* ---------- ekspor lewat menu Bagikan Android ---------- */
  function toBase64(data) {
    var bytes = typeof data === 'string' ? new TextEncoder().encode(data) : (data instanceof ArrayBuffer ? new Uint8Array(data) : data);
    var bin = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  var nativeDl = {
    save: function (o) {
      return Filesystem.writeFile({ path: o.filename, data: toBase64(o.data), directory: Directory.Cache })
        .then(function (r) { return Share.share({ title: o.filename, dialogTitle: 'Simpan atau kirim ' + o.filename, files: [r.uri] }); })
        .then(function () { return { status: 'saved' }; });
    }
  };

  /* ---------- mulai ---------- */
  function startData() { subscribeAux(); subscribeTx(); migrateIfNeeded(); }
  function connect() {
    conn = readConn();
    if (!conn) { store = localStore(); S.mode = 'local'; subscribeAux(); subscribeTx(); return; }
    try {
      var app = initializeApp(conn.c);
      try { fbDb = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }) }); }
      catch (e) { fbDb = getFirestore(app); }
      var auth = getAuth(app), started = false;
      store = fbStore(fbDb, conn.h); S.mode = 'shared';
      var begin = function (user) { if (started) return; started = true; S.uid = user ? user.uid : null; startData(); };
      onAuthStateChanged(auth, function (user) {
        if (user) begin(user);
        else signInAnonymously(auth).then(function (c) { begin(c.user); }, function () { S.error = true; S.loaded = true; render(); });
      });
    } catch (e) {
      store = localStore(); S.mode = 'local'; conn = null; subscribeAux(); subscribeTx();
    }
  }
  if (Capacitor.isNativePlatform()) {
    S.dl = nativeDl;
    CapApp.addListener('backButton', function () {
      if (!$('#sheet').hidden) closeSheet();
      else if (S.editBudget) { S.editBudget = null; render(); }
      else if (S.tab !== 'home') { S.tab = 'home'; render(); }
      else CapApp.exitApp();
    });
  }
  buildDays();
  render();
  connect();
})();
