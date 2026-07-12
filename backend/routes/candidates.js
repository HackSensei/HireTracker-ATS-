const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Activity = require('../models/Activity');
const { auth, authorize } = require('../middleware/auth');
const Job = require('../models/Job');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { parseResume } = require('../utils/resumeParser');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function calculateScore(candidateSkills, candidateExperience, candidateEducation, jobId) {
  const job = await Job.findById(jobId);
  if (!job) {
    return { overall: 0, skills: 0, experience: 0, education: 0 };
  }

  // 1. Skills match
  let skillsScore = 100;
  if (job.skillsRequired && job.skillsRequired.length > 0) {
    const jobSkills = job.skillsRequired.map(s => s.toLowerCase().trim());
    const candidateSkillsLower = (candidateSkills || []).map(s => s.toLowerCase().trim());
    
    let matches = 0;
    jobSkills.forEach(js => {
      if (candidateSkillsLower.some(cs => cs.includes(js) || js.includes(cs))) {
        matches++;
      }
    });
    skillsScore = Math.round((matches / jobSkills.length) * 100);
  }

  // 2. Experience match
  let expScore = 100;
  if (job.experienceRequired && job.experienceRequired > 0) {
    const candidateExp = candidateExperience || 0;
    if (candidateExp >= job.experienceRequired) {
      expScore = 100;
    } else {
      expScore = Math.round((candidateExp / job.experienceRequired) * 100);
    }
  }

  // 3. Education match
  let eduScore = 0;
  if (candidateEducation) {
    if (candidateEducation.degree) eduScore += 50;
    if (candidateEducation.institution) eduScore += 30;
    if (candidateEducation.year) eduScore += 20;
  }

  const overall = Math.round((skillsScore * 0.5) + (expScore * 0.3) + (eduScore * 0.2));

  return {
    overall,
    skills: skillsScore,
    experience: expScore,
    education: eduScore
  };
}

// Get all candidates with filters
router.get('/', auth, async (req, res) => {
  try {
    const { status, jobId, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (jobId) query.jobId = jobId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await Candidate.find(query)
      .populate('jobId', 'title department')
      .populate('createdBy', 'name email')
      .sort({ appliedDate: -1 });
    
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single candidate
router.get('/:id', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('jobId', 'title department location')
      .populate('createdBy', 'name email');
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Parse resume PDF
router.post('/parse', auth, authorize('admin', 'recruiter'), upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No resume file uploaded' });
    }
    
    const pdfData = await pdfParse(req.file.buffer);
    const parsedCandidate = await parseResume(pdfData.text);
    
    res.json(parsedCandidate);
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ message: 'Failed to parse resume', error: error.message });
  }
});

// Create candidate
router.post('/', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { skills, experience, education, jobId } = req.body;
    const matchScores = await calculateScore(skills, experience, education, jobId);

    const candidate = new Candidate({
      ...req.body,
      matchScores,
      createdBy: req.user._id
    });
    await candidate.save();
    
    // Log creation
    const activity = new Activity({
      candidateId: candidate._id,
      action: 'candidate_created',
      details: 'Candidate profile created',
      performedBy: req.user._id
    });
    await activity.save();

    await candidate.populate('jobId', 'title department');
    await candidate.populate('createdBy', 'name email');
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update candidate
router.put('/:id', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { skills, experience, education, jobId } = req.body;
    const matchScores = await calculateScore(skills, experience, education, jobId);

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, matchScores, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    ).populate('jobId', 'title department').populate('createdBy', 'name email');
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Log update
    const activity = new Activity({
      candidateId: candidate._id,
      action: 'profile_updated',
      details: 'Candidate profile details updated',
      performedBy: req.user._id
    });
    await activity.save();

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update candidate status
router.patch('/:id/status', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { status } = req.body;

    const oldCandidate = await Candidate.findById(req.params.id);
    if (!oldCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    const previousStatus = oldCandidate.status;

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { status, lastUpdated: Date.now() },
      { new: true, runValidators: true }
    ).populate('jobId', 'title department').populate('createdBy', 'name email');
    
    if (previousStatus !== status) {
      const activity = new Activity({
        candidateId: candidate._id,
        action: 'status_change',
        details: `Moved from ${previousStatus} to ${status}`,
        performedBy: req.user._id
      });
      await activity.save();
    }

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete candidate
router.delete('/:id', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get candidate timeline
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const activities = await Activity.find({ candidateId: req.params.id })
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add comment to candidate
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const comment = {
      text,
      author: req.user.name,
      authorRole: req.user.role
    };

    candidate.comments.push(comment);
    await candidate.save();

    // Log comment activity
    const activity = new Activity({
      candidateId: candidate._id,
      action: 'comment_added',
      details: `Added a comment: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
      performedBy: req.user._id
    });
    await activity.save();

    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete comment from candidate
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    candidate.comments = candidate.comments.filter(
      c => c._id.toString() !== req.params.commentId
    );
    await candidate.save();

    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
