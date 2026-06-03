import io
import json

import pandas as pd
from rest_framework import generics, parsers, permissions, status, views
from rest_framework.response import Response

from .models import ImportHistory
from .serializers import ImportHistorySerializer


def _safe(row, col):
    """Return row[col] if col is set and value is not NaN, else None."""
    if not col:
        return None
    val = row.get(col) if hasattr(row, 'get') else row[col] if col in row.index else None
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    return val


def _str(row, col):
    v = _safe(row, col)
    return str(v).strip() if v is not None else None


def _int(row, col, default=None):
    v = _safe(row, col)
    if v is None:
        return default
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return default


def _float(row, col, default=None):
    v = _safe(row, col)
    if v is None:
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def _parse_file(file_bytes: bytes, filename: str, sheet_name=0) -> pd.DataFrame:
    """Parse CSV / XLSX / JSON bytes into a DataFrame.

    For Excel files, ``sheet_name`` controls which sheet is read.
    Pass ``sheet_name=None`` to read all sheets and concatenate them.
    """
    name = filename.lower()
    buf = io.BytesIO(file_bytes)
    if name.endswith('.csv'):
        # Try common encodings
        for enc in ('utf-8', 'utf-8-sig', 'latin-1', 'cp1252'):
            try:
                buf.seek(0)
                return pd.read_csv(buf, encoding=enc)
            except UnicodeDecodeError:
                continue
        buf.seek(0)
        return pd.read_csv(buf, encoding='latin-1')

    elif name.endswith(('.xls', '.xlsx')):
        if sheet_name is None:
            # Read all sheets; skip empty ones; align columns before concat
            sheets = pd.read_excel(buf, sheet_name=None, header=0)
            frames = []
            for sname, df in sheets.items():
                # Drop rows that are entirely NaN
                df = df.dropna(how='all')
                # Skip sheets that are completely empty after cleaning
                if df.empty:
                    continue
                # Normalise column names (strip whitespace)
                df.columns = [str(c).strip() for c in df.columns]
                frames.append(df)
            if not frames:
                return pd.DataFrame()
            if len(frames) == 1:
                return frames[0].reset_index(drop=True)
            # Concatenate — use outer join so no columns are lost
            combined = pd.concat(frames, ignore_index=True, join='outer')
            return combined
        return pd.read_excel(buf, sheet_name=sheet_name, header=0)

    elif name.endswith('.json'):
        data = json.loads(file_bytes.decode('utf-8'))
        return pd.DataFrame(data if isinstance(data, list) else [data])

    raise ValueError(f"Unsupported file format: {filename}")


class FileUploadView(views.APIView):
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, format=None):
        file_obj = request.data.get('file')
        import_type = request.data.get('import_type', 'AUTO')
        data_year   = request.data.get('data_year')      # user-selected year
        district    = request.data.get('district', '')   # user-selected district

        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        allowed = ('.csv', '.xlsx', '.xls', '.json')
        if not any(file_obj.name.lower().endswith(ext) for ext in allowed):
            return Response(
                {"error": "Unsupported file format. Allowed: CSV, XLSX, XLS, JSON"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Read ALL bytes into memory BEFORE Django's storage consumes the stream ──
        file_bytes = file_obj.read()
        file_obj.seek(0)  # reset so Django FileField can save it to disk

        import_record = ImportHistory.objects.create(
            file=file_obj,
            filename=file_obj.name,
            status='PENDING',
            import_type=import_type,
            data_year=int(data_year) if data_year else None,
            district=district or None,
            created_by=request.user,
        )

        try:
            import_record.status = 'PROCESSING'
            import_record.save(update_fields=['status'])

            # Parse from in-memory bytes (file_obj stream is exhausted after save).
            # For Excel files, read ALL sheets so no data is missed.
            is_excel = file_obj.name.lower().endswith(('.xls', '.xlsx'))
            df = _parse_file(file_bytes, file_obj.name, sheet_name=None if is_excel else 0)
            df.columns = [str(c).strip() for c in df.columns]
            # Drop fully-empty rows that can appear between merged sheets
            df = df.dropna(how='all').reset_index(drop=True)
            # ── Apply user-supplied column mapping ──────────────────────────
            raw_mapping = request.data.get('mapping', '{}')
            try:
                mapping = json.loads(raw_mapping) if isinstance(raw_mapping, str) else raw_mapping
            except (json.JSONDecodeError, TypeError):
                mapping = {}
            if mapping:
                # mapping is {target_field: csv_column}, pandas rename needs {old: new}
                rename_map = {v: k for k, v in mapping.items() if v}
                df.rename(columns=rename_map, inplace=True)

            # ── Inject default institution if provided ─────────────────────
            default_institution = request.data.get('default_institution', '')
            if default_institution:
                df['institution_name'] = default_institution

            # ── Inject data_year as default year column ────────────────────
            # Only sets it when the file doesn't already have a year column,
            # so the file's own year column always takes precedence.
            df_cols_at_inject = {c.lower().replace(' ', '_'): c for c in df.columns}
            has_year_col = any(k in df_cols_at_inject for k in ('year', 'academic_year', 'year_of_entry'))
            if data_year and not has_year_col:
                df['year'] = int(data_year)

            # ── Inject district ────────────────────────────────────────────
            if district:
                df_cols_at_inject2 = {c.lower().replace(' ', '_'): c for c in df.columns}
                if 'district' not in df_cols_at_inject2:
                    df['district'] = district

            import_record.total_records = len(df)

            # Build lowercase-underscore → original-name lookup
            df_cols = {c.lower().replace(' ', '_'): c for c in df.columns}

            # Apply cleaning rules to institution column if present.
            # Use only dedicated institution columns — never 'name' alone, as that
            # could be the programme/institution name column in non-institution files.
            from cleaning.utils import clean_dataframe
            inst_col = (
                df_cols.get('institution_name')
                or df_cols.get('institution')
            )
            if inst_col:
                df = clean_dataframe(df, {inst_col: 'INSTITUTION'})

            # Route to the right importer.
            # Order matters: be specific before falling back to generic checks.
            # 'id' alone is too generic — require 'student_id' for student routing.
            has_reg = 'registration_number' in df_cols or 'reg_number' in df_cols
            has_student_id = 'student_id' in df_cols
            has_staff_id   = 'staff_id' in df_cols
            has_programme = (
                'programme_name' in df_cols
                or 'program_name' in df_cols
                or ('name' in df_cols and 'level' in df_cols and 'institution' in df_cols)
                or ('name' in df_cols and 'level' in df_cols and 'institution_name' in df_cols)
            )
            has_enrollment = 'total_enrolled' in df_cols or 'enrollment' in df_cols

            if import_type == 'INSTITUTIONS' or (import_type == 'AUTO' and has_reg):
                success_count = self._import_institutions(df, df_cols)
            elif import_type == 'STAFF' or (import_type == 'AUTO' and has_staff_id):
                success_count = self._import_staff(df, df_cols, import_record=import_record)
            elif import_type == 'STUDENTS' or (import_type == 'AUTO' and has_student_id):
                success_count = self._import_students(df, df_cols, import_record=import_record)
            elif import_type == 'PROGRAMMES' or (import_type == 'AUTO' and has_programme):
                success_count = self._import_programmes(df, df_cols)
            elif import_type == 'ENROLLMENTS' or (import_type == 'AUTO' and has_enrollment):
                success_count = self._import_enrollments(df, df_cols, import_record=import_record)
            else:
                success_count = self._import_indicator_data(df, df_cols, inst_col, import_record=import_record)

            import_record.processed_records = success_count
            import_record.status = 'COMPLETED'
            import_record.save()

            # Audit trail
            from audit.models import AuditLog
            AuditLog.log(
                user=request.user,
                action='IMPORT',
                resource_type='ImportHistory',
                resource_id=import_record.id,
                description=(
                    f"Imported {success_count}/{len(df)} records "
                    f"from {file_obj.name} (type={import_type})"
                ),
                ip_address=self._get_client_ip(request),
            )

            serializer = ImportHistorySerializer(import_record)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            print(f"[Import ERROR] {e}\n{tb}")
            import_record.status = 'FAILED'
            import_record.error_message = str(e)
            import_record.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── helpers ────────────────────────────────────────────────────────────────

    def _get_client_ip(self, request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        return xff.split(',')[0] if xff else request.META.get('REMOTE_ADDR')

    def _import_indicator_data(self, df, df_cols, inst_col, import_record=None):
        from indicators.models import Indicator, IndicatorValue
        from institutions.models import Institution

        enroll_ind, _ = Indicator.objects.get_or_create(
            code='TOTAL_STUDENTS',
            defaults={
                'name': 'Total Students',
                'category': 'HEA_KPI',
                'description': 'Total enrolled students',
                'formula': 'Sum of all enrolled students',
            },
        )
        grad_ind, _ = Indicator.objects.get_or_create(
            code='GRADUATION_RATE',
            defaults={
                'name': 'Graduation Rate',
                'category': 'HEA_KPI',
                'unit': 'Percentage',
                'description': 'Graduation rate',
                'formula': 'Graduates / Enrolled * 100',
            },
        )

        year_col = df_cols.get('year') or df_cols.get('academic_year')
        students_col = (
            df_cols.get('total_students')
            or df_cols.get('students')
            or df_cols.get('enrollment')
        )
        grad_col = df_cols.get('graduation_rate') or df_cols.get('grad_rate')
        type_col = df_cols.get('type') or df_cols.get('institution_type')
        prov_col = df_cols.get('province') or df_cols.get('region')

        success_count = 0
        for index, row in df.iterrows():
            try:
                name = _str(row, inst_col)
                if not name:
                    continue

                inst_type = (_str(row, type_col) or 'PUBLIC').upper()
                inst_prov = (_str(row, prov_col) or 'LUSAKA').upper()
                code = name[:4].upper() + f"-{index}"

                institution, _ = Institution.objects.get_or_create(
                    name=name,
                    defaults={
                        'code': code,
                        'type': inst_type if inst_type in dict(Institution.TYPES) else 'PUBLIC',
                        'province': inst_prov if inst_prov in dict(Institution.PROVINCES) else 'LUSAKA',
                        'registration_number': f"REG-{code}",
                    },
                )

                year = _int(row, year_col, import_record.data_year if import_record and import_record.data_year else 2024)

                students = _float(row, students_col)
                if students is not None:
                    IndicatorValue.objects.update_or_create(
                        indicator=enroll_ind,
                        institution=institution,
                        year=year,
                        defaults={'value': students},
                    )

                grad = _float(row, grad_col)
                if grad is not None:
                    IndicatorValue.objects.update_or_create(
                        indicator=grad_ind,
                        institution=institution,
                        year=year,
                        defaults={'value': grad},
                    )

                success_count += 1
            except Exception as e:
                print(f"[indicator_data] row {index}: {e}")
        return success_count

    def _import_institutions(self, df, df_cols):
        from institutions.models import Institution

        name_col = df_cols.get('name') or df_cols.get('institution_name')
        code_col = df_cols.get('code')
        type_col = df_cols.get('type') or df_cols.get('institution_type')
        prov_col = df_cols.get('province') or df_cols.get('region')
        dist_col = df_cols.get('district')
        reg_col = df_cols.get('registration_number') or df_cols.get('reg_number')
        email_col = df_cols.get('email')
        website_col = df_cols.get('website')
        year_col = df_cols.get('established_year') or df_cols.get('year_established')

        success_count = 0
        for index, row in df.iterrows():
            try:
                name = _str(row, name_col)
                if not name:
                    continue

                code = _str(row, code_col) or (name[:4].upper() + f"-{index}")
                inst_type = (_str(row, type_col) or 'PUBLIC').upper()
                province = (_str(row, prov_col) or 'LUSAKA').upper().replace(' ', '_')
                reg_num = _str(row, reg_col) or f"REG-{code}"

                Institution.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'type': inst_type if inst_type in dict(Institution.TYPES) else 'PUBLIC',
                        'province': province if province in dict(Institution.PROVINCES) else 'LUSAKA',
                        'district': _str(row, dist_col),
                        'registration_number': reg_num,
                        'email': _str(row, email_col),
                        'website': _str(row, website_col),
                        'established_year': _int(row, year_col),
                    },
                )
                success_count += 1
            except Exception as e:
                print(f"[institutions] row {index}: {e}")
        return success_count

    def _import_students(self, df, df_cols, import_record=None):
        from academic.models import Student, Programme
        from institutions.models import Institution
        import difflib

        sid_col    = df_cols.get('student_id') or df_cols.get('id')
        fname_col  = df_cols.get('first_name') or df_cols.get('firstname')
        lname_col  = df_cols.get('last_name') or df_cols.get('lastname') or df_cols.get('surname')
        inst_col   = df_cols.get('institution') or df_cols.get('institution_name')
        prog_col   = df_cols.get('programme') or df_cols.get('programme_name') or df_cols.get('program')
        year_col   = df_cols.get('year_of_entry') or df_cols.get('year')
        gender_col = df_cols.get('gender')
        status_col = df_cols.get('status')
        email_col  = df_cols.get('email')
        prov_col   = df_cols.get('province_of_origin') or df_cols.get('province')

        # Build a normalised programme name → Programme object lookup per institution
        # so we can do fuzzy matching without hitting the DB on every row.
        def _norm(s: str) -> str:
            """Lowercase, strip punctuation/spaces for comparison."""
            import re
            return re.sub(r'[^a-z0-9]', '', s.lower()) if s else ''

        # Cache: institution_id → {norm_name: Programme}
        prog_cache: dict[int, dict[str, Programme]] = {}

        def _get_programme(institution: Institution, raw_name: str):
            """
            Return the best-matching Programme for raw_name at institution.
            Uses exact normalised match first, then difflib fuzzy match (≥ 0.6).
            Returns (programme_or_None, match_type) where match_type is
            'exact', 'fuzzy', or None.
            """
            iid = institution.id
            if iid not in prog_cache:
                progs = Programme.objects.filter(institution=institution)
                prog_cache[iid] = {_norm(p.name): p for p in progs}

            lookup = prog_cache[iid]
            if not lookup:
                return None, None

            norm_raw = _norm(raw_name)

            # 1. Exact normalised match
            if norm_raw in lookup:
                return lookup[norm_raw], 'exact'

            # 2. Fuzzy match
            best = difflib.get_close_matches(norm_raw, lookup.keys(), n=1, cutoff=0.6)
            if best:
                return lookup[best[0]], 'fuzzy'

            return None, None

        success_count = 0
        flagged = []

        for index, row in df.iterrows():
            try:
                student_id = _str(row, sid_col) or f"IMP-{index:06d}"
                first_name = _str(row, fname_col) or ''
                last_name  = _str(row, lname_col) or ''
                gender_raw = (_str(row, gender_col) or 'M').upper()
                gender     = gender_raw[0] if gender_raw and gender_raw[0] in ('M', 'F', 'O') else 'M'
                year_of_entry  = _int(row, year_col, import_record.data_year if import_record and import_record.data_year else 2024)
                student_status = (_str(row, status_col) or 'ENROLLED').upper()

                # ── Resolve institution ────────────────────────────────────
                inst_name = _str(row, inst_col)
                if not inst_name:
                    flagged.append({
                        'row': index + 2,  # 1-based + header
                        'student_id': student_id,
                        'name': f"{first_name} {last_name}".strip(),
                        'programme': _str(row, prog_col) or '',
                        'reason': 'Missing institution name',
                    })
                    continue

                institution = Institution.objects.filter(name__icontains=inst_name).first()
                if not institution:
                    flagged.append({
                        'row': index + 2,
                        'student_id': student_id,
                        'name': f"{first_name} {last_name}".strip(),
                        'programme': _str(row, prog_col) or '',
                        'reason': f"Institution not found: '{inst_name}'",
                    })
                    continue

                # ── Resolve programme with fuzzy matching ──────────────────
                prog_name = _str(row, prog_col)
                programme = None
                flag_reason = None

                if not prog_name:
                    flag_reason = 'Missing programme name'
                else:
                    programme, match_type = _get_programme(institution, prog_name)
                    if programme is None:
                        flag_reason = f"Programme not found: '{prog_name}'"
                    elif match_type == 'fuzzy':
                        # Accepted via fuzzy match — note it but don't flag
                        print(f"[students] row {index}: fuzzy-matched '{prog_name}' → '{programme.name}'")

                # Save the student regardless — programme may be None (flagged)
                Student.objects.update_or_create(
                    student_id=student_id,
                    defaults={
                        'first_name': first_name,
                        'last_name':  last_name,
                        'gender':     gender,
                        'year_of_entry': year_of_entry,
                        'status': student_status if student_status in dict(Student.STATUS_CHOICES) else 'ENROLLED',
                        'institution': institution,
                        'programme':   programme,   # None when unmatched
                        'email':       _str(row, email_col),
                        'province_of_origin': _str(row, prov_col),
                    },
                )
                success_count += 1

                if flag_reason:
                    flagged.append({
                        'row': index + 2,
                        'student_id': student_id,
                        'name': f"{first_name} {last_name}".strip(),
                        'institution': institution.name,
                        'programme': prog_name or '',
                        'reason': flag_reason,
                    })

            except Exception as e:
                print(f"[students] row {index}: {e}")
                flagged.append({
                    'row': index + 2,
                    'student_id': _str(row, sid_col) or f"IMP-{index:06d}",
                    'name': '',
                    'programme': '',
                    'reason': f"Error: {e}",
                })

        # Persist flagged list back onto the import record
        if import_record is not None and flagged:
            import_record.flagged_records = flagged
            import_record.failed_records  = len(flagged)
            import_record.save(update_fields=['flagged_records', 'failed_records'])

        return success_count

    # Maps common human-readable level strings to the Programme.LEVELS choices
    _LEVEL_ALIASES = {
        'CERTIFICATE': 'CERTIFICATE',
        'CERT': 'CERTIFICATE',
        'DIPLOMA': 'DIPLOMA',
        'DIP': 'DIPLOMA',
        'BACHELOR': 'BACHELOR',
        "BACHELOR'S": 'BACHELOR',
        "BACHELOR'S DEGREE": 'BACHELOR',
        'BACHELORS': 'BACHELOR',
        'BACHELORS DEGREE': 'BACHELOR',
        'DEGREE': 'BACHELOR',
        'UNDERGRADUATE': 'BACHELOR',
        'POSTGRAD_DIPLOMA': 'POSTGRAD_DIPLOMA',
        'POSTGRADUATE DIPLOMA': 'POSTGRAD_DIPLOMA',
        'POSTGRAD DIPLOMA': 'POSTGRAD_DIPLOMA',
        'PGD': 'POSTGRAD_DIPLOMA',
        'PGDIP': 'POSTGRAD_DIPLOMA',
        'MASTERS': 'MASTERS',
        "MASTER'S": 'MASTERS',
        "MASTER'S DEGREE": 'MASTERS',
        'MASTERS DEGREE': 'MASTERS',
        'MSC': 'MASTERS',
        'MBA': 'MASTERS',
        'MA': 'MASTERS',
        'PHD': 'PHD',
        'DOCTORATE': 'PHD',
        'DOCTORAL': 'PHD',
        'DOCTOR OF PHILOSOPHY': 'PHD',
    }

    def _normalise_level(self, raw: str) -> str:
        """Map a raw level string to a valid Programme.LEVELS key."""
        key = raw.strip().upper()
        return self._LEVEL_ALIASES.get(key, 'BACHELOR')

    def _import_programmes(self, df, df_cols):
        from academic.models import Programme
        from institutions.models import Institution

        name_col = df_cols.get('programme_name') or df_cols.get('program_name') or df_cols.get('name')
        code_col = df_cols.get('code') or df_cols.get('programme_code')
        inst_col = df_cols.get('institution') or df_cols.get('institution_name')
        level_col = df_cols.get('level') or df_cols.get('degree_level') or df_cols.get('programme_level')
        duration_col = df_cols.get('duration_years') or df_cols.get('duration')
        status_col = df_cols.get('status')
        accred_col = df_cols.get('accreditation_number') or df_cols.get('accreditation')

        success_count = 0
        for index, row in df.iterrows():
            try:
                name = _str(row, name_col)
                if not name:
                    continue

                level_raw = _str(row, level_col) or 'BACHELOR'
                level = self._normalise_level(level_raw)
                prog_status = (_str(row, status_col) or 'ACTIVE').upper()

                institution = None
                inst_name = _str(row, inst_col)
                if inst_name:
                    institution = Institution.objects.filter(
                        name__icontains=inst_name
                    ).first()
                if not institution:
                    institution = Institution.objects.first()
                if not institution:
                    print(f"[programmes] row {index}: no institution found, skipping")
                    continue

                # Prefer an explicit code from the file; fall back to a stable
                # slug derived from name + institution so re-uploads update rather
                # than duplicate.
                code = _str(row, code_col)
                if not code:
                    slug = name[:6].upper().replace(' ', '_')
                    code = f"{slug}-{institution.code}"

                Programme.objects.update_or_create(
                    code=code,
                    defaults={
                        'name': name,
                        'institution': institution,
                        'level': level,
                        'status': prog_status if prog_status in dict(Programme.STATUS_CHOICES) else 'ACTIVE',
                        'duration_years': _float(row, duration_col, 3.0),
                        'accreditation_number': _str(row, accred_col),
                    },
                )
                success_count += 1
            except Exception as e:
                print(f"[programmes] row {index}: {e}")
        return success_count

    def _import_enrollments(self, df, df_cols, import_record=None):
        from academic.models import Enrollment
        from institutions.models import Institution

        inst_col = df_cols.get('institution') or df_cols.get('institution_name')
        year_col = df_cols.get('academic_year') or df_cols.get('year')
        total_col = (
            df_cols.get('total_enrolled')
            or df_cols.get('total')
            or df_cols.get('enrollment')
            or df_cols.get('total_students')
        )
        male_col = df_cols.get('male_count') or df_cols.get('male')
        female_col = df_cols.get('female_count') or df_cols.get('female')
        grad_col = df_cols.get('graduates') or df_cols.get('graduated')

        success_count = 0
        for index, row in df.iterrows():
            try:
                inst_name = _str(row, inst_col)
                if not inst_name:
                    continue

                institution = Institution.objects.filter(
                    name__icontains=inst_name
                ).first()
                if not institution:
                    print(f"[enrollments] row {index}: institution '{inst_name}' not found")
                    continue

                year = _int(row, year_col, import_record.data_year if import_record and import_record.data_year else 2024)
                total = _int(row, total_col, 0)
                male = _int(row, male_col, 0)
                female = _int(row, female_col, 0)
                graduates = _int(row, grad_col, 0)

                Enrollment.objects.update_or_create(
                    institution=institution,
                    programme=None,
                    academic_year=year,
                    defaults={
                        'total_enrolled': total,
                        'male_count': male,
                        'female_count': female,
                        'graduates': graduates,
                    },
                )
                success_count += 1
            except Exception as e:
                print(f"[enrollments] row {index}: {e}")
        return success_count

    # Maps common rank string aliases to AcademicStaff.RANK_CHOICES keys
    _RANK_ALIASES = {
        'PROFESSOR': 'PROFESSOR', 'PROF': 'PROFESSOR',
        'ASSOCIATE PROFESSOR': 'ASSOCIATE_PROFESSOR', 'ASSOC PROF': 'ASSOCIATE_PROFESSOR',
        'ASSOCIATE_PROFESSOR': 'ASSOCIATE_PROFESSOR',
        'ASSISTANT PROFESSOR': 'ASSISTANT_PROFESSOR', 'ASST PROF': 'ASSISTANT_PROFESSOR',
        'ASSISTANT_PROFESSOR': 'ASSISTANT_PROFESSOR',
        'SENIOR LECTURER': 'SENIOR_LECTURER', 'SR LECTURER': 'SENIOR_LECTURER',
        'SENIOR_LECTURER': 'SENIOR_LECTURER',
        'LECTURER': 'LECTURER',
        'JUNIOR LECTURER': 'JUNIOR_LECTURER', 'JR LECTURER': 'JUNIOR_LECTURER',
        'JUNIOR_LECTURER': 'JUNIOR_LECTURER',
        'TUTORIAL FELLOW': 'TUTORIAL_FELLOW', 'TUTORIAL_FELLOW': 'TUTORIAL_FELLOW',
        'TEACHING ASSISTANT': 'TEACHING_ASSISTANT', 'TA': 'TEACHING_ASSISTANT',
        'TEACHING_ASSISTANT': 'TEACHING_ASSISTANT',
        'RESEARCHER': 'RESEARCHER',
    }

    _EMPLOYMENT_ALIASES = {
        'FULL TIME': 'FULL_TIME', 'FULL-TIME': 'FULL_TIME', 'FULL_TIME': 'FULL_TIME',
        'PART TIME': 'PART_TIME', 'PART-TIME': 'PART_TIME', 'PART_TIME': 'PART_TIME',
        'CONTRACT': 'CONTRACT', 'ADJUNCT': 'ADJUNCT', 'VISITING': 'VISITING',
    }

    _QUALIFICATION_ALIASES = {
        'PHD': 'PHD', 'DOCTORATE': 'PHD', 'DOCTOR OF PHILOSOPHY': 'PHD',
        'MASTERS': 'MASTERS', "MASTER'S": 'MASTERS', 'MASTERS DEGREE': 'MASTERS',
        'MSC': 'MASTERS', 'MBA': 'MASTERS', 'MA': 'MASTERS',
        'POSTGRAD_DIPLOMA': 'POSTGRAD_DIPLOMA', 'POSTGRADUATE DIPLOMA': 'POSTGRAD_DIPLOMA',
        'PGDIP': 'POSTGRAD_DIPLOMA', 'PGD': 'POSTGRAD_DIPLOMA',
        'BACHELOR': 'BACHELOR', "BACHELOR'S": 'BACHELOR', 'BACHELORS': 'BACHELOR',
        'DEGREE': 'BACHELOR', 'BSC': 'BACHELOR', 'BA': 'BACHELOR',
    }

    def _import_staff(self, df, df_cols, import_record=None):
        from academic.models import AcademicStaff

        sid_col    = df_cols.get('staff_id')   or df_cols.get('id')
        fname_col  = df_cols.get('first_name') or df_cols.get('firstname')
        lname_col  = df_cols.get('last_name')  or df_cols.get('lastname') or df_cols.get('surname')
        inst_col   = df_cols.get('institution') or df_cols.get('institution_name')
        dept_col   = df_cols.get('department')  or df_cols.get('dept')
        rank_col   = df_cols.get('rank')        or df_cols.get('position') or df_cols.get('title')
        emp_col    = df_cols.get('employment_type') or df_cols.get('employment')
        status_col = df_cols.get('status')
        year_col   = (df_cols.get('year_appointed') or df_cols.get('year_of_appointment')
                      or df_cols.get('year'))
        qual_col   = (df_cols.get('highest_qualification') or df_cols.get('qualification')
                      or df_cols.get('education'))
        spec_col   = df_cols.get('specialisation') or df_cols.get('specialization')
        field_col  = df_cols.get('academic_field') or df_cols.get('field')
        gender_col = df_cols.get('gender')
        email_col  = df_cols.get('email')
        phone_col  = df_cols.get('phone')

        def _norm(s): return s.strip().upper() if s else ''

        success_count = 0
        for index, row in df.iterrows():
            try:
                staff_id = _str(row, sid_col) or f"STAFF-{index:06d}"
                first_name = _str(row, fname_col) or ''
                last_name  = _str(row, lname_col) or ''

                # institution
                inst_name = _str(row, inst_col)
                if not inst_name:
                    print(f"[staff] row {index}: missing institution, skipping")
                    continue
                institution = Institution.objects.filter(name__icontains=inst_name).first()
                if not institution:
                    print(f"[staff] row {index}: institution '{inst_name}' not found, skipping")
                    continue

                # gender
                gender_raw = _norm(_str(row, gender_col) or 'M')
                gender = gender_raw[0] if gender_raw and gender_raw[0] in ('M', 'F', 'O') else 'M'

                # rank
                rank_raw  = _norm(_str(row, rank_col) or '')
                rank      = self._RANK_ALIASES.get(rank_raw, 'LECTURER')

                # employment type
                emp_raw   = _norm(_str(row, emp_col) or 'FULL_TIME')
                emp_type  = self._EMPLOYMENT_ALIASES.get(emp_raw, 'FULL_TIME')

                # status
                status_raw = _norm(_str(row, status_col) or 'ACTIVE')
                valid_statuses = {'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RETIRED'}
                staff_status = status_raw if status_raw in valid_statuses else 'ACTIVE'

                # highest qualification
                qual_raw = _norm(_str(row, qual_col) or '')
                qual     = self._QUALIFICATION_ALIASES.get(qual_raw) if qual_raw else None

                # year appointed
                year_appointed = _int(
                    row, year_col,
                    import_record.data_year if import_record and import_record.data_year else None
                )

                AcademicStaff.objects.update_or_create(
                    staff_id=staff_id,
                    defaults={
                        'first_name':            first_name,
                        'last_name':             last_name,
                        'gender':                gender,
                        'institution':           institution,
                        'department':            _str(row, dept_col),
                        'rank':                  rank,
                        'employment_type':       emp_type,
                        'status':                staff_status,
                        'year_appointed':        year_appointed,
                        'highest_qualification': qual,
                        'specialisation':        _str(row, spec_col),
                        'academic_field':        _str(row, field_col),
                        'email':                 _str(row, email_col),
                        'phone':                 _str(row, phone_col),
                    },
                )
                success_count += 1
            except Exception as e:
                print(f"[staff] row {index}: {e}")
        return success_count


class ImportHistoryListView(generics.ListAPIView):
    serializer_class = ImportHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ImportHistory.objects.all()
        status_filter = self.request.query_params.get('status')
        import_type = self.request.query_params.get('import_type')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if import_type:
            qs = qs.filter(import_type=import_type)
        return qs


class ImportPreviewView(views.APIView):
    """Preview the first N rows of an uploaded file without importing."""
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file_obj = request.data.get('file')
        try:
            rows = int(request.data.get('rows', 10))
        except (TypeError, ValueError):
            rows = 10

        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            file_bytes = file_obj.read()
            # Use the same multi-sheet logic as the importer so the preview
            # columns always match what will actually be imported.
            is_excel = file_obj.name.lower().endswith(('.xls', '.xlsx'))
            df = _parse_file(file_bytes, file_obj.name, sheet_name=None if is_excel else 0)
            df.columns = [str(c).strip() for c in df.columns]
            # Drop fully-empty rows that often appear between sheets
            df = df.dropna(how='all')
            df = df.head(rows)
            # Replace NaN / NaT / inf with None for JSON serialisation
            df = df.where(pd.notnull(df), None)
            # Convert any remaining non-serialisable types (Timestamp, numpy scalars, etc.)
            import numpy as np
            records = []
            for rec in df.to_dict(orient='records'):
                clean = {}
                for k, v in rec.items():
                    if v is None:
                        clean[k] = None
                    elif isinstance(v, (np.integer,)):
                        clean[k] = int(v)
                    elif isinstance(v, (np.floating,)):
                        clean[k] = None if np.isnan(v) else float(v)
                    elif isinstance(v, (np.bool_,)):
                        clean[k] = bool(v)
                    elif hasattr(v, 'isoformat'):
                        clean[k] = v.isoformat()
                    elif isinstance(v, float) and (v != v):  # NaN
                        clean[k] = None
                    else:
                        clean[k] = v
                records.append(clean)

            return Response({
                'columns': list(df.columns),
                'rows': records,
                'total_preview_rows': len(df),
                'filename': file_obj.name,
            })
        except Exception as e:
            import traceback
            print(f"[Preview ERROR] {e}\n{traceback.format_exc()}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
