/**
 * APEX 2026 — Application Logic v2
 * Clubs check in students. Students don't login.
 * Students identified by 4-digit ID or name+school.
 */

let currentPage = 'home';
let currentSession = null;
let selectedRatingId = 0;
let selectedRatingName = 0;
let currentLbTab = 'visits';
let selectedStudentForName = null; // student object selected via name search
let isNewStudent = false;

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initNavbar();
  restoreSession();
  setupEventListeners();
  navigateTo('home');
  startLiveUpdates();
});

// ─── Particles ──────────────────────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('bgParticles');
  const colors = ['#00d4ff', '#7c3aed', '#ec4899', '#10b981', '#f59e0b'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${Math.random()*20+15}s;animation-delay:${Math.random()*15}s;`;
    container.appendChild(p);
  }
}

// ─── Navbar ─────────────────────────────────────────────────────────────
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
  });
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
  document.getElementById('navBrandHome').addEventListener('click', () => navigateTo('home'));
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.page);
      document.getElementById('navLinks').classList.remove('open');
    });
  });
  document.getElementById('btnLogout').addEventListener('click', handleLogout);
}

// ─── Routing ────────────────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  currentPage = page;
  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  const navEl = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  renderPage(page);
}

function renderPage(page) {
  switch (page) {
    case 'home': renderHomePage(); break;
    case 'leaderboard': renderLeaderboard(); break;
    case 'club-dashboard': renderClubDashboard(); break;
    case 'club-login': renderClubLoginPage(); break;
  }
}

// ─── Session ────────────────────────────────────────────────────────────
function restoreSession() {
  const session = DB.getSession();
  if (!session) return;
  currentSession = session;
  updateNavForSession(session);
}
function updateNavForSession(session) {
  const badge = document.getElementById('navUserBadge');
  const logoutBtn = document.getElementById('btnLogout');
  if (session) {
    badge.textContent = session.id;
    badge.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
}
function handleLogout() {
  DB.clearSession();
  currentSession = null;
  updateNavForSession(null);
  showToast('Logged out', 'info', '👋');
  navigateTo('home');
}

// ─── Live Updates ───────────────────────────────────────────────────────
function startLiveUpdates() {
  window.addEventListener('apex-data-update', () => renderPage(currentPage));
  setInterval(() => { window.dispatchEvent(new Event('apex-data-update')); }, 5000);
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────
function renderHomePage() {
  const stats = DB.getGlobalStats();
  animateNumber('totalStudents', stats.totalStudents);
  animateNumber('totalClubs', stats.totalClubs);
  animateNumber('totalVisits', stats.totalVisits);
  document.getElementById('avgRating').textContent = stats.avgRating;
  document.getElementById('clubCountDisplay').textContent = stats.totalClubs;

  const sorted = DB.getAllClubsSorted('visits').slice(0, 6);
  document.getElementById('homeClubsGrid').innerHTML = sorted.map((club, i) => `
    <div class="club-card">
      <div class="club-card-rank ${getRankClass(i)}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</div>
      <div class="club-card-icon">${club.icon}</div>
      <div class="club-card-name">${club.name}</div>
      <div class="club-card-category">${club.category}</div>
      <div class="club-card-stats">
        <div class="club-mini-stat"><span class="club-mini-val">${club.total}</span><span class="club-mini-label">Visitors</span></div>
        <div class="club-mini-stat"><span class="club-mini-val">${club.avgRating}</span><span class="club-mini-label">Rating</span></div>
      </div>
      <div class="club-rating-stars">${starsDisplay(parseFloat(club.avgRating))}</div>
    </div>
  `).join('');
}

function animateNumber(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === target) return;
  const diff = target - current;
  const steps = 20;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.round(current + (diff * step / steps));
    if (step >= steps) clearInterval(timer);
  }, 30);
}

// ─── LEADERBOARD ────────────────────────────────────────────────────────
function renderLeaderboard() {
  const sorted = DB.getAllClubsSorted(currentLbTab === 'rating' ? 'rating' : 'visits');

  // Podium — Top 3
  const top3 = sorted.slice(0, 3);
  renderPodium(top3);

  // Rest — #4 onwards
  const rest = sorted.slice(3);
  const container = document.getElementById('leaderboardContainer');
  if (rest.length === 0 && top3.every(c => c.total === 0)) {
    container.innerHTML = '';
  } else {
    container.innerHTML = rest.map((club, i) => {
      const rank = i + 4;
      return `
        <div class="lb-row">
          <div class="lb-pos">#${rank}</div>
          <div class="lb-icon">${club.icon}</div>
          <div class="lb-info">
            <div class="lb-name">${club.name}</div>
            <div class="lb-category">${club.category} • ${club.stall}</div>
          </div>
          <div class="lb-stats">
            <div class="lb-stat"><div class="lb-stat-val">${club.total}</div><div class="lb-stat-label">Visitors</div></div>
            <div class="lb-stat"><div class="lb-stat-val">${club.avgRating}</div><div class="lb-stat-label">Avg Rating</div></div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderPodium(top3) {
  const medals = ['🥇', '🥈', '🥉'];
  const positions = [1, 0, 2]; // render order: 2nd, 1st, 3rd
  const podiumIds = ['podium1', 'podium2', 'podium3'];

  podiumIds.forEach((id, i) => {
    const el = document.getElementById(id);
    const club = top3[i];
    if (!club) { el.innerHTML = '<div class="podium-empty">—</div>'; return; }
    const sortKey = currentLbTab === 'rating' ? 'avgRating' : 'total';
    const mainVal = currentLbTab === 'rating' ? club.avgRating : club.total;
    const mainLabel = currentLbTab === 'rating' ? 'Avg Rating' : 'Visitors';
    el.innerHTML = `
      <div class="podium-medal">${medals[i]}</div>
      <div class="podium-icon">${club.icon}</div>
      <div class="podium-name">${club.name}</div>
      <div class="podium-category">${club.category}</div>
      <div class="podium-stat" style="font-size:1.3rem;color:var(--accent-cyan);">${mainVal}</div>
      <div class="podium-stat-label">${mainLabel}</div>
      <div class="podium-stars">${starsDisplay(parseFloat(club.avgRating))}</div>
    `;
  });
}

// ─── CLUB LOGIN PAGE ────────────────────────────────────────────────────
function renderClubLoginPage() {
  const table = INITIAL_CLUBS.map(c => `${c.id} / <b>${c.password}</b>`).join('<br/>');
  document.getElementById('demoCredsTable').innerHTML = table;
}

// ─── CLUB DASHBOARD ────────────────────────────────────────────────────
function renderClubDashboard() {
  if (!currentSession || currentSession.type !== 'club') return;
  const club = DB.getClubById(currentSession.id);
  if (!club) return;
  const stats = DB.getClubStats(club.id);
  const allSorted = DB.getAllClubsSorted('visits');
  const rank = allSorted.findIndex(c => c.id === club.id) + 1;

  document.getElementById('clubDashTitle').textContent = `${club.icon} ${club.name}`;
  document.getElementById('clubIdDisplay').textContent = club.id;
  document.getElementById('clubCurrentRank').textContent = `#${rank}`;
  document.getElementById('clubTotalStudents').textContent = stats.total;
  document.getElementById('clubAvgRating').textContent = stats.avgRating;
  document.getElementById('clubTodayStudents').textContent = stats.todayCount;
  document.getElementById('clubTotalComments').textContent = stats.totalComments;

  // Rating distribution
  const maxCount = Math.max(...stats.ratingDist.map(r => r.count), 1);
  document.getElementById('ratingDistribution').innerHTML = stats.ratingDist.map(r => `
    <div class="rating-bar-row">
      <span class="rating-bar-label">${'★'.repeat(r.stars)}</span>
      <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${(r.count/maxCount*100)}%"></div></div>
      <span class="rating-bar-count">${r.count}</span>
    </div>
  `).join('');

  // Visitor feed
  const students = DB.getStudents();
  const recent = [...stats.checkins].reverse().slice(0, 15);
  document.getElementById('visitorFeed').innerHTML = recent.length
    ? recent.map(c => {
        const s = students.find(st => st.id === c.studentId);
        return `<div class="feed-item"><div class="feed-dot"></div><span class="feed-student">${s?s.name:c.studentId}</span><span class="feed-rating">${starsDisplay(c.rating)}</span><span class="feed-time">${formatTimeShort(c.timestamp)}</span></div>`;
      }).join('')
    : '<p style="color:var(--text-muted);text-align:center;padding:1rem;">No visitors yet</p>';

  // Students table
  renderStudentsTable(stats.checkins, students);
}

function renderStudentsTable(checkins, students) {
  const tbody = document.getElementById('studentsTableBody');
  const emptyState = document.getElementById('emptyTableState');
  const query = document.getElementById('studentSearch').value.toLowerCase();
  if (checkins.length === 0) { tbody.innerHTML = ''; emptyState.classList.remove('hidden'); return; }
  emptyState.classList.add('hidden');
  const filtered = [...checkins].reverse().filter(c => {
    const s = students.find(st => st.id === c.studentId);
    const name = s ? s.name.toLowerCase() : '';
    return name.includes(query) || c.studentId.includes(query);
  });
  tbody.innerHTML = filtered.map((c, i) => {
    const s = students.find(st => st.id === c.studentId);
    return `<tr>
      <td>${i+1}</td>
      <td class="td-id">${c.studentId}</td>
      <td class="td-name">${s?s.name:'—'}</td>
      <td>${s?s.school:'—'}</td>
      <td>${s?s.age:'—'}</td>
      <td>${s?s.phone||'—':'—'}</td>
      <td class="td-rating">${starsDisplay(c.rating)} <span style="color:var(--text-muted);font-size:0.78rem;">(${c.rating}/5)</span></td>
      <td class="td-comment">${c.comment||'<span style="color:var(--text-muted)">—</span>'}</td>
      <td class="td-time">${formatTime(c.timestamp)}</td>
    </tr>`;
  }).join('');
}

// ─── EVENT LISTENERS ────────────────────────────────────────────────────
function setupEventListeners() {
  // Hero buttons
  document.getElementById('heroLeaderboardBtn').addEventListener('click', () => navigateTo('leaderboard'));
  document.getElementById('heroClubBtn').addEventListener('click', () => {
    if (currentSession?.type === 'club') navigateTo('club-dashboard');
    else navigateTo('club-login');
  });

  // Leaderboard tabs
  document.getElementById('tabVisits').addEventListener('click', () => { currentLbTab='visits'; document.getElementById('tabVisits').classList.add('active'); document.getElementById('tabRating').classList.remove('active'); renderLeaderboard(); });
  document.getElementById('tabRating').addEventListener('click', () => { currentLbTab='rating'; document.getElementById('tabRating').classList.add('active'); document.getElementById('tabVisits').classList.remove('active'); renderLeaderboard(); });

  // Password toggle
  document.addEventListener('click', e => {
    const btn = e.target.closest('.toggle-pw');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.textContent = input.type === 'password' ? '👁' : '🙈';
  });

  // Club login
  document.getElementById('clubLoginForm').addEventListener('submit', handleClubLogin);

  // Mode toggle (By ID / By Name)
  document.getElementById('modeById').addEventListener('click', () => switchMode('id'));
  document.getElementById('modeByName').addEventListener('click', () => switchMode('name'));

  // ── BY ID: live preview ──
  document.getElementById('studentIdInput').addEventListener('input', e => {
    const val = e.target.value.trim();
    const preview = document.getElementById('studentIdPreview');
    if (val.length === 4) {
      const student = DB.getStudentById(val);
      if (student) {
        preview.className = 'student-preview';
        preview.innerHTML = `✅ <strong>${student.name}</strong> — ${student.school}, Age ${student.age}, Ph: ${student.phone||'N/A'}`;
        preview.classList.remove('hidden');
      } else {
        preview.className = 'student-preview error';
        preview.innerHTML = `❌ No student found with ID <strong>${val}</strong>`;
        preview.classList.remove('hidden');
      }
    } else {
      preview.classList.add('hidden');
    }
  });

  // ── BY ID: submit ──
  document.getElementById('checkinByIdForm').addEventListener('submit', handleCheckinById);

  // ── BY NAME: search ──
  document.getElementById('btnSearchStudent').addEventListener('click', handleSearchStudent);

  // ── BY NAME: submit ──
  document.getElementById('checkinByNameForm').addEventListener('submit', handleCheckinByName);

  // Star ratings
  setupStars('starRatingId', 'ratingLabelId', 'ratingValueId', v => { selectedRatingId = v; });
  setupStars('starRatingName', 'ratingLabelName', 'ratingValueName', v => { selectedRatingName = v; });

  // Student search filter
  document.getElementById('studentSearch').addEventListener('input', () => {
    if (!currentSession || currentSession.type !== 'club') return;
    const stats = DB.getClubStats(currentSession.id);
    renderStudentsTable(stats.checkins, DB.getStudents());
  });
}

function switchMode(mode) {
  const byIdForm = document.getElementById('checkinByIdForm');
  const byNameForm = document.getElementById('checkinByNameForm');
  const modeById = document.getElementById('modeById');
  const modeByName = document.getElementById('modeByName');
  if (mode === 'id') {
    byIdForm.classList.remove('hidden');
    byNameForm.classList.add('hidden');
    modeById.classList.add('active');
    modeByName.classList.remove('active');
  } else {
    byIdForm.classList.add('hidden');
    byNameForm.classList.remove('hidden');
    modeByName.classList.add('active');
    modeById.classList.remove('active');
  }
  // Reset state
  selectedStudentForName = null;
  isNewStudent = false;
  document.getElementById('searchResults').classList.add('hidden');
  document.getElementById('newStudentSection').classList.add('hidden');
}

function setupStars(containerId, labelId, valueId, callback) {
  const stars = document.getElementById(containerId).querySelectorAll('.star');
  let selected = 0;
  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.dataset.val);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= selected));
    });
    star.addEventListener('click', () => {
      selected = parseInt(star.dataset.val);
      document.getElementById(valueId).value = selected;
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= selected));
      const labels = ['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😄', 'Excellent 🤩'];
      document.getElementById(labelId).textContent = labels[selected];
      callback(selected);
    });
  });
}

// ─── HANDLERS ───────────────────────────────────────────────────────────
function handleClubLogin(e) {
  e.preventDefault();
  const errEl = document.getElementById('clubLoginError');
  errEl.classList.add('hidden');
  const clubId = document.getElementById('clubLoginId').value.trim();
  const password = document.getElementById('clubLoginPassword').value;
  const result = DB.authenticateClub(clubId, password);
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }
  currentSession = { type: 'club', id: result.club.id };
  DB.setSession(currentSession);
  updateNavForSession(currentSession);
  showToast(`Welcome, ${result.club.name}!`, 'success', '🏛️');
  navigateTo('club-dashboard');
}

function handleCheckinById(e) {
  e.preventDefault();
  const errEl = document.getElementById('checkinIdError');
  const sucEl = document.getElementById('checkinIdSuccess');
  errEl.classList.add('hidden'); sucEl.classList.add('hidden');

  if (!currentSession || currentSession.type !== 'club') return;
  const studentId = document.getElementById('studentIdInput').value.trim();
  const rating = parseInt(document.getElementById('ratingValueId').value);

  if (!studentId || studentId.length !== 4) { errEl.textContent = 'Enter a valid 4-digit Student ID.'; errEl.classList.remove('hidden'); return; }
  const student = DB.getStudentById(studentId);
  if (!student) { errEl.textContent = `No student found with ID ${studentId}.`; errEl.classList.remove('hidden'); return; }
  if (rating < 1 || rating > 5) { errEl.textContent = 'Please select a rating (1–5 stars).'; errEl.classList.remove('hidden'); return; }

  const comment = document.getElementById('commentId').value.trim();
  const result = DB.addCheckin(studentId, currentSession.id, rating, comment);
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }

  sucEl.textContent = `✅ ${student.name} (ID: ${student.id}) checked in with ${rating}-star rating!`;
  sucEl.classList.remove('hidden');
  showToast(`${student.name} checked in!`, 'success', '✅');

  // Reset
  document.getElementById('studentIdInput').value = '';
  document.getElementById('ratingValueId').value = '0';
  document.getElementById('commentId').value = '';
  document.getElementById('studentIdPreview').classList.add('hidden');
  selectedRatingId = 0;
  document.getElementById('starRatingId').querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  document.getElementById('ratingLabelId').textContent = 'Click to rate';
  renderClubDashboard();
}

function handleSearchStudent() {
  const name = document.getElementById('searchName').value.trim();
  const school = document.getElementById('searchSchool').value.trim();
  const resultsDiv = document.getElementById('searchResults');
  const listDiv = document.getElementById('searchResultsList');
  const newSection = document.getElementById('newStudentSection');
  selectedStudentForName = null;
  isNewStudent = false;

  if (!name || !school) { showToast('Enter both name and school to search.', 'error', '⚠️'); return; }

  const matches = DB.searchStudents(name, school);
  resultsDiv.classList.remove('hidden');

  if (matches.length > 0) {
    newSection.classList.add('hidden');
    listDiv.innerHTML = matches.map(s => `
      <div class="search-result-item" data-student-id="${s.id}">
        <div class="sr-info">
          <span class="sr-name">${s.name}</span>
          <span class="sr-detail">${s.school} • Age ${s.age} • Ph: ${s.phone||'N/A'}</span>
        </div>
        <span class="sr-id">ID: ${s.id}</span>
      </div>
    `).join('');

    // Click to select
    listDiv.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        listDiv.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedStudentForName = DB.getStudentById(item.dataset.studentId);
        isNewStudent = false;
        newSection.classList.add('hidden');
        showToast(`Selected: ${selectedStudentForName.name} (${selectedStudentForName.id})`, 'info', '👤');
      });
    });

    // Also show "Not the right person? Register new" link
    listDiv.innerHTML += `<div class="search-not-found" style="cursor:pointer;color:var(--accent-violet);" id="forceNewStudent">➕ Not the right person? Register as new student</div>`;
    document.getElementById('forceNewStudent').addEventListener('click', () => {
      selectedStudentForName = null;
      isNewStudent = true;
      listDiv.querySelectorAll('.search-result-item').forEach(i => i.classList.remove('selected'));
      newSection.classList.remove('hidden');
      showToast('Fill in age to register new student', 'info', '🆕');
    });
  } else {
    listDiv.innerHTML = `<div class="search-not-found">No student found with name "<strong>${name}</strong>" from "<strong>${school}</strong>".</div>`;
    newSection.classList.remove('hidden');
    isNewStudent = true;
  }
}

function handleCheckinByName(e) {
  e.preventDefault();
  const errEl = document.getElementById('checkinNameError');
  const sucEl = document.getElementById('checkinNameSuccess');
  errEl.classList.add('hidden'); sucEl.classList.add('hidden');

  if (!currentSession || currentSession.type !== 'club') return;

  const name = document.getElementById('searchName').value.trim();
  const school = document.getElementById('searchSchool').value.trim();
  const rating = parseInt(document.getElementById('ratingValueName').value);
  const comment = document.getElementById('commentName').value.trim();

  if (!name || !school) { errEl.textContent = 'Enter student name and school first, then search.'; errEl.classList.remove('hidden'); return; }
  if (rating < 1 || rating > 5) { errEl.textContent = 'Please select a rating.'; errEl.classList.remove('hidden'); return; }

  let student = selectedStudentForName;

  // If new student, register
  if (isNewStudent || !student) {
    const age = document.getElementById('newAge').value;
    const phone = document.getElementById('newPhone').value.trim();
    if (!age || parseInt(age) < 5 || parseInt(age) > 99) {
      errEl.textContent = 'Please enter a valid age for the new student.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!phone || phone.length < 10) {
      errEl.textContent = 'Please enter a valid 10-digit phone number.';
      errEl.classList.remove('hidden');
      return;
    }
    const regResult = DB.registerStudent(name, school, age, phone);
    student = regResult.student;
    showToast(`New student registered! ID: ${student.id}`, 'success', '🆕');
  }

  // Add check-in
  const result = DB.addCheckin(student.id, currentSession.id, rating, comment);
  if (result.error) { errEl.textContent = result.error; errEl.classList.remove('hidden'); return; }

  sucEl.innerHTML = `✅ <strong>${student.name}</strong> (ID: <code style="font-family:var(--font-mono);color:var(--accent-cyan);font-weight:700;font-size:1.1em;">${student.id}</code>) checked in! ${isNewStudent ? '— Share this ID with the student for future visits.' : ''}`;
  sucEl.classList.remove('hidden');
  showToast(`${student.name} checked in!`, 'success', '✅');

  // Reset
  document.getElementById('searchName').value = '';
  document.getElementById('searchSchool').value = '';
  document.getElementById('ratingValueName').value = '0';
  document.getElementById('commentName').value = '';
  document.getElementById('newAge').value = '';
  document.getElementById('newPhone').value = '';
  document.getElementById('searchResults').classList.add('hidden');
  document.getElementById('newStudentSection').classList.add('hidden');
  selectedStudentForName = null;
  isNewStudent = false;
  selectedRatingName = 0;
  document.getElementById('starRatingName').querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  document.getElementById('ratingLabelName').textContent = 'Click to rate';
  renderClubDashboard();
}

// ─── UTILITIES ──────────────────────────────────────────────────────────
function starsDisplay(rating) {
  const full = Math.round(rating);
  return '★'.repeat(Math.max(0, full)) + '☆'.repeat(Math.max(0, 5 - full));
}
function getRankClass(i) { return i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-other'; }
function formatTime(iso) { return new Date(iso).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }); }
function formatTimeShort(iso) { return new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
function showToast(message, type='info', icon='ℹ️') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('out'); toast.addEventListener('animationend', () => toast.remove()); }, 3500);
}
