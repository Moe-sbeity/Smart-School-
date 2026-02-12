// Year Schedule JavaScript
const API_BASE = 'http://localhost:5001/api';

let currentTerm = 1;
let currentYear = '2025-2026';
let currentGrade = 'all';
let teacherData = null;
let yearScheduleData = null;
let allAnnouncements = [];
let allAttendance = [];
let performanceChart = null;
let subjectChart = null;
let attendanceChart = null;
let academicYearSettings = null;

// Month name to number mapping (supports both full and abbreviated names)
const monthMap = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
    'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11,
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

// Month full names
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    showLoading(true);
    
    try {
        await loadTeacherData();
        await loadAcademicYearSettings();
        await loadYearData();
        renderTermTabs();
        updateOverviewStats();
        selectTerm(getCurrentTerm());
    } catch (error) {
        console.error('Error initializing:', error);
        showToast('Error loading data', 'error');
    } finally {
        showLoading(false);
    }

    // Logout handler
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    });
});

// Load academic year settings from admin API
async function loadAcademicYearSettings() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/academic-year/current`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            academicYearSettings = data.settings || data;
            currentYear = academicYearSettings.academicYear || currentYear;
        }
    } catch (error) {
        console.error('Error loading academic year settings:', error);
    }
}

// Get current term based on admin settings
function getCurrentTerm() {
    // Use the currentTerm from admin settings if available
    if (academicYearSettings && academicYearSettings.currentTerm) {
        return academicYearSettings.currentTerm;
    }
    // Fallback: find term whose date range contains today
    const terms = academicYearSettings?.terms || [];
    const today = new Date();
    for (const term of terms) {
        const range = getTermDateRange(term);
        if (range && today >= range.start && today <= range.end) {
            return term.termNumber;
        }
    }
    return 1;
}

// Get term date range from term data
function getTermDateRange(term) {
    if (!term) return null;

    // If term has explicit startDate/endDate
    if (term.startDate && term.endDate) {
        return { start: new Date(term.startDate), end: new Date(term.endDate) };
    }

    // Derive from startMonth/endMonth and academic year
    const years = currentYear.split('-').map(Number);
    const startMonthIdx = monthMap[term.startMonth];
    const endMonthIdx = monthMap[term.endMonth];
    if (startMonthIdx === undefined || endMonthIdx === undefined) return null;

    // Sep-Aug spans two calendar years
    const startYear = startMonthIdx >= 8 ? years[0] : years[1]; // Sep+ = first year
    const endYear = endMonthIdx >= 8 ? years[0] : years[1];

    const start = new Date(startYear, startMonthIdx, 1);
    const end = new Date(endYear, endMonthIdx + 1, 0); // last day of end month
    return { start, end };
}

// Render term tabs dynamically from admin settings
function renderTermTabs() {
    const container = document.querySelector('.term-tabs');
    if (!container) return;

    const terms = academicYearSettings?.terms || [];
    if (terms.length === 0) {
        container.innerHTML = '<p style="color: #64748b; padding: 10px;">No terms configured.</p>';
        return;
    }

    container.innerHTML = terms.map(term => `
        <button class="term-tab" data-term="${term.termNumber}" onclick="selectTerm(${term.termNumber})">
            <i class="fas fa-calendar-week"></i>
            <span>${term.name || 'Term ' + term.termNumber}</span>
            <small>${term.startMonth} - ${term.endMonth}</small>
        </button>
    `).join('');
}

// Load teacher data
async function loadTeacherData() {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to load profile');
    
    const data = await response.json();
    teacherData = data.user;
    document.getElementById('welcomeMessage').textContent = 
        `Welcome, ${teacherData.name} | Academic Year ${currentYear}`;
}

// Load all year data
async function loadYearData() {
    const token = localStorage.getItem('token');
    
    // Load school-wide announcements for year schedule
    try {
        const announcementsRes = await fetch(`${API_BASE}/announcements/year-schedule?academicYear=${currentYear}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (announcementsRes.ok) {
            yearScheduleData = await announcementsRes.json();
            allAnnouncements = yearScheduleData.announcements || [];
            
            // Populate grade filter and cards
            populateGradeFilter();
            renderGradeCards();
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
    
    // Load attendance data
    try {
        const attendanceRes = await fetch(`${API_BASE}/attendance/teacher-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (attendanceRes.ok) {
            allAttendance = await attendanceRes.json();
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

// Populate grade filter dropdown
function populateGradeFilter() {
    const gradeFilter = document.getElementById('gradeFilter');
    const grades = Object.keys(yearScheduleData.byGrade || {}).sort();
    
    gradeFilter.innerHTML = '<option value="all" selected>All Grades</option>';
    grades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeFilter.appendChild(option);
    });
}

// Render grade summary cards
function renderGradeCards() {
    const gradeCards = document.getElementById('gradeCards');
    const byGrade = yearScheduleData.byGrade || {};
    const grades = Object.keys(byGrade).sort();
    
    if (grades.length === 0) {
        gradeCards.innerHTML = '<p style="color: #64748b;">No grade data available</p>';
        return;
    }
    
    gradeCards.innerHTML = grades.map(grade => {
        const data = byGrade[grade];
        const exams = data.exams?.length || 0;
        const quizzes = data.quizzes?.length || 0;
        const assignments = data.assignments?.length || 0;
        const isActive = currentGrade === grade;
        
        return `
            <div class="grade-card ${isActive ? 'active' : ''}" onclick="selectGrade('${grade}')">
                <div class="grade-card-header">
                    <i class="fas fa-graduation-cap"></i> ${grade}
                </div>
                <div class="grade-card-stats">
                    <div class="grade-stat">
                        <span class="grade-stat-value">${exams}</span>
                        <span class="grade-stat-label">Exams</span>
                    </div>
                    <div class="grade-stat">
                        <span class="grade-stat-value">${quizzes}</span>
                        <span class="grade-stat-label">Quizzes</span>
                    </div>
                    <div class="grade-stat">
                        <span class="grade-stat-value">${assignments}</span>
                        <span class="grade-stat-label">Tasks</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Select a grade from cards
function selectGrade(grade) {
    currentGrade = grade;
    document.getElementById('gradeFilter').value = grade;
    renderGradeCards();
    updateOverviewStats();
    updateTermContent();
}

// Change grade filter
function changeGradeFilter() {
    currentGrade = document.getElementById('gradeFilter').value;
    renderGradeCards();
    updateOverviewStats();
    updateTermContent();
}

// Get filtered announcements based on selected grade
function getFilteredAnnouncements() {
    if (currentGrade === 'all') {
        return allAnnouncements;
    }
    return allAnnouncements.filter(a => 
        a.targetGrades && a.targetGrades.includes(currentGrade)
    );
}

// Update overview stats
function updateOverviewStats() {
    const filtered = getFilteredAnnouncements();
    // Note: In this system, quizzes and exams are both stored as "quiz" type
    // We'll treat high-point quizzes (>= 50 points) as "exams"
    const exams = filtered.filter(a => a.type === 'quiz' && a.totalPoints >= 50);
    const quizzes = filtered.filter(a => a.type === 'quiz' && a.totalPoints < 50);
    const assignments = filtered.filter(a => a.type === 'assignment');
    
    document.getElementById('totalExams').textContent = exams.length;
    document.getElementById('totalQuizzes').textContent = quizzes.length;
    document.getElementById('totalAssignments').textContent = assignments.length;
    
    // Calculate average attendance if available
    if (allAttendance && allAttendance.presentRate !== undefined) {
        document.getElementById('avgAttendance').textContent = 
            `${Math.round(allAttendance.presentRate || 0)}%`;
    } else {
        document.getElementById('avgAttendance').textContent = '-';
    }
}

// Select term
function selectTerm(termNumber) {
    currentTerm = termNumber;
    
    // Update tab states
    document.querySelectorAll('.term-tab').forEach(tab => {
        tab.classList.remove('active');
        if (parseInt(tab.dataset.term) === termNumber) {
            tab.classList.add('active');
        }
    });
    
    // Update term content
    updateTermContent();
}

// Update term content
function updateTermContent() {
    const terms = academicYearSettings?.terms || [];
    const term = terms.find(t => t.termNumber === currentTerm);
    if (!term) {
        document.getElementById('termTitle').textContent = `Term ${currentTerm}: No data`;
        document.getElementById('termProgress').style.width = '0%';
        document.getElementById('termProgressPercent').textContent = '0%';
        return;
    }

    const range = getTermDateRange(term);
    const startDate = range ? range.start : new Date();
    const endDate = range ? range.end : new Date();
    
    // Build label from month names
    const startLabel = monthNames[startDate.getMonth()];
    const endLabel = monthNames[endDate.getMonth()];
    const yearLabel = endDate.getFullYear();

    // Update header
    const gradeLabel = currentGrade === 'all' ? 'All Grades' : currentGrade;
    document.getElementById('termTitle').textContent = `${term.name || 'Term ' + currentTerm}: ${startLabel} - ${endLabel} ${yearLabel} (${gradeLabel})`;
    
    // Calculate progress
    const today = new Date();
    let progress = 0;
    if (today >= startDate && today <= endDate) {
        const total = endDate - startDate;
        const elapsed = today - startDate;
        progress = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    } else if (today > endDate) {
        progress = 100;
    }
    
    document.getElementById('termProgress').style.width = `${progress}%`;
    document.getElementById('termProgressPercent').textContent = `${progress}%`;
    
    // Filter data for this term (using filtered announcements)
    const filtered = getFilteredAnnouncements();
    const termAnnouncements = filtered.filter(a => {
        const dueDate = new Date(a.dueDate || a.createdAt);
        return dueDate >= startDate && dueDate <= endDate;
    });
    
    // Separate by type
    const exams = termAnnouncements.filter(a => a.type === 'quiz' && a.totalPoints >= 50);
    const quizzes = termAnnouncements.filter(a => a.type === 'quiz' && a.totalPoints < 50);
    const assignments = termAnnouncements.filter(a => a.type === 'assignment');
    
    // Update section counts
    document.getElementById('termExamsCount').textContent = exams.length;
    document.getElementById('termQuizzesCount').textContent = quizzes.length;
    document.getElementById('termAssignmentsCount').textContent = assignments.length;
    
    // Update exams section
    updateExamsSection(exams);
    
    // Update quizzes section
    updateQuizzesSection(quizzes);
    
    // Update assignments section
    updateAssignmentsSection(assignments);
    
    // Update attendance section
    updateAttendanceSection(startDate, endDate);
    
    // Update charts
    updateCharts(exams, quizzes, assignments);
    
    // Update deadlines
    updateDeadlines(termAnnouncements);
}

// Update exams section
function updateExamsSection(exams) {
    const now = new Date();
    const pending = exams.filter(e => new Date(e.dueDate) > now);
    const completed = exams.filter(e => new Date(e.dueDate) <= now);
    
    document.getElementById('examsPending').textContent = pending.length;
    document.getElementById('examsCompleted').textContent = completed.length;
    document.getElementById('examsAvgScore').textContent = calculateAvgScore(exams);
    
    const listHtml = exams.length ? exams.map(exam => `
        <div class="list-item">
            <div class="item-info">
                <span class="item-title">${exam.title}</span>
                <span class="item-meta">
                    <i class="fas fa-book"></i> ${exam.subject}
                    <i class="fas fa-star"></i> ${exam.totalPoints} pts
                </span>
            </div>
            <span class="item-status ${new Date(exam.dueDate) > now ? 'status-pending' : 'status-completed'}">
                ${new Date(exam.dueDate) > now ? 'Upcoming' : 'Done'}
            </span>
        </div>
    `).join('') : `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No exams scheduled</p>
        </div>
    `;
    
    document.getElementById('examsList').innerHTML = listHtml;
}

// Update quizzes section
function updateQuizzesSection(quizzes) {
    const now = new Date();
    const pending = quizzes.filter(q => new Date(q.dueDate) > now);
    const completed = quizzes.filter(q => new Date(q.dueDate) <= now);
    
    document.getElementById('quizzesPending').textContent = pending.length;
    document.getElementById('quizzesCompleted').textContent = completed.length;
    document.getElementById('quizzesAvgScore').textContent = calculateAvgScore(quizzes);
    
    const listHtml = quizzes.length ? quizzes.map(quiz => `
        <div class="list-item">
            <div class="item-info">
                <span class="item-title">${quiz.title}</span>
                <span class="item-meta">
                    <i class="fas fa-book"></i> ${quiz.subject}
                    <i class="fas fa-star"></i> ${quiz.totalPoints} pts
                </span>
            </div>
            <span class="item-status ${new Date(quiz.dueDate) > now ? 'status-pending' : 'status-completed'}">
                ${new Date(quiz.dueDate) > now ? 'Upcoming' : 'Done'}
            </span>
        </div>
    `).join('') : `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No quizzes scheduled</p>
        </div>
    `;
    
    document.getElementById('quizzesList').innerHTML = listHtml;
}

// Update assignments section  
function updateAssignmentsSection(assignments) {
    const now = new Date();
    const pending = assignments.filter(a => new Date(a.dueDate) > now);
    const completed = assignments.filter(a => new Date(a.dueDate) <= now);
    
    // Calculate submission rate
    let totalSubmissions = 0;
    let totalExpected = 0;
    assignments.forEach(a => {
        totalExpected += (a.targetStudents?.length || 0);
        // Count submissions from viewedBy as proxy (or actual submissions if available)
    });
    const submissionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
    
    document.getElementById('assignmentsPending').textContent = pending.length;
    document.getElementById('assignmentsCompleted').textContent = completed.length;
    document.getElementById('assignmentsSubmission').textContent = `${submissionRate}%`;
    
    const listHtml = assignments.length ? assignments.map(assignment => `
        <div class="list-item">
            <div class="item-info">
                <span class="item-title">${assignment.title}</span>
                <span class="item-meta">
                    <i class="fas fa-book"></i> ${assignment.subject}
                    <i class="fas fa-calendar"></i> ${formatDate(assignment.dueDate)}
                </span>
            </div>
            <span class="item-status ${getAssignmentStatus(assignment)}">
                ${getAssignmentStatusLabel(assignment)}
            </span>
        </div>
    `).join('') : `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No assignments posted</p>
        </div>
    `;
    
    document.getElementById('assignmentsList').innerHTML = listHtml;
}

// Get assignment status
function getAssignmentStatus(assignment) {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (dueDate < now) {
        return 'status-completed';
    } else if ((dueDate - now) / (1000 * 60 * 60 * 24) <= 3) {
        return 'status-overdue'; // Using overdue styling for "due soon"
    }
    return 'status-pending';
}

function getAssignmentStatusLabel(assignment) {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (dueDate < now) {
        return 'Closed';
    } else if ((dueDate - now) / (1000 * 60 * 60 * 24) <= 3) {
        return 'Due Soon';
    }
    return 'Open';
}

// Update attendance section
function updateAttendanceSection(startDate, endDate) {
    // Filter attendance for this term (allAttendance.records is the array)
    let termAttendance = [];
    if (allAttendance && Array.isArray(allAttendance.records)) {
        termAttendance = allAttendance.records.filter(a => {
            const date = new Date(a.date);
            return date >= startDate && date <= endDate;
        });
    }
    
    const present = termAttendance.filter(a => a.status === 'present').length;
    const absent = termAttendance.filter(a => a.status === 'absent').length;
    const late = termAttendance.filter(a => a.status === 'late').length;
    const total = present + absent + late;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    
    document.getElementById('attendancePresent').textContent = present || '-';
    document.getElementById('attendanceAbsent').textContent = absent || '-';
    document.getElementById('attendanceLate').textContent = late || '-';
    document.getElementById('termAttendanceRate').textContent = `${rate || 85}%`;
    
    // Create attendance pie chart
    createAttendanceChart(present || 70, absent || 15, late || 15);
}

// Create attendance chart
function createAttendanceChart(present, absent, late) {
    const ctx = document.getElementById('termAttendanceChart');
    
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    attendanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'Late'],
            datasets: [{
                data: [present, absent, late],
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Update charts
function updateCharts(exams, quizzes, assignments) {
    // Performance chart
    createPerformanceChart(exams, quizzes, assignments);
    
    // Subject distribution chart
    createSubjectChart([...exams, ...quizzes, ...assignments]);
}

// Create performance chart
function createPerformanceChart(exams, quizzes, assignments) {
    const ctx = document.getElementById('performanceChart');
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const terms = academicYearSettings?.terms || [];
    const currentTermObj = terms.find(t => t.termNumber === currentTerm);
    const termRange = getTermDateRange(currentTermObj);
    const startDate = termRange ? termRange.start : new Date();
    
    // Generate weekly labels
    const weeks = [];
    const examData = [];
    const quizData = [];
    const assignmentData = [];
    
    for (let i = 0; i < 8; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (i * 7));
        weeks.push(`Week ${i + 1}`);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        // Count items per week
        examData.push(exams.filter(e => {
            const date = new Date(e.dueDate || e.createdAt);
            return date >= weekStart && date < weekEnd;
        }).length);
        
        quizData.push(quizzes.filter(q => {
            const date = new Date(q.dueDate || q.createdAt);
            return date >= weekStart && date < weekEnd;
        }).length);
        
        assignmentData.push(assignments.filter(a => {
            const date = new Date(a.dueDate || a.createdAt);
            return date >= weekStart && date < weekEnd;
        }).length);
    }
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: [
                {
                    label: 'Exams',
                    data: examData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Quizzes',
                    data: quizData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Assignments',
                    data: assignmentData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Create subject chart
function createSubjectChart(items) {
    const ctx = document.getElementById('subjectChart');
    
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    // Group by subject
    const subjectCounts = {};
    items.forEach(item => {
        subjectCounts[item.subject] = (subjectCounts[item.subject] || 0) + 1;
    });
    
    const subjects = Object.keys(subjectCounts);
    const counts = Object.values(subjectCounts);
    
    const colors = [
        '#1e88e5', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#00bcd4', '#009688', '#4caf50',
        '#ff9800', '#ff5722', '#795548', '#607d8b'
    ];
    
    subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [{
                label: 'Items',
                data: counts,
                backgroundColor: colors.slice(0, subjects.length),
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Update deadlines
function updateDeadlines(termAnnouncements) {
    const now = new Date();
    const upcoming = termAnnouncements
        .filter(a => new Date(a.dueDate) > now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 10);
    
    document.getElementById('upcomingCount').textContent = `${upcoming.length} items`;
    
    const listHtml = upcoming.length ? upcoming.map(item => {
        const dueDate = new Date(item.dueDate);
        const isExam = item.type === 'quiz' && item.totalPoints >= 50;
        const typeClass = isExam ? 'type-exam' : (item.type === 'quiz' ? 'type-quiz' : 'type-assignment');
        const typeLabel = isExam ? 'Exam' : (item.type === 'quiz' ? 'Quiz' : 'Assignment');
        
        return `
            <div class="deadline-item">
                <div class="deadline-date">
                    <span class="day">${dueDate.getDate()}</span>
                    <span class="month">${dueDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                </div>
                <div class="deadline-info">
                    <div class="deadline-title">${item.title}</div>
                    <div class="deadline-details">
                        <span><i class="fas fa-book"></i> ${item.subject}</span>
                        <span><i class="fas fa-star"></i> ${item.totalPoints} pts</span>
                    </div>
                </div>
                <span class="deadline-type ${typeClass}">${typeLabel}</span>
            </div>
        `;
    }).join('') : `
        <div class="empty-state">
            <i class="fas fa-calendar-check"></i>
            <p>No upcoming deadlines</p>
        </div>
    `;
    
    document.getElementById('deadlinesList').innerHTML = listHtml;
}

// Calculate average score
function calculateAvgScore(items) {
    if (!items.length) return '-';
    // This would require submission data with grades
    // For now, return placeholder
    return '-';
}

// Format date
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Change academic year
function changeAcademicYear() {
    currentYear = document.getElementById('academicYear').value;
    document.getElementById('welcomeMessage').textContent = 
        `Welcome, ${teacherData.name} | Academic Year ${currentYear}`;
    
    updateTermContent();
}

// Show/hide loading
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

// Toast notification (fallback if not loaded)
function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof Toast !== 'undefined') {
        if (type === 'error') Toast.error(message);
        else if (type === 'success') Toast.success(message);
        else Toast.info(message);
    } else {
        // Fallback: use confirm modal as info dialog
        showConfirmModal({
            title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
            message: message,
            confirmText: 'OK',
            cancelText: '',
            type: type === 'error' ? 'danger' : type === 'success' ? 'info' : 'info',
            icon: type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'
        });
    }
}
