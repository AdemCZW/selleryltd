from django import forms
from django.forms import inlineformset_factory
from .models import Person, Invoice, InvoiceItem, Schedule
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
    class Meta:
        model = Invoice
        fields = ['person', 'company', 'address',
                  'description', 'date', 'receipt_number']
        widgets = {
            'person': forms.Select(attrs={'class': 'form-control', 'required': 'required', 'autocomplete': 'name'}),
            'company': forms.TextInput(attrs={'class': 'form-control', 'autocomplete': 'organization'}),
            'address': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'autocomplete': 'street-address'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4, 'autocomplete': 'off'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date', 'autocomplete': 'bday'}),
            'receipt_number': forms.TextInput(attrs={'class': 'form-control', 'autocomplete': 'off'}),
        }


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
