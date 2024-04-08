const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, collectionGroup } = require('firebase/firestore');

// const firebaseConfig = {
//   apiKey: "AIzaSyAVou9ObOaVQyIgJi4k0gpL1BKyhXXNttQ",
//   authDomain: "for-goros-bot.firebaseapp.com",
//   projectId: "for-goros-bot",
//   storageBucket: "for-goros-bot.appspot.com",
//   messagingSenderId: "428623907815",
//   appId: "1:428623907815:web:394903f1fda0a5f8838b42"
// };

// const fbapp = initializeApp(firebaseConfig);
// const db = getFirestore(fbapp);

const token = process.env.BOT_TOKEN; // Замініть на ваш реальний токен
const webAppUrl = "https://react-food-app-1195b991855b.herokuapp.com/";

const bot = new TelegramBot(token, { polling: true });
const app = express();

app.use(express.json());

const corsOptions = {
  origin: "https://react-food-app-1195b991855b.herokuapp.com",
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === "/start") {
    // console.log('Start + ' + JSON.stringify(msg));

    // try {
    //   let user = "";

    //   const firstName = msg.from.first_name || " ";
    //   const lastName = msg.from.last_name || " ";
    //   const userId = msg.from.id;
      
    //   const tmpId = Math.random().toString(36).substring(4);
    //   const date = new Date();
    //   const textDate = date.getHours() + ':' + date.getMinutes() + '  ' + date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear();
    //   user = {        
    //     firstName: firstName,
    //     lastName: lastName,
    //     id: userId,        
    //     isChecked: true,
    //     date: textDate
    //   };

    //   const usersRef = collection(db, "users");
    //   await setDoc(doc(usersRef, tmpId), user);
      
    // } catch (error) {
    //   console.log(error);
    // }

    await bot.sendMessage(chatId, "Нижче з'явиться кнопка, заповніть форму", {
      reply_markup: {
        keyboard: [
          [{ text: "Заповнити форму", web_app: { url: webAppUrl + "form" } }],
        ],
        one_time_keyboard: true,
      },
    });
  }

  if (msg?.web_app_data?.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);

      let deliveryMethodText = "";
      switch (data.deliveryMethod) {
        case "courier":
          deliveryMethodText = "Доставка кур'єром";
          break;
        case "pickup":
          deliveryMethodText = "Самовивіз";
          break;
        default:
          deliveryMethodText = "Метод доставки не вибрано";
      }

      // Відправка повідомлень
      await bot.sendMessage(chatId, "*Дякуємо за надану інформацію!*", {
        parse_mode: "Markdown",
      });
      await bot.sendMessage(chatId, `*👤️ Ваше ПІБ:* _${data?.name}_`, {
        parse_mode: "Markdown",
      });
      await bot.sendMessage(
        chatId,
        `*📱️ Ваш номер телефону:* _${data?.numberphone}_`,
        { parse_mode: "Markdown" }
      );
      await bot.sendMessage(chatId, `*🏙️ Ваше місто:* _${data?.city}_`, {
        parse_mode: "Markdown",
      });
      await bot.sendMessage(chatId, `*📍 Ваша адреса:* _${data?.street}_`, {
        parse_mode: "Markdown",
      });
      await bot.sendMessage(
        chatId,
        `*🚕 Метод доставки:* _${deliveryMethodText}_`,
        { parse_mode: "Markdown" }
      );

      if (data.deliveryMethod !== "pickup") {
        // Тільки для методу доставки, який не є самовивозом
        let deliveryTimeText = data.deliveryTime
          ? data.deliveryTime.startsWith
            ? `${data.deliveryTime}`
            : `${data.deliveryTime}`
          : "Час доставки не вказано";

        await bot.sendMessage(
          chatId,
          `*💵 Вартість доставки:* _${data?.deliveryPrice}_`,
          { parse_mode: "Markdown" }
        );
        await bot.sendMessage(
          chatId,
          `*⌚ Приблизний час доставки:* _${
            data.deliveryTime
              ? `${data.deliveryTime}`
              : "Час доставки не вказано"
          }_`,
          { parse_mode: "Markdown" }
        );
      } else {
        // Додаткова інформація для самовивозу
        await bot.sendMessage(
          chatId,
          `*📍 Адреса для самовивозу:* _вулиця Руська, 209-Б, Чернівці, Чернівецька область, Україна_`,
          { parse_mode: "Markdown" }
        );
      }

      setTimeout(async () => {
        await bot.sendMessage(
          chatId,
          "Заходьте в наш інтернет магазин за кнопкою нижче",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Зробити замовлення", web_app: { url: webAppUrl } }],
              ],
            },
          }
        );
      }, 3000);
    } catch (e) {
      console.error(e);
    }
  }
});

app.post("/web-data", async (req, res) => {
  const { queryId, products = [], totalPrice } = req.body;
  try {
    await bot.answerWebAppQuery(queryId, {
      type: "article",
      id: queryId,
      title: "Успішна покупка",
      input_message_content: {
        message_text: [
          "*Вітаємо з покупкою!*",
          `*Сума замовлення:* _${totalPrice}₴_`,
          "*Що саме ви замовили:*",
          ...products.map((item) => `• _${item.title}_`),
        ].join("\n"),
        parse_mode: "Markdown",
      },
    });
    res.status(200).json({});
  } catch (e) {
    console.error(e);
    res.status(500).json({});
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
