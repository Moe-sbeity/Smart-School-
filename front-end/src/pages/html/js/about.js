// About page JavaScript
const API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', async function() {
    // Load site settings first
    await loadSiteSettings();
    
    // Animate stat numbers on scroll
    const animateStats = () => {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const value = stat.textContent;
            // Add animation class
            stat.style.opacity = '0';
            stat.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                stat.style.transition = 'all 0.6s ease-out';
                stat.style.opacity = '1';
                stat.style.transform = 'translateY(0)';
            }, 100);
        });
    };

    // Observe stats section
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStats();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(statsSection);
    }

    // Add hover effects to value cards
    const valueCards = document.querySelectorAll('.value-card');
    valueCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// Load site settings and update page content
async function loadSiteSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        updateAboutContent(settings);
        updateFooter(settings);
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Update about page content with settings
function updateAboutContent(settings) {
    const schoolInfo = settings.schoolInfo;
    if (!schoolInfo) return;
    
    // Update school name mentions
    const schoolNameElements = document.querySelectorAll('.school-name, .highlight');
    schoolNameElements.forEach(el => {
        if (el.classList.contains('highlight') && el.textContent.includes('Smart School')) {
            el.textContent = schoolInfo.name || 'Smart School';
        }
    });
    
    // Update founded year if displayed
    const foundedYear = document.querySelector('.founded-year, .stat-number[data-type="founded"]');
    if (foundedYear && schoolInfo.foundedYear) {
        foundedYear.textContent = schoolInfo.foundedYear;
    }
}

// Update footer content
function updateFooter(settings) {
    const schoolInfo = settings.schoolInfo;
    
    // Update school name in footer
    const footerLogo = document.querySelector('.footer-logo span, .footer-brand .logo-text');
    if (footerLogo && schoolInfo) {
        footerLogo.textContent = schoolInfo.name || 'Smart School';
    }
    
    // Update slogan in footer
    const footerSlogan = document.querySelector('.footer-brand p, .footer-about p');
    if (footerSlogan && schoolInfo?.slogan) {
        footerSlogan.textContent = schoolInfo.slogan;
    }
    
    // Update copyright year
    const copyrightP = document.querySelector('.footer-bottom p');
    if (copyrightP) {
        const year = settings.footer?.copyrightYear || new Date().getFullYear();
        const schoolName = schoolInfo?.name || 'Smart School';
        copyrightP.textContent = `© ${year} ${schoolName}. All rights reserved.`;
    }
}
