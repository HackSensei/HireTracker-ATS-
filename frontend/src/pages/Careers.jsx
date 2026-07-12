import React, { useEffect, useState } from 'react';
import { publicAPI } from '../utils/api';
import { Briefcase, MapPin, DollarSign, Clock, Upload, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

const Careers = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    resume: null
  });

  useEffect(() => {
    loadPublicJobs();
  }, []);

  const loadPublicJobs = async () => {
    try {
      setLoading(true);
      const response = await publicAPI.getJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to load public jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
    setSuccess(false);
    setErrorMsg('');
    setFormData({ name: '', email: '', phone: '', resume: null });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, resume: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.resume) {
      setErrorMsg('Please upload your resume PDF');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const uploadData = new FormData();
    uploadData.append('name', formData.name);
    uploadData.append('email', formData.email);
    uploadData.append('phone', formData.phone);
    uploadData.append('resume', formData.resume);

    try {
      await publicAPI.apply(selectedJob._id, uploadData);
      setSuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to submit application:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to submit application. Ensure the file is a PDF under 5MB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="text-sm font-semibold text-slate-600">Loading career opportunities...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Careers Banner */}
      <header className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white py-16 px-6 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto space-y-4 relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Careers at HireTrack</h1>
          <p className="text-lg text-indigo-200/90 font-medium max-w-2xl">
            Join a forward-thinking team solving real-world challenges. Browse our open roles below and apply in seconds with our automated AI matching portal.
          </p>
        </div>
      </header>

      {/* Main Jobs Listing */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Open Positions ({jobs.length})</h2>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wide">
            Updated Today
          </span>
        </div>

        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job._id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-indigo-100 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-3 flex-1">
                <div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-bold uppercase rounded tracking-wider">{job.department}</span>
                  <h3 className="text-lg font-bold text-slate-800 mt-1.5">{job.title}</h3>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{job.description}</p>
                
                {/* Meta details */}
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
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
              </div>

              <button
                onClick={() => handleApplyClick(job)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all w-full md:w-auto shrink-0 shadow-sm"
              >
                Apply Now
                <ChevronRight size={16} />
              </button>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="text-center py-16 bg-white border border-dashed rounded-xl space-y-2">
              <Briefcase className="text-slate-300 mx-auto" size={40} />
              <p className="text-slate-500 font-medium">No open career opportunities right now.</p>
              <p className="text-xs text-slate-400">Check back later or register to get updates.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-white border-t text-center text-xs text-slate-400">
        © 2026 HireTrack ATS. All rights reserved. Powered by AI Recruitment Engines.
      </footer>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all">
            
            {/* Success screen overlay */}
            {success ? (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-4 bg-white h-96">
                <CheckCircle2 size={56} className="text-green-500 animate-bounce" />
                <h3 className="text-xl font-bold text-slate-800">Application Submitted!</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Your resume has been successfully parsed and linked. Our recruiters will review your matching score shortly.
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-6 py-5 bg-slate-50 border-b flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Apply for {selectedJob.title}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{selectedJob.department} • {selectedJob.location}</p>
                  </div>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    disabled={isSubmitting}
                    className="text-slate-400 hover:text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Full Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank for AI to parse name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="Leave blank for AI to parse email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="Leave blank for AI to parse phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* PDF Upload */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Resume PDF *</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 bg-slate-50/50 cursor-pointer transition-colors relative">
                      {isSubmitting ? (
                        <div className="flex flex-col items-center gap-1.5 text-indigo-600">
                          <Loader2 className="animate-spin" size={24} />
                          <span className="text-xs font-bold">Uploading & analyzing resume...</span>
                        </div>
                      ) : formData.resume ? (
                        <div className="text-center space-y-1 text-slate-700">
                          <CheckCircle2 className="mx-auto text-green-500" size={24} />
                          <span className="text-xs font-semibold truncate block max-w-[250px]">{formData.resume.name}</span>
                          <span className="text-[10px] text-slate-400">Click to change resume</span>
                        </div>
                      ) : (
                        <div className="text-center space-y-1 text-slate-400">
                          <Upload className="mx-auto" size={20} />
                          <span className="text-xs font-medium">Select PDF resume</span>
                          <span className="text-[9px] text-slate-400">File must be a PDF up to 5MB</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="pt-4 border-t flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowApplyModal(false)}
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.resume}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-sm"
                    >
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

export default Careers;
