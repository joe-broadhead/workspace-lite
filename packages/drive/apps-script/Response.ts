interface ApiResponse {
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
  pagination?: { nextPageToken?: string; hasMore: boolean }
}

function ok(data: unknown, pagination?: ApiResponse['pagination']): ApiResponse {
  return { success: true, data, pagination }
}

function err(code: string, message: string): ApiResponse {
  return { success: false, error: { code, message } }
}

function respond(response: ApiResponse): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
}
