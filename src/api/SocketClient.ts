import { io, type Socket } from 'socket.io-client';

type EventHandler<TPayload> = (payload: TPayload) => void;
type UntypedSocket = Socket<any, any>;

export class SocketClient<
  TIncomingEvents extends object = Record<string, unknown>,
  TOutgoingEvents extends object = TIncomingEvents,
> {
  private socket: UntypedSocket | null = null;

  public connect(url: string): void {
    this.disconnect();
    this.socket = io(url) as UntypedSocket;
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
    const onEvent = this.getSocket().on as (
      event: string,
      listener: (...args: any[]) => void,
    ) => UntypedSocket;

    onEvent(event, handler as (...args: any[]) => void);
  }

  public off<TEvent extends Extract<keyof TIncomingEvents, string>>(
    event: TEvent,
    handler: EventHandler<TIncomingEvents[TEvent]>,
  ): void {
    const offEvent = this.getSocket().off as (
      event: string,
      listener: (...args: any[]) => void,
    ) => UntypedSocket;

    offEvent(event, handler as (...args: any[]) => void);
  }

  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private getSocket(): UntypedSocket {
    if (this.socket === null) {
      throw new Error('SocketClient is not connected.');
    }

    return this.socket;
  }
}
