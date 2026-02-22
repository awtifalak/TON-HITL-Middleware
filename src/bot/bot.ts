import { Bot, InlineKeyboard } from 'grammy';
import { appEvents } from '../shared/events';
import { approvalStore } from '../shared/store';

export function setupTelegramBot() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const authorizedUserIdStr = process.env.TELEGRAM_USER_ID;

    if (!token) {
        throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
    }

    if (!authorizedUserIdStr) {
        throw new Error("TELEGRAM_USER_ID environment variable is required");
    }

    const authorizedUserId = parseInt(authorizedUserIdStr, 10);
    const bot = new Bot(token);

    bot.command('start', (ctx) => {
        if (ctx.from?.id !== authorizedUserId) {
            return ctx.reply("⛔ Unauthorized access.");
        }
        return ctx.reply("🤖 TON HITL Bot is running. Waiting for approval requests...");
    });

    appEvents.on('approval_requested', async (data) => {
        const { requestId, toolName, args, description } = data;

        const messageText = `
🚨 <b>Action Approval Required</b> 🚨

<b>Tool:</b> <code>${toolName}</code>
<b>Description:</b> ${description}

<b>Arguments:</b>
<pre>${JSON.stringify(args, null, 2)}</pre>

Do you approve this execution?
`;

        const inlineKeyboard = new InlineKeyboard()
            .text('✅ Approve', `approve:${requestId}`)
            .text('❌ Reject', `reject:${requestId}`);

        try {
            await bot.api.sendMessage(authorizedUserId, messageText, {
                parse_mode: 'HTML',
                reply_markup: inlineKeyboard,
            });
            console.log(`[Bot] Sent approval request ${requestId} to Telegram`);
        } catch (error) {
            console.error(`[Bot] Failed to send message to Telegram:`, error);
            approvalStore.resolveRequest(requestId, false);
        }
    });

    bot.on('callback_query:data', async (ctx) => {
        if (ctx.from.id !== authorizedUserId) {
            await ctx.answerCallbackQuery({ text: "⛔ Unauthorized action.", show_alert: true });
            return;
        }

        const data = ctx.callbackQuery.data;
        if (!data.startsWith('approve:') && !data.startsWith('reject:')) {
            return;
        }

        const [action, requestId] = data.split(':');
        const isApproved = action === 'approve';

        if (!approvalStore.hasRequest(requestId)) {
            await ctx.answerCallbackQuery({ text: "⚠️ Request expired or already handled.", show_alert: true });

            try {
                await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
                await ctx.reply("<i>This request has expired or was already handled.</i>", { parse_mode: 'HTML' });
            } catch (e) {
                // Silence is golden
            }
            return;
        }

        const resolved = approvalStore.resolveRequest(requestId, isApproved);

        if (resolved) {
            await ctx.answerCallbackQuery({
                text: isApproved ? "✅ Execution approved." : "❌ Execution rejected."
            });

            try {
                const originalText = ctx.callbackQuery.message?.text || 'Approval Request';
                const decisionText = isApproved ? '<b>[✅ APPROVED]</b>' : '<b>[❌ REJECTED]</b>';

                await ctx.editMessageText(`${originalText}\n\n${decisionText}`, { parse_mode: 'HTML' });
            } catch (error) {
                console.error(`[Bot] Failed to edit message after resolution:`, error);
            }
        } else {
            await ctx.answerCallbackQuery({ text: "⚠️ Failed to resolve request.", show_alert: true });
        }
    });

    bot.catch((err) => {
        console.error(`[Bot] Error:`, err);
    });

    return bot;
}
