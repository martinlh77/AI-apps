/**
 * MessageParser - Content Rendering & Code Extraction
 * Handles markdown, code blocks, visuals, and parsing
 */

class MessageParser {
    constructor() {
        // Match ```python ... ``` code blocks
        this.pythonCodeRegex = /```python\s*([\s\S]*?)```/g;
    }

    extractPythonCode(text) {
        const pythonBlocks = [];
        let match;
        // Reset regex state
        const regex = /```python\s*([\s\S]*?)```/g;

        while ((match = regex.exec(text)) !== null) {
            const code = match[1].trim();
            if (code.length > 0) {
                pythonBlocks.push({
                    code: code,
                    fullMatch: match[0]
                });
            }
        }

        console.log('extractPythonCode found', pythonBlocks.length, 'blocks');
        return pythonBlocks;
    }

    renderContent(text, options = {}) {
        let html = text;

        // First, extract Python code blocks and replace with placeholders
        const pythonBlocks = [];
        let blockIndex = 0;
        
        html = html.replace(/```python\s*([\s\S]*?)```/g, (match, code) => {
            const trimmedCode = code.trim();
            if (trimmedCode.length > 0) {
                const placeholder = `<div class="python-pending" data-code-index="${blockIndex}"><em>📊 Generating visualization...</em></div>`;
                pythonBlocks.push({
                    index: blockIndex,
                    code: trimmedCode
                });
                blockIndex++;
                return placeholder;
            }
            return ''; // Empty code block, remove it
        });

        // Handle other code blocks (non-Python) - show them as code
        html = html.replace(/```(\w*)\s*([\s\S]*?)```/g, (match, lang, code) => {
            const trimmedCode = code.trim();
            if (trimmedCode.length === 0) return '';
            return this.renderCodeBlock(lang || 'text', trimmedCode, null, false);
        });

        // Handle SVG
        html = html.replace(/<svg[\s\S]*?<\/svg>/g, (match) => {
            return `<div class="visual-container">${match}</div>`;
        });

        // Handle tables (markdown style)
        html = html.replace(/\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g, (match, header, body) => {
            return this.renderTable(match);
        });

        // Remove LaTeX delimiters but keep content
        html = html.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
        html = html.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
        html = html.replace(/\$([^\$]+)\$/g, "$1");

        // Markdown formatting (do this AFTER code block extraction)
        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers (simple support)
        html = html.replace(/^### (.+)$/gm, '<h4 style="color: var(--accent-color); margin: 10px 0 5px;">$1</h4>');
        html = html.replace(/^## (.+)$/gm, '<h3 style="color: var(--accent-color); margin: 15px 0 8px;">$1</h3>');
        html = html.replace(/^# (.+)$/gm, '<h2 style="color: var(--accent-color); margin: 20px 0 10px;">$1</h2>');

        // Lists (simple support)
        html = html.replace(/^\* (.+)$/gm, '• $1');
        html = html.replace(/^- (.+)$/gm, '• $1');
        html = html.replace(/^\d+\. (.+)$/gm, (match, content, offset, string) => {
            // Simple numbered list handling
            return `${match}`;
        });

        // Convert newlines to <br> LAST
        html = html.replace(/\n/g, '<br>');

        // Clean up multiple <br> tags
        html = html.replace(/(<br\s*\/?>){3,}/g, '<br><br>');

        return html;
    }

    renderCodeBlock(language, code, codeId = null, canRun = false) {
        const id = codeId || `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const escapedCode = this.escapeHtml(code);

        let actionsHtml = `
            <button class="action-btn copy-code-btn" data-code="${this.escapeAttr(code)}">📋 Copy</button>
        `;

        if (canRun && language.toLowerCase() === 'python') {
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
            html += `<th>${this.escapeHtml(header.trim())}</th>`;
        });
        html += '</tr></thead>';

        html += '<tbody>';
        dataRows.forEach(row => {
            const cells = row.split('|').filter(cell => cell.trim());
            if (cells.length === 0) return;

            html += '<tr>';
            cells.forEach(cell => {
                html += `<td>${this.escapeHtml(cell.trim())}</td>`;
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
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '&#10;');
    }
}
