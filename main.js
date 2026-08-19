

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const mysql = require('mysql2');

const db = mysql.createConnection({
    host:     'localhost',
    port:     3306,
    user:     'root',
    password: '',            
    database: 'managio_db'  
});

function q(sql, params, cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    db.query(sql, params, (err, rows) => {
        if (err) console.error('[DB ERROR]', err.message, '|', sql);
        if (cb) cb(err, rows);
    });
}

function initTabel() {
    q(`CREATE TABLE IF NOT EXISTS produk (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        nama        VARCHAR(255)   NOT NULL,
        stok        INT            DEFAULT 0,
        harga       INT            DEFAULT 0,
        harga_beli  INT            DEFAULT 0,
        id_kategori INT            DEFAULT NULL
    )`);

    q(`CREATE TABLE IF NOT EXISTS users (
        id       INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role     VARCHAR(50)  NOT NULL
    )`);

    q(`CREATE TABLE IF NOT EXISTS suppliers (
        id     INT AUTO_INCREMENT PRIMARY KEY,
        nama   VARCHAR(255),
        kontak VARCHAR(100),
        alamat TEXT
    )`);

    q(`CREATE TABLE IF NOT EXISTS riwayat (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        waktu       VARCHAR(100),
        detail      TEXT,
        total_items INT DEFAULT 0,
        total_bayar INT DEFAULT 0
    )`);

    q(`CREATE TABLE IF NOT EXISTS kategori (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        nama_kategori VARCHAR(255)
    )`);

    q(`CREATE TABLE IF NOT EXISTS pelanggan (
        id      INT AUTO_INCREMENT PRIMARY KEY,
        nama    VARCHAR(255),
        telepon VARCHAR(50),
        poin    INT DEFAULT 0
    )`);

    q(`CREATE TABLE IF NOT EXISTS toko_config (
        id          INT PRIMARY KEY DEFAULT 1,
        nama_toko   VARCHAR(255),
        alamat_toko TEXT
    )`);

    // User default — INSERT IGNORE agar tidak duplikat
    q(`INSERT IGNORE INTO users (username, password, role) VALUES
        ('admin', '123', 'admin'),
        ('kasir', '123', 'pegawai')`);

    console.log('[DB] Semua tabel siap.');
}

// ----------------------------------------------------------------
// KONEKSI KE MYSQL
// ----------------------------------------------------------------
db.connect((err) => {
    if (err) {
        console.error('[DB] Gagal konek MySQL:', err.message);
        app.whenReady().then(() => {
            dialog.showErrorBox(
                'Gagal Konek Database',
                `Pastikan Laragon sudah Running dan database "managio_db" sudah dibuat di phpMyAdmin.\n\nDetail: ${err.message}`
            );
        });
        return;
    }
    console.log('[DB] MySQL Laragon aktif di localhost:3306 → managio_db');
    initTabel();
});

// ----------------------------------------------------------------
// BUAT JENDELA APLIKASI
// ----------------------------------------------------------------
function createWindow() {
    const win = new BrowserWindow({
        width: 1200, height: 850,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration:  true,
            contextIsolation: false
        }
    });
    win.loadFile('index.html');
}

// ================================================================
// IPC HANDLERS
// ================================================================

// ── PRODUK / STOK ────────────────────────────────────────────────

ipcMain.on('get-stok', (e) => {
    q("SELECT * FROM produk", (err, rows) => {
        e.reply('res-stok', rows || []);
    });
});

ipcMain.on('add-stok', (e, data) => {
    q("INSERT INTO produk (nama, stok, harga, harga_beli) VALUES (?, ?, ?, ?)",
        [data.nama, data.stok, data.harga, data.harga_beli],
        (err) => {
            if (!err) q("SELECT * FROM produk", (err2, rows) => e.reply('res-stok', rows));
        }
    );
});

ipcMain.on('del-stok', (e, id) => {
    q("DELETE FROM produk WHERE id = ?", [id], () => e.reply('op-success'));
});

ipcMain.on('update-stok', (e, data) => {
    q("UPDATE produk SET stok = ? WHERE id = ?", [data.stok, data.id], (err) => {
        if (!err) q("SELECT * FROM produk", (err2, rows) => e.reply('res-stok', rows));
    });
});

// Update semua field produk (dari modal edit)
ipcMain.on('update-produk', (e, data) => {
    q("UPDATE produk SET nama = ?, stok = ?, harga_beli = ?, harga = ? WHERE id = ?",
        [data.nama, data.stok, data.harga_beli, data.harga, data.id],
        (err) => {
            if (!err) q("SELECT * FROM produk", (err2, rows) => e.reply('res-stok', rows));
        }
    );
});

// ── AUTHENTICATION ────────────────────────────────────────────────

ipcMain.on('attempt-login', (e, creds) => {
    q("SELECT * FROM users WHERE username = ? AND password = ?",
        [creds.user, creds.pass],
        (err, rows) => {
            if (err) {
                e.reply('login-res', { success: false, msg: 'Database Error' });
            } else if (rows && rows.length > 0) {
                e.reply('login-res', { success: true, user: rows[0] });
            } else {
                e.reply('login-res', { success: false, msg: 'Username/Password Salah!' });
            }
        }
    );
});

// ── TRANSAKSI ─────────────────────────────────────────────────────

ipcMain.on('proses-transaksi', (e, data) => {
    db.beginTransaction((errTx) => {
        if (errTx) {
            console.error('[TX] Gagal mulai transaksi:', errTx.message);
            return;
        }

        const detailJSON = JSON.stringify(data.items);

        // 1. Simpan riwayat
        db.query(
            "INSERT INTO riwayat (waktu, detail, total_items, total_bayar) VALUES (?, ?, ?, ?)",
            [data.waktu, detailJSON, data.totalQty, data.total],
            (err) => {
                if (err) return db.rollback(() => console.error('[TX] Gagal insert riwayat'));

                // 2. Update stok setiap item
                let pending = data.items.length;
                if (pending === 0) return lanjutPoin();

                data.items.forEach(item => {
                    db.query(
                        "UPDATE produk SET stok = stok - ? WHERE id = ?",
                        [item.qty, item.id],
                        (err2) => {
                            if (err2) return db.rollback(() => console.error('[TX] Gagal update stok'));
                            if (--pending === 0) lanjutPoin();
                        }
                    );
                });
            }
        );

        function lanjutPoin() {
            // 3. Update poin pelanggan (opsional)
            if (data.memberId && data.poinGained > 0) {
                db.query(
                    "UPDATE pelanggan SET poin = poin + ? WHERE id = ?",
                    [data.poinGained, data.memberId],
                    (err) => {
                        if (err) console.error('[TX] Gagal update poin:', err.message);
                        commit();
                    }
                );
            } else {
                commit();
            }
        }

        function commit() {
            db.commit((errCommit) => {
                if (errCommit) {
                    return db.rollback(() => console.error('[TX] Commit gagal'));
                }
                // Kirim data terbaru ke renderer
                q("SELECT * FROM riwayat ORDER BY id DESC", (e2, rows) => e.reply('res-riwayat', rows || []));
                q("SELECT * FROM produk",                   (e2, rows) => e.reply('res-stok', rows || []));
                q("SELECT * FROM pelanggan",                (e2, rows) => e.reply('res-pelanggan', rows || []));
            });
        }
    });
});

// ── KATEGORI ─────────────────────────────────────────────────────

ipcMain.on('get-kategori', (e) => {
    q("SELECT * FROM kategori", (err, rows) => e.reply('res-kategori', rows || []));
});

ipcMain.on('add-kategori', (e, nama) => {
    q("INSERT INTO kategori (nama_kategori) VALUES (?)", [nama], () => e.reply('op-success'));
});

// ── SUPPLIERS ─────────────────────────────────────────────────────

ipcMain.on('get-suppliers', (e) => {
    q("SELECT * FROM suppliers", (err, rows) => {
        if (!err) e.reply('res-suppliers', rows || []);
    });
});

ipcMain.on('add-supplier', (e, data) => {
    q("INSERT INTO suppliers (nama, kontak, alamat) VALUES (?, ?, ?)",
        [data.nama, data.kontak, data.alamat],
        (err) => {
            if (!err) q("SELECT * FROM suppliers", (e2, rows) => e.reply('res-suppliers', rows));
        }
    );
});

ipcMain.on('del-supplier', (e, id) => {
    q("DELETE FROM suppliers WHERE id = ?", [id], (err) => {
        if (!err) q("SELECT * FROM suppliers", (e2, rows) => e.reply('res-suppliers', rows));
    });
});

// ── PELANGGAN ─────────────────────────────────────────────────────

ipcMain.on('get-pelanggan', (e) => {
    q("SELECT * FROM pelanggan", (err, rows) => e.reply('res-pelanggan', rows || []));
});

ipcMain.on('add-pelanggan', (e, data) => {
    q("INSERT INTO pelanggan (nama, telepon, poin) VALUES (?, ?, 0)",
        [data.nama, data.telp],
        (err) => {
            if (!err) {
                q("SELECT * FROM pelanggan", (e2, rows) => e.reply('res-pelanggan', rows));
            } else {
                console.error('[DB] Gagal tambah pelanggan:', err.message);
            }
        }
    );
});

ipcMain.on('del-pelanggan', (e, id) => {
    q("DELETE FROM pelanggan WHERE id = ?", [id], (err) => {
        if (!err) q("SELECT * FROM pelanggan", (e2, rows) => e.reply('res-pelanggan', rows));
    });
});

// ── RIWAYAT ───────────────────────────────────────────────────────

ipcMain.on('get-riwayat', (e) => {
    q("SELECT * FROM riwayat ORDER BY id DESC", (err, rows) => e.reply('res-riwayat', rows || []));
});

// ================================================================
// LIFECYCLE ELECTRON
// ================================================================
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });