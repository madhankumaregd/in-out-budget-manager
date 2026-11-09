import 'package:intl/intl.dart';

class CurrencyFormatter {
  static String format(
    double amount, {
    String? symbol,
    String? currency,
  }) {
    final effectiveSymbol = symbol ?? currency ?? '₹';
    final formatter = NumberFormat('#,##,##0.00', 'en_IN');
    return '$effectiveSymbol${formatter.format(amount)}';
  }

  static String formatCompact(
    double amount, {
    String? symbol,
    String? currency,
  }) {
    final effectiveSymbol = symbol ?? currency ?? '₹';
    if (amount >= 10000000) {
      return '$effectiveSymbol${(amount / 10000000).toStringAsFixed(1)}Cr';
    } else if (amount >= 100000) {
      return '$effectiveSymbol${(amount / 100000).toStringAsFixed(1)}L';
    } else if (amount >= 1000) {
      return '$effectiveSymbol${(amount / 1000).toStringAsFixed(1)}K';
    }
    return '$effectiveSymbol${amount.toStringAsFixed(0)}';
  }

  static String compact(
    double amount, {
    String? symbol,
    String? currency,
  }) =>
      formatCompact(amount, symbol: symbol, currency: currency);
}
