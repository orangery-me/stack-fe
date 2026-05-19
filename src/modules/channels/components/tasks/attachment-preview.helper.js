const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
const WORD_EXTENSIONS = new Set(['doc', 'docx']);
const SPREADSHEET_EXTENSIONS = new Set(['xls', 'xlsx']);
const ARCHIVE_EXTENSIONS = new Set(['zip']);

export const ATTACHMENT_PREVIEW_TYPES = {
  CANVAS: 'canvas',
  IMAGE: 'image',
  PDF: 'pdf',
  TEXT: 'text',
  CSV: 'csv',
  WORD: 'word',
  SPREADSHEET: 'spreadsheet',
  ARCHIVE: 'archive',
  FILE: 'file',
};

function getExtension(value = '') {
  const clean = String(value).split('?')[0].split('#')[0];
  const ext = clean.split('.').pop();
  return ext && ext !== clean ? ext.toLowerCase() : '';
}

function normalizeMimeType(value = '') {
  return String(value).toLowerCase().split(';')[0].trim();
}

export function getAttachmentPreviewType(item = {}) {
  if (item.type === 'canvas' || item.canvasId) {
    return ATTACHMENT_PREVIEW_TYPES.CANVAS;
  }

  const mimeType = normalizeMimeType(item.mimeType);
  const extension = getExtension(item.name || item.url || item.fileId);

  if (mimeType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return ATTACHMENT_PREVIEW_TYPES.IMAGE;
  }
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return ATTACHMENT_PREVIEW_TYPES.PDF;
  }
  if (mimeType === 'text/plain' || extension === 'txt') {
    return ATTACHMENT_PREVIEW_TYPES.TEXT;
  }
  if (mimeType === 'text/csv' || extension === 'csv') {
    return ATTACHMENT_PREVIEW_TYPES.CSV;
  }
  if (WORD_EXTENSIONS.has(extension) || mimeType.includes('wordprocessingml') || mimeType === 'application/msword') {
    return ATTACHMENT_PREVIEW_TYPES.WORD;
  }
  if (
    SPREADSHEET_EXTENSIONS.has(extension) ||
    mimeType.includes('spreadsheetml') ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    return ATTACHMENT_PREVIEW_TYPES.SPREADSHEET;
  }
  if (ARCHIVE_EXTENSIONS.has(extension) || mimeType.includes('zip')) {
    return ATTACHMENT_PREVIEW_TYPES.ARCHIVE;
  }

  return ATTACHMENT_PREVIEW_TYPES.FILE;
}

export function getAttachmentTypeLabel(type) {
  const labels = {
    [ATTACHMENT_PREVIEW_TYPES.CANVAS]: 'Canvas',
    [ATTACHMENT_PREVIEW_TYPES.IMAGE]: 'Image',
    [ATTACHMENT_PREVIEW_TYPES.PDF]: 'PDF',
    [ATTACHMENT_PREVIEW_TYPES.TEXT]: 'Text',
    [ATTACHMENT_PREVIEW_TYPES.CSV]: 'CSV',
    [ATTACHMENT_PREVIEW_TYPES.WORD]: 'Word',
    [ATTACHMENT_PREVIEW_TYPES.SPREADSHEET]: 'Sheet',
    [ATTACHMENT_PREVIEW_TYPES.ARCHIVE]: 'Zip',
    [ATTACHMENT_PREVIEW_TYPES.FILE]: 'File',
  };
  return labels[type] || labels[ATTACHMENT_PREVIEW_TYPES.FILE];
}

export function getAttachmentIcon(type) {
  const icons = {
    [ATTACHMENT_PREVIEW_TYPES.CANVAS]: 'pi pi-pencil',
    [ATTACHMENT_PREVIEW_TYPES.IMAGE]: 'pi pi-image',
    [ATTACHMENT_PREVIEW_TYPES.PDF]: 'pi pi-file-pdf',
    [ATTACHMENT_PREVIEW_TYPES.TEXT]: 'pi pi-file',
    [ATTACHMENT_PREVIEW_TYPES.CSV]: 'pi pi-table',
    [ATTACHMENT_PREVIEW_TYPES.WORD]: 'pi pi-file-word',
    [ATTACHMENT_PREVIEW_TYPES.SPREADSHEET]: 'pi pi-file-excel',
    [ATTACHMENT_PREVIEW_TYPES.ARCHIVE]: 'pi pi-folder',
    [ATTACHMENT_PREVIEW_TYPES.FILE]: 'pi pi-file',
  };
  return icons[type] || icons[ATTACHMENT_PREVIEW_TYPES.FILE];
}
