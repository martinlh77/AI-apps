/**
 * MessageParser - Content Rendering & App Extraction
 * Handles markdown, SVG, tables, and app call parsing
 */

class MessageParser {
    constructor() {
        this.appCallRegex = /\[\[APP:(\w+)\|({.*?})\]\]/g;
    }

    /**
     * Extract app calls from LLM response
     * @param {string} text - Raw LLM response
     * @returns {Object} { cleanText, appCalls }
     */
    extractAppCalls(text) {
        const appCalls = [];
        let cleanText = text;

        // Find all app markers
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

        // Remove app markers from text
        cleanText = cleanText.replace(this.appCallRegex, '');

        return { cleanText, appCalls };
    }

    /**
     * Render message content with visual aids
     * @param {string} text - Message text
     * @returns {string} HTML string
     */
    renderContent(text) {
        let html = text;

        // 1. Strip markdown code blocks around SVG/XML
        html = html.replace(/```svg\s*([\s\S]*?)```/g, "$1");
        html = html.replace(/```xml\s*([\s\S]*?)```/g, "$1");
        html = html.replace(/```\s*([\s\S]*?)\s*```/g, "$1");

        // 2. Handle raw SVG tags
        const svgRegex = /<svg[\s\S]*?<\/svg>/g;
        if (svgRegex.test(html)) {
            html = html.replace(svgRegex, (match) => {
                // Enhance SVG for dark background visibility
                const enhancedSvg = this.enhanceSVG(match);
                return `<div class="visual-container">${enhancedSvg}</div>`;
            });
        }

        // 3. Remove coordinate table artifacts (X Y columns, etc.)
        html = html.replace(/^\s*[XYxy]\s*$/gm, "");
        html = html.replace(/^[-|\s\dXYxy]+$/gm, "");
        html = html.replace(/(\s*\n\s*){3,}/g, '\n\n');

        // 4. Remove LaTeX delimiters
        html = html.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
        html = html.replace(/\\\[([\s\S]*?)\\\]/g, "$1");

        // 5. Markdown formatting
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');

        // 6. Tables
        const tableRegex = /(\|.*\|\n\|[-|]+\|\n(?:\|.*\|\n?)+)/g;
        if (tableRegex.test(html)) {
            html = html.replace(tableRegex, (match) => {
                return this.renderTable(match);
            });
        }

        return html;
    }

    /**
     * Enhance SVG for better visibility on dark backgrounds
     * @param {string} svgString - Raw SVG markup
     * @returns {string} Enhanced SVG
     */
    enhanceSVG(svgString) {
        let svg = svgString;

        // Ensure proper colors for dark backgrounds
        if (!svg.includes('stroke="rgba(255,255,255')) {
            // Add default styling if missing
            svg = svg.replace(
                '<svg',
                '<svg style="background: rgba(255,255,255,0.05); border-radius: 8px; padding: 10px;"'
            );
        }

        return svg;
    }

    /**
     * Convert markdown table to HTML
     * @param {string} tableText - Markdown table
     * @returns {string} HTML table
     */
    renderTable(tableText) {
        const rows = tableText.trim().split('\n');
        if (rows.length < 3) return tableText; // Invalid table

        const headers = rows[0].split('|').filter(cell => cell.trim());
        const dataRows = rows.slice(2); // Skip header separator

        let html = '<div class="visual-container"><table>';
        
        // Headers
        html += '<thead><tr>';
        headers.forEach(header => {
            html += `<th>${header.trim()}</th>`;
        });
        html += '</tr></thead>';

        // Body
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
}