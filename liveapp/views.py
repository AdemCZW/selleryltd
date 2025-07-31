from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.contrib import messages
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from .models import Person, Invoice, Schedule, Brand, Company
from .forms import PersonForm, InvoiceForm, InvoiceItemFormSet, ScheduleForm, BrandForm
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
import json
from decimal import Decimal
from .forms import ScheduleForm


def person_list(request):
    # Efficient scheduling stats: fetch schedules once and group in Python
    import datetime
    today = timezone.localdate()
    current_year, current_month = today.year, today.month
    window_start = today - datetime.timedelta(days=29)
    # one query for persons
    persons = list(Person.objects.all())
    # fetch relevant schedules in bulk
    month_scheds = list(Schedule.objects.filter(date__year=current_year, date__month=current_month))
    window_scheds = list(Schedule.objects.filter(date__range=(window_start, today)))
    from collections import defaultdict
    month_map = defaultdict(list)
    window_map = defaultdict(list)
    for s in month_scheds:
        month_map[s.person_id].append(s)
    for s in window_scheds:
        window_map[s.person_id].append(s)
    # compute stats per person
    for p in persons:
        mlist = month_map.get(p.id, [])
        p.total_hours = round(sum(s.duration for s in mlist), 2)
        p.monthly_late_hours = round(sum(s.late_hours for s in mlist), 2)
        wlist = window_map.get(p.id, [])
        total_window = len(wlist)
        cancelled = sum(1 for s in wlist if s.is_late_cancellation)
        p.attendance_rate = round((total_window - cancelled) / total_window * 100, 2) if total_window > 0 else None
    invoices = Invoice.objects.all()
    return render(request, 'liveapp/person_list.html', {'persons': persons, 'invoices': invoices})


def person_create(request):
    if request.method == 'POST':
        form = PersonForm(request.POST)
        # AJAX submission expects JSON
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        if form.is_valid():
            form.save()
            if is_ajax:
                return JsonResponse({'success': True, 'message': '新增員工成功'})
            return redirect('person_list')
        # form invalid
        if is_ajax:
            # return validation errors as JSON
            error_text = form.errors.as_text()
            return JsonResponse({'success': False, 'error': error_text})
        messages.error(request, f"員工表單驗證失敗：{form.errors}")
    else:
        form = PersonForm()
    return render(request, 'liveapp/person_form.html', {'form': form})


def invoice_create(request):
    if request.method == 'POST' and 'save' in request.POST:
        form = InvoiceForm(request.POST)
        formset = InvoiceItemFormSet(request.POST)
        if form.is_valid() and formset.is_valid():
            try:
                # Save invoice and its items, then update total_amount
                invoice = form.save(commit=False)
                invoice.save()
                formset.instance = invoice
                formset.save()
                # Calculate sum of item totals
                from django.db.models import Sum
                total = invoice.items.aggregate(total=Sum('total_amount'))['total'] or 0
                invoice.total_amount = total
                invoice.save()
                return redirect('person_list')
            except Exception as e:
                messages.error(request, f"儲存發票失敗：{str(e)}")
        else:
            messages.error(request, f"表單驗證失敗：{form.errors} {formset.errors}")
    else:
        form = InvoiceForm()
        formset = InvoiceItemFormSet()
    # include all persons for bank details lookup
    # prepare person choices and selected bank info
    persons = Person.objects.all()
    companies = Company.objects.all()
    
    # prepare JSON data for frontend bank info lookup
    persons_data = list(persons.values('id','bank','bank_name','account','sort_code'))
    persons_data_json = json.dumps(persons_data)
    # determine selected person id: from form initial or first person
    selected_id = None
    if request.method == 'POST':
        selected_id = request.POST.get('person')
    else:
        selected_id = form.initial.get('person') or (persons.first().id if persons else None)
    selected_person = None
    if selected_id:
        try:
            selected_person = Person.objects.get(pk=selected_id)
        except Person.DoesNotExist:
            selected_person = None
    bank = selected_person.bank if selected_person else ''
    bank_name = selected_person.bank_name if selected_person else ''
    account = selected_person.account if selected_person else ''
    sort_code = selected_person.sort_code if selected_person else ''
    return render(request, 'liveapp/invoice_form.html', {
        'form': form,
        'formset': formset,
        'persons': persons,
        'companies': companies,
        'selected_person': selected_person,
        'bank': bank,
        'bank_name': bank_name,
        'account': account,
        'sort_code': sort_code,
        'persons_data_json': persons_data_json,
    })


def calendar(request):
    persons = Person.objects.all()
    selected_date = request.GET.get('date')
    if selected_date:
        try:
            selected_date = parse_date(selected_date)
            schedules = Schedule.objects.filter(date=selected_date)
        except ValueError:
            schedules = Schedule.objects.none()
    else:
        schedules = Schedule.objects.none()

    # Build mapping of all schedules by date for calendar display
    from collections import defaultdict
    all_schedules = Schedule.objects.all()
    schedules_by_date = defaultdict(list)
    for s in all_schedules:
        key = s.date.strftime('%Y-%m-%d')
        schedules_by_date[key].append({
            'id': s.id,
            'person_name': s.person.name,
            'brand_name': s.brand.name if s.brand else '',
            'brand_color': s.brand.color if s.brand and hasattr(s.brand, 'color') else '',
            'role': s.role,
            # include time, duration and room for displays
            'start_time': s.start_time.strftime('%H:%M'),
            'end_time': s.end_time.strftime('%H:%M'),
            'duration': s.duration,
            'room': s.room,
            'is_late_cancellation': s.is_late_cancellation,
        })

    # 處理 POST 上傳排班
    if request.method == 'POST':
        form = ScheduleForm(request.POST)
        if form.is_valid():
            try:
                form.save()
                # 檢查是否為 AJAX 請求
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': True, 'message': '排班儲存成功！'})
                else:
                    messages.success(request, "排班儲存成功！")
                    return redirect(f'/date-form/?date={request.POST.get("date")}')
            except Exception as e:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': f'儲存排班失敗：{str(e)}'})
                else:
                    messages.error(request, f"儲存排班失敗：{str(e)}")
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': f'表單驗證失敗：{form.errors}'})
            else:
                messages.error(request, f"表單驗證失敗：{form.errors}")

    # 傳遞品牌列表以供表單選擇
    brands = list(Brand.objects.all())
    # 計算每個品牌在本月份的總時數
    from django.utils import timezone
    today = timezone.localdate()
    current_year = today.year
    current_month = today.month
    monthly_hours_by_brand = {}
    for brand in brands:
        bs = Schedule.objects.filter(
            brand=brand, date__year=current_year, date__month=current_month)
        total = sum(s.duration for s in bs)
        monthly_hours_by_brand[brand.id] = round(total, 2)
    # Attach month_hours and progress percentage attributes for template convenience
    for brand in brands:
        hours = monthly_hours_by_brand.get(brand.id, 0.00)
        setattr(brand, 'month_hours', hours)
        # calculate current cooperation progress as percentage of total coop_hours
        total_coop = float(
            brand.coop_hours) if brand.coop_hours is not None else 0.0
        progress = round((hours / total_coop * 100),
                         2) if total_coop > 0 else 0.0
        setattr(brand, 'progress', progress)
    
    # 獲取修改記錄（遲到和取消的記錄）
    modification_records = Schedule.objects.filter(
        modification_status__in=['late', 'cancelled'],
        modified_at__isnull=False
    ).select_related('person', 'brand').order_by('-modified_at')[:20]  # 最近20筆記錄
    
    return render(request, 'liveapp/date_form.html', {
        'persons': persons,
        'schedules': schedules,
        'schedules_by_date': dict(schedules_by_date),
        'brands': brands,
        'monthly_hours_by_brand': monthly_hours_by_brand,
        'current_month': current_month,
        'modification_records': modification_records,
        # for delete redirects
        'selected_date_str': request.GET.get('date', ''),
    })


def schedule_delete(request, pk):
    """刪除指定排班並重定向到相同日期的排班頁面。"""
    sched = get_object_or_404(Schedule, pk=pk)
    date = request.GET.get('date', '')
    try:
        sched.delete()
        # 檢查是否為 AJAX 請求
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': '排班已刪除'})
        messages.success(request, '排班已刪除。')
    except Exception as e:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': f'刪除失敗：{str(e)}'})
        messages.error(request, f'刪除失敗：{str(e)}')
    return redirect(f'/date-form/?date={date}')


def brand_create(request):
    """新增品牌功能"""
    # Add new brand and stay on page with message
    if request.method == 'POST':
        form = BrandForm(request.POST)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        if form.is_valid():
            form.save()
            if is_ajax:
                return JsonResponse({'success': True, 'message': '品牌已新增'})
            messages.success(request, '品牌已新增')
            form = BrandForm()  # reset form
        else:
            if is_ajax:
                return JsonResponse({'success': False, 'error': form.errors.as_text()})
            messages.error(request, f'表單驗證失敗：{form.errors}')
    else:
        form = BrandForm()
    return render(request, 'liveapp/brand_form.html', {'form': form})


def schedule_edit(request, pk):
    """編輯指定排班並重定向至同日期的排班頁面。"""
    sched = get_object_or_404(Schedule, pk=pk)
    if request.method == 'POST':
        form = ScheduleForm(request.POST, instance=sched)
        if form.is_valid():
            form.save()
            # AJAX submission: return JSON
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            # normal POST: redirect back to date_form
            return redirect(f'/date-form/?date={sched.date}')
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                # return form errors as JSON
                return JsonResponse({'success': False, 'error': form.errors.as_json()})
            messages.error(request, f"表單驗證失敗：{form.errors}")
            # fall through to re-render form
    else:
        form = ScheduleForm(instance=sched)
    return render(request, 'liveapp/schedule_form.html', {'form': form})


@csrf_exempt
def cancel_schedule(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            date_str = data.get('date')
            room = data.get('room')
            # parse late hours from request, default to 0
            late_hours = data.get('late_hours', 0)
            reason = data.get('reason')

            if not date_str or not room:
                return JsonResponse({'success': False, 'error': '缺少日期或房間資訊'}, status=400)

            target_date = parse_date(date_str)
            schedules_to_cancel = Schedule.objects.filter(
                date=target_date, room=room)

            if not schedules_to_cancel.exists():
                return JsonResponse({'success': False, 'error': '找不到對應的排班'}, status=404)

            # 檢查是否為延遲取消
            first_schedule = schedules_to_cancel.first()
            schedule_start_datetime = timezone.make_aware(
                timezone.datetime.combine(
                    first_schedule.date, first_schedule.start_time)
            )
            is_late = timezone.now() > schedule_start_datetime

            for schedule in schedules_to_cancel:
                person = schedule.person
                
                # 記錄修改狀態和時間
                schedule.modified_at = timezone.now()
                
                if reason == 'late':
                    person.late_count += 1
                    schedule.modification_status = 'late'
                    schedule.modification_reason = data.get('modification_reason', '遲到')
                    # record late hours on schedule
                    try:
                        schedule.late_hours = Decimal(str(late_hours))
                    except Exception:
                        schedule.late_hours = Decimal('0')
                elif reason == 'cancel':
                    person.cancel_count += 1
                    schedule.modification_status = 'cancelled'
                    schedule.modification_reason = data.get('modification_reason', '取消直播')
                    
                person.save()

                # mark late cancellation flag
                if is_late:
                    schedule.is_late_cancellation = True
                # save schedule changes
                schedule.save()

            return JsonResponse({'success': True, 'message': '操作成功'})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '無效的請求格式'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    return JsonResponse({'success': False, 'error': '僅支援 POST 請求'}, status=405)


@csrf_exempt
def get_employee_schedule(request):
    """獲取指定員工的班表信息"""
    if request.method == 'GET':
        employee_id = request.GET.get('employee_id')
        if not employee_id:
            return JsonResponse({
                'success': True,
                'data': {
                    'employee_name': '',
                    'stats': {
                        'total_hours': 0,
                        'attendance_rate': 0,
                        'total_schedules': 0,
                        'cancelled_schedules': 0,
                    },
                    'schedules': []
                }
            })
        
        try:
            person = Person.objects.get(id=employee_id)
            
            # 獲取近30天的班表
            from datetime import timedelta
            today = timezone.localdate()
            start_date = today - timedelta(days=30)
            end_date = today + timedelta(days=30)
            
            schedules = Schedule.objects.filter(
                person=person,
                date__range=(start_date, end_date)
            ).select_related('brand').order_by('-date', 'start_time')
            
            # 計算統計信息
            current_month_schedules = Schedule.objects.filter(
                person=person,
                date__year=today.year,
                date__month=today.month
            )
            
            total_hours = sum(s.duration for s in current_month_schedules)
            cancelled_count = sum(1 for s in current_month_schedules if s.is_late_cancellation)
            total_count = current_month_schedules.count()
            attendance_rate = round((total_count - cancelled_count) / total_count * 100, 1) if total_count > 0 else 100
            
            # 構建班表數據
            schedule_data = []
            for schedule in schedules:
                schedule_data.append({
                    'id': schedule.id,
                    'date': schedule.date.strftime('%Y-%m-%d'),
                    'date_display': schedule.date.strftime('%m/%d'),
                    'start_time': schedule.start_time.strftime('%H:%M'),
                    'end_time': schedule.end_time.strftime('%H:%M'),
                    'duration': float(schedule.duration),
                    'role': schedule.role,
                    'brand_name': schedule.brand.name if schedule.brand else '無品牌',
                    'brand_color': schedule.brand.color if schedule.brand and hasattr(schedule.brand, 'color') else '#6c757d',
                    'room': schedule.room,
                    'is_cancelled': schedule.is_late_cancellation,
                    'modification_status': schedule.modification_status,
                    'is_past': schedule.date < today,
                    'is_today': schedule.date == today,
                    'is_future': schedule.date > today,
                })
            
            return JsonResponse({
                'success': True,
                'data': {
                    'employee_name': person.name,
                    'stats': {
                        'total_hours': round(total_hours, 1),
                        'attendance_rate': attendance_rate,
                        'total_schedules': total_count,
                        'cancelled_schedules': cancelled_count,
                    },
                    'schedules': schedule_data
                }
            })
            
        except Person.DoesNotExist:
            return JsonResponse({'success': False, 'error': '員工不存在'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    
    return JsonResponse({'success': False, 'error': '僅支援 GET 請求'}, status=405)


def invoice_pdf_view(request, invoice_id):
    """生成發票的PDF預覽頁面"""
    invoice = get_object_or_404(Invoice, id=invoice_id)
    items = invoice.items.all()
    
    # 獲取人員銀行信息
    person = invoice.person
    
    context = {
        'invoice': invoice,
        'items': items,
        'person': person,
        'total_amount': invoice.total_amount,
        'is_pdf_view': True,  # 標記這是PDF預覽模式
    }
    
    return render(request, 'liveapp/invoice_pdf_template.html', context)


def invoice_pdf_data(request, invoice_id):
    """提供發票的JSON數據用於前端PDF生成"""
    invoice = get_object_or_404(Invoice, id=invoice_id)
    items = invoice.items.all()
    
    # 準備發票數據
    invoice_data = {
        'id': invoice.id,
        'receipt_number': invoice.receipt_number,
        'date': invoice.date.strftime('%Y-%m-%d'),
        'company': invoice.company,
        'address': invoice.address,
        'description': invoice.description,
        'total_amount': str(invoice.total_amount),
        'person': {
            'name': invoice.person.name,
            'bank': invoice.person.bank,
            'bank_name': invoice.person.bank_name,
            'account': invoice.person.account,
            'sort_code': invoice.person.sort_code,
        },
        'items': [
            {
                'description': item.description,
                'hours': str(item.hours),
                'rate': str(item.rate),
                'total_amount': str(item.total_amount),
            }
            for item in items
        ]
    }
    
    return JsonResponse({
        'success': True,
        'data': invoice_data
    })
