# 🤖 Kanigoro WhatsApp Bot

**Enhanced WhatsApp Bot for Kelurahan Kanigoro**
_Dibuat oleh Tim 24 MMD FILKOM UB_
📍 Kelurahan Kanigoro
📸 Instagram: [@24.kanigoro](https://instagram.com/24.kanigoro)

---

## 📌 Deskripsi

Bot WhatsApp ini dirancang untuk membantu pelayanan dan komunikasi di Kelurahan Kanigoro. Menggunakan `whatsapp-web.js`, bot ini dapat secara otomatis membalas pesan WhatsApp, menyimpan sesi login, dan dibangun dengan `Bun` agar cepat dan efisien.

---

## ✨ Fitur Utama

- Autentikasi QR Code langsung di terminal
- Manajemen sesi otomatis (tidak perlu scan QR setiap kali)
- Mudah dijalankan dengan runtime modern `Bun`

---

## ⚙️ Prasyarat

Pastikan kamu sudah menginstal:

- [Bun](https://bun.sh) `v1.0.0` atau lebih baru
- (Opsional) Node.js `v18.0.0` jika ingin kompatibilitas

---

## 🚀 Cara Menjalankan

### 1. Clone repository
```bash
git clone https://github.com/ahargunyllib/kanigoro-wa-bot.git
cd kanigoro-wa-bot
````

### 2. Install dependencies

```bash
bun install
```

### 3. Jalankan bot (pengembangan)

```bash
bun start
```

📱 Akan muncul QR code di terminal. Scan dengan WhatsApp Web untuk login.

---

## 🧼 Membersihkan Session

```bash
bun run clean
```

Ini akan menghapus cache login (`.wwebjs_auth`, `.wwebjs_cache`) dan memaksa QR login ulang.

---

## 📄 Lisensi

MIT License © 2024
Proyek ini bersifat open-source dan bisa digunakan kembali dengan menyebutkan atribusi.

---

## 📢 Ikuti Perjalanan Kami

> Bot ini merupakan bagian dari program **Mahasiswa Membangun Desa (MMD)** FILKOM UB 2024.
> Kami percaya teknologi bisa menjadi jembatan pelayanan publik yang lebih baik.

📸 Instagram: [@24.kanigoro](https://instagram.com/24.kanigoro)

---
