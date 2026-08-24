from django.urls import path
from . import views

urlpatterns = [
    path("",views.index,name="index"),
    path("login/",views.login_api,name="login"),
    path("suppliers/",views.supplier_master,name="supplier_master"),
    # Bills
    path("bills/",views.bills,name="bills"),
    path("bills/<int:bill_id>/",views.bill_detail,name="bill_detail"),
    path("bills/<int:bill_id>/items/", views.bill_items, name="bill_items"),
    # Bill Items
    path("items/",views.bill_items,name="bill_items_collection"),
    path("items/<int:item_id>/", views.bill_item_detail, name="bill_item_detail"),
]