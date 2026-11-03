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
    const grupos = '.svc, .project, .band-dark__item';
    gsap.utils.toArray('.reveal').forEach((el) => {
      if (el.closest('#inicio') || el.matches(grupos)) return;
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

    /* Subrayado dibujado a mano del hero */
    const underline = document.querySelector('.hand-underline path');
    if (underline) {
      const len = underline.getTotalLength();
      gsap.set(underline, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(underline, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', delay: 1.1 });
    }

    /* Hero: parallax + fundido al hacer scroll */
    gsap.to('.hero-wrap', {
      y: 70, opacity: 0.12, ease: 'none',
      scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
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
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: destino.getBoundingClientRect().top + window.scrollY,
      behavior: suave ? 'smooth' : 'auto',
    });
  });
});
