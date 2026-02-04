const API_URL = "http://localhost:5001/api/users";

// ---------- HELPER FUNCTIONS ----------
const showMessage = (message, isError = false) => {
  // Use Toast if available
  if (typeof Toast !== 'undefined') {
    if (isError) {
      Toast.error(message);
    } else {
      Toast.success(message);
    }
    return;
  }
  
  // Fallback to console if Toast not loaded
  console.log(`[${isError ? 'ERROR' : 'SUCCESS'}]: ${message}`);
};

// ---------- REGISTER ----------
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  const roleSelect = document.getElementById("role");
  const subjectsContainer = document.getElementById("subjectsContainer");
  const parentEmailContainer = document.getElementById("parentEmailContainer");
  const classContainer = document.getElementById("classContainer");

  // Show/hide fields based on role
  const updateFormFields = () => {
    const role = roleSelect.value;
    
    if (subjectsContainer) {
      subjectsContainer.style.display = role === "teacher" ? "block" : "none";
    }
    if (parentEmailContainer) {
      parentEmailContainer.style.display = role === "student" ? "block" : "none";
    }
    if (classContainer) {
      classContainer.style.display = role === "student" ? "block" : "none";
    }
  };

  if (roleSelect) {
    roleSelect.addEventListener("change", updateFormFields);
    updateFormFields(); // Initial state
  }

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    try {
      const selectedSubjects = Array.from(
        document.querySelectorAll("#subjectsContainer input:checked")
      ).map(cb => cb.value);

      const role = roleSelect.value;
      
      const userData = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        password: document.getElementById("password").value,
        gender: document.getElementById("gender").value,
        dateOfBirth: document.getElementById("dob").value,
        role: role
      };

      // Add role-specific fields
      if (role === "teacher") {
        userData.subjects = selectedSubjects;
      }
      
      if (role === "student") {
        const parentEmail = document.getElementById("parentEmail");
        const classGrade = document.getElementById("classGrade");
        const classSection = document.getElementById("classSection");
        
        if (parentEmail) userData.parentEmail = parentEmail.value.trim().toLowerCase();
        if (classGrade) userData.classGrade = classGrade.value;
        if (classSection) userData.classSection = classSection.value;
      }

      const response = await axios.post(`${API_URL}/register`, userData, {
        withCredentials: true,
      });

      showMessage("Registration successful! Redirecting to login...");
      console.log("Registered user:", response.data.user);
      
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
      
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      showMessage(msg, true);
      console.error("Register error:", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in...";

    const credentials = {
      email: document.getElementById("loginEmail").value.trim().toLowerCase(),
      password: document.getElementById("loginPassword").value,
    };

    try {
      const response = await axios.post(`${API_URL}/login`, credentials, {
        withCredentials: true,
      });

      const user = response.data.user;
      showMessage(`Welcome back, ${user.name}!`);
      console.log("Logged in user:", user);

      // Store token and user data
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Store mustChangePassword flag for parents
      if (user.role === 'parent' && user.mustChangePassword) {
        localStorage.setItem("mustChangePassword", "true");
      } else {
        localStorage.setItem("mustChangePassword", "false");
      }

      // Redirect based on role after short delay
      setTimeout(() => {
        switch (user.role) {
          case "admin":
            window.location.href = "Admin/admin-dashboard.html";
            break;
          case "student":
            window.location.href = "Student/student-dashboard.html";
            break;
          case "teacher":
            window.location.href = "Teacher/teacher-dashboard.html";
            break;
          case "parent":
            window.location.href = "Parent/parent-dashboard.html";
            break;
          default:
            showMessage("Unknown role. Please contact support.", true);
            break;
        }
      }, 1000);
      
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid credentials. Please try again.";
      showMessage(msg, true);
      console.error("Login error:", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ---------- LOGOUT ----------
const logout = async () => {
  try {
    const token = localStorage.getItem('token');
    await axios.post(`${API_URL}/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
  } catch (err) {
    console.error("Logout error:", err);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  }
};

// Attach logout to window for global access
window.logout = logout;

// ---------- CHECK AUTH ON PAGE LOAD ----------
const checkAuthOnLoad = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // If on login page and already authenticated, redirect to dashboard
  if (loginForm && token && user) {
    const userData = JSON.parse(user);
    const dashboards = {
      admin: 'Admin/admin-dashboard.html',
      student: 'Student/student-dashboard.html',
      teacher: 'Teacher/teacher-dashboard.html',
      parent: 'Parent/parent-dashboard.html'
    };
    if (dashboards[userData.role]) {
      window.location.href = dashboards[userData.role];
    }
  }
};

// Run on page load
document.addEventListener('DOMContentLoaded', checkAuthOnLoad);
