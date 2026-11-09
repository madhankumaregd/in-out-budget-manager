import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class RateLimitResult {
  final bool allowed;
  final int retryAfterMs;
  final int remaining;
  final String? error;

  RateLimitResult({
    required this.allowed,
    required this.retryAfterMs,
    required this.remaining,
    this.error,
  });
}

class RateLimiterService {
  static const int windowMs = 30 * 60 * 1000; // 30 minutes
  static const int maxActions = 20; // Max 20 transactions
  static const int lockoutMs = 60 * 60 * 1000; // 1 hour restriction

  static String _key(String userId) => 'tx_rate_limit_$userId';

  /// Format milliseconds into human readable countdown (e.g. "54m 32s")
  static String formatCooldown(int ms) {
    final totalSeconds = (ms / 1000).ceil().clamp(0, 86400);
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    if (minutes > 0) {
      return '${minutes}m ${seconds}s';
    }
    return '${seconds}s';
  }

  /// Check whether the user is permitted to create a transaction right now.
  static Future<RateLimitResult> checkTransactionRate(String userId) async {
    if (userId.isEmpty) {
      return RateLimitResult(allowed: true, retryAfterMs: 0, remaining: maxActions);
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId));
      final now = DateTime.now().millisecondsSinceEpoch;

      List<int> timestamps = [];
      int restrictedUntil = 0;

      if (raw != null && raw.isNotEmpty) {
        try {
          final data = jsonDecode(raw) as Map<String, dynamic>;
          if (data['timestamps'] is List) {
            timestamps = (data['timestamps'] as List)
                .whereType<num>()
                .map((n) => n.toInt())
                .toList();
          }
          if (data['restrictedUntil'] is num) {
            restrictedUntil = (data['restrictedUntil'] as num).toInt();
          }
        } catch (_) {}
      }

      // 1. Check if user is currently locked out
      if (restrictedUntil > now) {
        final remainingMs = restrictedUntil - now;
        return RateLimitResult(
          allowed: false,
          retryAfterMs: remainingMs,
          remaining: 0,
          error:
              'Security Restriction: You have added more than 20 transactions within 30 minutes. Adding transactions is restricted for the next 1 hour. Please retry in ${formatCooldown(remainingMs)}.',
        );
      }

      // 2. Filter timestamps strictly within the 30-minute window
      final cutoff = now - windowMs;
      final recent = timestamps.where((t) => t > cutoff).toList();

      // If timestamps were pruned or restriction expired, persist clean state
      if (recent.length != timestamps.length || restrictedUntil > 0) {
        await prefs.setString(
          _key(userId),
          jsonEncode({
            'timestamps': recent,
            'restrictedUntil': 0,
          }),
        );
      }

      // 3. Check if user has exceeded the threshold of 20 transactions
      if (recent.length >= maxActions) {
        final newLockout = now + lockoutMs;
        await prefs.setString(
          _key(userId),
          jsonEncode({
            'timestamps': recent,
            'restrictedUntil': newLockout,
          }),
        );

        return RateLimitResult(
          allowed: false,
          retryAfterMs: lockoutMs,
          remaining: 0,
          error:
              'Security Restriction: You have added more than 20 transactions within 30 minutes. Adding transactions is restricted for the next 1 hour. Please retry in ${formatCooldown(lockoutMs)}.',
        );
      }

      return RateLimitResult(
        allowed: true,
        retryAfterMs: 0,
        remaining: maxActions - recent.length,
      );
    } catch (_) {
      // In case of storage read issue, fail open safely
      return RateLimitResult(allowed: true, retryAfterMs: 0, remaining: maxActions);
    }
  }

  /// Record a completed transaction.
  static Future<void> recordTransaction(String userId) async {
    if (userId.isEmpty) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_key(userId));
      final now = DateTime.now().millisecondsSinceEpoch;

      List<int> timestamps = [];
      int restrictedUntil = 0;

      if (raw != null && raw.isNotEmpty) {
        try {
          final data = jsonDecode(raw) as Map<String, dynamic>;
          if (data['timestamps'] is List) {
            timestamps = (data['timestamps'] as List)
                .whereType<num>()
                .map((n) => n.toInt())
                .toList();
          }
          if (data['restrictedUntil'] is num) {
            restrictedUntil = (data['restrictedUntil'] as num).toInt();
          }
        } catch (_) {}
      }

      final cutoff = now - windowMs;
      final updated = timestamps.where((t) => t > cutoff).toList();
      updated.add(now);

      if (updated.length > maxActions) {
        restrictedUntil = now + lockoutMs;
      }

      await prefs.setString(
        _key(userId),
        jsonEncode({
          'timestamps': updated,
          'restrictedUntil': restrictedUntil,
        }),
      );
    } catch (_) {}
  }
}

