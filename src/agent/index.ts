import dotenv from 'dotenv';

dotenv.config();

import { setupTelegramBot } from '../bot/bot';
import { setupMcpServer } from '../mcp/server';
import { runExampleAgent } from './exampleAgent';

async function main() {
    console.log("Starting TON HITL Middleware System...\n");

    try {
        console.log("[System] Initializing Telegram Bot...");
        const bot = setupTelegramBot();

        bot.start({
            onStart: (botInfo) => {
                console.log(`[System] Telegram Bot is running as @${botInfo.username}`);
            }
        });

        console.log("[System] Initializing MCP Server with Shared Memory Middleware...");
        const mcpServer = await setupMcpServer();
        console.log("[System] MCP Middleware successfully initialized and patched.");
        console.log("[System] Launching the example AI Agent to test the integration...");
        runExampleAgent(mcpServer).catch(console.error);
        console.log("\n=======================================================");
        console.log("System is fully operational and waiting for requests.");
        console.log("If using an external MCP Client, connect using Stdio/SSE.");
        console.log("The example agent will simulate an internal client shortly.");
        console.log("=======================================================\n");

    } catch (error) {
        console.error("Failed to start the application:", error);
        process.exit(1);
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

main();
