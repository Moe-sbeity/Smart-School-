const API_URL = 'http://localhost:5001/api';

const getAuthToken = () => localStorage.getItem('token');
axios.defaults.headers.common['Authorization'] = `Bearer ${getAuthToken()}`;

// Available grades and sections
const availableGrades = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 
                         'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 
                         'grade10', 'grade11', 'grade12'];
const availableSections = ['A', 'B', 'C', 'D', 'E', 'F'];

// Global state
let allStudents = [];
let selectedStudentIds = [];
let currentTargetingMode = 'gradeSection'; // 'gradeSection' or 'specificStudents'

// Show alert
function showAlert(type, message) {
  const alertId = `${type}Alert`;
  const messageId = `${type}Message`;
  
  const alert = document.getElementById(alertId);
  const messageEl = document.getElementById(messageId);
  
  messageEl.textContent = message;
  alert.style.display = 'flex';
  
  setTimeout(() => {
    alert.style.display = 'none';
  }, 5000);
}

// Format grade label
function formatGradeLabel(grade) {
  if (grade === 'kg1') return 'KG1';
  if (grade === 'kg2') return 'KG2';
  return grade.charAt(0).toUpperCase() + grade.slice(1);
}

// Initialize grade and section checkboxes
function initializeTargetingControls() {
  const gradeContainer = document.getElementById('gradeCheckboxes');
  const sectionContainer = document.getElementById('sectionCheckboxes');
  
  // Create grade checkboxes
  availableGrades.forEach(grade => {
    const div = document.createElement('div');
    div.className = 'multi-select-item';
    div.innerHTML = `
      <input type="checkbox" id="grade_${grade}" value="${grade}">
      <label for="grade_${grade}" style="cursor: pointer; margin: 0;">${formatGradeLabel(grade)}</label>
    `;
    gradeContainer.appendChild(div);
  });
  
  // Create section checkboxes
  availableSections.forEach(section => {
    const div = document.createElement('div');
    div.className = 'multi-select-item';
    div.innerHTML = `
      <input type="checkbox" id="section_${section}" value="${section}">
      <label for="section_${section}" style="cursor: pointer; margin: 0;">Section ${section}</label>
    `;
    sectionContainer.appendChild(div);
  });
}

// Load all students
async function loadStudents() {
  try {
    const response = await axios.get(`${API_URL}/users/all`);
    allStudents = response.data.users.filter(user => user.role === 'student');
    renderStudentList(allStudents);
  } catch (error) {
    console.error('Error loading students:', error);
    document.getElementById('studentList').innerHTML = `
      <div class="loading" style="color: #f44336;">
        <i class="fas fa-exclamation-triangle"></i> Failed to load students
      </div>
    `;
  }
}

// Render student list
function renderStudentList(students) {
  const studentList = document.getElementById('studentList');
  
  if (students.length === 0) {
    studentList.innerHTML = `
      <div class="loading">
        <i class="fas fa-user-slash"></i> No students found
      </div>
    `;
    return;
  }
  
  studentList.innerHTML = students.map(student => {
    const isSelected = selectedStudentIds.includes(student._id);
    const gradeSection = student.classGrade && student.classSection 
      ? `${formatGradeLabel(student.classGrade)} - Section ${student.classSection}`
      : 'No grade assigned';
    
    return `
      <div class="student-item" onclick="toggleStudent('${student._id}')">
        <input 
          type="checkbox" 
          id="student_${student._id}" 
          ${isSelected ? 'checked' : ''}
          onclick="event.stopPropagation(); toggleStudent('${student._id}')"
        >
        <div class="student-info">
          <div class="student-name">${student.name}</div>
          <div class="student-details">${student.email} • ${gradeSection}</div>
        </div>
      </div>
    `;
  }).join('');
  
  updateSelectedCount();
}

// Toggle student selection
window.toggleStudent = function(studentId) {
  const checkbox = document.getElementById(`student_${studentId}`);
  
  if (selectedStudentIds.includes(studentId)) {
    selectedStudentIds = selectedStudentIds.filter(id => id !== studentId);
    checkbox.checked = false;
  } else {
    selectedStudentIds.push(studentId);
    checkbox.checked = true;
  }
  
  updateSelectedCount();
  updateTargetingPreview();
};

// Update selected count
function updateSelectedCount() {
  const countElement = document.getElementById('selectedCount');
  if (selectedStudentIds.length > 0) {
    countElement.textContent = `${selectedStudentIds.length} selected`;
    countElement.style.display = 'inline-block';
  } else {
    countElement.style.display = 'none';
  }
}

// Search students
document.getElementById('studentSearch').addEventListener('input', function() {
  const searchTerm = this.value.toLowerCase();
  
  if (searchTerm === '') {
    renderStudentList(allStudents);
    return;
  }
  
  const filtered = allStudents.filter(student => {
    const name = student.name.toLowerCase();
    const email = student.email.toLowerCase();
    const grade = student.classGrade ? formatGradeLabel(student.classGrade).toLowerCase() : '';
    const section = student.classSection ? student.classSection.toLowerCase() : '';
    
    return name.includes(searchTerm) || 
           email.includes(searchTerm) || 
           grade.includes(searchTerm) || 
           section.includes(searchTerm);
  });
  
  renderStudentList(filtered);
});

// Targeting mode buttons
document.getElementById('modeGradeSection').addEventListener('click', function() {
  currentTargetingMode = 'gradeSection';
  this.classList.add('active');
  document.getElementById('modeSpecificStudents').classList.remove('active');
  document.getElementById('gradeSectionTargeting').style.display = 'block';
  document.getElementById('specificStudentsTargeting').style.display = 'none';
  updateTargetingPreview();
});

document.getElementById('modeSpecificStudents').addEventListener('click', function() {
  currentTargetingMode = 'specificStudents';
  this.classList.add('active');
  document.getElementById('modeGradeSection').classList.remove('active');
  document.getElementById('gradeSectionTargeting').style.display = 'none';
  document.getElementById('specificStudentsTargeting').style.display = 'block';
  
  // Load students if not already loaded
  if (allStudents.length === 0) {
    loadStudents();
  }
  
  updateTargetingPreview();
});

// Update targeting preview
function updateTargetingPreview() {
  let targetText = '';
  
  if (currentTargetingMode === 'specificStudents') {
    if (selectedStudentIds.length === 0) {
      targetText = '👤 No students selected';
    } else {
      targetText = `👤 ${selectedStudentIds.length} specific student(s)`;
    }
  } else {
    const allGrades = document.getElementById('allGradesCheck').checked;
    const allSections = document.getElementById('allSectionsCheck').checked;
    
    if (allGrades && allSections) {
      targetText = '📢 All Students';
    } else if (allGrades && !allSections) {
      const selectedSections = getSelectedSections();
      targetText = `📢 All Grades • Sections: ${selectedSections.join(', ') || 'None'}`;
    } else if (!allGrades && allSections) {
      const selectedGrades = getSelectedGrades();
      targetText = `📢 Grades: ${selectedGrades.map(formatGradeLabel).join(', ') || 'None'} • All Sections`;
    } else {
      const selectedGrades = getSelectedGrades();
      const selectedSections = getSelectedSections();
      targetText = `📢 ${selectedGrades.map(formatGradeLabel).join(', ') || 'No grades'} • ${selectedSections.join(', ') || 'No sections'}`;
    }
  }
  
  document.getElementById('previewTargeting').textContent = targetText;
}

// Get selected grades
function getSelectedGrades() {
  const selected = [];
  availableGrades.forEach(grade => {
    const checkbox = document.getElementById(`grade_${grade}`);
    if (checkbox && checkbox.checked) {
      selected.push(grade);
    }
  });
  return selected;
}

// Get selected sections
function getSelectedSections() {
  const selected = [];
  availableSections.forEach(section => {
    const checkbox = document.getElementById(`section_${section}`);
    if (checkbox && checkbox.checked) {
      selected.push(section);
    }
  });
  return selected;
}

// Toggle grade selection
document.getElementById('allGradesCheck').addEventListener('change', function() {
  const gradeContainer = document.getElementById('gradeSelectContainer');
  const gradeInfo = document.getElementById('gradeTargetInfo');
  
  if (this.checked) {
    gradeContainer.style.display = 'none';
    gradeInfo.textContent = 'All Grades';
    // Uncheck all individual grades
    availableGrades.forEach(grade => {
      const checkbox = document.getElementById(`grade_${grade}`);
      if (checkbox) checkbox.checked = false;
    });
  } else {
    gradeContainer.style.display = 'block';
    gradeInfo.textContent = 'Specific Grades';
  }
  updateTargetingPreview();
});

// Toggle section selection
document.getElementById('allSectionsCheck').addEventListener('change', function() {
  const sectionContainer = document.getElementById('sectionSelectContainer');
  const sectionInfo = document.getElementById('sectionTargetInfo');
  
  if (this.checked) {
    sectionContainer.style.display = 'none';
    sectionInfo.textContent = 'All Sections';
    // Uncheck all individual sections
    availableSections.forEach(section => {
      const checkbox = document.getElementById(`section_${section}`);
      if (checkbox) checkbox.checked = false;
    });
  } else {
    sectionContainer.style.display = 'block';
    sectionInfo.textContent = 'Specific Sections';
  }
  updateTargetingPreview();
});

// Listen to grade checkbox changes
document.getElementById('gradeCheckboxes').addEventListener('change', function(e) {
  if (e.target.type === 'checkbox') {
    updateTargetingPreview();
  }
});

// Listen to section checkbox changes
document.getElementById('sectionCheckboxes').addEventListener('change', function(e) {
  if (e.target.type === 'checkbox') {
    updateTargetingPreview();
  }
});

// Live preview for basic fields
document.getElementById('title').addEventListener('input', function() {
  document.getElementById('previewTitle').textContent = this.value || 'Announcement Title';
});

document.getElementById('content').addEventListener('input', function() {
  document.getElementById('previewContent').textContent = this.value || 'Your announcement content will appear here...';
});

document.getElementById('category').addEventListener('change', function() {
  const category = this.value || 'general';
  const previewCategory = document.getElementById('previewCategory');
  previewCategory.textContent = category;
  previewCategory.className = `preview-category ${category}`;
});

// Pagination variables
let announcementsPagination = null;
let currentPage = 1;
let currentLimit = 10;

// Load announcements
async function loadAnnouncements(page = 1, limit = 10) {
  try {
    const response = await axios.get(`${API_URL}/admin-announcements?page=${page}&limit=${limit}`);
    const announcements = response.data.data || response.data.announcements || [];
    const paginationData = response.data.pagination;
    
    currentPage = page;
    currentLimit = limit;
    
    // Update pagination component
    if (announcementsPagination && paginationData) {
      announcementsPagination.update(paginationData);
    }
    
    const container = document.getElementById('announcementsListContainer');
    
    if (announcements.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <i class="fas fa-bullhorn" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
          <p>No announcements yet. Create your first one above!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = announcements.map(announcement => {
      const date = new Date(announcement.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Build target info
      let targetInfo = '';
      if (announcement.isForSpecificStudents) {
        const count = announcement.targetStudents?.length || 0;
        targetInfo = `<span style="color: #9C27B0;">👤 ${count} specific student(s)</span>`;
      } else if (announcement.isForAllGrades && announcement.isForAllSections) {
        targetInfo = '<span style="color: #4CAF50;">📢 All Students</span>';
      } else {
        const parts = [];
        if (announcement.isForAllGrades) {
          parts.push('All Grades');
        } else if (announcement.targetGrades && announcement.targetGrades.length > 0) {
          parts.push(`Grades: ${announcement.targetGrades.map(formatGradeLabel).join(', ')}`);
        }
        
        if (announcement.isForAllSections) {
          parts.push('All Sections');
        } else if (announcement.targetSections && announcement.targetSections.length > 0) {
          parts.push(`Sections: ${announcement.targetSections.join(', ')}`);
        }
        targetInfo = `<span style="color: #2196F3;">🎯 ${parts.join(' • ')}</span>`;
      }

      return `
        <div class="announcement-item">
          <div class="announcement-info">
            <h4>${announcement.title}</h4>
            <p>
              <span class="preview-category ${announcement.category}">${announcement.category}</span> • 
              ${date} • 
              By ${announcement.author?.name || 'Admin'}<br>
              ${targetInfo}
            </p>
          </div>
          <div class="announcement-actions">
            <button class="icon-btn" onclick="deleteAnnouncement('${announcement._id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading announcements:', error);
  }
}

// Initialize pagination on page load
document.addEventListener('DOMContentLoaded', function() {
  announcementsPagination = new Pagination('paginationContainer', {
    onPageChange: (page, limit) => loadAnnouncements(page, limit),
    itemsPerPageOptions: [5, 10, 20, 50]
  });
});

// Create announcement
document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    title: document.getElementById('title').value,
    content: document.getElementById('content').value,
    category: document.getElementById('category').value
  };
  
  // Add targeting based on mode
  if (currentTargetingMode === 'specificStudents') {
    if (selectedStudentIds.length === 0) {
      showAlert('error', 'Please select at least one student');
      return;
    }
    
    formData.isForSpecificStudents = true;
    formData.targetStudents = selectedStudentIds;
  } else {
    const isForAllGrades = document.getElementById('allGradesCheck').checked;
    const isForAllSections = document.getElementById('allSectionsCheck').checked;
    
    formData.isForSpecificStudents = false;
    formData.isForAllGrades = isForAllGrades;
    formData.isForAllSections = isForAllSections;
    formData.targetGrades = isForAllGrades ? [] : getSelectedGrades();
    formData.targetSections = isForAllSections ? [] : getSelectedSections();
    
    // Validation
    if (!isForAllGrades && formData.targetGrades.length === 0) {
      showAlert('error', 'Please select at least one grade or choose "All Grades"');
      return;
    }
    
    if (!isForAllSections && formData.targetSections.length === 0) {
      showAlert('error', 'Please select at least one section or choose "All Sections"');
      return;
    }
  }

  try {
    await axios.post(`${API_URL}/admin-announcements`, formData);
    showAlert('success', 'Announcement published successfully!');
    
    // Reset form
    resetForm();
    
    // Reload announcements
    loadAnnouncements();
  } catch (error) {
    console.error('Error creating announcement:', error);
    showAlert('error', error.response?.data?.message || 'Failed to publish announcement');
  }
});

// Reset form
function resetForm() {
  document.getElementById('announcementForm').reset();
  document.getElementById('previewTitle').textContent = 'Announcement Title';
  document.getElementById('previewContent').textContent = 'Your announcement content will appear here...';
  document.getElementById('previewCategory').textContent = 'general';
  document.getElementById('previewCategory').className = 'preview-category general';
  document.getElementById('previewTargeting').textContent = '';
  
  // Reset targeting mode
  currentTargetingMode = 'gradeSection';
  document.getElementById('modeGradeSection').classList.add('active');
  document.getElementById('modeSpecificStudents').classList.remove('active');
  document.getElementById('gradeSectionTargeting').style.display = 'block';
  document.getElementById('specificStudentsTargeting').style.display = 'none';
  
  // Reset grade/section targeting
  document.getElementById('allGradesCheck').checked = true;
  document.getElementById('allSectionsCheck').checked = true;
  document.getElementById('gradeSelectContainer').style.display = 'none';
  document.getElementById('sectionSelectContainer').style.display = 'none';
  document.getElementById('gradeTargetInfo').textContent = 'All Grades';
  document.getElementById('sectionTargetInfo').textContent = 'All Sections';
  
  // Uncheck all grade/section checkboxes
  availableGrades.forEach(grade => {
    const checkbox = document.getElementById(`grade_${grade}`);
    if (checkbox) checkbox.checked = false;
  });
  availableSections.forEach(section => {
    const checkbox = document.getElementById(`section_${section}`);
    if (checkbox) checkbox.checked = false;
  });
  
  // Reset student selection
  selectedStudentIds = [];
  document.getElementById('studentSearch').value = '';
  updateSelectedCount();
  if (allStudents.length > 0) {
    renderStudentList(allStudents);
  }
}

// Reset button
document.getElementById('resetBtn').addEventListener('click', resetForm);

// Delete announcement
window.deleteAnnouncement = async function(id) {
  if (!confirm('Are you sure you want to delete this announcement?')) return;
  
  try {
    await axios.delete(`${API_URL}/admin-announcements/${id}`);
    showAlert('success', 'Announcement deleted successfully!');
    loadAnnouncements();
  } catch (error) {
    console.error('Error deleting announcement:', error);
    showAlert('error', error.response?.data?.message || 'Failed to delete announcement');
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTargetingControls();
  updateTargetingPreview();
  loadAnnouncements();
});