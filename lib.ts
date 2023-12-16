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

let mapping: Record<any, any> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
}

let scale = [0, 2, 4, 5, 7, 9, 10]


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

export function render(input: string, key?: string): jsPDF {
  const {metadata, linesRaw} = getMetadata(input);
  
  if (key) {
    const startingIndex = chords.indexOf(key)
    if (startingIndex === -1) {
      console.error("Invalid key:", key)
      console.error("Valid keys:", chords.join(' '))
      process.exit(1);
    }
    scale.forEach((v, i) => mapping[i + 1] = chords[(v + startingIndex) % 12]);
  }
  
  
  const replaceChords = (c: string) => c.replace(/(?<![1-7a-z#])[1-7]/g, (v) => mapping[v]);
  
  const lines = ('#' + linesRaw.join('\n#')).split('\n').filter(v => v).map(v => ({
    type: v.startsWith('#') ? 'title' : v.match(/^[ \t0-9m/|()]+$/) ? 'chords' : 'lyrics' as 'title'|'chords'|'lyrics',
    line: v,
  })).reduce((n, v, i, a) => 
    v.type === 'lyrics' && a[i - 1]?.type === 'chords'
      ? [...n.slice(0, -1), {type: 'lyrics+chords' as 'lyrics+chords', chords: a[i-1].line, lyrics: v.line,}]
      : [...n, v],
    [] as ({type: 'chords'|'lyrics'|'title', line: string} | {type: 'lyrics+chords', lyrics: string, chords: string})[])  
  
  let pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
  })
  
  const m = {
    left: 0.5,
    top: 0.75,
    bottom: 0.75,
    right: 0.5,
  }
  
  let y = 0;
  
  const drawHeaders = () => {
    y = m.top;
    if (metadata.Title) {
      pdf.setFontSize(30);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metadata.Title, m.left, y);
      y += 0.2;
    }
    pdf.setFontSize(10);
    let t = '';
    if (metadata.Author?.trim()) {
      t += `by ${metadata.Author}     `
    }
    t += `Key ${key ?? 'Numbers'}`
    if (metadata.Key) {
      t += ` (${metadata.Key})`
    }
    if (metadata.bpm) {
      t += `  ${metadata.BPM} bpm`
    }
    pdf.text(t, m.left, y);
    y += 0.4;
  }
  
  drawHeaders();
  
  let col = 0;
  let colw = 4;
  let isFirstTitle = true;
  let pageHeight = 11.5;
  let pageWidth = 8;
  
  lines.forEach(line => {
    if (y >= pageHeight - m.bottom || (line.type === 'title' && y + 0.3 >= pageHeight - m.bottom)) {
      isFirstTitle = true;
      if (col === 0) {
        y = m.top + 0.6;
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
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold')
      console.log(line)
      const t = line.line.trim().slice(1).trim();
      pdf.text(t, m.left + col*colw, y)
      y += 0.02;
      pdf.setLineWidth(0.01);
      pdf.line(m.left + col*colw, y, m.left + col*colw + pdf.getTextWidth(t), y);
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'chords') {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const t = replaceChords(line.line);
      pdf.text(t, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'lyrics') {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const t = replaceChords(line.line);
      pdf.text(t, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    } else if (line.type === 'lyrics+chords') {
      let chords = [...line.chords.matchAll(/[^ ]+/g)].map(v => ({i: v.index, c: v[0]}))
      let curr = ''; 
      let rendered: {chord: string, len: number}[] = [];
      pdf.setFontSize(10);
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
  
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      rendered.filter(v => v.chord).forEach(({chord, len}) => {
        pdf.text(replaceChords(chord), m.left + col * colw + len, y)
      });
      y += pdf.getLineHeight() / 72
  
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(line.lyrics, m.left + col * colw, y)
      y += pdf.getLineHeight() / 72
    }
  
  })
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  let pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const t = `Page ${i} of ${pageCount}`;
    pdf.text(t, pageWidth - m.right - pdf.getTextWidth(t), m.top);
  }

  return pdf;
}
