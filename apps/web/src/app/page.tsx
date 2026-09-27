'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Icons } from '@/components/Icons';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { JobApplication, ResumeSummary } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [resList, jobList] = await Promise.all([
          api.listResumes(),
          api.listJobs(),
        ]);
        setResumes(resList);
        setJobs(jobList);
      } catch (err: any) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleDuplicate(id: string) {
    try {
      const duplicated = await api.duplicateResume(id);
      router.push(`/resumes/${duplicated.metadata.id}`);
    } catch (err: any) {
      alert(`Could not duplicate: ${err.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this resume?')) {
      try {
        await api.deleteResume(id);
        setResumes((prev) => prev.filter((r) => r.id !== id));
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  }

  async function handleCreateNew() {
    try {
      const newResume = await api.createResume({
        title: 'New Resume',
        targetRole: 'Full Stack Engineer',
      });
      router.push(`/resumes/${newResume.metadata.id}`);
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    }
  }

  return (
    <div className="flex flex-col w-full" onClick={() => setActiveMenuId(null)}>
      <div className="max-w-[1120px] w-full mx-auto px-space-lg py-margin-desktop space-y-space-xl">
        {/* Header Ribbon */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-lg border-b border-surface-container-high">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
              {t('dashboard')}
            </span>
            <h1 className="font-headline-xl text-headline-xl text-on-surface">
              {t('dashboardTitle')}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t('dashboardSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-shrink-0">
            <Link
              href="/import"
              className="h-8 px-space-md flex items-center gap-space-xs rounded bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors shadow-sm"
            >
              <Icons.Upload size={16} className="text-secondary" />
              <span>{t('importCv')}</span>
            </Link>
            <button
              type="button"
              onClick={handleCreateNew}
              className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-md text-label-md hover:bg-inverse-surface transition-colors shadow-sm"
            >
              <Icons.Add size={16} />
              <span>{t('newResume')}</span>
            </button>
          </div>
        </header>

        {/* Section 1: Recent Resumes */}
        <section className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {t('recentResumes')}
              </h2>
              <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm">
                {resumes.length}
              </span>
            </div>
            <Link
              href="/resumes"
              className="font-label-sm text-label-sm text-secondary hover:text-on-surface transition-colors flex items-center gap-space-xs"
            >
              <span>{t('viewAll')}</span>
              <Icons.ArrowRight size={14} />
            </Link>
          </div>

          <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-surface-container-highest overflow-visible">
            {/* Table Header */}
            <div className="grid grid-cols-12 px-space-md py-space-sm bg-surface-container-low text-secondary font-label-sm text-label-sm select-none rounded-t-lg border-b border-surface-container-high">
              <div className="col-span-4">Document Name</div>
              <div className="col-span-3">Target Role</div>
              <div className="col-span-2">Template</div>
              <div className="col-span-2">Last Edited</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {loading ? (
              <div className="p-space-lg text-center text-secondary font-body-sm">
                Loading resumes...
              </div>
            ) : resumes.length === 0 ? (
              <div className="p-space-xl text-center flex flex-col items-center gap-space-sm">
                <Icons.Document size={32} className="text-secondary" />
                <p className="font-body-md text-secondary">No resumes created yet.</p>
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="px-3 py-1.5 rounded bg-primary text-on-primary text-label-sm"
                >
                  Create Your First Resume
                </button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-surface-container-high">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className="group grid grid-cols-12 items-center px-space-md py-space-md hover:bg-surface-container-low transition-colors relative"
                  >
                    <div className="col-span-4 flex items-center gap-space-sm min-w-0 pr-space-md">
                      <Icons.Document size={18} className="text-secondary group-hover:text-on-surface transition-colors flex-shrink-0" />
                      <Link
                        href={`/resumes/${r.id}`}
                        className="font-label-lg text-label-lg text-on-surface truncate hover:underline underline-offset-2"
                      >
                        {r.title}
                      </Link>
                    </div>

                    <div className="col-span-3 text-on-surface-variant font-body-md text-body-md truncate pr-space-md">
                      {r.targetRole || 'General Profile'}
                    </div>

                    <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                      <span className="font-label-sm text-label-sm text-on-secondary-container bg-surface-container px-space-xs py-0.5 rounded capitalize">
                        {r.templateId}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-medium uppercase">
                        {(r.language || 'en').toUpperCase()}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-highest text-primary font-semibold">
                        {r.targetMarket || 'TR'}
                      </span>
                    </div>

                    <div className="col-span-2 font-body-sm text-body-sm text-secondary">
                      {new Date(r.updatedAt).toLocaleDateString()}
                    </div>

                    <div className="col-span-1 flex justify-end relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === r.id ? null : r.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
                      >
                        <Icons.More size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === r.id && (
                        <div
                          className="absolute right-0 top-8 w-36 bg-surface-container-lowest rounded shadow-lg z-50 p-space-xs flex flex-col gap-0.5 border border-surface-container-highest"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/resumes/${r.id}`}
                            className="w-full text-left px-space-sm py-space-xs rounded font-label-md text-label-md text-on-surface hover:bg-surface-container flex items-center justify-between"
                          >
                            <span>Open</span>
                            <span className="font-label-sm text-secondary">⌘O</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(r.id)}
                            className="w-full text-left px-space-sm py-space-xs rounded font-label-md text-label-md text-on-surface hover:bg-surface-container flex items-center justify-between"
                          >
                            <span>Duplicate</span>
                            <span className="font-label-sm text-secondary">⌘D</span>
                          </button>

                          <a
                            href={api.getExportUrl(r.id, 'pdf', false)}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full text-left px-space-sm py-space-xs rounded font-label-md text-label-md text-on-surface hover:bg-surface-container"
                          >
                            Export PDF
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="w-full text-left px-space-sm py-space-xs rounded font-label-md text-label-md text-error hover:bg-error-container"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Recent Jobs Tracker */}
        <section className="flex flex-col gap-space-sm pt-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Recent Jobs
              </h2>
              <span className="px-space-xs py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm">
                {jobs.length} tracked
              </span>
            </div>
            <Link
              href="/jobs"
              className="font-label-sm text-label-sm text-secondary hover:text-on-surface transition-colors flex items-center gap-space-xs"
            >
              <span>Manage tracker</span>
              <Icons.ArrowRight size={14} />
            </Link>
          </div>

          <div className="bg-surface-container-lowest rounded-lg shadow-sm border border-surface-container-highest overflow-hidden">
            <div className="grid grid-cols-12 px-space-md py-space-sm bg-surface-container-low text-secondary font-label-sm text-label-sm select-none border-b border-surface-container-high">
              <div className="col-span-3">Company</div>
              <div className="col-span-4">Position</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Linked Resume</div>
              <div className="col-span-1 text-right">Details</div>
            </div>

            <div className="flex flex-col divide-y divide-surface-container-high">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="group grid grid-cols-12 items-center px-space-md py-space-md hover:bg-surface-container-low transition-colors"
                >
                  <div className="col-span-3 flex items-center gap-space-sm min-w-0 pr-space-sm">
                    <span className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-label-sm text-on-surface font-semibold flex-shrink-0">
                      {j.company.charAt(0)}
                    </span>
                    <span className="font-label-lg text-label-lg text-on-surface truncate">
                      {j.company}
                    </span>
                  </div>

                  <div className="col-span-4 font-body-md text-body-md text-on-surface-variant truncate pr-space-md">
                    {j.position}
                  </div>

                  <div className="col-span-2">
                    <span className="font-label-sm text-label-sm px-space-xs py-0.5 rounded capitalize bg-surface-container text-secondary">
                      {j.status}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-space-xs min-w-0 pr-space-sm">
                    <Icons.Link size={14} className="text-secondary flex-shrink-0" />
                    <span className="font-body-sm text-body-sm text-secondary truncate">
                      {j.linkedResumeId ? 'Linked' : 'None'}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <Link
                      href={`/jobs?selected=${j.id}`}
                      className="font-label-sm text-label-sm text-secondary group-hover:text-on-surface hover:underline"
                    >
                      Compare
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
