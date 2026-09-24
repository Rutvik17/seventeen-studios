/**
 * The words of the notebook entry "Earth we live on" (the page is
 * `app/notebook/earth-we-live-on/`, the drawings `components/notebook/Globe.tsx`
 * and `Continents.tsx`).
 */

export const globeCopy = {
  drawing: 'A globe painted in acrylic on an ochre ground, with pencil coastlines, turning slowly',
  drag: 'Drag the globe to spin it.',
  turn: { left: 'Turn left', right: 'Turn right' },
  pick: 'Sketch a continent',
  continents: {
    africa: 'Africa',
    antarctica: 'Antarctica',
    asia: 'Asia',
    europe: 'Europe',
    'north-america': 'North America',
    oceania: 'Oceania',
    'south-america': 'South America',
  },
  sketched: (name: string) => `${name}, sketched in pencil and painted in acrylic`,
} as const;
