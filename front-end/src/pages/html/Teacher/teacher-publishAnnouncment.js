        const API_URL = 'http://localhost:5001/api';
        let currentType = 'announcement';
        let selectedPriority = 'medium';
        let questionCounter = 0;
        let selectedFiles = [];

        const getToken = () => localStorage.getItem('token');

        // Grade and Section selection functions
        function selectAllGrades() {
            document.querySelectorAll('input[name="targetGrades"]').forEach(cb => cb.checked = true);
            updateAudienceSummary();
        }

        function clearAllGrades() {
            document.querySelectorAll('input[name="targetGrades"]').forEach(cb => cb.checked = false);
            updateAudienceSummary();
        }

        function selectAllSections() {
            document.querySelectorAll('input[name="targetSections"]').forEach(cb => cb.checked = true);
            updateAudienceSummary();
        }

        function clearAllSections() {
            document.querySelectorAll('input[name="targetSections"]').forEach(cb => cb.checked = false);
            updateAudienceSummary();
        }

        function getSelectedGrades() {
            return Array.from(document.querySelectorAll('input[name="targetGrades"]:checked')).map(cb => cb.value);
        }

        function getSelectedSections() {
            return Array.from(document.querySelectorAll('input[name="targetSections"]:checked')).map(cb => cb.value);
        }

        function updateAudienceSummary() {
            const grades = getSelectedGrades();
            const sections = getSelectedSections();
            const summaryEl = document.getElementById('audienceSummary');
            const summaryText = document.getElementById('summaryText');
            
            if (grades.length === 0 && sections.length === 0) {
                summaryEl.classList.remove('has-selection');
                summaryText.textContent = 'No audience selected - will target all your students';
            } else {
                summaryEl.classList.add('has-selection');
                const gradeLabels = grades.map(g => g.replace('grade', 'Grade ').replace('kg', 'KG '));
                const sectionLabels = sections.map(s => `Section ${s}`);
                
                let text = 'Targeting: ';
                if (grades.length > 0) {
                    text += gradeLabels.join(', ');
                }
                if (sections.length > 0) {
                    if (grades.length > 0) text += ' | ';
                    text += sectionLabels.join(', ');
                }
                summaryText.textContent = text;
            }
        }

        async function apiCall(endpoint, options = {}) {
            const token = getToken();
            const headers = {
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Don't add Content-Type for FormData
            if (!(options.body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
            }

            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'API Error');
            }

            return response.json();
        }

        function showAlert(message, type = 'success') {
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

        // File upload handlers
        const fileInput = document.getElementById('fileInput');
        const fileUploadSection = document.getElementById('fileUploadSection');
        const fileList = document.getElementById('fileList');

        fileInput.addEventListener('change', handleFileSelect);

        // Drag and drop
        fileUploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadSection.classList.add('drag-over');
        });

        fileUploadSection.addEventListener('dragleave', () => {
            fileUploadSection.classList.remove('drag-over');
        });

        fileUploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadSection.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            addFiles(files);
        });

        function handleFileSelect(e) {
            const files = Array.from(e.target.files);
            addFiles(files);
        }

        function addFiles(files) {
            const validFiles = files.filter(file => {
                // Check file size (10MB)
                if (file.size > 10 * 1024 * 1024) {
                    showAlert(`${file.name} is too large. Max size is 10MB`, 'error');
                    return false;
                }
                return true;
            });

            selectedFiles = [...selectedFiles, ...validFiles];
            renderFileList();
        }

        function renderFileList() {
            fileList.innerHTML = '';
            
            selectedFiles.forEach((file, index) => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                
                const icon = getFileIcon(file.type);
                const size = formatFileSize(file.size);
                
                fileItem.innerHTML = `
                    <div class="file-info">
                        <i class="fas ${icon} file-icon"></i>
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${size}</div>
                        </div>
                    </div>
                    <button type="button" class="btn-remove-file" onclick="removeFile(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                fileList.appendChild(fileItem);
            });
        }

        function removeFile(index) {
            selectedFiles.splice(index, 1);
            renderFileList();
        }

        function getFileIcon(type) {
            if (type.includes('pdf')) return 'fa-file-pdf';
            if (type.includes('word') || type.includes('document')) return 'fa-file-word';
            if (type.includes('image')) return 'fa-file-image';
            if (type.includes('powerpoint') || type.includes('presentation')) return 'fa-file-powerpoint';
            if (type.includes('excel') || type.includes('spreadsheet')) return 'fa-file-excel';
            if (type.includes('zip')) return 'fa-file-archive';
            return 'fa-file';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        // Load teacher subjects
        async function loadSubjects() {
            const subjectSelect = document.getElementById('subject');
            if (!subjectSelect) {
                console.error('Subject select not found');
                return;
            }
            
            const token = getToken();
            if (!token) {
                console.error('No token found');
                subjectSelect.innerHTML = '<option value="">No token - please login</option>';
                return;
            }
            
            try {
                console.log('Fetching subjects...');
                
                const response = await fetch('http://localhost:5001/api/users/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log('User data:', data);
                
                const teacher = data.user;
                
                // Clear the loading text
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';

                if (!teacher || !teacher.subjects || teacher.subjects.length === 0) {
                    console.log('No subjects found for teacher');
                    return;
                }

                console.log('Adding subjects:', teacher.subjects);
                
                // Add only teacher's subjects
                teacher.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
                
                // Auto-select if only one subject
                if (teacher.subjects.length === 1) {
                    subjectSelect.value = teacher.subjects[0];
                }
                
                console.log('Subjects loaded successfully');
            } catch (error) {
                console.error('Error loading subjects:', error);
                // Show all subjects as fallback
                subjectSelect.innerHTML = `
                    <option value="">Select Subject</option>
                    <option value="Math">Math</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="Computer">Computer</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Arabic">Arabic</option>
                    <option value="French">French</option>
                `;
            }
        }

        // Helper function to format grade display name
        function formatGradeLabel(grade) {
            if (grade.startsWith('kg')) {
                return 'KG ' + grade.replace('kg', '');
            } else if (grade.startsWith('grade')) {
                return 'Grade ' + grade.replace('grade', '');
            }
            return grade;
        }

        // Load teacher's assigned classes (grades and sections)
        async function loadTeacherClasses() {
            const gradesGrid = document.getElementById('gradesGrid');
            const sectionsGrid = document.getElementById('sectionsGrid');
            
            const token = getToken();
            if (!token) {
                console.error('No token for loading classes');
                if (gradesGrid) gradesGrid.innerHTML = '<div class="no-classes-message"><i class="fas fa-exclamation-circle"></i> Please login to view your classes</div>';
                if (sectionsGrid) sectionsGrid.innerHTML = '';
                return;
            }
            
            try {
                console.log('Fetching teacher classes...');
                
                const response = await fetch('http://localhost:5001/api/schedules/my-classes', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Teacher classes data:', data);
                
                const { grades, sections } = data;
                
                // Populate grades
                if (!grades || grades.length === 0) {
                    gradesGrid.innerHTML = '<div class="no-classes-message"><i class="fas fa-info-circle"></i> No grades assigned. Contact admin to assign you to classes.</div>';
                } else {
                    gradesGrid.innerHTML = grades.map(grade => `
                        <label class="checkbox-item">
                            <input type="checkbox" name="targetGrades" value="${grade}">
                            <span class="checkbox-label">${formatGradeLabel(grade)}</span>
                        </label>
                    `).join('');
                }
                
                // Populate sections
                if (!sections || sections.length === 0) {
                    sectionsGrid.innerHTML = '<div class="no-classes-message"><i class="fas fa-info-circle"></i> No sections assigned.</div>';
                } else {
                    sectionsGrid.innerHTML = sections.map(section => `
                        <label class="checkbox-item">
                            <input type="checkbox" name="targetSections" value="${section}">
                            <span class="checkbox-label">Section ${section}</span>
                        </label>
                    `).join('');
                }
                
                // Add change listeners for the newly created checkboxes
                document.querySelectorAll('input[name="targetGrades"], input[name="targetSections"]').forEach(cb => {
                    cb.addEventListener('change', updateAudienceSummary);
                });
                
                console.log('Teacher classes loaded successfully');
            } catch (error) {
                console.error('Error loading teacher classes:', error);
                gradesGrid.innerHTML = '<div class="no-classes-message"><i class="fas fa-exclamation-triangle"></i> Error loading classes. Please refresh.</div>';
                sectionsGrid.innerHTML = '';
            }
        }

        // Type selection
        document.querySelectorAll('.type-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.type-option').forEach(o => o.classList.remove('active'));
                this.classList.add('active');
                currentType = this.dataset.type;

                const taskFields = document.getElementById('taskFields');
                const questionsSection = document.getElementById('questionsSection');

                if (currentType === 'assignment' || currentType === 'quiz') {
                    taskFields.style.display = 'grid';
                    document.getElementById('dueDate').required = true;
                    document.getElementById('totalPoints').required = true;
                } else {
                    taskFields.style.display = 'none';
                    document.getElementById('dueDate').required = false;
                    document.getElementById('totalPoints').required = false;
                }

                if (currentType === 'quiz') {
                    questionsSection.classList.add('show');
                } else {
                    questionsSection.classList.remove('show');
                }
            });
        });

        // Priority selection
        document.querySelectorAll('.priority-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.priority-option').forEach(o => o.classList.remove('active'));
                this.classList.add('active');
                selectedPriority = this.dataset.priority;
            });
        });

        // Add question
        function addQuestion() {
            questionCounter++;
            const questionsList = document.getElementById('questionsList');
            
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item';
            questionDiv.id = `question-${questionCounter}`;
            questionDiv.innerHTML = `
                <div class="question-header">
                    <h4>Question ${questionCounter}</h4>
                    <button type="button" class="btn-remove" onclick="removeQuestion(${questionCounter})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
                <div class="form-group">
                    <label>Question Text</label>
                    <input type="text" class="form-control question-text" placeholder="Enter question" required>
                </div>
                <div class="form-group">
                    <label>Question Type</label>
                    <select class="form-control question-type" onchange="updateQuestionOptions(${questionCounter})">
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="true-false">True/False</option>
                       
                    </select>
                </div>
                <div class="form-group">
                    <label>Points</label>
                    <input type="number" class="form-control question-points" min="0" value="10" required>
                </div>
                <div class="form-group options-container">
                    <label>Options</label>
                    <div class="options-list" id="options-${questionCounter}">
                        <div class="option-item">
                            <input type="text" class="form-control" placeholder="Option A" data-option="A">
                            <input type="radio" name="correct-${questionCounter}" value="A" required>
                        </div>
                        <div class="option-item">
                            <input type="text" class="form-control" placeholder="Option B" data-option="B">
                            <input type="radio" name="correct-${questionCounter}" value="B">
                        </div>
                        <div class="option-item">
                            <input type="text" class="form-control" placeholder="Option C" data-option="C">
                            <input type="radio" name="correct-${questionCounter}" value="C">
                        </div>
                        <div class="option-item">
                            <input type="text" class="form-control" placeholder="Option D" data-option="D">
                            <input type="radio" name="correct-${questionCounter}" value="D">
                        </div>
                    </div>
                </div>
            `;
            
            questionsList.appendChild(questionDiv);
        }

        function removeQuestion(id) {
            document.getElementById(`question-${id}`).remove();
        }

        function updateQuestionOptions(id) {
            const questionDiv = document.getElementById(`question-${id}`);
            const type = questionDiv.querySelector('.question-type').value;
            const optionsContainer = questionDiv.querySelector('.options-container');

            if (type === 'multiple-choice') {
                optionsContainer.style.display = 'block';
            } else if (type === 'true-false') {
                optionsContainer.style.display = 'block';
                optionsContainer.querySelector('.options-list').innerHTML = `
                    <div class="option-item">
                        <input type="text" class="form-control" value="True" readonly data-option="True">
                        <input type="radio" name="correct-${id}" value="True" required>
                    </div>
                    <div class="option-item">
                        <input type="text" class="form-control" value="False" readonly data-option="False">
                        <input type="radio" name="correct-${id}" value="False">
                    </div>
                `;
            } else {
                optionsContainer.style.display = 'none';
            }
        }

        // Form submission
        document.getElementById('contentForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            await publishContent();
        });

        async function publishContent(isDraft = false) {
            try {
                const formData = new FormData();
                
                // Add basic fields
                formData.append('type', currentType);
                formData.append('subject', document.getElementById('subject').value);
                formData.append('title', document.getElementById('title').value);
                formData.append('description', document.getElementById('description').value);
                formData.append('priority', selectedPriority);
                formData.append('status', isDraft ? 'draft' : 'published');

                // Add target grades and sections
                const targetGrades = getSelectedGrades();
                const targetSections = getSelectedSections();
                if (targetGrades.length > 0) {
                    formData.append('targetGrades', JSON.stringify(targetGrades));
                }
                if (targetSections.length > 0) {
                    formData.append('targetSections', JSON.stringify(targetSections));
                }

                // Add task-specific fields
                if (currentType === 'assignment' || currentType === 'quiz') {
                    formData.append('dueDate', document.getElementById('dueDate').value);
                    formData.append('totalPoints', document.getElementById('totalPoints').value);
                }

                // Add files
                selectedFiles.forEach(file => {
                    formData.append('attachments', file);
                });

                // Collect and add questions for quiz
                if (currentType === 'quiz') {
                    const questions = [];
                    document.querySelectorAll('.question-item').forEach(item => {
                        const questionText = item.querySelector('.question-text').value;
                        const questionType = item.querySelector('.question-type').value;
                        const points = parseInt(item.querySelector('.question-points').value);
                        
                        let options = [];
                        let correctAnswer = '';

                        if (questionType === 'multiple-choice' || questionType === 'true-false') {
                            const optionInputs = item.querySelectorAll('.options-list input[type="text"]');
                            options = Array.from(optionInputs).map(input => input.value).filter(v => v);
                            
                            const correctRadio = item.querySelector('input[type="radio"]:checked');
                            correctAnswer = correctRadio ? correctRadio.value : '';
                        }

                        questions.push({
                            question: questionText,
                            type: questionType,
                            options,
                            correctAnswer,
                            points
                        });
                    });

                    formData.append('questions', JSON.stringify(questions));
                }

                const result = await apiCall('/announcements', {
                    method: 'POST',
                    body: formData
                });

                showAlert(result.message, 'success');
                
                setTimeout(() => {
                    window.location.href = 'viewAnnouncment.html';
                }, 2000);

            } catch (error) {
                console.error('Error creating content:', error);
                showAlert(error.message, 'error');
            }
        }

        function saveDraft() {
            publishContent(true);
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded fired');
            const token = getToken();
            console.log('Token exists:', !!token);
            
            if (!token) {
                console.log('No token, redirecting...');
                window.location.href = 'home.html';
                return;
            }

            // Load teacher subjects and classes
            loadSubjects();
            loadTeacherClasses();
        });
        
        // Also try loading immediately in case DOMContentLoaded already fired
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(() => {
                const subjectSelect = document.getElementById('subject');
                if (subjectSelect && subjectSelect.options[0].text === 'Loading subjects...') {
                    console.log('Late loading subjects...');
                    loadSubjects();
                }
                const gradesGrid = document.getElementById('gradesGrid');
                if (gradesGrid && gradesGrid.innerHTML.includes('Loading your grades')) {
                    console.log('Late loading teacher classes...');
                    loadTeacherClasses();
                }
            }, 100);
        }
