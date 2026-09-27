import React from 'react';
import { ResumeDocument } from '@/lib/types';

export type ResumeTemplateId = 'minimal' | 'technical' | 'professional';

export interface ResumeTemplateProps {
  document: ResumeDocument;
  isPrintMode?: boolean;
  className?: string;
}

export interface ResumeTemplateDefinition {
  id: ResumeTemplateId;
  name: string;
  category: string;
  description: string;
  recommendedFor: string;
  defaultAccentColor: string;
  defaultFontFamily: string;
  renderer: React.ComponentType<ResumeTemplateProps>;
}
