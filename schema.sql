-- Bibliotheca SQL Server Schema

CREATE DATABASE Bibliotheca;
GO

USE Bibliotheca;
GO

CREATE TABLE users (
id NVARCHAR(64) NOT NULL PRIMARY KEY,
email NVARCHAR(255) NOT NULL UNIQUE,
password_hash NVARCHAR(255) NOT NULL,
approved BIT NOT NULL DEFAULT 0,
created_at DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE INDEX IX_users_email
ON users(email);
GO

CREATE TABLE books (
id NVARCHAR(64) NOT NULL PRIMARY KEY,

```
user_id NVARCHAR(64) NOT NULL,

title NVARCHAR(500) NOT NULL,
author NVARCHAR(500) NOT NULL,

isbn NVARCHAR(32) NULL,
publisher NVARCHAR(255) NULL,

year INT NULL,
pages INT NULL,

genre NVARCHAR(255) NULL,
location NVARCHAR(255) NULL,

status NVARCHAR(50) NOT NULL DEFAULT 'available',

copies INT NOT NULL DEFAULT 1,

language NVARCHAR(100) NOT NULL DEFAULT N'Türkçe',

rating TINYINT NOT NULL DEFAULT 0,

read_status NVARCHAR(50) NOT NULL DEFAULT 'unread',

current_page INT NOT NULL DEFAULT 0,

cover_url NVARCHAR(1000) NULL,
buy_url NVARCHAR(1000) NULL,

description NVARCHAR(MAX) NULL,
notes NVARCHAR(MAX) NULL,

created_at DATETIME NOT NULL DEFAULT GETDATE(),
updated_at DATETIME NULL,

CONSTRAINT FK_books_users
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

CONSTRAINT CK_books_rating
    CHECK (rating BETWEEN 0 AND 5),

CONSTRAINT CK_books_copies
    CHECK (copies >= 0),

CONSTRAINT CK_books_current_page
    CHECK (current_page >= 0),

CONSTRAINT CK_books_year
    CHECK (
        year IS NULL
        OR year BETWEEN 1000 AND YEAR(GETDATE()) + 1
    ),

CONSTRAINT CK_books_status
    CHECK (
        status IN (
            'available',
            'borrowed',
            'lost',
            'reserved'
        )
    ),

CONSTRAINT CK_books_read_status
    CHECK (
        read_status IN (
            'unread',
            'reading',
            'completed'
        )
    )
```

);

CREATE INDEX IX_books_user
ON books(user_id);

CREATE INDEX IX_books_title
ON books(title);

CREATE INDEX IX_books_author
ON books(author);

CREATE INDEX IX_books_isbn
ON books(isbn);

CREATE INDEX IX_books_status
ON books(status);

CREATE INDEX IX_books_genre
ON books(genre);

CREATE INDEX IX_books_language
ON books(language);

CREATE INDEX IX_books_user_title
ON books(user_id, title);

GO

CREATE TABLE highlights (
id NVARCHAR(64) NOT NULL PRIMARY KEY,

```
user_id NVARCHAR(64) NOT NULL,
book_id NVARCHAR(64) NOT NULL,

text NVARCHAR(MAX) NOT NULL,

page INT NULL,

type NVARCHAR(50) NOT NULL DEFAULT 'quote',

created_at DATETIME NOT NULL DEFAULT GETDATE(),

CONSTRAINT FK_highlights_users
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

CONSTRAINT FK_highlights_books
    FOREIGN KEY (book_id)
    REFERENCES books(id)
    ON DELETE CASCADE
```

);

CREATE INDEX IX_highlights_user
ON highlights(user_id);

CREATE INDEX IX_highlights_book
ON highlights(book_id);

CREATE INDEX IX_highlights_user_book
ON highlights(user_id, book_id);

GO

CREATE TABLE loans (
id NVARCHAR(64) NOT NULL PRIMARY KEY,

```
user_id NVARCHAR(64) NOT NULL,

book_id NVARCHAR(64) NULL,

borrower_name NVARCHAR(255) NOT NULL,
borrower_contact NVARCHAR(255) NULL,

lent_date DATE NULL,
due_date DATE NULL,
returned_date DATE NULL,

notes NVARCHAR(MAX) NULL,

created_at DATETIME NOT NULL DEFAULT GETDATE(),

CONSTRAINT FK_loans_users
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

CONSTRAINT FK_loans_books
    FOREIGN KEY (book_id)
    REFERENCES books(id)
    ON DELETE SET NULL,

CONSTRAINT CK_loans_dates
    CHECK (
        lent_date IS NULL
        OR due_date IS NULL
        OR due_date >= lent_date
    ),

CONSTRAINT CK_loans_returned
    CHECK (
        lent_date IS NULL
        OR returned_date IS NULL
        OR returned_date >= lent_date
    )
```

);

CREATE INDEX IX_loans_user
ON loans(user_id);

CREATE INDEX IX_loans_book
ON loans(book_id);

GO

CREATE TABLE shelves (
id INT IDENTITY(1,1) PRIMARY KEY,

```
user_id NVARCHAR(64) NOT NULL,

code NVARCHAR(100) NOT NULL,
name NVARCHAR(255) NULL,

created_at DATETIME NOT NULL DEFAULT GETDATE(),

CONSTRAINT UQ_shelves_user_code
    UNIQUE (user_id, code),

CONSTRAINT FK_shelves_users
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
```

);

GO

CREATE TRIGGER TR_books_updated_at
ON books
AFTER UPDATE
AS
BEGIN
SET NOCOUNT ON;

```
UPDATE b
SET updated_at = GETDATE()
FROM books b
INNER JOIN inserted i
    ON b.id = i.id;
```

END;
GO
