        const API_URL = "http://localhost:5001/api";
        let currentChildId = null;
        let allChildren = [];

        function getAuthToken() {
            return localStorage.getItem('token');
        }

        function showAlert(type, message) {
            const alertBox = document.getElementById('alertBox');
            alertBox.className = `alert alert-${type} show`;
            alertBox.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
            setTimeout(() => alertBox.classList.remove('show'), 5000);
        }

        function getInitials(name) {
            return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        }

        function setSelectedChild(childId) {
            currentChildId = childId;
            localStorage.setItem('selectedChildId', childId);
            updateChildTabs();
            loadGradesData();
        }

        function getSelectedChild() {
            return currentChildId || localStorage.getItem('selectedChildId');
        }

        function getGradeColor(percentage) {
            if (percentage >= 90) return '#2f855a';
            if (percentage >= 80) return '#38a169';
            if (percentage >= 70) return '#d69e2e';
            if (percentage >= 60) return '#dd6b20';
            return '#c53030';
        }

        async function fetchParentOverview() {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/attendance/parent/overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        }

        async function fetchChildGrades(childId) {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/announcements/parent/child/${childId}/grades`, {
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

        function renderGradesOverview(overall) {
            const container = document.getElementById('gradesOverview');
            container.innerHTML = `
                <div class="grade-stat-card">
                    <div class="grade-stat-value">${overall.overallAverage}%</div>
                    <div class="grade-stat-label">Overall Average</div>
                </div>
                <div class="grade-stat-card">
                    <div class="grade-stat-value">${overall.totalAssignments}</div>
                    <div class="grade-stat-label">Total Assignments</div>
                </div>
                <div class="grade-stat-card">
                    <div class="grade-stat-value">${overall.totalEarned}</div>
                    <div class="grade-stat-label">Points Earned</div>
                </div>
                <div class="grade-stat-card">
                    <div class="grade-stat-value">${overall.totalPossible}</div>
                    <div class="grade-stat-label">Total Points</div>
                </div>
            `;
        }

        function renderSubjects(bySubject) {
            const container = document.getElementById('subjectsContainer');

            if (!bySubject || Object.keys(bySubject).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-graduation-cap"></i></div>
                        <h3>No Grades Available</h3>
                        <p>This student doesn't have any graded assignments yet.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = Object.values(bySubject).map(subject => {
                const percentage = parseFloat(subject.average);
                const gradeColor = getGradeColor(percentage);

                return `
                    <div class="subject-card">
                        <div class="subject-header">
                            <div class="subject-name">
                                <i class="fas fa-book"></i>
                                ${subject.subject}
                            </div>
                            <div class="subject-average" style="color: ${gradeColor};">${subject.average}%</div>
                        </div>
                        
                        <div class="subject-details">
                            <div class="subject-detail-item">
                                <i class="fas fa-clipboard-list"></i>
                                <span>${subject.count} assignments</span>
                            </div>
                            <div class="subject-detail-item">
                                <i class="fas fa-chart-bar"></i>
                                <span>${subject.earnedPoints} / ${subject.totalPoints} points</span>
                            </div>
                        </div>

                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${subject.average}%; background: ${gradeColor};"></div>
                        </div>

                        ${subject.assignments && subject.assignments.length > 0 ? `
                            <div class="assignments-section">
                                <div class="assignments-header">
                                    <i class="fas fa-tasks"></i>
                                    Recent Assignments
                                </div>
                                <div class="assignments-list">
                                    ${subject.assignments.map(assignment => {
                    const assignmentPercentage = parseFloat(assignment.percentage);
                    const scoreColor = getGradeColor(assignmentPercentage);

                    return `
                                            <div class="assignment-row">
                                                <div class="assignment-info">
                                                    <div class="assignment-name">${assignment.title}</div>
                                                    <div class="assignment-date">
                                                        <i class="fas fa-calendar"></i> ${formatDate(assignment.submittedAt)}
                                                    </div>
                                                </div>
                                                <div class="assignment-score">
                                                    <div class="score-value" style="color: ${scoreColor};">
                                                        ${assignment.grade}/${assignment.totalPoints}
                                                    </div>
                                                    <div class="score-percentage">${assignment.percentage}%</div>
                                                </div>
                                            </div>
                                        `;
                }).join('')}
                                </div>
                            </div>
                        ` : '<p style="color: #718096; margin-top: 15px; text-align: center;">No assignments yet</p>'}
                    </div>
                `;
            }).join('');
        }

        async function loadGradesData() {
            const childId = getSelectedChild();
            if (!childId) return;

            try {
                const data = await fetchChildGrades(childId);

                if (!data.bySubject || Object.keys(data.bySubject).length === 0) {
                    document.getElementById('gradesOverview').innerHTML = '';
                    document.getElementById('subjectsContainer').innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon"><i class="fas fa-graduation-cap"></i></div>
                            <h3>No Grades Available</h3>
                            <p>This student doesn't have any graded assignments yet.</p>
                        </div>
                    `;
                } else {
                    renderGradesOverview(data.overallStatistics);
                    renderSubjects(data.bySubject);
                }

                document.getElementById('contentContainer').style.display = 'block';
            } catch (error) {
                console.error('Error loading grades data:', error);
                showAlert('error', 'Failed to load grades data. Please try again.');
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
                await loadGradesData();

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
