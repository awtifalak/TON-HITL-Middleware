import { createTonWalletMCP } from '@ton/mcp';
import { Signer, WalletV5R1Adapter, TonWalletKit, MemoryStorageAdapter, Network } from '@ton/walletkit';
import { executeWithApproval } from './middleware';

export async function setupMcpServer() {
    const mnemonicStr = process.env.MNEMONIC;
    if (!mnemonicStr) {
        throw new Error("MNEMONIC environment variable is required");
    }

    const networkType = process.env.NETWORK === 'testnet' ? 'testnet' : 'mainnet';
    const network = networkType === 'testnet' ? Network.testnet() : Network.mainnet();

    console.log(`[MCP Server] Initializing TonWalletKit on ${networkType}...`);
    const kit = new TonWalletKit({
        networks: { [network.chainId]: {} },
        storage: new MemoryStorageAdapter(),
    });
    await kit.waitForReady();

    const mnemonic = mnemonicStr.split(' ');
    const signer = await Signer.fromMnemonic(mnemonic, { type: 'ton' });
    const walletAdapter = await WalletV5R1Adapter.create(signer, {
        client: kit.getApiClient(network),
        network,
    });
    const wallet = await kit.addWallet(walletAdapter);
    console.log(`[MCP Server] Wallet initialized...`);
    const server = await createTonWalletMCP({ wallet: walletAdapter });
    const sdkServer = (server as any).server || server;

    if (sdkServer && (sdkServer as any)._requestHandlers) {
        const originalCallTool = (sdkServer as any)._requestHandlers.get('tools/call');
        if (originalCallTool) {
            (sdkServer as any)._requestHandlers.set('tools/call', async (request: any, extra: any) => {
                const toolName = request.params.name;
                const args = request.params.arguments;

                return executeWithApproval(toolName, args, async () => {
                    return originalCallTool(request, extra);
                });
            });
            console.log("[MCP Server] Successfully applied middleware to tools/call handler.");
        }
    } else if (typeof (server as any).setRequestHandler === 'function') {
        const originalSetRequestHandler = (server as any).setRequestHandler.bind(server);

        (server as any).setRequestHandler = function (schema: any, handler: any) {
            if (schema.method === 'tools/call') {
                const wrappedHandler = async (request: any, ext: any) => {
                    const toolName = request.params.name;
                    const args = request.params.arguments;

                    return executeWithApproval(toolName, args, async () => {
                        return handler(request, ext);
                    });
                };
                return originalSetRequestHandler(schema, wrappedHandler);
            }
            return originalSetRequestHandler(schema, handler);
        }
        console.log("[MCP Server] Hooked setRequestHandler");
    } else {
        console.warn("[MCP Server] Could not find tools/call handler to monkey-patch. Using fallback interception method.");
    }

    return server;
}
