        const API_URL = 'http://localhost:5001/api';
        let currentTeacher = null;
        let students = [];
        let attendanceData = {};

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
            const container = document.getElementById('messageContainer');
            container.innerHTML = `
                <div class="${type}">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                    ${message}
                </div>
            `;
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }

        async function init() {
            try {
                const data = await apiCall('/users/me');
                currentTeacher = data.user;

                if (currentTeacher.role !== 'teacher') {
                    showMessage('Access denied. This page is for teachers only.', 'error');
                    return;
                }

                const subjectSelect = document.getElementById('subjectSelect');
                currentTeacher.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });

                const today = new Date().toISOString().split('T')[0];
                document.getElementById('attendanceDate').value = today;

            } catch (error) {
                console.error('Error initializing:', error);
                showMessage('Failed to load teacher data', 'error');
            }
        }

        async function loadStudents() {
            const date = document.getElementById('attendanceDate').value;
            const subject = document.getElementById('subjectSelect').value;

            if (!subject) {
                showMessage('Please select a subject', 'error');
                return;
            }

            const container = document.getElementById('studentContainer');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Loading students...</p></div>';

            try {
                const scheduleData = await apiCall(`/schedules/teacher/${currentTeacher._id}`);
                const schedules = scheduleData.schedules || [];
                const subjectSchedules = schedules.filter(s => s.subject === subject);
                
                const studentSet = new Set();
                const studentMap = new Map();
                
                subjectSchedules.forEach(schedule => {
                    if (Array.isArray(schedule.student)) {
                        schedule.student.forEach(s => {
                            if (s && s._id) {
                                studentSet.add(s._id);
                                studentMap.set(s._id, s);
                            }
                        });
                    } else if (schedule.student && schedule.student._id) {
                        studentSet.add(schedule.student._id);
                        studentMap.set(schedule.student._id, schedule.student);
                    }
                });

                students = Array.from(studentMap.values());

                try {
                    const attendanceResponse = await apiCall(`/attendance/by-date?date=${date}&subject=${subject}`);
                    const existingAttendance = attendanceResponse.attendance || [];
                    
                    attendanceData = {};
                    existingAttendance.forEach(att => {
                        attendanceData[att.student._id] = {
                            status: att.status,
                            notes: att.notes || ''
                        };
                    });
                } catch (error) {
                    console.log('No existing attendance found');
                    attendanceData = {};
                }

                renderStudents();
                document.getElementById('toolbar').style.display = 'flex';
                document.getElementById('statsGrid').style.display = 'grid';
                updateStats();

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
                                                   ${attendance.status === 'present' ? 'checked' : ''}
                                                   onchange="setStatus('${student._id}', 'present', this.checked)">
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="absent"
                                                   ${attendance.status === 'absent' ? 'checked' : ''}
                                                   onchange="setStatus('${student._id}', 'absent', this.checked)">
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="late"
                                                   ${attendance.status === 'late' ? 'checked' : ''}
                                                   onchange="setStatus('${student._id}', 'late', this.checked)">
                                        </div>
                                    </td>
                                    <td class="checkbox-cell">
                                        <div class="status-checkbox">
                                            <input type="checkbox" 
                                                   class="excused"
                                                   ${attendance.status === 'excused' ? 'checked' : ''}
                                                   onchange="setStatus('${student._id}', 'excused', this.checked)">
                                        </div>
                                    </td>
                                    <td class="notes-cell">
                                        <input type="text" 
                                               placeholder="Add notes..."
                                               value="${attendance.notes}"
                                               onchange="setNotes('${student._id}', this.value)">
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

            if (!subject) {
                showMessage('Please select a subject', 'error');
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
                    date
                });

                showMessage(`Attendance saved successfully for ${response.results.length} students`, 'success');
                
                setTimeout(() => {
                    loadStudents();
                }, 1500);

            } catch (error) {
                console.error('Error saving attendance:', error);
                showMessage('Failed to save attendance: ' + error.message, 'error');
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const token = getToken();
            if (!token) {
                showMessage('Please log in to access this page', 'error');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            init();
        });
