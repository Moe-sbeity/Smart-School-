const API_URL = 'http://localhost:5001/api';
let allContent = [];
let teacherSubjects = [];

const getToken = () => localStorage.getItem('token');

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
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

async function loadSubjects() {
    try {
        const data = await apiCall('/users/me');
        teacherSubjects = data.user.subjects;

        const subjectSelect = document.getElementById('filterSubject');
        teacherSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function loadContent() {
    try {
        const data = await apiCall('/announcements/teacher');
        allContent = data.announcements;

        updateStats();
        renderContent(allContent);

    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('contentContainer').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Content</h3>
                        <p>${error.message}</p>
                    </div>
                `;
    }
}

function updateStats() {
    document.getElementById('totalCount').textContent = allContent.length;
    document.getElementById('announcementCount').textContent =
        allContent.filter(c => c.type === 'announcement').length;
    document.getElementById('assignmentCount').textContent =
        allContent.filter(c => c.type === 'assignment').length;
    document.getElementById('quizCount').textContent =
        allContent.filter(c => c.type === 'quiz').length;

    const pendingCount = allContent
        .filter(c => c.type !== 'announcement')
        .reduce((sum, c) => sum + (c.submissionCount - c.gradedCount), 0);
    document.getElementById('pendingGrading').textContent = pendingCount;
}

function filterContent() {
    const subject = document.getElementById('filterSubject').value;
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;

    let filtered = allContent;

    if (subject) {
        filtered = filtered.filter(c => c.subject === subject);
    }
    if (type) {
        filtered = filtered.filter(c => c.type === type);
    }
    if (status) {
        filtered = filtered.filter(c => c.status === status);
    }

    renderContent(filtered);
}

function renderContent(content) {
    const container = document.getElementById('contentContainer');

    if (content.length === 0) {
        container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>No Content Found</h3>
                        <p>Start creating announcements, assignments, or quizzes for your students.</p>
                        <a href="teacher-publishAnnouncment.html" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Create New Content
                        </a>
                    </div>
                `;
        return;
    }

    container.innerHTML = '<div class="content-grid">' + content.map(item => `
                <div class="content-card ${item.type}">
                    <div class="content-header">
                        <div class="content-title">
                            <h3>${item.title}</h3>
                            <div style="margin-bottom: 10px;">
                                <span class="tag tag-type tag-${item.type}">${item.type}</span>
                                <span class="tag tag-priority tag-${item.priority}">${item.priority}</span>
                            </div>
                            <div class="content-meta">
                                <span><i class="fas fa-book"></i> ${item.subject}</span>
                                <span><i class="fas fa-calendar"></i> ${new Date(item.createdAt).toLocaleDateString()}</span>
                                ${item.dueDate ? `<span><i class="fas fa-clock"></i> Due: ${new Date(item.dueDate).toLocaleString()}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="content-description">
                        ${item.description.length > 150 ? item.description.substring(0, 150) + '...' : item.description}
                    </div>

                    ${item.type !== 'announcement' ? `
                        <div class="content-stats">
                            <div class="stat-item">
                                <strong>${item.totalStudents || 0}</strong>
                                <span>Students</span>
                            </div>
                            <div class="stat-item">
                                <strong>${item.submissionCount || 0}</strong>
                                <span>Submitted</span>
                            </div>
                            <div class="stat-item">
                                <strong>${item.gradedCount || 0}</strong>
                                <span>Graded</span>
                            </div>
                        </div>
                    ` : ''}

                    <div class="content-actions">
                        <button class="btn btn-sm btn-view" onclick="viewContent('${item._id}')">
                            View Details
                        </button>
                        ${item.type !== 'announcement' ? `
                            <button class="btn btn-sm btn-view" onclick="viewSubmissions('${item._id}')">
                              Submissions
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-delete" onclick="deleteContent('${item._id}')">
                             Delete
                        </button>
                    </div>
                </div>
            `).join('') + '</div>';
}

function viewContent(id) {
    const item = allContent.find(c => c._id === id);
    if (!item) return;

    // Populate dialog
    document.getElementById('dialogTitle').textContent = item.title;

    document.getElementById('dialogTags').innerHTML = `
                <span class="tag tag-type tag-${item.type}">${item.type}</span>
                <span class="tag tag-priority tag-${item.priority}">${item.priority}</span>
                ${item.status ? `<span class="tag" style="background: #edf2f7; color: #4a5568;">${item.status}</span>` : ''}
            `;

    document.getElementById('dialogMeta').innerHTML = `
                <span><i class="fas fa-book"></i> ${item.subject}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(item.createdAt).toLocaleDateString()}</span>
                ${item.dueDate ? `<span><i class="fas fa-clock"></i> Due: ${new Date(item.dueDate).toLocaleString()}</span>` : ''}
            `;

    let bodyContent = `
                <div class="detail-meta">
                    <div class="meta-item">
                        <i class="fas fa-book"></i>
                        <div class="meta-item-content">
                            <div class="meta-item-label">Subject</div>
                            <div class="meta-item-value">${item.subject}</div>
                        </div>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-calendar"></i>
                        <div class="meta-item-content">
                            <div class="meta-item-label">Created</div>
                            <div class="meta-item-value">${new Date(item.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                    ${item.dueDate ? `
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <div class="meta-item-content">
                                <div class="meta-item-label">Due Date</div>
                                <div class="meta-item-value">${new Date(item.dueDate).toLocaleString()}</div>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h4><i class="fas fa-align-left"></i> Description</h4>
                    <div class="detail-content">${item.description}</div>
                </div>
            `;

    if (item.type !== 'announcement') {
        bodyContent += `
                    <div class="detail-section">
                        <h4><i class="fas fa-chart-bar"></i> Statistics</h4>
                        <div class="content-stats">
                            <div class="stat-item">
                                <strong>${item.totalStudents || 0}</strong>
                                <span>Total Students</span>
                            </div>
                            <div class="stat-item">
                                <strong>${item.submissionCount || 0}</strong>
                                <span>Submitted</span>
                            </div>
                            <div class="stat-item">
                                <strong>${item.gradedCount || 0}</strong>
                                <span>Graded</span>
                            </div>
                        </div>
                    </div>
                `;
    }

    if (item.attachments && item.attachments.length > 0) {
        bodyContent += `
                    <div class="detail-section">
                        <h4><i class="fas fa-paperclip"></i> Attachments</h4>
                        <div class="detail-content">
                            ${item.attachments.map(att => `
                               <div style="margin-bottom: 10px;"> 
                               <a href="http://localhost:5001${att.fileUrl}" target="_blank" 
                               style="color: #4a5568; text-decoration: none;">
                                <i class="fas fa-file"></i> ${att.fileName} </a>
                                 </div>
            `).join('')}
                        </div>
                    </div>
                `;
    }

    document.getElementById('dialogBody').innerHTML = bodyContent;

    // Show dialog
    document.getElementById('contentDialog').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDialog(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('contentDialog').classList.remove('active');
    document.body.style.overflow = '';
}

function viewSubmissions(id) {
    window.location.href = `teacher-submissions.html?id=${id}`;
}

async function deleteContent(id) {
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/announcements/${id}`, { method: 'DELETE' });
        if (typeof Toast !== 'undefined') {
            Toast.success('Content deleted successfully');
        }
        loadContent();
    } catch (error) {
        console.error('Error deleting content:', error);
        if (typeof Toast !== 'undefined') {
            Toast.error('Failed to delete content: ' + error.message);
        }
    }
}

// Close dialog on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDialog();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        window.location.href = 'home.html';
        return;
    }

    loadSubjects();
    loadContent();
});