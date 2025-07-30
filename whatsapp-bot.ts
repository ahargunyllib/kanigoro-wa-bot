import * as fs from 'fs';
import qrcode from 'qrcode-terminal';
import * as readline from 'readline';
import { Client, LocalAuth, type Message } from "whatsapp-web.js";
import { BotService } from "./bot-service";
import { tryCatch } from './try-catch';

export class WhatsAppBot {
  private client!: Client;
  private readonly maxRetries = 3;
  private retryCount = 0;
  private readonly authPath = './.wwebjs_auth';
  private isInitializing = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.authPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox', //
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventListeners();
  }

  private hasExistingSession(): boolean {
    return fs.existsSync(this.authPath) && fs.readdirSync(this.authPath).length > 0;
  }

  private async promptNewSession(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      console.log('\n🔍 Sesi WhatsApp yang ada ditemukan!');
      console.log('📱 Bot akan mencoba terhubung menggunakan sesi yang tersimpan.');
      console.log('⚠️  Jika Anda ingin memindai kode QR baru, ketik "new" dan tekan Enter.');
      console.log('✅ Untuk menggunakan sesi yang ada, cukup tekan Enter atau ketik "existing".\n');

      rl.question('👉 Pilihanmu (new/existing): ', (answer) => {
        rl.close();
        const choice = answer.toLowerCase().trim();
        resolve(choice === 'new' || choice === 'n');
      });
    });
  }

  private async clearSession(): Promise<void> {
    if (!fs.existsSync(this.authPath)) {
      console.log('❌ Tidak ada sesi yang ditemukan untuk dihapus.');
      return;
    }

    console.log('🗑️  Menghapus sesi yang ada...');
    const { error } = await tryCatch(fs.promises.rm(this.authPath, { recursive: true, force: true }));
    if (error) {
      console.error('❌ Gagal menghapus sesi:', error);
      throw error;
    }

    console.log('✅ Sesi berhasil dihapus!');
  }

  private async handleSessionChoice(): Promise<void> {
    if (!this.hasExistingSession()) {
      console.log('📱 Tidak ada sesi yang ditemukan. Silakan pindai kode QR untuk masuk.\n');
      return;
    }

    const wantNewSession = await this.promptNewSession();

    if (!wantNewSession) {
      console.log('✅ Menggunakan sesi yang ada...\n');
      return;
    }

    await this.clearSession();
    // Reinitialize client after clearing session
    this.initializeClient();
    console.log('🔄 Klien telah diinisialisasi ulang untuk sesi baru. Silakan pindai kode QR.\n');
  }

  private setupEventListeners(): void {
    this.client.on('ready', () => {
      const url = new URL(`https://wa.me/+${this.client.info.wid.user}`);
      url.searchParams.set('text', BotService.getHelloMessage());
      console.log(`🔗 Bot WhatsApp siap! Akses melalui: ${url.toString()}`);
      console.log(`📱 Nama bot: ${this.client.info.pushname}`);
      console.log(`📞 Nomor bot: ${this.client.info.wid.user}`);
      console.log('🤖 Bot sekarang mendengarkan pesan...\n');
    });

    this.client.on('qr', (qr) => {
      if (!this.isInitializing) {
        console.log('📱 Silakan pindai kode QR di bawah ini dengan WhatsApp Anda:');
        console.log('📲 Buka WhatsApp > Pengaturan > Perangkat Tertaut > Tautkan Perangkat\n');
      }

      qrcode.generate(qr, { small: true });
      console.log('\n⏳ Menunggu pemindaian kode QR...');
    });

    this.client.on('authenticated', () => {
      console.log('✅ Autentikasi berhasil! Menghubungkan ke WhatsApp...');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Autentikasi gagal:', msg);
      console.log('💡 Hal ini mungkin terjadi jika:');
      console.log('   • Kode QR telah kedaluwarsa');
      console.log('   • Sesi tidak valid');
      console.log('   • Akun WhatsApp keluar dari perangkat lain');
      console.log('\n🔄 Mencoba memulai ulang dengan sesi baru...');

      this.handleAuthFailure();
    });

    this.client.on('disconnected', (reason) => {
      console.log('🔌 Klien terputus:', reason);

      this.handleReconnection();
    });

    this.client.on('call', (call) => {
      console.log(`📞 Menolak panggilan dari ${call.from}`);

      call.reject();
    });

    this.client.on('message', async (message) => {
      const { error } = await tryCatch(this.handleMessage(message));
      if (error) {
        console.error('❌ Terjadi kesalahan saat menangani pesan:', error);
      }
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    // Skip group messages and messages from self
    if (message.from.includes('@g.us') || message.fromMe) {
      return;
    }

    const { id: { id }, from, body } = message;
    console.log(`📨 [${id}][${from}] Pesan diterima: "${body}"`);

    // Validate message
    if (!this.isValidMessage(body)) {
      const { error } = await tryCatch(this.sendReply(message, BotService.getErrorMessage()));
      if (error) {
        console.error(`❌ [${id}][${from}] Kesalahan saat mengirim balasan error:`, error);
        return;
      }
    }

    // Process message and get response
    const response = this.processMessage(body);
    const { error } = await tryCatch(this.sendReply(message, response));
    if (error) {
      console.error(`❌ [${id}][${from}] Kesalahan saat mengirim balasan:`, error);
      // Fallback: try sending a generic error message
      await this.sendReply(message, 'Maaf, terjadi kesalahan sistem. Silakan coba lagi.');
      return;
    }
  }

  private isValidMessage(body: string): boolean {
    return typeof body === 'string' &&
      body.trim().length > 0 &&
      body.length <= 500; // Prevent spam
  }

  private processMessage(body: string): string {
    // Check for start commands
    if (BotService.isStartCommand(body)) {
      return BotService.getWelcomeMessage();
    }

    // Check for help commands
    if (BotService.isHelpCommand(body)) {
      return BotService.getHelpMessage();
    }

    // Parse service commands
    const serviceCommand = BotService.parseServiceCommand(body);
    if (!serviceCommand) {
      return BotService.getErrorMessage();
    }

    // Handle service commands
    const { serviceIndex, childKey } = serviceCommand;

    if (serviceIndex !== undefined && childKey) {
      return BotService.getServiceDetails(serviceIndex, childKey);
    }

    if (serviceIndex !== undefined) {
      return BotService.getServiceMenu(serviceIndex);
    }

    // Default case: return error message
    return BotService.getErrorMessage();
  }

  private async sendReply(message: Message, text: string): Promise<void> {
    const { error } = await tryCatch(message.reply(text));
    if (error) {
      console.error(`❌ [${message.id.id}][${message.from}] Gagal mengirim balasan:`, error);

      // Fallback: try sending without reply
      const { error: fallbackError } = await tryCatch(this.client.sendMessage(message.from, text));
      if (fallbackError) {
        console.error(`❌ [${message.id.id}][${message.from}] Gagal mengirim balasan fallback:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  private async handleAuthFailure(): Promise<void> {
    console.log('🔄 Mencoba memulai ulang bot dengan sesi baru...')

    const { error: clearError } = await tryCatch(this.clearSession());
    if (clearError) {
      console.error('❌ Gagal menghapus sesi:', clearError);
      process.exit(1);
    }

    const { error: destroyError } = await tryCatch(this.destroy());
    if (destroyError) {
      console.error('❌ Gagal mematikan bot:', destroyError);
      process.exit(1);
    }

    setTimeout(() => {
      console.log('\n🚀 Memulai ulang bot dengan sesi baru...');
      this.retryCount = 0; // Reset retry count
      this.initializeClient();
      this.initialize();
    }, 3000);
  }

  private handleReconnection(): void {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ Jumlah percobaan koneksi ulang maksimum telah tercapai.');
      console.log('💡 Cobalah untuk memulai ulang bot atau menghapus sesi.');
      process.exit(1);
    }

    this.retryCount++;
    console.log(`🔄 Mencoba koneksi ulang (${this.retryCount + 1}/${this.maxRetries})...`);

    setTimeout(() => {
      this.initialize();
    }, 5000 * this.retryCount); // Exponential backoff
  }

  public async initialize(): Promise<void> {
    this.isInitializing = true;

    // Handle session choice before initializing
    const { error: sessionError } = await tryCatch(this.handleSessionChoice());
    if (sessionError) {
      this.isInitializing = false;
      console.error('❌ Gagal menangani pilihan sesi:', sessionError);
      return;
    }

    console.log('🚀 Inisialisasi Bot WhatsApp...')
    this.initializeClient();
    const { error: initError } = await tryCatch(this.client.initialize());
    if (initError) {
      this.isInitializing = false;
      console.error('❌ Gagal menginisialisasi klien:', initError);
      this.handleReconnection();
      return;
    }

    this.isInitializing = false;
  }

  public async restart(): Promise<void> {
    this.retryCount = 0;
    this.initializeClient();

    const { error: initError } = await tryCatch(this.initialize());
    if (initError) {
      console.error('❌ Gagal menginisialisasi bot:', initError);
      process.exit(1);
    }
  }

  public async destroy(): Promise<void> {
    console.log('👋 Mematikan bot...');

    if (!this.client) {
      console.log('❌ Bot client is not initialized.');
      return;
    }

    const { error } = await tryCatch(this.client.destroy());
    if (error) {
      console.error('❌ Gagal mematikan bot:', error);
      throw error;
    }
    console.log('✅ Bot berhasil dimatikan.');
  }

  // Method to clear session programmatically (useful for admin commands)
  public async clearSessionAndRestart(): Promise<void> {
    const { error: destroyError } = await tryCatch(this.destroy());
    if (destroyError) {
      console.error('❌ Gagal mematikan bot:', destroyError);
      process.exit(1);
    }

    const { error: clearError } = await tryCatch(this.clearSession());
    if (clearError) {
      console.error('❌ Gagal menghapus sesi:', clearError);
      process.exit(1);
    }

    console.log('✅ Sesi berhasil dihapus. Memulai ulang bot...');

    this.restart();
  }

  // Method to check session status
  public getSessionStatus(): { hasSession: boolean; isReady: boolean } {
    return {
      hasSession: this.hasExistingSession(),
      isReady: this.client?.info?.wid !== undefined
    };
  }
}
