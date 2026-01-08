/**
 * CoordinateGrid App - Advanced Interactive Version
 * Full-featured graphing with drawing tools, save, and export
 */

class CoordinateGrid {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svgNS = "http://www.w3.org/2000/svg";
        
        // Default settings
        this.settings = {
            width: 600,
            height: 600,
            padding: 50,
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10,
            gridSpacing: 1,
            showGrid: true,
            showAxes: true,
            showLabels: true,
            axisColor: 'rgba(255, 255, 255, 0.4)',
            gridColor: 'rgba(255, 255, 255, 0.15)',
            pointColor: '#ff0055',
            lineColor: '#00d4ff',
            textColor: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            fontSize: 14,
            pointRadius: 6
        };

        this.zoomLevel = 1;
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        
        // Storage for all graph elements
        this.elements = {
            points: [],
            lines: [],
            functions: [],
            inequalities: []
        };
        
        this.interactiveMode = 'point'; // 'point', 'line', 'delete', 'parabola'
        this.drawingState = null; // For line/parabola drawing
        this.uniqueId = 'grid-' + Date.now();
        this.inequalityColors = ['rgba(255, 0, 85, 0.25)', 'rgba(0, 212, 255, 0.25)', 'rgba(127, 255, 0, 0.25)', 'rgba(255, 165, 0, 0.25)'];
        this.inequalityColorIndex = 0;
    }

    /**
     * Main render function
     */
    async render(payload) {
        try {
            // Auto-scale grid based on data
            this.autoScale(payload);
            
            // Apply payload settings
            this.applyPayload(payload);

            // Check if this should replace existing graph
            const existingContainer = document.querySelector('.coordinate-grid-inline');
            if (existingContainer && !payload.keepPrevious && !payload.saved) {
                existingContainer.remove();
            }

            // Create inline container
            const inlineContainer = this.createInlineContainer();
            
            // Create SVG
            this.createSVG(inlineContainer);

            // Render elements from payload
            this.renderFromPayload(payload);

            // Add controls
            this.addControls(inlineContainer, payload);

            // Enable interactive mode if requested
            if (payload.interactive) {
                this.enableInteractive();
            }

            const summary = this.generateSummary(payload);

            return {
                status: 'success',
                appId: 'CoordinateGrid',
                summary: summary,
                output: { type: 'inline', containerId: this.uniqueId }
            };

        } catch (error) {
            console.error('CoordinateGrid render error:', error);
            return {
                status: 'error',
                appId: 'CoordinateGrid',
                error: error.message
            };
        }
    }

    /**
     * Auto-scale grid based on data range
     */
    autoScale(payload) {
        let allValues = { x: [], y: [] };

        // Collect all coordinates
        if (payload.points) {
            payload.points.forEach(p => {
                allValues.x.push(p[0]);
                allValues.y.push(p[1]);
            });
        }

        if (payload.slope !== undefined && payload.intercept !== undefined) {
            // Sample line at a few points
            [-10, 0, 10].forEach(x => {
                const y = payload.slope * x + payload.intercept;
                allValues.x.push(x);
                allValues.y.push(y);
            });
        }

        if (payload.equation) {
            try {
                const func = this.parseEquation(payload.equation);
                [-10, -5, 0, 5, 10].forEach(x => {
                    const y = func(x);
                    if (isFinite(y) && !isNaN(y)) {
                        allValues.x.push(x);
                        allValues.y.push(y);
                    }
                });
            } catch (e) {}
        }

        if (payload.functions) {
            payload.functions.forEach(f => {
                try {
                    const func = this.parseEquation(f.equation);
                    [-10, -5, 0, 5, 10].forEach(x => {
                        const y = func(x);
                        if (isFinite(y) && !isNaN(y)) {
                            allValues.x.push(x);
                            allValues.y.push(y);
                        }
                    });
                } catch (e) {}
            });
        }

        // Calculate appropriate range if we have data
        if (allValues.x.length > 0) {
            const xMin = Math.min(...allValues.x);
            const xMax = Math.max(...allValues.x);
            const yMin = Math.min(...allValues.y);
            const yMax = Math.max(...allValues.y);

            // Add 20% padding
            const xRange = xMax - xMin || 10;
            const yRange = yMax - yMin || 10;
            const xPadding = xRange * 0.2;
            const yPadding = yRange * 0.2;

            this.settings.xMin = Math.floor(xMin - xPadding);
            this.settings.xMax = Math.ceil(xMax + xPadding);
            this.settings.yMin = Math.floor(yMin - yPadding);
            this.settings.yMax = Math.ceil(yMax + yPadding);

            // Make square
            const maxRange = Math.max(this.settings.xMax - this.settings.xMin, this.settings.yMax - this.settings.yMin);
            const xCenter = (this.settings.xMax + this.settings.xMin) / 2;
            const yCenter = (this.settings.yMax + this.settings.yMin) / 2;
            
            this.settings.xMin = xCenter - maxRange / 2;
            this.settings.xMax = xCenter + maxRange / 2;
            this.settings.yMin = yCenter - maxRange / 2;
            this.settings.yMax = yCenter + maxRange / 2;

            // Smart grid spacing
            const range = maxRange;
            if (range <= 20) this.settings.gridSpacing = 1;
            else if (range <= 50) this.settings.gridSpacing = 5;
            else if (range <= 100) this.settings.gridSpacing = 10;
            else if (range <= 200) this.settings.gridSpacing = 20;
            else if (range <= 500) this.settings.gridSpacing = 50;
            else this.settings.gridSpacing = 100;
        }
    }

    /**
     * Apply payload settings
     */
    applyPayload(payload) {
        if (payload.window) {
            this.settings.xMin = payload.window.xMin ?? this.settings.xMin;
            this.settings.xMax = payload.window.xMax ?? this.settings.xMax;
            this.settings.yMin = payload.window.yMin ?? this.settings.yMin;
            this.settings.yMax = payload.window.yMax ?? this.settings.yMax;
        }

        if (payload.gridSpacing) this.settings.gridSpacing = payload.gridSpacing;
        if (payload.showGrid !== undefined) this.settings.showGrid = payload.showGrid;
        if (payload.showAxes !== undefined) this.settings.showAxes = payload.showAxes;
        if (payload.showLabels !== undefined) this.settings.showLabels = payload.showLabels;
    }

    /**
     * Render elements from payload
     */
    renderFromPayload(payload) {
        switch (payload.type) {
            case 'points':
                if (payload.points) {
                    payload.points.forEach(p => this.elements.points.push(p));
                }
                break;
            case 'line':
                this.elements.lines.push({
                    slope: payload.slope,
                    intercept: payload.intercept,
                    equation: payload.equation,
                    color: payload.color || this.settings.lineColor
                });
                // Keep existing points
                if (payload.points) {
                    payload.points.forEach(p => this.elements.points.push(p));
                }
                break;
            case 'function':
                this.elements.functions.push({
                    equation: payload.equation,
                    color: payload.color || this.settings.lineColor
                });
                if (payload.points) {
                    payload.points.forEach(p => this.elements.points.push(p));
                }
                break;
            case 'inequality':
                this.elements.inequalities.push({
                    equation: payload.equation,
                    color: this.inequalityColors[this.inequalityColorIndex % this.inequalityColors.length]
                });
                this.inequalityColorIndex++;
                if (payload.points) {
                    payload.points.forEach(p => this.elements.points.push(p));
                }
                break;
            case 'multi':
                if (payload.functions) {
                    payload.functions.forEach(f => {
                        this.elements.functions.push({
                            equation: f.equation,
                            color: f.color || this.settings.lineColor
                        });
                    });
                }
                if (payload.points) {
                    payload.points.forEach(p => this.elements.points.push(p));
                }
                break;
        }

        this.redraw();
    }

    /**
     * Create inline container
     */
    createInlineContainer() {
        const messages = document.querySelectorAll('.message.assistant');
        const lastMessage = messages[messages.length - 1];
        
        if (!lastMessage) {
            const container = document.getElementById('messages-container');
            const wrapper = document.createElement('div');
            wrapper.className = 'coordinate-grid-inline';
            wrapper.id = this.uniqueId;
            container.appendChild(wrapper);
            return wrapper;
        }

        const messageBody = lastMessage.querySelector('.msg-body');
        const wrapper = document.createElement('div');
        wrapper.className = 'coordinate-grid-inline';
        wrapper.id = this.uniqueId;
        messageBody.appendChild(wrapper);
        
        return wrapper;
    }

    /**
     * Create SVG
     */
    createSVG(container) {
        const { width, height, backgroundColor } = this.settings;

        this.svg = document.createElementNS(this.svgNS, 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.svg.style.background = backgroundColor;
        this.svg.style.borderRadius = '8px';
        this.svg.style.border = '2px solid rgba(212, 175, 55, 0.3)';

        const svgWrapper = document.createElement('div');
        svgWrapper.className = 'coordinate-grid-svg-wrapper';
        svgWrapper.appendChild(this.svg);
        container.appendChild(svgWrapper);

        this.enablePan();
    }

    /**
     * Draw grid
     */
    drawGrid() {
        const { xMin, xMax, yMin, yMax, gridSpacing, gridColor } = this.settings;

        const gridGroup = document.createElementNS(this.svgNS, 'g');
        gridGroup.setAttribute('class', 'grid');

        for (let x = Math.ceil(xMin / gridSpacing) * gridSpacing; x <= xMax; x += gridSpacing) {
            if (Math.abs(x) < gridSpacing / 2) continue;
            const line = this.createLine(this.toSVGX(x), this.toSVGY(yMax), this.toSVGX(x), this.toSVGY(yMin), gridColor, 1.5);
            gridGroup.appendChild(line);
        }

        for (let y = Math.ceil(yMin / gridSpacing) * gridSpacing; y <= yMax; y += gridSpacing) {
            if (Math.abs(y) < gridSpacing / 2) continue;
            const line = this.createLine(this.toSVGX(xMin), this.toSVGY(y), this.toSVGX(xMax), this.toSVGY(y), gridColor, 1.5);
            gridGroup.appendChild(line);
        }

        this.svg.appendChild(gridGroup);
    }

    /**
     * Draw axes
     */
    drawAxes() {
        const { xMin, xMax, yMin, yMax, axisColor, textColor, showLabels, fontSize, gridSpacing } = this.settings;

        const axesGroup = document.createElementNS(this.svgNS, 'g');
        axesGroup.setAttribute('class', 'axes');

        // X-axis
        if (yMin <= 0 && yMax >= 0) {
            const xAxisY = this.toSVGY(0);
            const xAxis = this.createLine(this.toSVGX(xMin), xAxisY, this.toSVGX(xMax), xAxisY, axisColor, 3);
            axesGroup.appendChild(xAxis);
        }

        // Y-axis
        if (xMin <= 0 && xMax >= 0) {
            const yAxisX = this.toSVGX(0);
            const yAxis = this.createLine(yAxisX, this.toSVGY(yMin), yAxisX, this.toSVGY(yMax), axisColor, 3);
            axesGroup.appendChild(yAxis);
        }

        if (showLabels) {
            // X-axis labels
            for (let x = Math.ceil(xMin / gridSpacing) * gridSpacing; x <= xMax; x += gridSpacing) {
                if (Math.abs(x) < gridSpacing / 2) continue;
                const svgX = this.toSVGX(x);
                const svgY = this.toSVGY(0) + 20;
                const text = this.createText(svgX, svgY, x.toString(), textColor, fontSize);
                text.setAttribute('font-weight', 'bold');
                axesGroup.appendChild(text);
            }

            // Y-axis labels
            for (let y = Math.ceil(yMin / gridSpacing) * gridSpacing; y <= yMax; y += gridSpacing) {
                if (Math.abs(y) < gridSpacing / 2) continue;
                const svgX = this.toSVGX(0) - 20;
                const svgY = this.toSVGY(y) + 5;
                const text = this.createText(svgX, svgY, y.toString(), textColor, fontSize);
                text.setAttribute('font-weight', 'bold');
                axesGroup.appendChild(text);
            }

            // Origin
            if (xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0) {
                const originText = this.createText(this.toSVGX(0) - 15, this.toSVGY(0) + 20, '0', textColor, fontSize);
                originText.setAttribute('font-weight', 'bold');
                axesGroup.appendChild(originText);
            }
        }

        this.svg.appendChild(axesGroup);
    }

    /**
     * Add interactive controls
     */
    addControls(container, payload) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'coordinate-grid-controls';

        // Tool buttons
        const pointBtn = this.createToolButton('📍 Plot Points', 'point');
        const lineBtn = this.createToolButton('📏 Draw Line', 'line');
        const deleteBtn = this.createToolButton('🗑️ Delete', 'delete');
        
        // Zoom controls
        const zoomIn = document.createElement('button');
        zoomIn.textContent = '🔍+';
        zoomIn.onclick = () => this.zoom(0.8);

        const zoomOut = document.createElement('button');
        zoomOut.textContent = '🔍−';
        zoomOut.onclick = () => this.zoom(1.25);

        const resetView = document.createElement('button');
        resetView.textContent = '🔄 Reset';
        resetView.onclick = () => this.resetView();

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save Graph';
        saveBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        saveBtn.onclick = () => this.saveGraph();

        // Download button
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '⬇️ Download PNG';
        downloadBtn.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
        downloadBtn.onclick = () => this.downloadAsPNG();

        controlsDiv.appendChild(pointBtn);
        controlsDiv.appendChild(lineBtn);
        controlsDiv.appendChild(deleteBtn);
        controlsDiv.appendChild(document.createElement('span')).textContent = '|';
        controlsDiv.appendChild(zoomIn);
        controlsDiv.appendChild(zoomOut);
        controlsDiv.appendChild(resetView);
        controlsDiv.appendChild(document.createElement('span')).textContent = '|';
        controlsDiv.appendChild(saveBtn);
        controlsDiv.appendChild(downloadBtn);

        const infoText = document.createElement('small');
        infoText.id = this.uniqueId + '-info';
        infoText.textContent = 'Select a tool and click on the grid';
        infoText.style.color = '#aaa';
        infoText.style.display = 'block';
        infoText.style.marginTop = '8px';
        controlsDiv.appendChild(infoText);

        container.insertBefore(controlsDiv, container.firstChild);

        // Set initial tool
        if (payload.interactive) {
            this.setTool('point');
        }
    }

    /**
     * Create tool button
     */
    createToolButton(label, tool) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.dataset.tool = tool;
        btn.onclick = () => this.setTool(tool);
        return btn;
    }

    /**
     * Set active tool
     */
    setTool(tool) {
        this.interactiveMode = tool;
        this.drawingState = null;

        // Update button styles
        document.querySelectorAll('.coordinate-grid-controls button[data-tool]').forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.style.background = 'linear-gradient(135deg, #d4af37, #f1c40f)';
                btn.style.color = '#000';
            } else {
                btn.style.background = 'linear-gradient(135deg, #34495e, #46627f)';
                btn.style.color = '#fff';
            }
        });

        // Update cursor and info
        const infoEl = document.getElementById(this.uniqueId + '-info');
        switch (tool) {
            case 'point':
                this.svg.style.cursor = 'crosshair';
                if (infoEl) infoEl.textContent = 'Click to plot points';
                break;
            case 'line':
                this.svg.style.cursor = 'crosshair';
                if (infoEl) infoEl.textContent = 'Click two points to draw a line';
                break;
            case 'delete':
                this.svg.style.cursor = 'not-allowed';
                if (infoEl) infoEl.textContent = 'Click a point to delete it';
                break;
        }
    }

    /**
     * Enable interactive mode
     */
    enableInteractive() {
        this.svg.onclick = (e) => {
            if (this.isPanning) return;

            const rect = this.svg.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * this.settings.width;
            const svgY = ((e.clientY - rect.top) / rect.height) * this.settings.height;

            const mathX = this.toMathX(svgX);
            const mathY = this.toMathY(svgY);

            const roundedX = Math.round(mathX * 2) / 2;
            const roundedY = Math.round(mathY * 2) / 2;

            switch (this.interactiveMode) {
                case 'point':
                    this.elements.points.push([roundedX, roundedY, `(${roundedX}, ${roundedY})`]);
                    this.redraw();
                    break;
                
                case 'line':
                    if (!this.drawingState) {
                        this.drawingState = { x1: roundedX, y1: roundedY };
                        const infoEl = document.getElementById(this.uniqueId + '-info');
                        if (infoEl) infoEl.textContent = 'Click the second point';
                    } else {
                        const { x1, y1 } = this.drawingState;
                        const slope = (roundedY - y1) / (roundedX - x1);
                        const intercept = y1 - slope * x1;
                        const equation = `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`;
                        
                        this.elements.lines.push({ slope, intercept, equation, color: this.settings.lineColor });
                        this.drawingState = null;
                        this.redraw();
                        
                        const infoEl = document.getElementById(this.uniqueId + '-info');
                        if (infoEl) infoEl.textContent = 'Click two points to draw another line';
                    }
                    break;

                case 'delete':
                    // Find nearest point
                    let nearestIndex = -1;
                    let minDist = Infinity;
                    this.elements.points.forEach((p, i) => {
                        const dist = Math.sqrt((p[0] - roundedX) ** 2 + (p[1] - roundedY) ** 2);
                        if (dist < minDist && dist < 1) {
                            minDist = dist;
                            nearestIndex = i;
                        }
                    });
                    if (nearestIndex >= 0) {
                        this.elements.points.splice(nearestIndex, 1);
                        this.redraw();
                    }
                    break;
            }
        };
    }

    /**
     * Save graph (makes it persistent)
     */
    saveGraph() {
        const container = document.getElementById(this.uniqueId);
        if (container) {
            container.dataset.saved = 'true';
            alert('Graph saved! It will not be replaced when you create a new graph.');
        }
    }

    /**
     * Download as PNG
     */
    async downloadAsPNG() {
        try {
            const svgData = new XMLSerializer().serializeToString(this.svg);
            const canvas = document.createElement('canvas');
            canvas.width = this.settings.width;
            canvas.height = this.settings.height;
            const ctx = canvas.getContext('2d');

            const img = new Image();
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(blob => {
                    const link = document.createElement('a');
                    link.download = `coordinate-grid-${Date.now()}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(url);
                });
            };

            img.src = url;
        } catch (e) {
            console.error('Download error:', e);
            alert('Could not download image. Try taking a screenshot instead.');
        }
    }

    /**
     * Zoom
     */
    zoom(factor) {
        const xCenter = (this.settings.xMax + this.settings.xMin) / 2;
        const yCenter = (this.settings.yMax + this.settings.yMin) / 2;
        const xRange = (this.settings.xMax - this.settings.xMin) * factor;
        const yRange = (this.settings.yMax - this.settings.yMin) * factor;

        this.settings.xMin = xCenter - xRange / 2;
        this.settings.xMax = xCenter + xRange / 2;
        this.settings.yMin = yCenter - yRange / 2;
        this.settings.yMax = yCenter + yRange / 2;

        this.redraw();
    }

    /**
     * Reset view
     */
    resetView() {
        this.autoScale({ type: 'points', points: this.elements.points });
        this.redraw();
    }

    /**
     * Enable pan
     */
    enablePan() {
        this.svg.addEventListener('mousedown', (e) => {
            if (this.interactiveMode !== 'point' && this.interactiveMode !== 'line' && this.interactiveMode !== 'delete') {
                this.isPanning = true;
                this.lastPanPoint = { x: e.clientX, y: e.clientY };
                this.svg.style.cursor = 'grabbing';
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (!this.isPanning) return;

            const dx = e.clientX - this.lastPanPoint.x;
            const dy = e.clientY - this.lastPanPoint.y;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };

            const xRange = this.settings.xMax - this.settings.xMin;
            const yRange = this.settings.yMax - this.settings.yMin;
            const xShift = -(dx / this.settings.width) * xRange;
            const yShift = (dy / this.settings.height) * yRange;

            this.settings.xMin += xShift;
            this.settings.xMax += xShift;
            this.settings.yMin += yShift;
            this.settings.yMax += yShift;

            this.redraw();
        });

        this.svg.addEventListener('mouseup', () => {
            this.isPanning = false;
            this.svg.style.cursor = this.interactiveMode === 'point' || this.interactiveMode === 'line' ? 'crosshair' : 'default';
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isPanning = false;
        });
    }

    /**
     * Redraw entire graph
     */
    redraw() {
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }

        if (this.settings.showGrid) this.drawGrid();
        if (this.settings.showAxes) this.drawAxes();

        // Render inequalities first (background)
        this.elements.inequalities.forEach(ineq => this.renderInequality(ineq.equation, ineq.color));

        // Render lines
        this.elements.lines.forEach(line => {
            const originalColor = this.settings.lineColor;
            this.settings.lineColor = line.color;
            this.renderLine(line.slope, line.intercept, line.equation);
            this.settings.lineColor = originalColor;
        });

        // Render functions
        this.elements.functions.forEach(func => {
            const originalColor = this.settings.lineColor;
            this.settings.lineColor = func.color;
            this.renderFunction(func.equation);
            this.settings.lineColor = originalColor;
        });

        // Render points last (foreground)
        if (this.elements.points.length > 0) {
            this.renderPoints(this.elements.points);
        }
    }

    /**
     * Render points
     */
    renderPoints(points) {
        const pointsGroup = document.createElementNS(this.svgNS, 'g');
        pointsGroup.setAttribute('class', 'points');

        points.forEach((point, index) => {
            const [x, y, label] = point;
            const svgX = this.toSVGX(x);
            const svgY = this.toSVGY(y);

            const circle = document.createElementNS(this.svgNS, 'circle');
            circle.setAttribute('cx', svgX);
            circle.setAttribute('cy', svgY);
            circle.setAttribute('r', this.settings.pointRadius);
            circle.setAttribute('fill', this.settings.pointColor);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', 2.5);
            pointsGroup.appendChild(circle);

            if (label || this.settings.showLabels) {
                const labelText = label || `(${x}, ${y})`;
                const text = this.createText(svgX + 12, svgY - 12, labelText, this.settings.textColor, this.settings.fontSize + 2);
                text.setAttribute('font-weight', 'bold');
                
                const bbox = text.getBBox();
                const rect = document.createElementNS(this.svgNS, 'rect');
                rect.setAttribute('x', bbox.x - 4);
                rect.setAttribute('y', bbox.y - 2);
                rect.setAttribute('width', bbox.width + 8);
                rect.setAttribute('height', bbox.height + 4);
                rect.setAttribute('fill', 'rgba(0, 0, 0, 0.7)');
                rect.setAttribute('rx', 4);
                
                pointsGroup.appendChild(rect);
                pointsGroup.appendChild(text);
            }
        });

        this.svg.appendChild(pointsGroup);
    }

    /**
     * Render line
     */
    renderLine(slope, intercept, equation) {
        const { xMin, xMax, lineColor } = this.settings;

        const x1 = xMin;
        const y1 = slope * x1 + intercept;
        const x2 = xMax;
        const y2 = slope * x2 + intercept;

        const line = this.createLine(this.toSVGX(x1), this.toSVGY(y1), this.toSVGX(x2), this.toSVGY(y2), lineColor, 4);
        this.svg.appendChild(line);

        if (equation && this.settings.showLabels) {
            const midX = (xMin + xMax) / 2;
            const midY = slope * midX + intercept;
            
            // Offset label to avoid overlap
            const labelY = this.toSVGY(midY) - 25 - (this.elements.functions.length * 20);

            const text = this.createText(this.toSVGX(midX), labelY, equation, this.settings.textColor, this.settings.fontSize + 4);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');

            const bbox = text.getBBox();
            const rect = document.createElementNS(this.svgNS, 'rect');
            rect.setAttribute('x', bbox.x - 6);
            rect.setAttribute('y', bbox.y - 3);
            rect.setAttribute('width', bbox.width + 12);
            rect.setAttribute('height', bbox.height + 6);
            rect.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
            rect.setAttribute('rx', 6);

            this.svg.appendChild(rect);
            this.svg.appendChild(text);
        }
    }

    /**
     * Render function
     */
    renderFunction(equation) {
        const { xMin, xMax, lineColor } = this.settings;
        const func = this.parseEquation(equation);
        const points = [];
        const step = (xMax - xMin) / 300;

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y) && !isNaN(y)) points.push([x, y]);
            } catch (e) {}
        }

        if (points.length > 1) {
            const pathData = points.map((p, i) => {
                return i === 0 ? `M ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}` : `L ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}`;
            }).join(' ');

            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', lineColor);
            path.setAttribute('stroke-width', 4);
            path.setAttribute('fill', 'none');
            this.svg.appendChild(path);

            if (this.settings.showLabels) {
                const midX = (xMin + xMax) / 2;
                const midY = func(midX);
                const labelY = this.toSVGY(midY) - 25 - (this.elements.functions.length * 20);

                const text = this.createText(this.toSVGX(midX), labelY, equation, this.settings.textColor, this.settings.fontSize + 4);
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('text-anchor', 'middle');

                const bbox = text.getBBox();
                const rect = document.createElementNS(this.svgNS, 'rect');
                rect.setAttribute('x', bbox.x - 6);
                rect.setAttribute('y', bbox.y - 3);
                rect.setAttribute('width', bbox.width + 12);
                rect.setAttribute('height', bbox.height + 6);
                rect.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
                rect.setAttribute('rx', 6);

                this.svg.appendChild(rect);
                this.svg.appendChild(text);
            }
        }
    }

    /**
     * Render inequality with COLORED shading
     */
    renderInequality(equation, color) {
        const match = equation.match(/(y)\s*([<>]=?)\s*(.+)/);
        if (!match) return;

        const [, , operator, rightSide] = match;
        const func = this.parseEquation(`y = ${rightSide}`);
        const { xMin, xMax, yMin, yMax } = this.settings;
        
        const points = [];
        const step = (xMax - xMin) / 200;

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y)) points.push([x, y]);
            } catch (e) {}
        }

        if (points.length > 1) {
            // Draw boundary line
            const pathData = points.map((p, i) => {
                return i === 0 ? `M ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}` : `L ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}`;
            }).join(' ');

            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', this.settings.lineColor);
            path.setAttribute('stroke-width', 3);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', operator.includes('=') ? 'none' : '8,8');
            this.svg.appendChild(path);

            // Shade region with COLOR
            const shadeAbove = operator.includes('>');
            const shadePoints = [...points];
            
            if (shadeAbove) {
                shadePoints.push([xMax, yMax]);
                shadePoints.push([xMin, yMax]);
            } else {
                shadePoints.push([xMax, yMin]);
                shadePoints.push([xMin, yMin]);
            }

            const shadeData = shadePoints.map((p, i) => {
                return i === 0 ? `M ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}` : `L ${this.toSVGX(p[0])} ${this.toSVGY(p[1])}`;
            }).join(' ') + ' Z';

            const shadePath = document.createElementNS(this.svgNS, 'path');
            shadePath.setAttribute('d', shadeData);
            shadePath.setAttribute('fill', color);
            this.svg.insertBefore(shadePath, this.svg.firstChild);
        }
    }

    /**
     * Parse equation
     */
    parseEquation(equation) {
        let expr = equation.split('=')[1]?.trim() || equation;
        expr = expr.replace(/\^/g, '**');
        expr = expr.replace(/(\d)x/g, '$1*x');
        expr = expr.replace(/\)x/g, ')*x');
        expr = expr.replace(/x\(/g, 'x*(');

        try {
            return new Function('x', `return ${expr};`);
        } catch (e) {
            console.error('Equation parse error:', e);
            return (x) => 0;
        }
    }

    // Coordinate transformations
    toSVGX(x) {
        const { width, padding, xMin, xMax } = this.settings;
        return padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    }

    toSVGY(y) {
        const { height, padding, yMin, yMax } = this.settings;
        return height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);
    }

    toMathX(svgX) {
        const { width, padding, xMin, xMax } = this.settings;
        return xMin + ((svgX - padding) / (width - 2 * padding)) * (xMax - xMin);
    }

    toMathY(svgY) {
        const { height, padding, yMin, yMax } = this.settings;
        return yMin + ((height - padding - svgY) / (height - 2 * padding)) * (yMax - yMin);
    }

    createLine(x1, y1, x2, y2, stroke, strokeWidth) {
        const line = document.createElementNS(this.svgNS, 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-width', strokeWidth);
        return line;
    }

    createText(x, y, content, fill, fontSize) {
        const text = document.createElementNS(this.svgNS, 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('fill', fill);
        text.setAttribute('font-size', fontSize);
        text.setAttribute('font-family', 'Arial, sans-serif');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = content;
        return text;
    }

    generateSummary(payload) {
        let summary = 'Displayed coordinate grid';
        if (payload.type === 'points') summary = `Plotted ${payload.points?.length || 0} point(s)`;
        else if (payload.type === 'line') summary = `Graphed line ${payload.equation}`;
        else if (payload.type === 'function') summary = `Graphed function ${payload.equation}`;
        else if (payload.type === 'inequality') summary = `Displayed inequality ${payload.equation}`;
        return summary;
    }
}

window.CoordinateGrid = CoordinateGrid;
