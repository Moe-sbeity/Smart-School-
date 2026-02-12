/* ── Admin All-Classes Page ── */
const API_URL = 'http://localhost:5001/api';

let allSchedules = [];   // all fetched from the API (across pages)
let filtered = [];       // after client-side filters
let currentView = 'table';
let currentPage = 1;
const PAGE_SIZE = 20;
let sortCol = 'grade';
let sortDir = 'asc';

// ── Auth ──
function getToken() { return localStorage.getItem('token'); }

function checkAuth() {
  const token = getToken();
  if (!token) { window.location.href = '../login.html'; return; }
}

async function apiCall(endpoint) {
  const token = getToken();
  const res = await axios.get(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  checkAuth();
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../login.html';
  });

  // live-search on typing
  document.getElementById('searchInput').addEventListener('input', () => applyFilters());

  // auto-filter on dropdown change
  ['filterTeacher', 'filterDay', 'filterGrade', 'filterSection', 'filterSubject'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => applyFilters());
  });

  await loadAllSchedules();
});

// ── Load all schedules (paginated fetch) ──
async function loadAllSchedules() {
  showLoading();
  try {
    // Fetch first page to learn total
    const first = await apiCall('/schedules/all?page=1&limit=200');
    allSchedules = first.schedules || [];
    const totalItems = first.pagination?.totalItems || allSchedules.length;

    // If there are more pages, fetch them
    if (totalItems > 200) {
      const pages = Math.ceil(totalItems / 200);
      for (let p = 2; p <= pages; p++) {
        const next = await apiCall(`/schedules/all?page=${p}&limit=200`);
        allSchedules = allSchedules.concat(next.schedules || []);
      }
    }

    populateFilterDropdowns();
    applyFilters();
  } catch (err) {
    console.error('Failed to load schedules:', err);
    document.getElementById('contentArea').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Classes</h3>
        <p>${err.response?.data?.message || err.message}</p>
      </div>`;
  }
}

// ── Populate filter dropdowns from data ──
function populateFilterDropdowns() {
  const teachers = new Map();
  const grades = new Set();
  const subjects = new Set();

  allSchedules.forEach(s => {
    if (s.teacher?._id) teachers.set(s.teacher._id, s.teacher.name);
    if (s.classGrade) grades.add(s.classGrade);
    if (s.subject) subjects.add(s.subject);
  });

  // Teachers
  const teacherSel = document.getElementById('filterTeacher');
  const savedTeacher = teacherSel.value;
  teacherSel.innerHTML = '<option value="">All Teachers</option>';
  [...teachers.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, name]) => {
      teacherSel.innerHTML += `<option value="${id}">${name}</option>`;
    });
  teacherSel.value = savedTeacher;

  // Grades
  const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  const gradeSel = document.getElementById('filterGrade');
  const savedGrade = gradeSel.value;
  gradeSel.innerHTML = '<option value="">All Grades</option>';
  [...grades].sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b)).forEach(g => {
    gradeSel.innerHTML += `<option value="${g}">${formatGrade(g)}</option>`;
  });
  gradeSel.value = savedGrade;

  // Subjects
  const subjectSel = document.getElementById('filterSubject');
  const savedSubject = subjectSel.value;
  subjectSel.innerHTML = '<option value="">All Subjects</option>';
  [...subjects].sort().forEach(s => {
    subjectSel.innerHTML += `<option value="${s}">${s}</option>`;
  });
  subjectSel.value = savedSubject;
}

// ── Apply Filters ──
function applyFilters() {
  const teacher = document.getElementById('filterTeacher').value;
  const day = document.getElementById('filterDay').value;
  const grade = document.getElementById('filterGrade').value;
  const section = document.getElementById('filterSection').value;
  const subject = document.getElementById('filterSubject').value;
  const search = document.getElementById('searchInput').value.trim().toLowerCase();

  filtered = allSchedules.filter(s => {
    if (teacher && s.teacher?._id !== teacher) return false;
    if (day && s.dayOfWeek !== day) return false;
    if (grade && s.classGrade !== grade) return false;
    if (section && s.classSection !== section) return false;
    if (subject && s.subject !== subject) return false;
    if (search) {
      const haystack = [
        s.subject, s.dayOfWeek, s.classGrade, s.classSection,
        s.teacher?.name, s.startTime, s.endTime
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  sortData();
  currentPage = 1;
  updateStats();
  buildGradeBreakdown();
  render();
}

function resetFilters() {
  document.getElementById('filterTeacher').value = '';
  document.getElementById('filterDay').value = '';
  document.getElementById('filterGrade').value = '';
  document.getElementById('filterSection').value = '';
  document.getElementById('filterSubject').value = '';
  document.getElementById('searchInput').value = '';
  applyFilters();
}

// ── Stats ──
function updateStats() {
  const subjects = new Set(filtered.map(s => s.subject));
  const teachers = new Set(filtered.filter(s => s.teacher?._id).map(s => s.teacher._id));
  const grades = new Set(filtered.map(s => s.classGrade));
  const sections = new Set(filtered.map(s => `${s.classGrade}-${s.classSection}`));

  document.getElementById('totalClasses').textContent = filtered.length;
  document.getElementById('totalGrades').textContent = grades.size;
  document.getElementById('totalSections').textContent = sections.size;
  document.getElementById('totalSubjects').textContent = subjects.size;
  document.getElementById('totalTeachers').textContent = teachers.size;
}

// ── Sort ──
function sortData() {
  const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
  const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'subject': cmp = (a.subject || '').localeCompare(b.subject || ''); break;
      case 'teacher': cmp = (a.teacher?.name || '').localeCompare(b.teacher?.name || ''); break;
      case 'day': cmp = (dayOrder[a.dayOfWeek] || 0) - (dayOrder[b.dayOfWeek] || 0); break;
      case 'time': cmp = (a.startTime || '').localeCompare(b.startTime || ''); break;
      case 'section': cmp = (a.classSection || '').localeCompare(b.classSection || ''); break;
      case 'grade':
      default:
        cmp = gradeOrder.indexOf(a.classGrade) - gradeOrder.indexOf(b.classGrade);
        if (cmp === 0) cmp = (a.classSection || '').localeCompare(b.classSection || '');
        if (cmp === 0) cmp = (dayOrder[a.dayOfWeek] || 0) - (dayOrder[b.dayOfWeek] || 0);
        if (cmp === 0) cmp = (a.startTime || '').localeCompare(b.startTime || '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function toggleSort(col) {
  if (sortCol === col) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortCol = col;
    sortDir = 'asc';
  }
  sortData();
  render();
}

// ── Render ──
function render() {
  const area = document.getElementById('contentArea');
  if (filtered.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>No Classes Found</h3>
        <p>Try adjusting your filters or reset them.</p>
      </div>`;
    return;
  }

  switch (currentView) {
    case 'table': renderTable(area); break;
    case 'cards': renderCards(area); break;
    case 'timetable': renderTimetable(area); break;
  }
}

// ── Table View ──
function renderTable(area) {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  const sortIcon = (col) => {
    if (sortCol !== col) return '<i class="fas fa-sort sort-icon"></i>';
    return sortDir === 'asc'
      ? '<i class="fas fa-sort-up sort-icon"></i>'
      : '<i class="fas fa-sort-down sort-icon"></i>';
  };

  let html = `
    <div class="classes-table-wrapper">
      <table class="classes-table">
        <thead>
          <tr>
            <th class="${sortCol === 'subject' ? 'sorted' : ''}" onclick="toggleSort('subject')">Subject ${sortIcon('subject')}</th>
            <th class="${sortCol === 'teacher' ? 'sorted' : ''}" onclick="toggleSort('teacher')">Teacher ${sortIcon('teacher')}</th>
            <th class="${sortCol === 'grade' ? 'sorted' : ''}" onclick="toggleSort('grade')">Grade ${sortIcon('grade')}</th>
            <th class="${sortCol === 'section' ? 'sorted' : ''}" onclick="toggleSort('section')">Section ${sortIcon('section')}</th>
            <th class="${sortCol === 'day' ? 'sorted' : ''}" onclick="toggleSort('day')">Day ${sortIcon('day')}</th>
            <th class="${sortCol === 'time' ? 'sorted' : ''}" onclick="toggleSort('time')">Time ${sortIcon('time')}</th>
            <th>Students</th>
          </tr>
        </thead>
        <tbody>`;

  pageData.forEach(s => {
    html += `
          <tr>
            <td><span class="badge badge-subject">${s.subject || 'N/A'}</span></td>
            <td>
              <div class="teacher-cell">
                <div class="teacher-avatar">${(s.teacher?.name || '?').charAt(0).toUpperCase()}</div>
                ${s.teacher?.name || 'Unassigned'}
              </div>
            </td>
            <td><span class="badge badge-grade">${formatGrade(s.classGrade)}</span></td>
            <td><span class="badge badge-section">${s.classSection || '-'}</span></td>
            <td><span class="badge badge-day">${s.dayOfWeek || '-'}</span></td>
            <td><span class="badge badge-time">${s.startTime || ''} - ${s.endTime || ''}</span></td>
            <td><span class="students-count"><i class="fas fa-user-graduate"></i> ${s.student?.length || 0}</span></td>
          </tr>`;
  });

  html += `</tbody></table>`;
  html += renderPagination(totalPages);
  html += `</div>`;

  area.innerHTML = html;
}

// ── Cards View ──
function renderCards(area) {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageData = filtered.slice(start, start + PAGE_SIZE);

  let html = '<div class="cards-grid">';
  pageData.forEach(s => {
    html += `
      <div class="class-card">
        <div class="class-card-header">
          <div class="class-card-subject">${s.subject || 'N/A'}</div>
          <div class="class-card-grade">
            <span class="badge badge-grade">${formatGrade(s.classGrade)}</span>
            <span class="badge badge-section">${s.classSection || '-'}</span>
          </div>
        </div>
        <div class="class-card-body">
          <div class="class-card-row">
            <i class="fas fa-chalkboard-teacher"></i>
            ${s.teacher?.name || 'Unassigned'}
          </div>
          <div class="class-card-row">
            <i class="fas fa-calendar-day"></i>
            ${s.dayOfWeek || '-'}
          </div>
          <div class="class-card-row">
            <i class="fas fa-clock"></i>
            ${s.startTime || ''} - ${s.endTime || ''}
          </div>
          <div class="class-card-row">
            <i class="fas fa-user-graduate"></i>
            ${s.student?.length || 0} student${(s.student?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>`;
  });
  html += '</div>';

  // pagination below cards
  if (totalPages > 1) {
    html += `<div class="classes-table-wrapper" style="margin-top:1rem;">${renderPagination(totalPages)}</div>`;
  }

  area.innerHTML = html;
}

// ── Timetable View ──
function renderTimetable(area) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Build unique sorted time slots from data
  const timeSet = new Set();
  filtered.forEach(s => {
    if (s.startTime) timeSet.add(s.startTime.substring(0, 5));
  });
  const timeSlots = [...timeSet].sort();

  if (timeSlots.length === 0) {
    area.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>No timetable data</h3>
        <p>Apply grade + section filters for a cleaner timetable view.</p>
      </div>`;
    return;
  }

  // index: day+time → entries
  const lookup = {};
  filtered.forEach(s => {
    const key = `${s.dayOfWeek}_${(s.startTime || '').substring(0, 5)}`;
    if (!lookup[key]) lookup[key] = [];
    lookup[key].push(s);
  });

  let html = `
    <div class="timetable-wrapper">
      <table class="timetable">
        <thead>
          <tr>
            <th>Time</th>
            ${DAYS.map(d => `<th>${d}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

  timeSlots.forEach(time => {
    html += `<tr><td class="time-col">${time}</td>`;
    DAYS.forEach(day => {
      const entries = lookup[`${day}_${time}`] || [];
      html += '<td class="timetable-cell">';
      if (entries.length > 0) {
        entries.forEach(e => {
          html += `
            <div class="timetable-entry">
              <div class="tt-subject">${e.subject}</div>
              <div class="tt-teacher">${e.teacher?.name || '?'} · ${formatGrade(e.classGrade)}${e.classSection}</div>
            </div>`;
        });
      } else {
        html += '<div class="timetable-empty">—</div>';
      }
      html += '</td>';
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  area.innerHTML = html;
}

// ── Pagination ──
function renderPagination(totalPages) {
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, filtered.length);

  let html = `
    <div class="pagination-bar">
      <div class="pagination-info">
        Showing ${start}–${end} of ${filtered.length} classes
      </div>
      <div class="pagination-controls">
        <button class="page-btn" onclick="goPage(1)" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>
        <button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}><i class="fas fa-angle-left"></i></button>`;

  // show up to 5 page buttons around current
  const maxBtns = 5;
  let pStart = Math.max(1, currentPage - Math.floor(maxBtns / 2));
  let pEnd = Math.min(totalPages, pStart + maxBtns - 1);
  if (pEnd - pStart < maxBtns - 1) pStart = Math.max(1, pEnd - maxBtns + 1);

  for (let p = pStart; p <= pEnd; p++) {
    html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }

  html += `
        <button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-angle-right"></i></button>
        <button class="page-btn" onclick="goPage(${totalPages})" ${currentPage >= totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>
      </div>
    </div>`;
  return html;
}

function goPage(p) {
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  render();
  window.scrollTo({ top: document.getElementById('contentArea').offsetTop - 80, behavior: 'smooth' });
}

// ── View Switching ──
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  currentPage = 1;
  render();
}

// ── Helpers ──
function formatGrade(g) {
  if (!g) return 'N/A';
  if (g === 'kg1') return 'KG1';
  if (g === 'kg2') return 'KG2';
  return 'Grade ' + g.replace('grade', '');
}

function showLoading() {
  document.getElementById('contentArea').innerHTML = `
    <div class="loading-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading classes...</p>
    </div>`;
}

// ── Grade & Section Breakdown ──
function buildGradeBreakdown() {
  const container = document.getElementById('gradeBreakdown');
  if (!container) return;

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  const sectionOrder = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Group schedules by grade
  const gradeMap = {};
  filtered.forEach(s => {
    if (!s.classGrade) return;
    if (!gradeMap[s.classGrade]) gradeMap[s.classGrade] = [];
    gradeMap[s.classGrade].push(s);
  });

  const sortedGrades = Object.keys(gradeMap).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));

  if (sortedGrades.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<h2 class="breakdown-title"><i class="fas fa-chart-bar"></i> Grade & Section Statistics</h2>';

  sortedGrades.forEach(grade => {
    const gradeSchedules = gradeMap[grade];
    // Group by section
    const sectionMap = {};
    gradeSchedules.forEach(s => {
      const sec = s.classSection || '-';
      if (!sectionMap[sec]) sectionMap[sec] = [];
      sectionMap[sec].push(s);
    });
    const sortedSections = Object.keys(sectionMap).sort((a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));

    const gradeSubjects = new Set(gradeSchedules.map(s => s.subject));
    const gradeTeachers = new Set(gradeSchedules.filter(s => s.teacher?._id).map(s => s.teacher._id));
    const gradeStudents = new Set();
    gradeSchedules.forEach(s => (s.student || []).forEach(st => gradeStudents.add(typeof st === 'object' ? st._id : st)));

    html += `
    <div class="grade-block">
      <div class="grade-block-header" onclick="toggleGradeBlock(this)">
        <div class="grade-block-title">
          <i class="fas fa-graduation-cap"></i>
          <span>${formatGrade(grade)}</span>
          <span class="grade-block-badge">${sortedSections.length} Section${sortedSections.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="grade-block-summary">
          <span><i class="fas fa-chalkboard"></i> ${gradeSchedules.length} classes</span>
          <span><i class="fas fa-book"></i> ${gradeSubjects.size} subjects</span>
          <span><i class="fas fa-chalkboard-teacher"></i> ${gradeTeachers.size} teachers</span>
          <span><i class="fas fa-user-graduate"></i> ${gradeStudents.size} students</span>
          <i class="fas fa-chevron-down grade-block-arrow"></i>
        </div>
      </div>
      <div class="grade-block-body">`;

    sortedSections.forEach(section => {
      const secSchedules = sectionMap[section];
      const secSubjects = new Set(secSchedules.map(s => s.subject));
      const secTeachers = new Set(secSchedules.filter(s => s.teacher?._id).map(s => s.teacher._id));
      const secStudents = new Set();
      secSchedules.forEach(s => (s.student || []).forEach(st => secStudents.add(typeof st === 'object' ? st._id : st)));

      // Build mini timetable data
      const timeSet = new Set();
      secSchedules.forEach(s => { if (s.startTime) timeSet.add(s.startTime.substring(0, 5)); });
      const timeSlots = [...timeSet].sort();
      const lookup = {};
      secSchedules.forEach(s => {
        const key = `${s.dayOfWeek}_${(s.startTime || '').substring(0, 5)}`;
        if (!lookup[key]) lookup[key] = [];
        lookup[key].push(s);
      });

      html += `
        <div class="section-block">
          <div class="section-block-header">
            <h4><i class="fas fa-users"></i> Section ${section}</h4>
            <div class="section-stats">
              <span class="section-stat"><i class="fas fa-chalkboard"></i> ${secSchedules.length}</span>
              <span class="section-stat"><i class="fas fa-book"></i> ${secSubjects.size}</span>
              <span class="section-stat"><i class="fas fa-chalkboard-teacher"></i> ${secTeachers.size}</span>
              <span class="section-stat"><i class="fas fa-user-graduate"></i> ${secStudents.size}</span>
            </div>
          </div>`;

      if (timeSlots.length > 0) {
        html += `
          <div class="mini-timetable-wrapper">
            <table class="mini-timetable">
              <thead>
                <tr>
                  <th>Time</th>
                  ${DAYS.map(d => `<th>${d.substring(0, 3)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>`;
        timeSlots.forEach(time => {
          html += `<tr><td class="mini-time">${time}</td>`;
          DAYS.forEach(day => {
            const entries = lookup[`${day}_${time}`] || [];
            html += '<td class="mini-cell">';
            if (entries.length > 0) {
              entries.forEach(e => {
                html += `<div class="mini-entry"><span class="mini-subj">${e.subject}</span><span class="mini-teacher">${(e.teacher?.name || '?').split(' ')[0]}</span></div>`;
              });
            } else {
              html += '<span class="mini-empty">—</span>';
            }
            html += '</td>';
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
      } else {
        html += '<p class="no-schedule-msg">No schedule data for this section.</p>';
      }

      html += '</div>'; // section-block
    });

    html += '</div></div>'; // grade-block-body, grade-block
  });

  container.innerHTML = html;
}

function toggleGradeBlock(header) {
  const block = header.closest('.grade-block');
  block.classList.toggle('collapsed');
}

// expose to onclick
window.toggleSort = toggleSort;
window.goPage = goPage;
window.switchView = switchView;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.toggleGradeBlock = toggleGradeBlock;
