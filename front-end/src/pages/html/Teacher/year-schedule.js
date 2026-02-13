// Year Schedule JavaScript
const API_BASE = 'http://localhost:5001/api';

let currentTerm = 0; // 0 = Full Year view
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

// Quiz/Exam classification: quiz type with >50 points = exam, <=50 = quiz
function isExam(item) {
    return item.type === 'quiz' && item.totalPoints > 50;
}
function isQuiz(item) {
    return item.type === 'quiz' && item.totalPoints <= 50;
}
function isAssignment(item) {
    return item.type === 'assignment';
}

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
        // Auto-select best term or full year
        const autoTerm = getCurrentTerm();
        selectTerm(autoTerm);
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
            // Update the year selector if it exists
            const yearSelect = document.getElementById('academicYear');
            if (yearSelect) {
                const options = Array.from(yearSelect.options).map(o => o.value);
                if (!options.includes(currentYear)) {
                    const opt = document.createElement('option');
                    opt.value = currentYear;
                    const [y1, y2] = currentYear.split('-');
                    opt.textContent = `${y1} - ${y2}`;
                    yearSelect.insertBefore(opt, yearSelect.firstChild);
                }
                yearSelect.value = currentYear;
            }
        }
    } catch (error) {
        console.error('Error loading academic year settings:', error);
    }
}

// Get current term based on date, or 0 for full year
function getCurrentTerm() {
    const terms = academicYearSettings?.terms || [];
    const today = new Date();
    
    // First: find term whose date range contains today
    for (const term of terms) {
        const range = getTermDateRange(term);
        if (range && today >= range.start && today <= range.end) {
            return term.termNumber;
        }
    }
    
    // Second: find the closest upcoming term
    let closestTerm = null;
    let closestDiff = Infinity;
    for (const term of terms) {
        const range = getTermDateRange(term);
        if (range) {
            const diffToStart = range.start - today;
            if (diffToStart > 0 && diffToStart < closestDiff) {
                closestDiff = diffToStart;
                closestTerm = term.termNumber;
            }
        }
    }
    if (closestTerm) return closestTerm;
    
    // Third: find the most recent past term
    let mostRecentTerm = null;
    let mostRecentEnd = 0;
    for (const term of terms) {
        const range = getTermDateRange(term);
        if (range && range.end < today && range.end.getTime() > mostRecentEnd) {
            mostRecentEnd = range.end.getTime();
            mostRecentTerm = term.termNumber;
        }
    }
    if (mostRecentTerm) return mostRecentTerm;
    
    // Last fallback: admin setting or full year
    if (academicYearSettings && academicYearSettings.currentTerm) {
        return academicYearSettings.currentTerm;
    }
    return 0; // Full Year
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

// Get full academic year date range
function getFullYearRange() {
    const years = currentYear.split('-').map(Number);
    return {
        start: new Date(years[0], 8, 1),  // Sep 1
        end: new Date(years[1], 7, 31)    // Aug 31
    };
}

// Render term tabs dynamically from admin settings
function renderTermTabs() {
    const container = document.querySelector('.term-tabs');
    if (!container) return;

    const terms = academicYearSettings?.terms || [];
    
    // Always add "Full Year" tab first
    let html = `
        <button class="term-tab" data-term="0" onclick="selectTerm(0)">
            <i class="fas fa-calendar"></i>
            <span>Full Year</span>
            <small>All Terms</small>
        </button>
    `;
    
    if (terms.length > 0) {
        html += terms.map(term => `
            <button class="term-tab" data-term="${term.termNumber}" onclick="selectTerm(${term.termNumber})">
                <i class="fas fa-calendar-week"></i>
                <span>${term.name || 'Term ' + term.termNumber}</span>
                <small>${term.startMonth} - ${term.endMonth}</small>
            </button>
        `).join('');
    }

    container.innerHTML = html;
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
    
    // Load teacher's announcements for year schedule
    try {
        const announcementsRes = await fetch(`${API_BASE}/announcements/year-schedule?academicYear=${currentYear}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (announcementsRes.ok) {
            yearScheduleData = await announcementsRes.json();
            allAnnouncements = yearScheduleData.announcements || [];
            
            console.log('Year schedule loaded:', {
                totalAnnouncements: allAnnouncements.length,
                totals: yearScheduleData.totals,
                grades: Object.keys(yearScheduleData.byGrade || {}),
                quizzes: allAnnouncements.filter(a => isQuiz(a)).length,
                exams: allAnnouncements.filter(a => isExam(a)).length,
                assignments: allAnnouncements.filter(a => isAssignment(a)).length
            });
            
            // Populate grade filter and cards
            populateGradeFilter();
            renderGradeCards();
        } else {
            console.error('Year schedule API error:', announcementsRes.status);
            yearScheduleData = { announcements: [], byGrade: {}, bySubject: {}, totals: {} };
            allAnnouncements = [];
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        yearScheduleData = { announcements: [], byGrade: {}, bySubject: {}, totals: {} };
        allAnnouncements = [];
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
        option.textContent = formatGradeName(grade);
        gradeFilter.appendChild(option);
    });
}

// Format grade name for display
function formatGradeName(grade) {
    if (!grade) return 'Unknown';
    if (grade === 'unassigned') return 'Unassigned';
    if (grade.startsWith('kg')) return 'KG ' + grade.replace('kg', '');
    if (grade.startsWith('grade')) return 'Grade ' + grade.replace('grade', '');
    return grade;
}

// Render grade summary cards
function renderGradeCards() {
    const gradeCards = document.getElementById('gradeCards');
    const byGrade = yearScheduleData.byGrade || {};
    const grades = Object.keys(byGrade).sort();
    
    if (grades.length === 0) {
        gradeCards.innerHTML = '<p style="color: #64748b; padding: 10px;">No grade data available</p>';
        return;
    }
    
    gradeCards.innerHTML = grades.map(grade => {
        const data = byGrade[grade];
        const examCount = data.exams?.length || 0;
        const quizCount = data.quizzes?.length || 0;
        const assignmentCount = data.assignments?.length || 0;
        const isActive = currentGrade === grade;
        
        // Calculate aggregate stats for this grade
        const allItems = [...(data.exams || []), ...(data.quizzes || []), ...(data.assignments || [])];
        const gradedItems = allItems.filter(i => i.avgPercentage !== null && i.avgPercentage !== undefined);
        const avgScore = gradedItems.length > 0 
            ? Math.round(gradedItems.reduce((s, i) => s + i.avgPercentage, 0) / gradedItems.length) 
            : null;
        const totalSubs = allItems.reduce((s, i) => s + (i.submissionCount || 0), 0);
        const totalStudents = allItems.reduce((s, i) => s + (i.totalStudents || 0), 0);
        const subRate = totalStudents > 0 ? Math.round((totalSubs / totalStudents) * 100) : 0;
        
        return `
            <div class="grade-card ${isActive ? 'active' : ''}" onclick="selectGrade('${grade}')">
                <div class="grade-card-header">
                    <i class="fas fa-graduation-cap"></i> ${formatGradeName(grade)}
                </div>
                <div class="grade-card-stats">
                    <div class="grade-stat">
                        <span class="grade-stat-value">${examCount}</span>
                        <span class="grade-stat-label">Exams</span>
                    </div>
                    <div class="grade-stat">
                        <span class="grade-stat-value">${quizCount}</span>
                        <span class="grade-stat-label">Quizzes</span>
                    </div>
                    <div class="grade-stat">
                        <span class="grade-stat-value">${assignmentCount}</span>
                        <span class="grade-stat-label">Tasks</span>
                    </div>
                </div>
                <div class="grade-card-footer" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 0.75em; color: #64748b;">
                    <span>${avgScore !== null ? `Avg: ${avgScore}%` : 'No grades'}</span>
                    <span>Sub: ${subRate}%</span>
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

// Update overview stats (full year totals)
function updateOverviewStats() {
    const filtered = getFilteredAnnouncements();
    const exams = filtered.filter(a => isExam(a));
    const quizzes = filtered.filter(a => isQuiz(a));
    const assignments = filtered.filter(a => isAssignment(a));
    
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
    let startDate, endDate, termLabel;
    
    if (currentTerm === 0) {
        // Full Year view
        const range = getFullYearRange();
        startDate = range.start;
        endDate = range.end;
        termLabel = 'Full Year';
    } else {
        const terms = academicYearSettings?.terms || [];
        const term = terms.find(t => t.termNumber === currentTerm);
        if (!term) {
            document.getElementById('termTitle').textContent = `Term ${currentTerm}: No data`;
            document.getElementById('termProgress').style.width = '0%';
            document.getElementById('termProgressPercent').textContent = '0%';
            return;
        }

        const range = getTermDateRange(term);
        startDate = range ? range.start : new Date();
        endDate = range ? range.end : new Date();
        termLabel = term.name || 'Term ' + currentTerm;
    }
    
    // Build label from month names
    const startLabel = monthNames[startDate.getMonth()];
    const endLabel = monthNames[endDate.getMonth()];

    // Update header
    const gradeLabel = currentGrade === 'all' ? 'All Grades' : formatGradeName(currentGrade);
    document.getElementById('termTitle').textContent = `${termLabel}: ${startLabel} ${startDate.getFullYear()} - ${endLabel} ${endDate.getFullYear()} (${gradeLabel})`;
    
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
    
    // Filter data for this period (using filtered announcements)
    const filtered = getFilteredAnnouncements();
    const termAnnouncements = filtered.filter(a => {
        const dueDate = new Date(a.dueDate || a.createdAt);
        return dueDate >= startDate && dueDate <= endDate;
    });
    
    // Separate by type using consistent classification
    const exams = termAnnouncements.filter(a => isExam(a));
    const quizzes = termAnnouncements.filter(a => isQuiz(a));
    const assignments = termAnnouncements.filter(a => isAssignment(a));
    
    // Update section counts
    document.getElementById('termExamsCount').textContent = exams.length;
    document.getElementById('termQuizzesCount').textContent = quizzes.length;
    document.getElementById('termAssignmentsCount').textContent = assignments.length;
    
    // Update all sections
    updateExamsSection(exams);
    updateQuizzesSection(quizzes);
    updateAssignmentsSection(assignments);
    updateAttendanceSection(startDate, endDate);
    updateCharts(exams, quizzes, assignments, startDate, endDate);
    updateDeadlines(termAnnouncements);
}

// Update exams section
function updateExamsSection(exams) {
    const now = new Date();
    const pending = exams.filter(e => new Date(e.dueDate) > now || (e.gradedCount < e.totalStudents && e.totalStudents > 0));
    const completed = exams.filter(e => new Date(e.dueDate) <= now && (e.gradedCount >= e.totalStudents || e.totalStudents === 0));
    
    document.getElementById('examsPending').textContent = pending.length;
    document.getElementById('examsCompleted').textContent = completed.length;
    document.getElementById('examsAvgScore').textContent = calculateAvgScore(exams);
    
    const listHtml = exams.length ? exams.map(item => createItemHtml(item)).join('') : `
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
    const pending = quizzes.filter(q => new Date(q.dueDate) > now || (q.gradedCount < q.totalStudents && q.totalStudents > 0));
    const completed = quizzes.filter(q => new Date(q.dueDate) <= now && (q.gradedCount >= q.totalStudents || q.totalStudents === 0));
    
    document.getElementById('quizzesPending').textContent = pending.length;
    document.getElementById('quizzesCompleted').textContent = completed.length;
    document.getElementById('quizzesAvgScore').textContent = calculateAvgScore(quizzes);
    
    const listHtml = quizzes.length ? quizzes.map(item => createItemHtml(item)).join('') : `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>No quizzes scheduled</p>
        </div>
    `;
    
    document.getElementById('quizzesList').innerHTML = listHtml;
}

// Create HTML for an exam/quiz/assignment list item
function createItemHtml(item) {
    const now = new Date();
    const isPast = new Date(item.dueDate) <= now;
    const hasGrades = item.gradedCount > 0;
    const isFullyGraded = item.gradedCount >= item.totalStudents && item.totalStudents > 0;
    
    let statusClass, statusLabel;
    if (isFullyGraded) {
        statusClass = 'status-completed';
        statusLabel = 'Done';
    } else if (isPast && hasGrades) {
        statusClass = 'status-grading';
        statusLabel = `Grading (${item.gradedCount}/${item.totalStudents})`;
    } else if (isPast) {
        statusClass = 'status-completed';
        statusLabel = 'Done';
    } else {
        statusClass = 'status-pending';
        statusLabel = 'Upcoming';
    }
    
    const avgDisplay = item.avgPercentage !== null && item.avgPercentage !== undefined
        ? `<span class="item-avg">Avg: ${item.avgPercentage}%</span>` : '';
    const submissionDisplay = item.totalStudents > 0 
        ? `<span class="item-submissions">${item.submissionCount}/${item.totalStudents} submitted</span>` : '';
    
    return `
    <div class="list-item">
        <div class="item-info">
            <span class="item-title">${item.title}</span>
            <span class="item-meta">
                <i class="fas fa-book"></i> ${item.subject}
                <i class="fas fa-star"></i> ${item.totalPoints} pts
                <i class="fas fa-calendar"></i> ${formatDate(item.dueDate)}
                ${submissionDisplay}
                ${avgDisplay}
            </span>
        </div>
        <span class="item-status ${statusClass}">
            ${statusLabel}
        </span>
    </div>
    `;
}

// Update assignments section  
function updateAssignmentsSection(assignments) {
    const now = new Date();
    const pending = assignments.filter(a => new Date(a.dueDate) > now);
    const completed = assignments.filter(a => new Date(a.dueDate) <= now);
    
    // Calculate submission rate from actual data
    let totalSubmissions = 0;
    let totalExpected = 0;
    assignments.forEach(a => {
        totalSubmissions += (a.submissionCount || 0);
        totalExpected += (a.totalStudents || 0);
    });
    const submissionRate = totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
    
    document.getElementById('assignmentsPending').textContent = pending.length;
    document.getElementById('assignmentsCompleted').textContent = completed.length;
    document.getElementById('assignmentsSubmission').textContent = `${submissionRate}%`;
    
    const listHtml = assignments.length ? assignments.map(assignment => {
        const subRate = assignment.totalStudents > 0 
            ? Math.round((assignment.submissionCount / assignment.totalStudents) * 100) 
            : 0;
        const avgDisplay = assignment.avgPercentage !== null && assignment.avgPercentage !== undefined
            ? `<span class="item-avg">Avg: ${assignment.avgPercentage}%</span>` 
            : '';
        const submissionDisplay = assignment.totalStudents > 0 
            ? `<span class="item-submissions">${assignment.submissionCount}/${assignment.totalStudents} (${subRate}%)</span>` 
            : '';
        
        return `
        <div class="list-item">
            <div class="item-info">
                <span class="item-title">${assignment.title}</span>
                <span class="item-meta">
                    <i class="fas fa-book"></i> ${assignment.subject}
                    <i class="fas fa-calendar"></i> ${formatDate(assignment.dueDate)}
                    ${submissionDisplay}
                    ${avgDisplay}
                </span>
            </div>
            <span class="item-status ${getAssignmentStatus(assignment)}">
                ${getAssignmentStatusLabel(assignment)}
            </span>
        </div>
    `;
    }).join('') : `
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
        return 'status-overdue';
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
    document.getElementById('termAttendanceRate').textContent = `${rate || 0}%`;
    
    createAttendanceChart(present, absent, late);
}

// Create attendance chart
function createAttendanceChart(present, absent, late) {
    const ctx = document.getElementById('termAttendanceChart');
    if (!ctx) return;
    
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    const total = present + absent + late;
    if (total === 0) {
        attendanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'], borderWidth: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'No attendance data', color: '#94a3b8', font: { size: 12 } }
                },
                cutout: '65%'
            }
        });
        return;
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
                    labels: { padding: 15, usePointStyle: true }
                }
            },
            cutout: '65%'
        }
    });
}

// Update charts
function updateCharts(exams, quizzes, assignments, startDate, endDate) {
    createPerformanceChart(exams, quizzes, assignments, startDate, endDate);
    createSubjectChart([...exams, ...quizzes, ...assignments]);
}

// Create performance chart - shows items by month with avg scores
function createPerformanceChart(exams, quizzes, assignments, startDate, endDate) {
    const ctx = document.getElementById('performanceChart');
    if (!ctx) return;
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    if (exams.length === 0 && quizzes.length === 0 && assignments.length === 0) {
        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: '#e2e8f0' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'No assessment data for this period', color: '#94a3b8', font: { size: 14 } }
                },
                scales: { y: { display: false }, x: { display: false } }
            }
        });
        return;
    }
    
    // Generate monthly labels for the date range
    const labels = [];
    const examScores = [];
    const quizScores = [];
    const assignmentScores = [];
    const examCounts = [];
    const quizCounts = [];
    const assignmentCounts = [];
    
    let monthDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (monthDate <= endMonth) {
        const m = monthDate.getMonth();
        const y = monthDate.getFullYear();
        labels.push(monthNames[m].slice(0, 3) + ' ' + y);
        
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);
        
        const filterByMonth = (items) => items.filter(i => {
            const d = new Date(i.dueDate || i.createdAt);
            return d >= monthStart && d <= monthEnd;
        });
        
        const calcAvg = (items) => {
            const graded = items.filter(i => i.avgPercentage !== null && i.avgPercentage !== undefined);
            return graded.length > 0 ? Math.round(graded.reduce((s, i) => s + i.avgPercentage, 0) / graded.length) : null;
        };
        
        const mExams = filterByMonth(exams);
        const mQuizzes = filterByMonth(quizzes);
        const mAssignments = filterByMonth(assignments);
        
        examScores.push(calcAvg(mExams));
        quizScores.push(calcAvg(mQuizzes));
        assignmentScores.push(calcAvg(mAssignments));
        examCounts.push(mExams.length);
        quizCounts.push(mQuizzes.length);
        assignmentCounts.push(mAssignments.length);
        
        monthDate = new Date(y, m + 1, 1);
    }
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Exams Avg %',
                    data: examScores,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true, tension: 0.4, spanGaps: true,
                    pointRadius: 5, pointHoverRadius: 7
                },
                {
                    label: 'Quizzes Avg %',
                    data: quizScores,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true, tension: 0.4, spanGaps: true,
                    pointRadius: 5, pointHoverRadius: 7
                },
                {
                    label: 'Assignments Avg %',
                    data: assignmentScores,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true, tension: 0.4, spanGaps: true,
                    pointRadius: 5, pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const val = context.raw;
                            const type = context.dataset.label;
                            let count = 0;
                            if (type.includes('Exam')) count = examCounts[idx];
                            else if (type.includes('Quiz')) count = quizCounts[idx];
                            else count = assignmentCounts[idx];
                            if (val === null) return `${type}: No graded items (${count} total)`;
                            return `${type}: ${val}% (${count} items)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        callback: function(value) { return value + '%'; }
                    },
                    title: { display: true, text: 'Average Score %' }
                }
            }
        }
    });
}

// Create subject chart
function createSubjectChart(items) {
    const ctx = document.getElementById('subjectChart');
    if (!ctx) return;
    
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    if (items.length === 0) {
        subjectChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['No Data'], datasets: [{ data: [0], backgroundColor: '#e2e8f0' }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'No subject data for this period', color: '#94a3b8', font: { size: 14 } }
                },
                scales: { y: { display: false }, x: { display: false } }
            }
        });
        return;
    }
    
    // Group by subject with stats
    const subjectData = {};
    items.forEach(item => {
        if (!subjectData[item.subject]) {
            subjectData[item.subject] = { count: 0, totalAvg: 0, gradedCount: 0, submissions: 0, totalStudents: 0 };
        }
        subjectData[item.subject].count++;
        subjectData[item.subject].submissions += (item.submissionCount || 0);
        subjectData[item.subject].totalStudents += (item.totalStudents || 0);
        if (item.avgPercentage !== null && item.avgPercentage !== undefined) {
            subjectData[item.subject].totalAvg += item.avgPercentage;
            subjectData[item.subject].gradedCount++;
        }
    });
    
    const subjects = Object.keys(subjectData);
    const avgScores = subjects.map(s => {
        const d = subjectData[s];
        return d.gradedCount > 0 ? Math.round(d.totalAvg / d.gradedCount) : 0;
    });
    const submissionRates = subjects.map(s => {
        const d = subjectData[s];
        return d.totalStudents > 0 ? Math.round((d.submissions / d.totalStudents) * 100) : 0;
    });
    
    const colors = [
        '#1e88e5', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#00bcd4', '#009688', '#4caf50',
        '#ff9800', '#ff5722', '#795548', '#607d8b'
    ];
    
    subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [
                {
                    label: 'Avg Score %',
                    data: avgScores,
                    backgroundColor: colors.slice(0, subjects.length).map(c => c + 'cc'),
                    borderColor: colors.slice(0, subjects.length),
                    borderWidth: 1, borderRadius: 8, order: 1
                },
                {
                    label: 'Submission Rate %',
                    data: submissionRates,
                    backgroundColor: colors.slice(0, subjects.length).map(c => c + '44'),
                    borderColor: colors.slice(0, subjects.length),
                    borderWidth: 1, borderRadius: 8, order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const subj = context[0].label;
                            const d = subjectData[subj];
                            return [
                                `Items: ${d.count}`,
                                `Submissions: ${d.submissions}/${d.totalStudents}`,
                                `Graded items: ${d.gradedCount}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: function(value) { return value + '%'; } }
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
        const typeClass = isExam(item) ? 'type-exam' : (isQuiz(item) ? 'type-quiz' : 'type-assignment');
        const typeLabel = isExam(item) ? 'Exam' : (isQuiz(item) ? 'Quiz' : 'Assignment');
        const subRate = item.totalStudents > 0
            ? `${item.submissionCount}/${item.totalStudents} submitted`
            : '';
        
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
                        ${subRate ? `<span><i class="fas fa-users"></i> ${subRate}</span>` : ''}
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

// Calculate average score from real submission data
function calculateAvgScore(items) {
    if (!items.length) return '-';
    const withGrades = items.filter(i => i.avgPercentage !== null && i.avgPercentage !== undefined);
    if (withGrades.length === 0) return '-';
    const avg = Math.round(withGrades.reduce((sum, i) => sum + i.avgPercentage, 0) / withGrades.length);
    return `${avg}%`;
}

// Format date
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Change academic year
async function changeAcademicYear() {
    currentYear = document.getElementById('academicYear').value;
    document.getElementById('welcomeMessage').textContent = 
        `Welcome, ${teacherData.name} | Academic Year ${currentYear}`;
    
    showLoading(true);
    try {
        await loadAcademicYearSettings();
        await loadYearData();
        renderTermTabs();
        updateOverviewStats();
        const autoTerm = getCurrentTerm();
        selectTerm(autoTerm);
    } catch (error) {
        console.error('Error reloading data for year:', error);
        showToast('Error loading data for selected year', 'error');
    } finally {
        showLoading(false);
    }
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
