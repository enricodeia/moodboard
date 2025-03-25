// Infinite Mood Board Creator JavaScript

// Register GSAP plugins
gsap.registerPlugin(Observer);

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup with very large dimensions for "infinite" feel
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

    // Variables for tracking application state
    let showGrid = false;
    let isDarkTheme = false;
    let selectedElement = null;
    let isPropertiesPanelVisible = false;
    let currentFontFamily = 'Arial';
    let currentFontSize = 24;
    let currentTextStyles = {
        bold: false,
        italic: false,
        underline: false
    };
    
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
        // Initial setup
        updateCanvasViewport();
        centerCanvas();
        setupEventListeners();
        setupInfiniteCanvas();
        
        // Apply user preference for theme if available
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
        document.getElementById('add-color-swatch').addEventListener('click', function() {
            const color = colorInput.value;
            addColorSwatch(color);
        });
        
        colorInput.addEventListener('input', function() {
            // If there's a selected element that's not text, update its fill
            if (selectedElement && selectedElement.type !== 'text' && selectedElement.type !== 'i-text') {
                setElementFill(this.value);
            }
        });
        
        // Existing color swatches
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
                // Find and remove any connections involving this object
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
        
        // Close modals when clicking the close button
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
                this.value = ''; // Reset the input
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
                    // Provide visual feedback
                    connectionStartObject.set({
                        stroke: '#4a90e2',
                        strokeWidth: 2
                    });
                    canvas.renderAll();
                } else if (e.target !== connectionStartObject) {
                    // Create connection
                    createConnection(connectionStartObject, e.target, connectionLineType);
                    // Reset
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
        // Set up GSAP Observer for smooth pan/zoom
        Observer.create({
            target: infiniteCanvasWrapper,
            type: "wheel,touch,pointer",
            wheelSpeed: -1,
            onWheel: (self) => {
                if (self.deltaY !== 0) {
                    // Ctrl + wheel = zoom
                    if (self.event.ctrlKey || self.event.metaKey) {
                        // Prevent default browser zoom
                        self.event.preventDefault();
                        
                        // Get mouse position relative to canvas
                        const rect = infiniteCanvasWrapper.getBoundingClientRect();
                        const mouseX = self.event.clientX - rect.left;
                        const mouseY = self.event.clientY - rect.top;
                        
                        // Zoom in or out
                        if (self.deltaY < 0) {
                            zoomAtPoint(1.1, mouseX, mouseY);
                        } else {
                            zoomAtPoint(0.9, mouseX, mouseY);
                        }
                    } else {
                        // Regular wheel = pan vertically
                        panCanvas(0, self.deltaY * 2);
                    }
                }
                
                if (self.deltaX !== 0 && !self.event.ctrlKey && !self.event.metaKey) {
                    // Shift + wheel or trackpad horizontal scroll = pan horizontally
                    panCanvas(self.deltaX * 2, 0);
                }
            },
            onDragStart: (self) => {
                // Only activate drag if not on a canvas object
                if (!canvas.getActiveObject() && !isConnectionMode) {
                    isDragging = true;
                    infiniteCanvasWrapper.style.cursor = 'grabbing';
                    lastPosX = self.x;
                    lastPosY = self.y;
                    
                    // Add grabbing class
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
                
                // Remove grabbing class
                infiniteCanvasWrapper.classList.remove('grabbing');
            }
        });
    }
    
    // Function to toggle dark/light theme
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        
        if (isDarkTheme) {
            document.body.classList.add('dark-theme');
            document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
            // Change canvas background for dark theme
            canvas.setBackgroundColor('#1e1e1e', canvas.renderAll.bind(canvas));
        } else {
            document.body.classList.remove('dark-theme');
            document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i>';
            // Change canvas background for light theme
            canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
        }
        
        // Save preference
        localStorage.setItem('moodBoardTheme', isDarkTheme ? 'dark' : 'light');
        
        // Update minimap
        updateMinimap();
    }
    
    // Function to toggle sidebar tools
    function toggleTools() {
        isToolsCollapsed = !isToolsCollapsed;
        
        if (isToolsCollapsed) {
            toolsContainer.classList.add('tools-collapsed');
        } else {
            toolsContainer.classList.remove('tools-collapsed');
        }
        
        // Update chevron icon
        const toggleBtn = document.getElementById('toggle-tools-btn');
        toggleBtn.innerHTML = isToolsCollapsed ? 
            '<i class="fas fa-chevron-right"></i>' : 
            '<i class="fas fa-chevron-left"></i>';
    }
    
    // Function to toggle minimap
    function toggleMinimap() {
        isMinimapVisible = !isMinimapVisible;
        
        if (isMinimapVisible) {
            minimap.style.display = 'block';
            updateMinimap();
        } else {
            minimap.style.display = 'none';
        }
    }
    
    // Function to update minimap
    function updateMinimap() {
        if (!isMinimapVisible) return;
        
        // Clear minimap
        while (minimap.firstChild) {
            if (minimap.firstChild !== minimapViewport) {
                minimap.removeChild(minimap.firstChild);
            }
        }
        
        // Calculate scale for minimap
        const minimapWidth = minimap.offsetWidth;
        const minimapHeight = minimap.offsetHeight;
        const canvasRatio = canvasWidth / canvasHeight;
        const minimapRatio = minimapWidth / minimapHeight;
        
        let minimapScale;
        if (canvasRatio > minimapRatio) {
            minimapScale = minimapWidth / canvasWidth;
        } else {
            minimapScale = minimapHeight / canvasHeight;
        }
        
        // Draw canvas objects on minimap
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
        
        // Update viewport indicator
        const containerRect = canvasContainer.getBoundingClientRect();
        const viewportWidth = containerRect.width / canvasScale;
        const viewportHeight = containerRect.height / canvasScale;
        
        // Calculate visible area of canvas
        const visibleLeft = (-canvasOffsetX / canvasScale);
        const visibleTop = (-canvasOffsetY / canvasScale);
        
        minimapViewport.style.width = (viewportWidth * minimapScale) + 'px';
        minimapViewport.style.height = (viewportHeight * minimapScale) + 'px';
        minimapViewport.style.left = (visibleLeft * minimapScale) + 'px';
        minimapViewport.style.top = (visibleTop * minimapScale) + 'px';
    }
    
    // Function to toggle connection mode
    function toggleConnectionMode() {
        isConnectionMode = !isConnectionMode;
        
        const connectionBtn = document.getElementById('create-connection-btn');
        
        if (isConnectionMode) {
            connectionBtn.classList.add('active');
            connectionTools.style.display = 'block';
            canvas.defaultCursor = 'crosshair';
            canvas.hoverCursor = 'crosshair';
            
            // Show connection types
            document.querySelector('.connection-types').style.display = 'flex';
        } else {
            connectionBtn.classList.remove('active');
            document.querySelector('.connection-types').style.display = 'none';
            canvas.defaultCursor = 'default';
            canvas.hoverCursor = 'pointer';
            
            // Reset connection start if any
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
    
    // Function to set connection type
    function setConnectionType(type) {
        connectionLineType = type;
        
        // Update UI
        document.querySelectorAll('.connection-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-type') === type);
        });
    }
    
    // Function to create connection between objects
    function createConnection(obj1, obj2, type) {
        // Store original properties for restoring when connection mode ends
        if (!obj1._originalStroke) obj1._originalStroke = obj1.stroke;
        if (!obj1._originalStrokeWidth) obj1._originalStrokeWidth = obj1.strokeWidth;
        if (!obj2._originalStroke) obj2._originalStroke = obj2.stroke;
        if (!obj2._originalStrokeWidth) obj2._originalStrokeWidth = obj2.strokeWidth;
        
        // Create the connection line
        const line = createConnectionLine(obj1, obj2, type);
        canvas.add(line);
        
        // Save the connection info
        connections.push({
            line: line,
            from: obj1,
            to: obj2,
            type: type
        });
        
        // Move the line to back so it doesn't interfere with object selection
        canvas.sendToBack(line);
        
        // Mark line as a connection
        line.isConnection = true;
    }
    
    // Function to create a connection line based on type
    function createConnectionLine(obj1, obj2, type) {
        // Get center points
        const point1 = obj1.getCenterPoint();
        const point2 = obj2.getCenterPoint();
        
        let lineOptions = {
            x1: point1.x,
            y1: point1.y,
            x2: point2.x,
            y2: point2.y,
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
                // Create a line first
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
                
                // Calculate angle for the arrow
                const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
                
                // Create the arrowhead
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
                
                // Add arrowhead
                canvas.add(arrowhead);
                
                // Store reference to arrowhead
                line.arrowhead = arrowhead;
                break;
            default: // solid
                line = new fabric.Line([point1.x, point1.y, point2.x, point2.y], lineOptions);
        }
        
        return line;
    }
    
    // Function to update all connections when objects move
    function updateConnections() {
        connections.forEach(connection => {
            const fromObj = connection.from;
            const toObj = connection.to;
            const line = connection.line;
            
            if (fromObj && toObj && fromObj.canvas && toObj.canvas) {
                const point1 = fromObj.getCenterPoint();
                const point2 = toObj.getCenterPoint();
                
                line.set({
                    x1: point1.x,
                    y1: point1.y,
                    x2: point2.x,
                    y2: point2.y
                });
                
                if (connection.type === 'arrow' && line.arrowhead) {
                    const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * 180 / Math.PI;
                    line.arrowhead.set({
                        left: point2.x,
                        top: point2.y,
                        angle: angle + 90
                    });
                }
            }
        });
        
        canvas.renderAll();
    }
    
    // Function to remove connections for a specific object
    function removeConnectionsForObject(obj) {
        const connectionsToRemove = connections.filter(
            conn => conn.from === obj || conn.to === obj
        );
        
        connectionsToRemove.forEach(conn => {
            canvas.remove(conn.line);
            
            // Remove arrowhead if exists
            if (conn.type === 'arrow' && conn.line.arrowhead) {
                canvas.remove(conn.line.arrowhead);
            }
            
            // Find and remove the connection from the array
            const index = connections.indexOf(conn);
            if (index > -1) {
                connections.splice(index, 1);
            }
        });
    }
    
    // Function to add a text object to the canvas
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
        
        // Apply current text styles
        if (currentTextStyles.bold) text.set('fontWeight', 'bold');
        if (currentTextStyles.italic) text.set('fontStyle', 'italic');
        if (currentTextStyles.underline) text.set('underline', true);
        
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.renderAll();
        updateMinimap();
    }
    
    // Function to add a color rectangle to the canvas
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
    
    // Function to add a new shape to the canvas
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
                // Create a pentagon
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
                // Create a star
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
                // Create a heart shape using path
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
            shape.set({
                originX: 'center',
                originY: 'center',
                centeredRotation: true
            });
            
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.renderAll();
            updateMinimap();
        }
    }
    
    // Function to toggle grid visibility
    function toggleGrid() {
        showGrid = !showGrid;
        const canvasEl = canvasWrapper;
        
        if (showGrid) {
            canvasEl.classList.add('canvas-grid');
        } else {
            canvasEl.classList.remove('canvas-grid');
        }
    }
    
    // Function to clear the canvas
    function clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            // Clear all objects
            canvas.clear();
            
            // Reset connections array
            connections = [];
            
            // Reset canvas background color based on theme
            canvas.setBackgroundColor(
                isDarkTheme ? '#1e1e1e' : '#ffffff', 
                canvas.renderAll.bind(canvas)
            );
            
            updateMinimap();
        }
    }
    
    // Function to save the current canvas state
    function saveCanvas() {
        // In a real application, this would connect to a backend
        // For this demo, we'll use localStorage
        try {
            const canvasJSON = JSON.stringify(canvas.toJSON(['objectID', 'isConnection', 'excludeFromExport']));
            localStorage.setItem('infiniteMoodBoard', canvasJSON);
            
            // Also store connections as they may contain special data
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
    
    // Function to load saved canvas
    function loadSavedCanvas() {
        const savedCanvas = localStorage.getItem('infiniteMoodBoard');
        const savedConnections = localStorage.getItem('infiniteMoodBoardConnections');
        
        if (savedCanvas) {
            try {
                canvas.loadFromJSON(savedCanvas, function() {
                    canvas.renderAll();
                    
                    // Restore connections if available
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
    
    // Function to restore connections after loading canvas
    function restoreConnections(connectionsData) {
        connections = [];
        
        // Create a map of object IDs to objects
        const objectMap = {};
        canvas.forEachObject(function(obj) {
            if (obj.objectID) {
                objectMap[obj.objectID] = obj;
            }
        });
        
        // Recreate connections
        connectionsData.forEach(conn => {
            const fromObj = objectMap[conn.fromID];
            const toObj = objectMap[conn.toID];
            
            if (fromObj && toObj) {
                createConnection(fromObj, toObj, conn.type);
            }
        });
        
        canvas.renderAll();
    }
    
    // Function to handle object selection
    function handleObjectSelected(e) {
        selectedElement = canvas.getActiveObject();
        
        // Don't select connection lines
        if (selectedElement && selectedElement.isConnection) {
            canvas.discardActiveObject();
            return;
        }
        
        if (isConnectionMode) {
            // If in connection mode and a start object is selected,
            // we need to create the connection
            if (connectionStartObject && selectedElement !== connectionStartObject) {
                createConnection(connectionStartObject, selectedElement, connectionLineType);
                
                // Reset connection start
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
        
        // Show connection tools if more than one object is selected
        if (selectedElement && selectedElement.type === 'activeSelection' && selectedElement.getObjects().length > 1) {
            connectionTools.style.display = 'block';
        } else {
            connectionTools.style.display = 'none';
        }
    }
    
    // Function to handle selection cleared
    function handleSelectionCleared() {
        selectedElement = null;
        hidePropertiesPanel();
        connectionTools.style.display = 'none';
    }
    
    // Function to show the properties panel
    function showPropertiesPanel() {
        // Calculate position - near the selected element
        if (selectedElement) {
            const zoom = canvas.getZoom();
            const boundingRect = selectedElement.getBoundingRect();
            const viewportPoint = fabric.util.transformPoint(
                new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top),
                canvas.viewportTransform
            );
            
            // Make sure the panel is within viewport
            const containerRect = canvasContainer.getBoundingClientRect();
            let leftPos = viewportPoint.x + 20;
            let topPos = viewportPoint.y;
            
            // Adjust if offscreen
            if (leftPos + 240 > containerRect.width) {
                leftPos = viewportPoint.x - 260;
            }
            
            if (topPos + 300 > containerRect.height) {
                topPos = containerRect.height - 320;
            }
            
            propertiesPanel.style.left = Math.max(10, leftPos) + 'px';
            propertiesPanel.style.top = Math.max(10, topPos) + 'px';
        }
        
        // Show with animation
        propertiesPanel.style.display = 'block';
        propertiesPanel.classList.add('scale-in');
        isPropertiesPanelVisible = true;
    }
    
    // Function to hide the properties panel
    function hidePropertiesPanel() {
        // Hide with animation
        propertiesPanel.classList.remove('scale-in');
        propertiesPanel.classList.add('scale-out');
        
        setTimeout(() => {
            propertiesPanel.style.display = 'none';
            propertiesPanel.classList.remove('scale-out');
        }, 300);
        
        isPropertiesPanelVisible = false;
    }
    
    // Function to update the properties panel based on the selected element
    function updatePropertiesPanel() {
        if (!selectedElement) return;
        
        // Update opacity
        opacityControl.value = selectedElement.opacity * 100;
        opacityValue.textContent = Math.round(selectedElement.opacity * 100) + '%';
        
        // Update border controls
        borderToggle.checked = selectedElement.stroke !== null;
        if (selectedElement.stroke) {
            borderColor.value = rgbToHex(selectedElement.stroke);
        }
        borderWidth.value = selectedElement.strokeWidth || 1;
        
        // Update element-specific controls
        const specificControls = document.getElementById('element-specific-controls');
        specificControls.innerHTML = '';
        
        if (selectedElement.type === 'text' || selectedElement.type === 'i-text') {
            // Text controls
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
            
            // Update font controls in the sidebar
            fontFamilySelect.value = selectedElement.fontFamily;
            
            // Update text style buttons
            const boldBtn = document.getElementById('bold-btn');
            const italicBtn = document.getElementById('italic-btn');
            const underlineBtn = document.getElementById('underline-btn');
            
            boldBtn.classList.toggle('active', selectedElement.fontWeight === 'bold');
            italicBtn.classList.toggle('active', selectedElement.fontStyle === 'italic');
            underlineBtn.classList.toggle('active', selectedElement.underline);
            
            // Add event listener for text color
            document.getElementById('text-color').addEventListener('input', function() {
                selectedElement.set('fill', this.value);
                canvas.renderAll();
            });
            
            // Add event listener for font size
            document.getElementById('font-size-range').addEventListener('input', function() {
                const fontSize = parseInt(this.value);
                document.getElementById('font-size-value').textContent = fontSize + 'px';
                selectedElement.set('fontSize', fontSize);
                canvas.renderAll();
            });
        } else {
            // Shape/Image controls
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
            
            // Add event listener for shape fill
            document.getElementById('shape-fill').addEventListener('input', function() {
                setElementFill(this.value);
            });
            
            // Add event listeners for scale buttons
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
    
    // Function to set the fill color of the selected element
    function setElementFill(color) {
        if (selectedElement) {
            selectedElement.set('fill', color);
            canvas.renderAll();
            
            // Update the color input in the properties panel if it exists
            const shapeFill = document.getElementById('shape-fill');
            if (shapeFill) {
                shapeFill.value = rgbToHex(color);
            }
        }
    }
    
    // Function to toggle text style (bold, italic, underline)
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
    
    // Function to upload an image
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
                
                // Scale image to fit within the canvas while maintaining aspect ratio
                const maxDimension = 300;
                if (image.width > maxDimension || image.height > maxDimension) {
                    if (image.width > image.height) {
                        image.scaleToWidth(maxDimension);
                    } else {
                        image.scaleToHeight(maxDimension);
                    }
                }
                
                // Center the image
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
    
    // Function to add a new color swatch
    function addColorSwatch(color) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        
        swatch.addEventListener('click', function() {
            if (selectedElement && selectedElement.type !== 'text' && selectedElement.type !== 'i-text') {
                setElementFill(color);
            } else {
                colorInput.value = rgbToHex(color);
            }
        });
        
        colorSwatches.appendChild(swatch);
    }
    
    // Function to show the export modal
    function showExportModal() {
        updateExportPreview();
        exportModal.style.display = 'block';
        overlay.style.display = 'block';
    }
    
    // Function to show the shape modal
    function showShapeModal() {
        shapeModal.style.display = 'block';
        overlay.style.display = 'block';
    }
    
    // Function to hide a modal
    function hideModal(modal) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }
    
    // Function to update the export preview
    function updateExportPreview() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const resolution = document.getElementById('export-resolution').value;
        const exportArea = document.getElementById('export-area').value;
        
        let exportOptions = {
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        };
        
        // Mark connection lines to be included in export
        connections.forEach(conn => {
            if (conn.line) {
                conn.line.excludeFromExport = false;
                if (conn.line.arrowhead) {
                    conn.line.arrowhead.excludeFromExport = false;
                }
            }
        });
        
        // If exporting only selection, adjust the export area
        if (exportArea === 'selection' && canvas.getActiveObject()) {
            const selection = canvas.getActiveObject();
            
            if (selection.type === 'activeSelection') {
                // Group multiple objects to get the bounding box
                const group = selection.toGroup();
                const boundingRect = group.getBoundingRect();
                
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
                
                // Convert group back to active selection
                const objects = group._objects;
                group._restoreObjectsState();
                canvas.remove(group);
                canvas.add(...objects);
                canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
            } else {
                // Single object selection
                const boundingRect = selection.getBoundingRect();
                
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
            }
        } else if (exportArea === 'visible') {
            // Export only what's visible in the current viewport
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
    
    // Function to export the mood board
    function exportMoodBoard() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const resolution = document.getElementById('export-resolution').value;
        const exportArea = document.getElementById('export-area').value;
        
        let exportOptions = {
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        };
        
        // Mark connection lines to be included in export
        connections.forEach(conn => {
            if (conn.line) {
                conn.line.excludeFromExport = false;
                if (conn.line.arrowhead) {
                    conn.line.arrowhead.excludeFromExport = false;
                }
            }
        });
        
        // If exporting only selection, adjust the export area
        if (exportArea === 'selection' && canvas.getActiveObject()) {
            const selection = canvas.getActiveObject();
            
            if (selection.type === 'activeSelection') {
                // Group multiple objects to get the bounding box
                const group = selection.toGroup();
                const boundingRect = group.getBoundingRect();
                
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
                
                // Convert group back to active selection
                const objects = group._objects;
                group._restoreObjectsState();
                canvas.remove(group);
                canvas.add(...objects);
                canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
            } else {
                // Single object selection
                const boundingRect = selection.getBoundingRect();
                
                exportOptions.left = boundingRect.left;
                exportOptions.top = boundingRect.top;
                exportOptions.width = boundingRect.width;
                exportOptions.height = boundingRect.height;
            }
        } else if (exportArea === 'visible') {
            // Export only what's visible in the current viewport
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
    
    // Function to show a toast notification
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
    
    // Function to center the canvas
    function centerCanvas() {
        resetView();
    }
    
    // Function to update the canvas viewport based on window size
    function updateCanvasViewport() {
        // Set the viewport center point
        const containerRect = canvasContainer.getBoundingClientRect();
        viewportCenter.x = containerRect.width / 2;
        viewportCenter.y = containerRect.height / 2;
        
        // Update canvas wrapper dimensions
        canvasWrapper.style.width = canvasWidth + 'px';
        canvasWrapper.style.height = canvasHeight + 'px';
        
        // Update minimap
        updateMinimap();
    }
    
    // Functions for canvas navigation
    function zoomIn() {
        zoomCanvas(1.1);
    }
    
    function zoomOut() {
        zoomCanvas(0.9);
    }
    
    function zoomCanvas(factor) {
        // Get the center of the viewport
        const containerRect = canvasContainer.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        zoomAtPoint(factor, centerX, centerY);
    }
    
    function zoomAtPoint(factor, x, y) {
        // Calculate the point in canvas coordinates
        const rect = canvasContainer.getBoundingClientRect();
        const canvasX = (x - rect.left - canvasOffsetX) / canvasScale;
        const canvasY = (y - rect.top - canvasOffsetY) / canvasScale;
        
        // Apply zoom constraints
        const newScale = Math.min(Math.max(canvasScale * factor, 0.1), 5);
        
        // If we're at min/max zoom, don't proceed
        if (newScale === canvasScale) return;
        
        // Calculate new offsets to keep the point at the same screen position
        canvasOffsetX = x - canvasX * newScale;
        canvasOffsetY = y - canvasY * newScale;
        
        // Apply new scale
        canvasScale = newScale;
        
        // Update canvas transform
        updateCanvasTransform();
        
        // Update zoom level display
        zoomLevel.textContent = Math.round(canvasScale * 100) + '%';
        
        // Update minimap viewport
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
        // Reset to default values
        canvasScale = 1;
        
        // Center the canvas
        const containerRect = canvasContainer.getBoundingClientRect();
        canvasOffsetX = (containerRect.width - canvasWidth) / 2;
        canvasOffsetY = (containerRect.height - canvasHeight) / 2;
        
        updateCanvasTransform();
        zoomLevel.textContent = '100%';
        updateMinimap();
    }
    
    // Helper function to convert RGB to HEX
    function rgbToHex(rgb) {
        // If rgb is already a hex color, return it
        if (rgb && rgb.startsWith('#')) {
            return rgb;
        }
        
        // If rgb is undefined or null, return a default color
        if (!rgb) {
            return '#000000';
        }
        
        // Extract RGB values
        const matches = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!matches) return '#000000';
        
        function hex(x) {
            return ("0" + parseInt(x).toString(16)).slice(-2);
        }
        
        return "#" + hex(matches[1]) + hex(matches[2]) + hex(matches[3]);
    }
    
    // Try to load any saved canvas on startup
    // Uncomment to enable auto-loading
    // loadSavedCanvas();
});
