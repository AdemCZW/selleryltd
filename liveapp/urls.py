from django.urls import path
from . import views

urlpatterns = [
    path('', views.person_list, name='person_list'),
    path('person/create/', views.person_create, name='person_create'),
    path('invoice/create/', views.invoice_create, name='invoice_create'),
    path('date-form/', views.calendar, name='date_form'),
    path('date-form/delete/<int:pk>/',
         views.schedule_delete, name='schedule_delete'),
    path('brand/create/', views.brand_create, name='brand_create'),
    path('schedule/edit/<int:pk>/', views.schedule_edit, name='schedule_edit'),
    path('cancel-schedule/', views.cancel_schedule, name='cancel_schedule'),
    path('api/employee-schedule/', views.get_employee_schedule, name='get_employee_schedule'),
]
