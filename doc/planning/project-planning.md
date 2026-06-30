# Mini ERP Invoicing System

## Development Planning

---

# Overview

This document describes the development plan for the **Mini ERP Invoicing System** technical assessment.

The main objective is not only to complete the requested features, but also to demonstrate clean architecture, scalable design, maintainable code, and production-oriented development practices.

---

# Technology Stack

## Backend

* NestJS
* Prisma ORM
* PostgreSQL
* JWT Authentication
* Swagger API Documentation
* Docker

## Frontend

* Next.js App Router
* React
* TailwindCSS
* TypeScript

---

# Project Goals

* Clean and scalable architecture
* Modular backend design
* Reusable frontend components
* RESTful API
* Responsive UI
* Ready for future Microservice architecture
* Ready for future Micro Frontend architecture

---

# Development Principles

* SOLID Principle
* Separation of Concerns
* Clean Code
* Reusable Components
* Validation First
* Error Handling
* Consistent API Response
* Maintainability over Complexity

---

# Backend Modules

## Authentication

Responsibilities

* Login
* JWT Generation
* JWT Validation
* Authorization Guard

Endpoints

POST /auth/login

Auth Response

All parameter fields in every request and response use camelCase convention.

Login Success

{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "ADMIN",
      "createdAt": "2026-06-29T00:00:00.000Z",
      "updatedAt": "2026-06-29T00:00:00.000Z"
    }
  }
}

Login Error

{
  "success": false,
  "message": "Invalid email or password"
}

Request Body (Login)

{
  "email": "admin@example.com",
  "password": "secret123"
}

camelCase applies to all field names across all modules (requests and responses):
createdAt, updatedAt, accessToken, userId, customerId, invoiceId, invoiceItems,
startDate, endDate, etc.

---

## Customer Module

Responsibilities

* Create Customer
* Update Customer
* Delete Customer
* Customer List
* Customer Detail

Endpoints

GET /customers

GET /customers/:id

POST /customers

PATCH /customers/:id

DELETE /customers/:id

---

## Invoice Module

Responsibilities

* Create Invoice
* Update Invoice
* Invoice Detail
* Invoice List
* Update Invoice Status

Endpoints

GET /invoices

GET /invoices/:id

POST /invoices

PATCH /invoices/:id

PATCH /invoices/:id/status

DELETE /invoices/:id

---

## Invoice Item Module

Responsibilities

* Add Item
* Update Item
* Remove Item

---

## Dashboard Module

Responsibilities

Dashboard Summary

* Total Customers
* Total Invoices
* Paid Invoice
* Pending Invoice
* Revenue Summary

Endpoint

GET /dashboard

---

# Frontend Pages

Authentication

* Login

Dashboard

* Dashboard Overview

Customer

* Customer List
* Customer Form
* Customer Detail

Invoice

* Invoice List
* Invoice Detail
* Create Invoice
* Edit Invoice

History

* Invoice History

---

# Database Design

Tables

* users
* customers
* invoices
* invoice_items

Relationships

User

↓

Invoice

↓

Invoice Item

Invoice

↓

Customer

---

# Folder Structure

Backend

src/

```
auth/
customers/
dashboard/
invoice-items/
invoices/

common/
config/
database/
prisma/
```

Frontend

app/

```
dashboard/
customers/
invoices/
login/

components/
hooks/
services/
types/
lib/
utils/
```

---

# Authentication Flow

User Login

↓

JWT Token

↓

Protected API

↓

Authorization Guard

---

# API Response Standard

Success

{
"success": true,
"message": "Success",
"data": {}
}

Error

{
"success": false,
"message": "Validation Error"
}

---

# Validation

Backend Validation

* class-validator
* DTO Validation
* Global Validation Pipe

---

# Error Handling

Global Exception Filter

HTTP Status

Standard Error Response

---

# API Documentation

Swagger

Available at

/api/docs

---

# Development Checklist

## Backend

* Authentication
* JWT
* Customer CRUD
* Invoice CRUD
* Invoice Item CRUD
* Dashboard Summary
* Validation
* Error Handling
* Swagger
* Seed Data

---

## Frontend

* Authentication
* Dashboard
* Customer Module
* Invoice Module
* Responsive Layout
* API Integration

---

## Database

* Prisma Schema
* Migration
* Seed

---

## Documentation

* README
* ERD
* API Documentation
* Environment Example

---

# Nice to Have

* Docker Compose
* Pagination
* Search
* Sorting
* Soft Delete
* Loading State
* Empty State
* Confirmation Dialog
* Toast Notification

---

# Development Timeline

## Day 1

* Project Setup
* Prisma
* Authentication
* Database Design

---

## Day 2

* Customer Module
* CRUD API
* Swagger

---

## Day 3

* Invoice Module
* Invoice Items
* Validation

---

## Day 4

* Dashboard API
* Seed Data
* Testing

---

## Day 5

* Next.js Setup
* Login
* Customer Pages

---

## Day 6

* Invoice Pages
* Dashboard
* Responsive UI

---

## Day 7

* Documentation
* Docker
* README
* ERD
* Final Testing
* GitHub Cleanup

---

# Final Deliverables

* Backend Source Code
* Frontend Source Code
* Database Schema (ERD)
* Swagger Documentation
* README.md
* .env.example
* Docker Compose
* Seed Data
* GitHub Repository

---

# Future Improvements

The project architecture is intentionally designed to allow future migration into:

* Microservices
* Micro Frontend
* Message Broker Integration
* Background Jobs
* File Storage
* Role-Based Access Control (RBAC)
* Unit Testing
* CI/CD Pipeline
* Deployment Automation

