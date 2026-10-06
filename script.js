const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const canvasResizeHandle = document.getElementById('canvas-resize-handle');
const deviceNameInput = document.getElementById('new-device-name');
const connectorTypeInput = document.getElementById('connector-type');
const connectorCountInput = document.getElementById('connector-count');
const extraConnectors = document.getElementById('extra-connectors');
const extraConnectorsPanel = document.getElementById('extra-connectors-panel');
const summaryList = document.getElementById('summary-list');
const linkInfo = document.getElementById('link-info');
const status = document.getElementById('status');
const hint = document.getElementById('canvas-hint');
const emptyState = document.getElementById('empty-state');
const placementPrompt = document.getElementById('placement-prompt');
const cancelButton = document.getElementById('cancel-action');
const scaleInput = document.getElementById('cm-per-grid');
const resetScaleButton = document.getElementById('reset-scale');
const canvasWrap = document.querySelector('.canvas-wrap');
const canvasAreaMinWidth = canvasWrap.getBoundingClientRect().width || 320;
const canvasAreaMinHeight = canvasWrap.getBoundingClientRect().height || 240;
const imageInput = document.getElementById('plan-image');
const removePhotoButton = document.getElementById('remove-photo');
const planControls = document.getElementById('plan-controls');
const referenceSetup = document.getElementById('reference-setup');
const distanceInput = document.getElementById('reference-distance');
const confirmDistanceButton = document.getElementById('confirm-distance');
const planStatus = document.getElementById('plan-status');
const createDeviceButton = document.getElementById('create-device');
const catalogSearchInput = document.getElementById('catalog-search');
const catalogSearchResults = document.getElementById('catalog-search-results');
const rackNameEditor = document.getElementById('rack-name-editor');
const contextMenu = document.getElementById('canvas-context-menu');
const groupMenuButton = contextMenu.querySelector('[data-action="group"]');
const ungroupMenuButton = contextMenu.querySelector('[data-action="ungroup"]');
const rackUpMenuButton = contextMenu.querySelector('[data-action="rack-up"]');
const rackDownMenuButton = contextMenu.querySelector('[data-action="rack-down"]');
const rackRemoveMenuButton = contextMenu.querySelector('[data-action="rack-remove"]');
const deleteMenuButton = contextMenu.querySelector('[data-action="delete"]');
const projectStart = document.getElementById('project-start');
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectTitle = document.getElementById('project-title');
const projectTitleInput = document.getElementById('project-title-input');
const editorShell = document.getElementById('editor-shell');
const fileMenu = document.getElementById('file-menu');
const newProjectButton = document.getElementById('new-project');
const savePdfButton = document.getElementById('save-pdf');
const importDesignButton = document.getElementById('import-design');
const designImportFile = document.getElementById('design-import-file');
const importPreview = document.getElementById('import-preview');
const importPreviewRows = document.getElementById('import-preview-rows');
const importPreviewSummary = document.getElementById('import-preview-summary');
const importPreviewNote = document.getElementById('import-preview-note');
const confirmImportButton = document.getElementById('confirm-import');
const cancelImportButton = document.getElementById('cancel-import');
const harmanProductCatalog = Array.isArray(window.HARMAN_PRODUCT_CATALOG) ?
    window.HARMAN_PRODUCT_CATALOG : [];
const gridSize = 20;
let cmPerPixel = 100 / gridSize; // Sin imagen: 1 cuadrícula = 1 m.
let projectName = '';
const devices = [];
const links = []; // 1 entrada por cable.
const selectedDevices = new Set();
const rackGroups = [];
let nextRackNumber = 1;
let deviceClipboard = [];
let pasteCount = 0;
let editingRackGroup = null;
let selectedPort = null;
let selectedLink = null;
let selectedDevice = null;
let draggingDevice = null;
let resizingDevice = null;
let dragStart = null;
let pendingTemplate = null;
let backgroundImage = null;
let fixedPlanSize = false;
let fixedPlanWidth = 0;
let fixedPlanHeight = 0;
let fixedCanvasMinWidth = 0;
let fixedCanvasMinHeight = 0;
let planDisplayScale = 1;
let planImageX = 0;
let planImageY = 0;
let calibration = null;
let referenceConfirmed = false;
let draggingReference = null;
let pendingExcelImport = [];
let canvasResizeStart = null;

function setStatus(message) { status.textContent = message; }
function updateControls() {
    const needsReference = backgroundImage && !referenceConfirmed;
    createDeviceButton.disabled = Boolean(needsReference);
    confirmDistanceButton.disabled = !calibration?.meters || referenceConfirmed;
    scaleInput.disabled = Boolean(backgroundImage);
    removePhotoButton.hidden = !backgroundImage;
    savePdfButton.disabled = !projectName || Boolean(needsReference);
}
function startProject(event) {
    event.preventDefault();
    const name = projectNameInput.value.trim();
    if (!name) {
        projectNameInput.focus();
        return;
    }
    projectName = name;
    projectTitle.textContent = name;
    projectStart.hidden = true;
    editorShell.inert = false;
    fileMenu.open = false;
    updateControls();
    setStatus(`Project “${name}” is ready. Add equipment or import a plan.`);
}
function startProjectRename() {
    if (!projectName) return;
    projectTitleInput.value = projectName;
    resizeProjectTitleInput();
    projectTitle.hidden = true;
    projectTitleInput.hidden = false;
    projectTitleInput.focus();
    projectTitleInput.select();
}
function resizeProjectTitleInput() {
    projectTitleInput.size = Math.min(42, Math.max(8, projectTitleInput.value.length + 1));
}
function finishProjectRename(save) {
    if (projectTitleInput.hidden) return;
    const name = save ? projectTitleInput.value.trim() : projectName;
    projectTitleInput.hidden = true;
    projectTitle.hidden = false;
    if (save && name) {
        projectName = name;
        projectTitle.textContent = name;
        updateControls();
        setStatus(`Project renamed to “${name}”.`);
    } else if (save) {
        projectTitleInput.value = projectName;
        setStatus('Project name cannot be blank.');
    }
}
function newProject() {
    fileMenu.open = false;
    hideContextMenu();
    if ((devices.length || links.length || backgroundImage) &&
        !window.confirm('Creating a new project will discard the current plan without saving it. Continue?')) return;
    projectName = '';
    projectTitle.textContent = 'Untitled project';
    projectTitleInput.hidden = true;
    projectTitle.hidden = false;
    devices.length = 0;
    selectedDevices.clear();
    rackGroups.length = 0;
    finishRackRename(false);
    nextRackNumber = 1;
    links.length = 0;
    selectedPort = null;
    selectedLink = null;
    selectedDevice = null;
    draggingDevice = null;
    resizingDevice = null;
    dragStart = null;
    pendingTemplate = null;
    backgroundImage = null;
    fixedPlanSize = false;
    fixedPlanWidth = 0;
    fixedPlanHeight = 0;
    fixedCanvasMinWidth = 0;
    fixedCanvasMinHeight = 0;
    planDisplayScale = 1;
    planImageX = 0;
    planImageY = 0;
    calibration = null;
    referenceConfirmed = false;
    draggingReference = null;
    cmPerPixel = 100 / gridSize;
    scaleInput.value = '1';
    imageInput.value = '';
    distanceInput.value = '';
    deviceNameInput.value = '';
    connectorCountInput.value = '1';
    for (const entry of extraConnectorInputs.values()) entry.input.value = '0';
    extraConnectorsPanel.open = false;
    planControls.hidden = true;
    referenceSetup.hidden = false;
    canvasWrap.classList.remove('fixed-plan');
    canvas.style.cursor = '';
    linkInfo.replaceChildren();
    updateSummary();
    updateHint();
    updateControls();
    resizeCanvas();
    editorShell.inert = true;
    projectStart.hidden = false;
    projectNameInput.value = '';
    projectNameInput.focus();
}
function saveProjectPdf() {
    if (!projectName || (backgroundImage && !referenceConfirmed)) return;
    fileMenu.open = false;
    try {
        const rows = getCableGroups();
        draw(false);
        const pdf = window.createProjectPdf(projectName, canvas, rows);
        const url = URL.createObjectURL(pdf);
        const anchor = document.createElement('a');
        const safeName = projectName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 100) || 'project';
        anchor.href = url;
        anchor.download = `${safeName}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus(`PDF for “${projectName}” downloaded.`);
    } catch (error) {
        setStatus(`Could not create PDF: ${error.message}`);
    } finally {
        draw();
    }
}
function normalizeCatalogKey(value) {
    return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]/g, '');
}
function normalizeZipPath(basePath, target) {
    const parts = target.startsWith('/') ? [] : basePath.split('/').slice(0, -1);
    for (const part of target.replace(/^\//, '').split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') parts.pop();
        else parts.push(part);
    }
    return parts.join('/');
}
async function readXlsxEntries(file) {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const decoder = new TextDecoder();
    let endRecord = -1;
    for (let offset = buffer.byteLength - 22;
        offset >= Math.max(0, buffer.byteLength - 65557); offset--) {
        if (view.getUint32(offset, true) === 0x06054b50) {
            endRecord = offset;
            break;
        }
    }
    if (endRecord < 0) throw new Error('The file is not a valid XLSX workbook.');
    const entriesCount = view.getUint16(endRecord + 10, true);
    let directoryOffset = view.getUint32(endRecord + 16, true);
    const entries = new Map();
    for (let i = 0; i < entriesCount; i++) {
        if (view.getUint32(directoryOffset, true) !== 0x02014b50) {
            throw new Error('Could not read the Excel workbook.');
        }
        const flags = view.getUint16(directoryOffset + 8, true);
        const method = view.getUint16(directoryOffset + 10, true);
        const compressedSize = view.getUint32(directoryOffset + 20, true);
        const nameLength = view.getUint16(directoryOffset + 28, true);
        const extraLength = view.getUint16(directoryOffset + 30, true);
        const commentLength = view.getUint16(directoryOffset + 32, true);
        const localOffset = view.getUint32(directoryOffset + 42, true);
        const name = decoder.decode(new Uint8Array(buffer, directoryOffset + 46, nameLength));
        directoryOffset += 46 + nameLength + extraLength + commentLength;
        if (name.endsWith('/')) continue;
        if (flags & 1) throw new Error('The Excel workbook is password protected.');
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.slice(dataOffset, dataOffset + compressedSize);
        let contents;
        if (method === 0) contents = compressed;
        else if (method === 8 && typeof DecompressionStream !== 'undefined') {
            const stream = new Blob([compressed]).stream()
                .pipeThrough(new DecompressionStream('deflate-raw'));
            contents = await new Response(stream).arrayBuffer();
        } else throw new Error('This browser cannot decompress this Excel workbook.');
        entries.set(name, new TextDecoder('utf-8').decode(contents));
    }
    return entries;
}
function parseWorksheetXml(xmlText, sharedStrings) {
    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('An Excel worksheet is damaged.');
    const grid = [];
    for (const row of xml.getElementsByTagName('row')) {
        const rowIndex = Math.max(0, Number(row.getAttribute('r') || grid.length + 1) - 1);
        const values = grid[rowIndex] ?? [];
        for (const cell of row.getElementsByTagName('c')) {
            const ref = cell.getAttribute('r') || '';
            const letters = ref.match(/^[A-Z]+/i)?.[0] || '';
            const column = [...letters.toUpperCase()].reduce((number, letter) =>
                number * 26 + letter.charCodeAt(0) - 64, 0) - 1;
            const type = cell.getAttribute('t');
            const value = cell.getElementsByTagName('v')[0]?.textContent ?? '';
            if (type === 's') values[column] = sharedStrings[Number(value)] ?? '';
            else if (type === 'inlineStr') {
                values[column] = [...cell.getElementsByTagName('t')]
                    .map(part => part.textContent ?? '').join('');
            } else values[column] = value;
        }
        grid[rowIndex] = values;
    }
    return grid;
}
function findExcelModelColumn(grid) {
    const normalizeHeader = value => normalizeCatalogKey(value);
    const scanRows = Math.min(grid.length, 60);
    for (let rowIndex = 0; rowIndex < scanRows; rowIndex++) {
        const headers = grid[rowIndex] ?? [];
        const modelColumn = headers.findIndex(value =>
            ['model', 'modelo', 'modeloequipo', 'modelodeequipo'].includes(normalizeHeader(value)));
        if (modelColumn < 0) continue;
        const findColumn = names => headers.findIndex(value => names.includes(normalizeHeader(value)));
        return {
            headerRow: rowIndex,
            modelColumn,
            quantityColumn: findColumn(['quantity', 'cantidad', 'qty', 'unidades', 'ud', 'uds']),
            brandColumn: findColumn(['marca', 'brand', 'fabricante']),
            nameColumn: findColumn(['nombre', 'equipo', 'nombreequipo', 'denominacion', 'producto'])
        };
    }
    return null;
}
async function readExcelModelRows(file) {
    const entries = await readXlsxEntries(file);
    const workbookXml = entries.get('xl/workbook.xml');
    const relationsXml = entries.get('xl/_rels/workbook.xml.rels');
    if (!workbookXml || !relationsXml) throw new Error('No worksheets were found in the Excel workbook.');
    const workbook = new DOMParser().parseFromString(workbookXml, 'application/xml');
    const relations = new DOMParser().parseFromString(relationsXml, 'application/xml');
    const relationTargets = new Map([...relations.getElementsByTagName('Relationship')]
        .map(relation => [relation.getAttribute('Id'), relation.getAttribute('Target')]));
    const sharedXml = entries.get('xl/sharedStrings.xml');
    const sharedDocument = sharedXml ? new DOMParser().parseFromString(sharedXml, 'application/xml') : null;
    const sharedStrings = sharedDocument ? [...sharedDocument.getElementsByTagName('si')]
        .map(item => [...item.getElementsByTagName('t')]
            .map(part => part.textContent ?? '').join('')) : [];
    for (const sheet of workbook.getElementsByTagName('sheet')) {
        const relationId = sheet.getAttribute('r:id') ||
            sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const target = relationTargets.get(relationId);
        if (!target) continue;
        const sheetPath = normalizeZipPath('xl/workbook.xml', target);
        const sheetXml = entries.get(sheetPath);
        if (!sheetXml) continue;
        const grid = parseWorksheetXml(sheetXml, sharedStrings);
        const result = modelRowsFromGrid(grid, sheet.getAttribute('name') || 'Hoja');
        if (result) return result;
    }
    throw new Error('Could not find a “Model” or “Modelo” column in the first 60 rows.');
}
function modelRowsFromGrid(grid, sheetName) {
    const columns = findExcelModelColumn(grid);
    if (!columns) return null;
    const rows = [];
    for (let i = columns.headerRow + 1; i < grid.length; i++) {
        const cells = grid[i] ?? [];
        const model = String(cells[columns.modelColumn] ?? '').trim();
        if (!model) continue;
        const rawQuantity = columns.quantityColumn < 0 ? 1 :
            Number(String(cells[columns.quantityColumn] ?? '').replace(',', '.'));
        const quantity = Number.isSafeInteger(rawQuantity) && rawQuantity > 0 && rawQuantity <= 50 ?
            rawQuantity : null;
        rows.push({
            model,
            quantity,
            brand: columns.brandColumn < 0 ? '' : String(cells[columns.brandColumn] ?? '').trim(),
            name: columns.nameColumn < 0 ? '' : String(cells[columns.nameColumn] ?? '').trim(),
            rowNumber: i + 1
        });
    }
    return { sheetName, rows };
}
function parseCsvGrid(text) {
    const source = text.replace(/^\uFEFF/, '');
    const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
    const countDelimiter = delimiter => {
        let count = 0;
        let quoted = false;
        for (let i = 0; i < firstLine.length; i++) {
            if (firstLine[i] === '"' && firstLine[i + 1] === '"' && quoted) i++;
            else if (firstLine[i] === '"') quoted = !quoted;
            else if (!quoted && firstLine[i] === delimiter) count++;
        }
        return count;
    };
    const delimiter = [',', ';', '\t'].sort((a, b) => countDelimiter(b) - countDelimiter(a))[0];
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
        else if (char === '"') quoted = !quoted;
        else if (!quoted && char === delimiter) { row.push(cell); cell = ''; }
        else if (!quoted && (char === '\n' || char === '\r')) {
            if (char === '\r' && source[i + 1] === '\n') i++;
            row.push(cell); rows.push(row); row = []; cell = '';
        } else cell += char;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
}
function findCatalogProduct(model, brand) {
    const key = normalizeCatalogKey(model);
    if (!key) return { status: 'empty', product: null };
    const brandKey = normalizeCatalogKey(brand);
    let exactReferences = harmanProductCatalog.filter(product =>
        normalizeCatalogKey(product.reference) === key);
    if (brandKey && exactReferences.length) {
        const matchingBrand = exactReferences.filter(product =>
            normalizeCatalogKey(product.brand).includes(brandKey) ||
            brandKey.includes(normalizeCatalogKey(product.brand)));
        if (matchingBrand.length) exactReferences = matchingBrand;
    }
    if (exactReferences.length === 1) return { status: 'exact', product: exactReferences[0] };
    let candidates = harmanProductCatalog.filter(product => {
        const keys = [product.reference, product.model, product.title].map(normalizeCatalogKey);
        const brandPrefixes = product.brand === 'JBL Professional' ? ['jbl', 'jblprofessional'] :
            product.brand === 'Crown' ? ['crown'] : product.brand === 'NETGEAR' ? ['netgear'] :
            product.brand === 'BSS' || product.brand === 'BSS Audio' ? ['bss', 'omni', 'soundweb'] : [];
        const netgearSku = product.brand === 'NETGEAR' &&
            key.startsWith(`ing${normalizeCatalogKey(product.reference)}`);
        return keys.includes(key) || netgearSku || keys.some(catalogKey =>
            brandPrefixes.some(prefix => key === prefix + catalogKey));
    });
    if (brandKey && candidates.length) {
        const byBrand = candidates.filter(product =>
            normalizeCatalogKey(product.brand).includes(brandKey) || brandKey.includes(normalizeCatalogKey(product.brand)));
        if (byBrand.length) candidates = byBrand;
    }
    if (candidates.length === 1) return { status: 'exact', product: candidates[0] };
    if (candidates.length > 1) return { status: 'ambiguous', product: null };
    const partial = harmanProductCatalog.filter(product => {
        const ref = normalizeCatalogKey(product.reference);
        const productModel = normalizeCatalogKey(product.model);
        return ref.length >= 5 && (key.includes(ref) || productModel.length >= 5 && key.includes(productModel));
    });
    return partial.length === 1 ? { status: 'partial', product: partial[0] } :
        { status: partial.length ? 'ambiguous' : 'missing', product: null };
}
function buildImportPreviewRows(excelRows) {
    return excelRows.map(row => {
        const match = findCatalogProduct(row.model, row.brand);
        const product = match.product;
        const connectorTypes = product?.connectors?.flatMap(connector =>
            connectorMap[connector.type] ? Array(connector.count).fill(connector.type) : []) ?? [];
        const hasUnmappedConnector = /\bHDMI\b/i
            .test(product?.evidence ?? '');
        const validConnectors = connectorTypes.length > 0 && connectorTypes.length <= 64 && !hasUnmappedConnector;
        const ready = match.status === 'exact' && row.quantity !== null && validConnectors;
        const canManuallyImport = !ready && match.status === 'partial' && row.quantity !== null && validConnectors;
        const reason = !row.quantity ? 'Check quantity' : match.status === 'missing' ?
            'Model not in catalogue' : match.status === 'ambiguous' ? 'Ambiguous model' :
            match.status === 'partial' ? 'Possible match' :
            hasUnmappedConnector ? 'Check connectors in product sheet' :
            !connectorTypes.length ? 'Connector data missing' : connectorTypes.length > 64 ?
            'More than 64 connectors' : 'Found in catalogue';
        return { ...row, product, connectorTypes, ready, canManuallyImport, reason };
    });
}
function updateImportSelection() {
    const selected = [...importPreviewRows.querySelectorAll('.import-row-select:checked')]
        .reduce((count, input) => count + (pendingExcelImport[Number(input.dataset.index)]?.quantity ?? 0), 0);
    const reviewCount = pendingExcelImport.filter(row => !row.ready).length;
    confirmImportButton.disabled = selected === 0;
    confirmImportButton.textContent = selected ? `Import ${selected} items` : 'Import equipment';
    importPreviewNote.textContent = reviewCount ?
        `${reviewCount} row${reviewCount === 1 ? '' : 's'} need review. Tick a possible match if you confirm the model.` :
        'Equipment will be placed on the plan. The spreadsheet does not define connections between items.';
}
function showExcelImportPreview(sheetName, rows) {
    pendingExcelImport = buildImportPreviewRows(rows);
    importPreviewRows.replaceChildren();
    const readyCount = pendingExcelImport.filter(row => row.ready)
        .reduce((count, row) => count + row.quantity, 0);
    importPreviewSummary.textContent = `${rows.length} rows from “${sheetName}”. ${readyCount} items ready to import.`;
    pendingExcelImport.forEach((row, index) => {
        const tr = document.createElement('tr');
        const selectCell = document.createElement('td');
        if (row.ready || row.canManuallyImport) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = row.ready;
            checkbox.className = 'import-row-select';
            checkbox.dataset.index = String(index);
            checkbox.setAttribute('aria-label', row.canManuallyImport ?
                `Confirm possible match of ${row.model} to ${row.product.model} and import` :
                `Import ${row.model}`);
            if (row.canManuallyImport) checkbox.title = `Confirm that ${row.model} matches ${row.product.model}`;
            checkbox.addEventListener('change', updateImportSelection);
            selectCell.appendChild(checkbox);
        } else selectCell.textContent = '—';
        const modelCell = document.createElement('td');
        modelCell.textContent = row.name || row.model;
        if (row.product) {
            const detail = document.createElement('div');
            detail.className = 'tiny muted';
            detail.textContent = `${row.product.brand} · ${row.product.model}`;
            modelCell.appendChild(detail);
        }
        const quantityCell = document.createElement('td');
        quantityCell.textContent = row.quantity === null ? 'Review' : String(row.quantity);
        const connectorCell = document.createElement('td');
        const connectorCounts = row.connectorTypes.reduce((counts, type) => {
            counts.set(type, (counts.get(type) ?? 0) + 1);
            return counts;
        }, new Map());
        connectorCell.textContent = connectorCounts.size ? [...connectorCounts]
            .map(([type, count]) => `${type} × ${count}`).join(' · ') : 'No data';
        if (row.product?.evidence) connectorCell.title = row.product.evidence;
        const stateCell = document.createElement('td');
        stateCell.textContent = row.reason;
        stateCell.className = row.ready ? 'import-state-ready' : 'import-state-review';
        if (row.canManuallyImport) stateCell.title = 'Tick this row if you confirm the suggested model is correct.';
        if (row.product?.sources?.length) {
            const sourceLink = document.createElement('a');
            sourceLink.className = 'import-source-link';
            sourceLink.href = row.product.sources.find(source => source.includes('jblpro.com') ||
                source.includes('crownaudio.com') || source.includes('bssaudio.com')) || row.product.sources[0];
            sourceLink.target = '_blank';
            sourceLink.rel = 'noopener noreferrer';
            sourceLink.textContent = 'Product sheet';
            sourceLink.style.marginLeft = '7px';
            stateCell.appendChild(sourceLink);
        }
        tr.append(selectCell, modelCell, quantityCell, connectorCell, stateCell);
        importPreviewRows.appendChild(tr);
    });
    updateImportSelection();
    importPreview.showModal();
}
function importSelectedExcelRows() {
    if (backgroundImage && !referenceConfirmed) {
        importPreview.close();
        setStatus('Confirm the plan scale before importing equipment.');
        return;
    }
    const selected = [...importPreviewRows.querySelectorAll('.import-row-select:checked')]
        .map(input => pendingExcelImport[Number(input.dataset.index)]).filter(Boolean);
    if (!selected.length) return;
    const total = selected.reduce((count, row) => count + row.quantity, 0);
    if (devices.length && !window.confirm(`${total} items will be added to the current plan. Continue?`)) return;
    freezePlanSize();
    const margin = 24;
    const columnStep = Math.max(190, ...selected.map(row => {
        const count = row.connectorTypes.length;
        const portWidth = count > 16 ? 12 * 24 + 20 : Math.max(140, count * 35 - 15 + 20);
        const displayName = row.name || `${row.product.brand} ${row.product.model}`;
        return Math.max(portWidth, displayName.length * 8 + 12) + 28;
    }));
    const rowStep = Math.max(78, ...selected.map(row => row.connectorTypes.length > 16 ?
        58 + 22 * Math.ceil(row.connectorTypes.length / 12) : 78));
    const columns = Math.max(1, Math.floor((canvas.width - margin * 2) / columnStep));
    let itemIndex = devices.length;
    for (const row of selected) {
        for (let copy = 0; copy < row.quantity; copy++) {
            const x = margin + (itemIndex % columns) * columnStep;
            const y = margin + Math.floor(itemIndex / columns) * rowStep;
            const displayName = row.name || `${row.product.brand} ${row.product.model}`;
            const name = row.quantity > 1 ? `${displayName} ${copy + 1}` : displayName;
            const device = new Device(name, row.connectorTypes, x, y);
            device.catalogProduct = row.product;
            devices.push(device);
            itemIndex++;
        }
    }
    const skipped = pendingExcelImport.filter(row => !row.ready && !selected.includes(row)).length;
    importPreview.close();
    fileMenu.open = false;
    pendingExcelImport = [];
    updateSummary();
    updateHint();
    draw();
    setStatus(`${total} items imported${skipped ? `. ${skipped} rows need review` : ''}.`);
}
async function handleExcelImport(file) {
    if (!file) return;
    fileMenu.open = false;
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['xlsx', 'csv'].includes(extension)) {
        setStatus('Choose an .xlsx or .csv file. Older .xls files are not supported.');
        return;
    }
    if (!harmanProductCatalog.length) {
        setStatus('Could not load the local equipment catalogue.');
        return;
    }
    try {
        setStatus(`Reading ${extension === 'csv' ? 'CSV' : 'Excel'} and matching models in the catalogue…`);
        const workbook = extension === 'csv' ?
            modelRowsFromGrid(parseCsvGrid(await file.text()), file.name) : await readExcelModelRows(file);
        if (!workbook) throw new Error('Could not find a “Model” or “Modelo” column in the first 60 rows.');
        if (!workbook.rows.length) throw new Error('The “Model” or “Modelo” column contains no equipment.');
        showExcelImportPreview(workbook.sheetName, workbook.rows);
    } catch (error) {
        setStatus(`Could not import file: ${error.message}`);
    }
}
function updateHint() {
    emptyState.hidden = devices.length > 0 || Boolean(backgroundImage);
    placementPrompt.hidden = !pendingTemplate;
    placementPrompt.textContent = 'Click on the plan to place the equipment. Press Esc to cancel.';
    cancelButton.hidden = !pendingTemplate && !selectedPort;
    hint.textContent = pendingTemplate ? `Click on the plan to place ${pendingTemplate.name}.` :
        selectedPort ? 'Select the destination connector. Press Esc to cancel.' :
        backgroundImage && !referenceConfirmed ? calibration?.meters ?
            'Confirm the distance to hide points A and B.' :
            'Drag points A and B, then enter their real distance in metres.' :
        devices.length === 0 ? 'Add equipment to get started.' :
        selectedDevices.size > 1 ? 'Selected equipment: right-click to group as a rack or delete. Ctrl+C and Ctrl+V copy and paste.' :
        selectedDevice ? 'Drag the handles to resize. Press Delete to remove. Ctrl+C copies the equipment.' :
        'Drag to select multiple items. Ctrl or Shift + click adds items. Right-click for actions.';
}
function cancelAction() {
    pendingTemplate = null;
    selectedPort = null;
    draggingReference = null;
    resizingDevice = null;
    canvas.style.cursor = '';
    updateHint();
    setStatus('Action cancelled.');
    draw();
}

const connectorMap = {
    'XLR M': ['#0000FF', 'X'], 'XLR F': ['#ADD8E6', 'X'],
    'Speakon NL2': ['#008080', 'S'], 'Speakon NL2 / 1/4 TS combo': ['#008080', 'S'],
    'Speakon NL4': ['#008080', 'S'],
    'Speakon NL8': ['#008080', 'S'], '1/4 TRS': ['#7D64B0', 'T'],
    'XLR Combo': ['#42a5f5', 'C'], RCA: ['#8bc34a', 'R'],
    '3.5 mm': ['#b0bec5', 'A'], Euroblock: ['#e0a85b', 'E'],
    'Phoenix 3.5 mm': ['#e0a85b', 'E'], 'Phoenix 5.08 mm': ['#e0a85b', 'E'],
    'USB-A': ['#90a4ae', 'U'], 'USB-C': ['#90a4ae', 'U'],
    Bornes: ['#d2a679', 'B'], 'Binding post': ['#ef6c5b', 'B'],
    Ethercon: ['#FFA500', 'E'], 'Ethernet RJ45': ['#55c6a9', 'R'],
    'SFP/SFP+': ['#a58ad4', 'F'], QSFP28: ['#cc80ae', 'Q'],
    BNC: ['#d3a64b', 'B'],
    Powercon: ['#B32D2D', 'P'],
    'DMX 3-pin M': ['#61A357', 'D'], 'DMX 3-pin F': ['#61A357', 'D'],
    'DMX 5-pin M': ['#61A357', 'D'], 'DMX 5-pin F': ['#61A357', 'D']
};
const extraConnectorInputs = new Map();
for (const option of connectorTypeInput.options) {
    const row = document.createElement('div');
    row.className = 'extra-connector-row';
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '16';
    input.step = '1';
    input.value = '0';
    input.id = `extra-${extraConnectorInputs.size}`;
    label.htmlFor = input.id;
    label.textContent = option.value;
    row.append(label, input);
    extraConnectors.appendChild(row);
    extraConnectorInputs.set(option.value, { row, input });
}
function updateExtraConnectors() {
    for (const [type, entry] of extraConnectorInputs) {
        entry.row.hidden = type === connectorTypeInput.value;
    }
}
connectorTypeInput.addEventListener('change', updateExtraConnectors);
updateExtraConnectors();

function updateCalibration() {
    if (!calibration || referenceConfirmed) return;
    const meters = Number(distanceInput.value);
    const pixels = Math.hypot(calibration.b.x - calibration.a.x,
        calibration.b.y - calibration.a.y);
    if (distanceInput.value.trim() === '' || !Number.isFinite(meters) || meters <= 0) {
        calibration.meters = null;
        planStatus.textContent = 'Drag points A and B and enter a distance greater than 0 m.';
    } else if (pixels < 5) {
        calibration.meters = null;
        planStatus.textContent = 'Move points A and B further apart.';
    } else {
        calibration.meters = meters;
        cmPerPixel = meters * 100 / pixels;
        scaleInput.value = Number((cmPerPixel * gridSize / 100).toPrecision(6));
        planStatus.textContent = `${meters} m between A and B. Move them to fine-tune the scale.`;
        updateSummary();
        if (selectedLink) showLinkInfo(selectedLink);
        if (selectedDevice) showDeviceInfo(selectedDevice);
    }
    updateControls();
    updateHint();
    draw();
}
function confirmDistance() {
    if (!calibration?.meters || referenceConfirmed) return;
    referenceConfirmed = true;
    referenceSetup.hidden = true;
    planControls.hidden = true;
    planStatus.textContent = 'Scale updated.';
    updateControls();
    updateHint();
    draw();
    setStatus('Scale updated. You can now place equipment.');
}
function resetScale() {
    if (backgroundImage) {
        referenceConfirmed = false;
        calibration.meters = null;
        distanceInput.value = '';
        referenceSetup.hidden = false;
        planControls.hidden = false;
        planStatus.textContent = 'Adjust points A and B and enter the new distance in metres.';
        pendingTemplate = null;
        selectedPort = null;
        draggingReference = null;
        canvas.style.cursor = '';
        setStatus('Scale is ready to adjust. Equipment will be kept.');
    } else {
        cmPerPixel = 100 / gridSize;
        scaleInput.value = '1';
        // En un plano sin foto, la cuadrícula debe ocupar todo el espacio disponible.
        if (!fixedPlanSize) resizeCanvas();
        updateSummary();
        if (selectedLink) showLinkInfo(selectedLink);
        if (selectedDevice) showDeviceInfo(selectedDevice);
        setStatus('Scale reset to 1 m per grid square.');
    }
    updateControls();
    updateHint();
    draw();
}
function removePhoto() {
    if (!backgroundImage) return;
    backgroundImage = null;
    calibration = null;
    referenceConfirmed = false;
    draggingReference = null;
    resizingDevice = null;
    pendingTemplate = null;
    selectedPort = null;
    canvas.style.cursor = '';
    imageInput.value = '';
    planControls.hidden = true;
    // La imagen podía imponer una proporción estrecha. Al quitarla, vuelve el plano
    // al tamaño completo del área de trabajo y se conserva la escala calibrada.
    fixedPlanSize = false;
    fixedPlanWidth = 0;
    fixedPlanHeight = 0;
    fixedCanvasMinWidth = 0;
    fixedCanvasMinHeight = 0;
    planDisplayScale = 1;
    planImageX = 0;
    planImageY = 0;
    canvasWrap.classList.remove('fixed-plan');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    resizeCanvas();
    scaleInput.value = Number((cmPerPixel * gridSize / 100).toPrecision(6));
    if (selectedDevice) showDeviceInfo(selectedDevice);
    updateControls();
    updateHint();
    draw();
    setStatus('Image removed. Equipment, cables and scale have been kept.');
}
function loadPlanImage(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        setStatus('Choose a PNG, JPG or WebP image.');
        return;
    }
    if (devices.length && !window.confirm('Changing the plan will remove the placed equipment and cables. Continue?')) {
        imageInput.value = '';
        return;
    }
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        const ratio = Math.min(1000 / image.naturalWidth, 800 / image.naturalHeight);
        backgroundImage = image;
        fixedPlanSize = false;
        fixedPlanWidth = 0;
        fixedPlanHeight = 0;
        fixedCanvasMinWidth = 0;
        fixedCanvasMinHeight = 0;
        planDisplayScale = 1;
        planImageX = 0;
        planImageY = 0;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        freezePlanSize();
        devices.length = 0;
        selectedDevices.clear();
        rackGroups.length = 0;
        links.length = 0;
        selectedDevice = null;
        selectedLink = null;
        selectedPort = null;
        pendingTemplate = null;
        calibration = {
            a: { x: planImageX + fixedPlanWidth * 0.25, y: planImageY + fixedPlanHeight * 0.5 },
            b: { x: planImageX + fixedPlanWidth * 0.75, y: planImageY + fixedPlanHeight * 0.5 },
            meters: null
        };
        referenceConfirmed = false;
        draggingReference = null;
        resizingDevice = null;
        linkInfo.replaceChildren();
        planControls.hidden = false;
        referenceSetup.hidden = false;
        planStatus.textContent = 'Drag points A and B to the reference points and enter the distance in metres.';
        distanceInput.value = '';
        updateControls();
        updateHint();
        updateSummary();
        draw();
        setStatus('Image loaded. Drag points A and B and enter the distance in metres.');
    };
    image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        setStatus('Could not open the image. Choose another one.');
    };
    image.src = imageUrl;
}

class Device {
    constructor(name, types, x, y) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.ports = types.map(type => ({ type, x: 0, y: 0 }));
        const portSpan = this.ports.length * 20 + Math.max(0, this.ports.length - 1) * 15;
        this.minWidth = Math.max(64, portSpan + 12);
        this.multiRowPorts = this.ports.length > 16;
        this.portColumns = this.multiRowPorts ? 12 : Math.max(1, this.ports.length);
        this.portRows = Math.ceil(this.ports.length / this.portColumns);
        this.minWidth = this.multiRowPorts ? this.portColumns * 24 + 20 : Math.max(64, portSpan + 12);
        this.minHeight = this.multiRowPorts ? 34 + this.portRows * 22 : 48;
        this.width = Math.max(140, this.multiRowPorts ? this.minWidth : portSpan + 20, name.length * 8 + 12);
        this.height = this.multiRowPorts ? this.minHeight : 52;
        this.baseWidth = this.width;
        this.baseHeight = this.height;
        this.move(x, y);
    }
    positionPorts() {
        const scale = this.portScale();
        const span = (this.ports.length * 20 + Math.max(0, this.ports.length - 1) * 15) * scale;
        const columns = this.multiRowPorts ? this.portColumns : Math.max(1, this.ports.length);
        this.ports.forEach((port, i) => {
            if (this.multiRowPorts) {
                const row = Math.floor(i / columns);
                const rowStart = row * columns;
                const rowCount = Math.min(columns, this.ports.length - rowStart);
                const left = this.x + (this.width - rowCount * 24 * scale) / 2;
                port.x = left + (i - rowStart) * 24 * scale + 12 * scale;
                port.y = this.y + this.height - 12 * scale - row * 22 * scale;
            } else {
                const left = this.x + (this.width - span) / 2;
                port.x = left + i * 35 * scale + 10 * scale;
                port.y = this.y + this.height - 12 * scale;
            }
        });
    }
    portScale() {
        return Math.max(0.5, Math.min(4,
            Math.sqrt((this.width / this.baseWidth) * (this.height / this.baseHeight))));
    }
    move(x, y) {
        if (backgroundImage) { this.moveExact(x, y); return; }
        const maxX = Math.max(0, Math.floor((canvas.width - this.width) / gridSize) * gridSize);
        const maxY = Math.max(0, Math.floor((canvas.height - this.height) / gridSize) * gridSize);
        this.x = Math.min(maxX, Math.max(0, Math.round(x / gridSize) * gridSize));
        this.y = Math.min(maxY, Math.max(0, Math.round(y / gridSize) * gridSize));
        this.positionPorts();
    }
    moveExact(x, y) {
        this.x = Math.min(Math.max(0, canvas.width - this.width), Math.max(0, x));
        this.y = Math.min(Math.max(0, canvas.height - this.height), Math.max(0, y));
        this.positionPorts();
    }
    contains(p) {
        return p.x >= this.x && p.x <= this.x + this.width &&
            p.y >= this.y && p.y <= this.y + this.height;
    }
    portAt(p) {
        const displayScale = canvas.clientWidth / Math.max(canvas.width, 1);
        const reach = Math.max(10 * this.portScale(), 12 / Math.max(displayScale, 0.001));
        return this.ports.find(port => Math.hypot(port.x - p.x, port.y - p.y) <= reach);
    }
    draw() {
        ctx.fillStyle = selectedDevices.has(this) ? '#287e99' : '#008cba';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        if (selectedDevices.has(this)) {
            ctx.strokeStyle = '#f6b85d';
            ctx.lineWidth = Math.max(1, 2 / Math.max(canvas.clientWidth / canvas.width, 0.1));
            ctx.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
        }
        const textScale = Math.sqrt((this.width / this.baseWidth) *
            (this.height / this.baseHeight));
        const fontSize = Math.max(9, Math.min(32, 14 * textScale, this.height - 31,
            this.multiRowPorts ? 20 : 32));
        if (this.height >= fontSize + 31) {
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillText(this.name, this.x + 5,
            this.y + fontSize + 4,
                Math.max(1, this.width - 10));
        }
        const portScale = this.portScale();
        ctx.font = `${Math.max(9, Math.min(28, 14 * portScale))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.ports.forEach(port => {
            const [color, letter] = connectorMap[port.type];
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(port.x, port.y, 10 * portScale, 0, Math.PI * 2);
            ctx.fill();
            if (port === selectedPort) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.fillStyle = '#000';
            ctx.fillText(letter, port.x, port.y);
        });
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }
}

function pointOnCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left - canvas.clientLeft) * canvas.width / canvas.clientWidth,
        y: (event.clientY - rect.top - canvas.clientTop) * canvas.height / canvas.clientHeight
    };
}
function freezePlanSize() {
    if (!fixedPlanSize) {
        fixedPlanWidth = canvas.width;
        fixedPlanHeight = canvas.height;
        const availableWidth = canvasWrap.clientWidth;
        const availableHeight = canvasWrap.clientHeight;
        planDisplayScale = availableWidth > 0 && availableHeight > 0 ?
            Math.min(availableWidth / fixedPlanWidth, availableHeight / fixedPlanHeight) : 1;
    }
    fixedPlanSize = true;
    canvasWrap.classList.add('fixed-plan');
    resizeCanvas();
    if (!fixedCanvasMinWidth || !fixedCanvasMinHeight) {
        fixedCanvasMinWidth = canvas.width;
        fixedCanvasMinHeight = canvas.height;
    }
}
function resizeCanvas() {
    if (fixedPlanSize) {
        const availableWidth = canvasWrap.clientWidth;
        const availableHeight = canvasWrap.clientHeight;
        if (availableWidth > 0 && availableHeight > 0) {
            const fit = planDisplayScale;
            const contentRight = Math.max(fixedPlanWidth + planImageX,
                ...devices.map(device => device.x + device.width + gridSize));
            const contentBottom = Math.max(fixedPlanHeight + planImageY,
                ...devices.map(device => device.y + device.height + gridSize));
            const width = Math.max(fixedCanvasMinWidth || canvas.width,
                Math.ceil(availableWidth / fit), Math.ceil(contentRight));
            const height = Math.max(fixedCanvasMinHeight || canvas.height,
                Math.ceil(availableHeight / fit), Math.ceil(contentBottom));
            if (canvas.width !== width || canvas.height !== height) {
                if (backgroundImage && fixedPlanWidth === canvas.width && fixedPlanHeight === canvas.height) {
                    planImageX = (width - fixedPlanWidth) / 2;
                    planImageY = (height - fixedPlanHeight) / 2;
                }
                canvas.width = width;
                canvas.height = height;
            }
            canvas.style.width = `${canvas.width * fit}px`;
            canvas.style.height = `${canvas.height * fit}px`;
            canvasWrap.style.setProperty('--plan-grid-size', `${gridSize * fit}px`);
            canvasWrap.classList.toggle('canvas-content-overflow',
                canvas.width * fit > availableWidth + 1 || canvas.height * fit > availableHeight + 1);
        }
        draw();
        return;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvasWrap.classList.remove('canvas-content-overflow');
    canvasWrap.style.setProperty('--plan-grid-size', `${gridSize}px`);
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0 &&
        (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        devices.forEach(device => device.moveExact(device.x, device.y));
        updateSummary();
    }
    draw();
}
function resetCanvasAreaSize() {
    canvasWrap.style.flex = '';
    canvasWrap.style.width = '';
    canvasWrap.style.height = '';
    canvasWrap.closest('.workspace')?.classList.remove('canvas-area-expanded');
    document.querySelector('.app')?.classList.remove('page-scroll-mode');
    resizeCanvas();
    setStatus('Plan area fitted to the available space. Scale is unchanged.');
}
canvasResizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = canvasWrap.getBoundingClientRect();
    canvasResizeStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        width: rect.width, height: rect.height };
    canvasWrap.style.flex = 'none';
    canvasWrap.style.width = `${rect.width}px`;
    canvasWrap.style.height = `${rect.height}px`;
    canvasWrap.closest('.workspace')?.classList.add('canvas-area-expanded');
    document.querySelector('.app')?.classList.add('page-scroll-mode');
    canvasResizeHandle.setPointerCapture(event.pointerId);
});
canvasResizeHandle.addEventListener('pointermove', event => {
    if (!canvasResizeStart || event.pointerId !== canvasResizeStart.pointerId) return;
    const width = Math.max(canvasAreaMinWidth,
        Math.min(5000, canvasResizeStart.width + event.clientX - canvasResizeStart.x));
    const height = Math.max(canvasAreaMinHeight,
        Math.min(4000, canvasResizeStart.height + event.clientY - canvasResizeStart.y));
    canvasWrap.style.width = `${width}px`;
    canvasWrap.style.height = `${height}px`;
    resizeCanvas();
});
function finishCanvasAreaResize(event) {
    if (!canvasResizeStart || event.pointerId !== canvasResizeStart.pointerId) return;
    canvasResizeStart = null;
    const scaleMeters = Number((cmPerPixel * gridSize / 100).toPrecision(6));
    setStatus(`Plan area enlarged. Scale unchanged: ${scaleMeters} m per grid square.`);
}
canvasResizeHandle.addEventListener('keydown', event => {
    const directions = {
        ArrowRight: [gridSize, 0], ArrowLeft: [-gridSize, 0],
        ArrowDown: [0, gridSize], ArrowUp: [0, -gridSize]
    };
    if (event.key === 'Home') {
        event.preventDefault();
        resetCanvasAreaSize();
        return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const rect = canvasWrap.getBoundingClientRect();
    canvasWrap.style.flex = 'none';
    canvasWrap.style.width = `${Math.max(canvasAreaMinWidth,
        Math.min(5000, rect.width + direction[0] * (event.shiftKey ? 5 : 1)))}px`;
    canvasWrap.style.height = `${Math.max(canvasAreaMinHeight,
        Math.min(4000, rect.height + direction[1] * (event.shiftKey ? 5 : 1)))}px`;
    canvasWrap.closest('.workspace')?.classList.add('canvas-area-expanded');
    document.querySelector('.app')?.classList.add('page-scroll-mode');
    resizeCanvas();
});
canvasResizeHandle.addEventListener('pointerup', finishCanvasAreaResize);
canvasResizeHandle.addEventListener('pointercancel', finishCanvasAreaResize);
canvasResizeHandle.addEventListener('dblclick', resetCanvasAreaSize);
function referenceMarkerRadius() {
    return Math.min(46, Math.max(14,
        14 * canvas.width / Math.max(canvas.clientWidth, 1)));
}
function resizeHandleRadius(device) {
    const displayScale = canvas.clientWidth / Math.max(canvas.width, 1);
    return Math.max(1, Math.min(5, device.width / 20, device.height / 8,
        3 / Math.max(displayScale, 0.001)));
}
function resizeHandlePoints(device) {
    const left = device.x;
    const right = device.x + device.width;
    const top = device.y;
    const bottom = device.y + device.height;
    const middleX = (left + right) / 2;
    const middleY = (top + bottom) / 2;
    return [
        ['nw', left, top], ['ne', right, top],
        ['se', right, bottom], ['sw', left, bottom],
        ['n', middleX, top], ['e', right, middleY],
        ['s', middleX, bottom], ['w', left, middleY]
    ];
}
function resizeHandleAt(device, point) {
    const displayScale = canvas.clientWidth / Math.max(canvas.width, 1);
    const reach = Math.max(resizeHandleRadius(device) * 2,
        5 / Math.max(displayScale, 0.001));
    return resizeHandlePoints(device).find(([, x, y]) =>
        Math.abs(point.x - x) <= reach && Math.abs(point.y - y) <= reach)?.[0] ?? null;
}
function resizeCursor(handle) {
    if (handle === 'n' || handle === 's') return 'ns-resize';
    if (handle === 'e' || handle === 'w') return 'ew-resize';
    return handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize';
}
function resizeDevice(state, point) {
    const { device, handle, start, pointer } = state;
    const dx = point.x - pointer.x;
    const dy = point.y - pointer.y;
    const west = handle.includes('w');
    const east = handle.includes('e');
    const north = handle.includes('n');
    const south = handle.includes('s');
    if ((west || east) && (north || south)) {
        const scaleX = (start.width + (east ? dx : -dx)) / start.width;
        const scaleY = (start.height + (south ? dy : -dy)) / start.height;
        const preferred = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
        const minimum = Math.max(device.minWidth / start.width,
            device.minHeight / start.height);
        const maxWidth = east ? canvas.width - start.x : start.x + start.width;
        const maxHeight = south ? canvas.height - start.y : start.y + start.height;
        const maximum = Math.min(maxWidth / start.width, maxHeight / start.height);
        const scale = Math.max(minimum, Math.min(maximum, preferred));
        device.width = start.width * scale;
        device.height = start.height * scale;
        device.x = west ? start.x + start.width - device.width : start.x;
        device.y = north ? start.y + start.height - device.height : start.y;
    } else {
        device.x = start.x;
        device.y = start.y;
        device.width = start.width;
        device.height = start.height;
        if (east) device.width = Math.max(device.minWidth,
            Math.min(canvas.width - start.x, start.width + dx));
        if (west) {
            device.x = Math.max(0, Math.min(start.x + dx,
                start.x + start.width - device.minWidth));
            device.width = start.x + start.width - device.x;
        }
        if (south) device.height = Math.max(device.minHeight,
            Math.min(canvas.height - start.y, start.height + dy));
        if (north) {
            device.y = Math.max(0, Math.min(start.y + dy,
                start.y + start.height - device.minHeight));
            device.height = start.y + start.height - device.y;
        }
    }
    device.positionPorts();
}
function drawResizeHandles() {
    if (!selectedDevice) return;
    const radius = resizeHandleRadius(selectedDevice);
    for (const [, x, y] of resizeHandlePoints(selectedDevice)) {
        ctx.fillStyle = '#172938';
        ctx.beginPath();
        ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f6b85d';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
function drawReferenceHandles() {
    if (!calibration || referenceConfirmed) return;
    const radius = referenceMarkerRadius();
    for (const [name, point] of [['A', calibration.a], ['B', calibration.b]]) {
        ctx.fillStyle = '#ffcf65';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#172938';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#172938';
        ctx.font = `${Math.round(radius * 1.1)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, point.x, point.y);
    }
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '14px Arial';
}
function draw(showResizeHandles = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#14212d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, planImageX, planImageY, fixedPlanWidth, fixedPlanHeight);
        ctx.fillStyle = 'rgba(35, 45, 55, 0.28)';
        ctx.fillRect(planImageX, planImageY, fixedPlanWidth, fixedPlanHeight);
    }
    if (calibration && !referenceConfirmed) {
        ctx.beginPath();
        ctx.moveTo(calibration.a.x, calibration.a.y);
        ctx.lineTo(calibration.b.x, calibration.b.y);
        ctx.strokeStyle = '#172938';
        ctx.lineWidth = 7;
        ctx.stroke();
        ctx.strokeStyle = '#ffcf65';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    links.forEach(link => {
        ctx.beginPath();
        ctx.moveTo(link.start.x, link.start.y);
        ctx.lineTo(link.end.x, link.end.y);
        ctx.strokeStyle = '#172938';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = link.selected ? '#FFFF00' : '#f0f0f0';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    drawRackGroups();
    devices.forEach(device => device.draw());
    if (dragStart && selectionRect) {
        ctx.fillStyle = 'rgba(90, 177, 197, 0.14)';
        ctx.strokeStyle = '#8fcac2';
        ctx.lineWidth = 1;
        ctx.fillRect(selectionRect.left, selectionRect.top,
            selectionRect.right - selectionRect.left, selectionRect.bottom - selectionRect.top);
        ctx.strokeRect(selectionRect.left, selectionRect.top,
            selectionRect.right - selectionRect.left, selectionRect.bottom - selectionRect.top);
    }
    if (showResizeHandles) drawResizeHandles();
    drawReferenceHandles();
}
let selectionRect = null;
let marqueeBaseSelection = new Set();
let marqueeAdditive = false;
function drawRackGroups() {
    for (const group of rackGroups) {
        const frame = rackFrame(group);
        if (!frame) continue;
        ctx.fillStyle = 'rgba(38, 58, 72, 0.72)';
        ctx.fillRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top);
        ctx.strokeStyle = '#6a8394';
        ctx.lineWidth = 3;
        ctx.strokeRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top);
        ctx.strokeStyle = '#b9cad5';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo((frame.left + frame.right) / 2 - 16, frame.top);
        ctx.lineTo((frame.left + frame.right) / 2 + 16, frame.top);
        ctx.stroke();
        ctx.fillStyle = '#b9cad5';
        ctx.font = '12px Arial';
        ctx.fillText(group.name, frame.labelX, frame.labelY);
    }
}
function rackFrame(group) {
    const members = group.devices.filter(device => devices.includes(device));
    if (!members.length) return null;
    const left = Math.min(...members.map(device => device.x)) - 14;
    const top = Math.min(...members.map(device => device.y)) - 12;
    return {
        left, top,
        right: Math.max(...members.map(device => device.x + device.width)) + 14,
        bottom: Math.max(...members.map(device => device.y + device.height)) + 12,
        labelX: left + 6,
        labelY: Math.max(12, top - 3)
    };
}
function rackBoundaryAt(point) {
    const displayScale = canvas.clientWidth / Math.max(canvas.width, 1);
    const reach = Math.max(8, 10 / Math.max(displayScale, 0.001));
    for (const group of rackGroups) {
        const frame = rackFrame(group);
        if (!frame || point.x < frame.left - reach || point.x > frame.right + reach ||
            point.y < frame.top - reach || point.y > frame.bottom + reach) continue;
        const onHorizontalEdge = point.x >= frame.left - reach && point.x <= frame.right + reach &&
            (Math.abs(point.y - frame.top) <= reach || Math.abs(point.y - frame.bottom) <= reach);
        const onVerticalEdge = point.y >= frame.top - reach && point.y <= frame.bottom + reach &&
            (Math.abs(point.x - frame.left) <= reach || Math.abs(point.x - frame.right) <= reach);
        if (onHorizontalEdge || onVerticalEdge) return group;
    }
    return null;
}
function startRackDrag(group, point) {
    selectedDevices.clear();
    group.devices.forEach(member => selectedDevices.add(member));
    selectedDevice = null;
    draggingDevice = group.devices[0];
    draggingDevice.offsets = group.devices.map(member => ({ device: member,
        x: member.x, y: member.y }));
    draggingDevice.pointerStart = point;
    selectedLink = null;
    selectedPort = null;
    links.forEach(link => { link.selected = false; });
    showDeviceInfo(null);
    updateHint();
    setStatus(`Drag the ${group.name} border to move the whole rack.`);
    canvas.style.cursor = 'grabbing';
    draw();
}
function beginRackRename(group, frame) {
    editingRackGroup = group;
    rackNameEditor.value = group.name;
    const canvasRect = canvas.getBoundingClientRect();
    const wrapRect = canvasWrap.getBoundingClientRect();
    const scaleX = canvasRect.width / Math.max(canvas.width, 1);
    const scaleY = canvasRect.height / Math.max(canvas.height, 1);
    const width = Math.min(260, Math.max(110, (group.name.length * 8 + 28)));
    rackNameEditor.style.width = `${width}px`;
    rackNameEditor.style.left = `${Math.max(0, Math.min(wrapRect.width - width,
        canvasRect.left - wrapRect.left + frame.labelX * scaleX))}px`;
    rackNameEditor.style.top = `${Math.max(0, canvasRect.top - wrapRect.top +
        (frame.labelY - 15) * scaleY)}px`;
    rackNameEditor.hidden = false;
    rackNameEditor.focus();
    rackNameEditor.select();
}
function finishRackRename(save) {
    if (!editingRackGroup) return;
    const name = rackNameEditor.value.trim();
    if (save && name) editingRackGroup.name = name;
    const saved = save && Boolean(name);
    editingRackGroup = null;
    rackNameEditor.hidden = true;
    if (saved) setStatus(`Rack renamed to “${name}”.`);
    draw();
}
function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const size = dx * dx + dy * dy;
    if (size === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / size));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function isRackInternalLink(link) {
    const startDevice = devices.find(device => device.ports.includes(link.start));
    const endDevice = devices.find(device => device.ports.includes(link.end));
    return Boolean(startDevice && endDevice && rackGroups.some(group =>
        group.devices.includes(startDevice) && group.devices.includes(endDevice)));
}
function cableLength(link) {
    if (isRackInternalLink(link)) return null;
    return Math.hypot(link.end.x - link.start.x,
        link.end.y - link.start.y) * cmPerPixel;
}
function getCableGroups() {
    const groups = new Map();
    for (const link of links) {
        const [startType, endType] = [link.start.type, link.end.type].sort();
        const lengthCm = cableLength(link);
        const meters = lengthCm === null ? null : Number((lengthCm / 100).toFixed(2));
        const key = `${startType}\0${endType}\0${meters === null ? 'rack' : meters.toFixed(2)}`;
        if (groups.has(key)) groups.get(key).count++;
        else groups.set(key, { count: 1, startType, endType, meters, internal: meters === null });
    }
    return [...groups.values()];
}
function adjustCableLength(link, lengthCm) {
    const destination = devices.find(device => device.ports.includes(link.end));
    if (!destination) return false;
    const start = link.start;
    const end = link.end;
    const portOffsetX = end.x - destination.x;
    const portOffsetY = end.y - destination.y;
    const minX = portOffsetX;
    const maxX = canvas.width - destination.width + portOffsetX;
    const minY = portOffsetY;
    const maxY = canvas.height - destination.height + portOffsetY;
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let distance = Math.hypot(dx, dy);
    if (distance < 0.001) {
        dx = maxX - start.x >= start.x - minX ? 1 : -1;
        dy = 0;
        distance = 1;
    }
    const ux = dx / distance;
    const uy = dy / distance;
    const limits = [];
    if (ux > 0) limits.push((maxX - start.x) / ux);
    if (ux < 0) limits.push((minX - start.x) / ux);
    if (uy > 0) limits.push((maxY - start.y) / uy);
    if (uy < 0) limits.push((minY - start.y) / uy);
    const maxDistance = Math.min(...limits);
    if (!Number.isFinite(maxDistance) || maxDistance <= 0) return false;
    let desiredDistance = lengthCm / cmPerPixel;
    let scaleChanged = false;
    if (desiredDistance > maxDistance) {
        if (backgroundImage) return false;
        cmPerPixel = lengthCm / maxDistance;
        scaleInput.value = Number((cmPerPixel * gridSize / 100).toFixed(4));
        desiredDistance = maxDistance;
        scaleChanged = true;
    }
    destination.moveExact(start.x + ux * desiredDistance - portOffsetX,
        start.y + uy * desiredDistance - portOffsetY);
    updateSummary();
    draw();
    setStatus(scaleChanged ?
        `Equipment moved. Scale changed to ${scaleInput.value} m per grid square to make it fit.` :
        `Destination equipment moved to ${(lengthCm / 100).toFixed(2)} m from the other connector.`);
    return true;
}
function updateSummary() {
    summaryList.replaceChildren();
    const groups = getCableGroups();
    const total = groups.reduce((sum, group) => sum +
        (group.meters === null ? 0 : group.count * group.meters), 0);
    if (links.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'No cables yet. Connect 2 ports on the plan.';
        summaryList.appendChild(empty);
    }
    for (const group of groups) {
        const item = document.createElement('div');
        item.className = 'summary-row';
        const name = document.createElement('span');
        name.textContent = group.internal ?
            `${group.startType} to ${group.endType} · inside rack, not to scale` :
            `${group.startType} to ${group.endType} · ${group.meters.toFixed(2)} m`;
        const quantity = document.createElement('strong');
        quantity.textContent = `${group.count} cable${group.count === 1 ? '' : 's'}`;
        item.append(name, quantity);
        summaryList.appendChild(item);
    }
    const internalCount = groups.filter(group => group.internal)
        .reduce((sum, group) => sum + group.count, 0);
    const totals = [['Cables', String(links.length)],
        ['Calculated length outside racks', `${total.toFixed(2)} m`]];
    if (internalCount) totals.push(['Rack cables not to scale', String(internalCount)]);
    for (const [label, value] of totals) {
        const item = document.createElement('div');
        item.className = 'summary-row summary-total';
        const name = document.createElement('span');
        name.textContent = label;
        const result = document.createElement('strong');
        result.textContent = value;
        item.append(name, result);
        summaryList.appendChild(item);
    }
}
function showLinkInfo(link) {
    linkInfo.replaceChildren();
    if (!link) return;
    const title = document.createElement('h3');
    title.textContent = 'Selected cable';
    const sourceDevice = devices.find(device => device.ports.includes(link.start));
    const targetDevice = devices.find(device => device.ports.includes(link.end));
    const ends = document.createElement('p');
    ends.textContent = `${sourceDevice?.name ?? 'Source'} (${link.start.type}) to ` +
        `${targetDevice?.name ?? 'Destination'} (${link.end.type})`;
    const internal = isRackInternalLink(link);
    const plane = document.createElement('p');
    plane.textContent = internal ? 'Cable inside the same rack: the plan does not show its real length.' :
        `Distance on plan: ${(Math.hypot(link.end.x - link.start.x,
            link.end.y - link.start.y) * cmPerPixel / 100).toFixed(2)} m`;
    const explanation = document.createElement('p');
    const otherCables = links.filter(item => item !== link && targetDevice &&
        (targetDevice.ports.includes(item.start) || targetDevice.ports.includes(item.end))).length;
    explanation.textContent = internal ? 'Its length is excluded from the project total.' :
        `Changing it will move ${targetDevice?.name ?? 'the destination equipment'}.` +
        (otherCables ? ` ${otherCables} other connected cable${otherCables === 1 ? '' : 's'} will also change.` : '');
    const label = document.createElement('label');
    label.htmlFor = 'real-length';
    label.textContent = 'Required length (m)';
    const input = document.createElement('input');
    input.type = 'number'; input.id = 'real-length'; input.min = '0.01';
    input.step = 'any'; input.placeholder = 'Enter the length';
    input.value = internal ? '' : (cableLength(link) / 100).toFixed(2);
    const button = document.createElement('button');
    button.textContent = 'Move equipment';
    if (internal) {
        label.hidden = true;
        input.hidden = true;
        button.hidden = true;
    }
    button.addEventListener('click', () => {
        const raw = input.value.trim();
        const value = Number(raw);
        if (raw === '' || !Number.isFinite(value) || value <= 0) {
            setStatus('Enter a length greater than 0 m.');
            input.focus();
            return;
        }
        if (adjustCableLength(link, value * 100)) showLinkInfo(link);
        else setStatus(backgroundImage ?
            'That length does not fit on the image at the calibrated scale.' :
            'There is not enough space to move the equipment in that direction.');
    });
    const remove = document.createElement('button');
    remove.className = 'danger-button';
    remove.textContent = 'Delete cable';
    remove.addEventListener('click', () => deleteSelectedLinks());
    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    actions.append(button, remove);
    linkInfo.append(title, ends, plane, explanation, label, input, actions);
}
function showDeviceInfo(device) {
    linkInfo.replaceChildren();
    if (!device) {
        if (selectedDevices.size > 1) {
            const title = document.createElement('h3');
            title.textContent = `${selectedDevices.size} items selected`;
            const description = document.createElement('p');
            description.textContent = 'Right-click to group them as a rack or delete them.';
            linkInfo.append(title, description);
        }
        return;
    }
    const title = document.createElement('h3');
    title.textContent = device.name;
    const description = document.createElement('p');
    description.textContent = `${device.ports.length} connectors. Drag the equipment to move it or its handles to resize. Press Delete to remove it.`;
    const remove = document.createElement('button');
    remove.className = 'danger-button';
    remove.textContent = 'Delete equipment';
    remove.addEventListener('click', () => deleteDevice(device));
    linkInfo.append(title, description);
    if (device.catalogProduct?.sources?.length) {
        const source = device.catalogProduct.sources.find(url =>
            url.includes('jblpro.com') || url.includes('crownaudio.com') || url.includes('bssaudio.com')) ||
            device.catalogProduct.sources[0];
        const sourceLink = document.createElement('a');
        sourceLink.className = 'import-source-link';
        sourceLink.href = source;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'View product sheet';
        linkInfo.appendChild(sourceLink);
    }
    linkInfo.appendChild(remove);
}
function connectPorts(start, end) {
    if (start === end) {
        setStatus('Choose 2 different connectors.');
        return;
    }
    const startDevice = devices.find(device => device.ports.includes(start));
    const endDevice = devices.find(device => device.ports.includes(end));
    if (startDevice && startDevice === endDevice) {
        setStatus('Choose connectors on 2 different items.');
        return;
    }
    if (links.some(link =>
        (link.start === start && link.end === end) ||
        (link.start === end && link.end === start))) {
        setStatus('Those connectors are already linked.');
        return;
    }
    freezePlanSize();
    links.push({ start, end, selected: false });
    updateSummary();
    setStatus('Cable added. Click the line to enter its real length.');
}
function deleteSelectedLinks() {
    const count = links.filter(link => link.selected).length;
    if (count === 0) return;
    const remaining = links.filter(link => !link.selected);
    links.length = 0;
    links.push(...remaining);
    selectedLink = null;
    showLinkInfo(null);
    updateSummary();
    draw();
    setStatus(`${count} cable${count === 1 ? '' : 's'} deleted.`);
}
function deleteDevice(device) {
    const index = devices.indexOf(device);
    if (index < 0) return;
    const ports = new Set(device.ports);
    const remaining = links.filter(link => !ports.has(link.start) && !ports.has(link.end));
    const removedLinks = links.length - remaining.length;
    links.length = 0;
    links.push(...remaining);
    devices.splice(index, 1);
    selectedDevices.delete(device);
    for (let i = rackGroups.length - 1; i >= 0; i--) {
        rackGroups[i].devices = rackGroups[i].devices.filter(member => member !== device);
        if (rackGroups[i].devices.length < 2) rackGroups.splice(i, 1);
    }
    if (selectedDevice === device) selectedDevice = null;
    if (selectedLink && !links.includes(selectedLink)) selectedLink = null;
    selectedPort = null;
    draggingDevice = null;
    resizingDevice = null;
    linkInfo.replaceChildren();
    updateSummary();
    updateHint();
    draw();
    setStatus(`${device.name} deleted${removedLinks ? ` with ${removedLinks} cable${removedLinks === 1 ? '' : 's'}` : ''}.`);
}
function deleteSelectedDevices() {
    const targets = [...selectedDevices];
    if (!targets.length && selectedDevice) targets.push(selectedDevice);
    if (!targets.length) return false;
    const count = targets.length;
    targets.forEach(deleteDevice);
    selectedDevices.clear();
    selectedDevice = null;
    showDeviceInfo(null);
    draw();
    setStatus(`${count} item${count === 1 ? '' : 's'} deleted.`);
    return true;
}
function hideContextMenu() { contextMenu.hidden = true; }
function openContextMenu(event) {
    event.preventDefault();
    const point = pointOnCanvas(event);
    const device = [...devices].reverse().find(item => item.contains(point));
    const deviceRack = device && rackGroups.find(group => group.devices.includes(device));
    if (device && (deviceRack && (selectedDevices.size !== 1 || !selectedDevices.has(device)) ||
        !deviceRack && !selectedDevices.has(device))) {
        selectedDevices.clear();
        selectedDevices.add(device);
        selectedDevice = device;
        showDeviceInfo(device);
        updateHint();
        draw();
    }
    const frameGroup = !device && rackGroups.find(group => {
        const frame = rackFrame(group);
        return frame && point.x >= frame.left && point.x <= frame.right &&
            point.y >= frame.top && point.y <= frame.bottom;
    });
    if (frameGroup) {
        selectedDevices.clear();
        frameGroup.devices.forEach(member => selectedDevices.add(member));
        selectedDevice = null;
        showDeviceInfo(null);
        updateHint();
        draw();
    }
    if (!selectedDevices.size) return;
    const hasGroup = rackGroups.some(group => group.devices.length > 1 &&
        group.devices.every(item => selectedDevices.has(item)));
    const alreadyOneRack = rackGroups.some(group => group.devices.length === selectedDevices.size &&
        group.devices.every(item => selectedDevices.has(item)));
    const oneMember = selectedDevices.size === 1 ? [...selectedDevices][0] : null;
    const selectedRack = oneMember && rackGroups.find(group => group.devices.includes(oneMember));
    const selectedIndex = selectedRack?.devices.indexOf(oneMember) ?? -1;
    groupMenuButton.hidden = selectedDevices.size < 2 || alreadyOneRack;
    ungroupMenuButton.hidden = !hasGroup;
    rackUpMenuButton.hidden = !selectedRack || selectedIndex <= 0;
    rackDownMenuButton.hidden = !selectedRack || selectedIndex < 0 || selectedIndex >= selectedRack.devices.length - 1;
    rackRemoveMenuButton.hidden = !selectedRack;
    deleteMenuButton.textContent = selectedDevices.size > 1 ?
        `Delete ${selectedDevices.size} items` : 'Delete equipment';
    const wrap = canvasWrap.getBoundingClientRect();
    contextMenu.hidden = false;
    contextMenu.style.left = `${Math.max(0, Math.min(event.clientX - wrap.left,
        wrap.width - contextMenu.offsetWidth))}px`;
    contextMenu.style.top = `${Math.max(0, Math.min(event.clientY - wrap.top,
        wrap.height - contextMenu.offsetHeight))}px`;
    const firstAction = [...contextMenu.querySelectorAll('button:not([hidden])')][0];
    firstAction?.focus();
}
function groupSelectedDevices() {
    const members = [...selectedDevices];
    if (members.length < 2) {
        setStatus('Select at least 2 items to create a rack.');
        return;
    }
    for (const device of members) {
        for (let i = rackGroups.length - 1; i >= 0; i--) {
            rackGroups[i].devices = rackGroups[i].devices.filter(member => member !== device);
            if (rackGroups[i].devices.length < 2) rackGroups.splice(i, 1);
        }
    }
    const group = { name: `Rack ${nextRackNumber++}`, devices: members };
    rackGroups.push(group);
    layoutRack(group);
    updateSummary();
    draw();
    setStatus(`Rack created with ${members.length} items stacked.`);
}
function layoutRack(group, origin = null) {
    const members = group.devices.filter(device => devices.includes(device));
    if (!members.length) return;
    const width = Math.max(...members.map(device => device.width));
    const height = members.reduce((sum, device) => sum + device.height, 0) +
        Math.max(0, members.length - 1) * 8;
    const left = Math.min(origin?.x ?? Math.min(...members.map(device => device.x)),
        Math.max(0, canvas.width - width));
    const top = Math.min(origin?.y ?? Math.min(...members.map(device => device.y)),
        Math.max(0, canvas.height - height));
    let y = top;
    for (const device of members) {
        device.moveExact(left + (width - device.width) / 2, y);
        y += device.height + 8;
    }
}
function moveRackMember(device, direction) {
    const group = rackGroups.find(item => item.devices.includes(device));
    if (!group) return;
    const index = group.devices.indexOf(device);
    const target = index + direction;
    if (target < 0 || target >= group.devices.length) return;
    const top = Math.min(...group.devices.map(member => member.y));
    const left = Math.min(...group.devices.map(member => member.x));
    [group.devices[index], group.devices[target]] = [group.devices[target], group.devices[index]];
    layoutRack(group, { x: left, y: top });
    draw();
    setStatus(`${device.name} moved ${direction < 0 ? 'up' : 'down'} in ${group.name}.`);
}
function removeDeviceFromRack(device) {
    const index = rackGroups.findIndex(item => item.devices.includes(device));
    if (index < 0) return;
    const group = rackGroups[index];
    group.devices = group.devices.filter(member => member !== device);
    if (group.devices.length < 2) rackGroups.splice(index, 1);
    else layoutRack(group);
    updateSummary();
    draw();
    setStatus(`${device.name} removed from rack.`);
}
function ungroupSelectedDevices() {
    const targets = new Set(selectedDevices);
    for (let i = rackGroups.length - 1; i >= 0; i--) {
        const group = rackGroups[i];
        if (group.devices.some(device => targets.has(device))) rackGroups.splice(i, 1);
    }
    updateSummary();
    draw();
    setStatus('Rack ungrouped.');
}
function createTemplate() {
    const name = deviceNameInput.value.trim();
    const count = Number(connectorCountInput.value);
    if (!name) { setStatus('Enter an equipment name.'); deviceNameInput.focus(); return; }
    if (!Number.isInteger(count) || count < 1 || count > 16) {
        setStatus('Enter a number of connectors from 1 to 16.');
        connectorCountInput.focus();
        return;
    }
    const types = Array(count).fill(connectorTypeInput.value);
    for (const [type, entry] of extraConnectorInputs) {
        if (type === connectorTypeInput.value) continue;
        const extraCount = Number(entry.input.value);
        if (!Number.isInteger(extraCount) || extraCount < 0 || extraCount > 16) {
            setStatus(`Check the number of ${type} connectors.`);
            extraConnectorsPanel.open = true;
            entry.input.focus();
            return;
        }
        types.push(...Array(extraCount).fill(type));
    }
    if (types.length > 16) {
        setStatus('An item can have up to 16 connectors in total.');
        extraConnectorsPanel.open = true;
        return;
    }
    pendingTemplate = { name, types };
    deviceNameInput.value = '';
    connectorCountInput.value = '1';
    for (const entry of extraConnectorInputs.values()) entry.input.value = '0';
    extraConnectorsPanel.open = false;
    if (backgroundImage && !referenceConfirmed) {
        pendingTemplate = null;
        setStatus('Confirm the distance between A and B before placing equipment.');
        return;
    }
    if (pendingTemplate) {
        canvas.style.cursor = 'crosshair';
        setStatus(`Click on the plan to place ${pendingTemplate.name}.`);
        updateHint();
        canvas.scrollIntoView?.({ block: 'center' });
        canvas.focus?.({ preventScroll: true });
    }
}
function getCatalogConnectorTypes(product) {
    if (!Array.isArray(product.connectors) || !product.connectors.length) return [];
    if (product.connectors.some(connector => !connectorMap[connector.type] ||
        !Number.isInteger(Number(connector.count)) || Number(connector.count) < 1)) return [];
    return product.connectors.flatMap(connector =>
        Array(Number(connector.count)).fill(connector.type));
}
function renderCatalogSearch() {
    const query = normalizeCatalogKey(catalogSearchInput.value);
    catalogSearchResults.replaceChildren();
    if (query.length < 2) {
        const empty = document.createElement('p');
        empty.className = 'catalog-search-empty';
        empty.textContent = 'Enter at least 2 characters to search models with available connectors.';
        catalogSearchResults.appendChild(empty);
        return;
    }
    const matches = harmanProductCatalog.map(product => ({
        product,
        types: getCatalogConnectorTypes(product)
    })).filter(({ product, types }) => types.length && [product.brand, product.reference,
        product.model, product.title, product.series, product.category]
        .some(value => normalizeCatalogKey(value).includes(query)))
        .sort((a, b) => {
            const score = ({ product }) => [product.reference, product.model]
                .some(value => normalizeCatalogKey(value).startsWith(query)) ? 0 : 1;
            return score(a) - score(b) || a.product.model.localeCompare(b.product.model);
        }).slice(0, 30);
    if (!matches.length) {
        const empty = document.createElement('p');
        empty.className = 'catalog-search-empty';
        empty.textContent = 'No matching models with available connectors found.';
        catalogSearchResults.appendChild(empty);
        return;
    }
    for (const { product, types } of matches) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'catalog-result';
        button.setAttribute('aria-label', `Add ${product.brand} ${product.model}, ${types.length} connectors`);
        const title = document.createElement('strong');
        title.textContent = `${product.brand} ${product.model || product.reference}`;
        const detail = document.createElement('span');
        detail.textContent = [product.category, product.reference !== product.model ? product.reference : '']
            .filter(Boolean).join(' · ');
        const byType = new Map();
        types.forEach(type => byType.set(type, (byType.get(type) || 0) + 1));
        const connectorList = document.createElement('span');
        connectorList.className = 'catalog-connectors';
        connectorList.textContent = [...byType].map(([type, count]) => `${count} × ${type}`).join(' · ');
        button.append(title, detail, connectorList);
        button.addEventListener('click', () => addCatalogDevice(product, types));
        catalogSearchResults.appendChild(button);
    }
}
function findDevicePlacement(device) {
    const gap = 16;
    const step = gridSize;
    for (let y = gridSize; y + device.height <= canvas.height; y += step) {
        for (let x = gridSize; x + device.width <= canvas.width; x += step) {
            const overlaps = devices.some(other =>
                x < other.x + other.width + gap && x + device.width + gap > other.x &&
                y < other.y + other.height + gap && y + device.height + gap > other.y);
            if (!overlaps) return { x, y };
        }
    }
    return null;
}
function addCatalogDevice(product, types = getCatalogConnectorTypes(product)) {
    if (!types.length) {
        setStatus(`The catalogue has no supported connectors for ${product.model}.`);
        return;
    }
    if (backgroundImage && !referenceConfirmed) {
        setStatus('Confirm the plan scale before adding catalogue equipment.');
        return;
    }
    const name = `${product.brand} ${product.model || product.reference}`;
    const device = new Device(name, types, 0, 0);
    const placement = findDevicePlacement(device);
    if (!placement) {
        setStatus(`There is no room on the plan to add ${name}.`);
        return;
    }
    freezePlanSize();
    device.moveExact(placement.x, placement.y);
    device.catalogProduct = product;
    devices.push(device);
    selectedDevices.clear();
    selectedDevices.add(device);
    selectedDevice = device;
    updateSummary();
    updateHint();
    showDeviceInfo(device);
    draw();
    setStatus(`${name} added to the plan with ${types.length} catalogue connectors.`);
}
function segmentIntersectsRect(a, b, r) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const p = [-dx, dx, -dy, dy];
    const q = [a.x - r.left, r.right - a.x, a.y - r.top, r.bottom - a.y];
    let first = 0, last = 1;
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false; }
        else {
            const t = q[i] / p[i];
            if (p[i] < 0) first = Math.max(first, t);
            else last = Math.min(last, t);
            if (first > last) return false;
        }
    }
    return true;
}
function selectInDrag(a, b) {
    const rect = { left: Math.min(a.x, b.x), right: Math.max(a.x, b.x),
        top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) };
    links.forEach(link => { link.selected = segmentIntersectsRect(link.start, link.end, rect); });
    selectionRect = rect;
    selectedDevices.clear();
    if (marqueeAdditive) marqueeBaseSelection.forEach(device => selectedDevices.add(device));
    for (const device of devices) {
        if (device.x <= rect.right && device.x + device.width >= rect.left &&
            device.y <= rect.bottom && device.y + device.height >= rect.top) {
            selectedDevices.add(device);
        }
    }
    selectedDevice = selectedDevices.size === 1 ? [...selectedDevices][0] : null;
    if (selectedDevices.size === 1) showDeviceInfo(selectedDevice);
    else if (selectedDevices.size > 1) showDeviceInfo(null);
    selectedLink = null;
    showLinkInfo(null);
    draw();
}
function referenceAt(point) {
    if (!backgroundImage || !calibration || referenceConfirmed) return null;
    const radius = referenceMarkerRadius() * 1.5;
    const a = Math.hypot(point.x - calibration.a.x, point.y - calibration.a.y);
    const b = Math.hypot(point.x - calibration.b.x, point.y - calibration.b.y);
    const nearest = a <= b ? 'a' : 'b';
    return Math.min(a, b) <= radius ? nearest : null;
}

canvas.addEventListener('pointerdown', event => {
    if (event.button === 2) return;
    const point = pointOnCanvas(event);
    hideContextMenu();
    const reference = referenceAt(point);
    if (reference) {
        draggingReference = reference;
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = 'grabbing';
        setStatus(`Drag point ${reference.toUpperCase()} to its reference on the plan.`);
        return;
    }
    if (pendingTemplate) {
        freezePlanSize();
        const device = new Device(pendingTemplate.name, pendingTemplate.types,
            backgroundImage ? point.x : Math.round(point.x / gridSize) * gridSize,
            backgroundImage ? point.y : Math.round(point.y / gridSize) * gridSize);
        devices.push(device);
        selectedDevices.clear();
        selectedDevices.add(device);
        selectedDevice = device;
        pendingTemplate = null;
        canvas.style.cursor = '';
        setStatus(`${device.name} placed. You can drag it or connect its ports.`);
        showDeviceInfo(device);
        updateHint();
        draw();
        return;
    }
    const rackBoundary = rackBoundaryAt(point);
    if (rackBoundary) {
        startRackDrag(rackBoundary, point);
        return;
    }
    const resizeHandle = selectedDevice && resizeHandleAt(selectedDevice, point);
    if (resizeHandle) {
        resizingDevice = {
            device: selectedDevice,
            handle: resizeHandle,
            pointer: point,
            start: { x: selectedDevice.x, y: selectedDevice.y,
                width: selectedDevice.width, height: selectedDevice.height }
        };
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = resizeCursor(resizeHandle);
        setStatus('Drag the handle to resize the equipment.');
        return;
    }
    for (const device of [...devices].reverse()) {
        const port = device.portAt(point);
        if (!port) continue;
        if (selectedPort) {
            connectPorts(selectedPort, port);
            selectedPort = null;
        } else {
            selectedPort = port;
            setStatus(`Source: ${port.type}. Select the destination connector.`);
        }
        selectedDevice = null;
        updateHint();
        draw();
        return;
    }
    const device = [...devices].reverse().find(item => item.contains(point));
    if (device) {
        hideContextMenu();
        if (event.ctrlKey || event.shiftKey) {
            if (selectedDevices.has(device)) selectedDevices.delete(device);
            else selectedDevices.add(device);
            selectedDevice = selectedDevices.size === 1 ? [...selectedDevices][0] : null;
            if (selectedDevices.size === 1) showDeviceInfo(selectedDevice);
            else showDeviceInfo(null);
            updateHint();
            draw();
            return;
        }
        const memberRack = rackGroups.find(group => group.devices.includes(device));
        if (memberRack) {
            selectedDevices.clear();
            selectedDevices.add(device);
        } else if (!selectedDevices.has(device)) {
            selectedDevices.clear();
            selectedDevices.add(device);
        }
        draggingDevice = device;
        draggingDevice.offsets = [...selectedDevices].map(member => ({ device: member,
            x: member.x, y: member.y }));
        draggingDevice.pointerStart = point;
        selectedDevice = selectedDevices.size === 1 ? device : null;
        selectedLink = null;
        selectedPort = null;
        links.forEach(item => { item.selected = false; });
        showDeviceInfo(device);
        updateHint();
        setStatus(`${device.name} selected. Drag it to move it or use the handles to resize it.`);
        canvas.style.cursor = 'grabbing';
        draw();
        return;
    }
    const rack = rackGroups.find(group => {
        const frame = rackFrame(group);
        return frame && point.x >= frame.left && point.x <= frame.right &&
            point.y >= frame.top && point.y <= frame.bottom;
    });
    if (rack) {
        startRackDrag(rack, point);
        return;
    }
    const link = [...links].reverse().find(item =>
        distanceToSegment(point, item.start, item.end) <= 5);
    if (link) {
        links.forEach(item => { item.selected = item === link; });
        selectedLink = link;
        selectedDevice = null;
        selectedPort = null;
        updateHint();
        showLinkInfo(link);
        setStatus('Cable selected. You can change its length or delete it.');
        draw();
        return;
    }
    selectedPort = null;
    selectedLink = null;
    selectedDevice = null;
    marqueeAdditive = event.ctrlKey || event.shiftKey;
    marqueeBaseSelection = new Set(selectedDevices);
    if (!marqueeAdditive) selectedDevices.clear();
    selectionRect = null;
    links.forEach(item => { item.selected = false; });
    showLinkInfo(null);
    dragStart = point;
    canvas.setPointerCapture?.(event.pointerId);
    updateHint();
    draw();
});
canvas.addEventListener('pointermove', event => {
    const point = pointOnCanvas(event);
    if (draggingReference) {
        calibration[draggingReference].x = Math.min(canvas.width, Math.max(0, point.x));
        calibration[draggingReference].y = Math.min(canvas.height, Math.max(0, point.y));
        updateCalibration();
        canvas.style.cursor = 'grabbing';
    } else if (resizingDevice) {
        resizeDevice(resizingDevice, point);
        updateSummary();
        canvas.style.cursor = resizeCursor(resizingDevice.handle);
        draw();
    } else if (draggingDevice) {
        const dx = point.x - draggingDevice.pointerStart.x;
        const dy = point.y - draggingDevice.pointerStart.y;
        draggingDevice.offsets.forEach(({ device, x, y }) => device.move(x + dx, y + dy));
        updateSummary();
        draw();
    } else if (dragStart && Math.hypot(point.x - dragStart.x,
        point.y - dragStart.y) > 3) selectInDrag(dragStart, point);
    else if (!dragStart && !pendingTemplate) {
        const rackBoundary = rackBoundaryAt(point);
        if (rackBoundary) {
            canvas.style.cursor = 'move';
            setStatus(`Drag the ${rackBoundary.name} border to move the whole rack.`);
            return;
        }
        const reference = referenceAt(point);
        if (reference) {
            canvas.style.cursor = 'grab';
            setStatus(`Drag point ${reference.toUpperCase()} to adjust the reference.`);
            return;
        }
        const resizeHandle = selectedDevice && resizeHandleAt(selectedDevice, point);
        if (resizeHandle) {
            canvas.style.cursor = resizeCursor(resizeHandle);
            setStatus('Drag this handle to resize the equipment.');
            return;
        }
        const device = [...devices].reverse().find(item => item.contains(point));
        const port = device?.portAt(point);
        const link = !device && links.some(item =>
            distanceToSegment(point, item.start, item.end) <= 5);
        canvas.style.cursor = port || link ? 'pointer' : device ? 'grab' : '';
        if (port) setStatus(`Connector ${port.type}. Click to select it.`);
        else if (link) setStatus('Click the cable to edit its length.');
    }
});
function finishPointer() {
    if (draggingReference) setStatus(`Point ${draggingReference.toUpperCase()} placed.`);
    if (resizingDevice) {
        showDeviceInfo(resizingDevice.device);
        setStatus(`${resizingDevice.device.name}: size updated.`);
    }
    if (draggingDevice) {
        const rack = selectedDevices.size === 1 && rackGroups.find(group =>
            group.devices.includes(draggingDevice));
        const wholeRack = selectedDevices.size > 1 && rackGroups.find(group =>
            group.devices.length === selectedDevices.size &&
            group.devices.every(device => selectedDevices.has(device)));
        if (wholeRack) {
            const left = Math.min(...wholeRack.devices.map(device => device.x));
            const top = Math.min(...wholeRack.devices.map(device => device.y));
            layoutRack(wholeRack, { x: left, y: top });
            showDeviceInfo(null);
            setStatus(`${wholeRack.name} moved.`);
        } else if (rack) {
            const left = Math.min(...rack.devices.map(device => device.x));
            const top = Math.min(...rack.devices.map(device => device.y));
            rack.devices.sort((a, b) => a.y - b.y || a.x - b.x);
            layoutRack(rack, { x: left, y: top });
            showDeviceInfo(draggingDevice);
            setStatus(`${draggingDevice.name} repositioned within ${rack.name}.`);
        } else {
            if (selectedDevices.size > 1) showDeviceInfo(null);
            else showDeviceInfo(draggingDevice);
            setStatus(selectedDevices.size > 1 ? `${selectedDevices.size} items moved.` : `${draggingDevice.name} moved.`);
        }
    }
    draggingDevice = null;
    resizingDevice = null;
    draggingReference = null;
    dragStart = null;
    selectionRect = null;
    if (selectedDevices.size === 1) selectedDevice = [...selectedDevices][0];
    if (selectedDevices.size > 1) selectedDevice = null;
    draw();
    updateHint();
    if (!pendingTemplate) canvas.style.cursor = '';
}
window.addEventListener('pointerup', finishPointer);
window.addEventListener('pointercancel', finishPointer);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { cancelAction(); hideContextMenu(); }
    const activeElement = document.activeElement;
    const editingText = activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');
    if (editingText) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        if (!selectedDevices.size) return;
        event.preventDefault();
        const items = [...selectedDevices];
        const minX = Math.min(...items.map(device => device.x));
        const minY = Math.min(...items.map(device => device.y));
        deviceClipboard = items.map(device => ({ name: device.name,
            types: device.ports.map(port => port.type), x: device.x - minX, y: device.y - minY,
            width: device.width, height: device.height, catalogProduct: device.catalogProduct || null }));
        pasteCount = 0;
        setStatus(`${deviceClipboard.length} item${deviceClipboard.length === 1 ? '' : 's'} copied.`);
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        if (!deviceClipboard.length) return;
        event.preventDefault();
        const offset = gridSize * (++pasteCount);
        selectedDevices.clear();
        for (const item of deviceClipboard) {
            const device = new Device(item.name, item.types, item.x + offset, item.y + offset);
            device.width = item.width;
            device.height = item.height;
            device.moveExact(item.x + offset, item.y + offset);
            if (item.catalogProduct) device.catalogProduct = item.catalogProduct;
            devices.push(device);
            selectedDevices.add(device);
        }
        selectedDevice = selectedDevices.size === 1 ? [...selectedDevices][0] : null;
        freezePlanSize();
        showDeviceInfo(selectedDevice);
        updateSummary();
        draw();
        setStatus(`${selectedDevices.size} item${selectedDevices.size === 1 ? '' : 's'} pasted.`);
    } else if (event.key === 'Delete' && !editingText) {
        if (selectedDevices.size) deleteSelectedDevices();
        else deleteSelectedLinks();
        event.preventDefault();
    }
});
document.getElementById('create-device').addEventListener('click', createTemplate);
canvas.addEventListener('contextmenu', openContextMenu);
canvas.addEventListener('dblclick', event => {
    const point = pointOnCanvas(event);
    for (const group of rackGroups) {
        const frame = rackFrame(group);
        if (!frame) continue;
        ctx.font = '12px Arial';
        const labelWidth = ctx.measureText(group.name).width;
        if (point.x >= frame.labelX && point.x <= frame.labelX + labelWidth + 8 &&
            point.y >= frame.labelY - 14 && point.y <= frame.labelY + 4) {
            event.preventDefault();
            beginRackRename(group, frame);
            return;
        }
    }
});
rackNameEditor.addEventListener('blur', () => finishRackRename(true));
rackNameEditor.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        finishRackRename(true);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finishRackRename(false);
    }
});
catalogSearchInput.addEventListener('input', renderCatalogSearch);
groupMenuButton.addEventListener('click', () => { groupSelectedDevices(); hideContextMenu(); });
ungroupMenuButton.addEventListener('click', () => { ungroupSelectedDevices(); hideContextMenu(); });
rackUpMenuButton.addEventListener('click', () => {
    moveRackMember([...selectedDevices][0], -1);
    hideContextMenu();
});
rackDownMenuButton.addEventListener('click', () => {
    moveRackMember([...selectedDevices][0], 1);
    hideContextMenu();
});
rackRemoveMenuButton.addEventListener('click', () => {
    removeDeviceFromRack([...selectedDevices][0]);
    hideContextMenu();
});
deleteMenuButton.addEventListener('click', () => { deleteSelectedDevices(); hideContextMenu(); });
document.addEventListener('pointerdown', event => {
    if (!contextMenu.hidden && !contextMenu.contains(event.target)) hideContextMenu();
});
projectForm.addEventListener('submit', startProject);
projectTitle.addEventListener('click', startProjectRename);
projectTitleInput.addEventListener('blur', () => finishProjectRename(true));
projectTitleInput.addEventListener('input', resizeProjectTitleInput);
projectTitleInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        finishProjectRename(true);
        projectTitle.focus();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finishProjectRename(false);
        projectTitle.focus();
    }
});
newProjectButton.addEventListener('click', newProject);
savePdfButton.addEventListener('click', saveProjectPdf);
importDesignButton.addEventListener('click', () => {
    fileMenu.open = false;
    designImportFile.click();
});
designImportFile.addEventListener('change', () => {
    const file = designImportFile.files?.[0];
    designImportFile.value = '';
    handleExcelImport(file);
});
cancelImportButton.addEventListener('click', () => importPreview.close());
confirmImportButton.addEventListener('click', importSelectedExcelRows);
importPreview.addEventListener('close', () => { pendingExcelImport = []; });
imageInput.addEventListener('change', () => loadPlanImage(imageInput.files?.[0]));
removePhotoButton.addEventListener('click', removePhoto);
resetScaleButton.addEventListener('click', resetScale);
distanceInput.addEventListener('input', updateCalibration);
confirmDistanceButton.addEventListener('click', confirmDistance);
cancelButton.addEventListener('click', cancelAction);
scaleInput.addEventListener('change', () => {
    if (backgroundImage) return;
    const value = Number(scaleInput.value);
    if (!Number.isFinite(value) || value <= 0) {
        scaleInput.value = cmPerPixel * gridSize / 100;
        setStatus('Scale must be greater than 0 m per grid square.');
        return;
    }
    cmPerPixel = value * 100 / gridSize;
    updateSummary();
    if (selectedLink) showLinkInfo(selectedLink);
    setStatus(`Scale updated: ${value} m per grid square.`);
});
if (typeof ResizeObserver !== 'undefined') {
    const canvasResizeObserver = new ResizeObserver(resizeCanvas);
    canvasResizeObserver.observe(canvasWrap);
    canvasResizeObserver.observe(canvas);
}
else window.addEventListener('resize', resizeCanvas);
resizeCanvas();
updateSummary();
updateHint();
updateControls();
