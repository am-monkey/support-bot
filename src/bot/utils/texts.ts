// Supported languages. Add others as needed, or keep a single language.
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  ru: "🇷🇺 Русский",
  en: "🇬🇧 English",
};

type Lang = "en" | "ru";

const DATA: Record<Lang, Record<string, string>> = {
  en: {
    main_menu:
      "<b>Write your question</b>, and we will answer you as soon as possible:",
    message_sent: "<b>Message sent!</b> Expect a response.",
    message_edited:
      "<b>The message was edited only in your chat.</b> " +
      "To send an edited message, send it as a new message.",
    user_started_bot:
      "User <b>{name}</b> started the bot!\n\n" +
      "List of available commands:\n\n" +
      "• /ban\n" +
      "Block/Unblock user" +
      "<blockquote>Block the user if you do not want to receive messages from him.</blockquote>\n\n" +
      "• /silent\n" +
      "Activate/Deactivate silent mode" +
      "<blockquote>When silent mode is enabled, messages are not sent to the user.</blockquote>\n\n" +
      "• /information\n" +
      "User information" +
      "<blockquote>Receive a message with basic information about the user.</blockquote>",
    user_restarted_bot: "User <b>{name}</b> restarted the bot!",
    user_stopped_bot: "User <b>{name}</b> stopped the bot!",
    user_blocked:
      "<b>User blocked!</b> Messages from the user are not accepted.",
    user_unblocked:
      "<b>User unblocked!</b> Messages from the user are being accepted again.",
    blocked_by_user:
      "<b>Message not sent!</b> The bot has been blocked by the user.",
    user_information:
      "<b>ID:</b>\n" +
      "- <code>{id}</code>\n" +
      "<b>Name:</b>\n" +
      "- {full_name}\n" +
      "<b>Status:</b>\n" +
      "- {state}\n" +
      "<b>Username:</b>\n" +
      "- {username}\n" +
      "<b>Blocked:</b>\n" +
      "- {is_banned}\n" +
      "<b>Registration date:</b>\n" +
      "- {created_at}\n" +
      "<b>Subscription key:</b>\n" +
      "- <code>{sub}</code>\n" +
      "<b>Days left:</b>\n" +
      "- {days_left}",
    message_not_sent:
      "<b>Message not sent!</b> An unexpected error occurred.",
    message_sent_to_user: "<b>Message sent to user!</b>",
    silent_mode_enabled:
      "<b>Silent mode activated!</b> Messages will not be delivered to the user.",
    silent_mode_disabled:
      "<b>Silent mode deactivated!</b> The user will receive all messages.",
    newsletter_usage:
      "<b>Newsletter.</b> Send <code>/newsletter your text</code> or reply to a message with <code>/newsletter</code> to broadcast it to all users.",
    newsletter_done: "<b>Newsletter sent!</b> Delivered to {ok} of {total} users.",
  },
  ru: {
    main_menu:
      "<b>Оставьте свой вопрос</b>, и мы ответим вам в ближайшее время:",
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
    newsletter_usage:
      "<b>Рассылка.</b> Отправьте <code>/newsletter ваш текст</code> или ответьте на сообщение командой <code>/newsletter</code>, чтобы разослать его всем пользователям.",
    newsletter_done: "<b>Рассылка отправлена!</b> Доставлено {ok} из {total} пользователей.",
  },
};

export class TextMessage {
  private readonly lang: Lang;

  constructor(languageCode: string | null | undefined) {
    this.lang =
      languageCode && languageCode in DATA ? (languageCode as Lang) : "en";
  }

  get(code: string): string {
    return DATA[this.lang][code];
  }
}
