(() => {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const themeBtn = $('#theme-toggle');
    let lightTheme = false;
    try { lightTheme = localStorage.getItem('theme') === 'light'; } catch (err) { /* sem armazenamento */ }

    const setTheme = (light, save = false) => {
        lightTheme = light;
        document.documentElement.dataset.theme = light ? 'light' : 'dark';
        if (themeBtn) {
            themeBtn.innerHTML = '<span class="pill" aria-hidden="true"></span>';
            themeBtn.setAttribute('aria-pressed', String(light));
            themeBtn.setAttribute('aria-label', light ? 'Ativar modo escuro' : 'Ativar modo claro');
            themeBtn.title = light ? 'Ativar modo escuro' : 'Ativar modo claro';
        }
        if (save) {
            try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch (err) { /* sem armazenamento */ }
        }
    };

    setTheme(lightTheme);

    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    /* =====================================================
       PROJETOS
       Para adicionar um projeto, copie um bloco abaixo e edite.
       - live:  endereço do site no ar (ativa a prévia ao vivo)
       - repo:  link do repositório no GitHub
       - image: captura de tela opcional, ex.: 'images/projects/meu-projeto.png'
                (sem imagem, a capa é gerada automaticamente)
       - palette: 0 a 5, escolhe o tom de verde da capa gerada
       ===================================================== */
    const PROJECTS = [
        {
            id: 'banca-da-mequi',
            title: 'Banca da Mequi',
            type: 'Aplicação web',
            desc: 'Aplicação web da Banca da Mequi, publicada na Vercel e aberta para qualquer pessoa acessar.',
            tags: ['Web', 'Vercel'],
            live: 'https://bancadamequi.vercel.app',
            palette: 0
        },
        {
            id: 'vida-mais-saude',
            title: 'Vida + Saúde',
            type: 'Sistema de gestão de clínica',
            desc: 'Sistema para gestão de clínica médica com quatro perfis de acesso (administrador, atendente, médico e paciente), agenda de consultas, exames e prontuário.',
            tags: ['React', 'Vite', 'Tailwind', 'Node.js', 'Express', 'PostgreSQL'],
            repo: 'https://github.com/v21sobral/vidamaissaude',
            palette: 1
        },
        {
            id: 'estoque',
            title: 'Controle de Estoque',
            type: 'Sistema web',
            desc: 'Sistema de controle de estoque com cadastro de produtos e categorias, registro de movimentações e histórico de auditoria.',
            tags: ['Java', 'Spring Boot', 'MySQL', 'JavaScript'],
            palette: 2
        },
        {
            id: 'migrations',
            title: 'Projeto Migrations',
            type: 'Aplicativo',
            desc: 'Aplicativo para migrantes que chegam a cidades sem conhecer ninguém e sem perspectiva profissional.',
            tags: ['React', 'PostgreSQL', 'JavaScript'],
            palette: 3
        },
        {
            id: 'lista-compras',
            title: 'Lista de compras',
            type: 'Aplicativo',
            desc: 'Aplicativo para criar e gerenciar listas de compras.',
            tags: ['JavaScript', 'HTML', 'CSS', 'React'],
            palette: 4
        },
        {
            id: 'calculadora-python',
            title: 'Calculadora em Python',
            type: 'Aplicação',
            desc: 'Calculadora simples para cálculos do dia a dia.',
            tags: ['Python'],
            palette: 5
        }
    ];

    const PALETTES = ['#00ff41', '#00ffa3', '#8dff4f', '#22e6ff', '#c2ff5c', '#4dffc0'];

    // Caracteres da chuva: katakana em meia largura (como no filme), dígitos e símbolos de código
    const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789<>{}[]();=+*/$#'.split('');

    /* =====================================================
       UTILITÁRIOS: gerador pseudoaleatório com semente fixa
       (as capas dos projetos ficam sempre iguais)
       ===================================================== */
    const hashSeed = (str) => {
        let h = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = (h << 13) | (h >>> 19);
        }
        return h >>> 0;
    };

    const makeRng = (seed) => {
        let a = seed;
        return () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    const glyphBlock = (seed, rows = 12, cols = 70) => {
        const rand = makeRng(hashSeed(seed));
        const lines = [];
        for (let r = 0; r < rows; r++) {
            let line = '';
            for (let c = 0; c < cols; c++) {
                // Colunas "vazias" dão o ar de chuva em vez de um bloco uniforme
                line += rand() < 0.55 ? GLYPHS[Math.floor(rand() * GLYPHS.length)] : ' ';
            }
            lines.push(line);
        }
        return lines.join('\n');
    };

    /* =====================================================
       CHUVA DE CÓDIGO (canvas de fundo)
       ===================================================== */
    const rainCanvas = $('#rain');
    let rainEnabled = !lightTheme;

    const rain = (() => {
        const ctx = rainCanvas && rainCanvas.getContext ? rainCanvas.getContext('2d') : null;
        if (!ctx) return null;

        const size = 16;
        let w = 0, h = 0, drops = [], speeds = [];
        let raf = 0, last = 0, running = false, resizeTimer = 0;

        const init = () => {
            w = rainCanvas.width = window.innerWidth;
            h = rainCanvas.height = window.innerHeight;
            const cols = Math.ceil(w / size);
            drops = Array.from({ length: cols }, () => -Math.random() * (h / size));
            speeds = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.65);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, w, h);
        };

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.09)';
            ctx.fillRect(0, 0, w, h);
            ctx.font = `${size}px "JetBrains Mono", monospace`;
            for (let i = 0; i < drops.length; i++) {
                if (Math.random() > speeds[i]) continue;
                const y = drops[i] * size;
                if (y > 0) {
                    const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                    // A "cabeça" da gota é quase branca; o rastro é verde
                    ctx.fillStyle = Math.random() > 0.97 ? '#e0fbff' : '#22e6ff';
                    ctx.fillText(ch, i * size, y);
                }
                if (y > h && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        const loop = (t) => {
            if (!running) return;
            raf = requestAnimationFrame(loop);
            if (t - last < 40) return; // ~25 quadros por segundo
            last = t;
            draw();
        };

        const start = () => {
            if (running) return;
            init();
            if (reduceMotion) {
                // Sem animação: desenha apenas um quadro estático
                for (let i = 0; i < 90; i++) draw();
                return;
            }
            running = true;
            raf = requestAnimationFrame(loop);
        };

        const stop = () => {
            running = false;
            cancelAnimationFrame(raf);
        };

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (!rainEnabled) return;
                const wasRunning = running;
                stop();
                init();
                if (reduceMotion) { for (let i = 0; i < 90; i++) draw(); }
                else if (wasRunning) { running = true; raf = requestAnimationFrame(loop); }
            }, 200);
        });

        return { start, stop };
    })();

    const setRain = (on, save = false) => {
        rainEnabled = on;
        if (rainCanvas) rainCanvas.classList.toggle('off', !on);
        if (rain) { on ? rain.start() : rain.stop(); }
        if (save) {
            try { localStorage.setItem('rain', on ? 'on' : 'off'); } catch (err) { /* sem armazenamento */ }
        }
    };

    setRain(rainEnabled);
    if (themeBtn) themeBtn.addEventListener('click', () => {
        const nextLightTheme = !lightTheme;
        setTheme(nextLightTheme, true);
        setRain(!nextLightTheme);
    });

    /* =====================================================
       HERO: nome "decodificado" + código digitado
       ===================================================== */
    const NBSP = '\u00a0';
    const SCRAMBLE = '01<>{}[]/\\|=+*#$%&@!?';

    const decode = (el, text, delay = 300, duration = 1000) => {
        if (reduceMotion) { el.textContent = text; return; }
        el.textContent = NBSP.repeat(text.length);
        const start = performance.now() + delay;
        const tick = (now) => {
            const p = Math.min(1, Math.max(0, (now - start) / duration));
            let out = '';
            for (let i = 0; i < text.length; i++) {
                const revealed = p * text.length * 1.25 - i >= 1;
                if (revealed) out += text[i];
                else out += p === 0 ? NBSP : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)];
            }
            el.textContent = out;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const heroName = $('#hero-name');
    if (heroName) {
        const parts = $$('span', heroName);
        const label = parts.map((s) => s.textContent).join(' ');
        heroName.setAttribute('aria-label', label); // leitores de tela leem o nome, não os símbolos
        parts.forEach((span, i) => {
            const text = span.textContent;
            span.setAttribute('aria-hidden', 'true');
            decode(span, text, 250 + i * 350);
        });
    }

    const heroCode = $('#hero-code');
    if (heroCode) {
        // [classe, texto] por trecho; cada linha é digitada em sequência
        const LINES = [
            [['tok-kw', 'const'], ['', ' '], ['tok-var', 'developer'], ['tok-pun', ' = {']],
            [['', '  '], ['tok-prop', 'name'], ['tok-pun', ': '], ['tok-str', "'Victor Sobral'"], ['tok-pun', ',']],
            [['', '  '], ['tok-prop', 'skills'], ['tok-pun', ': ['], ['tok-str', "'JavaScript'"], ['tok-pun', ', '], ['tok-str', "'React'"], ['tok-pun', ', '], ['tok-str', "'Python'"], ['tok-pun', '],']],
            [['', '  '], ['tok-prop', 'passion'], ['tok-pun', ': '], ['tok-str', "'Criar código limpo'"], ['tok-pun', ',']],
            [['', '  '], ['tok-prop', 'status'], ['tok-pun', ': '], ['tok-str', "'Disponível para novos projetos'"]],
            [['tok-pun', '};']]
        ];

        let delay = 1300;
        const html = LINES.map((parts) => {
            const n = parts.reduce((sum, [, text]) => sum + text.length, 0);
            const line = `<span class="code-line" style="--n:${n};--d:${delay}ms">` +
                parts.map(([cls, text]) => cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text)).join('') +
                '</span>';
            delay += n * 30 + 120;
            return line;
        }).join('') + `<span class="code-cursor" style="--d:${delay}ms" aria-hidden="true"></span>`;

        heroCode.innerHTML = html;
    }

    /* =====================================================
       PROJETOS: lista + visualizador
       ===================================================== */
    const listEl = $('#project-list');
    const viewer = $('#viewer');
    let current = -1;

    const viewerHTML = (p) => {
        const color = PALETTES[p.palette % PALETTES.length];
        const host = p.live ? new URL(p.live).host : (p.repo ? 'código no GitHub' : 'sem versão online');
        const imageTag = p.image
            ? `<img src="${esc(p.image)}" alt="Captura de tela de ${esc(p.title)}" loading="lazy" ` +
              `onload="this.parentElement.classList.add('has-image')" onerror="this.remove()">`
            : '';
        const liveBtn = p.live
            ? '<button type="button" class="btn btn-primary poster-live" data-action="live">Carregar prévia ao vivo</button>'
            : '';
        const actions = [
            p.live ? `<a class="btn btn-primary" href="${esc(p.live)}" target="_blank" rel="noopener noreferrer">Abrir site <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>` : '',
            p.repo ? `<a class="btn btn-ghost" href="${esc(p.repo)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github" aria-hidden="true"></i> Ver código</a>` : ''
        ].join('');

        return `
            <div class="browser">
                <div class="browser-bar">
                    <div class="browser-dots" aria-hidden="true"><i></i><i></i><i></i></div>
                    <div class="browser-url">${esc(host)}</div>
                </div>
                <div class="browser-body">
                    <div class="poster" style="--p-color:${color}">
                        <pre class="poster-glyphs" aria-hidden="true">${esc(glyphBlock(p.id))}</pre>
                        ${imageTag}
                        <span class="poster-plaque">${esc(p.title)}</span>
                        ${liveBtn}
                    </div>
                </div>
            </div>
            ${p.live ? '<p class="viewer-hint">Alguns sites bloqueiam a prévia. Se ela não carregar, use o botão Abrir site.</p>' : ''}
            <div class="viewer-info">
                <h3>${esc(p.title)}</h3>
                <p class="viewer-desc">${esc(p.desc)}</p>
                <ul class="tags">${p.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join('')}</ul>
                ${actions ? `<div class="viewer-actions">${actions}</div>` : ''}
            </div>`;
    };

    if (listEl && viewer) {
        listEl.innerHTML = PROJECTS.map((p, i) => `
            <li role="presentation">
                <button type="button" class="project-tab" role="tab" id="tab-${esc(p.id)}"
                        aria-selected="false" aria-controls="viewer" tabindex="-1" data-index="${i}">
                    <span class="project-tab-title">${esc(p.title)}</span>
                    <span class="project-tab-type">${esc(p.type)}</span>
                </button>
            </li>`).join('');

        const tabs = $$('.project-tab', listEl);

        const select = (i, focus = false) => {
            if (i === current) return;
            const first = current === -1;
            current = i;

            tabs.forEach((t, idx) => {
                const on = idx === i;
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
            });
            viewer.setAttribute('aria-labelledby', tabs[i].id);

            const paint = () => {
                viewer.innerHTML = viewerHTML(PROJECTS[i]);
                viewer.classList.remove('is-switching');
            };
            if (first || reduceMotion) {
                paint();
            } else {
                viewer.classList.add('is-switching');
                setTimeout(paint, 160);
            }
            if (focus) tabs[i].focus();
        };

        listEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.project-tab');
            if (btn) select(Number(btn.dataset.index));
        });

        listEl.addEventListener('keydown', (e) => {
            const last = tabs.length - 1;
            let next = null;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = current === last ? 0 : current + 1;
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
            if (e.key === 'Home') next = 0;
            if (e.key === 'End') next = last;
            if (next !== null) {
                e.preventDefault();
                select(next, true);
            }
        });

        // Prévia ao vivo: só carrega quando a pessoa pede
        viewer.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="live"]');
            if (!btn) return;
            const project = PROJECTS[current];
            const body = $('.browser-body', viewer);
            const poster = $('.poster', viewer);
            const frame = document.createElement('iframe');
            frame.src = project.live;
            frame.title = `Prévia ao vivo de ${project.title}`;
            frame.loading = 'lazy';
            frame.referrerPolicy = 'no-referrer';
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
            body.appendChild(frame);
            poster.hidden = true;
        });

        select(0);
    }

    /* =====================================================
       NAVEGAÇÃO
       ===================================================== */
    const header = $('#header');
    const navToggle = $('#nav-toggle');
    const navMenu = $('#nav-menu');
    const navLinks = $$('.nav-link');

    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const closeMenu = () => {
        navMenu.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Abrir menu');
    };

    navToggle.addEventListener('click', () => {
        const open = navMenu.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    navLinks.forEach((l) => l.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    // Destaca no menu a seção que está na tela
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((l) => {
                const active = l.getAttribute('href') === `#${entry.target.id}`;
                l.classList.toggle('active', active);
                if (active) l.setAttribute('aria-current', 'true');
                else l.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => sectionObserver.observe(s));

    /* =====================================================
       FORMULÁRIO DE CONTATO
       Site estático não tem servidor para enviar mensagens,
       então o formulário abre o app de e-mail já preenchido.
       ===================================================== */
    const form = $('#contact-form');
    const status = $('#form-status');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = new FormData(form);
            const name = String(data.get('name') || '').trim();
            const email = String(data.get('email') || '').trim();
            const subject = String(data.get('subject') || '').trim();
            const message = String(data.get('message') || '').trim();

            let firstInvalid = null;
            ['name', 'email', 'subject', 'message'].forEach((field) => {
                const input = form.elements[field];
                const value = String(data.get(field) || '').trim();
                const ok = field === 'email' ? /^\S+@\S+\.\S+$/.test(value) : value.length > 0;
                input.classList.toggle('invalid', !ok);
                input.setAttribute('aria-invalid', String(!ok));
                if (!ok && !firstInvalid) firstInvalid = input;
            });

            if (firstInvalid) {
                status.className = 'form-status error';
                status.textContent = 'Preencha todos os campos e use um e-mail válido.';
                firstInvalid.focus();
                return;
            }

            const body = `${message}\n\n---\n${name}\n${email}`;
            const url = `mailto:v21sobral@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            status.className = 'form-status';
            status.textContent = 'Abrindo seu aplicativo de e-mail. Basta enviar a mensagem por lá.';
            window.location.href = url;
        });
    }

    /* =====================================================
       RODAPÉ
       ===================================================== */
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
})();