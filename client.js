let retries = 0,
  keepAlive,
  ws

const MAX_WAIT_TIME = 4096

/**
 * Algorithm for throttling reconnecting clients
*/
// eslint-disable-next-line no-plusplus
const exponentialBackoff = () => 2 ** retries++ + Math.random(0, 1000)

/**
 * Emit an action to the websocket server with a data payload
 * @param {!string} action - the message label
 * @param {any} data - data payload
*/
const emit = (action, data) => ws.send(JSON.stringify({ action, data }))

/**
 * Functions to run when messages are received from the websocket server
*/
const onMessages = []

/**
 * Register an onMessage function. Guard against duplicates.
 * @param {!string} action - action name
 * @param {!Function} fn - function to execute
 */
const addMessage = (action, fn) => {
  const exists = onMessages.find(m => m.action === action && m.fn === fn)
  if (!exists)
    onMessages.push({ action, fn })
}

/**
 * Unregister onMessage functions
*/
const delMessage = (fn) => { onMessages = onMessages.filter(m => m.fn !== fn) }

/**
 * Functions to run when a connection is established with the websocket server
*/
const onOpen = []

/**
 * Register an onOpen function. Guard against duplicates.
*/
const addOnOpen = (fn) => {
  const exists = onOpen.find(fn)
  if (!exists)
    onOpen.push(fn)
}

/**
 * Unregister an onOpen function
*/
const delOnOpen = (fn) => { onOpen = onOpen.filter(o => o !== fn) }

/**
 * Functions to run when a connection is lost to the websocket server
*/
const onClose = []
/**
 * Register an onClose function
*/
const addOnClose = (fn) => {
  const exists = onClose.find(fn)
  if (!exists)
    onClose.push(fn)
}

/**
 * Unregister an onClose function
*/
const delOnClose = (fn) => { onClose = onClose.filter(o => o !== fn) }

// Helper for wrapping a function in a try/catch block
function tryCatch(fn) {
  try {
    fn()
  } catch (e) {
    console.error(e)
  }
}

// Helper to escape any RegEx special characters in a received 'action' name
const sanitizeRegex = (action) => action.replace(/(\^|\$|\.|\?|\*|\+|\(|\)|\/)/gi, '\\$1')

/**
 * Creates a websocket connection with indefinite auto-reconnection.
 * @param {!string} url - websocket endpoint to connect to.
 */
function connect(url) {
  if (!url) throw new Error('url is a required argument')

  if (ws && ws.readyState === 1 /** open connection */)
    disconnect()

  ws = new WebSocket(url)

  ws.binaryType = 'arraybuffer'

  // Called when a new connection is established
  ws.onopen = () => {
    retries = 0

    // Keeps the TCP connection alive. Otherwise it times out every 2 minutes
    keepAlive = setInterval(() => { emit('keep-alive') }, 60000)

    onOpen.forEach(fn => tryCatch(fn))
  }

  // Called when a connection has been closed
  ws.onclose = (event) => {
    clearInterval(keepAlive)

    // Auto-reconnect indefinitely
    // "event.target" will be the closing websocket, whereas "ws" could be a new websocket created in connect(url)
    if (!event.target.forceClose)
      setTimeout(connect.bind(null, url), Math.min(exponentialBackoff(), MAX_WAIT_TIME))

    onClose.forEach(fn => tryCatch(fn))
  }

  // Called when a message is received from the server
  ws.onmessage = (packet) => {
    const { action, data } = JSON.parse(packet.data)
    const regex = new RegExp(`^${sanitizeRegex(action)}$`, 'gi')
    const messages = onMessages.filter(m => m.action.match(regex))
    messages.forEach(m => { tryCatch(m.fn.bind(null, data)) })
    if (!messages.length)
      console.warn(`No registered onMessage handlers for action '${action}'`)
  }
}

/**
 * Manually close the websocket connection to test reconnection strategy
*/
function close () {
  ws.close()
}

/**
 * Force-terminate the websocket connection without auto-reconnecting
 * Will require explicitly calling connect(url) again to re-open
 */
function disconnect() {
  ws.forceClose = true
  ws.close()
}

export {
  connect,
  disconnect,
  close,
  emit,
  addOnOpen,
  delOnOpen,
  addOnClose,
  delOnClose,
  addMessage,
  delMessage
}
