/* =====================================================================
   Panel de la portada: cuatro productos de ejemplo, cada uno con su diseño
   (alojamiento, clínica, academia y restaurante). Un cursor de mentira los
   usa solos; en cada vuelta se pasa al siguiente negocio. Si alguien lo toca,
   se para y le deja usarlo; a los 9 s sin tocar, sigue solo.
   Todos los datos son inventados.
===================================================================== */
(() => {
  const app = document.getElementById('happ');
  if (!app || typeof gsap === 'undefined') return;
  const wrap = document.getElementById('happ-wrap');
  const $ = (s) => app.querySelector(s);
  const side = $('.happ__side'), main = $('.happ__main'), body = $('.happ__body');
  const cursor = $('#happ-cursor'), toast = $('#happ-toast');
  const q = (s) => main.querySelector(s), qa = (s) => [...main.querySelectorAll(s)];
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let auto = !quieto, tl = null, visible = false, espera, actual = null, S = null;

  /* ---------- Utilidades ---------- */
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // useGrouping 'always': en español el navegador no pone el punto de miles hasta 10.000
const num = (n, d = 0) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
  const contar = (raiz) => raiz.querySelectorAll('[data-n]').forEach((b) => {
    const o = { v: 0 }, n = +b.dataset.n, d = +(b.dataset.d || 0), suf = b.dataset.suf || '';
    gsap.to(o, { v: n, duration: 1.1, ease: 'power2.out', onUpdate: () => { b.textContent = num(o.v, d) + suf; } });
  });
  const a = (el, n, d = 0, suf = '', dur = 0.8) => { // anima un número de su valor actual a n
    const o = { v: +el.dataset.n || 0 }; el.dataset.n = n;
    gsap.to(o, { v: n, duration: dur, ease: 'power2.out', onUpdate: () => { el.textContent = num(o.v, d) + suf; } });
  };
  const ver = (v) => {
    side.querySelectorAll('.happ__nav').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    main.querySelectorAll('.happ__view').forEach((s) => s.classList.toggle('on', s.dataset.v === v));
  };
  const abrir = (v) => { ver(v); const s = q(`.happ__view[data-v="${v}"]`); if (s && S.entra[v]) S.entra[v](s); };
  // Posición de un elemento dentro del panel (sin contar la inclinación 3D de la portada)
  const pos = (el) => {
    let x = el.offsetWidth * 0.5, y = el.offsetHeight * 0.55;
    for (let n = el; n && n !== body; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  };
  const escala = () => app.getBoundingClientRect().width / app.offsetWidth || 1;
  // Mueve un elemento a su sitio nuevo con animación (FLIP)
  const flip = (els, cambia, dur = 0.6) => {
    els = [].concat(els); const k = escala();
    const antes = els.map((e) => e.getBoundingClientRect());
    cambia();
    els.forEach((e, i) => {
      const r = e.getBoundingClientRect();
      gsap.fromTo(e, { x: (antes[i].left - r.left) / k, y: (antes[i].top - r.top) / k }, { x: 0, y: 0, duration: dur, ease: 'power3.inOut', clearProps: 'transform' });
    });
  };
  const pulsa = (el) => {
    cursor.classList.remove('clic'); void cursor.offsetWidth; cursor.classList.add('clic');
    el.classList.add('pulsado'); setTimeout(() => el.classList.remove('pulsado'), 180);
  };
  const avisa = (txt) => {
    toast.querySelector('span').textContent = txt; toast.classList.add('on');
    clearTimeout(avisa.t); avisa.t = setTimeout(() => toast.classList.remove('on'), 2400);
  };
  const brilla = (el) => { el.classList.remove('nuevo-brillo'); void el.offsetWidth; el.classList.add('nuevo-brillo'); };
  const tras = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // Confeti pequeño que sale de un elemento (sin librerías)
  const confeti = (el, colores = ['#e02b20', '#f5c542', '#12d678', '#5b9dff', '#fff']) => {
    const p = pos(el);
    for (let i = 0; i < 28; i++) {
      const c = document.createElement('i');
      c.className = 'happ__confeti'; c.style.background = colores[i % colores.length];
      c.style.left = p.x + 'px'; c.style.top = p.y + 'px'; body.append(c);
      const ang = Math.random() * Math.PI * 2, v = 60 + Math.random() * 90;
      gsap.to(c, { x: Math.cos(ang) * v, y: Math.sin(ang) * v - 40, rotation: Math.random() * 540, duration: 0.7, ease: 'power2.out' });
      gsap.to(c, { y: '+=' + (90 + Math.random() * 60), opacity: 0, duration: 1, delay: 0.6, ease: 'power1.in', onComplete: () => c.remove() });
    }
  };
  // Narración de lo que pasa en el panel (debajo de él)
  const guia = document.getElementById('happ-guia');
  const contar_pasos = (txt, k, total) => {
    if (!guia) return;
    guia.classList.remove('tuya');
    guia.querySelector('.happ-guia__n').textContent = `${k}/${total}`;
    const t = guia.querySelector('.happ-guia__t');
    gsap.fromTo(t, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, onStart: () => { t.textContent = txt; } });
    guia.querySelector('.happ-guia__pasos').innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('');
  };
  const presenta = () => {
    if (!guia) return;
    guia.classList.remove('tuya');
    guia.querySelector('.happ-guia__n').textContent = '▶';
    const t = guia.querySelector('.happ-guia__t');
    gsap.fromTo(t, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, onStart: () => { t.textContent = `${S.negocio} · un panel hecho a medida para ${S.para}`; } });
    guia.querySelector('.happ-guia__pasos').innerHTML = '';
  };
  const tuTurno = () => {
    if (!guia) return;
    guia.classList.add('tuya');
    guia.querySelector('.happ-guia__n').textContent = '✋';
    guia.querySelector('.happ-guia__t').textContent = 'Tu turno: toca lo que quieras. En unos segundos sigue solo.';
    guia.querySelector('.happ-guia__pasos').innerHTML = '';
  };

  const I = {
    casa: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    gente: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-7 7-7s7 3 7 7M17 4a4 4 0 0 1 0 8M22 21c0-3-2-5.5-5-6.5"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21h4"/>',
    panel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    test: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>',
    trofeo: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
    grafica: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    caja: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    etiqueta: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    wa: '<path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 6L0 24l6.3-1.7a11.9 11.9 0 0 0 5.7 1.5c6.5 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.4z" fill="currentColor" stroke="none"/>',
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg>`;

  /* =================================================================
     1 · ALOJAMIENTO — Casa Olivo (casa rural)
  ================================================================= */
  const DIAS = ['L 24', 'M 25', 'X 26', 'J 27', 'V 28', 'S 29', 'D 30', 'L 1', 'M 2', 'X 3', 'J 4', 'V 5', 'S 6', 'D 7'];
  const HAB = [
    ['olivo', 'Olivo', 'doble', [[0, 3, 'Ana R.'], [5, 4, 'Pedro M.', 'b']]],
    ['almendro', 'Almendro', 'suite', [[1, 5, 'Jordi P.'], [9, 3, 'Bloqueo', 'c']]],
    ['encina', 'Encina', 'familiar', [[0, 2, 'Marta G.', 'b'], [3, 6, 'Familia Sanz']]],
    ['jazmin', 'Jazmín', 'doble', [[6, 4, 'Luis T.', 'b']]],
  ];
  const alojamiento = {
    tema: 'aloj', para: 'una casa rural', url: 'panel.casaolivo.es', negocio: 'Casa Olivo', sub: 'Casa rural', logo: '✿', ini: 'LM', usuario: 'Lucía M.',
    nav: [['inicio', 'Inicio', 'casa'], ['calendario', 'Calendario', 'cal'], ['huespedes', 'Huéspedes', 'gente'], ['mensajes', 'Mensajes', 'chat', 1]],
    vistas: {
      inicio: `<header class="hp-head"><div><small>Martes, 25 de noviembre</small><h4>Buenos días, Lucía</h4><p>Hoy llegan 2 huéspedes y se va 1.</p></div><div class="al-acc"><span class="al-tiempo"><svg viewBox="0 0 24 24"><g class="rayos"><path d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></g><circle cx="12" cy="12" r="4.5"/></svg>18° · Jaén</span><button type="button" class="hp-btn" data-a="reserva">+ Nueva reserva</button></div></header>
        <div class="al-top">
          <div class="al-ocup"><small>Ocupación de noviembre</small><b><span data-n="78" id="al-oc">78</span> %</b><div class="al-ocup__barra"><i id="al-oc-b" style="width:78%"></i></div><em>4 habitaciones · 120 noches</em></div>
          <div class="al-ing"><small>Ingresos del mes</small><b data-n="12480" data-suf=" €">12.480 €</b>
            <svg class="al-spark" viewBox="0 0 120 36" preserveAspectRatio="none"><path class="area" d="M0 30L15 26L30 28L45 20L60 22L75 14L90 16L105 8L120 10L120 36L0 36Z"/><path class="ln" d="M0 30L15 26L30 28L45 20L60 22L75 14L90 16L105 8L120 10"/></svg></div>
        </div>
        <small class="hp-sub">Llegadas de hoy</small>
        <div class="al-llegadas">
          <div class="al-lleg"><span class="al-foto" style="--h:24"></span><div><b>Ana Ruiz</b><span>Olivo · 3 noches</span></div><em>16:00</em></div>
          <div class="al-lleg"><span class="al-foto" style="--h:150"></span><div><b>Familia Sanz</b><span>Encina · 6 noches</span></div><em>18:30</em></div>
        </div>
        <div class="al-hoy"><small class="hp-sub">Hoy en la casa</small>
          <ul><li class="hecha"><i>✓</i><span>Limpieza de Olivo</span><em>Carmen · 11:00</em></li><li class="curso"><i></i><span>Preparar Encina para 4</span><em>en curso</em></li><li><i></i><span>Leña para la chimenea</span><em>antes de las 18:00</em></li><li><i></i><span>Desayuno de mañana · 6 personas</span><em>pedido a la panadería</em></li></ul></div>`,
      calendario: `<header class="hp-head"><div><small>24 nov – 7 dic</small><h4>Calendario</h4></div><div class="hp-seg"><span class="on">2 semanas</span><span>Mes</span></div></header>
        <div class="al-gantt">
          <div class="al-g-cab"><span></span><div class="al-g-dias">${DIAS.map((d, i) => `<span class="${i === 1 ? 'hoy' : ''}">${d}</span>`).join('')}</div></div>
          ${HAB.map(([id, nom, tipo, est]) => `<div class="al-g-fila" data-h="${id}"><b>${nom}<small>${tipo}</small></b><div class="al-g-pista">${est.map(([ini, l, n, t]) => `<i class="al-est${t ? ' al-est--' + t : ''}" style="--a:${ini};--l:${l}">${n}</i>`).join('')}${id === 'jazmin' ? '<i class="al-hueco" style="--a:1;--l:3"></i>' : ''}</div></div>`).join('')}
          <div class="al-g-ley"><span style="--c:#6f8a4e">Confirmada</span><span style="--c:#e8c7a0">Pagada al llegar</span><span class="raya">Bloqueo</span><span style="--c:var(--ac)">Nueva</span><em>Quincena al 71 % · 3 llegadas · 2 salidas</em></div>
        </div>`,
      huespedes: `<header class="hp-head"><div><small>142 huéspedes · 4,9 ★ de media</small><h4>Huéspedes</h4></div></header>
        <div class="al-huesp">${[['Ana Ruiz', '3 estancias · Valencia', 24, 'Repite'], ['Jordi Pons', '1 estancia · Barcelona', 200, '★ 5'], ['Marta Gil', '5 estancias · Jaén', 320, 'Repite'], ['Familia Sanz', '2 estancias · Madrid', 150, 'Con niños'], ['Luis Torres', '1 estancia · Sevilla', 80, '★ 5'], ['Pedro Molina', '4 estancias · Granada', 260, 'Repite'], ['Inés Navarro', '2 estancias · Bilbao', 330, 'Con perro'], ['Sara Vela', '1 estancia · Málaga', 110, '★ 4,8']]
          .map(([n, d, h, e]) => `<div class="al-h"><span class="al-foto" style="--h:${h}"></span><div><b>${n}</b><span>${d}</span></div><em>${e}</em></div>`).join('')}</div>`,
      mensajes: `<header class="hp-head"><div><small>1 sin leer · respondes en 6 min de media</small><h4>Mensajes</h4></div></header>
        <div class="al-msj">
          <div class="al-conv">${[['FS', 'Familia Sanz', 'Llegamos sobre las 18:30', '12:04', 150, 1], ['AR', 'Ana Ruiz', '¡Muchas gracias por todo!', '10:31', 24], ['JP', 'Jordi Pons', '¿Hay aparcamiento cerca?', 'ayer', 200], ['MG', 'Marta Gil', 'Os dejo 5 estrellas ⭐', 'lun', 320], ['LT', 'Luis Torres', 'Perfecto, nos vemos el 30', 'dom', 80]]
            .map(([i, n, m, h, c, on]) => `<button type="button" class="${on ? 'on' : ''}"><span class="al-foto" style="--h:${c}"></span><div><b>${n}</b><span>${m}</span></div><em>${h}</em></button>`).join('')}</div>
          <div class="al-hilo">
            <div class="al-hilo__cab"><span class="al-foto" style="--h:150"></span><div><b>Familia Sanz</b><span>Encina · 6 noches · llegan hoy a las 18:30</span></div><span class="st st--ok">Pagada</span></div>
            <div class="hp-chat" id="al-chat"><p class="hm">¡Hola! Llegamos sobre las 18:30.</p><p class="hm hm--yo">¡Perfecto! Os esperamos con la chimenea encendida 🔥</p></div>
            <div class="hp-rapidas"><button type="button" data-r="¡Claro! Que venga Lola 🐾">¡Claro, que venga!</button><button type="button" data-r="mapa">Enviar ubicación</button><button type="button" data-r="La llave está en el cajetín, código 2580.">Cómo entrar</button></div>
            <div class="al-escribe"><span>Escribe un mensaje…</span><i>➤</i></div>
          </div>
        </div>`,
    },
    entra: {
      inicio: (s) => {
        contar(s);
        s.querySelectorAll('.al-spark .ln').forEach((p) => { const L = 200; gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.out' }); });
        gsap.from(s.querySelectorAll('.al-lleg'), { opacity: 0, y: 12, stagger: 0.1, duration: 0.5, delay: 0.2 });
      },
      calendario: (s) => gsap.from(s.querySelectorAll('.al-est'), { scaleX: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' }),
      huespedes: (s) => gsap.from(s.querySelectorAll('.al-h'), { opacity: 0, y: 12, stagger: 0.06, duration: 0.45 }),
    },
    acciones: {
      reservar() {
        const h = q('.al-hueco'); if (!h) return avisa('Esas fechas ya están reservadas');
        const b = document.createElement('i');
        b.className = 'al-est al-est--nueva'; b.style.cssText = h.style.cssText; b.textContent = 'Lucas V. · 3 noches';
        h.replaceWith(b);
        gsap.from(b, { scaleX: 0, duration: 0.7, ease: 'power3.out' });
        avisa('Reserva de Lucas V. · 3 noches');
        const oc = q('#al-oc'); a(oc, 81); q('#al-oc-b').style.width = '81%';
      },
      entrante() {
        if (q('.al-entrante')) return;
        const c = document.createElement('div'); c.className = 'al-entrante';
        c.innerHTML = `<small><i></i>Nueva reserva · desde tu web</small><b>Lucas Vidal</b><span>3 noches · 2 adultos · Jazmín</span>
          <div class="al-entrante__pie"><strong>285 €</strong><em>sin comisiones</em></div>
          <div class="al-entrante__acc"><button type="button" data-a="aceptar">Aceptar</button><button type="button" data-a="ver">Ver</button></div>`;
        q('.happ__view[data-v="inicio"]').append(c);
        gsap.fromTo(c, { x: 60, opacity: 0, scale: 0.96 }, { x: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
        c.querySelector('[data-a="aceptar"]').addEventListener('click', () => alojamiento.acciones.aceptar());
        c.querySelector('[data-a="ver"]').addEventListener('click', () => alojamiento.acciones.aceptar());
      },
      aceptar() {
        const c = q('.al-entrante'); if (c) gsap.to(c, { x: 40, opacity: 0, duration: 0.3, onComplete: () => c.remove() });
        abrir('calendario'); setTimeout(() => alojamiento.acciones.reservar(), 650);
      },
      llega(txt) {
        const chat = q('#al-chat'), p = document.createElement('p');
        p.className = 'hm hm--escribe'; p.innerHTML = '<i></i><i></i><i></i>'; chat.append(p);
        return tras(1200).then(() => { p.className = 'hm'; p.textContent = txt; gsap.from(p, { scale: 0.92, opacity: 0.4, duration: 0.3 }); });
      },
      responder(b) {
        const chat = q('#al-chat'), p = document.createElement('p');
        if (b.dataset.r === 'mapa') { p.className = 'hm hm--yo hm--mapa'; p.innerHTML = '<span></span><b>Casa Olivo · Camino del Molino, 4</b>'; }
        else { p.className = 'hm hm--yo'; p.textContent = b.dataset.r; }
        chat.append(p); gsap.from(p, { y: 10, opacity: 0, duration: 0.35 });
        while (chat.children.length > 6) chat.firstElementChild.remove();
        avisa('Mensaje enviado');
      },
    },
    activar() {
      const A = this.acciones;
      q('[data-a="reserva"]').addEventListener('click', () => { abrir('calendario'); setTimeout(A.reservar, 650); });
      q('.al-g-fila[data-h="jazmin"] .al-g-pista').addEventListener('click', A.reservar);
      qa('.hp-rapidas button').forEach((b) => b.addEventListener('click', () => A.responder(b)));
    },
    guion(g) {
      const A = this.acciones;
      g.paso('Entra una reserva desde tu propia web, sin comisiones').hacer(() => A.entrante()).esperar(1.6)
        .clic('.al-entrante [data-a="aceptar"]', () => A.aceptar()).esperar(0.6)
        .paso('Se coloca sola en el calendario de habitaciones').esperar(1.8)
        .paso('Y la ocupación del mes se actualiza al momento').ir('inicio').esperar(1.6)
        .paso('Un huésped escribe… y se le contesta con un toque').ir('mensajes').ocultar().pausa(() => A.llega('¿Se admiten perros? Venimos con Lola 🐶')).mostrar()
        .clic(() => q('.hp-rapidas button'), (b) => A.responder(b)).esperar(1.1)
        .clic(() => q('.hp-rapidas button:nth-child(2)'), (b) => A.responder(b)).esperar(1.6)
        .paso('Cada huésped, con su historial: quién repite y cómo os valora').ir('huespedes').esperar(1.8);
    },
  };

  /* =================================================================
     2 · CLÍNICA — Clínica Arce (dental): navegación arriba
  ================================================================= */
  const HORAS = ['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  const CITAS = [
    ['pedro', 2, 1, 1, 'Pedro Sanz', 'Revisión', ''], ['laura', 2, 3, 2, 'Laura Cano', 'Limpieza', ''], ['andres', 2, 5, 2, 'Andrés Toro', 'Empaste', ''],
    ['marina', 3, 1, 3, 'Marina Flores', 'Implante', 'impl'], ['rosa', 3, 8, 1, 'Rosa Gámez', 'Revisión', ''],
    ['mar', 4, 1, 2, 'Mar Alcalá', 'Ortodoncia', 'orto'], ['javier', 4, 5, 1, 'Javier Moya', 'Revisión', ''],
  ];
  const PACIENTES = [
    ['pedro', 'PS', 'Pedro Sanz', 54, 'Revisión · hoy 9:00', 'Al día', { emp: [3, 14, 19, 28] }],
    ['laura', 'LC', 'Laura Cano', 31, 'Limpieza · hoy 10:00', 'Al día', { emp: [12] }],
    ['marina', 'MF', 'Marina Flores', 47, 'Implante · 2.ª fase', 'Tratamiento activo', { emp: [4, 13], imp: [19], falta: [30] }, 19],
    ['andres', 'AT', 'Andrés Toro', 62, 'Empaste · hoy 11:00', 'Pendiente de pago', { emp: [2, 5, 18, 21, 29], falta: [15] }],
    ['mar', 'MA', 'Mar Alcalá', 16, 'Ortodoncia · revisión', 'Tratamiento activo', {}],
    ['rosa', 'RG', 'Rosa Gámez', 39, 'Revisión · hoy 12:30', 'Al día', { emp: [7] }],
  ];
  const ficha = ([, ini, nom, edad, prox, est, d, marca]) => `<div class="cl-ficha__cab"><span class="av">${ini}</span><div><b>${nom}</b><span>${edad} años · ${est}</span></div></div>
    <div class="cl-datos"><div>Próxima cita<b>${prox.split(' · ')[1] || prox}</b></div><div>Tratamiento<b>${prox.split(' · ')[0]}</b></div><div>Visitas<b>${(edad % 9) + 3}</b></div></div>
    <small class="hp-sub" style="margin-bottom:6px">Odontograma</small>
    <div class="cl-dientes">${Array.from({ length: 32 }, (_, i) => `<i class="${(d.emp || []).includes(i) ? 'emp' : ''}${(d.imp || []).includes(i) ? 'imp' : ''}${(d.falta || []).includes(i) ? 'falta' : ''}${marca === i ? ' marca' : ''}"></i>`).join('')}</div>
    <div class="cl-leyenda"><span style="--c:#cfe8e8">Empaste</span><span style="--c:#ffd9b8">Implante</span><span style="--c:transparent">Falta</span></div>
    <small class="hp-sub" style="margin:12px 0 6px">Últimas visitas</small>
    <ul class="cl-hist">${[['12 oct', 'Limpieza', '45 €', 'Pagado'], ['3 jul', 'Revisión', '0 €', 'Incluida'], ['18 mar', prox.split(' · ')[0], '120 €', 'Pagado'], ['9 ene', 'Radiografía', '30 €', 'Pagado']]
      .map(([f, t, p, e]) => `<li><em>${f}</em><b>${t}</b><span>${p}</span><span class="st st--ok">${e}</span></li>`).join('')}</ul>`;
  const clinica = {
    tema: 'clin', para: 'una clínica dental', url: 'gestion.clinicaarce.es', negocio: 'Clínica Arce', sub: 'Dental', logo: '+', ini: 'ER', usuario: 'Dra. Elena R.',
    nav: [['hoy', 'Agenda', 'cal'], ['pacientes', 'Pacientes', 'gente'], ['recordatorios', 'Recordatorios', 'campana']],
    vistas: {
      hoy: `<header class="hp-head"><div><small>Martes, 25 de noviembre · 3 gabinetes</small><h4>Agenda de hoy</h4></div><button type="button" class="hp-btn" data-a="cita">+ Nueva cita</button></header>
        <div class="cl-grid">
          <div class="cl-tl"><div class="cl-tl__cab"><span></span><span>Gabinete 1</span><span>Gabinete 2</span><span>Gabinete 3</span></div>
            <div class="cl-tl__cuerpo" id="cl-cuerpo">${HORAS.map((h, i) => `<span class="cl-hora" style="grid-row:${i + 1}">${h}</span>`).join('')}
              ${CITAS.map(([id, c, r, sp, n, t, k]) => `<div class="cl-cita${k ? ' cl-cita--' + k : ''} g${c - 1}" data-c="${id}" style="grid-column:${c};grid-row:${r} / span ${sp}"><b>${n}</b>${t}</div>`).join('')}
              <i class="cl-ahora" style="--ahora:.3125"></i></div></div>
          <div class="cl-lado">
            <div class="hp-card"><div class="cl-anillo" id="cl-anillo" style="--p:0"><svg viewBox="0 0 64 64"><circle class="fondo" cx="32" cy="32" r="26"/><circle class="valor" cx="32" cy="32" r="26"/></svg><div><b data-n="86" data-suf=" %">86 %</b><small>ocupación del día</small></div></div></div>
            <div class="cl-tv"><small>Pantalla de sala</small><div class="cl-tv__giro" id="cl-tv"><b>A-11</b><span>Gabinete 1 · Laura C.</span></div></div>
            <div class="hp-card"><small>Sala de espera</small><ul class="cl-espera">
              <li data-p="laura"><span class="av">LC</span><b>Laura Cano</b><span class="st st--ac">En consulta</span></li>
              <li data-p="andres"><span class="av">AT</span><b>Andrés Toro</b><span class="st">En sala · 8 min</span></li>
              <li data-p="rosa"><span class="av">RG</span><b>Rosa Gámez</b><span class="st st--gris">Llega 12:30</span></li></ul></div>
          </div>
        </div>`,
      pacientes: `<header class="hp-head"><div><small>1.284 pacientes</small><h4>Pacientes</h4></div></header>
        <div class="cl-pac"><div class="cl-lista-wrap"><label class="cl-buscar">${svg('gente')}<input id="cl-busca" type="text" placeholder="Buscar paciente…" autocomplete="off" aria-label="Buscar paciente en la demo" /></label>
          <div class="cl-lista" id="cl-lista">${PACIENTES.map(([id, ini, n], i) => `<button type="button" data-id="${id}" class="${i === 0 ? 'on' : ''}"><span class="av">${ini}</span><b>${n}</b></button>`).join('')}</div></div>
          <div class="cl-ficha" id="cl-ficha">${ficha(PACIENTES[0])}</div></div>`,
      recordatorios: `<header class="hp-head"><div><small>Citas de mañana, miércoles 26</small><h4>Recordatorios</h4></div><button type="button" class="hp-btn" data-a="enviar">Enviar por WhatsApp</button></header>
        <div class="cl-progreso"><i id="cl-prog"></i></div>
        <ul class="cl-rec">${[['IR', 'Inés Rey', 'Primera visita', '9:00'], ['PS', 'Pedro Sanz', 'Revisión', '9:30'], ['MF', 'Marina Flores', 'Implante', '10:00'], ['JM', 'Javier Moya', 'Limpieza', '11:30'], ['AT', 'Andrés Toro', 'Empaste', '12:00'], ['MA', 'Mar Alcalá', 'Ortodoncia', '12:30']]
          .map(([i, n, t, h]) => `<li><span class="av">${i}</span><div><b>${n}</b> <small style="color:var(--suave)">· ${t}</small></div><em>${h}</em><span class="st st--gris">Sin enviar</span></li>`).join('')}</ul>
        <div class="cl-stats"><div><b data-n="94" data-suf=" %">94 %</b><span>de pacientes confirma</span></div><div><b data-n="31">31</b><span>ausencias evitadas este mes</span></div><div><b data-n="0">0</b><span>llamadas para recordar citas</span></div></div>`,
    },
    entra: {
      hoy: (s) => {
        contar(s); requestAnimationFrame(() => s.querySelector('#cl-anillo').style.setProperty('--p', 86));
        gsap.from(s.querySelectorAll('.cl-cita'), { opacity: 0, scale: 0.9, stagger: 0.05, duration: 0.4 });
      },
      pacientes: (s) => gsap.from(s.querySelectorAll('.cl-lista button'), { x: -10, stagger: 0.04, duration: 0.35, clearProps: 'transform' }),
      recordatorios: (s) => { contar(s); gsap.from(s.querySelectorAll('.cl-rec li'), { opacity: 0, y: 8, stagger: 0.05, duration: 0.35 }); },
    },
    acciones: {
      mover() {
        const c = q('[data-c="rosa"]'); if (!c || c.dataset.movida) return;
        c.dataset.movida = 1; c.classList.add('cl-cita--mueve');
        // En el móvil solo se ven dos gabinetes: la cita se mueve al 2
        const estrecho = main.clientWidth < 440;
        flip(c, () => { c.style.gridColumn = estrecho ? 3 : 4; c.style.gridRow = (estrecho ? '7' : '6') + ' / span 1'; }, 0.8);
        setTimeout(() => c.classList.remove('cl-cita--mueve'), 900);
        const st = q('[data-p="rosa"] .st'); st.textContent = estrecho ? 'Llega 12:00' : 'Llega 11:30';
        avisa('Cita movida a las 11:30 · se avisa a Rosa');
      },
      nueva() {
        if (q('[data-c="ines"]')) return avisa('Ese hueco ya está ocupado');
        const c = document.createElement('div');
        c.className = 'cl-cita cl-cita--orto g1'; c.dataset.c = 'ines'; c.style.cssText = 'grid-column:3;grid-row:5 / span 2';
        c.innerHTML = '<b>Inés Rey</b>Primera visita'; q('#cl-cuerpo').append(c);
        gsap.from(c, { opacity: 0, y: -16, duration: 0.5, ease: 'back.out(2)' }); brilla(c);
        a(q('#cl-anillo b'), 92, 0, ' %'); q('#cl-anillo').style.setProperty('--p', 92);
        avisa('Cita creada · Inés Rey, 11:00');
      },
      sala() {
        const pon = (p, t, k) => { const li = q(`[data-p="${p}"]`); const s = li.querySelector('.st'); s.className = 'st ' + k; s.textContent = t; brilla(li); };
        pon('laura', 'Terminada ✓', 'st--ok'); setTimeout(() => pon('andres', 'En consulta', 'st--ac'), 500);
        const tv = q('#cl-tv');
        gsap.to(tv, { rotateX: 90, duration: 0.25, ease: 'power2.in', onComplete: () => {
          tv.innerHTML = '<b>A-12</b><span>Gabinete 1 · Andrés T.</span>'; tv.classList.add('llama');
          gsap.fromTo(tv, { rotateX: -90 }, { rotateX: 0, duration: 0.4, ease: 'back.out(2)' });
        } });
      },
      filtrar(v) {
        v = v.trim().toLowerCase();
        qa('#cl-lista button').forEach((b) => {
          const n = b.querySelector('b'), t = PACIENTES.find((p) => p[0] === b.dataset.id)[2], k = t.toLowerCase().indexOf(v);
          b.classList.toggle('fuera', !!v && k < 0);
          n.innerHTML = v && k >= 0 ? esc(t.slice(0, k)) + '<mark>' + esc(t.slice(k, k + v.length)) + '</mark>' + esc(t.slice(k + v.length)) : esc(t);
        });
      },
      ficha(id) {
        qa('#cl-lista button').forEach((b) => b.classList.toggle('on', b.dataset.id === id));
        const f = q('#cl-ficha'); f.innerHTML = ficha(PACIENTES.find((p) => p[0] === id));
        gsap.from(f.children, { opacity: 0, y: 8, stagger: 0.05, duration: 0.35 });
      },
      enviar() {
        const b = q('[data-a="enviar"]'); if (b.disabled) return; b.disabled = true;
        gsap.fromTo('#cl-prog', { width: '0%' }, { width: '100%', duration: 1.8, ease: 'power1.inOut' });
        qa('.cl-rec li').forEach((li, i) => setTimeout(() => { const s = li.querySelector('.st'); s.className = 'st st--ac'; s.textContent = 'Enviado ✓✓'; brilla(li); }, 300 * i + 200));
        setTimeout(() => { avisa('6 recordatorios enviados por WhatsApp'); [1, 4].forEach((i, k) => setTimeout(() => { const s = qa('.cl-rec li')[i]?.querySelector('.st'); if (s) { s.className = 'st st--ok'; s.textContent = 'Confirmó ✓'; } }, 700 * (k + 1))); }, 2000);
      },
    },
    activar() {
      const A = this.acciones;
      q('[data-c="rosa"]').addEventListener('click', A.mover);
      q('[data-a="cita"]').addEventListener('click', A.nueva);
      q('#cl-busca').addEventListener('input', (e) => A.filtrar(e.target.value));
      qa('#cl-lista button').forEach((b) => b.addEventListener('click', () => A.ficha(b.dataset.id)));
      q('[data-a="enviar"]').addEventListener('click', A.enviar);
    },
    guion(g) {
      const A = this.acciones;
      g.paso('Arrastra una cita a otro gabinete: el paciente recibe el aviso').clic('[data-c="rosa"]', () => A.mover()).esperar(1.5)
        .paso('Termina una consulta y la pantalla de sala llama al siguiente').hacer(() => A.sala()).esperar(1.6)
        .paso('Una cita nueva en el hueco libre: la ocupación sube').clic('[data-a="cita"]', () => A.nueva()).esperar(1.5)
        .paso('Busca un paciente y abre su ficha con el odontograma').ir('pacientes').clic('#cl-busca').escribir('#cl-busca', 'mar', A.filtrar).esperar(0.6)
        .clic(() => q('#cl-lista button:not(.fuera)'), (b) => A.ficha(b.dataset.id)).esperar(2)
        .paso('Recordatorios de mañana por WhatsApp, de una vez').ir('recordatorios').clic('[data-a="enviar"]', () => A.enviar()).esperar(3.6)
        .ir('hoy').esperar(0.8);
    },
  };

  /* =================================================================
     3 · ACADEMIA — Academia Norte (oposiciones): oscuro y rojo
  ================================================================= */
  const LIGA = [['carlos', 'CG', 'Carlos Gil', 412, 'Bombero', 48, 12], ['nuria', 'NP', 'Nuria Pérez', 398, 'Guardia Civil', 45, 9], ['david', 'DM', 'David Mora', 377, 'Bombero', 41, 4], ['lara', 'LS', 'Lara Soto', 365, 'Guardia Civil', 39, 6], ['mario', 'MV', 'Mario Vílchez', 351, 'Policía', 37, 3], ['alba', 'AL', 'Alba López', 340, 'Bombero', 35, 7]];
  const academia = {
    tema: 'acad', para: 'una academia de oposiciones', url: 'campus.academianorte.es', negocio: 'Academia Norte', sub: 'Oposiciones', logo: 'N', ini: 'JB', usuario: 'José B.',
    nav: [['panel', 'Panel', 'panel'], ['alumnos', 'Alumnos', 'gente'], ['tests', 'Tests', 'test'], ['liga', 'Liga', 'trofeo']],
    vistas: {
      panel: `<header class="hp-head"><div><small>Convocatoria Bombero 2027</small><h4>Hola, José</h4></div><button type="button" class="hp-btn" data-a="test">+ Nuevo test</button></header>
        <div class="ac-kpis">
          <div class="ac-kpi"><small>Alumnos activos</small><b data-n="184">184</b><em>▲ 9 esta semana</em></div>
          <div class="ac-kpi"><small>Tests hechos hoy</small><b data-n="96">96</b><em>▲ 21 %</em></div>
          <div class="ac-kpi"><small>Nota media</small><b data-n="7.4" data-d="1">7,4</b><em>▲ 0,3</em></div>
        </div>
        <div class="ac-fila">
          <div class="ac-simu"><small>Próximo simulacro</small><b>Simulacro general · sábado 9:00</b>
            <div class="ac-cuenta" id="ac-cuenta"><span><strong>2</strong><em>días</em></span><span><strong>14</strong><em>horas</em></span><span><strong>32</strong><em>min</em></span><span><strong>10</strong><em>seg</em></span></div></div>
          <div class="hp-card"><small>Tests por día</small><div class="ac-barras">${[38, 52, 44, 61, 58, 72, 49, 66, 80, 96].map((h) => `<i style="--h:${h}%"></i>`).join('')}</div></div>
        </div>
        <div class="ac-vivo"><span class="ac-vivo__punto"></span><b>En directo</b><span class="ac-vivo__caras">${['CG', 'NP', 'MV', 'LS', 'AL'].map((i) => `<i>${i}</i>`).join('')}</span><em><strong id="ac-conect">23</strong> conectados</em><span class="ac-vivo__feed" id="ac-feed">Nuria acaba de sacar 28/30 en el Tema 9</span></div>`,
      alumnos: `<header class="hp-head"><div><small>184 activos · 6 con nota baja</small><h4>Alumnos</h4></div></header>
        <div class="ac-alumnos">${[['CG', 'Carlos Gil', 'Bombero', 60, 'Tema 12 de 20', 8.6], ['NP', 'Nuria Pérez', 'Guardia Civil', 45, 'Tema 9 de 20', 7.9], ['DM', 'David Mora', 'Bombero', 20, 'Tema 4 de 20', 5.8], ['MV', 'Mario Vílchez', 'Policía', 75, 'Tema 15 de 20', 9.1], ['LS', 'Lara Soto', 'Guardia Civil', 35, 'Tema 7 de 20', 7.2], ['AL', 'Alba López', 'Bombero', 55, 'Tema 11 de 20', 6.9]]
          .map(([i, n, o, p, t, nota]) => `<div class="ac-al"><span class="av">${i}</span><div><b>${n}</b><small>${o}</small></div><div><div class="ac-prog"><i style="--p:${p}%"></i></div><small>${t}</small></div><span class="ac-nota${nota >= 8 ? ' alta' : ''}">${num(nota, 1)}</span></div>`).join('')}</div>`,
      tests: `<header class="hp-head"><div><small>Banco de 2.430 preguntas</small><h4>Tests</h4></div></header>
        <div class="ac-tests">
          <div class="ac-nuevo"><small class="hp-sub">Nuevo test</small>
            <label class="ac-campo">Tema<span>Tema 13 · Hidráulica</span></label>
            <label class="ac-campo">Preguntas: <b id="ac-npreg" style="color:var(--tinta)">20</b><div class="ac-rango" id="ac-rango" style="--v:40%"><i></i><b></b></div></label>
            <label class="ac-campo">Tiempo<span>30 minutos · penaliza 1/3</span></label>
            <div class="ac-campo">Dificultad<div class="ac-dif"><span>Fácil</span><span class="on">Media</span><span>Difícil</span></div></div>
            <div class="ac-opc"><span>Mezclar preguntas y respuestas</span><i class="on"></i></div>
            <div class="ac-opc"><span>Mostrar la corrección al terminar</span><i class="on"></i></div>
            <button type="button" class="hp-btn" data-a="publicar">Publicar a todos</button></div>
          <div class="ac-lista-t" id="ac-lista-t">
            <div class="ac-t"><div><b>Tema 12 · Incendios</b><small>30 preguntas · ayer</small><span class="ac-ap"><i style="--p:78%"></i></span><small class="ac-ap__t">78 % aprobados</small></div><em><strong>142</strong>lo han hecho</em></div>
            <div class="ac-t"><div><b>Tema 11 · Rescate</b><small>25 preguntas · lunes</small><span class="ac-ap"><i style="--p:84%"></i></span><small class="ac-ap__t">84 % aprobados</small></div><em><strong>168</strong>lo han hecho</em></div>
            <div class="ac-t"><div><b>Psicotécnico 4</b><small>40 preguntas · domingo</small><span class="ac-ap"><i style="--p:69%"></i></span><small class="ac-ap__t">69 % aprobados</small></div><em><strong>171</strong>lo han hecho</em></div>
            <div class="ac-t"><div><b>Simulacro general 3</b><small>100 preguntas · hace 1 semana</small><span class="ac-ap"><i style="--p:72%"></i></span><small class="ac-ap__t">72 % aprobados</small></div><em><strong>176</strong>lo han hecho</em></div>
          </div>
        </div>`,
      liga: `<header class="hp-head"><div><small>Liga del opositor · jornada 11</small><h4>Liga</h4></div><div class="hp-seg"><span class="on">Semana</span><span>Total</span></div></header>
        <div class="ac-liga" id="ac-liga">${LIGA.map(([id, i, n, p, o, t, r], k) => `<div class="ac-pos" data-id="${id}"><span>${k + 1}</span><span class="av">${i}</span><div class="ac-pos__n"><b>${n}</b><small>${o} · ${t} tests</small></div><div class="ac-pos__barra"><i style="--p:${Math.round(p / 4.6)}%"></i></div><span class="ac-racha">🔥 ${r} días</span><strong data-n="${p}">${p}</strong><span class="sube">▲ 2</span></div>`).join('')}</div>`,
    },
    entra: {
      panel: (s) => { contar(s); gsap.fromTo(s.querySelectorAll('.ac-barras i'), { scaleY: 0 }, { scaleY: 1, stagger: 0.05, duration: 0.5, ease: 'power3.out' }); },
      alumnos: (s) => gsap.fromTo(s.querySelectorAll('.ac-prog i'), { scaleX: 0 }, { scaleX: 1, stagger: 0.08, duration: 0.8, ease: 'power3.out' }),
      tests: (s) => gsap.from(s.querySelectorAll('.ac-t'), { opacity: 0, x: 10, stagger: 0.06, duration: 0.35 }),
      liga: (s) => gsap.from(s.querySelectorAll('.ac-pos'), { opacity: 0, y: 10, stagger: 0.05, duration: 0.35 }),
    },
    acciones: {
      rango(n) {
        const r = q('#ac-rango'), o = { v: +q('#ac-npreg').textContent };
        gsap.to(o, { v: n, duration: 0.8, ease: 'power2.inOut', onUpdate: () => { q('#ac-npreg').textContent = Math.round(o.v); r.style.setProperty('--v', (o.v / 50 * 100) + '%'); } });
      },
      publicar() {
        const b = q('[data-a="publicar"]'); if (b.disabled) return; b.disabled = true;
        const t = document.createElement('div'); t.className = 'ac-t';
        t.innerHTML = `<div><b>Tema 13 · Hidráulica</b><small>${q('#ac-npreg').textContent} preguntas · ahora</small></div><em><strong data-n="0">0</strong>lo han hecho</em>`;
        q('#ac-lista-t').prepend(t); q('#ac-lista-t').lastElementChild.remove(); gsap.from(t, { opacity: 0, y: -12, duration: 0.45 }); brilla(t);
        a(t.querySelector('strong'), 37, 0, '', 4);
        avisa('Test publicado a 184 alumnos');
      },
      subir(id = 'lara', pts = 45) {
        const liga = q('#ac-liga'), fila = liga.querySelector(`[data-id="${id}"]`); if (!fila || fila.classList.contains('subio')) return;
        const st = fila.querySelector('strong'); a(st, +st.dataset.n + pts);
        const filas = [...liga.children];
        setTimeout(() => {
          flip(filas, () => {
            filas.sort((x, y) => +y.querySelector('strong').dataset.n - +x.querySelector('strong').dataset.n).forEach((f, k) => { liga.append(f); f.firstElementChild.textContent = k + 1; });
          }, 0.8);
          fila.classList.add('subio'); avisa('Lara sube al 2.º puesto · +45 puntos');
          setTimeout(() => confeti(fila), 450);
        }, 500);
      },
    },
    activar() {
      const A = this.acciones;
      q('[data-a="test"]').addEventListener('click', () => abrir('tests'));
      q('[data-a="publicar"]').addEventListener('click', A.publicar);
      q('#ac-rango').addEventListener('click', () => A.rango(+q('#ac-npreg').textContent >= 40 ? 10 : +q('#ac-npreg').textContent + 10));
      qa('.ac-pos').forEach((f) => f.addEventListener('click', () => A.subir(f.dataset.id, 60)));
    },
    guion(g) {
      const A = this.acciones;
      g.paso('El campus en directo: quién está conectado y qué está sacando').esperar(2.2)
        .paso('Prepara un test nuevo en segundos').clic('[data-a="test"]', () => abrir('tests')).esperar(0.7)
        .clic('#ac-rango b', () => A.rango(30)).esperar(1)
        .paso('Publícalo y mira cómo lo van haciendo los alumnos').clic('[data-a="publicar"]', () => A.publicar()).esperar(2.4)
        .paso('La liga engancha: los puntos suben y el ranking se mueve').ir('liga').esperar(0.5).hacer(() => A.subir()).esperar(2.6)
        .paso('El progreso de cada alumno, tema a tema').ir('alumnos').esperar(2.2)
        .ir('panel').esperar(0.8);
    },
  };

  /* =================================================================
     4 · RESTAURANTE — La Alacena: barra superior de TPV, tomate y tinta
  ================================================================= */
  // Mesas: [id, número, x %, y %, forma, plazas, estado, dato]
  const MESAS = [
    ['m1', 1, 9, 30, 'red', 2, 'libre'], ['m2', 2, 25, 30, 'red', 2, 'cuenta', '64,80 €'], ['m3', 3, 42, 30, 'cua', 4, 'ocup', 38], ['m4', 4, 59, 30, 'cua', 4, 'ocup', 12],
    ['m5', 5, 12, 72, 'lar', 6, 'resv', '21:30'], ['m6', 6, 36, 72, 'cua', 4, 'libre'], ['m7', 7, 53, 72, 'cua', 4, 'libre'], ['m8', 8, 70, 72, 'red', 2, 'ocup', 55],
    ['t1', 'T1', 88, 30, 'red', 2, 'libre'], ['t2', 'T2', 88, 72, 'red', 2, 'ocup', 21],
  ];
  const mesa = ([id, n, x, y, f, p, e, d]) => `<button type="button" class="re-mesa re-mesa--${f} re-${e}" data-m="${id}" style="--x:${x}%;--y:${y}%"><b>${n}</b><small>${e === 'ocup' ? `<span data-min="${d}">${d}</span> min` : e === 'resv' ? d : e === 'cuenta' ? 'Cuenta' : p + ' pl.'}</small>${'<i></i>'.repeat(p)}</button>`;
  const COMANDA = { m3: [['2', 'Croquetas de jamón', '14,00'], ['1', 'Salmorejo', '7,50'], ['2', 'Rabo de toro', '36,00'], ['1', 'Rioja crianza', '18,00']], m2: [['1', 'Ensalada de perdiz', '12,50'], ['2', 'Presa ibérica', '39,00'], ['1', 'Tarta de queso', '6,50'], ['2', 'Cañas', '6,80']] };
  const ticket = (m, min, items, nuevo) => `<div class="re-tk${nuevo ? ' re-tk--nuevo' : ''}" data-tk="${m}"><header><b>Mesa ${m}</b><span class="re-tk__t" data-min="${min}">${min} min</span></header><ul>${items.map(([c, n, h]) => `<li class="${h ? 'hecho' : ''}"><i></i><span>${c}× ${n}</span></li>`).join('')}</ul><div class="re-tk__barra"><i style="--p:${Math.min(100, min * 4)}%"></i></div></div>`;
  const restaurante = {
    tema: 'rest', para: 'un restaurante', url: 'tpv.laalacena.es', negocio: 'La Alacena', sub: 'Restaurante', logo: 'A', ini: 'PG', usuario: 'Paco G.',
    nav: [['sala', 'Sala', 'panel'], ['cocina', 'Cocina', 'campana', 2], ['reservas', 'Reservas', 'cal'], ['carta', 'Carta', 'etiqueta']],
    vistas: {
      sala: `<header class="hp-head"><div><small>Martes 25 · turno de cena</small><h4>Sala</h4></div><div class="re-pills"><span><i class="ve"></i><b id="re-ocup">5</b>/10 mesas</span><span>Caja <b id="re-caja" data-n="1240" data-suf=" €">1.240 €</b></span></div></header>
        <div class="re-sala-grid">
          <div class="re-plano"><span class="re-barra">Barra</span><span class="re-cocina">Cocina</span><span class="re-terraza">Terraza</span>${MESAS.map(mesa).join('')}
            <div class="re-ley"><span class="l">Libre</span><span class="o">Ocupada</span><span class="r">Reservada</span><span class="c">Pide la cuenta</span></div></div>
          <div class="re-det" id="re-det"></div>
        </div>`,
      cocina: `<header class="hp-head"><div><small>3 comandas en marcha · tiempo medio 14 min</small><h4>Cocina</h4></div><div class="hp-seg"><span class="on">En marcha</span><span>Servidas</span></div></header>
        <div class="re-kds" id="re-kds">
          ${ticket(3, 9, [['2', 'Rabo de toro'], ['1', 'Presa ibérica'], ['1', 'Salmorejo', 1]])}
          ${ticket(8, 16, [['1', 'Huevos rotos', 1], ['1', 'Lagarto ibérico'], ['2', 'Patatas a lo pobre', 1]])}
          ${ticket('T2', 4, [['2', 'Ensalada de perdiz'], ['1', 'Croquetas de jamón']])}
        </div>`,
      reservas: `<header class="hp-head"><div><small>Esta noche · 38 comensales de 60</small><h4>Reservas</h4></div><button type="button" class="hp-btn" data-a="reserva">+ Reserva</button></header>
        <div class="re-res" id="re-res">${[['20:30', 10, [['Familia Ruiz', 4, 'Teléfono'], ['Ana y Luis', 2, 'Web']]], ['21:00', 18, [['Empresa Olivar', 8, 'Correo'], ['Marta G.', 2, 'Google'], ['Jorge P.', 4, 'Web']]], ['21:30', 8, [['Cumpleaños Sara', 6, 'Web'], ['Pablo R.', 2, 'Teléfono']]], ['22:00', 2, [['Inés y Leo', 2, 'Google']]], ['22:30', 0, []]]
          .map(([h, pax, rs]) => `<div class="re-hora" data-h="${h}"><b>${h}</b><div class="re-cap"><i style="--p:${Math.round(pax / 20 * 100)}%"></i><span><strong data-n="${pax}">${pax}</strong>/20</span></div><div class="re-chips">${rs.map(([n, p, o]) => `<span class="re-chip"><b>${n}</b>${p} pers.<em>${o}</em></span>`).join('') || '<span class="re-vacia">Libre · ideal para grupos</span>'}</div></div>`).join('')}</div>`,
      carta: `<header class="hp-head"><div><small>Carta online y QR de las mesas</small><h4>Carta</h4></div><div class="hp-seg"><span class="on">Platos</span><span>Vinos</span><span>Postres</span></div></header>
        <div class="re-carta">${[['rabo', '🍲', 'Rabo de toro', '18,00 €', 14, '#e4572e'], ['croq', '🥘', 'Croquetas de jamón', '7,00 €', 31, '#f2b544'], ['salm', '🍅', 'Salmorejo', '7,50 €', 22, '#e86a4a'], ['presa', '🥩', 'Presa ibérica', '19,50 €', 17, '#b5483b'], ['perdiz', '🥗', 'Ensalada de perdiz', '12,50 €', 9, '#6f9a4e'], ['tarta', '🍰', 'Tarta de queso', '6,50 €', 26, '#e8b86a']]
          .map(([id, e, n, p, v, c]) => `<div class="re-plato" data-pl="${id}"><span class="re-plato__foto" style="--c:${c}">${e}</span><div><b>${n}</b><span>${p} · ${v} hoy</span></div><button type="button" class="ha-sw on" aria-label="Disponible"></button><em class="re-agotado">Agotado</em></div>`).join('')}</div>`,
    },
    entra: {
      sala: (s) => { contar(s); gsap.from(s.querySelectorAll('.re-mesa'), { scale: 0.6, opacity: 0, stagger: 0.04, duration: 0.4, ease: 'back.out(2)', clearProps: 'transform,opacity' }); restaurante.acciones.detalle('m3'); },
      cocina: (s) => gsap.from(s.querySelectorAll('.re-tk'), { y: 16, opacity: 0, stagger: 0.08, duration: 0.4 }),
      reservas: (s) => { gsap.fromTo(s.querySelectorAll('.re-cap i'), { scaleX: 0 }, { scaleX: 1, stagger: 0.06, duration: 0.7, ease: 'power3.out' }); gsap.from(s.querySelectorAll('.re-chip'), { opacity: 0, x: -8, stagger: 0.04, duration: 0.3 }); },
      carta: (s) => gsap.from(s.querySelectorAll('.re-plato'), { opacity: 0, y: 10, stagger: 0.05, duration: 0.35 }),
    },
    acciones: {
      detalle(id) {
        const m = MESAS.find((x) => x[0] === id), el = q(`[data-m="${id}"]`), d = q('#re-det');
        qa('.re-mesa').forEach((x) => x.classList.toggle('sel', x === el));
        const est = el.classList.contains('re-ocup') ? 'ocup' : el.classList.contains('re-cuenta') ? 'cuenta' : el.classList.contains('re-resv') ? 'resv' : 'libre';
        const items = COMANDA[id] || (est === 'ocup' ? [['2', 'Cañas', '6,80'], ['1', 'Tabla de quesos', '14,00']] : []);
        const total = items.reduce((s, [c, , p]) => s + parseFloat(p.replace(',', '.')), 0);
        d.innerHTML = `<header><b>Mesa ${m[1]}</b><span class="re-st re-st--${est}">${{ libre: 'Libre', ocup: 'Ocupada', cuenta: 'Pide la cuenta', resv: 'Reservada' }[est]}</span></header>
          <small>${m[5]} plazas${est === 'ocup' ? ' · ' + (el.querySelector('[data-min]')?.textContent || 0) + ' min' : ''}${est === 'resv' ? ' · ' + m[7] + ' · Cumpleaños Sara' : ''}</small>
          ${items.length ? `<ul class="re-com">${items.map(([c, n, p]) => `<li><span>${c}×</span><b>${n}</b><em>${p} €</em></li>`).join('')}</ul><div class="re-total"><span>Total</span><b>${num(total, 2)} €</b></div>` : `<div class="re-vacio">${est === 'resv' ? 'Se libera a las 21:15 si no llegan' : 'Mesa libre. Pulsa para sentar a un grupo.'}</div>`}
          <div class="re-acc">${est === 'libre' ? '<button type="button" class="hp-btn" data-a="sentar">Sentar 4 personas</button>' : est === 'cuenta' ? '<button type="button" class="hp-btn" data-a="cobrar">Cobrar ' + num(total, 2) + ' €</button>' : est === 'ocup' ? '<button type="button" class="hp-btn re-sec" data-a="comanda">+ Comanda</button><button type="button" class="hp-btn" data-a="cuenta">Cuenta</button>' : '<button type="button" class="hp-btn re-sec">Avisar por WhatsApp</button>'}</div>`;
        gsap.from(d.children, { opacity: 0, y: 6, stagger: 0.04, duration: 0.3 });
        d.querySelector('[data-a="sentar"]')?.addEventListener('click', () => restaurante.acciones.sentar(id));
        d.querySelector('[data-a="cobrar"]')?.addEventListener('click', () => restaurante.acciones.cobrar(id));
        d.querySelector('[data-a="cuenta"]')?.addEventListener('click', () => { el.className = el.className.replace('re-ocup', 're-cuenta'); el.querySelector('small').textContent = 'Cuenta'; restaurante.acciones.detalle(id); });
      },
      sentar(id = 'm7') {
        const el = q(`[data-m="${id}"]`); if (!el.classList.contains('re-libre')) return;
        el.classList.replace('re-libre', 're-ocup'); el.querySelector('small').innerHTML = '<span data-min="0">0</span> min';
        gsap.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .5)', clearProps: 'transform' });
        const o = q('#re-ocup'); o.textContent = +o.textContent + 1;
        this.detalle(id); avisa(`Mesa ${id.slice(1)} · 4 personas sentadas`);
      },
      cobrar(id = 'm2') {
        const el = q(`[data-m="${id}"]`); if (!el.classList.contains('re-cuenta')) return;
        el.classList.replace('re-cuenta', 're-libre'); el.querySelector('small').textContent = '2 pl.';
        confeti(el, ['#e4572e', '#2a9d8f', '#f2b544', '#fff']);
        a(q('#re-caja'), 1309.8, 0, ' €'); const o = q('#re-ocup'); o.textContent = +o.textContent - 1;
        this.detalle(id); avisa('Mesa 2 cobrada · 64,80 € + 5 € de propina');
      },
      comanda() {
        if (q('[data-tk="7"]')) return;
        const k = q('#re-kds'); k.insertAdjacentHTML('beforeend', ticket(7, 0, [['2', 'Croquetas de jamón'], ['2', 'Salmorejo'], ['4', 'Presa ibérica']], true));
        const t = k.lastElementChild; gsap.from(t, { x: 40, opacity: 0, duration: 0.5, ease: 'back.out(1.6)' }); brilla(t);
        avisa('Comanda de la mesa 7 en cocina');
      },
      marcar() {
        const tk = q('[data-tk="3"]'); if (!tk) return Promise.resolve();
        const pend = [...tk.querySelectorAll('li:not(.hecho)')];
        return pend.reduce((p, li) => p.then(() => tras(550).then(() => { li.classList.add('hecho'); gsap.from(li.querySelector('i'), { scale: 0, duration: 0.3, ease: 'back.out(3)' }); })), Promise.resolve())
          .then(() => tras(300)).then(() => {
            tk.classList.add('listo'); tk.querySelector('.re-tk__t').textContent = '¡Listo!';
            avisa('🔔 Mesa 3: ¡a servir!');
            return tras(1200).then(() => new Promise((ok) => gsap.to(tk, { y: -20, opacity: 0, duration: 0.4, onComplete: () => { flip([...q('#re-kds').children].filter((x) => x !== tk), () => tk.remove(), 0.5); ok(); } })));
          });
      },
      reserva() {
        const h = q('.re-hora[data-h="21:30"]'); if (h.querySelector('.nueva')) return;
        const c = document.createElement('span'); c.className = 're-chip nueva'; c.innerHTML = '<b>Laura M.</b>6 pers.<em>Google</em>';
        h.querySelector('.re-chips').prepend(c); gsap.from(c, { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(2.5)' }); brilla(c);
        const st = h.querySelector('[data-n]'); a(st, 14); h.querySelector('.re-cap i').style.setProperty('--p', '70%');
        avisa('Nueva reserva desde Google · 6 personas, 21:30');
      },
      agotar(id = 'rabo') {
        const p = q(`[data-pl="${id}"]`); if (!p || p.classList.contains('agotado')) return;
        p.classList.add('agotado'); p.querySelector('.ha-sw').classList.remove('on');
        gsap.from(p.querySelector('.re-agotado'), { scale: 1.8, opacity: 0, rotation: -12, duration: 0.45, ease: 'back.out(2)' });
        avisa('Quitado de la carta online y del QR de las mesas');
      },
    },
    activar() {
      const A = this.acciones;
      qa('.re-mesa').forEach((m) => m.addEventListener('click', () => A.detalle(m.dataset.m)));
      q('[data-a="reserva"]').addEventListener('click', () => A.reserva());
      qa('.re-plato').forEach((p) => p.addEventListener('click', () => (p.classList.contains('agotado') ? (p.classList.remove('agotado'), p.querySelector('.ha-sw').classList.add('on'), avisa('Vuelve a estar disponible')) : A.agotar(p.dataset.pl))));
      qa('.re-tk').forEach((t) => t.addEventListener('click', () => { const li = t.querySelector('li:not(.hecho)'); if (li) li.classList.add('hecho'); }));
    },
    guion(g) {
      const A = this.acciones;
      g.paso('Llega un grupo: se sienta en una mesa libre con un toque').clic('[data-m="m7"]', () => A.detalle('m7')).esperar(0.5)
        .clic('[data-a="sentar"]', () => A.sentar('m7')).esperar(1.3)
        .paso('La mesa 2 pide la cuenta: se cobra desde el plano').clic('[data-m="m2"]', () => A.detalle('m2')).esperar(0.5)
        .clic('[data-a="cobrar"]', () => A.cobrar('m2')).esperar(1.6)
        .paso('La comanda llega sola a la pantalla de cocina').ir('cocina').hacer(() => A.comanda()).esperar(1.2)
        .paso('Cuando todo está listo, avisa para servir').pausa(() => A.marcar()).esperar(0.8)
        .paso('Entra una reserva desde Google y se coloca en su hora').ir('reservas').esperar(0.4).hacer(() => A.reserva()).esperar(1.8)
        .paso('Se acaba un plato: desaparece de la carta del QR al momento').ir('carta').clic('[data-pl="rabo"] .ha-sw', () => A.agotar('rabo')).esperar(1.8)
        .ir('sala').esperar(0.8);
    },
  };

  const SECTORES = { alojamiento, clinica, academia, restaurante };
  const ORDEN = Object.keys(SECTORES);

  /* ---------- Pintar un negocio entero ---------- */
  const pintar = (clave) => {
    actual = clave; S = SECTORES[clave];
    app.dataset.tema = S.tema;
    document.getElementById('happ-url').textContent = S.url;
    wrap.querySelectorAll('.happ-sectores button').forEach((b) => b.classList.toggle('on', b.dataset.s === clave));
    side.innerHTML = `<div class="happ__logo"><i>${S.logo}</i><b>${S.negocio}<small>${S.sub}</small></b></div>` +
      S.nav.map(([v, t, ic, badge], i) => `<button type="button" class="happ__nav${i ? '' : ' on'}" data-v="${v}">${svg(ic)}<span>${t}</span>${badge ? `<em class="happ__badge">${badge}</em>` : ''}</button>`).join('') +
      `<div class="happ__user"><span>${S.ini}</span><b>${S.usuario}</b></div>`;
    main.innerHTML = S.nav.map(([v], i) => `<section class="happ__view${i ? '' : ' on'}" data-v="${v}">${S.vistas[v]}</section>`).join('');
    side.querySelectorAll('.happ__nav').forEach((b) => b.addEventListener('click', () => { abrir(b.dataset.v); const e = b.querySelector('.happ__badge'); if (e) gsap.to(e, { scale: 0, duration: 0.3 }); }));
    S.activar();
    if (!quieto && pintar.ya) {
      gsap.fromTo(body, { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(140% at 50% 55%)', duration: 0.9, ease: 'power3.inOut', clearProps: 'clipPath' });
      gsap.fromTo(main.children, { scale: 0.96 }, { scale: 1, duration: 0.9, ease: 'power3.out', clearProps: 'transform' });
    }
    pintar.ya = true;
    toast.classList.remove('on');
  };

  /* ---------- Guion: lo que hace el cursor de mentira ---------- */
  const res = (el) => (typeof el === 'function' ? el() : typeof el === 'string' ? q(el) : el);
  const G = (t) => {
    let n = 0;
    const g = {
      paso(txt) { const k = ++n; t.call(() => contar_pasos(txt, k, n)); return g; },
      mostrar() { t.to(cursor, { opacity: 1, duration: 0.3 }); return g; },
      ocultar() { t.to(cursor, { opacity: 0, duration: 0.3 }); return g; },
      a(el, dur = 0.8) { t.to(cursor, { x: () => pos(res(el)).x, y: () => pos(res(el)).y, duration: dur, ease: 'power2.inOut' }); return g; },
      clic(el, fn, dur) { g.a(el, dur); t.call(() => { const e = res(el); if (!e) return; pulsa(e); if (fn) fn(e); }); return g; },
      ir(v) { return g.clic(() => side.querySelector(`.happ__nav[data-v="${v}"]`), (b) => { abrir(v); const e = b.querySelector('.happ__badge'); if (e) gsap.to(e, { scale: 0, duration: 0.3 }); }).esperar(0.45); },
      hacer(fn) { t.call(fn); return g; },
      esperar(s) { t.to({}, { duration: s }); return g; },
      pausa(prom) { t.call(() => { t.pause(); prom().then(() => { if (tl === t) t.resume(); }); }); return g; },
      escribir(el, txt, cada) { [...txt].forEach((_, k) => t.call(() => { const i = res(el); i.value = txt.slice(0, k + 1); if (cada) cada(i.value); }, null, '+=0.22')); return g; },
    };
    return g;
  };
  const construir = (clave) => {
    pintar(clave);
    const t = gsap.timeline({ onComplete: () => { if (auto && visible) tl = construir(ORDEN[(ORDEN.indexOf(actual) + 1) % ORDEN.length]); } });
    const g = G(t);
    g.hacer(() => { abrir(S.nav[0][0]); presenta(); }).esperar(1.3);
    t.set(cursor, { x: () => pos(main).x, y: () => pos(main).y + 40 });
    g.mostrar();
    S.guion(g);
    g.ocultar().esperar(0.4);
    return t;
  };

  /* ---------- Cuándo se mueve solo y cuándo manda quien lo toca ---------- */
  const arrancar = () => { if (auto && visible && !tl) tl = construir(actual); else if (tl && visible) tl.resume(); };
  const parar = () => { tl?.kill(); tl = null; gsap.to(cursor, { opacity: 0, duration: 0.2 }); };
  const tocado = () => {
    if (quieto) return;
    auto = false; parar(); tuTurno();
    clearTimeout(espera);
    espera = setTimeout(() => { auto = true; arrancar(); }, 9000);
  };
  app.addEventListener('pointerdown', tocado);
  wrap.querySelector('.happ-sectores').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    tocado(); pintar(b.dataset.s); abrir(S.nav[0][0]);
  });
  document.getElementById('happ-modo').addEventListener('click', () => {
    const m = wrap.classList.toggle('movil');
    document.querySelector('#happ-modo span').textContent = m ? 'Ver en escritorio' : 'Ver en móvil';
    setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 750);
  });
  // En directo: academia (conectados y resultados) y restaurante (los minutos corren)
  const FEED = ['Carlos acaba de sacar 27/30 en el Tema 12', 'Lara ha terminado el psicotécnico 4', 'Mario repasa el Tema 15 · 92 %', 'Alba ha subido un puesto en la liga', 'David ha hecho su primer simulacro'];
  let nFeed = 0;
  setInterval(() => {
    if (!visible) return;
    const f = document.getElementById('ac-feed');
    if (f) {
      gsap.to(f, { y: -8, opacity: 0, duration: 0.25, onComplete: () => { f.textContent = FEED[nFeed++ % FEED.length]; gsap.fromTo(f, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }); } });
      const c = document.getElementById('ac-conect'); if (c) c.textContent = 21 + Math.floor(Math.random() * 6);
    }
    // Restaurante: los minutos de mesas y comandas van corriendo
    if (actual === 'restaurante') main.querySelectorAll('[data-min]').forEach((m) => {
      const v = +m.dataset.min + 1; m.dataset.min = v; m.textContent = m.closest('.re-tk') ? v + ' min' : v;
      const tk = m.closest('.re-tk'); if (tk && !tk.classList.contains('listo')) { tk.querySelector('.re-tk__barra i').style.setProperty('--p', Math.min(100, v * 4) + '%'); tk.classList.toggle('tarde', v >= 15); }
    });
  }, 2600);
  // Cuenta atrás del simulacro (academia)
  let fin = Date.now() + ((2 * 24 + 14) * 3600 + 32 * 60 + 10) * 1000;
  setInterval(() => {
    const c = document.getElementById('ac-cuenta'); if (!c || !visible) return;
    let s = Math.max(0, Math.round((fin - Date.now()) / 1000));
    const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
    c.querySelectorAll('strong').forEach((el, i) => { el.textContent = String(v[i]).padStart(i ? 2 : 1, '0'); });
  }, 1000);

  pintar('alojamiento');
  abrir(S.nav[0][0]);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) arrancar(); else tl?.pause();
  }, { threshold: 0.2 }).observe(app);
})();
