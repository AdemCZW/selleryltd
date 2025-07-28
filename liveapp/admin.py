from django.contrib import admin
from .models import Person, Invoice, InvoiceItem, Schedule, Company
from .models import Brand

# 註冊 Company 模型
@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'address')
    search_fields = ('name', 'address')

# 註冊 Person 模型


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ('name', 'bank', 'account', 'sort_code',
                    'bank_name', 'late_count', 'cancel_count')

# 註冊 Invoice 模型


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('person', 'company', 'date',
                    'receipt_number', 'total_amount')

# 註冊 InvoiceItem 模型


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'hours', 'rate', 'total_amount')

# 註冊 Schedule 模型


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('date', 'person', 'role', 'start_time', 'end_time')
    list_filter = ('date', 'role')
    search_fields = ('person__name', 'role')


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name',)
