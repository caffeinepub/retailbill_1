import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scan,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { useCreateBill, useGetAllProducts } from "../hooks/useQueries";

interface BillItem {
  barcode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

const SHOP_NAME = "QuickBill Store";

// --- Open Food Facts lookup ---
async function lookupBarcodeOnline(
  barcode: string,
): Promise<{ name: string } | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product?.product_name) {
      return { name: data.product.product_name as string };
    }
  } catch {
    // timeout or network error
  }
  return null;
}

export default function POSPage() {
  const { actor } = useActor();
  const { data: allProducts = [] } = useGetAllProducts();
  const createBillMutation = useCreateBill();

  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductMrp, setNewProductMrp] = useState("");
  const [billSaved, setBillSaved] = useState(false);

  // Edit bill item state
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const scanner = useBarcodeScanner();

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const addProductToBill = useCallback((product: Product) => {
    setBillItems((prev) => {
      const existing = prev.find((i) => i.barcode === product.barcode);
      if (existing) {
        toast.success(`${product.name} qty updated`);
        return prev.map((i) =>
          i.barcode === product.barcode
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      toast.success(`${product.name} added to bill`);
      return [
        ...prev,
        {
          barcode: product.barcode,
          productName: product.name,
          unitPrice: product.mrp,
          quantity: 1,
        },
      ];
    });
    setBillSaved(false);
  }, []);

  const handleLookupBarcode = useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code || !actor) return;
      setIsLookingUp(true);
      try {
        const product: Product = await actor.getProduct(code);
        addProductToBill(product);
      } catch {
        // Not in local DB — try Open Food Facts
        toast.loading("Searching online database…", { id: "online-lookup" });
        const online = await lookupBarcodeOnline(code);
        toast.dismiss("online-lookup");

        if (online) {
          toast.info(`Found "${online.name}" online — enter MRP to add`);
          setNewProductBarcode(code);
          setNewProductName(online.name);
          setNewProductMrp("");
          setShowAddProduct(true);
        } else {
          toast.error(`Product "${code}" not found`, {
            description: "Add it manually?",
            action: {
              label: "Add Product",
              onClick: () => {
                setNewProductBarcode(code);
                setNewProductName("");
                setNewProductMrp("");
                setShowAddProduct(true);
              },
            },
          });
        }
      } finally {
        setIsLookingUp(false);
      }
    },
    [actor, addProductToBill],
  );

  // Handle scanner result
  useEffect(() => {
    if (scanner.result) {
      handleLookupBarcode(scanner.result.data);
      scanner.clearResult();
      setShowScanner(false);
    }
  }, [scanner.result, handleLookupBarcode, scanner]);

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLookupBarcode(barcodeInput);
      setBarcodeInput("");
    }
  };

  const updateQty = (barcode: string, delta: number) => {
    setBillItems((prev) =>
      prev
        .map((i) =>
          i.barcode === barcode ? { ...i, quantity: i.quantity + delta } : i,
        )
        .filter((i) => i.quantity > 0),
    );
    setBillSaved(false);
  };

  const removeItem = (barcode: string) => {
    setBillItems((prev) => prev.filter((i) => i.barcode !== barcode));
    setBillSaved(false);
  };

  const openEditItem = (item: BillItem) => {
    setEditingItem(item);
    setEditName(item.productName);
    setEditPrice(item.unitPrice.toFixed(2));
    setEditQty(String(item.quantity));
  };

  const saveEditItem = () => {
    if (!editingItem) return;
    const qty = Number.parseInt(editQty, 10);
    const price = Number.parseFloat(editPrice);
    if (
      !editName.trim() ||
      Number.isNaN(qty) ||
      qty <= 0 ||
      Number.isNaN(price) ||
      price < 0
    )
      return;
    setBillItems((prev) =>
      prev.map((i) =>
        i.barcode === editingItem.barcode
          ? {
              ...i,
              productName: editName.trim(),
              unitPrice: price,
              quantity: qty,
            }
          : i,
      ),
    );
    setBillSaved(false);
    setEditingItem(null);
    toast.success("Item updated");
  };

  const clearBill = () => {
    setBillItems([]);
    setBillSaved(false);
    barcodeInputRef.current?.focus();
  };

  const subtotal = billItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const handleSaveBill = async () => {
    if (billItems.length === 0) {
      toast.error("Bill is empty");
      return;
    }
    const lineItems = billItems.map((i) => ({
      barcode: i.barcode,
      productName: i.productName,
      quantity: BigInt(i.quantity),
      unitPrice: i.unitPrice,
      totalPrice: i.unitPrice * i.quantity,
    }));
    try {
      await createBillMutation.mutateAsync(lineItems);
      setBillSaved(true);
      toast.success("Bill saved successfully!");
    } catch {
      toast.error("Failed to save bill");
    }
  };

  const filteredProducts =
    searchQuery.length > 0
      ? allProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode.includes(searchQuery),
        )
      : [];

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-[420px] shrink-0 flex flex-col bg-background border-r border-border p-4 gap-3 overflow-y-auto">
        {/* Barcode Input */}
        <div className="bg-card rounded-lg border border-border shadow-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Scan / Enter Barcode
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={barcodeInputRef}
                data-ocid="pos.input"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode or type & press Enter"
                className="pl-9 h-11 text-base"
                autoFocus
              />
            </div>
            <Button
              data-ocid="pos.scan_button"
              size="icon"
              className="h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                setShowScanner(true);
                scanner.startScanning();
              }}
            >
              {isLookingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Supports EAN-13, Code-128, UPC, QR and more
          </p>
        </div>

        {/* Search */}
        <div className="bg-card rounded-lg border border-border shadow-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Search Products
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="pos.search_input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or barcode…"
              className="pl-9 h-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <AnimatePresence>
            {filteredProducts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {filteredProducts.slice(0, 6).map((p) => (
                  <button
                    type="button"
                    key={p.barcode}
                    onClick={() => {
                      addProductToBill(p);
                      setSearchQuery("");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
                  >
                    <span className="text-sm font-medium truncate">
                      {p.name}
                    </span>
                    <span className="text-sm font-bold text-primary shrink-0 ml-2">
                      ₹{p.mrp.toFixed(2)}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Add */}
        <div className="bg-card rounded-lg border border-border shadow-card p-4 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Quick Add ({allProducts.length} products)
          </p>
          <ScrollArea className="h-60">
            <div className="space-y-1 pr-1">
              {allProducts.slice(0, 20).map((p) => (
                <button
                  type="button"
                  key={p.barcode}
                  onClick={() => addProductToBill(p)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.barcode}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-bold text-primary">
                      ₹{p.mrp.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {String(p.stock)}
                    </p>
                  </div>
                </button>
              ))}
              {allProducts.length === 0 && (
                <div
                  data-ocid="products.empty_state"
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No products yet. Go to Products tab to add some.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* RIGHT PANEL — Bill */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Bill Header */}
        <div className="bg-nav-bg text-nav-fg px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="font-bold text-lg">{SHOP_NAME}</p>
            <p className="text-xs text-nav-fg/60">
              {dateStr} · {timeStr}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {billSaved && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Saved
              </Badge>
            )}
            <Badge variant="outline" className="text-nav-fg border-nav-fg/30">
              {billItems.length} item{billItems.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Bill Items */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {billItems.length > 0 && (
              <div className="flex text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                <span className="flex-1">Product</span>
                <span className="w-24 text-center">Qty</span>
                <span className="w-20 text-right">Price</span>
                <span className="w-24 text-right">Total</span>
                <span className="w-16" />
              </div>
            )}

            <AnimatePresence initial={false}>
              {billItems.map((item, idx) => (
                <motion.div
                  key={item.barcode}
                  data-ocid={`bill.item.${idx + 1}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 py-2.5 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <div className="w-24 flex items-center justify-center gap-1">
                    <button
                      type="button"
                      data-ocid={`bill.qty_minus.${idx + 1}`}
                      onClick={() => updateQty(item.barcode, -1)}
                      className="w-7 h-7 rounded-full border border-border hover:bg-muted flex items-center justify-center transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      data-ocid={`bill.qty_plus.${idx + 1}`}
                      onClick={() => updateQty(item.barcode, 1)}
                      className="w-7 h-7 rounded-full border border-border hover:bg-muted flex items-center justify-center transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-sm text-muted-foreground">
                      ₹{item.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="font-bold text-sm">
                      ₹{(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  {/* Edit + Remove */}
                  <div className="w-16 flex justify-end gap-1">
                    <button
                      type="button"
                      data-ocid={`bill.edit_button.${idx + 1}`}
                      onClick={() => openEditItem(item)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                      aria-label="Edit item"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-ocid={`bill.delete_button.${idx + 1}`}
                      onClick={() => removeItem(item.barcode)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {billItems.length === 0 && (
              <div
                data-ocid="bill.empty_state"
                className="flex flex-col items-center justify-center py-20 text-muted-foreground"
              >
                <EmptyCartIcon />
                <p className="mt-4 text-base font-medium">Bill is empty</p>
                <p className="text-sm">
                  Scan a barcode or search products to start
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Bill Footer */}
        <div className="border-t border-border bg-card px-6 py-4 shrink-0">
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-bold text-lg">Grand Total</span>
              <span className="font-bold text-xl text-primary">
                ₹{subtotal.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              data-ocid="bill.clear_button"
              variant="outline"
              onClick={clearBill}
              className="flex-1 h-10"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" /> Clear
            </Button>
            <Button
              data-ocid="bill.save_button"
              variant="outline"
              onClick={handleSaveBill}
              disabled={billItems.length === 0 || createBillMutation.isPending}
              className="flex-1 h-10"
            >
              {createBillMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save
            </Button>
            <Button
              data-ocid="bill.print_button"
              onClick={() => window.print()}
              disabled={billItems.length === 0}
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          </div>
        </div>
      </div>

      {/* Print-only receipt */}
      <div
        className="print-receipt"
        style={{ position: "absolute", left: "-9999px", top: 0, width: "80mm" }}
      >
        <div className="receipt-shop-name">{SHOP_NAME}</div>
        <div style={{ textAlign: "center", fontSize: "9pt", color: "#666" }}>
          {dateStr} · {timeStr}
        </div>
        <div className="receipt-divider" />
        {billItems.map((item) => (
          <div key={item.barcode}>
            <div style={{ fontSize: "10pt", fontWeight: "bold" }}>
              {item.productName}
            </div>
            <div className="receipt-item">
              <span>
                {item.quantity} x ₹{item.unitPrice.toFixed(2)}
              </span>
              <span>₹{(item.quantity * item.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="receipt-divider" />
        <div className="receipt-total">
          <span>TOTAL</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-footer">Thank you for shopping with us!</div>
      </div>

      {/* Camera Scanner Modal */}
      <Dialog
        open={showScanner}
        onOpenChange={(open) => {
          if (!open) scanner.stopScanning();
          setShowScanner(open);
        }}
      >
        <DialogContent data-ocid="scanner.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {scanner.isSupported === false ? (
              <p className="text-sm text-destructive">
                Camera not supported on this device.
              </p>
            ) : scanner.error ? (
              <div data-ocid="scanner.error_state">
                <p className="text-sm text-destructive">
                  {scanner.error.message}
                </p>
                <Button
                  size="sm"
                  onClick={() => scanner.retry()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                  <video
                    ref={scanner.videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={scanner.canvasRef} className="hidden" />
                  {scanner.isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {/* Wide rectangle for 1D barcodes */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-20 border-2 border-primary rounded-md opacity-80" />
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded">
                      EAN-13 • Code-128 • UPC • QR • and more
                    </span>
                  </div>
                </div>
                {scanner.isScanning && (
                  <p className="text-sm text-center text-muted-foreground animate-pulse">
                    Scanning…
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              data-ocid="scanner.close_button"
              variant="outline"
              onClick={() => {
                scanner.stopScanning();
                setShowScanner(false);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Item Dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
      >
        <DialogContent data-ocid="edit_item.dialog">
          <DialogHeader>
            <DialogTitle>Edit Bill Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Product Name</Label>
              <Input
                data-ocid="edit_item.name.input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Unit Price (₹)</Label>
              <Input
                data-ocid="edit_item.price.input"
                type="number"
                min="0"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                data-ocid="edit_item.qty.input"
                type="number"
                min="1"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancel
            </Button>
            <Button
              data-ocid="edit_item.save_button"
              onClick={saveEditItem}
              className="bg-primary hover:bg-primary/90"
              disabled={
                !editName.trim() ||
                Number.isNaN(Number.parseFloat(editPrice)) ||
                Number.isNaN(Number.parseInt(editQty, 10)) ||
                Number.parseInt(editQty, 10) <= 0
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent data-ocid="add_product.dialog">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <AddProductForm
            barcode={newProductBarcode}
            name={newProductName}
            mrp={newProductMrp}
            onBarcodeChange={setNewProductBarcode}
            onNameChange={setNewProductName}
            onMrpChange={setNewProductMrp}
            onClose={() => setShowAddProduct(false)}
            actor={actor}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyCartIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Empty cart"
      role="img"
    >
      <title>Empty cart</title>
      <circle cx="32" cy="32" r="32" fill="currentColor" fillOpacity="0.06" />
      <path
        d="M20 22h4l3 14h14l3-10H24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="29" cy="40" r="2" fill="currentColor" />
      <circle cx="37" cy="40" r="2" fill="currentColor" />
    </svg>
  );
}

interface AddProductFormProps {
  barcode: string;
  name: string;
  mrp: string;
  onBarcodeChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onMrpChange: (v: string) => void;
  onClose: () => void;
  actor: any;
}

function AddProductForm({
  barcode,
  name,
  mrp,
  onBarcodeChange,
  onNameChange,
  onMrpChange,
  onClose,
  actor,
}: AddProductFormProps) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!actor || !barcode || !name || !mrp) return;
    setSaving(true);
    try {
      await actor.addProduct(barcode, name, Number.parseFloat(mrp), BigInt(0));
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${name} added to catalog`);
      onClose();
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Barcode</Label>
        <Input
          data-ocid="add_product.barcode.input"
          value={barcode}
          onChange={(e) => onBarcodeChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Product Name</Label>
        <Input
          data-ocid="add_product.name.input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>MRP (₹)</Label>
        <Input
          data-ocid="add_product.mrp.input"
          type="number"
          value={mrp}
          onChange={(e) => onMrpChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <DialogFooter>
        <Button
          data-ocid="add_product.cancel_button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          data-ocid="add_product.submit_button"
          onClick={handleSave}
          disabled={saving || !barcode || !name || !mrp}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Add Product
        </Button>
      </DialogFooter>
    </div>
  );
}
