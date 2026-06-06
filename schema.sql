-- schema.sql — Bibliotheca SQL Server şeması

CREATE DATABASE Bibliotheca;
GO
USE Bibliotheca;
GO

-- ============ users ============
CREATE TABLE users (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    approved BIT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT GETDATE()
);

CREATE TABLE books (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
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
    CONSTRAINT FK_books_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IX_books_user ON books(user_id);

-- ============ highlights ============
CREATE TABLE highlights (
    id NVARCHAR(64)  NOT NULL PRIMARY KEY,
    user_id NVARCHAR(64)  NOT NULL,
    book_id NVARCHAR(64)  NOT NULL,
    text NVARCHAR(MAX) NOT NULL,
    page INT NULL,
    type NVARCHAR(50) NOT NULL DEFAULT 'quote',
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_highlights_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IX_highlights_user ON highlights(user_id);

-- ============ loans ============
CREATE TABLE loans (
    id NVARCHAR(64) NOT NULL PRIMARY KEY,
    user_id NVARCHAR(64) NOT NULL,
    book_name NVARCHAR(500) NULL,
    borrower_name NVARCHAR(255) NOT NULL,
    borrower_contact NVARCHAR(255) NULL,
    lent_date DATE NULL,
    due_date DATE NULL,
    returned_date DATE NULL,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_loans_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IX_loans_user ON loans(user_id);

-- ============ shelves ============
CREATE TABLE shelves (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id NVARCHAR(64) NOT NULL,
    code NVARCHAR(100) NOT NULL,
    name NVARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_shelves_user_code UNIQUE (user_id, code),
    CONSTRAINT FK_shelves_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

GO
