/**
 * APEX 2026 — Data Layer v2
 * Students are registered by clubs, get a 4-digit random ID.
 * No student login — clubs handle everything.
 */

const STORAGE_KEYS = {
  STUDENTS: 'apex2026_students_v2',
  CLUBS: 'apex2026_clubs_v2',
  CHECKINS: 'apex2026_checkins_v2',
  SESSION: 'apex2026_session_v2',
};

const INITIAL_CLUBS = [
  { id: 'CLUB-001', name: 'TechNova',    password: 'tech001',   icon: '💻', category: 'Technology & AI',   stall: 'Hall A-1' },
  { id: 'CLUB-002', name: 'CodeCraft',   password: 'code002',   icon: '⚙️', category: 'Programming',       stall: 'Hall A-2' },
  { id: 'CLUB-003', name: 'RoboZone',    password: 'robo003',   icon: '🤖', category: 'Robotics',           stall: 'Hall B-1' },
  { id: 'CLUB-004', name: 'DesignHub',   password: 'design004', icon: '🎨', category: 'UI/UX Design',       stall: 'Hall B-2' },
  { id: 'CLUB-005', name: 'CyberShield', password: 'cyber005',  icon: '🛡️', category: 'Cybersecurity',      stall: 'Hall C-1' },
  { id: 'CLUB-006', name: 'DataVault',   password: 'data006',   icon: '📊', category: 'Data Science',       stall: 'Hall C-2' },
  { id: 'CLUB-007', name: 'CloudNine',   password: 'cloud007',  icon: '☁️', category: 'Cloud & DevOps',     stall: 'Hall D-1' },
  { id: 'CLUB-008', name: 'GreenTech',   password: 'green008',  icon: '🌱', category: 'Sustainability',     stall: 'Hall D-2' },
  { id: 'CLUB-009', name: 'MakerSpace',  password: 'maker009',  icon: '🔧', category: 'Hardware Hacks',     stall: 'Hall E-1' },
  { id: 'CLUB-010', name: 'BizPilot',    password: 'biz010',    icon: '🚀', category: 'Entrepreneurship',   stall: 'Hall E-2' },
  { id: 'CLUB-011', name: 'GameForge',   password: 'game011',   icon: '🎮', category: 'Game Dev',            stall: 'Hall F-1' },
  { id: 'CLUB-012', name: 'PhotonLab',   password: 'photo012',  icon: '📷', category: 'Photography',        stall: 'Hall F-2' },
];

// Simple hash for passwords
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Generate random 4-digit ID not already in use
function generateStudentId() {
  const students = DB.getStudents();
  const usedIds = new Set(students.map(s => s.id));
  let id;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
  } while (usedIds.has(id));
  return id;
}

const DB = {
  // ── Clubs ──
  getClubs() {
    const stored = localStorage.getItem(STORAGE_KEYS.CLUBS);
    if (!stored) {
      const clubs = INITIAL_CLUBS.map(c => ({ ...c, passwordHash: simpleHash(c.password) }));
      localStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(clubs));
      return clubs;
    }
    return JSON.parse(stored);
  },
  getClubById(id) {
    return this.getClubs().find(c => c.id === id.toUpperCase());
  },
  authenticateClub(clubId, password) {
    const club = this.getClubById(clubId);
    if (!club) return { error: 'Club ID not found.' };
    if (club.passwordHash !== simpleHash(password)) return { error: 'Incorrect passcode.' };
    return { club };
  },

  // ── Students ──
  getStudents() {
    const stored = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    return stored ? JSON.parse(stored) : [];
  },
  saveStudents(students) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  },
  getStudentById(id) {
    return this.getStudents().find(s => s.id === id);
  },
  searchStudents(name, school) {
    const students = this.getStudents();
    const n = name.toLowerCase().trim();
    const s = school.toLowerCase().trim();
    return students.filter(st =>
      st.name.toLowerCase() === n && st.school.toLowerCase() === s
    );
  },
  registerStudent(name, school, age, phone) {
    const students = this.getStudents();
    const student = {
      id: generateStudentId(),
      name: name.trim(),
      school: school.trim(),
      age: parseInt(age),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
    };
    students.push(student);
    this.saveStudents(students);
    return { student };
  },

  // ── Check-ins ──
  getCheckins() {
    const stored = localStorage.getItem(STORAGE_KEYS.CHECKINS);
    return stored ? JSON.parse(stored) : [];
  },
  saveCheckins(checkins) {
    localStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(checkins));
    window.dispatchEvent(new Event('apex-data-update'));
  },
  addCheckin(studentId, clubId, rating, comment) {
    const checkins = this.getCheckins();
    const dup = checkins.find(c => c.studentId === studentId && c.clubId === clubId);
    if (dup) return { error: 'This student has already been checked in to this stall.' };
    const checkin = {
      id: `CHK-${Date.now()}`,
      studentId,
      clubId,
      rating: parseInt(rating),
      comment: comment || '',
      timestamp: new Date().toISOString(),
    };
    checkins.push(checkin);
    this.saveCheckins(checkins);
    return { checkin };
  },
  getCheckinsByClub(clubId) {
    return this.getCheckins().filter(c => c.clubId === clubId);
  },

  // ── Session ──
  getSession() {
    const stored = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return stored ? JSON.parse(stored) : null;
  },
  setSession(session) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },
  clearSession() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // ── Stats ──
  getClubStats(clubId) {
    const checkins = this.getCheckinsByClub(clubId);
    const today = new Date().toDateString();
    const todayCheckins = checkins.filter(c => new Date(c.timestamp).toDateString() === today);
    const totalRating = checkins.reduce((sum, c) => sum + c.rating, 0);
    const avgRating = checkins.length > 0 ? (totalRating / checkins.length).toFixed(1) : '0.0';
    const ratingDist = [5, 4, 3, 2, 1].map(r => ({
      stars: r,
      count: checkins.filter(c => c.rating === r).length,
    }));
    return {
      total: checkins.length,
      todayCount: todayCheckins.length,
      avgRating,
      totalComments: checkins.filter(c => c.comment && c.comment.trim()).length,
      ratingDist,
      checkins,
    };
  },
  getAllClubsSorted(sortBy = 'visits') {
    const clubs = this.getClubs();
    return clubs.map(club => {
      const stats = this.getClubStats(club.id);
      return { ...club, ...stats };
    }).sort((a, b) => {
      if (sortBy === 'rating') return parseFloat(b.avgRating) - parseFloat(a.avgRating) || b.total - a.total;
      return b.total - a.total || parseFloat(b.avgRating) - parseFloat(a.avgRating);
    });
  },
  getGlobalStats() {
    const checkins = this.getCheckins();
    const students = this.getStudents();
    const clubs = this.getClubs();
    const totalRating = checkins.reduce((sum, c) => sum + c.rating, 0);
    const avgRating = checkins.length > 0 ? (totalRating / checkins.length).toFixed(1) : '0.0';
    return {
      totalStudents: students.length,
      totalClubs: clubs.length,
      totalVisits: checkins.length,
      avgRating,
    };
  },
};

// Initialize clubs on load
DB.getClubs();
