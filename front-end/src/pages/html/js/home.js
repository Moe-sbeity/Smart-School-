        const API_URL = 'http://localhost:5001/api';
        let currentUser = null;
        let allAnnouncements = [];

        async function checkAuth() {
            const token = localStorage.getItem('token');
            
            if (!token) {
                renderPortals(null);
                return;
            }

            try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const response = await axios.get(`${API_URL}/user/me`);
                currentUser = response.data.user;
                
                updateUserInfo(currentUser);
                renderPortals(currentUser);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                renderPortals(null);
            }
        }

        function updateUserInfo(user) {
            const userInfoDiv = document.getElementById('userInfo');
            
            if (user) {
                userInfoDiv.innerHTML = `
                    <div class="user-badge">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.name}</span>
                    </div>
                    <button class="btn btn-danger" onclick="logout()" style="padding: 10px 20px;">
                        Logout
                    </button>
                `;
            } else {
                userInfoDiv.innerHTML = `
                    <a href="../login.html" class="btn btn-primary" style="padding: 10px 20px;">Login</a>
                `;
            }
        }

        function logout() {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            currentUser = null;
            updateUserInfo(null);
            window.location.reload();
        }

        async function loadAnnouncements() {
            try {
                const response = await axios.get(`${API_URL}/admin-announcements`);
                allAnnouncements = response.data.announcements;
                
                const container = document.getElementById('announcementsContainer');
                
                if (allAnnouncements.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-bullhorn"></i>
                            <h3>No Announcements Yet</h3>
                            <p>Check back later for school updates and news</p>
                        </div>
                    `;
                    return;
                }

                // Helper function to get category class
                const getCategoryClass = (category) => {
                    const cat = (category || 'general').toLowerCase();
                    if (cat.includes('urgent') || cat.includes('important')) return 'urgent';
                    if (cat.includes('event') || cat.includes('activity')) return 'event';
                    return 'general';
                };

                // Helper function to get announcement icon based on category
                const getAnnouncementIcon = (category) => {
                    const cat = (category || 'general').toLowerCase();
                    if (cat.includes('urgent') || cat.includes('important')) return '⚠️';
                    if (cat.includes('event') || cat.includes('activity')) return '🎉';
                    if (cat.includes('academic') || cat.includes('exam')) return '📚';
                    if (cat.includes('sports') || cat.includes('athletic')) return '🏆';
                    return '📢';
                };

                // Display in news grid format
                const featured = allAnnouncements[0];
                const sidebar = allAnnouncements.slice(1, 4);

                container.innerHTML = `
                    <div class="news-grid">
                        <div class="featured-article" onclick="viewAnnouncement('${featured._id}')">
                            <div class="article-image">
                                <span class="category-badge">${featured.category || 'General'}</span>
                            </div>
                            <div class="article-content">
                                <div class="article-meta">
                                    <i class="far fa-calendar-alt"></i>
                                    <span>${new Date(featured.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    <span class="dot"></span>
                                    <i class="far fa-user"></i>
                                    <span>${featured.author?.name || 'Admin'}</span>
                                </div>
                                <h3>${featured.title}</h3>
                                <p>${featured.content.substring(0, 180)}${featured.content.length > 180 ? '...' : ''}</p>
                                <a class="btn-read-more">
                                    Read More 
                                    <i class="fas fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                        <div class="sidebar-news">
                            ${sidebar.length > 0 ? sidebar.map(ann => `
                                <div class="news-item" onclick="viewAnnouncement('${ann._id}')">
                                    <h4>${ann.title}</h4>
                                    <div class="news-date">
                                        <span>${new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        <span class="category-tag ${getCategoryClass(ann.category)}">${ann.category || 'General'}</span>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="news-item" style="text-align: center; cursor: default;">
                                    <h4 style="color: var(--text-muted);">More updates coming soon!</h4>
                                    <span class="news-date">Stay tuned for announcements</span>
                                </div>
                            `}
                        </div>
                    </div>
                `;

            } catch (error) {
                console.error('Error loading announcements:', error);
                document.getElementById('announcementsContainer').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Error Loading Announcements</h3>
                        <p>Please try again later</p>
                    </div>
                `;
            }
        }

        // View Announcement Details
        async function viewAnnouncement(announcementId) {
            try {
                const response = await axios.get(`${API_URL}/admin-announcements/${announcementId}`);
                const announcement = response.data.announcement;
                showAnnouncementModal(announcement);
            } catch (error) {
                console.error('Error loading announcement:', error);
                if (typeof Toast !== 'undefined') {
                    Toast.error('Failed to load announcement details');
                }
            }
        }

        // Show Announcement Modal
        function showAnnouncementModal(announcement) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            
            const getFileIcon = (fileName) => {
                const ext = fileName.split('.').pop().toLowerCase();
                const iconMap = {
                    'pdf': 'fa-file-pdf',
                    'doc': 'fa-file-word',
                    'docx': 'fa-file-word',
                    'xls': 'fa-file-excel',
                    'xlsx': 'fa-file-excel',
                    'ppt': 'fa-file-powerpoint',
                    'pptx': 'fa-file-powerpoint',
                    'txt': 'fa-file-alt',
                    'jpg': 'fa-file-image',
                    'jpeg': 'fa-file-image',
                    'png': 'fa-file-image',
                    'gif': 'fa-file-image'
                };
                return iconMap[ext] || 'fa-file';
            };

            const getCategoryClass = (category) => {
                const cat = (category || 'general').toLowerCase();
                if (cat.includes('urgent') || cat.includes('important')) return 'urgent';
                if (cat.includes('event') || cat.includes('activity')) return 'event';
                return 'general';
            };
            
            const attachmentsHtml = announcement.attachments && announcement.attachments.length > 0 ? `
                <div class="detail-row full-width">
                    <strong><i class="fas fa-paperclip"></i> Attachments</strong>
                    <div class="attachments-container">
                        ${announcement.attachments.map(att => `
                            <a href="${API_URL}/admin-announcements/${announcement._id}/attachments/${att._id}/download" 
                               target="_blank"
                               class="attachment-link">
                                <i class="fas ${getFileIcon(att.originalName)}"></i>
                                <span>${att.originalName}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : '';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-bullhorn" style="color: var(--primary); margin-right: 12px;"></i>Announcement Details</h3>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-row">
                            <strong><i class="fas fa-heading"></i> Title</strong>
                            <span>${announcement.title}</span>
                        </div>
                        <div class="detail-row">
                            <strong><i class="fas fa-tag"></i> Category</strong>
                            <span class="modal-tag ${getCategoryClass(announcement.category)}">${announcement.category || 'General'}</span>
                        </div>
                        <div class="detail-row full-width">
                            <strong><i class="fas fa-align-left"></i> Content</strong>
                            <p>${announcement.content}</p>
                        </div>
                        <div class="detail-row">
                            <strong><i class="fas fa-user"></i> Posted By</strong>
                            <span>${announcement.author?.name || 'Admin'}</span>
                        </div>
                        <div class="detail-row">
                            <strong><i class="fas fa-calendar-alt"></i> Date</strong>
                            <span>${new Date(announcement.createdAt).toLocaleDateString('en-US', { 
                                weekday: 'long',
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}</span>
                        </div>
                        ${attachmentsHtml}
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                <i class="fas fa-times"></i>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Close modal on clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            document.body.appendChild(modal);
        }

        // Load site settings
        async function loadSiteSettings() {
            try {
                const response = await fetch(`${API_URL}/settings`);
                const settings = await response.json();
                updateHomePageContent(settings);
            } catch (error) {
                console.error('Error loading site settings:', error);
            }
        }

        // Update home page content with settings
        function updateHomePageContent(settings) {
            // Update school name in various places
            if (settings.schoolInfo) {
                // Update logo text
                const logoTexts = document.querySelectorAll('.logo span:last-child, .logo-text');
                logoTexts.forEach(el => {
                    el.textContent = settings.schoolInfo.name || 'Smart School';
                });
                
                // Update page title slogan in hero section if exists
                const sloganEl = document.querySelector('.hero-slogan, .school-slogan');
                if (sloganEl && settings.schoolInfo.slogan) {
                    sloganEl.textContent = settings.schoolInfo.slogan;
                }
            }

            // Update footer
            updateFooter(settings);
        }

        // Update footer content
        function updateFooter(settings) {
            const schoolInfo = settings.schoolInfo;
            
            // Update school name in footer
            const footerLogo = document.querySelector('.footer .logo-text, .footer-brand .logo-text, footer .logo span');
            if (footerLogo && schoolInfo) {
                footerLogo.textContent = schoolInfo.name || 'Smart School';
            }
            
            // Update slogan in footer
            const footerSlogan = document.querySelector('.footer-brand p, footer .footer-about p');
            if (footerSlogan && schoolInfo?.slogan) {
                footerSlogan.textContent = schoolInfo.slogan;
            }
            
            // Update copyright year
            const copyrightP = document.querySelector('.footer-bottom p, footer .footer-bottom p');
            if (copyrightP) {
                const year = settings.footer?.copyrightYear || new Date().getFullYear();
                const schoolName = schoolInfo?.name || 'Smart School';
                copyrightP.textContent = `© ${year} ${schoolName}. All rights reserved.`;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            loadSiteSettings();
        });

        window.logout = logout;
