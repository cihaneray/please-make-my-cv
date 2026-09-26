'use client';

import React, { useEffect, useState } from 'react';
import { Icons } from '@/components/Icons';
import { api } from '@/lib/api';
import { JobApplication, JobMatchAnalysis, JobStatus, ResumeSummary } from '@/lib/types';

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobApplication | null>(null);
  const [matchResult, setMatchResult] = useState<JobMatchAnalysis | null>(null);
  const [matching, setMatching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New job form state
  const [newCompany, setNewCompany] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStatus, setNewStatus] = useState<JobStatus>('saved' as JobStatus);
  const [linkedResume, setLinkedResume] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [jobList, resumeList] = await Promise.all([
          api.listJobs(),
          api.listResumes(),
        ]);
        setJobs(jobList);
        setResumes(resumeList);
        if (jobList.length > 0) {
          setSelectedJob(jobList[0]);
        }
      } catch (err: any) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Whenever selectedJob or linked resume changes, run Match analysis!
  useEffect(() => {
    if (!selectedJob) return;
    const resumeIdToMatch = selectedJob.linkedResumeId || (resumes[0] ? resumes[0].id : null);
    if (!resumeIdToMatch) return;

    async function runMatch() {
      try {
        setMatching(true);
        const res = await api.matchJob(selectedJob!.id, resumeIdToMatch!);
        setMatchResult(res);
      } catch (err) {
        console.error('Match failed:', err);
      } finally {
        setMatching(false);
      }
    }

    runMatch();
  }, [selectedJob, resumes]);

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompany || !newPosition) return;
    try {
      const created = await api.createJob({
        company: newCompany,
        position: newPosition,
        description: newDesc,
        location: newLocation,
        status: newStatus,
        linkedResumeId: linkedResume || (resumes[0] ? resumes[0].id : null),
      });
      setJobs([created, ...jobs]);
      setSelectedJob(created);
      setShowAddModal(false);
      setNewCompany('');
      setNewPosition('');
      setNewDesc('');
      setNewLocation('');
    } catch (err: any) {
      alert(`Create job failed: ${err.message}`);
    }
  }

  async function handleStatusChange(status: any) {
    if (!selectedJob) return;
    try {
      const updated = await api.updateJob(selectedJob.id, { status });
      setSelectedJob(updated);
      setJobs(jobs.map((j) => (j.id === updated.id ? updated : j)));
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="p-space-lg flex flex-col gap-space-lg max-w-[1600px] w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-surface-container-high pb-4">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-on-surface">Career Pipeline</span>
            </div>
            <div className="flex items-baseline gap-space-md">
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Jobs & Match Analysis
              </h1>
              <span className="font-label-md text-label-md text-secondary">
                {jobs.length} tracked applications
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-md hover:bg-inverse-surface transition-colors shadow-sm"
          >
            <Icons.Add size={16} />
            <span>Add Target Job</span>
          </button>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Column: Job Cards List (4 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-space-xs">
            <div className="flex items-center justify-between px-space-xs text-secondary font-label-sm pb-1">
              <span>Target Positions ({jobs.length})</span>
            </div>

            {loading ? (
              <div className="p-space-lg text-secondary">Loading jobs...</div>
            ) : jobs.length === 0 ? (
              <div className="p-space-lg bg-surface-container-lowest rounded-lg border border-surface-container-highest text-secondary text-center">
                No jobs added yet.
              </div>
            ) : (
              jobs.map((j) => {
                const isSelected = selectedJob?.id === j.id;
                return (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJob(j)}
                    className={`p-space-md rounded-lg transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-surface-container-lowest border-primary shadow-sm'
                        : 'bg-surface-container border-transparent hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-space-sm mb-1">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-8 h-8 rounded bg-primary-container text-on-primary-fixed flex items-center justify-center font-headline-md shrink-0">
                          {j.company.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-headline-md text-on-surface truncate">
                            {j.company}
                          </span>
                          <span className="font-body-sm text-on-surface-variant truncate">
                            {j.position}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] capitalize bg-surface-container-high text-secondary shrink-0">
                        {j.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 text-secondary text-[11px] border-t border-surface-container-high">
                      <span className="truncate">{j.location || 'Remote'}</span>
                      <span>{new Date(j.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Match Analysis Stage (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-space-md bg-surface-container-lowest p-space-xl rounded-lg border border-surface-container-highest shadow-sm">
            {selectedJob ? (
              <>
                <div className="flex items-start justify-between gap-space-md border-b border-surface-container-high pb-4">
                  <div className="flex flex-col">
                    <span className="font-headline-xl text-on-surface">
                      {selectedJob.position}
                    </span>
                    <span className="font-headline-md text-secondary font-medium">
                      {selectedJob.company} {selectedJob.location ? `• ${selectedJob.location}` : ''}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={selectedJob.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="h-8 px-2.5 rounded bg-surface-container text-body-sm capitalize font-medium outline-none border border-surface-container-highest"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="interview">Interview</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Match Analysis Gauge & Summary */}
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-secondary uppercase font-semibold">
                      CV Compatibility Rating
                    </span>
                    <span className="text-[20px] font-bold text-on-tertiary-container">
                      {matching ? 'Calculating...' : `${matchResult?.matchScore || 75}% Match`}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-on-surface leading-normal">
                    {matchResult?.summary ||
                      'Comparing required technologies and qualifications from the job description against your CV.'}
                  </p>
                </div>

                {/* Matched Competencies */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-sm text-secondary uppercase font-semibold">
                    Matched Requirements ({matchResult?.matchedSkills.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchResult?.matchedSkills.map((sk, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        ✓ {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing / Gap Competencies */}
                {matchResult?.missingSkills && matchResult.missingSkills.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="font-label-sm text-secondary uppercase font-semibold">
                      Missing or Weakly Represented ({matchResult.missingSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchResult.missingSkills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200"
                        >
                          ! {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Feedback & Advisory Recommendations */}
                {matchResult?.sectionFeedback && matchResult.sectionFeedback.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-surface-container-high">
                    <span className="font-label-sm text-secondary uppercase font-semibold">
                      Match Insights & Advice
                    </span>
                    {matchResult.sectionFeedback.map((fb, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-surface-container text-[12px] flex flex-col gap-0.5">
                        <span className="font-semibold text-on-surface">{fb.section}</span>
                        <p className="text-secondary">{fb.message}</p>
                        <p className="text-primary font-medium pt-0.5">{fb.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Job Description Text */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-surface-container-high">
                  <span className="font-label-sm text-secondary uppercase font-semibold">
                    Job Description
                  </span>
                  <div className="p-3 rounded bg-surface-container-low text-[12px] text-on-surface leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {selectedJob.description || 'No description provided.'}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-space-xl text-center text-secondary">
                Select a job from the left panel to inspect match analysis.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Job Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreateJob}
            className="w-full max-w-lg bg-surface-container-lowest p-space-xl rounded-xl shadow-xl flex flex-col gap-space-md border border-surface-container-highest"
          >
            <div className="flex items-center justify-between border-b border-surface-container-high pb-2">
              <span className="font-headline-md font-semibold">Add New Target Job</span>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-secondary hover:text-on-surface"
              >
                <Icons.Close size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">Company Name</label>
              <input
                type="text"
                required
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="e.g. Stripe, Linear, Vercel"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">Position Title</label>
              <input
                type="text"
                required
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="e.g. Staff Software Engineer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">Location</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="h-8 px-2.5 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest"
                placeholder="San Francisco, CA or Remote"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-secondary">Job Description / Requirements</label>
              <textarea
                rows={4}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="p-2 rounded bg-surface-container-low text-body-sm outline-none border border-surface-container-highest resize-none"
                placeholder="Paste the job posting description here for automated keyword and ATS gap analysis..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded text-label-sm text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-primary text-on-primary text-label-sm font-medium hover:bg-inverse-surface"
              >
                Save & Analyze
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
