import { io, type Socket } from 'socket.io-client';

type EventHandler<TPayload> = (payload: TPayload) => void;
type UntypedSocket = Socket<any, any>;
type Subscription = {
  event: string;
  handler: (...args: any[]) => void;
};

export class SocketClient<
  TIncomingEvents extends object = Record<string, unknown>,
  TOutgoingEvents extends object = TIncomingEvents,
> {
  private socket: UntypedSocket | null = null;
  private readonly subscriptions: Subscription[] = [];

  public connect(url: string): void {
    this.disconnect();
    this.socket = io(url) as UntypedSocket;
    this.bindSubscriptions();
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  public emit<TEvent extends Extract<keyof TOutgoingEvents, string>>(
    event: TEvent,
    payload: TOutgoingEvents[TEvent],
  ): void {
    this.getSocket().emit(event, payload);
  }

  public on<TEvent extends Extract<keyof TIncomingEvents, string>>(
    event: TEvent,
    handler: EventHandler<TIncomingEvents[TEvent]>,
  ): void {
    const subscription = {
      event,
      handler: handler as (...args: any[]) => void,
    };

    this.subscriptions.push(subscription);

    if (this.socket !== null) {
      this.bindSubscription(subscription);
    }
  }

  public off<TEvent extends Extract<keyof TIncomingEvents, string>>(
    event: TEvent,
    handler: EventHandler<TIncomingEvents[TEvent]>,
  ): void {
    const listener = handler as (...args: any[]) => void;

    for (let index = this.subscriptions.length - 1; index >= 0; index -= 1) {
      const subscription = this.subscriptions[index];

      if (subscription.event === event && subscription.handler === listener) {
        this.subscriptions.splice(index, 1);
      }
    }

    if (this.socket !== null) {
      this.unbindSubscription({ event, handler: listener });
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  public getId(): string | null {
    return this.socket?.id ?? null;
  }

  public getTransportName(): string | null {
    return this.socket?.io.engine?.transport.name ?? null;
  }

  public getConnectionState(): {
    connected: boolean;
    id: string | null;
    transport: string | null;
  } {
    return {
      connected: this.isConnected(),
      id: this.getId(),
      transport: this.getTransportName(),
    };
  }

  private getSocket(): UntypedSocket {
    if (this.socket === null) {
      throw new Error('SocketClient is not connected.');
    }

    return this.socket;
  }

  private bindSubscriptions(): void {
    for (const subscription of this.subscriptions) {
      this.bindSubscription(subscription);
    }
  }

  private bindSubscription(subscription: Subscription): void {
    const socket = this.socket;

    if (socket === null) {
      return;
    }

    socket.on(subscription.event, subscription.handler);
  }

  private unbindSubscription(subscription: Subscription): void {
    const socket = this.socket;

    if (socket === null) {
      return;
    }

    socket.off(subscription.event, subscription.handler);
  }
}
