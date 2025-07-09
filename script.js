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
        document.querySelector('.header').style.display = isMenu ? 'block' : 'none';
    }

    toolCards.forEach(card => {
        card.addEventListener('click', () => switchView(card.dataset.view));
    });
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
    let imageFiles = [];

    Sortable.create(fileList, { animation: 150, handle: '.drag-handle', onEnd: (e) => reorderArray(imageFiles, e.oldIndex, e.newIndex) });
    dropZone.addEventListener('click', () => uploadInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
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
        // Logika konversi gambar ke PDF (disingkat, karena sudah ada sebelumnya)
        alert('Fungsi konversi gambar ke PDF akan dijalankan di sini!');
    }


    // --- FUNGSI ALAT 2: GABUNGKAN PDF ---
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
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
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

    // --- FUNGSI ALAT 3: PISAH & HAPUS HALAMAN ---
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
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
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
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    const pageContainer = document.createElement('div');
                    pageContainer.className = 'pdf-page-container';
                    pageContainer.dataset.pageNum = i;
                    pageContainer.appendChild(canvas);
                    pageContainer.innerHTML += `
                        <div class="page-overlay">
                            <button class="page-action-btn remove" title="Pilih untuk Dihapus"><i class="fa-solid fa-trash-can"></i></button>
                            <button class="page-action-btn split" title="Pilih untuk Dipisah"><i class="fa-solid fa-copy"></i></button>
                        </div>
                        <span class="page-number">${i}</span>
                    `;
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


    // --- FUNGSI HELPER UMUM ---
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
                // Update button states
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
        link.click();
        URL.revokeObjectURL(link.href);
    }
});