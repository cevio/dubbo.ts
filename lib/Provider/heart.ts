import { TRegistry } from "../Registry/interface";
import { Connection } from "./connection";
import { heartBeatEncode } from '../utils';

export class Heart<R extends TRegistry> {
  private readonly delay: number;
  private _lastwrite_timestamp: number;
  private _lastread_timestamp: number;
  private timer: NodeJS.Timeout;

  constructor(private readonly connection: Connection<R>) {
    this.delay = this.connection.provider.options.heartbeat;
    this.connection.on('heart', () => this.reply());
  }

  private _doTask() {
    if (!this.delay) return;
    this.timer = setInterval(() => {
      const now = Date.now();
      if (now - this._lastread_timestamp > this.delay || now - this._lastwrite_timestamp > this.delay) {
        this.send();
      }
      if (now - this._lastread_timestamp > this.delay * 3) {
        this.connection.close();
      }
    }, this.delay);
  }

  public toRead() {
    this._lastread_timestamp = Date.now();
    return this;
  }

  public toWrite() {
    this._lastwrite_timestamp = Date.now();
  }

  private send() {
    this.connection.send(heartBeatEncode());
    this.connection.emit('heart:send');
  }

  private reply() {
    this.connection.send(heartBeatEncode(true));
    this.connection.emit('heart:reply');
  }

  // dubbo的心跳默认是在heartbeat（默认是60s）内如果没有接收到消息，
  // 就会发送心跳消息，如果连着3次（180s）没有收到心跳响应，provider会关闭channel。
  public start() {
    this._lastread_timestamp = Date.now();
    this._lastwrite_timestamp = Date.now();
    this._doTask();
  }

  public stop() {
    clearInterval(this.timer);
  }
}