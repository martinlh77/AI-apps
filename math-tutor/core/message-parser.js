/**
 * MessageParser - Content Rendering & Code Extraction
 * Handles markdown, code blocks, visuals, and parsing
 */

class MessageParser {
    constructor() {
        this.pythonCodeRegex = /```python\s*([\s\S]*?)```/g;
    }

    extractPythonCode(text) {
        const pythonBlocks = [];
        let match;
        const regex = /```python\s*([\s\S]*?)```/g;

        while ((match = regex.exec(text)) !== null) {
            pythonBlocks.push({
                code: match[1].trim(),
                fullMatch: match[0]
            });
        }

        return pythonBlocks;
    }

    renderContent(text, options = {}) {
        let html = text;

        // First, extract and preserve Python code blocks for auto-execution
        // Replace them with a placeholder that won't be affected by other formatting
        const pythonBlocks = [];
        let blockIndex = 0;
        
        html = html.replace(/```python\s*([\s\S]*?)```/g, (match, code) => {
            const placeholder = `__PYTHON_BLOCK_${blockIndex}__`;
            pythonBlocks.push({
                index: blockIndex,
                code: code.trim()
            });
            blockIndex++;
            return placeholder;
        });

        // Handle other code blocks (non-Python)
        html = html.replace(/```(\w*)\s*([\s\S]*?)```/g, (match, lang, code) => {
            if (lang.toLowerCase() === 'python') return match; // Already handled
            return this.renderCodeBlock(lang || 'text', code.trim(), null, false);
        });

        // Handle SVG
        const svgRegex = /<svg[\s\S]*?<\/svg>/g;
        html = html.replace(svgRegex, (match) => {
            return `<div class="visual-container">${match}</div>`;
        });

        // Remove LaTeX delimiters
        html = html.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, "$1");

        // Markdown formatting
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // Tables
        const tableRegex = /(\|.*\|<br>\|[-|]+\|<br>(?:\|.*\|<br>?)+)/g;
        html = html.replace(tableRegex, (match) => this.renderTable(match.replace(/<br>/g, '\n')));

        // Now restore Python blocks - but DON'T render them as code blocks
        // They will be auto-executed, so just show a loading placeholder
        pythonBlocks.forEach(block => {
            const placeholder = `__PYTHON_BLOCK_${block.index}__`;
            // Replace with a minimal indicator that visualization is coming
            // The actual visualization will be appended after auto-execution
            html = html.replace(placeholder, `<div class="python-pending" data-code-index="${block.index}"><em>📊 Generating visualization...</em></div>`);
        });

        return html;
    }

    renderCodeBlock(language, code, codeId = null, canRun = false) {
        const id = codeId || `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const escapedCode = this.escapeHtml(code);
        const isPython = language.toLowerCase() === 'python';

        let actionsHtml = `
            <button class="action-btn copy-code-btn" data-code="${this.escapeAttr(code)}">📋 Copy</button>
        `;

        if (isPython && canRun) {
            actionsHtml += `
                <button class="action-btn run-code-btn" data-code-id="${id}">▶️ Run</button>
            `;
        }

        return `
            <div class="code-container" id="${id}">
                <div class="code-header">
                    <span class="code-language">${language.toUpperCase()}</span>
                    <div class="code-actions">${actionsHtml}</div>
                </div>
                <div class="code-block">
                    <pre>${escapedCode}</pre>
                </div>
            </div>
        `;
    }

    renderTable(tableText) {
        const rows = tableText.trim().split('\n');
        if (rows.length < 3) return tableText;

        const headers = rows[0].split('|').filter(cell => cell.trim());
        const dataRows = rows.slice(2);

        let html = '<div class="visual-container"><table>';

        html += '<thead><tr>';
        headers.forEach(header => {
            html += `<th>${header.trim()}</th>`;
        });
        html += '</tr></thead>';

        html += '<tbody>';
        dataRows.forEach(row => {
            const cells = row.split('|').filter(cell => cell.trim());
            if (cells.length === 0) return;

            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${cell.trim()}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeAttr(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
