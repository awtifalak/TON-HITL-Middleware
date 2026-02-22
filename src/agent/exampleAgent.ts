// We'll simulate a client request to the server we just built
export async function runExampleAgent(mcpServer: any) {
    console.log("\n[Agent] Starting mock AI agent execution in 5 seconds...");

    await new Promise(resolve => setTimeout(resolve, 5000));

    const sdkServer = mcpServer.server || mcpServer;
    const callToolHandler = sdkServer._requestHandlers?.get('tools/call') || mcpServer.requestHandler?.bind(mcpServer);

    if (!callToolHandler) {
        console.error("[Agent] Could not find the tools/call handler on the server instance to simulate the agent.");
        return;
    }

    const simulateToolCall = async (toolName: string, args: any) => {
        console.log(`\n[Agent] Calling Server Tool -> ${toolName}`);
        console.log(`[Agent] Args:`, args);

        const requestDetails = {
            method: "tools/call",
            params: {
                name: toolName,
                arguments: args
            }
        };

        try {
            const response = await callToolHandler(requestDetails, {});
            console.log(`[Agent] ✅ Tool ${toolName} execution response received successfully.`);

            if (response?.content) {
                console.log(`[Agent] Response snippet:`, JSON.stringify(response.content).substring(0, 150) + "...");
            }
        } catch (error: any) {
            console.error(`[Agent] ❌ Tool ${toolName} execution rejected/failed:`, error.message);
        }
    };

    try {
        console.log("\n----- SCENARIO 1: READ-ONLY TOOL -----");
        await simulateToolCall("get_wallet", {});
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("\n----- SCENARIO 2: STATE-CHANGING TOOL (Requires Telegram Approval) -----");
        console.log("[Agent] Submitting transaction request...");
        await simulateToolCall("send_ton", {
            toAddress: "kQCSES0TZYqcVkgoguhIb8iMEo4cvaEwmIrU5qbQgnN8ftBF",
            amount: "0.01",
            comment: "Test transaction from HITL Middleware Agent"
        });

    } catch (err) {
        console.error("[Agent] Fatal error during agent run:", err);
    }
}
