function ok(d, p) { return { success: true, data: d, pagination: p } }
function err(c, m) { return { success: false, error: { code: c, message: m } } }
function respond(r) { return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON) }
