const API_URL = 'http://localhost:5001/api';

let selectedStudent = null;
let availableGrades = [];
let availableSections = [];
let allStudents = [];

// Show alert
function showAlert(type, message) {
    if (typeof Toast !== 'undefined') {
        if (type === 'success') {
            Toast.success(message);
        } else if (type === 'error') {
            Toast.error(message);
        } else if (type === 'info') {
            Toast.info(message);
        } else {
            Toast[type](message);
        }
        return;
    }
    console.log(`[${type.toUpperCase()}]: ${message}`);
}

// Format grade display
function formatClassGrade(grade) {
    if (!grade) return 'N/A';
    return grade.replace('grade', 'Grade ').replace('kg', 'KG ');
}

// Load available grades and sections
async function loadGradesAndSections() {
    try {
        const gradesRes = await axios.get(API_URL + '/classGrade/available-grades');
        const sectionsRes = await axios.get(API_URL + '/classGrade/available-sections');
        
        availableGrades = gradesRes.data.data;
        availableSections = sectionsRes.data.data;
    } catch (error) {
        console.error('Error loading grades and sections:', error);
        availableGrades = ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'];
        availableSections = ['A', 'B', 'C', 'D', 'E', 'F'];
    }
}

// Load all students
async function loadStudents() {
    try {
        console.log('Loading students...');
        
        const response = await axios.get(API_URL + '/users/students');
        
        console.log('Students response:', response.data);
        allStudents = response.data.students || [];

        if (allStudents.length === 0) {
            console.log('No students found');
            showAlert('info', 'No students found. Please register students first.');
        } else {
            console.log('Loaded ' + allStudents.length + ' students');
        }
        
        renderStudentList(allStudents);
        
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('error', 'Failed to load students: ' + (error.response && error.response.data && error.response.data.message ? error.response.data.message : error.message));
    }
}

// Render student list
function renderStudentList(students) {
    const container = document.getElementById('studentListContainer');
    
    if (!students || students.length === 0) {
        container.innerHTML = '<div class="no-results"><i class="fas fa-user-slash"></i><p>No students found</p></div>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const studentId = student.email ? student.email.split('@')[0] : 'N/A';
        const gradeDisplay = student.classGrade ? formatClassGrade(student.classGrade) : 'No Grade';
        const sectionDisplay = student.classSection ? 'Section ' + student.classSection : '';
        
        html += '<div class="student-card" onclick="selectStudent(\'' + student._id + '\')" data-id="' + student._id + '">';
        html += '<div class="student-avatar"><i class="fas fa-user-graduate"></i></div>';
        html += '<div class="student-info-brief">';
        html += '<h4>' + student.name + '</h4>';
        html += '<p class="student-id"><i class="fas fa-id-badge"></i> ID: ' + studentId + '</p>';
        html += '<p class="student-email"><i class="fas fa-envelope"></i> ' + student.email + '</p>';
        html += '<p class="student-grade"><i class="fas fa-graduation-cap"></i> ' + gradeDisplay + (sectionDisplay ? ' - ' + sectionDisplay : '') + '</p>';
        html += '</div></div>';
    }
    
    container.innerHTML = html;
}

// Search students
function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderStudentList(allStudents);
        return;
    }
    
    const filtered = allStudents.filter(function(student) {
        const studentId = student.email ? student.email.split('@')[0] : '';
        const name = student.name.toLowerCase();
        const email = student.email.toLowerCase();
        const grade = (student.classGrade || '').toLowerCase();
        
        return name.indexOf(searchTerm) !== -1 || 
               studentId.indexOf(searchTerm) !== -1 || 
               email.indexOf(searchTerm) !== -1 ||
               grade.indexOf(searchTerm) !== -1;
    });
    
    renderStudentList(filtered);
}

// Select a student
window.selectStudent = async function(studentId) {
    selectedStudent = allStudents.find(function(s) { return s._id === studentId; });
    
    if (!selectedStudent) {
        showAlert('error', 'Student not found');
        return;
    }
    
    // Highlight selected
    const cards = document.querySelectorAll('.student-card');
    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.remove('selected');
    }
    const selectedCard = document.querySelector('.student-card[data-id="' + studentId + '"]');
    if (selectedCard) selectedCard.classList.add('selected');
    
    console.log('Selected student:', selectedStudent);
    
    displayStudentInfo();
    await loadStudentSchedule(studentId);
};

// Display student info
function displayStudentInfo() {
    const container = document.getElementById('studentInfoContainer');
    
    if (!selectedStudent) {
        container.innerHTML = '';
        return;
    }
    
    const studentId = selectedStudent.email ? selectedStudent.email.split('@')[0] : 'N/A';
    const gradeDisplay = selectedStudent.classGrade ? formatClassGrade(selectedStudent.classGrade) : 'Not assigned';
    const sectionDisplay = selectedStudent.classSection ? 'Section ' + selectedStudent.classSection : 'Not assigned';
    const dobDisplay = selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString() : 'Not set';
    const genderDisplay = selectedStudent.gender ? selectedStudent.gender.charAt(0).toUpperCase() + selectedStudent.gender.slice(1) : 'Not set';

    let gradeOptions = '';
    for (let i = 0; i < availableGrades.length; i++) {
        gradeOptions += '<option value="' + availableGrades[i] + '">' + formatClassGrade(availableGrades[i]) + '</option>';
    }

    let sectionOptions = '';
    for (let i = 0; i < availableSections.length; i++) {
        const sel = availableSections[i] === selectedStudent.classSection ? ' selected' : '';
        sectionOptions += '<option value="' + availableSections[i] + '"' + sel + '>Section ' + availableSections[i] + '</option>';
    }

    let gradeSelectionHtml = '';
    
    if (!selectedStudent.classGrade) {
        gradeSelectionHtml = '<div class="assignment-box warning">' +
            '<p class="assignment-title"><i class="fas fa-exclamation-circle"></i> No grade assigned</p>' +
            '<div class="assignment-fields">' +
            '<select id="quickGradeSelect"><option value="">Select Grade</option>' + gradeOptions + '</select>' +
            '<select id="quickSectionSelect"><option value="">Select Section</option>' + sectionOptions + '</select>' +
            '</div>' +
            '<button class="btn btn-success" onclick="handleQuickEnroll()" style="width:100%"><i class="fas fa-bolt"></i> Assign & Auto-Enroll</button>' +
            '</div>';
    } else if (!selectedStudent.classSection) {
        gradeSelectionHtml = '<div class="assignment-box info">' +
            '<p class="assignment-title"><i class="fas fa-exclamation-triangle"></i> Section needed</p>' +
            '<div class="assignment-fields">' +
            '<div class="grade-locked"><i class="fas fa-graduation-cap"></i> ' + gradeDisplay + '<input type="hidden" id="quickGradeSelect" value="' + selectedStudent.classGrade + '"></div>' +
            '<select id="quickSectionSelect"><option value="">Select Section</option>' + sectionOptions + '</select>' +
            '</div>' +
            '<button class="btn btn-success" onclick="handleQuickEnroll()" style="width:100%"><i class="fas fa-bolt"></i> Assign Section & Enroll</button>' +
            '</div>';
    } else {
        gradeSelectionHtml = '<div class="assignment-box success">' +
            '<div class="current-assignment">' +
            '<div><p><i class="fas fa-graduation-cap"></i> <strong>Grade:</strong> ' + gradeDisplay + '</p>' +
            '<p><i class="fas fa-users"></i> <strong>Section:</strong> ' + sectionDisplay + '</p></div>' +
            '<button class="btn btn-primary btn-small" onclick="toggleChangeSection()"><i class="fas fa-edit"></i> Change</button>' +
            '</div></div>' +
            '<div id="changeSectionContainer" class="assignment-box" style="display:none;">' +
            '<p class="assignment-title"><i class="fas fa-exchange-alt"></i> Change Section</p>' +
            '<div class="assignment-fields">' +
            '<div class="grade-locked"><i class="fas fa-graduation-cap"></i> ' + gradeDisplay + '<input type="hidden" id="quickGradeSelect" value="' + selectedStudent.classGrade + '"></div>' +
            '<select id="quickSectionSelect"><option value="">Select Section</option>' + sectionOptions + '</select>' +
            '</div>' +
            '<button class="btn btn-success" onclick="handleQuickEnroll()" style="width:100%"><i class="fas fa-bolt"></i> Change & Re-Enroll</button>' +
            '</div>';
    }

    container.innerHTML = '<div class="student-details">' +
        '<div class="student-header">' +
        '<div class="student-avatar-large"><i class="fas fa-user-graduate"></i></div>' +
        '<div class="student-name-section"><h2>' + selectedStudent.name + '</h2><span class="student-id-badge">ID: ' + studentId + '</span></div>' +
        '</div>' +
        '<div class="student-info-grid">' +
        '<div class="info-item"><i class="fas fa-envelope"></i><span>' + selectedStudent.email + '</span></div>' +
        '<div class="info-item"><i class="fas fa-venus-mars"></i><span>' + genderDisplay + '</span></div>' +
        '<div class="info-item"><i class="fas fa-birthday-cake"></i><span>' + dobDisplay + '</span></div>' +
        '</div>' +
        gradeSelectionHtml +
        '</div>';
}

// Toggle change section
window.toggleChangeSection = function() {
    const container = document.getElementById('changeSectionContainer');
    if (container) {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
};

// Handle quick enrollment
window.handleQuickEnroll = async function() {
    const gradeEl = document.getElementById('quickGradeSelect');
    const sectionEl = document.getElementById('quickSectionSelect');
    
    const grade = gradeEl ? gradeEl.value : selectedStudent.classGrade;
    const section = sectionEl ? sectionEl.value : '';
    
    if (!grade) {
        showAlert('error', 'Please select a grade');
        return;
    }
    
    if (!section) {
        showAlert('error', 'Please select a section');
        return;
    }
    
    if (!selectedStudent) {
        showAlert('error', 'No student selected');
        return;
    }
    
    // Confirm the section change
    const actionLabel = selectedStudent.classSection ? 'Re-enroll' : 'Enroll';
    const confirmMsg = actionLabel + ' student in ' + formatClassGrade(grade) + ' Section ' + section + '?';
    
    const ok = await showConfirmModal({
        title: actionLabel + ' Student',
        message: confirmMsg,
        confirmText: actionLabel,
        type: 'info',
        icon: 'fa-user-plus'
    });
    if (!ok) return;
    
    await quickEnrollStudent(selectedStudent._id, grade, section);
    displayStudentInfo();
};

// Assign section only (without enrolling in schedule)
async function assignSectionOnly(studentId, classGrade, classSection) {
    try {
        showAlert('info', 'Assigning section...');
        
        const response = await axios.post(API_URL + '/classGrade/assign-studentclass', {
            studentId: studentId,
            classGrade: classGrade,
            classSection: classSection
        });

        showAlert('success', 'Section assigned successfully!');
        
        // Update local data
        selectedStudent.classGrade = classGrade;
        selectedStudent.classSection = classSection;
        
        const idx = allStudents.findIndex(function(s) { return s._id === studentId; });
        if (idx !== -1) {
            allStudents[idx].classGrade = classGrade;
            allStudents[idx].classSection = classSection;
        }
        
        renderStudentList(allStudents);
        
        const selectedCard = document.querySelector('.student-card[data-id="' + studentId + '"]');
        if (selectedCard) selectedCard.classList.add('selected');
        
    } catch (error) {
        console.error('Error assigning section:', error);
        showAlert('error', error.response && error.response.data && error.response.data.message ? error.response.data.message : 'Failed to assign section');
    }
}

// Quick enroll
async function quickEnrollStudent(studentId, classGrade, classSection) {
    try {
        showAlert('info', 'Enrolling student...');
        
        const response = await axios.post(API_URL + '/schedules/enroll-student', {
            studentId: studentId,
            classGrade: classGrade,
            classSection: classSection
        });

        showAlert('success', response.data.message || 'Student enrolled successfully!');
        
        selectedStudent.classGrade = classGrade;
        selectedStudent.classSection = classSection;
        
        const idx = allStudents.findIndex(function(s) { return s._id === studentId; });
        if (idx !== -1) {
            allStudents[idx].classGrade = classGrade;
            allStudents[idx].classSection = classSection;
        }
        
        renderStudentList(allStudents);
        
        const selectedCard = document.querySelector('.student-card[data-id="' + studentId + '"]');
        if (selectedCard) selectedCard.classList.add('selected');
        
        await loadStudentSchedule(studentId);
        
    } catch (error) {
        console.error('Error enrolling student:', error);
        showAlert('error', error.response && error.response.data && error.response.data.message ? error.response.data.message : 'Failed to enroll student');
    }
}

// Load student schedule
async function loadStudentSchedule(studentId) {
    try {
        const response = await axios.get(API_URL + '/schedules/student/' + studentId);
        const schedules = response.data.schedules;

        const container = document.getElementById('currentScheduleContainer');

        if (!schedules || Object.keys(schedules).length === 0 || response.data.totalClasses === 0) {
            container.innerHTML = '<div class="no-schedules"><i class="fas fa-calendar-times"></i><p>No schedules assigned yet</p></div>';
            return;
        }

        let rows = '';
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        for (let d = 0; d < days.length; d++) {
            const day = days[d];
            if (schedules[day]) {
                for (let s = 0; s < schedules[day].length; s++) {
                    const schedule = schedules[day][s];
                    const teacherName = schedule.teacher && schedule.teacher.name ? schedule.teacher.name : 'N/A';
                    rows += '<tr>' +
                        '<td><strong>' + schedule.subject + '</strong></td>' +
                        '<td>' + teacherName + '</td>' +
                        '<td><span class="day-tag ' + day.toLowerCase() + '">' + day + '</span></td>' +
                        '<td>' + schedule.startTime + ' - ' + schedule.endTime + '</td>' +
                        '<td><button class="btn btn-danger btn-small" onclick="removeSchedule(\'' + schedule._id + '\')"><i class="fas fa-trash"></i></button></td>' +
                        '</tr>';
                }
            }
        }

        container.innerHTML = '<table class="schedule-table"><thead><tr><th>Subject</th><th>Teacher</th><th>Day</th><th>Time</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } catch (error) {
        console.error('Error loading student schedule:', error);
    }
}

// Remove schedule
window.removeSchedule = async function(scheduleId) {
    const ok = await showConfirmModal({
        title: 'Remove Schedule',
        message: 'Are you sure you want to remove this schedule?',
        confirmText: 'Remove',
        type: 'danger',
        icon: 'fa-trash'
    });
    if (!ok) return;

    try {
        await axios.delete(API_URL + '/schedules/' + scheduleId + '/student/' + selectedStudent._id);
        showAlert('success', 'Schedule removed!');
        loadStudentSchedule(selectedStudent._id);
    } catch (error) {
        console.error('Error removing schedule:', error);
        showAlert('error', error.response && error.response.data && error.response.data.message ? error.response.data.message : 'Failed to remove');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing student schedule page...');
    
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchStudents);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') searchStudents();
        });
    }
    
    await loadGradesAndSections();
    await loadStudents();
    
    console.log('Page initialized');
});
