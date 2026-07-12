import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../utils/api';
import { Briefcase, Users, TrendingUp, Calendar, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  const funnelStages = ['applied', 'screening', 'interview', 'technical', 'hr', 'offer', 'hired'];
  
  const funnelData = funnelStages.map(stage => {
    const matched = data.candidatesByStatus.find(item => item._id === stage);
    return {
      name: stage === 'hr' ? 'HR Round' : stage.charAt(0).toUpperCase() + stage.slice(1),
      count: matched ? matched.count : 0
    };
  });

  const jobData = data.candidatesByJob.map(item => ({
    name: item._id[0] || 'Unknown',
    value: item.count
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalJobs}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Briefcase className="text-indigo-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Open Jobs</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.openJobs}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Candidates</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.totalCandidates}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Time-to-Hire</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.avgTimeToHire || 0}d</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-lg">
              <Clock className="text-teal-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Recent Activity</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{data.recentCandidates.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hiring Funnel Stages</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Candidates by Job</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={jobData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Skills Demand Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Demanded Skills</h2>
          <div className="space-y-4">
            {data.topSkills && data.topSkills.length > 0 ? (
              data.topSkills.map((skill, index) => {
                const maxVal = Math.max(...data.topSkills.map(s => s.value)) || 1;
                const percentage = (skill.value / maxVal) * 100;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm font-semibold text-slate-700">
                      <span>{skill.name}</span>
                      <span className="text-indigo-600 text-xs font-bold">{skill.value} postings</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No skills demand tracked yet</p>
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
            {data.recentCandidates.map((candidate) => (
              <div key={candidate._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{candidate.name}</p>
                    <p className="text-sm text-gray-500">{candidate.jobId?.title || 'Unknown Job'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                    candidate.status === 'hired' ? 'bg-green-100 text-green-700' :
                    candidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    candidate.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {candidate.status}
                  </span>
                </div>
              </div>
            ))}
            {data.recentCandidates.length === 0 && (
              <div className="p-8 text-center text-gray-500">No recent candidates</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
