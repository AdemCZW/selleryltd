from django.db import models
from django.utils import timezone


class Company(models.Model):
    name = models.CharField(max_length=200, verbose_name='')
    address = models.TextField(verbose_name='')

    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Company'
        ordering = ['name']

    def __str__(self):
        return self.name


class Person(models.Model):
    name = models.CharField(max_length=100)
    nick_name = models.CharField(max_length=100, blank=True, verbose_name='暱稱')
    bank = models.CharField(max_length=100, blank=True)
    account = models.CharField(max_length=20, blank=True)
    sort_code = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    late_count = models.IntegerField(default=0, verbose_name='遲到次數')
    cancel_count = models.IntegerField(default=0, verbose_name='取消次數')

    def __str__(self):
        return self.name


class Invoice(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    company = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    description = models.TextField(blank=True)
    date = models.DateField(default=timezone.now)
    receipt_number = models.CharField(max_length=50, blank=True)
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Invoice {self.receipt_number or 'Unnamed'}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255, blank=True)
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Item {self.hours} hrs @ {self.rate}"


class Schedule(models.Model):
    MODIFICATION_STATUS_CHOICES = [
        ('normal', '正常'),
        ('late', '遲到'),
        ('cancelled', '取消'),
        ('other', '其他'),
    ]
    
    date = models.DateField()
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=[
                            ('主播', '主播'), ('運營', '運營')])
    start_time = models.TimeField()
    end_time = models.TimeField()
    # 品牌選項
    brand = models.ForeignKey(
        'Brand',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='品牌'
    )
    # 房間號，可手動輸入，預設為 0
    room = models.IntegerField(default=0)
    # 標記是否為延遲取消及遲到時數
    is_late_cancellation = models.BooleanField(default=False)
    late_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    # 新增修改狀態字段
    modification_status = models.CharField(
        max_length=20, 
        choices=MODIFICATION_STATUS_CHOICES, 
        default='normal',
        verbose_name='修改狀態'
    )
    modification_reason = models.TextField(blank=True, verbose_name='修改原因')
    modified_at = models.DateTimeField(null=True, blank=True, verbose_name='修改時間')

    @property
    def duration(self):
        """Calculate total hours for this schedule"""
        # Calculate based on time components (hours and minutes)
        start_minutes = self.start_time.hour * 60 + \
            self.start_time.minute + self.start_time.second / 60
        end_minutes = self.end_time.hour * 60 + \
            self.end_time.minute + self.end_time.second / 60
        total_hours = (end_minutes - start_minutes) / 60
        return round(total_hours, 2)


class Brand(models.Model):
    name = models.CharField(max_length=100)
    # 顏色選項，儲存 HEX 色碼
    color = models.CharField(
        max_length=7, default='#000000', help_text='Color')
    # 負責人 (Person)
    responsible = models.ForeignKey(
        Person,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Manager'
    )
    # 合作時數 (小時)
    coop_hours = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.00,
        verbose_name='Range(30/day)'
    )
    # 合作期間開始日期
    start_date = models.DateField(
        verbose_name='Start date',
        default=timezone.localdate
    )
    # 合作期間結束日期
    end_date = models.DateField(
        verbose_name='End date',
        default=timezone.localdate
    )

    def __str__(self):
        return self.name
