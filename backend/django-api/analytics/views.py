import datetime
from rest_framework import views, status, permissions
from rest_framework.response import Response
from institutions.models import Institution
from indicators.models import IndicatorValue, Indicator
from django.db.models import Sum, Count, Avg
from academic.models import Student


class DashboardDataView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_year = int(request.query_params.get('year', datetime.date.today().year))

        total_heis  = Institution.objects.count()
        active_heis = Institution.objects.filter(is_active=True).count()

        enrollment_indicator = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        graduation_indicator = Indicator.objects.filter(code='GRADUATION_RATE').first()

        # ── Total students: IndicatorValue → Student fallback ─────────────
        total_students = 0
        if enrollment_indicator:
            agg = IndicatorValue.objects.filter(
                indicator=enrollment_indicator, year=current_year
            ).aggregate(Sum('value'))
            total_students = int(agg['value__sum'] or 0)
        if total_students == 0:
            total_students = Student.objects.filter(status='ENROLLED').count()
        if total_students == 0:
            total_students = Student.objects.count()

        # ── Graduation count: actual graduated students ───────────────────
        graduation_count = Student.objects.filter(status='GRADUATED').count()
        # Also try IndicatorValue if a TOTAL_GRADUATES indicator exists
        grad_count_ind = Indicator.objects.filter(code='TOTAL_GRADUATES').first()
        if grad_count_ind:
            agg = IndicatorValue.objects.filter(
                indicator=grad_count_ind, year=current_year
            ).aggregate(Sum('value'))
            ind_val = int(agg['value__sum'] or 0)
            if ind_val > 0:
                graduation_count = ind_val

        # ── Chart: 6-year enrollment trend ────────────────────────────────
        chart_data = []
        for year in range(current_year - 5, current_year + 1):
            val = 0
            if enrollment_indicator:
                agg = IndicatorValue.objects.filter(
                    indicator=enrollment_indicator, year=year
                ).aggregate(Sum('value'))
                val = int(agg['value__sum'] or 0)
            if val == 0:
                val = Student.objects.filter(year_of_entry=year).count()
            chart_data.append({'name': str(year), 'value': val})

        # Province Distribution
        province_counts = Institution.objects.values('province').annotate(count=Count('id'))
        total = sum(item['count'] for item in province_counts)
        province_data = []
        for item in province_counts:
            name = dict(Institution.PROVINCES).get(item['province'], item['province'])
            percentage = round((item['count'] / total * 100), 1) if total > 0 else 0
            province_data.append({'name': name, 'value': percentage})

        if not province_data:
            province_data = [{'name': 'Lusaka', 'value': 0}, {'name': 'Copperbelt', 'value': 0}]

        # Institution type breakdown
        type_breakdown = []
        for t_code, t_label in Institution.TYPES:
            count = Institution.objects.filter(type=t_code, is_active=True).count()
            type_breakdown.append({'type': t_label, 'count': count})

        # Recent indicator values (top 5 indicators)
        recent_indicators = []
        for ind in Indicator.objects.filter(is_active=True)[:5]:
            agg = IndicatorValue.objects.filter(
                indicator=ind, year=current_year
            ).aggregate(Avg('value'))
            recent_indicators.append({
                'code': ind.code,
                'name': ind.name,
                'value': round(agg['value__avg'] or 0, 2),
                'unit': ind.unit,
                'target': ind.target_value,
            })

        return Response({
            'stats': {
                'total_students':   total_students,
                'graduated_count':  graduation_count,
                'registered_heis':  total_heis,
                'active_heis':      active_heis,
                'compliance_score': 94.5,
            },
            'chart_data': chart_data,
            'province_data': province_data,
            'type_breakdown': type_breakdown,
            'recent_indicators': recent_indicators,
            'year': current_year,
        })


class ExecutiveDashboardView(views.APIView):
    """High-level executive summary for ministry stakeholders."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', datetime.date.today().year))

        enrollment_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        graduation_ind = Indicator.objects.filter(code='GRADUATION_RATE').first()

        # National totals
        total_students = 0
        if enrollment_ind:
            agg = IndicatorValue.objects.filter(indicator=enrollment_ind, year=year).aggregate(Sum('value'))
            total_students = int(agg['value__sum'] or 0)

        avg_grad = 0.0
        if graduation_ind:
            agg = IndicatorValue.objects.filter(indicator=graduation_ind, year=year).aggregate(Avg('value'))
            avg_grad = round(agg['value__avg'] or 0, 1)

        # Top 5 institutions by enrollment
        top_institutions = []
        if enrollment_ind:
            top_vals = (
                IndicatorValue.objects
                .filter(indicator=enrollment_ind, year=year)
                .select_related('institution')
                .order_by('-value')[:5]
            )
            for v in top_vals:
                top_institutions.append({
                    'name': v.institution.name if v.institution else 'N/A',
                    'type': v.institution.type if v.institution else '',
                    'students': int(v.value),
                })

        # Year-over-year growth
        yoy_growth = None
        if enrollment_ind:
            prev_agg = IndicatorValue.objects.filter(
                indicator=enrollment_ind, year=year - 1
            ).aggregate(Sum('value'))
            prev_total = int(prev_agg['value__sum'] or 0)
            if prev_total > 0:
                yoy_growth = round(((total_students - prev_total) / prev_total) * 100, 1)

        return Response({
            'year': year,
            'national_summary': {
                'total_students': total_students,
                'avg_graduation_rate': avg_grad,
                'total_institutions': Institution.objects.count(),
                'active_institutions': Institution.objects.filter(is_active=True).count(),
                'yoy_enrollment_growth': yoy_growth,
            },
            'top_institutions_by_enrollment': top_institutions,
        })


class AnalyticsOverviewView(views.APIView):
    """Analytics overview with multi-year comparisons."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year = int(request.query_params.get('year', datetime.date.today().year))
        years = list(range(year - 4, year + 1))

        enrollment_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        graduation_ind = Indicator.objects.filter(code='GRADUATION_RATE').first()

        enrollment_series = []
        graduation_series = []

        for y in years:
            if enrollment_ind:
                agg = IndicatorValue.objects.filter(indicator=enrollment_ind, year=y).aggregate(Sum('value'))
                enrollment_series.append({'year': y, 'value': int(agg['value__sum'] or 0)})
            if graduation_ind:
                agg = IndicatorValue.objects.filter(indicator=graduation_ind, year=y).aggregate(Avg('value'))
                graduation_series.append({'year': y, 'value': round(agg['value__avg'] or 0, 1)})

        # Gender breakdown (from academic enrollments)
        try:
            from academic.models import Enrollment
            gender_data = (
                Enrollment.objects
                .filter(academic_year=year)
                .aggregate(
                    total_male=Sum('male_count'),
                    total_female=Sum('female_count'),
                    total=Sum('total_enrolled'),
                )
            )
        except Exception:
            gender_data = {'total_male': 0, 'total_female': 0, 'total': 0}

        return Response({
            'year': year,
            'enrollment_series': enrollment_series,
            'graduation_series': graduation_series,
            'gender_breakdown': {
                'male': gender_data.get('total_male') or 0,
                'female': gender_data.get('total_female') or 0,
                'total': gender_data.get('total') or 0,
            },
        })


class EnrollmentBreakdownView(views.APIView):
    """
    Returns enrollment counts broken down by student status and year_of_entry,
    queried directly from the Student table.

    Query params:
      institution  – institution id (optional)
      year_from    – earliest year_of_entry to include (default: current_year - 9)
      year_to      – latest year_of_entry to include (default: current_year)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_year = datetime.date.today().year

        institution_id = request.query_params.get('institution')
        year_from = int(request.query_params.get('year_from', current_year - 9))
        year_to   = int(request.query_params.get('year_to',   current_year))

        qs = Student.objects.all()
        if institution_id:
            qs = qs.filter(institution_id=institution_id)

        # ── 1. By student status ─────────────────────────────────────────
        by_status = []
        for code, label in Student.STATUS_CHOICES:
            count = qs.filter(status=code).count()
            by_status.append({'code': code, 'name': label, 'count': count})

        # ── 2. By year of entry (cohort) ─────────────────────────────────
        by_year = []
        for y in range(year_from, year_to + 1):
            year_qs = qs.filter(year_of_entry=y)
            total   = year_qs.count()
            if total == 0:
                continue
            # break down each cohort year by status
            status_breakdown = {}
            for code, label in Student.STATUS_CHOICES:
                status_breakdown[code.lower()] = year_qs.filter(status=code).count()
            by_year.append({
                'year':       y,
                'total':      total,
                **status_breakdown,
            })

        # ── 3. By year of entry × status (stacked bar data) ─────────────
        # Already embedded in by_year above; also expose flat pivot for charts
        stacked = by_year  # same structure, frontend can use directly

        # ── 4. Summary totals ────────────────────────────────────────────
        total_students = qs.count()
        enrolled_count = qs.filter(status='ENROLLED').count()
        graduated_count = qs.filter(status='GRADUATED').count()

        return Response({
            'total_students':  total_students,
            'enrolled_count':  enrolled_count,
            'graduated_count': graduated_count,
            'by_status':       by_status,
            'by_year':         by_year,
            'stacked_by_year': stacked,
            'year_from':       year_from,
            'year_to':         year_to,
        })
