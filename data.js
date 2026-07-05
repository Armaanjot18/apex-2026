import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getDatabase, ref, onValue, set, push, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4UttwhVmEr_GrPCgNKgHVEBxP_JfC-Ew",
  authDomain: "apex-2026-1be79.firebaseapp.com",
  databaseURL: "https://apex-2026-1be79-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "apex-2026-1be79",
  storageBucket: "apex-2026-1be79.firebasestorage.app",
  messagingSenderId: "460903986564",
  appId: "1:460903986564:web:01a1d92c51282da5fb99d1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const STORAGE_KEYS = {
  SESSION: 'apex2026_session_v2',
};

export const INITIAL_CLUBS = [
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

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

let state = {
  students: [],
  clubs: [],
  checkins: []
};

let dataLoaded = false;
let dataLoadCallbacks = [];

export function onDataLoaded(cb) {
  if (dataLoaded) cb();
  else dataLoadCallbacks.push(cb);
}

// Initialize listeners
const studentsRef = ref(db, 'students');
onValue(studentsRef, (snapshot) => {
  const data = snapshot.val() || {};
  state.students = Object.values(data);
  window.dispatchEvent(new Event('apex-data-update'));
});

const checkinsRef = ref(db, 'checkins');
onValue(checkinsRef, (snapshot) => {
  const data = snapshot.val() || {};
  state.checkins = Object.values(data);
  window.dispatchEvent(new Event('apex-data-update'));
});

const clubsRef = ref(db, 'clubs');
onValue(clubsRef, (snapshot) => {
  const data = snapshot.val();
  if (!data) {
    // Seed clubs
    const clubsObj = {};
    INITIAL_CLUBS.forEach(c => {
      clubsObj[c.id] = { ...c, passwordHash: simpleHash(c.password) };
    });
    set(clubsRef, clubsObj);
  } else {
    state.clubs = Object.values(data);
    if (!dataLoaded) {
      dataLoaded = true;
      dataLoadCallbacks.forEach(cb => cb());
    }
    window.dispatchEvent(new Event('apex-data-update'));
  }
});

function generateStudentId() {
  const usedIds = new Set(state.students.map(s => s.id));
  let id;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (usedIds.has(id));
  return id;
}

export const DB = {
  getClubs() { return state.clubs; },
  getClubById(id) { return state.clubs.find(c => c.id === id.toUpperCase()); },
  authenticateClub(clubId, password) {
    if (clubId.trim() === '2517097' && password === 'armaa') {
      return { club: { id: 'admin', name: 'Admin', role: 'admin' } };
    }
    const club = this.getClubById(clubId);
    if (!club) return { error: 'Club ID not found.' };
    if (club.passwordHash !== simpleHash(password)) return { error: 'Incorrect passcode.' };
    return { club };
  },

  async addClub(id, name, category, password) {
    const clubId = id.toUpperCase().trim();
    if (this.getClubById(clubId)) return { error: 'Club ID already exists.' };
    const club = {
      id: clubId,
      name: name.trim(),
      category: category.trim(),
      icon: '✨',
      stall: 'TBD',
      passwordHash: simpleHash(password)
    };
    const clubRef = ref(db, `clubs/${clubId}`);
    await set(clubRef, club);
    return { club };
  },
  async deleteClub(clubId) {
    const clubRef = ref(db, `clubs/${clubId}`);
    await remove(clubRef);
  },

  getStudents() { return state.students; },
  getStudentById(id) { return state.students.find(s => s.id === id); },
  searchStudents(name, school) {
    const n = name.toLowerCase().trim();
    const s = school.toLowerCase().trim();
    return state.students.filter(st => st.name.toLowerCase() === n && st.school.toLowerCase() === s);
  },
  async registerStudent(name, school, age, phone) {
    const student = {
      id: generateStudentId(),
      name: name.trim(),
      school: school.trim(),
      age: parseInt(age),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
    };
    const newRef = push(ref(db, 'students'));
    await set(newRef, student);
    return { student };
  },
  async deleteStudent(studentId) {
    // Find Firebase key for the student
    let firebaseKey = null;
    const studentsRef = ref(db, 'students');
    // Using a one-time fetch to find the key to delete
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js").then(async ({ get, child }) => {
      const snapshot = await get(studentsRef);
      if (snapshot.exists()) {
        snapshot.forEach(childSnap => {
          if (childSnap.val().id === studentId) {
            firebaseKey = childSnap.key;
          }
        });
        if (firebaseKey) {
          await remove(ref(db, `students/${firebaseKey}`));
        }
      }
    });
  },

  getCheckins() { return state.checkins; },
  async addCheckin(studentId, clubId, rating, comment) {
    const dup = state.checkins.find(c => c.studentId === studentId && c.clubId === clubId);
    if (dup) return { error: 'This student has already been checked in to this stall.' };
    const checkin = {
      id: `CHK-${Date.now()}`,
      studentId,
      clubId,
      rating: parseInt(rating),
      comment: comment || '',
      timestamp: new Date().toISOString(),
    };
    const newRef = push(ref(db, 'checkins'));
    await set(newRef, checkin);
    return { checkin };
  },
  getCheckinsByClub(clubId) { return state.checkins.filter(c => c.clubId === clubId); },

  getSession() {
    const stored = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return stored ? JSON.parse(stored) : null;
  },
  setSession(session) { sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session)); },
  clearSession() { sessionStorage.removeItem(STORAGE_KEYS.SESSION); },

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
  }
};
