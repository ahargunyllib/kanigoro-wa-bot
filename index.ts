import * as readline from 'readline';
import { tryCatch } from './try-catch';
import { WhatsAppBot } from './whatsapp-bot';

// Initialize bot
const bot = new WhatsAppBot();

// Enhanced graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Menerima sinyal ${signal}, mematikan dengan aman...`);
  console.log('📱 Menutup koneksi WhatsApp...');
  await bot.destroy();
  console.log('👋 Sampai jumpa!');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled errors
process.on('unhandledRejection', async (reason) => {
  console.error('❌ Penolakan Tidak Tertangani:', reason);
  console.log('🔄 Mencoba memulai ulang bot...')
  const { error } = await tryCatch(bot.clearSessionAndRestart());
  if (error) {
    console.error('❌ Gagal memulai ulang. Keluar...');
    process.exit(1);
  }
});

process.on('uncaughtException', async (error) => {
  console.error('❌ Kesalahan Tidak Terduga:', error);
  console.log('🔄 Mencoba memulai ulang bot...');
  const { error: clearSessionAndRestartError } = await tryCatch(bot.clearSessionAndRestart());
  if (clearSessionAndRestartError) {
    console.error('❌ Gagal memulai ulang. Keluar...');
    process.exit(1);
  }
});

// Add console commands for session management
const setupConsoleCommands = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n💻 Perintah Konsol Tersedia:');
  console.log('   • "restart" - Mulai ulang bot dengan sesi baru');
  console.log('   • "status" - Tampilkan status sesi');
  console.log('   • "clear" - Hapus sesi dan mulai ulang');
  console.log('   • "quit" - Matikan bot');
  console.log('   • Ketik perintah dan tekan Enter\n');

  rl.on('line', async (input) => {
    const command = input.trim().toLowerCase();

    switch (command) {
      case 'restart':
        console.log('🔄 Memulai ulang bot...');
        await bot.restart();
        break;

      case 'status':
        const status = bot.getSessionStatus();
        console.log('📊 Status Sesi:');
        console.log(`   • Memiliki sesi tersimpan: ${status.hasSession ? '✅' : '❌'}`);
        console.log(`   • Bot siap: ${status.isReady ? '✅' : '❌'}`);
        break;

      case 'clear':
        console.log('🗑️ Menghapus sesi...');
        await bot.clearSessionAndRestart();
        break;

      case 'quit':
      case 'exit':
        await gracefulShutdown('USER_COMMAND');
        break;

      default:
        if (command) {
          console.log('❓ Perintah tidak dikenal. Tersedia: "restart", "status", "clear", "quit"');
        }
        break;
    }
  });
};

// Display startup banner
console.log('🤖 ============================================');
console.log('📱 Kelurahan Kanigoro WhatsApp Bot');
console.log('===============================================\n');

// Start the bot
(async () => {
  const { error } = await tryCatch(bot.initialize());
  if (error) {
    console.error('❌ Gagal memulai bot:', error);
    process.exit(1);
  }

  setupConsoleCommands();
})();
