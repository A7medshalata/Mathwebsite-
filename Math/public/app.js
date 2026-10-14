// Shared helpers for every page
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);

const Auth = {
  token: () => localStorage.getItem('mh_token'),
  user: () => { try { return JSON.parse(localStorage.getItem('mh_user')); } catch { return null; } },
  save(token, user) { localStorage.setItem('mh_token', token); localStorage.setItem('mh_user', JSON.stringify(user)); },
  logout() { localStorage.removeItem('mh_token'); localStorage.removeItem('mh_user'); location.href = '/index.html'; },
};

async function api(path, body, method) {
  const opts = { method: method || (body ? 'POST' : 'GET'), headers: {} };
  if (Auth.token()) opts.headers.Authorization = 'Bearer ' + Auth.token();
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch('/api' + path, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  if (res.status === 401 && Auth.token()) { Auth.logout(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = text; t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function showMsg(el, text, type = 'err') {
  el.innerHTML = text ? `<div class="msg ${type}" role="alert">${esc(text)}</div>` : '';
}

// Page guard + header. role: 'student' | 'teacher'
function startPage(role, active) {
  const user = Auth.user();
  if (!Auth.token() || !user) { location.href = '/index.html'; return null; }
  if (role && user.role !== role) { location.href = user.role === 'teacher' ? '/teacher.html' : '/books.html'; return null; }
  const links = user.role === 'teacher'
    ? [['teacher.html', 'Dashboard']]
    : [['books.html', 'Books'], ['tests.html', 'Tests'], ['skills.html', 'Homework skills'], ['mistakes.html', 'My mistakes'], ['weak.html', 'Weak lessons'], ['checkpoint.html', 'Weekly checkpoint']];
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `<div class="topbar-inner">
    <a class="brand" href="/">Math<span>Hub</span></a>
    <nav class="nav" aria-label="Main">${links.map(([h, t]) => `<a href="/${h}" class="${h === active ? 'on' : ''}" ${h === active ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div class="who"><span>${esc(user.fullName || user.username)}</span><button class="btn small alt" id="logout">Log out</button></div>
  </div>`;
  document.body.prepend(bar);
  $('#logout').onclick = Auth.logout;
  return user;
}

// ---------- reusable quiz ----------
// questions: [{id, text, options}], kind: 'test' | 'skill' | 'checkpoint'
function renderQuiz(root, questions, kind, onDone) {
  root.innerHTML = `<form id="quizform">${questions.map((q, i) => `
    <fieldset class="q" style="border:1.5px solid var(--ink)">
      <legend class="sr" style="position:absolute;left:-9999px">Question ${i + 1}</legend>
      <div class="qt"><span class="qn">${i + 1}</span>${esc(q.text)}</div>
      ${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${q.id}" value="${j}"> <span>${esc(o)}</span></label>`).join('')}
    </fieldset>`).join('')}
    <div id="quizmsg"></div>
    <button class="btn" type="submit">Submit answers</button>
  </form>`;
  $('#quizform', root).onsubmit = async (e) => {
    e.preventDefault();
    const answers = questions.map((q) => {
      const c = root.querySelector(`input[name="q${q.id}"]:checked`);
      return { questionId: q.id, selected: c ? Number(c.value) : -1 };
    });
    const blank = answers.filter((a) => a.selected < 0).length;
    if (blank && !confirm(`${blank} question${blank > 1 ? 's are' : ' is'} unanswered and will count as wrong. Submit anyway?`)) return;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const out = await api('/answers', { kind, answers });
      renderResults(root, out);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onDone && onDone(out);
    } catch (err) {
      btn.disabled = false;
      showMsg($('#quizmsg', root), err.message);
    }
  };
}

function renderResults(root, out) {
  const pct = Math.round((100 * out.score) / out.total);
  const verdict = pct >= 80 ? 'Great work!' : pct >= 60 ? 'Good effort. Review the ones you missed.' : 'Keep practising. Check the explanations below.';
  root.innerHTML = `
    <div class="panel" style="margin-bottom:24px">
      <div class="score">${out.score}/${out.total} <span class="hl">${pct}%</span></div>
      <p>${verdict} Wrong answers are saved in <a href="/mistakes.html">My mistakes</a>.</p>
    </div>
    ${out.results.map((r, i) => `
      <div class="q">
        <div class="qt"><span class="qn">${i + 1}</span>${esc(r.text)}</div>
        ${r.options.map((o, j) => `<div class="opt ${j === r.correct ? 'right' : j === r.selected ? 'wrong' : ''}">
          <span>${j === r.correct ? '✓' : j === r.selected ? '✗' : '&nbsp;&nbsp;'}</span> <span>${esc(o)}</span></div>`).join('')}
        ${r.selected < 0 ? '<p class="muted">You skipped this one.</p>' : ''}
        <div class="expl"><b>${esc(r.lesson)}:</b> ${esc(r.explanation)}</div>
      </div>`).join('')}`;
}

const accClass = (a) => (a < 50 ? 'low' : a < 75 ? 'mid' : '');
const barHtml = (a) => `<div class="bar ${accClass(a)}" title="${a}%"><i style="width:${a}%"></i></div>`;
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">`;
document.head.insertAdjacentHTML('beforeend', fontLinks);
