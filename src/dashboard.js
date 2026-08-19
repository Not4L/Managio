let myChart = null;

ipcRenderer.on('res-riwayat', (e, rows) => {
    riwayat = rows;
    renderTabelRiwayat();
    updateDash();
    initChart();
});

// ─── RENDER TABEL RIWAYAT ────────────────────────────────────────
function renderTabelRiwayat() {
    const tbody = document.getElementById('tabel-riwayat');
    if (!tbody) return;

    if (riwayat.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Belum ada transaksi.</td></tr>';
        return;
    }

    tbody.innerHTML = riwayat.map(r => {
        let listBarang = '-';
        try {
            const items = JSON.parse(r.detail);
            listBarang = items.map(i => `${i.nama} (${i.qty})`).join(', ');
        } catch(e) { listBarang = r.detail; }

        return `
            <tr>
                <td>${new Date(r.waktu).toLocaleString('id-ID')}</td>
                <td>${listBarang}</td>
                <td><b>Rp ${(r.total_bayar || 0).toLocaleString('id-ID')}</b></td>
            </tr>
        `;
    }).join('');
}

// ─── UPDATE KARTU DASHBOARD ──────────────────────────────────────
function updateDash() {
    // 1. TOTAL OMZET — jumlah semua total_bayar dari riwayat
    const totalOmzet = riwayat.reduce((sum, r) => sum + (r.total_bayar || 0), 0);
    const elUang = document.getElementById('dash-uang');
    if (elUang) elUang.innerText = 'Rp ' + totalOmzet.toLocaleString('id-ID');

    // 2. TOTAL TERJUAL — jumlah semua item yang terjual
    const totalTerjual = riwayat.reduce((sum, r) => sum + (r.total_items || 0), 0);
    const elTerjual = document.getElementById('dash-terjual');
    if (elTerjual) elTerjual.innerText = totalTerjual;

    // 3. JENIS PRODUK — jumlah produk unik di inventory
    const elProduk = document.getElementById('dash-produk-unik');
    if (elProduk) elProduk.innerText = inventory.length;

    // 4. STOK MENIPIS — produk dengan stok <= 10
    const lowStockItems = inventory.filter(p => p.stok <= 10);
    const elLowStock = document.getElementById('dash-low-stock');
    if (elLowStock) elLowStock.innerText = lowStockItems.length;

    const listLowStock = document.getElementById('list-low-stock');
    if (!listLowStock) return;
    if (lowStockItems.length === 0) {
        listLowStock.innerHTML = '<li style="color:#94a3b8; font-size:13px;">Semua stok aman.</li>';
    } else {
        listLowStock.innerHTML = lowStockItems.map(p => `
            <li style="color:#e11d48; font-weight:bold; margin-bottom:5px;">
                ${p.nama} <span>(${p.stok} unit tersisa)</span>
            </li>
        `).join('');
    }
}

// ─── GRAFIK PENJUALAN ────────────────────────────────────────────
function initChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    if (myChart) myChart.destroy();

    // Ambil 7 transaksi terakhir, balik urutan agar grafik dari kiri ke kanan
    const data7 = riwayat.slice(0, 7).reverse();

    myChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: data7.map(r => new Date(r.waktu).toLocaleTimeString('id-ID')),
            datasets: [{
                label: 'Omzet',
                data: data7.map(r => r.total_bayar || 0),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#38bdf8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ─── FILTER RIWAYAT PER TANGGAL ──────────────────────────────────
function filterRiwayat() {
    const filterTgl = document.getElementById('filter-tanggal').value;
    const tbody = document.getElementById('tabel-riwayat');
    const elTotal = document.getElementById('total-pendapatan-hari');
    if (!tbody) return;

    const filtered = filterTgl
        ? riwayat.filter(r => r.waktu && r.waktu.startsWith(filterTgl))
        : riwayat;

    const totalHari = filtered.reduce((sum, r) => sum + (r.total_bayar || 0), 0);
    if (elTotal) elTotal.innerText = 'Rp ' + totalHari.toLocaleString('id-ID');

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Tidak ada transaksi di tanggal ini.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        let listBarang = '-';
        try {
            const items = JSON.parse(r.detail);
            listBarang = items.map(i => `${i.nama} (${i.qty})`).join(', ');
        } catch(e) { listBarang = r.detail; }

        return `
            <tr>
                <td>${new Date(r.waktu).toLocaleString('id-ID')}</td>
                <td>${listBarang}</td>
                <td><b>Rp ${(r.total_bayar || 0).toLocaleString('id-ID')}</b></td>
            </tr>
        `;
    }).join('');
}