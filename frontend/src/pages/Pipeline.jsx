import React, { useEffect, useState } from 'react';
import { candidatesAPI, jobsAPI } from '../utils/api';
import { Mail, Briefcase, Award, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CandidateDetailsModal from '../components/CandidateDetailsModal';

const PIPELINE_STATUSES = [
  { id: 'applied', label: 'Applied', color: 'border-t-blue-500 bg-blue-50/30' },
  { id: 'screening', label: 'Screening', color: 'border-t-purple-500 bg-purple-50/30' },
  { id: 'interview', label: 'Interview', color: 'border-t-pink-500 bg-pink-50/30' },
  { id: 'technical', label: 'Technical', color: 'border-t-orange-500 bg-orange-50/30' },
  { id: 'hr', label: 'HR Round', color: 'border-t-teal-500 bg-teal-50/30' },
  { id: 'offer', label: 'Offer', color: 'border-t-green-500 bg-green-50/30' },
  { id: 'hired', label: 'Hired', color: 'border-t-emerald-500 bg-emerald-50/30' },
  { id: 'rejected', label: 'Rejected', color: 'border-t-red-500 bg-red-50/30' }
];

const Pipeline = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadPipelineData();
  }, [selectedJobFilter]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedJobFilter) params.jobId = selectedJobFilter;
      
      const [candidatesRes, jobsRes] = await Promise.all([
        candidatesAPI.getAll(params),
        jobsAPI.getAll()
      ]);
      setCandidates(candidatesRes.data);
      setJobs(jobsRes.data);
    } catch (error) {
      console.error('Failed to load pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, id) => {
    if (user?.role === 'viewer') {
      e.preventDefault();
      return;
    }
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const candidateId = e.dataTransfer.getData('text/plain') || draggingId;
    if (!candidateId) return;

    // Reset dragging state
    setDraggingId(null);

    // Find candidate to see if status actually changed
    const candidate = candidates.find(c => c._id === candidateId);
    if (!candidate || candidate.status === targetStatus) return;

    try {
      setUpdatingId(candidateId);
      await candidatesAPI.updateStatus(candidateId, targetStatus);
      // Update local state directly for snappy experience
      setCandidates(prev =>
        prev.map(c => (c._id === candidateId ? { ...c, status: targetStatus } : c))
      );
      // Reload from DB to fetch updated logs/timelines
      loadPipelineData();
    } catch (error) {
      console.error('Failed to update candidate status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Group candidates by status
  const candidatesByStatus = PIPELINE_STATUSES.reduce((acc, status) => {
    acc[status.id] = candidates.filter(c => c.status === status.id);
    return acc;
  }, {});

  if (loading && candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
        <span className="text-sm font-semibold text-gray-500">Loading Kanban pipeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hiring Pipeline</h1>
          <p className="text-sm text-gray-500 font-medium">Drag and drop candidates to progress them through hiring stages.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedJobFilter}
            onChange={(e) => setSelectedJobFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-700"
          >
            <option value="">All Job Roles</option>
            {jobs.map(job => (
              <option key={job._id} value={job._id}>{job.title}</option>
            ))}
          </select>
          <button
            onClick={loadPipelineData}
            className="p-2 hover:bg-slate-100 border rounded-lg transition-colors bg-white text-gray-600"
            title="Refresh pipeline"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6">
        <div className="flex gap-4 h-full min-w-max">
          {PIPELINE_STATUSES.map(col => {
            const list = candidatesByStatus[col.id] || [];
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-72 flex flex-col rounded-xl border border-slate-200/60 overflow-hidden ${col.color}`}
              >
                {/* Column Title Header */}
                <div className={`px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between border-t-4 ${col.color.split(' ')[0]}`}>
                  <span className="font-bold text-slate-800 text-sm tracking-wide capitalize">{col.label}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-extrabold rounded-full">
                    {list.length}
                  </span>
                </div>

                {/* Column Body list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {list.map(candidate => {
                    const isUpdating = updatingId === candidate._id;
                    return (
                      <div
                        key={candidate._id}
                        draggable={user?.role !== 'viewer' && !isUpdating}
                        onDragStart={(e) => handleDragStart(e, candidate._id)}
                        className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing relative ${
                          isUpdating ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {isUpdating && (
                          <div className="absolute inset-0 bg-white/40 flex items-center justify-center rounded-xl">
                            <Loader2 className="animate-spin text-indigo-600" size={16} />
                          </div>
                        )}

                        <div className="space-y-2">
                          {/* Name and Match Score */}
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => setSelectedCandidateId(candidate._id)}
                              className="font-bold text-slate-800 hover:text-indigo-600 text-left text-sm transition-colors outline-none"
                            >
                              {candidate.name}
                            </button>
                            {candidate.matchScores && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                candidate.matchScores.overall >= 80 ? 'bg-green-100 text-green-700' :
                                candidate.matchScores.overall >= 50 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {candidate.matchScores.overall}% Match
                              </span>
                            )}
                          </div>

                          {/* Job Title */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{candidate.jobId?.title || 'Unknown Job'}</span>
                          </div>

                          {/* Contact Email */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Mail size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                          </div>

                          {/* Skills badges */}
                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100 border-dashed">
                              {candidate.skills.slice(0, 2).map((skill, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded border border-slate-100">
                                  {skill}
                                </span>
                              ))}
                              {candidate.skills.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded border border-slate-100">
                                  +{candidate.skills.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-200/50 rounded-xl py-8 px-4 text-center">
                      <span className="text-xs text-slate-400 font-medium">No candidates</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedCandidateId && (
        <CandidateDetailsModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
          onUpdate={loadPipelineData}
        />
      )}
    </div>
  );
};

export default Pipeline;
