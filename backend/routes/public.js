const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Activity = require('../models/Activity');
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

// Get all open job postings for public board
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ status: 'open' })
      .select('title description department location salary type createdAt')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single open job detail for public listing
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: 'open' })
      .select('title description department location salary type experienceRequired skillsRequired');
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found or is closed' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Candidate applies to a job (public)
router.post('/jobs/:jobId/apply', upload.single('resume'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const jobExists = await Job.findOne({ _id: jobId, status: 'open' });
    if (!jobExists) {
      return res.status(404).json({ message: 'Target job posting is not open or not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF file is required to apply' });
    }

    // 1. Extract text and parse resume
    const pdfUint8 = new Uint8Array(req.file.buffer);
    const parser = new PDFParse(pdfUint8);
    const pdfData = await parser.getText();
    const parsed = await parseResume(pdfData.text);

    // Override or fill candidate parameters using request body if provided as override,
    // otherwise fallback to AI parsed variables.
    const name = req.body.name || parsed.name;
    const email = req.body.email || parsed.email;
    const phone = req.body.phone || parsed.phone;
    
    if (!name || !email) {
      return res.status(400).json({ 
        message: 'Could not extract Name or Email automatically. Please verify your resume format.',
        parsedDetails: parsed
      });
    }

    // 2. Calculate match score
    const matchScores = await calculateScore(parsed.skills, parsed.experience, parsed.education, jobId);

    // 3. Create Candidate
    const candidate = new Candidate({
      name,
      email,
      phone,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      jobId,
      status: 'applied',
      matchScores,
      notes: 'Applied directly via careers portal.'
    });
    await candidate.save();

    // 4. Log Activity Timeline
    const activity = new Activity({
      candidateId: candidate._id,
      action: 'candidate_created',
      details: 'Applied via Public Careers Portal',
      performedBy: jobExists.createdBy // Attribute to the recruiter who created the job
    });
    await activity.save();

    res.status(201).json({
      message: 'Application submitted successfully!',
      candidate: {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        matchScores
      }
    });

  } catch (error) {
    console.error('Careers Application Error:', error);
    res.status(500).json({ message: 'Failed to process application', error: error.message });
  }
});

module.exports = router;
