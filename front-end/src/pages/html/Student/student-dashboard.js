const API_URL = 'http://localhost:5001/api';

// State management
let currentView = 'dashboard';
let currentSubject = null;
let currentStudent = null;
let schedules = [];
let weeklySchedule = null; // NEW: Store weekly template
let announcements = [];
let allAnnouncements = [];
let adminAnnouncements = [];
let currentAnnouncement = null;
let currentFilter = 'all';

// Get token
const getToken = () => localStorage.getItem('token');

// ============================================================================
// DATE OF BIRTH MODAL FUNCTIONS
// ============================================================================

// Check if user needs to fill in date of birth
function needsDateOfBirth() {
    if (!currentStudent) return false;
    
    // Check if dateOfBirth exists and is a valid value (not null, undefined, or empty)
    const dob = currentStudent.dateOfBirth;
    if (!dob || dob === '' || dob === null || dob === undefined) {
        return true;
    }
    
    // Check if it's a valid date
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
        return true;
    }
    
    return false;
}

// Show DOB modal
function showDobModal() {
    const modal = document.getElementById('dobModal');
    const dobInput = document.getElementById('dobInput');
    if (modal) {
        modal.classList.remove('hidden');
        // Set max date to today
        if (dobInput) {
            const today = new Date().toISOString().split('T')[0];
            dobInput.max = today;
        }
    }
}

// Hide DOB modal
function hideDobModal() {
    const modal = document.getElementById('dobModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle DOB form submission
async function handleDobSubmit(e) {
    e.preventDefault();
    
    const dobInput = document.getElementById('dobInput');
    const submitBtn = document.getElementById('saveDobBtn');
    const dateOfBirth = dobInput.value;
    
    if (!dateOfBirth) {
        if (typeof Toast !== 'undefined') {
            Toast.error('Please select your date of birth');
        }
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/users/update-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ dateOfBirth })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile');
        }
        
        const data = await response.json();
        currentStudent.dateOfBirth = dateOfBirth;
        
        if (typeof Toast !== 'undefined') {
            Toast.success('Date of birth saved successfully! Welcome to your dashboard.');
        }
        
        hideDobModal();
        
    } catch (error) {
        console.error('DOB update error:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error(error.message || 'Failed to save date of birth');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Continue';
    }
}

// Initialize DOB form handler
function initDobForm() {
    const dobForm = document.getElementById('dobForm');
    if (dobForm) {
        dobForm.addEventListener('submit', handleDobSubmit);
    }
}

// ============================================================================
// END DATE OF BIRTH MODAL FUNCTIONS
// ============================================================================

// Toggle user menu dropdown
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('userMenuContainer');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout function
function logout() {
    const token = getToken();
    
    // Call logout API
    fetch(`${API_URL}/users/logout`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    }).finally(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../login.html';
    });
}

// View profile
function viewProfile() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    // Populate profile data
    const student = currentStudent;
    if (student) {
        document.getElementById('profileAvatar').textContent = (student.name || 'S').charAt(0).toUpperCase();
        document.getElementById('profileName').textContent = student.name || '—';
        document.getElementById('profileEmail').textContent = student.email || '—';
        document.getElementById('profileGender').textContent = student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—';
        document.getElementById('profileDob').textContent = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
        document.getElementById('profileGrade').textContent = student.classGrade ? formatGradeLabel(student.classGrade) : '—';
        document.getElementById('profileSection').textContent = student.classSection || '—';
        document.getElementById('profileParentEmail').textContent = student.parent?.email || '—';
    }

    // Reset password form
    document.getElementById('changePasswordForm').reset();

    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.add('hidden');
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        Toast.error('New passwords do not match');
        return;
    }
    if (newPassword.length < 6) {
        Toast.error('Password must be at least 6 characters');
        return;
    }

    const btn = document.getElementById('changePassBtn');
    btn.disabled = true;
    btn.textContent = 'Changing...';

    try {
        const res = await apiCall('/users/change-password', 'PUT', { currentPassword, newPassword });
        if (res.success !== false) {
            Toast.success('Password changed successfully!');
            document.getElementById('changePasswordForm').reset();
        } else {
            Toast.error(res.message || 'Failed to change password');
        }
    } catch (err) {
        Toast.error(err.message || 'Failed to change password');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
    }
}

// API call function

// API call function
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();

    try {
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

            // Only redirect on authentication errors
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '../login.html';
            }

            throw new Error(error.message || 'API request failed');
        }

        return response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Get file icon based on file type
function getFileIcon(fileType) {
    if (!fileType) return 'fa-file';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('image')) return 'fa-file-image';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'fa-file-archive';
    return 'fa-file';
}

// Get file icon color
function getFileIconColor(fileType) {
    if (!fileType) return '#666';
    if (fileType.includes('pdf')) return '#dc2626';
    if (fileType.includes('word')) return '#2563eb';
    if (fileType.includes('image')) return '#059669';
    if (fileType.includes('powerpoint')) return '#ea580c';
    if (fileType.includes('excel')) return '#16a34a';
    if (fileType.includes('zip')) return '#7c3aed';
    return '#666';
}

// Format file name for display
function formatFileName(fileName) {
    if (fileName.length > 30) {
        return fileName.substring(0, 27) + '...';
    }
    return fileName;
}

// Format grade label
function formatGradeLabel(grade) {
    if (grade === 'kg1') return 'KG1';
    if (grade === 'kg2') return 'KG2';
    return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// Initialize
async function init() {
    const token = getToken();
    if (!token) {
        showError('Please log in to access the student dashboard');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return;
    }
    try {
        // Initialize DOB form handler
        initDobForm();
        
        await loadStudentData();
        updateDateTime();
        setInterval(updateDateTime, 60000);
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

// Load student data
async function loadStudentData() {
    try {
        showLoading();
        const data = await apiCall('/users/me');
        currentStudent = data.user;

        if (currentStudent.role !== 'student') {
            showError('Access denied. This dashboard is for students only.');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }

        // Update user info
        document.getElementById('userName').textContent = currentStudent.name;
        document.getElementById('userAvatar').textContent = currentStudent.name.charAt(0).toUpperCase();
        document.getElementById("classGrade").textContent =
            currentStudent.classGrade ? `Grade: ${formatGradeLabel(currentStudent.classGrade)}` : "Grade: --";

        document.getElementById("classSection").textContent =
            currentStudent.classSection ? `Section: ${currentStudent.classSection}` : "Section: --";

        // Check if student needs to fill in date of birth
        if (needsDateOfBirth()) {
            showDobModal();
        }

        await loadDashboard();

        // Check if we need to open a specific task (coming from tasks page)
        const openTaskId = sessionStorage.getItem('openTaskId');
        const openTaskSubject = sessionStorage.getItem('openTaskSubject');
        if (openTaskId && openTaskSubject) {
            sessionStorage.removeItem('openTaskId');
            sessionStorage.removeItem('openTaskSubject');
            viewTaskDetail(openTaskId, openTaskSubject);
        }
    } catch (error) {
        console.error('Error loading student data:', error);
        showError('Failed to load student data: ' + error.message);
        hideLoading();
    }
}

// NEW: Load dashboard with updated schedule structure
async function loadDashboard() {
    try {
        // Load student schedules
        const scheduleData = await apiCall(`/schedules/student/${currentStudent._id}`);
        
        // NEW: Handle the grouped schedule structure
        if (scheduleData.schedules) {
            // Convert grouped schedules back to flat array for compatibility
            schedules = [];
            Object.entries(scheduleData.schedules).forEach(([dayOfWeek, daySchedules]) => {
                daySchedules.forEach(schedule => {
                    schedules.push({
                        ...schedule,
                        dayOfWeek: dayOfWeek
                    });
                });
            });
        } else {
            schedules = [];
        }

        // Load subject announcements
        const subjects = [...new Set(schedules.map(s => s.subject))];
        const announcementPromises = subjects.map(subject =>
            apiCall(`/announcements/student?subject=${subject}`)
        );
        const results = await Promise.all(announcementPromises);
        allAnnouncements = results.flatMap(r => r.announcements || []);

        // Load admin announcements
        try {
            const adminData = await apiCall('/admin-announcements/student/my-announcements');
            adminAnnouncements = adminData.announcements || [];
            console.log(`Loaded ${adminAnnouncements.length} admin announcements`);
        } catch (error) {
            console.error('Error loading admin announcements:', error);
            adminAnnouncements = [];
        }

        renderDashboard();
        hideLoading();
    } catch (error) {
        showError(error.message);
        hideLoading();
    }
}

// Render dashboard
function renderDashboard() {
    document.getElementById('dashboardView').classList.remove('hidden');

    // Calculate stats
    const subjects = [...new Set(schedules.map(s => s.subject))];
    const pendingTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted && !a.isOverdue
    );
    const completedTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && a.hasSubmitted
    );

    // Calculate average grade
    const gradedSubmissions = allAnnouncements.filter(a =>
        a.hasSubmitted && a.submission && a.submission.grade !== undefined
    );
    let avgGrade = '--';
    if (gradedSubmissions.length > 0) {
        const totalPercentage = gradedSubmissions.reduce((sum, a) => {
            return sum + (a.submission.grade / a.totalPoints) * 100;
        }, 0);
        avgGrade = Math.round(totalPercentage / gradedSubmissions.length) + '%';
    }

    // Update stats
    document.getElementById('totalSubjects').textContent = subjects.length;
    document.getElementById('pendingTasks').textContent = pendingTasks.length;
    document.getElementById('avgGrade').textContent = avgGrade;
    document.getElementById('completedTasks').textContent = completedTasks.length;

    // Update notification count - only count unread admin announcements
    const unreadAdminAnnouncements = adminAnnouncements.filter(a => !a.isViewed).length;
    const notificationCount = document.getElementById('notificationCount');
    if (notificationCount) {
        notificationCount.textContent = unreadAdminAnnouncements;
        notificationCount.style.display = unreadAdminAnnouncements > 0 ? 'flex' : 'none';
    }

    // Render today's schedule
    renderTodaySchedule();

    // Render subjects
    renderSubjects(subjects);

    // Render upcoming tasks
    renderUpcomingTasks();

    // Render admin announcements section
    renderAdminAnnouncementsSection();

    // Render student charts
    renderStudentCharts();

    lucide.createIcons();
}

// ============================================================================
// STUDENT CHARTS FUNCTIONS
// ============================================================================

// Render all student charts
async function renderStudentCharts() {
    renderAttendanceChart();
    renderTasksChart();
    renderSubjectPerformanceChart();
}

// Attendance Chart (Doughnut)
async function renderAttendanceChart() {
    const ctx = document.getElementById('studentAttendanceChart');
    if (!ctx) return;

    try {
        const token = getToken();
        const response = await fetch(`${API_URL}/attendance/my-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let stats = { present: 0, absent: 0, late: 0, excused: 0 };
        if (response.ok) {
            const data = await response.json();
            stats = data.stats || stats;
        }

        const total = stats.present + stats.absent + stats.late + stats.excused;

        if (total === 0) {
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e2e8f0'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: { legend: { display: false } }
                }
            });
            return;
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent', 'Late', 'Excused'],
                datasets: [{
                    data: [stats.present, stats.absent, stats.late, stats.excused],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading attendance chart:', error);
    }
}

// Tasks Progress Chart (Doughnut)
function renderTasksChart() {
    const ctx = document.getElementById('studentTasksChart');
    if (!ctx) return;

    const pendingTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted && !a.isOverdue
    ).length;
    
    const completedTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && a.hasSubmitted
    ).length;
    
    const overdueTasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted && a.isOverdue
    ).length;

    const total = pendingTasks + completedTasks + overdueTasks;

    if (total === 0) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Tasks'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { display: false } }
            }
        });
        return;
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'Overdue'],
            datasets: [{
                data: [completedTasks, pendingTasks, overdueTasks],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw} task${context.raw !== 1 ? 's' : ''}`;
                        }
                    }
                }
            }
        }
    });
}

// Subject Performance Chart (Bar)
function renderSubjectPerformanceChart() {
    const ctx = document.getElementById('studentSubjectChart');
    if (!ctx) return;

    // Get all subjects from the student's schedule
    const scheduleSubjects = [...new Set(schedules.map(s => s.subject))];
    
    // Group submissions by subject and calculate average grades
    const subjectGrades = {};
    scheduleSubjects.forEach(subject => {
        subjectGrades[subject] = { total: 0, count: 0, avg: null };
    });
    
    allAnnouncements.forEach(a => {
        if (a.hasSubmitted && a.submission && a.submission.grade !== undefined && a.totalPoints > 0) {
            const subject = a.subject;
            if (!subjectGrades[subject]) {
                subjectGrades[subject] = { total: 0, count: 0, avg: null };
            }
            const percentage = (a.submission.grade / a.totalPoints) * 100;
            subjectGrades[subject].total += percentage;
            subjectGrades[subject].count++;
        }
    });

    // Calculate averages
    Object.keys(subjectGrades).forEach(subject => {
        if (subjectGrades[subject].count > 0) {
            subjectGrades[subject].avg = Math.round(subjectGrades[subject].total / subjectGrades[subject].count);
        }
    });

    const subjects = Object.keys(subjectGrades).slice(0, 6);
    
    if (subjects.length === 0) {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Subjects'],
                datasets: [{
                    data: [0],
                    backgroundColor: ['#e2e8f0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
        return;
    }

    const averages = subjects.map(s => subjectGrades[s].avg || 0);
    
    const colors = subjects.map((s, i) => {
        // Color based on grade: green for high, yellow for medium, red for low
        const avg = subjectGrades[s].avg;
        if (avg === null) return '#e2e8f0'; // No grade yet - gray
        if (avg >= 80) return '#10b981'; // High - green
        if (avg >= 60) return '#f59e0b'; // Medium - amber
        return '#ef4444'; // Low - red
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [{
                label: 'Grade %',
                data: averages,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            if (context.raw === 0) return 'No grades yet';
                            return `Grade: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: { 
                        font: { size: 11 }, 
                        color: '#64748b',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#64748b' }
                }
            }
        }
    });
}

// ============================================================================
// END STUDENT CHARTS FUNCTIONS
// ============================================================================

// NEW: Render admin announcements section (keeping your existing implementation)
function renderAdminAnnouncementsSection() {
    const dashboardView = document.getElementById('dashboardView');

    let adminSection = document.getElementById('adminAnnouncementsSection');

    if (!adminSection) {
        adminSection = document.createElement('div');
        adminSection.id = 'adminAnnouncementsSection';
        adminSection.style.marginTop = '24px';

        const statsGrid = document.querySelector('.stats-grid');
        statsGrid.parentNode.insertBefore(adminSection, statsGrid.nextSibling);
    }

    if (adminAnnouncements.length === 0) {
        adminSection.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i data-lucide="megaphone"></i>
                        School Announcements
                    </h2>
                </div>
                <div class="empty-state">
                    <i data-lucide="inbox"></i>
                    <p>No announcements at this time</p>
                </div>
            </div>
        `;
    } else {
        const personalAnnouncements = adminAnnouncements.filter(a => 
            a.isForSpecificStudents && a.targetStudents && 
            a.targetStudents.some(id => id === currentStudent._id || id._id === currentStudent._id)
        );
        
        const gradeAnnouncements = adminAnnouncements.filter(a => 
            !a.isForSpecificStudents
        );

        const sortByDate = (arr) => arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const recentPersonal = sortByDate([...personalAnnouncements]).slice(0, 3);
        const recentGrade = sortByDate([...gradeAnnouncements]).slice(0, 3);

        adminSection.innerHTML = `
            ${personalAnnouncements.length > 0 ? `
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="user-check"></i>
                            Personal Announcements
                            ${personalAnnouncements.filter(a => !a.isViewed).length > 0 ?
                                `<span class="due-badge urgent" style="margin-left: 10px;">${personalAnnouncements.filter(a => !a.isViewed).length} New</span>`
                                : ''}
                        </h2>
                        ${personalAnnouncements.length > 3 ?
                            `<a href="#" class="view-all-link" onclick="viewAllPersonalAnnouncements(); return false;">
                                View All (${personalAnnouncements.length})
                                <i data-lucide="arrow-right"></i>
                            </a>`
                            : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${recentPersonal.map(announcement => renderAnnouncementCard(announcement, true)).join('')}
                    </div>
                </div>
            ` : ''}

            ${gradeAnnouncements.length > 0 ? `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="megaphone"></i>
                            School & Grade Announcements
                            ${gradeAnnouncements.filter(a => !a.isViewed).length > 0 ?
                                `<span class="due-badge normal" style="margin-left: 10px;">${gradeAnnouncements.filter(a => !a.isViewed).length} New</span>`
                                : ''}
                        </h2>
                        ${gradeAnnouncements.length > 3 ?
                            `<a href="#" class="view-all-link" onclick="viewAllGradeAnnouncements(); return false;">
                                View All (${gradeAnnouncements.length})
                                <i data-lucide="arrow-right"></i>
                            </a>`
                            : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${recentGrade.map(announcement => renderAnnouncementCard(announcement, false)).join('')}
                    </div>
                </div>
            ` : ''}

            ${personalAnnouncements.length === 0 && gradeAnnouncements.length === 0 ? `
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i data-lucide="megaphone"></i>
                            School Announcements
                        </h2>
                    </div>
                    <div class="empty-state">
                        <i data-lucide="inbox"></i>
                        <p>No announcements at this time</p>
                    </div>
                </div>
            ` : ''}
        `;
    }

    lucide.createIcons();
}

// Helper function to render individual announcement card
function renderAnnouncementCard(announcement, isPersonal) {
    const date = new Date(announcement.createdAt);
    const categoryColors = {
        general: { bg: '#eef2ff', color: '#4f46e5' },
        urgent: { bg: '#fee2e2', color: '#dc2626' },
        event: { bg: '#fef3c7', color: '#d97706' },
        academic: { bg: '#d1fae5', color: '#059669' }
    };
    const colors = categoryColors[announcement.category] || categoryColors.general;

    let targetingInfo = '';
    if (isPersonal) {
        targetingInfo = `
            <span style="display: flex; align-items: center; gap: 6px; color: #dc2626; font-weight: 500;">
                <i data-lucide="user-check" style="width: 14px; height: 14px;"></i>
                Personal Message
            </span>
        `;
    } else {
        if (announcement.isForAllGrades && announcement.isForAllSections) {
            targetingInfo = `
                <span style="display: flex; align-items: center; gap: 6px; color: #059669; font-weight: 500;">
                    <i data-lucide="megaphone" style="width: 14px; height: 14px;"></i>
                    All Students
                </span>
            `;
        } else if (announcement.targetGrades && announcement.targetGrades.length > 0) {
            const gradeText = announcement.targetGrades.map(formatGradeLabel).join(', ');
            const sectionText = announcement.targetSections && announcement.targetSections.length > 0 && !announcement.isForAllSections
                ? ` - Section${announcement.targetSections.length > 1 ? 's' : ''} ${announcement.targetSections.join(', ')}`
                : '';
            targetingInfo = `
                <span style="display: flex; align-items: center; gap: 6px; color: #4f46e5; font-weight: 500;">
                    <i data-lucide="users" style="width: 14px; height: 14px;"></i>
                    ${gradeText}${sectionText}
                </span>
            `;
        }
    }

    return `
        <div class="announcement-item" onclick="viewAdminAnnouncement('${announcement._id}')" 
             style="cursor: pointer; padding: 16px; background: var(--bg-secondary); border-radius: 8px; transition: all 0.2s; border-left: 4px solid ${isPersonal ? '#dc2626' : colors.color};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                        <span style="background: ${colors.bg}; color: ${colors.color}; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                            ${announcement.category}
                        </span>
                        ${!announcement.isViewed ? '<span class="due-badge urgent" style="font-size: 0.75rem;">New</span>' : ''}
                        ${isPersonal ? '<span style="background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;"><i data-lucide="user-check" style="width: 12px; height: 12px;"></i> FOR YOU</span>' : ''}
                    </div>
                    <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 6px;">${announcement.title}</h4>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 8px;">
                        ${announcement.content.length > 150 ? announcement.content.substring(0, 150) + '...' : announcement.content}
                    </p>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: var(--text-secondary);">
                        <span>
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            ${date.toLocaleDateString()}
                        </span>
                        <span>
                            <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                            ${announcement.author?.name || 'Admin'}
                        </span>
                        ${targetingInfo}
                    </div>
                </div>
                <i data-lucide="chevron-right" style="color: var(--text-secondary);"></i>
            </div>
        </div>
    `;
}

// UPDATED: Render today's schedule
function renderTodaySchedule() {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaySchedules = schedules.filter(s => s.dayOfWeek === today);
    const container = document.getElementById('todaySchedule');

    if (todaySchedules.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar-x"></i>
                <p>No classes scheduled for today</p>
            </div>
        `;
    } else {
        const sortedSchedules = todaySchedules.sort((a, b) => {
            return a.startTime.localeCompare(b.startTime);
        });

        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        container.innerHTML = sortedSchedules.map(schedule => {
            const isActive = currentTime >= schedule.startTime && currentTime <= schedule.endTime;
            return `
                <div class="schedule-item ${isActive ? 'active' : ''}">
                    <div class="schedule-time">
                        <i data-lucide="clock"></i>
                        ${schedule.startTime} - ${schedule.endTime}
                        ${isActive ? '<span style="color: var(--secondary); font-weight: 600; margin-left: 8px;">• In Progress</span>' : ''}
                    </div>
                    <div class="schedule-subject">${schedule.subject}</div>
                    <div class="schedule-room">
                        <i data-lucide="user" style="width: 14px; height: 14px;"></i>
                        ${schedule.teacher?.name || 'N/A'}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Render subjects
function renderSubjects(subjects) {
    const container = document.getElementById('subjectsGrid');

    if (subjects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="book-open"></i>
                <p>No subjects assigned yet</p>
            </div>
        `;
        return;
    }

    const subjectColors = [
        { bg: '#eef2ff', color: '#4f46e5' },
        { bg: '#fef3c7', color: '#d97706' },
        { bg: '#d1fae5', color: '#059669' },
        { bg: '#fee2e2', color: '#dc2626' },
        { bg: '#e0e7ff', color: '#6366f1' },
        { bg: '#fce7f3', color: '#db2777' }
    ];

    container.innerHTML = subjects.map((subject, index) => {
        const subjectSchedules = schedules.filter(s => s.subject === subject);
        const teacher = subjectSchedules[0]?.teacher;
        const color = subjectColors[index % subjectColors.length];

        const subjectAnnouncements = allAnnouncements.filter(a => a.subject === subject);
        const assignments = subjectAnnouncements.filter(a => a.type === 'assignment');
        const pending = subjectAnnouncements.filter(a =>
            (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted
        ).length;

        return `
            <div class="subject-card" onclick="viewSubject('${subject}')" style="border-top-color: ${color.color};">
                <div class="subject-header">
                    <div class="subject-icon" style="background: ${color.bg};">
                        <i data-lucide="book" style="color: ${color.color};"></i>
                    </div>
                    ${pending > 0 ? `<span class="due-badge urgent">${pending} pending</span>` : ''}
                </div>
                <div class="subject-name">${subject}</div>
                <div class="subject-teacher">${teacher ? teacher.name : 'No teacher assigned'}</div>
                <div class="subject-stats">
                    <div class="subject-stat">
                        <i data-lucide="calendar"></i>
                        ${subjectSchedules.length} classes/week
                    </div>
                    <div class="subject-stat">
                        <i data-lucide="file-text"></i>
                        ${assignments.length} assignments
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
// Render upcoming tasks
function renderUpcomingTasks() {
    const container = document.getElementById('upcomingTasks');

    let tasks = allAnnouncements.filter(a =>
        (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted
    );

    // Apply filter
    if (currentFilter !== 'all') {
        tasks = tasks.filter(t => t.type === currentFilter);
    }

    // Sort by due date
    tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle"></i>
                <p>All caught up! No pending tasks</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tasks.slice(0, 5).map(task => {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        let dueBadge = 'normal';
        let dueText = `${daysUntil} days`;

        if (daysUntil < 0) {
            dueBadge = 'urgent';
            dueText = 'Overdue';
        } else if (daysUntil === 0) {
            dueBadge = 'urgent';
            dueText = 'Due today';
        } else if (daysUntil === 1) {
            dueBadge = 'soon';
            dueText = 'Due tomorrow';
        } else if (daysUntil <= 3) {
            dueBadge = 'soon';
        }

        const icon = task.type === 'quiz' ? 'award' : 'file-text';
        const iconColor = task.type === 'quiz' ? '#7c3aed' : '#4f46e5';

        // Check if has attachments
        const hasAttachments = task.attachments && task.attachments.length > 0;

        return `
            <div class="assignment-item" onclick="viewTaskDetail('${task._id}', '${task.subject}')">
                <div class="assignment-header">
                    <div class="assignment-title">
                        <i data-lucide="${icon}" style="color: ${iconColor};"></i>
                        ${task.title}
                        ${hasAttachments ? '<i data-lucide="paperclip" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>' : ''}
                    </div>
                    <span class="due-badge ${dueBadge}">${dueText}</span>
                </div>
                <div class="assignment-meta">
                    <span>
                        <i data-lucide="book" style="width: 14px; height: 14px;"></i>
                        ${task.subject}
                    </span>
                    <span>
                        <i data-lucide="target" style="width: 14px; height: 14px;"></i>
                        ${task.totalPoints} points
                    </span>
                    <span>${dueDate.toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }).join('');
}

// View subject
async function viewSubject(subjectName) {
    try {
        showLoading();
        currentSubject = {
            name: subjectName,
            schedules: schedules.filter(s => s.subject === subjectName),
            teacher: schedules.find(s => s.subject === subjectName)?.teacher
        };

        const data = await apiCall(`/announcements/student?subject=${subjectName}`);
        announcements = data.announcements || [];

        renderSubjectView();

        document.getElementById('dashboardView').classList.add('hidden');
        document.getElementById('subjectView').classList.remove('hidden');

        hideLoading();
    } catch (error) {
        showError(error.message);
        hideLoading();
    }
}

// Render subject view
function renderSubjectView() {
    document.getElementById('subjectTitle').textContent = currentSubject.name;
    document.getElementById('subjectTeacher').textContent = currentSubject.teacher ?
        `Instructor: ${currentSubject.teacher.name}` : '';

    // Calculate subject stats
    const assignments = announcements.filter(a => a.type === 'assignment');
    const quizzes = announcements.filter(a => a.type === 'quiz');

    const gradedItems = announcements.filter(a =>
        a.hasSubmitted && a.submission && a.submission.grade !== undefined
    );
    let subjectGrade = '--';
    if (gradedItems.length > 0) {
        const totalPercentage = gradedItems.reduce((sum, a) => {
            return sum + (a.submission.grade / a.totalPoints) * 100;
        }, 0);
        subjectGrade = Math.round(totalPercentage / gradedItems.length) + '%';
    }

    document.getElementById('subjectGrade').textContent = subjectGrade;
    document.getElementById('subjectAssignments').textContent = assignments.length;
    document.getElementById('subjectQuizzes').textContent = quizzes.length;
    document.getElementById('subjectClasses').textContent = currentSubject.schedules.length;

    // Render schedules
    const scheduleGrid = document.getElementById('subjectScheduleGrid');
    scheduleGrid.innerHTML = currentSubject.schedules.map(schedule => `
        <div class="schedule-item">
            <div style="font-weight: 600; margin-bottom: 4px;">${schedule.dayOfWeek}</div>
            <div class="schedule-time">
                <i data-lucide="clock"></i>
                ${schedule.startTime} - ${schedule.endTime}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                Room ${schedule.room}
            </div>
        </div>
    `).join('');

    // Filter announcements
    const regularAnnouncements = announcements.filter(a => a.type === 'announcement');
    const assignmentsList = announcements.filter(a => a.type === 'assignment');
    const quizzesList = announcements.filter(a => a.type === 'quiz');

    // Render lists
    renderAnnouncementsList(regularAnnouncements, 'announcementsList');
    renderAssignmentsList(assignmentsList, 'assignmentsList');
    renderQuizzesList(quizzesList, 'quizzesList');

    lucide.createIcons();
}

// Switch tabs
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('announcementsTab').classList.add('hidden');
    document.getElementById('assignmentsTab').classList.add('hidden');
    document.getElementById('quizzesTab').classList.add('hidden');

    if (tabName === 'announcements') {
        document.getElementById('announcementsTab').classList.remove('hidden');
    } else if (tabName === 'assignments') {
        document.getElementById('assignmentsTab').classList.remove('hidden');
    } else if (tabName === 'quizzes') {
        document.getElementById('quizzesTab').classList.remove('hidden');
    }
}

// Render announcements list
function renderAnnouncementsList(items, containerId) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No announcements yet</p></div>`;
    } else {
        container.innerHTML = items.map(item => {
            const hasAttachments = item.attachments && item.attachments.length > 0;
            return `
                <div class="assignment-item" onclick="viewAnnouncement('${item._id}')">
                    <div class="assignment-header">
                        <div class="assignment-title">
                            <i data-lucide="megaphone"></i>
                            ${item.title}
                            ${hasAttachments ? `<i data-lucide="paperclip" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>` : ''}
                        </div>
                        ${!item.hasViewed ? '<span class="due-badge urgent">New</span>' : ''}
                    </div>
                    <p style="color: var(--text-secondary); margin: 8px 0;">${item.description}</p>
                    <div class="assignment-meta">
                        <span>${new Date(item.createdAt).toLocaleDateString()}</span>
                        <span class="due-badge normal">${item.priority}</span>
                        ${hasAttachments ? `<span><i data-lucide="paperclip" style="width: 14px; height: 14px;"></i> ${item.attachments.length} file(s)</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Render assignments list
function renderAssignmentsList(items, containerId) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No assignments yet</p></div>`;
    } else {
        container.innerHTML = items.map(item => {
            const isOverdue = item.isOverdue;
            const hasSubmitted = item.hasSubmitted;
            const hasAttachments = item.attachments && item.attachments.length > 0;

            return `
                <div class="assignment-item" onclick="viewAnnouncement('${item._id}')">
                    <div class="assignment-header">
                        <div class="assignment-title">
                            <i data-lucide="file-text" style="color: #4f46e5;"></i>
                            ${item.title}
                            ${hasAttachments ? `<i data-lucide="paperclip" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>` : ''}
                        </div>
                        ${hasSubmitted ? '<i data-lucide="check-circle" style="color: var(--secondary);"></i>' :
                    isOverdue ? '<span class="due-badge urgent">Overdue</span>' : ''}
                    </div>
                    <p style="color: var(--text-secondary); margin: 8px 0;">${item.description}</p>
                    <div class="assignment-meta">
                        <span style="color: ${isOverdue && !hasSubmitted ? 'var(--danger)' : 'inherit'}">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            Due: ${new Date(item.dueDate).toLocaleDateString()}
                        </span>
                        <span>
                            <i data-lucide="target" style="width: 14px; height: 14px;"></i>
                            ${item.totalPoints} points
                        </span>
                        ${hasAttachments ? `<span><i data-lucide="paperclip" style="width: 14px; height: 14px;"></i> ${item.attachments.length} file(s)</span>` : ''}
                        ${hasSubmitted && item.submission?.grade !== undefined ?
                    `<span style="color: var(--secondary); font-weight: 600;">
                                Grade: ${item.submission.grade}/${item.totalPoints}
                            </span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Render quizzes list
function renderQuizzesList(items, containerId) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No quizzes yet</p></div>`;
    } else {
        container.innerHTML = items.map(item => {
            const isOverdue = item.isOverdue;
            const hasSubmitted = item.hasSubmitted;
            const hasAttachments = item.attachments && item.attachments.length > 0;

            return `
                <div class="assignment-item" onclick="viewAnnouncement('${item._id}')">
                    <div class="assignment-header">
                        <div class="assignment-title">
                            <i data-lucide="award" style="color: #7c3aed;"></i>
                            ${item.title}
                            ${hasAttachments ? `<i data-lucide="paperclip" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>` : ''}
                        </div>
                        ${hasSubmitted ? '<i data-lucide="check-circle" style="color: var(--secondary);"></i>' :
                    isOverdue ? '<span class="due-badge urgent">Closed</span>' : ''}
                    </div>
                    <p style="color: var(--text-secondary); margin: 8px 0;">${item.description}</p>
                    <div class="assignment-meta">
                        <span style="color: ${isOverdue && !hasSubmitted ? 'var(--danger)' : 'inherit'}">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            Due: ${new Date(item.dueDate).toLocaleDateString()}
                        </span>
                        <span>
                            <i data-lucide="help-circle" style="width: 14px; height: 14px;"></i>
                            ${item.questions?.length || 0} questions
                        </span>
                        <span>
                            <i data-lucide="target" style="width: 14px; height: 14px;"></i>
                            ${item.totalPoints} points
                        </span>
                        ${hasAttachments ? `<span><i data-lucide="paperclip" style="width: 14px; height: 14px;"></i> ${item.attachments.length} file(s)</span>` : ''}
                        ${hasSubmitted && item.submission?.grade !== undefined ?
                    `<span style="color: var(--secondary); font-weight: 600;">
                                Score: ${item.submission.grade}/${item.totalPoints}
                            </span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

// View announcement detail
function viewAnnouncement(announcementId) {
    currentAnnouncement = announcements.find(a => a._id === announcementId);
    if (!currentAnnouncement) return;

    const showSubmissionForm = currentAnnouncement.type !== 'announcement' && !currentAnnouncement.hasSubmitted;

    if (showSubmissionForm) {
        renderSubmissionForm();
    } else {
        renderAnnouncementDetail();
    }

    document.getElementById('subjectView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    lucide.createIcons();
}

// View task detail from dashboard
async function viewTaskDetail(announcementId, subject) {
    await viewSubject(subject);
    setTimeout(() => viewAnnouncement(announcementId), 100);
}

// Render announcement detail with attachments
function renderAnnouncementDetail() {
    const item = currentAnnouncement;
    const detailView = document.getElementById('detailView');

    const hasAttachments = item.attachments && item.attachments.length > 0;

    detailView.innerHTML = `
        <button class="back-btn" onclick="backToSubject()">
            <i data-lucide="arrow-left"></i>
            Back
        </button>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span class="due-badge ${item.type === 'announcement' ? 'normal' : item.type === 'assignment' ? 'soon' : 'urgent'}">
                    ${item.type.toUpperCase()}
                </span>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">
                    Posted on ${new Date(item.createdAt).toLocaleDateString()}
                </span>
            </div>

            <h1 style="font-size: 2rem; margin-bottom: 16px;">${item.title}</h1>
            <div style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">${item.description}</div>

            ${hasAttachments ? `
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <i data-lucide="paperclip"></i>
                        Attachments (${item.attachments.length})
                    </h3>
                    <div style="display: grid; gap: 12px;">
                        ${item.attachments.map(attachment => `
                            <a href="http://localhost:5001${attachment.fileUrl}" 
                               target="_blank" 
                               download="${attachment.fileName}"
                               style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.2s;"
                               onmouseover="this.style.borderColor='var(--primary)'; this.style.backgroundColor='var(--bg-hover)';"
                               onmouseout="this.style.borderColor='var(--border)'; this.style.backgroundColor='white';">
                                <i class="fas ${getFileIcon(attachment.fileType)}" style="font-size: 24px; color: ${getFileIconColor(attachment.fileType)};"></i>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${attachment.fileName}">
                                        ${formatFileName(attachment.fileName)}
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                        Click to download
                                    </div>
                                </div>
                                <i data-lucide="download" style="color: var(--primary);"></i>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${item.type !== 'announcement' ? `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
                    <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">Due Date</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${new Date(item.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 4px;">Total Points</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${item.totalPoints}</div>
                    </div>
                </div>
            ` : ''}

            ${item.hasSubmitted && item.submission ? `
                <div style="background: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 12px; padding: 20px; margin-top: 24px;">
                    <h3 style="display: flex; align-items: center; gap: 8px; color: #065f46; margin-bottom: 16px;">
                        <i data-lucide="check-circle"></i>
                        Submission Status
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #065f46;">Submitted:</span>
                            <span style="font-weight: 600; color: #065f46;">
                                ${new Date(item.submission.submittedAt).toLocaleString()}
                            </span>
                        </div>
                        ${item.submission.isLate ? `
                            <div style="color: #ea580c; font-size: 0.9rem;">
                                ⚠️ Submitted after due date
                            </div>
                        ` : ''}
                        ${item.submission.grade !== undefined ? `
                            <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #6ee7b7;">
                                <span style="color: #065f46; font-weight: 600;">Grade:</span>
                                <span style="font-size: 1.5rem; font-weight: 700; color: #065f46;">
                                    ${item.submission.grade}/${item.totalPoints}
                                </span>
                            </div>
                        ` : ''}
                        ${item.submission.feedback ? `
                            <div style="padding-top: 12px; border-top: 2px solid #6ee7b7;">
                                <span style="color: #065f46; font-weight: 600; display: block; margin-bottom: 8px;">
                                    Teacher Feedback:
                                </span>
                                <div style="background: white; padding: 12px; border-radius: 8px; color: #1f2937;">
                                    ${item.submission.feedback}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    lucide.createIcons();
}

// Updated submission form rendering with file upload
function renderSubmissionForm() {
    const item = currentAnnouncement;
    const detailView = document.getElementById('detailView');
    const hasAttachments = item.attachments && item.attachments.length > 0;

    detailView.innerHTML = `
        <button class="back-btn" onclick="backToSubject()">
            <i data-lucide="arrow-left"></i>
            Back
        </button>

        <div class="card">
            <h1 style="font-size: 2rem; margin-bottom: 8px;">${item.title}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">${item.description}</p>

            ${hasAttachments ? `
                <div style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <h3 style="display: flex; align-items: center; gap: 8px; color: #1e40af; margin-bottom: 16px;">
                        <i data-lucide="paperclip"></i>
                        Assignment Materials (${item.attachments.length})
                    </h3>
                    <div style="display: grid; gap: 12px;">
                        ${item.attachments.map(attachment => `
                            <a href="http://localhost:5001${attachment.fileUrl}" 
                               target="_blank" 
                               download="${attachment.fileName}"
                               style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border: 1px solid #93c5fd; border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.2s;"
                               onmouseover="this.style.borderColor='#1e40af'; this.style.backgroundColor='#f0f9ff';"
                               onmouseout="this.style.borderColor='#93c5fd'; this.style.backgroundColor='white';">
                                <i class="fas ${getFileIcon(attachment.fileType)}" style="font-size: 24px; color: ${getFileIconColor(attachment.fileType)};"></i>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 500; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${attachment.fileName}">
                                        ${formatFileName(attachment.fileName)}
                                    </div>
                                    <div style="font-size: 0.85rem; color: #1e40af;">
                                        Click to download and view
                                    </div>
                                </div>
                                <i data-lucide="download" style="color: #1e40af;"></i>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div id="submissionError" class="error-message hidden"></div>

            <form id="submissionForm" onsubmit="handleSubmit(event)">
                ${item.type === 'assignment' ? `
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px;">Your Answer</label>
                        <textarea 
                            id="assignmentContent" 
                            style="width: 100%; min-height: 200px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.95rem;"
                            placeholder="Type your answer here..."
                            required
                        ></textarea>
                    </div>

                    <!-- File Upload Section -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 8px;">
                            <i data-lucide="paperclip" style="width: 18px; height: 18px;"></i>
                            Attach Files (Optional)
                        </label>
                        <div style="border: 2px dashed var(--border); border-radius: 12px; padding: 20px; text-align: center; background: var(--bg-secondary); transition: all 0.2s;" id="fileDropZone">
                            <input 
                                type="file" 
                                id="fileInput" 
                                multiple 
                                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
                                style="display: none;"
                                onchange="handleFileSelect(event)"
                            />
                            <i data-lucide="upload-cloud" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 12px;"></i>
                            <p style="color: var(--text-secondary); margin-bottom: 8px;">
                                Click to upload or drag and drop
                            </p>
                            <p style="font-size: 0.85rem; color: var(--text-secondary);">
                                PDF, DOC, DOCX, TXT, JPG, PNG, ZIP (Max 10MB per file)
                            </p>
                            <button 
                                type="button" 
                                onclick="document.getElementById('fileInput').click()"
                                style="margin-top: 12px; padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;"
                            >
                                Choose Files
                            </button>
                        </div>
                        <div id="fileList" style="margin-top: 12px;"></div>
                    </div>
                ` : ''}

                ${item.type === 'quiz' && item.questions ? `
                    <div id="questionsContainer">
                        ${item.questions.map((question, index) => `
                            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                                <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                                    <div style="width: 40px; height: 40px; background: var(--primary); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;">
                                        ${index + 1}
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 8px;">${question.question}</p>
                                        <span style="font-size: 0.85rem; color: var(--text-secondary);">${question.points} points</span>
                                    </div>
                                </div>

                                ${question.type === 'multiple-choice' ? `
                                    <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 56px;">
                                        ${question.options.map((option, optIndex) => `
                                            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                                <input 
                                                    type="radio" 
                                                    name="question-${index}" 
                                                    value="${option}"
                                                    style="width: 18px; height: 18px;"
                                                    required
                                                />
                                                <span>${option}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${question.type === 'true-false' ? `
                                    <div style="display: flex; flex-direction: column; gap: 10px; margin-left: 56px;">
                                        ${['True', 'False'].map(option => `
                                            <label style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                                                <input 
                                                    type="radio" 
                                                    name="question-${index}" 
                                                    value="${option}"
                                                    style="width: 18px; height: 18px;"
                                                    required
                                                />
                                                <span>${option}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                ` : ''}

                                ${question.type === 'short-answer' || question.type === 'essay' ? `
                                    <textarea 
                                        name="question-${index}"
                                        style="width: 100%; min-height: ${question.type === 'essay' ? '150px' : '80px'}; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; margin-left: 56px;"
                                        placeholder="Type your answer here..."
                                        required
                                    ></textarea>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 2px solid var(--border); margin-top: 20px;">
                    <div>
                        ${item.isOverdue ? `
                            <span style="color: var(--danger); font-weight: 500;">
                                ⚠️ This submission will be marked as late
                            </span>
                        ` : `
                            <span style="color: var(--text-secondary);">
                                Due: ${new Date(item.dueDate).toLocaleDateString()} at 
                                ${new Date(item.dueDate).toLocaleTimeString()}
                            </span>
                        `}
                    </div>

                    <button type="submit" class="btn btn-primary" id="submitBtn">
                        <i data-lucide="send"></i>
                        Submit ${item.type === 'quiz' ? 'Quiz' : 'Assignment'}
                    </button>
                </div>
            </form>
        </div>
    `;

    // Add drag and drop functionality
    const dropZone = document.getElementById('fileDropZone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.backgroundColor = 'var(--bg-hover)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.backgroundColor = 'var(--bg-secondary)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.backgroundColor = 'var(--bg-secondary)';

            const files = e.dataTransfer.files;
            handleFiles(files);
        });
    }

    lucide.createIcons();
}

// Store selected files
let selectedFiles = [];

// Handle file selection
function handleFileSelect(event) {
    const files = event.target.files;
    handleFiles(files);
}

// Handle files
function handleFiles(files) {
    const fileArray = Array.from(files);

    // Validate file size (10MB max per file)
    const maxSize = 10 * 1024 * 1024;
    const invalidFiles = fileArray.filter(file => file.size > maxSize);

    if (invalidFiles.length > 0) {
        if (typeof Toast !== 'undefined') {
            Toast.error(`Some files exceed 10MB limit: ${invalidFiles.map(f => f.name).join(', ')}`);
        }
        return;
    }

    // Add files to selected files array
    selectedFiles = [...selectedFiles, ...fileArray];
    displayFileList();
}

// Display selected files
function displayFileList() {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    if (selectedFiles.length === 0) {
        fileList.innerHTML = '';
        return;
    }

    fileList.innerHTML = `
        <div style="background: white; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 600;">Selected Files (${selectedFiles.length})</span>
                <button 
                    type="button" 
                    onclick="clearAllFiles()"
                    style="padding: 4px 8px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;"
                >
                    Clear All
                </button>
            </div>
            ${selectedFiles.map((file, index) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                        <i class="fas ${getFileIcon(file.type)}" style="color: ${getFileIconColor(file.type)}; font-size: 20px;"></i>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 500; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${file.name}
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                ${formatFileSize(file.size)}
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onclick="removeFile(${index})"
                        style="padding: 4px 8px; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;"
                    >
                        Remove
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

// Remove single file
function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayFileList();
}

// Clear all files
function clearAllFiles() {
    selectedFiles = [];
    document.getElementById('fileInput').value = '';
    displayFileList();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Updated handle submit with file upload
async function handleSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const errorDiv = document.getElementById('submissionError');
    errorDiv.classList.add('hidden');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            Submitting...
        `;

        // Use FormData to handle file uploads
        const formData = new FormData();

        if (currentAnnouncement.type === 'assignment') {
            const content = document.getElementById('assignmentContent').value;
            if (!content.trim()) {
                throw new Error('Please enter your answer');
            }
            formData.append('content', content);

            // Add files to FormData
            selectedFiles.forEach((file) => {
                formData.append('files', file);
            });
        }

        if (currentAnnouncement.type === 'quiz') {
            const answers = [];
            currentAnnouncement.questions.forEach((question, index) => {
                const input = document.querySelector(`[name="question-${index}"]:checked`) ||
                    document.querySelector(`[name="question-${index}"]`);

                if (!input || !input.value) {
                    throw new Error('Please answer all questions');
                }

                answers.push({ answer: input.value });
            });
            formData.append('answers', JSON.stringify(answers));
        }

        // Make API call with FormData
        const token = getToken();
        const response = await fetch(`${API_URL}/announcements/${currentAnnouncement._id}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Submission failed');
        }

        if (typeof Toast !== 'undefined') {
            Toast.success('Submitted successfully!');
        }

        // Clear selected files
        selectedFiles = [];

        // Reload subject view
        await viewSubject(currentSubject.name);

    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');

        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <i data-lucide="send"></i>
            Submit ${currentAnnouncement.type === 'quiz' ? 'Quiz' : 'Assignment'}
        `;
        lucide.createIcons();
    }
}
// Back to subject view
function backToSubject() {
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('subjectView').classList.remove('hidden');
    currentAnnouncement = null;
}

// Back to dashboard
document.addEventListener('DOMContentLoaded', () => {
    const backToDashboardBtn = document.getElementById('backToDashboard');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            document.getElementById('subjectView').classList.add('hidden');
            document.getElementById('dashboardView').classList.remove('hidden');
            currentSubject = null;
            announcements = [];
        });
    }

    // Notification button click handler
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNotifications();
        });
    }
});

// Filter tasks
function filterTasks(filter) {
    currentFilter = filter;
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(filter) || (filter === 'all' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });
    renderUpcomingTasks();
    lucide.createIcons();
}

// View all tasks
function viewAllTasks() {
    if (typeof Toast !== 'undefined') {
        Toast.info('View all tasks feature coming soon!');
    }
}

// Toggle theme
function toggleTheme() {
    if (typeof Toast !== 'undefined') {
        Toast.info('Dark mode coming soon!');
    }
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

// Show notifications panel
function showNotifications() {
    // Get all unread notifications - sorted from newest to oldest
    const unreadAdminAnnouncements = adminAnnouncements
        .filter(a => !a.isViewed)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get non-submitted assignments and quizzes - sorted by due date (soonest first)
    const nonSubmittedAssignments = allAnnouncements
        .filter(a => a.type === 'assignment' && !a.hasSubmitted)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    const nonSubmittedQuizzes = allAnnouncements
        .filter(a => a.type === 'quiz' && !a.hasSubmitted)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Get recently graded submissions (within last 7 days) - sorted from newest to oldest
    const recentlyGraded = allAnnouncements.filter(a => {
        if (!a.hasSubmitted || !a.submission || a.submission.status !== 'graded') return false;
        const gradedAt = new Date(a.submission.gradedAt);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return gradedAt > sevenDaysAgo;
    }).sort((a, b) => new Date(b.submission.gradedAt) - new Date(a.submission.gradedAt));

    // Get newly posted tasks (created within last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const newlyPostedTasks = allAnnouncements
        .filter(a => (a.type === 'assignment' || a.type === 'quiz') && !a.hasSubmitted && new Date(a.createdAt) > oneDayAgo)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalNotifications = unreadAdminAnnouncements.length + nonSubmittedAssignments.length + nonSubmittedQuizzes.length + recentlyGraded.length + newlyPostedTasks.length;

    // Create notification panel content
    let notificationContent = '';

    if (totalNotifications === 0) {
        notificationContent = `
            <div class="notification-empty">
                <i data-lucide="bell-off"></i>
                <p>No new notifications</p>
            </div>
        `;
    } else {
        notificationContent = `
            ${newlyPostedTasks.length > 0 ? `
                <div class="notification-section new-tasks-section">
                    <h4><i data-lucide="sparkles"></i> New Tasks (Today)</h4>
                    ${newlyPostedTasks.map(t => `
                        <div class="notification-item new-task" onclick="viewTaskDetail('${t._id}', '${t.subject}'); closeNotificationPanel();">
                            <div class="notification-icon" style="background: #dcfce7;">
                                <i data-lucide="${t.type === 'quiz' ? 'award' : 'file-text'}" style="color: #16a34a;"></i>
                            </div>
                            <div class="notification-content">
                                <p class="notification-title">${t.title} <span style="background: #16a34a; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">NEW</span></p>
                                <p class="notification-time">${t.subject} (${t.type}) - Due: ${new Date(t.dueDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${unreadAdminAnnouncements.length > 0 ? `
                <div class="notification-section">
                    <h4><i data-lucide="megaphone"></i> New Announcements</h4>
                    ${unreadAdminAnnouncements.map(a => `
                        <div class="notification-item" onclick="viewAdminAnnouncement('${a._id}'); closeNotificationPanel();">
                            <div class="notification-icon" style="background: ${a.category === 'urgent' ? '#fee2e2' : '#eef2ff'};">
                                <i data-lucide="${a.category === 'urgent' ? 'alert-circle' : 'bell'}" 
                                   style="color: ${a.category === 'urgent' ? '#dc2626' : '#4f46e5'};"></i>
                            </div>
                            <div class="notification-content">
                                <p class="notification-title">${a.title}</p>
                                <p class="notification-time">${new Date(a.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${nonSubmittedAssignments.length > 0 ? `
                <div class="notification-section">
                    <h4><i data-lucide="file-text"></i> Non-Submitted Assignments</h4>
                    ${nonSubmittedAssignments.map(t => `
                        <div class="notification-item ${t.isOverdue ? 'overdue' : ''}" onclick="viewTaskDetail('${t._id}', '${t.subject}'); closeNotificationPanel();">
                            <div class="notification-icon" style="background: ${t.isOverdue ? '#fee2e2' : '#fef3c7'};">
                                <i data-lucide="file-text" style="color: ${t.isOverdue ? '#dc2626' : '#d97706'};"></i>
                            </div>
                            <div class="notification-content">
                                <p class="notification-title">${t.title}</p>
                                <p class="notification-time">${t.subject} - Due: ${new Date(t.dueDate).toLocaleDateString()}${t.isOverdue ? ' <span style="color: #dc2626; font-weight: 600;">(Overdue)</span>' : ''}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${nonSubmittedQuizzes.length > 0 ? `
                <div class="notification-section">
                    <h4><i data-lucide="award"></i> Non-Submitted Quizzes</h4>
                    ${nonSubmittedQuizzes.map(t => `
                        <div class="notification-item ${t.isOverdue ? 'overdue' : ''}" onclick="viewTaskDetail('${t._id}', '${t.subject}'); closeNotificationPanel();">
                            <div class="notification-icon" style="background: ${t.isOverdue ? '#fee2e2' : '#dbeafe'};">
                                <i data-lucide="award" style="color: ${t.isOverdue ? '#dc2626' : '#2563eb'};"></i>
                            </div>
                            <div class="notification-content">
                                <p class="notification-title">${t.title}</p>
                                <p class="notification-time">${t.subject} - Due: ${new Date(t.dueDate).toLocaleDateString()}${t.isOverdue ? ' <span style="color: #dc2626; font-weight: 600;">(Overdue)</span>' : ''}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${recentlyGraded.length > 0 ? `
                <div class="notification-section">
                    <h4><i data-lucide="check-circle"></i> Recently Graded</h4>
                    ${recentlyGraded.map(g => {
                        const percent = Math.round((g.submission.grade / g.totalPoints) * 100);
                        const gradeColor = percent >= 70 ? '#10b981' : percent >= 50 ? '#f59e0b' : '#ef4444';
                        return `
                            <div class="notification-item" onclick="viewTaskDetail('${g._id}', '${g.subject}'); closeNotificationPanel();">
                                <div class="notification-icon" style="background: #ecfdf5;">
                                    <i data-lucide="check-circle" style="color: ${gradeColor};"></i>
                                </div>
                                <div class="notification-content">
                                    <p class="notification-title">${g.title}</p>
                                    <p class="notification-time">${g.subject} - Grade: <strong style="color: ${gradeColor};">${g.submission.grade}/${g.totalPoints} (${percent}%)</strong></p>
                                </div>
                            </div>
                        `;
                    }).join('')}
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
        ${unreadAdminAnnouncements.length > 0 ? `
        <div class="notification-actions">
            <button onclick="markAllAsRead()" class="mark-all-read-btn">
                <i data-lucide="check-check"></i>
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
    
    lucide.createIcons();
}

// Mark all announcements as read
async function markAllAsRead() {
    const unreadAdminAnnouncements = adminAnnouncements.filter(a => !a.isViewed);
    
    if (unreadAdminAnnouncements.length === 0) {
        if (typeof Toast !== 'undefined') {
            Toast.info('No unread announcements');
        }
        return;
    }

    try {
        // Mark each announcement as viewed
        const promises = unreadAdminAnnouncements.map(a => 
            apiCall(`/admin-announcements/${a._id}/view`, 'POST')
        );
        await Promise.all(promises);
        
        // Update local state
        unreadAdminAnnouncements.forEach(a => a.isViewed = true);
        
        // Update notification count - hide badge since all announcements are read
        const notificationCount = document.getElementById('notificationCount');
        if (notificationCount) {
            notificationCount.textContent = '0';
            notificationCount.style.display = 'none';
        }

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

// Close notification panel
function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.remove('show');
        setTimeout(() => panel.remove(), 300);
    }
}

// Close notification panel when clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationPanel');
    const notificationBtn = document.getElementById('notificationBtn');
    if (panel && !panel.contains(e.target) && !notificationBtn.contains(e.target)) {
        closeNotificationPanel();
    }
});

// ============================================================================
// ADMIN ANNOUNCEMENT VIEW FUNCTIONS
// ============================================================================

// View admin announcement detail
async function viewAdminAnnouncement(announcementId) {
    const announcement = adminAnnouncements.find(a => a._id === announcementId);
    if (!announcement) {
        if (typeof Toast !== 'undefined') {
            Toast.error('Announcement not found');
        }
        return;
    }

    // Mark as viewed if not already
    if (!announcement.isViewed) {
        try {
            await apiCall(`/admin-announcements/${announcementId}/view`, 'POST');
            announcement.isViewed = true;
            // Update notification count - only count unread announcements
            const unreadCount = adminAnnouncements.filter(a => !a.isViewed).length;
            const notificationCount = document.getElementById('notificationCount');
            if (notificationCount) {
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error marking announcement as viewed:', error);
        }
    }

    // Format category colors
    const categoryColors = {
        general: { bg: '#eef2ff', color: '#4f46e5' },
        urgent: { bg: '#fee2e2', color: '#dc2626' },
        event: { bg: '#fef3c7', color: '#d97706' },
        academic: { bg: '#d1fae5', color: '#059669' }
    };
    const colors = categoryColors[announcement.category] || categoryColors.general;

    // Check if for specific student
    const isPersonal = announcement.isForSpecificStudents && announcement.targetStudents && 
        announcement.targetStudents.some(id => id === currentStudent._id || id._id === currentStudent._id);

    const detailView = document.getElementById('detailView');
    detailView.innerHTML = `
        <button class="back-btn" onclick="backToDashboardFromAnnouncement()">
            <i data-lucide="arrow-left"></i>
            Back to Dashboard
        </button>

        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="background: ${colors.bg}; color: ${colors.color}; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; text-transform: uppercase;">
                        ${announcement.category}
                    </span>
                    ${isPersonal ? '<span style="background: #fee2e2; color: #dc2626; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">Personal Message</span>' : ''}
                </div>
                <span style="font-size: 0.9rem; color: var(--text-secondary);">
                    Posted on ${new Date(announcement.createdAt).toLocaleDateString()}
                </span>
            </div>

            <h1 style="font-size: 1.75rem; margin-bottom: 16px; color: var(--text-primary);">${announcement.title}</h1>
            
            <div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                <p style="color: var(--text-primary); line-height: 1.8; white-space: pre-wrap;">${announcement.content}</p>
            </div>

            <div style="display: flex; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px solid var(--border); flex-wrap: wrap;">
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary);">
                    <i data-lucide="user" style="width: 16px; height: 16px;"></i>
                    ${announcement.author?.name || 'Admin'}
                </span>
                <span style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary);">
                    <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                    ${new Date(announcement.createdAt).toLocaleTimeString()}
                </span>
            </div>
        </div>
    `;

    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('subjectView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    
    lucide.createIcons();
}

// Back to dashboard from announcement detail
function backToDashboardFromAnnouncement() {
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('subjectView').classList.add('hidden');
    document.getElementById('dashboardView').classList.remove('hidden');
    renderAdminAnnouncementsSection();
    lucide.createIcons();
}

// View all personal announcements
function viewAllPersonalAnnouncements() {
    const personalAnnouncements = adminAnnouncements.filter(a => 
        a.isForSpecificStudents && a.targetStudents && 
        a.targetStudents.some(id => id === currentStudent._id || id._id === currentStudent._id)
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    showAllAnnouncementsView(personalAnnouncements, 'Personal Announcements', true);
}

// View all grade announcements
function viewAllGradeAnnouncements() {
    const gradeAnnouncements = adminAnnouncements.filter(a => 
        !a.isForSpecificStudents
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    showAllAnnouncementsView(gradeAnnouncements, 'School & Grade Announcements', false);
}

// Show all announcements view
function showAllAnnouncementsView(announcementsList, title, isPersonal) {
    const detailView = document.getElementById('detailView');
    
    detailView.innerHTML = `
        <button class="back-btn" onclick="backToDashboardFromAnnouncement()">
            <i data-lucide="arrow-left"></i>
            Back to Dashboard
        </button>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <i data-lucide="${isPersonal ? 'user-check' : 'megaphone'}"></i>
                    ${title} (${announcementsList.length})
                </h2>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 12px; padding: 20px;">
                ${announcementsList.length === 0 ? `
                    <div class="empty-state">
                        <i data-lucide="inbox"></i>
                        <p>No announcements found</p>
                    </div>
                ` : announcementsList.map(announcement => renderAnnouncementCard(announcement, isPersonal)).join('')}
            </div>
        </div>
    `;

    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('subjectView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('hidden');
    
    lucide.createIcons();
}

// Logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '../login.html';
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('todayDate');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Utility functions
function showLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
    }
}

function hideLoading() {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);