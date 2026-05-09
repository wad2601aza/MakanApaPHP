-- ============================================================
-- MakanApa — COMPLETE DATABASE SCHEMA
-- Compatible: MySQL 5.7+ / MariaDB 10.4+ / InfinityFree
--
-- HOW TO USE (InfinityFree):
--   1. Control Panel → phpMyAdmin
--   2. Click your database on the left sidebar
--   3. SQL tab → paste everything below → Go
--
-- HOW TO USE (local XAMPP port 3307):
--   Same steps in your local phpMyAdmin.
--
-- WARNING: Drops and recreates all tables. Existing data is lost.
-- If you have live data to keep, use the ALTER block at the bottom.
-- ============================================================

SET SQL_MODE   = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone  = "+00:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `ratings`;
DROP TABLE IF EXISTS `balance_history`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `offers`;
DROP TABLE IF EXISTS `requests`;
DROP TABLE IF EXISTS `user_habits`;
DROP TABLE IF EXISTS `seller_menus`;
DROP TABLE IF EXISTS `users`;

-- ── 1. USERS ─────────────────────────────────────────────────
CREATE TABLE `users` (
  `id`             INT(11)       NOT NULL AUTO_INCREMENT,
  `phone`          VARCHAR(20)   NOT NULL,
  `name`           VARCHAR(100)  DEFAULT NULL,
  `balance`        INT(11)       NOT NULL DEFAULT 0,
  `latitude`       DECIMAL(10,7) DEFAULT NULL,
  `longitude`      DECIMAL(10,7) DEFAULT NULL,
  `address_name`   VARCHAR(255)  DEFAULT NULL,
  `average_rating` DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  `total_reviews`  INT(11)       NOT NULL DEFAULT 0,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_phone` (`phone`),
  KEY `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 2. REQUESTS ──────────────────────────────────────────────
CREATE TABLE `requests` (
  `id`          INT(11)       NOT NULL AUTO_INCREMENT,
  `user_id`     INT(11)       DEFAULT NULL,
  `buyer_name`  VARCHAR(100)  DEFAULT NULL,
  `description` TEXT          DEFAULT NULL,
  `quantity`    INT(11)       NOT NULL DEFAULT 1,
  `notes`       TEXT          DEFAULT NULL,
  `buyer_lat`   DECIMAL(10,7) DEFAULT NULL,
  `buyer_lng`   DECIMAL(10,7) DEFAULT NULL,
  `created_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_requests_user_id`    (`user_id`),
  KEY `idx_requests_created_at` (`created_at`),
  CONSTRAINT `fk_requests_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 3. OFFERS ────────────────────────────────────────────────
CREATE TABLE `offers` (
  `id`            INT(11)      NOT NULL AUTO_INCREMENT,
  `request_id`    INT(11)      NOT NULL,
  `seller_id`     INT(11)      DEFAULT NULL,
  `seller_name`   VARCHAR(100) DEFAULT NULL,
  `food_name`     VARCHAR(100) DEFAULT NULL,
  `price`         INT(11)      DEFAULT NULL,
  `contact`       VARCHAR(50)  DEFAULT NULL,
  `stock`         INT(11)      NOT NULL DEFAULT 1,
  `media_url`     TEXT         DEFAULT NULL,
  `weight_volume` INT(11)      DEFAULT NULL,
  `unit`          VARCHAR(20)  DEFAULT NULL,
  `distance_km`   DECIMAL(8,2) DEFAULT NULL,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offers_request_id` (`request_id`),
  KEY `idx_offers_seller_id`  (`seller_id`),
  CONSTRAINT `fk_offers_request`
    FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_offers_seller`
    FOREIGN KEY (`seller_id`)  REFERENCES `users`    (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 4. ORDERS ────────────────────────────────────────────────
-- status: 'pending' | 'on process' | 'completed' | 'cancelled'
-- is_rated: 0 = not yet rated, 1 = buyer submitted a rating
CREATE TABLE `orders` (
  `id`              INT(11)      NOT NULL AUTO_INCREMENT,
  `user_id`         INT(11)      DEFAULT NULL,
  `request_id`      INT(11)      DEFAULT NULL,
  `offer_id`        INT(11)      DEFAULT NULL,
  `seller_id`       INT(11)      DEFAULT NULL,
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
  `is_rated`        TINYINT(1)   NOT NULL DEFAULT 0,
  `notes`           TEXT         DEFAULT NULL,
  `location_coords` VARCHAR(100) DEFAULT NULL,
  `created_at`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_id`     (`user_id`),
  KEY `idx_orders_seller_id`   (`seller_id`),
  KEY `idx_orders_buyer_name`  (`buyer_name`),
  KEY `idx_orders_seller_name` (`seller_name`),
  KEY `idx_orders_status`      (`status`),
  KEY `idx_orders_created_at`  (`created_at`),
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 5. RATINGS ───────────────────────────────────────────────
CREATE TABLE `ratings` (
  `id`         INT(11)    NOT NULL AUTO_INCREMENT,
  `order_id`   INT(11)    NOT NULL,
  `seller_id`  INT(11)    DEFAULT NULL,
  `buyer_id`   INT(11)    DEFAULT NULL,
  `stars`      TINYINT(1) NOT NULL DEFAULT 5,
  `comment`    TEXT       DEFAULT NULL,
  `created_at` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rating_order`  (`order_id`),
  KEY `idx_ratings_seller_id`   (`seller_id`),
  KEY `idx_ratings_buyer_id`    (`buyer_id`),
  CONSTRAINT `fk_ratings_order`
    FOREIGN KEY (`order_id`)  REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_seller`
    FOREIGN KEY (`seller_id`) REFERENCES `users`  (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ratings_buyer`
    FOREIGN KEY (`buyer_id`)  REFERENCES `users`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 6. USER_HABITS ───────────────────────────────────────────
CREATE TABLE `user_habits` (
  `id`             INT(11)      NOT NULL,
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

-- ── 7. BALANCE_HISTORY ───────────────────────────────────────
CREATE TABLE `balance_history` (
  `id`           INT(11)     NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)     DEFAULT NULL,
  `type`         VARCHAR(20) DEFAULT NULL,
  `amount`       INT(11)     DEFAULT NULL,
  `reference_id` INT(11)     DEFAULT NULL,
  `description`  TEXT        DEFAULT NULL,
  `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bhistory_user_id` (`user_id`),
  CONSTRAINT `fk_bhistory_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── 8. SELLER_MENUS ──────────────────────────────────────────
CREATE TABLE `seller_menus` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `seller_phone` VARCHAR(50)  NOT NULL,
  `food_name`    VARCHAR(255) NOT NULL,
  `price`        INT(11)      NOT NULL,
  `media_url`    TEXT         DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_menus_phone` (`seller_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SAFE ALTER — run this block INSTEAD if you have live data
-- Uncomment and run in phpMyAdmin SQL tab.
-- ============================================================
-- SET FOREIGN_KEY_CHECKS = 0;
--
-- ALTER TABLE `users`
--   ADD COLUMN IF NOT EXISTS `latitude`       DECIMAL(10,7) DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `longitude`      DECIMAL(10,7) DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `address_name`   VARCHAR(255)  DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `average_rating` DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
--   ADD COLUMN IF NOT EXISTS `total_reviews`  INT(11)       NOT NULL DEFAULT 0;
--
-- ALTER TABLE `requests`
--   ADD COLUMN IF NOT EXISTS `notes`     TEXT          DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `buyer_lat` DECIMAL(10,7) DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `buyer_lng` DECIMAL(10,7) DEFAULT NULL;
--
-- ALTER TABLE `offers`
--   ADD COLUMN IF NOT EXISTS `seller_id`   INT(11)      DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `distance_km` DECIMAL(8,2) DEFAULT NULL;
--
-- ALTER TABLE `orders`
--   ADD COLUMN IF NOT EXISTS `offer_id`        INT(11)      DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `seller_id`       INT(11)      DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `seller_phone`    VARCHAR(20)  DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `buyer_phone`     VARCHAR(20)  DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `buyer_address`   TEXT         DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `contact`         VARCHAR(50)  DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `status`          VARCHAR(20)  NOT NULL DEFAULT 'pending',
--   ADD COLUMN IF NOT EXISTS `is_rated`        TINYINT(1)   NOT NULL DEFAULT 0,
--   ADD COLUMN IF NOT EXISTS `notes`           TEXT         DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS `location_coords` VARCHAR(100) DEFAULT NULL;
--
-- CREATE TABLE IF NOT EXISTS `ratings` (
--   `id`         INT(11)    NOT NULL AUTO_INCREMENT,
--   `order_id`   INT(11)    NOT NULL,
--   `seller_id`  INT(11)    DEFAULT NULL,
--   `buyer_id`   INT(11)    DEFAULT NULL,
--   `stars`      TINYINT(1) NOT NULL DEFAULT 5,
--   `comment`    TEXT       DEFAULT NULL,
--   `created_at` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `uq_rating_order` (`order_id`),
--   KEY `idx_ratings_seller_id` (`seller_id`),
--   KEY `idx_ratings_buyer_id`  (`buyer_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
--
-- SET FOREIGN_KEY_CHECKS = 1;
