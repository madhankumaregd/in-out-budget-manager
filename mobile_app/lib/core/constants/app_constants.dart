class AppConstants {
  static const String appName = 'IN & OUT';
  static const String appFullName = 'IN & OUT Budget Manager';
  static const String defaultPrimaryAdmin = 'egdmadhankumar@gmail.com';
  static const String primaryAdminEmail = 'egdmadhankumar@gmail.com';

  static const List<String> incomeCategories = [
    'Salary',
    'Freelance',
    'Investment',
    'Gift',
    'Other',
  ];

  static const List<String> expenseCategories = [
    'Food',
    'Transport',
    'Entertainment',
    'Shopping',
    'Bills',
    'Healthcare',
    'Education',
    'Other',
  ];

  static const List<Map<String, String>> accountTypes = [
    {'id': 'bank', 'label': 'Bank Account'},
    {'id': 'savings', 'label': 'Savings Account'},
    {'id': 'credit_card', 'label': 'Credit Card'},
    {'id': 'other', 'label': 'Other'},
  ];

  static const List<Map<String, String>> currencyOptions = [
    {'code': 'INR', 'label': 'Indian Rupee', 'symbol': '₹'},
    {'code': 'USD', 'label': 'US Dollar', 'symbol': '\$'},
    {'code': 'EUR', 'label': 'Euro', 'symbol': '€'},
    {'code': 'GBP', 'label': 'British Pound', 'symbol': '£'},
  ];

  static const Map<String, String> currencySymbols = {
    'INR': '₹',
    'USD': '\$',
    'EUR': '€',
    'GBP': '£',
  };

  static String getCurrencySymbol(String? currency) {
    if (currency == null) return '₹';
    return currencySymbols[currency] ?? currency;
  }
}
