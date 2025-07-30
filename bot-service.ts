import { SERVICES } from "./data";

export class BotService {
  private static readonly COMMANDS = {
    START: ['mulai', 'start', 'hai', 'hai, aku ingin mengetahui layanan yang ada di kelurahan. bisakah kamu membantuku?'],
    HELP: ['help', 'bantuan'],
  } as const;

  static normalizeMessage(message: string): string {
    return message.toLowerCase().trim();
  }

  static isStartCommand(message: string): boolean {
    const normalized = this.normalizeMessage(message);
    return this.COMMANDS.START.includes(normalized as any);
  }

  static isHelpCommand(message: string): boolean {
    const normalized = this.normalizeMessage(message);
    return this.COMMANDS.HELP.includes(normalized as any);
  }

  static parseServiceCommand(message: string): { serviceIndex?: number; childKey?: string } | null {
    const normalized = this.normalizeMessage(message);
    const serviceMatch = normalized.match(/^layanan\s+(\d+)([a-z]?)$/);

    if (!serviceMatch) return null;

    const serviceIndex = parseInt(serviceMatch[1]) - 1;
    const childKey = serviceMatch[2];

    if (serviceIndex < 0 || serviceIndex >= SERVICES.length) return null;

    return { serviceIndex, childKey: childKey || undefined };
  }

  static getWelcomeMessage(): string {
    return `🏛️ *Selamat datang di layanan WhatsApp Kelurahan Kanigoro!*

📋 *Layanan yang tersedia:*
${SERVICES.map(service => `${service.key}. ${service.title}`).join('\n')}

💡 *Cara menggunakan:*
• Ketik "layanan 1" untuk melihat detail layanan
• Ketik "layanan 1a" untuk persyaratan spesifik
• Ketik "mulai" untuk kembali ke menu utama
• Ketik "bantuan" untuk panduan lengkap

Silakan pilih layanan yang Anda butuhkan! 😊`;
  }

  static getServiceMenu(serviceIndex: number): string {
    const service = SERVICES[serviceIndex];
    if (!service) return this.getErrorMessage();

    return `📂 *${service.title}*

📝 *Sub-layanan yang tersedia:*
${service.children.map((child) => `${child.key}. ${child.title}`).join('\n')}

💡 Ketik "layanan ${service.key}a" untuk layanan pertama, "layanan ${service.key}b" untuk kedua, dst.

Ketik "mulai" untuk kembali ke menu utama.`;
  }

  static getServiceDetails(serviceIndex: number, childKey: string): string {
    const service = SERVICES[serviceIndex];
    if (!service) return this.getErrorMessage();

    const childIndex = childKey.charCodeAt(0) - 'a'.charCodeAt(0);
    const child = service.children[childIndex];

    if (!child) return this.getErrorMessage();

    return `📋 *${service.title} - ${child.title}*

✅ *Persyaratan yang diperlukan:*
${child.requirements.map(req => `• ${req}`).join('\n')}

📞 *Info lebih lanjut:*
Silakan datang langsung ke Kelurahan Kanigoro dengan membawa dokumen lengkap.

Ketik "mulai" untuk kembali ke menu utama atau pilih layanan lain.`;
  }

  static getHelpMessage(): string {
    return `❓ *PANDUAN PENGGUNAAN BOT*

🎯 *Perintah Utama:*
• "mulai" - Kembali ke menu utama
• "bantuan" - Menampilkan panduan ini
• "layanan X" - Melihat sub-layanan (X = nomor layanan)
• "layanan Xa" - Melihat persyaratan (X = nomor, a = huruf)

📝 *Contoh Penggunaan:*
• "layanan 1" → Melihat layanan Kependudukan & Identitas
• "layanan 1a" → Persyaratan Membuat KTP
• "layanan 2b" → Persyaratan Surat Boro

⚠️ *Tips:*
• Pastikan mengetik sesuai format yang benar
• Gunakan huruf kecil untuk hasil terbaik
• Siapkan dokumen sebelum datang ke kelurahan

Ada yang bisa saya bantu? 😊`;
  }

  static getErrorMessage(): string {
    return `❌ *Maaf, perintah tidak dikenali*

💡 *Coba gunakan:*
• "mulai" - Kembali ke menu utama
• "bantuan" - Melihat panduan lengkap
• "layanan 1" sampai "layanan 7" - Pilih layanan

Ketik "bantuan" untuk panduan lengkap! 🤗`;
  }

  static getHelloMessage(): string {
    return `Hai, aku ingin mengetahui layanan yang ada di Kelurahan. Bisakah kamu membantuku?`
  }
}
