/**
 * Admin Registration Form Handler
 * Manages user registration with role-based fields and subject selection for teachers
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_URL = "http://localhost:5001/api/users";

const FALLBACK_SUBJECTS = [
  'Math', 'Science', 'English', 'History', 
  'Geography', 'Physics', 'Chemistry', 'Biology',
  'Computer Science', 'Art', 'Music', 'Physical Education'
];

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const form = document.getElementById("adminRegisterForm");
const roleSelect = document.getElementById("role");
const subjectsContainer = document.getElementById("subjectsContainer");
const parentEmailContainer = document.getElementById("parentEmailContainer");
const classGradeContainer = document.getElementById("classGradeContainer");
const parentEmailInput = document.getElementById("parentEmail");
const classGradeSelect = document.getElementById("classGrade");
const classSectionSelect = document.getElementById("classSection");
const subjectsSection = document.getElementById("subjectsSection");
const submitBtn = document.getElementById("submitBtn");
const selectedSubjectsDisplay = document.getElementById("selectedSubjectsDisplay");
const emailContainer = document.getElementById("emailContainer");
const studentEmailContainer = document.getElementById("studentEmailContainer");
const emailInput = document.getElementById("email");
const studentEmailInput = document.getElementById("studentEmail");

// =============================================================================
// STATE
// =============================================================================

let subjects = [];
let nextStudentEmail = null;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get authentication token from localStorage
 * @returns {string|null} The auth token or null if not found
 */
function getAuthToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken');
}

/**
 * Display alert message to user using Toast
 * @param {string} type - Message type ('success' or 'error')
 * @param {string} text - Message text to display
 */
function showMessage(type, text) {
  if (typeof Toast !== 'undefined') {
    if (type === 'success') {
      Toast.success(text);
    } else if (type === 'error') {
      Toast.error(text);
    } else {
      Toast.info(text);
    }
  } else {
    console.log(`[${type.toUpperCase()}]: ${text}`);
  }
}

/**
 * Update the display of selected subjects
 */
function updateSelectedDisplay() {
  const selected = Array.from(subjectsSection.querySelectorAll("input:checked"))
    .map(cb => cb.value);
  
  if (selected.length > 0) {
    selectedSubjectsDisplay.textContent = `Selected: ${selected.join(', ')}`;
    selectedSubjectsDisplay.style.display = 'block';
  } else {
    selectedSubjectsDisplay.style.display = 'none';
  }
}

/**
 * Render subjects as checkboxes in the UI
 * @param {Array<string>} subjectsList - List of subject names
 */
function renderSubjects(subjectsList) {
  subjectsSection.classList.remove('loading');
  subjectsSection.innerHTML = `
    <div class="subjects-grid">
      ${subjectsList.map(sub => `
        <label class="checkbox-label">
          <input type="checkbox" value="${sub}" onchange="updateSelectedDisplay()" />
          <span>${sub}</span>
        </label>
      `).join("")}
    </div>
  `;
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * Fetch subjects from the backend API
 * Falls back to default subjects if API call fails
 */
async function fetchSubjects() {
  try {
    const token = getAuthToken();
    const config = token ? {
      headers: { 'Authorization': `Bearer ${token}` }
    } : {};
    
    const res = await axios.get(`${API_URL}/subjects`, config);
    console.log('Subjects response:', res.data);
    
    subjects = res.data.subjects || [];
    
    if (subjects.length > 0) {
      renderSubjects(subjects);
    } else {
      // Use fallback subjects if API returns empty
      subjects = FALLBACK_SUBJECTS;
      renderSubjects(subjects);
    }
  } catch (err) {
    console.error("Error fetching subjects:", err);
    console.error("Error details:", err.response?.data);
    
    // Use fallback subjects on any error (including 401)
    subjects = FALLBACK_SUBJECTS;
    renderSubjects(subjects);
    console.log('Using fallback subjects. Error:', err.response?.status);
  }
}

/**
 * Fetch the next student ID from the backend
 * This shows the auto-generated email before registration
 */
async function fetchNextStudentId() {
  try {
    const token = getAuthToken();
    const config = token ? {
      headers: { 'Authorization': `Bearer ${token}` }
    } : {};
    
    // Show loading state
    studentEmailInput.value = 'Loading...';
    studentEmailInput.classList.add('student-email-loading');
    parentEmailInput.value = 'Loading...';
    parentEmailInput.classList.add('student-email-loading');
    
    const res = await axios.get(`${API_URL}/next-student-id`, config);
    console.log('Next student ID response:', res.data);
    
    nextStudentEmail = res.data.nextStudentEmail;
    studentEmailInput.value = nextStudentEmail;
    studentEmailInput.classList.remove('student-email-loading');
    
    // Set parent email (auto-generated from same ID)
    parentEmailInput.value = res.data.nextParentEmail;
    parentEmailInput.classList.remove('student-email-loading');
    
    return nextStudentEmail;
  } catch (err) {
    console.error("Error fetching next student ID:", err);
    studentEmailInput.value = 'Will be auto-generated';
    studentEmailInput.classList.remove('student-email-loading');
    parentEmailInput.value = 'Will be auto-generated';
    parentEmailInput.classList.remove('student-email-loading');
    return null;
  }
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} Axios response promise
 */
async function registerUser(userData) {
  const token = getAuthToken();
  const config = token ? {
    headers: { 'Authorization': `Bearer ${token}` }
  } : {};
  
  return axios.post(`${API_URL}/register`, userData, config);
}

// =============================================================================
// FORM VALIDATION
// =============================================================================

/**
 * Validate form data before submission
 * @returns {Object|null} Validation result with error message or null if valid
 */
function validateForm() {
  // Validate name
  const name = document.getElementById("name").value.trim();
  if (!name) {
    return { error: 'Please enter the full name' };
  }

  // Validate password
  const password = document.getElementById("password").value;
  if (!password) {
    return { error: 'Please enter a password' };
  }

  if (password.length < 4) {
    return { error: 'Password must be at least 4 characters' };
  }

  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  
  if (!gender) {
    return { error: 'Please select a gender' };
  }

  // For non-students, validate email
  if (roleSelect.value !== "student") {
    const email = emailInput.value.trim();
    if (!email) {
      return { error: 'Please enter an email address' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: 'Please enter a valid email address' };
    }
  }

  // Validate student-specific fields
  if (roleSelect.value === "student") {
    // Parent email is auto-generated, no validation needed
    
    // Validate class grade
    if (!classGradeSelect.value) {
      return { error: 'Please select a class grade for the student' };
    }
  }

  // Validate teacher subjects
  const selectedSubjects = Array.from(subjectsSection.querySelectorAll("input:checked"))
    .map(cb => cb.value);

  if (roleSelect.value === "teacher" && selectedSubjects.length === 0) {
    return { error: 'Please select at least one subject for the teacher' };
  }

  return null;
}

/**
 * Collect form data
 * @returns {Object} Form data object
 */
function collectFormData() {
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const selectedSubjects = Array.from(subjectsSection.querySelectorAll("input:checked"))
    .map(cb => cb.value);

  const data = {
    name: document.getElementById("name").value.trim(),
    password: document.getElementById("password").value,
    gender,
    role: roleSelect.value
  };

  // Add dateOfBirth only for non-students
  if (roleSelect.value !== "student") {
    data.dateOfBirth = document.getElementById("dob").value;
  }

  // For non-students, include the manually entered email
  if (roleSelect.value !== "student") {
    data.email = document.getElementById("email").value.trim();
  }

  // Add subjects for teachers
  if (roleSelect.value === "teacher") {
    data.subjects = selectedSubjects;
  }

  // Add student-specific fields (parent email is auto-generated on backend)
  if (roleSelect.value === "student") {
    data.classGrade = classGradeSelect.value;
  }

  console.log('Sending registration data:', data);
  return data;
}

/**
 * Reset the form to initial state but preserve role selection
 */
function resetForm() {
  // Store the current role before reset
  const currentRole = roleSelect.value;
  
  // Reset form fields
  document.getElementById("name").value = "";
  document.getElementById("email").value = "";
  document.getElementById("password").value = "";
  document.getElementById("dob").value = "";
  
  // Reset gender radio buttons
  document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.checked = false;
  });
  
  // Reset student-specific fields
  parentEmailInput.value = "";
  classGradeSelect.value = "";
  
  // Reset selected subjects display
  selectedSubjectsDisplay.style.display = "none";
  
  // Uncheck all subjects
  subjectsSection.querySelectorAll("input:checked").forEach(cb => {
    cb.checked = false;
  });
  
  // Restore the role selection
  roleSelect.value = currentRole;
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle role selection change
 */
function handleRoleChange() {
  const selectedRole = roleSelect.value;
  const dobContainer = document.getElementById("dobContainer");
  const dobInput = document.getElementById("dob");
  
  // Show/hide subjects for teachers
  subjectsContainer.style.display = selectedRole === "teacher" ? "block" : "none";
  
  // Show/hide DOB field (hide for students - they will fill it on first login)
  if (dobContainer) {
    dobContainer.style.display = selectedRole === "student" ? "none" : "block";
    if (dobInput) {
      dobInput.required = selectedRole !== "student";
    }
  }
  
  // Show/hide student-specific fields
  if (selectedRole === "student") {
    parentEmailContainer.style.display = "block";
    classGradeContainer.style.display = "block";
    // Parent email is auto-generated, no longer required input
    parentEmailInput.required = false;
    classGradeSelect.required = true;
    
    // Show auto-generated student email, hide manual email input
    emailContainer.style.display = "none";
    studentEmailContainer.style.display = "block";
    emailInput.required = false;
    
    // Fetch the next student ID (this also sets parent email)
    fetchNextStudentId();
  } else {
    parentEmailContainer.style.display = "none";
    classGradeContainer.style.display = "none";
    parentEmailInput.required = false;
    classGradeSelect.required = false;
    parentEmailInput.value = "";
    classGradeSelect.value = "";
    
    // Show manual email input, hide auto-generated student email
    emailContainer.style.display = "block";
    studentEmailContainer.style.display = "none";
    emailInput.required = true;
  }
}

/**
 * Handle form submission
 * @param {Event} e - Submit event
 */
async function handleSubmit(e) {
  e.preventDefault();

  // Validate form
  const validationError = validateForm();
  if (validationError) {
    showMessage('error', validationError.error);
    return;
  }

  // Collect form data
  const data = collectFormData();
  console.log('Form data being sent:', JSON.stringify(data, null, 2));

  // Disable button and show loading state
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering...';

  try {
    const response = await registerUser(data);
    console.log('Registration response:', response);
    
    const roleName = data.role.charAt(0).toUpperCase() + data.role.slice(1);
    let successMessage = `${roleName} registered successfully!`;
    
    // Show additional message for student registration with both generated emails
    if (data.role === 'student') {
      const gradeDisplay = data.classGrade.replace('grade', 'Grade ').replace('kg', 'KG');
      const studentEmail = response.data.user.email;
      const parentEmail = response.data.user.parentEmail;
      successMessage += ` Assigned to ${gradeDisplay}. Student Email: ${studentEmail}. Parent Email: ${parentEmail}`;
    }
    
    showMessage('success', successMessage);
    
    // Reset form and then re-trigger role change to show correct fields
    resetForm();
    
    // Re-show student fields if student role is still selected and fetch new ID
    handleRoleChange();
  } catch (err) {
    console.error(err);
    
    // Check if it's an auth error
    if (err.response?.status === 401) {
      showMessage('error', 'Session expired. Please login again.');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }
    
    const errorMsg = err.response?.data?.message || "Registration failed.";
    showMessage('error', errorMsg);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register User';
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the application
 */
function init() {
  // Check if all DOM elements exist
  console.log('Checking DOM elements...');
  console.log('form:', !!form);
  console.log('roleSelect:', !!roleSelect);
  console.log('submitBtn:', !!submitBtn);
  console.log('classGradeSelect:', !!classGradeSelect);
  
  if (!form) {
    console.error('Form element not found!');
    return;
  }
  
  // Setup axios defaults with auth token
  const token = getAuthToken();
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Log current auth state for debugging
  console.log('Auth token present:', !!token);
  console.log('User role:', localStorage.getItem('role') || localStorage.getItem('userRole'));

  // Fetch subjects from API
  fetchSubjects();

  // Attach event listeners
  roleSelect.addEventListener("change", handleRoleChange);
  form.addEventListener("submit", handleSubmit);

  // Make updateSelectedDisplay available globally for inline handlers
  window.updateSelectedDisplay = updateSelectedDisplay;

  // IMPORTANT: Trigger role change on page load to show correct fields
  handleRoleChange();
  
  console.log('Initialization complete');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}