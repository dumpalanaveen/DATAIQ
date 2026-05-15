from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'full_name', 'plan', 'datasets_uploaded', 'is_active', 'date_joined')
    list_filter = ('plan', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'organization')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal', {'fields': ('first_name', 'last_name', 'bio', 'organization', 'avatar')}),
        ('Plan & Stats', {'fields': ('plan', 'datasets_uploaded', 'analyses_run')}),
        ('Preferences', {'fields': ('theme', 'ai_provider_preference')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )
