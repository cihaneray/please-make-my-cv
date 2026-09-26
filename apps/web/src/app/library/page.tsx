'use client';

import React, { useEffect, useState } from 'react';
import { Icons } from '@/components/Icons';
import { api } from '@/lib/api';
import { BulletVariant, LibraryItemType, LibrarySnippet } from '@/lib/types';

export default function LibraryPage() {
  const [snippets, setSnippets] = useState<LibrarySnippet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<LibraryItemType | 'all'>('all');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddBox, setShowAddBox] = useState<boolean>(false);

  // New snippet state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Design Systems');
  const [newTags, setNewTags] = useState('Architecture, Metrics (+20%)');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.listSnippets();
        setSnippets(data);
      } catch (err: any) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateSnippet(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent) return;
    try {
      const tagsList = newTags.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await api.createSnippet({
        title: newTitle || 'Career Achievement',
        content: newContent,
        category: newCategory,
        tags: tagsList,
        type: LibraryItemType.BULLET,
        variants: [
          { id: `var-1`, type: 'technical', text: `Engineered and deployed ${newContent.toLowerCase()}` },
          { id: `var-2`, type: 'concise', text: newContent },
        ],
      });
      setSnippets([created, ...snippets]);
      setShowAddBox(false);
      setNewTitle('');
      setNewContent('');
    } catch (err: any) {
      alert(`Failed to add snippet: ${err.message}`);
    }
  }

  async function handleDeleteSnippet(id: string) {
    if (confirm('Delete this career snippet from the library?')) {
      try {
        await api.deleteSnippet(id);
        setSnippets(snippets.filter((s) => s.id !== id));
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  }

  const filtered = snippets.filter((s) => {
    if (activeTab !== 'all' && s.type !== activeTab) return false;
    if (activeTag !== 'all' && !s.tags.includes(activeTag)) return false;
    if (
      searchQuery &&
      !s.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full">
      {/* Editorial Vault Header */}
      <div className="relative w-full bg-surface-container-lowest px-margin-desktop py-space-xl overflow-hidden shadow-sm border-b border-surface-container-high">
        <div className="relative max-w-7xl mx-auto flex flex-col gap-space-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
            <div className="flex flex-col gap-space-xs max-w-2xl">
              <div className="flex items-center gap-space-sm">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary px-space-xs py-0.5 rounded bg-surface-container">
                  Vault 04.2
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary-fixed-dim" />
                <span className="font-label-sm text-label-sm text-secondary">
                  Global Career Content Repository
                </span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Library & Career Content
              </h1>
              <p className="font-body-md text-body-md text-secondary">
                Store, tag, and reuse battle-tested achievements, projects, and skills across all resumes.
              </p>
            </div>

            {/* Metric Pulse */}
            <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded border border-surface-container-highest">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase">
                  Snippets Stored
                </span>
                <span className="font-headline-lg text-headline-lg text-on-surface">
                  {snippets.length}
                </span>
              </div>
              <div className="w-px h-6 bg-surface-container-highest" />
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-secondary uppercase">
                  ATS Match Avg
                </span>
                <span className="font-headline-lg text-headline-lg text-on-tertiary-container">
                  94.2%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full max-w-7xl mx-auto px-margin-desktop py-space-xl">
        <div className="flex flex-col gap-space-md">
          {/* Action strip: search & tag chips */}
          <div className="flex flex-col gap-space-md bg-surface-container-lowest p-space-md rounded shadow-sm border border-surface-container-highest">
            <div className="flex items-center gap-space-sm">
              <div className="flex-1 flex items-center gap-space-sm px-space-md py-1.5 rounded bg-surface-container-low text-on-surface-variant border border-surface-container-highest">
                <Icons.Search size={16} className="text-secondary" />
                <input
                  type="text"
                  placeholder="Search reusable bullets, metrics, or technologies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none w-full font-body-sm text-body-sm text-on-surface placeholder:text-secondary"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddBox(!showAddBox)}
                className="h-8 px-space-md flex items-center gap-space-xs rounded bg-primary text-on-primary font-label-sm text-label-sm hover:bg-inverse-surface transition-colors flex-shrink-0 shadow-sm"
              >
                <Icons.Add size={14} />
                <span>Add Snippet</span>
              </button>
            </div>

            {/* Tag filter chips */}
            <div className="flex items-center gap-space-xs flex-wrap select-none">
              {['all', 'Design Systems', 'Architecture', 'Metrics (+20%)', 'Management'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`px-space-sm py-0.5 rounded text-label-sm font-label-sm transition-colors ${
                    activeTag === tag
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tag === 'all' ? 'All Tags' : tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Creation Box */}
          {showAddBox && (
            <form
              onSubmit={handleCreateSnippet}
              className="flex flex-col gap-space-sm bg-surface-container p-space-md rounded shadow-sm border border-surface-container-highest"
            >
              <div className="flex items-center justify-between">
                <span className="font-headline-md text-headline-md text-on-surface">
                  New Career Achievement Snippet
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddBox(false)}
                  className="text-secondary hover:text-on-surface"
                >
                  <Icons.Close size={16} />
                </button>
              </div>

              <input
                type="text"
                placeholder="Snippet title (e.g. Distributed Database Scaled to 10k QPS)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 px-3 rounded bg-surface-container-lowest text-body-sm outline-none border border-surface-container-highest"
              />

              <textarea
                rows={3}
                required
                placeholder="Core accomplishment text..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="p-3 rounded bg-surface-container-lowest text-body-sm outline-none border border-surface-container-highest resize-none"
              />

              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Tags (comma-separated, e.g. Architecture, Python)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="h-8 px-3 rounded bg-surface-container-lowest text-body-sm outline-none border border-surface-container-highest w-80"
                />

                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-primary text-on-primary text-label-sm font-medium"
                >
                  Save to Library
                </button>
              </div>
            </form>
          )}

          {/* Snippets List */}
          {loading ? (
            <div className="p-space-xl text-center text-secondary">Loading library...</div>
          ) : filtered.length === 0 ? (
            <div className="p-space-xl text-center text-secondary bg-surface-container-lowest rounded border border-surface-container-highest">
              No snippets matched your criteria.
            </div>
          ) : (
            <div className="flex flex-col gap-space-sm">
              {filtered.map((snip) => (
                <div
                  key={snip.id}
                  className="p-space-md rounded-lg bg-surface-container-lowest border border-surface-container-highest shadow-sm flex flex-col gap-space-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-space-sm">
                      <Icons.Quote size={16} className="text-secondary" />
                      <span className="font-headline-md text-on-surface font-semibold">
                        {snip.title || 'Career Bullet'}
                      </span>
                      <span className="font-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary text-[10px] uppercase font-bold">
                        {snip.category}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSnippet(snip.id)}
                      className="text-secondary hover:text-error"
                    >
                      <Icons.Delete size={16} />
                    </button>
                  </div>

                  <p className="text-[13px] text-on-surface font-normal leading-relaxed pl-6">
                    {snip.content}
                  </p>

                  {/* Variants display */}
                  {snip.variants && snip.variants.length > 0 && (
                    <div className="pl-6 pt-2 flex flex-col gap-1 border-t border-surface-container-high mt-1">
                      <span className="font-label-sm text-[11px] text-secondary font-medium">
                        Tone Variants:
                      </span>
                      {snip.variants.map((v) => (
                        <div key={v.id} className="text-[11.5px] text-secondary flex items-start gap-2">
                          <span className="font-semibold uppercase text-[10px] text-on-surface-variant w-16 shrink-0">
                            {v.type}:
                          </span>
                          <span className="text-on-surface">{v.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="pl-6 flex items-center gap-1.5 flex-wrap pt-1">
                    {snip.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-surface-container text-secondary"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
