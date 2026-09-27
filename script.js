/* =========================================================
   metrohan.github.io — vanilla JS only.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSpine();
  initReveal();
  initBackToTop();
  initContactForm();
  loadGitHubData();
});

/* ---------- Nav: mobile toggle + active-section highlight ---------- */

function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  if (!sections.length || !navLinks.length) return;

  const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  sections.forEach((s) => observer.observe(s));
}

/* ---------- Spine fill: the one signature scroll-linked device ---------- */

function initSpine() {
  const zone = document.querySelector('.spine-zone');
  const fill = document.querySelector('.spine-fill');
  if (!zone || !fill) return;

  let ticking = false;
  function update() {
    const rect = zone.getBoundingClientRect();
    const viewportMid = window.innerHeight * 0.5;
    const progress = Math.min(1, Math.max(0, (viewportMid - rect.top) / rect.height));
    fill.style.setProperty('--spine-progress', `${progress * 100}%`);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  });
  update();
}

/* ---------- Scroll reveal: fast, small, once ---------- */

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
  );
  items.forEach((el) => observer.observe(el));
}

/* ---------- Back to top ---------- */

function initBackToTop() {
  const btn = document.querySelector('.to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 480);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ---------- Contact form: lightweight spam heuristics + Formspree + mailto fallback ---------- */

function detectGibberish(text) {
  const errors = [];
  const clean = text.trim().replace(/\s+/g, ' ');

  if (clean.length < 10) errors.push('Mesaj en az 10 karakter olmalı.');

  const words = clean.split(' ').filter(Boolean);
  if (words.length < 3) errors.push('Mesaj en az 3 kelime içermeli.');

  if (/(.)\1{4,}/.test(clean)) errors.push('Çok fazla tekrarlayan karakter var.');

  const counts = {};
  words.forEach((w) => {
    const key = w.toLowerCase().replace(/[^\wğüşıöç]/gi, '');
    if (key.length > 2) counts[key] = (counts[key] || 0) + 1;
  });
  if (Object.values(counts).some((c) => c > 4)) errors.push('Çok fazla tekrarlayan kelime var.');

  if (/[0-9]{6,}/.test(clean)) errors.push('Anlamsız sayı dizisi var gibi görünüyor.');

  return { isValid: errors.length === 0, errors };
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const messageField = document.getElementById('message');
  const formMessage = document.getElementById('formMessage');

  function setFieldState(field, hint, state, text) {
    field.classList.remove('invalid', 'valid');
    hint.className = 'field-hint';
    if (state === 'invalid') {
      field.classList.add('invalid');
      hint.classList.add('error');
      hint.textContent = text;
    } else if (state === 'valid') {
      field.classList.add('valid');
      hint.classList.add('success');
      hint.textContent = text;
    } else {
      hint.textContent = '';
    }
  }

  if (messageField) {
    const wrapper = messageField.closest('.field');
    const hint = wrapper.querySelector('.field-hint');
    let t;
    messageField.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!this.value.trim()) return setFieldState(wrapper, hint, 'idle', '');
        const { isValid, errors } = detectGibberish(this.value);
        setFieldState(wrapper, hint, isValid ? 'valid' : 'invalid', isValid ? 'Mesaj iyi görünüyor.' : errors[0]);
      }, 400);
    });
  }

  function showMessage(text, type) {
    formMessage.innerHTML = text;
    formMessage.className = `form-message show ${type}`;
    setTimeout(() => formMessage.classList.remove('show'), 8000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    const { isValid, errors } = detectGibberish(data.message || '');
    if (!isValid) {
      showMessage(`Lütfen şunları düzelt:<br>${errors.join('<br>')}`, 'error');
      return;
    }

    submitBtn.disabled = true;
    submitText.textContent = 'Gönderiliyor…';

    try {
      const response = await fetch('https://formspree.io/f/mldladjo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Formspree request failed');
      showMessage('Teşekkürler, mesajın ulaştı. En kısa sürede dönüş yapacağım.', 'success');
      form.reset();
    } catch (err) {
      console.error(err);
      const subject = encodeURIComponent(`Portfolio Contact: ${data.subject || ''}`);
      const body = encodeURIComponent(
        `İsim: ${data.firstName || ''} ${data.lastName || ''}\nE-posta: ${data.email || ''}\n\n${data.message || ''}`
      );
      const mailto = `mailto:metehangnen@gmail.com?subject=${subject}&body=${body}`;
      showMessage(`Form gönderilemedi. <a href="${mailto}" style="text-decoration:underline">Doğrudan mail göndermek için tıkla</a>.`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = 'Gönder';
    }
  });
}

/* ---------- GitHub live stats + activity + languages ---------- */

async function loadGitHubData() {
  const username = 'Metrohan';
  const repoEl = document.getElementById('githubRepos');
  const starEl = document.getElementById('githubStars');
  const followerEl = document.getElementById('githubFollowers');
  const commitEl = document.getElementById('githubCommits');
  if (!repoEl) return;

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100`),
    ]);
    if (!userRes.ok || !reposRes.ok) throw new Error('GitHub API unavailable');

    const user = await userRes.json();
    const repos = await reposRes.json();

    repoEl.textContent = user.public_repos;
    followerEl.textContent = user.followers;
    starEl.textContent = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

    const since = new Date();
    since.setDate(since.getDate() - 30);
    try {
      const commitsRes = await fetch(
        `https://api.github.com/search/commits?q=author:${username}+committer-date:>${since.toISOString().slice(0, 10)}`
      );
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        commitEl.textContent = commitsData.total_count;
      } else {
        commitEl.textContent = '—';
      }
    } catch {
      commitEl.textContent = '—';
    }

    loadActivity(username);
    loadLanguages(repos);
  } catch (err) {
    console.error(err);
    repoEl.textContent = '—';
    starEl.textContent = '—';
    followerEl.textContent = '—';
    commitEl.textContent = '—';
  }
}

async function loadActivity(username) {
  const container = document.getElementById('githubActivity');
  if (!container) return;
  try {
    const res = await fetch(`https://api.github.com/users/${username}/events?per_page=6`);
    if (!res.ok) throw new Error('activity unavailable');
    const events = await res.json();
    container.innerHTML = '';

    const verbByType = {
      PushEvent: 'push',
      CreateEvent: 'create',
      ForkEvent: 'fork',
      WatchEvent: 'star',
      PullRequestEvent: 'pr',
      IssuesEvent: 'issue',
    };

    events.slice(0, 6).forEach((event) => {
      const row = document.createElement('div');
      row.className = 'activity-row';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'mono';
      dateSpan.textContent = new Date(event.created_at).toISOString().slice(0, 10);

      const verbSpan = document.createElement('span');
      verbSpan.className = 'verb mono';
      verbSpan.textContent = verbByType[event.type] || 'activity';

      const repoLink = document.createElement('a');
      repoLink.className = 'repo';
      repoLink.href = `https://github.com/${event.repo.name.split('/').map(encodeURIComponent).join('/')}`;
      repoLink.target = '_blank';
      repoLink.rel = 'noopener';
      repoLink.textContent = event.repo.name;

      row.append(dateSpan, verbSpan, repoLink);
      container.appendChild(row);
    });

    if (!events.length) {
      const row = document.createElement('div');
      row.className = 'activity-row';
      row.innerHTML = '<span class="mono">—</span><span>Son 90 günde public aktivite yok.</span>';
      container.appendChild(row);
    }
  } catch (err) {
    const row = document.createElement('div');
    row.className = 'activity-row';
    row.innerHTML = '<span class="mono">—</span><span>Aktivite yüklenemedi.</span>';
    container.appendChild(row);
  }
}

function loadLanguages(repos) {
  const container = document.getElementById('githubLanguages');
  if (!container) return;
  const counts = {};
  repos.forEach((r) => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  container.innerHTML = '';
  top.forEach(([lang, count]) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = `${lang} · ${count}`;
    container.appendChild(chip);
  });
}
