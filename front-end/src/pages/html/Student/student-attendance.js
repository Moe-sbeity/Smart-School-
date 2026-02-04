        const API_URL = 'http://localhost:5001/api';
        let currentStudent = null;
        let allSubjects = [];

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
            const icon = type === 'success' ? 'check-circle' : 'exclamation-triangle';
            container.innerHTML = `
                <div class="${type}">
                    <i class="fas fa-${icon}"></i>
                    ${message}
                </div>
            `;
            setTimeout(() => {
                container.innerHTML = '';
            }, 5000);
        }

        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        function formatTime(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        async function init() {
            try {
                // Get current user info
                const data = await apiCall('/users/me');
                currentStudent = data.user;

                if (currentStudent.role !== 'student') {
                    showMessage('Access denied. This page is for students only.', 'error');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                    return;
                }

                document.getElementById('studentName').textContent = 
                    `Welcome, ${currentStudent.name}! Track your attendance across all subjects.`;

                // Load subjects
                const subjectsData = await apiCall('/users/subjects');
                allSubjects = subjectsData.subjects || [];
                
                const subjectFilter = document.getElementById('subjectFilter');
                allSubjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectFilter.appendChild(option);
                });

                // Set default date range (last 30 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
                document.getElementById('startDate').value = startDate.toISOString().split('T')[0];

                // Load attendance
                loadAttendance();

            } catch (error) {
                console.error('Error initializing:', error);
                showMessage('Failed to load student data: ' + error.message, 'error');
            }
        }

        async function loadAttendance() {
            const subject = document.getElementById('subjectFilter').value;
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            const container = document.getElementById('attendanceContainer');
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading attendance...</p></div>';

            try {
                // Build query params
                let queryParams = [];
                if (subject) queryParams.push(`subject=${subject}`);
                if (startDate) queryParams.push(`startDate=${startDate}`);
                if (endDate) queryParams.push(`endDate=${endDate}`);
                
                const query = queryParams.length > 0 ? '?' + queryParams.join('&') : '';

                const response = await apiCall(`/attendance/student/${currentStudent._id}${query}`);
                const { attendance, statistics } = response;

                // Update statistics
                updateStatistics(statistics);

                // Render attendance table
                renderAttendanceTable(attendance);

                document.getElementById('statsOverview').style.display = 'grid';

            } catch (error) {
                console.error('Error loading attendance:', error);
                container.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-triangle"></i>
                        Failed to load attendance: ${error.message}
                    </div>
                `;
            }
        }

        function updateStatistics(stats) {
            document.getElementById('attendanceRate').textContent = stats.attendanceRate;
            document.getElementById('presentCount').textContent = stats.present;
            document.getElementById('presentDays').textContent = `${stats.present} ${stats.present === 1 ? 'day' : 'days'}`;
            document.getElementById('absentCount').textContent = stats.absent;
            document.getElementById('absentDays').textContent = `${stats.absent} ${stats.absent === 1 ? 'day' : 'days'}`;
            document.getElementById('lateCount').textContent = stats.late;
            document.getElementById('lateDays').textContent = `${stats.late} ${stats.late === 1 ? 'day' : 'days'}`;
            document.getElementById('excusedCount').textContent = stats.excused;
            document.getElementById('excusedDays').textContent = `${stats.excused} ${stats.excused === 1 ? 'day' : 'days'}`;
        }

        function renderAttendanceTable(attendance) {
            const container = document.getElementById('attendanceContainer');
            document.getElementById('totalRecords').textContent = 
                `${attendance.length} ${attendance.length === 1 ? 'record' : 'records'}`;

            if (attendance.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <h3>No Attendance Records</h3>
                        <p>No attendance records found for the selected filters.</p>
                    </div>
                `;
                return;
            }

            const statusIcons = {
                present: 'check-circle',
                absent: 'times-circle',
                late: 'clock',
                excused: 'file-medical'
            };

            container.innerHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Check-In Time</th>
                            <th>Teacher</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendance.map(record => `
                            <tr>
                                <td><strong>${formatDate(record.date)}</strong></td>
                                <td>${record.subject}</td>
                                <td>
                                    <span class="status-badge ${record.status}">
                                        <i class="fas fa-${statusIcons[record.status]}"></i>
                                        ${record.status}
                                    </span>
                                </td>
                                <td>${formatTime(record.checkInTime)}</td>
                                <td>${record.teacher?.name || 'N/A'}</td>
                                <td class="notes-cell">${record.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
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
