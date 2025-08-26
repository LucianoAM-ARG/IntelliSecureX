# Overview

This is a professional OSINT (Open Source Intelligence) platform called "Intelligence Security X" that provides advanced threat intelligence capabilities. The application enables users to search various data types including domains, IP addresses, emails, and hashes through intelligence databases. It features a freemium subscription model with Stripe integration, daily usage limits for free users, and premium subscription options for unlimited access.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with a dark theme design system and custom CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit's OIDC authentication system with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL using connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and request logging middleware

## Database Schema
- **Users Table**: Stores user profiles, subscription status, daily query limits, and Stripe customer information
- **Search Queries Table**: Tracks all user searches with query types, terms, results, and metadata
- **Sessions Table**: Manages user authentication sessions

## Authentication & Authorization
- **OIDC Integration**: Uses Replit's OpenID Connect for secure authentication
- **Session Security**: HTTP-only cookies with secure flags and configurable TTL
- **Route Protection**: Middleware-based authentication checks for protected endpoints
- **User Management**: Automatic user creation/updates on login with subscription tracking

## Payment Processing
- **Dual Crypto Payment System**: Integrated CoinPayments.net for production-ready crypto payments with fallback system
- **CoinPayments Integration**: Real crypto payment processing with unique addresses, QR codes, and automatic blockchain verification
- **Supported Cryptocurrencies**: Bitcoin, Ethereum, Litecoin, Bitcoin Cash, Dogecoin, Monero, and more
- **Pricing Model**: Freemium with daily limits (3 searches) for free users, unlimited for premium ($29 USD/month)
- **Automatic Verification**: Webhook-based payment confirmation with real-time status updates
- **Privacy-First**: No credit card data storage, enhanced privacy through cryptocurrency transactions

## External Intelligence Service
- **Intel X Integration**: Professional OSINT data provider for comprehensive intelligence searches
- **Search Types**: Supports domain, IP, email, and hash-based investigations
- **Rate Limiting**: Built-in usage tracking and quota management per user tier

## Development & Deployment
- **Build System**: Vite for frontend bundling with hot module replacement
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Environment Configuration**: Separate development and production configurations

# External Dependencies

## Core Services
- **Neon Database**: PostgreSQL hosting with connection pooling via @neondatabase/serverless
- **Replit Authentication**: OIDC provider for secure user authentication
- **Intel X**: Professional OSINT intelligence data provider with API key: b725faf7-b146-474e-8bee-5164e3ab7c61
- **Cryptocurrency Payments**: Bitcoin-based payment system for enhanced privacy

## Frontend Dependencies
- **Radix UI**: Comprehensive set of unstyled, accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **TanStack Query**: Powerful data synchronization for React applications
- **React Hook Form**: Performant forms with easy validation

## Backend Dependencies
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **Passport.js**: Authentication middleware with OIDC strategy
- **Express Session**: Robust session middleware with PostgreSQL storage
- **Stripe SDK**: Official Stripe library for payment processing

## Development Tools
- **TypeScript**: Static type checking across the entire application
- **Vite**: Fast build tool with hot module replacement and optimized bundling
- **ESBuild**: Fast JavaScript bundler for production builds
- **Zod**: TypeScript-first schema validation library