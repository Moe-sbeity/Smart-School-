document.addEventListener('DOMContentLoaded', function() {
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