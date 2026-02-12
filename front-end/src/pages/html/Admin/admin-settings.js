// Admin Settings JavaScript
const API_URL = 'http://localhost:5001/api';

let settings = {};

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in and is admin
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
        showToast('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    // Display admin name
    document.getElementById('adminName').textContent = user.name || 'Admin';
    
    // Initialize tabs
    initTabs();
    
    // Load settings
    await loadSettings();
});

// Initialize tab functionality
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Load all settings from API
async function loadSettings() {
    try {
        const response = await axios.get(`${API_URL}/settings`);
        settings = response.data;
        populateForm(settings);
        showToast('Settings loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Failed to load settings', 'error');
    }
}

// Populate form with settings data
function populateForm(data) {
    // School Info
    if (data.schoolInfo) {
        document.getElementById('schoolName').value = data.schoolInfo.name || '';
        document.getElementById('schoolSlogan').value = data.schoolInfo.slogan || '';
        document.getElementById('foundedYear').value = data.schoolInfo.foundedYear || '';
        document.getElementById('academicYear').value = data.schoolInfo.academicYear || '';
    }
    
    // Contact Info
    if (data.contact) {
        if (data.contact.mainOffice) {
            document.getElementById('officeHours').value = data.contact.mainOffice.hours || '';
            document.getElementById('officePhone').value = data.contact.mainOffice.phone || '';
        }
        if (data.contact.admissions) {
            document.getElementById('admissionsEmail').value = data.contact.admissions.email || '';
            document.getElementById('admissionsPhone').value = data.contact.admissions.phone || '';
        }
        if (data.contact.studentServices) {
            document.getElementById('supportEmail').value = data.contact.studentServices.email || '';
            document.getElementById('supportPhone').value = data.contact.studentServices.phone || '';
        }
        if (data.contact.counseling) {
            document.getElementById('counselEmail').value = data.contact.counseling.email || '';
            document.getElementById('counselPhone').value = data.contact.counseling.phone || '';
        }
        document.getElementById('generalEmail').value = data.contact.generalEmail || '';
    }
    
    // Location
    if (data.location) {
        document.getElementById('address').value = data.location.address || '';
        document.getElementById('city').value = data.location.city || '';
        document.getElementById('state').value = data.location.state || '';
        document.getElementById('zipCode').value = data.location.zipCode || '';
        document.getElementById('country').value = data.location.country || '';
        document.getElementById('mapUrl').value = data.location.mapUrl || '';
        document.getElementById('directionsUrl').value = data.location.directionsUrl || '';
    }
    
    // Social Media
    if (data.socialMedia) {
        document.getElementById('websiteUrl').value = data.socialMedia.website || '';
        document.getElementById('twitterUrl').value = data.socialMedia.twitter || '';
        document.getElementById('instagramUrl').value = data.socialMedia.instagram || '';
        document.getElementById('facebookUrl').value = data.socialMedia.facebook || '';
        document.getElementById('linkedinUrl').value = data.socialMedia.linkedin || '';
        document.getElementById('youtubeUrl').value = data.socialMedia.youtube || '';
    }
    
    // Admissions
    if (data.admissions) {
        document.getElementById('admissionsOpen').checked = data.admissions.isOpen || false;
        document.getElementById('admissionYear').value = data.admissions.currentYear || '';
        
        if (data.admissions.priorityDeadline) {
            document.getElementById('priorityDeadline').value = formatDateForInput(data.admissions.priorityDeadline);
        }
        if (data.admissions.regularDeadline) {
            document.getElementById('regularDeadline').value = formatDateForInput(data.admissions.regularDeadline);
        }
        if (data.admissions.decisionsDate) {
            document.getElementById('decisionsDate').value = formatDateForInput(data.admissions.decisionsDate);
        }
        
        // Render requirements
        renderRequirements(data.admissions.requirements || []);
    }
    
    // FAQs
    if (data.faqs) {
        renderFAQs(data.faqs);
    }
    
    // Features
    if (data.features) {
        document.getElementById('featureAdmissions').checked = data.features.onlineAdmissions || false;
        document.getElementById('featureParent').checked = data.features.parentPortal || false;
        document.getElementById('featureStudent').checked = data.features.studentPortal || false;
        document.getElementById('featureTeacher').checked = data.features.teacherPortal || false;
        document.getElementById('featureNotifications').checked = data.features.notifications || false;
        document.getElementById('featurePayments').checked = data.features.onlinePayments || false;
    }
}

// Format date for input field
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Format date for display
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Render requirements list
function renderRequirements(requirements) {
    const container = document.getElementById('requirementsList');
    container.innerHTML = '';
    
    requirements.forEach((req, index) => {
        const item = document.createElement('div');
        item.className = 'requirement-item';
        item.innerHTML = `
            <div class="item-content">
                <span>${req.name}</span>
                <span class="item-badge ${req.required ? 'required' : 'optional'}">
                    ${req.required ? 'Required' : 'Optional'}
                </span>
            </div>
            <button class="delete-btn" onclick="deleteRequirement(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(item);
    });
}

// Render FAQs list
function renderFAQs(faqs) {
    const container = document.getElementById('faqsList');
    container.innerHTML = '';
    
    faqs.forEach((faq) => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        item.innerHTML = `
            <div class="faq-header">
                <span class="faq-question">${faq.question}</span>
                <div class="faq-actions">
                    <button class="edit-btn" onclick="editFAQ('${faq._id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteFAQ('${faq._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="faq-answer">${faq.answer}</p>
            <div class="faq-meta">
                <span class="faq-category">${faq.category || 'General'}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

// Collect form data
function collectFormData() {
    return {
        schoolInfo: {
            name: document.getElementById('schoolName').value,
            slogan: document.getElementById('schoolSlogan').value,
            foundedYear: parseInt(document.getElementById('foundedYear').value) || undefined,
            academicYear: document.getElementById('academicYear').value
        },
        contact: {
            mainOffice: {
                hours: document.getElementById('officeHours').value,
                phone: document.getElementById('officePhone').value
            },
            admissions: {
                email: document.getElementById('admissionsEmail').value,
                phone: document.getElementById('admissionsPhone').value
            },
            studentServices: {
                email: document.getElementById('supportEmail').value,
                phone: document.getElementById('supportPhone').value
            },
            counseling: {
                email: document.getElementById('counselEmail').value,
                phone: document.getElementById('counselPhone').value
            },
            generalEmail: document.getElementById('generalEmail').value
        },
        location: {
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zipCode: document.getElementById('zipCode').value,
            country: document.getElementById('country').value,
            mapUrl: document.getElementById('mapUrl').value,
            directionsUrl: document.getElementById('directionsUrl').value
        },
        socialMedia: {
            website: document.getElementById('websiteUrl').value,
            twitter: document.getElementById('twitterUrl').value,
            instagram: document.getElementById('instagramUrl').value,
            facebook: document.getElementById('facebookUrl').value,
            linkedin: document.getElementById('linkedinUrl').value,
            youtube: document.getElementById('youtubeUrl').value
        },
        admissions: {
            isOpen: document.getElementById('admissionsOpen').checked,
            currentYear: document.getElementById('admissionYear').value,
            priorityDeadline: document.getElementById('priorityDeadline').value || undefined,
            regularDeadline: document.getElementById('regularDeadline').value || undefined,
            decisionsDate: document.getElementById('decisionsDate').value || undefined,
            requirements: settings.admissions?.requirements || []
        },
        features: {
            onlineAdmissions: document.getElementById('featureAdmissions').checked,
            parentPortal: document.getElementById('featureParent').checked,
            studentPortal: document.getElementById('featureStudent').checked,
            teacherPortal: document.getElementById('featureTeacher').checked,
            notifications: document.getElementById('featureNotifications').checked,
            onlinePayments: document.getElementById('featurePayments').checked
        }
    };
}

// Save all settings
async function saveAllSettings() {
    try {
        const token = localStorage.getItem('token');
        const formData = collectFormData();
        
        const response = await axios.put(`${API_URL}/settings`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        settings = response.data;
        showToast('All settings saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast(error.response?.data?.message || 'Failed to save settings', 'error');
    }
}

// Reset to defaults
async function resetToDefaults() {
    const ok = await showConfirmModal({
        title: 'Reset Settings',
        message: 'Are you sure you want to reset all settings to defaults?',
        subMessage: 'This action cannot be undone.',
        confirmText: 'Reset',
        type: 'warning',
        icon: 'fa-undo'
    });
    if (!ok) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/settings/reset`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        settings = response.data;
        populateForm(settings);
        showToast('Settings reset to defaults', 'success');
    } catch (error) {
        console.error('Error resetting settings:', error);
        showToast('Failed to reset settings', 'error');
    }
}

// Add requirement
async function addRequirement() {
    const nameInput = document.getElementById('newRequirement');
    const requiredInput = document.getElementById('requirementRequired');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('Please enter a requirement name', 'warning');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/settings/requirements`, 
            { name, required: requiredInput.checked },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        settings = response.data;
        renderRequirements(settings.admissions.requirements);
        nameInput.value = '';
        requiredInput.checked = true;
        showToast('Requirement added', 'success');
    } catch (error) {
        console.error('Error adding requirement:', error);
        showToast('Failed to add requirement', 'error');
    }
}

// Delete requirement
async function deleteRequirement(index) {
    const ok = await showConfirmModal({
        title: 'Delete Requirement',
        message: 'Are you sure you want to delete this requirement?',
        confirmText: 'Delete',
        type: 'danger'
    });
    if (!ok) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/settings/requirements/${index}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        settings = response.data;
        renderRequirements(settings.admissions.requirements);
        showToast('Requirement deleted', 'success');
    } catch (error) {
        console.error('Error deleting requirement:', error);
        showToast('Failed to delete requirement', 'error');
    }
}

// Show add FAQ modal
function showAddFAQModal() {
    document.getElementById('faqModalTitle').textContent = 'Add New FAQ';
    document.getElementById('editFaqId').value = '';
    document.getElementById('faqQuestion').value = '';
    document.getElementById('faqAnswer').value = '';
    document.getElementById('faqCategory').value = 'general';
    document.getElementById('faqModal').classList.add('active');
}

// Close FAQ modal
function closeFAQModal() {
    document.getElementById('faqModal').classList.remove('active');
}

// Edit FAQ
function editFAQ(faqId) {
    const faq = settings.faqs.find(f => f._id === faqId);
    if (!faq) return;
    
    document.getElementById('faqModalTitle').textContent = 'Edit FAQ';
    document.getElementById('editFaqId').value = faqId;
    document.getElementById('faqQuestion').value = faq.question;
    document.getElementById('faqAnswer').value = faq.answer;
    document.getElementById('faqCategory').value = faq.category || 'general';
    document.getElementById('faqModal').classList.add('active');
}

// Save FAQ
async function saveFAQ() {
    const faqId = document.getElementById('editFaqId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();
    const category = document.getElementById('faqCategory').value;
    
    if (!question || !answer) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        let response;
        
        if (faqId) {
            // Update existing FAQ
            response = await axios.put(`${API_URL}/settings/faqs/${faqId}`,
                { question, answer, category },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } else {
            // Add new FAQ
            response = await axios.post(`${API_URL}/settings/faqs`,
                { question, answer, category },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        }
        
        settings = response.data;
        renderFAQs(settings.faqs);
        closeFAQModal();
        showToast(`FAQ ${faqId ? 'updated' : 'added'} successfully`, 'success');
    } catch (error) {
        console.error('Error saving FAQ:', error);
        showToast('Failed to save FAQ', 'error');
    }
}

// Delete FAQ
async function deleteFAQ(faqId) {
    const ok = await showConfirmModal({
        title: 'Delete FAQ',
        message: 'Are you sure you want to delete this FAQ?',
        confirmText: 'Delete',
        type: 'danger'
    });
    if (!ok) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`${API_URL}/settings/faqs/${faqId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        settings = response.data;
        renderFAQs(settings.faqs);
        showToast('FAQ deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting FAQ:', error);
        showToast('Failed to delete FAQ', 'error');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '../login.html';
    }, 1000);
}
