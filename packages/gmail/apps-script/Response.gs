function ok(data, pagination) {
  return { success: true, data: data, pagination: pagination }
}

function err(code, message) {
  return { success: false, error: { code: code, message: message } }
}

function respond(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
}
