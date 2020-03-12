const uWS = require('uWebSockets.js'),
      { StringDecoder } = require('string_decoder'),
      decoder = new StringDecoder('utf8'),
      fs = require('fs'),
      http = require('http'),
      { getContentType } = require('./utils')

http.createServer(null, function (req, res) {
  const resource = req.url === '/' ? '/index.html' : req.url
  fs.readFile(`${__dirname}${resource}`, function (err, data) {
    res.setHeader("Content-Type", getContentType(resource))
    res.writeHead(200)
    res.end(data)
  })
}).listen(8080)
console.log('http server running on port 8080')

const app = uWS.App()
.ws('/*', {

  // New connection established
  open: (socket, req) => {

  },

  // Connection closed
  close: (socket, req) => {

  },

  // Client request received
  message: (socket, message) => {
    const { action, data } = JSON.parse(decoder.write(Buffer.from(message)))

    switch (action) {
      case 'ping':
        socket.send(JSON.stringify({ action: 'pong', data }))
        break
    }
  }
})

const PORT = 9001
app.listen(PORT, (listenSocket) => {
  if (listenSocket)
    console.log(`Listening to port ${PORT}`)
})
