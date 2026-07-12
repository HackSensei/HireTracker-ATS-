import React, { useState, useEffect } from 'react';
import { candidatesAPI } from '../utils/api';
import { Mail, Phone, Calendar, Briefcase, Trash2, Send, Clock, User, Award, BookOpen } from 'lucide-react';

const CandidateDetailsModal = ({ candidateId, onClose, onUpdate }) => {
  const [candidate, setCandidate] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (candidateId) {
      loadCandidateDetails();
    }
  }, [candidateId]);

  const loadCandidateDetails = async () => {
    try {
      setLoading(true);
      const [candidateRes, timelineRes] = await Promise.all([
        candidatesAPI.getById(candidateId),
        candidatesAPI.getTimeline(candidateId)
      ]);
      setCandidate(candidateRes.data);
      setTimeline(timelineRes.data);
    } catch (error) {
      console.error('Failed to load candidate details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommenting(true);
      const response = await candidatesAPI.addComment(candidateId, newComment);
      setCandidate(response.data);
      setNewComment('');
      // Reload timeline to show comment activity
      const timelineRes = await candidatesAPI.getTimeline(candidateId);
      setTimeline(timelineRes.data);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const response = await candidatesAPI.deleteComment(candidateId, commentId);
      setCandidate(response.data);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
            <span className="text-sm font-semibold text-slate-500">Loading profile details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!candidate) return null;

  const statusColors = {
    applied: 'bg-blue-100 text-blue-800 border-blue-200',
    screening: 'bg-purple-100 text-purple-800 border-purple-200',
    interview: 'bg-pink-100 text-pink-800 border-pink-200',
    technical: 'bg-orange-100 text-orange-800 border-orange-200',
    hr: 'bg-teal-100 text-teal-800 border-teal-200',
    offer: 'bg-green-100 text-green-800 border-green-200',
    hired: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border-red-200'
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 progress-green';
    if (score >= 50) return 'text-amber-600 bg-amber-50 progress-amber';
    return 'text-red-600 bg-red-50 progress-red';
  };

  const getScoreProgressBg = (score) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 50) return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{candidate.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${statusColors[candidate.status] || 'bg-slate-100 text-slate-700'}`}>
                {candidate.status}
              </span>
            </div>
            <p className="text-slate-500 font-medium flex items-center gap-1.5 text-sm">
              <Briefcase size={16} />
              {candidate.jobId?.title || 'Unknown Job'} • {candidate.jobId?.department || 'General'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl p-1 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            &times; Close
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Main Info & Match Score (Left Column) */}
          <div className="p-6 space-y-6 md:col-span-2">
            
            {/* Match Score Dashboard Section */}
            {candidate.matchScores && (
              <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-slate-100 rounded-xl p-5">
                <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-1.5">
                  <Award size={18} className="text-indigo-600" />
                  AI Candidate Match Report
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  {/* Overall Circle */}
                  <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm sm:col-span-1">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke={
                          candidate.matchScores.overall >= 80 ? '#10b981' : candidate.matchScores.overall >= 50 ? '#f59e0b' : '#ef4444'
                        } strokeWidth="6" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - candidate.matchScores.overall / 100)} />
                      </svg>
                      <span className="absolute text-sm font-extrabold text-slate-800">{candidate.matchScores.overall}%</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wide">Overall</span>
                  </div>

                  {/* Criteria Breakdowns */}
                  <div className="sm:col-span-3 space-y-2">
                    {/* Skills Score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Skills Alignment</span>
                        <span>{candidate.matchScores.skills}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${getScoreProgressBg(candidate.matchScores.skills)}`} style={{ width: `${candidate.matchScores.skills}%` }}></div>
                      </div>
                    </div>
                    
                    {/* Experience Score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Experience Requirement</span>
                        <span>{candidate.matchScores.experience}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${getScoreProgressBg(candidate.matchScores.experience)}`} style={{ width: `${candidate.matchScores.experience}%` }}></div>
                      </div>
                    </div>

                    {/* Education Score */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Education Match</span>
                        <span>{candidate.matchScores.education}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full ${getScoreProgressBg(candidate.matchScores.education)}`} style={{ width: `${candidate.matchScores.education}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Email</span>
                <p className="text-slate-800 font-semibold text-sm flex items-center gap-1.5 overflow-hidden text-ellipsis">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <a href={`mailto:${candidate.email}`} className="hover:underline">{candidate.email}</a>
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Phone</span>
                <p className="text-slate-800 font-semibold text-sm flex items-center gap-1.5">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  {candidate.phone || 'N/A'}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Experience</span>
                <p className="text-slate-800 font-semibold text-sm flex items-center gap-1.5">
                  <Award size={16} className="text-slate-400 shrink-0" />
                  {candidate.experience || 0} years
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Applied Date</span>
                <p className="text-slate-800 font-semibold text-sm flex items-center gap-1.5">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  {new Date(candidate.appliedDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Education Details */}
            {candidate.education && (candidate.education.degree || candidate.education.institution) && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <BookOpen size={16} className="text-slate-400" />
                  Education
                </h4>
                <div className="border border-slate-100 p-4 rounded-xl bg-white shadow-sm space-y-1">
                  <p className="font-semibold text-slate-800 text-sm">{candidate.education.degree || 'Degree unspecified'}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {candidate.education.institution || 'Institution unspecified'}
                    {candidate.education.year ? ` • Graduated ${candidate.education.year}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Candidate Skills</h4>
              <div className="flex flex-wrap gap-2">
                {candidate.skills && candidate.skills.length > 0 ? (
                  candidate.skills.map((skill, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-50/70 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-100">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No skills listed</span>
                )}
              </div>
            </div>

            {/* General Notes */}
            {candidate.notes && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Recruiter Notes</h4>
                <p className="text-slate-600 bg-slate-50 p-4 rounded-xl text-sm border border-slate-100 whitespace-pre-wrap">
                  {candidate.notes}
                </p>
              </div>
            )}
            
            {/* Comments / Collaborative Feedback Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Recruiter Feedback & Discussions</h3>
              
              {/* Add Comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a recruiter comment or feedback..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={commenting}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  disabled={commenting || !newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 text-sm font-semibold shrink-0"
                >
                  <Send size={16} />
                  Post
                </button>
              </form>

              {/* Comments Feed */}
              <div className="space-y-3">
                {candidate.comments && candidate.comments.length > 0 ? (
                  candidate.comments.map((comment) => (
                    <div key={comment._id} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{comment.author}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-semibold capitalize">{comment.authorRole}</span>
                          <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-normal">{comment.text}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 bg-white hover:bg-slate-100 rounded border border-slate-200/50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2 bg-slate-50/50 border border-dashed rounded-lg">No comments posted yet. Start the conversation!</p>
                )}
              </div>
            </div>

          </div>

          {/* Activity Timeline (Right Column) */}
          <div className="p-6 bg-slate-50/30 overflow-y-auto space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Activity History</h3>
              <p className="text-xs text-slate-400 font-medium">Audit logs of all candidate pipeline updates</p>
            </div>
            
            <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-5">
              {timeline.length > 0 ? (
                timeline.map((act) => (
                  <div key={act._id} className="relative">
                    {/* Circle marker */}
                    <span className="absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 capitalize">
                          {act.action.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5 whitespace-nowrap">
                          <Clock size={10} />
                          {new Date(act.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{act.details}</p>
                      <div className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                        <User size={10} />
                        Performed by: <span className="text-slate-500 font-semibold">{act.performedBy?.name || 'System'}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">No activity logged yet</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CandidateDetailsModal;
