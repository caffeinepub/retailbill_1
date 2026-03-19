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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Edit2, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import {
  useAddProduct,
  useDeleteProduct,
  useGetAllProducts,
  useLoadSampleData,
  useUpdateProduct,
} from "../hooks/useQueries";

interface ProductForm {
  barcode: string;
  name: string;
  mrp: string;
  stock: string;
}

const emptyForm: ProductForm = { barcode: "", name: "", mrp: "", stock: "0" };

export default function ProductsPage() {
  const { data: products = [], isLoading } = useGetAllProducts();
  const addMutation = useAddProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const loadSampleMutation = useLoadSampleData();

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      barcode: p.barcode,
      name: p.name,
      mrp: String(p.mrp),
      stock: String(p.stock),
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const mrp = Number.parseFloat(form.mrp);
    const stock = BigInt(Number.parseInt(form.stock) || 0);
    if (!form.barcode || !form.name || Number.isNaN(mrp)) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          barcode: form.barcode,
          name: form.name,
          mrp,
          stock,
        });
        toast.success("Product updated");
      } else {
        await addMutation.mutateAsync({
          barcode: form.barcode,
          name: form.name,
          mrp,
          stock,
        });
        toast.success("Product added");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async (barcode: string) => {
    try {
      await deleteMutation.mutateAsync(barcode);
      toast.success("Product deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const handleLoadSample = async () => {
    try {
      await loadSampleMutation.mutateAsync();
      toast.success("Sample data loaded!");
    } catch {
      toast.error("Failed to load sample data");
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search),
  );

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Product Catalog</h2>
          <Badge variant="secondary">{products.length} products</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            data-ocid="products.load_sample.button"
            variant="outline"
            size="sm"
            onClick={handleLoadSample}
            disabled={loadSampleMutation.isPending}
          >
            {loadSampleMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-1.5" />
            )}
            Load Sample Data
          </Button>
          <Button
            data-ocid="products.add.primary_button"
            size="sm"
            onClick={openAdd}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Product
          </Button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-border bg-background">
        <Input
          data-ocid="products.search_input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products by name or barcode…"
          className="max-w-sm h-9"
        />
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div
            data-ocid="products.loading_state"
            className="flex items-center justify-center h-40"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            data-ocid="products.empty_state"
            className="flex flex-col items-center justify-center h-60 text-muted-foreground"
          >
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No products found</p>
            <p className="text-sm">Add products manually or load sample data</p>
          </div>
        ) : (
          <Table data-ocid="products.table">
            <TableHeader>
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">MRP (₹)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, idx) => (
                <motion.tr
                  key={p.barcode}
                  data-ocid={`products.item.${idx + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-border hover:bg-muted/40 transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.barcode}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    ₹{p.mrp.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        Number(p.stock) > 0 ? "secondary" : "destructive"
                      }
                    >
                      {String(p.stock)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        data-ocid={`products.edit_button.${idx + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(p)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        data-ocid={`products.delete_button.${idx + 1}`}
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(p.barcode)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent data-ocid="products.form.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="barcode">Barcode *</Label>
              <Input
                data-ocid="products.barcode.input"
                id="barcode"
                value={form.barcode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, barcode: e.target.value }))
                }
                disabled={!!editingProduct}
                className="mt-1"
                placeholder="e.g. 8901234567890"
              />
            </div>
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                data-ocid="products.name.input"
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1"
                placeholder="e.g. Parle-G Biscuits"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mrp">MRP (₹) *</Label>
                <Input
                  data-ocid="products.mrp.input"
                  id="mrp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.mrp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mrp: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Qty</Label>
                <Input
                  data-ocid="products.stock.input"
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: e.target.value }))
                  }
                  className="mt-1"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              data-ocid="products.form.cancel_button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="products.form.submit_button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              {editingProduct ? "Update" : "Add"} Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent data-ocid="products.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              data-ocid="products.delete.cancel_button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="products.delete.confirm_button"
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
