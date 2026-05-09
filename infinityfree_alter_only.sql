-- ============================================================
-- MakanApa — SAFE ALTER SCRIPT for InfinityFree
-- Adds every missing column/table without touching existing data.
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
--
-- HOW TO RUN:
--   phpMyAdmin → select database → SQL tab → paste → Go
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── users ─────────────────────────────────────────────────────
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `latitude`       DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `longitude`      DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `address_name`   VARCHAR(255)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `average_rating` DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `total_reviews`  INT(11)       NOT NULL DEFAULT 0;

-- ── requests ──────────────────────────────────────────────────
ALTER TABLE `requests`
  ADD COLUMN IF NOT EXISTS `notes`     TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `buyer_lat` DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `buyer_lng` DECIMAL(10,7) DEFAULT NULL;

-- ── offers ────────────────────────────────────────────────────
ALTER TABLE `offers`
  ADD COLUMN IF NOT EXISTS `seller_id`   INT(11)      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `distance_km` DECIMAL(8,2) DEFAULT NULL;

-- ── orders ────────────────────────────────────────────────────
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `offer_id`        INT(11)      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seller_id`       INT(11)      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `buyer_phone`     VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `buyer_address`   TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `seller_phone`    VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `contact`         VARCHAR(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status`          VARCHAR(20)  NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS `is_rated`        TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `notes`           TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `location_coords` VARCHAR(100) DEFAULT NULL;

-- ── ratings ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `ratings` (
  `id`         INT(11)    NOT NULL AUTO_INCREMENT,
  `order_id`   INT(11)    NOT NULL,
  `seller_id`  INT(11)    DEFAULT NULL,
  `buyer_id`   INT(11)    DEFAULT NULL,
  `stars`      TINYINT(1) NOT NULL DEFAULT 5,
  `comment`    TEXT       DEFAULT NULL,
  `created_at` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rating_order` (`order_id`),
  KEY `idx_ratings_seller_id`  (`seller_id`),
  KEY `idx_ratings_buyer_id`   (`buyer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── seller_menus ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `seller_menus` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `seller_phone` VARCHAR(50)  NOT NULL,
  `food_name`    VARCHAR(255) NOT NULL,
  `price`        INT(11)      NOT NULL,
  `media_url`    TEXT         DEFAULT NULL,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_menus_phone` (`seller_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── balance_history ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `balance_history` (
  `id`           INT(11)     NOT NULL AUTO_INCREMENT,
  `user_id`      INT(11)     DEFAULT NULL,
  `type`         VARCHAR(20) DEFAULT NULL,
  `amount`       INT(11)     DEFAULT NULL,
  `reference_id` INT(11)     DEFAULT NULL,
  `description`  TEXT        DEFAULT NULL,
  `created_at`   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bhistory_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ── user_habits ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_habits` (
  `id`             INT(11)      NOT NULL,
  `user_id`        INT(11)      DEFAULT NULL,
  `avg_price`      INT(11)      DEFAULT NULL,
  `last_food`      VARCHAR(255) DEFAULT NULL,
  `total_orders`   INT(11)      NOT NULL DEFAULT 0,
  `cheapest_count` INT(11)      NOT NULL DEFAULT 0,
  `updated_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_habits_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
