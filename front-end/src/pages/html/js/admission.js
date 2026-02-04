const API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Load site settings first
    await loadSiteSettings();
    
    const form = document.getElementById('applicationForm');
    
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

// Load site settings and update page content
async function loadSiteSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        updateAdmissionDates(settings);
        updateRequirements(settings);
        updateFAQs(settings);
        updateContactCTA(settings);
        updateFooter(settings);
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Update admission key dates
function updateAdmissionDates(settings) {
    const admissions = settings.admissions;
    if (!admissions) return;
    
    // Update hero badge with year
    const heroBadge = document.querySelector('.hero-badge');
    if (heroBadge && admissions.currentYear) {
        heroBadge.innerHTML = `<i class="fas fa-graduation-cap"></i> Admissions ${admissions.currentYear}`;
    }
    
    // Update key dates section
    const dateItems = document.querySelectorAll('.date-item');
    
    // Applications status
    if (dateItems[0]) {
        const statusBadge = dateItems[0].querySelector('.date-badge');
        if (statusBadge && typeof admissions.isOpen !== 'undefined') {
            if (admissions.isOpen) {
                statusBadge.className = 'date-badge open';
                statusBadge.textContent = 'Open Now';
            } else {
                statusBadge.className = 'date-badge closed';
                statusBadge.textContent = 'Closed';
            }
        }
    }
    
    // Priority deadline
    if (dateItems[1] && admissions.priorityDeadline) {
        const dateValue = dateItems[1].querySelector('.date-value');
        if (dateValue) {
            dateValue.textContent = formatDate(admissions.priorityDeadline);
        }
    }
    
    // Decisions date
    if (dateItems[2] && admissions.decisionsDate) {
        const dateValue = dateItems[2].querySelector('.date-value');
        if (dateValue) {
            dateValue.textContent = formatDate(admissions.decisionsDate);
        }
    }
}

// Update requirements list
function updateRequirements(settings) {
    const requirements = settings.admissions?.requirements;
    if (!requirements || requirements.length === 0) return;
    
    const requirementsList = document.querySelector('.requirements-list');
    if (!requirementsList) return;
    
    requirementsList.innerHTML = '';
    requirements.forEach(req => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check-circle"></i> ${req.name}`;
        if (!req.required) {
            li.innerHTML += ' <span class="optional-tag">(Optional)</span>';
        }
        requirementsList.appendChild(li);
    });
}

// Update FAQ section
function updateFAQs(settings) {
    const faqs = settings.faqs;
    if (!faqs || faqs.length === 0) return;
    
    const faqGrid = document.querySelector('.faq-grid');
    if (!faqGrid) return;
    
    // Get only admission-related or general FAQs (up to 4)
    const admissionFAQs = faqs.filter(faq => 
        faq.category === 'admissions' || faq.category === 'general'
    ).slice(0, 4);
    
    if (admissionFAQs.length === 0) return;
    
    faqGrid.innerHTML = '';
    
    const icons = ['fa-dollar-sign', 'fa-exchange-alt', 'fa-file-alt', 'fa-clock'];
    admissionFAQs.forEach((faq, index) => {
        const faqItem = document.createElement('div');
        faqItem.className = 'faq-item';
        faqItem.innerHTML = `
            <div class="faq-icon"><i class="fas ${icons[index % icons.length]}"></i></div>
            <h4>${faq.question}</h4>
            <p>${faq.answer}</p>
        `;
        faqGrid.appendChild(faqItem);
    });
}

// Update contact CTA section
function updateContactCTA(settings) {
    const contact = settings.contact;
    if (!contact) return;
    
    // Update phone number in CTA
    const phoneBtn = document.querySelector('.cta-actions .btn-secondary');
    if (phoneBtn && contact.admissions?.phone) {
        phoneBtn.innerHTML = `<i class="fas fa-phone"></i> Call: ${contact.admissions.phone}`;
        phoneBtn.href = `tel:${contact.admissions.phone.replace(/[^0-9+]/g, '')}`;
    }
}

// Update footer content
function updateFooter(settings) {
    const schoolInfo = settings.schoolInfo;
    
    // Update school name in footer
    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand && schoolInfo) {
        const logoSpan = footerBrand.querySelector('.footer-logo span:last-child');
        if (logoSpan) {
            logoSpan.textContent = schoolInfo.name || 'Smart School';
        }
        
        const sloganP = footerBrand.querySelector('p');
        if (sloganP && schoolInfo.slogan) {
            sloganP.textContent = schoolInfo.slogan;
        }
    }
    
    // Update copyright year
    const copyrightP = document.querySelector('.footer-bottom p');
    if (copyrightP) {
        const year = settings.footer?.copyrightYear || new Date().getFullYear();
        const schoolName = schoolInfo?.name || 'Smart School';
        copyrightP.textContent = `© ${year} ${schoolName}. All rights reserved.`;
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

async function handleSubmit(e) {
    e.preventDefault();

    // Get form values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const grade = document.getElementById('grade').value;
    const intendedStart = document.getElementById('startDate').value.trim();
    const notes = document.getElementById('notes').value.trim();

    // Validate
    if (!fullName || !email || !grade || !intendedStart) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Validate date format (MM/YYYY)
    const dateRegex = /^(0[1-9]|1[0-2])\s*\/\s*\d{4}$/;
    if (!dateRegex.test(intendedStart)) {
        showNotification('Please enter date in MM/YYYY format', 'error');
        return;
    }

    // Disable submit button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const response = await fetch(`${API_URL}/admissions/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fullName,
                email,
                grade,
                intendedStart,
                notes
            })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Application submitted successfully! We will contact you soon.', 'success');
            
            // Reset form
            document.getElementById('applicationForm').reset();
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showNotification(data.message || 'Failed to submit application', 'error');
        }

    } catch (error) {
        console.error('Error submitting application:', error);
        showNotification('Network error. Please try again later.', 'error');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showNotification(message, type) {
    // Use Toast notification system
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