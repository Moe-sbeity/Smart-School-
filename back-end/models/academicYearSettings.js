import mongoose from 'mongoose';

const termSchema = new mongoose.Schema({
  termNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 6
  },
  name: {
    type: String,
    required: true
  },
  startMonth: {
    type: String,
    required: true
  },
  endMonth: {
    type: String,
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const academicYearSettingsSchema = new mongoose.Schema({
  // Academic Year (e.g., "2025-2026")
  academicYear: {
    type: String,
    required: true,
    unique: true
  },
  
  // Is this the current active academic year
  isCurrent: {
    type: Boolean,
    default: false
  },
  
  // Start and end dates of the academic year
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Terms configuration (6 terms by default)
  terms: {
    type: [termSchema],
    default: function() {
      return [
        { termNumber: 1, name: 'Term 1', startMonth: 'Sep', endMonth: 'Oct', isActive: false },
        { termNumber: 2, name: 'Term 2', startMonth: 'Nov', endMonth: 'Dec', isActive: false },
        { termNumber: 3, name: 'Term 3', startMonth: 'Jan', endMonth: 'Feb', isActive: true },
        { termNumber: 4, name: 'Term 4', startMonth: 'Mar', endMonth: 'Apr', isActive: false },
        { termNumber: 5, name: 'Term 5', startMonth: 'May', endMonth: 'Jun', isActive: false },
        { termNumber: 6, name: 'Term 6', startMonth: 'Jul', endMonth: 'Aug', isActive: false }
      ];
    }
  },
  
  // Number of terms in the academic year
  numberOfTerms: {
    type: Number,
    default: 6,
    min: 2,
    max: 6
  },
  
  // Current active term
  currentTerm: {
    type: Number,
    default: 3,
    min: 1,
    max: 6
  },
  
  // Exam/Quiz/Assignment settings per term
  assessmentSettings: {
    maxExamsPerTerm: { type: Number, default: 10 },
    maxQuizzesPerTerm: { type: Number, default: 15 },
    maxAssignmentsPerTerm: { type: Number, default: 30 },
    examWeight: { type: Number, default: 40 },  // percentage
    quizWeight: { type: Number, default: 20 },
    assignmentWeight: { type: Number, default: 40 }
  },
  
  // Grade-specific settings
  gradeSettings: [{
    grade: {
      type: String,
      enum: ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']
    },
    maxExams: { type: Number, default: 10 },
    maxQuizzes: { type: Number, default: 15 },
    maxAssignments: { type: Number, default: 30 }
  }],
  
  // Statistics cache (updated periodically)
  statistics: {
    totalExams: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    totalAssignments: { type: Number, default: 0 },
    avgAttendance: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Static method to get or create current academic year settings
academicYearSettingsSchema.statics.getCurrentSettings = async function() {
  // First try to find the current active year
  let settings = await this.findOne({ isCurrent: true });
  
  if (!settings) {
    // Determine current academic year based on date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Academic year starts in September (month 8)
    const academicYear = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    // Try to find this academic year
    settings = await this.findOne({ academicYear });
    
    if (!settings) {
      // Create default settings
      const startYear = month >= 8 ? year : year - 1;
      settings = await this.create({
        academicYear,
        isCurrent: true,
        startDate: new Date(startYear, 8, 1), // September 1
        endDate: new Date(startYear + 1, 7, 31) // August 31
      });
    } else {
      // Mark as current
      settings.isCurrent = true;
      await settings.save();
    }
  }
  
  return settings;
};

// Method to determine current term based on date
academicYearSettingsSchema.methods.getCurrentTermByDate = function() {
  const now = new Date();
  const month = now.getMonth();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthName = monthNames[month];
  
  for (const term of this.terms) {
    const startIdx = monthNames.indexOf(term.startMonth);
    const endIdx = monthNames.indexOf(term.endMonth);
    
    if (month >= startIdx && month <= endIdx) {
      return term.termNumber;
    }
  }
  
  return this.currentTerm;
};

const AcademicYearSettings = mongoose.model('AcademicYearSettings', academicYearSettingsSchema);

export default AcademicYearSettings;
