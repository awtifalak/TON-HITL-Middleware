export interface ApprovalRequest {
    resolve: (value: boolean) => void;
    reject: (reason: any) => void;
    details: {
        toolName: string;
        args: any;
        timestamp: number;
        description: string;
    };
}

class ApprovalStore {
    private store: Map<string, ApprovalRequest> = new Map();
    private readonly TIMEOUT_MS = 15 * 60 * 1000;

    addRequest(requestId: string, request: ApprovalRequest): void {
        this.store.set(requestId, request);
        setTimeout(() => {
            if (this.store.has(requestId)) {
                const req = this.store.get(requestId);
                this.store.delete(requestId);
                req?.reject(new Error(`Approval request ${requestId} timed out.`));
            }
        }, this.TIMEOUT_MS);
    }

    getRequest(requestId: string): ApprovalRequest | undefined {
        return this.store.get(requestId);
    }

    resolveRequest(requestId: string, approved: boolean): boolean {
        const request = this.store.get(requestId);
        if (request) {
            if (approved) {
                request.resolve(true);
            } else {
                request.reject(new Error("User rejected the execution."));
            }
            this.store.delete(requestId);
            return true;
        }
        return false;
    }

    hasRequest(requestId: string): boolean {
        return this.store.has(requestId);
    }
}

export const approvalStore = new ApprovalStore();
