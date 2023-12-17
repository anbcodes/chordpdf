import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { getMetadata, render } from "./lib";
import * as pdfjs from "pdfjs-dist";


const $ = <T extends HTMLElement>(q: string) => {
  const el = document.querySelector(q)
  if (!el) {
    throw new Error(`Element ${q} not found!`)
  }
  return el as T;
}

const input = $<HTMLTextAreaElement>('#input')
const key = $<HTMLInputElement>('#key')
const fontSize = $<HTMLInputElement>('#font-size')
const pages = $<HTMLDivElement>("#pages");
const download = $<HTMLAnchorElement>("#download");

let canvases: HTMLCanvasElement[] = [];

pdfjs.GlobalWorkerOptions.workerSrc =
  "/pdf.worker.min.mjs"

const params = new URLSearchParams(location.search);
const song = params.get('s');
if (song) {
  const decompressed = decompressFromEncodedURIComponent(song);
  input.value = decompressed;
}
const keySaved = params.get('k');
if (keySaved) {
  key.value = keySaved;
}

const fontSaved = params.get('f');
if (fontSaved) {
  fontSize.value = fontSaved;
}

const update = async () => {
  const url = compressToEncodedURIComponent(input.value);
  history.replaceState(null, '', `?k=${encodeURIComponent(key.value)}&f=${encodeURIComponent(fontSize.value)}&s=${url}`);

  const pdf = render(input.value, key.value, +fontSize.value);
  download.href = URL.createObjectURL(new Blob([pdf.output()], {
    type: 'application/pdf',
  }));
  download.download = `${getMetadata(input.value).metadata.Title}.pdf`;

  const pdfDoc = await pdfjs.getDocument(new TextEncoder().encode(pdf.output())).promise;

  const pageCount = pdf.getNumberOfPages();

  if (canvases.length > pageCount) {
    canvases.slice(pageCount).forEach(c => c.remove())
    canvases = canvases.slice(0, pageCount)
  }

  for (let i = 0; i < pageCount; i++) {
    if (!canvases[i]) {
      const el = document.createElement('canvas');
      pages.appendChild(el);
      canvases.push(el);
    }

    const page = await pdfDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = canvases[i];
    // const scale = canvas.clientWidth / viewport.width;
    // const realViewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No context!")
    const renderTask = page.render({
      canvasContext: ctx,
      viewport,
    });
    await renderTask.promise;
  }
}

let isUpdating = false;
let updateRequired = false;
let updatePromise: Promise<void> = new Promise((resolve) => {resolve()});
async function queueUpdate() {
  if (updateRequired) {
    return;
  }

  if (isUpdating) {
    updateRequired = true;
    await updatePromise;
    updateRequired = false;
  }
  isUpdating = true;
  updatePromise = update();
  await updatePromise;
  isUpdating = false;
}


queueUpdate()

input.addEventListener('input', () => queueUpdate())
key.addEventListener('change', () => queueUpdate())
fontSize.addEventListener('change', () => queueUpdate())