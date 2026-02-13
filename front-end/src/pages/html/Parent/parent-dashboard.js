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

        // Check if user needs to change password
        function checkMustChangePassword() {
            const mustChange = localStorage.getItem('mustChangePassword');
            return mustChange === 'true';
        }

        // Show password change modal
        function showPasswordChangeModal() {
            const modal = document.getElementById('passwordChangeModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        // Hide password change modal
        function hidePasswordChangeModal() {
            const modal = document.getElementById('passwordChangeModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        // Handle password change form submission
        async function handlePasswordChange(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitBtn = document.getElementById('changePasswordBtn');

            // Validation
            if (newPassword !== confirmPassword) {
                showAlert('error', 'New passwords do not match');
                return;
            }

            if (newPassword.length < 6) {
                showAlert('error', 'New password must be at least 6 characters');
                return;
            }

            if (currentPassword === newPassword) {
                showAlert('error', 'New password must be different from current password');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Changing Password...';

            try {
                const token = getAuthToken();
                await axios.put(`${API_URL}/users/change-password`, {
                    currentPassword,
                    newPassword
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Clear the flag
                localStorage.setItem('mustChangePassword', 'false');
                
                showAlert('success', 'Password changed successfully! Welcome to your dashboard.');
                hidePasswordChangeModal();
                
            } catch (error) {
                console.error('Password change error:', error);
                const errorMsg = error.response?.data?.message || 'Failed to change password';
                showAlert('error', errorMsg);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Change Password';
            }
        }

        // ============================================================================
        // CHILD DATE OF BIRTH FUNCTIONS
        // ============================================================================

        // Helper function to check if dateOfBirth is valid
        function isValidDateOfBirth(dob) {
            if (!dob || dob === '' || dob === null || dob === undefined) {
                return false;
            }
            
            // Check if it's a valid date
            const dobDate = new Date(dob);
            if (isNaN(dobDate.getTime())) {
                return false;
            }
            
            return true;
        }

        // Check if any children need date of birth
        function checkChildrenNeedDob() {
            // Don't show DOB modal if password change modal is showing
            if (checkMustChangePassword()) {
                return;
            }

            for (const child of allChildren) {
                if (!isValidDateOfBirth(child.student.dateOfBirth)) {
                    showChildDobModal(child.student);
                    break; // Show one at a time
                }
            }
        }

        // Show child DOB modal
        function showChildDobModal(child) {
            const modal = document.getElementById('childDobModal');
            const childIdInput = document.getElementById('childIdForDob');
            const childDobMessage = document.getElementById('childDobMessage');
            const dobInput = document.getElementById('childDobInput');

            if (modal && childIdInput) {
                childIdInput.value = child._id;
                if (childDobMessage) {
                    childDobMessage.textContent = `Please enter ${child.name}'s date of birth to continue.`;
                }
                // Set max date to today
                if (dobInput) {
                    const today = new Date().toISOString().split('T')[0];
                    dobInput.max = today;
                }
                modal.classList.remove('hidden');
            }
        }

        // Hide child DOB modal
        function hideChildDobModal() {
            const modal = document.getElementById('childDobModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        // Handle child DOB form submission
        async function handleChildDobSubmit(e) {
            e.preventDefault();
            
            const childId = document.getElementById('childIdForDob').value;
            const dateOfBirth = document.getElementById('childDobInput').value;
            const submitBtn = document.getElementById('saveChildDobBtn');

            if (!dateOfBirth) {
                showAlert('error', 'Please select the date of birth');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                const token = getAuthToken();
                await axios.put(`${API_URL}/users/update-child-dob/${childId}`, {
                    dateOfBirth
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Update local data
                const child = allChildren.find(c => c.student._id === childId);
                if (child) {
                    child.student.dateOfBirth = dateOfBirth;
                }

                showAlert('success', 'Date of birth saved successfully!');
                hideChildDobModal();

                // Check if there are more children without DOB
                setTimeout(() => checkChildrenNeedDob(), 500);
                
            } catch (error) {
                console.error('Child DOB update error:', error);
                const errorMsg = error.response?.data?.message || 'Failed to save date of birth';
                showAlert('error', errorMsg);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save & Continue';
            }
        }

        // ============================================================================
        // END CHILD DATE OF BIRTH FUNCTIONS
        // ============================================================================

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

        // Store selected child
        function setSelectedChild(childId) {
            currentChildId = childId;
            localStorage.setItem('selectedChildId', childId);
            updateChildTabs();
            loadChildData();
        }

        // Get selected child
        function getSelectedChild() {
            return currentChildId || localStorage.getItem('selectedChildId');
        }

        // API Calls
        async function fetchParentOverview() {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/attendance/parent/overview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        }

        async function fetchChildSummary(childId) {
            const token = getAuthToken();
            const response = await axios.get(`${API_URL}/schedules/parent/child/${childId}/summary`, {
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

        // Rendering Functions
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

        function renderSummary(summary) {
            const container = document.getElementById('summarySection');
            container.innerHTML = `
                <div class="summary-card">
                    <div class="summary-icon"><i class="fas fa-chalkboard"></i></div>
                    <div class="summary-value">${summary.scheduleCount || 0}</div>
                    <div class="summary-label">Total Classes</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="summary-value">${summary.overallAverage || 0}%</div>
                    <div class="summary-label">Overall Grade</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon"><i class="fas fa-clipboard-check"></i></div>
                    <div class="summary-value">${summary.gradesCount || 0}</div>
                    <div class="summary-label">Graded Work</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon"><i class="fas fa-tasks"></i></div>
                    <div class="summary-value">${summary.pendingAssignments || 0}</div>
                    <div class="summary-label">Pending Work</div>
                </div>
                <div class="summary-card">
                    <div class="summary-icon"><i class="fas fa-file-upload"></i></div>
                    <div class="summary-value">${summary.totalSubmissions || 0}</div>
                    <div class="summary-label">Submissions</div>
                </div>
            `;
        }

        function renderSchedule(schedules) {
            const container = document.getElementById('scheduleContent');

            if (!schedules || schedules.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-calendar-week"></i></div>
                        <h3>No Schedule Available</h3>
                        <p>This student doesn't have any classes scheduled today.</p>
                    </div>
                `;
                return;
            }

            const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const todaySchedules = schedules.filter(s => {
                if (!s.dayOfWeek) return false;
                const scheduleDay = s.dayOfWeek.charAt(0).toUpperCase() + s.dayOfWeek.slice(1).toLowerCase();
                return scheduleDay === today;
            });

            if (todaySchedules.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-calendar-day"></i></div>
                        <h3>No Classes Today</h3>
                        <p>There are no classes scheduled for today (${today}).</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="day-card">
                    <div class="day-header"><i class="fas fa-calendar-day"></i> ${today}</div>
                    <div class="class-list">
                        ${todaySchedules.map(schedule => `
                            <div class="class-card">
                                <div class="class-time">${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</div>
                                <div class="class-subject">${schedule.subject || 'Subject N/A'}</div>
                                <div class="class-teacher"><i class="fas fa-user"></i> ${schedule.teacher?.name || 'N/A'}${schedule.room ? ` • Room ${schedule.room}` : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        async function loadChildData() {
            const childId = getSelectedChild();
            if (!childId) return;

            try {
                const [summary, schedule] = await Promise.all([
                    fetchChildSummary(childId),
                    fetchChildSchedule(childId)
                ]);

                renderSummary(summary.summary);
                renderSchedule(schedule.schedules);

                document.getElementById('contentContainer').classList.remove('hidden');

                // Load teacher announcements for this child (non-blocking)
                try {
                    await loadChildTeacherAnnouncements(childId);
                } catch (annError) {
                    console.error('Error loading teacher announcements:', annError);
                }

                // Render charts with child data (non-blocking)
                try {
                    await renderParentCharts(childId, summary.summary);
                } catch (chartError) {
                    console.error('Error rendering charts:', chartError);
                }

            } catch (error) {
                console.error('Error loading child data:', error);
                document.getElementById('contentContainer').classList.remove('hidden');
                document.getElementById('summarySection').innerHTML = '';
                document.getElementById('scheduleContent').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-chart-bar"></i></div>
                        <h3>No Data Available</h3>
                        <p>This student doesn't have any data yet. Data will appear here once attendance is recorded and assignments are graded.</p>
                    </div>
                `;
            }
        }

        // ============================================================================
        // TEACHER ANNOUNCEMENTS FOR PARENT
        // ============================================================================

        async function loadChildTeacherAnnouncements(childId) {
            const container = document.getElementById('parentTeacherAnnouncementsList');
            if (!container) return;

            try {
                const token = getAuthToken();
                const response = await axios.get(`${API_URL}/announcements/parent/child/${childId}/announcements`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const announcements = response.data.announcements || [];
                renderParentTeacherAnnouncements(announcements);
            } catch (error) {
                console.error('Error loading child teacher announcements:', error);
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <p>Could not load announcements</p>
                    </div>
                `;
            }
        }

        function renderParentTeacherAnnouncements(announcements) {
            const container = document.getElementById('parentTeacherAnnouncementsList');
            if (!container) return;

            if (announcements.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon"><i class="fas fa-inbox"></i></div>
                        <h3>No Announcements</h3>
                        <p>No teacher announcements for your child at this time.</p>
                    </div>
                `;
                return;
            }

            // Separate by type
            const teacherAnnouncements = announcements.filter(a => a.type === 'announcement');
            const assignments = announcements.filter(a => a.type === 'assignment');
            const quizzes = announcements.filter(a => a.type === 'quiz');

            container.innerHTML = `
                ${teacherAnnouncements.length > 0 ? `
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: var(--primary-color, #4f46e5); margin-bottom: 12px; font-size: 0.95rem;">
                            <i class="fas fa-megaphone"></i> Announcements (${teacherAnnouncements.length})
                        </h4>
                        ${teacherAnnouncements.slice(0, 5).map(ann => renderParentAnnouncementItem(ann)).join('')}
                    </div>
                ` : ''}
                ${assignments.length > 0 ? `
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: #4f46e5; margin-bottom: 12px; font-size: 0.95rem;">
                            <i class="fas fa-file-alt"></i> Assignments (${assignments.length})
                        </h4>
                        ${assignments.slice(0, 5).map(ann => renderParentAnnouncementItem(ann)).join('')}
                    </div>
                ` : ''}
                ${quizzes.length > 0 ? `
                    <div style="margin-bottom: 16px;">
                        <h4 style="color: #7c3aed; margin-bottom: 12px; font-size: 0.95rem;">
                            <i class="fas fa-question-circle"></i> Quizzes (${quizzes.length})
                        </h4>
                        ${quizzes.slice(0, 5).map(ann => renderParentAnnouncementItem(ann)).join('')}
                    </div>
                ` : ''}
            `;
        }

        function renderParentAnnouncementItem(ann) {
            const teacherName = ann.teacher?.name || 'Teacher';
            const dateStr = new Date(ann.createdAt).toLocaleDateString();
            const icon = ann.type === 'quiz' ? 'fa-question-circle' :
                         ann.type === 'assignment' ? 'fa-file-alt' : 'fa-bullhorn';
            const dueStr = ann.dueDate ? `Due: ${new Date(ann.dueDate).toLocaleDateString()}` : '';

            return `
                <div class="announcement-item" style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: var(--card-bg, #fff);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; margin-bottom: 4px;">
                                <i class="fas ${icon}" style="margin-right: 6px;"></i>
                                ${ann.title}
                            </div>
                            ${ann.description ? `<p style="color: #64748b; font-size: 0.9rem; margin: 4px 0;">${ann.description}</p>` : ''}
                            <div style="display: flex; gap: 16px; font-size: 0.85rem; color: #94a3b8; margin-top: 6px;">
                                <span><i class="fas fa-user"></i> ${teacherName}</span>
                                <span><i class="fas fa-book"></i> ${ann.subject}</span>
                                <span><i class="fas fa-calendar"></i> ${dateStr}</span>
                                ${dueStr ? `<span><i class="fas fa-clock"></i> ${dueStr}</span>` : ''}
                            </div>
                        </div>
                        <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; background: ${ann.priority === 'high' ? '#fef2f2' : ann.priority === 'medium' ? '#fffbeb' : '#f0fdf4'}; color: ${ann.priority === 'high' ? '#ef4444' : ann.priority === 'medium' ? '#f59e0b' : '#22c55e'};">
                            ${ann.priority || 'normal'}
                        </span>
                    </div>
                </div>
            `;
        }

        // ============================================================================
        // END TEACHER ANNOUNCEMENTS FOR PARENT
        // ============================================================================

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedChildId');
            localStorage.removeItem('mustChangePassword');
            window.location.href = '../login.html';
        }

        // ============================================================================
        // PARENT CHARTS FUNCTIONS
        // ============================================================================

        // Store chart instances for cleanup
        let parentChartInstances = {
            attendance: null,
            tasks: null,
            subjects: null
        };

        // Destroy existing chart if exists
        function destroyChart(chartKey) {
            if (parentChartInstances[chartKey]) {
                parentChartInstances[chartKey].destroy();
                parentChartInstances[chartKey] = null;
            }
        }

        // Render all parent charts
        async function renderParentCharts(childId, summary) {
            await renderParentAttendanceChart(childId);
            renderParentTasksChart(summary);
            await renderParentSubjectChart(childId);
        }

        // Child's Attendance Chart (Doughnut)
        async function renderParentAttendanceChart(childId) {
            const ctx = document.getElementById('parentAttendanceChart');
            if (!ctx) return;

            destroyChart('attendance');

            try {
                const token = getAuthToken();
                const response = await axios.get(`${API_URL}/attendance/parent/child/${childId}/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const stats = response.data.stats || { present: 0, absent: 0, late: 0, excused: 0 };
                const total = stats.present + stats.absent + stats.late + stats.excused;

                if (total === 0) {
                    parentChartInstances.attendance = new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['No Data'],
                            datasets: [{
                                data: [1],
                                backgroundColor: ['#e2e8f0'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            cutout: '65%',
                            plugins: { legend: { display: false } }
                        }
                    });
                    return;
                }

                parentChartInstances.attendance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Present', 'Absent', 'Late', 'Excused'],
                        datasets: [{
                            data: [stats.present, stats.absent, stats.late, stats.excused],
                            backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
                            borderColor: '#ffffff',
                            borderWidth: 3,
                            hoverOffset: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 12,
                                    usePointStyle: true,
                                    pointStyle: 'circle',
                                    font: { size: 11 }
                                }
                            },
                            tooltip: {
                                backgroundColor: '#1e293b',
                                padding: 10,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        const percentage = ((context.raw / total) * 100).toFixed(1);
                                        return `${context.label}: ${context.raw} (${percentage}%)`;
                                    }
                                }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error loading attendance chart:', error);
            }
        }

        // Child's Tasks Progress Chart (Doughnut)
        function renderParentTasksChart(summary) {
            const ctx = document.getElementById('parentTasksChart');
            if (!ctx) return;

            destroyChart('tasks');

            const completed = summary.totalSubmissions || 0;
            const pending = summary.pendingAssignments || 0;
            const total = completed + pending;

            if (total === 0) {
                parentChartInstances.tasks = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['No Tasks'],
                        datasets: [{
                            data: [1],
                            backgroundColor: ['#e2e8f0'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: { legend: { display: false } }
                    }
                });
                return;
            }

            parentChartInstances.tasks = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Pending'],
                    datasets: [{
                        data: [completed, pending],
                        backgroundColor: ['#10b981', '#f59e0b'],
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 12,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 10,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return `${context.label}: ${context.raw} task${context.raw !== 1 ? 's' : ''}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Child's Subject Performance Chart (Bar)
        async function renderParentSubjectChart(childId) {
            const ctx = document.getElementById('parentSubjectChart');
            if (!ctx) return;

            destroyChart('subjects');

            try {
                const token = getAuthToken();
                const response = await axios.get(`${API_URL}/announcements/parent/child/${childId}/grades`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const bySubject = response.data.bySubject || {};
                const subjects = Object.keys(bySubject).slice(0, 6);
                
                if (subjects.length === 0) {
                    parentChartInstances.subjects = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: ['No Grades Yet'],
                            datasets: [{
                                data: [0],
                                backgroundColor: ['#e2e8f0']
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } }
                        }
                    });
                    return;
                }

                const averages = subjects.map(s => parseFloat(bySubject[s].average) || 0);
                
                const colors = averages.map(avg => {
                    if (avg >= 80) return '#10b981';
                    if (avg >= 60) return '#f59e0b';
                    return '#ef4444';
                });

                parentChartInstances.subjects = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: subjects,
                        datasets: [{
                            label: 'Grade %',
                            data: averages,
                            backgroundColor: colors,
                            borderRadius: 6,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#1e293b',
                                padding: 10,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        return `Grade: ${context.raw}%`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                                ticks: { 
                                    font: { size: 11 }, 
                                    color: '#64748b',
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 10 }, color: '#64748b' }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error loading subject chart:', error);
                // Fallback chart
                parentChartInstances.subjects = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['No Data'],
                        datasets: [{
                            data: [0],
                            backgroundColor: ['#e2e8f0']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }
                });
            }
        }

        // ============================================================================
        // END PARENT CHARTS FUNCTIONS
        // ============================================================================

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

                // Check if password change is required
                if (checkMustChangePassword()) {
                    showPasswordChangeModal();
                }

                // Setup password change form handler
                const passwordForm = document.getElementById('passwordChangeForm');
                if (passwordForm) {
                    passwordForm.addEventListener('submit', handlePasswordChange);
                }

                // Setup child DOB form handler
                const childDobForm = document.getElementById('childDobForm');
                if (childDobForm) {
                    childDobForm.addEventListener('submit', handleChildDobSubmit);
                }

                const data = await fetchParentOverview();
                document.getElementById('loadingContainer').classList.add('hidden');

                if (!data.children || data.children.length === 0) {
                    document.getElementById('noChildrenMessage').classList.remove('hidden');
                    return;
                }

                allChildren = data.children;

                // Set first child as selected if no child is selected
                if (!getSelectedChild() && allChildren.length > 0) {
                    currentChildId = allChildren[0].student._id;
                    localStorage.setItem('selectedChildId', currentChildId);
                }

                document.getElementById('childrenSelector').classList.remove('hidden');
                renderChildrenTabs(allChildren);
                await loadChildData();

                // Check if any child needs date of birth filled
                checkChildrenNeedDob();

            } catch (error) {
                console.error('Initialization error:', error);

                if (error.response?.status === 401 || error.response?.status === 403) {
                    showAlert('error', 'Session expired. Please login again.');
                    setTimeout(() => window.location.href = 'login.html', 2000);
                } else {
                    showAlert('error', 'Failed to load dashboard data');
                    document.getElementById('loadingContainer').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading data';
                }
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
