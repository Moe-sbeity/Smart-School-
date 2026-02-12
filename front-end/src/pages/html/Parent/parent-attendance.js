        const API_URL = "http://localhost:5001/api";
        let currentChildId = null;
        let allChildren = [];
        let attendancePagination = null;
        let currentFilters = {};

        function getAuthToken() {
            return localStorage.getItem('token');
        }

        function showAlert(type, message) {
            if (typeof Toast !== 'undefined') {
                if (type === 'error') {
                    Toast.error(message);
                } else if (type === 'success') {
                    Toast.success(message);
                } else {
                    Toast.info(message);
                }
                return;
            }
            console.log(`[${type.toUpperCase()}]: ${message}`);
        }

        function getInitials(name) {
            return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        }

        function formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        }

        function formatTime(timeString) {
            if (!timeString) return 'N/A';
            if (timeString.includes('T') || timeString.includes('Z')) {
                return new Date(timeString).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit'
                });
            }
            return timeString;
        }

        function setSelectedChild(childId) {
            currentChildId = childId;
            localStorage.setItem('selectedChildId', childId);
            updateChildTabs();
            // Reset pagination and filters when switching children
            currentFilters = {};
            if (attendancePagination) {
                attendancePagination.reset();
            }
            loadAttendanceData(1, 10);
        }

        function getSelectedChild() {
            return currentChildId || localStorage.getItem('selectedChildId');
        }

        async function fetchParentOverview() {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/attendance/parent/overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        }

        async function fetchChildAttendance(childId, page = 1, limit = 10) {
            const token = getAuthToken();
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...currentFilters
            });
            const response = await axios.get(`${API_URL}/attendance/parent/child/${childId}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        }

        async function fetchUserInfo() {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.user;
        }

        function renderChildrenTabs(children) {
            const container = document.getElementById('childrenTabs');

            container.innerHTML = children.map(child => {
                const initials = getInitials(child.student.name);
                const isActive = child.student._id === getSelectedChild();

                return `
                    <button class="child-tab ${isActive ? 'active' : ''}" onclick="setSelectedChild('${child.student._id}')">
                        <div class="child-avatar">${initials}</div>
                        <div class="child-info">
                            <span class="child-name">${child.student.name}</span>
                            <span class="child-grade">Grade ${child.student.classGrade || 'N/A'} - Section ${child.student.classSection || 'N/A'}</span>
                        </div>
                    </button>
                `;
            }).join('');
        }

        function updateChildTabs() {
            const tabs = document.querySelectorAll('.child-tab');
            tabs.forEach(tab => {
                const childId = tab.onclick.toString().match(/'([^']+)'/)[1];
                if (childId === getSelectedChild()) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }

        function renderStats(stats) {
            const container = document.getElementById('statsSection');
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value" style="color: #667eea;">${stats.attendanceRate || '0%'}</div>
                    <div class="stat-label">Attendance Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #2f855a;">${stats.present || 0}</div>
                    <div class="stat-label">Present</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #c05621;">${stats.absent || 0}</div>
                    <div class="stat-label">Absent</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #ef6c00;">${stats.late || 0}</div>
                    <div class="stat-label">Late</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #2c5282;">${stats.excused || 0}</div>
                    <div class="stat-label">Excused</div>
                </div>
            `;
        }

        function renderAttendanceTable(attendance, totalRecords = 0) {
            const container = document.getElementById('attendanceTable');

            if (!attendance || attendance.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-clipboard-check"></i></div>
                        <h3>No Attendance Records</h3>
                        <p>No attendance data available yet.</p>
                    </div>
                `;
                // Hide pagination when no records
                const paginationContainer = document.getElementById('paginationContainer');
                if (paginationContainer) paginationContainer.style.display = 'none';
                return;
            }
            
            // Show pagination container
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) paginationContainer.style.display = 'flex';

            const statusColors = {
                present: 'green',
                absent: 'orange',
                late: 'orange',
                excused: 'blue'
            };

            container.innerHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Check-in Time</th>
                            <th>Teacher</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attendance.map(record => {
                const color = statusColors[record.status?.toLowerCase()] || 'blue';
                return `
                                <tr>
                                    <td>${formatDate(record.date)}</td>
                                    <td>${record.subject || 'N/A'}</td>
                                    <td><span class="tag tag-${color}">${record.status}</span></td>
                                    <td>${formatTime(record.checkInTime)}</td>
                                    <td>${record.teacher?.name || 'N/A'}</td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
            `;
        }

        async function loadAttendanceData(page = 1, limit = 10) {
            const childId = getSelectedChild();
            if (!childId) return;

            try {
                const data = await fetchChildAttendance(childId, page, limit);
                renderStats(data.statistics);
                const totalItems = data.pagination?.totalItems || data.attendance?.length || 0;
                renderAttendanceTable(data.attendance, totalItems);
                
                // Update pagination
                if (attendancePagination && data.pagination) {
                    attendancePagination.update(data.pagination);
                }
                
                document.getElementById('contentContainer').style.display = 'block';
            } catch (error) {
                console.error('Error loading attendance data:', error);
                showAlert('error', 'Failed to load attendance data. Please try again.');
            }
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedChildId');
            window.location.href = '../login.html';
        }

        async function init() {
            try {
                const token = getAuthToken();

                if (!token) {
                    window.location.href = 'login.html';
                    return;
                }

                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const user = await fetchUserInfo();
                document.getElementById('userName').textContent = user.name;

                if (user.role !== 'parent') {
                    showAlert('error', 'Access denied. This dashboard is for parents only.');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                    return;
                }

                const data = await fetchParentOverview();
                document.getElementById('loadingContainer').style.display = 'none';

                if (!data.children || data.children.length === 0) {
                    showAlert('error', 'No children found.');
                    return;
                }

                allChildren = data.children;

                if (!getSelectedChild() && allChildren.length > 0) {
                    currentChildId = allChildren[0].student._id;
                    localStorage.setItem('selectedChildId', currentChildId);
                }

                document.getElementById('childrenSelector').style.display = 'block';
                renderChildrenTabs(allChildren);
                
                // Initialize pagination
                attendancePagination = new Pagination('paginationContainer', {
                    itemsPerPageOptions: [10, 25, 50],
                    onPageChange: (page, limit) => loadAttendanceData(page, limit)
                });
                
                await loadAttendanceData();

            } catch (error) {
                console.error('Initialization error:', error);

                if (error.response?.status === 401 || error.response?.status === 403) {
                    showAlert('error', 'Session expired. Please login again.');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    showAlert('error', 'Failed to load data');
                    document.getElementById('loadingContainer').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading data';
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
