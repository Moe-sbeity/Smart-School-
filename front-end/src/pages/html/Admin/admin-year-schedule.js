// Academic Year Schedule Management
const API_URL = 'http://localhost:5001/api';

// State
let currentAcademicYear = '2025-2026';
let academicYearSettings = null;
let grades = [];
let gradeStats = [];
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadInitialData();
  setupEventListeners();
});

// Authentication
async function checkAuth() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    currentUser = response.data.user || response.data;
    
    if (currentUser.role !== 'admin') {
      window.location.href = '../login.html';
      return;
    }
    
    // Update welcome message
    document.getElementById('welcomeMessage').innerHTML = 
      `Welcome, ${currentUser.name} | Academic Year <span id="currentYear">${currentAcademicYear}</span>`;
  } catch (error) {
    console.error('Auth error:', error);
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '../login.html';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '../login.html';
  });

  // Grade Data Form
  document.getElementById('gradeDataForm')?.addEventListener('submit', handleGradeDataSubmit);
  
  // Term Settings Form
  document.getElementById('termSettingsForm')?.addEventListener('submit', handleTermSettingsSubmit);
  
  // Assessment Settings Form
  document.getElementById('assessmentSettingsForm')?.addEventListener('submit', handleAssessmentSettingsSubmit);
  
  // New Year Form
  document.getElementById('newYearForm')?.addEventListener('submit', handleNewYearSubmit);
  
  // Weight inputs - update total
  ['settingsExamWeight', 'settingsQuizWeight', 'settingsAssignmentWeight'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateWeightTotal);
  });
}

// Load initial data
async function loadInitialData() {
  try {
    // Load academic year settings first (gradeStats depends on it)
    await loadAcademicYearSettings();
    
    // Then load grades and grade stats
    await Promise.all([
      loadGrades(),
      loadGradeStats()
    ]);
    
    renderGradeCards();
    renderTerms();
    updateStatsSummary();
    updateAssessmentSettingsDisplay();
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('Error loading data. Please refresh.', 'error');
  }
}

// Load academic year settings
async function loadAcademicYearSettings() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    const response = await axios.get(`${API_URL}/academic-year/current`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    academicYearSettings = response.data.settings || response.data;
    currentAcademicYear = academicYearSettings.academicYear;
    
    // Update year dropdown
    const yearSelect = document.getElementById('filterYear');
    yearSelect.value = currentAcademicYear;
    
    // Update current year display
    document.getElementById('currentYear').textContent = currentAcademicYear;
  } catch (error) {
    console.error('Error loading academic year settings:', error);
    // Use defaults if API fails
    academicYearSettings = getDefaultSettings();
  }
}

// Default settings fallback
function getDefaultSettings() {
  return {
    academicYear: '2025-2026',
    numberOfTerms: 6,
    currentTerm: 3,
    terms: [
      { termNumber: 1, name: 'Term 1', startMonth: 'September', endMonth: 'October' },
      { termNumber: 2, name: 'Term 2', startMonth: 'November', endMonth: 'December' },
      { termNumber: 3, name: 'Term 3', startMonth: 'January', endMonth: 'February' },
      { termNumber: 4, name: 'Term 4', startMonth: 'March', endMonth: 'April' },
      { termNumber: 5, name: 'Term 5', startMonth: 'May', endMonth: 'June' },
      { termNumber: 6, name: 'Term 6', startMonth: 'July', endMonth: 'August' }
    ],
    assessmentSettings: {
      maxExamsPerTerm: 10,
      maxQuizzesPerTerm: 15,
      maxAssignmentsPerTerm: 30,
      examWeight: 40,
      quizWeight: 20,
      assignmentWeight: 40
    },
    statistics: {
      totalExams: 30,
      totalQuizzes: 28,
      totalAssignments: 114,
      averageAttendance: 93
    }
  };
}

// Load grades
async function loadGrades() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    const response = await axios.get(`${API_URL}/classGrade/available-grades`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Response is { message: ..., data: [...] } - extract the data array
    const gradeList = response.data.data || response.data;
    // Convert grade strings to objects with grade property for consistency
    grades = Array.isArray(gradeList) ? gradeList.map(g => typeof g === 'string' ? { grade: g } : g) : [];
    populateGradeFilter();
    populateGradeSelect();
  } catch (error) {
    console.error('Error loading grades:', error);
    // Use sample grades
    grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => ({ grade: g }));
    populateGradeFilter();
    populateGradeSelect();
  }
}

// Load grade statistics
async function loadGradeStats() {
  // First try to load from academicYearSettings.gradeSettings
  if (academicYearSettings && academicYearSettings.gradeSettings && academicYearSettings.gradeSettings.length > 0) {
    gradeStats = academicYearSettings.gradeSettings.map(g => ({
      grade: g.grade,
      exams: g.maxExams || g.exams || 0,
      quizzes: g.maxQuizzes || g.quizzes || 0,
      tasks: g.maxAssignments || g.tasks || 0
    }));
    return;
  }
  
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    const response = await axios.get(`${API_URL}/academic-year/${currentAcademicYear}/stats/by-grade`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    gradeStats = response.data.stats || response.data;
    if (!Array.isArray(gradeStats)) {
      gradeStats = [];
    }
  } catch (error) {
    console.error('Error loading grade stats:', error);
    // Start with empty array - user will add grade data
    gradeStats = [];
  }
}

// Format grade for display (kg1 -> KG 1, grade1 -> Grade 1)
function formatGradeLabel(grade) {
  if (!grade) return '';
  const gradeStr = String(grade);
  if (gradeStr.toLowerCase().startsWith('kg')) {
    return gradeStr.toUpperCase().replace('KG', 'KG ');
  }
  if (gradeStr.toLowerCase().startsWith('grade')) {
    const num = gradeStr.replace(/grade/i, '');
    return `Grade ${num}`;
  }
  // If it's just a number, prefix with Grade
  if (!isNaN(gradeStr)) {
    return `Grade ${gradeStr}`;
  }
  return gradeStr;
}

// Populate grade filter
function populateGradeFilter() {
  const filterGrade = document.getElementById('filterGrade');
  filterGrade.innerHTML = '<option value="">All Grades</option>';
  
  grades.forEach(g => {
    const grade = g.grade || g;
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatGradeLabel(grade);
    filterGrade.appendChild(option);
  });
}

// Populate grade select in modal
function populateGradeSelect() {
  const gradeSelect = document.getElementById('gradeSelect');
  if (!gradeSelect) return;
  
  gradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
  
  grades.forEach(g => {
    const grade = g.grade || g;
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatGradeLabel(grade);
    gradeSelect.appendChild(option);
  });
}

// Render grade cards
function renderGradeCards() {
  const container = document.getElementById('gradeCardsContainer');
  const filterGrade = document.getElementById('filterGrade').value;
  
  let filteredStats = gradeStats;
  if (filterGrade) {
    filteredStats = gradeStats.filter(s => String(s.grade) === String(filterGrade));
  }
  
  if (filteredStats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-graduation-cap"></i>
        <p>No grade data available</p>
        <button class="btn btn-primary btn-sm" onclick="openAddGradeDataModal()">
          <i class="fas fa-plus"></i> Add Grade Data
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filteredStats.map(stat => `
    <div class="grade-card" data-grade="${stat.grade}">
      <div class="grade-card-header">
        <h4>${formatGradeLabel(stat.grade)}</h4>
        <button class="card-edit-btn" onclick="openEditGradeModal('${stat.grade}')" title="Edit">
          <i class="fas fa-pen"></i>
        </button>
      </div>
      <div class="grade-card-stats">
        <div class="grade-stat">
          <span class="stat-value">${stat.exams || 0}</span>
          <span class="stat-label">Exams</span>
        </div>
        <div class="grade-stat">
          <span class="stat-value">${stat.quizzes || 0}</span>
          <span class="stat-label">Quizzes</span>
        </div>
        <div class="grade-stat">
          <span class="stat-value">${stat.tasks || 0}</span>
          <span class="stat-label">Assignments</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Render terms
function renderTerms() {
  const container = document.getElementById('termsContainer');
  const terms = academicYearSettings?.terms || getDefaultSettings().terms;
  const currentTerm = academicYearSettings?.currentTerm || 3;
  
  container.innerHTML = terms.map(term => `
    <div class="term-card ${term.termNumber === currentTerm ? 'term-active' : ''}" 
         data-term="${term.termNumber}"
         onclick="selectTerm(${term.termNumber})">
      <div class="term-header">
        <span class="term-number">${term.name || `Term ${term.termNumber}`}</span>
        ${term.termNumber === currentTerm ? '<span class="term-badge">Current</span>' : ''}
      </div>
      <div class="term-dates">
        <i class="fas fa-calendar-alt"></i>
        <span>${term.startMonth} - ${term.endMonth}</span>
      </div>
      <button class="term-edit-btn" onclick="openEditTermModal(${term.termNumber}); event.stopPropagation();" title="Edit Term">
        <i class="fas fa-pen"></i>
      </button>
    </div>
  `).join('');
}

// Update stats summary
function updateStatsSummary() {
  // Calculate from gradeStats if available
  if (gradeStats && gradeStats.length > 0) {
    const totalExams = gradeStats.reduce((sum, s) => sum + (s.exams || 0), 0);
    const totalQuizzes = gradeStats.reduce((sum, s) => sum + (s.quizzes || 0), 0);
    const totalAssignments = gradeStats.reduce((sum, s) => sum + (s.tasks || 0), 0);
    
    document.getElementById('totalExams').textContent = totalExams;
    document.getElementById('totalQuizzes').textContent = totalQuizzes;
    document.getElementById('totalAssignments').textContent = totalAssignments;
  } else {
    const stats = academicYearSettings?.statistics || getDefaultSettings().statistics;
    document.getElementById('totalExams').textContent = stats.totalExams || 0;
    document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
    document.getElementById('totalAssignments').textContent = stats.totalAssignments || 0;
  }
  
  const avgAttendance = academicYearSettings?.statistics?.avgAttendance || academicYearSettings?.statistics?.averageAttendance || 0;
  document.getElementById('avgAttendance').textContent = `${avgAttendance}%`;
}

// Update assessment settings display
function updateAssessmentSettingsDisplay() {
  const settings = academicYearSettings?.assessmentSettings || getDefaultSettings().assessmentSettings;
  
  document.getElementById('maxExamsPerTerm').textContent = settings.maxExamsPerTerm || 10;
  document.getElementById('maxQuizzesPerTerm').textContent = settings.maxQuizzesPerTerm || 15;
  document.getElementById('maxAssignmentsPerTerm').textContent = settings.maxAssignmentsPerTerm || 30;
  document.getElementById('examWeight').textContent = `${settings.examWeight || 40}%`;
  document.getElementById('quizWeight').textContent = `${settings.quizWeight || 20}%`;
  document.getElementById('assignmentWeight').textContent = `${settings.assignmentWeight || 40}%`;
}

// Apply filters
function applyFilters() {
  renderGradeCards();
}

// Change academic year
async function changeAcademicYear() {
  const year = document.getElementById('filterYear').value;
  currentAcademicYear = year;
  
  document.getElementById('currentYear').textContent = year;
  
  await loadAcademicYearSettings();
  await loadGradeStats();
  
  renderGradeCards();
  renderTerms();
  updateStatsSummary();
  updateAssessmentSettingsDisplay();
}

// Select term
async function selectTerm(termNumber) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    await axios.put(
      `${API_URL}/academic-year/${currentAcademicYear}/current-term`,
      { currentTerm: termNumber },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    academicYearSettings.currentTerm = termNumber;
    renderTerms();
    showToast(`Term ${termNumber} is now the current term`, 'success');
  } catch (error) {
    console.error('Error setting current term:', error);
    showToast('Failed to update current term', 'error');
  }
}

// Modal Functions

// Grade Data Modal
function openAddGradeDataModal() {
  document.getElementById('gradeModalTitle').innerHTML = '<i class="fas fa-plus"></i> Add Grade Data';
  document.getElementById('editGradeId').value = '';
  document.getElementById('gradeSelect').value = '';
  document.getElementById('gradeExams').value = 0;
  document.getElementById('gradeQuizzes').value = 0;
  document.getElementById('gradeTasks').value = 0;
  document.getElementById('gradeDataModal').classList.add('active');
}

function openEditGradeModal(grade) {
  const stat = gradeStats.find(s => String(s.grade) === String(grade));
  
  document.getElementById('gradeModalTitle').innerHTML = `<i class="fas fa-graduation-cap"></i> Edit ${formatGradeLabel(grade)} Data`;
  document.getElementById('editGradeId').value = grade;
  document.getElementById('gradeSelect').value = grade;
  document.getElementById('gradeExams').value = stat?.exams || 0;
  document.getElementById('gradeQuizzes').value = stat?.quizzes || 0;
  document.getElementById('gradeTasks').value = stat?.tasks || 0;
  document.getElementById('gradeDataModal').classList.add('active');
}

function closeGradeDataModal() {
  document.getElementById('gradeDataModal').classList.remove('active');
}

async function handleGradeDataSubmit(e) {
  e.preventDefault();
  
  const grade = document.getElementById('gradeSelect').value;
  const exams = parseInt(document.getElementById('gradeExams').value) || 0;
  const quizzes = parseInt(document.getElementById('gradeQuizzes').value) || 0;
  const tasks = parseInt(document.getElementById('gradeTasks').value) || 0;
  
  if (!grade) {
    showToast('Please select a grade', 'error');
    return;
  }
  
  // Update local data
  const existingIndex = gradeStats.findIndex(s => String(s.grade) === String(grade));
  if (existingIndex >= 0) {
    gradeStats[existingIndex] = { grade, exams, quizzes, tasks };
  } else {
    gradeStats.push({ grade, exams, quizzes, tasks });
  }
  
  // Update totals
  const totalExams = gradeStats.reduce((sum, s) => sum + (s.exams || 0), 0);
  const totalQuizzes = gradeStats.reduce((sum, s) => sum + (s.quizzes || 0), 0);
  const totalAssignments = gradeStats.reduce((sum, s) => sum + (s.tasks || 0), 0);
  
  academicYearSettings.statistics = {
    ...academicYearSettings.statistics,
    totalExams,
    totalQuizzes,
    totalAssignments
  };
  
  // Update gradeSettings in academicYearSettings to persist the data
  academicYearSettings.gradeSettings = gradeStats.map(s => ({
    grade: s.grade,
    maxExams: s.exams || 0,
    maxQuizzes: s.quizzes || 0,
    maxAssignments: s.tasks || 0
  }));
  
  // Save to backend
  await saveAcademicYearSettings();
  
  renderGradeCards();
  updateStatsSummary();
  closeGradeDataModal();
  showToast(`${formatGradeLabel(grade)} data saved successfully`, 'success');
}

// Term Settings Modal
function openTermSettingsModal() {
  const settings = academicYearSettings || getDefaultSettings();
  
  document.getElementById('numberOfTerms').value = settings.numberOfTerms || 6;
  document.getElementById('currentTermSelect').value = settings.currentTerm || 1;
  
  updateTermsConfigUI();
  document.getElementById('termSettingsModal').classList.add('active');
}

function closeTermSettingsModal() {
  document.getElementById('termSettingsModal').classList.remove('active');
}

function updateTermsCount() {
  const count = parseInt(document.getElementById('numberOfTerms').value);
  const currentTermSelect = document.getElementById('currentTermSelect');
  
  // Update current term dropdown
  currentTermSelect.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Term ${i}`;
    currentTermSelect.appendChild(option);
  }
  
  updateTermsConfigUI();
}

function updateTermsConfigUI() {
  const count = parseInt(document.getElementById('numberOfTerms').value);
  const container = document.getElementById('termsConfigContainer');
  const existingTerms = academicYearSettings?.terms || [];
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Define default term distributions based on number of terms
  // Academic year typically runs Sep-Aug (12 months)
  const termDefaults = {
    2: [
      { startMonth: 'September', endMonth: 'January' },
      { startMonth: 'February', endMonth: 'June' }
    ],
    3: [
      { startMonth: 'September', endMonth: 'December' },
      { startMonth: 'January', endMonth: 'April' },
      { startMonth: 'May', endMonth: 'August' }
    ],
    4: [
      { startMonth: 'September', endMonth: 'November' },
      { startMonth: 'December', endMonth: 'February' },
      { startMonth: 'March', endMonth: 'May' },
      { startMonth: 'June', endMonth: 'August' }
    ],
    5: [
      { startMonth: 'September', endMonth: 'October' },
      { startMonth: 'November', endMonth: 'December' },
      { startMonth: 'January', endMonth: 'March' },
      { startMonth: 'April', endMonth: 'May' },
      { startMonth: 'June', endMonth: 'August' }
    ],
    6: [
      { startMonth: 'September', endMonth: 'October' },
      { startMonth: 'November', endMonth: 'December' },
      { startMonth: 'January', endMonth: 'February' },
      { startMonth: 'March', endMonth: 'April' },
      { startMonth: 'May', endMonth: 'June' },
      { startMonth: 'July', endMonth: 'August' }
    ]
  };
  
  const defaults = termDefaults[count] || termDefaults[6];
  
  let html = '';
  for (let i = 1; i <= count; i++) {
    // Use existing term if available and matches the count, otherwise use defaults
    const existingTerm = existingTerms.find(t => t.termNumber === i);
    const defaultTerm = defaults[i - 1];
    const term = (existingTerms.length === count && existingTerm) ? existingTerm : defaultTerm;
    
    html += `
      <div class="term-config-row">
        <div class="term-config-label">Term ${i}</div>
        <div class="term-config-inputs">
          <select id="termStart${i}">
            ${months.map(m => `<option value="${m}" ${term.startMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
          <span>to</span>
          <select id="termEnd${i}">
            ${months.map(m => `<option value="${m}" ${term.endMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function openEditTermModal(termNumber) {
  openTermSettingsModal();
  // Scroll to the specific term in the modal
  setTimeout(() => {
    const termInput = document.getElementById(`termStart${termNumber}`);
    if (termInput) {
      termInput.focus();
    }
  }, 100);
}

async function handleTermSettingsSubmit(e) {
  e.preventDefault();
  
  const numberOfTerms = parseInt(document.getElementById('numberOfTerms').value);
  const currentTerm = parseInt(document.getElementById('currentTermSelect').value);
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const getMonthIndex = (month) => months.indexOf(month);
  
  const terms = [];
  for (let i = 1; i <= numberOfTerms; i++) {
    const startMonth = document.getElementById(`termStart${i}`).value;
    const endMonth = document.getElementById(`termEnd${i}`).value;
    
    terms.push({
      termNumber: i,
      name: `Term ${i}`,
      startMonth,
      endMonth,
      isActive: i === currentTerm
    });
  }
  
  // Validate terms
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const startIdx = getMonthIndex(term.startMonth);
    const endIdx = getMonthIndex(term.endMonth);
    
    // Check if end month is before start month (invalid within same term)
    // Allow wrap-around for academic year (e.g., November to January)
    if (endIdx < startIdx && endIdx > 0) {
      // This is okay for wrap-around cases
    }
    
    // Check if this term overlaps or conflicts with the next term
    if (i < terms.length - 1) {
      const nextTerm = terms[i + 1];
      const nextStartIdx = getMonthIndex(nextTerm.startMonth);
      const currentEndIdx = getMonthIndex(term.endMonth);
      
      // Next term should start after current term ends
      // Handle wrap-around: if current ends in Dec (11) and next starts in Jan (0), that's valid
      const isWrapAround = currentEndIdx >= 9 && nextStartIdx <= 2; // Sept-Dec to Jan-Mar
      
      if (!isWrapAround && nextStartIdx <= currentEndIdx) {
        showToast(`Term ${i + 1} end month (${term.endMonth}) must be before Term ${i + 2} start month (${nextTerm.startMonth})`, 'error');
        return;
      }
      
      // Check for same month overlap
      if (term.endMonth === nextTerm.startMonth) {
        showToast(`Term ${i + 2} cannot start in the same month (${nextTerm.startMonth}) that Term ${i + 1} ends`, 'error');
        return;
      }
    }
  }
  
  // Check for duplicate month ranges
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      if (terms[i].startMonth === terms[j].startMonth && terms[i].endMonth === terms[j].endMonth) {
        showToast(`Term ${i + 1} and Term ${j + 1} cannot have the same month range`, 'error');
        return;
      }
    }
  }
  
  academicYearSettings.numberOfTerms = numberOfTerms;
  academicYearSettings.currentTerm = currentTerm;
  academicYearSettings.terms = terms;
  
  await saveAcademicYearSettings();
  
  renderTerms();
  closeTermSettingsModal();
  showToast('Term settings saved successfully', 'success');
}

// Assessment Settings Modal
function openAssessmentSettingsModal() {
  const settings = academicYearSettings?.assessmentSettings || getDefaultSettings().assessmentSettings;
  
  document.getElementById('settingsMaxExams').value = settings.maxExamsPerTerm || 10;
  document.getElementById('settingsMaxQuizzes').value = settings.maxQuizzesPerTerm || 15;
  document.getElementById('settingsMaxAssignments').value = settings.maxAssignmentsPerTerm || 30;
  document.getElementById('settingsExamWeight').value = settings.examWeight || 40;
  document.getElementById('settingsQuizWeight').value = settings.quizWeight || 20;
  document.getElementById('settingsAssignmentWeight').value = settings.assignmentWeight || 40;
  
  updateWeightTotal();
  document.getElementById('assessmentSettingsModal').classList.add('active');
}

function closeAssessmentSettingsModal() {
  document.getElementById('assessmentSettingsModal').classList.remove('active');
}

function updateWeightTotal() {
  const exam = parseInt(document.getElementById('settingsExamWeight').value) || 0;
  const quiz = parseInt(document.getElementById('settingsQuizWeight').value) || 0;
  const assignment = parseInt(document.getElementById('settingsAssignmentWeight').value) || 0;
  
  const total = exam + quiz + assignment;
  const totalSpan = document.getElementById('weightTotal');
  totalSpan.textContent = total;
  totalSpan.style.color = total === 100 ? 'var(--success)' : 'var(--danger)';
}

async function handleAssessmentSettingsSubmit(e) {
  e.preventDefault();
  
  const exam = parseInt(document.getElementById('settingsExamWeight').value) || 0;
  const quiz = parseInt(document.getElementById('settingsQuizWeight').value) || 0;
  const assignment = parseInt(document.getElementById('settingsAssignmentWeight').value) || 0;
  
  if (exam + quiz + assignment !== 100) {
    showToast('Weights must total 100%', 'error');
    return;
  }
  
  academicYearSettings.assessmentSettings = {
    maxExamsPerTerm: parseInt(document.getElementById('settingsMaxExams').value) || 10,
    maxQuizzesPerTerm: parseInt(document.getElementById('settingsMaxQuizzes').value) || 15,
    maxAssignmentsPerTerm: parseInt(document.getElementById('settingsMaxAssignments').value) || 30,
    examWeight: exam,
    quizWeight: quiz,
    assignmentWeight: assignment
  };
  
  await saveAcademicYearSettings();
  
  updateAssessmentSettingsDisplay();
  closeAssessmentSettingsModal();
  showToast('Assessment settings saved successfully', 'success');
}

// Edit Stats Modal
function openEditStatsModal(type) {
  // Use the grade data modal to edit overall stats
  alert(`Edit ${type}: This would open a modal to directly edit the ${type} count. For now, edit via grade data.`);
}

// New Academic Year Modal
function openNewYearModal() {
  const nextYear = new Date().getFullYear() + 1;
  document.getElementById('newYearStart').value = nextYear;
  document.getElementById('newYearEnd').value = nextYear + 1;
  document.getElementById('setAsCurrent').checked = false;
  document.getElementById('newYearModal').classList.add('active');
}

function closeNewYearModal() {
  document.getElementById('newYearModal').classList.remove('active');
}

async function handleNewYearSubmit(e) {
  e.preventDefault();
  
  const startYear = document.getElementById('newYearStart').value;
  const endYear = document.getElementById('newYearEnd').value;
  const setAsCurrent = document.getElementById('setAsCurrent').checked;
  
  const academicYear = `${startYear}-${endYear}`;
  
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    await axios.post(
      `${API_URL}/academic-year`,
      {
        academicYear,
        isCurrent: setAsCurrent,
        numberOfTerms: 6,
        terms: getDefaultSettings().terms,
        assessmentSettings: getDefaultSettings().assessmentSettings
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Add to dropdown
    const filterYear = document.getElementById('filterYear');
    const option = document.createElement('option');
    option.value = academicYear;
    option.textContent = `${startYear} - ${endYear}`;
    filterYear.insertBefore(option, filterYear.firstChild);
    
    if (setAsCurrent) {
      filterYear.value = academicYear;
      await changeAcademicYear();
    }
    
    closeNewYearModal();
    showToast(`Academic year ${academicYear} created successfully`, 'success');
  } catch (error) {
    console.error('Error creating academic year:', error);
    showToast('Failed to create academic year', 'error');
  }
}

// Save academic year settings
async function saveAcademicYearSettings() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  
  try {
    await axios.put(
      `${API_URL}/academic-year/${currentAcademicYear}`,
      academicYearSettings,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (error) {
    console.error('Error saving settings:', error);
    // Settings may not exist yet, try to create
    try {
      await axios.post(
        `${API_URL}/academic-year`,
        { ...academicYearSettings, academicYear: currentAcademicYear },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (createError) {
      console.error('Error creating settings:', createError);
    }
  }
}

// Toast notification
function showToast(message, type = 'info') {
  // Use existing toast function if available
  if (typeof Toast !== 'undefined') {
    if (type === 'success') Toast.success(message);
    else if (type === 'error') Toast.error(message);
    else Toast.info(message);
    return;
  }
  
  // Fallback toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
