'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const Websockets = require('libp2p-websockets')
const WebrtcStar = require('libp2p-webrtc-star')
const wrtc = require('wrtc')
const Mplex = require('libp2p-mplex')
const { NOISE } = require('libp2p-noise')
const Secio = require('libp2p-secio')
const PubsubChat = require('./chat')
const Bootstrap = require('libp2p-bootstrap')
const MDNS = require('libp2p-mdns')
const KadDHT = require('libp2p-kad-dht')
const Gossipsub = require('libp2p-gossipsub')

async function main() {
  const libp2p = await Libp2p.create({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/0',
        '/ip4/0.0.0.0/tcp/0/ws',
        `/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star`
      ]
    },
    modules: {
      transport: [ TCP, Websockets, WebrtcStar ],
      streamMuxer: [ Mplex ],
      connEncryption: [ NOISE, Secio ],
      peerDiscovery: [ Bootstrap ],
      dht: KadDHT,
      pubsub: Gossipsub
    },
    config: {
      transport : {
        [WebrtcStar.prototype[Symbol.toStringTag]]: {
          wrtc
        }
      },
      peerDiscovery: {
        bootstrap: {
          list: [ '/dnsaddr/sjc-1.bootstrap.libp2p.io/tcp/4001/ipfs/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN' ]
        }
      },
      dht: {
        enabled: true,
        randomWalk: {
          enabled: true
        }
      }
    }
  })

  // Listen on libp2p for `peer:connect` and log the provided connection.remotePeer.toB58String() peer id string.
  libp2p.connectionManager.on('peer:connect', (connection) => {
    console.info(`Connected to ${connection.remotePeer.toB58String()}!`)
  })

  // Start libp2p
  await libp2p.start()

  // Log our PeerId and Multiaddrs
  console.info(`${libp2p.peerId.toB58String()} listening on addresses:`)
  console.info(libp2p.multiaddrs.map(addr => addr.toString()).join('\n'), '\n')

  // Create our PubsubChat client
  const pubsubChat = new PubsubChat(libp2p, PubsubChat.TOPIC, ({ from, message }) => {
    let fromMe = from === libp2p.peerId.toB58String()
    let user = from.substring(0, 6)
    console.info(`${fromMe ? PubsubChat.CLEARLINE : ''}${user}(${new Date(message.created).toLocaleTimeString()}): ${message.data}`)
  })

  // Set up our input handler
  process.stdin.on('data', async (message) => {
    // Remove trailing newline
    message = message.slice(0, -1)

    try {
      // Publish the message
      await pubsubChat.send(message)
    } catch (err) {
      console.error('Could not publish chat', err)
    }
  })
}

main()