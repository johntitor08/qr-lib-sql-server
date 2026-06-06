-- db/schema.sql — Bibliotheca SQL Server schema
-- Run this against your target database (the one named in DB_DATABASE) to
-- create the tables the API expects. Safe to re-run: every object is guarded
-- with an existence check.

------------------------------------------------------------------------------
-- users
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id            NVARCHAR(450)  NOT NULL PRIMARY KEY,   -- uuid
    email         NVARCHAR(256)  NOT NULL,
    password_hash NVARCHAR(255)  NOT NULL,
    approved      BIT            NOT NULL DEFAULT 0,
    created_at    DATETIME2(0)   NOT NULL DEFAULT SYSUTCDATETIME()
  );

  CREATE UNIQUE INDEX UX_users_email ON dbo.users (email);
END
GO

------------------------------------------------------------------------------
-- books
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.books', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.books (
    id           NVARCHAR(450)  NOT NULL PRIMARY KEY,    -- uuid
    user_id      NVARCHAR(450)  NOT NULL,
    title        NVARCHAR(500)  NOT NULL,
    author       NVARCHAR(500)  NOT NULL,
    isbn         NVARCHAR(32)   NULL,
    publisher    NVARCHAR(255)  NULL,
    year         INT            NULL,
    pages        INT            NULL,
    genre        NVARCHAR(128)  NULL,
    location     NVARCHAR(128)  NULL,
    status       NVARCHAR(32)   NOT NULL DEFAULT 'available',
    copies       INT            NOT NULL DEFAULT 1,
    language     NVARCHAR(64)   NOT NULL DEFAULT N'Türkçe',
    rating       TINYINT        NOT NULL DEFAULT 0,
    read_status  NVARCHAR(32)   NOT NULL DEFAULT 'unread',
    current_page INT            NOT NULL DEFAULT 0,
    cover_url    NVARCHAR(MAX)  NULL,                     -- URL or base64 data URI
    buy_url      NVARCHAR(2048) NULL,
    description  NVARCHAR(MAX)  NULL,
    notes        NVARCHAR(MAX)  NULL,
    created_at   DATETIME2(0)   NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at   DATETIME2(0)   NULL,
    CONSTRAINT FK_books_user FOREIGN KEY (user_id)
      REFERENCES dbo.users (id) ON DELETE CASCADE
  );

  CREATE INDEX IX_books_user_created ON dbo.books (user_id, created_at DESC);
END
GO

------------------------------------------------------------------------------
-- highlights
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.highlights', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.highlights (
    id         NVARCHAR(450) NOT NULL PRIMARY KEY,        -- uuid
    user_id    NVARCHAR(450) NOT NULL,
    book_id    NVARCHAR(450) NOT NULL,
    text       NVARCHAR(MAX) NOT NULL,
    page       INT           NULL,
    type       NVARCHAR(32)  NOT NULL DEFAULT 'quote',
    created_at DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_highlights_user FOREIGN KEY (user_id)
      REFERENCES dbo.users (id) ON DELETE CASCADE
  );

  CREATE INDEX IX_highlights_user_created ON dbo.highlights (user_id, created_at DESC);
  CREATE INDEX IX_highlights_book ON dbo.highlights (book_id);
END
GO

------------------------------------------------------------------------------
-- loans
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.loans', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.loans (
    id               NVARCHAR(450) NOT NULL PRIMARY KEY,  -- uuid
    user_id          NVARCHAR(450) NOT NULL,
    book_name        NVARCHAR(500) NULL,
    borrower_name    NVARCHAR(255) NOT NULL,
    borrower_contact NVARCHAR(255) NULL,
    lent_date        DATE          NULL,
    due_date         DATE          NULL,
    returned_date    DATE          NULL,
    notes            NVARCHAR(MAX) NULL,
    created_at       DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_loans_user FOREIGN KEY (user_id)
      REFERENCES dbo.users (id) ON DELETE CASCADE
  );

  CREATE INDEX IX_loans_user_created ON dbo.loans (user_id, created_at DESC);
END
GO

------------------------------------------------------------------------------
-- shelves
------------------------------------------------------------------------------
IF OBJECT_ID('dbo.shelves', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.shelves (
    id         INT           NOT NULL IDENTITY(1,1) PRIMARY KEY,
    user_id    NVARCHAR(450) NOT NULL,
    code       NVARCHAR(64)  NOT NULL,
    name       NVARCHAR(255) NULL,
    created_at DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_shelves_user FOREIGN KEY (user_id)
      REFERENCES dbo.users (id) ON DELETE CASCADE
  );

  -- shelf codes are unique per user (the API maps duplicate-key 2627/2601 to HTTP 409)
  CREATE UNIQUE INDEX UX_shelves_user_code ON dbo.shelves (user_id, code);
END
GO
