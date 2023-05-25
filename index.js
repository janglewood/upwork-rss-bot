require("dotenv").config();
const FeedSub = require("feedsub");
const rssFeed = process.env.rss_feed;
let reader = new FeedSub(rssFeed, {
  interval: 1, // Check feed every 1 minute.
});
// port for dockerize
const express = require("express");

// Constants
const PORT = process.env.PORT || 8000;
const HOST = "0.0.0.0";

// App
const app = express();
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const adapter = new FileSync("db.json");
const db = low(adapter);

db.defaults({ feed: [] }).write();

const Telegraf = require("telegraf");
const Extra = require("telegraf/extra");
const session = require("telegraf/session");
const token = process.env.telegram_bot_token;
const bot = new Telegraf(token);

// Register session middleware.
bot.use(session());

bot.telegram.sendMessage(
  process.env.telegram_channel,
  `Bot started for feed: \n ${rssFeed}`
);

// Register logger middleware.
bot.use((ctx, next) => {
  const start = new Date();
  return next().then(() => {
    const ms = new Date() - start;
    console.log("response time %sms", ms);
  });
});

reader.on("item", (item) => {
  console.log(item.title);

  const itemInDb = db.get("feed").find({ link: item.link }).value();
  if (itemInDb) {
    console.log("This item is already exists:");
    console.log(itemInDb.link);
  } else {
    db.get("feed").push(item).write();

    var message = item.description;
    const oldstring = "<br />";
    const newstring = "\n";
    while (message.indexOf(oldstring) > -1) {
      message = message.replace(oldstring, newstring);
    }

    bot.telegram.sendMessage(
      process.env.telegram_channel,
      message,
      Extra.HTML().markup()
    );
  }
});

reader.start();
