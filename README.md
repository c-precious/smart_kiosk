# Smart Kiosk

### Web-Based Sales, Inventory and Credit Management System for Informal Retail Businesses

Smart Kiosk is a full-stack web application designed to help small and informal retailers manage their daily business operations digitally.

The system provides a centralized platform for managing sales, inventory, customers, credit, repayments, payments, notifications, and business analysis.

## Problem

Many informal businesses rely on manual records to manage sales, stock, and customer credit. This can make it difficult to maintain accurate records, monitor debts, and understand business performance.

Smart Kiosk provides a digital solution for organizing these activities in one system.

## Key Features

* Sales recording and sales history
* Inventory and stock management
* Customer management
* Credit and debt tracking
* Repayment monitoring and notifications
* Business reports and activity monitoring
* Multi-shop management
* AI-based data analysis and prediction

### M-Pesa Integration

Smart Kiosk integrates M-Pesa payment functionality using **Safaricom's Daraja API in the Sandbox environment**.

The integration demonstrates how mobile money payments can be incorporated into a business management application.

## Technologies

| Area               | Technologies                   |
| ------------------ | ------------------------------ |
| Backend            | Python, Flask                  |
| Frontend           | HTML, CSS, JavaScript          |
| Database           | MySQL                          |
| Data Visualization | Chart.js                       |
| Data Analysis      | Python                         |
| Mobile Payments    | Safaricom Daraja API (Sandbox) |
| Development        | Visual Studio Code             |
| Version Control    | Git, GitHub                    |

## Project Structure

```text
smart_kiosk/
├── ai/                  # Data analysis and prediction
├── database/            # Database connection
├── routes/              # Application routes
├── static/              # CSS, JavaScript and images
├── templates/           # HTML templates
├── tests/               # System tests
├── app.py               # Main application
├── config.py            # Application configuration
├── requirements.txt     # Python dependencies
└── .gitignore           # Ignored files
```

## Getting Started

Clone the repository, create a Python virtual environment, install the dependencies, configure the MySQL database and required environment variables, then run the application with:

```bash
python app.py
```

M-Pesa functionality requires valid Safaricom Daraja Sandbox credentials. API credentials and other secrets should be stored in a local `.env` file and must not be committed to the repository.

## Testing

System tests are included in the `tests/` directory.

## Future Improvements

* Cloud deployment
* Improved mobile responsiveness
* Expanded predictive analytics
* Enhanced notification services
* Additional usability testing
* Further development of payment functionality for production environments

## About

Smart Kiosk was developed as a software development/final-year project to address a practical business problem using full-stack web development, database management, mobile payment integration, data analysis, and software testing.
