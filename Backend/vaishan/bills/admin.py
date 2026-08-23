from django.contrib import admin
from .models import SupplierMaster


@admin.register(SupplierMaster)
class SupplierMasterAdmin(admin.ModelAdmin):
    # Columns to display in the admin list view
    list_display = (
        'supplier_code',
        'supplier_name',
        'contact_person',
        'mobile',
        'city',
        'state',
        'gstin',
    )

    # Search fields for quick filtering
    search_fields = (
        'supplier_code',
        'supplier_name',
        'contact_person',
        'mobile',
        'email',
        'gstin',
        'pan',
    )

    # Sidebar filters
    list_filter = (
        'state',
        'city',
        'created_at',
    )

    # Read-only fields (especially useful since timestamps and unmanaged tables shouldn't be edited directly)
    readonly_fields = ('created_at', 'updated_at')

    # Organization of fields in the edit/add form
    fieldsets = (
        ('Basic Information', {
            'fields': ('supplier_code', 'supplier_name', 'contact_person')
        }),
        ('Contact Details', {
            'fields': ('mobile', 'email')
        }),
        ('Tax Information', {
            'fields': ('gstin', 'pan')
        }),
        ('Address Information', {
            'fields': ('address', 'city', 'state', 'pincode')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),  # Collapsible section
        }),
    )

    # Ordering default view by supplier_code
    ordering = ('supplier_code',)

