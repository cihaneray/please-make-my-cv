'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Icons } from './Icons';

export function Header() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleQuickNew() {
    try {
      setCreating(true);
      const newResume = await api.createResume({
        title: 'New Resume',
        targetRole: 'Software Engineer',
      });
      router.push(`/resumes/${newResume.metadata.id}`);
    } catch (err: any) {
      alert(`Could not create resume: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-highest z-40 flex items-center justify-between px-space-lg no-print">
      <div className="flex items-center gap-space-sm text-on-surface-variant w-80 max-w-md">
        <Icons.Search size={16} className="text-secondary" />
        <input
          type="text"
          placeholder="Quick search or jump to section..."
          className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-secondary"
        />
      </div>

      <div className="flex items-center gap-space-md">
        <Link
          href="/import"
          className="h-8 px-space-md flex items-center gap-space-xs rounded border border-surface-container-highest bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors"
        >
          <Icons.Upload size={14} className="text-secondary" />
          <span>Import</span>
        </Link>

        <button
          type="button"
          onClick={handleQuickNew}
          disabled={creating}
          className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-sm text-label-sm hover:bg-inverse-surface transition-colors shadow-sm disabled:opacity-50"
        >
          <Icons.Add size={15} />
          <span>{creating ? 'Creating...' : 'New Document'}</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs">
          AV
        </div>
      </div>
    </header>
  );
}
