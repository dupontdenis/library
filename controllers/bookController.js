import Book from "../models/book.js";
import Author from "../models/author.js";
import { body, validationResult } from "express-validator";
import debugLib from "debug";
import logger from "../utils/logger.js";
const debug = debugLib("bookController");

const index = async (req, res) => {
  debug("index called");
  const details = Promise.all([
    Author.countDocuments({}),
    Book.countDocuments({}),
  ]);

  try {
    // wait...
    const [nbAuthors, nbBooks] = await details;
    // console.log(details)
    if (nbAuthors == null) {
      // No results.
      const err = new Error("Author not found");
      err.status = 404;
      return next(err);
    }
    // Successful, so render.
    res.render("index", {
      title: "Local Library Home",
      data: { author_count: nbAuthors, book_count: nbBooks },
    });
  } catch (error) {
    console.log(error.message); //
  }
};

// Display list of all books.
const book_list = async (req, res, next) => {
  debug("book_list called");
  try {
    const list_books = await Book.find({}, "title author")
      .sort({ title: 1 })
      .populate("author");
    logger.info(`Book list retrieved, count=${list_books.length}`);
    res.render("book_list", { title: "Book List", book_list: list_books });
  } catch (err) {
    next(err);
  }
};

// Display detail page for a specific book.
const book_detail = async (req, res, next) => {
  debug("book_detail called");
  try {
    const book = await Book.findById(req.params.id).populate("author");
    if (!book) {
      const err = new Error("Book not found");
      err.status = 404;
      logger.warn(`Book detail requested but not found id=${req.params.id}`);
      return next(err);
    }
    logger.info(`Book detail served id=${book._id} title=${book.title}`);
    res.render("book_detail", {
      title: book.title,
      book: book,
    });
  } catch (err) {
    next(err);
  }
};

// Display book create form on GET.
const book_create_get = async (req, res, next) => {
  debug("book_create_get called");
  try {
    const authors = await Author.find();
    logger.info(`Book create form shown, authors_available=${authors.length}`);
    res.render("book_form", {
      title: "Create Book",
      authors: authors,
    });
  } catch (err) {
    next(err);
  }
};

// Handle book create on POST.
const book_create_post = [
  // debug for book_create_post
  (req, res, next) => {
    debug("book_create_post called");
    // Log incoming create request (avoid logging sensitive data)
    try {
      logger.info(
        `Book create POST - ip=${req.ip} title=${
          req.body?.title || ""
        } author=${req.body?.author || ""}`
      );
    } catch (e) {
      debug("logger.info failed: %O", e);
    }
    next();
  },
  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data using spread
    // (req.body fields are sanitized by express-validator above)
    let book = new Book({ ...req.body });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      try {
        // Get all authors for form.
        const details = Promise.all([Author.find()]);
        const [authors] = await details;

        logger.warn({
          msg: "Validation errors creating book",
          errors: errors.array(),
          data: { title: book.title, ip: req.ip },
        });

        res.render("book_form", {
          title: "Create Book",
          authors: authors,
          book: book,
          errors: errors.array(),
        });
      } catch (error) {
        logger.error(
          `Error rendering book form after validation failure: ${error.message}`
        );
      }

      return;
    } else {
      try {
        // Data from form is valid. Save book.
        const saved = await book.save();
        logger.info(
          `Book created: id=${saved._id} title=${saved.title} by_ip=${req.ip}`
        );
        // Successful - redirect to new book record.
        const { url } = saved;
        res.redirect(url);
      } catch (error) {
        logger.error(`Error saving new book: ${error.message}`);
      }
    }
  },
];

// API: Handle book create via JSON POST
const api_book_create = async (req, res, next) => {
  debug("api_book_create called");
  try {
    logger.info(
      `API Book create POST - ip=${req.ip} title=${req.body?.title || ""}`
    );
  } catch (e) {
    debug("logger.info failed: %O", e);
  }

  const { title, author, summary, isbn } = req.body || {};
  const errors = [];
  if (!title) errors.push({ msg: "Title must not be empty." });
  if (!author) errors.push({ msg: "Author must not be empty." });
  if (!summary) errors.push({ msg: "Summary must not be empty." });
  if (!isbn) errors.push({ msg: "ISBN must not be empty." });

  if (errors.length) {
    logger.warn({
      msg: "API validation errors creating book",
      errors,
      data: { title },
    });
    return res.status(400).json({ errors });
  }

  try {
    const book = new Book({ title, author, summary, isbn });
    const saved = await book.save();
    logger.info(`API Book created: id=${saved._id} title=${saved.title}`);
    const location = saved.url || `/catalog/book/${saved._id}`;
    res
      .status(201)
      .location(location)
      .json({ id: saved._id, title: saved.title, url: location });
  } catch (error) {
    logger.error(`API error saving new book: ${error.message}`);
    next(error);
  }
};

// Display book delete form on GET.
const book_delete_get = async (req, res, next) => {
  debug("book_delete_get called");
  try {
    const book = await Book.findById(req.params.id).populate("author");
    if (!book) {
      return res.redirect("/catalog/books");
    }
    logger.info(
      `Book delete form shown for id=${book._id} title=${book.title}`
    );
    res.render("book_delete", {
      title: "Delete Book",
      book: book,
    });
  } catch (error) {
    next(error);
  }
};

// Handle book delete on POST.
const book_delete_post = async (req, res, next) => {
  debug("book_delete_post called");
  try {
    const book = await Book.findById(req.params.id).populate("author");
    if (!book) {
      return res.redirect("/catalog/books");
    }
    logger.info(
      `Deleting book id=${req.body.id || req.params.id} requested_by=${req.ip}`
    );
    await Book.findByIdAndRemove(req.body.id);
    logger.info(`Book deleted id=${req.body.id || req.params.id}`);
    res.redirect("/catalog/books");
  } catch (error) {
    next(error);
  }
};

// Display book update form on GET.
const book_update_get = async (req, res, next) => {
  debug("book_update_get called");
  try {
    const [book, authors] = await Promise.all([
      Book.findById(req.params.id).populate("author"),
      Author.find(),
    ]);
    if (!book) {
      const err = new Error("Book not found");
      err.status = 404;
      logger.warn(`Book update requested but not found id=${req.params.id}`);
      return next(err);
    }
    logger.info(`Book update form shown id=${book._id} title=${book.title}`);
    res.render("book_form", {
      title: "Update Book",
      authors: authors,
      book: book,
    });
  } catch (error) {
    next(error);
  }
};

// Handle book update on POST.
const book_update_post = [
  // debug for book_update_post
  (req, res, next) => {
    debug("book_update_post called");
    next();
  },
  // Validate and sanitize fields.
  body("title", "Title must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("author", "Author must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),
  body("summary", "Summary must not be empty.")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id using spread
    const book = new Book({ ...req.body, _id: req.params.id });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      try {
        // Get all authors for form
        const details = Promise.all([Author.find()]);

        const [authors] = await details;
        logger.warn({
          msg: "Validation errors updating book",
          errors: errors.array(),
          data: { id: req.params.id },
        });
        res.render("book_form", {
          title: "Update Book",
          authors: results.authors,
          book: book,
          errors: errors.array(),
        });
        return;
      } catch (error) {
        console.log(error.message); //
      }
    } else {
      // Data from form is valid. Update the record.
      try {
        // ne pas mettre await et res.direct(url) serait faux !
        const { url } = await Book.findByIdAndUpdate(req.params.id, book, {});
        logger.info(`Book updated id=${req.params.id} redirect=${url}`);
        res.redirect(url);
      } catch (error) {
        console.log("ici" + error.message); //
      }
    }
  },
];

// ...existing code...

export default {
  index,
  book_list,
  book_detail,
  book_create_get,
  book_create_post,
  // API handlers
  api_book_create,
  book_delete_get,
  book_delete_post,
  book_update_get,
  book_update_post,
};
