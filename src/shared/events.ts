import { EventEmitter } from 'events';

export interface AppEvents {
    approval_requested: (data: {
        requestId: string;
        toolName: string;
        args: any;
        description: string;
    }) => void;
}

class TypedEventEmitter extends EventEmitter {
    on<K extends keyof AppEvents>(eventName: K, listener: AppEvents[K]): this {
        return super.on(eventName, listener as any);
    }

    emit<K extends keyof AppEvents>(eventName: K, ...args: Parameters<AppEvents[K]>): boolean {
        return super.emit(eventName, ...args);
    }
}

export const appEvents = new TypedEventEmitter();
