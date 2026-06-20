# WealthWave Backend API

A high-performance, robust Node.js and Express backend API designed to power the **WealthWave** personal finance tracker. This project serves as a modern replacement for the legacy Java Spring Boot API, offering optimized database operations, advanced financial tracking logic, and automated reporting.

## 🚀 Key Features
- **Secure Authentication**: JWT-based security middleware with password encryption.
- **Transaction Management**: Comprehensive CRUD endpoints for tracking income and expenses.
- **Budget Control**: Monthly budget threshold alerts (warns users via email at 80%, 90%, and 100% capacity).
- **Advanced Analytics**:
  - Financial Health Score calculator (0-850 rating).
  - Spend forecasting & next-month prediction logic.
  - Daily spending aggregates for calendar heatmaps.
  - Suspicious transaction auto-detection (emails alerts for transaction spikes >3x user average).
- **AI Category Predictor**: Local rule-based machine learning that automatically matches merchant names/keywords to standard expense tags.
- **Automated Schedulers (Cron Jobs)**:
  - **Daily reminders** sent to active users.
  - **Monthly PDF/Excel financial reports** generated automatically on the 1st of the month.
- **Storage & Services Integration**: Cloudinary for profile photo uploads, Nodemailer for transactional/report emails, and SheetJS (`xlsx`) for binary Excel reports generation.

## 🛠️ Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js (ES Modules)
- **Database**: MySQL (using `mysql2/promise` connection pool)
- **Dependencies**: `node-cron`, `nodemailer`, `xlsx`, `cloudinary`, `jsonwebtoken`, `bcryptjs`
