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
const onMessages = new Set()
/**
 * Register an onMessage function
 * @param {!string} action - action name
 * @param {!Function} fn - function to execute
 */
const addMessage = (action, fn) => onMessages.add({ action, fn })
/**
 * Unregister an onMessage function
*/
const delMessage = (action) => {
  const existing = [...onMessages].find(m => m.action === action)
  if (existing)
    onMessages.delete(existing)
}

/**
 * Functions to run when a connection is established with the websocket server
*/
const onOpen = []
/**
 * Register an onOpen function
*/
const addOnOpen = (fn) => onOpen.push(fn)
/**
 * Unregister an onOpen function
*/
const delOnOpen = (fn) => {
  const index = onOpen.indexOf(fn)
  if (index >= 0)
    onOpen.splice(index, 1)
}

/**
 * Functions to run when a connection is lost to the websocket server
*/
const onClose = []
/**
 * Register an onClose function
*/
const addOnClose = (fn) => onClose.push(fn)
/**
 * Unregister an onClose function
*/
const delOnClose = (fn) => {
  const index = onClose.indexOf(fn)
  if (index >= 0)
    onClose.splice(index, 1)
}

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

  ws = new WebSocket(url)

  ws.binaryType = 'arraybuffer'

  // Called when a new connection is established
  ws.onopen = () => {
    retries = 0

    // Keeps the TCP connection alive. Otherwise it times out every 2 minutes
    keepAlive = setInterval(() => emit('keep-alive'), 60000)

    onOpen.forEach(fn => tryCatch(fn))
  }

  // Called when a connection has been closed
  ws.onclose = () => {
    clearInterval(keepAlive)

    // Auto-reconnect indefinitely
    if (!ws.forceClose)
      setTimeout(connect.bind(null, url), Math.min(exponentialBackoff(), MAX_WAIT_TIME))

    onClose.forEach(fn => tryCatch(fn))

    ws = null
  }

  // Called when a message is received from the server
  ws.onmessage = (packet) => {
    const { action, data } = JSON.parse(packet.data)
    const regex = new RegExp(`^${sanitizeRegex(action)}$`, 'gi')
    const { fn } = [...onMessages].find(m => m.action.match(regex)) || {}
    if (fn)
      tryCatch(fn.bind(null, data))
    else
      console.warn(`No registered onMessage function for action '${action}'`)
  }
}

function close () {
  ws.close()
}

export {
  connect,
  close,
  emit,
  addOnOpen,
  delOnOpen,
  addOnClose,
  delOnClose,
  addMessage,
  delMessage
}
