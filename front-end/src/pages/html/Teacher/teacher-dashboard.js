const API_URL = 'http://localhost:5001/api';
let currentTeacher = null;
let allSchedulesData = [];
let adminAnnouncements = [];

const getToken = () => localStorage.getItem('token');

async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
        const error = await response.json();
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            window.location.href = '../login.html';
        }
        throw new Error(error.message || 'API request failed');
    }

    return response.json();
}

function showError(message) {
    const errorContainer = document.getElementById('scheduleContainer');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error" style="padding: 20px; text-align: center; color: #dc2626;">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
    }
}

function getDayOfWeek() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
}

function formatDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

async function loadTeacherData() {
    try {
        const data = await apiCall('/users/me');
        currentTeacher = data.user;

        if (currentTeacher.role !== 'teacher') {
            showError('Access denied. This dashboard is for teachers only.');
            return;
        }

        document.getElementById('welcomeMessage').textContent = 
            `Welcome back, ${currentTeacher.name}! 👋`;
        document.getElementById('todayDate').textContent = formatDate();

        if (currentTeacher.subjects && currentTeacher.subjects.length > 0) {
            document.getElementById('subjects').textContent = currentTeacher.subjects.length;
        }

        await loadSchedule();
        await loadTodaySummary();
        await loadCharts();
        await loadAdminAnnouncements();

    } catch (error) {
        console.error('Error loading teacher data:', error);
        showError('Failed to load teacher data. Please try logging in again.');
    }
}

async function loadSchedule() {
    try {
        const data = await apiCall(`/schedules/teacher/${currentTeacher._id}`);
        
        // NEW: Handle the grouped schedule structure
        let schedules = [];
        if (data.schedules) {
            // Convert grouped schedules {dayOfWeek: [schedules]} to flat array
            Object.entries(data.schedules).forEach(([dayOfWeek, daySchedules]) => {
                daySchedules.forEach(schedule => {
                    schedules.push({
                        ...schedule,
                        dayOfWeek: dayOfWeek
                    });
                });
            });
        }
        
        allSchedulesData = schedules;

        // Update stats
        document.getElementById('totalClasses').textContent = schedules.length;
        
        // Calculate total unique students across all schedules
        const uniqueStudents = new Set();
        schedules.forEach(schedule => {
            if (schedule.students) {
                if (Array.isArray(schedule.students)) {
                    schedule.students.forEach(s => {
                        if (s && s._id) uniqueStudents.add(s._id);
                    });
                } else if (schedule.students._id) {
                    uniqueStudents.add(schedule.students._id);
                }
            }
        });
        document.getElementById('totalStudents').textContent = uniqueStudents.size;

        const today = getDayOfWeek();
        const todaySchedules = schedules.filter(s => s.dayOfWeek === today);
        document.getElementById('todayClasses').textContent = todaySchedules.length;

        // Populate filter dropdowns
        populateScheduleFilters(schedules);

        // Render schedule with no filters
        renderScheduleGrid(schedules);

    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('scheduleContainer').innerHTML = `
            <div class="error" style="padding: 20px; text-align: center; color: #dc2626;">
                <i class="fas fa-exclamation-triangle"></i> Failed to load schedule
            </div>`;
    }
}

// Format grade label
function formatGradeLabel(grade) {
    if (!grade) return 'N/A';
    if (grade === 'kg1') return 'KG1';
    if (grade === 'kg2') return 'KG2';
    return grade.charAt(0).toUpperCase() + grade.slice(1);
}

async function loadTodaySummary() {
    try {
        // Load today's classes
        const today = getDayOfWeek();
        const todayClasses = allSchedulesData.filter(s => s.dayOfWeek === today)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        const classesListEl = document.getElementById('todayClassesList');
        document.getElementById('todayClassesCount').textContent = todayClasses.length;

        if (todayClasses.length === 0) {
            classesListEl.innerHTML = `
                <div class="empty-summary">
                    <i class="fas fa-check-circle"></i>
                    <p>No classes today</p>
                </div>`;
        } else {
            classesListEl.innerHTML = todayClasses.map(cls => {
                const studentCount = cls.studentCount || (Array.isArray(cls.students) 
                    ? cls.students.length 
                    : cls.students ? 1 : 0);
                
                const gradeSection = cls.classGrade && cls.classSection 
                    ? `${formatGradeLabel(cls.classGrade)} - ${cls.classSection}`
                    : 'Not specified';

                return `
                    <div class="summary-item">
                        <div class="summary-item-title">
                            <i class="fas fa-book"></i>
                            ${cls.subject}
                        </div>
                        <div class="summary-item-meta">
                            <span><i class="fas fa-clock"></i> ${cls.startTime} - ${cls.endTime}</span>
                            <span><i class="fas fa-graduation-cap"></i> ${gradeSection}</span>
                            <span><i class="fas fa-users"></i> ${studentCount} students</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Load content (assignments and announcements)
        const contentData = await apiCall('/announcements/teacher');
        const allContent = contentData.announcements || [];

        // Today's assignments due
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAssignments = allContent.filter(item => 
            item.type === 'assignment' && 
            item.dueDate && 
            new Date(item.dueDate) >= todayStart && 
            new Date(item.dueDate) <= todayEnd
        ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const assignmentsListEl = document.getElementById('todayAssignmentsList');
        document.getElementById('todayAssignmentsCount').textContent = todayAssignments.length;

        if (todayAssignments.length === 0) {
            assignmentsListEl.innerHTML = `
                <div class="empty-summary">
                    <i class="fas fa-check-circle"></i>
                    <p>No assignments due today</p>
                </div>`;
        } else {
            assignmentsListEl.innerHTML = todayAssignments.map(item => `
                <div class="summary-item">
                    <div class="summary-item-title">
                        ${item.title}
                        <span class="tag tag-priority tag-${item.priority}">${item.priority}</span>
                    </div>
                    <div class="summary-item-meta">
                        <span class="tag tag-subject">${item.subject}</span>
                        <span><i class="fas fa-clock"></i> Due: ${new Date(item.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span><i class="fas fa-users"></i> ${item.submissionCount || 0}/${item.totalStudents || 0} submitted</span>
                    </div>
                </div>
            `).join('');
        }

        // Recent announcements (last 3 days)
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const recentAnnouncements = allContent
            .filter(item => new Date(item.createdAt) >= threeDaysAgo)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        const announcementsListEl = document.getElementById('recentAnnouncementsList');
        document.getElementById('recentAnnouncementsCount').textContent = recentAnnouncements.length;

        if (recentAnnouncements.length === 0) {
            announcementsListEl.innerHTML = `
                <div class="empty-summary">
                    <i class="fas fa-inbox"></i>
                    <p>No recent posts</p>
                </div>`;
        } else {
            announcementsListEl.innerHTML = recentAnnouncements.map(item => {
                const typeIcon = item.type === 'announcement' ? 'bullhorn' : 
                               item.type === 'assignment' ? 'tasks' : 'question-circle';
                return `
                <div class="summary-item">
                    <div class="summary-item-title">
                        <i class="fas fa-${typeIcon}"></i>
                        ${item.title}
                    </div>
                    <div class="summary-item-meta">
                        <span class="tag tag-subject">${item.subject}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(item.createdAt).toLocaleDateString()}</span>
                        ${item.type !== 'announcement' ? `<span><i class="fas fa-users"></i> ${item.submissionCount || 0}/${item.totalStudents || 0}</span>` : ''}
                    </div>
                </div>
            `}).join('');
        }

    } catch (error) {
        console.error('Error loading today summary:', error);
    }
}

// ============================================================================
// CHART FUNCTIONS
// ============================================================================

let chartInstances = {};

function destroyChart(name) {
    if (chartInstances[name]) {
        chartInstances[name].destroy();
        chartInstances[name] = null;
    }
}

function renderStudentsByGradeChart() {
    const ctx = document.getElementById('studentsByGradeChart');
    if (!ctx || !allSchedulesData.length) return;

    // Group unique students by grade-section from schedule data
    const sectionMap = {};
    allSchedulesData.forEach(s => {
        const label = s.classGrade && s.classSection
            ? `${formatGradeLabel(s.classGrade)} - ${s.classSection}`
            : 'Unknown';
        if (!sectionMap[label]) sectionMap[label] = new Set();
        if (s.students && Array.isArray(s.students)) {
            s.students.forEach(st => {
                const id = st?._id || st;
                if (id) sectionMap[label].add(id.toString ? id.toString() : id);
            });
        }
    });

    const labels = Object.keys(sectionMap).sort();
    const data = labels.map(l => sectionMap[l].size);
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    destroyChart('studentsByGrade');
    chartInstances['studentsByGrade'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } }
                }
            },
            cutout: '55%'
        }
    });
}

async function renderAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    try {
        const data = await apiCall('/attendance/statistics');
        const overall = data.overall || {};

        const present = overall.present || 0;
        const absent = overall.absent || 0;
        const late = overall.late || 0;
        const excused = overall.excused || 0;

        const labels = ['Present', 'Absent', 'Late', 'Excused'];
        const values = [present, absent, late, excused];
        const bgColors = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

        destroyChart('attendance');
        chartInstances['attendance'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                                return ` ${context.label}: ${context.raw} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '55%'
            }
        });
    } catch (err) {
        console.error('Error loading attendance chart:', err);
    }
}

function renderClassesPerDayChart() {
    const ctx = document.getElementById('classesPerDayChart');
    if (!ctx || !allSchedulesData.length) return;

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const counts = daysOrder.map(day => allSchedulesData.filter(s => s.dayOfWeek === day).length);
    const today = getDayOfWeek();
    const bgColors = daysOrder.map(d => d === today ? '#1e88e5' : '#93c5fd');

    destroyChart('classesPerDay');
    chartInstances['classesPerDay'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: daysOrder.map(d => d.slice(0, 3)),
            datasets: [{
                label: 'Classes',
                data: counts,
                backgroundColor: bgColors,
                borderRadius: 6,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, stepSize: 1, font: { size: 11 } },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: { size: 11, weight: '600' } },
                    grid: { display: false }
                }
            }
        }
    });
}

async function loadCharts() {
    renderStudentsByGradeChart();
    await renderAttendanceChart();
    renderClassesPerDayChart();
}

document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        showError('Please log in to access the teacher dashboard');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return;
    }
    loadTeacherData();
});

document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '../login.html';
});

// ============================================================================
// STAT DETAIL MODAL FUNCTIONS
// ============================================================================

let statDetailAllItems = [];
let statDetailType = '';

function showStatDetail(type) {
    statDetailType = type;
    const modal = document.getElementById('statDetailModal');
    const body = document.getElementById('statDetailBody');
    const titleEl = document.getElementById('statDetailTitle');
    const subtitleEl = document.getElementById('statDetailSubtitle');
    const iconEl = document.getElementById('statDetailIcon');
    const searchWrap = document.getElementById('statDetailSearchWrap');
    const searchInput = document.getElementById('statDetailSearch');

    searchInput.value = '';

    if (type === 'totalClasses') {
        iconEl.innerHTML = '<i class="fas fa-calendar-check"></i>';
        iconEl.style.background = '#1e88e5';
        titleEl.textContent = 'All Classes';
        subtitleEl.textContent = `${allSchedulesData.length} total classes across all days`;
        searchWrap.classList.remove('hidden-modal');
        statDetailAllItems = allSchedulesData;
        renderClassesDetail(allSchedulesData);

    } else if (type === 'totalStudents') {
        iconEl.innerHTML = '<i class="fas fa-user-graduate"></i>';
        iconEl.style.background = '#7c3aed';
        titleEl.textContent = 'All Students';
        // Collect unique students
        const studentsMap = {};
        allSchedulesData.forEach(s => {
            if (s.students && Array.isArray(s.students)) {
                s.students.forEach(st => {
                    if (st && st._id && !studentsMap[st._id]) {
                        studentsMap[st._id] = {
                            ...st,
                            classes: []
                        };
                    }
                    if (st && st._id) {
                        studentsMap[st._id].classes.push({
                            subject: s.subject,
                            grade: s.classGrade,
                            section: s.classSection
                        });
                    }
                });
            }
        });
        const uniqueStudents = Object.values(studentsMap).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        subtitleEl.textContent = `${uniqueStudents.length} unique students`;
        searchWrap.classList.remove('hidden-modal');
        statDetailAllItems = uniqueStudents;
        renderStudentsDetail(uniqueStudents);

    } else if (type === 'classesToday') {
        iconEl.innerHTML = '<i class="fas fa-clock"></i>';
        iconEl.style.background = '#e67e22';
        const today = getDayOfWeek();
        const todaySchedules = allSchedulesData.filter(s => s.dayOfWeek === today)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
        titleEl.textContent = `Classes Today (${today})`;
        subtitleEl.textContent = `${todaySchedules.length} classes scheduled`;
        searchWrap.classList.add('hidden-modal');
        statDetailAllItems = todaySchedules;
        renderTodayClassesDetail(todaySchedules);

    } else if (type === 'subjects') {
        iconEl.innerHTML = '<i class="fas fa-book"></i>';
        iconEl.style.background = '#2ecc71';
        const subs = currentTeacher?.subjects || [];
        titleEl.textContent = 'Subjects Teaching';
        subtitleEl.textContent = `${subs.length} subject${subs.length !== 1 ? 's' : ''}`;
        searchWrap.classList.add('hidden-modal');
        statDetailAllItems = subs;
        renderSubjectsDetail(subs);
    }

    modal.classList.remove('hidden-modal');
}

function renderClassesDetail(schedules) {
    const body = document.getElementById('statDetailBody');
    if (!schedules.length) {
        body.innerHTML = '<div class="detail-empty"><i class="fas fa-calendar-times"></i><p>No classes found</p></div>';
        return;
    }

    // Group by day
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const byDay = {};
    schedules.forEach(s => {
        if (!byDay[s.dayOfWeek]) byDay[s.dayOfWeek] = [];
        byDay[s.dayOfWeek].push(s);
    });

    let html = '';
    daysOrder.forEach(day => {
        if (!byDay[day]) return;
        const daySchedules = byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        html += `<div class="detail-group-header"><i class="fas fa-calendar-day"></i> ${day} (${daySchedules.length})</div>`;
        daySchedules.forEach(s => {
            const studentCount = s.studentCount || (Array.isArray(s.students) ? s.students.length : 0);
            const gradeSection = s.classGrade && s.classSection ? `${formatGradeLabel(s.classGrade)} - ${s.classSection}` : '—';
            html += `
                <div class="detail-item">
                    <div class="detail-item-icon" style="background: #1e88e5"><i class="fas fa-book"></i></div>
                    <div class="detail-item-info">
                        <div class="detail-item-name">${s.subject}</div>
                        <div class="detail-item-meta">
                            <span><i class="fas fa-clock"></i> ${s.startTime} - ${s.endTime}</span>
                            <span><i class="fas fa-graduation-cap"></i> ${gradeSection}</span>
                            <span><i class="fas fa-users"></i> ${studentCount}</span>
                        </div>
                    </div>
                </div>`;
        });
    });
    body.innerHTML = html;
}

function renderStudentsDetail(students) {
    const body = document.getElementById('statDetailBody');
    if (!students.length) {
        body.innerHTML = '<div class="detail-empty"><i class="fas fa-users-slash"></i><p>No students found</p></div>';
        return;
    }

    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
    body.innerHTML = students.map((st, i) => {
        const name = st.name || 'Unknown';
        const email = st.email || '';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const color = colors[i % colors.length];
        // Show unique subjects this student is in
        const subjectSet = new Set(st.classes.map(c => c.subject));
        const subjectsStr = [...subjectSet].join(', ');
        const gradeInfo = st.classes[0] ? `${formatGradeLabel(st.classes[0].grade)} - ${st.classes[0].section}` : '';

        return `
            <div class="detail-item">
                <div class="detail-item-icon" style="background: ${color}">${initials}</div>
                <div class="detail-item-info">
                    <div class="detail-item-name">${name}</div>
                    <div class="detail-item-meta">
                        <span><i class="fas fa-envelope"></i> ${email}</span>
                        ${gradeInfo ? `<span><i class="fas fa-graduation-cap"></i> ${gradeInfo}</span>` : ''}
                    </div>
                    <div class="detail-item-meta" style="margin-top:3px;">
                        <span><i class="fas fa-book"></i> ${subjectsStr}</span>
                    </div>
                </div>
                <div class="detail-item-badge" style="background: #eef2ff; color: #4338ca;">#${i + 1}</div>
            </div>`;
    }).join('');
}

function renderTodayClassesDetail(schedules) {
    const body = document.getElementById('statDetailBody');
    if (!schedules.length) {
        body.innerHTML = '<div class="detail-empty"><i class="fas fa-check-circle" style="color: #2ecc71;"></i><p>No classes scheduled for today</p></div>';
        return;
    }

    body.innerHTML = schedules.map((s, i) => {
        const studentCount = s.studentCount || (Array.isArray(s.students) ? s.students.length : 0);
        const gradeSection = s.classGrade && s.classSection ? `${formatGradeLabel(s.classGrade)} - ${s.classSection}` : '—';
        const colors = ['#1e88e5', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c'];
        return `
            <div class="detail-item">
                <div class="detail-item-icon" style="background: ${colors[i % colors.length]}">
                    <i class="fas fa-chalkboard"></i>
                </div>
                <div class="detail-item-info">
                    <div class="detail-item-name">${s.subject}</div>
                    <div class="detail-item-meta">
                        <span><i class="fas fa-clock"></i> ${s.startTime} - ${s.endTime}</span>
                        <span><i class="fas fa-graduation-cap"></i> ${gradeSection}</span>
                        <span><i class="fas fa-users"></i> ${studentCount} students</span>
                    </div>
                </div>
                <div class="detail-item-badge" style="background: #fef3c7; color: #b45309;">${s.startTime}</div>
            </div>`;
    }).join('');
}

function renderSubjectsDetail(subjects) {
    const body = document.getElementById('statDetailBody');
    if (!subjects.length) {
        body.innerHTML = '<div class="detail-empty"><i class="fas fa-book"></i><p>No subjects assigned</p></div>';
        return;
    }

    const subjectIcons = {
        'Math': 'calculator', 'Physics': 'atom', 'Chemistry': 'flask',
        'Biology': 'dna', 'English': 'language', 'History': 'landmark',
        'Geography': 'globe-americas', 'Computer': 'laptop-code',
        'Computer Science': 'laptop-code', 'Arabic': 'pen-nib', 'French': 'globe-europe'
    };
    const subjectColors = {
        'Math': '#1e88e5', 'Physics': '#e67e22', 'Chemistry': '#e74c3c',
        'Biology': '#2ecc71', 'English': '#9b59b6', 'History': '#795548',
        'Geography': '#00bcd4', 'Computer': '#607d8b', 'Computer Science': '#607d8b',
        'Arabic': '#ff7043', 'French': '#5c6bc0'
    };

    body.innerHTML = subjects.map(sub => {
        const icon = subjectIcons[sub] || 'book';
        const color = subjectColors[sub] || '#1e88e5';
        // Count classes and students for this subject
        const subjectSchedules = allSchedulesData.filter(s => s.subject === sub);
        const classCount = subjectSchedules.length;
        const studentSet = new Set();
        subjectSchedules.forEach(s => {
            if (s.students && Array.isArray(s.students)) {
                s.students.forEach(st => { if (st?._id) studentSet.add(st._id); });
            }
        });
        // Get unique grade-sections
        const gradeSections = new Set();
        subjectSchedules.forEach(s => {
            if (s.classGrade && s.classSection) {
                gradeSections.add(`${formatGradeLabel(s.classGrade)}-${s.classSection}`);
            }
        });

        return `
            <div class="detail-item">
                <div class="detail-item-icon" style="background: ${color}"><i class="fas fa-${icon}"></i></div>
                <div class="detail-item-info">
                    <div class="detail-item-name">${sub}</div>
                    <div class="detail-item-meta">
                        <span><i class="fas fa-calendar-check"></i> ${classCount} classes</span>
                        <span><i class="fas fa-users"></i> ${studentSet.size} students</span>
                        <span><i class="fas fa-layer-group"></i> ${[...gradeSections].join(', ') || '—'}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function filterStatDetail() {
    const query = document.getElementById('statDetailSearch').value.toLowerCase().trim();

    if (statDetailType === 'totalClasses') {
        const filtered = query
            ? allSchedulesData.filter(s =>
                s.subject.toLowerCase().includes(query) ||
                (s.dayOfWeek && s.dayOfWeek.toLowerCase().includes(query)) ||
                (s.classGrade && formatGradeLabel(s.classGrade).toLowerCase().includes(query)) ||
                (s.classSection && s.classSection.toLowerCase().includes(query))
            )
            : allSchedulesData;
        renderClassesDetail(filtered);
    } else if (statDetailType === 'totalStudents') {
        const filtered = query
            ? statDetailAllItems.filter(s =>
                (s.name && s.name.toLowerCase().includes(query)) ||
                (s.email && s.email.toLowerCase().includes(query))
            )
            : statDetailAllItems;
        renderStudentsDetail(filtered);
    }
}

function closeStatDetail() {
    document.getElementById('statDetailModal').classList.add('hidden-modal');
}

// ============================================================================
// SCHEDULE FILTER & RENDER FUNCTIONS
// ============================================================================

function populateScheduleFilters(schedules) {
    const grades = new Set();
    const sections = new Set();

    schedules.forEach(s => {
        if (s.classGrade) grades.add(s.classGrade);
        if (s.classSection) sections.add(s.classSection);
    });

    const gradeFilter = document.getElementById('gradeFilter');
    gradeFilter.innerHTML = '<option value="">All Grades</option>';
    [...grades].sort().forEach(g => {
        gradeFilter.innerHTML += `<option value="${g}">${formatGradeLabel(g)}</option>`;
    });

    const sectionFilter = document.getElementById('sectionFilter');
    sectionFilter.innerHTML = '<option value="">All Sections</option>';
    [...sections].sort().forEach(s => {
        sectionFilter.innerHTML += `<option value="${s}">Section ${s}</option>`;
    });
}

function applyScheduleFilters() {
    const grade = document.getElementById('gradeFilter').value;
    const section = document.getElementById('sectionFilter').value;
    const day = document.getElementById('dayFilter').value;

    let filtered = [...allSchedulesData];

    if (grade) filtered = filtered.filter(s => s.classGrade === grade);
    if (section) filtered = filtered.filter(s => s.classSection === section);
    if (day) filtered = filtered.filter(s => s.dayOfWeek === day);

    renderScheduleGrid(filtered);
}

function resetScheduleFilters() {
    document.getElementById('gradeFilter').value = '';
    document.getElementById('sectionFilter').value = '';
    document.getElementById('dayFilter').value = '';
    renderScheduleGrid(allSchedulesData);
}

function renderScheduleGrid(schedules) {
    const scheduleContainer = document.getElementById('scheduleContainer');

    if (!schedules || schedules.length === 0) {
        scheduleContainer.innerHTML = `
            <div class="empty-summary">
                <i class="fas fa-calendar-times"></i>
                <p>No classes found</p>
            </div>`;
        return;
    }

    // Group schedules by subject
    const schedulesBySubject = {};
    schedules.forEach(schedule => {
        if (!schedulesBySubject[schedule.subject]) {
            schedulesBySubject[schedule.subject] = {};
        }
        if (!schedulesBySubject[schedule.subject][schedule.dayOfWeek]) {
            schedulesBySubject[schedule.subject][schedule.dayOfWeek] = [];
        }
        schedulesBySubject[schedule.subject][schedule.dayOfWeek].push(schedule);
    });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    scheduleContainer.innerHTML = '';

    Object.keys(schedulesBySubject).sort().forEach(subject => {
        const subjectSection = document.createElement('div');
        subjectSection.className = 'subject-section';
        const allSubjectSchedules = Object.values(schedulesBySubject[subject]).flat();
        const totalClassesForSubject = allSubjectSchedules.length;

        const studentsInSubject = new Set();
        allSubjectSchedules.forEach(sch => {
            if (sch.students && Array.isArray(sch.students)) {
                sch.students.forEach(s => {
                    if (s && s._id) studentsInSubject.add(s._id);
                });
            }
        });

        subjectSection.innerHTML = `
            <div class="subject-header">
                <div class="subject-title">
                    <i class="fas fa-book-open"></i> ${subject}
                    <span class="subject-badge">${totalClassesForSubject} Classes</span>
                </div>
                <div class="student-count">
                    <i class="fas fa-user-graduate"></i> ${studentsInSubject.size} Students
                </div>
            </div>
            <div class="schedule-grid">
                ${daysOrder.map(day =>
                    (schedulesBySubject[subject][day] || []).map(schedule => {
                        const studentCount = schedule.studentCount || (Array.isArray(schedule.students)
                            ? schedule.students.length
                            : schedule.students ? 1 : 0);

                        const gradeSection = schedule.classGrade && schedule.classSection
                            ? `${formatGradeLabel(schedule.classGrade)} - ${schedule.classSection}`
                            : 'Not specified';

                        return `
                            <div class="schedule-item clickable" onclick="openStudentModal('${schedule._id}', '${subject}', '${day}', '${schedule.startTime} - ${schedule.endTime}', '${gradeSection}')">
                                <div class="day-label">${day}</div>
                                <div class="time-label">
                                    <i class="fas fa-clock"></i>
                                    ${schedule.startTime} - ${schedule.endTime}
                                </div>
                                <div class="room-info">
                                    <i class="fas fa-graduation-cap"></i>
                                    ${gradeSection}
                                </div>
                                <div class="room-info">
                                    <i class="fas fa-users"></i>
                                    ${studentCount} student${studentCount !== 1 ? 's' : ''}
                                </div>
                                <div class="view-students-hint">
                                    <i class="fas fa-eye"></i> Click to view students
                                </div>
                            </div>`;
                    }).join('')
                ).join('')}
            </div>`;
        scheduleContainer.appendChild(subjectSection);
    });
}

// ============================================================================
// STUDENT LIST MODAL FUNCTIONS
// ============================================================================

let currentModalStudents = [];

function openStudentModal(scheduleId, subject, day, time, gradeSection) {
    const schedule = allSchedulesData.find(s => s._id === scheduleId);
    if (!schedule) return;

    const students = schedule.students || [];
    currentModalStudents = students;

    document.getElementById('modalTitle').textContent = `${subject} - ${gradeSection}`;
    document.getElementById('modalSubtitle').textContent = `${day} | ${time}`;
    document.getElementById('modalStudentCount').textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

    document.getElementById('studentSearchInput').value = '';

    renderStudentList(students);

    document.getElementById('studentListModal').classList.remove('hidden-modal');
}

function renderStudentList(students) {
    const container = document.getElementById('studentListContainer');

    if (!students || students.length === 0) {
        container.innerHTML = `
            <div class="student-modal-empty">
                <i class="fas fa-users-slash"></i>
                <p>No students enrolled in this class</p>
            </div>`;
        return;
    }

    container.innerHTML = students.map((student, index) => {
        const name = student.name || 'Unknown';
        const email = student.email || '';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
        const color = colors[index % colors.length];

        return `
            <div class="student-list-item">
                <div class="student-list-avatar" style="background: ${color}">${initials}</div>
                <div class="student-list-info">
                    <div class="student-list-name">${name}</div>
                    <div class="student-list-email">${email}</div>
                </div>
                <div class="student-list-number">#${index + 1}</div>
            </div>`;
    }).join('');
}

function filterStudentList() {
    const query = document.getElementById('studentSearchInput').value.toLowerCase().trim();
    if (!query) {
        renderStudentList(currentModalStudents);
        document.getElementById('modalStudentCount').textContent = `${currentModalStudents.length} student${currentModalStudents.length !== 1 ? 's' : ''}`;
        return;
    }

    const filtered = currentModalStudents.filter(s =>
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query))
    );

    renderStudentList(filtered);
    document.getElementById('modalStudentCount').textContent = `${filtered.length} of ${currentModalStudents.length} students`;
}

function closeStudentModal() {
    document.getElementById('studentListModal').classList.add('hidden-modal');
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'studentListModal') {
        closeStudentModal();
    }
    if (e.target.id === 'statDetailModal') {
        closeStatDetail();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeStudentModal();
        closeStatDetail();
        closeNotificationPanel();
    }
});

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

async function loadAdminAnnouncements() {
    try {
        const data = await apiCall('/admin-announcements/teacher/my-announcements');
        adminAnnouncements = data.announcements || [];
        
        // Update notification count
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading admin announcements:', error);
        adminAnnouncements = [];
    }
}

function updateNotificationCount() {
    const unreadCount = adminAnnouncements.filter(a => !a.isViewed).length;
    const badge = document.getElementById('notificationCount');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function showNotifications() {
    // Sort by newest first
    const sortedAnnouncements = [...adminAnnouncements].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    const unreadAnnouncements = sortedAnnouncements.filter(a => !a.isViewed);
    const readAnnouncements = sortedAnnouncements.filter(a => a.isViewed);

    // Create notification panel content
    let notificationContent = '';

    if (sortedAnnouncements.length === 0) {
        notificationContent = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No announcements</p>
            </div>
        `;
    } else {
        notificationContent = `
            ${unreadAnnouncements.length > 0 ? `
                <div class="notification-section">
                    <h4><i class="fas fa-envelope"></i> Unread</h4>
                    ${unreadAnnouncements.map(a => createNotificationItem(a)).join('')}
                </div>
            ` : ''}
            ${readAnnouncements.length > 0 ? `
                <div class="notification-section">
                    <h4><i class="fas fa-envelope-open"></i> Read</h4>
                    ${readAnnouncements.slice(0, 10).map(a => createNotificationItem(a)).join('')}
                </div>
            ` : ''}
        `;
    }

    // Check if notification panel already exists
    let panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.remove();
    }

    // Create notification panel
    panel = document.createElement('div');
    panel.id = 'notificationPanel';
    panel.className = 'notification-panel';
    panel.innerHTML = `
        <div class="notification-header">
            <h3>Notifications</h3>
            <button onclick="closeNotificationPanel()" class="notification-close">&times;</button>
        </div>
        ${unreadAnnouncements.length > 0 ? `
        <div class="notification-actions">
            <button onclick="markAllAsRead()" class="mark-all-read-btn">
                <i class="fas fa-check-double"></i>
                Mark all as read
            </button>
        </div>
        ` : ''}
        <div class="notification-body">
            ${notificationContent}
        </div>
    `;

    document.body.appendChild(panel);
    
    // Show panel with animation
    setTimeout(() => panel.classList.add('show'), 10);
}

function createNotificationItem(announcement) {
    const categoryColors = {
        general: { bg: '#eef2ff', color: '#4f46e5' },
        urgent: { bg: '#fee2e2', color: '#dc2626' },
        event: { bg: '#fef3c7', color: '#d97706' },
        academic: { bg: '#d1fae5', color: '#059669' }
    };
    const colors = categoryColors[announcement.category] || categoryColors.general;
    const icon = announcement.category === 'urgent' ? 'fa-exclamation-circle' : 
                 announcement.category === 'event' ? 'fa-calendar' :
                 announcement.category === 'academic' ? 'fa-graduation-cap' : 'fa-bullhorn';

    return `
        <div class="notification-item" onclick="viewAdminAnnouncement('${announcement._id}')">
            <div class="notification-icon" style="background: ${colors.bg};">
                <i class="fas ${icon}" style="color: ${colors.color};"></i>
            </div>
            <div class="notification-content">
                <p class="notification-title">${announcement.title}</p>
                <p class="notification-time">${new Date(announcement.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
    `;
}

async function viewAdminAnnouncement(announcementId) {
    const announcement = adminAnnouncements.find(a => a._id === announcementId);
    if (!announcement) return;

    // Mark as viewed if not already
    if (!announcement.isViewed) {
        try {
            await apiCall(`/admin-announcements/${announcementId}/view`, 'POST');
            announcement.isViewed = true;
            updateNotificationCount();
        } catch (error) {
            console.error('Error marking announcement as viewed:', error);
        }
    }

    closeNotificationPanel();

    // Show announcement modal
    const categoryColors = {
        general: { bg: '#eef2ff', color: '#4f46e5' },
        urgent: { bg: '#fee2e2', color: '#dc2626' },
        event: { bg: '#fef3c7', color: '#d97706' },
        academic: { bg: '#d1fae5', color: '#059669' }
    };
    const colors = categoryColors[announcement.category] || categoryColors.general;

    const modal = document.createElement('div');
    modal.id = 'announcementModal';
    modal.className = 'announcement-modal-overlay';
    modal.innerHTML = `
        <div class="announcement-modal">
            <div class="announcement-modal-header" style="background: ${colors.bg};">
                <div>
                    <span class="announcement-category" style="background: ${colors.color};">${announcement.category || 'general'}</span>
                    <h2>${announcement.title}</h2>
                    <p class="announcement-meta">
                        <i class="fas fa-user"></i> ${announcement.author?.name || 'Admin'}
                        <span style="margin: 0 10px;">•</span>
                        <i class="fas fa-calendar"></i> ${new Date(announcement.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <button onclick="closeAnnouncementModal()" class="announcement-close">&times;</button>
            </div>
            <div class="announcement-modal-body">
                <div class="announcement-content">${announcement.content || announcement.description || ''}</div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

async function markAllAsRead() {
    const unreadAnnouncements = adminAnnouncements.filter(a => !a.isViewed);
    
    if (unreadAnnouncements.length === 0) {
        if (typeof Toast !== 'undefined') {
            Toast.info('No unread announcements');
        }
        return;
    }

    try {
        // Mark each announcement as viewed
        const promises = unreadAnnouncements.map(a => 
            apiCall(`/admin-announcements/${a._id}/view`, 'POST')
        );
        await Promise.all(promises);
        
        // Update local state
        unreadAnnouncements.forEach(a => a.isViewed = true);
        
        // Update notification count
        updateNotificationCount();

        // Refresh the notification panel
        closeNotificationPanel();
        showNotifications();

        if (typeof Toast !== 'undefined') {
            Toast.success('All announcements marked as read');
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Failed to mark all as read');
        }
    }
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('show');
        setTimeout(() => panel.remove(), 300);
    }
}

// Close notification panel when clicking outside
document.addEventListener('click', function(e) {
    const panel = document.getElementById('notificationPanel');
    const btn = document.getElementById('notificationBtn');
    if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        closeNotificationPanel();
    }
    
    const announcementModal = document.getElementById('announcementModal');
    if (announcementModal && e.target === announcementModal) {
        closeAnnouncementModal();
    }
});