/**
 * Generates the résumé artefacts from `src/content/resume.ts`.
 *
 *   node --experimental-strip-types scripts/build-resume.mjs
 *
 * Produces `public/founder/rutvik-patel-resume.docx` for applicant tracking
 * systems, and `…-resume.pdf` for the download on the site. Both are rendered
 * from the same data, so they cannot disagree.
 *
 * The PDF is printed by Chromium rather than converted by LibreOffice: the
 * conversion is unavailable in some environments, and printing gives control
 * over the typography while still emitting selectable text that a parser can
 * read. Requires `playwright` — `npm i -D playwright` if it is missing. Set
 * CHROMIUM_PATH to use a browser that is already on the machine.
 *
 * Formatting is deliberately plain, because the file has to survive applicant
 * tracking systems:
 *   - single column, no tables, no text boxes, no headers or footers
 *   - contact details in the body, not in a header (parsers skip headers)
 *   - conventional section headings: Summary / Skills / Experience / …
 *   - MM/YYYY dates, which is the format parsers key on
 *   - one common typeface, no graphics, no icons, real bullet lists
 */

import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
} from 'docx';

import {
  resumeHeader,
  resumeSummary,
  resumeSkills,
  resumeExperience,
  resumeProjects,
  resumeEducation,
} from '../src/content/resume.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'founder');
const docxPath = path.join(outDir, 'rutvik-patel-resume.docx');
const pdfPath = path.join(outDir, 'rutvik-patel-resume.pdf');

const FONT = 'Calibri';
const INK = '111111';
const MUTED = '444444';

const text = (value, options = {}) =>
  new TextRun({ text: value, font: FONT, color: INK, size: 20, ...options });

/** Section heading with the rule under it. */
const heading = (label) =>
  new Paragraph({
    spacing: { before: 240, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 2 } },
    children: [
      text(label.toUpperCase(), { bold: true, size: 21, characterSpacing: 20 }),
    ],
  });

const bullet = (value) =>
  new Paragraph({
    numbering: { reference: 'resume-bullets', level: 0 },
    spacing: { after: 40 },
    children: [text(value)],
  });

/**
 * Role header: title and employer on the left, dates right-aligned on the same
 * line via a tab stop. A single tab stop is safe for parsers; multi-column
 * layouts are not.
 */
const roleLine = (left, right) =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: 10800 }],
    spacing: { before: 160, after: 0 },
    children: [text(left, { bold: true }), text(`\t${right}`, { bold: true })],
  });

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    heading: HeadingLevel.TITLE,
    children: [text(resumeHeader.name.toUpperCase(), { bold: true, size: 32, characterSpacing: 30 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [text(resumeHeader.title, { size: 21, color: MUTED })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [
      text(
        [resumeHeader.location, resumeHeader.phone, resumeHeader.email].join('  •  '),
        { size: 19 },
      ),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      text(
        [resumeHeader.linkedin, resumeHeader.github, resumeHeader.site].join('  •  '),
        { size: 19 },
      ),
    ],
  }),

  heading('Summary'),
  new Paragraph({ spacing: { after: 40 }, children: [text(resumeSummary)] }),

  heading('Technical Skills'),
  ...resumeSkills.map(
    (group) =>
      new Paragraph({
        spacing: { after: 40 },
        children: [
          text(`${group.group}: `, { bold: true }),
          text(group.items.join(', ')),
        ],
      }),
  ),

  heading('Professional Experience'),
  ...resumeExperience.flatMap((role) => [
    roleLine(`${role.company} — ${role.location}`, `${role.start} – ${role.end}`),
    new Paragraph({
      spacing: { after: 40 },
      children: [text(role.role, { bold: true, italics: true })],
    }),
    ...role.bullets.map(bullet),
  ]),

  heading('Selected Projects'),
  ...resumeProjects.flatMap((project) => [
    roleLine(`${project.name} — ${project.link}`, project.period),
    new Paragraph({
      spacing: { after: 40 },
      children: [text(project.role, { bold: true, italics: true })],
    }),
    ...project.bullets.map(bullet),
  ]),

  heading('Education'),
  roleLine(
    `${resumeEducation.school} — ${resumeEducation.location}`,
    resumeEducation.date,
  ),
  new Paragraph({ spacing: { after: 40 }, children: [text(resumeEducation.credential)] }),
];

const doc = new Document({
  creator: resumeHeader.name,
  title: `${resumeHeader.name} — Résumé`,
  description: resumeHeader.title,
  numbering: {
    config: [
      {
        reference: 'resume-bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 260, hanging: 180 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          // US Letter, narrow margins so the record fits one page.
          size: { width: 12240, height: 15840 },
          margin: { top: 560, bottom: 500, left: 700, right: 700 },
        },
      },
      children,
    },
  ],
});

mkdirSync(outDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync(docxPath, buffer);
assertWritten(docxPath, 6000);

/* ------------------------------------------------------------------ PDF */

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const printHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escape(resumeHeader.name)} — Résumé</title>
<style>
  /* 9.1pt is the largest size at which this record fits one Letter page —
     verified by counting pages in the emitted PDF, not by estimating. */
  @page { size: Letter; margin: 10mm 13mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Calibri", "Carlito", Arial, sans-serif;
         font-size: 9.1pt; line-height: 1.28; color: #111; }
  h1 { margin: 0; font-size: 21pt; letter-spacing: .06em; text-align: center; text-transform: uppercase; }
  .title { text-align: center; color: #444; font-size: 10.5pt; margin: 2pt 0 5pt; }
  .contact { text-align: center; font-size: 9pt; margin: 0 0 2pt; }
  h2 { font-size: 10pt; letter-spacing: .1em; text-transform: uppercase;
       border-bottom: .6pt solid #999; padding-bottom: 2pt; margin: 7pt 0 3pt; }
  .role { display: flex; justify-content: space-between; gap: 12pt; font-weight: 700; margin-top: 5pt; }
  .position { font-weight: 700; font-style: italic; }
  .context { color: #444; margin: 2pt 0 3pt; }
  ul { margin: 0 0 0 14pt; padding: 0; }
  li { margin: 0 0 1.5pt; }
  p { margin: 0 0 3pt; }
  .skills p { margin: 0 0 2.5pt; }
</style></head><body>
  <h1>${escape(resumeHeader.name)}</h1>
  <div class="title">${escape(resumeHeader.title)}</div>
  <div class="contact">${[resumeHeader.location, resumeHeader.phone, resumeHeader.email].map(escape).join(' &bull; ')}</div>
  <div class="contact">${[resumeHeader.linkedin, resumeHeader.github, resumeHeader.site].map(escape).join(' &bull; ')}</div>

  <h2>Summary</h2>
  <p>${escape(resumeSummary)}</p>

  <h2>Technical Skills</h2>
  <div class="skills">
    ${resumeSkills.map((g) => `<p><strong>${escape(g.group)}:</strong> ${escape(g.items.join(', '))}</p>`).join('')}
  </div>

  <h2>Professional Experience</h2>
  ${resumeExperience.map((role) => `
    <div class="role"><span>${escape(role.company)} — ${escape(role.location)}</span><span>${escape(role.start)} – ${escape(role.end)}</span></div>
    <div class="position">${escape(role.role)}</div>
    <ul>${role.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>
  `).join('')}

  <h2>Selected Projects</h2>
  ${resumeProjects.map((project) => `
    <div class="role"><span>${escape(project.name)} — ${escape(project.link)}</span><span>${escape(project.period)}</span></div>
    <div class="position">${escape(project.role)}</div>
    <ul>${project.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>
  `).join('')}

  <h2>Education</h2>
  <div class="role"><span>${escape(resumeEducation.school)} — ${escape(resumeEducation.location)}</span><span>${escape(resumeEducation.date)}</span></div>
  <p>${escape(resumeEducation.credential)}</p>
</body></html>`;

// Optional: dump the print HTML for visual review of the PDF's layout.
if (process.env.RESUME_HTML_OUT) {
  writeFileSync(process.env.RESUME_HTML_OUT, printHtml);
  console.log('wrote', process.env.RESUME_HTML_OUT);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed — run `npm i -D playwright` to emit the PDF.');
  process.exit(1);
}

// CHROMIUM_PATH lets a sandbox point at a pre-installed browser instead of
// Playwright downloading its own pinned build.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
await page.setContent(printHtml, { waitUntil: 'networkidle' });
await page.pdf({
  path: pdfPath,
  format: 'Letter',
  printBackground: true,
  margin: { top: '10mm', bottom: '10mm', left: '13mm', right: '13mm' },
});
await browser.close();
assertWritten(pdfPath, 8000);

/** Fail loudly rather than reporting a write that did not happen. */
function assertWritten(file, minBytes) {
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    throw new Error(`${path.relative(root, file)} was not written`);
  }
  if (size < minBytes) {
    throw new Error(`${path.relative(root, file)} is only ${size} bytes — generation failed`);
  }
  console.log(`wrote ${path.relative(root, file)} (${(size / 1024).toFixed(1)} kB)`);
}
