const { ipcRenderer } = require('electron');

// UBAH 'let' MENJADI 'var' AGAR BISA DIBACA SEMUA FILE
var inventory = [];
var riwayat = [];
var categories = [];
var customers = [];
var currentUser = null;




// Fungsi Pindah Halaman
function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(id).classList.add('active');
    if(document.getElementById('btn-'+id)) {
        document.getElementById('btn-'+id).classList.add('active');
    }
    
    if(window.lucide) lucide.createIcons();
    
    // Trigger fungsi otomatis tiap halaman
    if(id === 'dashboard') {
        updateDash();
        initChart();
    }
}

ipcRenderer.on('res-stok', (e, rows) => {
    inventory = rows;
    if(typeof renderStok === 'function') renderStok();
    if(typeof updateDropdownProduk === 'function') updateDropdownProduk();
    
    // TAMBAHKAN INI agar daftar restok di dashboard ikut ter-update
    if(typeof updateDash === 'function') updateDash(); 
});

ipcRenderer.on('res-pelanggan', (e, rows) => { 
    customers = rows; 
    if(typeof renderPelanggan === 'function') renderPelanggan(); 
    
    // Tambahkan baris ini untuk update dropdown kasir
    if(typeof updateDropdownMember === 'function') updateDropdownMember(); 
});

// Inisialisasi Data saat App Buka
window.onload = () => {
    ipcRenderer.send('get-stok');
    ipcRenderer.send('get-riwayat');
    ipcRenderer.send('get-pelanggan');
    ipcRenderer.send('get-suppliers');
};

