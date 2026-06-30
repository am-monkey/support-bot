// Single-language (Russian) bot texts.
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  ru: "🇷🇺 Русский",
};

const DATA: Record<string, string> = {
  main_menu: "<b>Оставьте свой вопрос</b>, и мы ответим вам в ближайшее время:",
  message_sent: "<b>Сообщение отправлено!</b> Ожидайте ответа.",
  message_edited:
    "<b>Сообщение отредактировано только в вашем чате.</b> " +
    "Чтобы отправить отредактированное сообщение, отправьте его как новое сообщение.",
  user_started_bot:
    "Пользователь <b>{name}</b> запустил(а) бота!\n\n" +
    "Список доступных команд:\n\n" +
    "• /ban\n" +
    "Заблокировать/Разблокировать пользователя" +
    "<blockquote>Заблокируйте пользователя, если не хотите получать от него сообщения.</blockquote>\n\n" +
    "• /silent\n" +
    "Активировать/Деактивировать тихий режим" +
    "<blockquote>При включенном тихом режиме сообщения не отправляются пользователю.</blockquote>\n\n" +
    "• /information\n" +
    "Информация о пользователе" +
    "<blockquote>Получить сообщение с основной информацией о пользователе.</blockquote>",
  user_restarted_bot: "Пользователь <b>{name}</b> перезапустил(а) бота!",
  user_stopped_bot: "Пользователь <b>{name}</b> остановил(а) бота!",
  user_blocked:
    "<b>Пользователь заблокирован!</b> Сообщения от пользователя не принимаются.",
  user_unblocked:
    "<b>Пользователь разблокирован!</b> Сообщения от пользователя вновь принимаются.",
  blocked_by_user:
    "<b>Сообщение не отправлено!</b> Бот был заблокирован пользователем.",
  user_information:
    "<b>ID:</b>\n" +
    "- <code>{id}</code>\n" +
    "<b>Имя:</b>\n" +
    "- {full_name}\n" +
    "<b>Статус:</b>\n" +
    "- {state}\n" +
    "<b>Username:</b>\n" +
    "- {username}\n" +
    "<b>Заблокирован:</b>\n" +
    "- {is_banned}\n" +
    "<b>Дата регистрации:</b>\n" +
    "- {created_at}\n" +
    "<b>Ключ подписки:</b>\n" +
    "- <code>{sub}</code>\n" +
    "<b>Осталось дней:</b>\n" +
    "- {days_left}",
  message_not_sent:
    "<b>Сообщение не отправлено!</b> Произошла неожиданная ошибка.",
  message_sent_to_user: "<b>Сообщение отправлено пользователю!</b>",
  silent_mode_enabled:
    "<b>Тихий режим активирован!</b> Сообщения не будут доставлены пользователю.",
  silent_mode_disabled:
    "<b>Тихий режим деактивирован!</b> Пользователь будет получать все сообщения.",
  ai_auto_reply_note:
    "🤖 <b>ИИ ответил автоматически</b> (релевантность {relevance}, уверенность {confidence}):\n<blockquote>{answer}</blockquote>",
  ai_key_sent_note:
    "🔑 <b>ИИ автоматически отправил пользователю его ключ.</b>",
  ai_escalated:
    "🙋 <b>Нужен оператор</b> — {operator}.\nПричина: {reason}\nРелевантность: {relevance}\n<blockquote>{question}</blockquote>",
  ai_escalation_reason_operator: "пользователь попросил оператора",
  ai_escalation_reason_no_answer: "ИИ не смог ответить по базе знаний",
  ai_escalation_reason_low_relevance: "низкая релевантность к базе знаний",
  ai_suggested_answer:
    "💡 <b>Предложенный ответ</b> — отправьте как есть кнопкой ниже или напишите свой:\n<blockquote>{answer}</blockquote>",
  ai_btn_send_suggested: "✅ Отправить предложенный",
  ai_suggested_sent: "✅ Предложенный ответ отправлен пользователю.",
  ai_suggested_expired: "Предложение больше недоступно.",
  vpn_key_message:
    "🔑 <b>Ваш ключ для HAPP:</b>\n{key}\n\n" +
    "Откройте приложение HAPP → «+» → добавить из буфера / по ссылке, вставьте ключ и подключайтесь.",
  vpn_key_not_found:
    "Не нашёл активный ключ для этого пользователя. Проверьте подписку перед отправкой.",
};

export class TextMessage {
  // Single-language bot; the language code is accepted for API compatibility
  // but ignored — all texts are Russian.
  constructor(_languageCode?: string | null) {}

  get(code: string): string {
    return DATA[code];
  }
}
