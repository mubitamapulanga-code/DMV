from rest_framework import viewsets, views, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Sum, Count, Avg, Q, Max, Min
from .models import Report
from .serializers import ReportSerializer
from institutions.models import Institution
from indicators.models import Indicator, IndicatorValue
from academic.models import Enrollment, Programme, Student


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related('generated_by').all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'status', 'format']
    search_fields = ['title']
    ordering_fields = ['created_at', 'title']

    def perform_create(self, serializer):
        report = serializer.save(generated_by=self.request.user, status='GENERATING')
        # Synchronously generate the report data (in production, use Celery)
        self._generate_report(report)

    def _generate_report(self, report):
        """Generate report data and mark as ready."""
        try:
            report.status = 'READY'
            report.save(update_fields=['status'])
        except Exception as e:
            report.status = 'FAILED'
            report.error_message = str(e)
            report.save(update_fields=['status', 'error_message'])

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Return aggregated data for report generation UI."""
        year = int(request.query_params.get('year', 2024))
        institution_id = request.query_params.get('institution')

        enroll_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        grad_ind   = Indicator.objects.filter(code='GRADUATION_RATE').first()

        stu_qs = Student.objects.all()
        if institution_id:
            stu_qs = stu_qs.filter(institution_id=institution_id)

        # Total students — prefer IndicatorValue, fall back to Student count
        total_students = 0
        if enroll_ind:
            qs = IndicatorValue.objects.filter(indicator=enroll_ind, year=year)
            if institution_id:
                qs = qs.filter(institution_id=institution_id)
            agg = qs.aggregate(Sum('value'))
            total_students = int(agg['value__sum'] or 0)
        if total_students == 0:
            total_students = stu_qs.filter(status='ENROLLED').count()
        if total_students == 0:
            total_students = stu_qs.count()

        # Graduation rate — prefer IndicatorValue, fall back to Student ratio
        avg_graduation = 0.0
        if grad_ind:
            qs = IndicatorValue.objects.filter(indicator=grad_ind, year=year)
            if institution_id:
                qs = qs.filter(institution_id=institution_id)
            agg = qs.aggregate(Avg('value'))
            avg_graduation = round(agg['value__avg'] or 0, 1)
        if avg_graduation == 0.0:
            total = stu_qs.count()
            if total > 0:
                grads = stu_qs.filter(status='GRADUATED').count()
                avg_graduation = round((grads / total) * 100, 1)

        # Enrollment trend (last 5 years)
        enrollment_trend = []
        for y in range(year - 4, year + 1):
            val = 0
            if enroll_ind:
                qs = IndicatorValue.objects.filter(indicator=enroll_ind, year=y)
                if institution_id:
                    qs = qs.filter(institution_id=institution_id)
                agg = qs.aggregate(Sum('value'))
                val = int(agg['value__sum'] or 0)
            if val == 0:
                val = stu_qs.filter(year_of_entry=y).count()
            enrollment_trend.append({'year': y, 'value': val})

        # Institution breakdown
        institution_breakdown = []
        for inst in Institution.objects.filter(is_active=True)[:10]:
            inst_students = 0
            if enroll_ind:
                agg = IndicatorValue.objects.filter(
                    indicator=enroll_ind, institution=inst, year=year
                ).aggregate(Sum('value'))
                inst_students = int(agg['value__sum'] or 0)
            if inst_students == 0:
                inst_students = Student.objects.filter(institution=inst, status='ENROLLED').count()
            if inst_students == 0:
                inst_students = Student.objects.filter(institution=inst).count()
            institution_breakdown.append({
                'id': inst.id, 'name': inst.name,
                'type': inst.type, 'province': inst.province,
                'students': inst_students,
            })

        return Response({
            'year': year,
            'total_students': total_students,
            'avg_graduation_rate': avg_graduation,
            'total_institutions': Institution.objects.filter(is_active=True).count(),
            'enrollment_trend': enrollment_trend,
            'institution_breakdown': institution_breakdown,
        })


class ReportTemplatesView(views.APIView):
    """Returns available report templates."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        templates = [
            {
                'id': 'enrollment_annual',
                'name': 'Annual Enrollment Report',
                'description': 'Comprehensive enrollment statistics by institution, programme, and province.',
                'type': 'ENROLLMENT',
                'formats': ['PDF', 'XLSX'],
            },
            {
                'id': 'graduation_summary',
                'name': 'Graduation Rate Summary',
                'description': 'Graduation rates across all registered HEIs with trend analysis.',
                'type': 'GRADUATION',
                'formats': ['PDF', 'XLSX'],
            },
            {
                'id': 'institution_directory',
                'name': 'Institution Directory',
                'description': 'Full directory of registered Higher Education Institutions.',
                'type': 'INSTITUTION',
                'formats': ['PDF', 'XLSX', 'CSV'],
            },
            {
                'id': 'programme_catalogue',
                'name': 'Programme Catalogue',
                'description': 'All accredited academic programmes by institution and level.',
                'type': 'PROGRAMME',
                'formats': ['PDF', 'XLSX'],
            },
            {
                'id': 'executive_dashboard',
                'name': 'Executive Dashboard Report',
                'description': 'High-level KPI summary for ministry and executive stakeholders.',
                'type': 'EXECUTIVE',
                'formats': ['PDF'],
            },
            {
                'id': 'compliance_audit',
                'name': 'Compliance Audit Report',
                'description': 'Institutional compliance status and audit findings.',
                'type': 'COMPLIANCE',
                'formats': ['PDF', 'XLSX'],
            },
        ]
        return Response(templates)


class UnmatchedProgrammeStudentsView(views.APIView):
    """
    Returns students whose programme could not be matched during import
    (programme field is NULL) plus students flagged in import history records.
    Supports filtering by institution and import_history id.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        institution_id = request.query_params.get('institution')
        import_id      = request.query_params.get('import_id')
        page           = int(request.query_params.get('page', 1))
        page_size      = int(request.query_params.get('page_size', 50))

        # ── 1. Students in DB with no programme ───────────────────────────
        qs = Student.objects.filter(programme__isnull=True).select_related('institution')
        if institution_id:
            qs = qs.filter(institution_id=institution_id)

        total_db = qs.count()
        offset   = (page - 1) * page_size
        students = qs[offset: offset + page_size]

        db_rows = [
            {
                'source':      'database',
                'student_id':  s.student_id,
                'name':        f"{s.first_name} {s.last_name}".strip(),
                'institution': s.institution.name if s.institution else '',
                'programme':   '',
                'reason':      'No programme assigned',
                'year':        s.year_of_entry,
                'status':      s.status,
            }
            for s in students
        ]

        # ── 2. Flagged rows from import history ───────────────────────────
        from imports.models import ImportHistory
        import_qs = ImportHistory.objects.exclude(flagged_records=[])
        if import_id:
            import_qs = import_qs.filter(id=import_id)

        flagged_rows = []
        for record in import_qs.order_by('-created_at')[:20]:
            for row in (record.flagged_records or []):
                flagged_rows.append({
                    'source':      'import',
                    'import_id':   record.id,
                    'import_file': record.filename,
                    'imported_at': record.created_at.isoformat(),
                    'student_id':  row.get('student_id', ''),
                    'name':        row.get('name', ''),
                    'institution': row.get('institution', ''),
                    'programme':   row.get('programme', ''),
                    'reason':      row.get('reason', ''),
                    'row':         row.get('row', ''),
                })

        return Response({
            'unmatched_in_db': {
                'total':   total_db,
                'page':    page,
                'results': db_rows,
            },
            'flagged_from_imports': {
                'total':   len(flagged_rows),
                'results': flagged_rows,
            },
        })


class ImportFlaggedDetailView(views.APIView):
    """Returns the full flagged_records list for a single ImportHistory record."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        from imports.models import ImportHistory
        try:
            record = ImportHistory.objects.get(pk=pk)
        except ImportHistory.DoesNotExist:
            return Response({'error': 'Import record not found'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'import_id':        record.id,
            'filename':         record.filename,
            'imported_at':      record.created_at.isoformat(),
            'total_records':    record.total_records,
            'processed_records':record.processed_records,
            'failed_records':   record.failed_records,
            'flagged_count':    len(record.flagged_records or []),
            'flagged_records':  record.flagged_records or [],
        })


class ReportDataView(views.APIView):
    """
    Single endpoint that returns all chart/table data for a given report type.
    Query params:
      report_type  – ENROLLMENT | GRADUATION | INSTITUTION | PROGRAMME | EXECUTIVE | COMPLIANCE | CUSTOM
      year         – integer (default 2024)
      institution  – institution id (optional, filters to one HEI)
      years_back   – how many years of trend data (default 5)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        report_type    = request.query_params.get('report_type', 'ENROLLMENT')
        year           = int(request.query_params.get('year', 2024))
        institution_id = request.query_params.get('institution')
        years_back     = int(request.query_params.get('years_back', 5))
        year_range     = list(range(year - years_back + 1, year + 1))

        inst_filter = {}
        if institution_id:
            inst_filter['institution_id'] = institution_id

        enroll_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        grad_ind   = Indicator.objects.filter(code='GRADUATION_RATE').first()

        # ── Base student queryset ─────────────────────────────────────────
        stu_base = Student.objects.all()
        if institution_id:
            stu_base = stu_base.filter(institution_id=institution_id)

        # ── helpers ───────────────────────────────────────────────────────
        def _enroll_indicator(y, extra_inst_ids=None):
            """Sum IndicatorValue for TOTAL_STUDENTS for year y."""
            if not enroll_ind:
                return 0
            qs = IndicatorValue.objects.filter(indicator=enroll_ind, year=y)
            if institution_id:
                qs = qs.filter(institution_id=institution_id)
            if extra_inst_ids is not None:
                qs = qs.filter(institution_id__in=extra_inst_ids)
            agg = qs.aggregate(Sum('value'))
            return int(agg['value__sum'] or 0)

        def _enroll_students(y, stu_qs=None):
            """Count Student records by year_of_entry = y (cohort proxy)."""
            qs = stu_qs if stu_qs is not None else stu_base
            return qs.filter(year_of_entry=y).count()

        def _enroll_for_year(y, inst_ids=None):
            """
            Return enrollment for year y.
            Prefer IndicatorValue; fall back to Student.year_of_entry count.
            """
            ind_val = _enroll_indicator(y, inst_ids)
            if ind_val > 0:
                return ind_val
            # fallback: students whose year_of_entry == y
            qs = stu_base
            if inst_ids is not None:
                qs = Student.objects.filter(institution_id__in=inst_ids)
            return qs.filter(year_of_entry=y).count()

        def _total_enrolled(stu_qs=None):
            """
            Total enrolled students (status=ENROLLED) — used for KPI totals.
            Falls back to IndicatorValue sum for the selected year.
            """
            qs = stu_qs if stu_qs is not None else stu_base
            count = qs.filter(status='ENROLLED').count()
            if count > 0:
                return count
            return _enroll_indicator(year)

        def _grad_for_year(y):
            if not grad_ind:
                return 0.0
            qs = IndicatorValue.objects.filter(indicator=grad_ind, year=y)
            if institution_id:
                qs = qs.filter(institution_id=institution_id)
            agg = qs.aggregate(Avg('value'))
            val = round(agg['value__avg'] or 0, 1)
            if val > 0:
                return val
            # fallback: % of students with status=GRADUATED in that cohort year
            total = stu_base.filter(year_of_entry=y).count()
            if total == 0:
                return 0.0
            grads = stu_base.filter(year_of_entry=y, status='GRADUATED').count()
            return round((grads / total) * 100, 1)

        # ── KPI summary ───────────────────────────────────────────────────
        total_students = _total_enrolled()
        # If still 0, count all students regardless of status
        if total_students == 0:
            total_students = stu_base.count()

        avg_grad    = _grad_for_year(year)
        total_insts = 1 if institution_id else Institution.objects.filter(is_active=True).count()

        kpis = {
            'total_students':      total_students,
            'avg_graduation_rate': avg_grad,
            'total_institutions':  total_insts,
            'total_programmes':    Programme.objects.filter(status='ACTIVE').count(),
            'year':                year,
        }

        # ── Enrollment trend ──────────────────────────────────────────────
        enrollment_trend = [
            {'year': y, 'enrolled': _enroll_for_year(y), 'graduation_rate': _grad_for_year(y)}
            for y in year_range
        ]

        # ── By institution ────────────────────────────────────────────────
        inst_qs = Institution.objects.filter(is_active=True)
        if institution_id:
            inst_qs = inst_qs.filter(id=institution_id)

        by_institution = []
        for inst in inst_qs[:20]:
            # Try IndicatorValue first
            enrolled = 0
            if enroll_ind:
                agg = IndicatorValue.objects.filter(
                    indicator=enroll_ind, institution=inst, year=year
                ).aggregate(Sum('value'))
                enrolled = int(agg['value__sum'] or 0)
            # Fallback: count students at this institution
            if enrolled == 0:
                enrolled = Student.objects.filter(institution=inst, status='ENROLLED').count()
                if enrolled == 0:
                    enrolled = Student.objects.filter(institution=inst).count()

            grad_rate = 0.0
            if grad_ind:
                agg = IndicatorValue.objects.filter(
                    indicator=grad_ind, institution=inst, year=year
                ).aggregate(Avg('value'))
                grad_rate = round(agg['value__avg'] or 0, 1)
            if grad_rate == 0.0:
                total_inst = Student.objects.filter(institution=inst).count()
                if total_inst > 0:
                    grads = Student.objects.filter(institution=inst, status='GRADUATED').count()
                    grad_rate = round((grads / total_inst) * 100, 1)

            by_institution.append({
                'name':           inst.name,
                'short_name':     inst.name[:20] + ('…' if len(inst.name) > 20 else ''),
                'type':           inst.type,
                'province':       inst.province,
                'enrolled':       enrolled,
                'graduation_rate': grad_rate,
            })
        by_institution.sort(key=lambda x: x['enrolled'], reverse=True)

        # ── By province ───────────────────────────────────────────────────
        by_province = []
        for pcode, plabel in Institution.PROVINCES:
            inst_ids = list(
                Institution.objects.filter(province=pcode, is_active=True).values_list('id', flat=True)
            )
            enrolled = 0
            if enroll_ind and inst_ids:
                agg = IndicatorValue.objects.filter(
                    indicator=enroll_ind, institution_id__in=inst_ids, year=year
                ).aggregate(Sum('value'))
                enrolled = int(agg['value__sum'] or 0)
            if enrolled == 0 and inst_ids:
                enrolled = Student.objects.filter(
                    institution_id__in=inst_ids, status='ENROLLED'
                ).count()
                if enrolled == 0:
                    enrolled = Student.objects.filter(institution_id__in=inst_ids).count()
            by_province.append({
                'name': plabel, 'code': pcode,
                'enrolled': enrolled, 'institutions': len(inst_ids),
            })
        by_province.sort(key=lambda x: x['enrolled'], reverse=True)

        # ── By institution type ───────────────────────────────────────────
        by_type = []
        for tcode, tlabel in Institution.TYPES:
            inst_ids = list(
                Institution.objects.filter(type=tcode, is_active=True).values_list('id', flat=True)
            )
            enrolled = 0
            if enroll_ind and inst_ids:
                agg = IndicatorValue.objects.filter(
                    indicator=enroll_ind, institution_id__in=inst_ids, year=year
                ).aggregate(Sum('value'))
                enrolled = int(agg['value__sum'] or 0)
            if enrolled == 0 and inst_ids:
                enrolled = Student.objects.filter(
                    institution_id__in=inst_ids, status='ENROLLED'
                ).count()
                if enrolled == 0:
                    enrolled = Student.objects.filter(institution_id__in=inst_ids).count()
            by_type.append({'name': tlabel, 'code': tcode, 'count': len(inst_ids), 'enrolled': enrolled})

        # ── Gender breakdown ──────────────────────────────────────────────
        # Try Enrollment aggregate table first
        enroll_agg_qs = Enrollment.objects.filter(academic_year=year)
        if institution_id:
            enroll_agg_qs = enroll_agg_qs.filter(institution_id=institution_id)
        gender_agg = enroll_agg_qs.aggregate(
            male=Sum('male_count'), female=Sum('female_count'), total=Sum('total_enrolled')
        )
        male_count   = int(gender_agg['male']   or 0)
        female_count = int(gender_agg['female'] or 0)

        # Fallback: count from Student table by gender
        if male_count == 0 and female_count == 0:
            male_count   = stu_base.filter(gender='M').count()
            female_count = stu_base.filter(gender='F').count()

        gender_data = [
            {'name': 'Male',   'value': male_count},
            {'name': 'Female', 'value': female_count},
        ]

        # ── Programme level breakdown ─────────────────────────────────────
        prog_qs = Programme.objects.filter(status='ACTIVE')
        if institution_id:
            prog_qs = prog_qs.filter(institution_id=institution_id)
        by_level = []
        for lcode, llabel in Programme.LEVELS:
            cnt = prog_qs.filter(level=lcode).count()
            by_level.append({'name': llabel, 'code': lcode, 'count': cnt})

        # ── Student status breakdown ──────────────────────────────────────
        by_student_status = []
        for scode, slabel in Student.STATUS_CHOICES:
            cnt = stu_base.filter(status=scode).count()
            by_student_status.append({'name': slabel, 'code': scode, 'count': cnt})

        # ── Year-of-entry cohort trend ────────────────────────────────────
        cohort_trend = []
        for y in year_range:
            cnt = stu_base.filter(year_of_entry=y).count()
            cohort_trend.append({'year': y, 'students': cnt})

        # ── Top institutions by enrollment ────────────────────────────────
        top_institutions = by_institution[:5]

        # ── All indicators summary ────────────────────────────────────────
        indicators_summary = []
        for ind in Indicator.objects.filter(is_active=True):
            qs = IndicatorValue.objects.filter(indicator=ind, year=year)
            if institution_id:
                qs = qs.filter(institution_id=institution_id)
            agg = qs.aggregate(avg=Avg('value'), total=Sum('value'), count=Count('id'))
            # trend: last 3 years
            sparkline = []
            for y in range(year - 2, year + 1):
                sq = IndicatorValue.objects.filter(indicator=ind, year=y)
                if institution_id:
                    sq = sq.filter(institution_id=institution_id)
                sa = sq.aggregate(avg=Avg('value'))
                sparkline.append({'year': y, 'value': round(sa['avg'] or 0, 2)})
            indicators_summary.append({
                'id':       ind.id,
                'code':     ind.code,
                'name':     ind.name,
                'category': ind.category,
                'unit':     ind.unit,
                'target':   ind.target_value,
                'value':    round(agg['avg'] or 0, 2),
                'total':    round(agg['total'] or 0, 2),
                'count':    agg['count'],
                'sparkline': sparkline,
            })

        return Response({
            'report_type':       report_type,
            'year':              year,
            'years_back':        years_back,
            'kpis':              kpis,
            'enrollment_trend':  enrollment_trend,
            'by_institution':    by_institution,
            'by_province':       by_province,
            'by_type':           by_type,
            'gender_data':       gender_data,
            'by_level':          by_level,
            'by_student_status': by_student_status,
            'cohort_trend':      cohort_trend,
            'top_institutions':  top_institutions,
            'indicators_summary': indicators_summary,
        })
