-- ═══════════════════════════════════════════
-- Bibliotheca — SQL Server Şeması
-- ═══════════════════════════════════════════

CREATE DATABASE Bibliotheca;
GO
USE Bibliotheca;
GO

CREATE TABLE users (
  id            NVARCHAR(128) PRIMARY KEY,
  email         NVARCHAR(256) NOT NULL UNIQUE,
  password_hash NVARCHAR(256) NOT NULL,
  approved      BIT           NOT NULL DEFAULT 0,
  created_at    DATETIME2     DEFAULT GETDATE()
);

CREATE TABLE books (
  id           NVARCHAR(128) PRIMARY KEY,
  user_id      NVARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        NVARCHAR(512) NOT NULL,
  author       NVARCHAR(256) NOT NULL,
  isbn         NVARCHAR(20),
  publisher    NVARCHAR(256),
  year         INT,
  pages        INT,
  genre        NVARCHAR(100),
  location     NVARCHAR(100),
  status       NVARCHAR(20)  DEFAULT 'available',
  copies       INT           DEFAULT 1,
  language     NVARCHAR(50)  DEFAULT N'Türkçe',
  rating       TINYINT       DEFAULT 0,
  read_status  NVARCHAR(20)  DEFAULT 'unread',
  current_page INT           DEFAULT 0,
  cover_url    NVARCHAR(1024),
  buy_url      NVARCHAR(1024),
  description  NVARCHAR(MAX),
  notes        NVARCHAR(MAX),
  created_at   DATETIME2     DEFAULT GETDATE(),
  updated_at   DATETIME2     DEFAULT GETDATE()  -- FIX #7
);

CREATE TABLE highlights (
  id         NVARCHAR(128) PRIMARY KEY,
  user_id    NVARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id    NVARCHAR(128) NOT NULL REFERENCES books(id) ON DELETE NO ACTION,
  text       NVARCHAR(MAX) NOT NULL,
  page       INT,
  type       NVARCHAR(20)  DEFAULT 'quote',
  created_at DATETIME2     DEFAULT GETDATE()
);

CREATE TABLE loans (
  id                NVARCHAR(128) PRIMARY KEY,
  user_id           NVARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_name         NVARCHAR(512),
  borrower_name     NVARCHAR(256) NOT NULL,
  borrower_contact  NVARCHAR(256),
  lent_date         DATE,
  due_date          DATE,
  returned_date     DATE,
  notes             NVARCHAR(512),
  created_at        DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE shelves (
  id         INT IDENTITY PRIMARY KEY,
  user_id    NVARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code       NVARCHAR(50)  NOT NULL,
  name       NVARCHAR(256),
  created_at DATETIME2 DEFAULT GETDATE(),
  UNIQUE (user_id, code)
);

-- İndeksler
CREATE INDEX IX_books_user_id    ON books(user_id);
CREATE INDEX IX_books_created_at ON books(user_id, created_at DESC);
CREATE INDEX IX_books_status     ON books(status);
CREATE INDEX IX_highlights_user  ON highlights(user_id);
CREATE INDEX IX_highlights_book  ON highlights(book_id);
CREATE INDEX IX_loans_user       ON loans(user_id);
GO
