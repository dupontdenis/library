#! /usr/bin/env node
import dotenv from "dotenv";
import logger from "./utils/logger.js";
import Book from "./models/book.js";
import Author from "./models/author.js";
import mongoose from "mongoose";

// Load environment early
dotenv.config();

logger.info(
  "This script populates some test books and authors to your database. You can specify a database as an argument, or use the default from .env (MONGODB_URI)."
);

// Always use .env for MongoDB URI

const mongoDB = process.env.MONGODB_URI;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on("error", (err) => logger.error(`MongoDB connection error: ${err}`));

const authors = [];
const books = [];

async function authorCreate(first_name, family_name, d_birth, d_death) {
  // Use object shorthand and conditional spread for optional dates
  const authordetail = {
    first_name,
    family_name,
    ...(d_birth != false ? { date_of_birth: d_birth } : {}),
    ...(d_death != false ? { date_of_death: d_death } : {}),
  };
  try {
    const author = new Author(authordetail);
    const saveAuthor = await author.save(); //when fail its goes to catch
    logger.info(
      `Author saved: id=${saveAuthor._id} name=${saveAuthor.first_name} ${saveAuthor.family_name}`
    );
    // store the author _id so books can reference it
    authors.push(saveAuthor._id);
  } catch (err) {
    logger.error(`err ${err}`);
  }
}

async function bookCreate(title, summary, isbn, author) {
  // Use object shorthand for book details
  const bookdetail = { title, summary, author, isbn };
  try {
    const book = new Book(bookdetail);

    const saveBook = await book.save(); //when fail its goes to catch
    logger.info(`Book saved: id=${saveBook._id} title=${saveBook.title}`);
    // store the book _id
    books.push(saveBook._id);
  } catch (err) {
    logger.error(`err ${err}`);
  }
}

async function createAuthors() {
  return Promise.all([
    authorCreate("Denis", "Dupond", "02-09-1965", false),
    authorCreate("BOB", "Synclair", "12-12-1963", "12-12-2025"),
  ]);
}

async function createBooks() {
  // Find authors by name so books reference the correct author IDs
  const authorDupond = await Author.findOne({
    family_name: "Dupond",
  }).exec();
  const authorSynclair = await Author.findOne({
    family_name: "Synclair",
  }).exec();

  if (!authorDupond || !authorSynclair) {
    logger.error("Required authors not found when creating books");
    throw new Error("Authors for books not found");
  }

  return Promise.all([
    bookCreate(
      "Le CSS en action",
      "GRID / FLEX en action",
      "978-1-2345-6789-7",
      authorDupond._id
    ),
    bookCreate(
      "Le Rock par la pratique",
      "Devenez danceur de saloom",
      "976-32345-6789-7",
      authorSynclair._id
    ),
    bookCreate(
      "Le JS en action",
      "Les closures n'ont plus de secret",
      "978-1-2345-6789-9",
      authorSynclair._id
    ),
  ]);
}

async function createDB() {
  // Flush the database first: remove all Books and Authors to start fresh
  try {
    logger.info("Flushing Books and Authors collections...");
    await Book.deleteMany({});
    await Author.deleteMany({});
    logger.info("Flush complete.");
  } catch (err) {
    logger.error(`Error flushing DB: ${err}`);
    // continue to repopulate even if flush fails
  }

  await createAuthors();
  await createBooks();

  mongoose.connection.close();
}

createDB();
