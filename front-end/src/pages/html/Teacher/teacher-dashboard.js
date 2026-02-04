const API_URL = 'http://localhost:5001/api';
let currentTeacher = null;
let allSchedulesData = [];

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
            if (schedule.student) {
                if (Array.isArray(schedule.student)) {
                    schedule.student.forEach(s => {
                        if (s && s._id) uniqueStudents.add(s._id);
                    });
                } else if (schedule.student._id) {
                    uniqueStudents.add(schedule.student._id);
                }
            }
        });
        document.getElementById('totalStudents').textContent = uniqueStudents.size;

        const today = getDayOfWeek();
        const todaySchedules = schedules.filter(s => s.dayOfWeek === today);
        document.getElementById('todayClasses').textContent = todaySchedules.length;

        const scheduleContainer = document.getElementById('scheduleContainer');
        if (schedules.length === 0) {
            scheduleContainer.innerHTML = `
                <div class="empty-summary">
                    <i class="fas fa-calendar-times"></i>
                    <p>No classes scheduled yet</p>
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
            const totalClassesForSubject = Object.values(schedulesBySubject[subject]).flat().length;

            // Count unique students for this subject
            const studentsInSubject = new Set();
            Object.values(schedulesBySubject[subject]).flat().forEach(sch => {
                if (sch.student) {
                    if (Array.isArray(sch.student)) {
                        sch.student.forEach(s => {
                            if (s && s._id) studentsInSubject.add(s._id);
                        });
                    } else if (sch.student._id) {
                        studentsInSubject.add(sch.student._id);
                    }
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
                            const studentCount = Array.isArray(schedule.student)
                                ? schedule.student.length
                                : schedule.student ? 1 : 0;

                            // Get grade and section info
                            const gradeSection = schedule.classGrade && schedule.classSection 
                                ? `${formatGradeLabel(schedule.classGrade)} - ${schedule.classSection}`
                                : 'Not specified';

                            return `
                                <div class="schedule-item">
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
                                </div>`;
                        }).join('')
                    ).join('')}
                </div>`;
            scheduleContainer.appendChild(subjectSection);
        });

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
                const studentCount = Array.isArray(cls.student) 
                    ? cls.student.length 
                    : cls.student ? 1 : 0;
                
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