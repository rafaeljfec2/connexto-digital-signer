import * as pdfjsLib from '/pdfjs/pdf.min.js';
window.pdfjsLib = pdfjsLib;
window.dispatchEvent(new Event('pdfjsReady'));
