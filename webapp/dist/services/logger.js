"use strict";
/**
 * @file services/logger.ts
 * @description
 * This file provides a basic logging service for the Web Proofreading App.
 * It offers methods for logging info, warnings, errors, and debug messages.
 *
 * Key features:
 * - Logs messages with timestamps.
 * - Provides a centralized logging interface for future integration with
 *   performance monitoring tools (e.g., Sentry).
 *
 * @dependencies
 * - None (uses built-in console methods).
 *
 * @notes
 * - In future iterations, you can integrate with external monitoring services.
 * - All logging is currently done to the console.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    /**
     * Logs an informational message.
     * @param message - The message to log.
     */
    static info(message) {
        console.info(`[INFO] [${new Date().toISOString()}]: ${message}`);
    }
    /**
     * Logs a warning message.
     * @param message - The message to log.
     */
    static warn(message) {
        console.warn(`[WARN] [${new Date().toISOString()}]: ${message}`);
    }
    /**
     * Logs an error message.
     * @param message - The message to log.
     */
    static error(message) {
        console.error(`[ERROR] [${new Date().toISOString()}]: ${message}`);
    }
    /**
     * Logs a debug message.
     * @param message - The message to log.
     */
    static debug(message) {
        console.debug(`[DEBUG] [${new Date().toISOString()}]: ${message}`);
    }
}
exports.Logger = Logger;
exports.default = Logger;
