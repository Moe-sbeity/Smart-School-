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
                modal.style.display = 'flex';
            }
        }

        // Hide password change modal
        function hidePasswordChangeModal() {
            const modal = document.getElementById('passwordChangeModal');
            if (modal) {
                modal.style.display = 'none';
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
                modal.style.display = 'flex';
            }
        }

        // Hide child DOB modal
        function hideChildDobModal() {
            const modal = document.getElementById('childDobModal');
            if (modal) {
                modal.style.display = 'none';
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

                document.getElementById('contentContainer').style.display = 'block';
            } catch (error) {
                console.error('Error loading child data:', error);
                showAlert('error', 'Failed to load student data. Please try again.');
            }
        }

        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedChildId');
            localStorage.removeItem('mustChangePassword');
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
                document.getElementById('loadingContainer').style.display = 'none';

                if (!data.children || data.children.length === 0) {
                    document.getElementById('noChildrenMessage').style.display = 'block';
                    return;
                }

                allChildren = data.children;

                // Set first child as selected if no child is selected
                if (!getSelectedChild() && allChildren.length > 0) {
                    currentChildId = allChildren[0].student._id;
                    localStorage.setItem('selectedChildId', currentChildId);
                }

                document.getElementById('childrenSelector').style.display = 'block';
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
