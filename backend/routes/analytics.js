const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const { auth, authorize } = require('../middleware/auth');

// Get dashboard analytics
router.get('/dashboard', auth, authorize('admin', 'recruiter', 'viewer'), async (req, res) => {
  try {
    // Determine accessible jobs
    let jobsQuery = {};
    if (req.user.role !== 'admin') {
      jobsQuery = {
        $or: [
          { createdBy: req.user._id },
          { collaborators: req.user._id }
        ]
      };
    }
    
    const accessibleJobs = await Job.find(jobsQuery);
    const jobIds = accessibleJobs.map(j => j._id);

    const totalJobs = accessibleJobs.length;
    const openJobs = accessibleJobs.filter(j => j.status === 'open').length;
    const totalCandidates = await Candidate.countDocuments({ jobId: { $in: jobIds } });
    
    const candidatesByStatus = await Candidate.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const candidatesByJob = await Candidate.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job'
        }
      },
      {
        $group: {
          _id: '$job.title',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentCandidates = await Candidate.find({ jobId: { $in: jobIds } })
      .populate('jobId', 'title')
      .sort({ appliedDate: -1 })
      .limit(5);

    // Calculate Average Time-to-Hire (in days) for Hired candidates
    const hiredCandidates = await Candidate.find({ jobId: { $in: jobIds }, status: 'hired' });
    let totalMs = 0;
    let hiredCount = hiredCandidates.length;
    hiredCandidates.forEach(c => {
      const duration = new Date(c.lastUpdated) - new Date(c.appliedDate);
      if (duration > 0) totalMs += duration;
    });
    const avgTimeToHireDays = hiredCount > 0 ? (totalMs / hiredCount / (1000 * 60 * 60 * 24)).toFixed(1) : 0;

    // Calculate Top Required Skills from Job postings
    const skillsCount = {};
    accessibleJobs.forEach(job => {
      if (job.skillsRequired) {
        job.skillsRequired.forEach(skill => {
          const normalized = skill.trim();
          if (normalized) {
            skillsCount[normalized] = (skillsCount[normalized] || 0) + 1;
          }
        });
      }
    });
    const topSkills = Object.entries(skillsCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    res.json({
      totalJobs,
      openJobs,
      totalCandidates,
      candidatesByStatus,
      candidatesByJob,
      recentCandidates,
      avgTimeToHire: parseFloat(avgTimeToHireDays),
      topSkills
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
