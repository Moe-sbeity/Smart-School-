        const API_URL = 'http://localhost:5001/api';
        let currentAnnouncement = null;
        let allSubmissions = [];
        let currentFilter = 'all';
        let currentSubmission = null;
        let selectedSubmissions = new Set();

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

        function showError(message) {
            document.getElementById('errorContainer').innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
        }

        // File icon helpers
        function getFileIcon(fileType) {
            if (!fileType) return 'fa-file';
            if (fileType.includes('pdf')) return 'fa-file-pdf';
            if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
            if (fileType.includes('image')) return 'fa-file-image';
            if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'fa-file-powerpoint';
            if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
            if (fileType.includes('zip') || fileType.includes('archive')) return 'fa-file-archive';
            return 'fa-file';
        }

        function getFileIconColor(fileType) {
            if (!fileType) return '#666';
            if (fileType.includes('pdf')) return '#dc2626';
            if (fileType.includes('word')) return '#2563eb';
            if (fileType.includes('image')) return '#059669';
            if (fileType.includes('powerpoint')) return '#ea580c';
            if (fileType.includes('excel')) return '#16a34a';
            if (fileType.includes('zip')) return '#7c3aed';
            return '#666';
        }

        function formatFileName(fileName) {
            if (fileName.length > 30) {
                return fileName.substring(0, 27) + '...';
            }
            return fileName;
        }

        function formatFileSize(bytes) {
            if (!bytes) return 'Unknown size';
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        async function init() {
            const urlParams = new URLSearchParams(window.location.search);
            const announcementId = urlParams.get('id');

            if (!announcementId) {
                showError('No announcement ID provided');
                return;
            }

            try {
                await loadAnnouncementDetails(announcementId);
                await loadSubmissions(announcementId);
            } catch (error) {
                console.error('Error initializing:', error);
                showError(error.message);
            }
        }

        async function loadAnnouncementDetails(announcementId) {
            const data = await apiCall(`/announcements/${announcementId}`);
            currentAnnouncement = data.announcement;

            document.getElementById('announcementTitle').textContent = currentAnnouncement.title;
            
            const typeIcon = currentAnnouncement.type === 'quiz' ? 'question-circle' : 'file-text';
            const typeColor = currentAnnouncement.type === 'quiz' ? '#7c3aed' : '#3498db';

            document.getElementById('assignmentInfo').innerHTML = `
                <div class="info-item">
                    <i class="fas fa-${typeIcon}" style="color: ${typeColor}"></i>
                    <span>${currentAnnouncement.type.toUpperCase()}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-book"></i>
                    <span>${currentAnnouncement.subject}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    <span>Due: ${new Date(currentAnnouncement.dueDate).toLocaleDateString()}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-star"></i>
                    <span>${currentAnnouncement.totalPoints} points</span>
                </div>
            `;
        }

        async function loadSubmissions(announcementId) {
            try {
                const data = await apiCall(`/announcements/${announcementId}/submissions`);
                allSubmissions = data.submissions || [];

                updateStats();
                renderSubmissions();
            } catch (error) {
                document.getElementById('submissionsContainer').innerHTML = `
                    <div class="error">Failed to load submissions: ${error.message}</div>
                `;
            }
        }

        function updateStats() {
            const total = allSubmissions.length;
            const graded = allSubmissions.filter(s => s.status === 'graded').length;
            const pending = allSubmissions.filter(s => s.status === 'submitted').length;

            document.getElementById('totalSubmissions').textContent = total;
            document.getElementById('gradedCount').textContent = graded;
            document.getElementById('pendingCount').textContent = pending;

            const gradedSubmissions = allSubmissions.filter(s => s.grade !== undefined && s.grade !== null);
            if (gradedSubmissions.length > 0) {
                const avgGrade = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length;
                const avgPercentage = (avgGrade / currentAnnouncement.totalPoints) * 100;
                document.getElementById('averageGrade').textContent = avgPercentage.toFixed(1) + '%';
            } else {
                document.getElementById('averageGrade').textContent = '--';
            }
        }

        function filterSubmissions(filter) {
            currentFilter = filter;
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            renderSubmissions();
        }

        function renderSubmissions() {
            const container = document.getElementById('submissionsContainer');
            
            let filtered = allSubmissions;
            if (currentFilter === 'graded') {
                filtered = allSubmissions.filter(s => s.status === 'graded');
            } else if (currentFilter === 'pending') {
                filtered = allSubmissions.filter(s => s.status === 'submitted');
            } else if (currentFilter === 'late') {
                filtered = allSubmissions.filter(s => s.isLate);
            }

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No submissions found</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="submissions-list">
                    ${filtered.map(submission => {
                        const isGraded = submission.status === 'graded';
                        const gradePercent = isGraded ? ((submission.grade / currentAnnouncement.totalPoints) * 100).toFixed(1) : null;
                        const hasAttachments = submission.attachments && submission.attachments.length > 0;
                        
                        return `
                            <div class="submission-card ${selectedSubmissions.has(submission._id) ? 'selected' : ''}" onclick="viewSubmission('${submission._id}')">
                                <div class="submission-header">
                                    <div class="student-info">
                                        <input type="checkbox" class="student-checkbox" 
                                            ${selectedSubmissions.has(submission._id) ? 'checked' : ''}
                                            onclick="event.stopPropagation(); toggleSelection('${submission._id}')"
                                        />
                                        <div class="student-avatar">
                                            ${submission.student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div class="student-details">
                                            <div class="student-name">
                                                ${submission.student.name}
                                                ${hasAttachments ? `<i class="fas fa-paperclip" style="margin-left: 8px; color: #6c757d; font-size: 14px;"></i>` : ''}
                                            </div>
                                            <div class="student-email">${submission.student.email}</div>
                                        </div>
                                    </div>
                                    <div class="submission-status">
                                        ${isGraded 
                                            ? `<div class="grade-display">${submission.grade}/${currentAnnouncement.totalPoints} <span style="font-size: 14px; color: #6c757d;">(${gradePercent}%)</span></div>`
                                            : ''
                                        }
                                        <span class="badge badge-${isGraded ? 'graded' : 'pending'}">
                                            ${isGraded ? 'Graded' : 'Pending'}
                                        </span>
                                        ${submission.isLate ? '<span class="badge badge-late">Late</span>' : ''}
                                    </div>
                                </div>
                                <div class="submission-meta">
                                    <div class="meta-item">
                                        <i class="fas fa-clock"></i>
                                        Submitted: ${new Date(submission.submittedAt).toLocaleString()}
                                    </div>
                                    ${hasAttachments ? `
                                        <div class="meta-item">
                                            <i class="fas fa-paperclip"></i>
                                            ${submission.attachments.length} file(s) attached
                                        </div>
                                    ` : ''}
                                    ${isGraded ? `
                                        <div class="meta-item">
                                            <i class="fas fa-check-circle"></i>
                                            Graded: ${new Date(submission.gradedAt).toLocaleString()}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            updateExportButton();
        }

        function toggleSelection(submissionId) {
            if (selectedSubmissions.has(submissionId)) {
                selectedSubmissions.delete(submissionId);
            } else {
                selectedSubmissions.add(submissionId);
            }
            renderSubmissions();
        }

        function selectAll() {
            const filtered = getFilteredSubmissions();
            if (selectedSubmissions.size === filtered.length) {
                selectedSubmissions.clear();
                document.getElementById('selectAllBtn').innerHTML = '<i class="fas fa-check-square"></i> Select All';
            } else {
                filtered.forEach(s => selectedSubmissions.add(s._id));
                document.getElementById('selectAllBtn').innerHTML = '<i class="fas fa-times-circle"></i> Deselect All';
            }
            renderSubmissions();
        }

        function getFilteredSubmissions() {
            if (currentFilter === 'graded') {
                return allSubmissions.filter(s => s.status === 'graded');
            } else if (currentFilter === 'pending') {
                return allSubmissions.filter(s => s.status === 'submitted');
            } else if (currentFilter === 'late') {
                return allSubmissions.filter(s => s.isLate);
            }
            return allSubmissions;
        }

        function updateExportButton() {
            const exportBtn = document.getElementById('exportBtn');
            exportBtn.disabled = selectedSubmissions.size === 0;
        }

        function exportGrades() {
            const selected = allSubmissions.filter(s => selectedSubmissions.has(s._id));
            let csv = 'Student Name,Email,Grade,Max Points,Percentage,Status,Submitted At,Graded At\n';
            
            selected.forEach(sub => {
                const percentage = sub.grade ? ((sub.grade / currentAnnouncement.totalPoints) * 100).toFixed(1) : 'N/A';
                csv += `"${sub.student.name}","${sub.student.email}",${sub.grade || 'N/A'},${currentAnnouncement.totalPoints},${percentage},${sub.status},"${new Date(sub.submittedAt).toLocaleString()}","${sub.gradedAt ? new Date(sub.gradedAt).toLocaleString() : 'N/A'}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentAnnouncement.title.replace(/[^a-z0-9]/gi, '_')}_grades.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }

        function viewSubmission(submissionId) {
            currentSubmission = allSubmissions.find(s => s._id === submissionId);
            if (!currentSubmission) return;

            const modal = document.getElementById('gradingModal');
            const isGraded = currentSubmission.status === 'graded';
            const hasAttachments = currentSubmission.attachments && currentSubmission.attachments.length > 0;
            
            document.getElementById('modalStudentName').textContent = 
                `${currentSubmission.student.name}'s Submission`;

            document.getElementById('modalSubmissionMeta').innerHTML = `
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    Submitted: ${new Date(currentSubmission.submittedAt).toLocaleString()}
                </div>
                ${currentSubmission.isLate ? '<span class="badge badge-late">Late Submission</span>' : ''}
            `;

            let contentHTML = '';

            // Display submitted files if any
            if (hasAttachments) {
                contentHTML += `
                    <div class="submission-details" style="background: #f0f9ff; border: 2px solid #93c5fd; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                        <div class="section-title" style="color: #1e40af; margin-bottom: 16px;">
                            <i class="fas fa-paperclip"></i>
                            Submitted Files (${currentSubmission.attachments.length})
                        </div>
                        <div style="display: grid; gap: 12px;">
                            ${currentSubmission.attachments.map(attachment => `
                                <a href="http://localhost:5001${attachment.fileUrl}" 
                                   target="_blank" 
                                   download="${attachment.fileName}"
                                   style="display: flex; align-items: center; gap: 12px; padding: 14px; background: white; border: 1px solid #93c5fd; border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.2s;"
                                   onmouseover="this.style.borderColor='#1e40af'; this.style.backgroundColor='#f0f9ff'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)';"
                                   onmouseout="this.style.borderColor='#93c5fd'; this.style.backgroundColor='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <i class="fas ${getFileIcon(attachment.fileType)}" style="font-size: 28px; color: ${getFileIconColor(attachment.fileType)};"></i>
                                    <div style="flex: 1; min-width: 0;">
                                        <div style="font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e40af;" title="${attachment.fileName}">
                                            ${formatFileName(attachment.fileName)}
                                        </div>
                                        <div style="font-size: 0.85rem; color: #6c757d;">
                                            ${formatFileSize(attachment.fileSize)} • Click to download
                                        </div>
                                    </div>
                                    <i class="fas fa-download" style="color: #1e40af; font-size: 18px;"></i>
                                </a>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            if (currentAnnouncement.type === 'assignment' && currentSubmission.content) {
                contentHTML += `
                    <div class="submission-details">
                        <div class="section-title">
                            <i class="fas fa-file-text"></i>
                            Student Answer
                        </div>
                        <div class="submission-content">${currentSubmission.content}</div>
                    </div>
                `;
            }

            if (currentAnnouncement.type === 'quiz' && currentSubmission.answers) {
                const correctCount = currentSubmission.answers.filter(a => a.isCorrect).length;
                contentHTML += `
                    <div class="grade-preview">
                        <div>
                            <div class="grade-preview-text">Quiz Score</div>
                            <div style="font-size: 13px; color: #6c757d; margin-top: 4px;">
                                ${correctCount} of ${currentSubmission.answers.length} correct
                            </div>
                        </div>
                        <div class="grade-preview-value">
                            ${currentSubmission.grade || 0}/${currentAnnouncement.totalPoints}
                        </div>
                    </div>
                    <div class="submission-details">
                        <div class="section-title">
                            <i class="fas fa-question-circle"></i>
                            Quiz Answers
                        </div>
                        <div class="quiz-answers">
                            ${currentSubmission.answers.map((ans, index) => {
                                const question = currentAnnouncement.questions[index];
                                const isCorrect = ans.isCorrect;
                                
                                return `
                                    <div class="answer-item ${isCorrect ? 'correct' : 'incorrect'}">
                                        <div class="question-text">
                                            ${index + 1}. ${question.question}
                                        </div>
                                        <div class="answer-text">
                                            <strong>Answer:</strong> ${ans.answer}
                                        </div>
                                        ${question.correctAnswer ? `
                                            <div class="answer-text">
                                                <strong>Correct Answer:</strong> ${question.correctAnswer}
                                            </div>
                                        ` : ''}
                                        <span class="points-earned">
                                            ${ans.pointsEarned}/${question.points} points
                                        </span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            const isQuiz = currentAnnouncement.type === 'quiz';
            contentHTML += `
                <div class="grading-form">
                    <div class="section-title">
                        <i class="fas fa-graduation-cap"></i>
                        ${isGraded ? 'Update Grade' : 'Grade Submission'}
                    </div>
                    <form onsubmit="submitGrade(event)">
                        ${!isQuiz ? `
                        <div class="form-group">
                            <label class="form-label">
                                Grade (out of ${currentAnnouncement.totalPoints})
                            </label>
                            <div class="grade-slider-container">
                                <input 
                                    type="range" 
                                    class="grade-slider" 
                                    id="gradeSlider"
                                    min="0" 
                                    max="${currentAnnouncement.totalPoints}"
                                    step="0.5"
                                    value="${currentSubmission.grade || 0}"
                                    oninput="updateGradeDisplay(this.value)"
                                />
                                <div class="grade-value-display" id="gradeValueDisplay">
                                    ${currentSubmission.grade || 0}/${currentAnnouncement.totalPoints}
                                </div>
                            </div>
                            <div class="quick-grades">
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(0)">0%</button>
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(0.5)">50%</button>
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(0.7)">70%</button>
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(0.8)">80%</button>
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(0.9)">90%</button>
                                <button type="button" class="quick-grade-btn" onclick="setQuickGrade(1)">100%</button>
                            </div>
                            <input type="hidden" id="gradeInput" value="${currentSubmission.grade || 0}" />
                        </div>
                        ` : `
                        <div class="form-group">
                            <label class="form-label">
                                Grade (Auto-calculated for Quiz)
                            </label>
                            <input 
                                type="number" 
                                class="form-input" 
                                id="gradeInput"
                                value="${currentSubmission.grade || 0}"
                                readonly
                                disabled
                            />
                        </div>
                        `}
                        <div class="form-group">
                            <label class="form-label">Feedback (Optional)</label>
                            <div class="feedback-templates">
                                <div class="feedback-templates-label">Quick Templates:</div>
                                <button type="button" class="template-btn" onclick="addFeedback('Great work! Keep it up.')">👍 Great work</button>
                                <button type="button" class="template-btn" onclick="addFeedback('Good effort, but please review the concepts.')">📚 Review needed</button>
                                <button type="button" class="template-btn" onclick="addFeedback('Well done! Excellent understanding.')">⭐ Excellent</button>
                                <button type="button" class="template-btn" onclick="addFeedback('Please see me during office hours.')">💬 See me</button>
                            </div>
                            <textarea 
                                class="form-input" 
                                id="feedbackInput"
                                placeholder="Provide feedback to the student..."
                            >${currentSubmission.feedback || ''}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeModal()">
                                Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i>
                                ${isGraded ? 'Update Grade' : 'Submit Grade'}
                            </button>
                        </div>
                    </form>
                </div>
            `;

            document.getElementById('modalSubmissionContent').innerHTML = contentHTML;
            modal.classList.add('active');
        }

        function updateGradeDisplay(value) {
            document.getElementById('gradeValueDisplay').textContent = 
                `${value}/${currentAnnouncement.totalPoints}`;
            document.getElementById('gradeInput').value = value;
        }

        function setQuickGrade(percentage) {
            const grade = (currentAnnouncement.totalPoints * percentage).toFixed(1);
            document.getElementById('gradeSlider').value = grade;
            updateGradeDisplay(grade);
        }

        function addFeedback(text) {
            const feedbackInput = document.getElementById('feedbackInput');
            if (feedbackInput.value && !feedbackInput.value.endsWith('\n')) {
                feedbackInput.value += '\n\n';
            }
            feedbackInput.value += text;
        }

        async function submitGrade(event) {
            event.preventDefault();

            const grade = parseFloat(document.getElementById('gradeInput').value);
            const feedback = document.getElementById('feedbackInput').value;

            try {
                await apiCall(`/announcements/${currentSubmission._id}/grade`, 'POST', {
                    grade,
                    feedback
                });

                if (typeof Toast !== 'undefined') {
                    Toast.success('Grade submitted successfully!');
                }
                closeModal();
                
                const urlParams = new URLSearchParams(window.location.search);
                await loadSubmissions(urlParams.get('id'));
            } catch (error) {
                console.error('Grading error:', error);
                if (typeof Toast !== 'undefined') {
                    Toast.error('Error submitting grade: ' + error.message);
                }
            }
        }

        function closeModal() {
            document.getElementById('gradingModal').classList.remove('active');
            currentSubmission = null;
        }

        document.getElementById('gradingModal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            const token = getToken();
            if (!token) {
                showError('Please log in to access this page');
                setTimeout(() => window.location.href = 'login.html', 2000);
                return;
            }
            init();
        });
