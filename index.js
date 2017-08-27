/*
# Respsonse Format

Outbound:
Date;CALL;ConnectionId;Extension;CallerId;CalledPhoneNumber;

Inbound:
Date;RING;ConnectionId;CallerId;CalledPhoneNumber;

Connected:
Date;CONNECT;ConnectionId;Extension;Number;

Disconnected:
Date;DISCONNECT;ConnectionID;DurationInSeconds;
*/

const net = require('net');
const events = require('events');

class CallMonitor {
  constructor(host, port) {
    this.call = {};

    port = port || 1012;

    const client = net.createConnection(port, host);
    client.setKeepAlive(true, 300 * 1000);

    client.addListener('error', function (error) {
      this.emit('error', error);
    });

    client.addListener('data', function (chunk) {
      const data = this.parseMessage(chunk);

      this.emit('event', data);

      if (data.type === 'ring') {
        this.emit('incoming', data);
      } else if (data.type === 'call') {
        this.emit('outgoing', data);
      } else if (data.type === 'connect') {
        this.emit('connected', data);
      } else if (data.type === 'disconnect') {
        this.emit('disconnected', data);
      }
    });

    client.addListener('end', function () {
      client.end();
    });
  }

  static fritzboxDateToUnix(string) {
    const d = string.match(/[0-9]{2}/g);

    return new Date(`20${d[2]}`, d[1], d[0], d[3], d[4], d[5]);
  }

  static parseMessage(buffer) {
    const message = buffer.toString()
                  .toLowerCase()
                  .replace(/[\n\r]$/, '')
                  .replace(/;$/, '')
                  .split(';');

    const data = {
      type: message[1],
      connectionId: message[2],
      date: fritzboxDateToUnix(message[0]),
    }

    if (data.type === 'ring') {
      data.external = message[3];
      data.internal = message[4];
    } else if (data.type === 'call') {
      data.extension = message[3];
      data.internal = message[4];
      data.external = message[5];
    } else if (data.type === 'connect') {
      data.extension = message[3];
      data.number = message[4];
    } else if (data.type === 'disconnect') {
      data.duration = message[3];
    }

    return data;
  }
}

CallMonitor.prototype = new events.EventEmitter();

module.exports = CallMonitor;
