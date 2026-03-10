import { Timestamp } from "firebase/firestore";

export type ExamType = "mcq" | "written";

export interface ExamQuestion {
  id: string;
  questionText: string;
  questionImage?: string;
  type: ExamType;
  options?: { text: string; image?: string }[];
  correctAnswer?: number; // index for MCQ
  writtenAnswer?: string; // correct answer text/image URL for written questions
  marks: number;
}

export interface Exam {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: ExamType;
  duration: number; // minutes
  totalMarks: number;
  negativeMark: number; // marks deducted per wrong answer
  passMark: number; // minimum marks to pass
  startTime: Timestamp;
  endTime: Timestamp;
  questions: ExamQuestion[];
  resultPublished?: boolean;
  createdAt: Timestamp;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  answers: ExamAnswer[];
  totalMarks: number;
  obtainedMarks: number;
  correctCount: number;
  wrongCount: number;
  submittedAt: Timestamp;
  passed?: boolean;
  writtenGraded?: boolean;
  writtenMarks?: number;
  deviceInfo?: Record<string, any>;
}

export interface ExamAnswer {
  questionId: string;
  selectedOption?: number; // for MCQ
  writtenImageUrl?: string; // for written
  isCorrect?: boolean;
  marks: number;
  writtenMarksAwarded?: number; // marks given by admin for written
}
