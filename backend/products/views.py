from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status

from .models import Product, ProductEvent
from .serializers import ProductSerializer
from wallet.auth import IsFarmerRole, IsWalletAuthenticated


class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsWalletAuthenticated, IsFarmerRole]

    def get_queryset(self):
        return Product.objects.filter(farmer_wallet=self.request.wallet_address).order_by("-created_at")

    def perform_create(self, serializer):
        product = serializer.save(farmer_wallet=self.request.wallet_address)
        ProductEvent.objects.create(
            product=product,
            event_type="recorded",
            description=f"Product recorded by wallet {self.request.wallet_address}",
        )


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "unique_code"

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.scan_count += 1
        instance.save(update_fields=["scan_count"])
        ProductEvent.objects.create(
            product=instance,
            event_type="qr_scan",
            description="Buyer scanned product QR",
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProductDeleteView(generics.DestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsWalletAuthenticated, IsFarmerRole]
    lookup_field = "unique_code"

    def get_queryset(self):
        return Product.objects.filter(farmer_wallet=self.request.wallet_address)
