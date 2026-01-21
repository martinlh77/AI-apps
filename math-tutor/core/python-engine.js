/**
 * PythonEngine - Pyodide Integration for Math Visualizations
 * Handles Python code execution, graph generation, and image export
 * Supports light and dark theme coloring
 */

class PythonEngine {
    constructor() {
        this.pyodide = null;
        this.isReady = false;
        this.isLoading = false;
        this.loadPromise = null;
    }

    async initialize() {
        if (this.isReady) return true;
        if (this.isLoading) return this.loadPromise;

        this.isLoading = true;
        this.updateStatus('loading', 'Loading Python...');

        this.loadPromise = this._doInitialize();
        return this.loadPromise;
    }

    async _doInitialize() {
        try {
            this.pyodide = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
            });

            await this.pyodide.loadPackage(['numpy', 'matplotlib']);

            await this.pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import numpy as np
import io
import base64
import json
from math import comb

plt.style.use('dark_background')
plt.rcParams['figure.facecolor'] = '#1a1a2e'
plt.rcParams['axes.facecolor'] = '#1a1a2e'
plt.rcParams['axes.edgecolor'] = '#d4af37'
plt.rcParams['axes.labelcolor'] = '#f0f0f0'
plt.rcParams['text.color'] = '#f0f0f0'
plt.rcParams['xtick.color'] = '#f0f0f0'
plt.rcParams['ytick.color'] = '#f0f0f0'
plt.rcParams['grid.color'] = '#444444'
plt.rcParams['figure.figsize'] = [8, 6]
plt.rcParams['figure.dpi'] = 100

# Global variable to store the last generated image
_last_image_base64 = None

def save_plot_as_base64():
    """Save current matplotlib figure as base64 PNG and store it globally"""
    global _last_image_base64
    buf = io.BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', 
                facecolor=plt.gcf().get_facecolor(), edgecolor='none')
    buf.seek(0)
    _last_image_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close('all')
    return _last_image_base64

def get_last_image():
    """Retrieve the last generated image"""
    global _last_image_base64
    return _last_image_base64

def clear_last_image():
    """Clear the stored image"""
    global _last_image_base64
    _last_image_base64 = None

def set_theme(dark=True):
    """Set the color theme for plots"""
    if dark:
        plt.style.use('dark_background')
        plt.rcParams['figure.facecolor'] = '#1a1a2e'
        plt.rcParams['axes.facecolor'] = '#1a1a2e'
        plt.rcParams['text.color'] = '#f0f0f0'
        plt.rcParams['axes.labelcolor'] = '#f0f0f0'
        plt.rcParams['xtick.color'] = '#f0f0f0'
        plt.rcParams['ytick.color'] = '#f0f0f0'
        plt.rcParams['grid.color'] = '#444444'
    else:
        plt.style.use('default')
        plt.rcParams['figure.facecolor'] = '#ffffff'
        plt.rcParams['axes.facecolor'] = '#ffffff'
        plt.rcParams['text.color'] = '#1a1a2e'
        plt.rcParams['axes.labelcolor'] = '#1a1a2e'
        plt.rcParams['xtick.color'] = '#1a1a2e'
        plt.rcParams['ytick.color'] = '#1a1a2e'
        plt.rcParams['grid.color'] = '#cccccc'

def create_coordinate_grid(xmin=-10, xmax=10, ymin=-10, ymax=10):
    """Create a standard coordinate grid"""
    fig, ax = plt.subplots()
    ax.set_xlim(xmin, xmax)
    ax.set_ylim(ymin, ymax)
    ax.axhline(y=0, color='#d4af37', linewidth=1.5)
    ax.axvline(x=0, color='#d4af37', linewidth=1.5)
    ax.grid(True, alpha=0.3)
    ax.set_aspect('equal')
    return fig, ax

def plot_function(func_str, xmin=-10, xmax=10, num_points=500, label=None, color='#00d4ff', ax=None):
    """Plot a mathematical function from string"""
    x = np.linspace(xmin, xmax, num_points)
    safe_dict = {
        'x': x, 'np': np, 'sin': np.sin, 'cos': np.cos, 'tan': np.tan,
        'sqrt': np.sqrt, 'exp': np.exp, 'log': np.log, 'log10': np.log10,
        'abs': np.abs, 'pi': np.pi, 'e': np.e, 'arcsin': np.arcsin,
        'arccos': np.arccos, 'arctan': np.arctan, 'sinh': np.sinh,
        'cosh': np.cosh, 'tanh': np.tanh, 'floor': np.floor, 'ceil': np.ceil
    }
    try:
        y = eval(func_str.replace('^', '**'), {"__builtins__": {}}, safe_dict)
        if ax is None:
            ax = plt.gca()
        ax.plot(x, y, color=color, linewidth=2, label=label or func_str)
        return True
    except Exception as e:
        print(f"Error plotting function: {e}")
        return False

print("Python math engine initialized successfully!")
            `);

            this.isReady = true;
            this.isLoading = false;
            this.updateStatus('ready', 'Python Ready ✓');
            console.log('Python engine initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Python:', error);
            this.isLoading = false;
            this.updateStatus('error', 'Python Error');
            return false;
        }
    }

    updateStatus(state, text) {
        const statusEl = document.getElementById('python-status');
        const textEl = document.getElementById('python-status-text');
        
        if (statusEl) {
            statusEl.className = `python-status ${state}`;
        }
        if (textEl) {
            textEl.textContent = text;
        }
    }

    /**
     * Preprocess Python code to ensure it saves the plot correctly
     * Replaces plt.show() with save_plot_as_base64() and ensures it's called
     */
    preprocessCode(code) {
        let processedCode = code;
        
        // Remove any plt.show() calls - they don't work in this environment
        processedCode = processedCode.replace(/plt\.show\s*\(\s*\)/g, '');
        
        // Check if save_plot_as_base64() is already in the code
        const hasSaveCall = /save_plot_as_base64\s*\(\s*\)/.test(processedCode);
        
        // Check if the code creates any plots (has plt. calls that would create figures)
        const createsFigure = /plt\.(plot|scatter|bar|barh|pie|hist|boxplot|imshow|contour|fill|fill_between|subplots|figure)|ax\.(plot|scatter|bar|barh|pie|hist|add_patch|fill|fill_between|imshow|contour)/.test(processedCode);
        
        // If it creates figures but doesn't save, add save_plot_as_base64() at the end
        if (createsFigure && !hasSaveCall) {
            // Remove trailing whitespace and add the save call
            processedCode = processedCode.trimEnd();
            processedCode += '\n\nsave_plot_as_base64()';
            console.log('Auto-added save_plot_as_base64() to code');
        }
        
        return processedCode;
    }

    async runCode(code) {
        if (!this.isReady) {
            const initialized = await this.initialize();
            if (!initialized) {
                return { success: false, error: 'Python engine failed to initialize' };
            }
        }

        try {
            // Preprocess the code to fix common issues
            const processedCode = this.preprocessCode(code);
            console.log('Executing preprocessed Python code');
            
            // Clear any previous image
            await this.pyodide.runPythonAsync(`clear_last_image()`);

            // Redirect stdout to capture print statements
            await this.pyodide.runPythonAsync(`
import sys
from io import StringIO
_stdout_capture = StringIO()
sys.stdout = _stdout_capture
            `);

            // Run the user code
            await this.pyodide.runPythonAsync(processedCode);

            // Capture stdout
            const stdout = await this.pyodide.runPythonAsync(`
_captured = _stdout_capture.getvalue()
sys.stdout = sys.__stdout__
_captured
            `);

            // Check if an image was generated
            const imageData = await this.pyodide.runPythonAsync(`get_last_image()`);
            
            console.log('Python execution complete. Image generated:', imageData ? 'yes (' + imageData.length + ' chars)' : 'no');
            console.log('Stdout:', stdout || '(empty)');

            return {
                success: true,
                result: null,
                stdout: stdout,
                image: imageData
            };

        } catch (error) {
            console.error('Python execution error:', error);
            // Reset stdout on error
            try {
                await this.pyodide.runPythonAsync(`sys.stdout = sys.__stdout__`);
            } catch (e) {}
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateGraph(config) {
        const { type, equation, points, options = {} } = config;
        let code = '';

        switch (type) {
            case 'function':
                code = this.generateFunctionPlotCode(equation, options);
                break;
            case 'points':
                code = this.generatePointsPlotCode(points, options);
                break;
            case 'line':
                code = this.generateLinePlotCode(options);
                break;
            case 'bar':
                code = this.generateBarChartCode(options);
                break;
            case 'pie':
                code = this.generatePieChartCode(options);
                break;
            case 'scatter':
                code = this.generateScatterPlotCode(points, options);
                break;
            case 'histogram':
                code = this.generateHistogramCode(options);
                break;
            case '3d_surface':
                code = this.generate3DSurfaceCode(equation, options);
                break;
            case 'probability':
                code = this.generateProbabilityModelCode(options);
                break;
            case 'number_line_inequality':
                code = this.generateNumberLineInequalityCode(options);
                break;
            case 'inequality_region':
                code = this.generateInequalityRegionCode(options);
                break;
            case 'system_inequalities':
                code = this.generateSystemInequalitiesCode(options);
                break;
            case 'ray':
            case 'segment':
                code = this.generateRayCode(options);
                break;
            case 'angle':
                code = this.generateAngleCode(options);
                break;
            case '2d_shape':
            case 'polygon':
                code = this.generate2DShapeCode(options);
                break;
            case 'circle':
                code = this.generateCircleCode(options);
                break;
            case '3d_shape':
                code = this.generate3DShapeCode(options);
                break;
            case 'cross_section':
                code = this.generateCrossSectionCode(options);
                break;
            case 'probability_simulation':
                code = this.generateProbabilityVisualizationCode(options);
                break;
            case 'flowchart':
                code = this.generateFlowchartCode(options);
                break;
            case 'steps':
                code = this.generateStepsInfographicCode(options);
                break;
            case 'box_plot':
                code = this.generateBoxPlotCode(options);
                break;
            case 'stem_leaf':
                code = this.generateStemLeafCode(options);
                break;
            case 'dot_plot':
                code = this.generateDotPlotCode(options);
                break;
            case 'line_graph':
                code = this.generateLineGraphCode(options);
                break;
            case 'double_bar':
                code = this.generateDoubleBarChartCode(options);
                break;
            case 'transformations':
                code = this.generateTransformationsCode(options);
                break;
            default:
                code = this.generateFunctionPlotCode(equation || 'x', options);
        }

        return await this.runCode(code);
    }

    // ==================== FUNCTION & LINE PLOTS ====================

    generateFunctionPlotCode(equation, options) {
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;
        const title = options.title || `y = ${equation}`;
        const color = options.color || '#00d4ff';
        const showPoints = options.showPoints || [];

        const pointsJson = JSON.stringify(showPoints);

        return `
fig, ax = create_coordinate_grid(${xmin}, ${xmax}, ${ymin}, ${ymax})
plot_function("${equation.replace(/"/g, '\\"')}", ${xmin}, ${xmax}, color="${color}", ax=ax)

show_points = ${pointsJson}
if show_points:
    px = [p[0] for p in show_points]
    py = [p[1] for p in show_points]
    ax.scatter(px, py, color='#ff6b6b', s=100, zorder=5)
    for x, y in show_points:
        ax.annotate(f'({x}, {y})', (x, y), textcoords="offset points", xytext=(5,5), fontsize=9, color='#f0f0f0')

plt.title("${title}")
plt.xlabel("x")
plt.ylabel("y")
plt.legend()
save_plot_as_base64()
        `;
    }

    generatePointsPlotCode(points, options) {
        const pointsStr = JSON.stringify(points);
        const title = options.title || 'Points Plot';
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;
        const connectPoints = options.connectPoints || false;

        return `
points = ${pointsStr}
fig, ax = create_coordinate_grid(${xmin}, ${xmax}, ${ymin}, ${ymax})
x_coords = [p[0] for p in points]
y_coords = [p[1] for p in points]

${connectPoints ? "ax.plot(x_coords, y_coords, color='#00d4ff', linewidth=1.5, alpha=0.5)" : ""}

ax.scatter(x_coords, y_coords, color='#ff6b6b', s=100, zorder=5)
for i, (x, y) in enumerate(points):
    ax.annotate(f'({x}, {y})', (x, y), textcoords="offset points", xytext=(5,5), fontsize=9, color='#f0f0f0')

plt.title("${title}")
save_plot_as_base64()
        `;
    }

    generateLinePlotCode(options) {
        const slope = options.slope ?? 1;
        const intercept = options.intercept ?? 0;
        const title = options.title || `y = ${slope}x ${intercept >= 0 ? '+' : ''} ${intercept}`;
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;
        const showIntercepts = options.showIntercepts !== false;

        return `
fig, ax = create_coordinate_grid(${xmin}, ${xmax}, ${ymin}, ${ymax})
x = np.linspace(${xmin}, ${xmax}, 100)
y = ${slope} * x + ${intercept}
ax.plot(x, y, color='#00d4ff', linewidth=2, label='y = ${slope}x + ${intercept}')

if ${showIntercepts}:
    ax.scatter([0], [${intercept}], color='#ff6b6b', s=100, zorder=5)
    ax.annotate(f'y-int: (0, ${intercept})', (0, ${intercept}), textcoords="offset points", xytext=(10,5), fontsize=9, color='#f0f0f0')
    
    if ${slope} != 0:
        x_int = -${intercept} / ${slope}
        if ${xmin} <= x_int <= ${xmax}:
            ax.scatter([x_int], [0], color='#27ae60', s=100, zorder=5)
            ax.annotate(f'x-int: ({x_int:.2f}, 0)', (x_int, 0), textcoords="offset points", xytext=(5,10), fontsize=9, color='#f0f0f0')

plt.title("${title}")
plt.legend()
save_plot_as_base64()
        `;
    }

    // ==================== INEQUALITIES ====================

    generateNumberLineInequalityCode(options) {
        const value = options.value ?? 3;
        const type = options.type || 'greater';
        const variable = options.variable || 'x';
        const min = options.min ?? -10;
        const max = options.max ?? 10;

        const symbols = {
            'greater': '>',
            'less': '<',
            'greaterEqual': '≥',
            'lessEqual': '≤'
        };
        const symbol = symbols[type] || '>';
        const title = options.title || `${variable} ${symbol} ${value}`;

        return `
fig, ax = plt.subplots(figsize=(12, 2.5))

min_val, max_val, value = ${min}, ${max}, ${value}
ineq_type = "${type}"

ax.hlines(0, min_val, max_val, colors='#f0f0f0', linewidth=2)

for i in range(min_val, max_val + 1):
    ax.vlines(i, -0.15, 0.15, colors='#f0f0f0', linewidth=1)
    ax.text(i, -0.4, str(i), ha='center', va='top', fontsize=10, color='#f0f0f0')

if ineq_type in ['greater', 'greaterEqual']:
    ax.hlines(0, value, max_val, colors='#00d4ff', linewidth=6)
    ax.annotate('', xy=(max_val + 0.3, 0), xytext=(max_val - 0.2, 0),
                arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=3))
else:
    ax.hlines(0, min_val, value, colors='#00d4ff', linewidth=6)
    ax.annotate('', xy=(min_val - 0.3, 0), xytext=(min_val + 0.2, 0),
                arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=3))

if ineq_type in ['greaterEqual', 'lessEqual']:
    circle = plt.Circle((value, 0), 0.2, color='#00d4ff', ec='#f0f0f0', linewidth=2, zorder=5)
else:
    circle = plt.Circle((value, 0), 0.2, color='#1a1a2e', ec='#00d4ff', linewidth=3, zorder=5)
ax.add_patch(circle)

ax.set_xlim(min_val - 1, max_val + 1)
ax.set_ylim(-0.8, 0.6)
ax.axis('off')
ax.set_title("${title}", fontsize=14, color='#d4af37', pad=15)

save_plot_as_base64()
        `;
    }

    generateInequalityRegionCode(options) {
        const slope = options.slope ?? 2;
        const intercept = options.intercept ?? 1;
        const type = options.type || 'greater';
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;

        const symbols = { 'greater': '>', 'less': '<', 'greaterEqual': '≥', 'lessEqual': '≤' };
        const symbol = symbols[type] || '>';
        const title = options.title || `y ${symbol} ${slope}x ${intercept >= 0 ? '+' : ''} ${intercept}`;

        return `
fig, ax = plt.subplots(figsize=(8, 8))

ax.set_xlim(${xmin}, ${xmax})
ax.set_ylim(${ymin}, ${ymax})
ax.axhline(y=0, color='#d4af37', linewidth=1.5)
ax.axvline(x=0, color='#d4af37', linewidth=1.5)
ax.grid(True, alpha=0.3)
ax.set_aspect('equal')

x = np.linspace(${xmin}, ${xmax}, 100)
y = ${slope} * x + ${intercept}

ineq_type = "${type}"
line_style = '-' if ineq_type in ['greaterEqual', 'lessEqual'] else '--'
ax.plot(x, y, color='#00d4ff', linewidth=2.5, linestyle=line_style)

if ineq_type in ['greater', 'greaterEqual']:
    ax.fill_between(x, y, ${ymax}, alpha=0.3, color='#00d4ff')
else:
    ax.fill_between(x, ${ymin}, y, alpha=0.3, color='#00d4ff')

ax.set_xlabel('x', fontsize=12)
ax.set_ylabel('y', fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateSystemInequalitiesCode(options) {
        const inequalities = options.inequalities || [
            { slope: 1, intercept: 0, type: 'greater' },
            { slope: -1, intercept: 4, type: 'less' }
        ];
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;

        return `
fig, ax = plt.subplots(figsize=(8, 8))

ax.set_xlim(${xmin}, ${xmax})
ax.set_ylim(${ymin}, ${ymax})
ax.axhline(y=0, color='#d4af37', linewidth=1.5)
ax.axvline(x=0, color='#d4af37', linewidth=1.5)
ax.grid(True, alpha=0.3)
ax.set_aspect('equal')

inequalities = ${JSON.stringify(inequalities)}
colors = ['#00d4ff', '#ff6b6b', '#27ae60', '#9b59b6', '#f39c12']
x = np.linspace(${xmin}, ${xmax}, 100)

X, Y = np.meshgrid(np.linspace(${xmin}, ${xmax}, 300), np.linspace(${ymin}, ${ymax}, 300))
mask = np.ones_like(X, dtype=bool)

for i, ineq in enumerate(inequalities):
    slope = ineq.get('slope', 1)
    intercept = ineq.get('intercept', 0)
    ineq_type = ineq.get('type', 'greater')
    
    y_line = slope * x + intercept
    line_style = '-' if ineq_type in ['greaterEqual', 'lessEqual'] else '--'
    ax.plot(x, y_line, color=colors[i % len(colors)], linewidth=2, linestyle=line_style,
            label=f'y {"≥" if ineq_type == "greaterEqual" else ">" if ineq_type == "greater" else "≤" if ineq_type == "lessEqual" else "<"} {slope}x + {intercept}')
    
    y_boundary = slope * X + intercept
    if ineq_type in ['greater', 'greaterEqual']:
        mask &= (Y >= y_boundary)
    else:
        mask &= (Y <= y_boundary)

ax.contourf(X, Y, mask.astype(int), levels=[0.5, 1.5], colors=['#d4af37'], alpha=0.4)

ax.set_xlabel('x', fontsize=12)
ax.set_ylabel('y', fontsize=12)
ax.set_title("System of Inequalities", fontsize=14, color='#d4af37')
ax.legend(loc='best', fontsize=9)

save_plot_as_base64()
        `;
    }

    // ==================== GEOMETRY - LINES & ANGLES ====================

    generateRayCode(options) {
        const startPoint = options.startPoint || [0, 0];
        const endPoint = options.endPoint || [5, 5];
        const isRay = options.isRay !== false;
        const xmin = options.xmin ?? -10;
        const xmax = options.xmax ?? 10;
        const ymin = options.ymin ?? -10;
        const ymax = options.ymax ?? 10;
        const title = options.title || (isRay ? 'Ray' : 'Line Segment');

        return `
fig, ax = create_coordinate_grid(${xmin}, ${xmax}, ${ymin}, ${ymax})

start = ${JSON.stringify(startPoint)}
end = ${JSON.stringify(endPoint)}
is_ray = ${isRay}

dx = end[0] - start[0]
dy = end[1] - start[1]

if is_ray:
    length = np.sqrt(dx**2 + dy**2)
    if length > 0:
        scale = 20 / length
        far_end = [start[0] + dx * scale, start[1] + dy * scale]
        ax.annotate('', xy=far_end, xytext=start,
                    arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=2.5))
else:
    ax.plot([start[0], end[0]], [start[1], end[1]], color='#00d4ff', linewidth=2.5)
    ax.scatter([end[0]], [end[1]], color='#ff6b6b', s=100, zorder=5)
    ax.annotate(f'({end[0]}, {end[1]})', (end[0], end[1]), textcoords="offset points", xytext=(5,5), fontsize=9, color='#f0f0f0')

ax.scatter([start[0]], [start[1]], color='#ff6b6b', s=100, zorder=5)
ax.annotate(f'({start[0]}, {start[1]})', (start[0], start[1]), textcoords="offset points", xytext=(5,5), fontsize=9, color='#f0f0f0')

ax.set_title("${title}", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateAngleCode(options) {
        const vertex = options.vertex || [0, 0];
        const angle1 = options.angle1 ?? 0;
        const angle2 = options.angle2 ?? 45;
        const radius = options.radius ?? 4;
        const showMeasurement = options.showMeasurement !== false;
        const label = options.label || '';

        return `
fig, ax = plt.subplots(figsize=(8, 8))

vertex = ${JSON.stringify(vertex)}
angle1_deg = ${angle1}
angle2_deg = ${angle2}
ray_length = ${radius}

angle1_rad = np.radians(angle1_deg)
angle2_rad = np.radians(angle2_deg)

end1 = [vertex[0] + ray_length * np.cos(angle1_rad), vertex[1] + ray_length * np.sin(angle1_rad)]
end2 = [vertex[0] + ray_length * np.cos(angle2_rad), vertex[1] + ray_length * np.sin(angle2_rad)]

ax.annotate('', xy=end1, xytext=vertex,
            arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=2.5))
ax.annotate('', xy=end2, xytext=vertex,
            arrowprops=dict(arrowstyle='->', color='#00d4ff', lw=2.5))

arc_radius = ray_length * 0.25
theta = np.linspace(angle1_rad, angle2_rad, 50)
arc_x = vertex[0] + arc_radius * np.cos(theta)
arc_y = vertex[1] + arc_radius * np.sin(theta)
ax.plot(arc_x, arc_y, color='#d4af37', linewidth=2.5)

if ${str(showMeasurement).lower()}:
    angle_measure = abs(angle2_deg - angle1_deg)
    mid_angle = (angle1_rad + angle2_rad) / 2
    label_x = vertex[0] + arc_radius * 1.8 * np.cos(mid_angle)
    label_y = vertex[1] + arc_radius * 1.8 * np.sin(mid_angle)
    ax.text(label_x, label_y, f'{angle_measure}°', ha='center', va='center', 
            fontsize=14, color='#d4af37', fontweight='bold')

ax.scatter([vertex[0]], [vertex[1]], color='#ff6b6b', s=120, zorder=5)

margin = ray_length * 0.3
ax.set_xlim(vertex[0] - ray_length - margin, vertex[0] + ray_length + margin)
ax.set_ylim(vertex[1] - ray_length - margin, vertex[1] + ray_length + margin)
ax.set_aspect('equal')
ax.grid(True, alpha=0.3)
ax.axhline(y=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax.axvline(x=0, color='#d4af37', linewidth=0.5, alpha=0.5)

title = "${label}" if "${label}" else f"Angle: {abs(angle2_deg - angle1_deg)}°"
ax.set_title(title, fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    // ==================== GEOMETRY - 2D SHAPES ====================

    generate2DShapeCode(options) {
        const shapeType = options.shapeType || 'triangle';
        const vertices = options.vertices || null;
        const center = options.center || [0, 0];
        const size = options.size ?? 5;
        const showLabels = options.showLabels !== false;
        const showMeasurements = options.showMeasurements || false;
        const fillColor = options.fillColor || '#00d4ff';

        return `
from matplotlib.patches import Polygon

fig, ax = plt.subplots(figsize=(8, 8))

shape_type = "${shapeType}"
center = ${JSON.stringify(center)}
size = ${size}
custom_vertices = ${vertices ? JSON.stringify(vertices) : 'None'}

if custom_vertices is not None:
    vertices = np.array(custom_vertices)
else:
    shape_sides = {
        'triangle': 3, 'square': 4, 'rectangle': 4, 'pentagon': 5, 
        'hexagon': 6, 'heptagon': 7, 'octagon': 8
    }
    n_sides = shape_sides.get(shape_type, 4)
    
    if shape_type == 'rectangle':
        w, h = size, size * 0.6
        vertices = np.array([
            [center[0] - w/2, center[1] - h/2],
            [center[0] + w/2, center[1] - h/2],
            [center[0] + w/2, center[1] + h/2],
            [center[0] - w/2, center[1] + h/2]
        ])
    else:
        angles = np.linspace(0, 2 * np.pi, n_sides, endpoint=False) + np.pi/2
        vertices = np.array([[center[0] + size/2 * np.cos(a), 
                              center[1] + size/2 * np.sin(a)] for a in angles])

polygon = Polygon(vertices, fill=True, facecolor='${fillColor}', 
                  edgecolor='#f0f0f0', linewidth=2.5, alpha=0.4)
ax.add_patch(polygon)

if ${str(showLabels).lower()}:
    labels = 'ABCDEFGHIJKLMNOP'
    for i, (x, y) in enumerate(vertices):
        ax.scatter([x], [y], color='#ff6b6b', s=80, zorder=5)
        offset_x = 0.3 * np.sign(x - center[0]) if x != center[0] else 0.3
        offset_y = 0.3 * np.sign(y - center[1]) if y != center[1] else 0.3
        ax.text(x + offset_x, y + offset_y, labels[i], fontsize=12, color='#d4af37', fontweight='bold')

if ${str(showMeasurements).lower()}:
    for i in range(len(vertices)):
        p1 = vertices[i]
        p2 = vertices[(i + 1) % len(vertices)]
        length = np.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)
        mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
        ax.text(mid[0], mid[1], f'{length:.1f}', fontsize=9, color='#f0f0f0',
                ha='center', va='center', 
                bbox=dict(boxstyle='round', facecolor='#1a1a2e', alpha=0.8, edgecolor='#d4af37'))

margin = size * 0.6
all_x = vertices[:, 0]
all_y = vertices[:, 1]
ax.set_xlim(min(all_x) - margin, max(all_x) + margin)
ax.set_ylim(min(all_y) - margin, max(all_y) + margin)
ax.set_aspect('equal')
ax.grid(True, alpha=0.3)
ax.axhline(y=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax.axvline(x=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax.set_title("${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateCircleCode(options) {
        const center = options.center || [0, 0];
        const radius = options.radius ?? 3;
        const showRadius = options.showRadius || false;
        const showDiameter = options.showDiameter || false;
        const showCenter = options.showCenter !== false;
        const showArc = options.showArc || false;
        const arcAngles = options.arcAngles || [0, 90];
        const showSector = options.showSector || false;
        const showChord = options.showChord || false;
        const chordAngles = options.chordAngles || [30, 150];

        return `
from matplotlib.patches import Circle, Wedge

fig, ax = plt.subplots(figsize=(8, 8))

center = ${JSON.stringify(center)}
radius = ${radius}

circle = Circle(center, radius, fill=False, edgecolor='#00d4ff', linewidth=2.5)
ax.add_patch(circle)

if ${str(showCenter).lower()}:
    ax.scatter([center[0]], [center[1]], color='#ff6b6b', s=80, zorder=5)
    ax.text(center[0] + 0.2, center[1] + 0.2, 'O', fontsize=12, color='#d4af37', fontweight='bold')

if ${str(showRadius).lower()}:
    end_point = [center[0] + radius, center[1]]
    ax.plot([center[0], end_point[0]], [center[1], end_point[1]], 
            color='#d4af37', linewidth=2.5)
    mid_x = (center[0] + end_point[0]) / 2
    ax.text(mid_x, center[1] - 0.3, f'r = {radius}', fontsize=11, color='#d4af37')

if ${str(showDiameter).lower()}:
    ax.plot([center[0] - radius, center[0] + radius], [center[1], center[1]], 
            color='#27ae60', linewidth=2.5, linestyle='--')
    ax.text(center[0], center[1] + 0.3, f'd = {2*radius}', fontsize=11, color='#27ae60')

if ${str(showArc).lower()}:
    arc_start, arc_end = ${JSON.stringify(arcAngles)}
    theta = np.linspace(np.radians(arc_start), np.radians(arc_end), 50)
    arc_x = center[0] + radius * np.cos(theta)
    arc_y = center[1] + radius * np.sin(theta)
    ax.plot(arc_x, arc_y, color='#ff6b6b', linewidth=5)

if ${str(showSector).lower()}:
    arc_start, arc_end = ${JSON.stringify(arcAngles)}
    wedge = Wedge(center, radius, arc_start, arc_end, 
                  facecolor='#d4af37', alpha=0.3, edgecolor='#d4af37', linewidth=2)
    ax.add_patch(wedge)

if ${str(showChord).lower()}:
    chord_start, chord_end = ${JSON.stringify(chordAngles)}
    p1 = [center[0] + radius * np.cos(np.radians(chord_start)), 
          center[1] + radius * np.sin(np.radians(chord_start))]
    p2 = [center[0] + radius * np.cos(np.radians(chord_end)), 
          center[1] + radius * np.sin(np.radians(chord_end))]
    ax.plot([p1[0], p2[0]], [p1[1], p2[1]], color='#9b59b6', linewidth=2.5)
    ax.scatter([p1[0], p2[0]], [p1[1], p2[1]], color='#9b59b6', s=60, zorder=5)

margin = radius * 0.5
ax.set_xlim(center[0] - radius - margin, center[0] + radius + margin)
ax.set_ylim(center[1] - radius - margin, center[1] + radius + margin)
ax.set_aspect('equal')
ax.grid(True, alpha=0.3)
ax.axhline(y=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax.axvline(x=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax.set_title("Circle", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateTransformationsCode(options) {
        const originalVertices = options.vertices || [[0, 0], [2, 0], [1, 2]];
        const transformation = options.transformation || 'translate';
        const params = options.params || { dx: 3, dy: 2 };

        return `
from matplotlib.patches import Polygon

fig, ax = plt.subplots(figsize=(10, 8))

original = np.array(${JSON.stringify(originalVertices)})
transformation = "${transformation}"
params = ${JSON.stringify(params)}

if transformation == 'translate':
    dx, dy = params.get('dx', 0), params.get('dy', 0)
    transformed = original + np.array([dx, dy])
    title = f"Translation: ({dx}, {dy})"
    
elif transformation == 'reflect_x':
    transformed = original * np.array([1, -1])
    title = "Reflection over x-axis"
    
elif transformation == 'reflect_y':
    transformed = original * np.array([-1, 1])
    title = "Reflection over y-axis"
    
elif transformation == 'reflect_origin':
    transformed = original * np.array([-1, -1])
    title = "Reflection over origin"
    
elif transformation == 'rotate':
    angle = np.radians(params.get('angle', 90))
    center = np.array(params.get('center', [0, 0]))
    cos_a, sin_a = np.cos(angle), np.sin(angle)
    rotation_matrix = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
    centered = original - center
    rotated = np.dot(centered, rotation_matrix.T)
    transformed = rotated + center
    title = f"Rotation: {params.get('angle', 90)}° about {params.get('center', [0, 0])}"
    
elif transformation == 'dilate':
    scale = params.get('scale', 2)
    center = np.array(params.get('center', [0, 0]))
    transformed = center + scale * (original - center)
    title = f"Dilation: scale = {scale}"
else:
    transformed = original
    title = "Original"

poly_orig = Polygon(original, fill=True, facecolor='#00d4ff', 
                    edgecolor='#f0f0f0', linewidth=2, alpha=0.4, label='Original')
poly_trans = Polygon(transformed, fill=True, facecolor='#ff6b6b', 
                     edgecolor='#f0f0f0', linewidth=2, alpha=0.4, label='Transformed')

ax.add_patch(poly_orig)
ax.add_patch(poly_trans)

labels_orig = 'ABC'
labels_trans = "A'B'C'"
for i, (p_o, p_t) in enumerate(zip(original, transformed)):
    ax.scatter([p_o[0]], [p_o[1]], color='#00d4ff', s=60, zorder=5)
    ax.scatter([p_t[0]], [p_t[1]], color='#ff6b6b', s=60, zorder=5)
    ax.text(p_o[0] - 0.3, p_o[1] + 0.3, labels_orig[i], fontsize=10, color='#00d4ff')
    ax.text(p_t[0] + 0.2, p_t[1] + 0.3, labels_trans[i], fontsize=10, color='#ff6b6b')

all_points = np.vstack([original, transformed])
margin = 2
ax.set_xlim(all_points[:, 0].min() - margin, all_points[:, 0].max() + margin)
ax.set_ylim(all_points[:, 1].min() - margin, all_points[:, 1].max() + margin)
ax.set_aspect('equal')
ax.grid(True, alpha=0.3)
ax.axhline(y=0, color='#d4af37', linewidth=1.5)
ax.axvline(x=0, color='#d4af37', linewidth=1.5)
ax.legend(loc='best')
ax.set_title(title, fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    // ==================== GEOMETRY - 3D SHAPES ====================

    generate3DSurfaceCode(equation, options) {
        const title = options.title || '3D Surface';
        const xmin = options.xmin ?? -5;
        const xmax = options.xmax ?? 5;
        const ymin = options.ymin ?? -5;
        const ymax = options.ymax ?? 5;

        return `
from mpl_toolkits.mplot3d import Axes3D

fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

x = np.linspace(${xmin}, ${xmax}, 50)
y = np.linspace(${ymin}, ${ymax}, 50)
X, Y = np.meshgrid(x, y)

safe_dict = {'X': X, 'Y': Y, 'np': np, 'sin': np.sin, 'cos': np.cos, 
             'sqrt': np.sqrt, 'exp': np.exp, 'abs': np.abs, 'pi': np.pi}
Z = eval("${equation.replace(/"/g, '\\"')}", {"__builtins__": {}}, safe_dict)

ax.plot_surface(X, Y, Z, cmap='viridis', alpha=0.8, edgecolor='none')

ax.set_xlabel('X', color='#f0f0f0')
ax.set_ylabel('Y', color='#f0f0f0')
ax.set_zlabel('Z', color='#f0f0f0')
ax.set_title("${title}", fontsize=14, color='#d4af37')

ax.xaxis.pane.fill = False
ax.yaxis.pane.fill = False
ax.zaxis.pane.fill = False

save_plot_as_base64()
        `;
    }

    generate3DShapeCode(options) {
        const shapeType = options.shapeType || 'cube';
        const dimensions = options.dimensions || {};
        const showCrossSection = options.showCrossSection || false;
        const crossSectionHeight = options.crossSectionHeight ?? 0.5;

        const dimJson = JSON.stringify(dimensions);

        return `
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

shape_type = "${shapeType}"
dimensions = ${dimJson}

if shape_type in ['cube', 'rectangular_prism']:
    l = dimensions.get('length', 2)
    w = dimensions.get('width', 2)
    h = dimensions.get('height', 2)
    
    vertices = np.array([
        [0, 0, 0], [l, 0, 0], [l, w, 0], [0, w, 0],
        [0, 0, h], [l, 0, h], [l, w, h], [0, w, h]
    ])
    
    faces = [
        [vertices[0], vertices[1], vertices[5], vertices[4]],
        [vertices[1], vertices[2], vertices[6], vertices[5]],
        [vertices[2], vertices[3], vertices[7], vertices[6]],
        [vertices[3], vertices[0], vertices[4], vertices[7]],
        [vertices[0], vertices[1], vertices[2], vertices[3]],
        [vertices[4], vertices[5], vertices[6], vertices[7]]
    ]
    
    ax.add_collection3d(Poly3DCollection(faces, facecolors='#00d4ff', 
                                          linewidths=1.5, edgecolors='#f0f0f0', alpha=0.5))
    ax.set_xlim(0, l)
    ax.set_ylim(0, w)
    ax.set_zlim(0, h)

elif shape_type == 'cylinder':
    r = dimensions.get('radius', 1)
    h = dimensions.get('height', 3)
    
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, h, 50)
    Theta, Z = np.meshgrid(theta, z)
    X = r * np.cos(Theta)
    Y = r * np.sin(Theta)
    
    ax.plot_surface(X, Y, Z, alpha=0.5, color='#00d4ff')
    ax.plot(r * np.cos(theta), r * np.sin(theta), 0, color='#f0f0f0', linewidth=2)
    ax.plot(r * np.cos(theta), r * np.sin(theta), h, color='#f0f0f0', linewidth=2)

elif shape_type == 'cone':
    r = dimensions.get('radius', 2)
    h = dimensions.get('height', 4)
    
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, h, 50)
    Theta, Z = np.meshgrid(theta, z)
    R = r * (1 - Z / h)
    X = R * np.cos(Theta)
    Y = R * np.sin(Theta)
    
    ax.plot_surface(X, Y, Z, alpha=0.5, color='#00d4ff')
    ax.plot(r * np.cos(theta), r * np.sin(theta), 0, color='#f0f0f0', linewidth=2)

elif shape_type == 'sphere':
    r = dimensions.get('radius', 2)
    
    phi = np.linspace(0, np.pi, 30)
    theta = np.linspace(0, 2 * np.pi, 30)
    Phi, Theta = np.meshgrid(phi, theta)
    X = r * np.sin(Phi) * np.cos(Theta)
    Y = r * np.sin(Phi) * np.sin(Theta)
    Z = r * np.cos(Phi)
    
    ax.plot_surface(X, Y, Z, alpha=0.5, color='#00d4ff')

elif shape_type == 'pyramid':
    base = dimensions.get('base', 2)
    h = dimensions.get('height', 3)
    
    base_vertices = np.array([
        [-base/2, -base/2, 0], [base/2, -base/2, 0],
        [base/2, base/2, 0], [-base/2, base/2, 0]
    ])
    apex = np.array([0, 0, h])
    
    faces = [
        [base_vertices[0], base_vertices[1], apex],
        [base_vertices[1], base_vertices[2], apex],
        [base_vertices[2], base_vertices[3], apex],
        [base_vertices[3], base_vertices[0], apex],
        list(base_vertices)
    ]
    
    ax.add_collection3d(Poly3DCollection(faces, facecolors='#00d4ff',
                                          linewidths=1.5, edgecolors='#f0f0f0', alpha=0.5))

elif shape_type == 'triangular_prism':
    base = dimensions.get('base', 2)
    h = dimensions.get('height', 3)
    
    front = np.array([[0, 0, 0], [base, 0, 0], [base/2, 0, base * np.sqrt(3)/2]])
    back = front + np.array([0, h, 0])
    
    faces = [
        list(front), list(back),
        [front[0], front[1], back[1], back[0]],
        [front[1], front[2], back[2], back[1]],
        [front[2], front[0], back[0], back[2]]
    ]
    
    ax.add_collection3d(Poly3DCollection(faces, facecolors='#00d4ff',
                                          linewidths=1.5, edgecolors='#f0f0f0', alpha=0.5))

if ${str(showCrossSection).lower()}:
    max_dim = max(dimensions.values()) if dimensions else 3
    cs_height = max_dim * ${crossSectionHeight}
    xx, yy = np.meshgrid(np.linspace(-max_dim, max_dim, 10), 
                         np.linspace(-max_dim, max_dim, 10))
    zz = np.ones_like(xx) * cs_height
    ax.plot_surface(xx, yy, zz, alpha=0.3, color='#d4af37')

ax.set_xlabel('X', color='#f0f0f0')
ax.set_ylabel('Y', color='#f0f0f0')
ax.set_zlabel('Z', color='#f0f0f0')
ax.set_title(f"3D {shape_type.replace('_', ' ').title()}", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateCrossSectionCode(options) {
        const shapeType = options.shapeType || 'cylinder';
        const cutType = options.cutType || 'horizontal';
        const cutPosition = options.cutPosition ?? 0.5;

        return `
from mpl_toolkits.mplot3d import Axes3D
from matplotlib.patches import Circle, Rectangle, Ellipse

fig = plt.figure(figsize=(14, 6))
ax1 = fig.add_subplot(121, projection='3d')
ax2 = fig.add_subplot(122)

shape_type = "${shapeType}"
cut_type = "${cutType}"
cut_pos = ${cutPosition}

if shape_type == 'cylinder':
    r, h = 1.5, 4
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, h, 50)
    Theta, Z = np.meshgrid(theta, z)
    X = r * np.cos(Theta)
    Y = r * np.sin(Theta)
    
    ax1.plot_surface(X, Y, Z, alpha=0.3, color='#00d4ff')
    
    if cut_type == 'horizontal':
        cut_z = h * cut_pos
        xx, yy = np.meshgrid(np.linspace(-2, 2, 10), np.linspace(-2, 2, 10))
        ax1.plot_surface(xx, yy, np.ones_like(xx) * cut_z, alpha=0.5, color='#d4af37')
        
        circle = Circle((0, 0), r, fill=True, facecolor='#00d4ff', 
                        edgecolor='#f0f0f0', linewidth=2, alpha=0.5)
        ax2.add_patch(circle)
        ax2.set_xlim(-2.5, 2.5)
        ax2.set_ylim(-2.5, 2.5)
        ax2.set_title('Cross Section: Circle', color='#d4af37', fontsize=12)
        
    elif cut_type == 'vertical':
        yy, zz = np.meshgrid(np.linspace(-2, 2, 10), np.linspace(0, h, 10))
        ax1.plot_surface(np.zeros_like(yy), yy, zz, alpha=0.5, color='#d4af37')
        
        rect = Rectangle((-r, 0), 2*r, h, fill=True, facecolor='#00d4ff',
                        edgecolor='#f0f0f0', linewidth=2, alpha=0.5)
        ax2.add_patch(rect)
        ax2.set_xlim(-2.5, 2.5)
        ax2.set_ylim(-0.5, h + 0.5)
        ax2.set_title('Cross Section: Rectangle', color='#d4af37', fontsize=12)

elif shape_type == 'cone':
    r, h = 2, 4
    theta = np.linspace(0, 2 * np.pi, 50)
    z = np.linspace(0, h, 50)
    Theta, Z = np.meshgrid(theta, z)
    R = r * (1 - Z / h)
    X = R * np.cos(Theta)
    Y = R * np.sin(Theta)
    
    ax1.plot_surface(X, Y, Z, alpha=0.3, color='#00d4ff')
    
    if cut_type == 'horizontal':
        cut_z = h * cut_pos
        cut_r = r * (1 - cut_z / h)
        xx, yy = np.meshgrid(np.linspace(-2.5, 2.5, 10), np.linspace(-2.5, 2.5, 10))
        ax1.plot_surface(xx, yy, np.ones_like(xx) * cut_z, alpha=0.5, color='#d4af37')
        
        circle = Circle((0, 0), cut_r, fill=True, facecolor='#00d4ff',
                        edgecolor='#f0f0f0', linewidth=2, alpha=0.5)
        ax2.add_patch(circle)
        ax2.set_xlim(-2.5, 2.5)
        ax2.set_ylim(-2.5, 2.5)
        ax2.set_title(f'Cross Section: Circle (r={cut_r:.1f})', color='#d4af37', fontsize=12)

elif shape_type == 'sphere':
    r = 2
    phi = np.linspace(0, np.pi, 30)
    theta = np.linspace(0, 2 * np.pi, 30)
    Phi, Theta = np.meshgrid(phi, theta)
    X = r * np.sin(Phi) * np.cos(Theta)
    Y = r * np.sin(Phi) * np.sin(Theta)
    Z = r * np.cos(Phi)
    
    ax1.plot_surface(X, Y, Z, alpha=0.3, color='#00d4ff')
    
    cut_z = r * (2 * cut_pos - 1)
    xx, yy = np.meshgrid(np.linspace(-2.5, 2.5, 10), np.linspace(-2.5, 2.5, 10))
    ax1.plot_surface(xx, yy, np.ones_like(xx) * cut_z, alpha=0.5, color='#d4af37')
    
    cut_r = np.sqrt(max(0, r**2 - cut_z**2))
    circle = Circle((0, 0), cut_r, fill=True, facecolor='#00d4ff',
                    edgecolor='#f0f0f0', linewidth=2, alpha=0.5)
    ax2.add_patch(circle)
    ax2.set_xlim(-2.5, 2.5)
    ax2.set_ylim(-2.5, 2.5)
    ax2.set_title(f'Cross Section: Circle (r={cut_r:.1f})', color='#d4af37', fontsize=12)

ax1.set_xlabel('X', color='#f0f0f0')
ax1.set_ylabel('Y', color='#f0f0f0')
ax1.set_zlabel('Z', color='#f0f0f0')
ax1.set_title(f'3D {shape_type.title()} with Cut Plane', color='#d4af37', fontsize=12)

ax2.set_aspect('equal')
ax2.grid(True, alpha=0.3)
ax2.axhline(y=0, color='#d4af37', linewidth=0.5, alpha=0.5)
ax2.axvline(x=0, color='#d4af37', linewidth=0.5, alpha=0.5)

plt.tight_layout()
save_plot_as_base64()
        `;
    }

    // ==================== DATA & STATISTICS ====================

    generateBarChartCode(options) {
        const data = options.data || { 'A': 10, 'B': 20, 'C': 15, 'D': 25 };
        const title = options.title || 'Bar Chart';
        const xlabel = options.xlabel || 'Category';
        const ylabel = options.ylabel || 'Value';
        const horizontal = options.horizontal || false;

        return `
data = ${JSON.stringify(data)}
fig, ax = plt.subplots(figsize=(10, 6))

colors = ['#00d4ff', '#ff6b6b', '#d4af37', '#27ae60', '#9b59b6', '#e74c3c', '#3498db', '#f39c12']

if ${horizontal}:
    bars = ax.barh(list(data.keys()), list(data.values()), color=colors[:len(data)])
    ax.set_xlabel("${ylabel}")
    ax.set_ylabel("${xlabel}")
    for bar, val in zip(bars, data.values()):
        ax.text(val + 0.5, bar.get_y() + bar.get_height()/2, str(val),
                va='center', color='#f0f0f0')
else:
    bars = ax.bar(list(data.keys()), list(data.values()), color=colors[:len(data)], edgecolor='#1a1a2e')
    ax.set_xlabel("${xlabel}")
    ax.set_ylabel("${ylabel}")
    for bar, val in zip(bars, data.values()):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5, str(val),
                ha='center', va='bottom', color='#f0f0f0')

ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.grid(True, alpha=0.3, axis='y' if not ${horizontal} else 'x')

save_plot_as_base64()
        `;
    }

    generateDoubleBarChartCode(options) {
        const data1 = options.data1 || { 'A': 10, 'B': 20, 'C': 15 };
        const data2 = options.data2 || { 'A': 15, 'B': 12, 'C': 22 };
        const label1 = options.label1 || 'Series 1';
        const label2 = options.label2 || 'Series 2';
        const title = options.title || 'Double Bar Chart';

        return `
data1 = ${JSON.stringify(data1)}
data2 = ${JSON.stringify(data2)}

fig, ax = plt.subplots(figsize=(10, 6))

x = np.arange(len(data1))
width = 0.35

bars1 = ax.bar(x - width/2, list(data1.values()), width, label='${label1}', color='#00d4ff', edgecolor='#1a1a2e')
bars2 = ax.bar(x + width/2, list(data2.values()), width, label='${label2}', color='#ff6b6b', edgecolor='#1a1a2e')

ax.set_xlabel('Category')
ax.set_ylabel('Value')
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.set_xticks(x)
ax.set_xticklabels(list(data1.keys()))
ax.legend()
ax.grid(True, alpha=0.3, axis='y')

save_plot_as_base64()
        `;
    }

    generatePieChartCode(options) {
        const data = options.data || { 'A': 30, 'B': 40, 'C': 30 };
        const title = options.title || 'Pie Chart';
        const showPercent = options.showPercent !== false;
        const explode = options.explode || null;

        return `
data = ${JSON.stringify(data)}
fig, ax = plt.subplots(figsize=(8, 8))

colors = ['#00d4ff', '#ff6b6b', '#d4af37', '#27ae60', '#9b59b6', '#e74c3c', '#3498db', '#f39c12']
explode_vals = ${explode ? JSON.stringify(explode) : 'None'}

if explode_vals is None:
    explode_vals = [0] * len(data)

wedges, texts, autotexts = ax.pie(
    list(data.values()), 
    labels=list(data.keys()), 
    autopct='%1.1f%%' if ${showPercent} else '',
    colors=colors[:len(data)],
    explode=explode_vals,
    textprops={'color': '#f0f0f0'},
    wedgeprops={'edgecolor': '#1a1a2e', 'linewidth': 2}
)

for autotext in autotexts:
    autotext.set_color('#1a1a2e')
    autotext.set_fontweight('bold')

ax.set_title("${title}", fontsize=14, color='#d4af37')

save_plot_as_base64()
        `;
    }

    generateScatterPlotCode(points, options) {
        const title = options.title || 'Scatter Plot';
        const showTrendline = options.showTrendline || false;
        const xlabel = options.xlabel || 'X';
        const ylabel = options.ylabel || 'Y';

        return `
points = ${JSON.stringify(points)}
fig, ax = plt.subplots(figsize=(10, 8))

x = np.array([p[0] for p in points])
y = np.array([p[1] for p in points])

ax.scatter(x, y, color='#00d4ff', s=100, alpha=0.7, edgecolors='#f0f0f0', linewidth=1)

if ${showTrendline} and len(x) > 1:
    z = np.polyfit(x, y, 1)
    p = np.poly1d(z)
    x_line = np.linspace(x.min(), x.max(), 100)
    ax.plot(x_line, p(x_line), color='#ff6b6b', linewidth=2, linestyle='--',
            label=f'y = {z[0]:.2f}x + {z[1]:.2f}')
    ax.legend()

ax.set_xlabel("${xlabel}", fontsize=12)
ax.set_ylabel("${ylabel}", fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.grid(True, alpha=0.3)

save_plot_as_base64()
        `;
    }

    generateHistogramCode(options) {
        const data = options.data || [1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 7];
        const bins = options.bins || 'auto';
        const title = options.title || 'Histogram';
        const xlabel = options.xlabel || 'Value';
        const ylabel = options.ylabel || 'Frequency';
        const showStats = options.showStats || false;

        return `
data = np.array(${JSON.stringify(data)})
fig, ax = plt.subplots(figsize=(10, 6))

n, bins_edges, patches = ax.hist(data, bins=${typeof bins === 'string' ? `'${bins}'` : bins}, 
                                  color='#00d4ff', edgecolor='#1a1a2e', alpha=0.7)

for i, patch in enumerate(patches):
    if n[i] > 0:
        ax.text(patch.get_x() + patch.get_width()/2, patch.get_height() + 0.2,
                str(int(n[i])), ha='center', va='bottom', color='#f0f0f0', fontsize=9)

if ${showStats}:
    mean_val = np.mean(data)
    median_val = np.median(data)
    ax.axvline(mean_val, color='#ff6b6b', linewidth=2, linestyle='--', label=f'Mean: {mean_val:.2f}')
    ax.axvline(median_val, color='#d4af37', linewidth=2, linestyle=':', label=f'Median: {median_val:.2f}')
    ax.legend()

ax.set_xlabel("${xlabel}", fontsize=12)
ax.set_ylabel("${ylabel}", fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.grid(True, alpha=0.3, axis='y')

save_plot_as_base64()
        `;
    }

    generateBoxPlotCode(options) {
        const datasets = options.datasets || [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]];
        const labels = options.labels || ['Data'];
        const title = options.title || 'Box Plot';
        const showMean = options.showMean || false;

        return `
datasets = ${JSON.stringify(datasets)}
labels = ${JSON.stringify(labels)}

fig, ax = plt.subplots(figsize=(10, 6))

bp = ax.boxplot(datasets, labels=labels, patch_artist=True, showmeans=${showMean})

colors = ['#00d4ff', '#ff6b6b', '#d4af37', '#27ae60', '#9b59b6']
for i, (patch, color) in enumerate(zip(bp['boxes'], colors[:len(datasets)])):
    patch.set_facecolor(color)
    patch.set_alpha(0.6)

for element in ['whiskers', 'caps', 'medians']:
    for item in bp[element]:
        item.set_color('#f0f0f0')
        item.set_linewidth(2)

if ${showMean}:
    for mean in bp['means']:
        mean.set_markerfacecolor('#ff6b6b')
        mean.set_markeredgecolor('#ff6b6b')

ax.set_ylabel('Value', fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.grid(True, alpha=0.3, axis='y')

save_plot_as_base64()
        `;
    }

    generateLineGraphCode(options) {
        const data = options.data || { 'Jan': 10, 'Feb': 15, 'Mar': 12, 'Apr': 18, 'May': 22 };
        const title = options.title || 'Line Graph';
        const xlabel = options.xlabel || 'X';
        const ylabel = options.ylabel || 'Y';
        const showPoints = options.showPoints !== false;
        const showArea = options.showArea || false;

        return `
data = ${JSON.stringify(data)}
fig, ax = plt.subplots(figsize=(10, 6))

x = list(data.keys())
y = list(data.values())

if ${showArea}:
    ax.fill_between(range(len(x)), y, alpha=0.3, color='#00d4ff')

ax.plot(range(len(x)), y, color='#00d4ff', linewidth=2.5, marker='o' if ${showPoints} else '')

if ${showPoints}:
    ax.scatter(range(len(x)), y, color='#ff6b6b', s=80, zorder=5)
    for i, (xi, yi) in enumerate(zip(range(len(x)), y)):
        ax.annotate(str(yi), (xi, yi), textcoords="offset points", xytext=(0,8),
                   ha='center', fontsize=9, color='#f0f0f0')

ax.set_xticks(range(len(x)))
ax.set_xticklabels(x)
ax.set_xlabel("${xlabel}", fontsize=12)
ax.set_ylabel("${ylabel}", fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.grid(True, alpha=0.3)

save_plot_as_base64()
        `;
    }

    generateDotPlotCode(options) {
        const data = options.data || [1, 2, 2, 3, 3, 3, 4, 4, 5];
        const title = options.title || 'Dot Plot';

        return `
from collections import Counter

data = ${JSON.stringify(data)}
fig, ax = plt.subplots(figsize=(12, 4))

counts = Counter(data)
max_count = max(counts.values())

for value, count in counts.items():
    for i in range(count):
        ax.scatter(value, i + 1, s=200, color='#00d4ff', edgecolors='#f0f0f0', linewidth=1.5)

ax.set_xlim(min(data) - 1, max(data) + 1)
ax.set_ylim(0, max_count + 1)
ax.set_xlabel('Value', fontsize=12)
ax.set_ylabel('Count', fontsize=12)
ax.set_title("${title}", fontsize=14, color='#d4af37')
ax.set_xticks(range(min(data), max(data) + 1))
ax.grid(True, alpha=0.3, axis='x')
ax.axhline(y=0, color='#d4af37', linewidth=1.5)

save_plot_as_base64()
        `;
    }

    generateStemLeafCode(options) {
        const data = options.data || [12, 15, 18, 22, 25, 28, 31, 35, 38, 42, 45];
        const title = options.title || 'Stem-and-Leaf Plot';

        return `
data = sorted(${JSON.stringify(data)})
fig, ax = plt.subplots(figsize=(8, 6))

stems = {}
for val in data:
    stem = val // 10
    leaf = val % 10
    if stem not in stems:
        stems[stem] = []
    stems[stem].append(leaf)

ax.axis('off')
ax.set_xlim(0, 10)
ax.set_ylim(0, len(stems) + 2)

ax.text(2, len(stems) + 1, 'Stem', ha='center', fontsize=12, fontweight='bold', color='#d4af37')
ax.text(3, len(stems) + 1, '|', ha='center', fontsize=12, color='#f0f0f0')
ax.text(6, len(stems) + 1, 'Leaf', ha='center', fontsize=12, fontweight='bold', color='#d4af37')

for i, (stem, leaves) in enumerate(sorted(stems.items(), reverse=True)):
    y = i + 1
    ax.text(2, y, str(stem), ha='center', fontsize=11, color='#00d4ff')
    ax.text(3, y, '|', ha='center', fontsize=11, color='#f0f0f0')
    ax.text(4, y, ' '.join(map(str, sorted(leaves))), ha='left', fontsize=11, color='#ff6b6b')

ax.set_title("${title}", fontsize=14, color='#d4af37', pad=20)

save_plot_as_base64()
        `;
    }

    // ==================== PROBABILITY ====================

    generateProbabilityModelCode(options) {
        const modelType = options.modelType || 'dice';
        const title = options.title || 'Probability Model';

        if (modelType === 'dice') {
            return `
fig, ax = plt.subplots(figsize=(10, 6))
outcomes = [1, 2, 3, 4, 5, 6]
probabilities = [1/6] * 6

bars = ax.bar(outcomes, probabilities, color='#00d4ff', edgecolor='#1a1a2e', width=0.6)
ax.set_xlabel('Outcome', fontsize=12)
ax.set_ylabel('Probability', fontsize=12)
ax.set_title('${title} - Fair Die', fontsize=14, color='#d4af37')
ax.set_ylim(0, 0.25)
ax.set_xticks(outcomes)

for bar, p in zip(bars, probabilities):
    ax.text(bar.get_x() + bar.get_width()/2, p + 0.01, f'{p:.3f}',
            ha='center', color='#f0f0f0', fontsize=10)

ax.axhline(y=1/6, color='#d4af37', linestyle='--', linewidth=1.5, alpha=0.7)
ax.grid(True, alpha=0.3, axis='y')

save_plot_as_base64()
            `;
        } else if (modelType === 'coin') {
            return `
fig, ax = plt.subplots(figsize=(8, 6))
outcomes = ['Heads', 'Tails']
probabilities = [0.5, 0.5]

bars = ax.bar(outcomes, probabilities, color=['#d4af37', '#c0c0c0'], edgecolor='#1a1a2e', width=0.5)
ax.set_ylabel('Probability', fontsize=12)
ax.set_title('${title} - Fair Coin', fontsize=14, color='#d4af37')
ax.set_ylim(0, 0.7)

for bar, p in zip(bars, probabilities):
    ax.text(bar.get_x() + bar.get_width()/2, p + 0.02, f'{p:.0%}',
            ha='center', color='#f0f0f0', fontsize=12, fontweight='bold')

ax.grid(True, alpha=0.3, axis='y')

save_plot_as_base64()
            `;
        } else if (modelType === 'spinner') {
            const sections = options.sections || 4;
            return `
fig, ax = plt.subplots(figsize=(8, 8))
n_sections = ${sections}
sizes = [1/n_sections] * n_sections
labels = [str(i+1) for i in range(n_sections)]
colors = ['#00d4ff', '#ff6b6b', '#d4af37', '#27ae60', '#9b59b6', '#e74c3c', '#3498db', '#f39c12'][:n_sections]

wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%',
                                   textprops={'color': '#f0f0f0', 'fontsize': 12},
                                   wedgeprops={'edgecolor': '#1a1a2e', 'linewidth': 2})

for autotext in autotexts:
    autotext.set_color('#1a1a2e')
    autotext.set_fontweight('bold')

ax.set_title('${title} - ${sections}-Section Spinner', fontsize=14, color='#d4af37')

save_plot_as_base64()
            `;
        } else if (modelType === 'cards') {
            return `
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
probs = [13/52] * 4
colors = ['#e74c3c', '#e74c3c', '#34495e', '#34495e']

axes[0].bar(suits, probs, color=colors, edgecolor='#1a1a2e')
axes[0].set_ylabel('Probability', fontsize=12)
axes[0].set_title('Probability by Suit', fontsize=12, color='#d4af37')
axes[0].set_ylim(0, 0.35)
for i, p in enumerate(probs):
    axes[0].text(i, p + 0.01, f'{p:.2%}', ha='center', color='#f0f0f0')
axes[0].grid(True, alpha=0.3, axis='y')

types = ['Number\\n(2-10)', 'Face\\n(J,Q,K)', 'Ace']
type_probs = [36/52, 12/52, 4/52]
type_colors = ['#00d4ff', '#d4af37', '#ff6b6b']

axes[1].bar(types, type_probs, color=type_colors, edgecolor='#1a1a2e')
axes[1].set_ylabel('Probability', fontsize=12)
axes[1].set_title('Probability by Card Type', fontsize=12, color='#d4af37')
axes[1].set_ylim(0, 0.8)
for i, p in enumerate(type_probs):
    axes[1].text(i, p + 0.02, f'{p:.2%}', ha='center', color='#f0f0f0')
axes[1].grid(True, alpha=0.3, axis='y')

plt.suptitle("${title} - Standard 52-Card Deck", fontsize=14, color='#d4af37', y=1.02)
plt.tight_layout()

save_plot_as_base64()
            `;
        }

        return this.generateBarChartCode(options);
    }

    generateProbabilityVisualizationCode(options) {
        const modelType = options.modelType || 'dice';
        const numTrials = options.numTrials || 100;

        return `
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
ax1, ax2 = axes

model_type = "${modelType}"
num_trials = ${numTrials}

if model_type == 'dice':
    outcomes = [1, 2, 3, 4, 5, 6]
    probs = [1/6] * 6
    
    ax1.bar(outcomes, probs, color='#00d4ff', edgecolor='#1a1a2e', alpha=0.7)
    ax1.set_xlabel('Outcome')
    ax1.set_ylabel('Probability')
    ax1.set_title('Theoretical Distribution', color='#d4af37')
    ax1.set_ylim(0, 0.3)
    ax1.set_xticks(outcomes)
    
    rolls = np.random.randint(1, 7, num_trials)
    rel_freq = [np.sum(rolls == i) / num_trials for i in outcomes]
    ax2.bar(outcomes, rel_freq, color='#ff6b6b', edgecolor='#1a1a2e', alpha=0.7)
    ax2.axhline(y=1/6, color='#00d4ff', linestyle='--', linewidth=2, label='Expected (1/6)')
    ax2.set_xlabel('Outcome')
    ax2.set_ylabel('Relative Frequency')
    ax2.set_title(f'Experimental ({num_trials} rolls)', color='#d4af37')
    ax2.set_ylim(0, 0.3)
    ax2.set_xticks(outcomes)
    ax2.legend()

elif model_type == 'coins':
    n_flips = ${options.numCoins || 3}
    outcomes = list(range(n_flips + 1))
    probs = [comb(n_flips, k) * (0.5 ** n_flips) for k in outcomes]
    
    ax1.bar(outcomes, probs, color='#d4af37', edgecolor='#1a1a2e', alpha=0.7)
    ax1.set_xlabel('Number of Heads')
    ax1.set_ylabel('Probability')
    ax1.set_title(f'Theoretical: {n_flips} Coins', color='#d4af37')
    
    simulations = np.random.binomial(n_flips, 0.5, num_trials)
    rel_freq = [np.sum(simulations == k) / num_trials for k in outcomes]
    ax2.bar(outcomes, rel_freq, color='#ff6b6b', edgecolor='#1a1a2e', alpha=0.7)
    ax2.set_xlabel('Number of Heads')
    ax2.set_ylabel('Relative Frequency')
    ax2.set_title(f'Experimental ({num_trials} trials)', color='#d4af37')

ax1.grid(True, alpha=0.3, axis='y')
ax2.grid(True, alpha=0.3, axis='y')

plt.tight_layout()
save_plot_as_base64()
        `;
    }

    // ==================== INFOGRAPHICS ====================

    generateFlowchartCode(options) {
        const steps = options.steps || ['Start', 'Step 1', 'Step 2', 'End'];
        const title = options.title || 'Process Flowchart';

        return `
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

fig, ax = plt.subplots(figsize=(8, ${Math.max(6, steps.length * 1.5 + 2)}))
ax.set_xlim(0, 10)
ax.set_ylim(0, ${steps.length * 2 + 2})
ax.axis('off')

steps = ${JSON.stringify(steps)}
n = len(steps)
y_positions = [n * 2 - i * 2 for i in range(n)]

for i, (step, y) in enumerate(zip(steps, y_positions)):
    if i == 0 or i == n - 1:
        box = FancyBboxPatch((3, y - 0.4), 4, 0.8, boxstyle="round,pad=0.05,rounding_size=0.4",
                             facecolor='#d4af37', edgecolor='#f0f0f0', linewidth=2)
        text_color = '#1a1a2e'
    else:
        box = FancyBboxPatch((2.5, y - 0.5), 5, 1, boxstyle="round,pad=0.05,rounding_size=0.1",
                             facecolor='#00d4ff', edgecolor='#f0f0f0', linewidth=2)
        text_color = '#1a1a2e'
    
    ax.add_patch(box)
    ax.text(5, y, step, ha='center', va='center', fontsize=11, color=text_color, fontweight='bold')
    
    if i < n - 1:
        ax.annotate('', xy=(5, y_positions[i+1] + 0.6), xytext=(5, y - 0.6),
                   arrowprops=dict(arrowstyle='->', color='#f0f0f0', lw=2))

ax.set_title("${title}", fontsize=14, color='#d4af37', pad=20)

save_plot_as_base64()
        `;
    }

    generateStepsInfographicCode(options) {
        const steps = options.steps || ['Step 1', 'Step 2', 'Step 3'];
        const descriptions = options.descriptions || steps.map((_, i) => `Description ${i + 1}`);
        const title = options.title || 'Step-by-Step Guide';

        return `
from matplotlib.patches import Circle

fig, ax = plt.subplots(figsize=(12, ${Math.max(4, steps.length * 1.8)}))
ax.set_xlim(0, 12)
ax.set_ylim(0, ${steps.length * 2 + 1})
ax.axis('off')

steps = ${JSON.stringify(steps)}
descriptions = ${JSON.stringify(descriptions)}

for i, (step, desc) in enumerate(zip(steps, descriptions)):
    y = ${steps.length * 2} - i * 2
    
    circle = Circle((1, y), 0.35, facecolor='#d4af37', edgecolor='#f0f0f0', linewidth=2)
    ax.add_patch(circle)
    ax.text(1, y, str(i + 1), ha='center', va='center', fontsize=14, color='#1a1a2e', fontweight='bold')
    
    ax.text(2, y + 0.15, step, fontsize=12, color='#d4af37', fontweight='bold')
    ax.text(2, y - 0.3, desc, fontsize=10, color='#f0f0f0')
    
    if i < len(steps) - 1:
        ax.plot([1, 1], [y - 0.45, y - 1.55], color='#444', linewidth=2)

ax.set_title("${title}", fontsize=14, color='#d4af37', pad=20)

save_plot_as_base64()
        `;
    }

    // ==================== UTILITIES ====================

    getImageDataUrl(base64Data) {
        return `data:image/png;base64,${base64Data}`;
    }

    downloadImage(base64Data, filename = 'math_visualization.png') {
        const link = document.createElement('a');
        link.href = this.getImageDataUrl(base64Data);
        link.download = filename;
        link.click();
    }
}

window.pythonEngine = new PythonEngine();
