import config from './config.js';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let pageNum = 1;
let zoom = config.initialZoom;
let pageRendering = false;
let pageNumPending = null;

const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

function renderPage(num) {
  pageRendering = true;
  
  pdfDoc.getPage(num).then(function(page) {
    const viewport = page.getViewport({ scale: zoom });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    const renderTask = page.render(renderContext);

    renderTask.promise.then(function() {
      pageRendering = false;
      if (pageNumPending !== null) {
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });

  document.getElementById('page-num').textContent = `Page ${num} of ${pdfDoc.numPages}`;
}

function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

document.getElementById('file-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file && file.type === 'application/pdf') {
    const fileReader = new FileReader();
    
    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);

      pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
        pdfDoc = pdf;
        pageNum = 1;
        renderPage(pageNum);
      });
    };
    
    fileReader.readAsArrayBuffer(file);
  }
});

document.getElementById('prev').addEventListener('click', function() {
  if (pageNum <= 1) return;
  pageNum--;
  queueRenderPage(pageNum);
});

document.getElementById('next').addEventListener('click', function() {
  if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
  pageNum++;
  queueRenderPage(pageNum);
});

document.getElementById('zoom-in').addEventListener('click', function() {
  if (zoom >= config.maxZoom) return;
  zoom += config.zoomStep;
  if (pdfDoc) renderPage(pageNum);
});

document.getElementById('zoom-out').addEventListener('click', function() {
  if (zoom <= config.minZoom) return;
  zoom -= config.zoomStep;
  if (pdfDoc) renderPage(pageNum);
});

