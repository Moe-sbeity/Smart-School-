const API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', async function() {
    // Load site settings
    await loadSiteSettings();
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            
            const name = document.getElementById('fullName').value;
            if (typeof Toast !== 'undefined') {
                Toast.success(`Thank you, ${name}! Your message has been sent. We will get back to you within 24 hours.`);
            }
            
            contactForm.reset(); 
        });
    }

    const actionButtons = document.querySelectorAll('.action-btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const actionText = button.textContent.trim();
            if (typeof Toast !== 'undefined') {
                Toast.info(`Simulating action: '${actionText}'. In a real application, this would trigger the appropriate function.`);
            }
        });
    });
});

// Load site settings and update page content
async function loadSiteSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        const settings = await response.json();
        
        updateContactInfo(settings);
        updateSocialLinks(settings);
        updateLocation(settings);
        updateFooter(settings);
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Update contact info section
function updateContactInfo(settings) {
    const contact = settings.contact;
    if (!contact) return;
    
    // Main Office
    const mainOfficeItem = document.querySelector('.contact-item:nth-child(1) .contact-info');
    if (mainOfficeItem && contact.mainOffice) {
        mainOfficeItem.querySelector('h4').textContent = 'Main Office';
        mainOfficeItem.querySelector('p').textContent = contact.mainOffice.hours || 'Mon-Fri, 8:00am - 4:00pm';
    }
    
    // Admissions
    const admissionsItem = document.querySelector('.contact-item:nth-child(2) .contact-info');
    if (admissionsItem && contact.admissions) {
        admissionsItem.querySelector('h4').textContent = 'Admissions';
        admissionsItem.querySelector('p').textContent = contact.admissions.email || 'admissions@smartschool.edu';
    }
    
    // Student Services
    const servicesItem = document.querySelector('.contact-item:nth-child(3) .contact-info');
    if (servicesItem && contact.studentServices) {
        servicesItem.querySelector('h4').textContent = 'Student Services';
        servicesItem.querySelector('p').textContent = contact.studentServices.email || 'support@smartschool.edu';
    }
    
    // Counseling
    const counselItem = document.querySelector('.contact-item:nth-child(4) .contact-info');
    if (counselItem && contact.counseling) {
        counselItem.querySelector('h4').textContent = 'Counseling';
        counselItem.querySelector('p').textContent = contact.counseling.email || 'counsel@smartschool.edu';
    }
}

// Update social links
function updateSocialLinks(settings) {
    const social = settings.socialMedia;
    if (!social) return;
    
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
        const iconEl = link.querySelector('.social-icon');
        if (!iconEl) return;
        
        if (iconEl.classList.contains('website') && social.website) {
            link.href = social.website;
        } else if (iconEl.classList.contains('twitter') && social.twitter) {
            link.href = social.twitter;
        } else if (iconEl.classList.contains('instagram') && social.instagram) {
            link.href = social.instagram;
        } else if (iconEl.classList.contains('facebook') && social.facebook) {
            link.href = social.facebook;
        }
    });
}

// Update location section
function updateLocation(settings) {
    const location = settings.location;
    if (!location) return;
    
    // Update map image
    const mapImg = document.querySelector('.map-container img');
    if (mapImg && location.mapUrl) {
        mapImg.src = location.mapUrl;
    }
    
    // Update address
    const addressText = document.querySelector('.address-text');
    if (addressText) {
        const schoolName = settings.schoolInfo?.name || 'Smart School';
        addressText.querySelector('h4').textContent = `${schoolName} Campus`;
        
        const fullAddress = [
            location.address,
            location.city,
            `${location.state} ${location.zipCode}`
        ].filter(Boolean).join(', ');
        
        addressText.querySelector('p').textContent = fullAddress || '123 Learning Avenue, Springfield, ST 12345';
    }
    
    // Update directions link
    const directionsBtn = document.querySelector('.location-info .btn-secondary');
    if (directionsBtn && location.directionsUrl) {
        directionsBtn.href = location.directionsUrl;
    }
}

// Update footer content
function updateFooter(settings) {
    // Update school name and slogan
    const footerAbout = document.querySelector('.footer-about');
    if (footerAbout && settings.schoolInfo) {
        const logoText = footerAbout.querySelector('.logo-text');
        if (logoText) {
            logoText.textContent = settings.schoolInfo.name || 'Smart School';
        }
        
        const sloganP = footerAbout.querySelector('p');
        if (sloganP && settings.schoolInfo.slogan) {
            sloganP.textContent = settings.schoolInfo.slogan;
        }
    }
    
    // Update copyright year
    const copyrightP = document.querySelector('.footer-bottom p');
    if (copyrightP) {
        const year = settings.footer?.copyrightYear || new Date().getFullYear();
        const schoolName = settings.schoolInfo?.name || 'Smart School';
        copyrightP.textContent = `© ${year} ${schoolName}. All rights reserved.`;
    }
}