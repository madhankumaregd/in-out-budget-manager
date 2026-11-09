import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/admin_provider.dart';
import '../../providers/theme_provider.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  final List<Map<String, String>> _filterOptions = [
    {'id': 'days', 'label': '24 Hours'},
    {'id': 'week', 'label': '7 Days'},
    {'id': 'month', 'label': '30 Days'},
    {'id': 'custom', 'label': 'Custom'},
  ];

  Future<void> _pickCustomRange(BuildContext context) async {
    final admin = context.read<AdminProvider>();
    final initialRange = DateTimeRange(
      start: DateTime.now().subtract(const Duration(days: 7)),
      end: DateTime.now(),
    );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDateRange: initialRange,
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.adminPrimary,
              onPrimary: Colors.white,
              surface: AppColors.adminSurface,
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final startStr = DateFormat('yyyy-MM-dd').format(picked.start);
      final endStr = DateFormat('yyyy-MM-dd').format(picked.end);
      await admin.setCustomRange(startStr, endStr);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final data = admin.analytics;

    if (admin.isAnalyticsLoading && data == null) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.adminPrimary),
      );
    }

    final reads = (data?['reads'] as Map<String, dynamic>?) ?? {};
    final writes = (data?['writes'] as Map<String, dynamic>?) ?? {};
    final storage = (data?['storage'] as Map<String, dynamic>?) ?? {};
    final timeline = (data?['timeline'] as List<dynamic>?) ?? [];

    final readsTotal = (reads['consumed'] ?? 0) is int ? (reads['consumed'] ?? 0) as int : int.tryParse(reads['consumed']?.toString() ?? '0') ?? 0;
    final readsAvailable = (reads['available'] ?? 50000) is int ? (reads['available'] ?? 50000) as int : int.tryParse(reads['available']?.toString() ?? '50000') ?? 50000;
    final readsPercent = double.tryParse(reads['percentage']?.toString() ?? '0') ?? 0.0;

    final writesTotal = (writes['consumed'] ?? 0) is int ? (writes['consumed'] ?? 0) as int : int.tryParse(writes['consumed']?.toString() ?? '0') ?? 0;
    final writesAvailable = (writes['available'] ?? 20000) is int ? (writes['available'] ?? 20000) as int : int.tryParse(writes['available']?.toString() ?? '20000') ?? 20000;
    final writesPercent = double.tryParse(writes['percentage']?.toString() ?? '0') ?? 0.0;

    final occupiedFormatted = storage['occupiedFormatted']?.toString() ?? '0.00 MB';
    final occupiedMB = double.tryParse(occupiedFormatted.replaceAll(' MB', '')) ?? 0.0;
    final totalMB = 1024.0;
    final storagePercent = totalMB > 0 ? (occupiedMB / totalMB) * 100 : 0.0;
    final totalDocs = (storage['totalDocuments'] ?? 0) is int ? (storage['totalDocuments'] ?? 0) as int : int.tryParse(storage['totalDocuments']?.toString() ?? '0') ?? 0;

    final themeProv = context.watch<ThemeProvider>();
    final isDark = themeProv.isDark(context);
    final cardBg = AppColors.getAdminSurface(isDark);
    final cardBorder = AppColors.getAdminBorder(isDark);
    final textTitle = AppColors.getAdminText(isDark);
    final textSubtitle = AppColors.getAdminTextMuted(isDark);

    return RefreshIndicator(
      color: AppColors.adminPrimary,
      backgroundColor: cardBg,
      onRefresh: () => admin.fetchAnalytics(isManual: true),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Observability Header
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.adminPrimary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.adminPrimary.withOpacity(0.3)),
                  ),
                  child: const Icon(Icons.analytics_rounded, color: AppColors.adminPrimary, size: 22),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Database Observability',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: textTitle,
                      ),
                    ),
                    Text(
                      'Firestore reads, writes & storage telemetry',
                      style: TextStyle(fontSize: 11, color: textSubtitle),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Time Filter Segmented Buttons
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                children: _filterOptions.map((opt) {
                  final isSelected = admin.selectedFilter == opt['id'];
                  return Expanded(
                    child: InkWell(
                      onTap: () {
                        if (opt['id'] == 'custom') {
                          _pickCustomRange(context);
                        } else {
                          admin.setFilter(opt['id']!);
                        }
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.adminPrimary : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          opt['label']!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : textSubtitle,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Telemetry Cards: Reads & Writes
            Row(
              children: [
                Expanded(
                  child: _buildTelemetryCard(
                    title: 'Database Reads',
                    occupied: readsTotal.toString(),
                    available: readsAvailable.toString(),
                    percent: readsPercent,
                    color: const Color(0xFF8B5CF6),
                    icon: Icons.visibility_outlined,
                    cardBg: cardBg,
                    cardBorder: cardBorder,
                    textTitle: textTitle,
                    textSubtitle: textSubtitle,
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTelemetryCard(
                    title: 'Database Writes',
                    occupied: writesTotal.toString(),
                    available: writesAvailable.toString(),
                    percent: writesPercent,
                    color: const Color(0xFF10B981),
                    icon: Icons.edit_note_rounded,
                    cardBg: cardBg,
                    cardBorder: cardBorder,
                    textTitle: textTitle,
                    textSubtitle: textSubtitle,
                    isDark: isDark,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Storage Occupied Card (total available / occupied)
            _buildStorageCard(occupiedMB, totalMB, storagePercent, totalDocs, cardBg, cardBorder, textTitle, textSubtitle, isDark),
            const SizedBox(height: 20),

            // Operations Activity Chart
            if (timeline.isNotEmpty) ...[
              _buildTimelineChart(timeline, cardBg, cardBorder, textTitle, textSubtitle, isDark),
              const SizedBox(height: 20),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetryCard({
    required String title,
    required String occupied,
    required String available,
    required double percent,
    required Color color,
    required IconData icon,
    required Color cardBg,
    required Color cardBorder,
    required Color textTitle,
    required Color textSubtitle,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 20),
              Text(
                '${percent.toStringAsFixed(1)}%',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(fontSize: 12, color: textSubtitle, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          Text(
            occupied,
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: textTitle),
          ),
          const SizedBox(height: 4),
          Text(
            'of $available available',
            style: TextStyle(fontSize: 10, color: textSubtitle),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (percent / 100).clamp(0.0, 1.0),
              backgroundColor: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStorageCard(
    double occupiedMB,
    double totalMB,
    double percent,
    int totalDocs,
    Color cardBg,
    Color cardBorder,
    Color textTitle,
    Color textSubtitle,
    bool isDark,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.storage_rounded, color: Color(0xFF34D399), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Storage Occupied / Available',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: textTitle),
                  ),
                ],
              ),
              Text(
                '${percent.toStringAsFixed(2)}%',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '${occupiedMB.toStringAsFixed(2)} MB',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: textTitle),
              ),
              const SizedBox(width: 8),
              Text(
                '/ ${totalMB.toStringAsFixed(0)} MB allocated limit',
                style: TextStyle(fontSize: 12, color: textSubtitle),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: (percent / 100).clamp(0.0, 1.0),
              backgroundColor: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.06),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Indexed Document Count: $totalDocs documents across collections',
            style: TextStyle(fontSize: 11, color: textSubtitle),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineChart(
    List<dynamic> timeline,
    Color cardBg,
    Color cardBorder,
    Color textTitle,
    Color textSubtitle,
    bool isDark,
  ) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Operations Volume',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: textTitle),
              ),
              Row(
                children: [
                  _legendDot('Reads', const Color(0xFF8B5CF6), textSubtitle),
                  const SizedBox(width: 10),
                  _legendDot('Writes', const Color(0xFF10B981), textSubtitle),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            height: 180,
            child: BarChart(
              BarChartData(
                barTouchData: BarTouchData(
                  touchTooltipData: BarTouchTooltipData(
                    getTooltipColor: (_) => cardBg,
                    fitInsideHorizontally: true,
                  ),
                ),
                titlesData: FlTitlesData(
                  topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      reservedSize: 32,
                      getTitlesWidget: (v, m) => Text(
                        v.toInt().toString(),
                        style: TextStyle(fontSize: 9, color: textSubtitle),
                      ),
                    ),
                  ),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (val, meta) {
                        final idx = val.toInt();
                        if (idx >= 0 && idx < timeline.length) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              timeline[idx]['label'] ?? '',
                              style: TextStyle(fontSize: 9, color: textSubtitle),
                            ),
                          );
                        }
                        return const SizedBox();
                      },
                    ),
                  ),
                ),
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  getDrawingHorizontalLine: (v) => FlLine(
                    color: isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.04),
                    strokeWidth: 1,
                  ),
                ),
                borderData: FlBorderData(show: false),
                barGroups: timeline.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final item = entry.value;
                  return BarChartGroupData(
                    x: idx,
                    barRods: [
                      BarChartRodData(
                        toY: (item['reads'] as num).toDouble(),
                        color: const Color(0xFF8B5CF6),
                        width: 6,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                      ),
                      BarChartRodData(
                        toY: (item['writes'] as num).toDouble(),
                        color: const Color(0xFF10B981),
                        width: 6,
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _legendDot(String label, Color color, Color textSubtitle) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(fontSize: 11, color: textSubtitle)),
      ],
    );
  }
}

