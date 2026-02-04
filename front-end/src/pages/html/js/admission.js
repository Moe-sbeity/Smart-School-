const API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('applicationForm');
    
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

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
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}