const API_URL = 'http://localhost:5001/api';

let currentStudent = null;
let schedules = [];
let allAnnouncements = [];

const getToken = () => localStorage.getItem('token');

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API Error');
    }
    return response.json();
}

// Initialize
async function init() {
    const token = getToken();
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // Load user info
        const userData = await apiCall('/users/me');
        currentStudent = userData.user;
        document.getElementById('userName').textContent = currentStudent.name;
        document.getElementById('userAvatar').textContent = currentStudent.name.charAt(0).toUpperCase();

        // Load schedules
        const scheduleData = await apiCall(`/schedules/student/${currentStudent._id}`);
        if (scheduleData.schedules) {
            schedules = [];
            Object.entries(scheduleData.schedules).forEach(([dayOfWeek, daySchedules]) => {
                daySchedules.forEach(schedule => {
                    schedules.push({ ...schedule, dayOfWeek });
                });
            });
        }

        // Load announcements for pending tasks count
        const subjects = [...new Set(schedules.map(s => s.subject))];
        const announcementPromises = subjects.map(subject =>
            apiCall(`/announcements/student?subject=${subject}`)
        );
        const results = await Promise.all(announcementPromises);
        allAnnouncements = results.flatMap(r => r.announcements || []);

        renderPage(subjects);
        hideLoading();
    } catch (error) {
        console.error('Error initializing:', error);
        showError(error.message);
    }
}

function renderPage(subjects) {
    // Update stats
    const uniqueTeachers = new Set();
    schedules.forEach(s => {
        if (s.teacher && s.teacher.name) uniqueTeachers.add(s.teacher.name);
    });

    const pendingTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted && !a.isOverdue
    );

    document.getElementById('totalSubjects').textContent = subjects.length;
    document.getElementById('totalClasses').textContent = schedules.length;
    document.getElementById('totalTeachers').textContent = uniqueTeachers.size;

    // Render subjects
    const container = document.getElementById('subjectsContainer');
    const emptyState = document.getElementById('emptyState');

    if (subjects.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');

    const subjectColors = [
        { bg: '#eef2ff', color: '#4f46e5' },
        { bg: '#fef3c7', color: '#d97706' },
        { bg: '#d1fae5', color: '#059669' },
        { bg: '#fee2e2', color: '#dc2626' },
        { bg: '#e0e7ff', color: '#6366f1' },
        { bg: '#fce7f3', color: '#db2777' },
        { bg: '#f0fdf4', color: '#15803d' },
        { bg: '#fdf4ff', color: '#a855f7' }
    ];

    container.innerHTML = subjects.map((subject, index) => {
        const subjectSchedules = schedules.filter(s => s.subject === subject);
        const teacher = subjectSchedules[0]?.teacher;
        const color = subjectColors[index % subjectColors.length];

        const subjectAnnouncements = allAnnouncements.filter(a => a.subject === subject);
        const assignments = subjectAnnouncements.filter(a => a.type === 'assignment').length;
        const quizzes = subjectAnnouncements.filter(a => a.type === 'quiz').length;
        const pending = subjectAnnouncements.filter(a =>
            (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted
        ).length;

        // Group schedule by day
        const scheduleByDay = {};
        subjectSchedules.forEach(s => {
            if (!scheduleByDay[s.dayOfWeek]) scheduleByDay[s.dayOfWeek] = [];
            scheduleByDay[s.dayOfWeek].push(s);
        });

        const schedulePills = Object.entries(scheduleByDay).map(([day, slots]) => {
            return slots.map(slot =>
                `<div class="schedule-pill">
                    <span class="day">${day.slice(0, 3)}</span>
                    <span class="time">${slot.startTime} - ${slot.endTime}</span>
                </div>`
            ).join('');
        }).join('');

        return `
            <div class="subject-card">
                <div class="subject-card-top">
                    <div class="subject-icon-lg" style="background: ${color.bg};">
                        <i data-lucide="book" style="color: ${color.color};"></i>
                    </div>
                    <div class="subject-info">
                        <div class="subject-name">${subject}</div>
                        <div class="subject-teacher">
                            <i data-lucide="user"></i>
                            ${teacher ? teacher.name : 'No teacher assigned'}
                        </div>
                    </div>
                    ${pending > 0
                        ? `<span class="subject-badge pending-badge"><i data-lucide="clock" style="width:12px;height:12px;"></i> ${pending} pending</span>`
                        : `<span class="subject-badge done-badge"><i data-lucide="check" style="width:12px;height:12px;"></i> All done</span>`
                    }
                </div>
                <div class="subject-card-stats">
                    <div class="subject-stat-item">
                        <div class="subject-stat-num">${subjectSchedules.length}</div>
                        <div class="subject-stat-label">Classes/Week</div>
                    </div>
                    <div class="subject-stat-item">
                        <div class="subject-stat-num">${assignments}</div>
                        <div class="subject-stat-label">Assignments</div>
                    </div>
                    <div class="subject-stat-item">
                        <div class="subject-stat-num">${quizzes}</div>
                        <div class="subject-stat-label">Quizzes</div>
                    </div>
                </div>
                <div class="subject-card-schedule">
                    <div class="schedule-heading">
                        <i data-lucide="calendar"></i> Weekly Schedule
                    </div>
                    <div class="schedule-pills">
                        ${schedulePills || '<span style="color:var(--text-muted);font-size:0.82rem;">No schedule set</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const el = document.getElementById('error');
    el.textContent = message;
    el.classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', init);
