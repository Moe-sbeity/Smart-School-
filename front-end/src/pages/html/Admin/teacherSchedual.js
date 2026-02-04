// ============================================================================
// TEACHER SCHEDULE MANAGEMENT - Professional Version
// ============================================================================

const API_URL = 'http://localhost:5001/api';

// Auth setup
const getAuthToken = () => localStorage.getItem('token');

// Set up axios defaults
axios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Global State
let allTeachers = [];
let allSchedules = [];
let selectedTeacher = null;
let selectedTeacherSchedules = [];
let scheduleItemCount = 0;
let teacherSubjects = [];
let teacherCurrentGrades = [];
let availableGrades = [];
let availableSections = [];
let currentView = 'table';
let editingScheduleData = null;

// Schedule Settings (will be loaded from API)
let scheduleSettings = {
  sessionsPerDay: 7,
  sessionDuration: 50,
  breakDuration: 30,
  breakAfterSession: 4,
  dayStartTime: '08:00',
  timeSlots: []
};

// Time presets will be generated from settings
let timePresets = [];

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ============================================================================
// SCHEDULE SETTINGS FUNCTIONS
// ============================================================================

async function loadScheduleSettings() {
  try {
    const response = await axios.get(`${API_URL}/schedules/settings`);
    if (response.data.success) {
      scheduleSettings = response.data.settings;
      generateTimePresets();
      updateSettingsUI();
    }
  } catch (error) {
    console.error('Error loading schedule settings:', error);
    // Use defaults and generate presets
    generateTimePresetsFromDefaults();
  }
}

function generateTimePresets() {
  timePresets = [];
  const slots = scheduleSettings.timeSlots || [];
  
  slots.forEach((slot, index) => {
    if (!slot.isBreak) {
      timePresets.push({
        label: `Session ${slot.session} (${formatTime(slot.startTime)} - ${formatTime(slot.endTime)})`,
        start: slot.startTime,
        end: slot.endTime,
        session: slot.session
      });
    }
  });
}

function generateTimePresetsFromDefaults() {
  // Generate default 7 sessions with 50 min each, 30 min break after session 4
  timePresets = [];
  let currentMinutes = 8 * 60; // Start at 8:00 AM
  
  for (let i = 1; i <= 7; i++) {
    const startTime = formatMinutesToTime(currentMinutes);
    currentMinutes += 50;
    const endTime = formatMinutesToTime(currentMinutes);
    
    timePresets.push({
      label: `Session ${i} (${formatTime(startTime)} - ${formatTime(endTime)})`,
      start: startTime,
      end: endTime,
      session: i
    });
    
    // Add break after session 4
    if (i === 4) {
      currentMinutes += 30;
    }
  }
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function updateSettingsUI() {
  // Update settings form if it exists
  const sessionsInput = document.getElementById('settingsSessionsPerDay');
  const durationInput = document.getElementById('settingsSessionDuration');
  const breakDurationInput = document.getElementById('settingsBreakDuration');
  const breakAfterInput = document.getElementById('settingsBreakAfterSession');
  const startTimeInput = document.getElementById('settingsDayStartTime');
  
  if (sessionsInput) sessionsInput.value = scheduleSettings.sessionsPerDay;
  if (durationInput) durationInput.value = scheduleSettings.sessionDuration;
  if (breakDurationInput) breakDurationInput.value = scheduleSettings.breakDuration;
  if (breakAfterInput) breakAfterInput.value = scheduleSettings.breakAfterSession;
  if (startTimeInput) startTimeInput.value = scheduleSettings.dayStartTime;
  
  // Update the time slots preview
  updateTimeSlotsPreview();
}

function updateTimeSlotsPreview() {
  const previewContainer = document.getElementById('timeSlotsPreview');
  if (!previewContainer) return;
  
  const slots = scheduleSettings.timeSlots || [];
  
  if (slots.length === 0) {
    previewContainer.innerHTML = '<p class="text-muted">No time slots configured</p>';
    return;
  }
  
  let html = '<div class="time-slots-grid">';
  slots.forEach(slot => {
    if (slot.isBreak) {
      html += `
        <div class="time-slot-item break-slot">
          <i class="fas fa-coffee"></i>
          <span>Break</span>
          <small>${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</small>
        </div>
      `;
    } else {
      html += `
        <div class="time-slot-item session-slot">
          <span class="session-number">${slot.session}</span>
          <span>Session ${slot.session}</span>
          <small>${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</small>
        </div>
      `;
    }
  });
  html += '</div>';
  previewContainer.innerHTML = html;
}

async function saveScheduleSettings() {
  const sessionsPerDay = parseInt(document.getElementById('settingsSessionsPerDay').value);
  const sessionDuration = parseInt(document.getElementById('settingsSessionDuration').value);
  const breakDuration = parseInt(document.getElementById('settingsBreakDuration').value);
  const breakAfterSession = parseInt(document.getElementById('settingsBreakAfterSession').value);
  const dayStartTime = document.getElementById('settingsDayStartTime').value;
  
  // Validation
  if (breakAfterSession >= sessionsPerDay) {
    showAlert('error', 'Break must occur before the last session');
    return;
  }
  
  const saveBtn = document.getElementById('saveSettingsBtn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }
  
  try {
    const response = await axios.put(`${API_URL}/schedules/settings`, {
      sessionsPerDay,
      sessionDuration,
      breakDuration,
      breakAfterSession,
      dayStartTime
    });
    
    if (response.data.success) {
      scheduleSettings = response.data.settings;
      generateTimePresets();
      updateSettingsUI();
      showAlert('success', 'Schedule settings saved successfully!');
      closeSettingsModal();
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showAlert('error', error.response?.data?.message || 'Failed to save settings');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Settings';
    }
  }
}

async function resetScheduleSettings() {
  if (!confirm('Are you sure you want to reset to default settings? This will set:\n- 7 sessions per day\n- 50 minutes per session\n- 30 minute break after session 4\n- Start time: 8:00 AM')) {
    return;
  }
  
  try {
    const response = await axios.post(`${API_URL}/schedules/settings/reset`);
    if (response.data.success) {
      scheduleSettings = response.data.settings;
      generateTimePresets();
      updateSettingsUI();
      showAlert('success', 'Settings reset to defaults');
    }
  } catch (error) {
    console.error('Error resetting settings:', error);
    showAlert('error', 'Failed to reset settings');
  }
}

function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('active');
    updateSettingsUI();
    previewSettingsChange(); // Show initial preview
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Preview settings changes in real-time
function previewSettingsChange() {
  const sessionsPerDay = parseInt(document.getElementById('settingsSessionsPerDay')?.value) || 7;
  const sessionDuration = parseInt(document.getElementById('settingsSessionDuration')?.value) || 50;
  const breakDuration = parseInt(document.getElementById('settingsBreakDuration')?.value) || 30;
  const breakAfterSession = parseInt(document.getElementById('settingsBreakAfterSession')?.value) || 4;
  const dayStartTime = document.getElementById('settingsDayStartTime')?.value || '08:00';
  
  // Generate preview slots
  const previewSlots = [];
  const [startHour, startMinute] = dayStartTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMinute;
  
  for (let i = 1; i <= sessionsPerDay; i++) {
    const startTime = formatMinutesToTime(currentMinutes);
    currentMinutes += sessionDuration;
    const endTime = formatMinutesToTime(currentMinutes);
    
    previewSlots.push({
      session: i,
      startTime,
      endTime,
      isBreak: false
    });
    
    if (i === breakAfterSession && i < sessionsPerDay) {
      const breakStart = endTime;
      currentMinutes += breakDuration;
      const breakEnd = formatMinutesToTime(currentMinutes);
      previewSlots.push({
        session: 0,
        startTime: breakStart,
        endTime: breakEnd,
        isBreak: true
      });
    }
  }
  
  // Update preview
  const previewContainer = document.getElementById('timeSlotsPreview');
  if (!previewContainer) return;
  
  let html = '<div class="time-slots-grid">';
  previewSlots.forEach(slot => {
    if (slot.isBreak) {
      html += `
        <div class="time-slot-item break-slot">
          <i class="fas fa-coffee"></i>
          <span>Break (${breakDuration} min)</span>
          <small>${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</small>
        </div>
      `;
    } else {
      html += `
        <div class="time-slot-item session-slot">
          <span class="session-number">${slot.session}</span>
          <span>Session ${slot.session}</span>
          <small>${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}</small>
        </div>
      `;
    }
  });
  
  // Show end time
  const lastSlot = previewSlots[previewSlots.length - 1];
  if (lastSlot) {
    html += `<div class="day-end-time"><i class="fas fa-flag-checkered"></i> Day ends at ${formatTime(lastSlot.endTime)}</div>`;
  }
  
  html += '</div>';
  previewContainer.innerHTML = html;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showAlert(type, message) {
  const alertId = type === 'success' ? 'successAlert' : 'errorAlert';
  const messageId = type === 'success' ? 'successMessage' : 'errorMessage';
  
  const alert = document.getElementById(alertId);
  const messageEl = document.getElementById(messageId);
  
  messageEl.textContent = message;
  alert.style.display = 'flex';
  
  setTimeout(() => {
    alert.style.display = 'none';
  }, 5000);
}

function closeAlert(type) {
  const alertId = type === 'success' ? 'successAlert' : 'errorAlert';
  document.getElementById(alertId).style.display = 'none';
}

function formatClassGrade(grade) {
  if (!grade) return 'N/A';
  return grade.replace('grade', 'Grade ').replace('kg', 'KG ').toUpperCase();
}

function formatTime(time) {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    if (isNaN(hour)) return time;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch (e) {
    return time;
  }
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

async function loadTeachers() {
  try {
    const response = await axios.get(`${API_URL}/users/teachers`);
    allTeachers = response.data.teachers || [];
    
    console.log('Loaded teachers:', allTeachers.length);
    
    // Populate the create form dropdown
    const teacherSelect = document.getElementById('teacherId');
    if (teacherSelect) {
      teacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
      
      allTeachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher._id;
        option.textContent = teacher.name || 'Unknown Teacher';
        option.dataset.subjects = JSON.stringify(teacher.subjects || []);
        option.dataset.email = teacher.email || '';
        option.dataset.sub = teacher.email || 'No email'; // For searchable select subtitle
        teacherSelect.appendChild(option);
      });
    }

    document.getElementById('totalTeachers').textContent = allTeachers.length;
    
    // Refresh searchable select if it exists
    if (window.SearchableSelect && teacherSelect?.parentElement?.classList.contains('searchable-select-container')) {
      teacherSelect.parentElement.searchableSelect?.refresh();
    } else if (window.SearchableSelect && teacherSelect) {
      // Create searchable select for teacher dropdown
      window.SearchableSelect.create(teacherSelect);
    }
  } catch (error) {
    console.error('Error loading teachers:', error);
    showAlert('error', 'Failed to load teachers. Please refresh the page.');
  }
}

async function loadSubjects() {
  try {
    const response = await axios.get(`${API_URL}/users/subjects`);
    const subjects = response.data.subjects || [];
    document.getElementById('totalSubjects').textContent = subjects.length;
  } catch (error) {
    console.error('Error loading subjects:', error);
  }
}

async function loadAvailableGrades() {
  try {
    const response = await axios.get(`${API_URL}/classGrade/available-grades`);
    availableGrades = response.data.data || [];
    
    // Populate main form dropdown (if exists)
    const classGradeSelect = document.getElementById('classGrade');
    if (classGradeSelect) {
      classGradeSelect.innerHTML = '<option value="">-- Select Class Grade --</option>';
      
      availableGrades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = formatClassGrade(grade);
        classGradeSelect.appendChild(option);
      });
    }
    
    // Populate filter dropdown (if exists)
    const filterGrade = document.getElementById('filterGrade');
    if (filterGrade) {
      filterGrade.innerHTML = '<option value="">All Grades</option>';
      
      availableGrades.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = formatClassGrade(grade);
        filterGrade.appendChild(option);
      });
    }
    
    // Populate modal dropdowns
    populateGradeSelect('editClassGrade');
    populateGradeSelect('addClassGrade');
  } catch (error) {
    console.error('Error loading grades:', error);
  }
}

async function loadAvailableSections() {
  try {
    const response = await axios.get(`${API_URL}/classGrade/available-sections`);
    availableSections = response.data.data || [];
    
    const sectionSelect = document.getElementById('section');
    if (sectionSelect) {
      sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
      
      availableSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = `Section ${section}`;
        sectionSelect.appendChild(option);
      });
    }
    
    // Populate modal dropdowns
    populateSectionSelect('editSection');
    populateSectionSelect('addSection');
  } catch (error) {
    console.error('Error loading sections:', error);
  }
}

function populateGradeSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Select Grade --</option>';
  availableGrades.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatClassGrade(grade);
    select.appendChild(option);
  });
}

function populateSectionSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Select Section --</option>';
  availableSections.forEach(section => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = `Section ${section}`;
    select.appendChild(option);
  });
}

async function loadAllSchedules() {
  try {
    const response = await axios.get(`${API_URL}/schedules/all`);
    allSchedules = response.data.schedules || [];
    
    document.getElementById('totalSchedules').textContent = allSchedules.length;
    renderAllSchedules(allSchedules);
  } catch (error) {
    console.error('Error loading schedules:', error);
    document.getElementById('allSchedulesContainer').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error Loading Schedules</h3>
        <p>${error.response?.data?.message || 'Please try again later'}</p>
      </div>
    `;
  }
}

// ============================================================================
// SEARCH FUNCTIONALITY
// ============================================================================

function setupSearch() {
  const searchInput = document.getElementById('teacherSearch');
  const searchResults = document.getElementById('searchResults');
  const clearSearch = document.getElementById('clearSearch');
  
  if (!searchInput || !searchResults) {
    console.error('Search elements not found!');
    return;
  }
  
  console.log('Search setup complete, teachers loaded:', allTeachers.length);
  
  let searchTimeout;
  
  // Show all teachers on focus
  searchInput.addEventListener('focus', () => {
    console.log('Search focused, teachers count:', allTeachers.length);
    if (allTeachers.length > 0) {
      // Always show ALL teachers when focused and input is empty
      renderSearchResults(
        searchInput.value.trim().length === 0
          ? allTeachers
          : filterTeachers(searchInput.value.trim().toLowerCase())
      );
    } else {
      searchResults.innerHTML = `
        <div class="no-results">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading teachers...</p>
        </div>
      `;
      searchResults.style.display = 'block';
    }
  });
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    clearTimeout(searchTimeout);
    if (query.length === 0) {
      // Show ALL teachers when search is empty
      if (allTeachers.length > 0) {
        renderSearchResults(allTeachers);
        clearSearch.style.display = 'none';
      } else {
        searchResults.style.display = 'none';
        clearSearch.style.display = 'none';
      }
      return;
    }
    clearSearch.style.display = 'block';
    searchTimeout = setTimeout(() => {
      const results = filterTeachers(query);
      console.log('Search results for "' + query + '":', results.length);
      renderSearchResults(results);
    }, 150);
  });
  
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    searchResults.style.display = 'none';
    clearSearch.style.display = 'none';
  });
  
  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrapper')) {
      searchResults.style.display = 'none';
    }
  });
}

function filterTeachers(query) {
  return allTeachers.filter(teacher => {
    const nameMatch = teacher.name?.toLowerCase().includes(query);
    const emailMatch = teacher.email?.toLowerCase().includes(query);
    const subjectMatch = teacher.subjects?.some(s => s.toLowerCase().includes(query));
    return nameMatch || emailMatch || subjectMatch;
  });
}

function renderSearchResults(results) {
  const container = document.getElementById('searchResults');
  
  if (!container) return;
  
  if (results.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <p>No teachers found</p>
      </div>
    `;
    container.style.display = 'block';
    return;
  }
  
  // Debug: log teacher objects
  console.log('Rendering teacher search results:', results.length);
  const maxToShow = 8;
  const shown = results.slice(0, maxToShow);
  
  let html = shown.map(teacher => {
    const displayName = teacher.name || 'No Name';
    const email = teacher.email || 'No email';
    const subjects = teacher.subjects || [];
    
    return `
      <div class="search-result-item" onclick="selectTeacher('${teacher._id}')">
        <div class="search-result-avatar">${getInitials(displayName)}</div>
        <div class="search-result-info">
          <h4>${displayName}</h4>
          <p>${email}</p>
          <div class="search-result-subjects">
            ${subjects.slice(0, 3).map(s => 
              `<span class="subject-badge">${s}</span>`
            ).join('')}
            ${subjects.length > 3 ? `<span class="subject-badge">+${subjects.length - 3}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (results.length > maxToShow) {
    html += `<div class="search-result-item" style="justify-content:center; color:#888; font-size:13px; cursor:default; pointer-events:none;">+${results.length - maxToShow} more teachers...</div>`;
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

async function selectTeacher(teacherId) {
  const teacher = allTeachers.find(t => t._id === teacherId);
  if (!teacher) {
    showAlert('error', 'Teacher not found');
    return;
  }
  
  selectedTeacher = teacher;
  
  // Hide search results
  const searchResults = document.getElementById('searchResults');
  const teacherSearch = document.getElementById('teacherSearch');
  const clearSearch = document.getElementById('clearSearch');
  
  if (searchResults) searchResults.style.display = 'none';
  if (teacherSearch) teacherSearch.value = '';
  if (clearSearch) clearSearch.style.display = 'none';
  
  // Show selected teacher section
  const section = document.getElementById('selectedTeacherSection');
  if (section) section.style.display = 'block';
  
  // Update teacher info with null checks
  const avatarEl = document.getElementById('teacherAvatar');
  const nameEl = document.getElementById('selectedTeacherName');
  const emailEl = document.getElementById('selectedTeacherEmail');
  const scheduleNameEl = document.getElementById('scheduleTeacherName');
  
  if (avatarEl) avatarEl.innerHTML = `<span>${getInitials(teacher.name)}</span>`;
  if (nameEl) nameEl.textContent = teacher.name || 'Unknown Teacher';
  if (emailEl) emailEl.textContent = teacher.email || 'No email provided';
  if (scheduleNameEl) scheduleNameEl.textContent = teacher.name || 'Unknown Teacher';
  
  // Display subjects
  const subjectsContainer = document.getElementById('selectedTeacherSubjects');
  if (subjectsContainer) {
    if (teacher.subjects && teacher.subjects.length > 0) {
      subjectsContainer.innerHTML = teacher.subjects.map(s => 
        `<span class="subject-badge">${s}</span>`
      ).join('');
    } else {
      subjectsContainer.innerHTML = '<span style="color: #999; font-size: 13px;">No subjects assigned</span>';
    }
  }
  
  // Load teacher's schedules
  await loadTeacherSchedules(teacherId);
}

async function loadTeacherSchedules(teacherId) {
  const container = document.getElementById('teacherScheduleContainer');
  
  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Loading schedule...</span>
    </div>
  `;
  
  try {
    const response = await axios.get(`${API_URL}/schedules/teacher/${teacherId}`);
    
    // The API returns schedules grouped by day, convert to flat array
    const schedulesGrouped = response.data.schedules || {};
    const flatSchedules = [];
    
    // Convert grouped object to flat array with day info
    Object.keys(schedulesGrouped).forEach(dayOfWeek => {
      const daySchedules = schedulesGrouped[dayOfWeek] || [];
      daySchedules.forEach(schedule => {
        flatSchedules.push({
          ...schedule,
          dayOfWeek: dayOfWeek
        });
      });
    });
    
    selectedTeacherSchedules = flatSchedules;
    console.log('Loaded teacher schedules:', flatSchedules.length, flatSchedules);
    
    renderTeacherSchedule();
  } catch (error) {
    console.error('Error loading teacher schedules:', error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>No Schedule Found</h3>
        <p>This teacher has no scheduled classes yet.</p>
      </div>
    `;
    selectedTeacherSchedules = [];
  }
}

function clearSelectedTeacher() {
  selectedTeacher = null;
  selectedTeacherSchedules = [];
  document.getElementById('selectedTeacherSection').style.display = 'none';
}

// ============================================================================
// SCHEDULE RENDERING
// ============================================================================

function renderTeacherSchedule() {
  const container = document.getElementById('teacherScheduleContainer');
  
  if (!selectedTeacherSchedules || selectedTeacherSchedules.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>No Schedule Found</h3>
        <p>This teacher has no scheduled classes yet. Click "Add Schedule" to create one.</p>
      </div>
    `;
    return;
  }
  
  console.log('Rendering schedules:', selectedTeacherSchedules.length);
  
  if (currentView === 'table') {
    renderTableView(container, selectedTeacherSchedules);
  } else {
    renderCalendarView(container, selectedTeacherSchedules);
  }
}

function renderTableView(container, schedules) {
  // Sort by day and time
  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
  
  container.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Class</th>
          <th>Section</th>
          <th>Day</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(schedule => `
          <tr>
            <td><strong>${schedule.subject}</strong></td>
            <td><span class="tag">${formatClassGrade(schedule.classGrade)}</span></td>
            <td><span class="tag tag-primary">Section ${schedule.classSection || 'N/A'}</span></td>
            <td><span class="tag tag-${schedule.dayOfWeek.toLowerCase()}">${schedule.dayOfWeek}</span></td>
            <td>${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</td>
            <td class="actions">
              <button class="btn btn-primary btn-icon" onclick="openEditModal('${schedule._id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-icon" onclick="openDeleteModal('${schedule._id}')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderCalendarView(container, schedules) {
  const schedulesByDay = {};
  dayOrder.forEach(day => schedulesByDay[day] = []);
  
  schedules.forEach(schedule => {
    if (schedulesByDay[schedule.dayOfWeek]) {
      schedulesByDay[schedule.dayOfWeek].push(schedule);
    }
  });
  
  // Sort each day's schedules by time
  Object.keys(schedulesByDay).forEach(day => {
    schedulesByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });
  
  container.innerHTML = `
    <div class="calendar-view">
      ${dayOrder.map(day => `
        <div class="calendar-day">
          <div class="calendar-day-header ${day.toLowerCase()}">${day}</div>
          <div class="calendar-day-content">
            ${schedulesByDay[day].length === 0 
              ? '<p style="color: #999; font-size: 12px; text-align: center; padding: 20px;">No classes</p>'
              : schedulesByDay[day].map(schedule => `
                <div class="calendar-item" onclick="openEditModal('${schedule._id}')">
                  <div class="calendar-item-subject">${schedule.subject}</div>
                  <div class="calendar-item-time">
                    <i class="fas fa-clock"></i>
                    ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}
                  </div>
                  <div class="calendar-item-class">
                    ${formatClassGrade(schedule.classGrade)} - Section ${schedule.classSection || 'N/A'}
                  </div>
                </div>
              `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function switchView(view) {
  currentView = view;
  
  // Update active button
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  
  renderTeacherSchedule();
}

// ============================================================================
// ALL SCHEDULES RENDERING
// ============================================================================

function renderAllSchedules(schedules) {
  const container = document.getElementById('allSchedulesContainer');
  
  if (schedules.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>No Schedules Yet</h3>
        <p>Create your first teacher schedule using the form above</p>
      </div>
    `;
    return;
  }
  
  // Sort schedules
  const sorted = [...schedules].sort((a, b) => {
    const teacherA = a.teacher?.name || '';
    const teacherB = b.teacher?.name || '';
    return teacherA.localeCompare(teacherB);
  });
  
  container.innerHTML = `
    <table class="schedule-table">
      <thead>
        <tr>
          <th>Teacher</th>
          <th>Subject</th>
          <th>Class</th>
          <th>Section</th>
          <th>Day</th>
          <th>Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(schedule => `
          <tr data-day="${schedule.dayOfWeek}" data-grade="${schedule.classGrade}">
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div class="search-result-avatar" style="width: 35px; height: 35px; font-size: 12px;">
                  ${getInitials(schedule.teacher?.name)}
                </div>
                <span>${schedule.teacher?.name || 'N/A'}</span>
              </div>
            </td>
            <td><strong>${schedule.subject}</strong></td>
            <td><span class="tag">${formatClassGrade(schedule.classGrade)}</span></td>
            <td><span class="tag tag-primary">Section ${schedule.classSection || 'N/A'}</span></td>
            <td><span class="tag tag-${schedule.dayOfWeek.toLowerCase()}">${schedule.dayOfWeek}</span></td>
            <td>${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</td>
            <td class="actions">
              <button class="btn btn-primary btn-icon" onclick="openEditModalFromAll('${schedule._id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-danger btn-icon" onclick="openDeleteModal('${schedule._id}')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function filterSchedules() {
  const dayFilter = document.getElementById('filterDay').value;
  const gradeFilter = document.getElementById('filterGrade').value;
  
  let filtered = [...allSchedules];
  
  if (dayFilter) {
    filtered = filtered.filter(s => s.dayOfWeek === dayFilter);
  }
  
  if (gradeFilter) {
    filtered = filtered.filter(s => s.classGrade === gradeFilter);
  }
  
  renderAllSchedules(filtered);
}

// ============================================================================
// CREATE SCHEDULE FORM
// ============================================================================

function toggleCreateSection() {
  const body = document.getElementById('createScheduleBody');
  const icon = document.getElementById('createToggleIcon');
  
  if (body.style.display === 'none') {
    body.style.display = 'block';
    icon.classList.remove('rotated');
  } else {
    body.style.display = 'none';
    icon.classList.add('rotated');
  }
}

function setupCreateForm() {
  const teacherSelect = document.getElementById('teacherId');
  const addBtn = document.getElementById('addScheduleBtn');
  
  // Return early if required elements don't exist
  if (!teacherSelect || !addBtn) {
    console.log('Create form elements not found - form may not be present on this page');
    return;
  }
  
  teacherSelect.addEventListener('change', async function() {
    const selectedOption = this.options[this.selectedIndex];
    const teacherInfoDiv = document.getElementById('teacherInfo');
    const scheduleBuilderEl = document.getElementById('scheduleBuilder');
    
    if (!selectedOption.value) {
      addBtn.disabled = true;
      teacherSubjects = [];
      teacherCurrentGrades = [];
      if (teacherInfoDiv) teacherInfoDiv.innerHTML = '';
      if (scheduleBuilderEl) scheduleBuilderEl.innerHTML = '';
      scheduleItemCount = 0;
      return;
    }
    
    const teacherId = selectedOption.value;
    teacherSubjects = JSON.parse(selectedOption.dataset.subjects || '[]');
    
    // Fetch teacher's current grade/section assignments
    try {
      const response = await axios.get(`${API_URL}/classGrade/teacher-grade/${teacherId}`);
      teacherCurrentGrades = response.data.data || [];
      
      if (teacherInfoDiv) teacherInfoDiv.innerHTML = '';
      
      if (teacherCurrentGrades.length > 0) {
        const gradesHtml = teacherCurrentGrades.map(grade => 
          `<span class="subject-badge grade-badge">
            ${formatClassGrade(grade.classGrade)} - Section ${grade.classSection}
          </span>`
        ).join('');
        
        if (teacherInfoDiv) teacherInfoDiv.innerHTML += `
          <div class="info-box info-box-success">
            <i class="fas fa-info-circle"></i> 
            <strong>Currently teaching:</strong>
            <div class="info-badges">${gradesHtml}</div>
            <small><i class="fas fa-lightbulb"></i> You can add schedules for new grades.</small>
          </div>
        `;
      } else {
        if (teacherInfoDiv) teacherInfoDiv.innerHTML += `
          <div class="info-box info-box-warning">
            <i class="fas fa-info-circle"></i> This teacher has no grade/section assignments yet.
          </div>
        `;
      }
    } catch (error) {
      teacherCurrentGrades = [];
    }
    
    // Display teacher's subjects
    if (teacherSubjects.length > 0) {
      const subjectsHtml = teacherSubjects.map(subject => 
        `<span class="subject-badge">${subject}</span>`
      ).join('');
      
      if (teacherInfoDiv) teacherInfoDiv.innerHTML += `
        <div class="info-section">
          <strong>Subjects:</strong>
          <div class="info-badges">${subjectsHtml}</div>
        </div>
      `;
    } else {
      if (teacherInfoDiv) teacherInfoDiv.innerHTML += '<div class="info-section"><span class="text-muted">No subjects assigned</span></div>';
    }
    
    if (addBtn) addBtn.disabled = teacherSubjects.length === 0;
    
    const scheduleBuilder = document.getElementById('scheduleBuilder');
    if (scheduleBuilder) {
      scheduleBuilder.innerHTML = '';
      scheduleItemCount = 0;
      if (teacherSubjects.length > 0) {
        addScheduleItem();
      }
    }
  });
  
  if (addBtn) {
    addBtn.addEventListener('click', addScheduleItem);
  }
  
  const scheduleForm = document.getElementById('scheduleForm');
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', handleCreateSchedule);
    
    scheduleForm.addEventListener('reset', () => {
      setTimeout(() => {
        const teacherInfo = document.getElementById('teacherInfo');
        const scheduleBuilder = document.getElementById('scheduleBuilder');
        if (teacherInfo) teacherInfo.innerHTML = '';
        if (scheduleBuilder) scheduleBuilder.innerHTML = '';
        scheduleItemCount = 0;
        if (addBtn) addBtn.disabled = true;
        teacherSubjects = [];
        teacherCurrentGrades = [];
      }, 0);
    });
  }
}

function addScheduleItem() {
  scheduleItemCount++;
  const scheduleBuilder = document.getElementById('scheduleBuilder');
  
  const scheduleItem = document.createElement('div');
  scheduleItem.className = 'schedule-item';
  scheduleItem.dataset.index = scheduleItemCount;
  
  const subjectOptions = teacherSubjects.map(subject => 
    `<option value="${subject}">${subject}</option>`
  ).join('');
  
  scheduleItem.innerHTML = `
    <div class="schedule-item-header">
      <div class="schedule-item-header-left">
        <div class="schedule-item-number">${scheduleItemCount}</div>
        <h4>Schedule ${scheduleItemCount}</h4>
      </div>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeScheduleItem(${scheduleItemCount})">
        <i class="fas fa-trash"></i> Remove
      </button>
    </div>
    
    <div class="schedule-item-grid">
      <div class="form-group">
        <label>Subject *</label>
        <select name="subject" required>
          <option value="">-- Select Subject --</option>
          ${subjectOptions}
        </select>
      </div>
      
      <div class="form-group">
        <label>Day of Week *</label>
        <select name="dayOfWeek" required>
          <option value="">-- Select Day --</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Start Time *</label>
        <input type="time" name="startTime" required>
      </div>
      
      <div class="form-group">
        <label>End Time *</label>
        <input type="time" name="endTime" required>
      </div>
    </div>
    
    <div class="schedule-time-presets">
      ${timePresets.map(preset => 
        `<button type="button" class="time-preset-btn" onclick="setTimeRange(${scheduleItemCount}, '${preset.start}', '${preset.end}')">${preset.label}</button>`
      ).join('')}
    </div>
  `;
  
  scheduleBuilder.appendChild(scheduleItem);
}

function removeScheduleItem(index) {
  const item = document.querySelector(`.schedule-item[data-index="${index}"]`);
  if (item) {
    item.remove();
  }
}

function setTime(scheduleIndex, type, time) {
  const item = document.querySelector(`.schedule-item[data-index="${scheduleIndex}"]`);
  if (item) {
    const input = item.querySelector(`input[name="${type}Time"]`);
    if (input) input.value = time;
  }
}

function setTimeRange(scheduleIndex, startTime, endTime) {
  const item = document.querySelector(`.schedule-item[data-index="${scheduleIndex}"]`);
  if (item) {
    const startInput = item.querySelector('input[name="startTime"]');
    const endInput = item.querySelector('input[name="endTime"]');
    if (startInput) startInput.value = startTime;
    if (endInput) endInput.value = endTime;
  }
}

async function handleCreateSchedule(e) {
  e.preventDefault();
  
  const teacherId = document.getElementById('teacherId').value;
  const classGrade = document.getElementById('classGrade').value;
  const section = document.getElementById('section').value;
  
  if (!classGrade || !section) {
    showAlert('error', 'Please select both class grade and section');
    return;
  }
  
  const scheduleItems = document.querySelectorAll('.schedule-item');
  
  if (scheduleItems.length === 0) {
    showAlert('error', 'Please add at least one subject schedule');
    return;
  }
  
  const schedules = [];
  
  for (const item of scheduleItems) {
    const subject = item.querySelector('[name="subject"]').value;
    const dayOfWeek = item.querySelector('[name="dayOfWeek"]').value;
    const startTime = item.querySelector('[name="startTime"]').value;
    const endTime = item.querySelector('[name="endTime"]').value;
    
    if (!subject || !dayOfWeek || !startTime || !endTime) {
      showAlert('error', 'Please fill all fields in each schedule');
      return;
    }
    
    schedules.push({
      teacherId,
      subject,
      dayOfWeek,
      startTime,
      endTime,
      classGrade,
      classSection: section
    });
  }
  
  const submitBtn = document.querySelector('#scheduleForm button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
  
  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const schedule of schedules) {
      try {
        await axios.post(`${API_URL}/schedules/teacher`, schedule);
        successCount++;
      } catch (error) {
        console.error('Error creating schedule:', error);
        errorCount++;
        const errorMsg = error.response?.data?.message || 'Unknown error';
        errors.push(`${schedule.subject} (${schedule.dayOfWeek}): ${errorMsg}`);
      }
    }
    
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    
    if (successCount > 0) {
      showAlert('success', `Successfully created ${successCount} schedule(s)!`);
      document.getElementById('scheduleForm').reset();
      document.getElementById('scheduleBuilder').innerHTML = '';
      document.getElementById('teacherInfo').innerHTML = '';
      scheduleItemCount = 0;
      document.getElementById('addScheduleBtn').disabled = true;
      teacherCurrentGrades = [];
      
      // Refresh schedules
      await loadAllSchedules();
      
      // Refresh selected teacher's schedule if they're selected
      if (selectedTeacher && selectedTeacher._id === teacherId) {
        await loadTeacherSchedules(teacherId);
      }
    }
    
    if (errorCount > 0) {
      const errorDetails = errors.length > 0 ? '\n' + errors.join('\n') : '';
      showAlert('error', `Failed to create ${errorCount} schedule(s). ${errorDetails}`);
    }
  } catch (error) {
    console.error('Error creating schedules:', error);
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    showAlert('error', 'Failed to create schedules: ' + (error.message || 'Unknown error'));
  }
}

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

// Edit Modal
function openEditModal(scheduleId) {
  const schedule = selectedTeacherSchedules.find(s => s._id === scheduleId);
  if (!schedule) {
    showAlert('error', 'Schedule not found');
    return;
  }
  
  editingScheduleData = schedule;
  
  document.getElementById('editScheduleId').value = schedule._id;
  document.getElementById('editTeacherName').value = selectedTeacher?.name || schedule.teacher?.name || 'Unknown Teacher';
  document.getElementById('editDayOfWeek').value = schedule.dayOfWeek || '';
  document.getElementById('editStartTime').value = schedule.startTime || '';
  document.getElementById('editEndTime').value = schedule.endTime || '';
  
  // Populate grades dropdown
  const gradeSelect = document.getElementById('editClassGrade');
  gradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
  availableGrades.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatClassGrade(grade);
    if (grade === schedule.classGrade) option.selected = true;
    gradeSelect.appendChild(option);
  });
  
  // Populate sections dropdown
  const sectionSelect = document.getElementById('editSection');
  sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
  availableSections.forEach(section => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = `Section ${section}`;
    if (section === schedule.classSection) option.selected = true;
    sectionSelect.appendChild(option);
  });
  
  // Populate subjects dropdown
  const subjectSelect = document.getElementById('editSubject');
  const teacherSubjectsForEdit = selectedTeacher?.subjects || schedule.teacher?.subjects || [];
  
  subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
  teacherSubjectsForEdit.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    if (subject === schedule.subject) option.selected = true;
    subjectSelect.appendChild(option);
  });
  
  document.getElementById('editModal').classList.add('active');
}

function openEditModalFromAll(scheduleId) {
  const schedule = allSchedules.find(s => s._id === scheduleId);
  if (!schedule) {
    showAlert('error', 'Schedule not found');
    return;
  }
  
  editingScheduleData = schedule;
  
  document.getElementById('editScheduleId').value = schedule._id;
  document.getElementById('editTeacherName').value = schedule.teacher?.name || 'Unknown Teacher';
  document.getElementById('editDayOfWeek').value = schedule.dayOfWeek || '';
  document.getElementById('editStartTime').value = schedule.startTime || '';
  document.getElementById('editEndTime').value = schedule.endTime || '';
  
  // Populate grades dropdown
  const gradeSelect = document.getElementById('editClassGrade');
  gradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
  availableGrades.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatClassGrade(grade);
    if (grade === schedule.classGrade) option.selected = true;
    gradeSelect.appendChild(option);
  });
  
  // Populate sections dropdown
  const sectionSelect = document.getElementById('editSection');
  sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
  availableSections.forEach(section => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = `Section ${section}`;
    if (section === schedule.classSection) option.selected = true;
    sectionSelect.appendChild(option);
  });
  
  // Populate subjects dropdown
  const subjectSelect = document.getElementById('editSubject');
  const teacherSubjectsForEdit = schedule.teacher?.subjects || [];
  
  subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
  teacherSubjectsForEdit.forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    if (subject === schedule.subject) option.selected = true;
    subjectSelect.appendChild(option);
  });
  
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  editingScheduleData = null;
}

function setEditTimeRange(start, end) {
  document.getElementById('editStartTime').value = start;
  document.getElementById('editEndTime').value = end;
}

async function saveEditSchedule() {
  const scheduleId = document.getElementById('editScheduleId').value;
  const subject = document.getElementById('editSubject').value;
  const dayOfWeek = document.getElementById('editDayOfWeek').value;
  const startTime = document.getElementById('editStartTime').value;
  const endTime = document.getElementById('editEndTime').value;
  const classGrade = document.getElementById('editClassGrade').value;
  const classSection = document.getElementById('editSection').value;
  
  if (!subject || !dayOfWeek || !startTime || !endTime || !classGrade || !classSection) {
    showAlert('error', 'Please fill all required fields');
    return;
  }
  
  // Validate time range
  if (startTime >= endTime) {
    showAlert('error', 'End time must be after start time');
    return;
  }
  
  // Get the save button and show loading state
  const saveBtn = document.querySelector('#editModal .btn-primary');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  
  try {
    await axios.put(`${API_URL}/schedules/${scheduleId}`, {
      subject,
      dayOfWeek,
      startTime,
      endTime,
      classGrade,
      classSection
    });
    
    showAlert('success', 'Schedule updated successfully!');
    closeEditModal();
    
    // Refresh data
    await loadAllSchedules();
    if (selectedTeacher) {
      await loadTeacherSchedules(selectedTeacher._id);
    }
  } catch (error) {
    console.error('Error updating schedule:', error);
    showAlert('error', error.response?.data?.message || 'Failed to update schedule');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// Add Modal
function openAddScheduleModal() {
  if (!selectedTeacher) {
    showAlert('error', 'Please select a teacher first');
    return;
  }
  
  document.getElementById('addTeacherId').value = selectedTeacher._id;
  document.getElementById('addTeacherName').value = selectedTeacher.name || 'Unknown Teacher';
  
  // Populate subjects
  const subjectSelect = document.getElementById('addSubject');
  subjectSelect.innerHTML = '<option value="">-- Select Subject --</option>';
  (selectedTeacher.subjects || []).forEach(subject => {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    subjectSelect.appendChild(option);
  });
  
  // Populate grades
  const gradeSelect = document.getElementById('addClassGrade');
  gradeSelect.innerHTML = '<option value="">-- Select Grade --</option>';
  availableGrades.forEach(grade => {
    const option = document.createElement('option');
    option.value = grade;
    option.textContent = formatClassGrade(grade);
    gradeSelect.appendChild(option);
  });
  
  // Populate sections
  const sectionSelect = document.getElementById('addSection');
  sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
  availableSections.forEach(section => {
    const option = document.createElement('option');
    option.value = section;
    option.textContent = `Section ${section}`;
    sectionSelect.appendChild(option);
  });
  
  // Reset other fields
  document.getElementById('addDayOfWeek').value = '';
  document.getElementById('addStartTime').value = '';
  document.getElementById('addEndTime').value = '';
  
  // Populate session presets
  populateSessionPresets();
  
  document.getElementById('addModal').classList.add('active');
}

// Populate session presets from schedule settings
function populateSessionPresets() {
  const container = document.getElementById('sessionPresetsContainer');
  if (!container) return;
  
  let html = '';
  timePresets.forEach(preset => {
    html += `
      <button type="button" class="session-preset-btn" onclick="setAddTimeRange('${preset.start}', '${preset.end}')">
        <span class="session-num">S${preset.session}</span>
        <span class="session-time">${formatTime(preset.start)} - ${formatTime(preset.end)}</span>
      </button>
    `;
  });
  
  container.innerHTML = html;
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('active');
}

function setAddTimeRange(start, end) {
  document.getElementById('addStartTime').value = start;
  document.getElementById('addEndTime').value = end;
}

async function saveNewSchedule() {
  const teacherId = document.getElementById('addTeacherId').value;
  const subject = document.getElementById('addSubject').value;
  const dayOfWeek = document.getElementById('addDayOfWeek').value;
  const startTime = document.getElementById('addStartTime').value;
  const endTime = document.getElementById('addEndTime').value;
  const classGrade = document.getElementById('addClassGrade').value;
  const classSection = document.getElementById('addSection').value;
  
  // Validate all fields
  if (!subject || !dayOfWeek || !startTime || !endTime || !classGrade || !classSection) {
    showAlert('error', 'Please fill all required fields');
    return;
  }
  
  // Validate time range
  if (startTime >= endTime) {
    showAlert('error', 'End time must be after start time');
    return;
  }
  
  // Get the save button and show loading state
  const saveBtn = document.querySelector('#addModal .btn-primary');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
  
  try {
    await axios.post(`${API_URL}/schedules/teacher`, {
      teacherId,
      subject,
      dayOfWeek,
      startTime,
      endTime,
      classGrade,
      classSection
    });
    
    showAlert('success', 'Schedule added successfully!');
    closeAddModal();
    
    // Refresh data
    await loadAllSchedules();
    if (selectedTeacher && selectedTeacher._id === teacherId) {
      await loadTeacherSchedules(teacherId);
    }
  } catch (error) {
    console.error('Error adding schedule:', error);
    showAlert('error', error.response?.data?.message || 'Failed to add schedule');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// Delete Modal
let scheduleToDelete = null;

function openDeleteModal(scheduleId) {
  // Find in both arrays
  const schedule = selectedTeacherSchedules.find(s => s._id === scheduleId) 
                || allSchedules.find(s => s._id === scheduleId);
  
  if (!schedule) return;
  
  scheduleToDelete = schedule;
  
  document.getElementById('deleteDetails').innerHTML = `
    <p><strong>Subject:</strong> ${schedule.subject}</p>
    <p><strong>Day:</strong> ${schedule.dayOfWeek}</p>
    <p><strong>Time:</strong> ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</p>
    <p><strong>Class:</strong> ${formatClassGrade(schedule.classGrade)} - Section ${schedule.classSection}</p>
  `;
  
  document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('active');
  scheduleToDelete = null;
}

async function confirmDelete() {
  if (!scheduleToDelete) return;
  
  // Get the delete button and show loading state
  const deleteBtn = document.getElementById('confirmDeleteBtn');
  const originalText = deleteBtn.innerHTML;
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  
  try {
    await axios.delete(`${API_URL}/schedules/${scheduleToDelete._id}`);
    
    showAlert('success', 'Schedule deleted successfully!');
    closeDeleteModal();
    
    // Refresh data
    await loadAllSchedules();
    if (selectedTeacher) {
      await loadTeacherSchedules(selectedTeacher._id);
    }
  } catch (error) {
    console.error('Error deleting schedule:', error);
    showAlert('error', error.response?.data?.message || 'Failed to delete schedule');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = originalText;
  }
}

// ============================================================================
// GLOBAL FUNCTIONS
// ============================================================================

window.selectTeacher = selectTeacher;
window.clearSelectedTeacher = clearSelectedTeacher;
window.switchView = switchView;
window.toggleCreateSection = toggleCreateSection;
window.removeScheduleItem = removeScheduleItem;
window.setTime = setTime;
window.setTimeRange = setTimeRange;
window.filterSchedules = filterSchedules;
window.openEditModal = openEditModal;
window.openEditModalFromAll = openEditModalFromAll;
window.closeEditModal = closeEditModal;
window.setEditTimeRange = setEditTimeRange;
window.saveEditSchedule = saveEditSchedule;
window.openAddScheduleModal = openAddScheduleModal;
window.closeAddModal = closeAddModal;
window.setAddTimeRange = setAddTimeRange;
window.saveNewSchedule = saveNewSchedule;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.closeAlert = closeAlert;

// Schedule Settings functions
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveScheduleSettings = saveScheduleSettings;
window.resetScheduleSettings = resetScheduleSettings;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing Teacher Schedule Management...');
  
  try {
    // Load schedule settings first (needed for time presets)
    await loadScheduleSettings();
    
    // Load all data in parallel for better performance
    await Promise.all([
      loadTeachers(),
      loadSubjects(),
      loadAvailableGrades(),
      loadAvailableSections(),
      loadAllSchedules()
    ]);
    
    console.log('All data loaded successfully');
    console.log('Teachers:', allTeachers.length);
    console.log('Grades:', availableGrades.length);
    console.log('Sections:', availableSections.length);
    console.log('Schedules:', allSchedules.length);
  } catch (error) {
    console.error('Error initializing data:', error);
    showAlert('error', 'Failed to load some data. Please refresh the page.');
  }
  
  // Setup search
  setupSearch();
  
  // Setup create form
  setupCreateForm();
  
  // Setup delete confirmation button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', confirmDelete);
  }
  
  // Setup settings modal event listeners
  setupSettingsModal();
  
  // Close modals on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeAddModal();
      closeDeleteModal();
      closeSettingsModal();
    }
  });
  
  // Prevent form submission on enter in modals
  document.querySelectorAll('.modal form').forEach(form => {
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    });
  });
});

// Setup settings modal event listeners
function setupSettingsModal() {
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveScheduleSettings();
    });
  }
  
  // Add change listeners for real-time preview
  const settingsInputs = ['settingsSessionsPerDay', 'settingsSessionDuration', 'settingsBreakDuration', 'settingsBreakAfterSession', 'settingsDayStartTime'];
  settingsInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('change', previewSettingsChange);
      input.addEventListener('input', previewSettingsChange);
    }
  });
}