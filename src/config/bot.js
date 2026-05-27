import { logger } from '../utils/logger.js';

// ============ إعدادات البوت ============
const CONFIG = {
    token: process.env.DISCORD_TOKEN,
    voiceChannelId: process.env.VOICE_CHANNEL_ID,
    welcomeMessage: process.env.WELCOME_MESSAGE || 'اهلا وسهلا ب RX COMMUNITY 👋',
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY) || 20000,
    activityStatus: process.env.ACTIVITY_STATUS || 'في الروم الصوتي 🎧',
};

// ============ إنشاء البوت ============
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ============ متغيرات ============
let connection = null;
let reconnectTimer = null;
let isReconnecting = false;

// ============ دالة الربط بالروم ============
async function joinVoiceChannel() {
    try {
        const voiceChannel = await client.channels.fetch(CONFIG.voiceChannelId);

        if (!voiceChannel || !voiceChannel.isVoice()) {
            logger.error('الروم الصوتي غير موجود');
            return false;
        }

        connection = await voiceChannel.join({
            deaf: true,
            mute: false,
        });

        logger.info(`متصل بـ: ${voiceChannel.name}`);
        isReconnecting = false;
        return true;
    } catch (error) {
        logger.error(`خطأ: ${error.message}`);
        return false;
    }
}

// ============ دالة الخروج ============
function leaveVoiceChannel() {
    if (connection) {
        connection.destroy();
        connection = null;
    }
}

// ============ دالة إعادة الاتصال ============
function scheduleReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;

    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(async () => {
        logger.info('جاري إعادة الاتصال...');
        await joinVoiceChannel();
    }, CONFIG.reconnectDelay);
}

// ============ دالة الترحيب ============
function sendWelcomeMessage(member) {
    if (member.id === client.user.id) return;

    try {
        if (member.voice && member.voice.channel) {
            member.voice.channel.send(CONFIG.welcomeMessage).catch(() => {});
        }
    } catch (error) {
        logger.warn('خطأ في الترحيب');
    }
}

// ============ أحداث البوت ============
client.on('ready', async () => {
    logger.info(`البوت جاهز: ${client.user.tag}`);
    await joinVoiceChannel();
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (newState.channel && newState.channel.id === CONFIG.voiceChannelId) {
        sendWelcomeMessage(newState.member);
    }
});

client.on('disconnect', () => {
    logger.error('انقطع الاتصال');
    leaveVoiceChannel();
    scheduleReconnect();
});

client.on('error', (error) => {
    logger.error(`خطأ: ${error.message}`);
    scheduleReconnect();
});

// ============ تشغيل ============
logger.info('جاري التشغيل...');

if (!CONFIG.token) {
    logger.error('لم يتم العثور على التوكن!');
    logger.info('أضف DISCORD_TOKEN في ملف .env');
    process.exit(1);
}

client.login(CONFIG.token).catch((error) => {
    logger.error(`خطأ في تسجيل الدخول: ${error.message}`);
    process.exit(1);
});

// ============ إدارة الإيقاف ============
process.on('SIGINT', () => {
    logger.info('جاري الإيقاف...');
    leaveVoiceChannel();
    process.exit(0);
});

export { client, CONFIG, joinVoiceChannel, leaveVoiceChannel };
