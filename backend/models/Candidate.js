const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String
  },
  resume: {
    type: String
  },
  skills: [{
    type: String
  }],
  experience: {
    type: Number
  },
  education: {
    degree: String,
    institution: String,
    year: Number
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'technical', 'hr', 'offer', 'hired', 'rejected'],
    default: 'applied'
  },
  matchScores: {
    overall: { type: Number, default: 0 },
    skills: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    education: { type: Number, default: 0 }
  },
  notes: {
    type: String
  },
  comments: [{
    text: { type: String, required: true },
    author: { type: String, required: true },
    authorRole: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  appliedDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

candidateSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Candidate', candidateSchema);
