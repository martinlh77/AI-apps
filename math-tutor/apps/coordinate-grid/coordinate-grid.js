/**
 * CoordinateGrid App
 * Interactive coordinate plane for plotting points, lines, and functions
 */

class CoordinateGrid {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svgNS = "http://www.w3.org/2000/svg";
        
        // Default settings
        this.settings = {
            width: 500,
            height: 500,
            padding: 40,
            xMin: -10,
            xMax: 10,
            yMin: -10,
            yMax: 10,
            gridSpacing: 1,
            showGrid: true,
            showAxes: true,
            showLabels: true,
            axisColor: 'rgba(255, 255, 255, 0.3)',
            gridColor: 'rgba(255, 255, 255, 0.1)',
            pointColor: '#ff0055',
            lineColor: '#00d4ff',
            textColor: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
        };

        this.dragEnabled = false;
        this.currentPoints = [];
    }

    /**
     * Main render function - processes payload and displays visualization
     * @param {Object} payload - Configuration from LLM
     * @returns {Object} Status and summary
     */
    async render(payload) {
        try {
            // Merge payload with defaults
            this.applyPayload(payload);

            // Create SVG container
            this.createSVG();

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

            // Add interactivity if requested
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
                    type: 'svg',
                    containerId: this.container.id
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
     * Apply payload settings to internal config
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
     * Create base SVG element with grid and axes
     */
    createSVG() {
        const { width, height, backgroundColor } = this.settings;

        // Clear container
        this.container.innerHTML = '';

        // Create SVG
        this.svg = document.createElementNS(this.svgNS, 'svg');
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.style.background = backgroundColor;
        this.svg.style.borderRadius = '8px';
        this.svg.style.border = '1px solid rgba(255, 255, 255, 0.2)';

        // Add grid
        if (this.settings.showGrid) {
            this.drawGrid();
        }

        // Add axes
        if (this.settings.showAxes) {
            this.drawAxes();
        }

        this.container.appendChild(this.svg);
    }

    /**
     * Draw coordinate grid
     */
    drawGrid() {
        const { xMin, xMax, yMin, yMax, gridSpacing, gridColor } = this.settings;

        const gridGroup = document.createElementNS(this.svgNS, 'g');
        gridGroup.setAttribute('class', 'grid');

        // Vertical lines
        for (let x = xMin; x <= xMax; x += gridSpacing) {
            if (x === 0) continue; // Skip axis
            const x1 = this.toSVGX(x);
            const y1 = this.toSVGY(yMin);
            const y2 = this.toSVGY(yMax);

            const line = this.createLine(x1, y1, x1, y2, gridColor, 1);
            gridGroup.appendChild(line);
        }

        // Horizontal lines
        for (let y = yMin; y <= yMax; y += gridSpacing) {
            if (y === 0) continue; // Skip axis
            const x1 = this.toSVGX(xMin);
            const x2 = this.toSVGX(xMax);
            const y1 = this.toSVGY(y);

            const line = this.createLine(x1, y1, x2, y1, gridColor, 1);
            gridGroup.appendChild(line);
        }

        this.svg.appendChild(gridGroup);
    }

    /**
     * Draw x and y axes
     */
    drawAxes() {
        const { xMin, xMax, yMin, yMax, axisColor, textColor, showLabels } = this.settings;

        const axesGroup = document.createElementNS(this.svgNS, 'g');
        axesGroup.setAttribute('class', 'axes');

        // X-axis
        const xAxisY = this.toSVGY(0);
        const xAxis = this.createLine(
            this.toSVGX(xMin), xAxisY,
            this.toSVGX(xMax), xAxisY,
            axisColor, 2
        );
        axesGroup.appendChild(xAxis);

        // Y-axis
        const yAxisX = this.toSVGX(0);
        const yAxis = this.createLine(
            yAxisX, this.toSVGY(yMin),
            yAxisX, this.toSVGY(yMax),
            axisColor, 2
        );
        axesGroup.appendChild(yAxis);

        // Axis labels
        if (showLabels) {
            // X-axis labels
            for (let x = xMin; x <= xMax; x += this.settings.gridSpacing) {
                if (x === 0) continue;
                const svgX = this.toSVGX(x);
                const svgY = this.toSVGY(0) + 15;

                const text = this.createText(svgX, svgY, x.toString(), textColor, 10);
                axesGroup.appendChild(text);
            }

            // Y-axis labels
            for (let y = yMin; y <= yMax; y += this.settings.gridSpacing) {
                if (y === 0) continue;
                const svgX = this.toSVGX(0) - 15;
                const svgY = this.toSVGY(y) + 4;

                const text = this.createText(svgX, svgY, y.toString(), textColor, 10);
                axesGroup.appendChild(text);
            }

            // Origin label
            const originText = this.createText(
                this.toSVGX(0) - 12,
                this.toSVGY(0) + 15,
                '0',
                textColor,
                10
            );
            axesGroup.appendChild(originText);
        }

        this.svg.appendChild(axesGroup);
    }

    /**
     * Render individual points
     * @param {Array} points - Array of [x, y, label?]
     */
    renderPoints(points) {
        if (!points || points.length === 0) return;

        const pointsGroup = document.createElementNS(this.svgNS, 'g');
        pointsGroup.setAttribute('class', 'points');

        points.forEach((point, index) => {
            const [x, y, label] = point;
            const svgX = this.toSVGX(x);
            const svgY = this.toSVGY(y);

            // Draw point
            const circle = document.createElementNS(this.svgNS, 'circle');
            circle.setAttribute('cx', svgX);
            circle.setAttribute('cy', svgY);
            circle.setAttribute('r', 5);
            circle.setAttribute('fill', this.settings.pointColor);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', 1.5);
            circle.setAttribute('data-point-index', index);
            pointsGroup.appendChild(circle);

            // Draw label
            if (label || this.settings.showLabels) {
                const labelText = label || `(${x}, ${y})`;
                const text = this.createText(
                    svgX + 8,
                    svgY - 8,
                    labelText,
                    this.settings.textColor,
                    12
                );
                text.setAttribute('font-weight', 'bold');
                pointsGroup.appendChild(text);
            }
        });

        this.svg.appendChild(pointsGroup);
        this.currentPoints = points;
    }

    /**
     * Render a linear function (line)
     * @param {number} slope - m in y = mx + b
     * @param {number} intercept - b in y = mx + b
     * @param {string} equation - Display equation
     */
    renderLine(slope, intercept, equation) {
        const { xMin, xMax, lineColor } = this.settings;

        // Calculate endpoints
        const x1 = xMin;
        const y1 = slope * x1 + intercept;
        const x2 = xMax;
        const y2 = slope * x2 + intercept;

        // Draw line
        const line = this.createLine(
            this.toSVGX(x1), this.toSVGY(y1),
            this.toSVGX(x2), this.toSVGY(y2),
            lineColor, 3
        );

        this.svg.appendChild(line);

        // Add equation label
        if (equation && this.settings.showLabels) {
            const labelX = this.toSVGX((xMin + xMax) / 2);
            const labelY = this.toSVGY(slope * ((xMin + xMax) / 2) + intercept) - 15;

            const text = this.createText(labelX, labelY, equation, this.settings.textColor, 14);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('text-anchor', 'middle');

            // Background for readability
            const bbox = text.getBBox();
            const rect = document.createElementNS(this.svgNS, 'rect');
            rect.setAttribute('x', bbox.x - 4);
            rect.setAttribute('y', bbox.y - 2);
            rect.setAttribute('width', bbox.width + 8);
            rect.setAttribute('height', bbox.height + 4);
            rect.setAttribute('fill', 'rgba(0, 0, 0, 0.7)');
            rect.setAttribute('rx', 4);

            this.svg.appendChild(rect);
            this.svg.appendChild(text);
        }
    }

    /**
     * Render a function (quadratic, exponential, etc.)
     * @param {string} equation - Function equation
     */
    renderFunction(equation) {
        const { xMin, xMax, lineColor } = this.settings;

        // Parse equation and generate points
        const func = this.parseEquation(equation);
        const points = [];
        const step = (xMax - xMin) / 200; // 200 points for smooth curve

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y) && !isNaN(y)) {
                    points.push([x, y]);
                }
            } catch (e) {
                // Skip invalid points
            }
        }

        // Draw smooth curve
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
            path.setAttribute('stroke-width', 3);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');

            this.svg.appendChild(path);

            // Add equation label
            if (this.settings.showLabels) {
                const midX = this.toSVGX((xMin + xMax) / 2);
                const midY = this.toSVGY(func((xMin + xMax) / 2)) - 20;

                const text = this.createText(midX, midY, equation, this.settings.textColor, 14);
                text.setAttribute('font-weight', 'bold');
                text.setAttribute('text-anchor', 'middle');

                const bbox = text.getBBox();
                const rect = document.createElementNS(this.svgNS, 'rect');
                rect.setAttribute('x', bbox.x - 4);
                rect.setAttribute('y', bbox.y - 2);
                rect.setAttribute('width', bbox.width + 8);
                rect.setAttribute('height', bbox.height + 4);
                rect.setAttribute('fill', 'rgba(0, 0, 0, 0.7)');
                rect.setAttribute('rx', 4);

                this.svg.appendChild(rect);
                this.svg.appendChild(text);
            }
        }
    }

    /**
     * Render inequality with shaded region
     * @param {string} equation - Inequality (e.g., "y > 2x + 1")
     * @param {string} shadeRegion - 'above' or 'below'
     */
    renderInequality(equation, shadeRegion = 'above') {
        // Parse inequality
        const match = equation.match(/(y)\s*([<>]=?)\s*(.+)/);
        if (!match) return;

        const [, , operator, rightSide] = match;
        
        // Render the boundary line
        const func = this.parseEquation(`y = ${rightSide}`);
        const { xMin, xMax, yMin, yMax } = this.settings;
        
        const points = [];
        const step = (xMax - xMin) / 100;

        for (let x = xMin; x <= xMax; x += step) {
            try {
                const y = func(x);
                if (isFinite(y)) points.push([x, y]);
            } catch (e) {}
        }

        // Draw dashed boundary line
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
            path.setAttribute('stroke-width', 2);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', operator.includes('=') ? 'none' : '5,5');
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
     * @param {Array} functions - Array of {equation, color}
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
     * Parse equation string into executable function
     * @param {string} equation - e.g., "y = x^2 - 4x + 3"
     * @returns {Function}
     */
    parseEquation(equation) {
        // Extract right side of equation
        let expr = equation.split('=')[1]?.trim() || equation;

        // Replace common math notation
        expr = expr.replace(/\^/g, '**');           // Power
        expr = expr.replace(/(\d)x/g, '$1*x');      // Coefficient
        expr = expr.replace(/\)x/g, ')*x');
        expr = expr.replace(/x\(/g, 'x*(');

        // Create function
        try {
            return new Function('x', `return ${expr};`);
        } catch (e) {
            console.error('Equation parse error:', e);
            return (x) => 0;
        }
    }

    /**
     * Enable interactive dragging of points
     */
    enableInteractive() {
        this.dragEnabled = true;
        let dragging = false;
        let dragIndex = -1;

        this.svg.addEventListener('mousedown', (e) => {
            const target = e.target;
            if (target.tagName === 'circle' && target.hasAttribute('data-point-index')) {
                dragging = true;
                dragIndex = parseInt(target.getAttribute('data-point-index'));
                this.svg.style.cursor = 'grabbing';
            }
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (dragging && dragIndex >= 0) {
                const rect = this.svg.getBoundingClientRect();
                const svgX = e.clientX - rect.left;
                const svgY = e.clientY - rect.top;

                const mathX = this.toMathX(svgX);
                const mathY = this.toMathY(svgY);

                // Update point
                this.currentPoints[dragIndex][0] = Math.round(mathX * 10) / 10;
                this.currentPoints[dragIndex][1] = Math.round(mathY * 10) / 10;

                // Re-render
                this.render({ type: 'points', points: this.currentPoints, interactive: true });
            }
        });

        this.svg.addEventListener('mouseup', () => {
            dragging = false;
            dragIndex = -1;
            this.svg.style.cursor = 'default';
        });
    }

    /**
     * Coordinate transformation: Math X to SVG X
     */
    toSVGX(x) {
        const { width, padding, xMin, xMax } = this.settings;
        return padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
    }

    /**
     * Coordinate transformation: Math Y to SVG Y
     */
    toSVGY(y) {
        const { height, padding, yMin, yMax } = this.settings;
        return height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);
    }

    /**
     * Coordinate transformation: SVG X to Math X
     */
    toMathX(svgX) {
        const { width, padding, xMin, xMax } = this.settings;
        return xMin + ((svgX - padding) / (width - 2 * padding)) * (xMax - xMin);
    }

    /**
     * Coordinate transformation: SVG Y to Math Y
     */
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
        text.setAttribute('font-family', 'monospace');
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