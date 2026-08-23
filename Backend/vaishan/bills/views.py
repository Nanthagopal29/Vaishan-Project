from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import login
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
import json

from .models import TrsBills, TrsBillItems, SupplierMaster


def _serialize_bill(bill, include_items=False):
    supplier_name = bill.supplier.supplier_name if bill.supplier else None
    supplier_email = bill.supplier.email if bill.supplier else None

    data = {
        "id": bill.id,
        "invoice_no": bill.invoice_no,
        "invoice_date": bill.invoice_date,
        "supplier_id": bill.supplier_id,
        "supplier_name": supplier_name,
        "supplier_email": supplier_email,
        "buyer_name": bill.buyer_name,
        "buyer_address": bill.buyer_address,
        "buyer_gstin": bill.buyer_gstin,
        "buyer_state": bill.buyer_state,
        "buyer_state_code": bill.buyer_state_code,
        "delivery_note": bill.delivery_note,
        "reference_no": bill.reference_no,
        "reference_date": bill.reference_date,
        "buyer_order_no": bill.buyer_order_no,
        "dispatch_doc_no": bill.dispatch_doc_no,
        "dispatched_through": bill.dispatched_through,
        "delivery_note_date": bill.delivery_note_date,
        "destination": bill.destination,
        "payment_terms": bill.payment_terms,
        "other_references": bill.other_references,
        "terms_of_delivery": bill.terms_of_delivery,
        "subtotal": bill.subtotal,
        "cgst_percentage": bill.cgst_percentage,
        "cgst_amount": bill.cgst_amount,
        "sgst_percentage": bill.sgst_percentage,
        "sgst_amount": bill.sgst_amount,
        "round_off": bill.round_off,
        "total_amount": bill.total_amount,
        "created_at": bill.created_at,
        "updated_at": bill.updated_at,
    }

    if include_items:
        items = TrsBillItems.objects.filter(bill_id=bill.id).order_by("sl_no")
        data["items"] = [
            {
                "id": item.id,
                "sl_no": item.sl_no,
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "rate": item.rate,
                "amount": item.amount,
            }
            for item in items
        ]

    return data


def send_invoice_email(bill, items, supplier):
    if not supplier or not supplier.email:
        return {"sent": False, "message": "Supplier email not configured"}

    item_lines = []
    for item in items:
        item_lines.append(
            f"  {item.sl_no}. {item.description} | "
            f"Qty: {item.quantity} {item.unit or ''} | "
            f"Rate: {item.rate} | Amount: {item.amount}"
        )

    message = (
        f"Dear {supplier.contact_person or supplier.supplier_name},\n\n"
        f"A new invoice has been created.\n\n"
        f"Invoice No   : {bill.invoice_no}\n"
        f"Invoice Date : {bill.invoice_date}\n"
        f"Buyer        : {bill.buyer_name}\n"
        f"Buyer GSTIN  : {bill.buyer_gstin or 'N/A'}\n\n"
        f"Items:\n"
        f"{chr(10).join(item_lines) if item_lines else '  (no items)'}\n\n"
        f"Subtotal     : {bill.subtotal}\n"
        f"CGST ({bill.cgst_percentage}%) : {bill.cgst_amount}\n"
        f"SGST ({bill.sgst_percentage}%) : {bill.sgst_amount}\n"
        f"Round Off    : {bill.round_off}\n"
        f"Grand Total  : {bill.total_amount}\n\n"
        f"Regards,\nVaishan & J - Vintage Fashion"
    )

    try:
        send_mail(
            subject=f"Invoice {bill.invoice_no} - Vaishan & J",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[supplier.email],
            fail_silently=False,
        )
        return {"sent": True, "message": f"Email sent to {supplier.email}"}
    except Exception as exc:
        return {"sent": False, "message": str(exc)}




@csrf_exempt
def login_api(request):

    if request.method != "POST":
        return JsonResponse({
            "status": False,
            "message": "Method not allowed"
        }, status=405)

    try:
        body = json.loads(request.body)

        username = body.get("username")
        password = body.get("password")

        if not username or not password:
            return JsonResponse({
                "status": False,
                "message": "Username and password are required"
            }, status=400)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            user = User.objects.filter(email=username).first()

        if user is None or not user.check_password(password):
            return JsonResponse({
                "status": False,
                "message": "Invalid username or password"
            }, status=401)

        if not user.is_active:
            return JsonResponse({
                "status": False,
                "message": "User account is disabled"
            }, status=403)

        login(request, user, backend="django.contrib.auth.backends.ModelBackend")

        return JsonResponse({
            "status": True,
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser
            }
        })

    except json.JSONDecodeError:
        return JsonResponse({
            "status": False,
            "message": "Invalid JSON"
        }, status=400)

    except Exception as e:
        return JsonResponse({
            "status": False,
            "message": str(e)
        }, status=500)



# ============================================================
# TRS BILLS - LIST + CREATE
# ============================================================

@csrf_exempt
def bills(request):

    # -------------------------
    # GET - List all bills
    # -------------------------
    if request.method == "GET":

        bills = TrsBills.objects.select_related("supplier").all().order_by("-id")
        data = [_serialize_bill(bill) for bill in bills]

        return JsonResponse({
            "status": True,
            "data": data
        })

    # -------------------------
    # POST - Create bill
    # -------------------------
    elif request.method == "POST":

        try:
            body = json.loads(request.body)

            supplier_id = body.get("supplier_id")
            items_data = body.get("items", [])

            supplier = None
            if supplier_id:
                supplier = SupplierMaster.objects.get(id=supplier_id)

            with transaction.atomic():
                bill = TrsBills.objects.create(
                    invoice_no=body.get("invoice_no"),
                    invoice_date=body.get("invoice_date"),
                    supplier=supplier,
                    buyer_name=body.get("buyer_name"),
                    buyer_address=body.get("buyer_address"),
                    buyer_gstin=body.get("buyer_gstin"),
                    buyer_state=body.get("buyer_state"),
                    buyer_state_code=body.get("buyer_state_code"),
                    delivery_note=body.get("delivery_note"),
                    reference_no=body.get("reference_no"),
                    reference_date=body.get("reference_date") or None,
                    buyer_order_no=body.get("buyer_order_no"),
                    dispatch_doc_no=body.get("dispatch_doc_no"),
                    dispatched_through=body.get("dispatched_through"),
                    delivery_note_date=body.get("delivery_note_date") or None,
                    destination=body.get("destination"),
                    payment_terms=body.get("payment_terms"),
                    other_references=body.get("other_references"),
                    terms_of_delivery=body.get("terms_of_delivery"),
                    subtotal=body.get("subtotal", 0),
                    cgst_percentage=body.get("cgst_percentage", 0),
                    cgst_amount=body.get("cgst_amount", 0),
                    sgst_percentage=body.get("sgst_percentage", 0),
                    sgst_amount=body.get("sgst_amount", 0),
                    round_off=body.get("round_off", 0),
                    total_amount=body.get("total_amount", 0),
                )

                created_items = []
                for index, item_data in enumerate(items_data, start=1):
                    quantity = Decimal(str(item_data.get("quantity", 0)))
                    rate = Decimal(str(item_data.get("rate", 0)))
                    amount = quantity * rate

                    item = TrsBillItems.objects.create(
                        bill=bill,
                        sl_no=item_data.get("sl_no", index),
                        description=item_data.get("description", ""),
                        quantity=quantity,
                        unit=item_data.get("unit"),
                        rate=rate,
                        amount=amount,
                    )
                    created_items.append(item)

            email_result = send_invoice_email(bill, created_items, supplier)

            return JsonResponse({
                "status": True,
                "message": "Bill created successfully",
                "id": bill.id,
                "email": email_result,
            }, status=201)

        except SupplierMaster.DoesNotExist:
            return JsonResponse({
                "status": False,
                "message": "Supplier not found"
            }, status=404)

        except Exception as e:
            return JsonResponse({
                "status": False,
                "message": str(e)
            }, status=400)

    return JsonResponse({
        "status": False,
        "message": "Method not allowed"
    }, status=405)



@csrf_exempt
def bill_detail(request, bill_id):

    try:
        bill = TrsBills.objects.get(id=bill_id)

    except TrsBills.DoesNotExist:
        return JsonResponse({
            "status": False,
            "message": "Bill not found"
        }, status=404)

    # ========================================================
    # GET
    # ========================================================

    if request.method == "GET":
        bill = TrsBills.objects.select_related("supplier").get(id=bill_id)
        return JsonResponse({
            "status": True,
            "data": _serialize_bill(bill, include_items=True)
        })

    # ========================================================
    # PUT - Update
    # ========================================================

    elif request.method == "PUT":

        try:
            body = json.loads(request.body)

            fields = [
                "invoice_no",
                "invoice_date",
                "buyer_name",
                "buyer_address",
                "buyer_gstin",
                "buyer_state",
                "buyer_state_code",
                "delivery_note",
                "reference_no",
                "reference_date",
                "buyer_order_no",
                "dispatch_doc_no",
                "dispatched_through",
                "delivery_note_date",
                "destination",
                "payment_terms",
                "other_references",
                "terms_of_delivery",
                "subtotal",
                "cgst_percentage",
                "cgst_amount",
                "sgst_percentage",
                "sgst_amount",
                "round_off",
                "total_amount",
            ]

            for field in fields:
                if field in body:
                    setattr(bill, field, body[field])

            if "supplier_id" in body:

                supplier = SupplierMaster.objects.get(
                    id=body["supplier_id"]
                )

                bill.supplier = supplier

            bill.save()

            return JsonResponse({
                "status": True,
                "message": "Bill updated successfully"
            })

        except SupplierMaster.DoesNotExist:
            return JsonResponse({
                "status": False,
                "message": "Supplier not found"
            }, status=404)

        except Exception as e:
            return JsonResponse({
                "status": False,
                "message": str(e)
            }, status=400)

    # ========================================================
    # DELETE
    # ========================================================

    elif request.method == "DELETE":

        bill.delete()

        return JsonResponse({
            "status": True,
            "message": "Bill deleted successfully"
        })

    return JsonResponse({
        "status": False,
        "message": "Method not allowed"
    }, status=405)


@csrf_exempt
def bill_items(request, bill_id=None):

    if bill_id is not None:
        try:
            bill = TrsBills.objects.get(id=bill_id)
        except TrsBills.DoesNotExist:
            return JsonResponse({
                "status": False,
                "message": "Bill not found"
            }, status=404)
    else:
        bill = None

    # ========================================================
    # GET ITEMS
    # ========================================================

    if request.method == "GET":

        items = TrsBillItems.objects.all().order_by("bill_id", "sl_no") if bill_id is None else TrsBillItems.objects.filter(
            bill_id=bill_id
        ).order_by("sl_no")

        data = []

        for item in items:
            data.append({
                "id": item.id,
                "bill_id": item.bill_id,
                "sl_no": item.sl_no,
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "rate": item.rate,
                "amount": item.amount,
            })

        return JsonResponse({
            "status": True,
            "data": data
        })

    # ========================================================
    # POST ITEM
    # ========================================================

    elif request.method == "POST":

        if bill is None:
            return JsonResponse({
                "status": False,
                "message": "Bill id is required"
            }, status=400)

        try:
            body = json.loads(request.body)

            quantity = Decimal(str(body.get("quantity", 0)))
            rate = Decimal(str(body.get("rate", 0)))

            amount = quantity * rate

            item = TrsBillItems.objects.create(
                bill=bill,
                sl_no=body.get("sl_no"),
                description=body.get("description"),
                quantity=quantity,
                unit=body.get("unit"),
                rate=rate,
                amount=amount
            )

            return JsonResponse({
                "status": True,
                "message": "Bill item created successfully",
                "id": item.id,
                "amount": amount
            }, status=201)

        except Exception as e:
            return JsonResponse({
                "status": False,
                "message": str(e)
            }, status=400)

    return JsonResponse({
        "status": False,
        "message": "Method not allowed"
    }, status=405)


@csrf_exempt
def bill_item_detail(request, item_id):

    try:
        item = TrsBillItems.objects.get(id=item_id)

    except TrsBillItems.DoesNotExist:
        return JsonResponse({
            "status": False,
            "message": "Bill item not found"
        }, status=404)

    # ========================================================
    # GET
    # ========================================================

    if request.method == "GET":

        return JsonResponse({
            "status": True,
            "data": {
                "id": item.id,
                "bill_id": item.bill_id,
                "sl_no": item.sl_no,
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "rate": item.rate,
                "amount": item.amount,
            }
        })

    # ========================================================
    # PUT
    # ========================================================

    elif request.method == "PUT":

        try:
            body = json.loads(request.body)

            if "sl_no" in body:
                item.sl_no = body["sl_no"]

            if "description" in body:
                item.description = body["description"]

            if "quantity" in body:
                item.quantity = Decimal(str(body["quantity"]))

            if "unit" in body:
                item.unit = body["unit"]

            if "rate" in body:
                item.rate = Decimal(str(body["rate"]))

            # Always recalculate amount
            item.amount = item.quantity * item.rate

            item.save()

            return JsonResponse({
                "status": True,
                "message": "Bill item updated successfully",
                "amount": item.amount
            })

        except Exception as e:
            return JsonResponse({
                "status": False,
                "message": str(e)
            }, status=400)

    # ========================================================
    # DELETE
    # ========================================================

    elif request.method == "DELETE":

        item.delete()

        return JsonResponse({
            "status": True,
            "message": "Bill item deleted successfully"
        })

    return JsonResponse({
        "status": False,
        "message": "Method not allowed"
    }, status=405)

@csrf_exempt
def supplier_master(request):

    if request.method != "GET":
        return JsonResponse({
            "status": False,
            "message": "Method not allowed"
        }, status=405)

    data = list(
        SupplierMaster.objects
        .all()
        .order_by("-id")
        .values()
    )

    return JsonResponse({
        "status": True,
        "data": data
    })