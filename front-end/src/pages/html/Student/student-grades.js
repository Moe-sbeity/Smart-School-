const API_URL = 'http://localhost:5001/api';

let allAnnouncements = [];
let filteredGrades = [];
let currentFilter = 'all';
let currentSubjectFilter = '';

const getToken = () => localStorage.getItem('token');

// API Call helper
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

// Initialize page
async function init() {
    const token = getToken();
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        await loadUserInfo();
        await loadAnnouncements();
        hideLoading();
        renderGrades();
    } catch (error) {
        console.error('Error initializing:', error);
        showError(error.message);
    }
}

// Load user info
async function loadUserInfo() {
    try {
        const data = await apiCall('/users/me');
        const user = data.user;

        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Load announcements
async function loadAnnouncements() {
    try {
        const data = await apiCall('/announcements/student');
        allAnnouncements = data.announcements || [];
        
        // Get all subjects for filter
        const subjects = [...new Set(allAnnouncements.map(a => a.subject))];
        const subjectSelect = document.getElementById('subjectFilter');
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });

        updateStats();
        applyFilters();
    } catch (error) {
        throw error;
    }
}

// Update statistics
function updateStats() {
    const gradedItems = allAnnouncements.filter(a => 
        a.hasSubmitted && a.submission && a.submission.status === 'graded'
    );
    
    const pendingItems = allAnnouncements.filter(a => 
        a.hasSubmitted && a.submission && a.submission.status === 'submitted'
    );

    document.getElementById('totalGraded').textContent = gradedItems.length;
    document.getElementById('pendingCount').textContent = pendingItems.length;

    // Calculate average
    if (gradedItems.length > 0) {
        const totalPercent = gradedItems.reduce((sum, a) => {
            return sum + (a.submission.grade / a.totalPoints) * 100;
        }, 0);
        const avg = Math.round(totalPercent / gradedItems.length);
        document.getElementById('avgGrade').textContent = avg + '%';

        // Find highest
        let highest = 0;
        gradedItems.forEach(a => {
            const percent = (a.submission.grade / a.totalPoints) * 100;
            if (percent > highest) highest = percent;
        });
        document.getElementById('highestGrade').textContent = Math.round(highest) + '%';
    } else {
        document.getElementById('avgGrade').textContent = '--';
        document.getElementById('highestGrade').textContent = '--';
    }
}

// Filter grades
function filterGrades(filterType) {
    if (filterType) {
        currentFilter = filterType;
        
        // Update tab styling
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
    }
    
    currentSubjectFilter = document.getElementById('subjectFilter').value;
    applyFilters();
}

// Apply filters and render
function applyFilters() {
    // Start with items that have submissions
    filteredGrades = allAnnouncements.filter(a => 
        (a.type === 'assignment' || a.type === 'quiz') && a.hasSubmitted
    );

    // Filter by type
    if (currentFilter !== 'all') {
        filteredGrades = filteredGrades.filter(a => a.type === currentFilter);
    }

    // Filter by subject
    if (currentSubjectFilter) {
        filteredGrades = filteredGrades.filter(a => a.subject === currentSubjectFilter);
    }

    // Sort: graded first, then by date
    filteredGrades.sort((a, b) => {
        const aGraded = a.submission.status === 'graded';
        const bGraded = b.submission.status === 'graded';
        if (aGraded !== bGraded) return bGraded ? 1 : -1;
        return new Date(b.submission.gradedAt || b.submission.submittedAt) - 
               new Date(a.submission.gradedAt || a.submission.submittedAt);
    });

    renderGrades();
}

// Render grades list
function renderGrades() {
    const container = document.getElementById('gradesContainer');
    const emptyState = document.getElementById('emptyState');

    if (filteredGrades.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        lucide.createIcons();
        return;
    }

    emptyState.classList.add('hidden');
    container.classList.remove('hidden');

    container.innerHTML = filteredGrades.map(item => {
        const isGraded = item.submission.status === 'graded';
        const grade = item.submission.grade;
        const totalPoints = item.totalPoints;
        const percent = isGraded ? Math.round((grade / totalPoints) * 100) : 0;
        const gradeClass = getGradeClass(percent);
        const hasFeedback = item.submission.feedback && item.submission.feedback.trim() !== '';

        if (!isGraded) {
            return `
                <div class="grade-card pending-card" onclick="viewGradeDetail('${item._id}')">
                    <div class="grade-card-header">
                        <div class="grade-card-info">
                            <div class="grade-card-title">${item.title}</div>
                            <div class="grade-card-meta">
                                <span><i data-lucide="book"></i> ${item.subject}</span>
                                <span><i data-lucide="calendar"></i> Submitted ${formatDate(item.submission.submittedAt)}</span>
                            </div>
                        </div>
                        <div class="grade-badge pending">
                            <div class="grade-score">--</div>
                            <div class="grade-percent">Pending</div>
                        </div>
                    </div>
                    <div class="grade-card-footer">
                        <span class="type-badge ${item.type}">
                            <i data-lucide="${item.type === 'quiz' ? 'help-circle' : 'file-text'}"></i>
                            ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </span>
                        <span class="pending-message">
                            <i data-lucide="clock"></i>
                            Awaiting teacher review
                        </span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="grade-card" onclick="viewGradeDetail('${item._id}')">
                <div class="grade-card-header">
                    <div class="grade-card-info">
                        <div class="grade-card-title">${item.title}</div>
                        <div class="grade-card-meta">
                            <span><i data-lucide="book"></i> ${item.subject}</span>
                            <span><i data-lucide="calendar"></i> Graded ${formatDate(item.submission.gradedAt)}</span>
                            <span><i data-lucide="star"></i> ${totalPoints} pts max</span>
                        </div>
                    </div>
                    <div class="grade-badge ${gradeClass}">
                        <div class="grade-score">${grade}/${totalPoints}</div>
                        <div class="grade-percent">${percent}%</div>
                    </div>
                </div>
                <div class="grade-card-footer">
                    <span class="type-badge ${item.type}">
                        <i data-lucide="${item.type === 'quiz' ? 'help-circle' : 'file-text'}"></i>
                        ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                    ${hasFeedback ? `
                        <span class="feedback-indicator">
                            <i data-lucide="message-circle"></i>
                            Teacher Feedback
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Get grade class for styling
function getGradeClass(percent) {
    if (percent >= 90) return 'excellent';
    if (percent >= 70) return 'good';
    if (percent >= 50) return 'average';
    return 'poor';
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

// View grade detail
function viewGradeDetail(announcementId) {
    const item = allAnnouncements.find(a => a._id === announcementId);
    if (!item) return;

    const isGraded = item.submission.status === 'graded';
    const grade = item.submission.grade;
    const totalPoints = item.totalPoints;
    const percent = isGraded ? Math.round((grade / totalPoints) * 100) : 0;
    const gradeClass = getGradeClass(percent);
    const hasFeedback = item.submission.feedback && item.submission.feedback.trim() !== '';

    let modalHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${item.title}</h2>
            <div class="modal-meta">
                <span><i data-lucide="book"></i> ${item.subject}</span>
                <span><i data-lucide="${item.type === 'quiz' ? 'help-circle' : 'file-text'}"></i> ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                <span><i data-lucide="calendar"></i> Due: ${formatDate(item.dueDate)}</span>
            </div>
        </div>
    `;

    if (isGraded) {
        modalHTML += `
            <div class="modal-grade-section">
                <div class="modal-grade-display modal-grade-${gradeClass}">
                    <div class="modal-grade-value">${grade}/${totalPoints}</div>
                    <div class="modal-grade-label">${percent}% - ${getGradeLabel(percent)}</div>
                </div>
            </div>
        `;
    } else {
        modalHTML += `
            <div class="modal-grade-section" style="background: #f5f3ff;">
                <div class="modal-grade-display" style="background: white; border: 2px solid #8b5cf6;">
                    <div class="modal-grade-value" style="color: #7c3aed;">Pending</div>
                    <div class="modal-grade-label">Awaiting teacher review</div>
                </div>
            </div>
        `;
    }

    modalHTML += `<div class="modal-details">`;

    // Submission info
    modalHTML += `
        <div class="detail-section">
            <div class="detail-label">
                <i data-lucide="send"></i>
                Submission Details
            </div>
            <div class="detail-content">
                <p><strong>Submitted:</strong> ${new Date(item.submission.submittedAt).toLocaleString()}</p>
                ${item.submission.isLate ? '<p style="color: #ea580c;">⚠️ This was a late submission</p>' : ''}
                ${isGraded ? `<p><strong>Graded:</strong> ${new Date(item.submission.gradedAt).toLocaleString()}</p>` : ''}
            </div>
        </div>
    `;

    // Feedback
    if (hasFeedback) {
        modalHTML += `
            <div class="detail-section">
                <div class="detail-label">
                    <i data-lucide="message-circle"></i>
                    Teacher Feedback
                </div>
                <div class="feedback-box">
                    <p>${item.submission.feedback}</p>
                </div>
            </div>
        `;
    }

    // Description
    if (item.description) {
        modalHTML += `
            <div class="detail-section">
                <div class="detail-label">
                    <i data-lucide="file-text"></i>
                    Assignment Description
                </div>
                <div class="detail-content">
                    <p>${item.description}</p>
                </div>
            </div>
        `;
    }

    modalHTML += `</div>`;

    document.getElementById('modalBody').innerHTML = modalHTML;
    document.getElementById('gradeModal').classList.remove('hidden');
    lucide.createIcons();
}

// Get grade label
function getGradeLabel(percent) {
    if (percent >= 90) return 'Excellent';
    if (percent >= 80) return 'Very Good';
    if (percent >= 70) return 'Good';
    if (percent >= 60) return 'Satisfactory';
    if (percent >= 50) return 'Needs Improvement';
    return 'Poor';
}

// Close modal
function closeModal() {
    document.getElementById('gradeModal').classList.add('hidden');
}

// Show/hide helpers
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// Close modal on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
