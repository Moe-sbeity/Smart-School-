import mongoose from 'mongoose';

const classGradeSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    classGrade: {
        enum: ['kg1', 'kg2', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'],
        type: String,
        required: true
    },
    classSection: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'E', 'F'],
        required: false
    }
}, {
    timestamps: true
});

// Add compound index to ensure unique teacher-grade-section combinations
classGradeSchema.index({ teacher: 1, classGrade: 1, classSection: 1 }, { 
    unique: true, 
    partialFilterExpression: { teacher: { $exists: true } } 
});

// Add index for student (still unique)
classGradeSchema.index({ student: 1 }, { 
    unique: true, 
    partialFilterExpression: { student: { $exists: true } } 
});

const ClassGradeModel = mongoose.model("ClassGrade", classGradeSchema);

export default ClassGradeModel;