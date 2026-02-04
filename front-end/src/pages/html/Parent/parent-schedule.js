        const API_URL = "http://localhost:5001/api";
        let currentChildId = null;
        let allChildren = [];

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
            loadScheduleData();
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

        async function fetchChildSchedule(childId) {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/schedules/parent/child/${childId}/schedule`, {
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

        function renderScheduleSummary(schedules) {
            const container = document.getElementById('scheduleSummary');
            const totalClasses = schedules.length;
            const uniqueSubjects = [...new Set(schedules.map(s => s.subject))].length;

            container.innerHTML = `
                <div class="summary-icon-large">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="summary-text">
                    <h3>${totalClasses} Classes This Week</h3>
                    <p>${uniqueSubjects} different subjects scheduled</p>
                </div>
            `;
        }

        function renderWeekSchedule(schedules) {
            const container = document.getElementById('weekSchedule');

            if (!schedules || schedules.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-calendar-week"></i></div>
                        <h3>No Schedule Available</h3>
                        <p>This student doesn't have any classes scheduled yet.</p>
                    </div>
                `;
                return;
            }

            const days = [
                { name: 'Monday', icon: 'fa-calendar-day' },
                { name: 'Tuesday', icon: 'fa-calendar-day' },
                { name: 'Wednesday', icon: 'fa-calendar-day' },
                { name: 'Thursday', icon: 'fa-calendar-day' },
                { name: 'Friday', icon: 'fa-calendar-day' }
            ];

            const scheduleByDay = {};

            days.forEach(day => {
                scheduleByDay[day.name] = schedules.filter(s => {
                    if (!s.dayOfWeek) return false;
                    const scheduleDay = s.dayOfWeek.charAt(0).toUpperCase() + s.dayOfWeek.slice(1).toLowerCase();
                    return scheduleDay === day.name;
                });
            });

            container.innerHTML = days.map(day => {
                const daySchedules = scheduleByDay[day.name];

                if (!daySchedules || daySchedules.length === 0) {
                    return `
                        <div class="day-card">
                            <div class="day-header">
                                <div class="day-icon">
                                    <i class="fas ${day.icon}"></i>
                                </div>
                                <div class="day-info">
                                    <h3>${day.name}</h3>
                                    <p>No classes scheduled</p>
                                </div>
                            </div>
                            <div class="no-classes-message">
                                <i class="fas fa-coffee" style="font-size: 24px; margin-bottom: 10px;"></i>
                                <p>No classes on this day</p>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="day-card">
                        <div class="day-header">
                            <div class="day-icon">
                                <i class="fas ${day.icon}"></i>
                            </div>
                            <div class="day-info">
                                <h3>${day.name}</h3>
                                <p>${daySchedules.length} ${daySchedules.length === 1 ? 'class' : 'classes'} scheduled</p>
                            </div>
                        </div>
                        <div class="classes-grid">
                            ${daySchedules.map(schedule => `
                                <div class="class-card">
                                    <div class="class-time">
                                        <i class="fas fa-clock"></i>
                                        ${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}
                                    </div>
                                    <div class="class-subject">${schedule.subject || 'Subject N/A'}</div>
                                    <div class="class-details">
                                        <div class="class-detail-item">
                                            <i class="fas fa-chalkboard-teacher"></i>
                                            <span>${schedule.teacher?.name || 'Teacher N/A'}</span>
                                        </div>
                                        ${schedule.room ? `
                                            <div class="class-detail-item">
                                                <i class="fas fa-door-open"></i>
                                                <span>Room ${schedule.room}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function loadScheduleData() {
            const childId = getSelectedChild();
            if (!childId) return;

            try {
                const data = await fetchChildSchedule(childId);

                if (!data.schedules || data.schedules.length === 0) {
                    document.getElementById('scheduleSummary').innerHTML = '';
                    document.getElementById('weekSchedule').innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon"><i class="fas fa-calendar-week"></i></div>
                            <h3>No Schedule Available</h3>
                            <p>This student doesn't have any classes scheduled yet.</p>
                        </div>
                    `;
                } else {
                    renderScheduleSummary(data.schedules);
                    renderWeekSchedule(data.schedules);
                }

                document.getElementById('contentContainer').style.display = 'block';
            } catch (error) {
                console.error('Error loading schedule data:', error);
                showAlert('error', 'Failed to load schedule data. Please try again.');
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
                await loadScheduleData();

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
