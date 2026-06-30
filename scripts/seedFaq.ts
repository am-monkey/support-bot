/**
 * Seeds the knowledge base with a curated set of common support FAQ pairs
 * (HAPP / VPN). Appends to the existing kb_qa table (does NOT wipe it).
 *
 *   npm run kb:seed
 *
 * Review/edit FAQ below for anything specific to your service (prices, device
 * count, payment, refunds, countries) before running — answers feed the AI, so
 * keep them accurate. VPN keys are intentionally NOT here: they are personal
 * and delivered per-user by chat_id, never from the shared knowledge base.
 */
import { createClient } from "@supabase/supabase-js";

import { embedDocuments } from "../src/ai/embeddings";
import { config } from "../src/config";

interface Qa {
  question: string;
  answer: string;
}

const FAQ: Qa[] = [
  {
    question: "Какой VPN-клиент использовать? Что такое HAPP?",
    answer:
      "Мы используем приложение HAPP — это наш основной VPN-клиент. Установите его на ваше устройство, добавьте ваш ключ, и можно подключаться. HAPP доступен для iPhone (App Store), Android (Google Play), а также для компьютера.",
  },
  {
    question: "Как установить HAPP на iPhone / iOS?",
    answer:
      "Откройте App Store, найдите приложение «HAPP» и установите его. Затем добавьте ваш ключ (он есть в мини-приложении бота) и подключитесь.",
  },
  {
    question: "Как установить HAPP на Android?",
    answer:
      "Установите приложение «HAPP» из Google Play. После установки добавьте ваш ключ из мини-приложения бота и подключитесь.",
  },
  {
    question: "Как установить HAPP на компьютер (Windows / macOS)?",
    answer:
      "Для компьютера используйте десктоп-версию HAPP. Установите приложение, добавьте ваш ключ и подключитесь так же, как на телефоне.",
  },
  {
    question: "Как подключиться? Как добавить ключ в HAPP?",
    answer:
      "Скопируйте ваш ключ, откройте HAPP, нажмите «+» (добавить) → «Добавить из буфера обмена» или «по ссылке», вставьте ключ и нажмите «Подключиться».",
  },
  {
    question: "Где взять мой ключ для подключения?",
    answer:
      "Ваш ключ находится в мини-приложении нашего бота. Также вы можете написать сюда «пришлите мой ключ», и мы отправим ваш личный ключ. Чужие ключи мы не выдаём.",
  },
  {
    question: "VPN не работает / не подключается. Что делать?",
    answer:
      "Попробуйте по порядку: 1) переподключиться в HAPP; 2) обновить/заново добавить ключ из мини-приложения; 3) выбрать другой сервер (локацию); 4) перезапустить приложение и устройство. Если не помогло — напишите нам, поможем.",
  },
  {
    question: "VPN работает медленно. Как ускорить?",
    answer:
      "Попробуйте сменить сервер (локацию) в HAPP на ближайший, переподключиться и проверить скорость своего интернета без VPN. Если на всех серверах медленно — сообщите нам.",
  },
  {
    question: "Как сменить сервер или локацию в HAPP?",
    answer:
      "Откройте HAPP, в списке подключений выберите другой сервер (локацию) и нажмите «Подключиться». Можно попробовать несколько и выбрать самый быстрый.",
  },
  {
    question: "Ключ не работает / ошибка подключения.",
    answer:
      "Проверьте, что подписка активна, и заново добавьте ключ из мини-приложения бота (старый удалите). Если ошибка остаётся — напишите нам, проверим вашу подписку.",
  },
  {
    question: "Подписка закончилась. Что делать?",
    answer:
      "Продлите подписку в мини-приложении бота. После продления ключ снова заработает; при необходимости переподключитесь в HAPP.",
  },
  {
    question: "Как продлить подписку / оплатить?",
    answer:
      "Продление и оплата доступны в мини-приложении бота. Если возникнут сложности с оплатой — напишите нам.",
  },
  {
    question: "На скольких устройствах можно пользоваться?",
    answer:
      "Количество устройств зависит от вашего тарифа — актуальную информацию смотрите в мини-приложении бота.",
  },
  {
    question: "Работает ли на Smart TV / Android TV?",
    answer:
      "Да, HAPP можно установить на Android TV. Добавьте ваш ключ так же, как на телефоне. Для приставок без Google Play может потребоваться установка приложения вручную.",
  },
  {
    question: "Можно ли смотреть стриминговые сервисы и открывать заблокированные сайты?",
    answer:
      "Да, при активном подключении через HAPP доступ к сайтам и сервисам восстанавливается. Если конкретный сервис не открывается — попробуйте сменить локацию сервера.",
  },
  {
    question: "Как обновить ключ?",
    answer:
      "Возьмите актуальный ключ из мини-приложения бота, удалите в HAPP старое подключение и добавьте новое из буфера обмена или по ссылке.",
  },
];

async function main(): Promise<void> {
  const supabase = createClient(config.supabase.URL, config.supabase.KEY);
  const embeddings = await embedDocuments(FAQ.map((f) => f.question));

  const records = FAQ.map((f, i) => ({
    topic_id: null,
    question: f.question,
    answer: f.answer,
    embedding: embeddings[i],
  }));

  const { error } = await supabase.from("kb_qa").insert(records);
  if (error) {
    console.error("Insert failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${records.length} FAQ pairs into kb_qa.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
