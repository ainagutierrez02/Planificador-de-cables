// Standalone PDF export: canvas image and cable list.
(function () {
    const pageWidth = 595.28; // A4 vertical en puntos PDF.
    const pageHeight = 841.89;

    function binaryBytes(value) {
        const result = new Uint8Array(value.length);
        for (let i = 0; i < value.length; i++) result[i] = value.charCodeAt(i) & 255;
        return result;
    }
    function pdfString(value, limit = 80) {
        const chars = [...String(value)];
        const shortened = chars.length > limit ?
            chars.slice(0, limit - 3).join('') + '...' : chars.join('');
        return shortened.replace(/[\\()]/g, '\\$&').replace(/[\r\n\t]/g, ' ')
            .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
            .replace(/[–—]/g, '-').replace(/€/g, 'EUR')
            .replace(/[^\x20-\xFF]/g, '?');
    }
    function textLine(x, y, value, size = 10, limit = 80) {
        return `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfString(value, limit)}) Tj ET\n`;
    }
    function streamObject(body) {
        return [binaryBytes(`<< /Length ${body.length} >>\nstream\n`), body,
            binaryBytes('\nendstream')];
    }
    function makePages(rows) {
        const pages = [rows.slice(0, 15)];
        for (let i = 15; i < rows.length; i += 38) pages.push(rows.slice(i, i + 38));
        return pages;
    }

    function createProjectPdf(name, canvas, rows) {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
            throw new Error('Could not convert the plan to a JPEG image.');
        }
        const jpeg = binaryBytes(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)));
        const pages = makePages(rows);
        const objects = [];
        const pageIds = pages.map((_, index) => 6 + index * 2);
        objects[1] = [binaryBytes('<< /Type /Catalog /Pages 2 0 R >>')];
        objects[2] = [binaryBytes(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`)];
        objects[3] = [binaryBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')];
        objects[4] = [binaryBytes(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
            jpeg, binaryBytes('\nendstream')];

        const cableCount = rows.reduce((sum, row) => sum + row.count, 0);
        const total = rows.reduce((sum, row) => sum +
            (row.meters === null ? 0 : row.count * row.meters), 0);
        const internalCount = rows.filter(row => row.internal)
            .reduce((sum, row) => sum + row.count, 0);
        pages.forEach((pageRows, pageIndex) => {
            const first = pageIndex === 0;
            const contentId = 5 + pageIndex * 2;
            const pageId = 6 + pageIndex * 2;
            let content = '';
            content += textLine(30, 800, name, name.length > 45 ? 12 : 18);
            content += textLine(30, 779, `Required cables: ${cableCount}`, 10);
            content += textLine(520, 800, `${pageIndex + 1} / ${pages.length}`, 10);
            let headerY;
            if (first) {
                const imageWidth = Math.min(pageWidth - 60, 395 * canvas.width / canvas.height);
                const imageHeight = imageWidth * canvas.height / canvas.width;
                const imageX = (pageWidth - imageWidth) / 2;
                const imageY = 755 - imageHeight;
                content += `q ${imageWidth.toFixed(2)} 0 0 ${imageHeight.toFixed(2)} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm /Im1 Do Q\n`;
                headerY = Math.min(365, imageY - 20);
            } else {
                headerY = 775;
            }
            content += `0.9 0.93 0.95 rg 30 ${headerY - 6} ${pageWidth - 60} 19 re f 0 0 0 rg\n`;
            content += textLine(37, headerY, 'Cable list', 10);
            if (rows.length === 0) content += textLine(37, headerY - 22, 'No cables in this project yet.', 10);
            pageRows.forEach((row, index) => {
                const y = headerY - 22 - index * 18;
                const amount = `${row.count} cable${row.count === 1 ? '' : 's'}`;
                const lengthText = row.meters === null ?
                    'not to scale (inside rack)' :
                    `${row.meters.toFixed(2)} m${row.count > 1 ? ' each' : ''}`;
                content += textLine(37, y,
                    `${amount} ${row.startType} to ${row.endType} ${lengthText}`, 10, 110);
            });
            if (pageIndex === pages.length - 1) {
                content += `0.35 0.42 0.48 RG 30 48 m ${pageWidth - 30} 48 l S\n`;
                content += textLine(340, 30,
                    `Calculated length outside racks: ${total.toFixed(2)} m`, 10);
                if (internalCount) content += textLine(37, 65,
                    `Rack cables not to scale: ${internalCount}`, 9);
            }
            objects[contentId] = streamObject(binaryBytes(content));
            objects[pageId] = [binaryBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> /XObject << /Im1 4 0 R >> >> /Contents ${contentId} 0 R >>`)];
        });

        const parts = [];
        let length = 0;
        function append(chunk) { parts.push(chunk); length += chunk.length; }
        append(binaryBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
        const offsets = [0];
        for (let id = 1; id < objects.length; id++) {
            offsets[id] = length;
            append(binaryBytes(`${id} 0 obj\n`));
            for (const part of objects[id]) append(part);
            append(binaryBytes('\nendobj\n'));
        }
        const xref = length;
        append(binaryBytes(`xref\n0 ${objects.length}\n0000000000 65535 f \n`));
        for (let id = 1; id < objects.length; id++) {
            append(binaryBytes(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
        }
        append(binaryBytes(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
        return new Blob(parts, { type: 'application/pdf' });
    }

    window.createProjectPdf = createProjectPdf;
})();
