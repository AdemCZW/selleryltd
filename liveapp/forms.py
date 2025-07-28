from django import forms
from django.forms import inlineformset_factory
from .models import Person, Invoice, InvoiceItem, Schedule, Company
from .models import Brand


class PersonForm(forms.ModelForm):
    class Meta:
        model = Person
        fields = ['name', 'bank', 'account', 'sort_code', 'bank_name']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'name'}),
            'bank': forms.TextInput(attrs={'class': 'form-control', 'autocomplete': 'organization'}),
            'account': forms.TextInput(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'cc-number'}),
            'sort_code': forms.TextInput(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'transaction-currency'}),
            'bank_name': forms.TextInput(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'organization-title'}),
        }


class InvoiceForm(forms.ModelForm):
    company = forms.ModelChoiceField(
        queryset=Company.objects.all(),
        empty_label="選擇公司",
        widget=forms.Select(attrs={'class': 'form-control', 'id': 'company-select'}),
        required=False
    )
    
    class Meta:
        model = Invoice
        fields = ['person', 'company', 'address',
                  'description', 'date', 'receipt_number']
        widgets = {
            'person': forms.Select(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'name'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'autocomplete': 'street-address', 'id': 'address-field'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'autocomplete': 'off'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'autocomplete': 'bday'}),
            'receipt_number': forms.TextInput(attrs={'class': 'form-control', 'autocomplete': 'off'}),
        }
        labels = {
            'receipt_number': 'Payment for',
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 如果是編輯模式且有現有的 company 文字值，顯示在地址欄位中
        if self.instance and self.instance.pk and self.instance.company:
            # 嘗試找到對應的 Company 物件
            try:
                company_obj = Company.objects.get(name=self.instance.company)
                self.fields['company'].initial = company_obj
                self.fields['address'].initial = company_obj.address
            except Company.DoesNotExist:
                # 如果找不到對應的公司，保留原來的文字值在地址欄位
                self.fields['address'].initial = self.instance.address
    
    def save(self, commit=True):
        instance = super().save(commit=False)
        # 將選擇的公司名稱存入 company 文字欄位
        if self.cleaned_data.get('company'):
            instance.company = self.cleaned_data['company'].name
        if commit:
            instance.save()
        return instance


InvoiceItemFormSet = inlineformset_factory(
    Invoice, InvoiceItem,
    fields=('description','hours', 'rate', 'total_amount'),
    widgets={
        'description': forms.TextInput(attrs={'class':'form-control', 'autocomplete':'off'}),
        'hours': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'autocomplete': 'off'}),
        'rate': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'autocomplete': 'off'}),
        'total_amount': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'readonly': 'readonly', 'autocomplete': 'off'}),
    },
    extra=1,
    can_delete=True
)


class ScheduleForm(forms.ModelForm):
    class Meta:
        model = Schedule
        # 新增 room 欄位以對應模型更改
        fields = ['date', 'person', 'role',
                  'start_time', 'end_time', 'brand', 'room']
        widgets = {
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'hidden'}),
            'person': forms.Select(attrs={'class': 'form-control', 'id': 'employee-select'}),
            'role': forms.Select(attrs={'class': 'form-control', 'type': 'hidden'}),
            'start_time': forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
            'end_time': forms.TimeInput(attrs={'class': 'form-control', 'type': 'time'}),
            'brand': forms.Select(attrs={'class': 'form-control', 'id': 'brand-select'}),
            'room': forms.NumberInput(attrs={'class': 'form-control', 'id': 'room-input', 'type': 'number', 'min': '0'}),
        }


class BrandForm(forms.ModelForm):
    class Meta:
        model = Brand
        fields = ['name', 'color', 'responsible',
                  'coop_hours', 'start_date', 'end_date']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'off'}),
            'color': forms.TextInput(attrs={'type': 'color', 'class': 'form-control form-control-color', 'required': 'required'}),
            'responsible': forms.Select(attrs={'class': 'form-control'}),
            'coop_hours': forms.NumberInput(attrs={'class': 'form-control', 'step': '0.01', 'min': '0'}),
            'start_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'end_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
        }
