import { Timestamp } from "firebase/firestore";

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  courseThumbnail: string;
  enrolledAt: Timestamp;
}

export interface PaymentInfo {
  method: string;
  paymentNumber: string;
  transactionId: string;
  screenshot: string;
}

export interface UserDoc {
  name: string;
  email: string;
  role: "student" | "admin";
  status: "pending" | "approved" | "rejected" | "suspended";
  enrolledCourses: EnrolledCourse[];
  activeCourseId: string;
  paymentInfo: PaymentInfo;
  createdAt: Timestamp;
}

export interface Chapter {
  chapterId: string;
  chapterName: string;
}

export interface Subject {
  subjectId: string;
  subjectName: string;
  chapters?: Chapter[];
}

export interface Instructor {
  name: string;
  subject: string;
  image: string;
}

export interface DiscussionGroup {
  name: string;
  link: string;
}

export interface Course {
  id: string;
  courseName: string;
  thumbnail: string;
  price: number;
  overview: string[];
  subjects: Subject[];
  instructors: Instructor[];
  discussionGroups: DiscussionGroup[];
  routinePDF: string;
  allMaterialsLink: string;
  createdAt: Timestamp;
}

export interface Video {
  id: string;
  courseId: string;
  courseName: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterName?: string;
  title: string;
  thumbnail: string;
  videoURL: string;
  pdfURL: string;
  order: number;
  createdAt: Timestamp;
}

export interface PaymentMethod {
  name: string;
  number: string;
}

export interface SocialLink {
  name: string;
  link: string;
}

export interface UsefulLink {
  name: string;
  link: string;
}

export interface AppSettings {
  appName: string;
  appLogo: string;
  youtubeChannel: string;
  googleDrive: string;
  paymentMethods: PaymentMethod[];
  socialLinks: SocialLink[];
  usefulLinks: UsefulLink[];
}

export interface EnrollRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  courseId: string;
  courseName: string;
  paymentMethod: string;
  paymentNumber: string;
  transactionId: string;
  screenshot: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}
