/* Helper function for getting a resource's (file) content-type */
exports.getContentType = function getContentType (resource) {
  const resourceSplit = resource.split('.')
  const extension = resource === '/' ? 'html' : resourceSplit[resourceSplit.length - 1]
  
  let contentType
  switch (extension) {
    case 'html':
      contentType = 'text/html'
      break;
    case 'js':
      contentType = "text/javascript"
      break;
    case 'json':
      contentType = "application/json"
      break;
    case 'css':
      contentType = "text/css"
      break;
    case 'css':
      contentType = "text/css"
      break;
    case 'jpg':
    case 'jpeg':
      contentType = "image/jpeg"
      break;
    case 'png':
      contentType = "image/png"
      break;
    case 'svg':
      contentType = "image/svg+xml"
      break;
    default:
      contentType = "application/octet-stream"
      break;
  }
  return contentType
}
