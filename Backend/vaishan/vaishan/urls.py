"""
URL configuration for vaishan project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.shortcuts import render
from bills.views import index


# ------------------------------------------------------------------
# Custom 404 handler — renders the HTML 404 template
# Active only when DEBUG = False (production)
# ------------------------------------------------------------------
def page_not_found(request, exception=None):
    endpoints = [
        "/invoice/bills/",
        "/invoice/bills/<id>/",
        "/invoice/bills/<id>/items/",
        "/invoice/suppliers/",
        "/invoice/login/",
        "/admin/",
    ]
    return render(request, "404.html", {"endpoints": endpoints}, status=404)


# ------------------------------------------------------------------
# Root health-check endpoint
# ------------------------------------------------------------------
def api_root(request):
    return JsonResponse(
        {
            "status": True,
            "message": "Vaishan & J Billing API is running.",
            "version": "1.0",
            "endpoints": {
                "bills":        "/invoice/bills/",
                "bill_detail":  "/invoice/bills/<id>/",
                "bill_items":   "/invoice/bills/<id>/items/",
                "suppliers":    "/invoice/suppliers/",
                "login":        "/invoice/login/",
                "admin":        "/admin/",
            },
        }
    )


urlpatterns = [
    path("", index, name="home"),            # serves index.html at http://host/
    path("admin/", admin.site.urls),
    path("invoice/", include("bills.urls")),  # /invoice/bills/, /invoice/suppliers/, etc.
]

# Register the custom 404 handler
# NOTE: Only activates when DEBUG = False in settings.py
handler404 = page_not_found
