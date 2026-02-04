import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography','Computer', 'Computer Science', 'Arabic', 'French']
  },
  type: {
    type: String,
    required: true,
    enum: ['announcement', 'assignment', 'quiz']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    // Only required for assignments and quizzes
    required: function() {
      return this.type === 'assignment' || this.type === 'quiz';
    }
  },
  totalPoints: {
    type: Number,
    // Only for assignments and quizzes
    required: function() {
      return this.type === 'assignment' || this.type === 'quiz';
    },
    min: 0
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String
  }],
  questions: [{
    question: String,
    type: {
      type: String,
      enum: ['multiple-choice', 'true-false', 'short-answer', 'essay']
    },
    options: [String], // For multiple choice
    correctAnswer: String, // For auto-grading
    points: Number
  }],
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Track who has seen the announcement
  viewedBy: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'published'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Index for faster queries
announcementSchema.index({ teacher: 1, subject: 1, type: 1 });
announcementSchema.index({ targetStudents: 1, status: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;