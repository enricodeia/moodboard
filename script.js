// Unified Mood Board Creator JavaScript with Advanced Operations and Context Menu

// Register GSAP plugins
gsap.registerPlugin(Observer);

document.addEventListener('DOMContentLoaded', function() {
    // --------------------------
    // Canvas and Application Setup
    // --------------------------
    const canvasWidth = 3000;
    const canvasHeight = 2000;
    
    const canvas = new fabric.Canvas('mood-board-canvas', {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
        defaultCursor: 'default',
        hoverCursor: 'pointer'
    });

    // Application state variables
    let showGrid = false;
    let isDarkTheme = false;
    let selectedElement = null;
    let isPropertiesPanelVisible = false;
    let currentFontFamily = 'Arial';
    let currentFontSize = 24;
    let currentTextStyles = { bold: false, italic: false, underline: false };

    // Canvas navigation state
    let canvasScale = 1;
    let canvasOffsetX = 0;
    let canvasOffsetY = 0;
    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;
    let viewportCenter = { x: 0, y: 0 };
    let isToolsCollapsed = false;
    
    // Connection lines state
    let isConnectionMode = false;
    let connectionStartObject = null;
    let connectionLineType = 'solid';
    let connections = [];
    
    // Minimap state
    let isMinimapVisible = false;
    
    // DOM Elements
    const appContainer = document.querySelector('.app-container');
    const canvasContainer = document.querySelector('.canvas-container');
    const infiniteCanvasWrapper = document.getElementById('infinite-canvas-wrapper');
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    const propertiesPanel = document.getElementById('properties-panel');
    const exportModal = document.getElementById('export-modal');
    const shapeModal = document.getElementById('shape-modal');
    const overlay = document.getElementById('overlay');
    const colorInput = document.getElementById('color-input');
    const fontFamilySelect = document.getElementById('font-family');
    const opacityControl = document.getElementById('opacity-control');
    const opacityValue = document.getElementById('opacity-value');
    const borderToggle = document.getElementById('border-toggle');
    const borderColor = document.getElementById('border-color');
    const borderWidth = document.getElementById('border-width');
    const exportPreviewImg = document.getElementById('export-preview-img');
    const colorSwatches = document.getElementById('color-swatches');
    const zoomLevel = document.getElementById('zoom-level');
    const toolsContainer = document.querySelector('.tools-container');
    const connectionTools = document.getElementById('connection-tools');
    const minimap = document.getElementById('minimap');
    const minimapViewport = document.getElementById('minimap-viewport');

    // Initialize the application
    initApp();
    
    function initApp() {
        updateCanvasViewport();
        centerCanvas();
        setupEventListeners();
        setupInfiniteCanvas();
        
        // Apply saved theme preference if available
        const savedTheme = localStorage.getItem('moodBoardTheme');
        if (savedTheme === 'dark') {
            toggleTheme();
        }
    }
    
    function setupEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        
        // Tools toggle
        document.getElementById('toggle-tools-btn').addEventListener('click', toggleTools);
        
        // Canvas controls
        document.getElementById('zoom-in-btn').addEventListener('click', zoomIn);
        document.getElementById('zoom-out-btn').addEventListener('click', zoomOut);
        document.getElementById('reset-view-btn').addEventListener('click', resetView);
        
        // Minimap toggle
        document.getElementById('toggle-minimap-btn').addEventListener('click', toggleMinimap);
        
        // Toolbar buttons
        document.getElementById('add-image-btn').addEventListener('click', function() {
            document.getElementById('image-upload').click();
        });
        document.getElementById('add-text-btn').addEventListener('click', addText);
        document.getElementById('add-color-btn').addEventListener('click', addColorRectangle);
        document.getElementById('add-shape-btn').addEventListener('click', showShapeModal);
        document.getElementById('toggle-grid-btn').addEventListener('click', toggleGrid);
        document.getElementById('clear-canvas-btn').addEventListener('click', clearCanvas);
        document.getElementById('save-btn').addEventListener('click', saveCanvas);
        document.getElementById('export-btn').addEventListener('click', showExportModal);
        
        // Connection tool
        document.getElementById('create-connection-btn').addEventListener('click', toggleConnectionMode);
        document.querySelectorAll('.connection-type-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setConnectionType(this.getAttribute('data-type'));
            });
        });
        
        // Shape modal options
        document.querySelectorAll('.shape-option').forEach(option => {
            option.addEventListener('click', function() {
                const shapeType = this.getAttribute('data-shape');
                addShape(shapeType);
                hideModal(shapeModal);
            });
        });
        
        // Color swatch management
        colorInput.addEventListener('input', function() {
            if (selectedElement && selectedElement.type !== 'text' && selectedElement.type !== 'i-text') {
                setElementFill(this.value);
            }
        });
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.addEventListener('click', function() {
                const color = this.style.backgroundColor;
                if (selectedElement && selectedElement.type !== 'text' && selectedElement.type !== 'i-text') {
                    setElementFill(color);
                } else {
                    colorInput.value = rgbToHex(color);
                }
            });
        });
        
        // Font style buttons
        document.getElementById('bold-btn').addEventListener('click', function() {
            toggleTextStyle('bold', this);
        });
        document.getElementById('italic-btn').addEventListener('click', function() {
            toggleTextStyle('italic', this);
        });
        document.getElementById('underline-btn').addEventListener('click', function() {
            toggleTextStyle('underline', this);
        });
        
        // Font controls
        fontFamilySelect.addEventListener('change', function() {
            currentFontFamily = this.value;
            if (selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'i-text')) {
                selectedElement.set('fontFamily', currentFontFamily);
                canvas.renderAll();
            }
        });
        
        // Properties panel controls
        opacityControl.addEventListener('input', function() {
            if (selectedElement) {
                const opacity = this.value / 100;
                selectedElement.set('opacity', opacity);
                opacityValue.textContent = this.value + '%';
                canvas.renderAll();
                updateConnections();
            }
        });
        borderToggle.addEventListener('change', function() {
            if (selectedElement) {
                if (this.checked) {
                    selectedElement.set({
                        stroke: borderColor.value,
                        strokeWidth: parseInt(borderWidth.value)
                    });
                } else {
                    selectedElement.set({
                        stroke: null,
                        strokeWidth: 0
                    });
                }
                canvas.renderAll();
            }
        });
        borderColor.addEventListener('input', function() {
            if (selectedElement && borderToggle.checked) {
                selectedElement.set('stroke', this.value);
                canvas.renderAll();
            }
        });
        borderWidth.addEventListener('change', function() {
            if (selectedElement && borderToggle.checked) {
                selectedElement.set('strokeWidth', parseInt(this.value));
                canvas.renderAll();
            }
        });
        
        // Element manipulation buttons
        document.getElementById('bring-forward-btn').addEventListener('click', function() {
            if (selectedElement) {
                canvas.bringForward(selectedElement);
                updateConnections();
            }
        });
        document.getElementById('send-backward-btn').addEventListener('click', function() {
            if (selectedElement) {
                canvas.sendBackwards(selectedElement);
                updateConnections();
            }
        });
        document.getElementById('delete-element-btn').addEventListener('click', function() {
            if (selectedElement) {
                removeConnectionsForObject(selectedElement);
                canvas.remove(selectedElement);
                hidePropertiesPanel();
                updateMinimap();
            }
        });
        
        // Close properties panel
        document.getElementById('close-properties').addEventListener('click', hidePropertiesPanel);
        
        // Export modal controls
        document.querySelectorAll('input[name="export-type"]').forEach(input => {
            input.addEventListener('change', updateExportPreview);
        });
        document.getElementById('export-resolution').addEventListener('change', updateExportPreview);
        document.getElementById('export-area').addEventListener('change', updateExportPreview);
        document.getElementById('cancel-export').addEventListener('click', function() {
            hideModal(exportModal);
        });
        document.getElementById('confirm-export').addEventListener('click', exportMoodBoard);
        
        // Close all modals when clicking the overlay
        overlay.addEventListener('click', function() {
            hideModal(exportModal);
            hideModal(shapeModal);
        });
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                const modal = this.closest('.modal');
                hideModal(modal);
            });
        });
        
        // Handle image uploads
        document.getElementById('image-upload').addEventListener('change', function(e) {
            if (this.files.length > 0) {
                Array.from(this.files).forEach(file => {
                    uploadImage(file);
                });
                this.value = '';
            }
        });
        
        // Canvas event listeners
        canvas.on('selection:created', handleObjectSelected);
        canvas.on('selection:updated', handleObjectSelected);
        canvas.on('selection:cleared', handleSelectionCleared);
        canvas.on('object:moving', updateConnections);
        canvas.on('object:scaling', updateConnections);
        canvas.on('object:rotating', updateConnections);
        canvas.on('object:modified', updateMinimap);
        canvas.on('object:added', updateMinimap);
        canvas.on('object:removed', updateMinimap);
        
        // Mouse events for connection mode
        canvas.on('mouse:down', function(e) {
            if (isConnectionMode && e.target) {
                if (!connectionStartObject) {
                    connectionStartObject = e.target;
                    connectionStartObject.set({
                        stroke: '#4a90e2',
                        strokeWidth: 2
                    });
                    canvas.renderAll();
                } else if (e.target !== connectionStartObject) {
                    createConnection(connectionStartObject, e.target, connectionLineType);
                    connectionStartObject.set({
                        stroke: connectionStartObject._originalStroke || null,
                        strokeWidth: connectionStartObject._originalStrokeWidth || 0
                    });
                    connectionStartObject = null;
                    canvas.renderAll();
                    updateMinimap();
                }
            }
        });
        
        // Window resize listener
        window.addEventListener('resize', function() {
            updateCanvasViewport();
            updateMinimap();
        });
    }
    
    function setupInfiniteCanvas() {
        Observer.create({
            target: infiniteCanvasWrapper,
            type: "wheel,touch,pointer",
            wheelSpeed: -1,
            onWheel: (self) => {
                if (self.deltaY !== 0) {
                    if (self.event.ctrlKey || self.event.metaKey) {
                        self.event.preventDefault();
                        const rect = infiniteCanvasWrapper.getBoundingClientRect();
                        const mouseX = self.event.clientX - rect.left;
                        const mouseY = self.event.clientY - rect.top;
                        if (self.deltaY < 0) {
                            zoomAtPoint(1.1, mouseX, mouseY);
                        } else {
                            zoomAtPoint(0.9, mouseX, mouseY);
                        }
                    } else {
                        panCanvas(0, self.deltaY * 2);
                    }
                }
                if (self.deltaX !== 0 && !self.event.ctrlKey && !self.event.metaKey) {
                    panCanvas(self.deltaX * 2, 0);
                }
            },
            onDragStart: (self) => {
                if (!canvas.getActiveObject() && !isConnectionMode) {
                    isDragging = true;
                    infiniteCanvasWrapper.style.cursor = 'grabbing';
                    lastPosX = self.x;
                    lastPosY = self.y;
                    infiniteCanvasWrapper.classList.add('grabbing');
                }
            },
            onDrag: (self) => {
                if (isDragging) {
                    const dx = self.x - lastPosX;
                    const dy = self.y - lastPosY;
                    panCanvas(-dx, -dy);
                    lastPosX = self.x;
                    lastPosY = self.y;
                }
            },
            onDragEnd: () => {
                isDragging = false;
                infiniteCanvasWrapper.style.cursor = 'grab';
                infiniteCanvasWrapper.classList.remove('grabbing');
            }
        });
    }
    
    // --------------------------
    // Core Functionalities
    // --------------------------
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
            document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
            canvas.setBackgroundColor('#1e1e1e', canvas.renderAll.bind(canvas));
        } else {
            document.body.classList.remove('dark-theme');
            document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i>';
            canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
        }
        localStorage.setItem('moodBoardTheme', isDarkTheme ? 'dark' : 'light');
        updateMinimap();
    }
    
    function toggleTools() {
        isToolsCollapsed = !isToolsCollapsed;
        if (isToolsCollapsed) {
            toolsContainer.classList.add('tools-collapsed');
        } else {
            toolsContainer.classList.remove('tools-collapsed');
        }
        const toggleBtn = document.getElementById('toggle-tools-btn');
        toggleBtn.innerHTML = isToolsCollapsed ? '<i class="fas fa-chevron-right"></i>' : '<i class="fas fa-chevron-left"></i>';
    }
    
    function toggleMinimap() {
        isMinimapVisible = !isMinimapVisible;
        minimap.style.display = isMinimapVisible ? 'block' : 'none';
        if (isMinimapVisible) updateMinimap();
    }
    
    function updateMinimap() {
        if (!isMinimapVisible) return;
        while (minimap.firstChild) {
            if (minimap.firstChild !== minimapViewport) {
                minimap.removeChild(minimap.firstChild);
            }
        }
        const minimapWidth = minimap.offsetWidth;
        const minimapHeight = minimap.offsetHeight;
        const canvasRatio = canvasWidth / canvasHeight;
        const minimapRatio = minimapWidth / minimapHeight;
        let minimapScale = canvasRatio > minimapRatio ? minimapWidth / canvasWidth : minimapHeight / canvasHeight;
        canvas.forEachObject(function(obj) {
            if (!obj.excludeFromExport) {
                const minimapObj = document.createElement('div');
                minimapObj.style.position = 'absolute';
                minimapObj.style.left = (obj.left * minimapScale) + 'px';
                minimapObj.style.top = (obj.top * minimapScale) + 'px';
                minimapObj.style.width = (obj.width * obj.scaleX * minimapScale) + 'px';
                minimapObj.style.height = (obj.height * obj.scaleY * minimapScale) + 'px';
                minimapObj.style.backgroundColor = obj.fill || 'rgba(0,0,0,0.3)';
                minimapObj.style.transform = `rotate(${obj.angle}deg)`;
                minimapObj.style.opacity = obj.opacity;
                if (obj.type === 'image') {
                    minimapObj.style.backgroundColor = 'transparent';
                    minimapObj.style.border = '1px solid rgba(0,0,0,0.3)';
                }
                minimap.appendChild(minimapObj);
            }
        });
        const containerRect = canvasContainer.getBoundingClientRect();
        const viewportWidth = containerRect.width / canvasScale;
        const viewportHeight = containerRect.height / canvasScale;
        const visibleLeft = (-canvasOffsetX / canvasScale);
        const visibleTop = (-canvasOffsetY / canvasScale);
        minimapViewport.style.width = (viewportWidth * minimapScale) + 'px';
        minimapViewport.style.height = (viewportHeight * minimapScale) + 'px';
        minimapViewport.style.left = (visibleLeft * minimapScale) + 'px';
        minimapViewport.style.top = (visibleTop * minimapScale) + 'px';
    }
    
    function toggleConnectionMode() {
        isConnectionMode = !isConnectionMode;
        const connectionBtn = document.getElementById('create-connection-btn');
        if (isConnectionMode) {
            connectionBtn.classList.add('active');
            connectionTools.style.display = 'block';
            canvas.defaultCursor = 'crosshair';
            canvas.hoverCursor = 'crosshair';
            document.querySelector('.connection-types').style.display = 'flex';
        } else {
            connectionBtn.classList.remove('active');
            document.querySelector('.connection-types').style.display = 'none';
            canvas.defaultCursor = 'default';
            canvas.hoverCursor = 'pointer';
            if (connectionStartObject) {
                connectionStartObject.set({
                    stroke: connectionStartObject._originalStroke || null,
                    strokeWidth: connectionStartObject._originalStrokeWidth || 0
                });
                connectionStartObject = null;
                canvas.renderAll();
            }
        }
    }
    
    function setConnectionType(type) {
        connectionLineType = type;
        document.querySelectorAll('.connection-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-type') === type);
        });
    }
    
    function createConnection(obj1, obj2, type) {
        if (!obj1._originalStroke) obj1._originalStroke = obj1.stroke;
        if (!obj1._originalStrokeWidth) obj1._originalStrokeWidth = obj1.strokeWidth;
        if (!obj2._originalStroke) obj2._originalStroke = obj2.stroke;
        if (!obj2._originalStrokeWidth) obj2._originalStrokeWidth = obj2.strokeWidth;
        
        const line = createConnectionLine(obj1, obj2, type);
        canvas.add(line);
        connections.push({ line: line, from: obj1, to: obj2, type: type });
        canvas.sendToBack(line);
        line.isConnection = true;
    }
    
    function createConnectionLine(obj1, obj2, type) {
        const point1 = obj1.getCenterPoint();
        const point2 = obj2.getCenterPoint();
        let lineOptions = {
            x1: point1.x, y1: point1.y,
            x2: point2.x, y2: point2.y,
            stroke: '#666',
            selectable: false,
            evented: false,
            excludeFromExport: false,
            originX: 'center',
            originY: 'center',
            objectID1: obj1.objectID || Date.now(),
            objectID2: obj2.objectID || Date.now() + 1,
            className: 'connection-line'
        };
        if (!obj1.objectID) obj1.objectID = lineOptions.objectID1;
        if (!obj2.objectID) obj2.objectID = lineOptions.objectID2;
        let line;
        switch (type) {
            case 'dashed':
                lineOptions.strokeDashArray = [5, 5];
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
                break;
            case 'dotted':
                lineOptions.strokeDashArray = [2, 2];
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
                break;
            case 'arrow':
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
                const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
                const arrowhead = new fabric.Triangle({
                    left: point2.x,
                    top: point2.y,
                    width: 15,
                    height: 15,
                    fill: '#666',
                    stroke: '#666',
                    angle: angle + 90,
                    selectable: false,
                    evented: false,
                    originX: 'center',
                    originY: 'center',
                    excludeFromExport: false,
                    isArrowhead: true
                });
                canvas.add(arrowhead);
                line.arrowhead = arrowhead;
                break;
            default:
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
        }
        return line;
    }
    
    function updateConnections() {
        connections.forEach(connection => {
            const fromObj = connection.from;
            const toObj = connection.to;
            const line = connection.line;
            if (fromObj && toObj && fromObj.canvas && toObj.canvas) {
                const point1 = fromObj.getCenterPoint();
                const point2 = toObj.getCenterPoint();
                line.set({ x1: point1.x, y1: point1.y, x2: point2.x, y2: point2.y });
                if (connection.type === 'arrow' && line.arrowhead) {
                    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
                    line.arrowhead.set({ left: point2.x, top: point2.y, angle: angle + 90 });
                }
            }
        });
        canvas.renderAll();
    }
    
    function removeConnectionsForObject(obj) {
        const connectionsToRemove = connections.filter(conn => conn.from === obj || conn.to === obj);
        connectionsToRemove.forEach(conn => {
            canvas.remove(conn.line);
            if (conn.type === 'arrow' && conn.line.arrowhead) {
                canvas.remove(conn.line.arrowhead);
            }
            const index = connections.indexOf(conn);
            if (index > -1) connections.splice(index, 1);
        });
    }
    
    function addText() {
        const text = new fabric.IText('Double-click to edit', {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            fontFamily: currentFontFamily,
            fontSize: currentFontSize,
            fill: colorInput.value,
            originX: 'center',
            originY: 'center',
            centeredRotation: true
        });
        if (currentTextStyles.bold) text.set('fontWeight', 'bold');
        if (currentTextStyles.italic) text.set('fontStyle', 'italic');
        if (currentTextStyles.underline) text.set('underline', true);
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        updateMinimap();
    }
    
    function addColorRectangle() {
        const rect = new fabric.Rect({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            width: 100,
            height: 100,
            fill: colorInput.value,
            originX: 'center',
            originY: 'center',
            centeredRotation: true
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.renderAll();
        updateMinimap();
    }
    
    function addShape(shapeType) {
        let shape;
        switch(shapeType) {
            case 'rect':
                shape = new fabric.Rect({
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    width: 100,
                    height: 100,
                    fill: colorInput.value
                });
                break;
            case 'circle':
                shape = new fabric.Circle({
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    radius: 50,
                    fill: colorInput.value
                });
                break;
            case 'triangle':
                shape = new fabric.Triangle({
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    width: 100,
                    height: 100,
                    fill: colorInput.value
                });
                break;
            case 'polygon':
                const points = [
                    { x: 0, y: -50 },
                    { x: 47, y: -15 },
                    { x: 29, y: 40 },
                    { x: -29, y: 40 },
                    { x: -47, y: -15 }
                ];
                shape = new fabric.Polygon(points, {
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    fill: colorInput.value
                });
                break;
            case 'star':
                const starPoints = [
                    { x: 0, y: -50 },
                    { x: 14, y: -20 },
                    { x: 47, y: -15 },
                    { x: 23, y: 7 },
                    { x: 29, y: 40 },
                    { x: 0, y: 25 },
                    { x: -29, y: 40 },
                    { x: -23, y: 7 },
                    { x: -47, y: -15 },
                    { x: -14, y: -20 }
                ];
                shape = new fabric.Polygon(starPoints, {
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    fill: colorInput.value
                });
                break;
            case 'heart':
                const heartPath = 'M 0 -28 C -14 -28 -25 -19 -25 -9 C -25 10 0 28 0 28 C 0 28 25 10 25 -9 C 25 -19 14 -28 0 -28 z';
                shape = new fabric.Path(heartPath, {
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    fill: colorInput.value,
                    scaleX: 1.5,
                    scaleY: 1.5
                });
                break;
        }
        if (shape) {
            shape.set({ originX: 'center', originY: 'center', centeredRotation: true });
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            updateMinimap();
        }
    }
    
    function toggleGrid() {
        showGrid = !showGrid;
        const canvasEl = canvasWrapper;
        if (showGrid) {
            canvasEl.classList.add('canvas-grid');
        } else {
            canvasEl.classList.remove('canvas-grid');
        }
    }
    
    function clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            canvas.clear();
            connections = [];
            canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', canvas.renderAll.bind(canvas));
            updateMinimap();
        }
    }
    
    function saveCanvas() {
        try {
            const canvasJSON = JSON.stringify(canvas.toJSON(['objectID', 'isConnection', 'excludeFromExport']));
            localStorage.setItem('infiniteMoodBoard', canvasJSON);
            const connectionsData = connections.map(conn => ({
                fromID: conn.from.objectID,
                toID: conn.to.objectID,
                type: conn.type
            }));
            localStorage.setItem('infiniteMoodBoardConnections', JSON.stringify(connectionsData));
            showToast('Board saved successfully!');
        } catch (error) {
            console.error('Error saving canvas:', error);
            alert('Could not save your mood board. It might be too large for local storage.');
        }
    }
    
    function loadSavedCanvas() {
        const savedCanvas = localStorage.getItem('infiniteMoodBoard');
        const savedConnections = localStorage.getItem('infiniteMoodBoardConnections');
        if (savedCanvas) {
            try {
                canvas.loadFromJSON(savedCanvas, function() {
                    canvas.renderAll();
                    if (savedConnections) {
                        const connectionsData = JSON.parse(savedConnections);
                        restoreConnections(connectionsData);
                    }
                    updateMinimap();
                });
            } catch (error) {
                console.error('Error loading saved canvas:', error);
            }
        }
    }
    
    function restoreConnections(connectionsData) {
        connections = [];
        const objectMap = {};
        canvas.forEachObject(function(obj) {
            if (obj.objectID) objectMap[obj.objectID] = obj;
        });
        connectionsData.forEach(conn => {
            const fromObj = objectMap[conn.fromID];
            const toObj = objectMap[conn.toID];
            if (fromObj && toObj) {
                createConnection(fromObj, toObj, conn.type);
            }
        });
        canvas.renderAll();
    }
    
    function handleObjectSelected(e) {
        selectedElement = canvas.getActiveObject();
        if (selectedElement && selectedElement.isConnection) {
            canvas.discardActiveObject();
            return;
        }
        if (isConnectionMode) {
            if (connectionStartObject && selectedElement !== connectionStartObject) {
                createConnection(connectionStartObject, selectedElement, connectionLineType);
                connectionStartObject.set({
                    stroke: connectionStartObject._originalStroke || null,
                    strokeWidth: connectionStartObject._originalStrokeWidth || 0
                });
                connectionStartObject = null;
                canvas.renderAll();
                return;
            }
        }
        showPropertiesPanel();
        updatePropertiesPanel();
        if (selectedElement && selectedElement.type === 'activeSelection' && selectedElement.getObjects().length > 1) {
            connectionTools.style.display = 'block';
        } else {
            connectionTools.style.display = 'none';
        }
    }
    
    function handleSelectionCleared() {
        selectedElement = null;
        hidePropertiesPanel();
        connectionTools.style.display = 'none';
    }
    
    function showPropertiesPanel() {
        if (selectedElement) {
            const zoom = canvas.getZoom();
            const boundingRect = selectedElement.getBoundingRect();
            const viewportPoint = fabric.util.transformPoint(
                new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top),
                canvas.viewportTransform
            );
            const containerRect = canvasContainer.getBoundingClientRect();
            let leftPos = viewportPoint.x + 20;
            let topPos = viewportPoint.y;
            if (leftPos + 240 > containerRect.width) {
                leftPos = viewportPoint.x - 260;
            }
            if (topPos + 300 > containerRect.height) {
                topPos = containerRect.height - 320;
            }
            propertiesPanel.style.left = Math.max(10, leftPos) + 'px';
            propertiesPanel.style.top = Math.max(10, topPos) + 'px';
        }
        propertiesPanel.style.display = 'block';
        propertiesPanel.classList.add('scale-in');
        isPropertiesPanelVisible = true;
    }
    
    function hidePropertiesPanel() {
        propertiesPanel.classList.remove('scale-in');
        propertiesPanel.classList.add('scale-out');
        setTimeout(() => {
            propertiesPanel.style.display = 'none';
            propertiesPanel.classList.remove('scale-out');
        }, 300);
        isPropertiesPanelVisible = false;
    }
    
    function updatePropertiesPanel() {
        if (!selectedElement) return;
        opacityControl.value = selectedElement.opacity * 100;
        opacityValue.textContent = Math.round(selectedElement.opacity * 100) + '%';
        borderToggle.checked = selectedElement.stroke !== null;
        if (selectedElement.stroke) {
            borderColor.value = rgbToHex(selectedElement.stroke);
        }
        borderWidth.value = selectedElement.strokeWidth || 1;
        const specificControls = document.getElementById('element-specific-controls');
        specificControls.innerHTML = '';
        if (selectedElement.type === 'text' || selectedElement.type === 'i-text') {
            const textControls = document.createElement('div');
            textControls.className = 'text-controls';
            textControls.innerHTML = `
                <h4>Text Controls</h4>
                <div class="color-controls">
                    <label>Color:</label>
                    <input type="color" id="text-color" value="${rgbToHex(selectedElement.fill)}">
                </div>
                <div class="font-size-control">
                    <label>Size:</label>
                    <input type="range" id="font-size-range" min="10" max="72" value="${selectedElement.fontSize}">
                    <span id="font-size-value">${selectedElement.fontSize}px</span>
                </div>
            `;
            specificControls.appendChild(textControls);
            fontFamilySelect.value = selectedElement.fontFamily;
            const boldBtn = document.getElementById('bold-btn');
            const italicBtn = document.getElementById('italic-btn');
            const underlineBtn = document.getElementById('underline-btn');
            boldBtn.classList.toggle('active', selectedElement.fontWeight === 'bold');
            italicBtn.classList.toggle('active', selectedElement.fontStyle === 'italic');
            underlineBtn.classList.toggle('active', selectedElement.underline);
            document.getElementById('text-color').addEventListener('input', function() {
                selectedElement.set('fill', this.value);
                canvas.renderAll();
            });
            document.getElementById('font-size-range').addEventListener('input', function() {
                const fontSize = parseInt(this.value);
                document.getElementById('font-size-value').textContent = fontSize + 'px';
                selectedElement.set('fontSize', fontSize);
                canvas.renderAll();
            });
        } else {
            const shapeControls = document.createElement('div');
            shapeControls.className = 'shape-controls';
            shapeControls.innerHTML = `
                <h4>${selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Controls</h4>
                <div class="color-controls">
                    <label>Fill:</label>
                    <input type="color" id="shape-fill" value="${rgbToHex(selectedElement.fill || '#ffffff')}">
                </div>
                <div class="shape-scale-controls">
                    <label>Size:</label>
                    <button id="scale-up-btn" class="btn small-btn"><i class="fas fa-search-plus"></i></button>
                    <button id="scale-down-btn" class="btn small-btn"><i class="fas fa-search-minus"></i></button>
                </div>
            `;
            specificControls.appendChild(shapeControls);
            document.getElementById('shape-fill').addEventListener('input', function() {
                setElementFill(this.value);
            });
            document.getElementById('scale-up-btn').addEventListener('click', function() {
                selectedElement.scale(selectedElement.scaleX * 1.1, selectedElement.scaleY * 1.1);
                canvas.renderAll();
                updateConnections();
            });
            document.getElementById('scale-down-btn').addEventListener('click', function() {
                selectedElement.scale(selectedElement.scaleX * 0.9, selectedElement.scaleY * 0.9);
                canvas.renderAll();
                updateConnections();
            });
        }
    }
    
    function setElementFill(color) {
        if (selectedElement) {
            selectedElement.set('fill', color);
            canvas.renderAll();
            const shapeFill = document.getElementById('shape-fill');
            if (shapeFill) shapeFill.value = rgbToHex(color);
        }
    }
    
    function toggleTextStyle(style, button) {
        if (!button.classList.contains('active')) {
            button.classList.add('active');
            currentTextStyles[style] = true;
        } else {
            button.classList.remove('active');
            currentTextStyles[style] = false;
        }
        if (selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'i-text')) {
            switch(style) {
                case 'bold':
                    selectedElement.set('fontWeight', currentTextStyles.bold ? 'bold' : 'normal');
                    break;
                case 'italic':
                    selectedElement.set('fontStyle', currentTextStyles.italic ? 'italic' : 'normal');
                    break;
                case 'underline':
                    selectedElement.set('underline', currentTextStyles.underline);
                    break;
            }
            canvas.renderAll();
        }
    }
    
    function uploadImage(file) {
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgObj = new Image();
            imgObj.src = e.target.result;
            imgObj.onload = function() {
                const image = new fabric.Image(imgObj);
                const maxDimension = 300;
                if (image.width > maxDimension || image.height > maxDimension) {
                    if (image.width > image.height) {
                        image.scaleToWidth(maxDimension);
                    } else {
                        image.scaleToHeight(maxDimension);
                    }
                }
                image.set({
                    left: canvasWidth / 2,
                    top: canvasHeight / 2,
                    originX: 'center',
                    originY: 'center',
                    centeredRotation: true
                });
                canvas.add(image);
                canvas.setActiveObject(image);
                canvas.renderAll();
                updateMinimap();
            };
        };
        reader.readAsDataURL(file);
    }
    
    function showExportModal() {
        updateExportPreview();
        exportModal.style.display = 'block';
        overlay.style.display = 'block';
    }
    
    function showShapeModal() {
        shapeModal.style.display = 'block';
        overlay.style.display = 'block';
    }
    
    function hideModal(modal) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }
    
    function updateExportPreview() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const resolution = document.getElementById('export-resolution').value;
        const exportArea = document.getElementById('export-area').value;
        let exportOptions = {
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        };
        connections.forEach(conn => {
            if (conn.line) {
                conn.line.excludeFromExport = false;
                if (conn.line.arrowhead) {
                    conn.line.arrowhead.excludeFromExport = false;
                }
            }
        });
        if (exportArea === 'selection' && canvas.getActiveObject()) {
            const selection = canvas.getActiveObject();
            if (selection.type === 'activeSelection') {
                const group = selection.toGroup();
                const boundingRect = group.getBoundingRect();
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
                const objects = group._objects;
                group._restoreObjectsState();
                canvas.remove(group);
                canvas.add(...objects);
                canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
            } else {
                const boundingRect = selection.getBoundingRect();
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
            }
        } else if (exportArea === 'visible') {
            const viewportTransform = canvas.viewportTransform;
            const zoom = viewportTransform[0];
            const viewportRect = {
                left: -viewportTransform[4] / zoom,
                top: -viewportTransform[5] / zoom,
                width: canvasContainer.offsetWidth / zoom,
                height: canvasContainer.offsetHeight / zoom
            };
            exportOptions.left = viewportRect.left;
            exportOptions.top = viewportRect.top;
            exportOptions.width = viewportRect.width;
            exportOptions.height = viewportRect.height;
        }
        const dataURL = canvas.toDataURL(exportOptions);
        exportPreviewImg.src = dataURL;
    }
    
    function exportMoodBoard() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const resolution = document.getElementById('export-resolution').value;
        const exportArea = document.getElementById('export-area').value;
        let exportOptions = {
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        };
        connections.forEach(conn => {
            if (conn.line) {
                conn.line.excludeFromExport = false;
                if (conn.line.arrowhead) {
                    conn.line.arrowhead.excludeFromExport = false;
                }
            }
        });
        if (exportArea === 'selection' && canvas.getActiveObject()) {
            const selection = canvas.getActiveObject();
            if (selection.type === 'activeSelection') {
                const group = selection.toGroup();
                const boundingRect = group.getBoundingRect();
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
                const objects = group._objects;
                group._restoreObjectsState();
                canvas.remove(group);
                canvas.add(...objects);
                canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
            } else {
                const boundingRect = selection.getBoundingRect();
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
            }
        } else if (exportArea === 'visible') {
            const viewportTransform = canvas.viewportTransform;
            const zoom = viewportTransform[0];
            const viewportRect = {
                left: -viewportTransform[4] / zoom,
                top: -viewportTransform[5] / zoom,
                width: canvasContainer.offsetWidth / zoom,
                height: canvasContainer.offsetHeight / zoom
            };
            exportOptions.left = viewportRect.left;
            exportOptions.top = viewportRect.top;
            exportOptions.width = viewportRect.width;
            exportOptions.height = viewportRect.height;
        }
        const dataURL = canvas.toDataURL(exportOptions);
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `mood-board.${exportType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        hideModal(exportModal);
        showToast('Mood board exported successfully!');
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast fade-in';
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.backgroundColor = 'rgba(74, 144, 226, 0.9)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '2000';
        toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('fade-in');
            toast.classList.add('fade-out');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    function centerCanvas() {
        resetView();
    }
    
    function updateCanvasViewport() {
        const containerRect = canvasContainer.getBoundingClientRect();
        viewportCenter.x = containerRect.width / 2;
        viewportCenter.y = containerRect.height / 2;
        canvasWrapper.style.width = canvasWidth + 'px';
        canvasWrapper.style.height = canvasHeight + 'px';
        updateMinimap();
    }
    
    function zoomIn() { zoomCanvas(1.1); }
    function zoomOut() { zoomCanvas(0.9); }
    
    function zoomCanvas(factor) {
        const containerRect = canvasContainer.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        zoomAtPoint(factor, centerX, centerY);
    }
    
    function zoomAtPoint(factor, x, y) {
        const rect = canvasContainer.getBoundingClientRect();
        const canvasX = (x - rect.left - canvasOffsetX) / canvasScale;
        const canvasY = (y - rect.top - canvasOffsetY) / canvasScale;
        const newScale = Math.min(Math.max(canvasScale * factor, 0.1), 5);
        if (newScale === canvasScale) return;
        canvasOffsetX = x - canvasX * newScale;
        canvasOffsetY = y - canvasY * newScale;
        canvasScale = newScale;
        updateCanvasTransform();
        zoomLevel.textContent = Math.round(canvasScale * 100) + '%';
        updateMinimap();
    }
    
    function panCanvas(deltaX, deltaY) {
        canvasOffsetX += deltaX;
        canvasOffsetY += deltaY;
        updateCanvasTransform();
        updateMinimap();
    }
    
    function updateCanvasTransform() {
        canvasWrapper.style.transform = `translate(${canvasOffsetX}px, ${canvasOffsetY}px) scale(${canvasScale})`;
    }
    
    function resetView() {
        canvasScale = 1;
        const containerRect = canvasContainer.getBoundingClientRect();
        canvasOffsetX = (containerRect.width - canvasWidth) / 2;
        canvasOffsetY = (containerRect.height - canvasHeight) / 2;
        updateCanvasTransform();
        zoomLevel.textContent = '100%';
        updateMinimap();
    }
    
    function rgbToHex(rgb) {
        if (rgb && rgb.startsWith('#')) { return rgb; }
        if (!rgb) { return '#000000'; }
        const matches = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!matches) return '#000000';
        function hex(x) { return ("0" + parseInt(x).toString(16)).slice(-2); }
        return "#" + hex(matches[1]) + hex(matches[2]) + hex(matches[3]);
    }
    
    // --------------------------
    // Advanced Operations: Context Menu, Template System, Image Filters, Clipboard, and History
    // --------------------------
    
    // Context Menu Setup for Advanced Operations
    class ContextMenu {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.options = Object.assign({
                menuClass: 'context-menu',
                menuItemClass: 'context-menu-item',
                containerSelector: '.canvas-container'
            }, options);
            this.menuElement = null;
            this.active = false;
            this.contextTarget = null;
            this.init();
        }
        
        init() {
            this.menuElement = document.createElement('div');
            this.menuElement.className = this.options.menuClass;
            this.menuElement.style.position = 'absolute';
            this.menuElement.style.display = 'none';
            this.menuElement.style.zIndex = 1000;
            const container = document.querySelector(this.options.containerSelector);
            container.appendChild(this.menuElement);
            this.canvas.on('mouse:down', (opt) => this.handleCanvasMouseDown(opt));
            this.canvas.on('mouse:up', (opt) => this.handleCanvasMouseUp(opt));
            document.addEventListener('click', (e) => this.handleDocumentClick(e));
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        }
        
        handleCanvasMouseDown(opt) {
            if (opt.e.button === 2) {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                this.showMenu(opt.e.clientX, opt.e.clientY, opt.target);
            }
        }
        
        handleCanvasMouseUp(opt) {}
        
        handleDocumentClick(e) {
            if (this.active && !this.menuElement.contains(e.target)) {
                this.hideMenu();
            }
        }
        
        handleKeyDown(e) {
            if (this.active && e.key === 'Escape') {
                this.hideMenu();
            }
        }
        
        showMenu(x, y, target) {
            this.contextTarget = target;
            this.menuElement.innerHTML = '';
            const menuItems = this.getMenuItemsForTarget(target);
            menuItems.forEach(item => {
                const menuItem = document.createElement('div');
                menuItem.className = this.options.menuItemClass;
                menuItem.textContent = item.label;
                if (item.icon) {
                    const icon = document.createElement('i');
                    icon.className = item.icon;
                    menuItem.prepend(icon);
                }
                if (item.disabled) {
                    menuItem.classList.add('disabled');
                } else {
                    menuItem.addEventListener('click', () => {
                        this.hideMenu();
                        item.action(this.contextTarget);
                    });
                }
                this.menuElement.appendChild(menuItem);
            });
            const container = document.querySelector(this.options.containerSelector);
            const rect = container.getBoundingClientRect();
            let menuX = x - rect.left;
            let menuY = y - rect.top;
            const menuWidth = 200;
            const menuHeight = menuItems.length * 36;
            if (menuX + menuWidth > rect.width) { menuX = rect.width - menuWidth - 10; }
            if (menuY + menuHeight > rect.height) { menuY = rect.height - menuHeight - 10; }
            this.menuElement.style.left = `${menuX}px`;
            this.menuElement.style.top = `${menuY}px`;
            this.menuElement.style.display = 'block';
            this.menuElement.style.opacity = '0';
            this.menuElement.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.menuElement.style.opacity = '1';
                this.menuElement.style.transform = 'scale(1)';
                this.menuElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            }, 10);
            this.active = true;
        }
        
        hideMenu() {
            this.menuElement.style.opacity = '0';
            this.menuElement.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.menuElement.style.display = 'none';
                this.active = false;
                this.contextTarget = null;
            }, 200);
        }
        
        getMenuItemsForTarget(target) {
            let menuItems = [
                {
                    label: 'Add Text',
                    icon: 'fas fa-font',
                    action: () => { addText(); }
                },
                {
                    label: 'Add Shape',
                    icon: 'fas fa-shapes',
                    action: () => { showShapeModal(); }
                },
                {
                    label: 'Add Image',
                    icon: 'fas fa-image',
                    action: () => { document.getElementById('image-upload').click(); }
                },
                {
                    label: 'Paste',
                    icon: 'fas fa-paste',
                    action: () => { pasteFromClipboard(); },
                    disabled: !navigator.clipboard
                }
            ];
            if (target) {
                this.canvas.setActiveObject(target);
                this.canvas.renderAll();
                menuItems = [
                    {
                        label: 'Edit',
                        icon: 'fas fa-edit',
                        action: (obj) => { if (['i-text', 'text'].includes(obj.type)) { obj.enterEditing(); } },
                        disabled: !['i-text', 'text'].includes(target.type)
                    },
                    {
                        label: 'Copy',
                        icon: 'fas fa-copy',
                        action: (obj) => { copySelectedToClipboard(); }
                    },
                    {
                        label: 'Duplicate',
                        icon: 'fas fa-clone',
                        action: (obj) => { duplicateSelected(); }
                    },
                    {
                        label: 'Delete',
                        icon: 'fas fa-trash',
                        action: (obj) => { removeConnectionsForObject(obj); canvas.remove(obj); updateMinimap(); }
                    },
                    {
                        label: 'Bring to Front',
                        icon: 'fas fa-level-up-alt',
                        action: (obj) => { canvas.bringToFront(obj); updateConnections(); }
                    },
                    {
                        label: 'Send to Back',
                        icon: 'fas fa-level-down-alt',
                        action: (obj) => { canvas.sendToBack(obj); updateConnections(); }
                    },
                    {
                        label: 'Create Connection',
                        icon: 'fas fa-project-diagram',
                        action: (obj) => { toggleConnectionMode(); connectionStartObject = obj; obj._originalStroke = obj.stroke; obj._originalStrokeWidth = obj.strokeWidth; obj.set({ stroke: '#4a90e2', strokeWidth: 2 }); canvas.renderAll(); }
                    }
                ];
                if (target.type === 'image') {
                    menuItems.push({
                        label: 'Apply Filter',
                        icon: 'fas fa-filter',
                        action: (obj) => { showImageFiltersModal(obj); }
                    });
                }
            }
            return menuItems;
        }
    }
    
    // Template System for Quick Starts
    class TemplateSystem {
        constructor(canvas) {
            this.canvas = canvas;
            this.templates = [
                {
                    name: "Blank Canvas",
                    icon: "fas fa-file",
                    createTemplate: () => {
                        this.canvas.clear();
                        this.canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', this.canvas.renderAll.bind(this.canvas));
                    }
                },
                {
                    name: "Mood Board 2x2",
                    icon: "fas fa-th-large",
                    createTemplate: () => { this.create2x2Grid(); }
                },
                {
                    name: "Mood Board 3x3",
                    icon: "fas fa-th",
                    createTemplate: () => { this.create3x3Grid(); }
                },
                {
                    name: "Mind Map",
                    icon: "fas fa-sitemap",
                    createTemplate: () => { this.createMindMap(); }
                },
                {
                    name: "Design Thinking",
                    icon: "fas fa-lightbulb",
                    createTemplate: () => { this.createDesignThinking(); }
                }
            ];
        }
        
        showTemplateModal() {
            const modal = document.createElement('div');
            modal.className = 'modal template-modal';
            modal.id = 'template-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Choose a Template</h2>
                        <button class="close-modal"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <div class="template-grid">
                            ${this.templates.map(template => `
                                <div class="template-option" data-template="${template.name}">
                                    <div class="template-icon">
                                        <i class="${template.icon}"></i>
                                    </div>
                                    <span>${template.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            document.getElementById('overlay').style.display = 'block';
            modal.querySelector('.close-modal').addEventListener('click', () => { this.hideTemplateModal(); });
            const templateOptions = modal.querySelectorAll('.template-option');
            templateOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const templateName = option.getAttribute('data-template');
                    this.applyTemplate(templateName);
                    this.hideTemplateModal();
                });
            });
        }
        
        hideTemplateModal() {
            const modal = document.getElementById('template-modal');
            if (modal) {
                modal.style.display = 'none';
                document.getElementById('overlay').style.display = 'none';
                document.body.removeChild(modal);
            }
        }
        
        applyTemplate(templateName) {
            const template = this.templates.find(t => t.name === templateName);
            if (template) {
                connections = [];
                template.createTemplate();
                updateMinimap();
                showToast(`Applied template: ${templateName}`);
            }
        }
        
        create2x2Grid() {
            this.canvas.clear();
            this.canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', this.canvas.renderAll.bind(this.canvas));
            const gridSize = 2;
            const cellWidth = 500;
            const cellHeight = 400;
            const gapSize = 40;
            const startX = (canvasWidth - (gridSize * cellWidth + (gridSize - 1) * gapSize)) / 2;
            const startY = (canvasHeight - (gridSize * cellHeight + (gridSize - 1) * gapSize)) / 2;
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const rect = new fabric.Rect({
                        left: startX + col * (cellWidth + gapSize),
                        top: startY + row * (cellHeight + gapSize),
                        width: cellWidth,
                        height: cellHeight,
                        fill: 'rgba(200, 200, 200, 0.2)',
                        stroke: 'rgba(150, 150, 150, 0.5)',
                        strokeWidth: 1,
                        rx: 10,
                        ry: 10
                    });
                    const text = new fabric.IText('Add content here', {
                        left: rect.left + cellWidth / 2,
                        top: rect.top + cellHeight / 2,
                        fontFamily: 'Arial',
                        fontSize: 16,
                        fill: isDarkTheme ? '#d0d0d0' : '#808080',
                        originX: 'center',
                        originY: 'center'
                    });
                    this.canvas.add(rect);
                    this.canvas.add(text);
                }
            }
            const title = new fabric.IText('2x2 Mood Board', {
                left: canvasWidth / 2,
                top: startY - 80,
                fontFamily: 'Arial',
                fontSize: 36,
                fontWeight: 'bold',
                fill: isDarkTheme ? '#ffffff' : '#333333',
                originX: 'center',
                originY: 'center'
            });
            this.canvas.add(title);
            this.canvas.renderAll();
        }
        
        create3x3Grid() {
            this.canvas.clear();
            this.canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', this.canvas.renderAll.bind(this.canvas));
            const gridSize = 3;
            const cellWidth = 320;
            const cellHeight = 250;
            const gapSize = 30;
            const startX = (canvasWidth - (gridSize * cellWidth + (gridSize - 1) * gapSize)) / 2;
            const startY = (canvasHeight - (gridSize * cellHeight + (gridSize - 1) * gapSize)) / 2;
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const rect = new fabric.Rect({
                        left: startX + col * (cellWidth + gapSize),
                        top: startY + row * (cellHeight + gapSize),
                        width: cellWidth,
                        height: cellHeight,
                        fill: 'rgba(200, 200, 200, 0.2)',
                        stroke: 'rgba(150, 150, 150, 0.5)',
                        strokeWidth: 1,
                        rx: 8,
                        ry: 8
                    });
                    let icon;
                    if ((row + col) % 3 === 0) {
                        icon = new fabric.Text('🖼️', {
                            left: rect.left + cellWidth / 2,
                            top: rect.top + cellHeight / 2,
                            fontSize: 30,
                            originX: 'center',
                            originY: 'center'
                        });
                    } else if ((row + col) % 3 === 1) {
                        icon = new fabric.Text('✏️', {
                            left: rect.left + cellWidth / 2,
                            top: rect.top + cellHeight / 2,
                            fontSize: 30,
                            originX: 'center',
                            originY: 'center'
                        });
                    } else {
                        icon = new fabric.Text('🎨', {
                            left: rect.left + cellWidth / 2,
                            top: rect.top + cellHeight / 2,
                            fontSize: 30,
                            originX: 'center',
                            originY: 'center'
                        });
                    }
                    this.canvas.add(rect);
                    this.canvas.add(icon);
                }
            }
            const title = new fabric.IText('3x3 Mood Board', {
                left: canvasWidth / 2,
                top: startY - 60,
                fontFamily: 'Arial',
                fontSize: 36,
                fontWeight: 'bold',
                fill: isDarkTheme ? '#ffffff' : '#333333',
                originX: 'center',
                originY: 'center'
            });
            this.canvas.add(title);
            this.canvas.renderAll();
        }
        
        createMindMap() {
            this.canvas.clear();
            this.canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', this.canvas.renderAll.bind(this.canvas));
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const centralNode = new fabric.Circle({
                left: centerX,
                top: centerY,
                radius: 80,
                fill: '#4a90e2',
                originX: 'center',
                originY: 'center'
            });
            const centralText = new fabric.IText('Main Idea', {
                left: centerX,
                top: centerY,
                fontFamily: 'Arial',
                fontSize: 24,
                fill: '#ffffff',
                originX: 'center',
                originY: 'center'
            });
            const numNodes = 6;
            const radius = 250;
            const childRadius = 50;
            for (let i = 0; i < numNodes; i++) {
                const angle = (i / numNodes) * 2 * Math.PI;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);
                const childNode = new fabric.Circle({
                    left: x,
                    top: y,
                    radius: childRadius,
                    fill: this.getColorFromIndex(i),
                    originX: 'center',
                    originY: 'center'
                });
                const childText = new fabric.IText(`Topic ${i+1}`, {
                    left: x,
                    top: y,
                    fontFamily: 'Arial',
                    fontSize: 16,
                    fill: '#ffffff',
                    originX: 'center',
                    originY: 'center'
                });
                const line = new fabric.Line([centerX, centerY, x, y], {
                    stroke: this.getColorFromIndex(i),
                    strokeWidth: 3,
                    selectable: false,
                    evented: false
                });
                this.canvas.add(line);
                this.canvas.add(childNode);
                this.canvas.add(childText);
                connections.push({
                    line: line,
                    from: centralNode,
                    to: childNode,
                    type: 'solid'
                });
                if (i % 2 === 0) {
                    const subRadius = 120;
                    const subAngle1 = angle - 0.3;
                    const subAngle2 = angle + 0.3;
                    const subPoints = [
                        { x: x + subRadius * Math.cos(subAngle1), y: y + subRadius * Math.sin(subAngle1) },
                        { x: x + subRadius * Math.cos(subAngle2), y: y + subRadius * Math.sin(subAngle2) }
                    ];
                    subPoints.forEach((point, j) => {
                        const subNode = new fabric.Circle({
                            left: point.x,
                            top: point.y,
                            radius: 30,
                            fill: this.getColorFromIndex(i, 0.7),
                            originX: 'center',
                            originY: 'center'
                        });
                        const subText = new fabric.IText(`Subtopic ${j+1}`, {
                            left: point.x,
                            top: point.y,
                            fontFamily: 'Arial',
                            fontSize: 14,
                            fill: '#ffffff',
                            originX: 'center',
                            originY: 'center'
                        });
                        const subLine = new fabric.Line([x, y, point.x, point.y], {
                            stroke: this.getColorFromIndex(i, 0.7),
                            strokeWidth: 2,
                            selectable: false,
                            evented: false
                        });
                        this.canvas.add(subLine);
                        this.canvas.add(subNode);
                        this.canvas.add(subText);
                        connections.push({
                            line: subLine,
                            from: childNode,
                            to: subNode,
                            type: 'solid'
                        });
                    });
                }
            }
            this.canvas.add(centralNode);
            this.canvas.add(centralText);
            const title = new fabric.IText('Mind Map Template', {
                left: canvasWidth / 2,
                top: 60,
                fontFamily: 'Arial',
                fontSize: 36,
                fontWeight: 'bold',
                fill: isDarkTheme ? '#ffffff' : '#333333',
                originX: 'center',
                originY: 'center'
            });
            this.canvas.add(title);
            this.canvas.renderAll();
        }
        
        createDesignThinking() {
            this.canvas.clear();
            this.canvas.setBackgroundColor(isDarkTheme ? '#1e1e1e' : '#ffffff', this.canvas.renderAll.bind(this.canvas));
            const phases = [
                { name: "Empathize", color: "#FF5252" },
                { name: "Define", color: "#FF9800" },
                { name: "Ideate", color: "#FFEB3B" },
                { name: "Prototype", color: "#66BB6A" },
                { name: "Test", color: "#42A5F5" }
            ];
            const boxWidth = 500;
            const boxHeight = 300;
            const gapSize = 40;
            const startX = (canvasWidth - (boxWidth * phases.length + gapSize * (phases.length - 1))) / 2;
            const startY = (canvasHeight - boxHeight) / 2;
            phases.forEach((phase, i) => {
                const x = startX + i * (boxWidth + gapSize);
                const box = new fabric.Rect({
                    left: x,
                    top: startY,
                    width: boxWidth,
                    height: boxHeight,
                    fill: fabric.Color.fromHex(phase.color).setAlpha(0.2).toRgba(),
                    stroke: phase.color,
                    strokeWidth: 2,
                    rx: 10,
                    ry: 10
                });
                const title = new fabric.IText(phase.name, {
                    left: x + boxWidth / 2,
                    top: startY + 40,
                    fontFamily: 'Arial',
                    fontSize: 24,
                    fontWeight: 'bold',
                    fill: phase.color,
                    originX: 'center',
                    originY: 'center'
                });
                const placeholder = new fabric.IText('Add notes here...', {
                    left: x + boxWidth / 2,
                    top: startY + 120,
                    fontFamily: 'Arial',
                    fontSize: 16,
                    fontStyle: 'italic',
                    fill: isDarkTheme ? '#d0d0d0' : '#808080',
                    originX: 'center',
                    originY: 'center'
                });
                const icon = this.getPhaseIcon(i);
                const iconText = new fabric.Text(icon, {
                    left: x + boxWidth / 2,
                    top: startY + 200,
                    fontSize: 32,
                    originX: 'center',
                    originY: 'center'
                });
                this.canvas.add(box);
                this.canvas.add(title);
                this.canvas.add(placeholder);
                this.canvas.add(iconText);
                if (i > 0) {
                    const prevX = startX + (i - 1) * (boxWidth + gapSize) + boxWidth;
                    const arrowY = startY + boxHeight / 2;
                    const arrowLine = new fabric.Line([prevX + 10, arrowY, x - 10, arrowY], {
                        stroke: '#888888',
                        strokeWidth: 2,
                        selectable: false,
                        evented: false
                    });
                    const arrowhead = new fabric.Triangle({
                        left: x - 10,
                        top: arrowY,
                        width: 15,
                        height: 15,
                        fill: '#888888',
                        angle: 90,
                        selectable: false,
                        evented: false,
                        originX: 'center',
                        originY: 'center'
                    });
                    this.canvas.add(arrowLine);
                    this.canvas.add(arrowhead);
                }
            });
            const title = new fabric.IText('Design Thinking Process', {
                left: canvasWidth / 2,
                top: startY - 80,
                fontFamily: 'Arial',
                fontSize: 36,
                fontWeight: 'bold',
                fill: isDarkTheme ? '#ffffff' : '#333333',
                originX: 'center',
                originY: 'center'
            });
            this.canvas.add(title);
            this.canvas.renderAll();
        }
        
        getPhaseIcon(index) {
            const icons = ['👁️', '🔍', '💡', '🛠️', '🧪'];
            return icons[index % icons.length];
        }
        
        getColorFromIndex(index, opacity = 1) {
            const colors = [
                'rgba(74, 144, 226, ' + opacity + ')',
                'rgba(126, 211, 33, ' + opacity + ')',
                'rgba(245, 166, 35, ' + opacity + ')',
                'rgba(208, 2, 27, ' + opacity + ')',
                'rgba(189, 16, 224, ' + opacity + ')',
                'rgba(126, 211, 33, ' + opacity + ')'
            ];
            return colors[index % colors.length];
        }
    }
    
    // Advanced Image Handling: Image Filters Modal
    function showImageFiltersModal(imageObj) {
        const modal = document.createElement('div');
        modal.className = 'modal filter-modal';
        modal.id = 'filter-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Apply Image Filters</h2>
                    <button class="close-modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="filter-preview">
                        <h3>Preview</h3>
                        <div class="preview-container">
                            <canvas id="filter-preview-canvas"></canvas>
                        </div>
                    </div>
                    <div class="filter-options">
                        <div class="filter-group">
                            <h4>Adjustments</h4>
                            <div class="adjustment-controls">
                                <div class="control-row">
                                    <label>Brightness:</label>
                                    <input type="range" id="brightness-control" min="-1" max="1" step="0.1" value="0">
                                    <span id="brightness-value">0</span>
                                </div>
                                <div class="control-row">
                                    <label>Contrast:</label>
                                    <input type="range" id="contrast-control" min="-1" max="1" step="0.1" value="0">
                                    <span id="contrast-value">0</span>
                                </div>
                                <div class="control-row">
                                    <label>Saturation:</label>
                                    <input type="range" id="saturation-control" min="-1" max="1" step="0.1" value="0">
                                    <span id="saturation-value">0</span>
                                </div>
                            </div>
                        </div>
                        <div class="filter-group">
                            <h4>Filters</h4>
                            <div class="filter-buttons">
                                <button data-filter="none" class="filter-btn active">None</button>
                                <button data-filter="grayscale" class="filter-btn">Grayscale</button>
                                <button data-filter="sepia" class="filter-btn">Sepia</button>
                                <button data-filter="invert" class="filter-btn">Invert</button>
                                <button data-filter="blur" class="filter-btn">Blur</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary-btn" id="cancel-filter">Cancel</button>
                    <button class="btn primary-btn" id="apply-filter">Apply Filters</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
        document.getElementById('overlay').style.display = 'block';
        const previewCanvas = new fabric.Canvas('filter-preview-canvas', {
            width: 300,
            height: 200,
            selection: false,
            interactive: false
        });
        const imageClone = fabric.util.object.clone(imageObj);
        imageClone.scaleToWidth(250);
        previewCanvas.add(imageClone);
        previewCanvas.centerObject(imageClone);
        previewCanvas.renderAll();
        const filterState = { brightness: 0, contrast: 0, saturation: 0, filter: 'none' };
        function updatePreview() {
            imageClone.filters = [];
            if (filterState.brightness !== 0) {
                imageClone.filters.push(new fabric.Image.filters.Brightness({ brightness: filterState.brightness }));
            }
            if (filterState.contrast !== 0) {
                imageClone.filters.push(new fabric.Image.filters.Contrast({ contrast: filterState.contrast }));
            }
            if (filterState.saturation !== 0) {
                imageClone.filters.push(new fabric.Image.filters.Saturation({ saturation: filterState.saturation }));
            }
            switch (filterState.filter) {
                case 'grayscale':
                    imageClone.filters.push(new fabric.Image.filters.Grayscale());
                    break;
                case 'sepia':
                    imageClone.filters.push(new fabric.Image.filters.Sepia());
                    break;
                case 'invert':
                    imageClone.filters.push(new fabric.Image.filters.Invert());
                    break;
                case 'blur':
                    imageClone.filters.push(new fabric.Image.filters.Blur({ blur: 0.25 }));
                    break;
            }
            imageClone.applyFilters();
            previewCanvas.renderAll();
        }
        const brightnessControl = document.getElementById('brightness-control');
        const brightnessValue = document.getElementById('brightness-value');
        brightnessControl.addEventListener('input', function() {
            filterState.brightness = parseFloat(this.value);
            brightnessValue.textContent = this.value;
            updatePreview();
        });
        const contrastControl = document.getElementById('contrast-control');
        const contrastValue = document.getElementById('contrast-value');
        contrastControl.addEventListener('input', function() {
            filterState.contrast = parseFloat(this.value);
            contrastValue.textContent = this.value;
            updatePreview();
        });
        const saturationControl = document.getElementById('saturation-control');
        const saturationValue = document.getElementById('saturation-value');
        saturationControl.addEventListener('input', function() {
            filterState.saturation = parseFloat(this.value);
            saturationValue.textContent = this.value;
            updatePreview();
        });
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                filterState.filter = this.getAttribute('data-filter');
                updatePreview();
            });
        });
        document.getElementById('apply-filter').addEventListener('click', function() {
            imageObj.filters = [];
            if (filterState.brightness !== 0) {
                imageObj.filters.push(new fabric.Image.filters.Brightness({ brightness: filterState.brightness }));
            }
            if (filterState.contrast !== 0) {
                imageObj.filters.push(new fabric.Image.filters.Contrast({ contrast: filterState.contrast }));
            }
            if (filterState.saturation !== 0) {
                imageObj.filters.push(new fabric.Image.filters.Saturation({ saturation: filterState.saturation }));
            }
            switch (filterState.filter) {
                case 'grayscale':
                    imageObj.filters.push(new fabric.Image.filters.Grayscale());
                    break;
                case 'sepia':
                    imageObj.filters.push(new fabric.Image.filters.Sepia());
                    break;
                case 'invert':
                    imageObj.filters.push(new fabric.Image.filters.Invert());
                    break;
                case 'blur':
                    imageObj.filters.push(new fabric.Image.filters.Blur({ blur: 0.25 }));
                    break;
            }
            imageObj.applyFilters();
            canvas.renderAll();
            hideImageFiltersModal();
        });
        document.getElementById('cancel-filter').addEventListener('click', function() {
            hideImageFiltersModal();
        });
        modal.querySelector('.close-modal').addEventListener('click', function() {
            hideImageFiltersModal();
        });
    }
    
    function hideImageFiltersModal() {
        const modal = document.getElementById('filter-modal');
        if (modal) {
            modal.style.display = 'none';
            document.getElementById('overlay').style.display = 'none';
            document.body.removeChild(modal);
        }
    }
    
    // Clipboard Operations
    function copySelectedToClipboard() {
        if (!canvas.getActiveObject()) return;
        canvas.getActiveObject().clone(function(cloned) {
            window._clipboardObject = cloned;
            showToast('Copied to clipboard');
        });
    }
    
    function pasteFromClipboard() {
        if (!window._clipboardObject) {
            showToast('Nothing to paste');
            return;
        }
        window._clipboardObject.clone(function(clonedObj) {
            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject(function(obj) {
                    obj.set({ left: obj.left + 20, top: obj.top + 20 });
                    canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                clonedObj.set({ left: clonedObj.left + 20, top: clonedObj.top + 20 });
                canvas.add(clonedObj);
            }
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            updateMinimap();
            showToast('Pasted from clipboard');
        });
    }
    
    function duplicateSelected() {
        copySelectedToClipboard();
        pasteFromClipboard();
    }
    
    // History Manager for Undo/Redo
    class HistoryManager {
        constructor(canvas, options = {}) {
            this.canvas = canvas;
            this.options = Object.assign({
                maxStates: 30,
                debounceTime: 500
            }, options);
            this.states = [];
            this.currentStateIndex = -1;
            this.debounceTimer = null;
            this.isUndoRedo = false;
            this.init();
        }
        
        init() {
            this.canvas.on('object:added', () => this.saveState());
            this.canvas.on('object:removed', () => this.saveState());
            this.canvas.on('object:modified', () => this.saveState());
            this.saveState();
        }
        
        saveState() {
            if (this.isUndoRedo) {
                this.isUndoRedo = false;
                return;
            }
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                if (this.currentStateIndex < this.states.length - 1) {
                    this.states = this.states.slice(0, this.currentStateIndex + 1);
                }
                const json = JSON.stringify(this.canvas.toJSON(['objectID', 'isConnection', 'excludeFromExport']));
                this.states.push(json);
                this.currentStateIndex = this.states.length - 1;
                if (this.states.length > this.options.maxStates) {
                    this.states.shift();
                    this.currentStateIndex--;
                }
                this.updateButtons();
            }, this.options.debounceTime);
        }
        
        undo() {
            if (this.currentStateIndex > 0) {
                this.currentStateIndex--;
                this.loadState(this.currentStateIndex);
            }
        }
        
        redo() {
            if (this.currentStateIndex < this.states.length - 1) {
                this.currentStateIndex++;
                this.loadState(this.currentStateIndex);
            }
        }
        
        loadState(index) {
            if (index < 0 || index >= this.states.length) return;
            this.isUndoRedo = true;
            const json = this.states[index];
            connections = [];
            this.canvas.loadFromJSON(json, () => {
                this.canvas.renderAll();
                updateMinimap();
            });
            this.updateButtons();
        }
        
        updateButtons() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            if (undoBtn) { undoBtn.disabled = this.currentStateIndex <= 0; }
            if (redoBtn) { redoBtn.disabled = this.currentStateIndex >= this.states.length - 1; }
        }
    }
    
    // --------------------------
    // Additional Initialization
    // --------------------------
    // Create undo/redo buttons
    function createUndoRedoButtons() {
        const canvasControls = document.querySelector('.canvas-controls');
        const undoBtn = document.createElement('button');
        undoBtn.id = 'undo-btn';
        undoBtn.className = 'icon-btn';
        undoBtn.title = 'Undo (Ctrl+Z)';
        undoBtn.innerHTML = '<i class="fas fa-undo"></i>';
        undoBtn.disabled = true;
        const redoBtn = document.createElement('button');
        redoBtn.id = 'redo-btn';
        redoBtn.className = 'icon-btn';
        redoBtn.title = 'Redo (Ctrl+Y)';
        redoBtn.innerHTML = '<i class="fas fa-redo"></i>';
        redoBtn.disabled = true;
        canvasControls.appendChild(undoBtn);
        canvasControls.appendChild(redoBtn);
        undoBtn.addEventListener('click', function() {
            if (window.historyManager) window.historyManager.undo();
        });
        redoBtn.addEventListener('click', function() {
            if (window.historyManager) window.historyManager.redo();
        });
    }
    
    function addKeyboardShortcuts(history) {
        window.historyManager = history;
        document.addEventListener('keydown', function(e) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') { return; }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); history.undo(); }
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) { e.preventDefault(); history.redo(); }
            if (e.ctrlKey && e.key === 'c') { if (canvas.getActiveObject()) { e.preventDefault(); copySelectedToClipboard(); } }
            if (e.ctrlKey && e.key === 'v') { e.preventDefault(); pasteFromClipboard(); }
            if (e.key === 'Delete') { if (canvas.getActiveObject()) { const obj = canvas.getActiveObject(); removeConnectionsForObject(obj); canvas.remove(obj); updateMinimap(); } }
            if (e.ctrlKey && e.key === 'd') { if (canvas.getActiveObject()) { e.preventDefault(); duplicateSelected(); } }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveCanvas(); }
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal[style*="display: block"]');
                if (activeModal) { hideModal(activeModal); return; }
                if (isConnectionMode) { toggleConnectionMode(); return; }
                if (!canvas.getActiveObject()) { resetView(); }
            }
        });
    }
    
    createUndoRedoButtons();
    const contextMenu = new ContextMenu(canvas);
    const templates = new TemplateSystem(canvas);
    const headerActions = document.querySelector('.header-actions');
    const templateBtn = document.createElement('button');
    templateBtn.id = 'template-btn';
    templateBtn.className = 'icon-btn';
    templateBtn.title = 'Templates';
    templateBtn.innerHTML = '<i class="fas fa-file-alt"></i>';
    templateBtn.addEventListener('click', () => templates.showTemplateModal());
    headerActions.insertBefore(templateBtn, headerActions.firstChild);
    const history = new HistoryManager(canvas);
    addKeyboardShortcuts(history);
    
    // Optionally, load saved canvas on startup
    // loadSavedCanvas();
    
    // Append additional CSS styles for new elements
    function addStyles() {
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            /* Context Menu Styles */
            .context-menu {
                background-color: var(--panel-bg);
                border-radius: 4px;
                box-shadow: 0 4px 15px var(--shadow-color);
                padding: 6px 0;
                min-width: 180px;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                color: var(--text-color);
                transition: background-color 0.2s ease;
            }
            .context-menu-item:hover {
                background-color: var(--accent-color);
                color: white;
            }
            .context-menu-item.disabled {
                opacity: 0.5;
                cursor: default;
            }
            .context-menu-item.disabled:hover {
                background-color: transparent;
                color: var(--text-color);
            }
            .context-menu-item i {
                margin-right: 10px;
                width: 16px;
                text-align: center;
            }
            /* Template Modal Styles */
            .template-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-top: 10px;
            }
            .template-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 15px;
                background-color: var(--bg-color);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .template-option:hover {
                background-color: var(--accent-color);
                color: white;
                transform: translateY(-3px);
            }
            .template-icon {
                font-size: 2rem;
                margin-bottom: 10px;
                color: var(--accent-color);
            }
            .template-option:hover .template-icon {
                color: white;
            }
            /* Filter Modal Styles */
            .filter-preview {
                margin-bottom: 20px;
            }
            .preview-container {
                margin-top: 10px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                overflow: hidden;
                max-height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: #f0f0f0;
            }
            .adjustment-controls, .filter-buttons {
                margin-top: 10px;
            }
            .control-row {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
            }
            .control-row label {
                min-width: 100px;
            }
            .control-row input[type="range"] {
                flex: 1;
            }
            .control-row span {
                min-width: 30px;
                text-align: right;
                margin-left: 10px;
            }
            .filter-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .filter-btn {
                padding: 6px 12px;
                background-color: var(--bg-color);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .filter-btn.active {
                background-color: var(--accent-color);
                color: white;
                border-color: var(--accent-color);
            }
            /* Toast Notification */
            .toast {
                padding: 10px 20px;
                background-color: var(--accent-color);
                color: white;
                border-radius: 4px;
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 2000;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
        `;
        document.head.appendChild(styleElement);
    }
    
    addStyles();
});
