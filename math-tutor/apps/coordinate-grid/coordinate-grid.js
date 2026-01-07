/**
 * CoordinateGrid App - Enhanced Version
 * Interactive coordinate plane with zoom, pan, and inline display
 */

class CoordinateGrid {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svgNS = "http://www.w3.org/2000/svg";
        
        // Default settings - LARGER and SQUARE
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
        this.panOffset = { x: 0, y: 0 };
        this.isPanning = false;
        this.lastPanPoint = { x: 0, y: 0 };
        this.currentPoints = [];
        this.interactiveMode = false;
        this.uniqueId = 'grid-' + Date.now();
    }

    /**
     * Main render function - INLINE display in chat
     * @param {Object} payload - Configuration from LLM
     * @returns {Object} Status and summary
     */
    async render(payload) {
        try {
            // Apply payload settings
            this.applyPayload(payload);

            // Check if this should replace existing graph
            const existingContainer = document.querySelector('.coordinate-grid-inline');
            if (existingContainer && !payload.keepPrevious) {
                existingContainer.remove();
            }

            // Create inline container in CHAT (not popup)
            const inlineContainer = this.createInlineContainer();
            
            // Create SVG with proper aspect ratio
            this.createSVG(inlineContainer);

            // Render based on type
            switch (payload.type) {
                case 'points':
                    this.renderPoints(payload.points);
                    break;
                case 'line':
                    this.renderLine(payload.slope, payload.intercept, payload.equation);
                    break;
                case 'function':
                    this.renderFunction(payload.equation);
                    break;
                case 'inequality':
                    this.renderInequality(payload.equation, payload.shadeRegion);
                    break;
                case 'multi':
                    this.renderMultiple(payload.functions);
                    break;
                default:
                    this.renderPoints(payload.points || []);
            }

            // Add controls (zoom, pan, interactive)
            this.addControls(inlineContainer, payload);

            // Enable interactive mode if requested
            if (payload.interactive) {
                this.enableInteractive();
            }

            // Generate summary
            const summary = this.generateSummary(payload);

            return {
                status: 'success',
                appId: 'CoordinateGrid',
                summary: summary,
                output: {
                    type: 'inline',
                    containerId: this.uniqueId
                }
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
     * Create inline container in the LAST message
     */
    createInlineContainer() {
        // Find the last assistant message
        const messages = document.querySelectorAll('.message.assistant');
        const lastMessage = messages[messages.length - 1];
        
        if (!lastMessage) {
            // Fallback: create in messages container
            const container = document.getElementById('messages-container');
            const wrapper = document.createElement('div');
            wrapper.className = 'coordinate-grid-inline';
            wrapper.id = this.uniqueId;
            container.appendChild(wrapper);
            return wrapper;
        }

        // Insert into the message body
        const messageBody = lastMessage.querySelector('.msg-body');
        const wrapper = document.createElement('div');
        wrapper.className = 'coordinate-grid-inline';
        wrapper.id = this.uniqueId;
        messageBody.appendChild(wrapper);
        
        return wrapper;
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

        // Ensure SQUARE aspect ratio
        const xRange = this.settings.xMax - this.settings.xMin;
        const yRange = this.settings.yMax - this.settings.yMin;
        
        if (xRange !== yRange) {
            // Adjust to make square
            const maxRange = Math.max(xRange, yRange);
            const xCenter = (this.settings.xMax + this.settings.xMin) / 2;
            const yCenter = (this.settings.yMax + this.settings.yMin) / 2;
            
            this.settings.xMin = xCenter - maxRange / 2;
            this.settings.xMax = xCenter + maxRange / 2;
            this.settings.yMin = yCenter - maxRange / 2;
            this.settings.yMax = yCenter + maxRange / 2;
        }

        if (payload.gridSpacing) this.settings.gridSpacing = payload.gridSpacing;
        if (payload.showGrid !== undefined) this.settings.showGrid = payload.showGrid;
        if (payload.showAxes !== undefined) this.settings.showAxes = payload.showAxes;
        if (payload.showLabels !== undefined) this.settings.showLabels = payload.showLabels;
        
        this.interactiveMode = payload.interactive || false;
    }

    /**
     * Create base SVG element with grid and axes
     */
    createSVG(container) {
        const { width, height, backgroundColor } = this.settings;

        // Create SVG with viewBox for responsiveness
        this.svg = document.createElementNS(this.svgNS, 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        this.svg.style.background = backgroundColor;
        this.svg.style.borderRadius = '8px';
        this.svg.style.border = '2px solid rgba(212, 175, 55, 0.3)';
        this.svg.style.maxWidth = '100%';
        this.svg.style.height = 'auto';
        this.svg.style.cursor = 'default';

        // Add grid
        if (this.settings.showGrid) {
            this.drawGrid();
        }

        // Add axes
        if (this.settings.showAxes) {
            this.drawAxes();
        }

        // Create SVG wrapper for proper sizing
        const svgWrapper = document.createElement('div');
        svgWrapper.className = 'coordinate-grid-svg-wrapper';
        svgWrapper.appendChild(this.svg);
        container.appendChild(svgWrapper);

        // Enable pan on the SVG
        this.enablePan();
    }

    /**
     * Draw coordinate grid with LARGER, MORE VISIBLE lines
     */
    drawGrid() {
        const { xMin, xMax, yMin, yMax, gridSpacing, gridColor } = this.settings;

        const gridGroup = document.createElementNS(this.svgNS, 'g');
        gridGroup.setAttribute('class', 'grid');

        // Vertical lines
        for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += gridSpacing) {
            if (x === 0) continue;
            const x1 = this.toSVGX(x);
            const y1 = this.toSVGY(yMax);
            const y2 = this.toSVGY(yMin);

            const line = this.createLine(x1, y1, x1, y2, gridColor, 1.5);
            gridGroup.appendChild(line);
        }

        // Horizontal lines
        for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += gridSpacing) {
            if (y === 0) continue;
            const x1 = this.toSVGX(xMin);
            const x2 = this.toSVGX(xMax);
            const y1 = this.toSVGY(y);

            const line = this.createLine(x1, y1, x2, y1, gridColor, 1.5);
            gridGroup.appendChild(line);
        }

        this.svg.appendChild(gridGroup);
    }

    /**
     * Draw x and y axes with LARGER labels
     */
    drawAxes() {
        const { xMin, xMax, yMin, yMax, axisColor, textColor, showLabels, fontSize } = this.settings;

        const axesGroup = document.createElementNS(this.svgNS, 'g');
        axesGroup.setAttribute('class', 'axes');

        // X-axis
        const xAxisY = this.toSVGY(0);
        const xAxis = this.createLine(
            this.toSVGX(xMin), xAxisY,
            this.toSVGX(xMax), xAxisY,
            axisColor, 3
        );
        axesGroup.appendChild(xAxis);

        // Y-axis
        const yAxisX = this.toSVGX(0);
        const yAxis = this.createLine(
            yAxisX, this.toSVGY(yMin),
            yAxisX, this.toSVGY(yMax),
            axisColor, 3
        );
        axesGroup.appendChild(yAxis);

        // Axis labels - LARGER FONT
        if (showLabels) {
            // X-axis labels
            for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += this.settings.gridSpacing) {
                if (x === 0) continue;
                const svgX = this.toSVGX(x);
                const svgY = this.toSVGY(0) + 20;

                const text = this.createText(svgX, svgY, x.toString(), textColor, fontSize);
                text.setAttribute('font-weight', 'bold');
                axesGroup.appendChild(text);
            }

            // Y-axis labels
            for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += this.settings.gridSpacing) {
                if (y === 0) continue;
                const svgX = this.toSVGX(0) - 20;
                const svgY = this.toSVGY(y) + 5;

                const text = this.createText(svgX, svgY, y.toString(), textColor, fontSize);
                text.setAttribute('font-weight', 'bold');
                axesGroup.appendChild(text);
            }

            // Origin label
            const originText = this.createText(
                this.toSVGX(0) - 15,
                this.toSVGY(0) + 20,
                '0',
                textColor,
                fontSize
            );
            originText.setAttribute('font-weight', 'bold');
            axesGroup.appendChild(originText);
        }

        this.svg.appendChild(axesGroup);
    }

    /**
     * Add zoom and control buttons
     */
    addControls(container, payload) {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'coordinate-grid-controls';

        // Zoom controls
        const zoomIn = document.createElement('button');
        zoomIn.textContent = '🔍 Zoom In';
        zoomIn.onclick = () => this.zoom(0.8);

        const zoomOut = document.createElement('button');
        zoomOut.textContent = '🔍 Zoom Out';
        zoomOut.onclick = () => this.zoom(1.25);

        const resetView = document.createElement('button');
        resetView.textContent = '🔄 Reset View';
        resetView.onclick = () => this.resetView();

        // Interactive toggle
        const interactiveBtn = document.createElement('button');
        interactiveBtn.textContent = this.interactiveMode ? '✏️ Interactive ON' : '✏️ Enable Interactive';
        interactiveBtn.onclick = () => {
            this.interactiveMode = !this.interactiveMode;
            interactiveBtn.textContent = this.interactiveMode ? '✏️ Interactive ON' : '✏️ Enable Interactive';
            if (this.interactiveMode) {
                this.enableInteractive();
            } else {
                this.disableInteractive();
            }
        };

        controlsDiv.appendChild(zoomIn);
        controlsDiv.appendChild(zoomOut);
        controlsDiv.appendChild(resetView);
        controlsDiv.appendChild(interactiveBtn);

        // Info text
        const infoText = document.createElement('small');
        infoText.textContent = 'Drag to pan • Click to plot points (interactive mode)';
        infoText.style.color = '#aaa';
        infoText.style.marginLeft = '10px';
        controlsDiv.appendChild(infoText);

        container.insertBefore(controlsDiv, container.firstChild);
    }

    /**
     * Zoom in/out
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
     * Reset to original view
     */
    resetView() {
        this.settings.xMin = -10;
        this.settings.xMax = 10;
        this.settings.yMin = -10;
        this.settings.yMax = 10;
        this.zoomLevel = 1;
        this.panOffset = { x: 0, y: 0 };
        this.redraw();
    }

    /**
     * Enable pan (drag to move)
     */
    enablePan() {
        this.svg.addEventListener('mousedown', (e) => {
            if (this.interactiveMode) return; // Don't pan in interactive mode
            this.isPanning = true;
            this.lastPanPoint = { x: e.clientX, y: e.clientY };
            this.svg.style.cursor = 'grabbing';
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
            this.svg.style.cursor = 'default';
        });

        this.svg.addEventListener('mouseleave', () => {
            this.isPanning = false;
            this.svg.style.cursor = 'default';
        });
    }

    /**
     * Redraw the entire graph
     */
    redraw() {
        // Clear SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }

        // Redraw grid and axes
        if (this.settings.showGrid) this.drawGrid();
        if (this.settings.showAxes) this.drawAxes();

        // Redraw points if any
        if (this.currentPoints.length > 0) {
            this.renderPoints(this.currentPoints);
        }
    }

    /**
     * Render points with LARGER circles and labels
     */
    renderPoints(points) {
        if (!points || points.length === 0) return;

        const pointsGroup = document.createElementNS(this.svgNS, 'g');
        pointsGroup.setAttribute('class', 'points');

        points.forEach((point, index) => {
            const [x, y, label] = point;
            const svgX = this.toSVGX(x);
            const svgY = this.toSVGY(y);

            // Draw point - LARGER
            const circle = document.createElementNS(this.svgNS, 'circle');
            circle.setAttribute('cx', svgX);
            circle.setAttribute('cy', svgY);
            circle.setAttribute('r', this.settings.pointRadius);
            circle.setAttribute('fill', this.settings.pointColor);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', 2.5);
            circle.setAttribute('data-point-index', index);
            circle.setAttribute('data-x', x);
            circle.setAttribute('data-y', y);
            pointsGroup.appendChild(circle);

            // Draw label - LARGER FONT
            if (label || this.settings.showLabels) {
                const labelText = label || `(${x}, ${y})`;
                const text = this.createText(
                    svgX + 12,
                    svgY - 12,
                    labelText,
                    this.settings.textColor,
                    this.settings.fontSize + 2
                );
                text.setAttribute('font-weight', 'bold');
                
                // Background for readability
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
        this.currentPoints = points;
    }

    /**
     * Render a linear function (line) with THICKER stroke
     */
    renderLine(slope, intercept, equation) {
        const { xMin, xMax, lineColor } = this.settings;

        const x1 = xMin;
        const y1 = slope * x1 + intercept;
        const x2 = xMax;
        const y2 = slope * x2 + intercept;

        const line = this.createLine(
            this.toSVGX(x1), this.toSVGY(y1),
            this.toSVGX(x2), this.toSVGY(y2),
            lineColor, 4
        );

        this.svg.appendChild(line);

        // Add equation label with LARGER font
        if (equation && this.settings.showLabels) {
            const labelX = this.toSVGX((xMin + xMax) / 2);
            const labelY = this.toSVGY(slope * ((xMin + xMax) / 2) + intercept) - 20;

            const text = this.createText(labelX, labelY, equation, this.settings.textColor, this.settings.fontSize + 4);
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
     * Render a function (quadratic, exponential, etc.) with THICKER stroke
     */
    renderFunction(equation) {
        const { xMin, xMax, lineColor } = this.settings;

        const func = this.parseEquation(equation);
        const points = [];
        const step = (xMax - xMin) / 300; // More points for smoother curve

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y) && !isNaN(y)) {
                    points.push([x, y]);
                }
            } catch (e) {}
        }

        if (points.length > 1) {
            const pathData = points.map((point, index) => {
                const [x, y] = point;
                const svgX = this.toSVGX(x);
                const svgY = this.toSVGY(y);
                return index === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`;
            }).join(' ');

            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', lineColor);
            path.setAttribute('stroke-width', 4);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');

            this.svg.appendChild(path);

            // Add equation label
            if (this.settings.showLabels) {
                const midX = this.toSVGX((xMin + xMax) / 2);
                const midY = this.toSVGY(func((xMin + xMax) / 2)) - 25;

                const text = this.createText(midX, midY, equation, this.settings.textColor, this.settings.fontSize + 4);
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
     * Render inequality with shaded region
     */
    renderInequality(equation, shadeRegion = 'above') {
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
            const pathData = points.map((point, index) => {
                const [x, y] = point;
                return index === 0 
                    ? `M ${this.toSVGX(x)} ${this.toSVGY(y)}` 
                    : `L ${this.toSVGX(x)} ${this.toSVGY(y)}`;
            }).join(' ');

            const path = document.createElementNS(this.svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', this.settings.lineColor);
            path.setAttribute('stroke-width', 3);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', operator.includes('=') ? 'none' : '8,8');
            this.svg.appendChild(path);

            // Shade region
            const shadeAbove = operator.includes('>');
            const shadePoints = [...points];
            
            if (shadeAbove) {
                shadePoints.push([xMax, yMax]);
                shadePoints.push([xMin, yMax]);
            } else {
                shadePoints.push([xMax, yMin]);
                shadePoints.push([xMin, yMin]);
            }

            const shadeData = shadePoints.map((point, index) => {
                const [x, y] = point;
                return index === 0 
                    ? `M ${this.toSVGX(x)} ${this.toSVGY(y)}` 
                    : `L ${this.toSVGX(x)} ${this.toSVGY(y)}`;
            }).join(' ') + ' Z';

            const shadePath = document.createElementNS(this.svgNS, 'path');
            shadePath.setAttribute('d', shadeData);
            shadePath.setAttribute('fill', 'rgba(0, 212, 255, 0.2)');
            this.svg.insertBefore(shadePath, this.svg.firstChild.nextSibling);
        }
    }

    /**
     * Render multiple functions
     */
    renderMultiple(functions) {
        functions.forEach((func, index) => {
            const originalColor = this.settings.lineColor;
            if (func.color) this.settings.lineColor = func.color;
            
            this.renderFunction(func.equation);
            
            this.settings.lineColor = originalColor;
        });
    }

    /**
     * Enable interactive mode - click to add points
     */
    enableInteractive() {
        this.interactiveMode = true;
        this.svg.style.cursor = 'crosshair';

        // Click to add points
        this.svg.onclick = (e) => {
            if (this.isPanning) return;

            const rect = this.svg.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * this.settings.width;
            const svgY = ((e.clientY - rect.top) / rect.height) * this.settings.height;

            const mathX = this.toMathX(svgX);
            const mathY = this.toMathY(svgY);

            // Round to nearest 0.5
            const roundedX = Math.round(mathX * 2) / 2;
            const roundedY = Math.round(mathY * 2) / 2;

            this.currentPoints.push([roundedX, roundedY, `(${roundedX}, ${roundedY})`]);
            this.redraw();
        };
    }

    /**
     * Disable interactive mode
     */
    disableInteractive() {
        this.interactiveMode = false;
        this.svg.style.cursor = 'default';
        this.svg.onclick = null;
    }

    /**
     * Parse equation string into executable function
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

    /**
     * Coordinate transformations
     */
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

    /**
     * Helper: Create SVG line element
     */
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

    /**
     * Helper: Create SVG text element
     */
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

    /**
     * Generate summary for LLM context
     */
    generateSummary(payload) {
        let summary = 'Displayed coordinate grid';

        switch (payload.type) {
            case 'points':
                const pointCount = payload.points?.length || 0;
                summary = `Plotted ${pointCount} point${pointCount !== 1 ? 's' : ''} on coordinate plane`;
                break;
            case 'line':
                summary = `Graphed line with equation ${payload.equation || `y = ${payload.slope}x + ${payload.intercept}`}`;
                break;
            case 'function':
                summary = `Graphed function ${payload.equation}`;
                break;
            case 'inequality':
                summary = `Displayed inequality ${payload.equation} with shaded region`;
                break;
            case 'multi':
                summary = `Graphed ${payload.functions?.length || 0} functions on same grid`;
                break;
        }

        return summary;
    }
}

// Export for global access
window.CoordinateGrid = CoordinateGrid;
