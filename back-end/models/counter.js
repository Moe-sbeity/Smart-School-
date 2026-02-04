import mongoose from 'mongoose';

/**
 * Counter Model
 * Used to generate sequential IDs for students and other entities
 */
const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequenceValue: {
    type: Number,
    default: 10000000 // Starting from 10000000 for 8-digit student IDs
  }
}, {
  timestamps: true
});

/**
 * Get and increment the next sequence value
 * @param {string} sequenceName - The name of the sequence (e.g., 'studentId')
 * @returns {Promise<number>} The next sequence value
 */
counterSchema.statics.getNextSequence = async function(sequenceName) {
  const counter = await this.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true }
  );
  return counter.sequenceValue;
};

/**
 * Get the current sequence value without incrementing
 * @param {string} sequenceName - The name of the sequence
 * @returns {Promise<number>} The current sequence value
 */
counterSchema.statics.getCurrentSequence = async function(sequenceName) {
  const counter = await this.findById(sequenceName);
  if (!counter) {
    // Create the counter if it doesn't exist
    const newCounter = await this.create({
      _id: sequenceName,
      sequenceValue: 10000000
    });
    return newCounter.sequenceValue + 1; // Return what the NEXT value will be
  }
  return counter.sequenceValue + 1; // Return what the NEXT value will be
};

const CounterModel = mongoose.model('Counter', counterSchema);

export default CounterModel;
