/**
 * DrawingTool - Interactive drawing canvas for math work
 * Supports multiple tools, backgrounds, and submissions
 */

class DrawingTool {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#00d4ff';
        this.currentSize = 3;
        this.background = 'blank';
        
        this.objects = []; // Store drawn objects for undo/select
        this.currentPath = null;
        this.selectedObject = null;
        this.undoStack = [];
        this.maxUndo = 50;
        
        this.lineStartPoint = null;
        this.backgroundImage = null; // For tutor-provided images
        
        this.onSubmit = null; // Callback for submission
        
        this.init();
    }

    init() {
        this.canvas = document.getElementById('drawing-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.setupEventListeners();
        this.setupToolListeners();
        this.updateCanvasBackground();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleEnd(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e));
        
        // Background select
        const bgSelect = document.getElementById('bg-select');
        if (bgSelect) {
            bgSelect.addEventListener('change', (e) => {
                this.background = e.target.value;
                this.updateCanvasBackground();
                this.redraw();
            });
        }
        
        // Color picker
        const colorPicker = document.getElementById('draw-color');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                this.currentColor = e.target.value;
            });
        }
        
        // Size slider
        const sizeSlider = document.getElementById('draw-size');
        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                this.currentSize = parseInt(e.target.value);
            });
        }
        
        // Clear button
        const clearBtn = document.getElementById('tool-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
        
        // Undo button
        const undoBtn = document.getElementById('tool-undo');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }
        
        // Download button
        const downloadBtn = document.getElementById('download-drawing');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.download());
        }
        
        // Submit button
        const submitBtn = document.getElementById('submit-drawing');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submit());
        }
        
        // Close button
        const closeBtn = document.getElementById('close-drawing');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    setupToolListeners() {
        const tools = ['pen', 'line', 'point', 'eraser', 'select'];
        
        tools.forEach(tool => {
            const btn = document.getElementById(`tool-${tool}`);
            if (btn) {
                btn.addEventListener('click', () => this.setTool(tool));
            }
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update active state
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`tool-${tool}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update container class for cursor
        const container = document.querySelector('.drawing-canvas-container');
        if (container) {
            container.className = 'drawing-canvas-container tool-' + tool;
        }
        
        // Deselect when changing tools
        this.selectedObject = null;
        this.redraw();
    }

    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    handleStart(e) {
        e.preventDefault();
        const pos = this.getPointerPos(e);
        this.isDrawing = true;
        
        switch (this.currentTool) {
            case 'pen':
                this.currentPath = {
                    type: 'path',
                    points: [pos],
                    color: this.currentColor,
                    size: this.currentSize
                };
                break;
                
            case 'line':
                this.lineStartPoint = pos;
                break;
                
            case 'point':
                this.addObject({
                    type: 'point',
                    x: pos.x,
                    y: pos.y,
                    color: this.currentColor,
                    size: this.currentSize * 3
                });
                break;
                
            case 'eraser':
                this.eraseAt(pos);
                break;
                
            case 'select':
                this.selectAt(pos);
                break;
        }
    }

    handleMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        const pos = this.getPointerPos(e);
        
        switch (this.currentTool) {
            case 'pen':
                if (this.currentPath) {
                    this.currentPath.points.push(pos);
                    this.redraw();
                    this.drawPath(this.currentPath);
                }
                break;
                
            case 'line':
                if (this.lineStartPoint) {
                    this.redraw();
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.lineStartPoint.x, this.lineStartPoint.y);
                    this.ctx.lineTo(pos.x, pos.y);
                    this.ctx.strokeStyle = this.currentColor;
                    this.ctx.lineWidth = this.currentSize;
                    this.ctx.lineCap = 'round';
                    this.ctx.stroke();
                }
                break;
                
            case 'eraser':
                this.eraseAt(pos);
                break;
                
            case 'select':
                if (this.selectedObject) {
                    // Move selected object
                    const dx = pos.x - this.lastPos.x;
                    const dy = pos.y - this.lastPos.y;
                    this.moveObject(this.selectedObject, dx, dy);
                    this.redraw();
                }
                break;
        }
        
        this.lastPos = pos;
    }

    handleEnd(e) {
        if (!this.isDrawing) return;
        
        const pos = e.changedTouches ? 
            this.getPointerPos({ touches: e.changedTouches }) : 
            this.getPointerPos(e);
        
        switch (this.currentTool) {
            case 'pen':
                if (this.currentPath && this.currentPath.points.length > 1) {
                    this.addObject(this.currentPath);
                }
                this.currentPath = null;
                break;
                
            case 'line':
                if (this.lineStartPoint) {
                    this.addObject({
                        type: 'line',
                        x1: this.lineStartPoint.x,
                        y1: this.lineStartPoint.y,
                        x2: pos.x,
                        y2: pos.y,
                        color: this.currentColor,
                        size: this.currentSize
                    });
                    this.lineStartPoint = null;
                }
                break;
        }
        
        this.isDrawing = false;
        this.redraw();
    }

    addObject(obj) {
        this.saveUndo();
        this.objects.push(obj);
        this.redraw();
    }

    saveUndo() {
        this.undoStack.push(JSON.stringify(this.objects));
        if (this.undoStack.length > this.maxUndo) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length > 0) {
            const previous = this.undoStack.pop();
            this.objects = JSON.parse(previous);
            this.redraw();
        }
    }

    eraseAt(pos) {
        const eraseRadius = this.currentSize * 3;
        
        this.objects = this.objects.filter(obj => {
            if (obj.type === 'point') {
                const dist = Math.sqrt(Math.pow(obj.x - pos.x, 2) + Math.pow(obj.y - pos.y, 2));
                return dist > eraseRadius;
            } else if (obj.type === 'path') {
                // Check if any point in path is within eraser
                return !obj.points.some(p => {
                    const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2));
                    return dist < eraseRadius;
                });
            } else if (obj.type === 'line') {
                // Simple distance check to line
                const dist = this.pointToLineDistance(pos, obj);
                return dist > eraseRadius;
            }
            return true;
        });
        
        this.redraw();
    }

    pointToLineDistance(point, line) {
        const A = point.x - line.x1;
        const B = point.y - line.y1;
        const C = line.x2 - line.x1;
        const D = line.y2 - line.y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = line.x1;
            yy = line.y1;
        } else if (param > 1) {
            xx = line.x2;
            yy = line.y2;
        } else {
            xx = line.x1 + param * C;
            yy = line.y1 + param * D;
        }
        
        return Math.sqrt(Math.pow(point.x - xx, 2) + Math.pow(point.y - yy, 2));
    }

    selectAt(pos) {
        this.selectedObject = null;
        
        // Find object at position (reverse order for top-most first)
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInObject(pos, obj)) {
                this.selectedObject = obj;
                this.lastPos = pos;
                break;
            }
        }
        
        this.redraw();
    }

    isPointInObject(pos, obj) {
        const threshold = 10;
        
        if (obj.type === 'point') {
            const dist = Math.sqrt(Math.pow(obj.x - pos.x, 2) + Math.pow(obj.y - pos.y, 2));
            return dist < obj.size + threshold;
        } else if (obj.type === 'path') {
            return obj.points.some(p => {
                const dist = Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2));
                return dist < threshold;
            });
        } else if (obj.type === 'line') {
            return this.pointToLineDistance(pos, obj) < threshold;
        }
        
        return false;
    }

    moveObject(obj, dx, dy) {
        if (obj.type === 'point') {
            obj.x += dx;
            obj.y += dy;
        } else if (obj.type === 'path') {
            obj.points.forEach(p => {
                p.x += dx;
                p.y += dy;
            });
        } else if (obj.type === 'line') {
            obj.x1 += dx;
            obj.y1 += dy;
            obj.x2 += dx;
            obj.y2 += dy;
        }
    }

    updateCanvasBackground() {
        const container = document.querySelector('.drawing-canvas-container');
        if (!container) return;
        
        // Remove existing bg classes
        container.classList.remove('canvas-bg-grid', 'canvas-bg-dots', 'canvas-bg-lined');
        
        // Add appropriate class
        if (this.background === 'grid') {
            container.classList.add('canvas-bg-grid');
        } else if (this.background === 'dots') {
            container.classList.add('canvas-bg-dots');
        } else if (this.background === 'lined') {
            container.classList.add('canvas-bg-lined');
        }
    }

    redraw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background pattern on canvas
        this.drawBackground();
        
        // Draw background image if set (from tutor)
        if (this.backgroundImage) {
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw all objects
        this.objects.forEach(obj => {
            if (obj.type === 'path') {
                this.drawPath(obj);
            } else if (obj.type === 'point') {
                this.drawPoint(obj);
            } else if (obj.type === 'line') {
                this.drawLine(obj);
            }
        });
        
        // Draw selection highlight
        if (this.selectedObject) {
            this.drawSelection(this.selectedObject);
        }
    }

    drawBackground() {
        const isDark = document.body.getAttribute('data-theme') !== 'light';
        const bgColor = isDark ? '#1a1a2e' : '#ffffff';
        const gridColor = isDark ? '#444444' : '#cccccc';
        
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 0.5;
        
        if (this.background === 'grid') {
            // Draw coordinate grid
            const step = 20;
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // Draw minor grid
            this.ctx.globalAlpha = 0.3;
            for (let x = 0; x <= this.canvas.width; x += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            for (let y = 0; y <= this.canvas.height; y += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
            
            // Draw axes
            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = '#d4af37';
            this.ctx.lineWidth = 1.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, centerY);
            this.ctx.lineTo(this.canvas.width, centerY);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, 0);
            this.ctx.lineTo(centerX, this.canvas.height);
            this.ctx.stroke();
            
        } else if (this.background === 'dots') {
            const step = 20;
            this.ctx.fillStyle = gridColor;
            for (let x = step; x < this.canvas.width; x += step) {
                for (let y = step; y < this.canvas.height; y += step) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        } else if (this.background === 'lined') {
            const step = 25;
            this.ctx.globalAlpha = 0.5;
            for (let y = step; y < this.canvas.height; y += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
            this.ctx.globalAlpha = 1;
        }
    }

    drawPath(path) {
        if (path.points.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
            this.ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        this.ctx.strokeStyle = path.color;
        this.ctx.lineWidth = path.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.stroke();
    }

    drawPoint(point) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
        this.ctx.fillStyle = point.color;
        this.ctx.fill();
        
        // Add border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawLine(line) {
        this.ctx.beginPath();
        this.ctx.moveTo(line.x1, line.y1);
        this.ctx.lineTo(line.x2, line.y2);
        this.ctx.strokeStyle = line.color;
        this.ctx.lineWidth = line.size;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
    }

    drawSelection(obj) {
        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        if (obj.type === 'point') {
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.size + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        } else if (obj.type === 'path') {
            // Draw bounding box
            const xs = obj.points.map(p => p.x);
            const ys = obj.points.map(p => p.y);
            const minX = Math.min(...xs) - 5;
            const maxX = Math.max(...xs) + 5;
            const minY = Math.min(...ys) - 5;
            const maxY = Math.max(...ys) + 5;
            this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        } else if (obj.type === 'line') {
            const minX = Math.min(obj.x1, obj.x2) - 5;
            const maxX = Math.max(obj.x1, obj.x2) + 5;
            const minY = Math.min(obj.y1, obj.y2) - 5;
            const maxY = Math.max(obj.y1, obj.y2) + 5;
            this.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        }
        
        this.ctx.setLineDash([]);
    }

    clear() {
        this.saveUndo();
        this.objects = [];
        this.backgroundImage = null;
        this.redraw();
    }

    setBackgroundImage(imageDataUrl) {
        const img = new Image();
        img.onload = () => {
            this.backgroundImage = img;
            this.redraw();
        };
        img.src = imageDataUrl;
    }

    getImageDataUrl() {
        return this.canvas.toDataURL('image/png');
    }

    download() {
        const link = document.createElement('a');
        link.download = 'math_drawing.png';
        link.href = this.getImageDataUrl();
        link.click();
    }

    submit() {
        const imageData = this.getImageDataUrl();
        
        if (this.onSubmit) {
            this.onSubmit(imageData);
        }
        
        this.close();
    }

    open(options = {}) {
        const modal = document.getElementById('drawing-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Reset canvas if requested
            if (options.clear !== false) {
                this.objects = [];
                this.undoStack = [];
                this.backgroundImage = null;
            }
            
            // Set background if specified
            if (options.background) {
                this.background = options.background;
                const bgSelect = document.getElementById('bg-select');
                if (bgSelect) bgSelect.value = options.background;
                this.updateCanvasBackground();
            }
            
            // Set background image if provided
            if (options.backgroundImage) {
                this.setBackgroundImage(options.backgroundImage);
            }
            
            // Set callback
            if (options.onSubmit) {
                this.onSubmit = options.onSubmit;
            }
            
            this.redraw();
        }
    }

    close() {
        const modal = document.getElementById('drawing-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize when DOM is ready
window.drawingTool = null;

document.addEventListener('DOMContentLoaded', () => {
    window.drawingTool = new DrawingTool();
});