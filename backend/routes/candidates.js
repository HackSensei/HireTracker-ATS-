const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Activity = require('../models/Activity');
const { auth, authorize } = require('../middleware/auth');
const Job = require('../models/Job');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
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

    // Ownership/Collaborator Auth check for recruiters (admin/candidate bypass)
    if (req.user.role !== 'admin' && req.user.role !== 'candidate') {
      const accessibleJobs = await Job.find({
        $or: [
          { createdBy: req.user._id },
          { collaborators: req.user._id }
        ]
      }).select('_id');
      const jobIds = accessibleJobs.map(j => j._id);
      
      if (jobId) {
        if (!jobIds.some(id => id.toString() === jobId.toString())) {
          return res.json([]);
        }
        query.jobId = jobId;
      } else {
        query.jobId = { $in: jobIds };
      }
    } else if (jobId) {
      query.jobId = jobId;
    }

    if (status) query.status = status;
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

// Get logged-in candidate's applications
router.get('/portal/applications', auth, authorize('candidate'), async (req, res) => {
  try {
    const applications = await Candidate.find({ userId: req.user._id })
      .populate('jobId', 'title department location type status')
      .sort({ appliedDate: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Candidate applies to a job from Candidate Portal (reusing resume or uploading new)
router.post('/portal/apply/:jobId', auth, authorize('candidate'), upload.single('resume'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobExists = await Job.findOne({ _id: jobId, status: 'open' });
    if (!jobExists) {
      return res.status(404).json({ message: 'Job posting is not open or not found' });
    }

    const alreadyApplied = await Candidate.findOne({ userId: req.user._id, jobId });
    if (alreadyApplied) {
      return res.status(400).json({ message: 'You have already applied to this job role!' });
    }

    let parsed = {};
    if (req.file) {
      const pdfUint8 = new Uint8Array(req.file.buffer);
      const parser = new PDFParse(pdfUint8);
      const pdfData = await parser.getText();
      parsed = await parseResume(pdfData.text);
    } else {
      const previousApp = await Candidate.findOne({ userId: req.user._id }).sort({ appliedDate: -1 });
      if (!previousApp) {
        return res.status(400).json({ message: 'Please upload a PDF resume for your first application.' });
      }
      parsed = {
        skills: previousApp.skills,
        experience: previousApp.experience,
        education: previousApp.education
      };
    }

    const matchScores = await calculateScore(parsed.skills, parsed.experience, parsed.education, jobId);

    const candidate = new Candidate({
      name: req.user.name,
      email: req.user.email,
      phone: req.body.phone || parsed.phone || '',
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      jobId,
      status: 'applied',
      matchScores,
      userId: req.user._id,
      notes: 'Applied via Candidate Portal.'
    });
    await candidate.save();

    const activity = new Activity({
      candidateId: candidate._id,
      action: 'candidate_created',
      details: 'Applied via Candidate Portal Dashboard',
      performedBy: req.user._id
    });
    await activity.save();

    res.status(201).json(candidate);
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
    
    const pdfUint8 = new Uint8Array(req.file.buffer);
    const parser = new PDFParse(pdfUint8);
    const pdfData = await parser.getText();
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
