export type UserRole = "admin" | "user";
export type Language = "fr" | "en";

export type SessionStatus =
  | "recording"
  | "transcribing"
  | "summarizing"
  | "completed"
  | "error";

export type ReportCategory =
  | "general"
  | "consultation"
  | "hearing"
  | "deposition"
  | "meeting";

export type ReportStatus = "draft" | "final" | "archived";
export type ReportFormat = "standard" | "detailed" | "brief";

export interface SessionWithRelations {
  id: string;
  title: string;
  description: string | null;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  caseReference: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  status: SessionStatus;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  transcription?: {
    id: string;
    content: string;
    segments: string | null;
    language: string;
    confidence: number | null;
  } | null;
  reports?: ReportData[];
  notes?: NoteData[];
}

export interface ReportData {
  id: string;
  title: string;
  summary: string;
  keyPoints: string;
  actionItems: string | null;
  legalNotes: string | null;
  category: ReportCategory;
  status: ReportStatus;
  format: ReportFormat;
  exportedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sessionId: string;
  userId: string;
  session?: {
    title: string;
    clientName: string;
    caseReference: string | null;
  };
}

export interface NoteData {
  id: string;
  content: string;
  timestamp: number | null;
  isImportant: boolean;
  createdAt: Date;
}

export interface DashboardStats {
  totalSessions: number;
  totalReports: number;
  totalDuration: number;
  recentSessions: SessionWithRelations[];
  recentReports: ReportData[];
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}
