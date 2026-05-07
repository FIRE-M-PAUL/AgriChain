from django.urls import path

from .views import ProductListCreateView, ProductDetailView, ProductDeleteView

urlpatterns = [
    path("", ProductListCreateView.as_view(), name="product_list_create"),
    path("<str:unique_code>/", ProductDetailView.as_view(), name="product_detail"),
    path("<str:unique_code>/delete/", ProductDeleteView.as_view(), name="product_delete"),
]
