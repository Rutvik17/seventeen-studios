/**
 * The career timeline: each role's title and dates, and the education. The
 * founder page's chapter tabs, the date line under each chapter and the
 * prologue's education line are all read from here, so a date is written once.
 *
 * The full résumé — the achievements, the skills, the contact details — is the
 * Word document in `public/founder`, and only there. This file deliberately
 * carries nothing the pages do not render, so there is no second copy of that
 * writing to fall out of step with it.
 */

export interface ResumeRole {
  company: string;
  role: string;
  /** MM/YYYY, as the résumé writes them. */
  start: string;
  end: string;
}

export const resumeExperience: ResumeRole[] = [
  {
    company: 'Ernst & Young',
    role: 'Senior Frontend Engineer',
    start: '11/2023',
    end: 'Present',
  },
  {
    company: 'Shop-Ware',
    role: 'React Native Engineer',
    start: '06/2022',
    end: '10/2023',
  },
  {
    company: 'Nuvalence',
    role: 'Software Engineer',
    start: '11/2021',
    end: '06/2022',
  },
  {
    company: 'Mitel',
    role: 'UI/UX Software Developer',
    start: '11/2018',
    end: '10/2021',
  },
];

export const resumeEducation = {
  school: 'Centennial College',
  credential: 'Associate in Applied Science (A.A.S.), Software Engineering',
  date: '06/2018',
} as const;
