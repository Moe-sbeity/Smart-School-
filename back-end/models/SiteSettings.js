import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
    // School Information
    schoolInfo: {
        name: { type: String, default: 'Smart School' },
        slogan: { type: String, default: 'Educational, trustworthy, and innovative' },
        foundedYear: { type: Number, default: 1985 },
        academicYear: { type: String, default: '2025-2026' }
    },

    // Contact Information
    contact: {
        mainOffice: {
            hours: { type: String, default: 'Mon-Fri, 8:00am - 4:00pm' },
            phone: { type: String, default: '(123) 456-7890' }
        },
        admissions: {
            email: { type: String, default: 'admissions@smartschool.edu' },
            phone: { type: String, default: '(555) 123-4567' }
        },
        studentServices: {
            email: { type: String, default: 'support@smartschool.edu' },
            phone: { type: String, default: '(555) 123-4568' }
        },
        counseling: {
            email: { type: String, default: 'counsel@smartschool.edu' },
            phone: { type: String, default: '(555) 123-4569' }
        },
        generalEmail: { type: String, default: 'info@smartschool.edu' }
    },

    // Location
    location: {
        address: { type: String, default: '123 Learning Avenue' },
        city: { type: String, default: 'Springfield' },
        state: { type: String, default: 'ST' },
        zipCode: { type: String, default: '12345' },
        country: { type: String, default: 'USA' },
        mapUrl: { type: String, default: '' },
        directionsUrl: { type: String, default: '' }
    },

    // Social Media Links
    socialMedia: {
        website: { type: String, default: 'https://smartschool.edu' },
        twitter: { type: String, default: 'https://twitter.com/smartschool' },
        instagram: { type: String, default: 'https://instagram.com/smartschool' },
        facebook: { type: String, default: 'https://facebook.com/smartschool' },
        linkedin: { type: String, default: '' },
        youtube: { type: String, default: '' }
    },

    // Admission Settings
    admissions: {
        isOpen: { type: Boolean, default: true },
        currentYear: { type: String, default: '2026' },
        priorityDeadline: { type: Date, default: new Date('2026-04-15') },
        regularDeadline: { type: Date, default: new Date('2026-06-01') },
        decisionsDate: { type: Date, default: new Date('2026-05-01') },
        requirements: [{
            name: { type: String },
            required: { type: Boolean, default: true }
        }],
        availableGrades: [{
            type: String
        }]
    },

    // Schedule Settings
    schedule: {
        sessionsPerDay: { type: Number, default: 7 },
        sessionDuration: { type: Number, default: 50 },
        breakDuration: { type: Number, default: 30 },
        breakAfterSession: { type: Number, default: 4 },
        dayStartTime: { type: String, default: '08:00' }
    },

    // Help & Support Settings
    helpDesk: {
        responseTime: { type: String, default: '24 hours' },
        supportTopics: [{
            value: { type: String },
            label: { type: String }
        }]
    },

    // FAQs
    faqs: [{
        question: { type: String },
        answer: { type: String },
        category: { type: String, default: 'general' },
        isActive: { type: Boolean, default: true }
    }],

    // Footer Settings
    footer: {
        copyrightYear: { type: Number, default: 2026 },
        quickLinks: [{
            label: { type: String },
            url: { type: String }
        }]
    },

    // Feature Toggles
    features: {
        onlineAdmissions: { type: Boolean, default: true },
        parentPortal: { type: Boolean, default: true },
        studentPortal: { type: Boolean, default: true },
        teacherPortal: { type: Boolean, default: true },
        onlinePayments: { type: Boolean, default: false },
        notifications: { type: Boolean, default: true }
    }

}, {
    timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({
            admissions: {
                requirements: [
                    { name: 'Completed application form', required: true },
                    { name: 'Official transcripts (last 2 years)', required: true },
                    { name: 'Two recommendation letters', required: true },
                    { name: 'Standardized test scores', required: false }
                ],
                availableGrades: ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']
            },
            helpDesk: {
                supportTopics: [
                    { value: 'admissions', label: 'Admissions Inquiry' },
                    { value: 'academics', label: 'Academic Information' },
                    { value: 'support', label: 'Technical Support' },
                    { value: 'feedback', label: 'Feedback & Suggestions' },
                    { value: 'general', label: 'General Question' }
                ]
            },
            footer: {
                quickLinks: [
                    { label: 'About Us', url: 'about.html' },
                    { label: 'Admissions', url: 'admission.html' },
                    { label: 'Academics', url: 'academics.html' },
                    { label: 'Contact', url: 'contact.html' }
                ]
            },
            faqs: [
                {
                    question: 'Is financial aid available?',
                    answer: 'Yes! We offer need-based scholarships and payment plans. Submit the aid application along with your admission form.',
                    category: 'admissions'
                },
                {
                    question: 'Do you accept mid-year transfers?',
                    answer: 'Transfers are considered on a rolling basis depending on seat availability. Contact admissions for current openings.',
                    category: 'admissions'
                },
                {
                    question: 'Are there entrance exams?',
                    answer: 'No formal entrance exams. Our assessment is holistic, including interviews and review of prior academic work.',
                    category: 'admissions'
                },
                {
                    question: 'How long is the review process?',
                    answer: 'Applications are typically reviewed within 5-7 business days. You\'ll receive email updates on your application status.',
                    category: 'admissions'
                }
            ]
        });
    }
    return settings;
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
