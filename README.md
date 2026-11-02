# Kas Kita (aplikasi Android)

Catat pemasukan dan pengeluaran rumah tangga berdua. Masuk dengan email dan kata sandi, data tersinkron lewat Firebase (gratis), bisa dicatat saat offline, ada anggaran, transaksi berulang, foto struk, dan ekspor Excel/CSV.

## A. Firebase (proyek baru bernama kas-kita)

1. **Buat proyek**: https://console.firebase.google.com, **Create a project**, nama `kas-kita`, Google Analytics dimatikan.
2. **Aktifkan email**: Authentication, Get started, Sign-in method, **Email/Password**, aktifkan (bukan "Email link"), Save.
3. **Buat dua akun**: tab **Users**, **Add user**, isi email dan kata sandi untuk suami, lalu satu lagi untuk istri.
4. **Buat database**: Firestore Database, **Create database**, lokasi `asia-southeast2` (Jakarta), **Production mode**.
5. **Pasang aturan**: Firestore, tab **Rules**. Hapus isinya, tempel isi `firestore.rules` (setelah kedua alamat email di dalamnya diganti), **Publish**.
6. **Ambil konfigurasi**: Project settings (roda gigi), Your apps, ikon web `</>`, beri nama, Register app. Salin blok `const firebaseConfig = {...};`.
7. Tempel blok itu ke `firebase-config.js` (ganti tulisan TEMPEL_DI_SINI), commit ke GitHub.

## B. Bangun APK di GitHub

Setiap kali Anda mengubah file di repo, GitHub otomatis membangun APK baru (tab **Actions**, sekitar 3 sampai 10 menit). Unduh `Kas-Kita-APK` di bagian Artifacts, ekstrak, dan ambil `Kas-Kita.apk`.

## C. Pasang di HP

1. Pindahkan `Kas-Kita.apk` ke HP, ketuk, izinkan install dari sumber ini.
2. Buka Kas Kita dan masuk dengan email dan kata sandi dari langkah A3.
3. Di HP istri, pasang APK yang sama dan masuk dengan akunnya. Catatan Anda berdua sama.

## Hal yang perlu diketahui

- Hanya dua email di aturan Firestore yang bisa membaca dan menulis catatan.
- Lupa kata sandi: ketuk **Lupa kata sandi?** di layar masuk, tautan atur ulang dikirim ke email.
- Catatan yang dibuat sebelum masuk (mode perangkat) dipindahkan otomatis saat pertama kali masuk.
- Transaksi berulang dicatat saat aplikasi dibuka pada atau setelah tanggalnya.
- APK ini versi debug, cukup untuk dipakai sendiri.
