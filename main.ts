import { readFileSync, writeFileSync } from "fs";
import jsPDF from "jspdf";
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));

if (args['h'] || args['help']) {
  console.log(
`Usage: chordpdf [options] [input_file] [output_file]
Valid options:
 -h/--help  displays this help message
 -k/--key   sets the key of the output file`
)
process.exit(0)
}

let input: string;
try {
  input = readFileSync(args._[0], 'utf-8');
} catch (e) {
  console.error("Input file not found:", args._[0]);
  process.exit(1);
}

if (!args._[1]) {
  console.error("Output file required (use -h for help)");
  process.exit(1)
}

const [metadataRaw, ...linesRaw] = input.split('\n#');

const metadata = Object.fromEntries(metadataRaw.split('\n').map(v => v.split(':').map(v => v.trim())))

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

let key = args['k'] ?? args['key'];
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

const htmlContent = lines.map(v => {
    if (v.type === 'title') {
      return `<div class="title">${v.line.slice(1).trim()}</div>`
    } else if (v.type === 'chords') {
      return `<div class="chords">${replaceChords(v.line)}</div>`
    } else if (v.type === 'lyrics') {
      return `<div class="lyrics">${v.line}</div>`
    } else if (v.type === 'lyrics+chords') {
      let chords = [...v.chords.matchAll(/[^ ]+/g)].map(v => ({i: v.index, c: v[0]}))
      
      let rendered = v.lyrics.split('').map((v, i, a) => {
        let chord = chords.find(v => v.i === i);
        v = v === ' ' ? '&nbsp;' : v;
        if (chord) {
          return `<span class="s">${v}<span class="c">${replaceChords(chord.c)}</span></span>`
        } else {
          return v;
        }
      }).join('')

      return '<div class="lc">'+ rendered + '</div>'
    }
  })


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
  pdf.setFontSize(30);
  pdf.text(metadata.Title, m.left, y);
  pdf.setFontSize(10);
  y += 0.2;
  pdf.text(`by ${metadata.Author}     Key ${key ?? 'Numbers'} (${metadata.Key})  ${metadata.BPM} bpm`, m.left, y);
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
    if (col === 0) {
      y = m.top + 0.6;
      isFirstTitle = true;
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
    const t = line.line.slice(1).trim();
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


writeFileSync(args._[1], pdf.output());