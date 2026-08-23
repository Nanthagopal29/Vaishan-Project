from django.db import models

class SupplierMaster(models.Model):
    id = models.BigAutoField(primary_key=True)
    supplier_code = models.CharField(unique=True, max_length=50)
    supplier_name = models.CharField(max_length=150)
    contact_person = models.CharField(max_length=150, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    email = models.CharField(max_length=150, blank=True, null=True)
    gstin = models.CharField(max_length=20, blank=True, null=True)
    pan = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'supplier_master'

class TrsBills(models.Model):
    id = models.BigAutoField(primary_key=True)
    invoice_no = models.CharField(unique=True, max_length=50)
    invoice_date = models.DateField()
    supplier = models.ForeignKey('SupplierMaster', models.DO_NOTHING, blank=True, null=True)
    buyer_name = models.CharField(max_length=150, blank=True, null=True)
    buyer_address = models.TextField(blank=True, null=True)
    buyer_gstin = models.CharField(max_length=20, blank=True, null=True)
    buyer_state = models.CharField(max_length=100, blank=True, null=True)
    buyer_state_code = models.CharField(max_length=10, blank=True, null=True)
    delivery_note = models.CharField(max_length=100, blank=True, null=True)
    reference_no = models.CharField(max_length=100, blank=True, null=True)
    reference_date = models.DateField(blank=True, null=True)
    buyer_order_no = models.CharField(max_length=100, blank=True, null=True)
    dispatch_doc_no = models.CharField(max_length=100, blank=True, null=True)
    dispatched_through = models.CharField(max_length=100, blank=True, null=True)
    delivery_note_date = models.DateField(blank=True, null=True)
    destination = models.CharField(max_length=150, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    other_references = models.CharField(max_length=255, blank=True, null=True)
    terms_of_delivery = models.TextField(blank=True, null=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    cgst_percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    sgst_percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    round_off = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'trs_bills'


class TrsBillItems(models.Model):
    id = models.BigAutoField(primary_key=True)
    bill = models.ForeignKey('TrsBills', models.DB_CASCADE)
    sl_no = models.IntegerField()
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=20, blank=True, null=True)
    rate = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = False
        db_table = 'trs_bill_items'

