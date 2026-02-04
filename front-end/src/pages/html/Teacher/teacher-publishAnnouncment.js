        const API_URL = 'http://localhost:5001/api';
        let currentType = 'announcement';
        let selectedPriority = 'medium';
        let questionCounter = 0;
        let selectedFiles = [];

        const getToken = () => localStorage.getItem('token');

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
            try {
                const data = await apiCall('/users/me');
                const teacher = data.user;

                const subjectSelect = document.getElementById('subject');
                teacher.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error loading subjects:', error);
                showAlert('Failed to load subjects', 'error');
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
            const token = getToken();
            if (!token) {
                window.location.href = 'home.html';
                return;
            }

            loadSubjects();
        });
