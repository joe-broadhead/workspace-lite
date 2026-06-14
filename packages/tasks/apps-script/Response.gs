function ok(data, pagination, warnings) {
  return { success: true, data: data, pagination: pagination, warnings: warnings }
}

function err(code, message, correlationId) {
  return { success: false, error: { code: code, message: message, correlationId: correlationId } }
}

function respond(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
}
