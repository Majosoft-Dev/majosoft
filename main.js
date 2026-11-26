/* ============================================================
   Majosoft — animaciones (GSAP + ScrollTrigger)
============================================================ */
/* Si GSAP no cargó (CDN bloqueado, etc.), mostramos todo y salimos sin romper la página */
if (typeof gsap === 'undefined') {
  document.documentElement.classList.remove('js');
} else {

gsap.registerPlugin(ScrollTrigger);

/* Recalcula posiciones cuando todo ha cargado (evita que el hero se quede
   atascado en transparente al volver arriba si la altura cambió) */
window.addEventListener('load', () => ScrollTrigger.refresh());

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover)').matches;

/* ---------- Scroll suave (Lenis) sincronizado con ScrollTrigger ----------
   En el móvil el dedo manda (Lenis no suaviza el táctil); sin movimiento reducido. */
if (!reduceMotion && typeof Lenis !== 'undefined') {
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;
}

/* ---------- Hero: split en palabras (conservando el span .accent) ---------- */
function splitHero() {
  document.querySelectorAll('.hero-title .line').forEach((line) => {
    const frag = document.createDocumentFragment();
    Array.from(line.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach((piece) => {
          if (piece.trim() === '') { frag.appendChild(document.createTextNode(piece)); return; }
          const span = document.createElement('span');
          span.className = 'word';
          span.textContent = piece;
          frag.appendChild(span);
        });
      } else {
        // elemento (p.ej. .accent): se anima como una sola "palabra"
        if (node.classList) node.classList.add('word');
        frag.appendChild(node);
      }
    });
    line.innerHTML = '';
    line.appendChild(frag);
  });
}

window.addEventListener('DOMContentLoaded', () => {
  if (reduceMotion) {
    gsap.set('.reveal, .reveal-head, .hero-title .line', { opacity: 1, y: 0 });
  } else {
    splitHero();

    /* Hero timeline */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-title .word', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06 });
    gsap.to('#inicio .reveal', { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, delay: 0.5, ease: 'power3.out' });

    /* Cabeceras de sección: clip-reveal */
    gsap.utils.toArray('.reveal-head').forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* Reveal por scroll genérico */
    const grupos = '.svc, .faq__item';
    gsap.utils.toArray('.reveal').forEach((el) => {
      if (el.closest('#inicio') || el.matches(grupos) || el.matches('.project')) return;
      gsap.to(el, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* Tarjetas en rejilla: entran juntas y escalonadas, con un punto de escala */
    grupos.split(', ').forEach((sel) => {
      const items = gsap.utils.toArray(sel);
      if (!items.length) return;
      gsap.set(items, { opacity: 0, y: 26, scale: 0.96 });
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        onEnter: (batch) => gsap.to(batch, {
          opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        }),
      });
    });

    /* Títulos de sección: palabra a palabra, saliendo de una máscara */
    gsap.utils.toArray('.section-title, .band-dark__title').forEach((t) => {
      if (t.querySelector('.tw')) return;
      const palabras = t.textContent.trim().split(/\s+/);
      t.innerHTML = palabras.map((w) => `<span class="tw"><span>${w}</span></span>`).join(' ');
      gsap.from(t.querySelectorAll('.tw > span'), {
        yPercent: 105, duration: 0.85, ease: 'power3.out', stagger: 0.07,
        scrollTrigger: { trigger: t, start: 'top 88%' },
      });
    });

    /* Iconos de servicios: el trazo se dibuja al aparecer */
    gsap.utils.toArray('.svc').forEach((svc) => {
      const trazos = svc.querySelectorAll('.svc__icon path, .svc__icon polyline, .svc__icon rect, .svc__icon line, .svc__icon circle');
      trazos.forEach((el) => {
        const len = el.getTotalLength ? el.getTotalLength() : 0;
        if (len) gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(trazos, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.08,
        scrollTrigger: { trigger: svc, start: 'top 85%' } });
    });

    /* Etiquetas de servicio: entran una tras otra */
    gsap.utils.toArray('.svc__tags').forEach((tags) => {
      gsap.from(tags.children, { opacity: 0, y: 8, duration: 0.5, ease: 'power2.out', stagger: 0.06,
        scrollTrigger: { trigger: tags, start: 'top 92%' } });
    });

    /* Distintivo de Patán: aparece con un pequeño rebote */
    gsap.from('.patan-badge', { scale: 0, rotate: -20, duration: 0.9, ease: 'back.out(2.2)',
      scrollTrigger: { trigger: '.patan-stage', start: 'top 75%' } });

    /* Trabajos: cada tarjeta se "levanta" ligada al scroll (se nota al bajar y al subir) */
    gsap.utils.toArray('.project').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 140, scale: 0.86, rotateX: 14, rotate: i % 2 ? 2 : -2, transformPerspective: 1000, transformOrigin: '50% 100%' },
        { opacity: 1, y: 0, scale: 1, rotateX: 0, rotate: 0, ease: 'power2.out',
          scrollTrigger: { trigger: card, start: 'top 98%', end: 'top 62%', scrub: 0.6 } });
    });

    /* Banda de tecnologías: acelera y cambia de sentido según el scroll */
    const pista = document.querySelector('.marquee__track');
    if (pista) {
      pista.style.animation = 'none';
      let x = 0, dir = -1, extra = 0;
      const base = 0.6;
      ScrollTrigger.create({
        trigger: 'body', start: 'top top', end: 'bottom bottom',
        onUpdate: (self) => {
          dir = self.direction === 1 ? -1 : 1;
          extra = Math.min(Math.abs(self.getVelocity()) / 120, 14);
        },
      });
      gsap.ticker.add(() => {
        const mitad = pista.scrollWidth / 2;
        x += dir * (base + extra);
        extra *= 0.92;
        if (x <= -mitad) x += mitad;
        if (x > 0) x -= mitad;
        gsap.set(pista, { x, skewX: -dir * Math.min(extra * 0.8, 10) });
      });
    }

    /* Subrayado dibujado a mano del hero */
    const underline = document.querySelector('.hand-underline path');
    if (underline) {
      const len = underline.getTotalLength();
      gsap.set(underline, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(underline, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', delay: 1.1 });
    }

    /* Hero: parallax + fundido al hacer scroll */
    gsap.to('.hero-wrap', {
      y: 50, opacity: 0.45, ease: 'none',
      scrollTrigger: { trigger: '#inicio', start: 'top top', end: '+=700', scrub: 0.6, invalidateOnRefresh: true },
    });

    /* Panel de la portada: entra desde abajo y se endereza al bajar */
    gsap.from('.happ-wrap', { y: 70, opacity: 0, duration: 1.1, delay: 0.7, ease: 'power3.out' });
    gsap.fromTo('.happ', { rotateX: 14, scale: 0.94 }, {
      rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.happ-wrap', start: 'top 92%', end: 'top 22%', scrub: 0.6 },
    });

    /* Trabajos: cada proyecto se queda fijo y el siguiente lo tapa (escritorio);
       la captura de la web baja sola dentro del navegador mientras lo miras */
    const tarjetas = gsap.utils.toArray('.stack-card');
    const mmT = gsap.matchMedia();
    mmT.add('(min-width: 861px)', () => {
      const arriba = (i) => 100 + i * 16;
      const ultima = tarjetas[tarjetas.length - 1];
      tarjetas.forEach((card, i) => {
        if (card === ultima) return;
        ScrollTrigger.create({
          trigger: card, start: () => `top ${arriba(i)}px`,
          endTrigger: ultima, end: () => `top ${arriba(tarjetas.length - 1)}px`,
          pin: true, pinSpacing: false, invalidateOnRefresh: true,
        });
        gsap.to(card, {
          scale: 0.92, '--sombra': 0.45, ease: 'none',
          scrollTrigger: { trigger: tarjetas[i + 1], start: 'top bottom', end: () => `top ${arriba(i + 1)}px`, scrub: true, invalidateOnRefresh: true },
        });
      });
    });
    tarjetas.forEach((card, i) => {
      const sig = tarjetas[i + 1] || card;
      const fin = tarjetas[i + 1] ? 'top 35%' : 'bottom top';
      card.querySelectorAll('.scrolly').forEach((img) => {
        const vista = img.parentElement;
        /* Solo baja unas dos pantallas de la web (no la página entera): así va
           a un ritmo parecido al del scroll y da tiempo a verla */
        gsap.to(img, {
          y: () => -Math.min(Math.max(0, img.offsetHeight - vista.clientHeight), vista.clientHeight * 1.8), ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 75%', endTrigger: sig, end: fin, scrub: 1.2, invalidateOnRefresh: true },
        });
      });
      card.querySelectorAll('.duo__2').forEach((img) => {
        gsap.to(img, { clipPath: 'inset(0 0 0 0%)', ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 45%', endTrigger: sig, end: tarjetas[i + 1] ? 'top 70%' : 'bottom 40%', scrub: 0.5 } });
      });
      card.querySelectorAll('.zoomy').forEach((img) => {
        gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', endTrigger: sig, end: fin, scrub: 0.5 } });
      });
    });

    /* Glows con parallax */
    gsap.to('.glow-1', { yPercent: 35, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1 } });
    gsap.to('.glow-2', { yPercent: -30, scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 1.3 } });

    /* Glows: deriva lenta también en reposo, sin depender del scroll */
    gsap.to('.glow-1', { x: 36, y: 24, duration: 9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to('.glow-2', { x: -30, y: -26, duration: 11, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* Patán flota suavemente */
    gsap.to('.patan-frame', { y: -10, rotate: 1.2, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* Proceso: en escritorio se recorre en horizontal; en móvil sigue el deck vertical */
    const activo = { backgroundColor: '#d6e022', borderColor: '#d6e022', duration: 0.4 };
    const inactivo = { backgroundColor: '#f5f4ec', borderColor: '#15161a', duration: 0.4 };
    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const seccion = document.querySelector('#proceso');
      const track = document.querySelector('.process__steps');
      if (!seccion || !track) return;

      seccion.classList.add('is-horizontal');

      const marco = track.parentElement;
      const recorrido = () => {
        const cs = getComputedStyle(marco);
        const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        return Math.max(0, track.scrollWidth + padding - marco.clientWidth);
      };

      /* Se enciende el paso en el que estás, repartido por el recorrido */
      const pasos = gsap.utils.toArray('#proceso .step');
      let activa = -1;
      const marcar = (i) => {
        if (i === activa) return;
        activa = i;
        pasos.forEach((paso, n) => paso.classList.toggle('is-activo', n === i));
      };
      marcar(0);

      gsap.to(track, {
        x: () => -recorrido(),
        ease: 'none',
        scrollTrigger: {
          trigger: seccion, pin: true, scrub: 0.7, anticipatePin: 1,
          start: 'top top', end: () => '+=' + recorrido(), invalidateOnRefresh: true,
          onUpdate: (self) => marcar(Math.min(pasos.length - 1, Math.floor(self.progress * pasos.length))),
        },
      });

      gsap.fromTo('.process__progress', { width: '0%' }, {
        width: '100%', ease: 'none',
        scrollTrigger: {
          trigger: seccion, scrub: 0.7,
          start: 'top top', end: () => '+=' + recorrido(), invalidateOnRefresh: true,
        },
      });

      return () => {
        seccion.classList.remove('is-horizontal');
        pasos.forEach((paso) => paso.classList.remove('is-activo'));
        gsap.set(track, { clearProps: 'all' });
      };
    });

    mm.add('(max-width: 767px)', () => {
      gsap.utils.toArray('.step').forEach((step) => {
        const num = step.querySelector('.step__num');
        ScrollTrigger.create({
          trigger: step, start: 'top 65%', end: 'bottom 35%',
          onEnter: () => gsap.to(num, activo),
          onLeaveBack: () => gsap.to(num, inactivo),
        });
      });
    });
  }

  /* Barra de progreso de scroll */
  const bar = document.querySelector('.scroll-progress');
  if (bar) {
    gsap.to(bar, { width: '100%', ease: 'none',
      scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
  }
});

/* ---------- Spotlight que sigue al ratón ---------- */
document.querySelectorAll('.spotlight').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- Botones magnéticos ---------- */
if (!reduceMotion && canHover) {
  document.querySelectorAll('.btn-primary, .btn-ghost').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * 0.3, y: y * 0.4, duration: 0.4, ease: 'power3.out' });
    });
    btn.addEventListener('pointerleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ---------- Tarjetas con inclinación 3D ---------- */
if (!reduceMotion && canHover) {
  document.querySelectorAll('.project').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, {
        rotateX: py * -5, rotateY: px * 5, y: -5,
        transformPerspective: 900, duration: 0.5, ease: 'power2.out',
      });
    });
    card.addEventListener('pointerleave', () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: 0.7, ease: 'power3.out' });
    });
  });
}

/* ---------- Header sólido al hacer scroll ---------- */
const header = document.querySelector('.site-header');
if (header) {
  ScrollTrigger.create({ start: 'top -40', onUpdate: (self) => header.classList.toggle('scrolled', self.scroll() > 40) });
  /* Sobre una sección oscura la píldora pasa a tinta */
  const oscuras = new Set();
  document.querySelectorAll('[data-oscuro]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 44px', end: 'bottom 44px',
      onToggle: (self) => { self.isActive ? oscuras.add(sec) : oscuras.delete(sec); header.classList.toggle('sobre-oscuro', oscuras.size > 0); },
    });
  });
}

/* ---------- Cursor personalizado ---------- */
if (canHover && !reduceMotion) {
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  document.body.append(dot, ring);

  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { ...mouse };
  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    gsap.set(dot, { x: mouse.x, y: mouse.y });
  });
  gsap.ticker.add(() => {
    ringPos.x += (mouse.x - ringPos.x) * 0.18;
    ringPos.y += (mouse.y - ringPos.y) * 0.18;
    gsap.set(ring, { x: ringPos.x, y: ringPos.y });
  });
  document.querySelectorAll('a, button, .bento, .svc, input, textarea').forEach((el) => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });
}

/* ---------- Formulario de contacto ---------- */
const form = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
function mostrarExito() {
  if (!formSuccess) return;
  form.style.display = 'none';
  formSuccess.classList.add('is-visible');
  formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
// Vista previa del estado de éxito: añade ?exito a la URL
if (form && /[?&]exito\b/.test(window.location.search)) {
  mostrarExito();
}
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    const data = new FormData(form);
    const nombre = (data.get('nombre') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const mensaje = (data.get('mensaje') || '').toString().trim();

    if (!nombre || !email || !mensaje) {
      status.textContent = 'Por favor, completa todos los campos.';
      if (window.gsap) gsap.fromTo(form, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)' });
      return;
    }

    // Respaldo: abre el cliente de correo con el mensaje preparado.
    const enviarPorCorreo = () => {
      const asunto = encodeURIComponent(`Nuevo proyecto · ${nombre}`);
      const cuerpo = encodeURIComponent(`Nombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`);
      window.location.href = `mailto:dev@majosoft.es?subject=${asunto}&body=${cuerpo}`;
      status.textContent = '¡Gracias! Abriendo tu cliente de correo…';
      form.reset();
    };

    // Access Key pública de Web3Forms (no es un secreto: va ligada al email de
    // destino y el spam se filtra con el honeypot). Si se vacía, usa mailto.
    const WEB3FORMS_KEY = '2d43980a-87f0-4dca-9fb1-a1a9aeb0b9e3';
    if (!WEB3FORMS_KEY) { enviarPorCorreo(); return; }

    // Copia en el panel de Majosoft (historial de mensajes); no bloquea el envío
    fetch('/api/contacto', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, mensaje, botcheck: data.get('botcheck') ? 1 : 0 }),
    }).catch(() => {});

    const btn = form.querySelector('button[type="submit"]');
    status.textContent = 'Enviando…';
    if (btn) btn.disabled = true;

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Nuevo proyecto · ${nombre}`,
          from_name: 'Web Majosoft',
          nombre, email, mensaje,
          botcheck: data.get('botcheck') ? true : false,
        }),
      });
      const json = await res.json();
      if (json.success) {
        status.textContent = '';
        form.reset();
        mostrarExito();
      } else {
        status.textContent = 'No se pudo enviar. Abrimos tu correo como alternativa…';
        enviarPorCorreo();
      }
    } catch (err) {
      status.textContent = 'Sin conexión. Abrimos tu correo como alternativa…';
      enviarPorCorreo();
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

} // fin del else (GSAP disponible)

/* ---------- Menú móvil (independiente de GSAP) ---------- */
const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');
if (navToggle && mobileMenu) {
  const closeMenu = () => {
    navToggle.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    navToggle.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth >= 768) closeMenu(); });
}

/* ---------- Anclas con scroll suave (independiente de GSAP) ----------
   Va en JS y no en CSS: scroll-behavior:smooth reanima cada ajuste que hace
   ScrollTrigger y deja el snap del carrusel de proceso sin efecto. */
document.querySelectorAll('a[href^="#"]').forEach((enlace) => {
  enlace.addEventListener('click', (e) => {
    const destino = document.querySelector(enlace.getAttribute('href'));
    if (!destino) return;
    e.preventDefault();
    if (window.__lenis) { window.__lenis.scrollTo(destino, { duration: 1.4 }); return; }
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: destino.getBoundingClientRect().top + window.scrollY,
      behavior: suave ? 'smooth' : 'auto',
    });
  });
});

/* ===== Preguntas frecuentes: abrir y cerrar con animación, una cada vez ===== */
(() => {
  const items = document.querySelectorAll('.faq__item');
  const suave = typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cerrar = (d) => {
    const a = d.querySelector('.faq__a');
    if (!suave) { d.open = false; return; }
    gsap.to(a, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(a, { clearProps: 'height,opacity' }); } });
  };
  items.forEach((d) => {
    d.querySelector('summary').addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) { cerrar(d); return; }
      items.forEach((o) => { if (o !== d && o.open) cerrar(o); });
      d.open = true;
      if (suave) gsap.fromTo(d.querySelector('.faq__a'), { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.5, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() });
    });
  });
})();

/* ===== Estadísticas internas (panel de Majosoft) =====
   Avisa al panel de qué página se ha visto. Sin cookies y sin datos personales.
   Las visitas desde un navegador que haya entrado al panel no cuentan. */
(() => {
  try { if (localStorage.getItem('mj-no-contar')) return; } catch (e) {}
  if (navigator.webdriver) return;
  const datos = JSON.stringify({
    p: location.pathname,
    r: document.referrer,
    w: screen.width,
    u: new URLSearchParams(location.search).get('utm_source') || '',
  });
  if (navigator.sendBeacon) navigator.sendBeacon('/api/visita', datos);
  else fetch('/api/visita', { method: 'POST', body: datos, keepalive: true }).catch(() => {});
})();

/* ===== Servicios: cada demo se mueve solo mientras se ve ===== */
(() => {
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('en-vista', e.isIntersecting)), { threshold: 0.25 });
  document.querySelectorAll('.svc').forEach((s) => io.observe(s));
})();

/* (El panel de la portada que se usa solo está en panel-demo.js) */
