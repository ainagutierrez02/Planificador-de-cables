const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const deviceSelect = document.getElementById('device-select');
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
const imageInput = document.getElementById('plan-image');
const removePhotoButton = document.getElementById('remove-photo');
const planControls = document.getElementById('plan-controls');
const referenceSetup = document.getElementById('reference-setup');
const distanceInput = document.getElementById('reference-distance');
const confirmDistanceButton = document.getElementById('confirm-distance');
const planStatus = document.getElementById('plan-status');
const createDeviceButton = document.getElementById('create-device');
const addDeviceButton = document.getElementById('add-device');
const projectStart = document.getElementById('project-start');
const projectForm = document.getElementById('project-form');
const projectNameInput = document.getElementById('project-name');
const projectTitle = document.getElementById('project-title');
const projectTitleInput = document.getElementById('project-title-input');
const editorShell = document.getElementById('editor-shell');
const fileMenu = document.getElementById('file-menu');
const newProjectButton = document.getElementById('new-project');
const savePdfButton = document.getElementById('save-pdf');
const gridSize = 20;
let cmPerPixel = 100 / gridSize; // Sin imagen: 1 cuadrícula = 1 m.
let projectName = '';
const devices = [];
const templates = [];
const links = []; // 1 entrada por cable.
let selectedPort = null;
let selectedLink = null;
let selectedDevice = null;
let draggingDevice = null;
let resizingDevice = null;
let dragStart = null;
let pendingTemplate = null;
let backgroundImage = null;
let fixedPlanSize = false;
let calibration = null;
let referenceConfirmed = false;
let draggingReference = null;

function setStatus(message) { status.textContent = message; }
function updateControls() {
    const needsReference = backgroundImage && !referenceConfirmed;
    createDeviceButton.disabled = Boolean(needsReference);
    addDeviceButton.disabled = templates.length === 0 || Boolean(needsReference);
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
    setStatus(`Proyecto «${name}» listo. Crea un equipo o importa un plano.`);
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
        setStatus(`Proyecto renombrado a «${name}».`);
    } else if (save) {
        projectTitleInput.value = projectName;
        setStatus('El nombre del proyecto no puede estar vacío.');
    }
}
function newProject() {
    fileMenu.open = false;
    if ((devices.length || templates.length || links.length || backgroundImage) &&
        !window.confirm('Crear un proyecto nuevo borrará el plano actual sin guardarlo. ¿Continuar?')) return;
    projectName = '';
    projectTitle.textContent = 'Proyecto sin nombre';
    projectTitleInput.hidden = true;
    projectTitle.hidden = false;
    devices.length = 0;
    templates.length = 0;
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
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Crea un equipo primero';
    deviceSelect.replaceChildren(placeholder);
    deviceSelect.value = '';
    deviceSelect.disabled = true;
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
        const safeName = projectName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/[. ]+$/g, '').slice(0, 100) || 'proyecto';
        anchor.href = url;
        anchor.download = `${safeName}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus(`PDF de «${projectName}» descargado.`);
    } catch (error) {
        setStatus(`No se pudo crear el PDF: ${error.message}`);
    } finally {
        draw();
    }
}
function updateHint() {
    emptyState.hidden = devices.length > 0 || Boolean(backgroundImage);
    placementPrompt.hidden = !pendingTemplate;
    placementPrompt.textContent = 'Haz clic en el plano para colocar el equipo. Esc cancela.';
    cancelButton.hidden = !pendingTemplate && !selectedPort;
    hint.textContent = pendingTemplate ? `Haz clic en el plano para colocar ${pendingTemplate.name}.` :
        selectedPort ? 'Selecciona el conector de destino. Pulsa Esc para cancelar.' :
        backgroundImage && !referenceConfirmed ? calibration?.meters ?
            'Confirma la distancia para ocultar A y B.' :
            'Arrastra A y B y escribe su distancia real en metros.' :
        devices.length === 0 ? 'Crea un equipo para empezar.' :
        selectedDevice ? 'Arrastra los puntos para cambiar el tamaño. Pulsa Supr para borrar el equipo.' :
        'Arrastra equipos para moverlos. Haz clic en 2 conectores para crear un cable.';
}
function cancelAction() {
    pendingTemplate = null;
    selectedPort = null;
    draggingReference = null;
    resizingDevice = null;
    canvas.style.cursor = '';
    updateHint();
    setStatus('Acción cancelada.');
    draw();
}

const connectorMap = {
    'XLR M': ['#0000FF', 'X'], 'XLR F': ['#ADD8E6', 'X'],
    'Speakon NL2': ['#008080', 'S'], 'Speakon NL4': ['#008080', 'S'],
    'Speakon NL8': ['#008080', 'S'], '1/4 TRS': ['#7D64B0', 'T'],
    Ethercon: ['#FFA500', 'E'], Powercon: ['#B32D2D', 'P'],
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
        planStatus.textContent = 'Arrastra A y B y escribe una distancia mayor que 0 m.';
    } else if (pixels < 5) {
        calibration.meters = null;
        planStatus.textContent = 'Separa más los puntos A y B.';
    } else {
        calibration.meters = meters;
        cmPerPixel = meters * 100 / pixels;
        scaleInput.value = Number((cmPerPixel * gridSize / 100).toPrecision(6));
        planStatus.textContent = `${meters} m entre A y B. Puedes moverlos para afinar la escala.`;
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
    planStatus.textContent = 'Escala actualizada.';
    updateControls();
    updateHint();
    draw();
    setStatus('Escala actualizada. Ya puedes colocar equipos.');
}
function resetScale() {
    if (backgroundImage) {
        referenceConfirmed = false;
        calibration.meters = null;
        distanceInput.value = '';
        referenceSetup.hidden = false;
        planControls.hidden = false;
        planStatus.textContent = 'Ajusta A y B y escribe la nueva distancia en metros.';
        pendingTemplate = null;
        selectedPort = null;
        draggingReference = null;
        canvas.style.cursor = '';
        setStatus('Escala lista para ajustar. Los equipos se conservan.');
    } else {
        cmPerPixel = 100 / gridSize;
        scaleInput.value = '1';
        // En un plano sin foto, la cuadrícula debe ocupar todo el espacio disponible.
        if (!fixedPlanSize) resizeCanvas();
        updateSummary();
        if (selectedLink) showLinkInfo(selectedLink);
        if (selectedDevice) showDeviceInfo(selectedDevice);
        setStatus('Escala restablecida a 1 m por cuadro.');
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
    canvasWrap.classList.remove('fixed-plan');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    resizeCanvas();
    scaleInput.value = Number((cmPerPixel * gridSize / 100).toPrecision(6));
    if (selectedDevice) showDeviceInfo(selectedDevice);
    updateControls();
    updateHint();
    draw();
    setStatus('Foto quitada. Los equipos, cables y escala se conservan.');
}
function loadPlanImage(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        setStatus('Elige una imagen PNG, JPG o WebP.');
        return;
    }
    if (devices.length && !window.confirm('Cambiar el plano quitará los equipos y cables colocados. ¿Continuar?')) {
        imageInput.value = '';
        return;
    }
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        const ratio = Math.min(1000 / image.naturalWidth, 800 / image.naturalHeight);
        backgroundImage = image;
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        freezePlanSize();
        devices.length = 0;
        links.length = 0;
        selectedDevice = null;
        selectedLink = null;
        selectedPort = null;
        pendingTemplate = null;
        calibration = {
            a: { x: canvas.width * 0.25, y: canvas.height * 0.5 },
            b: { x: canvas.width * 0.75, y: canvas.height * 0.5 },
            meters: null
        };
        referenceConfirmed = false;
        draggingReference = null;
        resizingDevice = null;
        linkInfo.replaceChildren();
        planControls.hidden = false;
        referenceSetup.hidden = false;
        planStatus.textContent = 'Arrastra A y B hasta los puntos de referencia y escribe los metros.';
        distanceInput.value = '';
        updateControls();
        updateHint();
        updateSummary();
        draw();
        setStatus('Imagen cargada. Arrastra A y B y escribe la distancia en metros.');
    };
    image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        setStatus('No se pudo abrir la imagen. Elige otra.');
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
        this.minHeight = 26;
        this.width = Math.max(140, portSpan + 20, name.length * 8 + 12);
        this.height = 40;
        this.baseWidth = this.width;
        this.baseHeight = this.height;
        this.move(x, y);
    }
    positionPorts() {
        const span = this.ports.length * 20 + Math.max(0, this.ports.length - 1) * 15;
        const left = this.x + (this.width - span) / 2;
        this.ports.forEach((port, i) => {
            port.x = left + i * 35 + 10;
            port.y = this.y + this.height / 2;
        });
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
        return this.ports.find(port => Math.hypot(port.x - p.x, port.y - p.y) <= 10);
    }
    draw() {
        ctx.fillStyle = this === selectedDevice ? '#287e99' : '#008cba';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        const textScale = Math.sqrt((this.width / this.baseWidth) *
            (this.height / this.baseHeight));
        const fontSize = Math.max(9, Math.min(32, 14 * textScale));
        if (this.height >= fontSize + 4) {
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = '#f0f0f0';
            ctx.fillText(this.name, this.x + 5,
                this.y + Math.min(this.height - 3, fontSize + 3),
                Math.max(1, this.width - 10));
        }
        ctx.font = '14px Arial';
        this.ports.forEach(port => {
            const [color, letter] = connectorMap[port.type];
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(port.x, port.y, 10, 0, Math.PI * 2);
            ctx.fill();
            if (port === selectedPort) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.fillStyle = '#000';
            ctx.fillText(letter, port.x - 3, port.y + 4);
        });
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
    fixedPlanSize = true;
    canvasWrap.classList.add('fixed-plan');
    resizeCanvas();
}
function resizeCanvas() {
    if (fixedPlanSize) {
        const availableWidth = canvasWrap.clientWidth;
        const availableHeight = canvasWrap.clientHeight;
        if (availableWidth > 0 && availableHeight > 0) {
            const fit = Math.min(availableWidth / canvas.width,
                availableHeight / canvas.height);
            canvas.style.width = `${canvas.width * fit}px`;
            canvas.style.height = `${canvas.height * fit}px`;
        }
        draw();
        return;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    if (canvas.clientWidth > 0 && canvas.clientHeight > 0 &&
        (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        devices.forEach(device => device.moveExact(device.x, device.y));
        updateSummary();
    }
    draw();
}
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
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(35, 45, 55, 0.28)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
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
    devices.forEach(device => device.draw());
    if (showResizeHandles) drawResizeHandles();
    drawReferenceHandles();
}
function distanceToSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const size = dx * dx + dy * dy;
    if (size === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / size));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function cableLength(link) {
    return Math.hypot(link.end.x - link.start.x,
        link.end.y - link.start.y) * cmPerPixel;
}
function getCableGroups() {
    const groups = new Map();
    for (const link of links) {
        const [startType, endType] = [link.start.type, link.end.type].sort();
        const meters = Number((cableLength(link) / 100).toFixed(2));
        const key = `${startType}\0${endType}\0${meters.toFixed(2)}`;
        if (groups.has(key)) groups.get(key).count++;
        else groups.set(key, { count: 1, startType, endType, meters });
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
        `Equipo movido. La escala pasó a ${scaleInput.value} m por cuadro para que quepa.` :
        `Equipo de destino movido a ${(lengthCm / 100).toFixed(2)} m del otro conector.`);
    return true;
}
function updateSummary() {
    summaryList.replaceChildren();
    const groups = getCableGroups();
    const total = groups.reduce((sum, group) => sum + group.count * group.meters, 0);
    if (links.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = 'Todavía no hay cables. Conecta 2 puertos en el plano.';
        summaryList.appendChild(empty);
    }
    for (const group of groups) {
        const item = document.createElement('div');
        item.className = 'summary-row';
        const name = document.createElement('span');
        name.textContent = `${group.startType} a ${group.endType} · ${group.meters.toFixed(2)} m`;
        const quantity = document.createElement('strong');
        quantity.textContent = `${group.count} cable${group.count === 1 ? '' : 's'}`;
        item.append(name, quantity);
        summaryList.appendChild(item);
    }
    for (const [label, value] of [['Cables', String(links.length)],
        ['Longitud total', `${total.toFixed(2)} m`]]) {
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
    title.textContent = 'Cable seleccionado';
    const sourceDevice = devices.find(device => device.ports.includes(link.start));
    const targetDevice = devices.find(device => device.ports.includes(link.end));
    const ends = document.createElement('p');
    ends.textContent = `${sourceDevice?.name ?? 'Origen'} (${link.start.type}) a ` +
        `${targetDevice?.name ?? 'Destino'} (${link.end.type})`;
    const plane = document.createElement('p');
    plane.textContent = `Distancia según el plano: ${(Math.hypot(link.end.x - link.start.x,
        link.end.y - link.start.y) * cmPerPixel / 100).toFixed(2)} m`;
    const explanation = document.createElement('p');
    const otherCables = links.filter(item => item !== link && targetDevice &&
        (targetDevice.ports.includes(item.start) || targetDevice.ports.includes(item.end))).length;
    explanation.textContent = `Al cambiarla, se moverá ${targetDevice?.name ?? 'el equipo de destino'}.` +
        (otherCables ? ` También cambiarán ${otherCables} cable${otherCables === 1 ? '' : 's'} conectado${otherCables === 1 ? '' : 's'}.` : '');
    const label = document.createElement('label');
    label.htmlFor = 'real-length';
    label.textContent = 'Longitud deseada en m';
    const input = document.createElement('input');
    input.type = 'number'; input.id = 'real-length'; input.min = '0.01';
    input.step = 'any'; input.placeholder = 'Introduce la longitud';
    input.value = (cableLength(link) / 100).toFixed(2);
    const button = document.createElement('button');
    button.textContent = 'Mover equipo';
    button.addEventListener('click', () => {
        const raw = input.value.trim();
        const value = Number(raw);
        if (raw === '' || !Number.isFinite(value) || value <= 0) {
            setStatus('Introduce una longitud mayor que 0 m.');
            input.focus();
            return;
        }
        if (adjustCableLength(link, value * 100)) showLinkInfo(link);
        else setStatus(backgroundImage ?
            'La longitud no cabe en la imagen con la escala calibrada.' :
            'No hay espacio para mover el equipo en esa dirección.');
    });
    const remove = document.createElement('button');
    remove.className = 'danger-button';
    remove.textContent = 'Eliminar cable';
    remove.addEventListener('click', () => deleteSelectedLinks());
    const actions = document.createElement('div');
    actions.className = 'detail-actions';
    actions.append(button, remove);
    linkInfo.append(title, ends, plane, explanation, label, input, actions);
}
function showDeviceInfo(device) {
    linkInfo.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = device.name;
    const description = document.createElement('p');
    description.textContent = `${device.ports.length} conectores. Arrastra el equipo para moverlo o sus puntos para cambiar el tamaño. Pulsa Supr para borrarlo.`;
    const remove = document.createElement('button');
    remove.className = 'danger-button';
    remove.textContent = 'Eliminar equipo';
    remove.addEventListener('click', () => deleteDevice(device));
    linkInfo.append(title, description);
    linkInfo.appendChild(remove);
}
function connectPorts(start, end) {
    if (start === end) {
        setStatus('Elige 2 conectores distintos.');
        return;
    }
    const startDevice = devices.find(device => device.ports.includes(start));
    const endDevice = devices.find(device => device.ports.includes(end));
    if (startDevice && startDevice === endDevice) {
        setStatus('Elige conectores de 2 equipos distintos.');
        return;
    }
    if (links.some(link =>
        (link.start === start && link.end === end) ||
        (link.start === end && link.end === start))) {
        setStatus('Esos conectores ya están unidos.');
        return;
    }
    freezePlanSize();
    links.push({ start, end, selected: false });
    updateSummary();
    setStatus('Cable añadido. Haz clic en la línea para indicar su longitud real.');
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
    setStatus(`${count} cable${count === 1 ? '' : 's'} eliminado${count === 1 ? '' : 's'}.`);
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
    if (selectedDevice === device) selectedDevice = null;
    if (selectedLink && !links.includes(selectedLink)) selectedLink = null;
    selectedPort = null;
    draggingDevice = null;
    resizingDevice = null;
    linkInfo.replaceChildren();
    updateSummary();
    updateHint();
    draw();
    setStatus(`${device.name} eliminado${removedLinks ? ` con ${removedLinks} cable${removedLinks === 1 ? '' : 's'}` : ''}.`);
}
function createTemplate() {
    const name = deviceNameInput.value.trim();
    const count = Number(connectorCountInput.value);
    if (!name) { setStatus('Escribe el nombre del equipo.'); deviceNameInput.focus(); return; }
    if (!Number.isInteger(count) || count < 1 || count > 16) {
        setStatus('Indica una cantidad de 1 a 16 conectores.');
        connectorCountInput.focus();
        return;
    }
    const types = Array(count).fill(connectorTypeInput.value);
    for (const [type, entry] of extraConnectorInputs) {
        if (type === connectorTypeInput.value) continue;
        const extraCount = Number(entry.input.value);
        if (!Number.isInteger(extraCount) || extraCount < 0 || extraCount > 16) {
            setStatus(`Revisa la cantidad de conectores ${type}.`);
            extraConnectorsPanel.open = true;
            entry.input.focus();
            return;
        }
        types.push(...Array(extraCount).fill(type));
    }
    if (types.length > 16) {
        setStatus('Un equipo puede tener hasta 16 conectores en total.');
        extraConnectorsPanel.open = true;
        return;
    }
    templates.push({ name, types });
    const option = document.createElement('option');
    option.value = templates.length - 1;
    option.textContent = name;
    deviceSelect.appendChild(option);
    deviceSelect.disabled = false;
    deviceSelect.value = option.value;
    document.getElementById('add-device').disabled = false;
    deviceNameInput.value = '';
    connectorCountInput.value = '1';
    for (const entry of extraConnectorInputs.values()) entry.input.value = '0';
    extraConnectorsPanel.open = false;
    addDevice();
}
function addDevice() {
    if (backgroundImage && !referenceConfirmed) {
        setStatus('Confirma la distancia entre A y B antes de colocar equipos.');
        return;
    }
    pendingTemplate = templates[Number(deviceSelect.value)] || null;
    if (pendingTemplate) {
        canvas.style.cursor = 'crosshair';
        setStatus(`Haz clic en el plano para colocar ${pendingTemplate.name}.`);
        updateHint();
        canvas.scrollIntoView?.({ block: 'center' });
        canvas.focus?.({ preventScroll: true });
    }
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
    const point = pointOnCanvas(event);
    const reference = referenceAt(point);
    if (reference) {
        draggingReference = reference;
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = 'grabbing';
        setStatus(`Arrastra el punto ${reference.toUpperCase()} hasta la referencia del plano.`);
        return;
    }
    if (pendingTemplate) {
        freezePlanSize();
        const device = new Device(pendingTemplate.name, pendingTemplate.types,
            backgroundImage ? point.x : Math.round(point.x / gridSize) * gridSize,
            backgroundImage ? point.y : Math.round(point.y / gridSize) * gridSize);
        devices.push(device);
        pendingTemplate = null;
        canvas.style.cursor = '';
        setStatus(`${device.name} colocado. Puedes arrastrarlo o conectar sus puertos.`);
        updateHint();
        draw();
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
        setStatus('Arrastra el punto para cambiar el tamaño del equipo.');
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
            setStatus(`Origen: ${port.type}. Selecciona el conector de destino.`);
        }
        selectedDevice = null;
        updateHint();
        draw();
        return;
    }
    const device = [...devices].reverse().find(item => item.contains(point));
    if (device) {
        draggingDevice = device;
        device.offset = { x: point.x - device.x, y: point.y - device.y };
        selectedDevice = device;
        selectedLink = null;
        selectedPort = null;
        links.forEach(item => { item.selected = false; });
        showDeviceInfo(device);
        updateHint();
        setStatus(`${device.name} seleccionado. Arrástralo para moverlo o usa los puntos para cambiar el tamaño.`);
        canvas.style.cursor = 'grabbing';
        draw();
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
        setStatus('Cable seleccionado. Puedes cambiar su longitud o eliminarlo.');
        draw();
        return;
    }
    selectedPort = null;
    selectedLink = null;
    selectedDevice = null;
    links.forEach(item => { item.selected = false; });
    showLinkInfo(null);
    dragStart = point;
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
        draggingDevice.move(point.x - draggingDevice.offset.x,
            point.y - draggingDevice.offset.y);
        updateSummary();
        draw();
    } else if (dragStart && Math.hypot(point.x - dragStart.x,
        point.y - dragStart.y) > 3) selectInDrag(dragStart, point);
    else if (!dragStart && !pendingTemplate) {
        const reference = referenceAt(point);
        if (reference) {
            canvas.style.cursor = 'grab';
            setStatus(`Arrastra el punto ${reference.toUpperCase()} para ajustar la referencia.`);
            return;
        }
        const resizeHandle = selectedDevice && resizeHandleAt(selectedDevice, point);
        if (resizeHandle) {
            canvas.style.cursor = resizeCursor(resizeHandle);
            setStatus('Arrastra este punto para cambiar el tamaño del equipo.');
            return;
        }
        const device = [...devices].reverse().find(item => item.contains(point));
        const port = device?.portAt(point);
        const link = !device && links.some(item =>
            distanceToSegment(point, item.start, item.end) <= 5);
        canvas.style.cursor = port || link ? 'pointer' : device ? 'grab' : '';
        if (port) setStatus(`Conector ${port.type}. Haz clic para seleccionarlo.`);
        else if (link) setStatus('Haz clic en el cable para editar su longitud.');
    }
});
function finishPointer() {
    if (draggingReference) setStatus(`Punto ${draggingReference.toUpperCase()} colocado.`);
    if (resizingDevice) {
        showDeviceInfo(resizingDevice.device);
        setStatus(`${resizingDevice.device.name}: tamaño actualizado.`);
    }
    if (draggingDevice) {
        showDeviceInfo(draggingDevice);
        setStatus(`${draggingDevice.name} movido.`);
    }
    draggingDevice = null;
    resizingDevice = null;
    draggingReference = null;
    dragStart = null;
    if (!pendingTemplate) canvas.style.cursor = '';
}
window.addEventListener('pointerup', finishPointer);
window.addEventListener('pointercancel', finishPointer);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelAction();
    const activeElement = document.activeElement;
    const editingText = activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');
    if (event.key === 'Delete' && !editingText) {
        if (selectedDevice) deleteDevice(selectedDevice);
        else deleteSelectedLinks();
    }
});
document.getElementById('create-device').addEventListener('click', createTemplate);
document.getElementById('add-device').addEventListener('click', addDevice);
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
        setStatus('La escala debe ser mayor que 0 m por cuadro.');
        return;
    }
    cmPerPixel = value * 100 / gridSize;
    updateSummary();
    if (selectedLink) showLinkInfo(selectedLink);
    setStatus(`Escala actualizada: ${value} m por cuadro.`);
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
