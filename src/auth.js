function prosesLogin() {
    try {
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;

        // Manual Check (Gunakan ini jika tidak lewat Database untuk login)
        if (user === 'a' && pass === 'a') {
            currentUser = { username: 'Admin Toko', role: 'admin' };
        } else if (user === 'k' && pass === 'k') {
            currentUser = { username: 'Kasir 1', role: 'pegawai' };
        } else {
            document.getElementById('login-error').innerText = "Username atau Password salah!";
            return;
        }

        // Jika Berhasil:
        document.getElementById('login-screen').style.display = 'none';
        
        applyPermissions(); // Jalankan hak akses
        
        // Render ulang semua tabel agar tahu siapa yang masuk
        if (typeof renderStok === "function") renderStok();
        if (typeof renderPelanggan === "function") renderPelanggan();
        
        // Paksa ke dashboard
        showPage('dashboard');

    } catch (error) {
        console.error("Gagal Login:", error);
    }
}

// Menangani respon dari Main Process
ipcRenderer.on('login-res', (e, res) => {
    if(res.success) {
        currentUser = res.user;
        document.getElementById('login-screen').style.display = 'none'; // Sembunyikan login
        
        // Atur hak akses berdasarkan role
        applyPermissions();
        
        // Buka dashboard secara default
        showPage('dashboard');
    } else {
        document.getElementById('login-error').innerText = res.msg;
    }
});

function applyPermissions() {
    if (!currentUser) return;
    const role = currentUser.role;
    
    document.querySelectorAll('nav button').forEach(btn => btn.style.display = 'flex');
    const formStok = document.getElementById('form-tambah-stok');
    if (formStok) formStok.style.display = 'flex';

    if (role === 'pegawai') {
        const hiddenMenus = ['btn-laporan', 'btn-pengaturan', 'btn-kategori', 'btn-supplier'];
        hiddenMenus.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = 'none';
        });
        if (formStok) formStok.style.display = 'none';
    }
}

function logout() {
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}