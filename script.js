document.addEventListener('DOMContentLoaded', () => {
    // Pustaka
    const { jsPDF } = window.jspdf;
    const { PDFDocument } = PDFLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

    // --- Manajemen Tampilan (Views) ---
    const views = document.querySelectorAll('.view');
    const toolCards = document.querySelectorAll('.tool-card');
    const backToMenuBtn = document.querySelector('.back-to-menu-btn');

    function switchView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        const isMenu = viewId === 'main-menu-view';
        backToMenuBtn.style.display = isMenu ? 'none' : 'inline-flex';
        const mainMenuHeader = document.querySelector('#main-menu-view .header');
        if (mainMenuHeader) mainMenuHeader.style.display = isMenu ? 'block' : 'none';
    }

    toolCards.forEach(card => card.addEventListener('click', () => switchView(card.dataset.view)));
    backToMenuBtn.addEventListener('click', () => switchView('main-menu-view'));

    // --- Mode Gelap ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && userPrefersDark)) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // --- FUNGSI ALAT 1: GAMBAR KE PDF ---
    const uploadInput = document.getElementById('uploadInput');
    const dropZone = document.getElementById('dropZone');
    const fileList = document.getElementById('fileList');
    const convertButton = document.getElementById('convertButton');
    const documentTitleInput = document.getElementById('documentTitle');
    const pageSizeSelect = document.getElementById('pageSize');
    const imageLayoutSelect = document.getElementById('imageLayout');
    const imageResolutionSelect = document.getElementById('imageResolution');
    const addPageNumbersCheckbox = document.getElementById('addPageNumbers');
    let imageFiles = [];

    // *** PERBAIKAN: Tambahkan event listener untuk mencegah konflik ***
    pageSizeSelect.addEventListener('change', () => {
        if (pageSizeSelect.value === 'original') {
            imageLayoutSelect.value = 'fit'; // Set default ke 1 gambar/halaman
            imageLayoutSelect.disabled = true;
        } else {
            imageLayoutSelect.disabled = false;
        }
    });

    Sortable.create(fileList, { animation: 150, handle: '.drag-handle', onEnd: (e) => reorderArray(imageFiles, e.oldIndex, e.newIndex) });
    dropZone.addEventListener('click', () => uploadInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        handleImageFiles(e.dataTransfer.files);
    });
    uploadInput.addEventListener('change', () => handleImageFiles(uploadInput.files));
    convertButton.addEventListener('click', convertImagesToPdf);
    
    function handleImageFiles(files) {
        imageFiles.push(...Array.from(files).filter(f => f.type.startsWith('image/')));
        renderFileList(imageFiles, fileList, 'image');
        convertButton.disabled = imageFiles.length === 0;
    }

    async function convertImagesToPdf() {
        if (imageFiles.length === 0) return;
        convertButton.textContent = 'Mengonversi...';
        convertButton.disabled = true;

        try {
            const layout = imageLayoutSelect.value;
            const paperSize = pageSizeSelect.value;
            
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: paperSize === 'original' ? undefined : paperSize
            });
            if (paperSize !== 'original') doc.deletePage(1);

            for (let i = 0; i < imageFiles.length; i++) {
                // Tentukan kapan harus menambah halaman baru
                const shouldAddPage = (layout === '2-up' && i % 2 === 0) || layout !== '2-up';
                
                if (shouldAddPage) {
                    const img = await loadImage(URL.createObjectURL(imageFiles[i]));
                    const size = paperSize === 'original' ? [img.width * 0.264583, img.height * 0.264583] : paperSize;
                    const orientation = img.width > img.height ? 'l' : 'p';
                    doc.addPage(size, orientation);
                }

                const page = doc.internal.pages[doc.internal.pages.length - 1];
                const pageWidth = page.width;
                const pageHeight = page.height;

                let compression = 'MEDIUM';
                if (imageResolutionSelect.value === 'high') compression = 'SLOW';
                if (imageResolutionSelect.value === 'best') compression = 'NONE';
                
                const img = await loadImage(URL.createObjectURL(imageFiles[i]));
                let imgWidth = img.width;
                let imgHeight = img.height;

                if (layout === '2-up') {
                    const isTopImage = i % 2 === 0;
                    const yPos = isTopImage ? 0 : pageHeight / 2;
                    // Paskan gambar ke setengah halaman
                    const areaRatio = Math.min(pageWidth / imgWidth, (pageHeight / 2) / imgHeight);
                    const newWidth = imgWidth * areaRatio;
                    const newHeight = imgHeight * areaRatio;
                    const xPos = (pageWidth - newWidth) / 2;
                    doc.addImage(img, 'JPEG', xPos, yPos + ((pageHeight / 2) - newHeight) / 2, newWidth, newHeight, undefined, compression);
                } else {
                    let newWidth, newHeight, x, y;
                    if (layout === 'fill') {
                        const ratio = pageWidth / imgWidth;
                        newWidth = pageWidth;
                        newHeight = imgHeight * ratio;
                        x = 0;
                        y = (pageHeight - newHeight) / 2;
                    } else { // 'fit'
                        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
                        newWidth = imgWidth * ratio;
                        newHeight = imgHeight * ratio;
                        x = (pageWidth - newWidth) / 2;
                        y = (pageHeight - newHeight) / 2;
                    }
                    doc.addImage(img, 'JPEG', x, y, newWidth, newHeight, undefined, compression);
                }
            }
            
            if (addPageNumbersCheckbox.checked) {
                for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
                    doc.setPage(i);
                    const page = doc.internal.pages[i];
                    doc.setFontSize(10);
                    doc.text(`${i}`, page.width / 2, page.height - 5, { align: 'center' });
                }
            }

            const title = documentTitleInput.value.trim() || 'dokumen-gambar';
            doc.save(`${title}.pdf`);

        } catch (e) {
            console.error(e);
            alert('Gagal mengonversi gambar ke PDF. Error: ' + e.message);
        } finally {
            resetImageToPdfView();
        }
    }

    function resetImageToPdfView() {
        convertButton.textContent = 'Konversi ke PDF';
        imageFiles = [];
        uploadInput.value = '';
        renderFileList(imageFiles, fileList, 'image');
        convertButton.disabled = true;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    }

    // --- FUNGSI ALAT 2 & 3 (Tidak ada perubahan) ---
    // ... (kode untuk Gabungkan PDF dan Pisah & Hapus Halaman tetap sama) ...
    const mergeInput = document.getElementById('mergeInput');
    const mergeDropZone = document.getElementById('mergeDropZone');
    const mergeFileList = document.getElementById('mergeFileList');
    const mergeButton = document.getElementById('mergeButton');
    let pdfToMergeFiles = [];
    
    Sortable.create(mergeFileList, { animation: 150, handle: '.drag-handle', onEnd: (e) => reorderArray(pdfToMergeFiles, e.oldIndex, e.newIndex) });
    mergeDropZone.addEventListener('click', () => mergeInput.click());
    mergeDropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    mergeDropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    mergeDropZone.addEventListener('drop', (e) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        handleMergeFiles(e.dataTransfer.files);
    });
    mergeInput.addEventListener('change', () => handleMergeFiles(mergeInput.files));
    mergeButton.addEventListener('click', mergePdfs);
    
    function handleMergeFiles(files) {
        pdfToMergeFiles.push(...Array.from(files).filter(f => f.type === 'application/pdf'));
        renderFileList(pdfToMergeFiles, mergeFileList, 'pdf');
        mergeButton.disabled = pdfToMergeFiles.length < 2;
    }

    async function mergePdfs() {
        if(pdfToMergeFiles.length < 2) return;
        mergeButton.textContent = 'Menggabungkan...';
        mergeButton.disabled = true;
        try {
            const mergedPdf = await PDFDocument.create();
            for (const file of pdfToMergeFiles) {
                const pdfDoc = await PDFDocument.load(await file.arrayBuffer(), {ignoreEncryption: true});
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }
            download(await mergedPdf.save(), 'dokumen-gabungan.pdf', 'application/pdf');
        } catch(e) { console.error(e); alert("Gagal menggabungkan PDF."); }
        finally {
            mergeButton.textContent = 'Gabungkan PDF';
            pdfToMergeFiles = [];
            renderFileList(pdfToMergeFiles, mergeFileList, 'pdf');
            mergeButton.disabled = true;
        }
    }

    const modifyInput = document.getElementById('modifyInput');
    const modifyDropZone = document.getElementById('modifyDropZone');
    const previewArea = document.getElementById('pdf-preview-area');
    const pdfActions = document.getElementById('pdf-actions');
    const removePdfButton = document.getElementById('removeButton');
    const splitPdfButton = document.getElementById('splitButton');
    let originalPdfFile = null;

    modifyDropZone.addEventListener('click', () => modifyInput.click());
    modifyDropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    modifyDropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    modifyDropZone.addEventListener('drop', (e) => {
        e.preventDefault(); e.currentTarget.classList.remove('drag-over');
        const file = Array.from(e.dataTransfer.files).find(f => f.type === 'application/pdf');
        if(file) handleModifyFile(file);
    });
    modifyInput.addEventListener('change', (e) => { if(e.target.files.length) handleModifyFile(e.target.files[0]) });

    async function handleModifyFile(file) {
        originalPdfFile = file;
        modifyDropZone.style.display = 'none';
        previewArea.innerHTML = '<i>Membaca PDF...</i>';
        
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = async function() {
            try {
                const pdf = await pdfjsLib.getDocument(this.result).promise;
                previewArea.innerHTML = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    const pageContainer = document.createElement('div');
                    pageContainer.className = 'pdf-page-container';
                    pageContainer.dataset.pageNum = i;
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    pageContainer.appendChild(canvas);
                    const additionalHTML = `
                        <div class="page-overlay">
                            <button class="page-action-btn remove" title="Pilih untuk Dihapus"><i class="fa-solid fa-trash-can"></i></button>
                            <button class="page-action-btn split" title="Pilih untuk Dipisah"><i class="fa-solid fa-copy"></i></button>
                        </div>
                        <span class="page-number">${i}</span>`;
                    pageContainer.insertAdjacentHTML('beforeend', additionalHTML);
                    previewArea.appendChild(pageContainer);
                }
                pdfActions.style.display = 'flex';
            } catch (e) { console.error(e); alert('Gagal memuat pratinjau PDF.'); resetModifyView(); }
        }
    }
    
    previewArea.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-action-btn');
        if(!btn) return;
        const pageContainer = btn.closest('.pdf-page-container');
        if(btn.classList.contains('remove')) pageContainer.classList.toggle('selected-for-remove');
        if(btn.classList.contains('split')) pageContainer.classList.toggle('selected-for-split');
    });

    removePdfButton.addEventListener('click', async () => {
        const pagesToRemove = Array.from(previewArea.querySelectorAll('.selected-for-remove')).map(p => parseInt(p.dataset.pageNum));
        if(pagesToRemove.length === 0) { alert("Pilih halaman yang ingin dihapus terlebih dahulu."); return; }
        
        try {
            const pdfDoc = await PDFDocument.load(await originalPdfFile.arrayBuffer(), {ignoreEncryption: true});
            pagesToRemove.sort((a,b) => b-a).forEach(num => pdfDoc.removePage(num - 1));
            download(await pdfDoc.save(), `dihapus-${originalPdfFile.name}`, 'application/pdf');
        } catch(e) { console.error(e); alert('Gagal menghapus halaman.'); }
        finally { resetModifyView(); }
    });
    
    splitPdfButton.addEventListener('click', async () => {
        const pagesToSplit = Array.from(previewArea.querySelectorAll('.selected-for-split')).map(p => parseInt(p.dataset.pageNum));
        if(pagesToSplit.length === 0) { alert("Pilih halaman yang ingin dipisah terlebih dahulu."); return; }
        
        try {
            const pdfDoc = await PDFDocument.load(await originalPdfFile.arrayBuffer(), {ignoreEncryption: true});
            for (const pageNum of pagesToSplit) {
                 const newPdf = await PDFDocument.create();
                 const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNum - 1]);
                 newPdf.addPage(copiedPage);
                 download(await newPdf.save(), `halaman-${pageNum}_dari_${originalPdfFile.name}`, 'application/pdf');
            }
        } catch(e) { console.error(e); alert('Gagal memisahkan halaman.'); }
        finally { resetModifyView(); }
    });

    function resetModifyView() {
        originalPdfFile = null;
        modifyInput.value = '';
        modifyDropZone.style.display = 'block';
        previewArea.innerHTML = '';
        pdfActions.style.display = 'none';
    }

    function renderFileList(files, container, type) {
        container.innerHTML = '';
        files.forEach((file, index) => {
            const icon = type === 'image' ? 'fa-file-image' : 'fa-file-pdf';
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `<i class="fa-solid fa-grip-vertical drag-handle"></i><i class="fa-solid ${icon}"></i><span class="file-name">${file.name}</span><i class="fa-solid fa-times remove-btn"></i>`;
            fileItem.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                files.splice(index, 1);
                renderFileList(files, container, type);
                if(container === fileList) convertButton.disabled = files.length === 0;
                if(container === mergeFileList) mergeButton.disabled = files.length < 2;
            });
            container.appendChild(fileItem);
        });
    }
    
    function reorderArray(arr, oldIndex, newIndex) {
        arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0]);
    }

    function download(bytes, fileName, mimeType) {
        const blob = new Blob([bytes], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
});