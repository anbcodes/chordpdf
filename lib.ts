import jsPDF from "jspdf";

const chords = [
  'A',
  'Bb',
  'B',
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'G#',
]

export const chordMappings: Record<string, string[]> = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  E: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  B: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
  'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  Eb: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  Ab: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  Db: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  Gb: ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
  Cb: ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'],

  Am: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  Em: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  Bm: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
  'F#m': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
  'C#m': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
  'G#m': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
  'D#m': ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
  'A#m': ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#'],
  'Dm': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
  'Gm': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
  'Cm': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
  'Fm': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
  'Bbm': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
  'Ebm': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
  'Abm': ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'],
}

let mapping: Record<any, any> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
}

let scale = [0, 2, 4, 5, 7, 9, 11]


export function getMetadata(input: string) {
  const [metadataRaw, ...linesRaw] = input.split('\n#');
  
  return metadataRaw?.startsWith('#') ? {
    linesRaw: [metadataRaw.slice(1), ...linesRaw],
    metadata: {}
  } : {
    linesRaw,
    metadata: Object.fromEntries(metadataRaw.split('\n').map(v => v.split(':').map(v => v.trim())))
  }
}

export function render(input: string, keys?: string | string[], fontSize = 13): jsPDF {
  let pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
  })

  input.split('===').filter(v => v.trim()).forEach((file, i) => {
    if (i !== 0) pdf.addPage();
    let key;
    if (typeof keys === 'string') {
      key = keys;
    } else {
      key = keys?.[i] ?? keys?.[0];
    }
    renderOnto(pdf, file, key, fontSize);
  })

  return pdf;
}

export function renderOnto(pdf: jsPDF, input: string, key?: string, fontSize = 13): jsPDF {
  const {metadata, linesRaw} = getMetadata(input);
  
  if (key) {
    const map = chordMappings[key];
    if (!map) {
      console.error("Invalid key:", key)
      console.error("Valid keys:", Object.keys(chordMappings).join(' '))
      // This is an error on browsers, but I don't want to fix it
      process.exit(1);
    }
    map.forEach((v, i) => mapping[i + 1] = v);
  }
  
  
  const replaceChords = (c: string) => c.replace(/(?<![1-7a-z#])[1-7]/g, (v) => mapping[v]);
  
  const lines = ('#' + linesRaw.join('\n#')).split('\n').filter(v => v).map(v => ({
    type: v.startsWith('#') ? 'title' : v.match(/^[ \t0-9msuadno/|()]+$/) ? 'chords' : 'lyrics' as 'title'|'chords'|'lyrics',
    line: v,
  })).reduce((n, v, i, a) => 
    v.type === 'lyrics' && a[i - 1]?.type === 'chords'
      ? [...n.slice(0, -1), {type: 'lyrics+chords' as 'lyrics+chords', chords: a[i-1].line, lyrics: v.line,}]
      : [...n, v],
    [] as ({type: 'chords'|'lyrics'|'title', line: string} | {type: 'lyrics+chords', lyrics: string, chords: string})[])  
  
  const m = {
    left: 0.5,
    top: 0.75,
    bottom: 0.75,
    right: 0.5,
  }
  
  let y = 0;
  
  let chordFontSize = Math.round(fontSize * 0.9);
  let titleFontSize = Math.round(fontSize * 2);

  let headerHeight = 0;
  
  const drawHeaders = () => {
    y = m.top;
    if (metadata.Title) {
      pdf.setFontSize(titleFontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metadata.Title, m.left, y);
      y += pdf.getLineHeight() * 0.9 / 72;
    }
    pdf.setFontSize(chordFontSize);
    let t = '';
    if (metadata.Author?.trim()) {
      t += `by ${metadata.Author}     `
    }
    t += `Key ${key ?? 'Numbers'}`
    if (metadata.Key) {
      t += ` (${metadata.Key})`
    }
    if (metadata.BPM) {
      t += `  ${metadata.BPM} bpm`
    }
    pdf.text(t, m.left, y);
    y += pdf.getLineHeight() / 72
    y += 0.2;
    headerHeight = y - m.top
  }
  
  drawHeaders();

  let startingNumberOfPages = pdf.getNumberOfPages();
  
  let col = 0;
  let colw = 4;
  let isFirstTitle = true;
  let pageHeight = 11.5;
  let pageWidth = 8;

  
  lines.forEach(line => {
    if (y >= pageHeight - m.bottom || (line.type === 'title' && y + 0.3 >= pageHeight - m.bottom)) {
      isFirstTitle = true;
      if (col === 0) {
        y = m.top + headerHeight;
        col = 1;
      } else {
        y = 0;
        pdf.addPage();
        drawHeaders();
        col = 0;
      }
    }
  
    if (line.type !== 'title') {
      isFirstTitle = false;
    }
  
    if (line.type === 'title') {
      if (!isFirstTitle) {
        y += 0.2;
      } else {
        isFirstTitle = false;
      }
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold')
      const t = line.line.trim().slice(1).trim();
      pdf.text(t, m.left + col*colw, y)
      y += 0.02;
      pdf.setLineWidth(0.01);
      pdf.line(m.left + col*colw, y, m.left + col*colw + pdf.getTextWidth(t), y);
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'chords') {
      pdf.setFontSize(fontSize - 1);
      pdf.setFont('helvetica', 'bold');
      const t = replaceChords(line.line);
      pdf.text(t, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'lyrics') {
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      const t = replaceChords(line.line);
      pdf.text(t, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'lyrics+chords') {
      let chords = [...line.chords.matchAll(/[^ ]+/g)].map(v => ({i: v.index, c: v[0]}))
      let curr = ''; 
      let rendered: {chord: string, len: number}[] = [];
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      if (line.lyrics.length < line.chords.length) {
        line.lyrics += ' '.repeat(line.chords.length - line.lyrics.length)
      }
      line.lyrics.split('').forEach((v, i) => {
        let chord = chords.find(v => v.i === i);
        if (chord) {
          rendered.push({chord: chord.c, len: pdf.getTextWidth(curr)})
        }
        curr += v;
      })
  
      pdf.setFontSize(fontSize - 1);
      pdf.setFont('helvetica', 'bold');
      rendered.filter(v => v.chord).forEach(({chord, len}) => {
        pdf.text(replaceChords(chord), m.left + col * colw + len, y)
      });
      y += pdf.getLineHeight() / 72
  
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');
      pdf.text(line.lyrics, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    }
  
  })
  
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'normal');
  let pageCount = pdf.getNumberOfPages() - startingNumberOfPages + 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i + startingNumberOfPages + 1);
    const t = `Page ${i} of ${pageCount}`;
    pdf.text(t, pageWidth - m.right - pdf.getTextWidth(t), m.top);
  }

  return pdf;
}
