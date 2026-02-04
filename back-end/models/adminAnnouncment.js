import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [2000, 'Content cannot be more than 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['general', 'urgent', 'event', 'academic'],
    default: 'general'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetGrades: [{
    type: String,
    enum: ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 
           'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12']
  }],
  targetSections: [{
    type: String,
    enum: ['A', 'B', 'C', 'D', 'E', 'F']
  }],
  targetStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isForAllGrades: {
    type: Boolean,
    default: true
  },
  isForAllSections: {
    type: Boolean,
    default: true
  },
  isForSpecificStudents: {
    type: Boolean,
    default: false
  },
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

announcementSchema.index({ createdAt: -1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ targetGrades: 1 });
announcementSchema.index({ targetSections: 1 });
announcementSchema.index({ targetStudents: 1 });

const Announcement = mongoose.model('AdminAnnouncement', announcementSchema);

export default Announcement;