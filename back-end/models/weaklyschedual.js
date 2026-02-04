import mongoose from 'mongoose';

const weeklyScheduleTemplateSchema = new mongoose.Schema({
  classGrade: {
    type: String,
    enum: ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'],
    required: true
  },
  classSection: {
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F'],
    required: true
  },
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // If after August, it's the new academic year
      return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
  },
  schedule: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    periods: [{
      subject: {
        type: String,
        enum: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer', 'Computer Science', 'Arabic', 'French'],
        required: true
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      periodNumber: {
        type: Number,
        required: true
      }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one template per grade-section-year
weeklyScheduleTemplateSchema.index(
  { classGrade: 1, classSection: 1, academicYear: 1 }, 
  { unique: true }
);

const WeeklyScheduleTemplate = mongoose.model('WeeklyScheduleTemplate', weeklyScheduleTemplateSchema);

export default WeeklyScheduleTemplate;