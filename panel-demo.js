/* =====================================================================
   Panel de la portada: cuatro productos de ejemplo, cada uno con su diseño
   (alojamiento, clínica, academia y tienda online). Un cursor de mentira los
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
    tema: 'aloj', url: 'panel.casaolivo.es', negocio: 'Casa Olivo', sub: 'Casa rural', logo: '✿', ini: 'LM', usuario: 'Lucía M.',
    nav: [['inicio', 'Inicio', 'casa'], ['calendario', 'Calendario', 'cal'], ['huespedes', 'Huéspedes', 'gente'], ['mensajes', 'Mensajes', 'chat', 1]],
    vistas: {
      inicio: `<header class="hp-head"><div><small>Martes, 25 de noviembre</small><h4>Buenos días, Lucía</h4><p>Hoy llegan 2 huéspedes y se va 1.</p></div><button type="button" class="hp-btn" data-a="reserva">+ Nueva reserva</button></header>
        <div class="al-top">
          <div class="al-ocup"><small>Ocupación de noviembre</small><b><span data-n="78" id="al-oc">78</span> %</b><div class="al-ocup__barra"><i id="al-oc-b" style="width:78%"></i></div><em>4 habitaciones · 120 noches</em></div>
          <div class="al-ing"><small>Ingresos del mes</small><b data-n="12480" data-suf=" €">12.480 €</b>
            <svg class="al-spark" viewBox="0 0 120 36" preserveAspectRatio="none"><path class="area" d="M0 30L15 26L30 28L45 20L60 22L75 14L90 16L105 8L120 10L120 36L0 36Z"/><path class="ln" d="M0 30L15 26L30 28L45 20L60 22L75 14L90 16L105 8L120 10"/></svg></div>
        </div>
        <small class="hp-sub">Llegadas de hoy</small>
        <div class="al-llegadas">
          <div class="al-lleg"><span class="al-foto" style="--h:24"></span><div><b>Ana Ruiz</b><span>Olivo · 3 noches</span></div><em>16:00</em></div>
          <div class="al-lleg"><span class="al-foto" style="--h:150"></span><div><b>Familia Sanz</b><span>Encina · 6 noches</span></div><em>18:30</em></div>
        </div>`,
      calendario: `<header class="hp-head"><div><small>24 nov – 7 dic</small><h4>Calendario</h4></div><div class="hp-seg"><span class="on">2 semanas</span><span>Mes</span></div></header>
        <div class="al-gantt">
          <div class="al-g-cab"><span></span><div class="al-g-dias">${DIAS.map((d, i) => `<span class="${i === 1 ? 'hoy' : ''}">${d}</span>`).join('')}</div></div>
          ${HAB.map(([id, nom, tipo, est]) => `<div class="al-g-fila" data-h="${id}"><b>${nom}<small>${tipo}</small></b><div class="al-g-pista">${est.map(([ini, l, n, t]) => `<i class="al-est${t ? ' al-est--' + t : ''}" style="--a:${ini};--l:${l}">${n}</i>`).join('')}${id === 'jazmin' ? '<i class="al-hueco" style="--a:1;--l:3"></i>' : ''}</div></div>`).join('')}
        </div>`,
      huespedes: `<header class="hp-head"><div><small>142 huéspedes · 4,9 ★ de media</small><h4>Huéspedes</h4></div></header>
        <div class="al-huesp">${[['Ana Ruiz', '3 estancias · Valencia', 24, 'Repite'], ['Jordi Pons', '1 estancia · Barcelona', 200, '★ 5'], ['Marta Gil', '5 estancias · Jaén', 320, 'Repite'], ['Familia Sanz', '2 estancias · Madrid', 150, 'Con niños'], ['Luis Torres', '1 estancia · Sevilla', 80, '★ 5'], ['Pedro Molina', '4 estancias · Granada', 260, 'Repite']]
          .map(([n, d, h, e]) => `<div class="al-h"><span class="al-foto" style="--h:${h}"></span><div><b>${n}</b><span>${d}</span></div><em>${e}</em></div>`).join('')}</div>`,
      mensajes: `<header class="hp-head"><div><small>Con Familia Sanz · llegan hoy</small><h4>Mensajes</h4></div></header>
        <div class="hp-chat" id="al-chat"><p class="hm">¡Hola! Llegamos sobre las 18:30.</p><p class="hm hm--yo">¡Perfecto! Os esperamos con la chimenea encendida 🔥</p></div>
        <div class="hp-rapidas"><button type="button" data-r="¡Claro! Que venga Lola 🐾">¡Claro, que venga!</button><button type="button" data-r="mapa">Enviar ubicación</button><button type="button" data-r="La llave está en el cajetín, código 2580.">Cómo entrar</button></div>`,
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
        while (chat.children.length > 5) chat.firstElementChild.remove();
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
      g.clic('[data-a="reserva"]', () => abrir('calendario')).esperar(0.9)
        .clic(() => q('.al-hueco') || q('.al-est--nueva'), () => A.reservar()).esperar(1.6)
        .ir('inicio').esperar(1.4)
        .ir('mensajes').ocultar().pausa(() => A.llega('¿Se admiten perros? Venimos con Lola 🐶')).mostrar()
        .clic(() => q('.hp-rapidas button'), (b) => A.responder(b)).esperar(1.1)
        .clic(() => q('.hp-rapidas button:nth-child(2)'), (b) => A.responder(b)).esperar(1.6)
        .ir('huespedes').esperar(1.6);
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
    <div class="cl-leyenda"><span style="--c:#cfe8e8">Empaste</span><span style="--c:#ffd9b8">Implante</span><span style="--c:transparent">Falta</span></div>`;
  const clinica = {
    tema: 'clin', url: 'gestion.clinicaarce.es', negocio: 'Clínica Arce', sub: 'Dental', logo: '+', ini: 'ER', usuario: 'Dra. Elena R.',
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
          .map(([i, n, t, h]) => `<li><span class="av">${i}</span><div><b>${n}</b> <small style="color:var(--suave)">· ${t}</small></div><em>${h}</em><span class="st st--gris">Sin enviar</span></li>`).join('')}</ul>`,
    },
    entra: {
      hoy: (s) => {
        contar(s); requestAnimationFrame(() => s.querySelector('#cl-anillo').style.setProperty('--p', 86));
        gsap.from(s.querySelectorAll('.cl-cita'), { opacity: 0, scale: 0.9, stagger: 0.05, duration: 0.4 });
      },
      pacientes: (s) => gsap.from(s.querySelectorAll('.cl-lista button'), { x: -10, stagger: 0.04, duration: 0.35, clearProps: 'transform' }),
      recordatorios: (s) => gsap.from(s.querySelectorAll('.cl-rec li'), { opacity: 0, y: 8, stagger: 0.05, duration: 0.35 }),
    },
    acciones: {
      mover() {
        const c = q('[data-c="rosa"]'); if (!c || c.dataset.movida) return;
        c.dataset.movida = 1; c.classList.add('cl-cita--mueve');
        flip(c, () => { c.style.gridColumn = 4; c.style.gridRow = '6 / span 1'; }, 0.8);
        setTimeout(() => c.classList.remove('cl-cita--mueve'), 900);
        const st = q('[data-p="rosa"] .st'); st.textContent = 'Llega 11:30';
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
      g.clic('[data-c="rosa"]', () => A.mover()).esperar(1.5)
        .hacer(() => A.sala()).esperar(1.2)
        .clic('[data-a="cita"]', () => A.nueva()).esperar(1.5)
        .ir('pacientes').clic('#cl-busca').escribir('#cl-busca', 'mar', A.filtrar).esperar(0.6)
        .clic(() => q('#cl-lista button:not(.fuera)'), (b) => A.ficha(b.dataset.id)).esperar(2)
        .ir('recordatorios').clic('[data-a="enviar"]', () => A.enviar()).esperar(3.6)
        .ir('hoy').esperar(0.8);
    },
  };

  /* =================================================================
     3 · ACADEMIA — Academia Norte (oposiciones): oscuro y rojo
  ================================================================= */
  const LIGA = [['carlos', 'CG', 'Carlos Gil', 412], ['nuria', 'NP', 'Nuria Pérez', 398], ['david', 'DM', 'David Mora', 377], ['lara', 'LS', 'Lara Soto', 365], ['mario', 'MV', 'Mario Vílchez', 351], ['alba', 'AL', 'Alba López', 340]];
  const academia = {
    tema: 'acad', url: 'campus.academianorte.es', negocio: 'Academia Norte', sub: 'Oposiciones', logo: 'N', ini: 'JB', usuario: 'José B.',
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
        </div>`,
      alumnos: `<header class="hp-head"><div><small>184 activos · 6 con nota baja</small><h4>Alumnos</h4></div></header>
        <div class="ac-alumnos">${[['CG', 'Carlos Gil', 'Bombero', 60, 'Tema 12 de 20', 8.6], ['NP', 'Nuria Pérez', 'Guardia Civil', 45, 'Tema 9 de 20', 7.9], ['DM', 'David Mora', 'Bombero', 20, 'Tema 4 de 20', 5.8], ['MV', 'Mario Vílchez', 'Policía', 75, 'Tema 15 de 20', 9.1], ['LS', 'Lara Soto', 'Guardia Civil', 35, 'Tema 7 de 20', 7.2], ['AL', 'Alba López', 'Bombero', 55, 'Tema 11 de 20', 6.9]]
          .map(([i, n, o, p, t, nota]) => `<div class="ac-al"><span class="av">${i}</span><div><b>${n}</b><small>${o}</small></div><div><div class="ac-prog"><i style="--p:${p}%"></i></div><small>${t}</small></div><span class="ac-nota${nota >= 8 ? ' alta' : ''}">${num(nota, 1)}</span></div>`).join('')}</div>`,
      tests: `<header class="hp-head"><div><small>Banco de 2.430 preguntas</small><h4>Tests</h4></div></header>
        <div class="ac-tests">
          <div class="ac-nuevo"><small class="hp-sub">Nuevo test</small>
            <label class="ac-campo">Tema<span>Tema 13 · Hidráulica</span></label>
            <label class="ac-campo">Preguntas: <b id="ac-npreg" style="color:var(--tinta)">20</b><div class="ac-rango" id="ac-rango" style="--v:40%"><i></i><b></b></div></label>
            <label class="ac-campo">Tiempo<span>30 minutos · penaliza 1/3</span></label>
            <button type="button" class="hp-btn" data-a="publicar">Publicar a todos</button></div>
          <div class="ac-lista-t" id="ac-lista-t">
            <div class="ac-t"><div><b>Tema 12 · Incendios</b><small>30 preguntas · ayer</small></div><em><strong>142</strong>lo han hecho</em></div>
            <div class="ac-t"><div><b>Tema 11 · Rescate</b><small>25 preguntas · lunes</small></div><em><strong>168</strong>lo han hecho</em></div>
            <div class="ac-t"><div><b>Psicotécnico 4</b><small>40 preguntas · domingo</small></div><em><strong>171</strong>lo han hecho</em></div>
          </div>
        </div>`,
      liga: `<header class="hp-head"><div><small>Liga del opositor · jornada 11</small><h4>Liga</h4></div><div class="hp-seg"><span class="on">Semana</span><span>Total</span></div></header>
        <div class="ac-liga" id="ac-liga">${LIGA.map(([id, i, n, p], k) => `<div class="ac-pos" data-id="${id}"><span>${k + 1}</span><span class="av">${i}</span><b>${n}</b><strong data-n="${p}">${p}</strong><span class="sube">▲ 2</span></div>`).join('')}</div>`,
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
        q('#ac-lista-t').prepend(t); gsap.from(t, { opacity: 0, y: -12, duration: 0.45 }); brilla(t);
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
      g.clic('[data-a="test"]', () => abrir('tests')).esperar(0.7)
        .clic('#ac-rango b', () => A.rango(30)).esperar(1)
        .clic('[data-a="publicar"]', () => A.publicar()).esperar(2.4)
        .ir('liga').esperar(0.5).hacer(() => A.subir()).esperar(2.4)
        .ir('alumnos').esperar(2.2)
        .ir('panel').esperar(0.8);
    },
  };

  /* =================================================================
     4 · TIENDA ONLINE — Aceites Sur: carril de iconos, verde y oro
  ================================================================= */
  const VENTAS = [20, 35, 28, 60, 72, 55, 80, 96, 88, 110, 104, 120];
  const curva = (v) => { const max = 140, w = 300, h = 120; return v.map((y, i) => [i * (w / (v.length - 1)), h - (y / max) * h]); };
  const camino = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join('');
  const PED = { nuevos: [['1044', 'Eva M.', '5 l · Picual', '42,50 €'], ['1045', 'Juan L.', '3 botellas', '29,70 €'], ['1046', 'Sonia P.', 'Lote regalo', '39,90 €']], prep: [['1042', 'Ana R.', '2 botellas', '19,80 €'], ['1043', 'Toni B.', 'Lote regalo', '39,90 €']], env: [['1040', 'Rafa C.', 'Arbequina 1 l', '16,50 €', 'MRW · en camino'], ['1041', 'Pilar G.', '6 botellas', '59,40 €', 'SEUR · entregado']] };
  const ped = ([n, c, d, p, e]) => `<div class="sh-ped" data-ped="${n}"><b><span>#${n}</span><span>${p}</span></b><span>${c} · ${d}</span>${e ? `<i>${e}</i>` : ''}</div>`;
  const tienda = {
    tema: 'shop', url: 'admin.aceitessur.es', negocio: 'Aceites Sur', sub: 'Tienda online', logo: 'A', ini: 'MC', usuario: 'Marta C.',
    nav: [['ventas', 'Ventas', 'grafica'], ['pedidos', 'Pedidos', 'caja', 3], ['productos', 'Productos', 'etiqueta']],
    vistas: {
      ventas: `<header class="hp-head"><div><small>Hoy, martes 25</small><h4>Ventas</h4></div><div class="hp-seg"><span class="on">Hoy</span><span>Semana</span><span>Mes</span></div></header>
        <div class="sh-kpis">
          <div class="sh-kpi"><small>Ventas de hoy</small><b data-n="1284" data-suf=" €" id="sh-v">1.284 €</b><em>▲ 24 % que el martes pasado</em></div>
          <div class="sh-kpi"><small>Pedidos</small><b data-n="42" id="sh-p">42</b><em>5 por enviar</em></div>
          <div class="sh-kpi"><small>Ticket medio</small><b data-n="30.57" data-d="2" data-suf=" €">30,57 €</b><em>▲ 2,10 €</em></div>
        </div>
        <div class="sh-ventas">
          <div class="hp-card sh-graf"><small>Ventas por hora</small><span class="sh-mas" id="sh-mas">+31,90 €</span>
            <svg viewBox="0 0 300 120" preserveAspectRatio="none"><defs><linearGradient id="sh-deg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c9a227" stop-opacity=".35"/><stop offset="1" stop-color="#c9a227" stop-opacity="0"/></linearGradient></defs>
              <g class="rejilla"><line x1="0" x2="300" y1="30" y2="30"/><line x1="0" x2="300" y1="60" y2="60"/><line x1="0" x2="300" y1="90" y2="90"/></g>
              <path class="area" id="sh-area"/><path class="linea" id="sh-linea"/><circle class="punto" id="sh-punto" r="4"/></svg></div>
          <div class="hp-card"><small>Más vendidos</small><ul class="sh-top">
            <li><span class="sh-bot" style="--c:#b58a1e"></span><b>Picual 500 ml</b><em>38 uds</em></li>
            <li><span class="sh-bot" style="--c:#7d8f3a"></span><b>Arbequina 1 l</b><em>21 uds</em></li>
            <li><span class="sh-bot" style="--c:#8a3b2a"></span><b>Lote regalo</b><em>12 uds</em></li></ul></div>
        </div>`,
      pedidos: `<header class="hp-head"><div><small>Pulsa un pedido para avanzarlo</small><h4>Pedidos</h4></div></header>
        <div class="sh-kanban">${[['nuevos', 'Nuevos'], ['prep', 'Preparando'], ['env', 'Enviados']].map(([k, t]) => `<div class="sh-col" data-col="${k}"><header>${t}<span>${PED[k].length}</span></header>${PED[k].map(ped).join('')}</div>`).join('')}</div>`,
      productos: `<header class="hp-head"><div><small>4 productos · 1 con poco stock</small><h4>Productos</h4></div><button type="button" class="hp-btn">+ Producto</button></header>
        <div class="sh-prods">${[['picual', 'Picual 500 ml', '9,90 €', 48, 64, '#b58a1e', 'bot'], ['arbequina', 'Arbequina 1 l', '16,50 €', 30, 40, '#7d8f3a', 'bot'], ['lote', 'Lote regalo', '39,90 €', 9, 22, '#8a3b2a', 'lata'], ['aceitunas', 'Aceitunas aliñadas', '4,50 €', 120, 80, '#6f8a2e', 'lata']]
          .map(([id, n, p, u, pc, c, f]) => `<div class="sh-prod" data-prod="${id}"><div class="sh-prod__foto">${f === 'bot' ? `<span class="sh-bot" style="--c:${c}"></span>` : `<span class="sh-lata" style="--c:${c}"></span>`}</div><b>${n}</b><span class="sh-precio">${p}</span><div class="sh-stock${pc < 25 ? ' poco' : ''}"><i style="--p:${pc}%"></i></div><small>Quedan <span data-n="${u}">${u}</span></small></div>`).join('')}</div>`,
    },
    entra: {
      ventas: (s) => {
        VENTAS[VENTAS.length - 1] = 120;
        contar(s);
        const pts = curva(VENTAS), d = camino(pts);
        const L = s.querySelector('#sh-linea'), A = s.querySelector('#sh-area'), P = s.querySelector('#sh-punto');
        L.setAttribute('d', d); A.setAttribute('d', d + 'L300 120L0 120Z');
        P.setAttribute('cx', pts.at(-1)[0]); P.setAttribute('cy', pts.at(-1)[1]);
        gsap.fromTo(L, { strokeDasharray: 600, strokeDashoffset: 600 }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.out' });
        gsap.fromTo(A, { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.5 });
        gsap.fromTo(P, { scale: 0, transformOrigin: 'center' }, { scale: 1, duration: 0.4, delay: 1.3, ease: 'back.out(3)' });
      },
      pedidos: (s) => gsap.from(s.querySelectorAll('.sh-ped'), { opacity: 0, y: 10, stagger: 0.04, duration: 0.35 }),
      productos: (s) => gsap.from(s.querySelectorAll('.sh-prod'), { opacity: 0, y: 12, stagger: 0.07, duration: 0.4 }),
    },
    acciones: {
      venta() {
        VENTAS[VENTAS.length - 1] = 134;
        const pts = curva(VENTAS), d = camino(pts);
        q('#sh-linea').setAttribute('d', d); q('#sh-area').setAttribute('d', d + 'L300 120L0 120Z');
        gsap.to(q('#sh-punto'), { attr: { cy: pts.at(-1)[1] }, duration: 0.6, ease: 'back.out(2)' });
        gsap.fromTo('#sh-mas', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, yoyo: true, repeat: 1, repeatDelay: 1.2 });
        a(q('#sh-v'), 1315.9, 2, ' €'); a(q('#sh-p'), 43);
        avisa('Nueva venta · 31,90 €');
      },
      cuenta() { qa('.sh-col').forEach((c) => { c.querySelector('header span').textContent = c.querySelectorAll('.sh-ped').length; }); },
      nuevo() {
        if (q('[data-ped="1047"]')) return;
        const col = q('[data-col="nuevos"]'), tmp = document.createElement('div');
        tmp.innerHTML = ped(['1047', 'Lucía V.', '2 botellas', '31,90 €']); const p = tmp.firstChild;
        col.querySelector('header').after(p); gsap.from(p, { opacity: 0, y: -18, duration: 0.5, ease: 'back.out(2)' }); brilla(p);
        p.addEventListener('click', () => tienda.acciones.avanzar(p));
        this.cuenta(); avisa('Pedido #1047 · 31,90 €');
      },
      avanzar(p, destino) {
        const de = p.closest('.sh-col').dataset.col;
        destino ||= de === 'nuevos' ? 'prep' : de === 'prep' ? 'env' : null;
        if (!destino) return;
        p.classList.add('vuela');
        flip(p, () => {
          const col = q(`[data-col="${destino}"]`); col.querySelector('header').after(p);
          if (destino === 'env') { p.querySelector('i')?.remove(); p.insertAdjacentHTML('beforeend', '<i>MRW · etiqueta creada</i>'); }
        }, 0.7);
        setTimeout(() => p.classList.remove('vuela'), 750);
        this.cuenta();
        avisa(destino === 'env' ? `#${p.dataset.ped} enviado · etiqueta MRW creada` : `#${p.dataset.ped} en preparación`);
        if (destino === 'prep') this.stock(2);
      },
      stock(menos = 42) {
        const pr = q('[data-prod="picual"]'), n = pr.querySelector('[data-n]'), quedan = Math.max(3, +n.dataset.n - menos);
        a(n, quedan, 0, '', 1.2); pr.querySelector('.sh-stock i').style.setProperty('--p', (quedan / 75 * 100) + '%');
        if (quedan < 10) {
          pr.querySelector('.sh-stock').classList.add('poco');
          if (!pr.querySelector('.sh-prod__foto .st')) { pr.querySelector('.sh-prod__foto').insertAdjacentHTML('beforeend', '<span class="st">Quedan pocas</span>'); brilla(pr); }
          setTimeout(() => avisa('Aviso: reponer Picual 500 ml'), 900);
        }
      },
    },
    activar() {
      const A = this.acciones;
      qa('.sh-ped').forEach((p) => p.addEventListener('click', () => A.avanzar(p)));
      qa('.sh-prod').forEach((p) => p.addEventListener('click', () => { if (p.dataset.prod === 'picual') A.stock(); else avisa('Abriría la ficha del producto'); }));
      q('.sh-graf').addEventListener('click', () => A.venta());
    },
    guion(g) {
      const A = this.acciones;
      g.esperar(0.4).hacer(() => A.venta()).esperar(1.8)
        .ir('pedidos').hacer(() => A.nuevo()).esperar(1.2)
        .clic(() => q('[data-ped="1044"]'), (p) => A.avanzar(p, 'prep')).esperar(1.1)
        .clic(() => q('[data-ped="1042"]'), (p) => A.avanzar(p, 'env')).esperar(1.6)
        .ir('productos').esperar(0.4).hacer(() => A.stock()).esperar(2.4)
        .ir('ventas').esperar(0.8);
    },
  };

  const SECTORES = { alojamiento, clinica, academia, tienda };
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
    app.classList.remove('cambia'); void app.offsetWidth; app.classList.add('cambia');
    toast.classList.remove('on');
  };

  /* ---------- Guion: lo que hace el cursor de mentira ---------- */
  const res = (el) => (typeof el === 'function' ? el() : typeof el === 'string' ? q(el) : el);
  const G = (t) => {
    const g = {
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
    g.hacer(() => abrir(S.nav[0][0])).esperar(1.3);
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
    auto = false; parar();
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
