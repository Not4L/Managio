let keranjang = [];

function updateDropdownProduk() {
    const select = document.getElementById('pilih-barang');
    if(!select) return;
    select.innerHTML = inventory.map(p => `<option value="${p.id}">${p.nama} (Stok: ${p.stok})</option>`).join('');
}

function tambahKeKeranjang() {
    const id = parseInt(document.getElementById('pilih-barang').value);
    const qtyInput = parseInt(document.getElementById('qty-beli').value);
    const brg = inventory.find(i => i.id === id);

    const indexAda = keranjang.findIndex(item => item.id === id);
    if (indexAda !== -1) {
        const qtyBaru = keranjang[indexAda].qty + qtyInput;
        if (qtyBaru > brg.stok) return alert("Stok tidak mencukupi!");
        keranjang[indexAda].qty = qtyBaru;
        keranjang[indexAda].subtotal = brg.harga * qtyBaru;
    } else {
        if (qtyInput > brg.stok) return alert("Stok tidak mencukupi!");
        keranjang.push({ ...brg, qty: qtyInput, subtotal: brg.harga * qtyInput });
    }
    renderKeranjang();
}

function renderKeranjang() {
    const tbody = document.getElementById('tabel-keranjang');
    tbody.innerHTML = keranjang.map((item, index) => `
        <tr>
            <td>${item.nama}</td>
            <td>${item.qty}</td>
            <td>Rp ${item.subtotal.toLocaleString()}</td>
            <td><button onclick="keranjang.splice(${index},1); renderKeranjang()">X</button></td>
        </tr>
    `).join('');
}

// 1. Update fungsi ini
function updateDropdownMember() {
    const datalist = document.getElementById('list-member');
    if(!datalist) return;
    
    // Format: "ID - Nama (Telepon)"
    datalist.innerHTML = customers.map(c => 
        `<option value="${c.id} - ${c.nama} (${c.telepon})">`
    ).join('');
}

// 2. Di dalam fungsi prosesTransaksi(), ubah cara ambil ID member:
function prosesTransaksi() {
    if(keranjang.length === 0) return alert("Keranjang kosong!");
    const total = keranjang.reduce((a,b) => a + b.subtotal, 0);
    const totalQty = keranjang.reduce((a,b) => a + b.qty, 0); 
    const waktuISO = new Date().toISOString(); 

    // CARA BARU AMBIL ID DARI DATALIST
    const memberInput = document.getElementById('in-member').value;
    let memberId = "";
    let poinDidapat = 0;

    // Jika input tidak kosong, ambil angka sebelum tanda " - "
    if (memberInput && memberInput.includes(" - ")) {
        memberId = parseInt(memberInput.split(" - ")[0]);
        poinDidapat = Math.floor(total / 10000); 
    }

    ipcRenderer.send('proses-transaksi', { 
        items: keranjang, total, totalQty, waktu: waktuISO, memberId, poinGained: poinDidapat 
    });

    keranjang = []; 
    renderKeranjang(); 
    document.getElementById('in-member').value = ""; // Reset input
    
    let msg = "Transaksi Berhasil!";
    if (poinDidapat > 0) msg += `\nPelanggan mendapat ${poinDidapat} Poin!`;
    alert(msg);
}

// Fungsi untuk mendaftarkan member baru
function tambahPelanggan() {
    const nama = document.getElementById('in-nama-pelanggan').value;
    const telp = document.getElementById('in-telp-pelanggan').value;

    if (!nama || !telp) {
        alert("Nama dan Nomor Telepon tidak boleh kosong!");
        return;
    }

    // Mengirim data ke main.js
    ipcRenderer.send('add-pelanggan', { nama, telp });

    // Kosongkan input setelah klik
    document.getElementById('in-nama-pelanggan').value = '';
    document.getElementById('in-telp-pelanggan').value = '';
}

// Fungsi untuk menampilkan data member ke tabel
function renderPelanggan() {
    const tbody = document.getElementById('tabel-pelanggan');
    if (!tbody) return;

    tbody.innerHTML = customers.map(p => `
        <tr>
            <td>${p.nama}</td>
            <td>${p.telepon}</td>
            <td><b style="color: #0ea5e9;">${p.poin} Poin</b></td>
            <td>
                <button class="btn-danger" onclick="ipcRenderer.send('del-pelanggan', ${p.id})" style="padding: 5px 10px; font-size: 12px;">Hapus</button>
            </td>
        </tr>
    `).join('');
}