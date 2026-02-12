const API_URL = 'http://localhost:5001/api';

// State management
let currentParent = null;
let children = [];
let selectedChild = null;
let allAnnouncements = [];
let currentFilter = 'all';

// Get token
const getToken = () => localStorage.getItem('token');

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

// Format grade label
function formatGradeLabel(grade) {
    if (!grade) return 'N/A';
    if (grade === 'kg1') return 'KG1';
    if (grade === 'kg2') return 'KG2';
    return grade.charAt(0).toUpperCase() + grade.slice(1);
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

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize
async function init() {
    const token = getToken();
    if (!token) {
        showAlert('Please log in to access the parent dashboard', 'error');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return;
    }

    try {
        showLoading();
        await loadParentData();
        hideLoading();
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Failed to load data: ' + error.message, 'error');
        hideLoading();
    }
}

// Load parent data
async function loadParentData() {
    
        const data = await apiCall('/users/me');
        currentParent = data.user;

        if (currentParent.role !== 'parent') {
            showAlert('Access denied. This page is for parents only.', 'error');
            setTimeout(() => window.location.href = '../login.html', 2000);
            return;
        }

        // Update user name
        document.getElementById('userName').textContent = currentParent.name;

        // Load children
        if (currentParent.children && currentParent.children.length > 0) {
            await loadChildren();
        } else {
            showNoChildren();
        }
  
}

// Load children
async function loadChildren() {
    
        // Use the parent overview endpoint to get children with full data
        const data = await apiCall('/attendance/parent/overview');
        
        if (!data.children || data.children.length === 0) {
            showNoChildren();
            return;
        }

        // Extract student information from the children array
        children = data.children.map(child => child.student);

        // Select first child by default
        selectedChild = children[0];
        renderChildTabs();
        await loadMessagesForChild(selectedChild._id);
        
        document.getElementById('contentContainer').style.display = 'block';
   
}

// Render child tabs
function renderChildTabs() {
    const tabsContainer = document.getElementById('childTabs');
    console.log('Rendering child tabs for children:', children);
    
    tabsContainer.innerHTML = children.map((child, index) => `
        <div class="child-tab ${index === 0 ? 'active' : ''}" 
             onclick="selectChild('${child._id}')">
            <span class="child-name">${child.name || 'Child'}</span>
            <span class="child-grade">${child.classGrade || ''} ${child.classSection || ''}</span>
        </div>
    `).join('');
}

// Select child
async function selectChild(childId) {
    selectedChild = children.find(c => c._id === childId);
    
    // Update active tab
    const tabs = document.querySelectorAll('.child-tab');
    tabs.forEach((tab, index) => {
        if (children[index]._id === childId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    showLoading();
    await loadMessagesForChild(childId);
    hideLoading();
}

// Load messages for child
async function loadMessagesForChild(childId) {
    try {
        const data = await apiCall(`/admin-announcements/student/${childId}`);
        allAnnouncements = data.announcements || [];
        
        renderMessages();
    } catch (error) {
        console.error('Error loading messages:', error);
        showAlert('Failed to load messages: ' + error.message, 'error');
    }
}

// Render messages
function renderMessages() {
    // Separate announcements
    let personalAnnouncements = allAnnouncements.filter(a => 
        a.isForSpecificStudents && a.targetStudents && 
        a.targetStudents.some(id => {
            const targetId = typeof id === 'string' ? id : id._id;
            return targetId === selectedChild._id;
        })
    );
    
    let gradeAnnouncements = allAnnouncements.filter(a => 
        !a.isForSpecificStudents
    );

    // Apply filter
    if (currentFilter === 'personal') {
        gradeAnnouncements = [];
    } else if (currentFilter === 'grade') {
        personalAnnouncements = [];
    } else if (currentFilter === 'unread') {
        personalAnnouncements = personalAnnouncements.filter(a => !a.isViewed);
        gradeAnnouncements = gradeAnnouncements.filter(a => !a.isViewed);
    }

    // Update statistics
    renderStatistics(personalAnnouncements, gradeAnnouncements);

    // Show/hide sections
    const personalSection = document.getElementById('personalSection');
    const gradeSection = document.getElementById('gradeSection');
    const noMessages = document.getElementById('noMessages');

    if (personalAnnouncements.length === 0 && gradeAnnouncements.length === 0) {
        personalSection.style.display = 'none';
        gradeSection.style.display = 'none';
        noMessages.style.display = 'block';
        return;
    }

    noMessages.style.display = 'none';

    // Render personal messages
    if (personalAnnouncements.length > 0) {
        personalSection.style.display = 'block';
        document.getElementById('personalCount').textContent = personalAnnouncements.length;
        renderAnnouncementList(personalAnnouncements, 'personalMessages', true);
    } else {
        personalSection.style.display = 'none';
    }

    // Render grade messages
    if (gradeAnnouncements.length > 0) {
        gradeSection.style.display = 'block';
        document.getElementById('gradeCount').textContent = gradeAnnouncements.length;
        renderAnnouncementList(gradeAnnouncements, 'gradeMessages', false);
    } else {
        gradeSection.style.display = 'none';
    }
}

// Render statistics
function renderStatistics(personalAnnouncements, gradeAnnouncements) {
    const total = personalAnnouncements.length + gradeAnnouncements.length;
    const unread = allAnnouncements.filter(a => !a.isViewed).length;
    const urgent = allAnnouncements.filter(a => a.category === 'urgent').length;

    const statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = `
        <div class="stat-card" style="border-left-color: #4f46e5;">
            <div class="stat-label">Total Messages</div>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card" style="border-left-color: #dc2626;">
            <div class="stat-label">Personal Messages</div>
            <div class="stat-value">${personalAnnouncements.length}</div>
        </div>
        <div class="stat-card" style="border-left-color: #2563eb;">
            <div class="stat-label">Grade/School</div>
            <div class="stat-value">${gradeAnnouncements.length}</div>
        </div>
        <div class="stat-card" style="border-left-color: #d97706;">
            <div class="stat-label">Unread</div>
            <div class="stat-value">${unread}</div>
        </div>
        ${urgent > 0 ? `
        <div class="stat-card" style="border-left-color: #dc2626;">
            <div class="stat-label">Urgent</div>
            <div class="stat-value">${urgent}</div>
        </div>
        ` : ''}
    `;
}

// Render announcement list
function renderAnnouncementList(announcements, containerId, isPersonal) {
    const container = document.getElementById(containerId);
    
    // Sort by date (newest first)
    const sorted = announcements.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    container.innerHTML = sorted.map(announcement => {
        const date = new Date(announcement.createdAt);
        const categoryColors = {
            general: { bg: '#eef2ff', color: '#4f46e5', label: 'General' },
            urgent: { bg: '#fee2e2', color: '#dc2626', label: 'Urgent' },
            event: { bg: '#fef3c7', color: '#d97706', label: 'Event' },
            academic: { bg: '#d1fae5', color: '#059669', label: 'Academic' }
        };
        const colors = categoryColors[announcement.category] || categoryColors.general;

        // Determine targeting info
        let targetingInfo = '';
        if (isPersonal) {
            targetingInfo = `
                <span style="color: #dc2626; font-weight: 500;">
                    <i class="fas fa-user-check"></i>
                    Personal Message
                </span>
            `;
        } else {
            if (announcement.isForAllGrades && announcement.isForAllSections) {
                targetingInfo = `
                    <span style="color: #059669; font-weight: 500;">
                        <i class="fas fa-bullhorn"></i>
                        All Students
                    </span>
                `;
            } else if (announcement.targetGrades && announcement.targetGrades.length > 0) {
                const gradeText = announcement.targetGrades.map(formatGradeLabel).join(', ');
                const sectionText = announcement.targetSections && announcement.targetSections.length > 0 && !announcement.isForAllSections
                    ? ` - Section${announcement.targetSections.length > 1 ? 's' : ''} ${announcement.targetSections.join(', ')}`
                    : '';
                targetingInfo = `
                    <span style="color: #4f46e5; font-weight: 500;">
                        <i class="fas fa-users"></i>
                        ${gradeText}${sectionText}
                    </span>
                `;
            }
        }

        return `
            <div class="announcement-card ${isPersonal ? 'personal' : ''}" 
                 onclick="viewAnnouncement('${announcement._id}')">
                <div class="announcement-badges">
                    <span class="badge" style="background: ${colors.bg}; color: ${colors.color};">
                        ${colors.label}
                    </span>
                    ${!announcement.isViewed ? '<span class="badge badge-new">New</span>' : ''}
                    ${isPersonal ? '<span class="badge badge-personal"><i class="fas fa-user-check"></i> FOR YOUR CHILD</span>' : ''}
                </div>
                
                <div class="announcement-header">
                    <div style="flex: 1;">
                        <h3 class="announcement-title">${announcement.title}</h3>
                        <p class="announcement-content">
                            ${announcement.content.length > 200 
                                ? announcement.content.substring(0, 200) + '...' 
                                : announcement.content}
                        </p>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #9ca3af;"></i>
                </div>

                <div class="announcement-meta">
                    <span>
                        <i class="fas fa-calendar"></i>
                        ${date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                        })}
                    </span>
                    <span>
                        <i class="fas fa-user"></i>
                        ${announcement.author?.name || 'Admin'}
                    </span>
                    ${targetingInfo ? `<span>${targetingInfo}</span>` : ''}
                    ${announcement.attachments && announcement.attachments.length > 0 ? `
                        <span>
                            <i class="fas fa-paperclip"></i>
                            ${announcement.attachments.length} attachment${announcement.attachments.length > 1 ? 's' : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// View announcement detail
function viewAnnouncement(announcementId) {
    const announcement = allAnnouncements.find(a => a._id === announcementId);
    if (!announcement) return;

    const isPersonal = announcement.isForSpecificStudents;
    const date = new Date(announcement.createdAt);
    const categoryColors = {
        general: { bg: '#eef2ff', color: '#4f46e5', label: 'General' },
        urgent: { bg: '#fee2e2', color: '#dc2626', label: 'Urgent' },
        event: { bg: '#fef3c7', color: '#d97706', label: 'Event' },
        academic: { bg: '#d1fae5', color: '#059669', label: 'Academic' }
    };
    const colors = categoryColors[announcement.category] || categoryColors.general;

    // Update modal badges
    let targetingBadge = '';
    if (isPersonal) {
        targetingBadge = '<span class="badge badge-personal"><i class="fas fa-user-check"></i> Personal Message</span>';
    } else if (announcement.isForAllGrades && announcement.isForAllSections) {
        targetingBadge = '<span class="badge" style="background: #d1fae5; color: #059669;"><i class="fas fa-bullhorn"></i> All Students</span>';
    } else if (announcement.targetGrades && announcement.targetGrades.length > 0) {
        const gradeText = announcement.targetGrades.map(formatGradeLabel).join(', ');
        targetingBadge = `<span class="badge" style="background: #dbeafe; color: #2563eb;"><i class="fas fa-users"></i> ${gradeText}</span>`;
    }

    document.getElementById('modalBadges').innerHTML = `
        <span class="badge" style="background: ${colors.bg}; color: ${colors.color};">
            ${colors.label}
        </span>
        ${!announcement.isViewed ? '<span class="badge badge-new">New</span>' : ''}
        ${targetingBadge}
    `;

    document.getElementById('modalTitle').textContent = announcement.title;

    document.getElementById('modalMeta').innerHTML = `
        <span>
            <i class="fas fa-calendar"></i>
            ${date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
            })}
        </span>
        <span>
            <i class="fas fa-user"></i>
            ${announcement.author?.name || 'Admin'}
        </span>
        <span>
            <i class="fas fa-child"></i>
            For: ${selectedChild.name}
        </span>
    `;

    document.getElementById('modalContent').textContent = announcement.content;

    // Render attachments
    const modalAttachments = document.getElementById('modalAttachments');
    if (announcement.attachments && announcement.attachments.length > 0) {
        modalAttachments.innerHTML = `
            <div class="attachments-section">
                <h3 class="attachments-title">
                    <i class="fas fa-paperclip"></i>
                    Attachments (${announcement.attachments.length})
                </h3>
                ${announcement.attachments.map(attachment => `
                    <a href="http://localhost:5001${attachment.fileUrl}" 
                       target="_blank" 
                       download="${attachment.fileName}"
                       class="attachment-item">
                        <i class="fas ${getFileIcon(attachment.fileType)} attachment-icon" 
                           style="color: ${getFileIconColor(attachment.fileType)};"></i>
                        <div class="attachment-info">
                            <div class="attachment-name">${attachment.fileName}</div>
                            <div class="attachment-size">Click to download</div>
                        </div>
                        <i class="fas fa-download" style="color: #4f46e5;"></i>
                    </a>
                `).join('')}
            </div>
        `;
    } else {
        modalAttachments.innerHTML = '';
    }

    // Show modal
    document.getElementById('announcementModal').classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('announcementModal').classList.remove('active');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('announcementModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Filter messages
function filterMessages(filter) {
    currentFilter = filter;
    
    // Update active button
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        const btnText = btn.textContent.toLowerCase();
        if ((filter === 'all' && btnText.includes('all')) ||
            (filter === 'personal' && btnText.includes('personal')) ||
            (filter === 'grade' && btnText.includes('grade')) ||
            (filter === 'unread' && btnText.includes('unread'))) {
            btn.classList.add('active');
        }
    });

    renderMessages();
}

// Utility functions
function showLoading() {
    document.getElementById('loadingContainer').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingContainer').style.display = 'none';
}

function showNoChildren() {
    document.getElementById('noChildrenMessage').style.display = 'block';
    document.getElementById('contentContainer').style.display = 'none';
}

function showAlert(message, type = 'info') {
    if (typeof Toast !== 'undefined') {
        if (type === 'error') {
            Toast.error(message);
        } else if (type === 'success') {
            Toast.success(message);
        } else {
            Toast.info(message);
        }
        return;
    }
    console.log(`[${type.toUpperCase()}]: ${message}`);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '../login.html';
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);