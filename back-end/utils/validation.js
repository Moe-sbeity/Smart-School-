// Validation utility functions for the School System

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password 
 * @returns {object} { isValid: boolean, message: string }
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  if (password.length > 128) {
    return { isValid: false, message: 'Password must be less than 128 characters' };
  }
  return { isValid: true, message: '' };
};

/**
 * Sanitize string input (prevent XSS)
 * @param {string} str 
 * @returns {string}
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} id 
 * @returns {boolean}
 */
export const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Validate date format
 * @param {string} dateString 
 * @returns {boolean}
 */
export const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate time format (HH:MM)
 * @param {string} time 
 * @returns {boolean}
 */
export const isValidTime = (time) => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Valid roles in the system
 */
export const VALID_ROLES = ['student', 'teacher', 'parent', 'admin'];

/**
 * Valid subjects in the system
 */
export const VALID_SUBJECTS = [
  'Math', 'Physics', 'Chemistry', 'Biology', 'English', 
  'History', 'Geography', 'Computer', 'Computer Science', 
  'Arabic', 'French'
];

/**
 * Valid grades in the system
 */
export const VALID_GRADES = [
  'kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4',
  'grade5', 'grade6', 'grade7', 'grade8', 'grade9',
  'grade10', 'grade11', 'grade12'
];

/**
 * Valid sections in the system
 */
export const VALID_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * Valid days of the week
 */
export const VALID_DAYS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];

/**
 * Valid attendance statuses
 */
export const VALID_ATTENDANCE_STATUS = ['present', 'absent', 'late', 'excused'];

/**
 * Valid announcement types
 */
export const VALID_ANNOUNCEMENT_TYPES = ['announcement', 'assignment', 'quiz'];

/**
 * Valid announcement priorities
 */
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * Email domain validation by role
 */
export const EMAIL_DOMAINS = {
  student: '@student.com',
  parent: '@parent.com',
  teacher: '@teacher.com',
  admin: '@admin.com'
};

/**
 * Validate email matches role domain
 * @param {string} email 
 * @param {string} role 
 * @returns {boolean}
 */
export const validateEmailForRole = (email, role) => {
  const domain = EMAIL_DOMAINS[role];
  return domain ? email.endsWith(domain) : false;
};
