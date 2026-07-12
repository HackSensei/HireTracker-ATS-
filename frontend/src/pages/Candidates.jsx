import React, { useEffect, useState } from 'react';
import { candidatesAPI, jobsAPI } from '../utils/api';
import { Plus, Edit, Trash2, Search, Filter, Mail, Phone, FileText, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    resume: '',
    skills: '',
    experience: '',
    education: {
      degree: '',
      institution: '',
      year: ''
    },
    jobId: '',
    status: 'applied',
    notes: ''
  });
  const { user } = useAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);

  useEffect(() => {
    loadData();
  }, [searchTerm, statusFilter, jobFilter]);

  const loadData = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (jobFilter) params.jobId = jobFilter;

      const [candidatesRes, jobsRes] = await Promise.all([
        candidatesAPI.getAll(params),
        jobsAPI.getAll()
      ]);
      setCandidates(candidatesRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsParsing(true);
    const uploadData = new FormData();
    uploadData.append('resume', file);

    try {
      const response = await candidatesAPI.parseResume(uploadData);
      const parsed = response.data;
      
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        skills: Array.isArray(parsed.skills) ? parsed.skills.join(', ') : parsed.skills || prev.skills,
        experience: parsed.experience !== undefined ? parsed.experience.toString() : prev.experience,
        education: {
          degree: parsed.education?.degree || prev.education.degree,
          institution: parsed.education?.institution || prev.education.institution,
          year: parsed.education?.year ? parsed.education.year.toString() : prev.education.year,
        }
      }));
    } catch (error) {
      console.error("Resume parsing failed:", error);
      alert("Failed to auto-parse PDF resume. Please enter details manually.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      const data = {
        ...formData,
        skills: skillsArray,
        experience: formData.experience ? parseInt(formData.experience) : 0
      };

      if (editingCandidate) {
        await candidatesAPI.update(editingCandidate._id, data);
      } else {
        await candidatesAPI.create(data);
      }
      setShowModal(false);
      setEditingCandidate(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save candidate:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await candidatesAPI.updateStatus(id, newStatus);
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleEdit = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      ...candidate,
      skills: candidate.skills.join(', '),
      education: candidate.education || { degree: '', institution: '', year: '' }
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await candidatesAPI.delete(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete candidate:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      resume: '',
      skills: '',
      experience: '',
      education: {
        degree: '',
        institution: '',
        year: ''
      },
      jobId: '',
      status: 'applied',
      notes: ''
    });
  };

  const canEdit = user?.role === 'admin' || user?.role === 'recruiter';

  const statusColors = {
    applied: 'bg-blue-100 text-blue-700',
    screening: 'bg-purple-100 text-purple-700',
    interview: 'bg-pink-100 text-pink-700',
    technical: 'bg-orange-100 text-orange-700',
    offer: 'bg-green-100 text-green-700',
    hired: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors self-start"
          >
            <Plus size={20} />
            Add Candidate
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search candidates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="technical">Technical</option>
              <option value="offer">Offer</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">All Jobs</option>
              {jobs.map(job => (
                <option key={job._id} value={job._id}>{job.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Skills</th>
                {canEdit && <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {candidates.map((candidate) => (
                <tr key={candidate._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedCandidateId(candidate._id)}
                      className="font-medium text-gray-900 hover:text-indigo-600 transition-colors text-left focus:outline-none"
                    >
                      {candidate.name}
                    </button>
                    <div className="text-sm text-gray-500">{candidate.experience} yrs exp</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Phone size={14} />
                        {candidate.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{candidate.jobId?.title || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{candidate.jobId?.department || ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    {candidate.matchScores ? (
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center justify-center w-12 py-1 rounded text-xs font-bold ${
                          candidate.matchScores.overall >= 80 ? 'bg-green-100 text-green-700' :
                          candidate.matchScores.overall >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {candidate.matchScores.overall}%
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          Skills: {candidate.matchScores.skills}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {canEdit ? (
                      <select
                        value={candidate.status}
                        onChange={(e) => handleStatusChange(candidate._id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize border-0 cursor-pointer ${statusColors[candidate.status]}`}
                      >
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="interview">Interview</option>
                        <option value="technical">Technical</option>
                        <option value="offer">Offer</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[candidate.status]}`}>
                        {candidate.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                      {candidate.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{candidate.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(candidate)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(candidate._id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                    No candidates found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h2>
            </div>
            
            {/* AI Resume Upload Section */}
            {!editingCandidate && (
              <div className="p-6 bg-indigo-50/50 border-b border-gray-100 flex flex-col gap-3">
                <label className="block text-sm font-semibold text-indigo-900">AI Resume Auto-Fill (PDF)</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white rounded-lg p-5 cursor-pointer transition-colors relative">
                    {isParsing ? (
                      <div className="flex flex-col items-center gap-2 text-indigo-600">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-xs font-semibold">AI is analyzing and extracting details...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-indigo-700/80">
                        <Upload size={20} className="text-indigo-500" />
                        <span className="text-xs font-medium">Select candidate resume PDF</span>
                        <span className="text-[10px] text-gray-400">Extracted fields populate the form below</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleResumeUpload}
                      disabled={isParsing}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="JavaScript, React, Node.js"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job *</label>
                <select
                  value={formData.jobId}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a job</option>
                  {jobs.map(job => (
                    <option key={job._id} value={job._id}>{job.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="technical">Technical</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                  <input
                    type="text"
                    value={formData.education.degree}
                    onChange={(e) => setFormData({ ...formData, education: { ...formData.education, degree: e.target.value } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                  <input
                    type="text"
                    value={formData.education.institution}
                    onChange={(e) => setFormData({ ...formData, education: { ...formData.education, institution: e.target.value } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.education.year}
                    onChange={(e) => setFormData({ ...formData, education: { ...formData.education, year: e.target.value } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none h-24"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCandidate(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingCandidate ? 'Update' : 'Add'} Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCandidateId && (
        <CandidateDetailsModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

export default Candidates;
