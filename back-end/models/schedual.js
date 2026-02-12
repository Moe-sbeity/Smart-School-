import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
student: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: false, 
}],


  subject: {
    type: String,
    enum: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography','Computer', 'Computer Science', 'Arabic', 'French'],
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },

  classGrade: {
    type: String,
    required: true,
  },
  classSection: {
    type: String,
    required: true,
  }

}, {
  timestamps: true,
});

export default mongoose.model('Schedule', scheduleSchema);
