"use client";

import type { Dispatch, SetStateAction } from "react";
import type {
  EducationItem,
  ExperienceItem,
  ProjectItem,
  ResumeDocument,
} from "@/lib/types";

/** Content edits all pass through the studio history dispatcher. */
export function useResumeContent(
  doc: ResumeDocument | null,
  setDoc: Dispatch<SetStateAction<ResumeDocument | null>>,
) {
  // Update nested document fields
  function updateField<T extends keyof ResumeDocument>(
    section: T,
    value: ResumeDocument[T],
  ) {
    if (!doc) return;
    setDoc({
      ...doc,
      [section]: value,
    });
  }
  function updateProfileField<K extends keyof ResumeDocument["profile"]>(
    field: K,
    val: ResumeDocument["profile"][K],
  ) {
    if (!doc) return;
    setDoc({
      ...doc,
      profile: {
        ...doc.profile,
        [field]: val,
      },
    });
  }
  // Experience handlers
  function addExperience() {
    if (!doc) return;
    const newExp: ExperienceItem = {
      id: crypto.randomUUID(),
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      summary: "",
      bullets: [""],
      technologies: [],
    };
    updateField("experience", [newExp, ...doc.experience]);
  }
  function updateExperienceItem(index: number, updated: ExperienceItem) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[index] = updated;
    updateField("experience", items);
  }
  function removeExperienceItem(index: number) {
    if (!doc) return;
    const items = doc.experience.filter((_, i) => i !== index);
    updateField("experience", items);
  }
  function updateBullet(expIndex: number, bulletIndex: number, text: string) {
    if (!doc) return;
    const items = structuredClone(doc.experience);
    items[expIndex].bullets[bulletIndex] = text;
    updateField("experience", items);
  }
  // Education handlers
  function addEducation() {
    if (!doc) return;
    const newEdu: EducationItem = {
      id: crypto.randomUUID(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      grade: "",
      highlights: [],
    };
    updateField("education", [newEdu, ...doc.education]);
  }
  function updateEducationItem(index: number, updated: EducationItem) {
    if (!doc) return;
    const items = [...doc.education];
    items[index] = updated;
    updateField("education", items);
  }
  function removeEducationItem(index: number) {
    if (!doc) return;
    const items = doc.education.filter((_, i) => i !== index);
    updateField("education", items);
  }
  // Project handlers
  function addProject() {
    if (!doc) return;
    const newProj: ProjectItem = {
      id: crypto.randomUUID(),
      name: "",
      role: "",
      url: "",
      startDate: "",
      endDate: "",
      bullets: [""],
      technologies: [],
    };
    updateField("projects", [newProj, ...doc.projects]);
  }
  function updateProjectItem(index: number, updated: ProjectItem) {
    if (!doc) return;
    const items = [...doc.projects];
    items[index] = updated;
    updateField("projects", items);
  }
  function removeProjectItem(index: number) {
    if (!doc) return;
    const items = doc.projects.filter((_, i) => i !== index);
    updateField("projects", items);
  }
  return {
    updateField,
    updateProfileField,
    addExperience,
    updateExperienceItem,
    removeExperienceItem,
    updateBullet,
    addEducation,
    updateEducationItem,
    removeEducationItem,
    addProject,
    updateProjectItem,
    removeProjectItem,
  };
}

export type ResumeContentActions = ReturnType<typeof useResumeContent>;
