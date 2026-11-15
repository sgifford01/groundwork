/** Plan Reading: finding your way around a plan set (subtopic plan-reading-set). */
import { categoryItems } from '../define';

const SIZES: Record<string, number>[] = [{ bays: 5 }, { bays: 6, unit_width: 24 }, { bays: 7, unit_width: 24, unit_depth: 28 }];

export const ITEMS = categoryItems('plan-reading', [
  {
    id: 'plan-reading-set-navigate-callout-sheet',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Follow a callout to its sheet',
    prompt: 'On this floor plan one apartment is outlined with a dashed box and tagged with a split bubble (highlighted). Which sheet is that bubble sending you to?',
    tags: ['callout', 'sheet numbers', 'navigation'],
    estMinutes: 1,
    hints: ['Zoom in on the bubble. It has two halves.', 'One half is a drawing number, the other is a sheet number.', 'The BOTTOM half is the sheet.'],
    plan: { set: 'mf-double-loaded', variants: SIZES, sheet: 'A-102' },
    task: {
      kind: 'navigate',
      highlight: 'callout-a401',
      correctSheet: 'A-401',
      distractorSheets: ['A-501', 'S-201'],
      why: 'Read the bubble again: the bottom half names the SHEET to open and the top half is the number of the drawing on that sheet.',
    },
    explanation:
      'A callout bubble is split in two. The top half is the drawing number and the bottom half is the sheet it is on, so "1 over A-401" means drawing 1 on sheet A-401. The dashed box shows which part of this plan is drawn there at a larger scale.',
  },
  {
    id: 'plan-reading-set-locate-enlarged-plan-title',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Find the sheet with the detail you need',
    prompt:
      'You need the room sizes inside one apartment, and the floor plan is too small to show them. Starting from this cover sheet, find the sheet that draws a single unit at a larger scale, open it, and click the title under that drawing.',
    tags: ['sheet index', 'navigation', 'drawing title'],
    estMinutes: 2,
    hints: [
      'The cover sheet has a sheet index. Read the sheet names.',
      'Click a row of the index, or a tab above the drawing, to open a sheet.',
      'Open A-401, then click the title bubble and name below the drawing.',
    ],
    plan: { set: 'mf-double-loaded', variants: SIZES, sheet: 'G-001' },
    task: {
      kind: 'locate',
      targets: ['drawing-title'],
      onSheet: 'A-401',
      decoys: [
        { match: 'index-row', why: 'That is a row of the sheet index. Use it to find and open the sheet, then click the title under the drawing itself.', category: 'incomplete' },
        { match: 'drawing-title', why: 'That is a drawing title, but on the wrong sheet. The single unit at a larger scale is on A-401.', category: 'concept' },
        { match: 'sheet-number', why: 'That is the sheet number in the title block. The question asks for the title under the drawing: the bubble with the drawing’s name and scale.', category: 'concept' },
      ],
    },
    explanation:
      'The sheet index on the cover lists every sheet by number and name. Enlarged plans sit in their own series (A-4xx here), drawn at 1/4" = 1\'-0", twice the size of the floor plan. Every drawing has a title beneath it with its number, its name and its scale.',
  },
  {
    id: 'plan-reading-set-locate-sheet-number',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Find the sheet number',
    prompt: 'Every sheet carries its own number, so that callouts on other sheets can point to it. Click this sheet’s number.',
    tags: ['title block', 'sheet numbers'],
    estMinutes: 1,
    hints: ['Look along the right-hand edge of the sheet.', 'The title block holds the project name, the sheet title, the scale and the sheet number.', 'It is the largest text in the title block, at the bottom.'],
    plan: { set: 'mf-double-loaded', variants: SIZES, sheet: 'A-102' },
    task: {
      kind: 'locate',
      targets: ['sheet-number'],
      decoys: [
        { match: 'drawing-title', why: 'That is the title of one drawing ON the sheet. The sheet’s own number is in the title block, bottom right.', category: 'concept' },
        { match: 'title-block', why: 'Right place, wrong part. The sheet number is the large number at the very bottom of the title block.', category: 'concept' },
        { match: 'revision-list', why: 'That is the revision list. The sheet number is the large number at the bottom of the title block.', category: 'concept' },
        { match: 'detail-callout', why: 'That bubble names a DIFFERENT sheet, the one it points to. This sheet’s number is in its title block.', category: 'concept' },
      ],
    },
    explanation:
      'The title block runs down the right edge of every sheet in a set and always holds the same things in the same places: project, sheet title, scale, revisions and, largest of all, the sheet number. When you flip through a paper set, the bottom-right corner is where your eye goes.',
  },
  {
    id: 'plan-reading-set-navigate-index-site',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Choose the sheet that answers the question',
    prompt: 'A neighbour asks how far the new building will sit from the street. Using the sheet index on this cover, which sheet would you open?',
    tags: ['sheet index', 'site plan', 'navigation'],
    estMinutes: 1,
    hints: ['Which drawing shows the whole lot, the street and the building together?', 'That drawing is a civil sheet, so its number starts with C.'],
    plan: { set: 'mf-double-loaded', variants: SIZES, sheet: 'G-001' },
    task: {
      kind: 'navigate',
      correctSheet: 'C-101',
      distractorSheets: ['L-101'],
      why: 'Distances between the building, the property line and the street are on the site plan, a civil sheet: C-101. The floor plans stop at the building’s own walls.',
    },
    explanation:
      'The site plan shows the lot from above: property lines, setbacks, easements, the building footprint and the street. Anything about where the building sits on the land is answered there. Floor plans, sections and enlarged plans only show the building itself.',
  },
  {
    id: 'plan-reading-set-locate-revision-cloud',
    type: 'plan',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Find what changed in a revision',
    prompt: 'The architect has reissued this sheet as revision 1. Click the part of the drawing that changed.',
    tags: ['revisions', 'revision cloud', 'revision delta'],
    estMinutes: 1,
    hints: ['Changes are outlined on the drawing itself.', 'Look for a scalloped, cloud-like outline with a small numbered triangle beside it.', 'It is in the core, on the south side of the corridor.'],
    plan: { set: 'mf-double-loaded', variants: SIZES, sheet: 'A-102' },
    task: {
      kind: 'locate',
      targets: ['revision-cloud'],
      decoys: [
        { match: 'revision-delta', why: 'That triangle is the revision delta: it carries the revision NUMBER. The scalloped cloud beside it outlines what changed.', category: 'concept' },
        { match: 'revision-list', why: 'That is the revision list in the title block: it describes the change in words. The change itself is inside the cloud on the drawing.', category: 'concept' },
        { match: 'detail-callout', why: 'That dashed box is a callout to an enlarged plan, not a revision. A revision is outlined with a scalloped cloud.', category: 'concept' },
      ],
    },
    explanation:
      'When a sheet is reissued, each change is ringed with a revision cloud and tagged with a delta, a small triangle holding the revision number. The same number appears in the revision list in the title block with a short description. Checking the clouds is the fastest way to see what is different from the set you priced or approved.',
  },
  {
    id: 'plan-reading-set-flashcard-discipline-letters',
    type: 'flashcard',
    level: 1,
    topic: 'plan-reading-set',
    verifiedAsOf: '2026-11-14',
    sourceUrl: 'https://archtoolbox.com/construction-document-sheet-numbers',
    title: 'Discipline letters on sheet numbers',
    prompt: 'A sheet number starts with a letter for the discipline that drew it. In the common U.S. convention, what do G, C, L, S, A, M, E and P stand for? And which letter is fire protection?',
    tags: ['sheet numbers', 'disciplines', 'plan set'],
    estMinutes: 0.5,
    answer:
      'G general, C civil, L landscape, S structural, A architectural, M mechanical, E electrical, P plumbing. Fire protection is F (some firms write FP). The digit after the letter is the type of sheet: 1 plans, 2 elevations, 3 sections, 4 large-scale views, 5 details. Firms vary, so check the sheet index of the set in front of you.',
    explanation: 'This follows the U.S. National CAD Standard as summarised by a public reference. Many offices use their own variations.',
  },
  {
    id: 'plan-reading-set-mcq-written-dimensions-govern',
    type: 'mcq',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Scaled measurement or written dimension?',
    prompt:
      'You measure a room on a printed floor plan with a scale ruler and get 12\'-6". The dimension string on the drawing says 12\'-0". The general notes on the cover read "Do not scale drawings. Written dimensions govern." Which figure do you use?',
    tags: ['dimensions', 'general notes', 'scale'],
    estMinutes: 1,
    hints: ['What do the general notes tell you to do?', 'A print can be reduced, enlarged or stretched without anyone telling you.'],
    correct: { text: 'The written 12\'-0"' },
    distractors: [
      { text: 'The measured 12\'-6"', why: 'A ruler on a print is only as good as the print. Copies are often reduced or stretched, which is exactly why the notes say written dimensions govern.', category: 'concept' },
      { text: 'The average of the two, 12\'-3"', why: 'Averaging a reliable number with an unreliable one makes it worse. The written dimension governs.', category: 'concept' },
      { text: 'Whichever is larger, to be safe', why: 'There is no "safe" direction: a wrong room size is wrong either way. The written dimension governs.', category: 'concept' },
    ],
    explanation:
      'The written dimension is what the designer intended and what the builder will build to. A measurement scaled off a print depends on the print being exactly the right size, which it often is not. Scale a drawing only for a rough check, and when the two disagree, ask the architect rather than choosing.',
  },
  {
    id: 'plan-reading-set-order-follow-callout',
    type: 'order',
    level: 1,
    topic: 'plan-reading-set',
    title: 'Steps to follow a callout',
    prompt: 'You are reading a floor plan and want the detail a callout bubble points to. Put the steps in order.',
    tags: ['callout', 'navigation'],
    estMinutes: 1,
    hints: ['The bubble tells you two things: which sheet, and which drawing on it.'],
    lines: [
      'Find the callout bubble on the drawing you are reading',
      'Read the sheet number in the bottom half of the bubble',
      'Open that sheet',
      'Find the drawing whose title carries the number from the top half of the bubble',
      'Check the scale written under that title before reading any sizes',
    ],
    trap: 'People read the top number first and go looking for "sheet 1". The top half is the drawing; the bottom half is the sheet.',
    explanation:
      'Sheet first, then drawing: the bottom half of the bubble gets you to the right page and the top half to the right drawing on it. The scale is the last check, because an enlarged drawing is almost never at the scale of the plan you came from.',
  },
]);
