// ============================================================
// MANAGIO — src/inventory.js
// Tombol Edit  → buka modal popup
// Tombol Tambah → form atas (murni tambah baru)
// ============================================================

ipcRenderer.on('res-stok', (e, rows) => {
    inventory = rows;
    renderStok();
    updateDropdownProduk();
});

ipcRenderer.on('res-kategori', (e, rows) => {
    categories = rows;
    renderKategori();
});

// ─── RENDER TABEL STOK ───────────────────────────────────────
function renderStok() {
    const tabel = document.getElementById('tabel-stok');
    if (!tabel) return;

    const isAdmin = currentUser && currentUser.role === 'admin';

    tabel.innerHTML = inventory.map(p => `
        <tr>
            <td><b>${p.nama}</b></td>
            <td class="${p.stok <= 10 ? 'text-danger' : ''}">${p.stok}</td>
            <td>
                ${isAdmin ? `<small style="color:#94a3b8;">Modal: Rp ${(p.harga_beli || 0).toLocaleString('id-ID')}</small><br>` : ''}
                <b>Rp ${(p.harga || 0).toLocaleString('id-ID')}</b>
            </td>
            <td>
                ${isAdmin ? `
                    <button class="btn-edit" onclick="bukaModalEdit(${p.id})">
                        <i data-lucide="pencil" style="width:14px;height:14px;"></i> Edit
                    </button>
                    <button class="btn-danger" onclick="ipcRenderer.send('del-stok', ${p.id})">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Hapus
                    </button>
                ` : `<span style="color:#94a3b8; font-size:13px;">🔒 Terkunci</span>`}
            </td>
        </tr>
    `).join('');

    // Re-render lucide icons setelah tabel diisi
    if (window.lucide) lucide.createIcons();
}

// ─── TAMBAH PRODUK BARU (form atas) ──────────────────────────
function tambahStok() {
    const nama   = document.getElementById('in-nama').value.trim();
    const stok   = document.getElementById('in-stok').value;
    const h_beli = document.getElementById('in-harga-beli').value;
    const h_jual = document.getElementById('in-harga').value;

    if (!nama || !stok || !h_beli || !h_jual) {
        return alert('Semua kolom harus diisi!');
    }

    ipcRenderer.send('add-stok', {
        nama,
        stok:       parseInt(stok),
        harga_beli: parseInt(h_beli),
        harga:      parseInt(h_jual)
    });

    // Reset form
    document.getElementById('in-nama').value       = '';
    document.getElementById('in-stok').value       = '';
    document.getElementById('in-harga-beli').value = '';
    document.getElementById('in-harga').value      = '';
}

// ─── MODAL EDIT ───────────────────────────────────────────────
function bukaModalEdit(id) {
    const barang = inventory.find(i => i.id === id);
    if (!barang) return;

    // Isi field modal dengan data produk
    document.getElementById('edit-id').value        = barang.id;
    document.getElementById('edit-nama').value      = barang.nama;
    document.getElementById('edit-stok').value      = barang.stok;
    document.getElementById('edit-harga-beli').value = barang.harga_beli || 0;
    document.getElementById('edit-harga').value     = barang.harga;

    // Tampilkan modal
    const modal = document.getElementById('modal-edit-produk');
    modal.classList.add('active');
    document.getElementById('edit-nama').focus();

    if (window.lucide) lucide.createIcons();
}

function tutupModalEdit(event) {
    // Tutup hanya jika klik di overlay (background), bukan di dalam box
    if (event && event.target !== document.getElementById('modal-edit-produk')) return;

    document.getElementById('modal-edit-produk').classList.remove('active');
}

function simpanEditProduk() {
    const id     = parseInt(document.getElementById('edit-id').value);
    const nama   = document.getElementById('edit-nama').value.trim();
    const stok   = document.getElementById('edit-stok').value;
    const h_beli = document.getElementById('edit-harga-beli').value;
    const h_jual = document.getElementById('edit-harga').value;

    if (!nama || !stok || !h_beli || !h_jual) {
        return alert('Semua kolom harus diisi!');
    }

    ipcRenderer.send('update-produk', {
        id,
        nama,
        stok:       parseInt(stok),
        harga_beli: parseInt(h_beli),
        harga:      parseInt(h_jual)
    });

    // Tutup modal
    document.getElementById('modal-edit-produk').classList.remove('active');
}

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('modal-edit-produk').classList.remove('active');
    }
});