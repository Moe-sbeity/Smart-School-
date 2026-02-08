const API_URL = "http://localhost:5001/api";
const usersBody = document.getElementById("usersBody");
const searchInput = document.getElementById("searchInput");
const roleFilter = document.getElementById("roleFilter");

let users = [];
let filtered = [];
let admissions = [];

// Pagination state
let currentPage = 1;
const itemsPerPage = 10;

// Fetch Users
const fetchUsers = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(`${API_URL}/users/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    });
    users = res.data.users || [];
    updateStats();
    renderTable(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    if (typeof Toast !== 'undefined') {
      Toast.error("Error loading users");
    }
  }
};

// Fetch Admissions
const fetchAdmissions = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(`${API_URL}/admissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    admissions = res.data.admissions || [];
    renderAdmissions(admissions);
  } catch (err) {
    console.error("Failed to fetch admissions:", err);
  }
};

// Update Statistics
const updateStats = () => {
  const stats = {
    total: users.length,
    students: users.filter(u => u.role === "student").length,
    teachers: users.filter(u => u.role === "teacher").length,
    parents: users.filter(u => u.role === "parent").length,
    admins: users.filter(u => u.role === "admin").length,
  };

  document.getElementById("total-users").textContent = stats.total;
  document.getElementById("students").textContent = stats.students;
  document.getElementById("teachers").textContent = stats.teachers;
  document.getElementById("parents").textContent = stats.parents;
  document.getElementById("admins").textContent = stats.admins;
};

// Render Users Table with Pagination
const renderTable = (data) => {
  usersBody.innerHTML = "";

  if (data.length === 0) {
    usersBody.innerHTML = "<tr><td colspan='7'>No users found.</td></tr>";
    renderPagination(0);
    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  paginatedData.forEach((u) => {
    const row = document.createElement("tr");
    // Escape special characters in name for onclick handler
    const escapedName = u.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
    row.innerHTML = `
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="tag tag-role-${u.role}">${u.role}</span></td>
      <td>${u.gender || 'N/A'}</td>
      <td>${u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString() : 'N/A'}</td>
      <td>${u.subjects?.join(", ") || "-"}</td>
      <td class="actions-cell">
        <button class="btn-icon btn-icon-edit" onclick="window.editUser('${u._id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon btn-icon-danger" onclick="window.deleteUser('${u._id}', '${escapedName}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    usersBody.appendChild(row);
  });

  renderPagination(totalPages, data.length);
};

// Render Pagination Controls
const renderPagination = (totalPages, totalItems = 0) => {
  let paginationContainer = document.getElementById('pagination-container');
  
  if (!paginationContainer) {
    // Create pagination container if it doesn't exist
    const table = document.querySelector('.users-table');
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    paginationContainer.className = 'pagination-container';
    table.parentNode.insertBefore(paginationContainer, table.nextSibling);
  }

  if (totalPages <= 1) {
    paginationContainer.innerHTML = totalItems > 0 ? 
      `<div class="pagination-info">Showing all ${totalItems} users</div>` : '';
    return;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  let paginationHTML = `
    <div class="pagination-info">
      Showing ${startItem}-${endItem} of ${totalItems} users
    </div>
    <div class="pagination-controls">
      <button class="pagination-btn" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-angle-left"></i>
      </button>
  `;

  // Generate page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <button class="pagination-btn pagination-number ${i === currentPage ? 'active' : ''}" 
              onclick="changePage(${i})">${i}</button>
    `;
  }

  if (endPage < totalPages) {
    paginationHTML += `<span class="pagination-ellipsis">...</span>`;
  }

  paginationHTML += `
      <button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-angle-right"></i>
      </button>
      <button class="pagination-btn" onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-angle-double-right"></i>
      </button>
    </div>
  `;

  paginationContainer.innerHTML = paginationHTML;
};

// Change Page
window.changePage = (page) => {
  const data = filtered.length > 0 ? filtered : users;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  renderTable(data);
};

// Render Admissions
const renderAdmissions = (data) => {
  const container = document.querySelector('.admissions-list');
  
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #999;">
        No admission applications yet
      </div>
    `;
    return;
  }

  // Show only first 3 admissions
  const displayAdmissions = data.slice(0, 3);
  
  container.innerHTML = displayAdmissions.map(admission => {
    const statusMap = {
      'pending': 'tag-status-pending',
      'reviewed': 'tag-status-reviewed',
      'missing-docs': 'tag-status-missing',
      'accepted': 'tag-status-accepted',
      'rejected': 'tag-status-rejected'
    };
    
    const statusClass = statusMap[admission.status] || 'tag-status-pending';
    const statusText = admission.status.charAt(0).toUpperCase() + 
                      admission.status.slice(1).replace('-', ' ');
    
    const buttonConfig = {
      'pending': { text: 'Review', class: 'btn-secondary' },
      'reviewed': { text: 'View', class: 'btn-secondary' },
      'missing-docs': { text: 'Request', class: 'btn-secondary' },
      'accepted': { text: 'Enroll', class: 'btn-primary' },
      'rejected': { text: 'View', class: 'btn-secondary' }
    };
    
    const btn = buttonConfig[admission.status] || buttonConfig['pending'];
    
    return `
      <div class="applicant-item">
        <div style="flex: 1;">
          <span style="font-weight: 600; display: block;">${admission.fullName}</span>
          <span style="font-size: 13px; color: #666;">Grade ${admission.grade} • ${admission.email}</span>
        </div>
        <span class="tag ${statusClass}">${statusText}</span>
        <button class="btn ${btn.class}" onclick="viewAdmission('${admission._id}')">
          ${btn.text}
        </button>
      </div>
    `;
  }).join('');
};

// Filter Users
const filterUsers = () => {
  const term = searchInput.value.toLowerCase();
  const role = roleFilter.value;

  filtered = users.filter(u => {
    const matchesRole = role === "all" || u.role === role;
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term);
    return matchesRole && matchesSearch;
  });

  // Reset to first page when filtering
  currentPage = 1;
  renderTable(filtered);
};

searchInput.addEventListener("input", filterUsers);
roleFilter.addEventListener("change", filterUsers);

// Delete User
const deleteUser = async (id, name) => {
  if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`${API_URL}/users/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    showNotification("User deleted successfully", "success");
    await fetchUsers();
  } catch (err) {
    console.error('Delete user error:', err);
    const errorMsg = err.response?.data?.message || "Failed to delete user";
    showNotification(errorMsg, "error");
  }
};

// Edit User - Show Edit Modal
const editUser = async (userId) => {
  try {
    const user = users.find(u => u._id === userId);
    if (!user) {
      showNotification('User not found', 'error');
      return;
    }
    showEditUserModal(user);
  } catch (error) {
    console.error('Error loading user:', error);
    showNotification('Failed to load user details', 'error');
  }
};

// Show Edit User Modal
const showEditUserModal = (user) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'editUserModal';
  
  const subjectsOptions = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer', 'Computer Science', 'Arabic', 'French'];
  const subjectsCheckboxes = user.role === 'teacher' ? `
    <div class="form-group" id="editSubjectsGroup">
      <label>Subjects</label>
      <div class="subjects-grid-modal">
        ${subjectsOptions.map(sub => `
          <label class="checkbox-label">
            <input type="checkbox" name="editSubjects" value="${sub}" ${user.subjects?.includes(sub) ? 'checked' : ''}>
            <span>${sub}</span>
          </label>
        `).join('')}
      </div>
    </div>
  ` : '';

  const classGradeOptions = ['kg1','kg2','grade1','grade2','grade3','grade4','grade5','grade6','grade7','grade8','grade9','grade10','grade11','grade12'];
  const classSectionOptions = ['A','B','C','D','E','F'];
  
  const studentFields = user.role === 'student' ? `
    <div class="form-group">
      <label for="editClassGrade">Class Grade</label>
      <select id="editClassGrade" class="form-control">
        <option value="">Select Grade</option>
        ${classGradeOptions.map(g => `<option value="${g}" ${user.classGrade === g ? 'selected' : ''}>${g.replace('grade', 'Grade ').replace('kg', 'KG')}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label for="editClassSection">Class Section</label>
      <select id="editClassSection" class="form-control">
        <option value="">Select Section</option>
        ${classSectionOptions.map(s => `<option value="${s}" ${user.classSection === s ? 'selected' : ''}>Section ${s}</option>`).join('')}
      </select>
    </div>
  ` : '';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 550px;">
      <div class="modal-header">
        <h3><i class="fas fa-user-edit"></i> Edit User</h3>
        <button class="modal-close" onclick="closeEditModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="editUserForm">
          <input type="hidden" id="editUserId" value="${user._id}">
          
          <div class="form-group">
            <label for="editName">Full Name</label>
            <input type="text" id="editName" class="form-control" value="${user.name}" required>
          </div>
          
          <div class="form-group">
            <label for="editEmail">Email</label>
            <input type="email" id="editEmail" class="form-control" value="${user.email}" readonly>
            <small style="color: #999;">Email cannot be changed</small>
          </div>
          
          <div class="form-group">
            <label for="editGender">Gender</label>
            <select id="editGender" class="form-control" required>
              <option value="male" ${user.gender === 'male' ? 'selected' : ''}>Male</option>
              <option value="female" ${user.gender === 'female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="editDob">Date of Birth</label>
            <input type="date" id="editDob" class="form-control" value="${user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : ''}">
          </div>
          
          <div class="form-group">
            <label for="editRole">Role</label>
            <input type="text" id="editRole" class="form-control" value="${user.role}" readonly>
            <small style="color: #999;">Role cannot be changed</small>
          </div>
          
          ${subjectsCheckboxes}
          ${studentFields}
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" id="saveUserBtn">
              <i class="fas fa-save"></i> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add form submit handler
  document.getElementById('editUserForm').addEventListener('submit', handleEditUserSubmit);
};

// Close Edit Modal
const closeEditModal = () => {
  const modal = document.getElementById('editUserModal');
  if (modal) modal.remove();
};

// Handle Edit User Form Submit
const handleEditUserSubmit = async (e) => {
  e.preventDefault();
  
  const userId = document.getElementById('editUserId').value;
  const saveBtn = document.getElementById('saveUserBtn');
  
  const userData = {
    name: document.getElementById('editName').value.trim(),
    gender: document.getElementById('editGender').value,
    dateOfBirth: document.getElementById('editDob').value || null
  };
  
  // Get subjects for teachers
  const subjectCheckboxes = document.querySelectorAll('input[name="editSubjects"]:checked');
  if (subjectCheckboxes.length > 0) {
    userData.subjects = Array.from(subjectCheckboxes).map(cb => cb.value);
  }
  
  // Get class info for students
  const classGradeEl = document.getElementById('editClassGrade');
  const classSectionEl = document.getElementById('editClassSection');
  if (classGradeEl) userData.classGrade = classGradeEl.value;
  if (classSectionEl) userData.classSection = classSectionEl.value;
  
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${API_URL}/users/${userId}`, userData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    showNotification('User updated successfully', 'success');
    closeEditModal();
    await fetchUsers();
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMsg = error.response?.data?.message || 'Failed to update user';
    showNotification(errorMsg, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
  }
};

// View Admission Details
const viewAdmission = async (admissionId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/admissions/${admissionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const admission = response.data.admission;
    showAdmissionModal(admission);
  } catch (error) {
    console.error('Error loading admission:', error);
    showNotification('Failed to load admission details', 'error');
  }
};

// Show Admission Modal
const showAdmissionModal = (admission) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Admission Application</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="detail-row">
          <strong>Full Name:</strong>
          <span>${admission.fullName}</span>
        </div>
        <div class="detail-row">
          <strong>Email:</strong>
          <span>${admission.email}</span>
        </div>
        <div class="detail-row">
          <strong>Grade:</strong>
          <span>Grade ${admission.grade}</span>
        </div>
        <div class="detail-row">
          <strong>Intended Start:</strong>
          <span>${admission.intendedStart}</span>
        </div>
        <div class="detail-row">
          <strong>Status:</strong>
          <span class="tag tag-status-${admission.status}">${admission.status}</span>
        </div>
        <div class="detail-row">
          <strong>Submitted:</strong>
          <span>${new Date(admission.createdAt).toLocaleDateString()}</span>
        </div>
        ${admission.notes ? `
        <div class="detail-row">
          <strong>Notes:</strong>
          <span>${admission.notes}</span>
        </div>
        ` : ''}
        <div class="modal-actions">
          <select id="statusSelect" class="form-control">
            <option value="pending" ${admission.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="reviewed" ${admission.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
            <option value="missing-docs" ${admission.status === 'missing-docs' ? 'selected' : ''}>Missing Docs</option>
            <option value="accepted" ${admission.status === 'accepted' ? 'selected' : ''}>Accepted</option>
            <option value="rejected" ${admission.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
          <button class="btn btn-primary" onclick="updateAdmissionStatus('${admission._id}')">
            Update Status
          </button>
          <button class="btn btn-danger" onclick="deleteAdmission('${admission._id}')">
            Delete
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Update Admission Status
const updateAdmissionStatus = async (admissionId) => {
  const status = document.getElementById('statusSelect').value;
  
  try {
    const token = localStorage.getItem("token");
    await axios.put(`${API_URL}/admissions/${admissionId}`, 
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    showNotification('Admission status updated', 'success');
    
    // Close modal
    document.querySelector('.modal-overlay').remove();
    
    // Reload admissions
    await fetchAdmissions();
  } catch (error) {
    console.error('Error updating admission:', error);
    showNotification('Failed to update admission status', 'error');
  }
};

// Delete Admission
const deleteAdmission = async (admissionId) => {
  if (!confirm('Are you sure you want to delete this admission?')) {
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`${API_URL}/admissions/${admissionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    showNotification('Admission deleted', 'success');
    
    // Close modal
    document.querySelector('.modal-overlay').remove();
    
    // Reload admissions
    await fetchAdmissions();
  } catch (error) {
    console.error('Error deleting admission:', error);
    showNotification('Failed to delete admission', 'error');
  }
};

// Show Notification using Toast
const showNotification = (message, type) => {
  if (typeof Toast !== 'undefined') {
    if (type === 'success') {
      Toast.success(message);
    } else if (type === 'error') {
      Toast.error(message);
    } else {
      Toast.info(message);
    }
    return;
  }
  console.log(`[${type.toUpperCase()}]: ${message}`);
};

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "../home.html";
});

// Check Auth and Load Admin Name
const checkAuth = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
      adminNameElement.textContent = response.data.user.name;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    localStorage.removeItem("token");
    window.location.href = "../login.html";
  }
};

// Fetch Announcements
const fetchAnnouncements = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(`${API_URL}/admin-announcements`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const announcements = res.data.announcements || [];
    renderAnnouncementsPreview(announcements);
  } catch (err) {
    console.error("Failed to fetch announcements:", err);
  }
};

// Render Announcements Preview (in dashboard)
const renderAnnouncementsPreview = (announcements) => {
  // If there's an announcements section in the dashboard, update it
  const announcementsContainer = document.querySelector('.announcements-preview');
  
  if (!announcementsContainer) return;

  if (announcements.length === 0) {
    announcementsContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #999;">
        No announcements yet
      </div>
    `;
    return;
  }

  announcementsContainer.innerHTML = announcements.slice(0, 3).map(ann => `
    <div class="announcement-preview-item" onclick="viewAnnouncement('${ann._id}')">
      <div style="flex: 1;">
        <h4 style="margin: 0 0 5px 0; color: #333;">${ann.title}</h4>
        <p style="margin: 0; font-size: 13px; color: #666;">
          ${new Date(ann.createdAt).toLocaleDateString()} • ${ann.category}
        </p>
      </div>
      <i class="fas fa-chevron-right" style="color: #999;"></i>
    </div>
  `).join('');
};

// View Announcement Details
const viewAnnouncement = async (announcementId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/admin-announcements/${announcementId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const announcement = response.data.announcement;
    showAnnouncementModal(announcement);
  } catch (error) {
    console.error('Error loading announcement:', error);
    showNotification('Failed to load announcement details', 'error');
  }
};

// Show Announcement Modal
const showAnnouncementModal = (announcement) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  
  const categoryColors = {
    'urgent': 'background: #ffebee; color: #c62828;',
    'event': 'background: #f3e5f5; color: #7b1fa2;',
    'general': 'background: #e8f5e9; color: #2e7d32;'
  };
  
  const categoryStyle = categoryColors[announcement.category] || categoryColors['general'];
  
  const attachmentsHtml = announcement.attachments && announcement.attachments.length > 0 ? `
    <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
      <strong style="margin-bottom: 10px;">Attachments:</strong>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        ${announcement.attachments.map(att => {
          const ext = att.originalName.split('.').pop().toLowerCase();
          const iconMap = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint',
            'pptx': 'fa-file-powerpoint',
            'txt': 'fa-file-alt',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image',
            'gif': 'fa-file-image'
          };
          const icon = iconMap[ext] || 'fa-file';
          
          return `
            <a href="${API_URL}/admin-announcements/${announcement._id}/attachments/${att._id}/download" 
               target="_blank"
               style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f8f9fa; border-radius: 5px; text-decoration: none; color: #666; font-size: 13px; transition: all 0.3s;"
               onmouseover="this.style.background='#e3f2fd'; this.style.color='#1976d2';"
               onmouseout="this.style.background='#f8f9fa'; this.style.color='#666';">
              <i class="fas ${icon}"></i>
              <span>${att.originalName}</span>
            </a>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 700px;">
      <div class="modal-header">
        <h3>Announcement Details</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="detail-row">
          <strong>Title:</strong>
          <span>${announcement.title}</span>
        </div>
        <div class="detail-row">
          <strong>Category:</strong>
          <span class="tag" style="${categoryStyle}">${announcement.category}</span>
        </div>
        <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
          <strong style="margin-bottom: 10px;">Content:</strong>
          <p style="margin: 0; line-height: 1.6; color: #555;">${announcement.content}</p>
        </div>
        <div class="detail-row">
          <strong>Posted By:</strong>
          <span>${announcement.author?.name || 'Admin'}</span>
        </div>
        <div class="detail-row">
          <strong>Date:</strong>
          <span>${new Date(announcement.createdAt).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
        ${attachmentsHtml}
        <div class="modal-actions" style="justify-content: flex-start;">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            Close
          </button>
          <button class="btn btn-danger" onclick="deleteAnnouncement('${announcement._id}')">
            <i class="fas fa-trash"></i> Delete Announcement
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

// Delete Announcement
const deleteAnnouncement = async (announcementId) => {
  if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    await axios.delete(`${API_URL}/admin-announcements/${announcementId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    showNotification('Announcement deleted successfully', 'success');
    
    // Close modal
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
    
    // Reload announcements
    await fetchAnnouncements();
  } catch (error) {
    console.error('Error deleting announcement:', error);
    showNotification('Failed to delete announcement', 'error');
  }
};

// Initialize Dashboard
const initDashboard = async () => {
  await checkAuth();
  await fetchUsers();
  await fetchAdmissions();
  await fetchAnnouncements();
  await initCharts();
};

// Initialize Charts
const initCharts = async () => {
  initStudentsByGradeChart();
  await initAttendanceOverviewChart();
  initTeachersBySubjectChart();
  initAdmissionStatusChart();
};

// Students by Grade (Bar Chart)
const initStudentsByGradeChart = () => {
  const ctx = document.getElementById('studentsByGradeChart');
  if (!ctx) return;

  // Count students by classGrade
  const students = users.filter(u => u.role === 'student');
  const gradeOrder = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
  const gradeLabels = ['KG1', 'KG2', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'];
  
  const gradeCounts = gradeOrder.map(grade => {
    return students.filter(s => s.classGrade === grade).length;
  });

  // Color gradient from light to dark blue
  const colors = [
    '#90caf9', '#90caf9',
    '#64b5f6', '#64b5f6', '#64b5f6',
    '#42a5f5', '#42a5f5', '#42a5f5',
    '#2196f3', '#2196f3', '#2196f3',
    '#1e88e5', '#1976d2', '#1565c0'
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: gradeLabels,
      datasets: [{
        label: 'Students',
        data: gradeCounts,
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
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return `${context.raw} Students`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { size: 11 }, color: '#64748b', stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#64748b', maxRotation: 45, minRotation: 45 }
        }
      }
    }
  });
};

// Attendance Overview (Doughnut Chart)
const initAttendanceOverviewChart = async () => {
  const ctx = document.getElementById('attendanceOverviewChart');
  if (!ctx) return;

  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(`${API_URL}/attendance/status-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = res.data.stats || { present: 0, absent: 0, late: 0, excused: 0 };

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Present', 'Absent', 'Late', 'Excused'],
        datasets: [{
          data: [stats.present, stats.absent, stats.late, stats.excused],
          backgroundColor: [
            '#10b981',  // Present - green
            '#ef4444',  // Absent - red
            '#f59e0b',  // Late - amber
            '#3b82f6'   // Excused - blue
          ],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                return `${context.label}: ${context.raw} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to load attendance chart:', error);
    // Fallback empty chart
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
        cutout: '60%',
        plugins: { legend: { display: false } }
      }
    });
  }
};

// Teachers by Subject (Horizontal Bar Chart)
const initTeachersBySubjectChart = () => {
  const ctx = document.getElementById('teachersBySubjectChart');
  if (!ctx) return;

  const teachers = users.filter(u => u.role === 'teacher');
  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer', 'Arabic', 'French'];
  
  const subjectCounts = subjects.map(subject => {
    return teachers.filter(t => t.subjects && t.subjects.includes(subject)).length;
  });

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: subjects,
      datasets: [{
        label: 'Teachers',
        data: subjectCounts,
        backgroundColor: colors,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              return `${context.raw} Teacher${context.raw !== 1 ? 's' : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { size: 11 }, color: '#64748b', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 }, color: '#64748b' }
        }
      }
    }
  });
};

// Admission Status (Pie Chart)
const initAdmissionStatusChart = () => {
  const ctx = document.getElementById('admissionStatusChart');
  if (!ctx) return;

  // Count admissions by status
  const statusCounts = {
    pending: admissions.filter(a => a.status === 'pending').length,
    reviewed: admissions.filter(a => a.status === 'reviewed').length,
    accepted: admissions.filter(a => a.status === 'accepted').length,
    rejected: admissions.filter(a => a.status === 'rejected').length,
    missingDocs: admissions.filter(a => a.status === 'missing-docs').length
  };

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['No Applications'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e2e8f0'],
          borderWidth: 0
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

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Pending', 'Reviewed', 'Accepted', 'Rejected', 'Missing Docs'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.reviewed, statusCounts.accepted, statusCounts.rejected, statusCounts.missingDocs],
        backgroundColor: [
          '#f59e0b',  // Pending - amber
          '#3b82f6',  // Reviewed - blue
          '#10b981',  // Accepted - green
          '#ef4444',  // Rejected - red
          '#8b5cf6'   // Missing Docs - purple
        ],
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 10 }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { size: 13, weight: '600' },
          bodyFont: { size: 12 },
          padding: 12,
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
};

// Make functions globally accessible for onclick handlers
window.deleteUser = deleteUser;
window.editUser = editUser;
window.closeEditModal = closeEditModal;
window.viewAdmission = viewAdmission;
window.updateAdmissionStatus = updateAdmissionStatus;
window.deleteAdmission = deleteAdmission;
window.viewAnnouncement = viewAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;

initDashboard();