const protons = require('protons')

const { SendMessage } = protons(`
message SendMessage {
  required bytes data = 1;
  required int64 created = 2;
  required bytes id = 3;
}
`)

class Chat {
  /**
   *
   * @param {Libp2p} libp2p A Libp2p node to communicate through
   * @param {string} topic The topic to subscribe to
   * @param {function(Message)} messageHandler Called with every `Message` received on `topic`
   */
  constructor(libp2p, topic, messageHandler) {
    this.libp2p = libp2p
    this.topic = topic
    this.messageHandler = messageHandler

    // Join if libp2p is already on
    if (this.libp2p.isStarted()) this.join()
  }

  /**
   * Handler that is run when `this.libp2p` starts
   */
  onStart () {
    this.join()
  }

  /**
   * Handler that is run when `this.libp2p` stops
   */
  onStop () {
    this.leave()
  }

  /**
   * Subscribes to `Chat.topic`. All messages will be
   * forwarded to `messageHandler`
   * @private
   */
  join () {
    this.libp2p.pubsub.subscribe(this.topic, (message) => {
      try {
        const sendMessage = SendMessage.decode(message.data)
        this.messageHandler({
          from: message.from,
          message: sendMessage
        })
      } catch (err) {
        console.error(err)
      }
    })
  }

  /**
   * Unsubscribes from `Chat.topic`
   * @private
   */
  leave () {
    this.libp2p.pubsub.unsubscribe(this.topic)
  }

  /**
   * Publishes the given `message` to pubsub peers
   * @throws
   * @param {Buffer|string} message The chat message to send
   */
  async send (message) {
    const msg = SendMessage.encode({
        id: (~~(Math.random() * 1e9)).toString(36) + Date.now(),
        data: Buffer.from(message),
        created: Date.now()
    })

    await this.libp2p.pubsub.publish(this.topic, msg)
  }
}

module.exports = Chat
module.exports.TOPIC = '/libp2p/gossipsub/chat/1.0.0'
module.exports.CLEARLINE = '\033[1A'
