export function frappeErrorMessage(body, status) {
  if (typeof body?.message === 'string') return body.message;
  if (typeof body?._error_message === 'string') return body._error_message;
  try {
    const messages = typeof body?._server_messages === 'string' ? JSON.parse(body._server_messages) : body?._server_messages;
    if (Array.isArray(messages) && messages.length) {
      const value = typeof messages.at(-1) === 'string' ? JSON.parse(messages.at(-1)) : messages.at(-1);
      if (typeof value?.message === 'string') return value.message.replace(/<[^>]*>/g, '');
    }
  } catch { /* Fallback for nonstandard Frappe errors. */ }
  return body?.exc_type || `HTTP ${status}`;
}
