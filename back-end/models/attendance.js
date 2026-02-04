
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer', 'Computer Science', 'Arabic', 'French']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  checkInTime: {
    type: Date
  },
  classTime: {
    startTime: String,
    endTime: String
  }
}, {
  timestamps: true
});

attendanceSchema.index({ student: 1, date: 1 });
attendanceSchema.index({ teacher: 1, date: 1 });
attendanceSchema.index({ subject: 1, date: 1 });

// Prevent duplicate attendance for same student on same day for same subject
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

const AttendanceModel = mongoose.model('Attendance', attendanceSchema);

export default AttendanceModel;