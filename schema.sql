-- ============================================================
-- MakanApa — Full Database Schema
-- Compatible with: MySQL 5.7+, MariaDB 10.4+, InfinityFree
-- Run this ONCE in phpMyAdmin after creating your database.
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

-- ── 1. USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `phone`      VARCHAR(20)  NOT NULL UNIQUE,
  `name`       VARCHAR(100) DEFAULT NULL,
  `balance`    INT(11)      NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 2. REQUESTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `requests` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)      DEFAULT NULL,
  `buyer_name`  VARCHAR(100) DEFAULT NULL,
  `description` TEXT         DEFAULT NULL,
  `quantity`    INT(11)      NOT NULL DEFAULT 1,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_requests_user_id` (`user_id`),
  KEY `idx_requests_created_at` (`created_at`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 3. OFFERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `offers` (
  `id`            INT(11)      NOT NULL AUTO_INCREMENT,
  `request_id`    INT(11)      NOT NULL,
  `seller_name`   VARCHAR(100) DEFAULT NULL,
  `food_name`     VARCHAR(100) DEFAULT NULL,
  `price`         INT(11)      DEFAULT NULL,
  `contact`       VARCHAR(50)  DEFAULT NULL,
  `stock`         INT(11)      NOT NULL DEFAULT 1,
  `media_url`     TEXT         DEFAULT NULL,
  `weight_volume` INT(11)      DEFAULT NULL,
  `unit`          VARCHAR(20)  DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offers_request_id` (`request_id`),
  CONSTRAINT `fk_offers_request`
    FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 4. ORDERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`              INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`         INT(11)      DEFAULT NULL,
  `request_id`      INT(11)      DEFAULT NULL,
  `buyer_name`      VARCHAR(100) DEFAULT NULL,
  `buyer_phone`     VARCHAR(20)  DEFAULT NULL,
  `buyer_address`   TEXT         DEFAULT NULL,
  `seller_name`     VARCHAR(100) DEFAULT NULL,
  `seller_phone`    VARCHAR(20)  DEFAULT NULL,
  `food_name`       VARCHAR(100) DEFAULT NULL,
  `price`           INT(11)      DEFAULT NULL,
  `quantity`        INT(11)      DEFAULT NULL,
  `total`           INT(11)      DEFAULT NULL,
  `contact`         VARCHAR(50)  DEFAULT NULL,
  `status`          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `notes`           TEXT         DEFAULT NULL,
  `location_coords` VARCHAR(100) DEFAULT NULL,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id`    (`user_id`),
  KEY `idx_orders_buyer_name` (`buyer_name`),
  KEY `idx_orders_seller_name`(`seller_name`),
  KEY `idx_orders_status`     (`status`),
  KEY `idx_orders_created_at` (`created_at`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 5. USER_HABITS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_habits` (
  `id`             INT(11)      NOT NULL,   -- Same as users.id (1:1 relationship)
  `user_id`        INT(11)      DEFAULT NULL,
  `avg_price`      INT(11)      DEFAULT NULL,
  `last_food`      VARCHAR(255) DEFAULT NULL,
  `total_orders`   INT(11)      NOT NULL DEFAULT 0,
  `cheapest_count` INT(11)      NOT NULL DEFAULT 0,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_habits_user_id` (`user_id`),
  CONSTRAINT `fk_habits_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 6. BALANCE_HISTORY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `balance_history` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)      DEFAULT NULL,
  `type`         VARCHAR(20)  DEFAULT NULL,  -- 'topup', 'order', 'refund'
  `amount`       INT(11)      DEFAULT NULL,
  `reference_id` INT(11)      DEFAULT NULL,  -- order id or null
  `description`  TEXT         DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bhistory_user_id` (`user_id`),
  CONSTRAINT `fk_bhistory_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
