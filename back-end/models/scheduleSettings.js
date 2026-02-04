import mongoose from 'mongoose';

const scheduleSettingsSchema = new mongoose.Schema({
    // There should only be one settings document
    settingsId: {
        type: String,
        default: 'default',
        unique: true
    },
    // Number of sessions per day
    sessionsPerDay: {
        type: Number,
        default: 7,
        min: 1,
        max: 12
    },
    // Duration of each session in minutes
    sessionDuration: {
        type: Number,
        default: 50,
        min: 20,
        max: 120
    },
    // Break duration in minutes (after breakAfterSession)
    breakDuration: {
        type: Number,
        default: 30,
        min: 5,
        max: 60
    },
    // Break occurs after this session number
    breakAfterSession: {
        type: Number,
        default: 4,
        min: 1,
        max: 11
    },
    // School day start time (HH:MM format)
    dayStartTime: {
        type: String,
        default: '08:00'
    },
    // Generated time slots (computed field)
    timeSlots: [{
        session: Number,
        startTime: String,
        endTime: String,
        isBreak: Boolean
    }],
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save middleware to generate time slots
scheduleSettingsSchema.pre('save', function(next) {
    this.timeSlots = generateTimeSlots(
        this.sessionsPerDay,
        this.sessionDuration,
        this.breakDuration,
        this.breakAfterSession,
        this.dayStartTime
    );
    next();
});

// Helper function to generate time slots
function generateTimeSlots(sessionsPerDay, sessionDuration, breakDuration, breakAfterSession, dayStartTime) {
    const slots = [];
    const [startHour, startMinute] = dayStartTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMinute;

    for (let i = 1; i <= sessionsPerDay; i++) {
        const startTime = formatTime(currentMinutes);
        currentMinutes += sessionDuration;
        const endTime = formatTime(currentMinutes);

        slots.push({
            session: i,
            startTime,
            endTime,
            isBreak: false
        });

        // Add break after specified session
        if (i === breakAfterSession && i < sessionsPerDay) {
            const breakStart = endTime;
            currentMinutes += breakDuration;
            const breakEnd = formatTime(currentMinutes);
            
            slots.push({
                session: 0, // 0 indicates break
                startTime: breakStart,
                endTime: breakEnd,
                isBreak: true
            });
        }
    }

    return slots;
}

// Helper to format minutes to HH:MM
function formatTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Static method to get or create default settings
scheduleSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne({ settingsId: 'default' });
    if (!settings) {
        settings = await this.create({ settingsId: 'default' });
    }
    return settings;
};

const ScheduleSettings = mongoose.model('ScheduleSettings', scheduleSettingsSchema);

export default ScheduleSettings;
