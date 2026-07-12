const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Set up conditional mail transporter
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  if (process.env.EMAIL_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Default to Gmail service if no host is specified
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
} else {
  console.log('[EMAIL SYSTEM] No EMAIL_USER/EMAIL_PASS configured. Running in simulation mode.');
}

// Get all jobs
router.get('/', auth, authorize('admin', 'recruiter', 'viewer', 'candidate'), async (req, res) => {
  try {
    if (req.user.role === 'candidate') {
      const openJobs = await Job.find({ status: 'open' })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });
      return res.json(openJobs);
    }

    const isDiscover = req.query.discover === 'true';
    let query = {};
    
    if (req.user.role !== 'admin') {
      if (isDiscover) {
        query = {
          createdBy: { $ne: req.user._id },
          collaborators: { $ne: req.user._id }
        };
      } else {
        query = {
          $or: [
            { createdBy: req.user._id },
            { collaborators: req.user._id }
          ]
        };
      }
    } else {
      if (isDiscover) {
        return res.json([]);
      }
    }

    const jobs = await Job.find(query)
      .populate('createdBy', 'name email')
      .populate('collaborators', 'name email')
      .populate('accessRequests', 'name email')
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single job
router.get('/:id', auth, authorize('admin', 'recruiter', 'viewer', 'candidate'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('collaborators', 'name email')
      .populate('accessRequests', 'name email');
      
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // If candidate, allow access if the job is open
    if (req.user.role === 'candidate') {
      if (job.status !== 'open') {
        return res.status(403).json({ message: 'Access denied: This job posting is closed' });
      }
      return res.json(job);
    }
    
    // Ownership/Collaborator Auth check for recruiters (admin bypass)
    if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user._id.toString() && !job.collaborators.some(c => c._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Access denied: You are not on the hiring team for this job' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create job
router.post('/', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const job = new Job({
      ...req.body,
      createdBy: req.user._id
    });
    await job.save();
    await job.populate('createdBy', 'name email');

    // Simulate or send email alerts for candidate users
    const candidates = await User.find({ role: 'candidate' });
    
    if (transporter) {
      candidates.forEach(async (cand) => {
        try {
          await transporter.sendMail({
            from: `"${req.user.name}" <${req.user.email}>`,
            replyTo: req.user.email,
            to: cand.email,
            subject: `New Job Opening: ${job.title}`,
            html: `
              <h3>Hello ${cand.name},</h3>
              <p>A new position has been published by recruiter <strong>${req.user.name}</strong>: <strong>${job.title}</strong>.</p>
              <p><strong>Department:</strong> ${job.department}</p>
              <p><strong>Location:</strong> ${job.location}</p>
              <br>
              <a href="http://localhost:3000/portal/jobs/${job._id}" style="background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;">View Details & Apply</a>
            `
          });
          console.log(`[EMAIL DISPATCH] Sent job alert to ${cand.email} from recruiter ${req.user.email}`);
        } catch (err) {
          console.error(`[EMAIL ERROR] Failed to send email to ${cand.email}:`, err);
        }
      });
    } else {
      candidates.forEach(cand => {
        console.log(`[EMAIL SIMULATION] Recruiter "${req.user.name}" <${req.user.email}> sent job alert for "${job.title}" to candidate "${cand.name}" <${cand.email}>`);
      });
    }

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update job
router.put('/:id', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete job
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Request access to a job
router.post('/:id/request-access', auth, authorize('recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    if (job.createdBy.toString() === req.user._id.toString() || job.collaborators.includes(req.user._id)) {
      return res.status(400).json({ message: 'You already have access to this job role!' });
    }

    if (job.accessRequests.includes(req.user._id)) {
      return res.status(400).json({ message: 'Your collaboration request is already pending approval.' });
    }

    job.accessRequests.push(req.user._id);
    await job.save();

    res.json({ message: 'Collaboration request submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve collaboration request (Only Owner or Admin)
router.post('/:id/approve-access', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the job owner can approve collaboration requests' });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId is required' });
    }

    job.accessRequests.pull(targetUserId);
    if (!job.collaborators.includes(targetUserId)) {
      job.collaborators.push(targetUserId);
    }
    await job.save();

    res.json({ message: 'Collaboration request approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Decline collaboration request (Only Owner or Admin)
router.post('/:id/decline-access', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the job owner can manage collaboration requests' });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId is required' });
    }

    job.accessRequests.pull(targetUserId);
    await job.save();

    res.json({ message: 'Collaboration request declined' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove collaborator from a job posting (Only Owner or Admin)
router.post('/:id/remove-collaborator', auth, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    // Auth check: only creator or admin can remove
    if (req.user.role !== 'admin' && job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the job owner can manage/remove collaborators' });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ message: 'targetUserId is required' });
    }

    // Pull from collaborators array
    job.collaborators.pull(targetUserId);
    await job.save();

    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
