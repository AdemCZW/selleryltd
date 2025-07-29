from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.contrib import messages
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from .models import Person, Invoice, Schedule, Brand, Company
from .forms import PersonForm, InvoiceForm, InvoiceItemFormSet, ScheduleForm, BrandForm
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
import json
from decimal import Decimal
from .forms import ScheduleForm


def person_list(request):
    # 計算每位員工在本月份的總時數（不跨月）
    today = timezone.localdate()
    current_year = today.year
    current_month = today.month
    persons = list(Person.objects.all())
    import datetime  # for attendance rate calculation
    for p in persons:
        # 篩選出本月排班並累加時數與遲到時數
        monthly_schedules = p.schedule_set.filter(
            date__year=current_year,
            date__month=current_month
        )
        # 總工作時數
        total = sum(s.duration for s in monthly_schedules)
        p.total_hours = round(total, 2)
        # 總遲到時數
        late_total = sum(getattr(s, 'late_hours', 0) for s in monthly_schedules)
        p.monthly_late_hours = round(late_total, 2)
        # 30-day attendance rate: (scheduled - cancelled) / scheduled
        window_start = today - datetime.timedelta(days=29)
        total_window = p.schedule_set.filter(date__range=(window_start, today)).count()
        cancelled_window = p.schedule_set.filter(date__range=(window_start, today), is_late_cancellation=True).count()
        if total_window > 0:
            p.attendance_rate = round((total_window - cancelled_window) / total_window * 100, 2)
        else:
            p.attendance_rate = None
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
    return render(request, 'liveapp/date_form.html', {
        'persons': persons,
        'schedules': schedules,
        'schedules_by_date': dict(schedules_by_date),
        'brands': brands,
        'monthly_hours_by_brand': monthly_hours_by_brand,
        'current_month': current_month,
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
    if request.method == 'POST':
        form = BrandForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('person_list')
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
                if reason == 'late':
                    person.late_count += 1
                    # record late hours on schedule
                    try:
                        schedule.late_hours = Decimal(str(late_hours))
                    except Exception:
                        schedule.late_hours = Decimal('0')
                elif reason == 'cancel':
                    person.cancel_count += 1
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
