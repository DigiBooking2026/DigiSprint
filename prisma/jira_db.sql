-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 31, 2026 at 12:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.4.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `jira_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `attachment`
--

CREATE TABLE `attachment` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `url` varchar(191) NOT NULL,
  `size` int(11) NOT NULL,
  `type` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `projectId` varchar(191) DEFAULT NULL,
  `taskId` varchar(191) DEFAULT NULL,
  `commentId` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attachment`
--

INSERT INTO `attachment` (`id`, `name`, `url`, `size`, `type`, `createdAt`, `projectId`, `taskId`, `commentId`) VALUES
('cmpob04pm0001jn3kfew7vhut', 'Capture d’écran 2026-05-12 140553.png', '/uploads/ls6cfkb010jmwkj75szifd1px.png', 53633, 'image/png', '2026-05-27 16:53:58.618', NULL, NULL, 'cmpob07mq0003jn3kay407ezy'),
('cmppalpst0003jndsyexra0vk', 'Capture d’écran 2026-05-12 140553.png', '/uploads/to6r2rhs3yabdvuj44mjkcdsy.png', 53633, 'image/png', '2026-05-28 09:30:32.286', NULL, NULL, 'cmppalrnl0005jndsl59r2f9b'),
('cmppc0r2h000bjnds704dmpbx', 'b583a9b2-1814-43ff-9e07-4c013e77d3c6.png', '/uploads/skybqsdwifla6yktrey0z280n.png', 1775420, 'image/png', '2026-05-28 10:10:13.385', NULL, 'cmpnqut8q0015jn1s4ns18ouu', NULL),
('cmprg7m030001jnt4zawf7isc', 'Capture d’écran 2026-05-12 140553.png', '/uploads/qrkaysamrgjd3hcfy5ok1aryj.png', 53633, 'image/png', '2026-05-29 21:43:04.227', NULL, 'cmprg7nm30003jnt4v9oqfvmq', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `comment`
--

CREATE TABLE `comment` (
  `id` varchar(191) NOT NULL,
  `content` longtext NOT NULL,
  `taskId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `comment`
--

INSERT INTO `comment` (`id`, `content`, `taskId`, `userId`, `createdAt`, `updatedAt`) VALUES
('cmpo9n6sa0001jnrol2l8r8zx', 'google', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 16:15:55.162', '2026-05-27 16:15:55.162'),
('cmpob07mq0003jn3kay407ezy', 'google', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 16:54:02.402', '2026-05-27 16:54:02.402'),
('cmppaln110001jndsrpyjnjnh', 'googlze', 'cmpnqut8q0015jn1s4ns18ouu', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-28 09:30:28.693', '2026-05-28 09:30:28.693'),
('cmppalrnl0005jndsl59r2f9b', 'google', 'cmpnqut8q0015jn1s4ns18ouu', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-28 09:30:34.689', '2026-05-28 09:30:34.689');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `message` varchar(191) NOT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  `link` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `project`
--

CREATE TABLE `project` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `prefix` varchar(191) NOT NULL DEFAULT 'DB',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `deletedAt` datetime(3) DEFAULT NULL,
  `deadline` datetime(3) DEFAULT NULL,
  `startDate` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `project`
--

INSERT INTO `project` (`id`, `name`, `description`, `prefix`, `createdAt`, `updatedAt`, `deletedAt`, `deadline`, `startDate`) VALUES
('cmpnqut7t0001jn1sua3ia6g8', 'DigiBooking Mobile App', '<h1>DigiBooking Mobile 2.0</h1><p>The next generation of our mobile booking platform. This version focuses on speed, accessibility, and a brand new UI using the corporate palette.</p>', 'MOB', '2026-05-27 07:29:58.122', '2026-05-28 19:45:15.508', '2026-05-28 19:45:15.507', NULL, NULL),
('cmppw0ntn0004jnwohk75ksl1', 'Demo - In Progress', '<p>Demo project currently in progress, with active work and review tasks.</p>', 'DEMO-WEB', '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', NULL, '2026-06-15 08:00:00.000', '2026-05-16 08:00:00.000'),
('cmppw0nua000ujnwoff0sv3b5', 'Demo - Past Deadline', '<p>Demo project past its deadline with overdue backend and testing tasks.</p>', 'DEMO-API', '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', NULL, '2026-05-26 08:00:00.000', '2026-05-03 08:00:00.000'),
('cmppw0nut001kjnwo6zfocl8d', 'Demo - Not Started', '<p>Demo project that has not started yet, with upcoming work in backlog and to do.</p>', 'DEMO-MOB', '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', NULL, '2026-06-25 08:00:00.000', '2026-05-31 08:00:00.000'),
('cmppw0nv60026jnwoxgu4w9dc', 'Demo - Done', '<p>Demo project where all tasks are complete, so the project is done.</p>', 'DEMO-QA', '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', NULL, '2026-05-25 08:00:00.000', '2026-05-08 08:00:00.000'),
('cmppwcatq0008jnyczas71a8l', 'Delete Smoke Test', '<p>Temporary delete smoke test.</p>', 'DEL44498', '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.612', '2026-05-28 19:39:04.611', '2026-06-01 00:00:00.000', '2026-05-28 00:00:00.000');

-- --------------------------------------------------------

--
-- Table structure for table `sprint`
--

CREATE TABLE `sprint` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `goal` longtext DEFAULT NULL,
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'PLANNED',
  `projectId` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sprint`
--

INSERT INTO `sprint` (`id`, `name`, `goal`, `startDate`, `endDate`, `status`, `projectId`, `createdAt`, `updatedAt`) VALUES
('cmps1wqc20001jnhwfpdr9nb6', 'Sprint1', NULL, '2026-05-30 00:00:00.000', '2026-06-08 00:00:00.000', 'PLANNED', 'cmppw0nua000ujnwoff0sv3b5', '2026-05-30 07:50:28.176', '2026-05-30 08:17:05.445');

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

CREATE TABLE `task` (
  `id` varchar(191) NOT NULL,
  `ticketId` varchar(191) NOT NULL,
  `title` varchar(191) NOT NULL,
  `description` longtext DEFAULT NULL,
  `type` varchar(191) NOT NULL DEFAULT 'TASK',
  `category` varchar(191) DEFAULT NULL,
  `storyPoints` double NOT NULL DEFAULT 0,
  `loggedTime` double NOT NULL DEFAULT 0,
  `deadline` datetime(3) DEFAULT NULL,
  `statusId` varchar(191) NOT NULL,
  `projectId` varchar(191) NOT NULL,
  `ownerId` varchar(191) NOT NULL,
  `assigneeId` varchar(191) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `blockedReason` longtext DEFAULT NULL,
  `priority` varchar(191) NOT NULL DEFAULT 'MEDIUM',
  `parentId` varchar(191) DEFAULT NULL,
  `sprintId` varchar(191) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`id`, `ticketId`, `title`, `description`, `type`, `category`, `storyPoints`, `loggedTime`, `deadline`, `statusId`, `projectId`, `ownerId`, `assigneeId`, `createdAt`, `updatedAt`, `blockedReason`, `priority`, `parentId`, `sprintId`) VALUES
('cmpnqut85000jjn1sewnzw4uy', 'MOB-1', 'Design new login screen with Prussian Blue theme', '<p>Apply the <strong>DigiBooking</strong> color palette to the login screen.</p>', 'TASK', 'UI', 5, 0, NULL, 'cmpnqut7z0009jn1swq0jb1ch', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.133', '2026-05-27 07:29:58.133', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut87000ljn1sft98cnkx', 'MOB-2', 'Fix flicker on splash screen', '<p>Splash screen flashes white before showing the Prussian Blue background.</p>', 'BUG', 'UI', 2, 0, NULL, 'cmpnqut7z0009jn1swq0jb1ch', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.136', '2026-05-27 07:29:58.136', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8a000njn1s24lwlnw0', 'MOB-3', 'Implement OAuth2 with Google', '<p>Add Google Sign-In support for all mobile users.</p>', 'TASK', 'Backend', 8, 0, NULL, 'cmpnqut7z000ajn1shu0s1k0f', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.138', '2026-05-27 13:12:16.027', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8b000pjn1svm12pt30', 'MOB-4', 'API endpoint for flight search returning empty results', '<p>Search is failing for multi-city flights. <em>Urgent!</em></p>', 'BUG', 'Backend', 3, 0, NULL, 'cmpnqut7z000bjn1s3d4rgw3g', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.140', '2026-05-27 07:29:58.140', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8d000rjn1scwofer9h', 'MOB-5', 'Setup CI/CD pipeline on GitHub Actions', '<p>Automate build and deployment to TestFlight.</p>', 'TASK', 'DevOps', 5, 0, NULL, 'cmpnqut7z000ajn1shu0s1k0f', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.142', '2026-05-27 07:29:58.142', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8f000tjn1si49lx6bw', 'MOB-6', 'Integrate Stripe Payment Gateway', '<p>Support credit cards and Apple Pay.</p>', 'TASK', 'Backend', 13, 0, NULL, 'cmpnqut7z0005jn1s64dfouhb', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.143', '2026-05-27 07:29:58.143', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8h000vjn1suuefiaqw', 'MOB-7', 'Refactor booking state machine', '<p>Current state management is too complex.</p>', 'TASK', 'Frontend', 8, 0, NULL, 'cmpnqut7z0005jn1s64dfouhb', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-27 07:29:58.146', '2026-05-27 12:33:27.456', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8j000xjn1s9rpk4qcc', 'MOB-8', 'App crashes when selecting seat 12A', '<p>Specific to Boeing 737 configurations.</p>', 'BUG', 'Testing', 5, 0, NULL, 'cmpnqut7z000ejn1s3r5wywti', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.147', '2026-05-27 16:55:59.700', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8l000zjn1sfbqqgpvn', 'MOB-9', 'Update documentation for API V2', '<p>Waiting for the backend team to finalize endpoints.</p>', 'TASK', 'Documentation', 3, 0, NULL, 'cmpnqut80000hjn1ssw6kv28d', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.150', '2026-05-27 15:05:31.793', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8n0011jn1sbg69zcll', 'MOB-10', 'Optimize image loading in search results', '<p>Use WebP and lazy loading.</p>', 'TASK', 'UI', 3, 0, NULL, 'cmpnqut7z0005jn1s64dfouhb', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.151', '2026-05-27 13:12:09.051', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8o0013jn1sjxdom80q', 'MOB-11', 'Missing translation for \"Cancel Booking\"', '<p>Label shows \"CANCEL_BTN\" instead of the localized text.</p>', 'BUG', 'Frontend', 1, 0, NULL, 'cmpnqut7z0005jn1s64dfouhb', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.153', '2026-05-27 15:05:23.890', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8q0015jn1s4ns18ouu', 'MOB-12', 'Add support for dark mode globally', '<p>Ensure all components use HSL variables.</p>', 'TASK', 'UI', 8, 0, NULL, 'cmpnqut7z0005jn1s64dfouhb', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.154', '2026-05-28 10:10:16.089', NULL, 'MEDIUM', NULL, NULL),
('cmpnqut8s0017jn1s94gqr2qn', 'MOB-13', 'Database migration for user profiles 1', '<p>Added \"preferred_currency\" field.1</p>', 'TASK', 'Database', 5, 0, NULL, 'cmpnqut7z000ajn1shu0s1k0f', 'cmpnqut7t0001jn1sua3ia6g8', 'cmpnqut7o0000jn1sb3cup9w3', 'cmpnqut7o0000jn1sb3cup9w3', '2026-05-27 07:29:58.156', '2026-05-27 16:54:06.989', NULL, 'MEDIUM', NULL, NULL),
('cmppw0ntr000fjnwouslz44fg', 'DEMO-WEB-1', 'Create landing page wireframe', '<p>Create landing page wireframe for Demo - In Progress.</p>', 'TASK', 'General', 4, 4, '2026-05-23 08:00:00.000', 'cmppw0ntn000bjnwoje0y4gak', 'cmppw0ntn0004jnwohk75ksl1', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.503', '2026-05-28 19:30:01.503', NULL, 'MEDIUM', NULL, NULL),
('cmppw0ntv000jjnwo6r76p1vu', 'DEMO-WEB-2', 'Build responsive pricing section', '<p>Build responsive pricing section for Demo - In Progress.</p>', 'TASK', 'General', 6, 0, '2026-05-30 08:00:00.000', 'cmppw0ntn0007jnwo8o5o54bs', 'cmppw0ntn0004jnwohk75ksl1', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.508', '2026-05-28 19:30:01.508', NULL, 'HIGH', NULL, NULL),
('cmppw0nu0000njnwo5k0j7jos', 'DEMO-WEB-3', 'Review header navigation', '<p>Review header navigation for Demo - In Progress.</p>', 'TASK', 'General', 2, 0, '2026-05-29 08:00:00.000', 'cmppw0ntn000cjnwo26jgrybi', 'cmppw0ntn0004jnwohk75ksl1', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.512', '2026-05-28 19:30:01.512', 'Waiting for final brand navigation copy from the product owner.', 'HIGH', NULL, NULL),
('cmppw0nu6000rjnwoi1fxshif', 'DEMO-WEB-4', 'Prepare accessibility pass', '<p>Prepare accessibility pass for Demo - In Progress.</p>', 'TASK', 'General', 3, 0, '2026-06-06 08:00:00.000', 'cmppw0ntn0006jnwokauhgrs5', 'cmppw0ntn0004jnwohk75ksl1', 'cmppcyru60003jn7gzuzfhz1u', 'cmppcyru60003jn7gzuzfhz1u', '2026-05-28 19:30:01.518', '2026-05-28 19:30:01.518', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nue0015jnwogeu18kqo', 'DEMO-API-1', 'Fix invoice sync retry bug', '<p>Fix invoice sync retry bug for Demo - Past Deadline.</p>', 'BUG', 'Backend', 8, 0, '2026-05-24 08:00:00.000', 'cmppw0nua000xjnwor024wgd4', 'cmppw0nua000ujnwoff0sv3b5', 'cmppcyru40002jn7girv8hqlz', 'cmppcyru40002jn7girv8hqlz', '2026-05-28 19:30:01.527', '2026-05-28 19:30:01.527', NULL, 'CRITICAL', NULL, NULL),
('cmppw0nui0019jnwo27go2uu6', 'DEMO-API-2', 'Add task history audit coverage', '<p>Add task history audit coverage for Demo - Past Deadline.</p>', 'TASK', 'Testing', 5, 0, '2026-05-27 00:00:00.000', 'cmppw0nua000zjnwopok6drlm', 'cmppw0nua000ujnwoff0sv3b5', 'cmppcyru60003jn7gzuzfhz1u', 'cmppcyru60003jn7gzuzfhz1u', '2026-05-28 19:30:01.531', '2026-05-30 08:16:41.343', NULL, 'HIGH', NULL, 'cmps1wqc20001jnhwfpdr9nb6'),
('cmppw0num001djnwo2alsbxhm', 'DEMO-API-3', 'Document webhook payload contract', '<p>Document webhook payload contract for Demo - Past Deadline.</p>', 'TASK', 'Documentation', 2, 2, '2026-05-20 08:00:00.000', 'cmppw0nua0011jnwofvahah4a', 'cmppw0nua000ujnwoff0sv3b5', 'cmppcyru40002jn7girv8hqlz', 'cmppcyru40002jn7girv8hqlz', '2026-05-28 19:30:01.534', '2026-05-28 19:30:01.534', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nup001hjnwol8ep37eo', 'DEMO-API-4', 'Harden file upload validation', '<p>Harden file upload validation for Demo - Past Deadline.</p>', 'TASK', 'Backend', 4, 0, '2026-06-03 00:00:00.000', 'cmppw0nua000vjnwokn27yy2a', 'cmppw0nua000ujnwoff0sv3b5', 'cmppcyru40002jn7girv8hqlz', 'cmppcyru40002jn7girv8hqlz', '2026-05-28 19:30:01.538', '2026-05-30 08:16:30.498', NULL, 'MEDIUM', NULL, 'cmps1wqc20001jnhwfpdr9nb6'),
('cmppw0nuw001vjnwo44tdnvc8', 'DEMO-MOB-1', 'Set up mobile project shell', '<p>Set up mobile project shell for Demo - Not Started.</p>', 'TASK', 'Frontend', 5, 0, '2026-06-05 08:00:00.000', 'cmppw0nut001ljnwo33gh744h', 'cmppw0nut001kjnwo6zfocl8d', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.544', '2026-05-28 19:30:01.544', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nv0001zjnwocbmh2ywg', 'DEMO-MOB-2', 'Define notification settings UI', '<p>Define notification settings UI for Demo - Not Started.</p>', 'TASK', 'UI', 3, 0, '2026-06-09 08:00:00.000', 'cmppw0nut001mjnwo6keum3hl', 'cmppw0nut001kjnwo6zfocl8d', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.548', '2026-05-28 19:30:01.548', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nv30023jnwoamr96u0o', 'DEMO-MOB-3', 'Plan offline task cache', '<p>Plan offline task cache for Demo - Not Started.</p>', 'TASK', 'Database', 6, 0, '2026-06-13 08:00:00.000', 'cmppw0nut001mjnwo6keum3hl', 'cmppw0nut001kjnwo6zfocl8d', 'cmppcyru40002jn7girv8hqlz', 'cmppcyru40002jn7girv8hqlz', '2026-05-28 19:30:01.551', '2026-05-28 19:30:01.551', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nv8002hjnwohtjrp7rx', 'DEMO-QA-1', 'Run checkout regression suite', '<p>Run checkout regression suite for Demo - Done.</p>', 'TASK', 'Testing', 4, 4, '2026-05-18 08:00:00.000', 'cmppw0nv6002djnwous7n1d7d', 'cmppw0nv60026jnwoxgu4w9dc', 'cmppcyru60003jn7gzuzfhz1u', 'cmppcyru60003jn7gzuzfhz1u', '2026-05-28 19:30:01.557', '2026-05-28 19:30:01.557', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nvb002ljnwokylwc4g8', 'DEMO-QA-2', 'Verify payment error states', '<p>Verify payment error states for Demo - Done.</p>', 'BUG', 'Testing', 3, 3, '2026-05-20 08:00:00.000', 'cmppw0nv6002djnwous7n1d7d', 'cmppw0nv60026jnwoxgu4w9dc', 'cmppcyru60003jn7gzuzfhz1u', 'cmppcyru60003jn7gzuzfhz1u', '2026-05-28 19:30:01.560', '2026-05-28 19:30:01.560', NULL, 'HIGH', NULL, NULL),
('cmppw0nvf002pjnwomkyiye9w', 'DEMO-QA-3', 'Approve release checklist', '<p>Approve release checklist for Demo - Done.</p>', 'TASK', 'Documentation', 2, 2, '2026-05-22 08:00:00.000', 'cmppw0nv6002djnwous7n1d7d', 'cmppw0nv60026jnwoxgu4w9dc', 'cmppcyru20001jn7geghbr9mu', 'cmppcyru20001jn7geghbr9mu', '2026-05-28 19:30:01.563', '2026-05-28 19:30:01.563', NULL, 'MEDIUM', NULL, NULL),
('cmppw0nvi002tjnwo07456b16', 'DEMO-QA-4', 'Smoke test production build', '<p>Smoke test production build for Demo - Done.</p>', 'TASK', 'DevOps', 2, 2, '2026-05-24 08:00:00.000', 'cmppw0nv6002djnwous7n1d7d', 'cmppw0nv60026jnwoxgu4w9dc', 'cmppcyru60003jn7gzuzfhz1u', 'cmppcyru60003jn7gzuzfhz1u', '2026-05-28 19:30:01.566', '2026-05-28 19:30:01.566', NULL, 'MEDIUM', NULL, NULL),
('cmprg7nm30003jnt4v9oqfvmq', 'DEMO-API-5', 'Harden file upload validation subtask', '<h2>Harden file upload validation</h2><p></p>', 'TASK', 'General', 4, 0, NULL, 'cmppw0nua000wjnwoy0l7oftc', 'cmppw0nua000ujnwoff0sv3b5', 'cmpnqut7o0000jn1sb3cup9w3', 'cmppcyru20001jn7geghbr9mu', '2026-05-29 21:43:06.315', '2026-05-30 08:16:20.314', NULL, 'MEDIUM', 'cmppw0nup001hjnwol8ep37eo', 'cmps1wqc20001jnhwfpdr9nb6'),
('cmps2tm2r0003jnhwkcyv7jjw', 'DEMO-API-6', 'Harden file upload validation', '<ol><li><p>Harden file upload <strong>validation</strong></p></li></ol><p></p>', 'TASK', 'General', 8, 0, NULL, 'cmppw0nua000wjnwoy0l7oftc', 'cmppw0nua000ujnwoff0sv3b5', 'cmpnqut7o0000jn1sb3cup9w3', NULL, '2026-05-30 08:16:02.308', '2026-05-30 08:16:02.308', NULL, 'MEDIUM', NULL, 'cmps1wqc20001jnhwfpdr9nb6');

-- --------------------------------------------------------

--
-- Table structure for table `taskhistory`
--

CREATE TABLE `taskhistory` (
  `id` varchar(191) NOT NULL,
  `taskId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `oldStatus` varchar(191) DEFAULT NULL,
  `newStatus` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `taskhistory`
--

INSERT INTO `taskhistory` (`id`, `taskId`, `userId`, `oldStatus`, `newStatus`, `createdAt`) VALUES
('cmpo0np2n0001jnjk53uj1sso', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', 'Done', 'Backlog', '2026-05-27 12:04:22.319'),
('cmpo1p3ms0003jnjkqy1fdywp', 'cmpnqut8h000vjn1suuefiaqw', 'cmpnqut7o0000jn1sb3cup9w3', 'Backlog', 'To Do', '2026-05-27 12:33:27.460'),
('cmpo32jj70001jns8nv2n4nhg', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', 'Backlog', 'To Do', '2026-05-27 13:11:54.212'),
('cmpo32uzk0003jns8y70me8tg', 'cmpnqut8n0011jn1sbg69zcll', 'cmpnqut7o0000jn1sb3cup9w3', 'In Progress', 'To Do', '2026-05-27 13:12:09.056'),
('cmpo32x600005jns8yxle7i4t', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', 'To Do', 'In Progress', '2026-05-27 13:12:11.881'),
('cmpo32ywp0007jns8jbzkfru2', 'cmpnqut8s0017jn1s94gqr2qn', 'cmpnqut7o0000jn1sb3cup9w3', 'In Progress', 'Review', '2026-05-27 13:12:14.138'),
('cmpo330da0009jns8vr53rkfx', 'cmpnqut8a000njn1s24lwlnw0', 'cmpnqut7o0000jn1sb3cup9w3', 'In Progress', 'Review', '2026-05-27 13:12:16.031'),
('cmpob2q590005jn3kqn192su3', 'cmpnqut8j000xjn1s9rpk4qcc', 'cmpnqut7o0000jn1sb3cup9w3', 'Unassigned', 'Seed Admin', '2026-05-27 16:55:59.710'),
('cmppc07we0007jnds47eugwy4', 'cmpnqut8q0015jn1s4ns18ouu', 'cmpnqut7o0000jn1sb3cup9w3', 'To Do', 'Backlog', '2026-05-28 10:09:48.542'),
('cmppc0asn0009jndsiito2twa', 'cmpnqut8q0015jn1s4ns18ouu', 'cmpnqut7o0000jn1sb3cup9w3', 'Backlog', 'To Do', '2026-05-28 10:09:52.296'),
('cmppw0ntt000hjnwopnxc06sx', 'cmppw0ntr000fjnwouslz44fg', 'cmppcyru20001jn7geghbr9mu', NULL, 'Done', '2026-05-28 19:30:01.506'),
('cmppw0ntx000ljnwonp95g1ab', 'cmppw0ntv000jjnwo6r76p1vu', 'cmppcyru20001jn7geghbr9mu', NULL, 'In Progress', '2026-05-28 19:30:01.510'),
('cmppw0nu4000pjnwoc7fe2sru', 'cmppw0nu0000njnwo5k0j7jos', 'cmppcyru20001jn7geghbr9mu', NULL, 'Blocked', '2026-05-28 19:30:01.516'),
('cmppw0nu8000tjnwoxv5wh8pb', 'cmppw0nu6000rjnwoi1fxshif', 'cmppcyru60003jn7gzuzfhz1u', NULL, 'To Do', '2026-05-28 19:30:01.520'),
('cmppw0nug0017jnwomxltqtgm', 'cmppw0nue0015jnwogeu18kqo', 'cmppcyru40002jn7girv8hqlz', NULL, 'In Progress', '2026-05-28 19:30:01.529'),
('cmppw0nuk001bjnwocgq21g24', 'cmppw0nui0019jnwo27go2uu6', 'cmppcyru60003jn7gzuzfhz1u', NULL, 'Testing', '2026-05-28 19:30:01.533'),
('cmppw0nuo001fjnwor53kf428', 'cmppw0num001djnwo2alsbxhm', 'cmppcyru40002jn7girv8hqlz', NULL, 'Done', '2026-05-28 19:30:01.536'),
('cmppw0nur001jjnwoxxid8wzf', 'cmppw0nup001hjnwol8ep37eo', 'cmppcyru40002jn7girv8hqlz', NULL, 'Backlog', '2026-05-28 19:30:01.539'),
('cmppw0nuy001xjnwo4qqbd7lg', 'cmppw0nuw001vjnwo44tdnvc8', 'cmppcyru20001jn7geghbr9mu', NULL, 'Backlog', '2026-05-28 19:30:01.546'),
('cmppw0nv10021jnwo6k5q6u7a', 'cmppw0nv0001zjnwocbmh2ywg', 'cmppcyru20001jn7geghbr9mu', NULL, 'To Do', '2026-05-28 19:30:01.550'),
('cmppw0nv40025jnwoxxvba4vm', 'cmppw0nv30023jnwoamr96u0o', 'cmppcyru40002jn7girv8hqlz', NULL, 'To Do', '2026-05-28 19:30:01.553'),
('cmppw0nva002jjnwoia8ghj6w', 'cmppw0nv8002hjnwohtjrp7rx', 'cmppcyru60003jn7gzuzfhz1u', NULL, 'Done', '2026-05-28 19:30:01.558'),
('cmppw0nvd002njnwob2ttm6ne', 'cmppw0nvb002ljnwokylwc4g8', 'cmppcyru60003jn7gzuzfhz1u', NULL, 'Done', '2026-05-28 19:30:01.561'),
('cmppw0nvg002rjnwooxjiy9rt', 'cmppw0nvf002pjnwomkyiye9w', 'cmppcyru20001jn7geghbr9mu', NULL, 'Done', '2026-05-28 19:30:01.565'),
('cmppw0nvj002vjnwo99pknvgi', 'cmppw0nvi002tjnwo07456b16', 'cmppcyru60003jn7gzuzfhz1u', NULL, 'Done', '2026-05-28 19:30:01.568'),
('cmprg7nmd0005jnt4mutrqve0', 'cmprg7nm30003jnt4v9oqfvmq', 'cmpnqut7o0000jn1sb3cup9w3', NULL, 'To Do', '2026-05-29 21:43:06.325'),
('cmprg7rwu0007jnt4aef5b3w2', 'cmprg7nm30003jnt4v9oqfvmq', 'cmpnqut7o0000jn1sb3cup9w3', 'Assignee changed', 'Unassigned -> أحمد الهاشمي', '2026-05-29 21:43:11.887'),
('cmps2tm2y0005jnhwjsqndmdj', 'cmps2tm2r0003jnhwkcyv7jjw', 'cmpnqut7o0000jn1sb3cup9w3', NULL, 'To Do', '2026-05-30 08:16:02.315');

-- --------------------------------------------------------

--
-- Table structure for table `tasklink`
--

CREATE TABLE `tasklink` (
  `id` varchar(191) NOT NULL,
  `sourceId` varchar(191) NOT NULL,
  `targetId` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `taskstatus`
--

CREATE TABLE `taskstatus` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `color` varchar(191) DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 0,
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `projectId` varchar(191) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `taskstatus`
--

INSERT INTO `taskstatus` (`id`, `name`, `color`, `order`, `createdAt`, `updatedAt`, `projectId`) VALUES
('cmpnqut7x0003jn1s7luqechn', 'Backlog', '#64748b', 1, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z0005jn1s64dfouhb', 'To Do', '#3b82f6', 2, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z0009jn1swq0jb1ch', 'Done', '#22c55e', 7, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z000ajn1shu0s1k0f', 'Review', '#8b5cf6', 4, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z000bjn1s3d4rgw3g', 'Testing', '#ec4899', 5, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z000ejn1s3r5wywti', 'QA', '#10b981', 6, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut7z000fjn1sk2q1b7n1', 'In Progress', '#f59e0b', 3, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmpnqut80000hjn1ssw6kv28d', 'Blocked', '#ef4444', 8, '2026-05-27 07:29:58.126', '2026-05-27 07:29:58.126', 'cmpnqut7t0001jn1sua3ia6g8'),
('cmppw0ntn0005jnwopjjpsk1z', 'Backlog', '#64748b', 1, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn0006jnwokauhgrs5', 'To Do', '#3b82f6', 2, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn0007jnwo8o5o54bs', 'In Progress', '#f59e0b', 3, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn0008jnwouz9fnhjd', 'Review', '#8b5cf6', 4, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn0009jnwow7vo0en9', 'Testing', '#ec4899', 5, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn000ajnwomvnb3srg', 'QA', '#10b981', 6, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn000bjnwoje0y4gak', 'Done', '#22c55e', 7, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn000cjnwo26jgrybi', 'Blocked', '#ef4444', 8, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0ntn000djnwo0tfq3xa8', 'Cancelled', '#94a3b8', 9, '2026-05-28 19:30:01.499', '2026-05-28 19:30:01.499', 'cmppw0ntn0004jnwohk75ksl1'),
('cmppw0nua000vjnwokn27yy2a', 'Backlog', '#64748b', 1, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua000wjnwoy0l7oftc', 'To Do', '#3b82f6', 2, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua000xjnwor024wgd4', 'In Progress', '#f59e0b', 3, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua000yjnwo4kld75w8', 'Review', '#8b5cf6', 4, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua000zjnwopok6drlm', 'Testing', '#ec4899', 5, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua0010jnwo0sanhes7', 'QA', '#10b981', 6, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua0011jnwofvahah4a', 'Done', '#22c55e', 7, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua0012jnwod3urnfuf', 'Blocked', '#ef4444', 8, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nua0013jnwoefoxq294', 'Cancelled', '#94a3b8', 9, '2026-05-28 19:30:01.522', '2026-05-28 19:30:01.522', 'cmppw0nua000ujnwoff0sv3b5'),
('cmppw0nut001ljnwo33gh744h', 'Backlog', '#64748b', 1, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001mjnwo6keum3hl', 'To Do', '#3b82f6', 2, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001njnwoj8qq3fwg', 'In Progress', '#f59e0b', 3, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001ojnwoz0ps0hfl', 'Review', '#8b5cf6', 4, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001pjnwoq1n0rxos', 'Testing', '#ec4899', 5, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001qjnwozn1bdc6x', 'QA', '#10b981', 6, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001rjnwoh86m84sl', 'Done', '#22c55e', 7, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001sjnwo490hos79', 'Blocked', '#ef4444', 8, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nut001tjnwom28bcq1o', 'Cancelled', '#94a3b8', 9, '2026-05-28 19:30:01.542', '2026-05-28 19:30:01.542', 'cmppw0nut001kjnwo6zfocl8d'),
('cmppw0nv60027jnwo47hjtn9i', 'Backlog', '#64748b', 1, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv60028jnwox18w5qln', 'To Do', '#3b82f6', 2, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv60029jnwo2feqtory', 'In Progress', '#f59e0b', 3, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002ajnwo7km0zmyz', 'Review', '#8b5cf6', 4, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002bjnwors2ahj58', 'Testing', '#ec4899', 5, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002cjnwozfzaelnp', 'QA', '#10b981', 6, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002djnwous7n1d7d', 'Done', '#22c55e', 7, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002ejnwodmikrhgt', 'Blocked', '#ef4444', 8, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppw0nv6002fjnwoc51bvql6', 'Cancelled', '#94a3b8', 9, '2026-05-28 19:30:01.554', '2026-05-28 19:30:01.554', 'cmppw0nv60026jnwoxgu4w9dc'),
('cmppwcatq0009jnyc9fs9qhe0', 'Backlog', '#64748b', 1, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000ajnycayfpvapp', 'To Do', '#3b82f6', 2, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000bjnyc91ruwkq2', 'In Progress', '#f59e0b', 3, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000cjnyc029n3a4b', 'Review', '#8b5cf6', 4, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000djnycyvfw41p7', 'Testing', '#ec4899', 5, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000ejnycpfbkk0ki', 'QA', '#10b981', 6, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000fjnycvyr7r1o3', 'Done', '#22c55e', 7, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000gjnycwcfnnf2o', 'Blocked', '#ef4444', 8, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l'),
('cmppwcatq000hjnycyc867flw', 'Cancelled', '#94a3b8', 9, '2026-05-28 19:39:04.527', '2026-05-28 19:39:04.527', 'cmppwcatq0008jnyczas71a8l');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(191) DEFAULT NULL,
  `password` varchar(191) NOT NULL,
  `role` varchar(191) NOT NULL DEFAULT 'USER',
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updatedAt` datetime(3) NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `name`, `password`, `role`, `createdAt`, `updatedAt`, `isActive`) VALUES
('cmpnqut7o0000jn1sb3cup9w3', 'admin@digibooking.com', 'Seed Admin', '$2b$10$UWFtPMFMNEX3r1vFpETu/OMA5uMDS42S92QDdEha7uX.XccJw7aBu', 'ADMIN', '2026-05-27 07:29:58.116', '2026-05-27 07:29:58.116', 1),
('cmppcyrtv0000jn7gwpqwux49', 'admin.demo@digibooking.local', 'محمد بن علي', '$2b$10$4GHDN.LQj7ckMSrMI.SEg.1.E.2/5s/zMIe/fDdSHdYUuV0j0U/ui', 'ADMIN', '2026-05-28 10:36:40.675', '2026-05-28 20:07:14.760', 1),
('cmppcyru20001jn7geghbr9mu', 'frontend.demo@digibooking.local', 'أحمد الهاشمي', '$2b$10$4GHDN.LQj7ckMSrMI.SEg.1.E.2/5s/zMIe/fDdSHdYUuV0j0U/ui', 'USER', '2026-05-28 10:36:40.682', '2026-05-28 20:06:24.971', 1),
('cmppcyru40002jn7girv8hqlz', 'backend.demo@digibooking.local', 'ليلى منصور', '$2b$10$4GHDN.LQj7ckMSrMI.SEg.1.E.2/5s/zMIe/fDdSHdYUuV0j0U/ui', 'USER', '2026-05-28 10:36:40.685', '2026-05-28 19:30:01.480', 1),
('cmppcyru60003jn7gzuzfhz1u', 'qa.demo@digibooking.local', 'سارة بن يوسف', '$2b$10$4GHDN.LQj7ckMSrMI.SEg.1.E.2/5s/zMIe/fDdSHdYUuV0j0U/ui', 'USER', '2026-05-28 10:36:40.687', '2026-05-28 20:04:01.942', 1);

-- --------------------------------------------------------

--
-- Table structure for table `worklog`
--

CREATE TABLE `worklog` (
  `id` varchar(191) NOT NULL,
  `taskId` varchar(191) NOT NULL,
  `userId` varchar(191) NOT NULL,
  `hours` double NOT NULL,
  `notes` longtext DEFAULT NULL,
  `date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `createdAt` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attachment`
--
ALTER TABLE `attachment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `Attachment_projectId_fkey` (`projectId`),
  ADD KEY `Attachment_taskId_fkey` (`taskId`),
  ADD KEY `Attachment_commentId_fkey` (`commentId`);

--
-- Indexes for table `comment`
--
ALTER TABLE `comment`
  ADD PRIMARY KEY (`id`),
  ADD KEY `comment_taskId_idx` (`taskId`),
  ADD KEY `comment_userId_idx` (`userId`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notification_userId_idx` (`userId`);

--
-- Indexes for table `project`
--
ALTER TABLE `project`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sprint`
--
ALTER TABLE `sprint`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sprint_projectId_idx` (`projectId`);

--
-- Indexes for table `task`
--
ALTER TABLE `task`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `Task_ticketId_key` (`ticketId`),
  ADD KEY `Task_statusId_fkey` (`statusId`),
  ADD KEY `Task_projectId_fkey` (`projectId`),
  ADD KEY `Task_ownerId_fkey` (`ownerId`),
  ADD KEY `Task_assigneeId_fkey` (`assigneeId`),
  ADD KEY `Task_parentId_fkey` (`parentId`),
  ADD KEY `task_sprintId_idx` (`sprintId`);

--
-- Indexes for table `taskhistory`
--
ALTER TABLE `taskhistory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `TaskHistory_taskId_fkey` (`taskId`),
  ADD KEY `TaskHistory_userId_fkey` (`userId`);

--
-- Indexes for table `tasklink`
--
ALTER TABLE `tasklink`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tasklink_sourceId_targetId_type_key` (`sourceId`,`targetId`,`type`),
  ADD KEY `tasklink_sourceId_idx` (`sourceId`),
  ADD KEY `tasklink_targetId_idx` (`targetId`);

--
-- Indexes for table `taskstatus`
--
ALTER TABLE `taskstatus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `TaskStatus_name_projectId_key` (`name`,`projectId`),
  ADD KEY `TaskStatus_projectId_fkey` (`projectId`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `User_email_key` (`email`);

--
-- Indexes for table `worklog`
--
ALTER TABLE `worklog`
  ADD PRIMARY KEY (`id`),
  ADD KEY `worklog_taskId_idx` (`taskId`),
  ADD KEY `worklog_userId_idx` (`userId`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `attachment`
--
ALTER TABLE `attachment`
  ADD CONSTRAINT `Attachment_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Attachment_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Attachment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `comment`
--
ALTER TABLE `comment`
  ADD CONSTRAINT `comment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `comment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `sprint`
--
ALTER TABLE `sprint`
  ADD CONSTRAINT `sprint_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `task`
--
ALTER TABLE `task`
  ADD CONSTRAINT `Task_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `user` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Task_statusId_fkey` FOREIGN KEY (`statusId`) REFERENCES `taskstatus` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `task_sprintId_fkey` FOREIGN KEY (`sprintId`) REFERENCES `sprint` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `taskhistory`
--
ALTER TABLE `taskhistory`
  ADD CONSTRAINT `TaskHistory_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `TaskHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `tasklink`
--
ALTER TABLE `tasklink`
  ADD CONSTRAINT `tasklink_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tasklink_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `taskstatus`
--
ALTER TABLE `taskstatus`
  ADD CONSTRAINT `TaskStatus_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `worklog`
--
ALTER TABLE `worklog`
  ADD CONSTRAINT `worklog_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `worklog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
