const Books = require("../models/Book");
const Author = require("../models/Author");
const Rent = require("../models/RentBook");
const { isConstValueNode } = require("graphql");
const resolvers = {
  Query: {
    async books(_, { ID }) {
      try {
        const book = await Books.findById(ID).populate("author");
        if (!book) {
          throw new Error("Book not found");
        }
        return book; // Wrap the book in an array to make it iterable
      } catch (error) {
        throw new Error(error.message);
      }
    },
    async getBook(_, { amount }) {
      return await Books.find().populate("author").sort({ createdAt: -1 }).limit(amount);
    },
    async author(_, { ID }) {
      try {
        const author = await Author.findById(ID).populate("books")
        if (!author) {
          throw new Error("Author not found");
        }
        return [author]
      }
      catch (error) {
        throw new Error(error.message);
      }
    },
    async getAuthor(_, { amount }) {
      return await Author.find().sort({ createdAt: -1 }).limit(amount);
    },
    async getRent(_, { ID }) {
      const rent = await Rent.findById(ID).populate("books.book")
      return [rent]
    },
  },
  Mutation: {
    // Books Mutation
    // Create Book
    async createBook(_, {
      bookInput
    }) {
      try {
        // Create the book
        const book = await Books.create(bookInput);

        // Update the associated author's books field
        const author = await Author.findById(bookInput.author);
        if (!author) {
          throw new Error('Author not found');
        }
        author.books.push(book._id);
        await author.save();

        return book;
      } catch (error) {
        throw new Error(error.message);
      }
    },

    // Delete Book
    async deleteBook(_, { ID }) {
      const id = ID
      const Book = await Books.findById(ID)
      // const author = await Author.findById(Book.author);
      const deleted = (await Books.deleteOne({ _id: ID })).deletedCount;
      if (deleted) {
        await Author.updateOne({ _id: Book.author }, { $pull: { books: id } });
        return deleted;
      }
      else {
        throw new Error("Deleted unsuccessfull")
      }

    },

    // Update Book
    async editBook(
      _,
      {
        ID,
        bookInput: {
          title,
          author,
          description,
          isbn,
          language,
          price,
          rating,
        },
      }
    ) {
      const updated = (
        await Recipe.updateOne(
          {
            _id: ID,
          },
          {
            $set: {
              title,
              author,
              description,
              isbn,
              language,
              price,
              rating,
            },
          }
        )
      ).modifiedCount;
      return updated;
    },
    //   Author Mutation
    // Create Author
    async createAuthor(_, { authorInput: { name, email, book } }) {
      const newAuthor = new Author({
        name,
        email,
        book,
        createdAt: new Date().toISOString(),
      });
      const res = await newAuthor.save();
      return {
        id: res.id,
        ...res._doc,
      };
    },
    async deleteAuthor(_, { ID }) {
      const deleted = (await Author.deleteOne({ _id: ID })).deletedCount;
      return deleted;
    },
    // Delete Author
    // Update Author
    async editAuthor(_, { ID, authorInput: { name, email, book } }) {
      const updated = (
        await Recipe.updateOne(
          {
            _id: ID,
          },
          {
            $set: {
              name,
              email,
              book,
            },
          }
        )
      ).modifiedCount;
      return updated;
    },
    // Rent Mutation
    // Create Rent
    async createRent(_, { RentInput }) {
      const { renteremail, books } = RentInput;

      // Check if the email exists
      const existingRent = await Rent.findOne({ renteremail });

      const rent = existingRent || await Rent.create(RentInput);

      rent.books.push(...books);

      await rent.save();

      return rent;
    },
    async deleteRent(_, { ID }) {
      const deleted = (await Rent.deleteOne({ _id: ID })).deletedCount;
      if (deleted) {
        return deleted;
      }
      else {
        throw new Error("Delete unsuccessfull")
      }

    },
    async returnBook(_, { ReturnBookInput }) {
      const { ID, bookId } = ReturnBookInput;

      const rent = await Rent.findById(ID).populate("books.book");
      if (!rent) {
        throw new Error('Rental not found');
      }

      const bookRental = rent.books.find((book) => book.book._id.toString() === bookId);
      if (!bookRental) {
        throw new Error('Book not found in rental');
      }
      bookRental.returned = true;
      await rent.save();

      return rent;
    },
    async getfine(_, { ID }) {
      const rent = await Rent.findById(ID).populate("books.book");
      if (!rent) {
        throw new Error('Rental not found');
      }

      const totalFine = rent.books.reduce((total, bookRental) => {
        return total + bookRental.fine;
      }, 0);

      const message = totalFine === 0 ? "You have no fine" : `You have to pay Rs. ${totalFine}`;

      return { rent, message };
    },
    async payfine(_, { ReturnBookInput }) {
      const { ID, bookId } = ReturnBookInput;
      const rent = await Rent.findById(ID).populate("books.book");
      if (!rent) {
        throw new Error('Rental not found');
      }

      const bookRental = rent.books.find((book) => book.book._id.toString() === bookId);
      if (!bookRental) {
        throw new Error('Book not found in rental');
      }
      let message

      if (bookRental.fine === 0) {
        message = "You have no fine"
      }
      else {
        message = `You have to pay Rs.${bookRental.fine}`
      }
      return { rent:bookRental.book, message }
    }
    // a
  },
};

module.exports = resolvers;
