from django import template
from itertools import groupby
import string

register = template.Library()

@register.filter
def group_by_first_letter(queryset):
    """
    Groups employees by the first letter of their name
    Returns a dictionary with letters as keys and employee lists as values
    """
    grouped_data = {}
    
    # Get all letters A-Z
    for letter in string.ascii_uppercase:
        grouped_data[letter] = []
    
    # Group employees by first letter
    for employee in queryset:
        first_letter = employee.name[0].upper() if employee.name else '#'
        if first_letter.isalpha():
            if first_letter not in grouped_data:
                grouped_data[first_letter] = []
            grouped_data[first_letter].append(employee)
        else:
            # Put non-alphabetic names under '#'
            if '#' not in grouped_data:
                grouped_data['#'] = []
            grouped_data['#'].append(employee)
    
    # Return only groups that have employees
    return {letter: employees for letter, employees in grouped_data.items() if employees}

@register.filter
def group_employees_alphabetically(queryset):
    """
    Groups employees by the first letter of their name for template use
    Returns a list of tuples (letter, employees_list)
    """
    grouped_data = {}
    
    # Group employees by first letter
    for employee in queryset:
        first_letter = employee.name[0].upper() if employee.name else '#'
        if first_letter.isalpha():
            if first_letter not in grouped_data:
                grouped_data[first_letter] = []
            grouped_data[first_letter].append(employee)
        else:
            # Put non-alphabetic names under '#'
            if '#' not in grouped_data:
                grouped_data['#'] = []
            grouped_data['#'].append(employee)
    
    # Sort by letter and return as list of tuples
    return sorted(grouped_data.items())
