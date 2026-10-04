import {Bot, InlineKeyboardBuilder} from "node-telegram-bot-api";
import {run} from "node-telegram-bot-api/node";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);