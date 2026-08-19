const BOT_API = 'https://api.telegram.org';

export async function sendBotMessage(botToken, chatId, text, replyMarkup) {
  if (!botToken) return { skipped: true };
  const response = await fetch(`${BOT_API}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup })
  });
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status}`);
  return response.json();
}

function openAppMarkup(miniAppUrl) {
  return miniAppUrl ? { inline_keyboard: [[{ text: 'Open AllFreshMart', web_app: { url: miniAppUrl } }]] } : { remove_keyboard: true };
}

export async function handleTelegramUpdate(update, { repository, botToken, miniAppUrl }) {
  const message = update.message;
  if (!message?.from) return { ignored: true };
  const user = message.from;
  if (message.text?.startsWith('/start')) {
    const wasKnown = repository.getUser(user.id) !== null;
    const profile = repository.upsertTelegramUser(user);
    const messageText = !wasKnown
      ? `Welcome to AllFreshMart, ${profile.firstName || 'there'}! Share your phone number once so our rider can reach you when you check out.`
      : `Welcome back, ${profile.firstName || 'there'}! Your fresh picks are ready.`;
    const replyMarkup = !wasKnown
      ? { keyboard: [[{ text: 'Share phone number', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
      : openAppMarkup(miniAppUrl);
    await sendBotMessage(botToken, message.chat.id, messageText, replyMarkup);
    return { registered: true, user: profile };
  }
  if (message.contact) {
    // Telegram can send another contact through this button; only accept the sender's own contact.
    if (String(message.contact.user_id) !== String(user.id)) return { ignored: true, reason: 'contact-user-mismatch' };
    repository.upsertTelegramUser(user, { phoneNumber: message.contact.phone_number, phoneVerified: true });
    await sendBotMessage(botToken, message.chat.id, 'Thanks — your verified phone number is saved. You can now place an order.', openAppMarkup(miniAppUrl));
    return { contactSaved: true };
  }
  return { ignored: true };
}
