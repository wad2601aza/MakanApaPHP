-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Host: sql102.infinityfree.com
-- Generation Time: May 09, 2026 at 01:30 PM
-- Server version: 11.4.10-MariaDB
-- PHP Version: 7.2.22

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `if0_41704967_makanapa`
--

-- --------------------------------------------------------

--
-- Table structure for table `balance_history`
--

CREATE TABLE `balance_history` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `type` varchar(20) DEFAULT NULL,
  `amount` int(11) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `balance_history`
--

INSERT INTO `balance_history` (`id`, `user_id`, `type`, `amount`, `reference_id`, `description`, `created_at`) VALUES
(1, 1, 'topup', 100000, NULL, 'Top-up via app', '2026-05-09 16:18:36'),
(2, 1, 'order', -25000, 1, 'Order #1: Jus Alpukat ×1', '2026-05-09 16:18:44'),
(3, 1, 'order', -25000, 2, 'Order #2: Jus Alpukat ×1', '2026-05-09 16:19:40'),
(4, 1, 'order', -10000, 3, 'Order #3: Mie Rebus x1', '2026-05-09 17:05:25');

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `seller_name` varchar(100) DEFAULT NULL,
  `food_name` varchar(100) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 1,
  `media_url` text DEFAULT NULL,
  `weight_volume` int(11) DEFAULT NULL,
  `unit` varchar(20) DEFAULT NULL,
  `distance_km` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offers`
--

INSERT INTO `offers` (`id`, `request_id`, `seller_id`, `seller_name`, `food_name`, `price`, `contact`, `stock`, `media_url`, `weight_volume`, `unit`, `distance_km`, `created_at`) VALUES
(1, 1, 2, 'Budi 1107', 'Jus Alpukat', 25000, '081299291107', 1, NULL, NULL, NULL, NULL, '2026-05-09 16:17:36'),
(2, 2, 2, 'Budi 1107', 'Mie Rebus', 10000, '081299291107', 0, NULL, NULL, NULL, NULL, '2026-05-09 17:05:10'),
(3, 4, 3, 'lindi 2810', 'Jus Alpukat', 15000, '0831982810', 1, NULL, NULL, NULL, '0.00', '2026-05-09 17:14:51'),
(4, 5, 3, 'lindi 2810', 'Ayam Geprek', 14000, '0831982810', 1, NULL, NULL, NULL, NULL, '2026-05-09 17:16:45'),
(5, 6, 3, 'lindi 2810', 'Jus Alpukat', 15000, '0831982810', 1, 'https://makanapa.is-great.net/uploads/1778347661_010ccb562c99.png', NULL, NULL, '0.00', '2026-05-09 17:27:41');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL,
  `buyer_name` varchar(100) DEFAULT NULL,
  `buyer_phone` varchar(20) DEFAULT NULL,
  `buyer_address` text DEFAULT NULL,
  `seller_name` varchar(100) DEFAULT NULL,
  `seller_phone` varchar(20) DEFAULT NULL,
  `food_name` varchar(100) DEFAULT NULL,
  `price` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `total` int(11) DEFAULT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `location_coords` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `offer_id` int(11) DEFAULT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `is_rated` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `request_id`, `buyer_name`, `buyer_phone`, `buyer_address`, `seller_name`, `seller_phone`, `food_name`, `price`, `quantity`, `total`, `contact`, `status`, `notes`, `location_coords`, `created_at`, `offer_id`, `seller_id`, `is_rated`) VALUES
(1, 1, 1, 'auxil 9124', '089529129124', 'Jalan Kampus Hijau, President University Student Housing, Kota Jababeka, Simpangan, Kab Bekasi, Jawa Barat, Jawa, 17533, Indonesia', 'Budi 1107', NULL, 'Jus Alpukat', 25000, 1, 25000, '6281299291107', 'delivered', 'No onions ya', '-6.2088,106.8456', '2026-05-09 16:18:44', NULL, NULL, 0),
(2, 1, 1, 'auxil 9124', '089529129124', 'Jalan Kampus Hijau, President University Student Housing, Kota Jababeka, Simpangan, Kab Bekasi, Jawa Barat, Jawa, 17533, Indonesia', 'Budi 1107', NULL, 'Jus Alpukat', 25000, 1, 25000, '6281299291107', 'delivered', 'No onions ya', '-6.2088,106.8456', '2026-05-09 16:19:40', NULL, NULL, 0),
(3, 1, 2, 'auxil 9124', '089529129124', 'Jalan Kampus Hijau, President University Student Housing, Kota Jababeka, Simpangan, Kab Bekasi, Jawa Barat, Jawa, 17533, Indonesia', 'Budi 1107', '6281299291107', 'Mie Rebus', 10000, 1, 10000, '6281299291107', 'completed', 'no onions', '-6.2088,106.8456', '2026-05-09 17:05:25', 2, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `ratings`
--

CREATE TABLE `ratings` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `seller_id` int(11) DEFAULT NULL,
  `buyer_id` int(11) DEFAULT NULL,
  `stars` tinyint(1) NOT NULL DEFAULT 5,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ratings`
--

INSERT INTO `ratings` (`id`, `order_id`, `seller_id`, `buyer_id`, `stars`, `comment`, `created_at`) VALUES
(9, 3, 2, 1, 5, NULL, '2026-05-09 17:11:47');

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `buyer_name` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `buyer_lat` decimal(10,7) DEFAULT NULL,
  `buyer_lng` decimal(10,7) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `user_id`, `buyer_name`, `description`, `quantity`, `notes`, `buyer_lat`, `buyer_lng`, `created_at`) VALUES
(1, 1, 'auxil 9124 9124', 'spicy foods', 1, NULL, NULL, NULL, '2026-05-09 16:15:45'),
(2, 1, 'auxil 9124 9124', 'yummy foods', 1, NULL, NULL, NULL, '2026-05-09 17:01:45'),
(3, 1, 'auxil 9124 9124', 'nyam', 1, NULL, '-6.2829724', '107.1704477', '2026-05-09 17:14:10'),
(4, 1, 'auxil 9124 9124', 'nyam', 1, NULL, '-6.2829724', '107.1704477', '2026-05-09 17:14:20'),
(5, 1, 'auxil 9124 9124', 'spicy', 1, NULL, NULL, NULL, '2026-05-09 17:16:22'),
(6, 1, 'auxil 9124 9124', 'sweet', 1, NULL, '-6.2829498', '107.1704583', '2026-05-09 17:27:21');

-- --------------------------------------------------------

--
-- Table structure for table `seller_menus`
--

CREATE TABLE `seller_menus` (
  `id` int(11) NOT NULL,
  `seller_phone` varchar(50) NOT NULL,
  `food_name` varchar(255) NOT NULL,
  `price` int(11) NOT NULL,
  `media_url` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `seller_menus`
--

INSERT INTO `seller_menus` (`id`, `seller_phone`, `food_name`, `price`, `media_url`, `created_at`) VALUES
(1, '081299291107', 'K Kentang Goreng', 15000, '', '2026-05-09 16:17:00'),
(2, '081299291107', 'Nasi Goreng Spesial', 20000, '', '2026-05-09 16:17:00'),
(3, '081299291107', 'Roti Bakar', 20000, '', '2026-05-09 16:17:01'),
(4, '081299291107', 'Nasi Goreng Fauget', 25000, '', '2026-05-09 16:17:01'),
(5, '081299291107', 'Martabak Kecil', 25000, '', '2026-05-09 16:17:01'),
(6, '081299291107', 'Mie Aneka Minuman  Mie goreng biasa', 10000, '', '2026-05-09 16:17:01'),
(7, '081299291107', 'Hitam', 10000, '', '2026-05-09 16:17:02'),
(8, '081299291107', 'Z  Mie Goreng Spesial', 15000, '', '2026-05-09 16:17:02'),
(9, '081299291107', 'Sanger Hangat', 20000, '', '2026-05-09 16:17:02'),
(10, '081299291107', 'K', 7000, '', '2026-05-09 16:17:03'),
(11, '081299291107', 'Mie Goreng Fauget', 20000, '', '2026-05-09 16:17:03'),
(12, '081299291107', 'Teh Manis', 25000, '', '2026-05-09 16:17:03'),
(14, '081299291107', 'Mie Tek-Tek', 15000, '', '2026-05-09 16:17:04'),
(15, '081299291107', 'Kopi Susu', 25000, '', '2026-05-09 16:17:04'),
(16, '081299291107', 'K', 7000, '', '2026-05-09 16:17:04'),
(17, '081299291107', 'Mie Rebus', 10000, '', '2026-05-09 16:17:05'),
(18, '081299291107', 'Teh Manis', 25000, '', '2026-05-09 16:17:05'),
(19, '081299291107', 'Seblak', 15000, '', '2026-05-09 16:17:05'),
(20, '081299291107', 'Jus Alpukat', 25000, '', '2026-05-09 16:17:05'),
(21, '081299291107', 'GTN', 27000, '', '2026-05-09 17:04:43'),
(22, '081299291107', 'ie Hot', 15000, '', '2026-05-09 17:04:43'),
(23, '081299291107', 'Mie Ramen', 17000, '', '2026-05-09 17:04:43'),
(24, '081299291107', 'Mie Seafood', 16000, '', '2026-05-09 17:04:44'),
(25, '081299291107', 'Mie Kari', 16000, '', '2026-05-09 17:04:44'),
(26, '081299291107', 'RE  Nasi Goreng', 17000, '', '2026-05-09 17:04:44'),
(27, '081299291107', 'Nasi Bakar', 15000, '', '2026-05-09 17:04:44'),
(28, '081299291107', 'Ayam Pop', 16000, '', '2026-05-09 17:04:45'),
(29, '081299291107', 'Ayam Geprek', 14000, '', '2026-05-09 17:04:45'),
(30, '081299291107', 'Es Jeruk', 15000, '', '2026-05-09 17:04:45'),
(31, '081299291107', 'Siomay', 15000, '', '2026-05-09 17:04:46'),
(32, '081299291107', 'Es Buah', 17000, '', '2026-05-09 17:04:46'),
(33, '081299291107', 'Udang Keju', 17000, '', '2026-05-09 17:04:46'),
(34, '081299291107', 'Es Serut', 16000, '', '2026-05-09 17:04:46'),
(35, '081299291107', 'Udang Rambutan', 16000, '', '2026-05-09 17:04:47'),
(36, '081299291107', 'Jus Mangga', 16000, '', '2026-05-09 17:04:47'),
(37, '081299291107', 'Pisang Coklat', 16000, '', '2026-05-09 17:04:47'),
(38, '081299291107', 'Jus Nanas', 17000, '', '2026-05-09 17:04:48'),
(39, '081299291107', 'Roti Bakar', 17000, '', '2026-05-09 17:04:48'),
(40, '081299291107', 'Jus Alpukat', 15000, '', '2026-05-09 17:04:48'),
(41, '081299291107', 'Roti Maryam', 15000, '', '2026-05-09 17:04:49'),
(42, '081299291107', 'K  Capucino', 14000, '', '2026-05-09 17:04:49'),
(46, '0831982810', 'Mie Ramen', 17000, '', '2026-05-09 17:13:39'),
(47, '0831982810', 'Mie Seafood', 16000, '', '2026-05-09 17:13:39'),
(48, '0831982810', 'Mie Kari', 16000, '', '2026-05-09 17:13:40'),
(49, '0831982810', 'RE  Nasi Goreng', 17000, '', '2026-05-09 17:13:40'),
(50, '0831982810', 'Nasi Bakar', 15000, '', '2026-05-09 17:13:40'),
(51, '0831982810', 'Ayam Pop', 16000, '', '2026-05-09 17:13:40'),
(52, '0831982810', 'Ayam Geprek', 14000, '', '2026-05-09 17:13:41'),
(53, '0831982810', 'Es Jeruk', 15000, '', '2026-05-09 17:13:41'),
(54, '0831982810', 'Siomay', 15000, '', '2026-05-09 17:13:41'),
(55, '0831982810', 'Es Buah', 17000, '', '2026-05-09 17:13:41'),
(56, '0831982810', 'Udang Keju', 17000, '', '2026-05-09 17:13:42'),
(57, '0831982810', 'Es Serut', 16000, '', '2026-05-09 17:13:42'),
(58, '0831982810', 'Udang Rambutan', 16000, '', '2026-05-09 17:13:43'),
(59, '0831982810', 'Jus Mangga', 16000, '', '2026-05-09 17:13:43'),
(60, '0831982810', 'Pisang Coklat', 16000, '', '2026-05-09 17:13:43'),
(61, '0831982810', 'Jus Nanas', 17000, '', '2026-05-09 17:13:43'),
(62, '0831982810', 'Roti Bakar', 17000, '', '2026-05-09 17:13:44'),
(63, '0831982810', 'Jus Alpukat', 15000, '', '2026-05-09 17:13:44'),
(67, '0831982810', 'GTN', 27000, '', '2026-05-09 17:26:23'),
(68, '0831982810', 'ie Hot', 15000, '', '2026-05-09 17:26:23'),
(69, '0831982810', 'Mie Ramen', 17000, '', '2026-05-09 17:26:23'),
(70, '0831982810', 'Mie Seafood', 16000, '', '2026-05-09 17:26:23'),
(71, '0831982810', 'Mie Kari', 16000, '', '2026-05-09 17:26:24'),
(72, '0831982810', 'RE  Nasi Goreng', 17000, '', '2026-05-09 17:26:24'),
(73, '0831982810', 'Nasi Bakar', 15000, '', '2026-05-09 17:26:24'),
(74, '0831982810', 'Ayam Pop', 16000, '', '2026-05-09 17:26:25'),
(75, '0831982810', 'Ayam Geprek', 14000, '', '2026-05-09 17:26:25'),
(76, '0831982810', 'Es Jeruk', 15000, '', '2026-05-09 17:26:25'),
(77, '0831982810', 'Siomay', 15000, '', '2026-05-09 17:26:25'),
(78, '0831982810', 'Es Buah', 17000, '', '2026-05-09 17:26:25'),
(79, '0831982810', 'Udang Keju', 17000, '', '2026-05-09 17:26:26'),
(80, '0831982810', 'Es Serut', 16000, '', '2026-05-09 17:26:26'),
(81, '0831982810', 'Udang Rambutan', 16000, '', '2026-05-09 17:26:26'),
(82, '0831982810', 'Jus Mangga', 16000, '', '2026-05-09 17:26:26'),
(83, '0831982810', 'Pisang Coklat', 16000, '', '2026-05-09 17:26:27'),
(84, '0831982810', 'Jus Nanas', 17000, '', '2026-05-09 17:26:27'),
(85, '0831982810', 'Roti Bakar', 17000, '', '2026-05-09 17:26:27'),
(86, '0831982810', 'Jus Alpukat', 15000, '', '2026-05-09 17:26:27'),
(87, '0831982810', 'Roti Maryam', 15000, '', '2026-05-09 17:26:28'),
(88, '0831982810', 'K  Capucino', 14000, '', '2026-05-09 17:26:28'),
(89, '0831982810', 'Na', 4000, '', '2026-05-09 17:26:28');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `balance` int(11) NOT NULL DEFAULT 0,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `address_name` varchar(255) DEFAULT NULL,
  `average_rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `total_reviews` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `phone`, `name`, `balance`, `latitude`, `longitude`, `address_name`, `average_rating`, `created_at`, `total_reviews`) VALUES
(1, '089529129124', 'auxil 9124', 40000, '-6.2829724', '107.1704477', NULL, '0.00', '2026-05-09 16:15:32', 0),
(2, '081299291107', 'Budi 1107', 0, '-6.2829598', '107.1704452', NULL, '5.00', '2026-05-09 16:16:07', 1),
(3, '0831982810', 'lindi 2810', 0, '-6.2829498', '107.1704583', NULL, '0.00', '2026-05-09 17:12:48', 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `balance_history`
--
ALTER TABLE `balance_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bhistory_user_id` (`user_id`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_offers_request_id` (`request_id`),
  ADD KEY `idx_offers_seller_id` (`seller_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user_id` (`user_id`),
  ADD KEY `idx_orders_buyer_name` (`buyer_name`),
  ADD KEY `idx_orders_seller_name` (`seller_name`),
  ADD KEY `idx_orders_status` (`status`),
  ADD KEY `idx_orders_created_at` (`created_at`);

--
-- Indexes for table `ratings`
--
ALTER TABLE `ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rating_order` (`order_id`),
  ADD KEY `idx_ratings_seller_id` (`seller_id`),
  ADD KEY `idx_ratings_buyer_id` (`buyer_id`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_requests_user_id` (`user_id`),
  ADD KEY `idx_requests_created_at` (`created_at`);

--
-- Indexes for table `seller_menus`
--
ALTER TABLE `seller_menus`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_seller_menus_phone` (`seller_phone`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_phone` (`phone`),
  ADD KEY `idx_users_phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `balance_history`
--
ALTER TABLE `balance_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ratings`
--
ALTER TABLE `ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `requests`
--
ALTER TABLE `requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `seller_menus`
--
ALTER TABLE `seller_menus`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `balance_history`
--
ALTER TABLE `balance_history`
  ADD CONSTRAINT `fk_bhistory_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `offers`
--
ALTER TABLE `offers`
  ADD CONSTRAINT `fk_offers_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_offers_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `ratings`
--
ALTER TABLE `ratings`
  ADD CONSTRAINT `fk_ratings_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ratings_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ratings_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `requests`
--
ALTER TABLE `requests`
  ADD CONSTRAINT `fk_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
