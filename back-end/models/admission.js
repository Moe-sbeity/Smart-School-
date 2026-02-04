import mongoose from 'mongoose';
const admissionSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    grade: {
        type: String,
        required: true,
        enum: ['9', '10', '11']
    },
    intendedStart: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'missing-docs', 'accepted', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewDate: {
        type: Date,
        default: null
    },
    adminNotes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

admissionSchema.index({ status: 1, createdAt: -1 });
admissionSchema.index({ email: 1 });

export default mongoose.model('Admission', admissionSchema);