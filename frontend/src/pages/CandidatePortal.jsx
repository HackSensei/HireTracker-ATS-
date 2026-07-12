import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { jobsAPI, candidatesAPI } from '../utils/api';
import { Briefcase, MapPin, DollarSign, Clock, FileText, CheckCircle2, Loader2, LogOut, ArrowRight, User } from 'lucide-react';

const CandidatePortal = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyOption, setApplyOption] = useState('reuse'); // 'reuse' or 'new'
  const [newResume, setNewResume] = useState(null);
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadApplications();
    loadJobs();
  }, [user]);

  const loadApplications = async () => {
    try {
      setLoadingApps(true);
      const response = await candidatesAPI.getPortalApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to load portal applications:', error);
    } finally {
      setLoadingApps(false);
    }
  };

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await jobsAPI.getAll();
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    // If candidate has already applied to this job, prevent
    const alreadyApplied = applications.some(app => app.jobId && app.jobId._id === job._id);
    if (alreadyApplied) {
      alert('You have already applied to this job posting!');
      return;
    }

    const hasPrevious = applications.length > 0;
    setApplyOption(hasPrevious ? 'reuse' : 'new');
    setShowApplyModal(true);
    setSuccess(false);
    setErrorMsg('');
    setNewResume(null);
    setPhone('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('phone', phone);
    if (applyOption === 'new') {
      if (!newResume) {
        setErrorMsg('Please select a PDF resume file.');
        setIsSubmitting(false);
        return;
      }
      formData.append('resume', newResume);
    }

    try {
      await candidatesAPI.portalApply(selectedJob._id, formData);
      setSuccess(true);
      loadApplications();
      setTimeout(() => {
        setShowApplyModal(false);
        setSuccess(false);
      }, 2500);
    } catch (error) {
      console.error('Portal Application Error:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper for status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      applied: 'bg-blue-50 text-blue-700 border-blue-100',
      screening: 'bg-amber-50 text-amber-700 border-amber-100',
      interview: 'bg-purple-50 text-purple-700 border-purple-100',
      technical: 'bg-pink-50 text-pink-700 border-pink-100',
      hr: 'bg-teal-50 text-teal-700 border-teal-100',
      offer: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      hired: 'bg-green-50 text-green-700 border-green-100',
      rejected: 'bg-red-50 text-red-700 border-red-100'
    };
    return (
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${styles[status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
        {status === 'hr' ? 'HR Round' : status}
      </span>
    );
  };

  // Helper for match score styling
  const getScoreBadge = (score) => {
    if (score >= 85) return <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">{score}% Match</span>;
    if (score >= 70) return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{score}% Match</span>;
    return <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{score}% Match</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white shrink-0 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-400/30 rounded-xl flex items-center justify-center">
              <Briefcase className="text-indigo-400" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">HireTrack</h1>
              <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Candidate Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2.5 border-r border-slate-700/50 pr-4">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-indigo-300 font-bold text-sm">
                {user?.name?.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-medium">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors bg-slate-800/80 hover:bg-slate-800 px-3.5 py-2 rounded-lg border border-slate-700/50"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: My Applications (2/3 width) */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              My Job Applications
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-200/50 px-2.5 py-0.5 rounded-full">
              {applications.length} Total
            </span>
          </div>

          {loadingApps ? (
            <div className="bg-white rounded-2xl border p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
          ) : applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app._id} className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-slate-800 text-base">{app.jobId?.title || 'Unknown Job'}</h3>
                      {getStatusBadge(app.status)}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{app.jobId?.location || 'Remote'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase size={12} />
                        <span className="capitalize">{app.jobId?.type || 'Full-time'}</span>
                      </div>
                      <div>Applied on {formatDate(app.appliedDate)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end border-t md:border-0 pt-3 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Match Rating</p>
                      {getScoreBadge(app.matchScores?.overall || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border border-dashed rounded-2xl space-y-3">
              <FileText className="text-slate-350 mx-auto" size={48} />
              <p className="text-slate-500 font-bold">No active applications</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Browse open jobs on the right panel and submit your resume to get started!</p>
            </div>
          )}
        </section>

        {/* Right column: Available Jobs (1/3 width) */}
        <section className="space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <Briefcase size={20} className="text-indigo-600" />
              Available Postings
            </h2>
          </div>

          {loadingJobs ? (
            <div className="bg-white rounded-2xl border p-12 flex justify-center items-center">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => {
                const hasApplied = applications.some(app => app.jobId && app.jobId._id === job._id);
                return (
                  <div key={job._id} className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm space-y-3">
                    <div>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 font-bold uppercase rounded">{job.department}</span>
                      <h3 className="font-bold text-slate-800 text-sm mt-1">{job.title}</h3>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-400 font-semibold">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={12} />
                        <span>{job.salary || 'N/A'}</span>
                      </div>
                    </div>

                    {hasApplied ? (
                      <button
                        disabled
                        className="w-full py-2 bg-slate-100 text-slate-400 border rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        Applied ({applications.find(app => app.jobId && app.jobId._id === job._id)?.status})
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/portal/jobs/${job._id}`)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
                      >
                        View Details & Apply
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-dashed rounded-2xl">
              <Briefcase className="text-slate-300 mx-auto mb-2" size={32} />
              <p className="text-xs text-slate-400 font-medium">No open positions listings.</p>
            </div>
          )}
        </section>
      </main>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all">
            
            {success ? (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-white h-72">
                <CheckCircle2 size={48} className="text-green-500 animate-bounce" />
                <h3 className="text-lg font-bold text-slate-800">Application Submitted!</h3>
                <p className="text-xs text-slate-400">
                  Your application has been logged and matching scores are computed.
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 bg-slate-50 border-b flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Apply to {selectedJob.title}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedJob.department} • {selectedJob.location}</p>
                  </div>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                  {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  {/* Auto-Reuse Option if previous applications exist */}
                  {applications.length > 0 ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Resume Submission Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setApplyOption('reuse')}
                          className={`py-2 px-3 border rounded-lg text-xs font-bold text-center transition-all ${
                            applyOption === 'reuse'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Reuse Saved Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyOption('new')}
                          className={`py-2 px-3 border rounded-lg text-xs font-bold text-center transition-all ${
                            applyOption === 'new'
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Upload New PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Since this is your first application, please upload your resume PDF below.
                    </p>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +1 555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* PDF Upload File Box (only if applyOption === 'new') */}
                  {applyOption === 'new' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Select Resume PDF</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewResume(e.target.files[0])}
                        disabled={isSubmitting}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                    </div>
                  )}

                  <div className="pt-4 border-t flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowApplyModal(false)}
                      disabled={isSubmitting}
                      className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (applyOption === 'new' && !newResume)}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting && <Loader2 className="animate-spin" size={14} />}
                      Submit Application
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePortal;
