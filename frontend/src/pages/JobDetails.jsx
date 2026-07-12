import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jobsAPI, candidatesAPI } from '../utils/api';
import { Briefcase, MapPin, DollarSign, Clock, FileText, ArrowLeft, Loader2, CheckCircle2, Phone, Upload } from 'lucide-react';

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form submission state
  const [applyOption, setApplyOption] = useState('new');
  const [phone, setPhone] = useState('');
  const [newResume, setNewResume] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const [jobRes, appsRes] = await Promise.all([
        jobsAPI.getById(id),
        candidatesAPI.getPortalApplications()
      ]);
      setJob(jobRes.data);
      setApplications(appsRes.data);
      
      const hasPrevious = appsRes.data.length > 0;
      setApplyOption(hasPrevious ? 'reuse' : 'new');
    } catch (error) {
      console.error('Failed to load job details:', error);
      setErrorMsg('Failed to load job specifications or permission denied.');
    } finally {
      setLoading(false);
    }
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
      await candidatesAPI.portalApply(id, formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/portal');
      }, 2000);
    } catch (error) {
      console.error('Application submission error:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
          <p className="text-slate-500 font-bold text-sm">Loading Job Specifications...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border text-center space-y-4">
          <div className="text-red-500 text-4xl">⚠️</div>
          <h2 className="text-lg font-bold text-slate-800">Access Restricted</h2>
          <p className="text-xs text-slate-500">{errorMsg}</p>
          <button
            onClick={() => navigate('/portal')}
            className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg text-sm"
          >
            Go Back to Portal
          </button>
        </div>
      </div>
    );
  }

  const alreadyApplied = applications.find(app => app.jobId?._id === id);
  const hasPreviousResume = applications.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header banner */}
      <header className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-900 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/portal')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/50"
          >
            <ArrowLeft size={14} />
            Back to Portal
          </button>
          <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Role Details Specification
          </span>
        </div>
      </header>

      {/* Main specification details grid */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left / Top - Description Specs (2/3 width) */}
        <section className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-3">
            <span className="text-[10px] px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold uppercase rounded border border-indigo-100">{job.department}</span>
            <h2 className="text-2xl font-extrabold text-slate-800">{job.title}</h2>
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

          <hr className="border-slate-100" />

          {/* Job Description details */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Role Description</h3>
            <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{job.description}</p>
          </div>

          <hr className="border-slate-100" />

          {/* Requirements & Experience specs */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Job Requirements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Target Experience</p>
                <p className="text-sm font-bold text-slate-700">
                  {job.experienceRequired > 0 ? `${job.experienceRequired} years minimum` : 'Open to all levels'}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Preferred Skillsets</p>
                <div className="flex flex-wrap gap-1">
                  {job.skillsRequired && job.skillsRequired.length > 0 ? (
                    job.skillsRequired.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-indigo-50/50 text-indigo-600 text-[10px] font-bold rounded">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs font-bold text-slate-500">Not specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right / Side Column - Application Box */}
        <section className="space-y-6">
          {alreadyApplied ? (
            <div className="bg-white rounded-2xl border border-emerald-100 p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">Already Applied!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You applied to this job posting. We are reviewing your candidacy.
              </p>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Pipeline Status:</span>
                <span className="font-bold text-emerald-700 uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 text-[9px]">
                  {alreadyApplied.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Apply Now</h3>
              
              {success ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center space-y-2">
                  <CheckCircle2 className="text-emerald-600 mx-auto" size={24} />
                  <p className="text-xs font-bold text-emerald-800">Application Submitted!</p>
                  <p className="text-[10px] text-emerald-600">Auto-scoring resume in progress...</p>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="bg-red-50 border border-red-100 text-red-650 text-xs font-semibold p-3 rounded-lg">
                      {errorMsg}
                    </div>
                  )}

                  {/* Previous resume reuse selection */}
                  {hasPreviousResume && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resume Option</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setApplyOption('reuse')}
                          className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                            applyOption === 'reuse'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Reuse Saved
                        </button>
                        <button
                          type="button"
                          onClick={() => setApplyOption('new')}
                          className={`py-2 px-3 text-xs font-bold border rounded-lg transition-all ${
                            applyOption === 'new'
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Upload New
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Resume Form Group */}
                  {applyOption === 'new' && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Upload Resume (PDF)</label>
                      <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer relative transition-colors">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setNewResume(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="text-slate-400 mx-auto mb-1.5" size={20} />
                        <span className="block text-xs font-bold text-slate-600 truncate">
                          {newResume ? newResume.name : 'Select PDF File'}
                        </span>
                        <span className="block text-[10px] text-slate-400">Max size 5MB</span>
                      </div>
                    </div>
                  )}

                  {/* Phone input */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 text-slate-300" size={16} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="+1 (555) 019-2834"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Apply to Designation
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default JobDetails;
