const API_URL = 'http://localhost:5001/api';

let currentStudent = null;
let schedules = [];
let allAnnouncements = [];
let currentFilter = 'all';
let currentTypeFilter = '';
let currentSubjectFilter = '';

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

// Read initial filter from URL params
function getInitialFilter() {
    const params = new URLSearchParams(window.location.search);
    return params.get('filter') || 'all';
}

// Initialize
async function init() {
    const token = getToken();
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    currentFilter = getInitialFilter();

    try {
        // Load user info
        const userData = await apiCall('/users/me');
        currentStudent = userData.user;
        document.getElementById('userName').textContent = currentStudent.name;
        document.getElementById('userAvatar').textContent = currentStudent.name.charAt(0).toUpperCase();

        // Load schedules to get subjects
        const scheduleData = await apiCall(`/schedules/student/${currentStudent._id}`);
        if (scheduleData.schedules) {
            schedules = [];
            Object.entries(scheduleData.schedules).forEach(([dayOfWeek, daySchedules]) => {
                daySchedules.forEach(schedule => {
                    schedules.push({ ...schedule, dayOfWeek });
                });
            });
        }

        // Load all announcements
        const subjects = [...new Set(schedules.map(s => s.subject))];
        const announcementPromises = subjects.map(subject =>
            apiCall(`/announcements/student?subject=${subject}`)
        );
        const results = await Promise.all(announcementPromises);
        allAnnouncements = results.flatMap(r => r.announcements || []);

        // Only keep assignments and quizzes (tasks)
        allAnnouncements = allAnnouncements.filter(a => a.type === 'assignment' || a.type === 'quiz');

        // Populate subject filter
        const subjectSelect = document.getElementById('subjectFilter');
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });

        setupEventListeners();
        setActiveFilter(currentFilter);
        updateStats();
        renderTasks();
        hideLoading();
    } catch (error) {
        console.error('Error initializing:', error);
        showError(error.message);
    }
}

function setupEventListeners() {
    // Filter tab clicks
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentFilter = tab.dataset.filter;
            setActiveFilter(currentFilter);
            renderTasks();
        });
    });

    // Stat card clicks
    document.getElementById('cardAll').addEventListener('click', () => {
        currentFilter = 'all';
        setActiveFilter(currentFilter);
        renderTasks();
    });
    document.getElementById('cardPending').addEventListener('click', () => {
        currentFilter = 'pending';
        setActiveFilter(currentFilter);
        renderTasks();
    });
    document.getElementById('cardCompleted').addEventListener('click', () => {
        currentFilter = 'completed';
        setActiveFilter(currentFilter);
        renderTasks();
    });
    document.getElementById('cardOverdue').addEventListener('click', () => {
        currentFilter = 'overdue';
        setActiveFilter(currentFilter);
        renderTasks();
    });

    // Type & subject filter
    document.getElementById('typeFilter').addEventListener('change', (e) => {
        currentTypeFilter = e.target.value;
        renderTasks();
    });
    document.getElementById('subjectFilter').addEventListener('change', (e) => {
        currentSubjectFilter = e.target.value;
        renderTasks();
    });
}

function setActiveFilter(filter) {
    // Update tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    // Update stat cards
    document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
    const cardMap = { all: 'cardAll', pending: 'cardPending', completed: 'cardCompleted', overdue: 'cardOverdue' };
    const activeCard = document.getElementById(cardMap[filter]);
    if (activeCard) activeCard.classList.add('active');
}

function getFilteredTasks() {
    let tasks = [...allAnnouncements];

    // Apply status filter
    if (currentFilter === 'pending') {
        tasks = tasks.filter(a => !a.hasSubmitted && !a.isOverdue);
    } else if (currentFilter === 'completed') {
        tasks = tasks.filter(a => a.hasSubmitted);
    } else if (currentFilter === 'overdue') {
        tasks = tasks.filter(a => !a.hasSubmitted && a.isOverdue);
    }

    // Apply type filter
    if (currentTypeFilter) {
        tasks = tasks.filter(a => a.type === currentTypeFilter);
    }

    // Apply subject filter
    if (currentSubjectFilter) {
        tasks = tasks.filter(a => a.subject === currentSubjectFilter);
    }

    return tasks;
}

function updateStats() {
    const pending = allAnnouncements.filter(a => !a.hasSubmitted && !a.isOverdue).length;
    const completed = allAnnouncements.filter(a => a.hasSubmitted).length;
    const overdue = allAnnouncements.filter(a => !a.hasSubmitted && a.isOverdue).length;

    document.getElementById('totalAll').textContent = allAnnouncements.length;
    document.getElementById('totalPending').textContent = pending;
    document.getElementById('totalCompleted').textContent = completed;
    document.getElementById('totalOverdue').textContent = overdue;
}

function renderTasks() {
    const tasks = getFilteredTasks();
    const container = document.getElementById('tasksContainer');
    const emptyState = document.getElementById('emptyState');

    if (tasks.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');

        const emptyMessages = {
            all: { title: 'No Tasks Yet', text: 'You have no assignments or quizzes.' },
            pending: { title: 'All Caught Up!', text: 'You have no pending tasks. Great job!' },
            completed: { title: 'No Completed Tasks', text: 'Complete assignments and quizzes to see them here.' },
            overdue: { title: 'No Overdue Tasks', text: 'You\'re on track! No overdue tasks.' }
        };
        const msg = emptyMessages[currentFilter] || emptyMessages.all;
        document.getElementById('emptyTitle').textContent = msg.title;
        document.getElementById('emptyText').textContent = msg.text;
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    // Sort: overdue first, then by due date ascending
    tasks.sort((a, b) => {
        const aOverdue = !a.hasSubmitted && a.isOverdue ? 0 : 1;
        const bOverdue = !b.hasSubmitted && b.isOverdue ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    container.innerHTML = tasks.map(task => {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        // Status
        let statusClass = 'pending';
        let statusText = 'Pending';
        if (task.hasSubmitted) {
            if (task.submission && task.submission.status === 'graded') {
                statusClass = 'graded';
                statusText = 'Graded';
            } else {
                statusClass = 'completed';
                statusText = 'Submitted';
            }
        } else if (task.isOverdue) {
            statusClass = 'overdue';
            statusText = 'Overdue';
        }

        // Due text
        let dueTextClass = '';
        let dueText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!task.hasSubmitted) {
            if (daysUntil < 0) {
                dueTextClass = 'urgent';
                dueText = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
            } else if (daysUntil === 0) {
                dueTextClass = 'urgent';
                dueText = 'Due today';
            } else if (daysUntil === 1) {
                dueTextClass = 'soon';
                dueText = 'Due tomorrow';
            } else if (daysUntil <= 3) {
                dueTextClass = 'soon';
                dueText = `Due in ${daysUntil} days`;
            }
        }

        // Grade
        let gradeHtml = '';
        if (task.hasSubmitted && task.submission && task.submission.grade !== undefined) {
            const pct = Math.round((task.submission.grade / task.totalPoints) * 100);
            gradeHtml = `<div class="grade-display">${task.submission.grade}/${task.totalPoints} (${pct}%)</div>`;
        }

        const hasAttachments = task.attachments && task.attachments.length > 0;

        return `
            <div class="task-card" onclick="goToDashboardTask('${task._id}', '${task.subject}')">
                <div class="task-type-icon ${task.type}">
                    <i data-lucide="${task.type === 'quiz' ? 'award' : 'file-text'}"></i>
                </div>
                <div class="task-info">
                    <div class="task-title">
                        ${task.title}
                        ${hasAttachments ? '<i data-lucide="paperclip" class="attachment-icon" style="width:14px;height:14px;"></i>' : ''}
                    </div>
                    <div class="task-meta">
                        <span><i data-lucide="book"></i> ${task.subject}</span>
                        <span><i data-lucide="target"></i> ${task.totalPoints} pts</span>
                        <span><i data-lucide="${task.type === 'quiz' ? 'award' : 'file-text'}"></i> ${task.type === 'quiz' ? 'Quiz' : 'Assignment'}</span>
                    </div>
                </div>
                <div class="task-right">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="due-text ${dueTextClass}">${dueText}</span>
                    ${gradeHtml}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Navigate back to dashboard and open the task detail
function goToDashboardTask(taskId, subject) {
    // Store task info so dashboard can open it
    sessionStorage.setItem('openTaskId', taskId);
    sessionStorage.setItem('openTaskSubject', subject);
    window.location.href = 'student-dashboard.html';
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
