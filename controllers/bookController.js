import Book from "../models/book.js";
import Author from "../models/author.js";
import { body, validationResult } from "express-validator";
import async from "async";
import debugLib from "debug";
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
      return next(err);
    }
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

    // Create a Book object with escaped and trimmed data.
    let book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      try {
        // Get all authors for form.
        const details = Promise.all([Author.find()]);
        const [authors] = await details;

        res.render("book_form", {
          title: "Create Book",
          authors: authors,
          book: book,
          errors: errors.array(),
        });
      } catch (error) {
        console.log(error.message); //
      }

      return;
    } else {
      try {
        // Data from form is valid. Save book.
        const { url } = await book.save();
        // Successful - redirect to new book record.
        res.redirect(url);
      } catch (error) {
        console.log(error.message);
      }
    }
  },
];

// Display book delete form on GET.
const book_delete_get = async (req, res, next) => {
  debug("book_delete_get called");
  try {
    const book = await Book.findById(req.params.id).populate("author");
    if (!book) {
      return res.redirect("/catalog/books");
    }
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
    await Book.findByIdAndRemove(req.body.id);
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
      return next(err);
    }
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

    // Create a Book object with escaped/trimmed data and old id.
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      _id: req.params.id, // This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      try {
        // Get all authors for form
        const details = Promise.all([Author.find()]);

        const [authors] = await details;
        console.log(authors);
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
  book_delete_get,
  book_delete_post,
  book_update_get,
  book_update_post,
};
