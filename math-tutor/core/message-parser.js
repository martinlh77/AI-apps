/**
 * MessageParser - Content Rendering & Code Extraction
 * Handles markdown, code blocks, visuals, and app call parsing
 */

class MessageParser {
    constructor() {
        this.appCallRegex = /\[\[APP:(\w+)\|({.*?})\]\]/g;
        this.pythonCodeRegex = /```python\s*([\s\S]*?)```/g;
        this.codeBlockRegex = /```(\w*)\s*([\s\S]*?)```/g;
    }

    extractAppCalls(text) {
        const appCalls = [];
        let cleanText = text;

        let match;
        while ((match = this.appCallRegex.exec(text)) !== null) {
            const appId = match[1];
            const payloadStr = match[2];

            try {
                const payload = JSON.parse(payloadStr);
                appCalls.push({ appId, payload });
            } catch (e) {
                console.error(`Invalid JSON in app call for ${appId}:`, payloadStr);
            }
        }

        cleanText = cleanText.replace(this.appCallRegex, '');
        return { cleanText, appCalls };
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

    extractExercises(text) {
        const exercises = [];
        const exerciseRegex = /\[\[EXERCISE:(.*?)\|(.*?)\]\]/g;
        let match;

        while ((match = exerciseRegex.exec(text)) !== null) {
            exercises.push({
                question: match[1],
                answer: match[2],
                fullMatch: match[0]
            });
        }

        return exercises;
    }

    renderContent(text, options = {}) {
        let html = text;

        // Extract and render Python code blocks
        const pythonBlocks = this.extractPythonCode(html);
        pythonBlocks.forEach((block, index) => {
            const codeId = `python-code-${Date.now()}-${index}`;
            const codeHtml = this.renderCodeBlock('python', block.code, codeId, options.canRunPython);
            html = html.replace(block.fullMatch, codeHtml);
        });

        // Handle other code blocks
        html = html.replace(/```(\w*)\s*([\s\S]*?)```/g, (match, lang, code) => {
            if (lang === 'python') return match; // Already handled
            return this.renderCodeBlock(lang || 'text', code.trim());
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
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // Tables
        const tableRegex = /(\|.*\|\n\|[-|]+\|\n(?:\|.*\|\n?)+)/g;
        html = html.replace(tableRegex, (match) => this.renderTable(match));

        return html;
    }

    renderCodeBlock(language, code, codeId = null, canRun = false) {
        const id = codeId || `code-${Date.now()}`;
        const escapedCode = this.escapeHtml(code);
        const isPython = language.toLowerCase() === 'python';

        let actionsHtml = `
            <button class="action-btn copy-code-btn" data-code="${this.escapeHtml(code)}">📋</button>
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
                <div class="code-output" id="${id}-output" style="display: none;"></div>
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
}
