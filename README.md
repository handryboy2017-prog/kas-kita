# Kas Kita (aplikasi Android)

Catat pemasukan dan pengeluaran rumah tangga berdua. Data tersinkron lewat Firebase (gratis), bisa dicatat saat tidak ada internet, ada anggaran, transaksi berulang, foto struk, dan ekspor Excel/CSV.

Ada tiga tahap: **A. Firebase**, **B. Bangun APK di GitHub**, **C. Pasang di HP**. Semuanya dari browser, tanpa install apa pun di komputer.

---

## A. Siapkan Firebase (sekali saja, sekitar 10 menit)

1. Buka https://console.firebase.google.com dan masuk dengan akun Google.
2. Klik **Create a project**, beri nama (mis. `kas-kita`). Google Analytics boleh dimatikan.
3. Menu **Build > Authentication > Get started > Sign-in method**, pilih **Anonymous**, aktifkan, **Save**.
4. Menu **Build > Firestore Database > Create database**.
   - Lokasi: `asia-southeast2` (Jakarta) atau yang terdekat.
   - Pilih **Production mode**, lalu **Create**.
5. Di Firestore, buka tab **Rules**. Hapus isinya, tempel seluruh isi file `firestore.rules` dari proyek ini, klik **Publish**.
6. Klik ikon roda gigi di samping Project Overview, pilih **Project settings**. Di bagian **Your apps**, klik ikon web `</>`, beri nama bebas, **Register app**.
7. Salin blok `const firebaseConfig = { ... };` yang muncul. Simpan di catatan, nanti ditempel di aplikasi. (Isi ini bukan kata sandi. Keamanan datanya dijaga oleh aturan di langkah 5 dan kode rumah tangga.)

## B. Bangun APK di GitHub (sekali saja, sekitar 10 menit)

Proyek ini hanya berisi file biasa (tanpa folder), jadi tidak perlu menyeret apa pun.

1. Buat repo di https://github.com (**New repository**, nama `kas-kita`, **Private**, tanpa README).
2. Ekstrak file zip proyek ini. Di halaman repo, klik **uploading an existing file**, lalu klik tautan **choose your files**. Di jendela pemilih file, buka folder hasil ekstrak, pilih semua file (tekan Ctrl+A di komputer, atau ketuk Pilih semua di HP), lalu **Open**. Tunggu semuanya terunggah dan klik **Commit changes**.
3. Buat file alur pembangunan: klik **Add file > Create new file**. Di kolom nama, ketik persis `.github/workflows/build-apk.yml` (garis miring otomatis membuat folder). Buka file `build-apk.yml.txt` dengan Notepad, salin seluruh isinya, tempel di kotak isi, lalu **Commit changes**.
4. Buka tab **Actions**. Proses **Bangun APK Kas Kita** jalan otomatis (5 sampai 10 menit). Bila belum jalan, pilih prosesnya di sisi kiri lalu **Run workflow**.
5. Setelah ada tanda centang hijau, klik proses itu dan unduh **Kas-Kita-APK** di bagian **Artifacts** paling bawah. Isi zip-nya adalah `Kas-Kita.apk`.

## C. Pasang di HP

1. Pindahkan `Kas-Kita.apk` ke HP (WhatsApp ke diri sendiri, Google Drive, atau kabel).
2. Buka file APK. Android akan meminta izin **Install dari sumber ini**. Izinkan, lalu **Install**.
3. **HP pertama:** buka Kas Kita, tab **Lainnya > Sinkron dengan pasangan > Mulai baru**. Tempel blok `firebaseConfig` dari langkah A7, lalu **Sambungkan dan buat kode**. Aplikasi memuat ulang dan menampilkan **Kode undangan**.
4. Ketuk **Salin kode** dan kirim ke istri lewat WhatsApp.
5. **HP istri:** pasang APK yang sama, buka **Lainnya > Sinkron dengan pasangan > Gabung**, tempel kode, ketuk **Gabung**. Sejak itu catatan Anda berdua sama.

Catatan yang sudah dibuat sebelum menyambungkan di HP pertama ikut dipindahkan. Di HP kedua, catatan lama (bila ada) tidak ikut.

## Hal yang perlu diketahui

- **Kode undangan = kunci akses.** Siapa pun yang punya kode bisa melihat dan mengubah catatan Anda. Kirim hanya ke istri.
- **Pembaruan aplikasi:** ubah file di GitHub, Actions membangun APK baru, pasang di atas yang lama. Data tetap aman karena tersimpan di Firebase.
- **APK ini versi debug.** Cukup untuk dipakai sendiri. Bila ingin diunggah ke Play Store, perlu penandatanganan rilis.
- **Transaksi berulang** dicatat saat aplikasi dibuka pada atau setelah tanggalnya.
- **Kuota gratis Firebase** (Spark) jauh melebihi kebutuhan satu keluarga.

## Untuk pengembang

```bash
npm ci
npm run build          # bangun tampilan web ke dist/
npx cap add android && python3 prepare_android.py && npx cap sync android
cd android && ./gradlew assembleDebug
```
Butuh Node 22 dan JDK 21. Kode aplikasi ada di `main.js`, gaya di `style.css`. Folder `android` dibuat otomatis oleh `npx cap add android`, lalu `python3 prepare_android.py` menambah izin kamera dan ikon.
