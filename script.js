// Digital Mood Board Creator JavaScript

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Canvas setup
    const canvas = new fabric.Canvas('mood-board-canvas', {
        width: 1200,
        height: 800,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true
    });

    // Resize canvas to fit window on load
    resizeCanvas();
    
    // Variables for tracking application state
    let showGrid = false;
    let selectedElement = null;
    let isPropertiesPanelVisible = false;
    let currentFontFamily = 'Arial';
    let currentFontSize = 24;
    let currentTextStyles = {
        bold: false,
        italic: false,
        underline: false
    };

    // DOM Elements
    const propertiesPanel = document.getElementById('properties-panel');
    const exportModal = document.getElementById('export-modal');
    const shapeModal = document.getElementById('shape-modal');
    const overlay = document.getElementById('overlay');
    const colorInput = document.getElementById('color-input');
    const fontFamilySelect = document.getElementById('font-family');
    const fontSizeSelect = document.getElementById('font-size');
    const opacityControl = document.getElementById('opacity-control');
    const opacityValue = document.getElementById('opacity-value');
    const borderToggle = document.getElementById('border-toggle');
    const borderColor = document.getElementById('border-color');
    const borderWidth = document.getElementById('border-width');
    const exportPreviewImg = document.getElementById('export-preview-img');
    const colorSwatches = document.getElementById('color-swatches');
    
    // Event listeners for toolbar buttons
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
    
    // Existing color swatches
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', function() {
            const color = this.style.backgroundColor;
            if (selectedElement && selectedElement.type !== 'text') {
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
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.set('fontFamily', currentFontFamily);
            canvas.renderAll();
        }
    });
    
    fontSizeSelect.addEventListener('change', function() {
        currentFontSize = parseInt(this.value);
        if (selectedElement && selectedElement.type === 'text') {
            selectedElement.set('fontSize', currentFontSize);
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
        }
    });
    
    document.getElementById('send-backward-btn').addEventListener('click', function() {
        if (selectedElement) {
            canvas.sendBackwards(selectedElement);
        }
    });
    
    document.getElementById('delete-element-btn').addEventListener('click', function() {
        if (selectedElement) {
            canvas.remove(selectedElement);
            hidePropertiesPanel();
        }
    });
    
    // Close properties panel
    document.getElementById('close-properties').addEventListener('click', hidePropertiesPanel);
    
    // Export modal controls
    document.querySelectorAll('input[name="export-type"]').forEach(input => {
        input.addEventListener('change', updateExportPreview);
    });
    
    document.getElementById('export-resolution').addEventListener('change', updateExportPreview);
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
    
    // Window resize listener
    window.addEventListener('resize', resizeCanvas);
    
    // Function to add a text object to the canvas
    function addText() {
        const text = new fabric.IText('Double-click to edit', {
            left: canvas.width / 2,
            top: canvas.height / 2,
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
    }
    
    // Function to add a color rectangle to the canvas
    function addColorRectangle() {
        const rect = new fabric.Rect({
            left: canvas.width / 2,
            top: canvas.height / 2,
            width: 100,
            height: 100,
            fill: colorInput.value,
            originX: 'center',
            originY: 'center',
            centeredRotation: true
        });
        
        canvas.add(rect);
        canvas.setActiveObject(rect);
    }
    
    // Function to add a new shape to the canvas
    function addShape(shapeType) {
        let shape;
        
        switch(shapeType) {
            case 'rect':
                shape = new fabric.Rect({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    width: 100,
                    height: 100,
                    fill: colorInput.value
                });
                break;
                
            case 'circle':
                shape = new fabric.Circle({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    radius: 50,
                    fill: colorInput.value
                });
                break;
                
            case 'triangle':
                shape = new fabric.Triangle({
                    left: canvas.width / 2,
                    top: canvas.height / 2,
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
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    fill: colorInput.value
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
        }
    }
    
    // Function to toggle grid visibility
    function toggleGrid() {
        showGrid = !showGrid;
        const canvasEl = document.querySelector('.canvas-wrapper');
        
        if (showGrid) {
            canvasEl.classList.add('canvas-grid');
        } else {
            canvasEl.classList.remove('canvas-grid');
        }
    }
    
    // Function to clear the canvas
    function clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            canvas.clear();
            canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
        }
    }
    
    // Function to save the current canvas state
    function saveCanvas() {
        // This function would typically save to a server or localStorage
        // For now, we'll just show an alert
        alert('Canvas saved! (Note: This is a placeholder as actual saving functionality would require backend integration)');
    }
    
    // Function to handle object selection
    function handleObjectSelected(e) {
        selectedElement = canvas.getActiveObject();
        showPropertiesPanel();
        updatePropertiesPanel();
    }
    
    // Function to handle selection cleared
    function handleSelectionCleared() {
        selectedElement = null;
        hidePropertiesPanel();
    }
    
    // Function to show the properties panel
    function showPropertiesPanel() {
        propertiesPanel.style.display = 'block';
        isPropertiesPanelVisible = true;
    }
    
    // Function to hide the properties panel
    function hidePropertiesPanel() {
        propertiesPanel.style.display = 'none';
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
            `;
            specificControls.appendChild(textControls);
            
            // Update font controls in the sidebar
            fontFamilySelect.value = selectedElement.fontFamily;
            fontSizeSelect.value = selectedElement.fontSize;
            
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
            `;
            specificControls.appendChild(shapeControls);
            
            // Add event listener for shape fill
            document.getElementById('shape-fill').addEventListener('input', function() {
                setElementFill(this.value);
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
                    left: canvas.width / 2,
                    top: canvas.height / 2,
                    originX: 'center',
                    originY: 'center',
                    centeredRotation: true
                });
                
                canvas.add(image);
                canvas.setActiveObject(image);
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
            if (selectedElement && selectedElement.type !== 'text') {
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
        
        const dataURL = canvas.toDataURL({
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        });
        
        exportPreviewImg.src = dataURL;
    }
    
    // Function to export the mood board
    function exportMoodBoard() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        const resolution = document.getElementById('export-resolution').value;
        
        const dataURL = canvas.toDataURL({
            format: exportType,
            quality: 1,
            multiplier: parseFloat(resolution)
        });
        
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `mood-board.${exportType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideModal(exportModal);
    }
    
    // Function to resize the canvas
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        // Determine the best fit while maintaining the canvas's aspect ratio
        const canvasRatio = canvas.width / canvas.height;
        const containerRatio = containerWidth / containerHeight;
        
        let scale;
        if (containerRatio > canvasRatio) {
            // Container is wider than needed, constrain by height
            scale = containerHeight / canvas.height;
        } else {
            // Container is taller than needed, constrain by width
            scale = containerWidth / canvas.width;
        }
        
        // Scale with a slight margin
        scale = scale * 0.9;
        
        // Apply scale to canvas element
        canvas.setZoom(scale);
        canvas.setDimensions({
            width: canvas.width * scale,
            height: canvas.height * scale
        });
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
});
