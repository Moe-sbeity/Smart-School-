import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ["male","female"],
        required: true,
    },
    dateOfBirth: {
        type: Date,
        required: false,
    },
    role: {
      type: String,
      enum: ["student","admin","teacher","parent"],
      default: "student",
    },
    subjects: {
      type: [String],
      enum: ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography','Computer', 'Computer Science', 'Arabic', 'French'],
      validate: {
        validator: function(v) {
          if (this.role === 'teacher') {
            return v && v.length > 0;
          }
          return true;
        },
        message: 'Teachers must have at least one subject assigned'
      }
    },
    // For students: reference to their parent
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      validate: {
        validator: function(v) {
          if (this.role === 'student' && !v) {
            return false;
          }
          return true;
        },
        message: 'Students must have a parent assigned'
      }
    },
        // ADD THESE TWO FIELDS ↓↓↓
    classGrade: {
      type: String,
      enum: ['kg1','kg2','grade1','grade2','grade3','grade4','grade5','grade6','grade7','grade8','grade9','grade10','grade11','grade12']
    },
    classSection: {
      type: String,
      enum: ['A','B','C','D','E','F']
    },
    // For parents: array of their children (students)
    children: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Flag to indicate if user must change password on first login
    mustChangePassword: {
      type: Boolean,
      default: false
    }
},
{
    timestamps: true
});

const UserModel = mongoose.model("User", userSchema);

export default UserModel;