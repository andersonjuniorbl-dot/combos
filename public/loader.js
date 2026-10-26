(function () {
  var SRC = {
    vendas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS5vuO78ihBPYlnYDiP8UYF-cNT5WQHMKap5zOy-5L3BOiYxP87mMnM9MKYDoymNA/pub?output=csv',
    elegiveis: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ4M2GLPF99O70xuMoHKX0jdMGA1a4yK833zM9zfFudpVentC6uQaQ0AcWWWb6sKw/pub?output=csv',
    cadastro: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTK16p-ZNfeKTPdymIJ2Ka9Fc2Lla-9g7Y5KQ27V1_7WbN7sxhRNO51zqYSmp20uw/pub?output=csv',
    base: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSRvIBwdJwyRrjDHog5KELnzJ9FRokw8xauLOaINEkupBSSYZQYFb-e_Pf5ueOt-Q/pub?output=csv'
  };
  var KEEP = ["146 - ANTONIO - FRIO","142 - ANTONY - FRIO","131 - CLAITON - ASI","147 - EDILSON - FRIO","135 - HELSON - FRIO","144 - EDVAN - FRIO","155 - DANIEL - FRIO","156 - LUIZ FELIPE - FRIO","145 - ANGELO - FRIO","133 - DAVID - VER","141 - DIEGO - FRIO","157 - MATHEUS - FRIO","132 - FELIPE - VER","143 - MARCOS - FRIO","154 - FRANCISCO JUNIOR - FRIO","136 - ALEX - FRIO","153 - JUNIOR ASSENE - FRIO","151 - JOSE CARLOS - FRIO","134 - MARCIEL - ADE","152 -LUIZ CARLOS - FRIO","137 - TOP ASI","122 - JOSE CARLOS","102","101-LACERDA","203 MOISES","105 IVAN VIEIRA","101 CAIO CEZAR","103 BORGES","201 LETICIA BAYMA","108 BERG ALVES","202 EVERARDO","107 SERGIO SALES","104 GUSTAVO","205 KENED","102 VALTEMIR","204 JOAO GEORGE","206 BRENER BARBOSA","207 JOSE LUIZ","106 WASHINGTON","112- ARIANE SANTOS","105 - MARCUS","104 - DIEGO BARROS","111 - MIQUEIAS","106 - BARRETO JUNIOR","110 - SV","103 - CIRILO","101 - MADDSON","102 - FCO MARLLOS"];
  var ALIAS = { "154 - JUNIOR ASSENE - FRIO": "153 - JUNIOR ASSENE - FRIO", "153 - FRANCISCO JUNIOR - FRIO": "154 - FRANCISCO JUNIOR - FRIO", "104 - BARRETO JUNIOR": "106 - BARRETO JUNIOR", "106 - DIEGO": "104 - DIEGO BARROS" };
  var REV = { 'Premium - J. do Norte': 'J. do Norte', 'Premium - Iguatu': 'Iguatu', 'Teresina': 'Teresina', 'Premium - Central das bebidas': 'Central das Bebidas' };
  var OP = { '3686': 'Iguatu', '3687': 'J. do Norte', '3820': 'Teresina', '3947': 'Central das Bebidas' };

  function parse(t) {
    var rows = [], row = [], f = '', q = false, n = t.length;
    for (var i = 0; i < n; i++) {
      var c = t.charCodeAt(i);
      if (q) { if (c === 34) { if (t.charCodeAt(i + 1) === 34) { f += '"'; i++; } else q = false; } else f += t[i]; }
      else if (c === 34) q = true;
      else if (c === 44) { row.push(f); f = ''; }
      else if (c === 10) { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== 13) f += t[i];
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  function body(rows) { return rows.slice(1).filter(function (r) { return r[0] && r[0].trim(); }); }
  function num(x) { x = String(x || '').replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.'); var v = parseFloat(x); return isNaN(v) ? 0 : v; }
  function T(x) { return String(x == null ? '' : x).trim(); }

  function build(sales, elig, cad, base) {
    var keep = new Set(KEEP);
    var cat = {}, ciaSuf = {};
    cad.forEach(function (r) {
      var o = { nome: T(r[3]).replace(/\s+/g, ' '), desconto: num(r[4]), tipo: T(r[5]).toUpperCase() };
      cat[T(r[0])] = o; if (o.tipo === 'CIA') ciaSuf[T(r[2])] = o;
    });
    function combo(k) { var suf = k.split('-')[1]; var o = cat[k]; if (o && o.tipo === 'CIA') return o; return ciaSuf[suf] || null; }
    var bw = {};
    base.forEach(function (r) { bw[T(r[0])] = { codigo: T(r[2]), fantasia: T(r[4]).replace(/\s+/g, ' '), revenda: REV[T(r[1])] || T(r[1]), supervisor: T(r[6]), vendedor: ALIAS[T(r[7])] || T(r[7]) }; });

    var fact = {}, vdc = {}, soldQ = {};
    sales.forEach(function (r) {
      var v = T(r[6]); v = ALIAS[v] || v; if (!keep.has(v)) return;
      var rev = REV[T(r[0])] || T(r[0]), sv = T(r[5]), k = T(r[7]), b = T(r[1]), qs = T(r[8]);
      var key = rev + '|' + sv + '|' + v;
      var d = vdc[key] || (vdc[key] = { revenda: rev, supervisor: sv, vendedor: v, a: new Set(), c: new Set(), o: new Set() });
      var cb = combo(k); d.a.add(b); (cb ? d.c : d.o).add(b);
      if (!cb) return;
      var q = (qs === '-' || qs === '') ? 0 : (parseFloat(qs.replace(',', '.')) || 0);
      soldQ[b + '|' + k] = (soldQ[b + '|' + k] || 0) + q;
      var fk = key + '|' + k;
      var f = fact[fk] || (fact[fk] = { revenda: rev, supervisor: sv, vendedor: v, combo: k, nome: cb.nome, tipo: 'CIA', desconto: cb.desconto, positivacoes: 0, qtd: 0, sem_qtd: 0, elegiveis_compraram: 0, investimento: 0 });
      f.positivacoes++; if (qs === '-' || qs === '') f.sem_qtd++; else { f.qtd += q; f.investimento += q * cb.desconto; }
    });
    var vendas = Object.keys(fact).map(function (k) { var f = fact[k]; f.investimento = Math.round(f.investimento * 100) / 100; return f; });

    var seen = new Set(), clientes = [], ec = {}, comb = {};
    elig.forEach(function (r) {
      var b = T(r[0]), k = T(r[3]), pk = b + '|' + k; if (seen.has(pk)) return; seen.add(pk);
      var c = bw[b]; if (!c || !keep.has(c.vendedor)) return;
      var cb = combo(k) || { nome: k, desconto: 0 };
      var q = soldQ[pk] || 0;
      clientes.push({ id: c.revenda + ' · ' + c.codigo + ' · ' + k, codigo: c.codigo, fantasia: c.fantasia, revenda: c.revenda, supervisor: c.supervisor, vendedor: c.vendedor, combo: k, nome: cb.nome, qtd: q, comprou: q > 0 ? 'Sim' : 'Não' });
      var ek = c.revenda + '|' + c.supervisor + '|' + c.vendedor + '|' + k;
      var e = ec[ek] || (ec[ek] = { revenda: c.revenda, supervisor: c.supervisor, vendedor: c.vendedor, combo: k, elegiveis: 0, elegiveis_compraram: 0 });
      e.elegiveis++; if (q > 0) e.elegiveis_compraram++;
      comb[k] = (comb[k] || 0) + 1;
      var vk = c.revenda + '|' + c.supervisor + '|' + c.vendedor;
      if (!vdc[vk]) vdc[vk] = { revenda: c.revenda, supervisor: c.supervisor, vendedor: c.vendedor, a: new Set(), c: new Set(), o: new Set() };
    });
    vendas.forEach(function (f) { if (!(f.combo in comb)) comb[f.combo] = comb[f.combo] || 0; });
    var combos = Object.keys(comb).map(function (k) { var cb = combo(k) || { nome: k, desconto: 0 }; return { combo: k, revenda: OP[k.split('-')[0]] || '', nome: cb.nome, tipo: 'CIA', desconto: cb.desconto, elegiveis: comb[k] }; });
    var vendedores = Object.keys(vdc).map(function (k) { var d = vdc[k]; return { revenda: d.revenda, supervisor: d.supervisor, vendedor: d.vendedor, clientes: d.a.size, clientes_cia: d.c.size, clientes_revenda: d.o.size }; });
    return { vendas: vendas, combos: combos, vendedores: vendedores, elegiveis_combo: Object.keys(ec).map(function (k) { return ec[k]; }), clientes: clientes };
  }

  function bust(u) { return u + (u.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now(); }
  function rowsOf(ab) {
    var b = new Uint8Array(ab);
    if (b[0] === 0x50 && b[1] === 0x4b) return readXlsx(ab);
    var t = new TextDecoder().decode(b);
    if (/^\s*<(!doctype|html)/i.test(t)) throw new Error('o link devolveu uma página, não a planilha (verifique se está publicado/compartilhado)');
    return parse(t);
  }
  function pull(u, h) { return fetch(u, { cache: 'no-store', headers: h || {} }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(rowsOf); }
  // tenta direto do navegador; se o site bloquear (CORS), passa pelo servidor do painel
  function get(key, u, h) {
    return pull(bust(u)).catch(function (e1) {
      if (location.protocol === 'file:') throw e1;
      return pull('/api/fonte?k=' + encodeURIComponent(key) + (h ? '&u=' + encodeURIComponent(u) : '') + '&t=' + Date.now(), h);
    });
  }
  function unxml(x) { return x.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, function (m, d) { return String.fromCharCode(+d); }).replace(/&amp;/g, '&'); }
  function colIdx(l) { var n = 0; for (var i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n - 1; }
  function readXlsx(ab) {
    var buf = new Uint8Array(ab), dv = new DataView(ab), e = buf.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) return Promise.reject(new Error('arquivo de combos não é um .xlsx válido'));
    var n = dv.getUint16(e + 10, true), off = dv.getUint32(e + 16, true), files = {};
    for (var i = 0; i < n; i++) {
      var nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true);
      files[new TextDecoder().decode(buf.subarray(off + 46, off + 46 + nl))] = { m: dv.getUint16(off + 10, true), cs: dv.getUint32(off + 20, true), lho: dv.getUint32(off + 42, true) };
      off += 46 + nl + el + cl;
    }
    function read(name) {
      var f = files[name]; if (!f) return Promise.resolve('');
      var a = f.lho + 30 + dv.getUint16(f.lho + 26, true) + dv.getUint16(f.lho + 28, true), d = buf.subarray(a, a + f.cs);
      if (f.m === 0) return Promise.resolve(new TextDecoder().decode(d));
      return new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    return Promise.all([read('xl/sharedStrings.xml'), read('xl/worksheets/sheet1.xml')]).then(function (x) {
      var strs = [], m, re = /<si>([\s\S]*?)<\/si>/g;
      while ((m = re.exec(x[0]))) { var t = '', r2 = /<t[^>]*>([\s\S]*?)<\/t>/g, mm; while ((mm = r2.exec(m[1]))) t += mm[1]; strs.push(unxml(t)); }
      var rows = [], rr = /<row[^>]*>([\s\S]*?)<\/row>/g, rm;
      while ((rm = rr.exec(x[1]))) {
        var row = [], cr = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, cm;
        while ((cm = cr.exec(rm[1]))) {
          var inner = cm[3] || '', v = inner.match(/<v>([\s\S]*?)<\/v>/), it = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/), val = '';
          if (/t="s"/.test(cm[2]) && v) val = strs[+v[1]] || ''; else if (v) { val = unxml(v[1]); if (/^-?\d+\.\d+(E-?\d+)?$/i.test(val)) val = String(+val).replace('.', ','); } else if (it) val = unxml(it[1]);
          row[colIdx(cm[1])] = val;
        }
        for (var j = 0; j < row.length; j++) if (row[j] == null) row[j] = '';
        rows.push(row);
      }
      return rows;
    });
  }
  function getXlsx(u) {
    return fetch(u + '&t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(readXlsx);
  }
  var NOMES = { vendas: 'planilha de venda de combos', elegiveis: 'base elegível CIA', cadastro: 'cadastro de combos', base: 'base geral de clientes (BW)' };
  function tag(nome, p) { return p.catch(function (e) { var err = new Error('Não foi possível ler: ' + nome + '.'); err.fonte = nome; err.causa = e; throw err; }); }
  function config() {
    if (location.protocol === 'file:') return Promise.resolve({});
    return fetch('/api/config?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
  }
  window.LIVE = { SRC: SRC, NOMES: NOMES, get: get, body: body };
  window.loadLive = function () {
    return config().then(function (c) {
      var U = {}; Object.keys(SRC).forEach(function (k) { U[k] = (c.fontes && c.fontes[k]) || SRC[k]; });
      var ks = ['vendas', 'elegiveis', 'cadastro', 'base'];
      var ps = ks.map(function (k) { return tag(NOMES[k], get(k, U[k])); });
      return Promise.allSettled(ps);
    }).then(function (rs) {
      var falhas = rs.filter(function (r) { return r.status === 'rejected'; }).map(function (r) { return r.reason.fonte; });
      if (falhas.length) { var e = new Error('Não foi possível ler: ' + falhas.join(', ') + '.'); e.falhas = falhas; throw e; }
      var t = rs.map(function (r) { return body(r.value); });
      return build(t[0], t[1], t[2], t[3]);
    });
  };
})();
