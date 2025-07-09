document.addEventListener('DOMContentLoaded', () => {
    // --- Deklarasi Variabel ---
    const { jsPDF } = window.jspdf;
    const dropZone = document.getElementById('dropZone');
    const uploadInput = document.getElementById('uploadInput');
    const fileList = document.getElementById('fileList');
    const convertButton = document.getElementById('convertButton');
    
    // Kontrol Opsi
    const documentTitleInput = document.getElementById('documentTitle');
    const addPageNumbersCheckbox = document.getElementById('addPageNumbers');
    const pageSizeSelect = document.getElementById('pageSize');
    const imageQualitySlider = document.getElementById('imageQuality');
    const qualityValueSpan = document.getElementById('qualityValue');
    const presetButtons = document.querySelectorAll('.preset-btn');
    
    // Mode Gelap
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Status
    const statusText = document.getElementById('statusText');

    let selectedFiles = [];

    // --- Inisialisasi ---

    // 1. Inisialisasi SortableJS untuk Drag & Drop
    Sortable.create(fileList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: updateFileOrder
    });

    // 2. Inisialisasi Mode Gelap
    const userPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && userPrefersDark)) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    // 3. Muat Pengaturan Tersimpan dari localStorage
    loadSettings();

    // --- Event Listeners ---

    // Pemilih File
    dropZone.addEventListener('click', () => uploadInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });
    uploadInput.addEventListener('change', () => handleFiles(uploadInput.files));

    // Kontrol Opsi
    imageQualitySlider.addEventListener('input', () => updateQualityDisplay(imageQualitySlider.value));
    presetButtons.forEach(btn => btn.addEventListener('click', () => setQuality(btn.dataset.quality)));
    
    // Simpan pengaturan setiap kali diubah
    pageSizeSelect.addEventListener('change', () => saveSetting('pageSize', pageSizeSelect.value));
    imageQualitySlider.addEventListener('change', () => saveSetting('quality', imageQualitySlider.value));
    addPageNumbersCheckbox.addEventListener('change', () => saveSetting('pageNumbers', addPageNumbersCheckbox.checked));

    // Tombol Konversi Utama
    convertButton.addEventListener('click', convertToPdf);
    
    // Toggle Mode Gelap
    darkModeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    });

    // --- Fungsi-Fungsi ---

    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        selectedFiles.push(...newFiles);
        renderFileList();
        updateConvertButtonState();
    }
    
    function renderFileList() {
        fileList.innerHTML = '';
        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.dataset.id = file.lastModified + file.name; // ID unik
            fileItem.innerHTML = `
                <i class="fa-solid fa-grip-vertical drag-handle"></i>
                <i class="fa-solid fa-file-image"></i>
                <span class="file-name">${file.name}</span>
                <i class="fa-solid fa-times remove-btn"></i>
            `;
            fileList.appendChild(fileItem);
            
            // Tambah event listener untuk tombol hapus
            fileItem.querySelector('.remove-btn').addEventListener('click', () => removeFile(index));
        });
    }
    
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        renderFileList();
        updateConvertButtonState();
    }
    
    function updateFileOrder(evt) {
        const item = selectedFiles.splice(evt.oldIndex, 1)[0];
        selectedFiles.splice(evt.newIndex, 0, item);
        renderFileList(); // Re-render untuk menjaga konsistensi
    }

    function updateConvertButtonState() {
        convertButton.disabled = selectedFiles.length === 0;
    }

    function updateQualityDisplay(value) {
        qualityValueSpan.textContent = value;
    }

    function setQuality(value) {
        imageQualitySlider.value = value;
        updateQualityDisplay(value);
        saveSetting('quality', value);
    }
    
    function saveSetting(key, value) {
        const settings = JSON.parse(localStorage.getItem('pdfConverterSettings')) || {};
        settings[key] = value;
        localStorage.setItem('pdfConverterSettings', JSON.stringify(settings));
    }
    
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('pdfConverterSettings')) || {};
        pageSizeSelect.value = settings.pageSize || 'a4';
        imageQualitySlider.value = settings.quality || '90';
        addPageNumbersCheckbox.checked = settings.pageNumbers !== false; // default true
        updateQualityDisplay(imageQualitySlider.value);
    }

    async function convertToPdf() {
        if (selectedFiles.length === 0) return;

        const pageSize = pageSizeSelect.value;
        const quality = parseInt(imageQualitySlider.value) / 100;
        const documentTitle = documentTitleInput.value.trim();
        const addNumbers = addPageNumbersCheckbox.checked;

        convertButton.disabled = true;
        convertButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memproses...';
        
        let pdf;
        if (pageSize !== 'original') {
            pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: pageSize });
        }

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                statusText.textContent = `Menambahkan gambar ${i + 1} dari ${selectedFiles.length}...`;
                
                const img = await loadImage(await readFileAsDataURL(file));
                const compressedImgData = compressImage(img, quality);
                
                if (pageSize === 'original') {
                    const orientation = img.width > img.height ? 'l' : 'p';
                    if (i === 0) {
                        pdf = new jsPDF({ orientation, unit: 'px', format: [img.width, img.height] });
                    } else {
                        pdf.addPage([img.width, img.height], orientation);
                    }
                    pdf.addImage(compressedImgData, 'JPEG', 0, 0, img.width, img.height);
                } else {
                    const pageInfo = pdf.internal.pageSize;
                    const pageW = pageInfo.getWidth();
                    const pageH = pageInfo.getHeight();
                    const pageRatio = pageW / pageH;
                    const imgRatio = img.width / img.height;
                    
                    let newW, newH;
                    if (imgRatio > pageRatio) { newW = pageW; newH = newW / imgRatio; } 
                    else { newH = pageH; newW = newH * imgRatio; }
                    
                    if (i > 0) pdf.addPage();
                    pdf.addImage(compressedImgData, 'JPEG', (pageW - newW) / 2, (pageH - newH) / 2, newW, newH);
                }
            }

            if (addNumbers) {
                const pageCount = pdf.internal.getNumberOfPages();
                pdf.setFontSize(10);
                pdf.setTextColor(150);
                for (let i = 1; i <= pageCount; i++) {
                    pdf.setPage(i);
                    const pageInfo = pdf.internal.pageSize;
                    pdf.text(`Halaman ${i} dari ${pageCount}`, pageInfo.getWidth() / 2, pageInfo.getHeight() - 10, { align: 'center' });
                }
            }
            
            pdf.setProperties({ title: documentTitle || 'Dokumen Konversi' });
            pdf.save((documentTitle || 'dokumen-konversi') + '.pdf');
            statusText.textContent = `${selectedFiles.length} gambar berhasil dikonversi!`;

        } catch (error) {
            statusText.textContent = 'Terjadi kesalahan saat konversi.';
            console.error(error);
        } finally {
            // Reset state
            convertButton.disabled = false;
            convertButton.innerHTML = '<i class="fa-solid fa-gear"></i> Konversi ke PDF';
            selectedFiles = [];
            renderFileList();
            uploadInput.value = ''; 
        }
    }

    // --- Fungsi Helper ---
    function readFileAsDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
    function loadImage(src) { return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; }); }
    function compressImage(img, quality) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return c.toDataURL('image/jpeg', quality); }
});