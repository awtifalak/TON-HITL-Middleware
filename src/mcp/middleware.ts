import { appEvents } from '../shared/events';
import { approvalStore } from '../shared/store';
import crypto from 'crypto';

const READ_ONLY_TOOLS = [
    'get_wallet',
    'get_balance',
    'get_jetton_balance',
    'get_jettons',
    'get_transactions',
    'get_swap_quote',
    'get_nfts',
    'get_nft',
    'resolve_dns',
    'back_resolve_dns',
    'get_known_jettons',
];

const STATE_CHANGING_TOOLS = [
    'send_ton',
    'send_jetton',
    'send_nft',
    'send_raw_transaction',
];

/**
 * Executes a tool with the necessary approval flow if required.
 * 
 * @param toolName Name of the tool being executed
 * @param args Arguments passed to the tool
 * @param executeFn The actual function to execute the tool
 * @returns The result of the tool execution
 */
export async function executeWithApproval<T>(
    toolName: string,
    args: any,
    executeFn: () => Promise<T>
): Promise<T> {
    if (READ_ONLY_TOOLS.includes(toolName)) {
        console.log(`[Middleware] Executing read-only tool: ${toolName}`);
        return executeFn();
    }

    if (STATE_CHANGING_TOOLS.includes(toolName)) {
        console.log(`[Middleware] Intercepting state-changing tool for approval: ${toolName}`);

        const requestId = crypto.randomUUID();
        const approvalPromise = new Promise<boolean>((resolve, reject) => {
            approvalStore.addRequest(requestId, {
                resolve,
                reject,
                details: {
                    toolName,
                    args,
                    timestamp: Date.now(),
                    description: `Execution of ${toolName} requires approval.`,
                },
            });
        });

        console.log(`[Middleware] Emitting approval_requested event for request ${requestId}`);
        appEvents.emit('approval_requested', {
            requestId,
            toolName,
            args,
            description: `Execution of ${toolName} requires approval.`
        });

        try {
            const isApproved = await approvalPromise;
            if (isApproved) {
                console.log(`[Middleware] Approval granted for request ${requestId}. Executing ${toolName}...`);
                return executeFn();
            } else {
                throw new Error("Execution was rejected by the user.");
            }
        } catch (error) {
            console.log(`[Middleware] Execution denied or failed for request ${requestId}:`, error);
            throw error;
        }
    }

    console.warn(`[Middleware] Encountered unknown tool: ${toolName}. Executing immediately by default.`);
    return executeFn();
}
