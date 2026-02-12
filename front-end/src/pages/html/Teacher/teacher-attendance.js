        const API_URL = 'http://localhost:5001/api';
        let currentTeacher = null;
        let students = [];
        let attendanceData = {};
        let teacherClasses = []; // Store teacher's assigned classes
        let doneSubjects = []; // Track subjects with completed attendance
        let isEditMode = false; // Whether editing existing attendance

        const getToken = () => localStorage.getItem('token');

        async function apiCall(endpoint, method = 'GET', body = null) {
            const token = getToken();
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
                throw new Error(error.message || 'API request failed');
            }

            return response.json();
        }

        function showMessage(message, type = 'success') {
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
        }

        async function init() {
            try {
                const data = await apiCall('/users/me');
                currentTeacher = data.user;

                if (currentTeacher.role !== 'teacher') {
                    showMessage('Access denied. This page is for teachers only.', 'error');
                    return;
                }

                // Load teacher's subjects
                const subjectSelect = document.getElementById('subjectSelect');
                if (currentTeacher.subjects && Array.isArray(currentTeacher.subjects)) {
                    currentTeacher.subjects.forEach(subject => {
                        const option = document.createElement('option');
                        option.value = subject;
                        option.textContent = subject;
                        subjectSelect.appendChild(option);
                    });
                }

                // Load teacher's assigned classes (grades and sections)
                await loadTeacherClasses();

                const today = new Date().toISOString().split('T')[0];
                document.getElementById('attendanceDate').value = today;

                // Add date change listener to refresh done subjects
                document.getElementById('attendanceDate').addEventListener('change', refreshDoneSubjects);

            } catch (error) {
                console.error('Error initializing:', error);
                showMessage('Failed to load teacher data', 'error');
            }
        }

        // Load teacher's assigned classes
        async function loadTeacherClasses() {
            try {
                const data = await apiCall('/schedules/my-classes');
                teacherClasses = data.classes || [];
                
                // Get unique grades
                const grades = [...new Set(teacherClasses.map(c => c.grade))];
                
                // Sort grades naturally
                grades.sort((a, b) => {
                    if (a === 'kg1') return -1;
                    if (b === 'kg1') return 1;
                    if (a === 'kg2') return -1;
                    if (b === 'kg2') return 1;
                    // Extract numbers from "grade12" format
                    const numA = parseInt(a.replace('grade', '')) || 0;
                    const numB = parseInt(b.replace('grade', '')) || 0;
                    return numA - numB;
                });
                
                const gradeSelect = document.getElementById('gradeSelect');
                grades.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade;
                    option.textContent = formatGradeLabel(grade);
                    gradeSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading teacher classes:', error);
            }
        }

        // Format grade label
        function formatGradeLabel(grade) {
            if (!grade) return 'N/A';
            if (grade === 'kg1') return 'KG1';
            if (grade === 'kg2') return 'KG2';
            // Handle "grade12" format
            if (grade.startsWith('grade')) {
                return `Grade ${grade.replace('grade', '')}`;
            }
            return `Grade ${grade}`;
        }

        // Handle grade change - update sections dropdown
        function onGradeChange() {
            const selectedGrade = document.getElementById('gradeSelect').value;
            const sectionSelect = document.getElementById('sectionSelect');
            
            // Clear existing sections
            sectionSelect.innerHTML = '<option value="">Select Section</option>';
            
            if (!selectedGrade) return;
            
            // Get sections for the selected grade
            const sections = teacherClasses
                .filter(c => c.grade === selectedGrade)
                .map(c => c.section)
                .filter((v, i, a) => a.indexOf(v) === i) // unique
                .sort();
            
            sections.forEach(section => {
                const option = document.createElement('option');
                option.value = section;
                option.textContent = `Section ${section}`;
                sectionSelect.appendChild(option);
            });

            // Reset done subjects when grade changes
            refreshDoneSubjects();
        }

        // Handle section change - refresh done subjects
        function onSectionChange() {
            refreshDoneSubjects();
        }

        // Fetch and display which subjects already have attendance done
        async function refreshDoneSubjects() {
            const date = document.getElementById('attendanceDate').value;
            const grade = document.getElementById('gradeSelect').value;
            const section = document.getElementById('sectionSelect').value;

            if (!date || !grade || !section) {
                doneSubjects = [];
                updateSubjectOptions();
                return;
            }

            try {
                const data = await apiCall(`/attendance/done-subjects?date=${date}&classGrade=${grade}&classSection=${section}`);
                doneSubjects = data.doneSubjects || [];
            } catch (error) {
                console.log('Could not fetch done subjects');
                doneSubjects = [];
            }
            updateSubjectOptions();
        }

        // Update subject dropdown to show done badges
        function updateSubjectOptions() {
            const subjectSelect = document.getElementById('subjectSelect');
            const currentValue = subjectSelect.value;
            const options = subjectSelect.querySelectorAll('option');

            options.forEach(option => {
                if (!option.value) return;
                const isDone = doneSubjects.includes(option.value);
                option.textContent = isDone ? `${option.value}  ✓ Done` : option.value;
            });

            subjectSelect.value = currentValue;
        }

        async function loadStudents() {
            const date = document.getElementById('attendanceDate').value;
            const subject = document.getElementById('subjectSelect').value;
            const grade = document.getElementById('gradeSelect').value;
            const section = document.getElementById('sectionSelect').value;

            if (!grade) {
                showMessage('Please select a grade', 'error');
                return;
            }

            if (!section) {
                showMessage('Please select a section', 'error');
                return;
            }

            if (!subject) {
                showMessage('Please select a subject', 'error');
                return;
            }

            const container = document.getElementById('studentContainer');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading students...</p></div>';

            try {
                // Get ALL students registered in this grade and section
                const studentsData = await apiCall(`/users/students?classGrade=${grade}&classSection=${section}&limit=500`);
                students = studentsData.students || [];
                
                if (students.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-users-slash"></i>
                            <p>No students found in ${formatGradeLabel(grade)} - Section ${section}</p>
                        </div>
                    `;
                    return;
                }

                // Load existing attendance for this date and subject
                isEditMode = false;
                try {
                    const attendanceResponse = await apiCall(`/attendance/by-date?date=${date}&subject=${subject}&classGrade=${grade}&classSection=${section}`);
                    const existingAttendance = attendanceResponse.attendance || [];
                    
                    attendanceData = {};
                    existingAttendance.forEach(att => {
                        if (att.student && att.student._id) {
                            attendanceData[att.student._id] = {
                                status: att.status,
                                notes: att.notes || ''
                            };
                        }
                    });

                    if (existingAttendance.length > 0) {
                        isEditMode = true;
                    }
                } catch (error) {
                    console.log('No existing attendance found');
                    attendanceData = {};
                }

                renderStudents();
                document.getElementById('toolbar').style.display = 'flex';
                document.getElementById('statsGrid').style.display = 'grid';
                updateStats();

                // Show edit banner if editing existing attendance
                const editBanner = document.getElementById('editBanner');
                if (editBanner) {
                    editBanner.style.display = isEditMode ? 'flex' : 'none';
                }

                // Update save button text
                const saveBtn = document.getElementById('saveAttendanceBtn');
                if (saveBtn) {
                    saveBtn.innerHTML = isEditMode 
                        ? '<i class="fas fa-edit"></i> Update Attendance'
                        : '<i class="fas fa-save"></i> Save Attendance';
                }

            } catch (error) {
                console.error('Error loading students:', error);
                container.innerHTML = `<div class="error">Failed to load students: ${error.message}</div>`;
            }
        }

        function renderStudents() {
            const container = document.getElementById('studentContainer');

            if (students.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users-slash"></i>
                        <p>No students found for this subject</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">#</th>
                            <th>Student</th>
                            <th class="center">Present</th>
                            <th class="center">Absent</th>
                            <th class="center">Late</th>
                            <th class="center">Excused</th>
                            <th style="width: 250px;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map((student, index) => {
                            const attendance = attendanceData[student._id] || { status: '', notes: '' };
                            return `
                                <tr>
                                    <td style="color: #9ca3af; font-weight: 600;">${index + 1}</td>
                                    <td>
                                        <div class="student-cell">
                                            <div class="student-avatar">
                                                ${student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div class="student-info">
                                                <div class="student-name">${student.name}</div>
                                                <div class="student-email">${student.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="present"
                                                   data-student-id="${student._id}"
                                                   data-status="present"
                                                   ${attendance.status === 'present' ? 'checked' : ''}>
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="absent"
                                                   data-student-id="${student._id}"
                                                   data-status="absent"
                                                   ${attendance.status === 'absent' ? 'checked' : ''}>
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="late"
                                                   data-student-id="${student._id}"
                                                   data-status="late"
                                                   ${attendance.status === 'late' ? 'checked' : ''}>
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="excused"
                                                   data-student-id="${student._id}"
                                                   data-status="excused"
                                                   ${attendance.status === 'excused' ? 'checked' : ''}>
                                        </div>
                                    </td>
                                    <td class="notes-cell">
                                        <input type="text" 
                                               placeholder="Add notes..."
                                               data-student-id="${student._id}"
                                               value="${attendance.notes}">
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        function setStatus(studentId, status, isChecked) {
            if (!attendanceData[studentId]) {
                attendanceData[studentId] = { status: '', notes: '' };
            }
            
            if (isChecked) {
                attendanceData[studentId].status = status;
            } else {
                attendanceData[studentId].status = '';
            }
            
            renderStudents();
            updateStats();
        }

        function setNotes(studentId, notes) {
            if (!attendanceData[studentId]) {
                attendanceData[studentId] = { status: '', notes: '' };
            }
            attendanceData[studentId].notes = notes;
        }

        function markAllPresent() {
            students.forEach(student => {
                if (!attendanceData[student._id]) {
                    attendanceData[student._id] = { status: '', notes: '' };
                }
                attendanceData[student._id].status = 'present';
            });
            renderStudents();
            updateStats();
        }

        function clearAll() {
            attendanceData = {};
            renderStudents();
            updateStats();
        }

        function updateStats() {
            const present = Object.values(attendanceData).filter(a => a.status === 'present').length;
            const absent = Object.values(attendanceData).filter(a => a.status === 'absent').length;
            const late = Object.values(attendanceData).filter(a => a.status === 'late').length;
            const excused = Object.values(attendanceData).filter(a => a.status === 'excused').length;

            document.getElementById('presentCount').textContent = present;
            document.getElementById('absentCount').textContent = absent;
            document.getElementById('lateCount').textContent = late;
            document.getElementById('excusedCount').textContent = excused;
        }

        async function saveAttendance() {
            const subject = document.getElementById('subjectSelect').value;
            const date = document.getElementById('attendanceDate').value;
            const grade = document.getElementById('gradeSelect').value;
            const section = document.getElementById('sectionSelect').value;

            if (!subject) {
                showMessage('Please select a subject', 'error');
                return;
            }
            
            if (!grade || !section) {
                showMessage('Please select grade and section', 'error');
                return;
            }

            const attendanceRecords = students.map(student => ({
                studentId: student._id,
                status: attendanceData[student._id]?.status || 'absent',
                notes: attendanceData[student._id]?.notes || ''
            })).filter(record => record.status);

            if (attendanceRecords.length === 0) {
                showMessage('Please mark attendance for at least one student', 'error');
                return;
            }

            try {
                const response = await apiCall('/attendance/mark-bulk', 'POST', {
                    attendanceRecords,
                    subject,
                    date,
                    classGrade: grade,
                    classSection: section
                });

                showMessage(
                    isEditMode 
                        ? `Attendance updated successfully for ${response.results.length} students` 
                        : `Attendance saved successfully for ${response.results.length} students`, 
                    'success'
                );
                
                // Reset the page
                resetPage();

                // Refresh done subjects list
                refreshDoneSubjects();

            } catch (error) {
                console.error('Error saving attendance:', error);
                showMessage('Failed to save attendance: ' + error.message, 'error');
            }
        }

        // Reset the page to initial state after saving
        function resetPage() {
            students = [];
            attendanceData = {};
            isEditMode = false;

            // Hide toolbar and stats
            document.getElementById('toolbar').style.display = 'none';
            document.getElementById('statsGrid').style.display = 'none';

            // Hide edit banner
            const editBanner = document.getElementById('editBanner');
            if (editBanner) editBanner.style.display = 'none';

            // Reset stats
            document.getElementById('presentCount').textContent = '0';
            document.getElementById('absentCount').textContent = '0';
            document.getElementById('lateCount').textContent = '0';
            document.getElementById('excusedCount').textContent = '0';

            // Reset subject select
            document.getElementById('subjectSelect').value = '';

            // Reset save button text
            const saveBtn = document.getElementById('saveAttendanceBtn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Attendance';
            }

            // Show initial placeholder
            document.getElementById('studentContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check" style="font-size: 48px; color: #10b981; margin-bottom: 12px;"></i>
                    <p style="font-size: 16px; color: #10b981; font-weight: 600;">Attendance saved!</p>
                    <p>Select a subject to continue marking attendance</p>
                </div>
            `;
        }

        document.addEventListener('DOMContentLoaded', () => {
            const token = getToken();
            if (!token) {
                showMessage('Please log in to access this page', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            
            // Add event listener for grade select
            document.getElementById('gradeSelect').addEventListener('change', onGradeChange);

            // Add event listener for section select
            document.getElementById('sectionSelect').addEventListener('change', onSectionChange);
            
            // Add event listener for load students button
            const loadBtn = document.getElementById('loadStudentsBtn');
            if (loadBtn) {
                loadBtn.addEventListener('click', loadStudents);
            }

            // Mark All Present button
            document.getElementById('markAllPresentBtn').addEventListener('click', markAllPresent);

            // Clear All button
            document.getElementById('clearAllBtn').addEventListener('click', clearAll);

            // Save Attendance button
            document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);

            // Event delegation for dynamically rendered checkboxes and notes
            document.getElementById('studentContainer').addEventListener('change', (e) => {
                const target = e.target;
                if (target.matches('input[type="checkbox"][data-student-id]')) {
                    setStatus(target.dataset.studentId, target.dataset.status, target.checked);
                } else if (target.matches('input[type="text"][data-student-id]')) {
                    setNotes(target.dataset.studentId, target.value);
                }
            });
            
            init();
        });
