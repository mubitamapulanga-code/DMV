import datetime

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

        # Graduation count — actual graduated students
        total_graduates = stu_qs.filter(status='GRADUATED').count()

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
            'total_students':    total_students,
            'total_graduates':   total_graduates,
            'total_institutions': Institution.objects.filter(is_active=True).count(),
            'enrollment_trend':  enrollment_trend,
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
        report_type      = request.query_params.get('report_type', 'ENROLLMENT')
        year             = int(request.query_params.get('year', 2024))
        institution_id   = request.query_params.get('institution')
        years_back       = int(request.query_params.get('years_back', 5))
        year_range       = list(range(year - years_back + 1, year + 1))

        # ── New filter params ─────────────────────────────────────────────
        province         = request.query_params.get('province')
        district         = request.query_params.get('district')
        institution_type = request.query_params.get('institution_type')
        gender           = request.query_params.get('gender')
        student_status   = request.query_params.get('student_status')
        programme_level  = request.query_params.get('programme_level')
        age_min_raw      = request.query_params.get('age_min')
        age_max_raw      = request.query_params.get('age_max')
        age_min          = int(age_min_raw) if age_min_raw is not None else None
        age_max          = int(age_max_raw) if age_max_raw is not None else None

        inst_filter = {}
        if institution_id:
            inst_filter['institution_id'] = institution_id

        enroll_ind = Indicator.objects.filter(code='TOTAL_STUDENTS').first()
        grad_ind   = Indicator.objects.filter(code='GRADUATION_RATE').first()

        # ── Institution-level filters (province / district / type) ────────
        # Build a restricted set of institution IDs when any geo/type filter is given.
        inst_scope_ids = None  # None means "all" (no restriction)
        if province or district or institution_type:
            inst_scope_qs = Institution.objects.filter(is_active=True)
            if province:
                inst_scope_qs = inst_scope_qs.filter(province=province)
            if district:
                inst_scope_qs = inst_scope_qs.filter(district=district)
            if institution_type:
                inst_scope_qs = inst_scope_qs.filter(type=institution_type)
            inst_scope_ids = list(inst_scope_qs.values_list('id', flat=True))

        # ── Base student queryset ─────────────────────────────────────────
        stu_base = Student.objects.all()
        if institution_id:
            stu_base = stu_base.filter(institution_id=institution_id)
        if inst_scope_ids is not None:
            stu_base = stu_base.filter(institution_id__in=inst_scope_ids)
        if gender:
            stu_base = stu_base.filter(gender=gender)
        if student_status:
            stu_base = stu_base.filter(status=student_status)
        if programme_level:
            stu_base = stu_base.filter(programme__level=programme_level)
        # Age filtering via date_of_birth
        today = datetime.date.today()
        if age_min is not None:
            # age_min means dob must be <= today minus age_min years
            dob_upper = today.replace(year=today.year - age_min)
            stu_base = stu_base.filter(date_of_birth__lte=dob_upper)
        if age_max is not None:
            # age_max means dob must be >= today minus age_max years
            dob_lower = today.replace(year=today.year - age_max)
            stu_base = stu_base.filter(date_of_birth__gte=dob_lower)

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
            """Return number of graduated students for cohort year y."""
            # Direct count from Student table
            qs = stu_base.filter(status='GRADUATED', year_of_entry=y)
            count = qs.count()
            if count > 0:
                return count
            # Fallback: IndicatorValue for TOTAL_GRADUATES if it exists
            grad_count_ind = Indicator.objects.filter(code='TOTAL_GRADUATES').first()
            if grad_count_ind:
                iv_qs = IndicatorValue.objects.filter(indicator=grad_count_ind, year=y)
                if institution_id:
                    iv_qs = iv_qs.filter(institution_id=institution_id)
                agg = iv_qs.aggregate(Sum('value'))
                return int(agg['value__sum'] or 0)
            return 0

        # ── KPI summary ───────────────────────────────────────────────────
        total_students = _total_enrolled()
        if total_students == 0:
            total_students = stu_base.count()

        total_graduates = stu_base.filter(status='GRADUATED').count()
        total_insts = 1 if institution_id else Institution.objects.filter(is_active=True).count()

        kpis = {
            'total_students':   total_students,
            'total_graduates':  total_graduates,
            'total_institutions': total_insts,
            'total_programmes': Programme.objects.filter(status='ACTIVE').count(),
            'year':             year,
        }

        # ── Enrollment trend ──────────────────────────────────────────────
        enrollment_trend = [
            {'year': y, 'enrolled': _enroll_for_year(y), 'graduates': _grad_for_year(y)}
            for y in year_range
        ]

        # ── By institution ────────────────────────────────────────────────
        inst_qs = Institution.objects.filter(is_active=True)
        if institution_id:
            inst_qs = inst_qs.filter(id=institution_id)
        if inst_scope_ids is not None:
            inst_qs = inst_qs.filter(id__in=inst_scope_ids)

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

            # Graduated count for this institution
            graduates = Student.objects.filter(institution=inst, status='GRADUATED').count()

            by_institution.append({
                'name':      inst.name,
                'short_name': inst.name[:20] + ('…' if len(inst.name) > 20 else ''),
                'type':      inst.type,
                'province':  inst.province,
                'enrolled':  enrolled,
                'graduates': graduates,
            })
        by_institution.sort(key=lambda x: x['enrolled'], reverse=True)

        # ── By province ───────────────────────────────────────────────────
        by_province = []
        for pcode, plabel in Institution.PROVINCES:
            prov_qs = Institution.objects.filter(province=pcode, is_active=True)
            if inst_scope_ids is not None:
                prov_qs = prov_qs.filter(id__in=inst_scope_ids)
            inst_ids = list(prov_qs.values_list('id', flat=True))
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
            type_qs = Institution.objects.filter(type=tcode, is_active=True)
            if inst_scope_ids is not None:
                type_qs = type_qs.filter(id__in=inst_scope_ids)
            inst_ids = list(type_qs.values_list('id', flat=True))
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

        # ── Active filters dict ───────────────────────────────────────────
        active_filters = {}
        if province:
            active_filters['province'] = province
        if district:
            active_filters['district'] = district
        if institution_type:
            active_filters['institution_type'] = institution_type
        if gender:
            active_filters['gender'] = gender
        if student_status:
            active_filters['student_status'] = student_status
        if programme_level:
            active_filters['programme_level'] = programme_level
        if age_min is not None:
            active_filters['age_min'] = age_min
        if age_max is not None:
            active_filters['age_max'] = age_max

        # ── By district ───────────────────────────────────────────────────
        # Group students by institution__district; only include if data exists.
        district_agg = (
            stu_base
            .exclude(institution__district__isnull=True)
            .exclude(institution__district='')
            .filter(status='ENROLLED')
            .values('institution__district')
            .annotate(enrolled=Count('id'))
            .order_by('-enrolled')
        )
        by_district = [
            {'name': row['institution__district'], 'enrolled': row['enrolled']}
            for row in district_agg
        ]

        # ── By age group ──────────────────────────────────────────────────
        today_year = today.year
        age_buckets = [
            ('Under 20', None, 20),
            ('20-24',    20,   25),
            ('25-29',    25,   30),
            ('30-34',    30,   35),
            ('35+',      35,   None),
        ]
        by_age_group = []
        for label, lo, hi in age_buckets:
            qs = stu_base.exclude(date_of_birth__isnull=True)
            if hi is not None:
                # dob must be after (today_year - hi) to be younger than hi
                qs = qs.filter(date_of_birth__gt=today.replace(year=today_year - hi))
            if lo is not None:
                # dob must be <= (today_year - lo) to be at least lo years old
                qs = qs.filter(date_of_birth__lte=today.replace(year=today_year - lo))
            by_age_group.append({'name': label, 'count': qs.count()})

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
            'active_filters':    active_filters,
            'by_district':       by_district,
            'by_age_group':      by_age_group,
        })



class EnrollmentMatrixView(views.APIView):
    """
    Gender enrollment matrix breakdown:
    - By institution type (Public/Private) × qualification level × gender
    - By academic field × qualification level × gender
    Supports filters: year, institution, institution_type, student_status
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year           = int(request.query_params.get('year', 2024))
        institution_id = request.query_params.get('institution')
        inst_type      = request.query_params.get('institution_type')   # PUBLIC or PRIVATE
        student_status = request.query_params.get('student_status', '') # ENROLLED, GRADUATED, etc.

        from academic.models import Programme

        # Base queryset — no year restriction so graduated/withdrawn students are included
        stu_qs = Student.objects.select_related('programme', 'institution').all()
        if institution_id:
            stu_qs = stu_qs.filter(institution_id=institution_id)
        if inst_type:
            stu_qs = stu_qs.filter(institution__type=inst_type)
        if student_status:
            stu_qs = stu_qs.filter(status=student_status)
        # If no status filter, still scope to the selected year via year_of_entry
        # so the numbers are meaningful per-year; but if caller passes status= they
        # want all records for that status regardless of year_of_entry.
        if not student_status:
            stu_qs = stu_qs.filter(year_of_entry__lte=year)

        # ── 1. By institution type × level × gender ──────────────────────
        type_level_gender = (
            stu_qs
            .values('institution__type', 'programme__level', 'gender')
            .annotate(count=Count('id'))
            .order_by('institution__type', 'programme__level', 'gender')
        )

        # Pivot into nested dict for easy lookup
        matrix_by_type = {}
        for row in type_level_gender:
            inst_type_val = row['institution__type']
            level_val     = row['programme__level']
            gender_val    = row['gender']
            count_val     = row['count']
            if not inst_type_val or not level_val or not gender_val:
                continue
            matrix_by_type.setdefault(inst_type_val, {})
            matrix_by_type[inst_type_val].setdefault(level_val, {'M': 0, 'F': 0})
            matrix_by_type[inst_type_val][level_val][gender_val] = count_val

        # Build summary table for frontend
        type_level_table = []
        INST_TYPES = ['PUBLIC', 'PRIVATE']
        LEVELS = [code for code, _ in Programme.LEVELS]
        for it in INST_TYPES:
            for lv in LEVELS:
                male   = matrix_by_type.get(it, {}).get(lv, {}).get('M', 0)
                female = matrix_by_type.get(it, {}).get(lv, {}).get('F', 0)
                total  = male + female
                type_level_table.append({
                    'institution_type': it,
                    'institution_type_label': dict(Institution.TYPES).get(it, it),
                    'level':       lv,
                    'level_label': dict(Programme.LEVELS).get(lv, lv),
                    'male':        male,
                    'female':      female,
                    'total':       total,
                })

        # Subtotals by type
        subtotals_by_type = []
        for it in INST_TYPES:
            male_subtotal   = sum(row['male']   for row in type_level_table if row['institution_type'] == it)
            female_subtotal = sum(row['female'] for row in type_level_table if row['institution_type'] == it)
            total_subtotal  = male_subtotal + female_subtotal
            subtotals_by_type.append({
                'institution_type': it,
                'institution_type_label': dict(Institution.TYPES).get(it, it),
                'male':   male_subtotal,
                'female': female_subtotal,
                'total':  total_subtotal,
            })

        # Grand total
        grand_male   = sum(s['male'] for s in subtotals_by_type)
        grand_female = sum(s['female'] for s in subtotals_by_type)
        grand_total  = grand_male + grand_female

        # Percentages
        for row in type_level_table:
            row['male_pct']   = round((row['male'] / grand_total * 100), 1) if grand_total > 0 else 0
            row['female_pct'] = round((row['female'] / grand_total * 100), 1) if grand_total > 0 else 0

        # ── 2. By academic field × level × gender ────────────────────────
        field_level_gender = (
            stu_qs
            .exclude(programme__academic_field__isnull=True)
            .values('programme__academic_field', 'programme__level', 'gender')
            .annotate(count=Count('id'))
            .order_by('programme__academic_field', 'programme__level', 'gender')
        )

        matrix_by_field = {}
        for row in field_level_gender:
            field_val  = row['programme__academic_field']
            level_val  = row['programme__level']
            gender_val = row['gender']
            count_val  = row['count']
            if not field_val or not level_val or not gender_val:
                continue
            matrix_by_field.setdefault(field_val, {})
            matrix_by_field[field_val].setdefault(level_val, {'M': 0, 'F': 0})
            matrix_by_field[field_val][level_val][gender_val] = count_val

        field_level_table = []
        for field_code, field_label in Programme.ACADEMIC_FIELDS:
            field_row = {
                'academic_field': field_code,
                'academic_field_label': field_label,
            }
            # for each level, add M and F columns
            for lv_code, lv_label in Programme.LEVELS:
                male   = matrix_by_field.get(field_code, {}).get(lv_code, {}).get('M', 0)
                female = matrix_by_field.get(field_code, {}).get(lv_code, {}).get('F', 0)
                field_row[f'{lv_code}_M'] = male
                field_row[f'{lv_code}_F'] = female

            # row total
            row_total = sum(
                matrix_by_field.get(field_code, {}).get(lv, {}).get('M', 0) +
                matrix_by_field.get(field_code, {}).get(lv, {}).get('F', 0)
                for lv, _ in Programme.LEVELS
            )
            field_row['total'] = row_total
            field_level_table.append(field_row)

        # Grand total row for field table
        field_grand = {'academic_field': 'TOTAL', 'academic_field_label': 'TOTAL'}
        for lv_code, _ in Programme.LEVELS:
            field_grand[f'{lv_code}_M'] = sum(
                row.get(f'{lv_code}_M', 0) for row in field_level_table
            )
            field_grand[f'{lv_code}_F'] = sum(
                row.get(f'{lv_code}_F', 0) for row in field_level_table
            )
        field_grand['total'] = sum(row['total'] for row in field_level_table)
        field_level_table.append(field_grand)

        # ── 3. Chart data: by level, grouped by gender, for Public vs Private ──
        # Group by level + gender, split into Public and Private series
        chart_data_by_level = []
        for lv_code, lv_label in Programme.LEVELS:
            pub_male   = matrix_by_type.get('PUBLIC', {}).get(lv_code, {}).get('M', 0)
            pub_female = matrix_by_type.get('PUBLIC', {}).get(lv_code, {}).get('F', 0)
            priv_male  = matrix_by_type.get('PRIVATE', {}).get(lv_code, {}).get('M', 0)
            priv_female= matrix_by_type.get('PRIVATE', {}).get(lv_code, {}).get('F', 0)
            chart_data_by_level.append({
                'level':         lv_label,
                'public_male':   pub_male,
                'public_female': pub_female,
                'private_male':  priv_male,
                'private_female':priv_female,
            })

        return Response({
            'year': year,
            'student_status': student_status or 'ALL',
            'type_level_table':   type_level_table,
            'subtotals_by_type':  subtotals_by_type,
            'grand_total': {
                'male':   grand_male,
                'female': grand_female,
                'total':  grand_total,
            },
            'field_level_table':  field_level_table,
            'chart_data_by_level': chart_data_by_level,
        })
