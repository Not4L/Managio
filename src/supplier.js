var suppliers = [];

// Meminta data saat halaman dimuat
ipcRenderer.on('res-suppliers', (e, rows) => {
    suppliers = rows;
    renderSupplier();
});

function tambahSupplier() {
    const nama = document.getElementById('sup-nama').value;
    const kontak = document.getElementById('sup-kontak').value;
    const alamat = document.getElementById('sup-alamat').value;

    if (!nama || !kontak) return alert("Nama dan Kontak wajib diisi!");

    ipcRenderer.send('add-supplier', { nama, kontak, alamat });

    // Reset Form
    document.getElementById('sup-nama').value = '';
    document.getElementById('sup-kontak').value = '';
    document.getElementById('sup-alamat').value = '';
}

function renderSupplier() {
    const tbody = document.getElementById('tabel-supplier');
    if (!tbody) return;

    if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data supplier.</td></tr>';
        return;
    }

    tbody.innerHTML = suppliers.map(s => `
        <tr>
            <td><b>${s.nama}</b></td>
            <td>${s.kontak}</td>
            <td>${s.alamat || '-'}</td>
            <td>
                <button class="btn-danger" onclick="ipcRenderer.send('del-supplier', ${s.id})">Hapus</button>
            </td>
        </tr>
    `).join('');
}