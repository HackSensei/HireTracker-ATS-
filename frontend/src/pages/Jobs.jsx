import React, { useEffect, useState } from 'react';
import { jobsAPI } from '../utils/api';
import { Plus, Edit, Trash2, MapPin, DollarSign, Clock, UserPlus, Users, Check, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('my-jobs');
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    location: '',
    salary: '',
    type: 'full-time',
    status: 'open',
    skillsRequired: '',
    experienceRequired: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    loadJobs(activeTab);
  }, [activeTab]);

  const loadJobs = async (tab = activeTab) => {
    try {
      const response = tab === 'my-jobs'
        ? await jobsAPI.getAll()
        : await jobsAPI.getDiscoverJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = typeof formData.skillsRequired === 'string'
        ? formData.skillsRequired.split(',').map(s => s.trim()).filter(s => s)
        : formData.skillsRequired || [];

      const data = {
        ...formData,
        skillsRequired: skillsArray,
        experienceRequired: parseInt(formData.experienceRequired) || 0
      };

      if (editingJob) {
        await jobsAPI.update(editingJob._id, data);
      } else {
        await jobsAPI.create(data);
      }
      setShowModal(false);
      setEditingJob(null);
      setFormData({
        title: '',
        description: '',
        department: '',
        location: '',
        salary: '',
        type: 'full-time',
        status: 'open',
        skillsRequired: '',
        experienceRequired: 0
      });
      loadJobs();
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      ...job,
      skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired.join(', ') : job.skillsRequired || '',
      experienceRequired: job.experienceRequired || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobsAPI.delete(id);
        loadJobs();
      } catch (error) {
        console.error('Failed to delete job:', error);
      }
    }
  };

  const handleRequestAccess = async (jobId) => {
    try {
      await jobsAPI.requestAccess(jobId);
      alert('Collaboration request submitted successfully!');
      loadJobs('discover');
    } catch (error) {
      console.error('Failed to request access:', error);
      alert(error.response?.data?.message || 'Failed to request access');
    }
  };

  const handleApproveAccess = async (jobId, targetUserId) => {
    try {
      await jobsAPI.approveAccess(jobId, targetUserId);
      loadJobs('my-jobs');
    } catch (error) {
      console.error('Failed to approve access:', error);
    }
  };

  const handleDeclineAccess = async (jobId, targetUserId) => {
    try {
      await jobsAPI.declineAccess(jobId, targetUserId);
      loadJobs('my-jobs');
    } catch (error) {
      console.error('Failed to decline access:', error);
    }
  };

  const handleRemoveCollaborator = async (jobId, targetUserId) => {
    if (window.confirm('Are you sure you want to remove this recruiter from the hiring team?')) {
      try {
        await jobsAPI.removeCollaborator(jobId, targetUserId);
        loadJobs('my-jobs');
      } catch (error) {
        console.error('Failed to remove collaborator:', error);
      }
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'recruiter';
  const canDelete = user?.role === 'admin';

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Jobs Dashboard</h1>
        {canEdit && activeTab === 'my-jobs' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Plus size={18} />
            Create Job Post
          </button>
        )}
      </div>

      {/* Access Tabs */}
      {user?.role !== 'admin' && (
        <div className="flex border-b border-slate-200 gap-1">
          <button
            onClick={() => setActiveTab('my-jobs')}
            className={`py-3 px-5 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'my-jobs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Hiring Board
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`py-3 px-5 font-bold text-sm border-b-2 transition-all ${
              activeTab === 'discover'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Other Team Roles (Discover)
          </button>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => {
          const isOwner = job.createdBy?._id === user?.id || job.createdBy === user?.id || job.createdBy?._id === user?._id || job.createdBy === user?._id;
          
          return (
            <div key={job._id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md hover:border-indigo-50 transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    job.status === 'open' ? 'bg-green-50 text-green-700 border-green-100' :
                    job.status === 'closed' ? 'bg-red-50 text-red-700 border-red-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {job.status}
                  </span>
                  
                  {activeTab === 'my-jobs' && (
                    <div className="flex gap-1.5">
                      {isOwner && canEdit && (
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-1.5 hover:bg-slate-50 border rounded-lg transition-colors text-slate-500"
                          title="Edit Job Details"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(job._id)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 border border-transparent rounded-lg transition-colors text-slate-400"
                          title="Delete Job"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold uppercase rounded">{job.department}</span>
                  <h3 className="text-base font-bold text-slate-800 mt-1.5">{job.title}</h3>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{job.description}</p>
                
                <div className="space-y-1.5 text-xs text-slate-400 font-semibold pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-300" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={14} className="text-slate-300" />
                      <span>{job.salary}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-slate-300" />
                    <span className="capitalize">{job.type}</span>
                  </div>
                </div>

                {/* Requirements details */}
                {((job.skillsRequired && job.skillsRequired.length > 0) || job.experienceRequired > 0) && (
                  <div className="pt-3 border-t border-dashed border-slate-100 space-y-1.5">
                    {job.experienceRequired > 0 && (
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                        Experience: <span className="text-slate-700">{job.experienceRequired} years minimum</span>
                      </div>
                    )}
                    {job.skillsRequired && job.skillsRequired.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skillsRequired.map((skill, index) => (
                          <span key={index} className="px-1.5 py-0.5 bg-indigo-50/50 text-indigo-600 text-[9px] font-bold rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action and collaboration info footer */}
              <div className="mt-5">
                {activeTab === 'discover' ? (
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
                    <div className="text-[10px] text-slate-400 font-medium">
                      Created by: <span className="font-bold text-slate-600">{job.createdBy?.name || 'Recruiter'}</span>
                    </div>
                    {job.accessRequests?.some(r => r._id === user?.id || r === user?.id || r._id === user?._id || r === user?._id) ? (
                      <button
                        disabled
                        className="w-full bg-slate-100 text-slate-400 border border-slate-200 py-2 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <ShieldAlert size={14} />
                        Access Requested (Pending)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequestAccess(job._id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <UserPlus size={14} />
                        Request Collaboration Access
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="text-[10px] text-slate-400 font-medium">
                      Owner: <span className="font-bold text-slate-600">{isOwner ? 'You' : job.createdBy?.name}</span>
                    </div>

                    {/* Pending Collaboration Invites Section */}
                    {isOwner && job.accessRequests && job.accessRequests.length > 0 && (
                      <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-extrabold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <Users size={12} />
                          Access Requests ({job.accessRequests.length})
                        </p>
                        <div className="space-y-1.5">
                          {job.accessRequests.map((reqUser) => (
                            <div key={reqUser._id} className="flex items-center justify-between gap-2 text-xs bg-white border border-indigo-100/30 p-2 rounded-lg">
                              <span className="font-bold text-slate-700 truncate">{reqUser.name}</span>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleApproveAccess(job._id, reqUser._id)}
                                  className="p-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors shadow-sm"
                                  title="Approve access"
                                >
                                  <Check size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeclineAccess(job._id, reqUser._id)}
                                  className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-sm"
                                  title="Decline request"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {job.collaborators && job.collaborators.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Hiring Team Members</p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.collaborators.map((c) => (
                            <span key={c._id} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 text-slate-650 text-[10px] font-bold rounded-lg border border-slate-200 shadow-sm">
                              {c.name}
                              {isOwner && (
                                <button
                                  onClick={() => handleRemoveCollaborator(job._id, c._id)}
                                  className="text-slate-400 hover:text-red-650 font-extrabold ml-1.5 transition-colors focus:outline-none"
                                  title="Remove collaborator"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="col-span-full text-center py-16 bg-white border border-dashed rounded-2xl space-y-2">
            <ShieldAlert className="text-slate-300 mx-auto" size={40} />
            <p className="text-slate-500 font-bold">No job postings found</p>
            <p className="text-xs text-slate-400">
              {activeTab === 'discover'
                ? "There are no postings from other teams to request collaboration access on."
                : "Create a job post or request collaboration access to begin."}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingJob ? 'Edit Job Posting' : 'Publish New Job Posting'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-28"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Salary (e.g. $100k-$120k)</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Required Experience (years)</label>
                  <input
                    type="number"
                    value={formData.experienceRequired}
                    onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Required Skills (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.skillsRequired}
                    onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="React, Node.js, Python"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingJob(null);
                    setFormData({
                      title: '',
                      description: '',
                      department: '',
                      location: '',
                      salary: '',
                      type: 'full-time',
                      status: 'open',
                      skillsRequired: '',
                      experienceRequired: 0
                    });
                  }}
                  className="flex-1 py-2 border border-slate-250 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                >
                  {editingJob ? 'Update Posting' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jobs;
